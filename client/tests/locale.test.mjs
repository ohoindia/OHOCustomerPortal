import assert from "node:assert/strict";
import test from "node:test";
import { loadModule } from "./load-common.mjs";

test("locales normalize saved legacy names and device language tags", () => {
  const { normalizeLocale } = loadModule("../../common/content/locale.ts");
  for (const value of ["te-IN", "telugu", "TE_in"])
    assert.equal(normalizeLocale(value), "te");
  for (const value of ["hi-IN", "hindi"])
    assert.equal(normalizeLocale(value), "hi");
  for (const value of [null, "english", "fr-FR", "invalid"])
    assert.equal(normalizeLocale(value), "en");
});

test("language changes update labels, menus and filters while preserving API keys and routes", () => {
  const cache = new Map();
  const {
    getLocale,
    setLocale,
    translate,
    subscribeLocale,
    getLocaleTag,
    formatMessage,
  } = loadModule("../../common/content/locale.ts", {}, cache);
  const { UI_TEXT } = loadModule("../../common/content/labels.ts", {}, cache);
  const { portalServices, customerProfileFields, bookingPeriods } = loadModule(
    "../../common/content/options.ts",
    {},
    cache,
  );
  const { bookingPeriod } = loadModule(
    "../../common/utils/bookings.ts",
    {},
    cache,
  );
  const changes = [];
  const unsubscribe = subscribeLocale(() => changes.push(getLocale()));
  setLocale("te");
  assert.notEqual(translate("Home"), "Home");
  assert.equal(UI_TEXT.home, translate("Home"));
  assert.equal(
    portalServices.map((row) => row[0])[0],
    translate("My Membership"),
  );
  assert.equal(portalServices[0][1], "/PurchasedPackages");
  assert.equal(customerProfileFields[0][0], "Name");
  assert.equal(customerProfileFields[0][1], translate("Name"));
  assert.equal(bookingPeriod({ StatusName: "Completed" }), "Previous");
  assert.ok(bookingPeriods.includes(translate("Previous")));
  assert.equal(getLocaleTag(), "te-IN");
  assert.match(formatMessage("Resend OTP in {0}s", [42]), /42/);
  assert.equal(translate("Unknown backend text"), "Unknown backend text");
  setLocale("te");
  setLocale("hi");
  unsubscribe();
  setLocale("en");
  assert.deepEqual(changes, ["te", "hi"]);
  assert.equal(translate("Home"), "Home");
});

test("every shared label has bundled Telugu and Hindi translations with matching message placeholders", () => {
  const { UI_TEXT, UI_MESSAGES } = loadModule("../../common/content/labels.ts");
  const te = loadModule("../../common/content/locales/te.ts").default;
  const hi = loadModule("../../common/content/locales/hi.ts").default;
  for (const text of Object.values(UI_TEXT)) {
    assert.equal(typeof te[text], "string", `Missing Telugu: ${text}`);
    assert.equal(typeof hi[text], "string", `Missing Hindi: ${text}`);
  }
  for (const dictionary of [te, hi]) {
    for (const [key, value] of Object.entries(dictionary)) {
      assert.deepEqual(
        [...key.matchAll(/\{\d+\}/g)].map((x) => x[0]).sort(),
        [...value.matchAll(/\{\d+\}/g)].map((x) => x[0]).sort(),
        `Interpolation: ${key}`,
      );
    }
  }
  assert.equal(UI_MESSAGES.ageInYears(30), "30 years");
});

test("screen translation calls have bundled translations on web and mobile", async () => {
  const { readdirSync, readFileSync } = await import("node:fs");
  const { default: ts } = await import("typescript");
  const dictionaries = ["te", "hi"].map((locale) => [
    locale,
    loadModule(`../../common/content/locales/${locale}.ts`).default,
  ]);
  function scan(directory) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const file = new URL(entry.name, directory);
      if (entry.isDirectory()) {
        if (entry.name !== "generated")
          scan(new URL(`${entry.name}/`, directory));
        continue;
      }
      if (!/\.tsx?$/.test(entry.name)) continue;
      const source = ts.createSourceFile(
        file.pathname,
        readFileSync(file, "utf8"),
        ts.ScriptTarget.Latest,
        true,
      );
      function visit(node) {
        if (
          ts.isCallExpression(node) &&
          /^(translate|localize|formatMessage)$/.test(
            node.expression.getText(source),
          )
        ) {
          const argument = node.arguments[0];
          if (argument && ts.isStringLiteral(argument)) {
            for (const [locale, dictionary] of dictionaries) {
              assert.ok(
                dictionary[argument.text]?.trim(),
                `Missing ${locale}: ${argument.text} in ${file.pathname}`,
              );
            }
          }
        }
        ts.forEachChild(node, visit);
      }
      visit(source);
    }
  }
  for (const path of ["../src/", "../../common/", "../../mobile/src/"])
    scan(new URL(path, import.meta.url));
});
