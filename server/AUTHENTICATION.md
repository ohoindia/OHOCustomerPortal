# JWT authentication

Login (`memberlogin`) and successful OTP-verified registration (`add`) return `JwtToken`, `tokenType: "Bearer"`, and an ISO `expiresAt`. Existing response fields remain available. Password reset does not create a session; the user logs in with the new password.

All routes require `Authorization: Bearer <JwtToken>` except `/health` and the mobile lookup, OTP, login, registration, and password-reset endpoints in `CustomerAuthController`. Nest's global JWT guard protects new controllers by default. Public auth endpoints still enforce their existing validation, throttling, and OTP proof checks.

Customer profile, package, card, consultation, address, and verification routes enforce the authenticated customer ID. Community and group routes enforce the signed community customer and group IDs. A community-only session cannot access customer-ID routes. Aadhaar checks also require the number to belong to the authenticated customer's stored profile.

## Configure before running

Keep the existing configuration-table workflow:

| Table           | ConfigKey         | Value                                                                                           |
| --------------- | ----------------- | ----------------------------------------------------------------------------------------------- |
| `ConfigSecrets` | `JWT_SECRET`      | Required random signing secret of at least 32 bytes; use the same value across server instances |
| `ConfigValues`  | `JWT_TTL_SECONDS` | Optional; defaults to `3600`; allowed range `60`–`86400` seconds                                |
| `ConfigValues`  | `JWT_ISSUER`      | Optional; defaults to `oho-customer-server`                                                     |
| `ConfigValues`  | `JWT_AUDIENCE`    | Optional; defaults to `oho-customer-app`                                                        |

Generate a secret locally and store it in `ConfigSecrets` through your existing configuration process:

```powershell
node -e "console.log(require('node:crypto').randomBytes(48).toString('base64'))"
```

Keep the secret out of frontend configuration, Git, and `ConfigValues`. The server reads `JWT_SECRET` exclusively from `ConfigSecrets`; missing or invalid settings fail closed with HTTP 503. No signing key is generated or inserted into a live database automatically. Settings refresh on the existing 60-second cache cycle; rotating the secret invalidates tokens as instances reload it.

`ConfigValues/all` returns only `HealthTip`, `OHOCareMobileNumber`, `BizManageVersion`, and `BizManageAppLocation`, the settings used by the dashboard and mobile update prompt. JWT and other server settings are never included.

## Session behavior

Tokens use HS256 with fixed algorithm validation, issuer, audience, expiry, subject, and a unique ID. Every protected request rechecks the account and a keyed password fingerprint. Password changes, account deactivation/deletion, and community membership changes invalidate existing sessions. The fingerprint does not contain the plaintext password.

The web client stores the token, expiry, and profile in `sessionStorage`. Its route guards require a live session, logout clears it, and token expiry or a protected API's HTTP 401 returns the user to login. Old profile-only sessions must log in again. HTTP 403 means the session is valid but cannot access that resource. A delayed 401 from an older session cannot clear a newly created session.

The shared transport in `common/api/transport.ts` accepts `getAccessToken` (sync or async) and `onUnauthorized` adapters. React Native can connect these to its secure token storage without importing browser code. Auth requests are anonymous and do not attach a stored bearer token. Configure both web API base URLs to the NestJS deployment for this authenticated API flow.

There is no refresh-token endpoint; users log in again after expiry. Logout removes the local session; a copied token remains valid until expiry or account/password/key invalidation. Existing four-digit password storage and the registration default remain for database compatibility; JWT does not change those password rules.

## Validation

Run `npm run server:test`, `npm test`, `npm run build`, and `npm run lint` from the repository root. Tests cover real JWT signing/verification, missing/invalid/expired tokens, ownership, password/account invalidation, community scopes, client expiry, and async mobile token adapters using mocked database providers. Tests do not call live databases or send SMS.

References: [Nest authentication guards](https://docs.nestjs.com/security/authentication) and [JWT verification options](https://github.com/auth0/node-jsonwebtoken#jwtverifytoken-secretorpublickey-options-callback).
