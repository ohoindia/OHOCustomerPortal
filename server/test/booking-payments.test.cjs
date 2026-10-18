require("reflect-metadata");
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const { validate } = require("class-validator");
const {
  BookingPaymentsService,
  parseHospitalUpiUri,
} = require("../dist/consultations/booking-payments.service");
const {
  PrepareBookingPaymentDto,
  ReportBookingPaymentDto,
} = require("../dist/consultations/booking-payment.dto");

function database() {
  let queue = Promise.resolve();
  const db = {
    calls: [],
    attempts: [],
    owner: true,
    booking: {
      BookingConsultationId: 91,
      HospitalId: 4,
      HospitalName: "OHO Hospital",
      Name: "Family patient",
      IsActive: true,
      StatusName: "Initiated",
    },
    setting: {
      UpiId: "hospital@bank",
      PayeeName: "Approved Hospital",
      MerchantCode: "8011",
      IsEnabled: true,
      MaxPaymentAmount: "100000.00",
    },
    transaction: async (work, lock) => {
      assert.equal(lock, "oho-booking-payment:91");
      const pending = queue.then(() => work({ locked: true }));
      queue = pending.catch(() => {});
      return pending;
    },
    rows: async (sql, values = [], connection) => {
      db.calls.push({ sql, values, connection });
      if (sql.includes("FROM BookingConsultation bc")) {
        assert.deepEqual(values, [91, 12, 12]);
        assert.match(
          sql,
          /family.CustomerId = bc.CustomerId AND family.RelatedCustomerId = \?/,
        );
        if (connection) assert.match(sql, /FOR UPDATE$/);
        return db.owner ? [db.booking] : [];
      }
      if (sql.includes("FROM HospitalBookingPaymentSettings"))
        return db.setting ? [db.setting] : [];
      if (sql.includes("SELECT Id, Status"))
        return db.attempts
          .filter(
            (row) =>
              row.VerificationStatus === "VERIFIED" ||
              (row.VerificationStatus === "UNVERIFIED" &&
                ["CREATED", "SUCCESS", "UNKNOWN"].includes(row.Status)),
          )
          .slice(0, 1);
      if (sql.includes("AND ClientRequestId = ?"))
        return db.attempts.filter(
          (row) =>
            row.BookingConsultationId === values[0] &&
            row.ClientRequestId === values[1],
        );
      if (sql.includes("AND Id = ?"))
        return db.attempts.filter(
          (row) =>
            row.BookingConsultationId === values[0] && row.Id === values[1],
        );
      if (sql.includes("FROM HospitalBookingPaymentAttempt"))
        return db.attempts;
      throw Error(`Unexpected query: ${sql}`);
    },
    execute: async (sql, values = [], connection) => {
      db.calls.push({ sql, values, connection });
      assert.ok(connection?.locked);
      if (sql.startsWith("INSERT INTO HospitalBookingPaymentAttempt")) {
        const [
          Id,
          BookingConsultationId,
          CustomerId,
          ClientRequestId,
          RequestHash,
          TransactionRef,
          Amount,
          PayeeVpa,
          PayeeName,
          UpiUri,
          AppPackage,
        ] = values;
        db.attempts.push({
          Id,
          BookingConsultationId,
          CustomerId,
          ClientRequestId,
          RequestHash,
          TransactionRef,
          Amount,
          PayeeVpa,
          PayeeName,
          UpiUri,
          AppPackage,
          Status: "CREATED",
          VerificationStatus: "UNVERIFIED",
          CreatedAt: "2026-10-18T01:00:00.000Z",
          UpdatedAt: "2026-10-18T01:00:00.000Z",
          ExpiresAt: new Date(Date.now() + 900000).toISOString(),
        });
      } else if (sql.includes("SET Status = 'EXPIRED'")) {
        for (const row of db.attempts)
          if (
            row.Status === "CREATED" &&
            row.VerificationStatus === "UNVERIFIED" &&
            Date.parse(row.ExpiresAt) <= Date.now()
          )
            row.Status = "EXPIRED";
      } else if (
        sql.startsWith("UPDATE HospitalBookingPaymentAttempt SET Status = ?")
      ) {
        const [
          Status,
          AppPackage,
          ResponseCode,
          ResultCode,
          TxnId,
          ApprovalRefNo,
          RawResponse,
          ResultHash,
          id,
          bookingId,
        ] = values;
        const row = db.attempts.find(
          (row) => row.Id === id && row.BookingConsultationId === bookingId,
        );
        Object.assign(row, {
          Status,
          AppPackage,
          ResponseCode,
          ResultCode,
          TxnId,
          ApprovalRefNo,
          RawResponse,
          ResultHash,
          ReportedAt: "2026-10-18T01:01:00.000Z",
          UpdatedAt: "2026-10-18T01:01:00.000Z",
        });
      } else throw Error(`Unexpected write: ${sql}`);
      return { affectedRows: 1 };
    },
  };
  return db;
}

