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
  const service = new ConsultationsService(
    {
      rows: async (sql, values) => {
        query = { sql, values };
        return rows;
      },
    },
    { get: async () => "" },
  );
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

test("missing booking PNG uses the legacy hospital approval URL and preserves saved QR images", async () => {
  const rows = [
    { BookingConsultationId: 1, IdHashCode: "abc", QRCode: null },
    { BookingConsultationId: 2, IdHashCode: "def", QRCode: "saved-png" },
    { BookingConsultationId: 3, IdHashCode: null },
  ];
  const service = new ConsultationsService(
    { rows: async () => rows },
    {
      get: async (key) => {
        assert.equal(key, "ConsultationApproveURL");
        return "https://hospital.example/consultation?hash=";
      },
    },
  );
  const result = await service.list({ customerId: 12 });
  assert.equal(
    result[0].QRCodeUrl,
    "https://hospital.example/consultation?hash=abc",
  );
  assert.equal(result[1].QRCode, "saved-png");
  assert.equal(result[1].QRCodeUrl, undefined);
  assert.equal(result[2].QRCodeUrl, undefined);
  service.config.get = async () => "";
  assert.equal(await service.list({ customerId: 12 }), rows);
});
