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

The development-only runner explicitly connects to **ohoindiadev**, ignoring DB_NAME, and verifies the selected database before every DDL statement. It will not create a missing database or fall back to another database. Connection credentials come from the backend environment configuration. From server/ run `node scripts/migrate-corporate-dev.cjs` for read-only preflight, then `npm run corporate:migrate:dev` to apply and verify all ten tables and their foreign keys. Do not use this runner for production.

`20261015-corporate.sql` was applied to **ohoindiadev** on 15 October 2026 (07:30 UTC). Verification confirmed nine InnoDB tables and eleven foreign keys. No corporate tables existed before this run. Production was not modified, and no company or administrator accounts were provisioned by the migration.

Use `server/scripts/migrate-corporate-dev.cjs` (preflight by default; `--apply-ohoindiadev` to apply to the development database). The runner applies `20261015-corporate.sql` and consolidates onboarding into CorporateEmployee using `migrate-employee-onboarding.cjs`. Stop corporate application traffic during the upgrade because MySQL DDL autocommits. The consolidation adds nullable onboarding columns and unique request/order indexes, copies and verifies all existing CorporateOnboarding records, then drops that legacy table. It can be rerun after interruption; conflicting or orphaned records stop the migration and retain the legacy table. For other environments, apply the base SQL and invoke the exported `migrateEmployeeOnboarding(connection)` helper on the intended MySQL connection during a maintenance window. Do not apply the historical `20261015-corporate-onboarding.sql` migration on new installations. Existing GroupProducts, ProductsDetails, Orders, Customer, OHOCards and View_Subscription contracts are required. No customer/order/card rows are created by this migration.

Create the company as a Group through the existing OHOINDIA process. In **FrontWebReact → Group Details → Corporate Portal Access**, confirm an authorized OHOINDIA admin's credentials, then select **Create roles and initial administrator**. This provisions the company, Admin/HR/Finance/Viewer roles and the first administrator atomically. The same panel creates custom roles, adds users, assigns roles, disables users and resets passwords for that Group. For a newly created Group, open its saved Group Details page to initialize access. Public signup cannot select a Group or create an admin.

### FrontWebReact integration configuration

Local development has been configured for FrontWebReact's separate `REACT_APP_CORPORATE_API_BASE_URL=http://localhost:3000`. The dev database uses the existing dev2 Employee/adminloginm endpoint and global Admin/Super Admin roles (IDs 24 and 42). To inspect or repeat the dev-only setup, use `node scripts/configure-corporate-admin-dev.cjs` for preflight or `npm run corporate:configure:dev` from server/. The runner refuses any configured database other than `ohoindiadev`, derives the login URL from FrontWebReact's existing development configuration, and preserves existing CORS origins. It does not copy administrator credentials into configuration.

- Set FrontWebReact's `REACT_APP_CORPORATE_API_BASE_URL` to the NestJS server origin (for example `http://localhost:3000` during development). Leave it empty only when the admin site's `/api/corporate-admin` routes are reverse-proxied to this server. Rebuild FrontWebReact after changing it.
- In the server's **ConfigValues**, set `CORPORATE_ADMIN_LOGIN_URL` to the full existing admin `lambdaAPI/Employee/adminloginm` URL and `CORPORATE_ADMIN_ROLE_IDS` to a comma-separated allowlist of the existing OHOINDIA administrator UserRoleIds authorized to manage company access. There is no default role allowlist. These are global admin roles, separate from company-scoped CorporateRole rows. The endpoint must use HTTPS; localhost HTTP is supported for development.
- Add the FrontWebReact origin to the server's `CORS_ORIGINS` when it uses a separate origin. Use HTTPS for both applications in deployment. Credentials are submitted in the Authorization header, verified against the configured admin login on every request, and kept only in component memory until the panel is locked or the page closes. Never log Authorization headers or admin login request bodies at the proxy/upstream.
- Missing authentication configuration fails closed. Customer and corporate bearer tokens cannot provision Groups. The API does not trust the browser's localStorage role or user IDs.
- New routes are `POST /api/corporate-admin/groups/:groupId/access`, `/provision`, `/roles/save`, and `/users/save`. Company identity is resolved from the URL Group; role and user IDs must belong to that company. Provision accepts companyName, name, email and password (12–128 characters). Existing access mutations use the same validated role/user contracts as the corporate portal and write audit records identifying the OHOINDIA admin.

