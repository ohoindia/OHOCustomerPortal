const { test } = require("node:test");
const assert = require("node:assert/strict");

test("published mobile checkout supports Cashfree's short and payment link names", async () => {
  const { isMobilePaymentLink } = await import("../scripts/payment-options.mjs");
  for (const PaymentTypeName of ["Cashfree", "Cashfree Payment Link", "Cashfree PaymentLink and QRCode", "Payment Link", " CASHFREE "])
    assert.equal(isMobilePaymentLink({ PaymentTypeName }), true, PaymentTypeName);
  for (const PaymentTypeName of ["Cash", "Static QRCode", "Cashfree Static QRCode", "", null])
    assert.equal(isMobilePaymentLink({ PaymentTypeName }), false, String(PaymentTypeName));
});

test("mobile build replaces checkout eligibility and fails if the source contract changes", async () => {
  const fs = require("node:fs");
  const path = require("node:path");
  const { mobilePaymentOptionsPlugin } = await import("../scripts/payment-options.mjs");
  const plugin = mobilePaymentOptionsPlugin();
  const source = fs.readFileSync(path.join(__dirname, "../../client/src/pages/purchase/Purchase.tsx"), "utf8");
  const id = "/client/src/pages/purchase/Purchase.tsx";
  assert.match(plugin.transform(source, id).code, /const isPaymentLink = function isMobilePaymentLink/);
  assert.throws(() => plugin.transform("changed checkout", id));
  assert.equal(plugin.transform(source, "/other.tsx"), undefined);
});
