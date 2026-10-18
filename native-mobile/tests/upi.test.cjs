const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const vm = require("node:vm");

function compile(file, dependencies = {}) {
  const source = fs.readFileSync(path.resolve(__dirname, file), "utf8");
  const js = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const exports = {};
  vm.runInNewContext(js, {
    exports,
    require: (name) => dependencies[name],
  });
  return exports;
}

const parser = compile("../../common/utils/upi.ts");
const scanned = "upi://pay?pa=hospital%40upi&pn=City+Hospital&cu=INR";
const intent = parser.buildBookingUpiUri(scanned, {
  amount: "750",
  transactionRef: "OHO-PAY-42",
  note: "Hospital booking 42",
});

test("UPI QR parsing normalizes payee, money and booking reference without forwarding arbitrary extras", () => {
  const parsed = parser.parseUpiUri(
    `${scanned}&url=https%3A%2F%2Fexample.test&foo=bar`,
  );
  assert.equal(parsed.payeeAddress, "hospital@upi");
  assert.equal(parsed.payeeName, "City Hospital");
  assert.equal(parsed.currency, "INR");
  assert.equal(parser.parseUpiUri("upi://pay?pa=a@upi").payeeAddress, "a@upi");
  assert.equal(
    parsed.uri,
    "upi://pay?pa=hospital%40upi&pn=City%20Hospital&cu=INR",
  );
  const linked = parser.parseUpiUri(intent);
  assert.equal(linked.amount, "750.00");
  assert.equal(linked.transactionRef, "OHO-PAY-42");
  assert.equal(linked.note, "Hospital booking 42");
  assert.equal(parser.normalizeUpiAmount("000.5"), "0.50");
  assert.equal(
    parser.parseUpiUri("upi://pay?pa=hospital@upi&am=0010.5").amount,
    "10.50",
  );
});

test("scanned requests cannot redirect launch or hide contradictory payment details", () => {
  for (const bad of [
    "https://example.test/?pa=hospital@upi",
    "intent://pay?pa=hospital@upi#Intent;scheme=upi;end",
    "phonepe://pay?pa=hospital@upi",
    "upi://pay/evil?pa=hospital@upi",
    "upi://pay/?pa=hospital@upi",
    "upi://user@pay?pa=hospital@upi",
    "upi://pay:443?pa=hospital@upi",
    "upi://pay?pa=hospital@upi#anything",
    "upi://pay?pa=hospital@upi&pa=another@upi",
    "upi://pay?pa=hospital@upi&PA=another@upi",
    "upi://pay?pa=hospital@upi&%70a=another@upi",
    "upi://pay?pa=hospital@upi&pn=%E0%A4%A",
    "upi://pay?pa=hospital@upi&pn=City%0AHospital",
    "upi://pay?pa=invalid&pn=City",
    "upi://pay?pa=.hospital@upi",
    "upi://pay?pa=hospital@upi&cu=USD",
    "upi://pay?pa=hospital@upi&am=0",
    "upi://pay?pa=hospital@upi&am=-1",
    "upi://pay?pa=hospital@upi&am=1e3",
    "upi://pay?pa=hospital@upi&am=1.001",
    "upi://pay?pa=hospital@upi&am=1,000",
    "upi://pay?pa=hospital@upi&sign=signature",
    "upi://pay?pa=hospital@upi&mc=abc",
    "upi://pay?pa=hospital@upi&tr=invalid%26reference",
  ]) {
    assert.throws(() => parser.parseUpiUri(bad), undefined, bad);
  }
});

test("a booking payment cannot silently replace a conflicting QR amount", () => {
  assert.throws(
    () =>
      parser.buildBookingUpiUri(`${scanned}&am=751`, {
        amount: 750,
        transactionRef: "OHO-PAY-42",
      }),
    /does not match/,
  );
  assert.equal(
    parser.parseUpiUri(
      parser.buildBookingUpiUri(`${scanned}&am=750.0&tr=OLD`, {
        amount: 750,
        transactionRef: "OHO-PAY-42",
      }),
    ).transactionRef,
    "OHO-PAY-42",
  );
  assert.throws(
    () =>
      parser.buildBookingUpiUri(scanned, {
        amount: 750,
        transactionRef: "",
      }),
    /reference/,
  );
});

function bridge({ platform = "android", expoGo = false, native = null } = {}) {
  return compile("../src/lib/upi.ts", {
    expo: {
      isRunningInExpoGo: () => expoGo,
      requireOptionalNativeModule: () => native,
    },
    "react-native": { Platform: { OS: platform } },
    "../../../common/utils/upi": parser,
  });
}

test("web, iOS, Expo Go and outdated native builds report unsupported payment capture", async () => {
  for (const options of [
    { platform: "web" },
    { platform: "ios" },
    { expoGo: true },
    {},
  ]) {
    const module = bridge(options);
    assert.equal(module.getUpiAvailability().available, false);
    assert.ok(module.getUpiAvailability().reason);
    await assert.rejects(module.listUpiApps());
    await assert.rejects(module.launchUpiPayment(intent, "com.phonepe.app"));
  }
});

test("the JS Promise forwards the native activity result and only allows one payment at a time", async () => {
  let complete;
  const launches = [];
  const apps = [{ packageName: "com.phonepe.app", name: "PhonePe" }];
  const native = {
    listApps: async () => apps,
    launchPayment: (uri, packageName) => {
      launches.push({ uri, packageName });
      return new Promise((resolve) => {
        complete = resolve;
      });
    },
  };
  const module = bridge({ native });
  assert.equal(module.getUpiAvailability().available, true);
  assert.equal(await module.listUpiApps(), apps);
  const pending = module.launchUpiPayment(intent, apps[0].packageName);
  await assert.rejects(
    module.launchUpiPayment(intent, apps[0].packageName),
    /already open/,
  );
  assert.equal(launches.length, 1);
  assert.equal(launches[0].uri, intent);
  const cancelled = {
    outcome: "CANCELLED",
    appPackage: apps[0].packageName,
    resultCode: 0,
  };
  complete(cancelled);
  assert.equal(await pending, cancelled);
  const next = module.launchUpiPayment(intent, apps[0].packageName);
  const reported = {
    outcome: "SUCCESS",
    appPackage: apps[0].packageName,
    resultCode: -1,
    txnId: "TXN42",
  };
  complete(reported);
  assert.equal(await next, reported);
});

test("launch failures release the flight guard while missing amount/reference never launch", async () => {
  let count = 0;
  const module = bridge({
    native: {
      launchPayment: async () => {
        count++;
        throw new Error("app removed");
      },
    },
  });
  await assert.rejects(
    module.launchUpiPayment(scanned, "com.phonepe.app"),
    /attempt/,
  );
  await assert.rejects(
    module.launchUpiPayment(intent, "intent://evil"),
    /installed/,
  );
  assert.equal(count, 0);
  await assert.rejects(
    module.launchUpiPayment(intent, "com.phonepe.app"),
    /app removed/,
  );
  await assert.rejects(
    module.launchUpiPayment(intent, "com.phonepe.app"),
    /app removed/,
  );
  assert.equal(count, 2);
});
