// The published mobile bundle also receives the gateway's short display name.
export function isMobilePaymentLink(row) {
  const name = String(row.PaymentTypeName ?? "")
    .replace(/[\s_-]/g, "")
    .toLowerCase();
  return /^(cashfree|(?:cashfree)?paymentlink(?:andqrcode)?)$/.test(name);
}

export function mobilePaymentOptionsPlugin() {
  return {
    name: "mobile-payment-options",
    enforce: "pre",
    transform(source, id) {
      if (!id.replaceAll("\\", "/").endsWith("/src/pages/purchase/Purchase.tsx"))
        return;
      const start = source.indexOf("const isPaymentLink =");
      const end = source.indexOf("function PaymentStep(", start);
      if (start < 0 || end < 0)
        throw new Error("Mobile payment option override could not find the checkout predicate.");
      return {
        code: source.slice(0, start) +
          `const isPaymentLink = ${isMobilePaymentLink.toString()};\n\n` +
          source.slice(end),
        map: null,
      };
    },
  };
}
