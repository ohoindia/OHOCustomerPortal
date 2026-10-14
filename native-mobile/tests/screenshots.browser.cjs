const fs = require("node:fs");
const path = require("node:path");
exports.capture = async function ({
  page,
  button,
  input,
  go,
  output,
  origin,
  member,
  setPaid,
  errors,
}) {
  const screens = [];
  async function shot(name, title) {
    // Let fonts, asynchronous data and navigation transitions settle before capture.
    await page.waitForTimeout(400);
    const file = `${String(screens.length + 1).padStart(2, "0")}-${name}.png`;
    await page.screenshot({
      path: path.join(output, file),
      animations: "disabled",
    });
    screens.push({ file, title, route: new URL(page.url()).pathname });
  }
  async function screen(route, name, title, expected = title) {
    await go(route);
    await page
      .getByText(expected, { exact: true })
      .filter({ visible: true })
      .first()
      .waitFor();
    await shot(name, title);
  }
  await page.goto(`${origin}/language`);
  await button("English ✓").waitFor();
  await shot("language", "Choose your language");
  await button("Continue").click();
  await input("Enter Mobile Number (+91)").fill(member.MobileNumber);
  await input("4-digit password").waitFor();
  await shot("login", "Sign in");
  await button("Forgot password?").click();
  await input("6-digit OTP").waitFor();
  await shot("otp", "OTP verification");
  await input("6-digit OTP").fill("123456");
  await button("Verify & continue").click();
  await input("New 4-digit password").waitFor();
  await shot("forgot-password", "Set new password");
  await button("Back to login").click();
  await input("4-digit password").fill("1234");
  await button("Login").click();
  await page.waitForURL("**/home");
  await page
    .getByText("Available health benefits", { exact: true })
    .filter({ visible: true })
    .waitFor();
  await shot("home", "Home & benefit balances");
  await screen(
    "/packages",
    "packages",
    "Health packages",
    "Care for you.\nConfidence for your family.",
  );
  await button("Family Health Package").click();
  await button("Save details and continue").waitFor();
  await shot("package-details", "Package details & pricing");
  await input("Full name").scrollIntoViewIfNeeded();
  await shot("purchase-customer", "Confirm purchaser details");
  await button("Save details and continue").click();
  await page.waitForURL("**/purchase/42/family");
  await input("Full name").fill("Spouse Member");
  await input("Date of birth").fill("1994-05-10");
  await page.getByRole("radio", { name: "Male", exact: true }).click();
  await shot("purchase-family", "Add family to your package");
  await button("Add member").click();
  await page
    .getByText("Spouse Member", { exact: true })
    .filter({ visible: true })
    .waitFor();
  await input("Full name").fill("Child Member");
  await input("Date of birth").fill("2016-08-12");
  await page.getByRole("radio", { name: "Female", exact: true }).click();
  await page.getByRole("radio", { name: "Daughter", exact: true }).click();
  await button("Add member").click();
  await page
    .getByText("Child Member", { exact: true })
    .filter({ visible: true })
    .waitFor();
  await button("Continue").click();
  await page.waitForURL("**/purchase/42/nominees");
  await page
    .getByRole("button", { name: /Child Member · Daughter · 10 years/ })
    .click();
  await button("Test Member").click();
  await shot("purchase-nominee", "Nominee & adult guardian");
  await button("Save nominee and continue").click();
  await page.waitForURL("**/purchase/42/payment");
  await button("Continue to secure payment").waitFor();
  await shot("purchase-payment", "Choose payment method");
  await button("Continue to secure payment").click();
  await button("Open secure payment").waitFor();
  await shot("cashfree", "Secure Cashfree payment");
  setPaid(true);
  await button("Check payment status").click();
  await page
    .getByText("✓ Payment received", { exact: true })
    .filter({ visible: true })
    .waitFor();
  await shot("payment-success", "Payment confirmation");
  await screen("/hospitals", "hospitals", "Hospital network", "Hospitals");
  await screen(
    "/hospital-details?id=1",
    "hospital-details",
    "Hospital details",
  );
  await screen(
    "/book-service?hospitalId=1",
    "opd-booking",
    "Book an OPD service",
    "Book service",
  );
  await input("Appointment date & time (India time)").fill("2026-10-16 10:30");
  await button("General medicine").click();
  await input("Appointment date & time (India time)").scrollIntoViewIfNeeded();
  await shot("opd-form", "OPD appointment form");
  await screen("/bookings", "bookings", "My bookings");
  await screen(
    "/hospitalConsulationForm?bookingId=88",
    "booking-details",
    "Booking details",
  );
  await page
    .getByRole("button", { name: "Enlarge QR code for booking 88" })
    .click();
  await button("Close").waitFor();
  await shot("booking-qr", "Hospital check-in QR");
  await button("Close").click();
  await screen("/wallet", "wallet", "Wallet & Balance");
  await screen("/profile", "profile", "Profile");
  await screen(
    "/account-details",
    "account-details",
    "Account details",
    "Account holder",
  );
  await screen("/family", "family", "Family members");
  await screen("/membership", "membership", "My membership");
  await screen("/policies/2", "policy-details", "Policy details");
  await screen("/NomineeDetails", "nominee-details", "Nominee details");
  await screen("/products", "products", "Health products");
  await screen("/product-details?id=278", "product-details", "Product details");
  await screen("/kyc-verification", "kyc", "KYC verification");
  await screen(
    "/account-management",
    "account-management",
    "Account management",
  );
  await screen("/doctors", "doctors", "Doctors");
  await screen("/doctor/1", "doctor-details", "Doctor details", "Details");
  await screen("/book-appointment", "book-appointment", "Book appointment");
  await screen("/lab-tests", "lab-tests", "Lab tests");
  await screen("/pharmacy", "pharmacy", "Pharmacy");
  await screen("/records", "health-records", "Health records");
  await screen("/notifications", "notifications", "Notifications");
  await screen("/BMICalculator", "bmi", "BMI calculator");
  await input("Height (cm)").fill("165");
  await input("Weight (kg)").fill("60");
  await button("Calculate BMI").click();
  await shot("bmi-result", "BMI result");
  await screen("/MeditationBreathing", "breathing", "Meditation & breathing");
  await screen("/StepTracker", "steps", "Step tracker");
  await input("Steps today").fill("6500");
  await button("Save entry").click();
  await shot("steps-saved", "Daily steps saved");
  await screen("/NutritionTracking", "nutrition", "Nutrition tracking");
  await input("Calories today").fill("1800");
  await button("Save entry").click();
  await shot("nutrition-saved", "Daily nutrition saved");
  await screen("/menu", "services-menu", "More services");
  await screen("/support", "support", "Help & support");
  await screen("/privacy-policy", "privacy", "Privacy policy & terms");
  await screen("/aboutus", "about", "About us");
  await screen("/payment", "payment-preview", "Payment preview", "Payment");
  await screen(
    "/order-tracking",
    "tracking",
    "Order tracking",
    "Order Tracking",
  );
  if (errors.length) throw new Error(errors.join("\n"));
  fs.writeFileSync(
    path.join(output, "screens.json"),
    JSON.stringify(screens, null, 2),
  );
  console.log(
    `Captured ${screens.length} screenshots in ${output}. These are phone-sized React Native web previews with mocked API data, not Android emulator captures.`,
  );
};
