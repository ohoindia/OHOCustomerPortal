# AWS Lambda deployment and redeployment

The included `template.yaml` creates a new Lambda function, execution role, API Gateway HTTP API and invocation permissions in an AWS CloudFormation stack. NestJS runs through `src/lambda.ts`; it initializes once per execution environment and reuses the app and database pool on warm requests. Local development continues using `src/main.ts`.

The commands below use PowerShell, region `ap-south-1` and stack `oho-customer-api-dev`. Run them from **the `server` folder**. Use a separate stack and configuration for production.

## 1. Prerequisites

- Node.js 22+, npm, AWS CLI v2 and AWS SAM CLI installed.
- AWS access to deploy CloudFormation, Lambda, API Gateway, IAM execution roles and SAM's S3 deployment artifacts, and to edit the function's database environment variables.
- The existing OHO MySQL schema and views, database credentials and an SMS provider account. This stack does not create or migrate the database.

Verify the tools and the AWS account you intend to use:

```powershell
Set-Location C:\code\oho\ohoCustomerApp\server
node --version
npm --version
aws --version
sam --version
aws configure sso --profile oho-dev
aws sso login --profile oho-dev
$env:AWS_PROFILE = 'oho-dev'
aws sts get-caller-identity
```

Use your existing profile instead of configuring a new one when available. Keep the same profile and region for deployment, logs and validation commands.

## 2. Prepare database and application configuration

Database connection settings are stored directly in the Lambda function's **Configuration â†’ Environment variables**. After creating the function in step 5, add:

```dotenv
DB_HOST=your-existing-mysql-host
DB_PORT=3306
DB_USER=your-db-user
DB_PASSWORD=your-db-password
DB_NAME=your-existing-db-name
DB_TIMEZONE=+05:30
DB_SSL=true
```

Set `DB_SSL` according to the existing database. Locally, use the same `DB_*` keys in `server/.env`. The SAM template deliberately omits the function's `Environment` property; database values are maintained directly in Lambda, and are not saved in SAM parameters or Git.

All other application settings come from the existing MySQL `ConfigValues` and `ConfigSecrets` tables, using their `ConfigKey` / `ConfigValue` columns. Configure the frontend's `CORS_ORIGINS`, provider selection (`SMSGateway`), provider credentials and optional queue settings there. Existing .NET key names work without renaming; see [CONFIGURATION.md](CONFIGURATION.md). `ConfigSecrets` overrides `ConfigValues` and settings refresh after a 60-second cache interval. AWS Secrets Manager is not used by this app.

## 3. Configure database network access

For a private RDS/MySQL database, provide these template parameters during guided deployment:

- `VpcSubnetIds`: comma-separated **private** subnet IDs in the database's VPC, such as `subnet-aaa,subnet-bbb`.
- `VpcSecurityGroupIds`: comma-separated Lambda security group IDs in that VPC, such as `sg-aaa`.

Allow MySQL TCP port 3306, or your configured port, from the Lambda security group into the database security group. Ensure the Lambda security group's outbound rules allow the database connection.

