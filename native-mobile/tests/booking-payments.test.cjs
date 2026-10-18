const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

const attemptA = "11111111-1111-4111-8111-111111111111";
const attemptB = "22222222-2222-4222-8222-222222222222";
const cancelled = {
  outcome: "CANCELLED",
  appPackage: "com.phonepe.app",
  resultCode: 0,
};
const reported = {
  outcome: "SUCCESS",
  appPackage: "com.phonepe.app",
  resultCode: -1,
  txnId: "TXN42",
  approvalRefNo: "BANK42",
  rawResponse: "Status=SUCCESS&txnId=TXN42",
};

function load(dependencies) {
  const source = fs.readFileSync(
    path.resolve(__dirname, "../src/lib/booking-payments.ts"),
    "utf8",
  );
  const js = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const exports = {};
  vm.runInNewContext(js, { exports, require: (name) => dependencies[name] });
  return exports;
}

function setup(existing = new Map()) {
  let session = { token: "member-seven", member: { MemberId: 7 } };
  const calls = [];
  const state = { fail: false };
  const storage = {
    getAllKeys: async () => [...existing.keys()],
    getItem: async (key) => existing.get(key) ?? null,
    setItem: async (key, value) => {
      existing.set(key, value);
    },
    removeItem: async (key) => {
      existing.delete(key);
    },
  };
  const transport = {
    api: async (url, options) => {
      calls.push({ url, options });
      if (state.fail) throw new Error("offline");
      return { id: attemptA, bookingId: 42 };
    },
  };
  const sessionApi = {
    getSession: () => session,
    getAccessToken: () => session?.token ?? null,
  };
  const dependencies = {
    "@react-native-async-storage/async-storage": {
      __esModule: true,
      default: storage,
    },
    "./api": transport,
    "./session": sessionApi,
  };
  return {
    module: load(dependencies),
    restart: () => load(dependencies),
    existing,
    calls,
    storage,
    transport,
    state,
    login: (customerId, token = `member-${customerId}`) => {
      session =
        customerId == null ? null : { token, member: { MemberId: customerId } };
    },
  };
}

test("payment API uses booking-owned routes and displays server validation errors", async () => {
  const { module, calls } = setup();
  const abort = new AbortController();
  await module.getBookingPayments(42, abort.signal);
  const input = {
    upiUri: "upi://pay?pa=hospital@upi",
    clientRequestId: attemptA,
    amount: 750,
  };
  await module.prepareBookingPayment(42, input);
  await module.reportBookingPayment(42, attemptA, reported);
  assert.equal(calls[0].url, "api/BookingConsultation/42/payments");
  assert.equal(calls[0].options.signal, abort.signal);
  assert.deepEqual(JSON.parse(JSON.stringify(calls[1].options.body)), input);
  assert.equal(
    calls[2].url,
    `api/BookingConsultation/42/payments/${attemptA}/result`,
  );
  assert.ok(calls.every((call) => call.options.serverErrors === true));
  assert.throws(() => module.getBookingPayments(-1), /valid booking/);
});

test("native callback conversion caps DTO fields and never fabricates success or verification", () => {
  const { module } = setup();
  const report = module.toReport({
    ...reported,
    responseCode: "X".repeat(300),
    txnId: "Y".repeat(300),
    approvalRefNo: "Z".repeat(300),
    rawResponse: "R".repeat(5000),
    resultCode: null,
    reason: "NO_ACTIVITY_RESULT",
    verificationStatus: "VERIFIED",
  });
  assert.equal(report.outcome, "SUCCESS");
  assert.equal(report.responseCode.length, 100);
  assert.equal(report.txnId.length, 200);
  assert.equal(report.approvalRefNo.length, 200);
  assert.equal(report.rawResponse.length, 4096);
  assert.equal(Object.hasOwn(report, "resultCode"), false);
  assert.equal(Object.hasOwn(report, "verificationStatus"), false);
  assert.equal(Object.hasOwn(report, "reason"), false);
  assert.equal(module.toReport({ ...reported, resultCode: 0 }).resultCode, 0);
  assert.equal(
    Object.hasOwn(
      module.toReport({ ...reported, resultCode: NaN }),
      "resultCode",
    ),
    false,
  );
  assert.throws(
    () => module.toReport({ ...reported, outcome: "PAID" }),
    /invalid response/,
  );
  assert.throws(
    () => module.toReport({ ...reported, appPackage: "intent://evil" }),
    /invalid response/,
  );
  const unknown = module.toReport({
    ...reported,
    outcome: "UNKNOWN",
    resultCode: null,
  });
  assert.equal(unknown.outcome, "UNKNOWN");
});

test("an offline callback survives module restart and is removed only after successful report", async () => {
  const harness = setup();
  await harness.module.rememberPaymentResult(7, 42, attemptA, reported);
  assert.equal(harness.existing.size, 1);
  harness.state.fail = true;
  await assert.rejects(harness.module.syncPaymentResults(7, 42), /offline/);
  assert.equal(harness.existing.size, 1);
  const restarted = harness.restart();
  harness.state.fail = false;
  await restarted.syncPaymentResults(7, 42);
  assert.equal(harness.existing.size, 0);
  assert.equal(harness.calls.length, 2);
  assert.equal(
    JSON.stringify(harness.calls[0].options.body),
    JSON.stringify(harness.calls[1].options.body),
  );
});

