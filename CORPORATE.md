# OHOINDIA corporate portal

A standalone React + TypeScript project in `corporate/` for company HR and administrators, with its own package.json, lockfile, Vite configuration, TypeScript configuration, source and assets. It uses the NestJS server and MySQL database. The customer website in `client/` and mobile apps are independent projects.

## Run and build

```powershell
npm run corporate:install
npm run corporate:dev
npm run server:dev
```

The corporate development URL is `http://localhost:5174`. Build with `npm run corporate:build`; deploy **corporate/dist/** as the web root. You can also run npm ci, npm run dev, npm run lint and npm run build directly from corporate/. All corporate frontend configuration belongs in corporate/.env.local; the project has no dependency on client/.

API requests default to same-origin `/api/corporate`. Vite proxies `/api` to `VITE_DEV_API_TARGET` (default localhost:3000). For separate production API hosting set `VITE_CORPORATE_API_BASE_URL=https://your-api-host` at build time and add `https://corporate.ohoindialife.com` to the backend `CORS_ORIGINS` configuration. No customer API token is accepted by corporate endpoints.

## Database and first company

The development-only runner explicitly connects to **ohoindiadev**, ignoring DB_NAME, and verifies the selected database before every DDL statement. It will not create a missing database or fall back to another database. Connection credentials come from the backend environment configuration. From server/ run `node scripts/migrate-corporate-dev.cjs` for read-only preflight, then `npm run corporate:migrate:dev` to apply and verify all nine tables and their foreign keys. Do not use this runner for production.

`20261015-corporate.sql` was applied to **ohoindiadev** on 15 October 2026 (07:30 UTC). Verification confirmed nine InnoDB tables and eleven foreign keys. No corporate tables existed before this run. Production was not modified, and no company or administrator accounts were provisioned by the migration.

Apply `server/migrations/20261015-corporate.sql` to a staging copy of the existing MySQL 8 database first. The migration adds nine Corporate* tables; it does not change existing customer tables. Read-only metadata verification against the configured database confirmed CommunityCustomers has Name (100 characters), MobileNumber, nullable GroupId, IsActive and RegisteredOn, and a foreign key to Group. Onboarding inserts only these legacy fields. Employee code, email and department live in CorporateEmployee. Verify this contract again if deploying to a different database.

Create the company as a Group through the existing OHOINDIA process. A trusted OHOINDIA operator then provisions company access; public signup cannot select a Group or create an admin. From `server/`, build and run:

```powershell
npm run build
node scripts/corporate-admin.cjs
```

The operator utility reads one JSON object from stdin until EOF. Use a secure input channel rather than putting real passwords in command arguments, shell history, source files or logs. Provisioning input:

```json
{
  "action": "provision",
  "groupId": 123,
  "companyName": "Example Company",
  "name": "Company Administrator",
  "email": "admin@example.com",
  "password": "REPLACE-WITH-A-STRONG-PRIVATE-PASSWORD"
}
```

The Group must exist. Provisioning creates the company, four default roles and its first administrator atomically. Share the initial password through a secure channel. Existing Group members are not automatically imported; onboard them in the portal to link their existing customer records by mobile number. The same Group cannot be provisioned twice. Account emails are unique across companies.

For adding Admin/HR accounts, changing roles, disabling users and resetting passwords without an internal admin app, see [OHOINDIA operator scripts](server/CORPORATE-ACCESS.md).

## Roles and access

| Role    | Additional permissions                                |
| ------- | ----------------------------------------------------- |
| Admin   | Employees, inventory, invoices, roles and user access |
| HR      | Employees and inventory                               |
| Finance | Invoices                                              |
| Viewer  | Directory and company activity only                   |

All roles can read the company employee directory, including contact details, and the recent company activity log. Admins can create custom roles with any combination of the four permissions. Roles are immutable in this first version: create a replacement role and reassign users to change permissions. Admins add portal users, set passwords, change roles, disable access, and reset other users' passwords. Self access edits are blocked and at least one administrator must remain. There is no email invitation delivery or self-service password recovery. An OHOINDIA operator can recover a sole administrator using the trusted save-user script; see [operator instructions](server/CORPORATE-ACCESS.md).

Passwords use salted scrypt hashes. Corporate sessions are random, server-stored, SHA-256 hashed tokens expiring in eight hours. The browser keeps the token in memory, so reloading requires signing in again. Every request checks current user, role and company status. Updating a user revokes their sessions. Logout revokes the current session. Configure HTTPS and a same-origin API proxy for deployment. Remove expired CorporateSession rows periodically; the expiry is enforced even before cleanup. The existing throttling store is process-local; use a shared rate-limit store for multi-instance deployments.

## Employee lifecycle

HR adds employee ID, name, email, Indian mobile number, department, joining date and Pending/Active status. A matching Customer is linked where present; otherwise the CommunityCustomers record is the OHOINDIA customer identity. A CommunityCustomers row is created or linked in the company's Group in the same transaction as the roster and audit entry. New employees use the existing customer OTP/password-reset flow to set a customer password; the portal does not send SMS or activate paid services automatically. Group transfers require OHOINDIA intervention. Editing a company roster does not overwrite the customer's personal profile. Mobile changes require OHOINDIA intervention to prevent relinking identities by mistake.

Pending employees appear on Onboarding. Edit and set Active once HR verifies their details. Removing an employee soft-removes the corporate roster entry, releases assigned inventory and clears the legacy CommunityCustomers GroupId if it still belongs to this company. Existing group-scoped customer sessions are invalidated by the existing authentication checks. Customer records, purchased benefits and invoices remain intact; removal does not cancel paid policies or subscriptions. Removed employees remain searchable/exportable for audit. Use Re-onboard to restore group membership and move them back to Pending or Active; customers who have since moved to another group require OHOINDIA intervention.

## Invoices and inventory

Invoice data is stored in integer paise. HR/company finance users with invoice access can view, filter and export invoices; only trusted OHOINDIA operations issue them. The operator utility also accepts:

```json
{
  "action": "invoice",
  "companyId": 1,
  "number": "OHO-CORP-0001",
  "issuedOn": "2026-10-15",
  "dueOn": "2026-10-30",
  "amountPaise": 125000,
  "status": "Due",
  "description": "Company service subscription"
}
```

Payment processing, GST computation, statutory invoice PDF generation and payment reconciliation are outside this implementation. Reconcile invoice status using trusted OHOINDIA billing operations; companies cannot mark their own invoices paid.

Inventory represents physical stock or administrative benefit units, not the existing purchasable product catalog. Add a SKU and quantity; allocate one unit per active employee per SKU. Stock checks and allocation run under a company transaction lock, preventing concurrent over-allocation. Removing the employee releases units. Inventory purchase, service activation, stock editing and standalone returns are not included.

## API

All endpoints live under `/api/corporate`. `POST login` accepts email/password and returns a bearer token. All other endpoints require that corporate bearer token:

- `GET workspace`: identity, company, roster, permitted invoices/inventory/access data, recent activity.
- `POST logout`: revokes the current session.
- `POST employees/save`: creates/edits an employee (optional id for edits).
- `POST employees/remove`: soft-removes by id.
- `POST inventory/save`: adds stock.
- `POST inventory/assign`: inventory id and employeeId.
- `POST roles/save`: name and permissions array.
- `POST users/save`: name, email, roleId, status, password; optional id for editing, password optional for edits.

CompanyId is never accepted from clients. Server-side identity scopes all company records; foreign-company IDs are rejected. All business mutations write an audit event in the same transaction. CSV export neutralizes spreadsheet formula prefixes.

## Release checklist

Run `npm run corporate:build`, `npm run server:build` and `npm run server:test`. Stage the migration and provision a test Group/admin. Verify against MySQL: onboarding a new customer, linking an existing customer, each role, HR removal, competing stock allocations, invoice visibility and user session revocation. Automated tests use database stubs and do not replace staging schema verification.

Configure DNS for `corporate.ohoindialife.com`, HTTPS, the static web root and `/api` reverse proxy, then provision actual company accounts. No DNS, hosting, real company provisioning or database migration is performed simply by building this code.
