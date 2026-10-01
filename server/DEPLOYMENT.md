# AWS Lambda deployment and redeployment

The included `template.yaml` creates a new Lambda function, execution role, API Gateway HTTP API and invocation permissions in an AWS CloudFormation stack. NestJS runs through `src/lambda.ts`; it initializes once per execution environment and reuses the app and database pool on warm requests. Local development continues using `src/main.ts`.

The commands below use PowerShell, region `ap-south-1` and stack `oho-customer-api-dev`. Run them from **the `server` folder**. Use a separate stack and configuration for production.

## 1. Prerequisites

- Node.js 22+, npm, AWS CLI v2 and AWS SAM CLI installed.
- AWS access to deploy CloudFormation, Lambda, API Gateway, IAM execution roles and SAM's S3 deployment artifacts. Your deployment identity also needs `secretsmanager:GetSecretValue` for the configuration secret, and `kms:Decrypt` if its key requires it.
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

## 2. Create the deployment configuration secret

In AWS Secrets Manager, in `ap-south-1`, create an **Other type of secret** named, for example, `oho/customer-server/dev`. In the plaintext JSON editor, enter the following keys and replace example values with your environment's settings:

```json
{
  "CORS_ORIGINS": "https://your-customer-app.example.com",
  "DB_HOST": "your-existing-mysql-host",
  "DB_PORT": "3306",
  "DB_USER": "your-db-user",
  "DB_PASSWORD": "your-db-password",
  "DB_NAME": "your-existing-db-name",
  "DB_SSL": "true",
  "SMS_PROVIDER": "msg91",
  "MSG91_AUTH_KEY": "your-msg91-auth-key",
  "MSG91_OTP_TEMPLATE_ID": "your-msg91-template-id",
  "SMSFRESH_OTP_URL": "",
  "SMSFRESH_USER": "",
  "SMSFRESH_PASSWORD": "",
  "SMSFRESH_SENDER": "",
  "ONBOARDING_SMS_QUEUE_URL": ""
}
```

All keys must exist, including empty keys for unused integrations: the template resolves each key separately. Use `smsfresh` and fill its settings if that is your provider. `SMS_PROVIDER=disabled` allows process/health checks but prevents OTP sending. Set `DB_SSL` according to the existing database configuration. Multiple allowed frontend origins may be separated by commas.

Record the secret's complete ARN. Supply the ARN as `ConfigSecretArn` during deployment; do not put passwords or API keys in the template, command line or `samconfig.toml`. CloudFormation resolves the secret into Lambda environment variables during deployment. The function does not fetch Secrets Manager on every invocation.

## 3. Configure database network access

For a private RDS/MySQL database, provide these template parameters during guided deployment:

- `VpcSubnetIds`: comma-separated **private** subnet IDs in the database's VPC, such as `subnet-aaa,subnet-bbb`.
- `VpcSecurityGroupIds`: comma-separated Lambda security group IDs in that VPC, such as `sg-aaa`.

Allow MySQL TCP port 3306, or your configured port, from the Lambda security group into the database security group. Ensure the Lambda security group's outbound rules allow the database connection.

