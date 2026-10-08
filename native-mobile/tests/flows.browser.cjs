// Run with a Playwright module path and a Metro web server using a test API origin.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require(process.argv[2] || "playwright");
const origin = process.argv[3] || "http://localhost:8085";
(async () => {
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();
  const failures = [];
  const requests = [];
  page.on("pageerror", (error) => failures.push(error.message));
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      failures.push(msg.text());
      console.error("Browser console:", msg.text());
    }
  });
  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    const body = route.request().postDataJSON() || {};
    requests.push({ path: url.pathname, body });
    const response = {
      status: true,
      JwtToken: "test-session",
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
      memberData: [
        { MemberId: 101, Name: "Test Member", MobileNumber: "9876543210" },
      ],
    };
    let data = [];
    if (url.pathname.endsWith("/mobileNoValid"))
      data = { status: body.mobileNumber === "9876543210" };
    else if (url.pathname.endsWith("/memberlogin")) data = response;
    else if (/\/(checkingMobileno|toSetNewPassword)$/.test(url.pathname))
      data = {
        status: true,
        guid: "test-otp",
        futureTime: new Date(Date.now() + 60000).toISOString(),
      };
    else if (/\/(OTPValidation|updatePassword)$/.test(url.pathname))
      data = { status: true };
    else if (url.pathname.endsWith("/add"))
      data = { ...response, data: { customerId: 101 } };
    else if (url.pathname.endsWith("/walletOpds"))
      data = [{ availableOpds: 3, usedOpds: 1, totalOpds: 4 }];
    else if (url.pathname.endsWith("/PendingAndSuccessConsultationList"))
      data = [
        {
          BookingConsultationId: 7,
          StatusName: "Visited",
          Appointment: "Free Consultation",
          HospitalName: "Test Hospital",
          Name: "Test Member",
          AppointmentDate: "2026-10-01T10:00:00+05:30",
          QRCode: "booking-7",
        },
      ];
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: { "access-control-allow-origin": "*" },
      body: JSON.stringify(data),
    });
  });
  await page.goto(origin + "/login", {
    timeout: 180000,
    waitUntil: "domcontentloaded",
  });
  const mobile = () =>
    page
      .getByRole("textbox", { name: "Enter Mobile Number", exact: false })
      .first();
  await mobile().waitFor({ timeout: 180000 });
  assert.ok((await page.locator("body").innerText()).includes("Everyday care"));
  fs.mkdirSync(path.join(__dirname, "../.expo/review"), { recursive: true });
  await page.screenshot({
    path: path.join(__dirname, "../.expo/review/login.png"),
    fullPage: true,
  });
  await mobile().fill("9876543210");
  await page
    .getByRole("textbox", { name: "Password", exact: true })
    .fill("1234");
  await page
    .getByRole("button", { name: "Show password", exact: true })
    .click();
  await page.getByRole("button", { name: "Login", exact: true }).click();
  await page.waitForURL("**/home");
  for (const name of ["Home", "Bookings", "Wallet", "Packages", "Profile"])
    assert.equal(
      await page.getByRole("button", { name, exact: true }).count(),
      1,
    );
  await page.getByRole("button", { name: "Wallet", exact: true }).click();
  await page.getByText("OPD consultations: ₹", { exact: false }).waitFor();
  assert.ok(!(await page.locator("body").innerText()).includes("2,450"));
  await page.getByRole("button", { name: "Bookings", exact: true }).click();
  await page.getByRole("button", { name: /View details/i }).click();
  await page.waitForURL("**/hospitalConsulationForm?bookingId=7");
  await page.getByRole("button", { name: "Profile", exact: true }).click();
  await page.getByRole("button", { name: /Logout/ }).click();
  await mobile().waitFor();
  await mobile().fill("9876543210");
  await page.getByText("Forgot your password?", { exact: false }).click();
  await page.waitForURL("**/otp");
  await page.getByRole("textbox", { name: "OTP", exact: true }).fill("123456");
  await page.getByRole("button", { name: "Verify & continue" }).click();
  await page
    .getByRole("textbox", { name: "New 4-digit password", exact: false })
    .fill("4321");
  await page
    .getByRole("textbox", { name: /Confirm password/i, exact: false })
    .fill("4321");
  await page.getByRole("button", { name: "Save password" }).click();
  await page.waitForURL("**/login");
  assert.equal(
    requests.find((r) => r.path.endsWith("/updatePassword")).body.password,
    "4321",
  );
  await mobile().fill("9123456789");
  await page
    .getByRole("textbox", { name: /Full Name.*as per Aadhar/i })
    .fill("New Member");
  await page.getByRole("button", { name: /Send OTP/i, exact: true }).click();
  await page.waitForURL("**/otp");
  await page.getByRole("textbox", { name: "OTP", exact: true }).fill("123456");
  await page.getByRole("button", { name: "Verify & continue" }).click();
  await page.waitForURL("**/home");
  assert.equal(
    requests.find((r) => r.path.endsWith("/add")).body.name,
    "New Member",
  );
  await page.getByRole("button", { name: "Profile", exact: true }).click();
  await page.getByRole("button", { name: /Change Language/ }).click();
  await page.waitForURL("**/language");
  await page.getByRole("button", { name: /हिन्दी|हिंदी/ }).click();
  await page.getByRole("button", { name: "जारी रखें", exact: true }).waitFor();
  assert.ok(
    (await page.locator("body").innerText()).includes("अपनी भाषा चुनें"),
  );
  await page.reload();
  await page.getByRole("button", { name: "जारी रखें", exact: true }).waitFor();
  assert.deepEqual(failures, []);
  await browser.close();
  console.log(
    "PASS: login, password visibility, five tabs, live wallet, booking details, logout, OTP reset, registration and language persistence; no runtime or console errors.",
  );
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
