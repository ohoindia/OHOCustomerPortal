// node tests/localization.browser.cjs <path-to-playwright>
const { chromium } = require(process.argv[2] || "playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const vm = require("node:vm");
const ts = require("typescript");
const bootstrap = {};
vm.runInNewContext(
  ts.transpileModule(
    fs.readFileSync(
      path.join(__dirname, "../src/lib/client-bootstrap.ts"),
      "utf8",
    ),
    {
      compilerOptions: { module: ts.ModuleKind.CommonJS },
    },
  ).outputText,
  { exports: bootstrap },
);
const bundle = require("../src/generated/client.json");
let local = {};
let session = {};
let initialRoute = "/language";
const member = {
  MemberId: 7,
  Name: "Test Member",
  MobileNumber: "9876543210",
  Gender: "Female",
  Age: 30,
  DateofBirth: "1996-01-01",
};
const purchase = {
  order: { OrdersId: 42, FullName: member.Name, Age: 30, PayableAmount: 1200 },
  product: {
    ProductsId: 278,
    ProductName: "Family Health Package",
    MaximumMembers: 3,
  },
  family: [],
  nominees: [],
  nomineeProducts: [],
  paymentMethods: [],
};
const server = http.createServer((request, response) => {
  if (request.url === "/bundled") {
    response.setHeader("Content-Type", "text/html");
    response.end(
      bundle.html.replace(
        "<!--OHO_BOOTSTRAP-->",
        `<script>${bootstrap.clientBootstrap({ apiBaseUrl: "https://api.example.com", session, local, route: initialRoute, native: true })}</script>`,
      ),
    );
    return;
  }
  const dist = path.resolve(__dirname, "../../client/dist");
  const file =
    request.url.startsWith("/assets/") || request.url.endsWith(".png")
      ? path.join(dist, request.url)
      : path.join(dist, "index.html");
  response.setHeader(
    "Content-Type",
    file.endsWith(".js")
      ? "text/javascript"
      : file.endsWith(".css")
        ? "text/css"
        : file.endsWith(".ttf")
          ? "font/ttf"
          : file.endsWith(".png")
            ? "image/png"
            : "text/html",
  );
  try {
    response.end(fs.readFileSync(file));
  } catch {
    response.statusCode = 404;
    response.end();
  }
});

(async () => {
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const browser = await chromium.launch({ headless: true });
  try {
    const origin = `http://127.0.0.1:${server.address().port}`;
    const context = await browser.newContext({
      locale: "en-IN",
      viewport: { width: 390, height: 844 },
    });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(origin + "/login");
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 900 });
      const submit = await page.locator('button[type="submit"]').boundingBox();
      const language = await page.locator(".language-action").boundingBox();
      assert.ok(
        language.y >= submit.y + submit.height,
        "Language button must sit below Continue",
      );
      assert.ok(Math.abs(language.x - submit.x) < 1);
      assert.ok(Math.abs(language.width - submit.width) < 1);
      if (width === 1440) {
        const intro = await page.locator(".login-intro").boundingBox();
        const card = await page.locator(".auth-card").boundingBox();
        assert.ok(
          card.x >= intro.x + intro.width,
          "Desktop intro and login card must share a row",
        );
      }
    }
    await page.locator(".language-action").click();
    await page.getByRole("button", { name: /తెలుగు/ }).click();
    await page.waitForFunction(() => document.documentElement.lang === "te");
    assert.equal(
      await page.evaluate(() => localStorage.getItem("language")),
      "te",
    );
    assert.equal(
      await page
        .getByRole("button", { name: /తెలుగు/ })
        .getAttribute("aria-pressed"),
      "true",
    );
    assert.match(await page.locator("h1").innerText(), /[\u0c00-\u0c7f]/);
    await page.locator(".language-done").click();
    await page.waitForURL("**/login");
    assert.match(await page.locator("form").innerText(), /[\u0c00-\u0c7f]/);
    await page.reload();
    await page.waitForFunction(() => document.documentElement.lang === "te");
    const second = await context.newPage();
    await second.goto(origin + "/language");
    await second.getByRole("button", { name: /हिंदी/ }).click();
    await page.waitForFunction(() => document.documentElement.lang === "hi");
    await second.getByRole("button", { name: /English/ }).click();
    await page.waitForFunction(() => document.documentElement.lang === "en");

    const mobile = await context.newPage();
    mobile.on("pageerror", (error) => errors.push(error.message));
    const requests = [];
    await mobile.exposeFunction("nativeMessage", async (raw) => {
      const message = JSON.parse(raw);
      if (message.type === "local") local = message.value;
      if (message.type === "fetch") {
        requests.push(message);
        const url = new URL(message.url).pathname;
        const body = url === "/api/purchases/42" ? purchase : [];
        await mobile.evaluate((reply) => window.ohoReceive(reply), {
          id: message.id,
          value: {
            status: 200,
            body: JSON.stringify(body),
            headers: { "Content-Type": "application/json" },
          },
        });
      }
    });
    await mobile.addInitScript(() => {
      window.ReactNativeWebView = {
        postMessage: (raw) => window.nativeMessage(raw),
      };
    });
    await mobile.goto(origin + "/bundled");
    await mobile.getByRole("button", { name: /हिंदी/ }).click();
    await mobile.waitForFunction(() => document.documentElement.lang === "hi");
    assert.match(await mobile.locator("h1").innerText(), /[\u0900-\u097f]/);
    assert.equal(local.language, "hi");
    await mobile.reload();
    await mobile.waitForFunction(() => document.documentElement.lang === "hi");
    assert.equal(
      await mobile
        .getByRole("button", { name: /हिंदी/ })
        .getAttribute("aria-pressed"),
      "true",
    );
    await mobile.getByRole("button", { name: /English/ }).click();
    await mobile.waitForFunction(() => document.documentElement.lang === "en");
    assert.equal(await mobile.locator("h1").innerText(), "Change Language");
    local = { language: "hi" };
    session = {
      accessToken: "test-token",
      tokenExpiresAt: new Date(Date.now() + 3600000).toISOString(),
      member: JSON.stringify(member),
    };
    initialRoute = "/purchase/42/family";
    await mobile.reload();
    await mobile.locator(".purchase-panel form").waitFor();
    assert.match(
      await mobile.locator(".purchase-panel h2").innerText(),
      /[\u0900-\u097f]/,
    );
    const form = mobile.locator(".purchase-panel form");
    await form.locator("input").first().fill("Family Member");
    await form.locator('input[type="date"]').fill("1998-01-01");
    await form.locator("select").nth(0).selectOption("Male");
    await form.locator("select").nth(1).selectOption("Spouse");
    assert.match(
      await form.locator('option[value="Male"]').innerText(),
      /[\u0900-\u097f]/,
    );
    await form.locator("button").click();
    await mobile.waitForTimeout(100);
    const add = requests.find(
      (message) => new URL(message.url).pathname === "/api/purchases/42/family",
    );
    assert.ok(add, "Translated family step must submit");
    assert.equal(JSON.parse(add.body).gender, "Male");
    assert.equal(JSON.parse(add.body).relationship, "Spouse");
    await mobile.evaluate(() => {
      location.hash = "/profile";
    });
    await mobile.locator(".menu-row").last().click();
    await mobile.waitForURL("**#/login");
    assert.equal(
      await mobile.evaluate(() => localStorage.getItem("language")),
      "hi",
    );
    assert.equal(
      await mobile.evaluate(() => sessionStorage.getItem("accessToken")),
      null,
    );
    assert.deepEqual(errors, []);
    console.log(
      "Language selection, web reload/cross-tab synchronization, mobile bridge persistence, and localized purchase API values passed.",
    );
  } finally {
    await browser.close();
    server.close();
  }
})().catch((error) => {
  console.error(error);
  server.close();
  process.exitCode = 1;
});
