const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

test("mobile bundles the shared API-driven payment options without an eligibility override", () => {
  const build = fs.readFileSync(
    path.join(__dirname, "../scripts/build-client.mjs"),
    "utf8",
  );
  assert.doesNotMatch(build, /mobilePaymentOptionsPlugin|payment-options/);
  const checkout = fs.readFileSync(
    path.join(__dirname, "../../client/src/pages/purchase/Purchase.tsx"),
    "utf8",
  );
  assert.match(checkout, /snapshot\.paymentMethods\.map/);
  assert.doesNotMatch(
    checkout,
    /isPaymentLink|Not available in the customer app/,
  );
});