function request(overrides = {}) {
  return {
    clientRequestId: randomUUID(),
    upiUri:
      "upi://pay?pa=hospital%40bank&pn=Untrusted%20name&am=100.50&cu=INR&tr=scan-reference&url=https%3A%2F%2Fevil.example",
    appPackage: "com.phonepe.app",
    ...overrides,
  };
}

test("QR parsing rejects ambiguous, signed, malformed, non-UPI and non-INR payloads", () => {
  assert.deepEqual(
    parseHospitalUpiUri("upi://pay?pa=Hospital%40bank&cu=INR&am=12.50"),
    { payeeVpa: "hospital@bank", payeeName: "hospital@bank", amount: 12.5 },
  );
  assert.deepEqual(
    parseHospitalUpiUri("upi://pay?PA=Hospital%40bank&CU=inr&AM=00012.50"),
    { payeeVpa: "hospital@bank", payeeName: "hospital@bank", amount: 12.5 },
  );
  for (const raw of [
    "https://example.test",
    "intent://pay?pa=hospital@bank",
    "upi://pay/other?pa=hospital@bank",
    "upi://pay?pa=hospital@bank#x",
    "upi://user@pay?pa=hospital@bank",
    "upi://pay:123?pa=hospital@bank",
    "upi://pay?pa=hospital@bank&pa=other@bank",
    "upi://pay?pa=hospital@bank&PA=other@bank",
    "upi://pay?pa=hospital@bank&cu=USD",
    "upi://pay?pa=hospital@bank&am=0",
    "upi://pay?pa=hospital@bank&am=1.001",
    "upi://pay?pa=hospital@bank&am=1e2",
    "upi://pay?pa=hospital@bank&pn=%ZZ",
    "upi://pay?pa=hospital@bank&sign=abc",
    "upi://pay?pa=hospital@bank&signature=abc",
    "upi://pay?pa=no-account",
  ])
    assert.throws(() => parseHospitalUpiUri(raw), undefined, raw);
});

test("history enforces family ownership before exposing the approved payee or attempts", async () => {
  const db = database();
  const service = new BookingPaymentsService(db);
  const history = await service.list(91, 12);
  assert.equal(history.paymentEnabled, true);
  assert.deepEqual(history.booking, {
    id: 91,
    hospitalId: 4,
    hospitalName: "OHO Hospital",
    patientName: "Family patient",
  });
  assert.deepEqual(history.approvedPayee, {
    upiId: "hospital@bank",
    payeeName: "Approved Hospital",
  });
  db.owner = false;
  db.calls = [];
  await assert.rejects(service.list(91, 12), /does not belong/);
  assert.equal(db.calls.length, 1);
});

test("preparing rewrites scanned payee metadata and reference using approved settings", async () => {
  const db = database();
  const result = await new BookingPaymentsService(db).prepare(
    91,
    12,
    request(),
  );
  assert.equal(result.amount, 100.5);
  assert.equal(result.status, "CREATED");
  assert.equal(result.verificationStatus, "UNVERIFIED");
  assert.equal(result.appPackage, "com.phonepe.app");
  assert.equal(result.payeeName, "Approved Hospital");
  assert.match(result.transactionRef, /^OHO[A-F0-9]{32}$/);
  const uri = new URL(result.upiUri);
  assert.equal(uri.searchParams.get("pa"), "hospital@bank");
  assert.equal(uri.searchParams.get("pn"), "Approved Hospital");
  assert.equal(uri.searchParams.get("tr"), result.transactionRef);
  assert.equal(uri.searchParams.get("am"), "100.50");
  assert.equal(uri.searchParams.get("mc"), "8011");
  assert.equal(uri.searchParams.has("url"), false);
});

