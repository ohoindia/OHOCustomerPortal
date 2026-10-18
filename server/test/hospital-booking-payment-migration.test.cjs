const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  paymentTables,
  migrationStatements,
  parseArguments,
  migrateHospitalBookingPayments,
} = require("../scripts/migrate-hospital-booking-payments.cjs");

function database({
  target = "testdb",
  legacy = true,
  acquire = true,
  engine = "InnoDB",
} = {}) {
  const calls = [];
  return {
    calls,
    query: async (sql) => {
      calls.push(sql);
      if (sql === "SELECT DATABASE() AS databaseName")
        return [[{ databaseName: target }]];
      if (sql.startsWith("SELECT COUNT"))
        return [[{ configuredHospitals: 0, enabledHospitals: 0 }]];
      return [[]];
    },
    execute: async (sql) => {
      calls.push(sql);
      if (sql.includes("GET_LOCK")) return [[{ acquired: Number(acquire) }]];
      if (sql.includes("IN ('BookingConsultation'"))
        return [
          legacy
            ? [
                { name: "BookingConsultation" },
                { name: "Hospital" },
                { name: "Customer" },
              ]
            : [],
        ];
      if (sql.includes("ENGINE AS engine"))
        return [paymentTables.map((name) => ({ name, engine }))];
      return [[]];
    },
  };
}

test("migration defaults to dry-run and apply requires an exact explicit configured database", () => {
  assert.deepEqual(parseArguments([], "testdb"), {
    apply: false,
    database: "testdb",
  });
  assert.deepEqual(parseArguments(["--apply", "--database=testdb"], "testdb"), {
    apply: true,
    database: "testdb",
  });
  for (const [args, db] of [
    [["--apply"], "testdb"],
    [["--apply", "--database=other"], "testdb"],
    [["--unexpected"], "testdb"],
    [[], ""],
    [["--apply", "--apply", "--database=testdb"], "testdb"],
  ])
    assert.throws(() => parseArguments(args, db));
});

test("dry-run checks the target and legacy tables without mutations", async () => {
  const db = database();
  assert.equal(
    (await migrateHospitalBookingPayments(db, { database: "testdb" })).applied,
    false,
  );
  assert.equal(
    db.calls.some((sql) =>
      /CREATE|ALTER|UPDATE|INSERT|DELETE|DROP|GET_LOCK/.test(sql),
    ),
    false,
  );
});

test("migration only creates additive idempotent payment tables with deduplication indexes", async () => {
  const statements = await migrationStatements();
  assert.equal(statements.length, 2);
  assert.match(statements[0], /IsEnabled BOOLEAN NOT NULL DEFAULT FALSE/);
  assert.match(
    statements[1],
    /UNIQUE KEY uq_hospital_booking_payment_request \(BookingConsultationId, ClientRequestId\)/,
  );
  assert.match(
    statements[1],
    /UNIQUE KEY uq_hospital_booking_payment_reference \(TransactionRef\)/,
  );
  assert.match(
    statements[1],
    /VerificationStatus ENUM\('UNVERIFIED','VERIFIED','REJECTED'\)/,
  );
  const db = database();
  await migrateHospitalBookingPayments(db, { database: "testdb", apply: true });
  assert.equal(
    db.calls.filter((sql) => sql.startsWith("CREATE TABLE IF NOT EXISTS"))
      .length,
    2,
  );
  assert.equal(
    db.calls.some((sql) =>
      /DROP|ALTER|DELETE|INSERT|UPDATE/.test(sql.replace(/ON UPDATE/g, "")),
    ),
    false,
  );
  assert.ok(
    db.calls.findIndex((sql) => sql.includes("GET_LOCK")) <
      db.calls.findIndex((sql) => sql.startsWith("CREATE")),
  );
  assert.ok(db.calls.at(-1).includes("RELEASE_LOCK"));
});

test("incorrect target, missing legacy tables and unavailable migration locks stop DDL", async () => {
  for (const options of [
    { target: "other" },
    { legacy: false },
    { acquire: false },
  ]) {
    const db = database(options);
    await assert.rejects(
      migrateHospitalBookingPayments(db, { database: "testdb", apply: true }),
    );
    assert.equal(
      db.calls.some((sql) => sql.startsWith("CREATE")),
      false,
    );
  }
});

test("post-apply verification rejects unexpected storage engine and releases migration lock", async () => {
  const db = database({ engine: "MyISAM" });
  await assert.rejects(
    migrateHospitalBookingPayments(db, { database: "testdb", apply: true }),
    /verification failed/,
  );
  assert.ok(db.calls.at(-1).includes("RELEASE_LOCK"));
});
