# OHOINDIA operator scripts

Use these scripts from a trusted OHOINDIA workstation with database access until an internal administration app is built. They use `server/.env` / backend environment variables (`DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, optional `DB_SSL`). Verify the target database before running. These are direct database operations, not public API endpoints.

From the repository root:

```powershell
cd server
npm ci
npm run build
```

The corporate migration must already be applied. For a new company, create its existing OHOINDIA `Group` first, then use `provision`. For an already provisioned company, use `list-access` and `save-user`; do not provision it again.

Each invocation reads one JSON object from stdin until EOF. The following PowerShell example prompts for the password without saving it in shell history. Replace the example IDs, name and email with real values. Use a fresh private password of 12–128 characters.

```powershell
$request = @{
  action = 'save-user'
  companyId = 123
  name = 'Corporate HR'
  email = 'hr@example.com'
  role = 'HR'
  status = 'Active'
}
$secret = Read-Host 'Initial password' -AsSecureString
$credential = [System.Management.Automation.PSCredential]::new('operator', $secret)
try {
  $request.password = $credential.GetNetworkCredential().Password
  $request | ConvertTo-Json -Compress | node scripts/corporate-admin.cjs
  if ($LASTEXITCODE -ne 0) { throw 'Corporate operation failed' }
} finally {
  $request.Remove('password')
  Remove-Variable credential, secret -ErrorAction SilentlyContinue
}
```

The password passes through process memory and stdin. Do not log the request or save it in source control. Share credentials through your approved private channel. The script prints IDs/success, never passwords or hashes. No email invitation or forced password change is currently implemented.

To create a company's first Admin, use the same password prompt and invocation with this request instead:

```powershell
$request = @{
  action = 'provision'
  groupId = 456
  companyName = 'Example Company'
  name = 'Company Administrator'
  email = 'admin@example.com'
}
```

This creates the company, default roles and first Admin in one transaction, and returns `companyId`. Group IDs and company IDs are different identifiers. Repeat provisioning fails without overwriting existing records.

Inspect users and available roles with the returned company ID:

```powershell
@{ action = 'list-access'; companyId = 123 } |
  ConvertTo-Json -Compress | node scripts/corporate-admin.cjs
```

| Role | Access |
| --- | --- |
| Admin | Employees, inventory, invoices, roles and user access |
| HR | Employees and inventory |
| Finance | Invoices |
| Viewer | Directory and recent company activity |

All roles can read employee contact details and recent company activity. Roles belong to one company; use the exact role name returned by `list-access`. Email addresses must be unique across companies. Portal credentials are separate from customer/mobile credentials.

To create another Admin, use the first example with `role = 'Admin'`. To update a user, include `userId` from the listing and supply their full name, email, role and status. Omit `password` to retain it:

```powershell
@{
  action = 'save-user'
  companyId = 123
  userId = 789
  name = 'Corporate HR'
  email = 'hr@example.com'
  role = 'HR'
  status = 'Disabled'
} | ConvertTo-Json -Compress | node scripts/corporate-admin.cjs
```

Set `status = 'Active'` to re-enable. To reset a password, set `$request` to the full `save-user` object including `userId`, then run the password prompt block. An OHOINDIA operator can recover the sole Admin this way while keeping `role = 'Admin'` and `status = 'Active'`.

Updates revoke all sessions for that user, so they must sign in again. The script prevents disabling or demoting the last active access administrator. User changes and audit entries are atomic and use the same company lock as portal user management. It does not move users between companies or delete accounts. Listing is read-only and excludes password hashes and session tokens.

The future OHOINDIA administration app can expose these operations behind a separate internal operator identity and authorization policy. The scripts currently require trusted database access; they do not establish an OHOINDIA operator login.
