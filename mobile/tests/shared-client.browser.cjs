// Run with a locally installed Playwright module: node tests/shared-client.browser.cjs <module-path>
const { chromium } = require(process.argv[2] || "playwright");
const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const assert = require("node:assert/strict");
const ts = require("typescript");
const vm = require("node:vm");
const exportsBootstrap = {};
vm.runInNewContext(
  ts.transpileModule(
    fs.readFileSync(
      path.join(__dirname, "../src/lib/client-bootstrap.ts"),
      "utf8",
    ),
    { compilerOptions: { module: ts.ModuleKind.CommonJS } },
  ).outputText,
  { exports: exportsBootstrap },
);
const member = {
  MemberId: 7,
  Name: "Test Member",
  MobileNumber: "9876543210",
  Gender: "Female",
  Age: 30,
  DateofBirth: "1996-01-01",
};
const session = {
  accessToken: "test-token",
  tokenExpiresAt: new Date(Date.now() + 3600000).toISOString(),
  member: JSON.stringify(member),
  memberId: "7",
  FullName: member.Name,
};
const bundle = require("../src/generated/client.json");
function result(url) {
  if (/mobileNoValid/.test(url)) return { status: true };
  if (/memberlogin/.test(url))
    return {
      status: true,
      JwtToken: "new-token",
      expiresAt: session.tokenExpiresAt,
      memberData: [member],
    };
  if (/GetById\/7/.test(url)) return [member];
  if (/card|verified|status/i.test(url)) return { status: false };
  return [];
}
const server = http.createServer((request, response) => {
  if (request.url.startsWith("/bundled")) {
    const html = bundle.html.replace(
      "<!--OHO_BOOTSTRAP-->",
      `<script>${exportsBootstrap.clientBootstrap({ apiBaseUrl: "https://api.example.com", session, local: {}, route: "/home", native: true })}</script>`,
    );
    response.setHeader("Content-Type", "text/html");
    response.end(html);
    return;
  }
  const dist = path.resolve(__dirname, "../../client/dist");
  const file =
    request.url.startsWith("/assets/") || /\.(png|jpg)$/.test(request.url)
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
            : file.endsWith(".jpg")
              ? "image/jpeg"
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
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 1,
    });
    const web = await context.newPage();
    const mobile = await context.newPage();
    const errors = [];
    mobile.on("pageerror", (error) => errors.push(error.message));
    const messages = [];
    await mobile.exposeFunction("nativeMessage", async (raw) => {
      const message = JSON.parse(raw);
      messages.push(message);
      if (message.type === "fetch")
        await mobile.evaluate((reply) => window.ohoReceive(reply), {
          id: message.id,
          value: {
            status: 200,
            body: JSON.stringify(result(message.url)),
            headers: { "Content-Type": "application/json" },
          },
        });
      if (message.type === "location")
        await mobile.evaluate((reply) => window.ohoReceive(reply), {
          id: message.id,
          error: "Allow location access to find nearby hospitals.",
        });
    });
    await mobile.addInitScript(() => {
      window.ReactNativeWebView = {
        postMessage: (value) => window.nativeMessage(value),
      };
    });
    await web.addInitScript((value) => {
      for (const [key, item] of Object.entries(value))
        sessionStorage.setItem(key, item);
    }, session);
    await web.route("**/api/**", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(result(route.request().url())),
      }),
    );
    const origin = `http://127.0.0.1:${server.address().port}`;
    await mobile.goto(origin + "/bundled");
    const routes = [
      ...fs
        .readFileSync(path.join(__dirname, "../../client/src/App.tsx"), "utf8")
        .matchAll(/path="(\/[^":]*)"/g),
    ]
      .map((match) => match[1])
      .filter((route) => !["/", "/splash", "/login", "/otp"].includes(route));
    routes.push(
      "/doctor/1",
      "/policies/1",
      "/hospitalDetails?hospitalId=1",
      "/book-service?hospitalId=1",
      "/product-details?productId=1",
    );
    for (const route of routes) {
      await web.goto(origin + route);
      await mobile.evaluate((route) => {
        location.hash = route;
      }, route);
      await Promise.all([
        web.evaluate(() => document.fonts.ready),
        mobile.evaluate(() => document.fonts.ready),
      ]);
      await web.waitForTimeout(100);
      const text = (page) => page.locator("#root").innerText();
      assert.equal(errors.length, 0, errors.join("\n"));
      assert.equal(
        await text(mobile),
        await text(web),
        `Page content differs on ${route}`,
      );
      assert.ok(
        !(await text(mobile).then((value) => value.includes("Page not found"))),
        route,
      );
      if (
        [
          "/home",
          "/profile",
          "/wallet",
          "/bookings",
          "/hospitals",
          "/menu",
        ].includes(route)
      ) {
        for (const page of [web, mobile])
          await page.evaluate(async () => {
            await Promise.all(
              [...document.images].map((image) =>
                image.complete
                  ? Promise.resolve()
                  : new Promise((resolve) => {
                      image.onload = resolve;
                      image.onerror = resolve;
                    }),
              ),
            );
          });
        assert.ok(
          (await mobile.screenshot()).equals(await web.screenshot()),
          `Visual layout differs on ${route}`,
        );
      }
    }
    await mobile.evaluate(() => {
      location.hash = "/profile";
    });
    await mobile.getByText("Logout", { exact: true }).click();
    await mobile.waitForURL("**#/login");
    assert.ok(
      messages.some(
        (message) => message.type === "session" && !message.value.accessToken,
      ),
    );
    await mobile.locator("#mobileNumber").fill("9876543210");
    await mobile.locator("#password").fill("1234");
    await mobile.locator('button[type="submit"]').click();
    await mobile.waitForURL("**#/home");
    assert.ok(
      messages.some(
        (message) =>
          message.type === "session" &&
          message.value.accessToken === "new-token",
      ),
    );
    assert.equal(errors.length, 0, errors.join("\n"));
    console.log(
      `Shared-client parity passed for ${routes.length} routes, including identical screenshots for six main screens; login, logout and native API bridge passed.`,
    );
  } finally {
    await browser.close();
  }
})()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => server.close());
