require("reflect-metadata");
const assert = require("node:assert/strict");
const { test } = require("node:test");
const { PurchasesService } = require("../dist/purchases/purchases.service");
const { personAge, quote } = require("../dist/purchases/purchase.utils");

const product = {
  ProductsId: 278,
  ProductName: "OHO HEALTH ACCOUNT",
  ProductsIsActive: true,
  IsCombo: true,
  IsFree: false,
  MaximumMembers: 6,
  MaximumAdult: 4,
  ProductsMaximumChild: 4,
  ProductsMinimumAge: 18,
  ProductsMaximumAge: 75,
  ProductsChildrenAge: 21,
  NoOfCardHolders: 1,
  IsNomineeRequired: true,
  InsurancePremiums: "266;65;18;2541.53;18;278;2999.00",
  SaleAmount: "0.00",
};
const person = {
  fullName: "Primary Member",
  dateofBirth: "1990-01-01",
  gender: "Female",
  mobileNumber: "9876543210",
  relationship: "Self",
};
function harness(options = {}) {
  const calls = [];
  const order = {
    OrdersId: 50,
    CustomerId: 12,
    ProductsId: 278,
    FullName: person.fullName,
    Gender: person.gender,
    DateofBirth: person.dateofBirth,
    MobileNumber: person.mobileNumber,
    Age: personAge(person.dateofBirth),
    PayableAmount: "2999.00",
    Status: "Pending",
    ...options.order,
  };
  const db = {
    async rows(sql, values = []) {
      calls.push({ sql, values });
      if (sql.includes("FROM ProductsDetails"))
        return [{ ...product, ...options.product }];
      if (sql.includes("FROM ComboProducts"))
        return (
          options.included ?? [
            {
              ProductsId: 19,
              ProductName: "Included cover",
              IsNomineeRequired: true,
            },
          ]
        );
      if (sql.startsWith("SELECT * FROM Orders"))
        return values[1] === 12 ? [order] : [];
      if (sql.includes("Status = 'Pending'"))
        return options.pending ? [{ OrdersId: 50 }] : [];
      if (sql.includes("FROM Customer WHERE"))
        return [{ Name: person.fullName, MobileNumber: person.mobileNumber }];
      if (sql.includes("JOIN Orders o"))
        return values[1] === 12 ? (options.links ?? []) : [];
      if (sql.includes("FROM PaymentLinkHistory")) return options.links ?? [];
      if (sql.includes("FROM PaymentType"))
        return [
          {
            PaymentTypeId: options.methodId ?? 4,
            PaymentTypeName: options.methodName ?? "PaymentLink",
          },
        ];
      if (sql.includes("FROM Nominee"))
        return options.nominees ?? [{ NomineeId: 1, ProductsId: 19 }];
      if (sql.includes("FROM Orders WHERE RelatedOrderId"))
        return options.family ?? [];
      return [];
    },
    async execute(sql, values = []) {
      calls.push({ sql, values });
      return { insertId: 50, affectedRows: 1 };
    },
    async transaction(callback, lock) {
      calls.push({ lock });
      return callback({});
    },
  };
  const settings = {
    sendPaymentlink: "true",
    newCashfreewebhookurl: "https://merchant.test/payment-webhook",
    paymentlinkURLCashfree: "https://sandbox.cashfree.com/pg/links",
    fetchpaymentLinkDetailsURL: "https://sandbox.cashfree.com/pg/links",
    ...options.settings,
  };
  const config = {
    get: async (key) => settings[key] ?? "",
    getSecret: async () => "test-secret",
  };
  return { service: new PurchasesService(db, config), calls, order };
}

