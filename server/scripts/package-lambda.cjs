const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const serverRoot = path.resolve(__dirname, "..");
const buildRoot = path.join(serverRoot, "build");
const artifact = path.join(buildRoot, "lambda");
// Only this fixed, resolved staging directory may be replaced.
if (
  path.dirname(artifact) !== buildRoot ||
  path.basename(artifact) !== "lambda"
) {
  throw new Error("Unexpected Lambda artifact path.");
}
fs.rmSync(artifact, { recursive: true, force: true });
fs.mkdirSync(artifact, { recursive: true });
fs.cpSync(path.join(serverRoot, "dist"), path.join(artifact, "dist"), {
  recursive: true,
});
for (const name of ["package.json", "package-lock.json"]) {
  fs.copyFileSync(path.join(serverRoot, name), path.join(artifact, name));
}
// Install from the lockfile without copying local environment files or dev dependencies.
const install = spawnSync(
  process.platform === "win32" ? "npm.cmd" : "npm",
  ["ci", "--omit=dev"],
  {
    cwd: artifact,
    stdio: "inherit",
    shell: process.platform === "win32",
  },
);
if (install.error) throw install.error;
if (install.status !== 0) process.exit(install.status ?? 1);
// Lambda disables require(ESM), even when the local Node runtime enables it.
const startupCheck = spawnSync(
  process.execPath,
  ["--no-experimental-require-module", "-e", 'require("./dist/lambda.js")'],
  { cwd: artifact, stdio: "inherit" },
);
if (startupCheck.error) throw startupCheck.error;
if (startupCheck.status !== 0) process.exit(startupCheck.status ?? 1);
console.log(`Lambda artifact ready: ${artifact}`);
