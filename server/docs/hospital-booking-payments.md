# Hospital booking UPI payments

The booking remains a free consultation when its membership coupon applies. The payment flow records a separate hospital charge against that booking. Payment-app responses are customer-device reports, and do not confirm settlement or redeem a coupon.

## Database rollout

Run from the repository root with `server/.env` or deployment environment variables containing `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` and optionally `DB_SSL=true`:

```powershell
node server/scripts/migrate-hospital-booking-payments.cjs
node server/scripts/migrate-hospital-booking-payments.cjs --apply --database=<exact-DB_NAME>
```

The first command is a read-only preflight. Apply requires an explicit target matching the configured database, checks the existing booking tables, takes a migration lock and creates two InnoDB tables. DDL autocommits; both statements are additive and idempotent. It never changes existing hospital, customer, booking, coupon, subscription or wallet records. Logs contain table names and aggregate counts, without credentials or scanned QR payloads.

Every active, non-cancelled booking supports scanning the hospital's UPI payment QR. No preconfigured hospital recipient is required. With no settings row, the recipient comes from the scanned `pa` and `pn` fields, with the UPI ID used when the name is absent. The customer reviews and confirms that receiver; it is not represented as a verified hospital account. The default maximum amount is ₹1,00,000.

`HospitalBookingPaymentSettings` optionally stores an approved recipient or operator override per hospital. An explicit row with `IsEnabled=FALSE` disables payments for that hospital. A valid enabled row enforces its approved UPI ID, recipient name and maximum amount. Recipient names must contain at most 128 characters and no control characters, matching Android. Supply `MerchantCode` when issued by the acquiring bank. No recipient accounts or settings rows are guessed or seeded by the migration.

`HospitalBookingPaymentAttempt` retains the UUID request key, generated transaction reference, amount, recipient snapshot, selected Android package, app response, timestamps and separate bank verification state. Unique indexes prevent reuse of transaction references or duplicate request keys for the same booking. There are no new foreign keys against legacy tables, avoiding changes to existing data types and delete behavior. Missing payment tables produce HTTP 503 with a customer-safe unavailable message until the migration is applied.

## API contract

All routes require the existing bearer session. A booking must belong to the authenticated primary customer or a linked family customer, matching the booking-list ownership rule.

| Route                                                                 | Body                                                                                | Result                                                                                                                                              |
| --------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /api/BookingConsultation/:bookingId/payments`                    | —                                                                                   | `{bookingId, booking:{id,hospitalId,hospitalName,patientName}, paymentEnabled, disabledReason, approvedPayee:{upiId,payeeName}\|null, attempts:[]}` |
| `POST /api/BookingConsultation/:bookingId/payments`                   | `{upiUri, amount?, clientRequestId:<UUIDv4>, appPackage?}`                          | Prepared attempt with safe `upiUri` and generated `transactionRef`                                                                                  |
| `POST /api/BookingConsultation/:bookingId/payments/:attemptId/result` | `{appPackage,outcome,responseCode?,resultCode?,txnId?,approvalRefNo?,rawResponse?}` | Updated attempt                                                                                                                                     |

An attempt exposes `id`, `bookingId`, `transactionRef`, `amount`, `payeeVpa`, `payeeName`, `upiUri`, `status`, `verificationStatus`, `appPackage`, `responseCode`, `resultCode`, `txnId`, `approvalRefNo`, `createdAt`, `updatedAt`, `expiresAt`, `reportedAt` and `verifiedAt`. Timestamps are UTC ISO strings. Raw app responses and request hashes are stored privately and omitted from history responses. History returns the most recent 100 attempts.

Choose the installed payment app before preparing, and include `appPackage`; this persists the choice even if Android kills the customer app during payment. Reuse `clientRequestId` only when retrying the same preparation request. A changed recipient, amount or app with the same key returns HTTP 409. A result retry must contain the same response fields; a contradictory response or substituted app returns HTTP 409.

Preparation accepts only `upi://pay`. If an enabled approved account is configured, the scanned UPI ID must match it and the server uses the approved recipient name. Otherwise the validated scanned receiver is used. Amounts must be positive INR values with at most two decimal places, within the hospital or default limit. A supplied amount must match any amount already embedded in the QR. The server assigns a unique booking reference and note and retains a valid merchant code. It does not forward arbitrary QR links or intent parameters. Malformed encoding, duplicate/ambiguous parameters, other URI schemes, non-INR amounts and signed QR codes are rejected. Signed QR or provider-specific payment formats need a supported merchant-provider integration rather than rewriting their signatures.

## Result and retry behavior

- `CREATED` records preparation before launching Android. It expires after 15 minutes when history is read or a later prepare request checks it. An idempotent retry also returns the expired state rather than reopening an old intent. The UI must warn customers to check the previous payment before retrying an expired attempt.
- `SUCCESS`, `CANCELLED`, `FAILURE` and `UNKNOWN` record the app/device report. A callback never changes booking status, wallet balances, coupon utilization or `VerificationStatus`.
- Unexpired `CREATED`, unverified `SUCCESS` and unverified `UNKNOWN` block another payment for that booking. Unknown and success outcomes require hospital/provider confirmation rather than silently expiring. A bank-verified attempt also blocks another payment.
- `CANCELLED` and `FAILURE` permit a new attempt with a new request UUID. A cancelled activity result alone does not prove that a bank transaction failed; the UI should distinguish absent results as `UNKNOWN` and encourage checking the bank before retrying.
- The booking row lock plus a MySQL connection-owned named lock serialize preparation and reporting across server instances. Late responses can still be retained after a preparation expires; clients must not automatically relaunch old attempts.

## Settlement confirmation

There is no configured acquiring-bank or payment-provider status API in this repository. Consequently this implementation does not automatically mark any payment as bank verified. A future authenticated reconciliation integration must validate the generated `TransactionRef`, exact requested amount and saved recipient with the acquiring PSP, then update `VerificationStatus` and `VerifiedAt` from that trusted result. It must also decide how extra charges, reversals and refunds should affect a booking.

Google's [Android UPI integration guide](https://developers.google.com/pay/india/api/android/in-app-payments) requires checking submitted or succeeded responses with the payment service provider before treating an order as paid. Real PhonePe, Google Pay and other installed-app payments must be tested on physical Android devices using the hospital's approved merchant setup; app/provider eligibility and bank limits still apply.

## Verification

```powershell
npm --prefix server run build
node --test server/test/booking-payments.test.cjs server/test/hospital-booking-payment-migration.test.cjs
```

Coverage includes family ownership, payee and amount tampering, URI parsing, DTO bounds, idempotent preparation and callbacks, overlapping requests, cancellation/failure retries, unresolved outcomes, expiration, no client-triggered settlement, dry-run behavior and guarded additive migration.
