const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function runner({
  stage = "dev",
  database = "ohoindiadev",
  failedCommand,
  changedEnvironment = false,
} = {}) {
  const commands = [];
  let environmentReads = 0;
  let verified = false;
  const module = { exports: {} };
  const dependencies = {
    "node:child_process": {
      spawnSync: (command, args) => {
        commands.push([command, args]);
        return { status: args[0] === failedCommand ? 1 : 0 };
      },
      execFileSync: () =>
        JSON.stringify({
          DB_NAME:
            environmentReads++ && changedEnvironment ? "unexpected" : database,
          DB_PASSWORD: "private-test-value",
        }),
    },
    "node:crypto": require("node:crypto"),
    "node:path": path,
    "./verify-dev-deployment.cjs": {
      devStack: () => ({
        StackStatus: "UPDATE_COMPLETE",
        Parameters: [{ ParameterKey: "ApiStageName", ParameterValue: stage }],
        Outputs: [
          {
            OutputKey: "FunctionName",
            OutputValue: "oho-customer-api-dev-CustomerApiFunction-Test",
          },
        ],
      }),
      verifyDevDeployment: async () => {
        verified = true;
      },
    },
  };
  const source = fs.readFileSync(
    path.resolve(__dirname, "../scripts/deploy-dev.cjs"),
    "utf8",
  );
  vm.runInNewContext(source, {
    module,
    require: (name) => dependencies[name],
    __dirname: path.resolve(__dirname, "../scripts"),
    process: { platform: "linux", chdir: () => {} },
    console: { log: () => {} },
  });
  return { deploy: module.exports.deploy, commands, verified: () => verified };
}

test("dev deployment rejects a production stage before invoking build or deployment commands", async () => {
  const task = runner({ stage: "prod" });
  await assert.rejects(task.deploy(), /existing dev stack/);
  assert.equal(task.commands.length, 0);
});
test("dev deployment rejects a Lambda connected to a different database", async () => {
  const task = runner({ database: "ohoindiaprod" });
  await assert.rejects(task.deploy(), /must target ohoindiadev/);
  assert.equal(task.commands.length, 0);
});
test("failed tests stop deployment before packaging or AWS mutation", async () => {
  const task = runner({ failedCommand: "test" });
  await assert.rejects(task.deploy(), /Deployment stopped/);
  assert.equal(task.commands.length, 1);
  assert.equal(task.commands[0][0], "npm");
});
test("deployment pins dev stack, region and config and verifies the resulting API", async () => {
  const task = runner();
  await task.deploy();
  const args = task.commands.find(
    ([command, args]) => command === "sam" && args[0] === "deploy",
  )[1];
  assert.equal(args[args.indexOf("--stack-name") + 1], "oho-customer-api-dev");
  assert.equal(args[args.indexOf("--config-env") + 1], "dev");
  assert.equal(args[args.indexOf("--region") + 1], "ap-south-1");
  assert.ok(args.includes("--no-confirm-changeset"));
  assert.equal(task.verified(), true);
});
test("unexpected post-deploy environment changes fail verification without disclosing values", async () => {
  const task = runner({ changedEnvironment: true });
  await assert.rejects(
    task.deploy(),
    (error) =>
      /environment differs/.test(error.message) &&
      !error.message.includes("private-test-value"),
  );
  assert.equal(task.verified(), false);
});
