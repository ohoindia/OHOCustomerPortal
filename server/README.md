# OHO customer NestJS server

This app implements the 18 endpoints currently called by `src/pages/auth` and `src/services/home.ts`. Controllers handle HTTP routing and DTO validation; services own business rules and parameterized MySQL queries. It runs independently of .NET and uses the existing OHO database. It does not migrate unrelated administrative APIs from the backend solution.

## Run locally

For a new AWS Lambda deployment and redeployment after changes, see [DEPLOYMENT.md](DEPLOYMENT.md). The Lambda entry point and AWS SAM template are included.

Requires Node.js 22 or newer and access to the existing MySQL database.

From the repository root:

```powershell
npm --prefix server ci
Copy-Item server/.env.example server/.env
```

Fill in `server/.env` with the database settings corresponding to the .NET `dbString`. Use the supplied `DB_TIMEZONE=+05:30` for the legacy India-time DATETIME columns. Set `DB_SSL=true` when the database requires TLS.

Configure either `SMS_PROVIDER=msg91` with `MSG91_AUTH_KEY` and `MSG91_OTP_TEMPLATE_ID`, or `SMS_PROVIDER=smsfresh` with its URL, user, password and sender. SMS is disabled by default; OTP requests return a configuration error until a provider is configured. OTPs are never returned in an API response or printed to the console.

Set both values in the frontend's existing `.env.local`:

```dotenv
VITE_API_BASE_URL=http://localhost:3000
VITE_LEGACY_API_BASE_URL=http://localhost:3000
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

| Module | Method and route | .NET logic / data source |
| --- | --- | --- |
| customer-auth | POST `/lambdaAPI/Customer/mobileNoValid` | Customer lookup, with the community fallback used by memberlogin |
| customer-auth | POST `/lambdaAPI/Customer/checkingMobileno` | Registration/profile checks, daily OTP limit, resend cooldown, MobileOTPHistory |
| customer-auth | POST `/lambdaAPI/Customer/toSetNewPassword` | Registered customer check, OTP generation and SMS delivery |
| customer-auth | POST `/lambdaAPI/Customer/OTPValidation` | MobileNumber + GUID + OTPGenerated + expiry check |
| customer-auth | POST `/lambdaAPI/Customer/memberlogin` | Customer and CommunityCustomers password checks, CommunityGroup lookup, UserLogin record |
| customer-auth | POST `/lambdaAPI/Customer/add` | Duplicate check, OHOCODE sequence, Primary account defaults, onboarding notification |
| customer-auth | POST `/lambdaAPI/Customer/updatePassword` | Password update and IsProfileCompleted flag |
| customers | GET `/lambdaAPI/Customer/GetById/:id` | Customer table and explicit public field mapping |
| customers | GET `/lambdaAPI/Customer/GetMemberProducts/:id` | View_Subscription, CustomerController.TransformData |
| customers | GET `/lambdaAPI/Customer/AddressExistsOrNot/:id` | AddressLine1 check |
| customers | POST `/lambdaAPI/Customer/KYCVerifiedOrNot` | Latest VALID/success AadhaarOTPVerificationData, linking missing CustomerId |
| customers | POST `/lambdaAPI/Customer/PANVerifiedOrNot` | Valid PANVerification record and PANDocument |
| cards | GET `/lambdaAPI/OHOCards/GetMemberCardByMemberId/:id` | OHOCardsController, OHOCardsRepo.GetMemberCardDetails |
| consultations | POST `/lambdaAPI/BookingConsultation/PendingAndSuccessConsultationList` | BookingConsultationRepo, service/status/policy joins, optional coupon filter |
| communities | GET `/lambdaAPI/CommunityCustomers/GetById/:id` | CommunityCustomersController, customer association by mobile |
| communities | GET `/lambdaAPI/Group/GetById/:id` | GroupController, GroupRepo.FetchGroupIdData |
| catalog | POST `/ConfigValues/all` | OHO.APILambda ConfigValuesController, ConfigValues public columns |
| catalog | POST `/Products/all` | OHO.APILambda ProductsController, GetDataRepo.SelectQry, ProductsDetails view |

Catalog endpoints also support `/api/...` and `/apiLambda/...` prefixes. Use the base URL without these prefixes for the supplied local frontend configuration. Pagination accepts `{ "skip": 0, "take": 0 }`; `take: 0` retains the legacy unlimited result behavior.

The SMS adapter follows `OHO.Lambda.API/Commands/SendOTPCommand.cs`. Optional `ONBOARDING_SMS_QUEUE_URL` uses AWS's default credential chain and the legacy camelCase `SendWebhookMSG` payload and message type attribute. Delivery failures after registration are logged for separate retry; there is no durable retry/outbox in this app. This registration UI collects no email, so it does not enqueue onboarding email. The legacy password audit queue is not implemented.

## Compatibility and intentional differences

- Both camelCase and PascalCase request DTO properties are accepted, including `GUID` and `OTPGenerated`. Response fields preserve the casing expected by React (`MemberId`, `Products`, `returnData`, `data.customerId`). POST success responses use HTTP 200.
- The frontend sends POST to `toSetNewPassword`, while the .NET controller declares GET with a body. This server implements POST.
- `GetMemberProducts` returns a JSON array directly rather than a serialized JSON string. Joined subscription records are grouped into customers, products, policies, dependents, insurers and nominees. The dependent/insurer/nominee associations follow the .NET transformation.
- Customer and community responses omit Password and OTP fields. MySQL TINYINT(1) and BIT(1) values become JSON booleans.
- Registration and password reset require `guid` and `otpGenerated` alongside their existing fields. `src/pages/auth/OTP.tsx` now supplies them. Proofs must be unexpired and belong to the requested flow, and are expired atomically after use. These flows do not accept pre-migration OTP records without the flow marker.
- Five OTP sends per India calendar day are allowed. A resend must wait for the previous two-minute OTP expiry. Advisory locks serialize sends and OHOCODE generation across NestJS instances; mutation transactions lock OTP rows. Existing .NET writers do not participate in these advisory locks.
- Community accounts can be detected and reset as well as logged in. The current React login screen still requires a positive MemberId, so community-only accounts (`MemberId: 0`, as in .NET) need a separate frontend change to enter the portal.
- The existing four-digit plaintext password storage and `1234` registration default are retained for database compatibility. The source's JWT generation is commented out; this migration does not add session authorization to profile/card/consultation routes. Production authentication and password hashing require a coordinated database/frontend migration.
- Invalid input returns HTTP 400, configuration errors HTTP 503, throttling HTTP 429 and unexpected failures HTTP 500. Error responses never expose stack traces. Business failures retain the `status: false` envelope.

## Validation and live dependencies

`npm test` builds the app and runs HTTP contract and service tests using mocked database and notification providers. Tests cover home routes, DTO aliases, malformed inputs, credential omission, registration, reset OTP proof checks, OTP cooldown/daily limits, SMS failure ordering, joined subscription grouping, and lock release after commit/rollback. Tests send no SMS and write no customer data.

Live SQL, schema/view availability, provider credentials and SQS delivery must be checked against a configured test environment. No database schema, view definitions or credentials are copied from the .NET project, and no live database or SMS calls were made during implementation.

Framework references: [NestJS controllers](https://docs.nestjs.com/controllers), [MySQL2](https://sidorares.github.io/node-mysql2/docs).
