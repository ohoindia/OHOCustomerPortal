// Run after: npx expo export --platform web --output-dir dist-web
// node tests/flows.browser.cjs [path-to-playwright]
const { chromium } = require(process.argv[2] || "playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const capturingScreenshots = process.argv.includes("--screenshots");
const member = {
  MemberId: 7,
  Name: "Test Member",
  MobileNumber: "9876543210",
  Gender: "Female",
  DateofBirth: "1996-01-01",
  Age: 30,
};
const product = {
  ProductsId: 278,
  ProductName: "Family Health Package",
  ProductCategoryName: "Family care",
  IsCombo: true,
  IsFree: false,
  ProductsIsActive: true,
  MaximumMembers: 3,
  NoOfCardHolders: 2,
  ValidForDays: 365,
  ShortDescription: "Care for your family",
  KeyFeatures: "<p>OPD consultations</p><p>Family coverage</p>",
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
    Gender: member.Gender,
    DateofBirth: member.DateofBirth,
    PayableAmount: 1200,
  },
  product,
  family: [],
  nominees: [],
  nomineeProducts: product.includedProducts,
  paymentMethods: [
    {
      PaymentTypeId: 4,
      PaymentTypeName: "Cashfree Payment Link",
      route: "/PaymentLinks",
    },
    { PaymentTypeId: 2, PaymentTypeName: "Cash" },
  ],
};
const booking = {
  BookingConsultationId: 88,
  Name: member.Name,
  HospitalName: "Test Network Hospital",
  ServiceName: "OPD",
  PoliciesType: "Free Consultation",
  StatusName: "Visited",
  AppointmentDate: "2026-10-10T10:00:00+05:30",
  TotalAmount: 500,
  PaidAmount: 0,
  QRCodeUrl: "https://example.test/check-in/88",
};
const requests = [];
let paid = false;
let link;
function response(url, body, headers) {
  requests.push({ url, body, authorization: headers.authorization });
  if (url === "/api/Customer/mobileNoValid")
    return { status: body.mobileNumber !== "9999999999" };
  if (url === "/api/Customer/memberlogin")
    return {
      status: true,
      JwtToken: "fixture-token",
      expiresAt: "2099-01-01T00:00:00Z",
      memberData: [member],
    };
  if (/\/(checkingMobileno|toSetNewPassword)$/.test(url))
    return {
      status: true,
      guid: "fixture-guid",
      futureTime: new Date(Date.now() + 1000).toISOString(),
    };
  if (/\/(OTPValidation|updatePassword)$/.test(url)) return { status: true };
  if (url === "/api/Customer/add")
    return {
      status: true,
      JwtToken: "fixture-new-token",
      expiresAt: "2099-01-01T00:00:00Z",
      data: { customerId: 7 },
    };
  if (url === "/api/Products/all") return [product];
  if (url === "/api/purchases/products/278") return product;
  if (url === "/api/purchases") {
    assert.equal(body.productsId, 278);
    assert.equal(body.fullName, member.Name);
    assert.equal(headers.authorization, "Bearer fixture-token");
    return { orderId: 42 };
  }
  if (url === "/api/purchases/pending")
    return paid
      ? []
      : [{ ...snapshot.order, ProductName: product.ProductName }];
  if (url === "/api/purchases/42") return snapshot;
  if (url === "/api/purchases/42/family") {
    snapshot.family.push({
      OrdersId: 43 + snapshot.family.length,
      FullName: body.fullName,
      Relationship: body.relationship,
      Age: body.relationship === "Spouse" ? 30 : 10,
      Gender: body.gender,
      DateofBirth: body.dateofBirth,
    });
    return { memberId: 43 };
  }
  if (url === "/api/purchases/42/nominees") {
    assert.equal(body.familyOrderId, 44);
    assert.equal(body.guardianOrderId, 42);
    snapshot.nominees = [
      { ProductsId: 283, FullName: "Child Member", Relationship: "Daughter" },
    ];
    return { status: true };
  }
  if (url === "/api/purchases/42/payment-methods/4")
    return {
      method: snapshot.paymentMethods[0],
      route: "/PaymentLinks",
      qrCode: "",
      amount: 2999,
      reference: "",
    };
  if (url === "/api/payment/createPaymentLink") {
    assert.equal(body.orderId, 42);
    assert.equal(body.paymentTypeId, 4);
    link = {
      mode: "link",
      url: "https://payments.example.test/42",
      linkId: "fixture-link",
      expiresAt: new Date(Date.now() + 90000).toISOString(),
      status: "ACTIVE",
    };
    return link;
  }
  if (
    url.includes("payment-status") ||
    url.includes("fetchPaymentLinksByLinkId")
  )
    return {
      status: paid ? "COMPLETED" : link ? "ACTIVE" : "PENDING",
      completed: paid,
      ...(link ? { link } : {}),
    };
  if (url.includes("GetMemberCardByMemberId"))
    return {
      status: true,
      returnData: [
        {
          OHOCardnumber: "OHO-007",
          IsActivated: true,
          StartDate: "2026-01-01",
          EndDate: "2099-12-31",
        },
      ],
    };
  if (url.includes("GetMemberProducts"))
    return [
      {
        Products: [
          {
            ProductName: "Family Health Package",
            IssuedOn: "2026-01-01",
            ValidTill: "2099-01-01",
            Policies: [
              {
                PoliciesId: 2,
                PoliciesProductName: "Insurance",
                PolicyCOINumber: "COI007",
                Nominees: [
                  {
                    NomineeId: 1,
                    NomineeFullName: "Spouse Member",
                    NomineeRelationship: "Spouse",
                  },
                ],
                Insurer: [],
                Dependents: [],
              },
            ],
          },
        ],
      },
    ];
  if (url.includes("GetDependentsByCustomerId"))
    return capturingScreenshots
      ? [
          {
            CustomerId: 8,
            Name: "Spouse Member",
            Relationship: "Spouse",
            Gender: "Male",
            DateofBirth: "1994-05-10",
          },
          {
            CustomerId: 9,
            Name: "Child Member",
            Relationship: "Daughter",
            Gender: "Female",
            DateofBirth: "2016-08-12",
          },
        ]
      : [];
  if (/AddressExistsOrNot|PANVerifiedOrNot|KYCVerifiedOrNot/.test(url))
    return { status: true };
  if (url === "/api/ConfigValues/all")
    return [
      { ConfigKey: "HealthTip", ConfigValue: "Take a gentle walk today." },
      { ConfigKey: "OHOCareMobileNumber", ConfigValue: "9876543210" },
    ];
  if (url.includes("walletOpds"))
    return [
      {
        availableOpds: 23,
        usedOpds: 1,
        totalOpds: 24,
        cardValid: true,
        subscriptionCredit: {
          reference: 7,
          date: "2026-01-01",
          opds: 24,
          labAndMedicines: 25000,
        },
      },
    ];
  if (url.includes("PendingAndSuccessConsultationList")) return [booking];
  if (url === "/api/Hospital/all" || url === "/api/Hospital/GetById/1")
    return [
      {
        HospitalId: 1,
        HospitalName: "Test Network Hospital",
        City: "Hyderabad",
        AddressLine1: "Test street",
        Specialization: "General medicine",
        Latitude: 17.4,
        Longitude: 78.4,
      },
    ];
  if (url.includes("GetByHospitalId"))
    return [
      {
        HospitalPoliciesId: 3,
        PoliciesType: "Free Consultation",
        Description: "Free OPD visits",
      },
    ];
  if (url === "/api/HospitalServices/all")
    return [{ HospitalServicesId: 1, ServiceName: "General medicine" }];
  if (url.includes("checkIndividualCoupons")) return { availableCoupons: 2 };
  if (url.includes("bookAppointment/add"))
    return { status: true, data: { BookingConsultationId: 88 } };
  if (url.includes("Products/GetById")) return [product];
  return [];
}
const root = path.resolve(__dirname, "../dist-web");
const output = path.resolve(
  __dirname,
  capturingScreenshots ? "../screenshots" : "../test-results",
);
const mime = {
  ".js": "text/javascript",
  ".html": "text/html",
  ".json": "application/json",
  ".ttf": "font/ttf",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".ico": "image/x-icon",
};
const server = http.createServer((req, res) => {
  const requested = path.resolve(
    root,
    `.${decodeURIComponent(new URL(req.url, "http://localhost").pathname)}`,
  );
  if (!requested.startsWith(root + path.sep) && requested !== root) {
    res.writeHead(403);
    res.end();
    return;
  }
  const file =
    fs.existsSync(requested) && fs.statSync(requested).isFile()
      ? requested
      : path.join(root, "index.html");
  res.writeHead(200, {
    "Content-Type": mime[path.extname(file)] || "application/octet-stream",
  });
  fs.createReadStream(file).pipe(res);
});
(async () => {
  fs.mkdirSync(output, { recursive: true });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({
    headless: true,
    ...(process.argv[3] ? { executablePath: process.argv[3] } : {}),
  });
  const errors = [];
  try {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
    });
    await context.route("**/*", async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      const apiIndex = url.pathname.indexOf("/api/");
      if (apiIndex >= 0) {
        const result =
          request.method() === "OPTIONS"
            ? {}
            : response(
                url.pathname.slice(apiIndex),
                request.postDataJSON() || {},
                request.headers(),
              );
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "*",
            "Access-Control-Allow-Methods": "*",
          },
          body: JSON.stringify(result),
        });
      }
      if (url.origin === origin || url.protocol === "data:")
        return route.continue();
      return route.abort();
    });
    const page = await context.newPage();
    page.on("pageerror", (error) => errors.push(error.message));
    page.setDefaultTimeout(15000);
    const button = (name) => page.getByRole("button", { name, exact: true });
    const input = (label) =>
      page.getByLabel(label, { exact: true }).filter({ visible: true });
    async function go(route) {
      await page.evaluate((next) => {
        window.history.pushState(null, "", next);
        window.dispatchEvent(new PopStateEvent("popstate"));
      }, route);
      await page.waitForURL(`${origin}${route}`);
    }
    if (capturingScreenshots) {
      await require("./screenshots.browser.cjs").capture({
        page,
        button,
        input,
        go,
        output,
        origin,
        member,
        snapshot,
        setPaid: (value) => {
          paid = value;
        },
        errors,
      });
      return;
    }
    await page.goto(`${origin}/packages`);
    await button("English ✓").waitFor();
    await button("Continue").click();
    await page.getByText("Everyday care.", { exact: false }).waitFor();
    await page.screenshot({ path: path.join(output, "login.png") });
    await input("Enter Mobile Number (+91)").fill(member.MobileNumber);
    await input("4-digit password").fill("1234");
    await button("Login").click();
    await page.waitForURL("**/home");
    await page
      .getByText("Available health benefits", { exact: true })
      .waitFor();
    await page.screenshot({ path: path.join(output, "home.png") });
    await page.getByRole("tab", { name: "Packages", exact: true }).click();
    await button("Family Health Package").waitFor();
    await page.screenshot({ path: path.join(output, "packages.png") });
    await button("Family Health Package").click();
    await button("Save details and continue").click();
    await page.waitForURL("**/purchase/42/family");
    assert.equal(
      await button("Continue").isDisabled(),
      true,
      "Spouse is required",
    );
    await input("Full name").fill("Spouse Member");
    await input("Date of birth").fill("1996-01-01");
    await page.getByRole("radio", { name: "Male", exact: true }).click();
    await button("Add member").click();
    await page.getByText("Spouse Member", { exact: true }).waitFor();
    await input("Full name").fill("Child Member");
    await input("Date of birth").fill("2016-01-01");
    await page.getByRole("radio", { name: "Female", exact: true }).click();
    await page.getByRole("radio", { name: "Daughter", exact: true }).click();
    await button("Add member").click();
    await page.getByText("Child Member", { exact: true }).waitFor();
    await button("Continue").click();
    await page.waitForURL("**/purchase/42/nominees");
    await page
      .getByRole("button", { name: /Child Member · Daughter · 10 years/ })
      .click();
    await button("Test Member").click();
    await page.screenshot({ path: path.join(output, "nominee.png") });
    await button("Save nominee and continue").click();
    await page.waitForURL("**/purchase/42/payment");
    await button("Continue to payment").click();
    await page.waitForURL("**/PaymentLinks?orderId=42&paymentTypeId=4");
    await button("Continue to payment").click();
    await button("Open secure payment").waitFor();
    await page.screenshot({ path: path.join(output, "payment.png") });
    paid = true;
    await button("Check payment status").click();
    await page.getByText("✓ Payment received", { exact: true }).waitFor();
    await button("View my packages").click();
    await page
      .getByText("Family Health Package", { exact: true })
      .filter({ visible: true })
      .waitFor();
    await page.getByRole("tab", { name: "Wallet", exact: true }).click();
    await page.getByText("Transaction statement", { exact: true }).waitFor();
    await page.screenshot({ path: path.join(output, "wallet.png") });
    await page.getByRole("tab", { name: "Bookings", exact: true }).click();
    await button("View details →").waitFor();
    await page.screenshot({ path: path.join(output, "bookings.png") });
    await button("View details →").click();
    await page
      .getByRole("button", { name: "Enlarge QR code for booking 88" })
      .click();
    await button("Close").waitFor();
    await page.screenshot({ path: path.join(output, "booking-qr.png") });
    await button("Close").click();
    await go("/hospitals");
    await input("Search hospitals").fill("Hyderabad");
    await button("Book service").click();
    await input("Appointment date & time (India time)").fill(
      "2098-10-15 10:30",
    );
    await button("General medicine").click();
    await button("Book free consultation").click();
    await page.waitForURL("**/hospitalConsulationForm?bookingId=88");
    assert.ok(
      requests.some(
        (request) =>
          request.url.includes("bookAppointment/add") &&
          request.body.appointmentDate === "2098-10-15T05:00:00.000Z",
      ),
    );
    for (const [route, expected] of [
      ["/account-details", "Account holder"],
      ["/family", "Family members"],
      ["/menu", "More services"],
      ["/products", "Health products"],
      ["/support", "Help & support"],
      ["/kyc-verification", "KYC verification"],
      ["/privacy-policy", "Privacy policy & terms"],
      ["/aboutus", "About us"],
      ["/BMICalculator", "BMI calculator"],
      ["/MeditationBreathing", "Meditation & breathing"],
      ["/StepTracker", "Step tracker"],
      ["/NutritionTracking", "Nutrition tracking"],
      ["/doctors", "Doctors"],
      ["/lab-tests", "Lab tests"],
      ["/pharmacy", "Pharmacy"],
      ["/records", "Health records"],
      ["/notifications", "Notifications"],
      ["/account-management", "Account management"],
    ]) {
      await go(route);
      await page
        .getByText(expected, { exact: true })
        .filter({ visible: true })
        .first()
        .waitFor();
    }
    await button("Send OTP").click();
    await input("6-digit OTP").fill("123456");
    await button("Verify OTP").click();
    await input("New 4-digit password").fill("4321");
    await input("Confirm password").fill("4321");
    await button("Save password").click();
    await page
      .getByText("Your password was updated.", { exact: true })
      .filter({ visible: true })
      .waitFor();
    assert.ok(
      requests.some(
        (request) =>
          request.url === "/api/Customer/updatePassword" &&
          request.body.password === "4321",
      ),
    );
    await go("/language");
    await page.getByRole("button").nth(0).click();
    await page.getByRole("button").last().click();
    await page.waitForURL("**/home");
    await page.waitForFunction(() =>
      /[\u0C00-\u0C7F]/.test(document.body.innerText),
    );
    await go("/book-service?hospitalId=1");
    await page.locator('input[placeholder="YYYY-MM-DD HH:mm"]').waitFor();
    await go("/language");
    await page.getByRole("button").nth(2).click();
    await page.getByRole("button").last().click();
    await page.waitForURL("**/home");
    await page.getByRole("tab", { name: "Home", exact: true }).waitFor();
    await go("/profile");
    await button("Logout").click();
    await input("Enter Mobile Number (+91)").waitFor();
    await input("Enter Mobile Number (+91)").fill("9999999999");
    await input("Full Name (as per Aadhar)").fill("New Member");
    await button("Send OTP").click();
    await input("6-digit OTP").fill("123456");
    await button("Verify & continue").click();
    await page.waitForURL("**/home");
    assert.equal(errors.length, 0, errors.join("\n"));
    console.log(
      "PASS: login, guarded routes, native family/nominee/guardian purchase, payment confirmation, live wallet, QR modal, OPD booking, page smoke checks, password reset, language switching, logout and OTP registration.",
    );
  } catch (error) {
    console.error(error);
    console.error("Page errors:", errors);
    process.exitCode = 1;
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
  server.close();
});