test("purchases use ProductsDetails flags, parse real premium strings, and quote eligible ages", async () => {
  const { service } = harness();
  const result = await service.product(278);
  assert.equal(result.InsurancePremiums[0].TotalAmount, "2999.00");
  assert.equal(quote(result, 30).amount, 2999);
  assert.throws(() => quote(result, 70), /age.*eligibility/);
  assert.throws(() => personAge("2099-01-01"), /valid date/);
  await assert.rejects(
    harness({ product: { ProductsIsActive: false } }).service.product(278),
    /not available/,
  );
});
test("order creation uses the server's premium and customer identity, starts unpaid, and resumes retries", async () => {
  const { service, calls } = harness();
  const result = await service.create(12, {
    ...person,
    productsId: 278,
    paidAmount: 1,
    customerId: 999,
  });
  assert.equal(result.orderId, 50);
  const insert = calls.find((call) =>
    call.sql?.startsWith("INSERT INTO Orders"),
  );
  assert.deepEqual(insert.values.slice(0, 3), [12, 278, 2999]);
  assert.match(insert.sql, /PaidAmount.*VALUES.*0/);
  assert.match(insert.sql, /'Pending'/);
  const profileUpdate = calls.find((call) =>
    call.sql?.startsWith("UPDATE Customer SET"),
  );
  assert.deepEqual(profileUpdate.values, [
    person.fullName,
    person.gender,
    person.dateofBirth,
    personAge(person.dateofBirth),
    12,
  ]);
  const resumed = harness({ pending: true });
  assert.equal(
    (await resumed.service.create(12, { ...person, productsId: 278 })).resumed,
    true,
  );
  assert.equal(
    resumed.calls.filter((call) => call.sql?.startsWith("INSERT")).length,
    0,
  );
});

test("checkout cannot assign membership to a different mobile number", async () => {
  const { service, calls } = harness();
  await assert.rejects(
    service.create(12, {
      ...person,
      productsId: 278,
      mobileNumber: "9123456789",
    }),
    /account's mobile/,
  );
  assert.equal(
    calls.filter((call) => call.sql?.startsWith("INSERT")).length,
    0,
  );
});
test("purchase reads and mutations reject another customer's order", async () => {
  const { service, calls } = harness();
  await assert.rejects(service.snapshot(99, 50), /does not belong/);
  await assert.rejects(service.addFamily(99, 50, person), /does not belong/);
  await assert.rejects(service.paymentStatus(99, 50), /does not belong/);
  assert.equal(
    calls.filter((call) => call.sql?.startsWith("INSERT")).length,
    0,
  );
});
test("family member limits and spouse requirements are enforced before inserts", async () => {
  await assert.rejects(
    harness({ product: { MaximumMembers: 1 } }).service.addFamily(12, 50, {
      ...person,
      relationship: "Mother",
    }),
    /member limit/,
  );
  await assert.rejects(
    harness({ product: { NoOfCardHolders: 2 } }).service.addFamily(12, 50, {
      ...person,
      relationship: "Mother",
    }),
    /spouse first/,
  );
  await assert.rejects(
    harness().service.addFamily(12, 50, {
      ...person,
      dateofBirth: "1940-01-01",
      relationship: "Mother",
    }),
    /age limits/,
  );
  const result = harness();
  await result.service.addFamily(12, 50, {
    ...person,
    fullName: "Spouse Member",
    relationship: "Spouse",
  });
  const insert = result.calls.find((call) =>
    call.sql?.startsWith("INSERT INTO Orders"),
  );
  assert.equal(insert.values[2], 50);
});
test("paid purchases and active payment links cannot be edited", async () => {
  await assert.rejects(
    harness({ order: { Status: "Completed" } }).service.addFamily(
      12,
      50,
      person,
    ),
    /already been paid/,
  );
  await assert.rejects(
    harness({
      links: [
        { LinkStatus: "ACTIVE", LinkExpiryTime: new Date(Date.now() + 60000) },
      ],
    }).service.removeFamily(12, 50, 51),
    /current payment/,
  );
});
test("nominee products are checked and minors require an adult guardian", async () => {
  await assert.rejects(
    harness().service.nominee(12, 50, { familyOrderId: 51, productsId: 999 }),
    /does not require/,
  );
  await assert.rejects(
    harness({
      family: [
        {
          OrdersId: 51,
          FullName: "Child",
          DateofBirth: "2020-01-01",
          Gender: "Male",
          Relationship: "Son",
          Age: 6,
        },
      ],
    }).service.nominee(12, 50, { familyOrderId: 51, productsId: 19 }),
    /adult family member/,
  );
  const result = harness({
    nominees: [],
    family: [
      {
        OrdersId: 51,
        FullName: "Spouse Member",
        DateofBirth: "1990-01-01",
        Gender: "Male",
        Relationship: "Spouse",
        Age: 36,
      },
    ],
  });
  await result.service.nominee(12, 50, {
    familyOrderId: 51,
    productsId: 19,
  });
  const insert = result.calls.find((call) =>
    call.sql?.startsWith("INSERT INTO Nominee"),
  );
  assert.deepEqual(insert.values.slice(-4), [12, 50, 50, 19]);
});