test("server rejects a different payee, altered QR amount, invalid amount or disabled hospital", async () => {
  for (const overrides of [
    { upiUri: "upi://pay?pa=attacker@bank&am=100.50" },
    { amount: 101 },
    { upiUri: "upi://pay?pa=hospital@bank", amount: 100000.01 },
    { upiUri: "upi://pay?pa=hospital@bank" },
  ]) {
    const db = database();
    await assert.rejects(
      new BookingPaymentsService(db).prepare(91, 12, request(overrides)),
    );
    assert.equal(db.attempts.length, 0);
  }
  for (const settings of [
    { IsEnabled: false },
    {
      IsEnabled: true,
      UpiId: "hospital@bank",
      PayeeName: "Hospital",
      MaxPaymentAmount: 10,
    },
  ]) {
    const db = database();
    db.setting = settings;
    const service = new BookingPaymentsService(db);
    await assert.rejects(service.prepare(91, 12, request()));
    assert.equal(db.attempts.length, 0);
  }
});

test("every active hospital can use its scanned UPI recipient without preconfigured payee settings", async () => {
  const db = database();
  db.setting = null;
  const service = new BookingPaymentsService(db);
  const history = await service.list(91, 12);
  assert.equal(history.paymentEnabled, true);
  assert.equal(history.disabledReason, null);
  assert.equal(history.approvedPayee, null);
  const prepared = await service.prepare(
    91,
    12,
    request({
      upiUri:
        "upi://pay?pa=anyhospital%40bank&pn=Scanned%20Hospital&mc=8011&am=250.25&url=https%3A%2F%2Fignored.example",
    }),
  );
  assert.equal(prepared.payeeVpa, "anyhospital@bank");
  assert.equal(prepared.payeeName, "Scanned Hospital");
  assert.equal(prepared.amount, 250.25);
  assert.equal(prepared.verificationStatus, "UNVERIFIED");
  const uri = new URL(prepared.upiUri);
  assert.equal(uri.searchParams.get("pa"), "anyhospital@bank");
  assert.equal(uri.searchParams.get("pn"), "Scanned Hospital");
  assert.equal(uri.searchParams.get("mc"), "8011");
  assert.equal(uri.searchParams.get("url"), null);
  assert.equal(uri.searchParams.get("tr"), prepared.transactionRef);
});

test("unconfigured hospital QR name falls back to VPA and explicit operator disable remains effective", async () => {
  const db = database();
  db.setting = null;
  const prepared = await new BookingPaymentsService(db).prepare(
    91,
    12,
    request({ upiUri: "upi://pay?pa=anotherhospital%40bank", amount: 100000 }),
  );
  assert.equal(prepared.payeeName, "anotherhospital@bank");
  assert.equal(prepared.amount, 100000);
  const disabledDb = database();
  disabledDb.setting = { IsEnabled: false };
  const service = new BookingPaymentsService(disabledDb);
  const history = await service.list(91, 12);
  assert.equal(history.paymentEnabled, false);
  assert.match(history.disabledReason, /has disabled/);
  assert.equal(history.approvedPayee, null);
  await assert.rejects(service.prepare(91, 12, request()), /has disabled/);
  assert.equal(disabledDb.attempts.length, 0);
});

test("scanned recipient names and merchant codes are validated before creating unconfigured-hospital attempts", async () => {
  const parsed = parseHospitalUpiUri(
    `upi://pay?pa=scan%40bank&pn=${"H".repeat(128)}&mc=8011`,
  );
  assert.equal(parsed.payeeName.length, 128);
  assert.equal(parsed.merchantCode, "8011");
  for (const suffix of [
    `pn=${"H".repeat(129)}`,
    "pn=Hospital%00",
    "pn=Hospital%C2%85",
    "mc=abcd",
    "mc=12345",
  ]) {
    const db = database();
    db.setting = null;
    await assert.rejects(
      new BookingPaymentsService(db).prepare(
        91,
        12,
        request({ upiUri: `upi://pay?pa=scan%40bank&am=25&${suffix}` }),
      ),
    );
    assert.equal(db.attempts.length, 0);
  }
});

