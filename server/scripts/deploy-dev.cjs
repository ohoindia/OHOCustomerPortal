const { spawnSync, execFileSync } = require("node:child_process");
const { createHash } = require("node:crypto");
const path = require("node:path");
const {
  devStack,
  verifyDevDeployment,
} = require("./verify-dev-deployment.cjs");

const serverRoot = path.resolve(__dirname, "..");
process.chdir(serverRoot);

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: serverRoot,
    stdio: "inherit",
    shell: process.platform === "win32" && command.endsWith(".cmd"),
  });
  if (result.error) throw result.error;
  if (result.status !== 0)
    throw Error(`${command} failed (${result.status}). Deployment stopped.`);
}
function environment(functionName) {
  return JSON.parse(
    execFileSync(
      "aws",
      [
        "lambda",
        "get-function-configuration",
        "--function-name",
        functionName,
        "--region",
        "ap-south-1",
        "--query",
        "Environment.Variables",
        "--output",
        "json",
      ],
      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
    ),
  );
}
function fingerprint(value) {
  return createHash("sha256")
    .update(
      JSON.stringify(
        Object.entries(value).sort(([a], [b]) => a.localeCompare(b)),
      ),
    )
    .digest("hex");
}
async function deploy() {
  const current = devStack();
  if (
    ![
      "CREATE_COMPLETE",
      "UPDATE_COMPLETE",
      "UPDATE_ROLLBACK_COMPLETE",
    ].includes(current.StackStatus) ||
    !current.Parameters.some(
      (item) =>
        item.ParameterKey === "ApiStageName" && item.ParameterValue === "dev",
    )
  )
    throw Error("The existing dev stack must be in a deployable state.");
  const functionName = current.Outputs.find(
    (item) => item.OutputKey === "FunctionName",
  )?.OutputValue;
  if (!functionName?.startsWith("oho-customer-api-dev-"))
    throw Error("Unexpected dev Lambda function.");
  const before = environment(functionName);
  if (before.DB_NAME !== "ohoindiadev")
    throw Error(
      "The dev Lambda must target ohoindiadev. No deployment performed.",
    );
  const beforeHash = fingerprint(before);
  console.log(
    "Verified existing dev stack and ohoindiadev database. Testing and packaging current server sources.",
  );
  const npm = process.platform === "win32" ? "npm.cmd" : "npm";
  const sam = process.platform === "win32" ? "sam.cmd" : "sam";
  run(npm, ["test"]);
  run(npm, ["run", "package:lambda"]);
  run(sam, [
    "validate",
    "--lint",
    "--template-file",
    "template.yaml",
    "--region",
    "ap-south-1",
  ]);
  run(sam, [
    "deploy",
    "--template-file",
    "template.yaml",
    "--config-env",
    "dev",
    "--stack-name",
    "oho-customer-api-dev",
    "--region",
    "ap-south-1",
    "--no-confirm-changeset",
    "--no-fail-on-empty-changeset",
  ]);
  if (fingerprint(environment(functionName)) !== beforeHash)
    throw Error(
      "Lambda environment differs after deployment. Review dev configuration before use.",
    );
  await verifyDevDeployment();
}

module.exports = { deploy };
if (require.main === module)
  deploy().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
