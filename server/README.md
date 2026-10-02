# OHO customer NestJS server

JWT authentication protects customer data routes. Before running, configure `JWT_SECRET` in `ConfigSecrets`; see [authentication setup and session behavior](AUTHENTICATION.md).

Swagger UI: [http://localhost:3000/swagger](http://localhost:3000/swagger). OpenAPI JSON: [http://localhost:3000/swagger-json](http://localhost:3000/swagger-json). Use your configured port if it differs from 3000. After Lambda deployment, append `/swagger` or `/swagger-json` to the API base URL.

Start the backend with `npm run server:dev` from the repository root. In Swagger, execute `memberlogin`, copy the returned `JwtToken`, and paste it into **Authorize** without the `Bearer` prefix. Protected endpoints then send the authorization header. Documentation is public; customer API routes retain JWT and ownership checks. Executing registration, OTP, and password-reset requests invokes the real configured services.

This app implements the 18 endpoints currently called by `client/src/pages/auth` and `client/src/services/home.ts`. Controllers handle HTTP routing and DTO validation; services own business rules and parameterized MySQL queries. It runs independently of .NET and uses the existing OHO database. It does not migrate unrelated administrative APIs from the backend solution.

## Run locally

For a new AWS Lambda deployment and redeployment after changes, see [DEPLOYMENT.md](DEPLOYMENT.md). The Lambda entry point and AWS SAM template are included.

Requires Node.js 22 or newer and access to the existing MySQL database.

From the repository root:

```powershell
npm --prefix server ci
Copy-Item server/.env.example server/.env
```

Fill in `server/.env` with the database settings corresponding to the .NET `dbString`. Use the supplied `DB_TIMEZONE=+05:30` for the legacy India-time DATETIME columns. Set `DB_SSL=true` when the database requires TLS.

Only `DB_*` settings belong in `server/.env` locally or Lambda environment variables when deployed. All application settings, including SMS credentials, CORS origins, queue settings and the local port, are read from the existing `ConfigValues` and `ConfigSecrets` tables. `ConfigSecrets` takes precedence, matching .NET startup. Existing .NET key names are supported; see [CONFIGURATION.md](CONFIGURATION.md) for the mapping. SMS defaults to disabled until configured in these tables. OTPs are never returned in an API response or printed to the console.

Set the API base URL in the frontend's existing `client/.env.local`:

```dotenv
VITE_API_BASE_URL=http://localhost:3000
```

Start these in separate terminals, from the repository root:

```powershell
npm run server:dev
```

```powershell
npm run dev
```

`GET http://localhost:3000/health` checks that the process is running; it does not check the database or SMS provider. Restart Vite after changing frontend environment variables. Existing `.env.local` credentials and URLs have not been overwritten.

```powershell
npm run server:build
npm run server:test
npm --prefix server run start:prod
```

## Modules and API mapping

Source references below are relative to `C:\code\app\ohoindia\OHOBackEnd`. Customer routes use `OHO.Lambda.API/Controllers/CustomerController.cs` and `OHO.Database.Repositaries/CustomerRepo.cs`, rather than the older Member APIs.

| Module        | Method and route                                                  | .NET logic / data source                                                                                     |
| ------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| customer-auth | POST `/api/Customer/mobileNoValid`                                | Customer lookup, with the community fallback used by memberlogin                                             |
| customer-auth | POST `/api/Customer/checkingMobileno`                             | Registration/profile checks, daily OTP limit, resend cooldown, MobileOTPHistory                              |
| customer-auth | POST `/api/Customer/toSetNewPassword`                             | Registered customer check, OTP generation and SMS delivery                                                   |
| customer-auth | POST `/api/Customer/OTPValidation`                                | MobileNumber + GUID + OTPGenerated + expiry check                                                            |
| customer-auth | POST `/api/Customer/memberlogin`                                  | Customer and CommunityCustomers password checks, CommunityGroup lookup, UserLogin record                     |
| customer-auth | POST `/api/Customer/add`                                          | Duplicate check, OHOCODE sequence, Primary account defaults, onboarding notification                         |
| customer-auth | POST `/api/Customer/updatePassword`                               | Password update and IsProfileCompleted flag                                                                  |
| customers     | GET `/api/Customer/GetById/:id`                                   | Customer table and explicit public field mapping                                                             |
| customers     | GET `/api/Customer/GetMemberProducts/:id`                         | View_Subscription, CustomerController.TransformData                                                          |
| customers     | GET `/api/Customer/AddressExistsOrNot/:id`                        | AddressLine1 check                                                                                           |
| customers     | POST `/api/Customer/KYCVerifiedOrNot`                             | Latest VALID/success AadhaarOTPVerificationData, linking missing CustomerId                                  |
| customers     | POST `/api/Customer/PANVerifiedOrNot`                             | Valid PANVerification record and PANDocument                                                                 |
| cards         | GET `/api/OHOCards/GetMemberCardByMemberId/:id`                   | OHOCardsController, OHOCardsRepo.GetMemberCardDetails                                                        |
| consultations | POST `/api/BookingConsultation/PendingAndSuccessConsultationList` | BookingConsultationRepo, service/status/policy joins, optional coupon filter                                 |
| consultations | POST `/api/BookingConsultation/checkAvailableCoupons`             | Free consultation availability from Subscription/Products/ComboProducts, claimed visits and RequestedCoupons |
| consultations | POST `/api/BookingConsultation/checkIndividualCoupons`            | Same eligibility check for self or an owned dependent at the selected hospital                               |
| consultations | POST `/api/BookingConsultation/bookAppointment/add`               | Initiate a free consultation and write BookingConsultationActivity in one transaction                        |
| communities   | GET `/api/CommunityCustomers/GetById/:id`                         | CommunityCustomersController, customer association by mobile                                                 |
| communities   | GET `/api/Group/GetById/:id`                                      | GroupController, GroupRepo.FetchGroupIdData                                                                  |
| catalog       | POST `/api/ConfigValues/all`                                      | OHO.APILambda ConfigValuesController, ConfigValues public columns                                            |
| catalog       | POST `/api/Products/all`                                          | OHO.APILambda ProductsController, GetDataRepo.SelectQry, ProductsDetails view                                |

All customer and catalog endpoints use the `/api/...` prefix. Configure frontend base URLs without the `/api` suffix; the shared controllers include it in request paths. Pagination accepts `{ "skip": 0, "take": 0 }`; `take: 0` retains the legacy unlimited result behavior.

Book Service coupon requests accept `{ "customerId": 12, "hospitalId": 5, "dependentCustomerId": null }`. Booking requests also include `hospitalPoliciesId`. The server checks account ownership, membership-card validity, hospital free-consultation provision, coupon availability and already-initiated bookings for that patient today. Patient details, hospital details, card number and Initiated status come from the database. Family booking requests use an advisory lock and transaction; a successful initiation returns `data.BookingConsultationId`. It does not mark the coupon as claimed before the visit.

The SMS adapter follows `OHO.Lambda.API/Commands/SendOTPCommand.cs`. Optional `onboardingSMSQueue` / `ONBOARDING_SMS_QUEUE_URL` is read from the configuration tables and accepts a queue name or HTTPS URL. It uses AWS's default credential chain and the legacy camelCase `SendWebhookMSG` payload and message type attribute. Delivery failures after registration are logged for separate retry; there is no durable retry/outbox in this app. This registration UI collects no email, so it does not enqueue onboarding email. The legacy password audit queue is not implemented.

## Compatibility and intentional differences

- Both camelCase and PascalCase request DTO properties are accepted, including `GUID` and `OTPGenerated`. Response fields preserve the casing expected by React (`MemberId`, `Products`, `returnData`, `data.customerId`). POST success responses use HTTP 200.
- The frontend sends POST to `toSetNewPassword`, while the .NET controller declares GET with a body. This server implements POST.
- `GetMemberProducts` returns a JSON array directly rather than a serialized JSON string. Joined subscription records are grouped into customers, products, policies, dependents, insurers and nominees. The dependent/insurer/nominee associations follow the .NET transformation.
- Customer and community responses omit Password and OTP fields. MySQL TINYINT(1) and BIT(1) values become JSON booleans.
- Registration and password reset require `guid` and `otpGenerated` alongside their existing fields. `client/src/pages/auth/OTP.tsx` now supplies them. Proofs must be unexpired and belong to the requested flow, and are expired atomically after use. These flows do not accept pre-migration OTP records without the flow marker.
- Five OTP sends per India calendar day are allowed. A resend must wait for the previous two-minute OTP expiry. Advisory locks serialize sends and OHOCODE generation across NestJS instances; mutation transactions lock OTP rows. Existing .NET writers do not participate in these advisory locks.
- Community accounts can be detected, reset, and logged in. Community-only accounts (`MemberId: 0`, as in .NET) can enter the portal with a valid JWT; their data access is restricted to their community identity and group.
- The existing four-digit plaintext password storage and `1234` registration default are retained for database compatibility. Login and OTP-verified registration now issue expiring JWTs. Data routes require a token and enforce customer ownership. Password hashing still requires a coordinated database migration. See [authentication](AUTHENTICATION.md).
- Invalid input returns HTTP 400, configuration errors HTTP 503, throttling HTTP 429 and unexpected failures HTTP 500. Error responses never expose stack traces. Business failures retain the `status: false` envelope.

## Validation and live dependencies

See [API security](SECURITY.md) for rate limits, production settings, proxy trust,
and remaining deployment and legacy credential requirements.

`npm test` builds the app and runs HTTP contract and service tests using mocked database and notification providers. Tests cover home routes, DTO aliases, malformed inputs, credential omission, registration, reset OTP proof checks, OTP cooldown/daily limits, SMS failure ordering, joined subscription grouping, and lock release after commit/rollback. Tests send no SMS and write no customer data.

Live SQL, schema/view availability, provider credentials and SQS delivery must be checked against a configured test environment. No database schema, view definitions or credentials are copied from the .NET project, and no live database or SMS calls were made during implementation.

Framework references: [NestJS controllers](https://docs.nestjs.com/controllers), [MySQL2](https://sidorares.github.io/node-mysql2/docs).
