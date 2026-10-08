const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
test("every client route resolves to a native screen", () => {
  const root = path.resolve(__dirname, "../..");
  const client = fs.readFileSync(path.join(root, "client/src/App.tsx"), "utf8");
  const screen = fs.readFileSync(
    path.join(root, "native-mobile/src/app/[...path].tsx"),
    "utf8",
  );
  const aliases = fs.readFileSync(
    path.join(root, "native-mobile/src/lib/navigation.ts"),
    "utf8",
  );
  const exports = {};
  vm.runInNewContext(
    ts.transpileModule(aliases, {
      compilerOptions: { module: ts.ModuleKind.CommonJS },
    }).outputText,
    { exports },
  );
  const cases = new Set(
    [...screen.matchAll(/case "([^"]+)"/g)].map((match) => match[1]),
  );
  for (const match of client.matchAll(/<Route\s+path="([^"]+)"/g)) {
    const route = match[1];
    if (["*", "/"].includes(route)) continue;
    if (route.includes(":")) {
      assert.ok(
        screen.includes(`segments[0] === "${route.split("/")[1]}"`),
        `Missing dynamic route ${route}`,
      );
    } else {
      assert.ok(
        fs.existsSync(
          path.join(root, "native-mobile/src/app", `${route.slice(1)}.tsx`),
        ) || cases.has(exports.destination(route)),
        `Missing client route ${route}`,
      );
    }
  }
});
