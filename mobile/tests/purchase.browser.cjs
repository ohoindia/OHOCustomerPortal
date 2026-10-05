// node tests/purchase.browser.cjs <path-to-playwright>
const { chromium } = require(process.argv[2] || "playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const bootstrap = {};
vm.runInNewContext(
  ts.transpileModule(
    fs.readFileSync(
      path.join(__dirname, "../src/lib/client-bootstrap.ts"),
      "utf8",
    ),
    { compilerOptions: { module: ts.ModuleKind.CommonJS } },
  ).outputText,
  { exports: bootstrap },
);

const member = {
  MemberId: 7,
  Name: "Test Member",
  MobileNumber: "9876543210",
  Gender: "Female",
  DateofBirth: "1996-01-01",
};
const product = {
  ProductsId: 278,
  ProductName: "Family Health Package",
  IsCombo: true,
  IsFree: false,
  ProductsIsActive: true,
  MaximumMembers: 2,
  ValidForDays: 365,
  InsurancePremiums: [
    {
      TotalAmount: 1200,
      MinimumAge: 18,
      MaximumAge: 65,
      BasePremium: 1000,
      GST: 20,
    },
  ],
  includedProducts: [
    {
      ProductsId: 283,
      ProductName: "Health insurance",
      IsNomineeRequired: true,
    },
  ],
};
const snapshot = {
  order: {
    OrdersId: 42,
    FullName: member.Name,
    Age: 30,
    PayableAmount: 1200,
    Gender: member.Gender,
    DateofBirth: member.DateofBirth,
  },
  product,
  family: [],
  nominees: [],
  nomineeProducts: product.includedProducts,
  paymentMethods: [{ PaymentTypeId: 5, PaymentTypeName: "UPI" }],
};
let paid = false;
let paymentLink;
let expectedPurchaser = member;
const requests = [];
const external = [];
function response(message) {
  const url = new URL(message.url).pathname;
  const body = message.body ? JSON.parse(message.body) : {};
  requests.push({ url, body });
  if (url === "/api/Products/all") return [product];
  if (url === "/api/Customer/GetById/7") return [member];
  if (url === "/api/purchases/products/278") return product;
  if (url === "/api/purchases") {
    assert.equal(body.productsId, 278);
    assert.equal(body.fullName, expectedPurchaser.Name);
    assert.equal(body.dateofBirth, expectedPurchaser.DateofBirth);
    assert.equal(body.gender, expectedPurchaser.Gender);
    assert.equal(body.mobileNumber, expectedPurchaser.MobileNumber);
    return { orderId: 42 };
  }
  if (url === "/api/purchases/42") return snapshot;
  if (url === "/api/purchases/42/family") {
    snapshot.family.push({
      OrdersId: 43,
      FullName: body.fullName,
      DateofBirth: body.dateofBirth,
      Age: 28,
      Gender: body.gender,
      Relationship: body.relationship,
    });
    return { memberId: 43 };
  }
  if (url === "/api/purchases/42/nominees") {
    assert.equal(body.productsId, 283);
    assert.equal(body.familyOrderId, 43);
    snapshot.nominees = [
      { ProductsId: 283, FullName: "Family Member", Relationship: "Spouse" },
    ];
    return { status: true };
  }
  if (url === "/api/purchases/42/payment") {
    assert.equal(body.paymentTypeId, 5);
    paymentLink = {
      linkId: "test-link",
      url: "https://payments.example.com/test-link",
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
      status: "ACTIVE",
    };
    return paymentLink;
  }
  if (url === "/api/purchases/42/payment-status")
    return {
      status: paid ? "COMPLETED" : paymentLink ? "ACTIVE" : "NOT_STARTED",
      completed: paid,
      ...(paymentLink ? { link: paymentLink } : {}),
    };
  return [];
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({
      viewport: { width: 390, height: 844 },
    });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.exposeFunction("nativeMessage", async (raw) => {
      const message = JSON.parse(raw);
      if (message.type === "external") external.push(message.url);
      if (message.type === "fetch") {
        const body = response(message);
        await page.evaluate((reply) => window.ohoReceive(reply), {
          id: message.id,
          value: {
            status: 200,
            body: JSON.stringify(body),
            headers: { "Content-Type": "application/json" },
          },
        });
      }
    });
    await page.addInitScript(() => {
      window.ReactNativeWebView = {
        postMessage: (value) => window.nativeMessage(value),
      };
    });
    const documentFor = (account, route = "/packages") =>
      require("../src/generated/client.json").html.replace(
        "<!--OHO_BOOTSTRAP-->",
        `<script>${bootstrap.clientBootstrap({
          apiBaseUrl: "https://api.example.com",
          local: {},
          route,
          native: true,
          session: {
            accessToken: "test-token",
            tokenExpiresAt: new Date(Date.now() + 3600000).toISOString(),
            member: JSON.stringify(account),
          },
        })}</script>`,
      );
    let html = documentFor(member);
    await page.route("https://oho-mobile.invalid/**", (route) =>
      route.fulfill({ contentType: "text/html", body: html }),
    );
    await page.goto("https://oho-mobile.invalid/");
    await page.getByRole("link", { name: /Family Health Package/ }).click();
    await page.getByRole("heading", { name: "Confirm your details" }).waitFor();
    await page.getByLabel("Full name", { exact: true }).waitFor();
    assert.equal(
      await page.getByLabel("Full name", { exact: true }).inputValue(),
      member.Name,
    );
    assert.equal(
      await page.getByLabel("Date of birth", { exact: true }).inputValue(),
      member.DateofBirth,
    );
    await page
      .getByRole("button", { name: /^Save details and continue/ })
      .click();
    await page.waitForURL("**#/purchase/42/family");
    console.log("Package purchase created; entering family details.");
    await page.getByLabel("Full name", { exact: true }).fill("Family Member");
    await page.getByLabel("Date of birth", { exact: true }).fill("1998-01-01");
    await page.getByLabel(/^Gender/).selectOption("Male");
    await page.getByLabel(/^Relationship/).selectOption("Spouse");
    await page.getByRole("button", { name: "Add member", exact: true }).click();
    await page.getByRole("button", { name: "Remove", exact: true }).waitFor();
    await page.getByRole("button", { name: /^Continue/ }).click();
    await page.waitForURL("**#/purchase/42/nominees");
    console.log("Family saved; selecting nominee.");
    await page
      .getByRole("button", { name: "Select Family Member as nominee" })
      .click();
    await page
      .getByRole("button", { name: /^Save nominee and continue/ })
      .click();
    await page.waitForURL("**#/purchase/42/payment");
    console.log("Nominee saved; creating secure payment link.");
    await page
      .getByRole("button", { name: /^Continue to secure payment/ })
      .click();
    await page.getByRole("link", { name: /^Open secure payment/ }).click();
    await page.waitForFunction(() => location.hash === "#/purchase/42/payment");
    assert.deepEqual(external, ["https://payments.example.com/test-link"]);
    paid = true;
    await page.getByRole("button", { name: "Check payment status" }).click();
    await page.getByRole("heading", { name: "Payment received" }).waitFor();
    {
      const account = { ...member, MemberId: 0, CommunityCustomerId: 9 };
      html = documentFor(account, "/product-details?productId=278&purchase=1");
      await page.reload();
      await page
        .getByRole("heading", { name: "Confirm your details" })
        .waitFor();
      const fullName = page.getByLabel("Full name", { exact: true });
      await fullName.waitFor();
      assert.equal(await fullName.inputValue(), member.Name);
      assert.ok(
        requests.some(
          (item) => item.url === "/api/CommunityCustomers/GetById/9",
        ),
      );
    }
    const incomplete = {
      MemberId: 0,
      CommunityCustomerId: 9,
      MobileNumber: member.MobileNumber,
    };
    html = documentFor(incomplete, "/product-details?productId=278&purchase=1");
    await page.reload();
    await page
      .getByRole("heading", { name: "Add your customer details" })
      .waitFor();
    await page
      .getByLabel("Full name", { exact: true })
      .fill("Community Member");
    await page.getByLabel("Date of birth", { exact: true }).fill("1995-02-03");
    await page.getByLabel(/^Gender/).selectOption("Male");
    expectedPurchaser = {
      Name: "Community Member",
      DateofBirth: "1995-02-03",
      Gender: "Male",
      MobileNumber: member.MobileNumber,
    };
    await page
      .getByRole("button", { name: /^Save details and continue/ })
      .click();
    await page.waitForURL("**#/purchase/42/family");
    assert.equal(
      requests.filter((item) => item.url === "/api/purchases").length,
      2,
    );
    assert.equal(errors.length, 0, errors.join("\n"));
    assert.ok(
      requests.some((item) => item.url === "/api/purchases/42/nominees"),
    );
    console.log(
      "Mobile Packages → details → family → nominee → secure payment → confirmation passed through the native bridge.",
    );
    console.log(
      "Community account fallback and missing customer details passed.",
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
