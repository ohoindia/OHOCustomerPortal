# Configuration sources

JWT signing requires `JWT_SECRET` in `ConfigSecrets`. Optional `JWT_TTL_SECONDS`, `JWT_ISSUER`, and `JWT_AUDIENCE` settings are documented in [authentication setup](AUTHENTICATION.md).

Database connection settings come from **Lambda environment variables** (or `server/.env` locally): `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_TIMEZONE` and `DB_SSL`. Database values in configuration tables are ignored by the runtime settings loader.

Application settings come exclusively from the existing **ConfigValues** and **ConfigSecrets** MySQL tables. These are the actual names confirmed in .NET models and startup code. Both use `ConfigKey` and `ConfigValue` columns. There is no AWS Secrets Manager dependency and no SMS/queue/CORS environment variable fallback.

The loader reads ConfigValues, followed by ConfigSecrets. Matching keys in ConfigSecrets override public values, including legacy aliases. Duplicate keys within a table use the row with the highest ID. Keys are compared without case sensitivity; values are preserved. Credentials remain server-side and are not copied to `process.env` or exposed through a ConfigSecrets API.

## Supported keys

Use the existing .NET keys or their canonical aliases below.

| Application setting      | Existing .NET ConfigKey | Canonical ConfigKey      | Default / notes                                               |
| ------------------------ | ----------------------- | ------------------------ | ------------------------------------------------------------- |
| Allowed frontend origins | —                       | CORS_ORIGINS             | `http://localhost:5173`; comma-separated origins              |
| Local HTTP port          | —                       | PORT                     | `3000`; Lambda does not listen on a port                      |
| SMS provider             | SMSGateway              | SMS_PROVIDER             | `disabled`; accepts MSG91 / SMSFresh without case sensitivity |
| MSG91 auth key           | authkey                 | MSG91_AUTH_KEY           | Required for MSG91; store in ConfigSecrets                    |
| MSG91 OTP template       | MSG91OTPTemplateId      | MSG91_OTP_TEMPLATE_ID    | Required for MSG91                                            |
| MSG91 endpoint           | MSG91OTPURL             | MSG91_OTP_URL            | `https://control.msg91.com/api/v5/flow`                       |
| SMSFresh endpoint        | SMSFreshOTPURL          | SMSFRESH_OTP_URL         | Required for SMSFresh                                         |
| SMSFresh user            | smsfreshUser            | SMSFRESH_USER            | Required for SMSFresh                                         |
| SMSFresh password        | smsfreshPass            | SMSFRESH_PASSWORD        | Required for SMSFresh; store in ConfigSecrets                 |
| SMSFresh sender          | smsfreshSender          | SMSFRESH_SENDER          | Required for SMSFresh                                         |
| Onboarding SMS queue     | onboardingSMSQueue      | ONBOARDING_SMS_QUEUE_URL | Optional; accepts queue name or HTTPS URL                     |
| Queue region             | —                       | AWS_REGION               | `ap-south-1`                                                  |

For example, retain `SMSGateway=MSG91` and `MSG91OTPTemplateId=...` in ConfigValues, and `authkey=...` in ConfigSecrets if these rows already exist. Add/update `CORS_ORIGINS` to the deployed frontend origin. Avoid creating duplicate aliases; update the existing row for each setting. No table changes or automatic inserts are performed by this app.

## Loading and updates

API Gateway HTTP API also has a CORS allowlist, managed by the SAM `AllowedFrontendOrigins` parameter. Keep it aligned with `CORS_ORIGINS`. Gateway handles browser preflight without invoking Lambda and supplies CORS headers on integration responses. Adding a deployed browser origin requires updating both the gateway parameter and the database setting; local Nest CORS still reads only the database setting.

Each Nest/Lambda instance caches settings for 60 seconds. The first application settings lookup loads both tables; concurrent lookups share one refresh. After cache expiry, the next lookup reloads both tables. A failed refresh is retried on subsequent lookups and is not silently replaced by environment values or stale secrets.

SMS, queue and Nest CORS changes in the tables need no redeployment; they become visible after each instance's cache expires and it next looks up a setting. Deployed browser origin changes also require updating API Gateway's `AllowedFrontendOrigins` parameter. Updating a queue can also require an IAM update. Changing the local PORT requires restarting the local server.

CORS checks with an Origin header use the configuration tables. Requests without an Origin header, including the plain `/health` check, do not load configuration. Local HTTP startup reads PORT from the tables, so local startup requires database access. Lambda's health check without Origin can succeed while database settings are missing; test a database-backed endpoint as well.

AWS execution-role credentials are still supplied by Lambda through the AWS SDK's default credential chain; they are platform credentials, not application settings. Infrastructure settings such as Lambda memory, runtime, networking and API throttling remain in the SAM template.