test("idempotent concurrent retries create one attempt and reject a reused key with changed details", async () => {
  const db = database();
  const service = new BookingPaymentsService(db);
  const dto = request();
  const [first, retried] = await Promise.all([
    service.prepare(91, 12, dto),
    service.prepare(91, 12, dto),
  ]);
  assert.equal(first.id, retried.id);
  assert.equal(db.attempts.length, 1);
  await assert.rejects(
    service.prepare(91, 12, {
      ...dto,
      upiUri: "upi://pay?pa=hospital@bank&am=101",
    }),
    /different details/,
  );
});

test("concurrent distinct requests cannot create overlapping payment attempts", async () => {
  const db = database();
  const service = new BookingPaymentsService(db);
  const results = await Promise.allSettled([
    service.prepare(91, 12, request()),
    service.prepare(91, 12, request()),
  ]);
  assert.equal(
    results.filter((result) => result.status === "fulfilled").length,
    1,
  );
  assert.equal(
    results.filter((result) => result.status === "rejected").length,
    1,
  );
  assert.equal(db.attempts.length, 1);
});

test("success and unknown callbacks stay unverified and block another payment", async () => {
  for (const outcome of ["SUCCESS", "UNKNOWN"]) {
    const db = database();
    const service = new BookingPaymentsService(db);
    const prepared = await service.prepare(91, 12, request());
    const result = await service.report(91, 12, prepared.id, {
      appPackage: "com.phonepe.app",
      outcome,
      responseCode: "00",
      resultCode: -1,
      txnId: "BANK123",
      rawResponse: "Status=SUCCESS&txnId=BANK123",
    });
    assert.equal(result.status, outcome);
    assert.equal(result.verificationStatus, "UNVERIFIED");
    assert.equal(result.txnId, "BANK123");
    assert.ok(result.reportedAt);
    await assert.rejects(
      service.prepare(91, 12, request()),
      /needs hospital confirmation/,
    );
    const resultWrite = db.calls.find((call) =>
      call.sql.startsWith(
        "UPDATE HospitalBookingPaymentAttempt SET Status = ?",
      ),
    );
    assert.doesNotMatch(
      resultWrite.sql,
      /SET[^]*VerificationStatus|UPDATE BookingConsultation|IsCouponClaimed|PaidAmount|Wallet/,
    );
    assert.equal(
      (await service.list(91, 12)).attempts[0].rawResponse,
      undefined,
    );
  }
});

test("cancelled and failed outcomes allow a new tracked attempt", async () => {
  for (const outcome of ["CANCELLED", "FAILURE"]) {
    const db = database();
    const service = new BookingPaymentsService(db);
    const prepared = await service.prepare(91, 12, request());
    await service.report(91, 12, prepared.id, {
      appPackage: "com.phonepe.app",
      outcome,
    });
    const next = await service.prepare(91, 12, request());
    assert.notEqual(prepared.id, next.id);
    assert.equal(db.attempts.length, 2);
  }
});

test("result retries are idempotent while conflicting callbacks and substituted apps are rejected", async () => {
  const db = database();
  const service = new BookingPaymentsService(db);
  const prepared = await service.prepare(91, 12, request());
  const response = {
    appPackage: "com.phonepe.app",
    outcome: "CANCELLED",
    resultCode: 0,
  };
  await assert.rejects(
    service.report(91, 12, prepared.id, {
      ...response,
      appPackage: "other.payment.app",
    }),
    /does not match/,
  );
  const first = await service.report(91, 12, prepared.id, response);
  assert.deepEqual(await service.report(91, 12, prepared.id, response), first);
  await assert.rejects(
    service.report(91, 12, prepared.id, { ...response, outcome: "SUCCESS" }),
    /different response/,
  );
  assert.equal(
    db.calls.filter((call) =>
      call.sql.startsWith(
        "UPDATE HospitalBookingPaymentAttempt SET Status = ?",
      ),
    ).length,
    1,
  );
});