test("nominee selection accepts only an owned family member and uses their saved details", async () => {
  await assert.rejects(
    harness().service.nominee(12, 50, { productsId: 19, familyOrderId: 999 }),
    /family member included/,
  );
  await assert.rejects(
    harness().service.nominee(12, 50, { productsId: 19, familyOrderId: 50 }),
    /family member included/,
  );
  const result = harness({
    nominees: [],
    family: [
      {
        OrdersId: 51,
        FullName: "Saved Spouse",
        DateofBirth: "1992-01-01",
        Gender: "Male",
        Relationship: "Spouse",
        Age: 34,
        MobileNumber: "9123456789",
      },
    ],
  });
  await result.service.nominee(12, 50, {
    productsId: 19,
    familyOrderId: 51,
    fullName: "Forged name",
  });
  const insert = result.calls.find((call) =>
    call.sql?.startsWith("INSERT INTO Nominee"),
  );
  assert.equal(insert.values[0], "Saved Spouse");
  assert.equal(insert.values[1], "1992-01-01");
  assert.equal(insert.values[4], "9123456789");
});
test("minor family nominees use the selected adult guardian's stored details", async () => {
  const result = harness({
    nominees: [],
    family: [
      {
        OrdersId: 51,
        FullName: "Saved Child",
        DateofBirth: "2020-01-01",
        Gender: "Male",
        Relationship: "Son",
        Age: 6,
      },
    ],
  });
  await result.service.nominee(12, 50, {
    productsId: 19,
    familyOrderId: 51,
    guardianOrderId: 50,
  });
  const insert = result.calls.find((call) =>
    call.sql?.startsWith("INSERT INTO Nominee"),
  );
  assert.equal(insert.values[6], person.fullName);
  assert.equal(insert.values[10], "Parent");
  await assert.rejects(
    result.service.nominee(12, 50, {
      productsId: 19,
      familyOrderId: 51,
      guardianOrderId: 999,
    }),
    /adult family member/,
  );
});
test("payment blocks missing nominees, missing spouses, and price changes", async () => {
  await assert.rejects(
    harness({ nominees: [] }).service.payment(12, 50, 4),
    /required nominees/,
  );
  await assert.rejects(
    harness({ product: { NoOfCardHolders: 2 } }).service.payment(12, 50, 4),
    /Spouse details/,
  );
  await assert.rejects(
    harness({ order: { PayableAmount: 1 } }).service.payment(12, 50, 4),
    /price has changed/,
  );
});
test("repeated payment requests reuse an active link without contacting the provider", async () => {
  const result = harness({
    links: [
      {
        LinkId: "existing",
        LinkStatus: "ACTIVE",
        LinkExpiryTime: new Date(Date.now() + 60000),
        LinkUrl: "https://payments-test.cashfree.com/links/existing",
      },
    ],
  });
  result.service.gateway = () => assert.fail("Must reuse existing link");
  assert.equal((await result.service.payment(12, 50, 4)).linkId, "existing");
});
test("new payments preserve the legacy webhook's order-history contract and never mark orders paid", async () => {
  const { service, calls } = harness();
  let payload;
  service.gateway = async (_path, body) => {
    payload = body;
    return {
      link_id: body.link_id,
      cf_link_id: "provider-id",
      link_status: "ACTIVE",
      link_amount: 2999,
      link_url: "https://payments-test.cashfree.com/links/new",
      link_expiry_time: new Date(Date.now() + 60000).toISOString(),
    };
  };
  const link = await service.payment(12, 50, 4);
  assert.equal(link.status, "ACTIVE");
  assert.equal(payload.link_amount, 2999);
  assert.equal(payload.link_partial_payments, false);
  assert.equal(payload.link_notify.send_sms, false);
  const history = calls.find((call) =>
    call.sql?.startsWith("INSERT INTO PaymentLinkHistory"),
  );
  assert.deepEqual(history.values.slice(1, 3), [50, 50]);
  assert.ok(!calls.some((call) => call.sql?.includes("Status = 'Completed'")));
});
test("expired payment links are verified before regenerating to prevent duplicate payments", async () => {
  const { service } = harness({
    links: [
      { LinkId: "old", LinkStatus: "ACTIVE", LinkExpiryTime: new Date(0) },
    ],
  });
  service.gateway = async () => ({ link_status: "PAID" });
  await assert.rejects(service.payment(12, 50, 4), /previous payment/);
  await assert.rejects(service.removeFamily(12, 50, 51), /current payment/);
});
test("payment confirmation verifies amount and currency, and awaits actual order completion", async () => {
  const { service } = harness({
    links: [{ LinkId: "test", LinkStatus: "ACTIVE" }],
  });
  service.gateway = async () => ({
    link_id: "test",
    link_status: "PAID",
    link_amount: 2999,
    link_amount_paid: 2999,
    link_currency: "INR",
  });
  assert.deepEqual(await service.paymentStatus(12, 50), {
    status: "PAID",
    completed: false,
    link: {
      linkId: "test",
      url: undefined,
      expiresAt: undefined,
      status: "PAID",
      mode: "link",
      qrCode: undefined,
    },
  });
  service.gateway = async () => ({
    link_id: "test",
    link_status: "PAID",
    link_amount: 1,
    link_amount_paid: 1,
    link_currency: "INR",
  });
  await assert.rejects(service.paymentStatus(12, 50), /could not be verified/);
  service.gateway = async () => ({
    link_id: "test",
    link_status: "PAID",
    link_amount: 2999,
    link_amount_paid: 1,
    link_currency: "INR",
  });
  await assert.rejects(service.paymentStatus(12, 50), /full payment amount/);
  assert.deepEqual(
    await harness({ order: { Status: "Completed" } }).service.paymentStatus(
      12,
      50,
    ),
    { status: "COMPLETED", completed: true },
  );
});
test("snapshot uses active web payment options and never exposes private customer order fields", async () => {
  const { service, calls } = harness({
    order: { AadhaarNumber: "private", CustomerId: 12 },
  });
  const snapshot = await service.snapshot(12, 50);
  assert.equal(snapshot.order.AadhaarNumber, undefined);
  assert.equal(snapshot.order.CustomerId, undefined);
  assert.deepEqual(
    snapshot.nomineeProducts.map((row) => row.ProductsId),
    [19],
  );
  assert.ok(
    calls.some((call) =>
      call.sql?.includes(
        "FROM PaymentType WHERE IsActive = TRUE AND IsWeb = TRUE",
      ),
    ),
  );
});

