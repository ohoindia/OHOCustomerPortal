const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const source = fs.readFileSync(path.resolve(__dirname, "../src/lib/app-version.ts"), "utf8");
const js = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const helpers = import(`data:text/javascript;base64,${Buffer.from(js).toString("base64")}`);

test("update checks compare numeric releases and ignore invalid or older versions", async () => {
  const { isNewerVersion } = await helpers;
  assert.equal(isNewerVersion("1.10.0", "1.9.0"), true);
  assert.equal(isNewerVersion("2.0", "1.99.99"), true);
  assert.equal(isNewerVersion("1.0.1", "1.0"), true);
  for (const [latest, installed] of [
    ["1.0.0", "1.0"], ["1.0", "2.0"], ["", "1.0"],
    ["latest", "1.0"], ["1..2", "1.0"], ["1.2", "invalid"],
    ["9007199254740992", "1.0"],
  ]) assert.equal(isNewerVersion(latest, installed), false);
});

test("update locations accept HTTPS downloads and stores", async () => {
  const { appUpdateUrl } = await helpers;
  assert.equal(appUpdateUrl(" https://example.com/app.apk "), "https://example.com/app.apk");
  for (const value of ["", "invalid", "javascript:alert(1)", "http://example.com", "https://user:password@example.com"])
    assert.equal(appUpdateUrl(value), null);
});