test("expired CREATED attempts release the retry guard and retain history", async () => {
  const db = database();
  const service = new BookingPaymentsService(db);
  const prepared = await service.prepare(91, 12, request());
  db.attempts[0].ExpiresAt = "2020-01-01T00:00:00.000Z";
  const next = await service.prepare(91, 12, request());
  assert.notEqual(next.id, prepared.id);
  assert.equal(db.attempts[0].Status, "EXPIRED");
  assert.equal(db.attempts.length, 2);
});

test("cancelled/inactive bookings cannot prepare payments and result/history require ownership", async () => {
  for (const state of [
    { IsActive: false },
    { StatusName: "Cancelled" },
    { StatusName: "Rejected" },
  ]) {
    const db = database();
    Object.assign(db.booking, state);
    const service = new BookingPaymentsService(db);
    assert.equal((await service.list(91, 12)).paymentEnabled, false);
    await assert.rejects(service.prepare(91, 12, request()));
    assert.equal(db.attempts.length, 0);
  }
  const db = database();
  const service = new BookingPaymentsService(db);
  const prepared = await service.prepare(91, 12, request());
  db.owner = false;
  await assert.rejects(
    service.report(91, 12, prepared.id, {
      appPackage: "com.phonepe.app",
      outcome: "SUCCESS",
    }),
    /does not belong/,
  );
  assert.equal(db.attempts[0].Status, "CREATED");
});

test("DTO validation bounds external responses and monetary input", async () => {
  const valid = Object.assign(new PrepareBookingPaymentDto(), request());
  assert.equal((await validate(valid)).length, 0);
  for (const changes of [
    { amount: 0 },
    { amount: 1.001 },
    { clientRequestId: "not-a-uuid" },
    { appPackage: "intent://bad" },
  ])
    assert.ok(
      (
        await validate(
          Object.assign(new PrepareBookingPaymentDto(), request(changes)),
        )
      ).length,
    );
  assert.equal(
    (
      await validate(
        Object.assign(new ReportBookingPaymentDto(), {
          appPackage: "com.phonepe.app",
          outcome: "UNKNOWN",
          rawResponse: "",
        }),
      )
    ).length,
    0,
  );
  for (const changes of [
    { outcome: "PAID" },
    { rawResponse: "x".repeat(4097) },
    { resultCode: 0.5 },
  ])
    assert.ok(
      (
        await validate(
          Object.assign(new ReportBookingPaymentDto(), {
            appPackage: "com.phonepe.app",
            outcome: "SUCCESS",
            ...changes,
          }),
        )
      ).length,
    );
});

test("approved payee names match Android's 128-character limit before creating an attempt", async () => {
  const boundaryDb = database();
  boundaryDb.setting.PayeeName = "H".repeat(128);
  const prepared = await new BookingPaymentsService(boundaryDb).prepare(
    91,
    12,
    request(),
  );
  assert.equal(new URL(prepared.upiUri).searchParams.get("pn").length, 128);
  for (const name of [
    "H".repeat(129),
    "Hospital\u0000",
    "Hospital\u0085",
    "  ",
  ]) {
    const db = database();
    db.setting.PayeeName = name;
    const service = new BookingPaymentsService(db);
    assert.equal((await service.list(91, 12)).paymentEnabled, false);
    await assert.rejects(service.prepare(91, 12, request()), /has not enabled/);
    assert.equal(db.attempts.length, 0);
  }
});

test("reading history persists CREATED expiry without expiring unresolved app reports", async () => {
  const db = database();
  const service = new BookingPaymentsService(db);
  const prepared = await service.prepare(91, 12, request());
  db.attempts[0].ExpiresAt = "2020-01-01T00:00:00.000Z";
  for (const Status of ["SUCCESS", "UNKNOWN"])
    db.attempts.push({ ...db.attempts[0], Id: randomUUID(), Status });
  const history = await service.list(91, 12);
  assert.deepEqual(
    history.attempts.map((row) => row.status),
    ["EXPIRED", "SUCCESS", "UNKNOWN"],
  );
  assert.equal(
    db.attempts.find((row) => row.Id === prepared.id).Status,
    "EXPIRED",
  );
});