test("Cashfree payment link options are enabled and static QR is disabled", async () => {
  for (const methodName of [
    "QR Code",
    "Static QRCode",
    "UPI",
    "Cash",
    "Online payment",
    "Credit Card",
  ]) {
    const { service, calls } = harness({ methodName });
    service.gateway = () =>
      assert.fail("Disabled methods must not contact the provider");
    await assert.rejects(
      service.payment(12, 50, 9),
      /available payment method/,
    );
    assert.ok(
      !calls.some((call) =>
        call.sql?.startsWith("INSERT INTO PaymentLinkHistory"),
      ),
    );
    const snapshot = await service.snapshot(12, 50);
    assert.equal(snapshot.paymentMethods[0].enabled, false);
  }
  for (const methodName of [
    "Payment Link",
    "Cashfree Payment Link",
    "Cashfree PaymentLink and QRCode",
  ]) {
    const { service } = harness({
      methodName,
      links: [
        {
          LinkId: "existing",
          LinkUrl: "https://payments.cashfree.com/links/existing",
          LinkStatus: "ACTIVE",
          LinkExpiryTime: new Date(Date.now() + 60000),
        },
      ],
    });
    service.gateway = () => assert.fail("Must reuse the active payment");
    const snapshot = await service.snapshot(12, 50);
    assert.equal(snapshot.paymentMethods[0].enabled, true, methodName);
    assert.equal(
      (await service.payment(12, 50, 4)).linkId,
      "existing",
      methodName,
    );
  }
});

test("fetch-by-link requires customer ownership before checking provider status", async () => {
  const { service } = harness({
    links: [{ OrderId: 50, LinkId: "owned", LinkStatus: "ACTIVE" }],
  });
  let requested;
  service.gateway = async (path) => {
    requested = path;
    return {
      link_id: "owned",
      link_status: "ACTIVE",
      link_amount: 2999,
      link_currency: "INR",
    };
  };
  await assert.rejects(
    service.fetchPaymentLink(99, "owned"),
    /not found for your account/,
  );
  assert.equal(requested, undefined);
  const status = await service.fetchPaymentLink(12, "owned");
  assert.equal(status.status, "ACTIVE");
  assert.equal(requested, "/owned");
});