Private subnets need a working NAT route for outbound HTTPS to MSG91/SMSFresh. An SQS VPC endpoint can provide SQS access, but it does not provide access to the public SMS provider. Assigning Lambda to a public subnet alone does not provide internet access. See [AWS's VPC internet access guide](https://docs.aws.amazon.com/lambda/latest/dg/configuration-vpc-internet.html).

If the database is deliberately reachable outside a VPC, leave **both** VPC parameters empty and ensure its firewall permits the connection. Lambda's default outbound addresses are not fixed; use private networking or NAT with a controlled egress address when an IP allowlist is required.

For onboarding SMS via SQS, fill the secret's `ONBOARDING_SMS_QUEUE_URL` and supply that queue's ARN as `OnboardingSmsQueueArn`. Leave both empty if not used. The template grants `sqs:SendMessage` only to the supplied ARN. A queue encrypted with a customer-managed KMS key needs corresponding KMS permissions added to the execution role and key policy.

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

1. Supply the existing configuration secret's ARN for `ConfigSecretArn`.
2. Keep `ConfigRevision` at `1` for the first deployment.
3. Enter your VPC subnet/security group IDs, or leave both empty as described above.
4. Enter the optional onboarding queue ARN, or leave it empty.
5. Allow SAM to create the execution role; keep CloudFormation rollback enabled.
6. Save settings to `samconfig.toml` for subsequent deployments. This file is ignored by Git.
7. Review and confirm the CloudFormation changes.

The API follows the app's existing unauthenticated route behavior; the template does not add an authorizer. Review the authentication limitations in [README.md](README.md#compatibility-and-intentional-differences) before exposing customer data in a production environment.

On success, CloudFormation outputs `ApiBaseUrl` and `FunctionName`. Fetch them at any time:

```powershell
aws cloudformation describe-stacks --stack-name oho-customer-api-dev --region ap-south-1 --query 'Stacks[0].Outputs' --output table
```

The base URL has no `/Prod` or `/lambdaAPI` suffix because this template uses the HTTP API `$default` stage. Example:

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

Restart Vite for local use. For a hosted frontend, set these values in its build environment, rebuild with `npm run build` from the repository root, then publish the resulting frontend `dist` using your existing hosting process. Vite embeds these URLs at build time.

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

After deployment, repeat the health and test-account checks. A server-only code update does not require rebuilding the frontend unless the API URL or frontend contract changes.

## 8. Redeploy configuration, secrets or infrastructure changes

For changed networking, concurrency, timeout, IAM permissions or API settings, update `template.yaml` or the relevant parameters, rebuild the artifact, validate and redeploy the same stack. Use `sam deploy --guided ...` with the same stack name and region to change saved parameter values.

For a changed database password, SMS key or frontend CORS origin:

1. Update the JSON secret in Secrets Manager.
2. Repeat the build/validation commands in step 7.
3. Run guided deployment against the same stack and increase `ConfigRevision`, for example from `1` to `2`:

```powershell
sam deploy --guided --template-file template.yaml --stack-name oho-customer-api-dev --region ap-south-1 --capabilities CAPABILITY_IAM
```

Changing the secret alone does not refresh previously resolved Lambda environment variables. Incrementing `ConfigRevision` forces an environment configuration update and resolution of the latest secret values. Keep other parameters unchanged unless you intend to update them. See [CloudFormation Secrets Manager dynamic references](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/dynamic-references-secretsmanager.html).

Avoid making routine code/configuration changes directly in the Lambda console: subsequent SAM deployments should remain the source of truth.

## 9. Logs, troubleshooting and rollback

```powershell
sam logs --name CustomerApiFunction --stack-name oho-customer-api-dev --region ap-south-1 --tail
```

- **Handler/module not found:** confirm `build/lambda/dist/lambda.js` and production `node_modules` exist, then package and redeploy.
- **Database connection timeout:** check subnet routing, security groups, hostname, port and the deployed secret configuration. A successful health response does not prove database access.
- **SMS HTTPS timeout in a VPC:** check the private subnet's NAT route and outbound HTTPS access.
- **SQS AccessDenied:** check that the configured queue URL corresponds to the permitted ARN, its queue policy and any KMS permissions.
- **CORS errors:** update the secret's allowed frontend origins and increment `ConfigRevision` before redeployment.
- **Deployment failure:** inspect CloudFormation events. The saved rollback setting restores the stack on failed updates; a failed first deployment may require resolving the cause before recreating the failed stack.
- **API/function throttling:** the template starts with API throttling at 10 requests/second, burst 20, and Lambda concurrency 5. Tune this against database capacity; each warm function can create a pool of up to 10 connections. Nest's in-memory rate limiter is per Lambda execution environment, so it is not a shared user limit across instances.

For a successful release that needs to be reverted, use an isolated checkout/worktree of the previous known-good revision, copy your ignored SAM configuration into its `server` folder, run `npm ci`, tests and `package:lambda`, and deploy to the **same** stack and region. Review the infrastructure changes before applying that rollback. Configuration rollback also requires restoring the desired secret values and incrementing `ConfigRevision`; code rollback does not restore database data changed by API calls.

No AWS resources are created by installing, building, packaging, testing or locally validating the template. The `sam deploy` commands perform the actual deployment.

References: [AWS SAM deployment workflow](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/using-sam-cli-deploy.html), [Node.js Lambda runtime](https://docs.aws.amazon.com/lambda/latest/dg/lambda-nodejs.html), [serverless-express adapter](https://github.com/CodeGenieApp/serverless-express).
