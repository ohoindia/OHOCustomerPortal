require("reflect-metadata");
const assert = require("node:assert/strict");
const { test } = require("node:test");
const {
  ConsultationsService,
} = require("../dist/consultations/consultations.service");

test("consultations include primary-account bookings and linked family customer bookings without duplicate joins", async () => {
  let query;
  const rows = [
    { BookingConsultationId: 1, CustomerId: 12, DependentCustomerId: null },
    { BookingConsultationId: 2, CustomerId: 12, DependentCustomerId: 15 },
    { BookingConsultationId: 3, CustomerId: 15, DependentCustomerId: null },
  ];
  const service = new ConsultationsService({
    rows: async (sql, values) => {
      query = { sql, values };
      return rows;
    },
  });
  assert.equal(
    await service.list({ customerId: 12, isCouponClaimed: true }),
    rows,
  );
  assert.deepEqual(query.values, [12, 12, true]);
  assert.match(query.sql, /bc.CustomerId = \? OR EXISTS/);
  assert.match(
    query.sql,
    /family.CustomerId = bc.CustomerId AND family.RelatedCustomerId = \?/,
  );
  assert.match(query.sql, /\)\) AND bc.IsCouponClaimed = \?/);
  await service.list({ customerId: 12 });
  assert.deepEqual(query.values, [12, 12]);
  assert.doesNotMatch(query.sql, /AND bc.IsCouponClaimed/);
});
