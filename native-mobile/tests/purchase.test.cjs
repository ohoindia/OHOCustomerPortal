const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const vm = require("node:vm");
function compile(file, dependencies = {}) {
  const source = fs.readFileSync(path.resolve(__dirname, file), "utf8");
  const js = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const exports = {};
  vm.runInNewContext(js, {
    exports,
    Date,
    URL,
    Intl,
    require: (name) => dependencies[name],
  });
  return exports;
}
const purchase = compile("../src/lib/purchase.ts");
const steps = compile("../../common/utils/purchase.ts");
test("purchase validates birth dates and identity before creating an order", () => {
  const person = {
    fullName: "Test Member",
    dateofBirth: "1990-02-28",
    gender: "Female",
    mobileNumber: "9876543210",
    relationship: "Spouse",
  };
  assert.equal(purchase.personError(person), "");
  for (const patch of [
    { dateofBirth: "1990-02-30" },
    { dateofBirth: "2099-01-01" },
    { gender: "" },
    { fullName: " " },
    { mobileNumber: "1111111111" },
    { relationship: "" },
  ])
    assert.notEqual(purchase.personError({ ...person, ...patch }), "");
  assert.equal(purchase.personError({ ...person, mobileNumber: "" }), "");
  assert.notEqual(
    purchase.personError({ ...person, mobileNumber: "" }, true),
    "",
  );
});
test("purchase progression respects family and nominee requirements", () => {
  assert.equal(
    steps.firstPurchaseStep({ MaximumMembers: 2, includedProducts: [] }),
    "family",
  );
  assert.equal(
    steps.firstPurchaseStep({
      MaximumMembers: 1,
      includedProducts: [{ IsNomineeRequired: true }],
    }),
    "nominees",
  );
  assert.equal(
    steps.firstPurchaseStep({ MaximumMembers: 1, includedProducts: [] }),
    "payment",
  );
  assert.equal(
    steps.allNomineesAdded(
      [{ ProductsId: 7 }, { ProductsId: 8 }],
      [{ ProductsId: 7 }],
    ),
    false,
  );
  assert.equal(
    steps.allNomineesAdded([{ ProductsId: 7 }], [{ ProductsId: 7 }]),
    true,
  );
});
test("payment URLs require secure HTTPS", () => {
  assert.equal(
    purchase.safePaymentUrl("https://payments.example.test/order/7"),
    true,
  );
  for (const url of [
    "javascript:alert(1)",
    "file:///private",
    "http://payments.example.test",
    "https://user:secret@payments.example.test",
    "invalid",
  ])
    assert.equal(purchase.safePaymentUrl(url), false);
});
test("product descriptions render as plain text without embedded scripts", () => {
  assert.equal(
    purchase.plainText(
      "<p>Care &amp; cover</p><script>bad()</script><li>Family</li>",
    ),
    "Care & cover\n\nFamily",
  );
});