test("idempotent preparation retries cannot return expired intents as CREATED", async () => {
  const db = database();
  const service = new BookingPaymentsService(db);
  const dto = request();
  const prepared = await service.prepare(91, 12, dto);
  db.attempts[0].ExpiresAt = "2020-01-01T00:00:00.000Z";
  const retried = await service.prepare(91, 12, dto);
  assert.equal(retried.id, prepared.id);
  assert.equal(retried.status, "EXPIRED");
  assert.equal(db.attempts.length, 1);
});

test("missing payment migration returns clean 503 for settings, history, prepare and report SQL", async () => {
  const cases = [
    {
      method: "list",
      operation: "rows",
      match: (sql) => sql.includes("FROM HospitalBookingPaymentSettings"),
    },
    {
      method: "list",
      operation: "rows",
      match: (sql) => sql.includes("ORDER BY CreatedAt DESC"),
    },
    {
      method: "list",
      operation: "execute",
      match: (sql) => sql.includes("SET Status = 'EXPIRED'"),
    },
    {
      method: "prepare",
      operation: "rows",
      match: (sql) => sql.includes("FROM HospitalBookingPaymentSettings"),
    },
    {
      method: "prepare",
      operation: "rows",
      match: (sql) => sql.includes("ClientRequestId = ?"),
    },
    {
      method: "prepare",
      operation: "execute",
      match: (sql) =>
        sql.startsWith("INSERT INTO HospitalBookingPaymentAttempt"),
    },
    {
      method: "report",
      operation: "rows",
      match: (sql) => sql.includes("AND Id = ?"),
    },
    {
      method: "report",
      operation: "execute",
      match: (sql) =>
        sql.startsWith("UPDATE HospitalBookingPaymentAttempt SET Status = ?"),
    },
  ];
  for (const [index, scenario] of cases.entries()) {
    const db = database();
    const service = new BookingPaymentsService(db);
    const prepared = await service.prepare(91, 12, request());
    if (scenario.method === "prepare")
      await service.report(91, 12, prepared.id, {
        appPackage: "com.phonepe.app",
        outcome: "CANCELLED",
      });
    const original = db[scenario.operation];
    db[scenario.operation] = async (sql, ...args) => {
      if (scenario.match(sql))
        throw Object.assign(
          new Error("Table 'private_database.payment_table' doesn't exist"),
          index % 2 ? { errno: 1146 } : { code: "ER_NO_SUCH_TABLE" },
        );
      return original(sql, ...args);
    };
    const action =
      scenario.method === "list"
        ? service.list(91, 12)
        : scenario.method === "prepare"
          ? service.prepare(91, 12, request())
          : service.report(91, 12, prepared.id, {
              appPackage: "com.phonepe.app",
              outcome: "SUCCESS",
            });
    await assert.rejects(action, (error) => {
      assert.equal(error.getStatus(), 503);
      assert.equal(
        error.message,
        "Hospital payments are not available yet. Please try again later.",
      );
      assert.doesNotMatch(error.message, /private_database|payment_table|SQL/);
      return true;
    });
  }
});

test("payment schema handling preserves ownership and unrelated database errors", async () => {
  const foreignDb = database();
  foreignDb.owner = false;
  await assert.rejects(
    new BookingPaymentsService(foreignDb).list(91, 12),
    (error) => error.getStatus() === 403,
  );
  for (const scenario of [
    {
      code: "ER_NO_SUCH_TABLE",
      match: (sql) => sql.includes("FROM BookingConsultation bc"),
    },
    {
      code: "ER_PARSE_ERROR",
      match: (sql) => sql.includes("FROM HospitalBookingPaymentSettings"),
    },
    {
      code: "ECONNREFUSED",
      match: (sql) => sql.includes("FROM HospitalBookingPaymentSettings"),
    },
  ]) {
    const db = database();
    const original = db.rows;
    const failure = Object.assign(new Error("Unexpected database failure"), {
      code: scenario.code,
    });
    db.rows = async (sql, ...args) => {
      if (scenario.match(sql)) throw failure;
      return original(sql, ...args);
    };
    await assert.rejects(
      new BookingPaymentsService(db).list(91, 12),
      (error) => error === failure,
    );
  }
});