The corporate portal uses the same OHOINDIA logo images, Public Sans font and `#0E94C3` primary blue as FrontWebReact. Company-specific roster, inventory and invoice features retain their existing API contracts.

The trusted command-line utility remains available as a fallback. From `server/`, build and run:

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

HR enters employee ID, name, email (up to 150 characters, matching Orders), Indian mobile number, department, joining date, roster status, date of birth and gender. Select one product attached to the company's Group through GroupProducts. An active group attachment remains eligible even when Products.IsActive is false. The browser only offers those products and the server checks the attachment again inside the onboarding transaction. Add included family members and select a family nominee for every product requiring one; minor nominees require an adult guardian. Onboarding validates member, spouse, adult/child and age limits, including insurance premium eligibility. Free and non-combo products are allowed when explicitly attached to the Group.

Creating an employee atomically creates/links CommunityCustomers, writes the roster, creates the primary Orders row and related family orders/nominees, and records the order and onboarding request/status fields on CorporateEmployee. Corporate onboarding never inserts, updates or deletes Customer rows and does not allocate OHOCODE values. It no longer invokes the customer app purchase service, which updates Customer profiles. Every new order starts with CustomerId=NULL, matching the supplied Excel importer; the cardCreation API owns customer creation/linking and card issuance. After the API fills Orders.CustomerId, only the corporate roster's CustomerId is synchronized.

The employee order uses Relationship=Self and CardHolderType=Primary. Spouses default to Secondary and other dependents to Family; the form allows an explicit Secondary/Family selection. All dependents reference the Primary OrdersId through RelatedOrderId. Card numbers accept 12 digits or the import's `1234 5678 9012` format and are saved with spaces. The selected group product is used for every order. Orders use PaymentType=Cashfree, UTRNumber=Free and Status=NULL, matching the import contract, with CreatedSource=Corporate. The product supplies the primary payable amount (zero for a free product); paid amounts remain zero because no employee payment is collected.

Pending employees retain their saved orders with onboarding state Ready and do not invoke card creation, including through the provision/refresh endpoint. Creating an employee as Active or changing a saved employee from Pending to Active starts card creation after the roster transaction commits, using the existing order. Repeated saves and refreshes do not repeat issuance. After activation, the server calls `https://api.ohoindialife.com/dev2/lambdaAPI/Payment/cardCreation` with `{ customerOrderId: orderId, CustomDate: CreatedTime }`. CreatedTime is the saved order timestamp, not a browser-generated date. This endpoint targets **dev2**: the server's legacy tables must use the same environment. A supplied OHO card number is written to the order in the import format. An existing card must be unassigned or belong to the employee; an unused number is passed to the card worker. With no supplied number, the existing card worker generates/manages the card. The worker owns customer benefits, family customer records, card activation and order completion; no parallel card-number generator is introduced.

Click an employee's name to view their customer ID, onboarding order/status, OHO cards, subscribed products and family. This reads the same Customer, OHOCards and View_Subscription data used by the customer/admin applications, with pending family orders shown until issuance finishes. On successful creation the profile opens automatically. Refresh reconciles the saved order's Completed status. A stable request UUID and payload fingerprint protect creation retries; edits and re-onboarding an existing roster entry never generate another order.

Card issuance is claimed durably before the external call. A timeout, provider rejection or interrupted request leaves the saved employee/order visible as Review or Processing. Refresh only reconciles it and never blindly repeats issuance. OHOINDIA operations must inspect an unresolved order/provider result before any manual retry; the provider's idempotency contract is not available in this repository. A Ready order whose request stopped before claiming can be provisioned from the customer profile. Roster Pending/Active is independent of provisioning. Group transfers and mobile changes require OHOINDIA intervention. New customers use the existing OTP/password-reset flow; the portal does not send password SMS.

Pending employees appear on Onboarding. Edit and set Active once HR verifies their details. Removing an employee soft-removes the corporate roster entry, releases assigned inventory and clears the legacy CommunityCustomers GroupId if it still belongs to this company. Existing group-scoped customer sessions are invalidated by the existing authentication checks. Customer records, purchased benefits and invoices remain intact; removal does not cancel paid policies or subscriptions. Removed employees remain searchable/exportable for audit. Use Re-onboard to restore group membership and move them back to Pending or Active; customers who have since moved to another group require OHOINDIA intervention.

