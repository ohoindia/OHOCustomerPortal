require("reflect-metadata");
const assert = require("node:assert/strict");
const { test } = require("node:test");
const {
  BookServiceService,
} = require("../dist/consultations/book-service.service");

function fixture(overrides = {}) {
  const state = {
    max: 24,
    familyUsed: 0,
    patientUsed: 0,
    extra: 0,
    card: {
      OHOCardnumber: "1234",
      IsActivated: true,
      StartDate: "2000-01-01",
      EndDate: "2999-01-01",
    },
    patient: { CustomerId: 12, Name: "Customer", RelatedCustomerId: 12 },
    service: { HospitalName: "Hospital", PoliciesType: "Free Consultation" },
    existing: [],
    statuses: [{ StatusId: 3 }],
    ...overrides,
  };
  const calls = [],
    writes = [];
  const connection = {};
  const db = {
    async rows(sql, values, conn) {
      calls.push({ sql, values, conn });
      if (sql.includes("FROM Customer"))
        return state.patient ? [state.patient] : [];
      if (sql.includes("FROM OHOCards")) return state.card ? [state.card] : [];
      if (sql.includes("AS MaxHospitalCoupons"))
        return [{ MaxHospitalCoupons: state.max }];
      if (sql.includes("AS UsedCoupons"))
        return [
          {
            UsedCoupons: sql.includes("bc.DependentCustomerId")
              ? state.patientUsed
              : state.familyUsed,
          },
        ];
      if (sql.includes("FROM RequestedCoupons"))
        return [{ AvailableCoupons: state.extra }];
      if (sql.includes("FROM HospitalPoliciesProvision"))
        return state.service ? [state.service] : [];
      if (sql.includes("s.Value = 'Initiated'")) return state.existing;
      if (sql.includes("FROM HospitalServices"))
        return state.invalidServiceType ? [] : [{ HospitalServicesId: 2 }];
      if (sql.includes("FROM Status")) return state.statuses;
      throw new Error(`Unexpected query: ${sql}`);
    },
    async execute(sql, values, conn) {
      writes.push({ sql, values, conn });
      return { insertId: 73, affectedRows: 1 };
    },
    async transaction(work, lockName) {
      calls.push({ lockName });
      return work(connection);
    },
  };
  return {
    service: new BookServiceService(db),
    calls,
    writes,
    state,
    connection,
  };
}
const dto = {
  customerId: 12,
  hospitalId: 5,
  hospitalPoliciesId: 7,
  appointmentDate: "2099-01-02T10:30:00+05:30",
  serviceTypeId: 2,
  reason: "Fever",
};

test("free OPD uses product coupon entitlements and the legacy 24-to-4 family limit", async () => {
  const f = fixture({ familyUsed: 3 });
  assert.equal((await f.service.coupons(dto)).availableCoupons, 1);
  f.state.familyUsed = 4;
  assert.equal((await f.service.coupons(dto)).availableCoupons, 0);
  assert.ok(
    f.calls.some(
      (call) =>
        call.sql?.includes("ComboProducts") &&
        call.values.every((value) => value === 12),
    ),
  );
});
test("patient coupons cannot go negative and hospital-specific extras are checked", async () => {
  const f = fixture({ patientUsed: 1 });
  assert.equal((await f.service.coupons(dto)).availableCoupons, 0);
  f.state.extra = 1;
  assert.equal((await f.service.coupons(dto)).availableCoupons, 1);
  f.state.patientUsed = 9;
  assert.equal((await f.service.coupons(dto)).availableCoupons, 0);
  assert.ok(
    f.calls.some(
      (call) =>
        call.sql?.includes("FROM RequestedCoupons") &&
        call.values[0] === 12 &&
        call.values[1] === 5,
    ),
  );
});
test("foreign family members are rejected before any coupon or booking SQL", async () => {
  const f = fixture({ patient: { CustomerId: 21, RelatedCustomerId: 99 } });
  await assert.rejects(
    f.service.book({ ...dto, dependentCustomerId: 21 }),
    /does not belong/,
  );
  assert.equal(f.writes.length, 0);
  assert.ok(!f.calls.some((call) => call.sql?.includes("MaxHospitalCoupons")));
});
test("missing, expired and future membership cards block the booking", async () => {
  for (const card of [
    null,
    { EndDate: "2000-01-01" },
    { EndDate: "invalid" },
    { StartDate: "2999-01-01", EndDate: "2999-12-31" },
  ]) {
    const f = fixture({ card });
    await assert.rejects(f.service.book(dto), /active, unexpired/);
    assert.equal(f.writes.length, 0);
  }
});
test("a booking is created from server-owned patient and hospital data with an activity record", async () => {
  const f = fixture();
  const result = await f.service.book(dto);
  assert.equal(result.status, true);
  assert.equal(result.data.BookingConsultationId, 73);
  assert.match(result.data.IdHashCode, /^[\da-f-]{36}$/);
  assert.equal(f.writes.length, 2);
  assert.equal(f.writes[0].values[2], "Customer");
  assert.equal(f.writes[0].values[10], "Hospital");
  assert.ok(f.writes[0].sql.includes("TRUE, FALSE"));
  assert.ok(f.writes.every((write) => write.conn === f.connection));
  assert.ok(f.calls.some((call) => call.lockName === "oho-book-service:12"));
  assert.ok(f.writes[1].sql.includes("BookingConsultationActivity"));
});
test("duplicate initiated bookings and exhausted coupons do not create another record", async () => {
  for (const overrides of [
    { existing: [{ BookingConsultationId: 71 }] },
    { familyUsed: 4 },
    { max: 0 },
  ]) {
    const f = fixture(overrides);
    assert.equal((await f.service.book(dto)).status, false);
    assert.equal(f.writes.length, 0);
  }
});

test("an owned family member can be booked and a card expiring today remains eligible", async () => {
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const f = fixture({
    patient: { CustomerId: 21, RelatedCustomerId: 12, Name: "Family member" },
    card: { OHOCardnumber: "1234", IsActivated: true, EndDate: today },
  });
  assert.equal(
    (await f.service.book({ ...dto, dependentCustomerId: 21 })).status,
    true,
  );
  assert.equal(f.writes[0].values[1], 21);
  assert.equal(f.writes[0].values[2], "Family member");
});
test("unsupported hospital benefits and missing Initiated status fail before writes", async () => {
  for (const overrides of [
    { service: null },
    { service: { PoliciesType: "Pharmacy Discount" } },
    { statuses: [] },
  ]) {
    const f = fixture(overrides);
    await assert.rejects(f.service.book(dto));
    assert.equal(f.writes.length, 0);
  }
});

test("appointment details are persisted and invalid appointments or service types cannot be booked", async () => {
  const f = fixture();
  await f.service.book(dto);
  assert.deepEqual(f.writes[0].values.slice(12, 15), [
    "2099-01-02 10:30:00",
    2,
    "Fever",
  ]);
  for (const appointmentDate of ["invalid", "2000-01-01T10:30:00Z"]) {
    const rejected = fixture();
    await assert.rejects(
      rejected.service.book({ ...dto, appointmentDate }),
      /future appointment/,
    );
    assert.equal(rejected.writes.length, 0);
  }
  const rejected = fixture({ invalidServiceType: true });
  await assert.rejects(rejected.service.book(dto), /available service type/);
  assert.equal(rejected.writes.length, 0);
});
