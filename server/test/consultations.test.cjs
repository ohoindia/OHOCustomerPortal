require("reflect-metadata");
const assert = require("node:assert/strict");
const { test } = require("node:test");
const {
  ConsultationsService,
} = require("../dist/consultations/consultations.service");

test("wallet uses 24 OPDs during card validity and counts family visits within that period", async () => {
  let used = 1;
  let valid = 1;
  const service = new ConsultationsService(
    {
      rows: async (sql, values) => {
        if (sql.includes("FROM OHOCards")) {
          assert.deepEqual(values, [12]);
          assert.match(sql, /CONVERT_TZ\(UTC_TIMESTAMP/);
          return [
            {
              OHOCardnumber: "CARD",
              StartDate: "2026-01-01",
              EndDate: "2026-12-31",
              IsValid: valid,
              IsActivated: 1,
              HasStarted: 1,
            },
          ];
        }
        if (sql.startsWith("SELECT CustomerId"))
          return [
            { CustomerId: 12, Name: "Self" },
            { CustomerId: 15, Name: "Spouse" },
          ];
        assert.match(sql, /bc.IsCouponClaimed = TRUE OR/);
        assert.deepEqual(values, [
          12,
          12,
          "CARD",
          "2026-01-01",
          "2026-01-01",
          "2026-12-31",
        ]);
        assert.match(sql, /bc.CardNumber = \?/);
        assert.match(
          sql,
          /DATE\(COALESCE\(bc.AppointmentDate, bc.BookingDate\)\) <= \?/,
        );
        assert.match(sql, /family.RelatedCustomerId = \?/);
        assert.match(
          sql,
          /GROUP BY COALESCE\(bc.DependentCustomerId, bc.CustomerId\)/,
        );
        return [
          { CustomerId: 12, UsedOpds: used },
          { CustomerId: 15, UsedOpds: 2 },
        ];
      },
    },
    {},
  );
  assert.deepEqual(await service.walletOpds(12), [
    {
      totalOpds: 24,
      usedOpds: 3,
      availableOpds: 21,
      cardValid: true,
      cardExpiry: "2026-12-31",
      subscriptionCredit: {
        date: "2026-01-01",
        reference: "CARD",
        opds: 24,
        labAndMedicines: 25000,
      },
      members: [
        { customerId: 12, name: "Self", usedOpds: 1, utilizedAmount: 500 },
        { customerId: 15, name: "Spouse", usedOpds: 2, utilizedAmount: 1000 },
      ],
    },
  ]);
  used = 26;
  assert.equal((await service.walletOpds(12))[0].availableOpds, 0);
  used = 1;
  valid = 0;
  assert.equal((await service.walletOpds(12))[0].availableOpds, 0);
});

test("wallet without a card has no available OPDs and does not count historical visits", async () => {
  const service = new ConsultationsService(
    {
      rows: async (sql) => {
        assert.doesNotMatch(sql, /FROM BookingConsultation/);
        return [];
      },
    },
    {},
  );
  const [wallet] = await service.walletOpds(12);
  assert.equal(wallet.totalOpds, 0);
  assert.equal(wallet.availableOpds, 0);
  assert.equal(wallet.cardValid, false);
  assert.equal(wallet.subscriptionCredit, null);
});

test("subscription credits require an activated card with a recorded start date that has arrived", async () => {
  const card = {
    OHOCardnumber: "CARD",
    StartDate: "2026-01-01",
    EndDate: "2026-12-31",
    IsActivated: 1,
    HasStarted: 1,
    IsValid: 1,
  };
  const service = new ConsultationsService(
    { rows: async (sql) => (sql.includes("FROM OHOCards") ? [card] : []) },
    {},
  );
  assert.equal((await service.walletOpds(12))[0].subscriptionCredit.opds, 24);
  card.IsActivated = 0;
  assert.equal((await service.walletOpds(12))[0].subscriptionCredit, null);
  card.IsActivated = 1;
  card.HasStarted = 0;
  assert.equal((await service.walletOpds(12))[0].subscriptionCredit, null);
  card.HasStarted = 1;
  card.StartDate = null;
  assert.equal((await service.walletOpds(12))[0].subscriptionCredit, null);
});

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