## Excel employee upload

Use **Upload Excel** from Overview, Employees or Onboarding (employee permission required). Choose an `.xlsx` workbook in the `extra1.xlsx` layout and select a matching worksheet. The reader runs in the browser; unrelated worksheets are excluded. A non-empty Sno identifies a Primary/Self employee, and following blank-Sno rows are linked family until the next Primary. Spouses become Secondary and all other relatives become Family, including reference files that label every dependent Secondary. Literal `NULL` cells are treated as missing values.

Select a company Group product, joining date and roster status, then review employees, family, supplied/generated cards and declared amounts. The product list comes from the authenticated company's GroupProducts, including inactive Products with an active attachment. Spreadsheet ProductsId values are ignored; the selected Group product applies to every Primary and family order. Required nominees/guardians must be selected in the preview. Product member/spouse limits are checked before submission; full eligibility and Group attachment checks also run on the server.

Required columns: Sno, FullName, Gender, DateofBirth, MobileNumber, CardHolder Type, Relationship. Optional columns from the reference layout include OHOCardNumber, AddressLine1, AddressLine2, Village, Mandal, City, District, State, PinCode and PaidAmount. Optional Email, EmployeeCode and Department are also supported. Missing employee codes become `EMP-<mobile>`; email/department may be blank. Joining date and roster status use the chosen upload settings. Actual Excel dates, Excel serial dates, ISO dates and DD/MM/YYYY or MM/DD/YYYY text dates are supported. The text format is explicitly selectable. Invalid dates, orphan dependents, duplicate employees and malformed data block import with row numbers.

Address and declared PaidAmount values are validated and saved to Orders; State/District names or numeric IDs resolve against the legacy lookup tables. Declared amounts are imported as supplied (including zero) and do not trigger payment collection. Empty amount cells preserve the existing product-based/default order amounts. The import does not write Customer directly. Each employee uses the existing transaction and then cardCreation once the whole family is saved.

Imports are sequential, with per-employee order/status/error results and a stop-after-current option. Successful employees remain saved if another employee fails. Retry failed employees, or re-upload with the same worksheet/product/date/status/nominee settings to reuse deterministic company-scoped request UUIDs. Saved, Processing and Review results are not resubmitted within the batch; server replay protection prevents another card issuance. Settings lock after the first submission. Limits: 5 MB, 5,000 data rows and 200 employees per upload; API requests are paced to stay below the corporate rate limit. No new database migration is required.

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

- `GET workspace`: identity, company, roster, attached group products, including inactive products (and nominee requirements), permitted invoices/inventory/access data, recent activity.
- `POST logout`: revokes the current session.
- `POST employees/save`: creates/edits an employee (optional id for edits). Creation requires requestId (UUID), productsId, dateofBirth and gender; optional ohoCardNumber, family (PersonDto[]) and nominees ({productsId,familyIndex,guardianIndex}[]). Guardian index -1 selects the primary employee.
- `POST employees/customer`: company-scoped customer cards, products, family and onboarding status by employee id.
- `POST employees/provision`: employee permission required; claims a Ready order or reconciles the existing attempt by employee id.
- `POST employees/remove`: soft-removes by id.
- `POST inventory/save`: adds stock.
- `POST inventory/assign`: inventory id and employeeId.
- `POST roles/save`: name and permissions array.
- `POST users/save`: name, email, roleId, status, password; optional id for editing, password optional for edits.

CompanyId is never accepted from clients. Server-side identity scopes all company records; foreign-company IDs are rejected. All business mutations write an audit event in the same transaction. CSV export neutralizes spreadsheet formula prefixes.

## Release checklist

Run `npm run corporate:build`, `npm run server:build` and `npm run server:test`. Stage the migration and provision a test Group/admin. Verify against MySQL/dev2: onboarding a new customer, linking an existing customer, attached/unattached products, free/paid and inactive group products, absence of direct Customer writes, Primary/Secondary/Family classification, supplied/generated cards, family limits, nominees/guardians, timeout reconciliation, customer/admin visibility, each role, HR removal, invoice visibility and user session revocation. Automated tests use database stubs and do not replace staging schema verification.

Configure DNS for `corporate.ohoindialife.com`, HTTPS, the static web root and `/api` reverse proxy, then provision actual company accounts. No DNS, hosting, real company provisioning or database migration is performed simply by building this code.