test("outbox replay is scoped to the active customer and requested booking", async () => {
  const harness = setup();
  await Promise.all([
    harness.module.rememberPaymentResult(7, 42, attemptA, reported),
    harness.module.rememberPaymentResult(7, 43, attemptA, cancelled),
    harness.module.rememberPaymentResult(8, 42, attemptA, cancelled),
  ]);
  assert.equal(harness.existing.size, 3);
  await harness.module.syncPaymentResults(8, 42);
  assert.equal(harness.calls.length, 0);
  await harness.module.syncPaymentResults(7, 42);
  assert.equal(harness.calls.length, 1);
  assert.equal(harness.existing.size, 2);
  harness.login(null);
  await harness.module.syncPaymentResults(7, 43);
  assert.equal(harness.calls.length, 1);
  harness.login(8);
  await harness.module.syncPaymentResults(8, 42);
  assert.equal(harness.calls.length, 2);
  assert.equal(harness.existing.size, 1);
});

test("an account switch while reading persisted evidence prevents replay under the new login", async () => {
  const harness = setup();
  await harness.module.rememberPaymentResult(7, 42, attemptA, reported);
  const original = harness.storage.getItem;
  harness.storage.getItem = async (key) => {
    const saved = await original(key);
    harness.login(8);
    return saved;
  };
  await harness.module.syncPaymentResults(7, 42);
  assert.equal(harness.calls.length, 0);
  assert.equal(harness.existing.size, 1);
});

test("concurrent attempts and duplicate syncs do not drop records or report an attempt twice", async () => {
  const harness = setup();
  await Promise.all([
    harness.module.rememberPaymentResult(7, 42, attemptA, reported),
    harness.module.rememberPaymentResult(7, 42, attemptB, cancelled),
  ]);
  assert.equal(harness.existing.size, 2);
  await Promise.all([
    harness.module.syncPaymentResults(7, 42),
    harness.module.syncPaymentResults(7, 42),
  ]);
  assert.equal(harness.calls.length, 2);
  assert.equal(harness.existing.size, 0);
});

test("a callback saved while the same attempt is being reported remains for a later sync", async () => {
  const harness = setup();
  let release;
  let started;
  const reporting = new Promise((resolve) => {
    started = resolve;
  });
  harness.transport.api = async (...args) => {
    harness.calls.push(args);
    started();
    await new Promise((resolve) => {
      release = resolve;
    });
    return { id: attemptA };
  };
  await harness.module.rememberPaymentResult(7, 42, attemptA, reported);
  const sync = harness.module.syncPaymentResults(7, 42);
  await reporting;
  const remembering = harness.module.rememberPaymentResult(
    7,
    42,
    attemptA,
    reported,
  );
  release();
  await Promise.all([sync, remembering]);
  assert.equal(harness.existing.size, 1);
  harness.transport.api = async () => ({ id: attemptA });
  await harness.module.syncPaymentResults(7, 42);
  assert.equal(harness.existing.size, 0);
});

test("tampered customer or booking metadata is retained without being sent", async () => {
  const harness = setup();
  await harness.module.rememberPaymentResult(7, 42, attemptA, reported);
  const [key, raw] = [...harness.existing][0];
  const saved = JSON.parse(raw);
  saved.customerId = 8;
  harness.existing.set(key, JSON.stringify(saved));
  await assert.rejects(
    harness.module.syncPaymentResults(7, 42),
    /could not be restored/,
  );
  assert.equal(harness.calls.length, 0);
  assert.equal(harness.existing.size, 1);
});

test("an account switch during a report retains evidence for its owner's idempotent retry", async () => {
  const harness = setup();
  await harness.module.rememberPaymentResult(7, 42, attemptA, reported);
  const original = harness.transport.api;
  harness.transport.api = async (...args) => {
    const response = await original(...args);
    harness.login(8);
    return response;
  };
  await harness.module.syncPaymentResults(7, 42);
  assert.equal(harness.existing.size, 1);
  assert.equal(harness.calls.length, 1);
  harness.login(7);
  harness.transport.api = original;
  await harness.module.syncPaymentResults(7, 42);
  assert.equal(harness.existing.size, 0);
  assert.equal(harness.calls.length, 2);
});

test("one failed report does not discard evidence or block another saved attempt", async () => {
  const harness = setup();
  await harness.module.rememberPaymentResult(7, 42, attemptA, reported);
  await harness.module.rememberPaymentResult(7, 42, attemptB, cancelled);
  const original = harness.transport.api;
  harness.transport.api = async (...args) => {
    if (args[0].includes(attemptA)) throw new Error("first report offline");
    return original(...args);
  };
  await assert.rejects(harness.module.syncPaymentResults(7, 42), /offline/);
  assert.equal(harness.existing.size, 1);
  assert.ok([...harness.existing.keys()][0].endsWith(attemptA));
  assert.equal(harness.calls.length, 1);
  assert.ok(harness.calls[0].url.includes(attemptB));
});
