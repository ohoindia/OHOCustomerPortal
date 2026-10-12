const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const navigation = {};
vm.runInNewContext(
  ts.transpileModule(
    fs.readFileSync(path.join(__dirname, "../src/lib/navigation.ts"), "utf8"),
    { compilerOptions: { module: ts.ModuleKind.CommonJS } },
  ).outputText,
  { exports: navigation, URLSearchParams, Set },
);

test("every Client route has a Mobile entry using the shared screen", () => {
  const app = fs.readFileSync(
    path.join(__dirname, "../../client/src/App.tsx"),
    "utf8",
  );
  for (const [, route] of app.matchAll(/\bpath="([^"*]+)"/g)) {
    const file =
      route === "/"
        ? "index.tsx"
        : route.slice(1).replace(/:([^/]+)/g, "[$1]") + ".tsx";
    const source = fs.readFileSync(
      path.join(__dirname, "../src/app", file),
      "utf8",
    );
    assert.match(source, /screens\/Client/, route);
    assert.equal(navigation.destination(route), route);
  }
});

test("Client aliases keep their original destinations and queries", () => {
  for (const route of [
    "/NomineeDetails",
    "/myprofile",
    "/ConsultationList",
    "/network?hospitalId=7",
    "/BMICalculator",
  ])
    assert.equal(navigation.destination(route), route);
});

test("screen launch preserves search parameters and excludes dynamic path parameters", () => {
  assert.equal(navigation.clientRoute("/home", ["home"], {}), "/home");
  assert.equal(
    navigation.clientRoute("/hospitalDetails", ["hospitalDetails"], {
      hospitalId: "7",
      name: "A & B",
    }),
    "/hospitalDetails?hospitalId=7&name=A+%26+B",
  );
  assert.equal(
    navigation.clientRoute("/policies/42", ["policies", "[policyId]"], {
      policyId: "42",
      tab: "nominees",
    }),
    "/policies/42?tab=nominees",
  );
  assert.equal(
    navigation.clientRoute(
      "/purchase/42/family",
      ["purchase", "[orderId]", "[step]"],
      { orderId: "42", step: "family", review: "1" },
    ),
    "/purchase/42/family?review=1",
  );
  assert.equal(
    navigation.clientRoute("/product-details", ["product-details"], {
      productId: "7",
      purchase: "1",
      tag: ["a", "b"],
    }),
    "/product-details?productId=7&purchase=1&tag=a&tag=b",
  );
  assert.equal(
    navigation.clientRoute("/unknown/path", ["[...path]"], {
      path: ["unknown", "path"],
      q: "value",
    }),
    "/unknown/path?q=value",
  );
});