Private subnets need a working NAT route for outbound HTTPS to MSG91/SMSFresh. An SQS VPC endpoint can provide SQS access, but it does not provide access to the public SMS provider. Assigning Lambda to a public subnet alone does not provide internet access. See [AWS's VPC internet access guide](https://docs.aws.amazon.com/lambda/latest/dg/configuration-vpc-internet.html).

If the database is deliberately reachable outside a VPC, leave **both** VPC parameters empty and ensure its firewall permits the connection. Lambda's default outbound addresses are not fixed; use private networking or NAT with a controlled egress address when an IP allowlist is required.

For onboarding SMS via SQS, configure `onboardingSMSQueue` (a queue name) or `ONBOARDING_SMS_QUEUE_URL` in the tables and supply the queue's ARN as `OnboardingSmsQueueArn`. Leave the setting and parameter empty if not used. The template grants `sqs:SendMessage` and `sqs:GetQueueUrl` only for the supplied ARN. A queue encrypted with a customer-managed KMS key needs corresponding KMS permissions added to the execution role and key policy.

## 4. Build and validate the deployment artifact

```powershell
npm ci
npm test
npm run package:lambda
sam validate --lint --template-file template.yaml --region ap-south-1
```

`package:lambda` compiles TypeScript, recreates `build/lambda/`, copies `dist`, `package.json` and the lockfile, and installs only production dependencies into that directory. It excludes local `.env` files, source files, tests and development dependencies. The template packages this directory with handler `dist/lambda.handler` and runtime `nodejs22.x`. No separate `sam build` step is needed for this prebuilt artifact.

The current dependencies are JavaScript packages and can be staged on Windows. If a future dependency adds native binaries, produce the artifact in a Linux environment matching Lambda's x86_64 architecture.

## 5. First deployment: create a new function and API

```powershell
sam deploy --guided --template-file template.yaml --stack-name oho-customer-api-dev --region ap-south-1 --capabilities CAPABILITY_IAM
```

During the prompts:

1. Enter your VPC subnet/security group IDs, or leave both empty as described above.
2. Enter the optional onboarding queue ARN, or leave it empty.
3. Allow SAM to create the execution role; keep CloudFormation rollback enabled.
4. Save settings to `samconfig.toml` for subsequent deployments. This file is ignored by Git.
5. Review and confirm the CloudFormation changes.

The API follows the app's existing unauthenticated route behavior; the template does not add an authorizer. Review the authentication limitations in [README.md](README.md#compatibility-and-intentional-differences) before exposing customer data in a production environment.

On success, CloudFormation outputs `ApiBaseUrl` and `FunctionName`. Fetch them at any time:

```powershell
aws cloudformation describe-stacks --stack-name oho-customer-api-dev --region ap-south-1 --query 'Stacks[0].Outputs' --output table
```

Open the function identified by `FunctionName`, choose **Configuration â†’ Environment variables â†’ Edit**, add the database keys from step 2 and save. No SMS or application settings need to be added to Lambda environment variables. See [AWS Lambda environment variables](https://docs.aws.amazon.com/lambda/latest/dg/configuration-envvars.html).

The base URL has no `/Prod` or `/api` suffix because this template uses the HTTP API `$default` stage. Example:

```text
https://abc123.execute-api.ap-south-1.amazonaws.com
```

## 6. Verify and connect the frontend

Replace the example URL below with the `ApiBaseUrl` output:

```powershell
$customerApiBase = 'https://abc123.execute-api.ap-south-1.amazonaws.com'
Invoke-RestMethod -Uri "$customerApiBase/health"
```

Expect `{ "status": true, "service": "oho-customer-server" }`. Health checks do not validate database connectivity or SMS credentials. Check a read-only route using a designated test account, then test login, OTP registration and reset against that account. OTP tests send real SMS and successful registration/reset changes test data.

Set both frontend build environment variables to the same base URL:

```dotenv
VITE_API_BASE_URL=https://abc123.execute-api.ap-south-1.amazonaws.com
VITE_LEGACY_API_BASE_URL=https://abc123.execute-api.ap-south-1.amazonaws.com
```

Restart Vite for local use. For a hosted frontend, set these values in its build environment, rebuild with `npm run build` from the repository root, then publish the resulting frontend `client/dist` using your existing hosting process. Vite embeds these URLs at build time.

## 7. Redeploy after code or dependency changes

From the `server` folder, with the original `samconfig.toml` and AWS profile:

```powershell
npm ci
npm test
npm run package:lambda
sam validate --lint --template-file template.yaml --region ap-south-1
sam deploy --template-file template.yaml --config-env default --no-fail-on-empty-changeset
```

This updates the existing CloudFormation stack and function. Its API base URL normally remains the same. Rebuild the artifact after every server change; redeploying without packaging would deploy the previous build. Keep the same stack name and region. If `samconfig.toml` is unavailable, repeat the guided command with the **existing** stack name and region to restore settings.

After deployment, verify the function still has its database environment variables and repeat the health and test-account checks. A server-only code update does not require rebuilding the frontend unless the API URL or frontend contract changes.

## 8. Database, table configuration and infrastructure changes

For changed networking, concurrency, timeout, IAM permissions or API settings, update `template.yaml` or the relevant parameters, rebuild the artifact, validate and redeploy the same stack. Use `sam deploy --guided ...` with the same stack name and region to change saved parameter values.

For a changed database host/password or other database settings, edit the function's Lambda environment variables and save. Lambda starts fresh execution environments that create new database pools. No code redeployment is required. If you use the CLI to update environment variables, include every database key you want to retain: that operation replaces the entire variable map.

For a changed SMS key, provider, onboarding queue or frontend CORS origin, update its `ConfigKey` / `ConfigValue` in the existing `ConfigValues` or `ConfigSecrets` table. Warm instances refresh settings on the first settings lookup after their 60-second cache expires; cold instances read the current values immediately. No code redeployment or Lambda environment change is required. If the onboarding queue ARN changes, also update the SAM parameter and redeploy to grant access to the new queue.

When upgrading a stack created with the previous Secrets Manager template, remove its obsolete `ConfigSecretArn` / `ConfigRevision` overrides from your ignored SAM configuration, deploy this template and then reapply the `DB_*` environment variables directly in Lambda. Removing the old template's managed `Environment` property can remove its previous values during that transition.

Keep code and infrastructure changes in SAM. Maintain database environment variables directly in Lambda and application configuration directly in the database tables. Check database environment variables after infrastructure updates or function replacement.

## 9. Logs, troubleshooting and rollback

```powershell
sam logs --name CustomerApiFunction --stack-name oho-customer-api-dev --region ap-south-1 --tail
```

- **Handler/module not found:** confirm `build/lambda/dist/lambda.js` and production `node_modules` exist, then package and redeploy.
- **Database/configuration lookup failure:** check Lambda's database environment variables, networking and read access to both configuration tables. A health request without an Origin header does not prove database access.
- **SMS HTTPS timeout in a VPC:** check the private subnet's NAT route and outbound HTTPS access.
- **SQS AccessDenied:** check that the configured queue URL corresponds to the permitted ARN, its queue policy and any KMS permissions.
- **CORS errors:** update `CORS_ORIGINS` in the configuration tables and allow the 60-second cache to expire; a conflicting value in `ConfigSecrets` overrides `ConfigValues`.
- **Deployment failure:** inspect CloudFormation events. The saved rollback setting restores the stack on failed updates; a failed first deployment may require resolving the cause before recreating the failed stack.
- **API/function throttling:** the template starts with API throttling at 10 requests/second, burst 20, and Lambda concurrency 5. Tune this against database capacity; each warm function can create a pool of up to 10 connections. Nest's in-memory rate limiter is per Lambda execution environment, so it is not a shared user limit across instances.

For a successful release that needs to be reverted, use an isolated checkout/worktree of the previous known-good revision, copy your ignored SAM configuration into its `server` folder, run `npm ci`, tests and `package:lambda`, and deploy to the **same** stack and region. Review the infrastructure changes before applying that rollback. Restore configuration table values and database environment variables separately when needed; code rollback does not restore database data changed by API calls.

No AWS resources are created by installing, building, packaging, testing or locally validating the template. The `sam deploy` commands perform the actual deployment.

References: [AWS SAM deployment workflow](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/using-sam-cli-deploy.html), [Node.js Lambda runtime](https://docs.aws.amazon.com/lambda/latest/dg/lambda-nodejs.html), [serverless-express adapter](https://github.com/CodeGenieApp/serverless-express).
