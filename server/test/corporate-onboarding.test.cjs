require("reflect-metadata");
const assert = require("node:assert/strict");
const { test } = require("node:test");
const { CorporateService } = require("../dist/corporate/corporate.service");
const {
  CorporateOnboardingService,
} = require("../dist/corporate/corporate-onboarding");
const who = { userId: 1, companyId: 7, name: "HR", permissions: ["employees"] };
const employee = () => ({
  requestId: require("node:crypto").randomUUID(),
  name: "Employee",
  mobile: "9876543210",
  email: "employee@example.test",
  employeeCode: "EMP-1",
  department: "Sales",
  joinedOn: "2026-10-15",
  status: "Active",
  productsId: 10,
  dateofBirth: "1990-01-01",
  gender: "Male",
  family: [
    {
      fullName: "Spouse",
      relationship: "Spouse",
      dateofBirth: "1992-01-01",
      gender: "Female",
    },
  ],
  nominees: [],
});

function harness(options = {}) {
  let state = {
    orders: [],
    roster: null,
    customer: null,
    community: null,
    cards: options.cards ?? [],
    next: 50,
  };
  let inTransaction = false;
  const calls = [];
  const product = {
    ProductsId: 10,
    ProductName: "Group plan",
    IsActive: 1,
    IsCombo: 1,
    IsFree: 0,
    SaleAmount: 500,
    MaximumMembers: 4,
    MinimumAge: 18,
    MaximumAge: 80,
    ChildrenAge: 18,
    MaximumAdult: 2,
    MaximumChild: 2,
    ...options.product,
  };
  const db = {
    rows: async (sql, values = [], connection) => {
      calls.push({ sql, values, connection });
      if (
        sql.includes("FROM CorporateEmployee e") &&
        sql.includes("JOIN Orders")
      )
        return state.roster?.onboarding
          ? [
              {
                orderId: state.roster?.onboarding.OrderId,
                status: state.roster?.onboarding.Status,
                customerId: state.orders[0]?.CustomerId,
              },
            ]
          : [];
      if (sql.includes("OnboardingCreatedTime AS CreatedTime"))
        return state.roster?.onboarding && state.roster.Status !== "Removed"
          ? [{ ...state.roster.onboarding, EmployeeStatus: state.roster.Status }]
          : [];
      if (sql.includes("SELECT Id AS EmployeeId,OnboardingRequestHash"))
        return state.roster?.onboarding?.RequestId === values[1]
          ? [state.roster?.onboarding]
          : [];
      if (sql.includes("FROM CorporateCompany")) return [{ GroupId: 20 }];
      if (sql.includes("FROM GroupProducts"))
        return options.attached === false ? [] : [{ ProductsId: 10 }];
      if (sql.includes("FROM ProductsDetails")) return [product];
      if (sql.includes("FROM ComboProducts")) return options.included ?? [];
      if (sql.includes("FROM CommunityCustomers"))
        return state.community ? [state.community] : [];
      if (sql.includes("FROM CorporateEmployee")) {
        if (sql.includes("SELECT *")) return state.roster ? [{ ...state.roster, OnboardingOrderId: state.roster.onboarding?.OrderId }] : [];
        if (sql.includes("SELECT CustomerId"))
          return state.roster && values[1] === 7
            ? [{ CustomerId: state.roster.CustomerId }]
            : [];
        return state.roster && state.roster.Id !== values[3] ? [{ Id: state.roster.Id }] : [];
      }
      if (sql.includes("FROM State")) return options.missingState ? [] : [{StateId:1}];
      if (sql.includes("FROM District")) return [{DistrictId:2}];
      if (sql.includes("FROM Customer"))
        return state.customer ? [state.customer] : [];
      if (sql.includes("FROM OHOCards")) return state.cards;
      if (sql.includes("FROM PaymentLinkHistory")) return [];
      if (sql.includes("FROM Orders")) {
        if (sql.includes("REPLACE(OHOCardNumber"))
          return options.reserved ? [{ OrdersId: 3 }] : [];
        if (sql.includes("DATE_FORMAT(CreatedTime"))
          return [{ createdTime: "2026-10-15 12:30:45" }];
        if (sql.includes("SELECT CustomerId,Status"))
          return state.orders.filter((o) => o.OrdersId === values[0]);
        if (/RelatedOrderId\s*=\s*\?/.test(sql))
          return state.orders.filter((o) => o.RelatedOrderId === values[0]);
        if (sql.includes("SELECT *"))
          return state.orders.filter(
            (o) => o.OrdersId === values[0] && o.CustomerId === values[1],
          );
        return [];
      }
      if (sql.includes("FROM Nominee")) return [];
      throw Error(`Unhandled SQL: ${sql}`);
    },
    execute: async (sql, v = [], connection) => {
      calls.push({ sql, values: v, connection });
      if (/^(INSERT INTO|UPDATE|DELETE FROM) Customer\b/.test(sql))
        throw Error("Corporate onboarding must never write Customer");
      if (sql.startsWith("INSERT"))
        assert.equal(
          (sql.match(/\?/g) ?? []).length,
          v.length,
          "SQL bind count must match values",
        );
      const id = state.next++;
      if (sql.startsWith("INSERT INTO CommunityCustomers"))
        state.community = { CommunityCustomersId: id, GroupId: v[2] };
      if (sql.startsWith("INSERT INTO CorporateEmployee"))
        state.roster = {
          Id: id,
          CompanyId: v[0],
          CustomerId: v[1],
          CommunityCustomerId: v[2],
          Status: v[9],
          Mobile: v[5],
        };
      if (sql.startsWith("UPDATE CorporateEmployee SET Name="))
        state.roster.Status = v[5];
      if (sql.startsWith("UPDATE CorporateEmployee SET CustomerId"))
        state.roster.CustomerId = v[0];
      if (sql.startsWith("INSERT INTO Orders")) {
        state.orders.push({
          OrdersId: id,
          CustomerId: null,
          ProductsId: v[0],
          PayableAmount: v[1],
          PaidAmount: 0,
          FullName: v[2],
          Gender: v[3],
          DateofBirth: v[4],
          Age: v[5],
          MobileNumber: v[6],
          Email: v[7],
          OHOCardNumber: v[8],
          RelatedOrderId: v[10],
          Relationship: v[11],
          CardHolderType: v[12],
          Status: null,
        });
      }
      if (sql.startsWith("UPDATE CorporateEmployee SET OnboardingRequestId="))
        state.roster.onboarding = {
          CompanyId: v[5],
          EmployeeId: v[4],
          RequestId: v[0],
          RequestHash: v[1],
          OrderId: v[2],
          CreatedTime: v[3],
          Status: "Ready",
        };
      if (sql.startsWith("UPDATE CorporateEmployee SET OnboardingStatus='Processing'"))
        state.roster.onboarding.Status = "Processing";
      if (
        sql.startsWith("UPDATE CorporateEmployee SET OnboardingStatus=?") &&
        state.roster?.onboarding.Status !== "Completed"
      )
        state.roster.onboarding.Status = v[0];
      return { insertId: id, affectedRows: 1 };
    },
    transaction: async (work) => {
      const before = structuredClone(state);
      inTransaction = true;
      try {
        return await work({ connection: "test" });
      } catch (e) {
        state = before;
        throw e;
      } finally {
        inTransaction = false;
      }
    },
  };
  const onboarding = new CorporateOnboardingService(db);
  const service = new CorporateService(db, onboarding);
  return {
    db,
    calls,
    service,
    onboarding,
    get state() {
      return state;
    },
    get inTransaction() {
      return inTransaction;
    },
  };
}

test("onboarding commits primary/family orders before card creation and replays without duplicate issuance", async (t) => {
  const h = harness();
  const body = employee();
  let issued = 0;
  t.mock.method(globalThis, "fetch", async (url, options) => {
    issued++;
    assert.equal(h.inTransaction, false);
    assert.equal(
      url,
      "https://api.ohoindialife.com/dev2/lambdaAPI/Payment/cardCreation",
    );
    assert.equal(h.state.orders.length, 2);
    assert.equal(h.state.orders[1].RelatedOrderId, h.state.orders[0].OrdersId);
    assert.deepEqual(JSON.parse(options.body), {
      customerOrderId: h.state.orders[0].OrdersId,
      CustomDate: "2026-10-15 12:30:45",
    });
    assert.ok(h.state.orders.every((order) => order.CustomerId === null));
    h.state.orders[0].CustomerId = 500; // Simulate cardCreation; local onboarding never writes Customer.
    h.state.orders[0].Status = "Completed";
    return { ok: true, json: async () => ({ status: true }) };
  });
  const result = await h.service.employee(who, body);
  assert.equal(result.onboardingStatus, "Completed");
  assert.ok(h.state.roster.CustomerId);
  assert.equal(h.state.orders[0].PayableAmount, 500);
  assert.equal(h.state.orders[0].OHOCardNumber, null);
  assert.deepEqual(
    h.state.orders.map((o) => o.CardHolderType),
    ["Primary", "Secondary"],
  );
  assert.equal(
    h.calls.some((call) =>
      /^(INSERT INTO|UPDATE|DELETE FROM) Customer\b/.test(call.sql),
    ),
    false,
  );
  assert.equal((await h.service.employee(who, body)).orderId, result.orderId);
  assert.equal(issued, 1);
  await assert.rejects(h.service.employee(who, { ...body, productsId: 11 }), {
    status: 409,
  });
  assert.equal(h.state.orders.length, 2);
});

test("unattached products and ineligible family members roll back the whole onboarding", async (t) => {
  let issued = 0;
  t.mock.method(globalThis, "fetch", async () => {
    issued++;
    throw Error("must not issue");
  });
  for (const [h, body] of [
    [harness({ attached: false }), employee()],
    [
      harness(),
      {
        ...employee(),
        family: [
          {
            fullName: "Child",
            dateofBirth: "1980-01-01",
            gender: "Male",
            relationship: "Son",
          },
        ],
      },
    ],
    [harness(), { ...employee(), dateofBirth: undefined }],
  ]) {
    await assert.rejects(h.service.employee(who, body), { status: 400 });
    assert.equal(h.state.orders.length, 0);
    assert.equal(h.state.roster, null);
    assert.equal(h.state.customer, null);
  }
  assert.equal(issued, 0);
});

test("provided card cannot belong to or be reserved by another customer", async (t) => {
  t.mock.method(globalThis, "fetch", async () => {
    throw Error("not expected");
  });
  for (const options of [
    { cards: [{ CustomerId: 999 }] },
    { cards: [{ CustomerId: null, IsCardSold: 1 }] },
    { cards: [{ CustomerId: null }], reserved: true },
  ]) {
    const h = harness(options);
    await assert.rejects(
      h.service.employee(who, { ...employee(), ohoCardNumber: "123456789012" }),
    );
    assert.equal(h.state.roster, null);
    assert.equal(h.state.orders.length, 0);
  }
});

test("provided unassigned card is placed on the order for the card creation worker", async (t) => {
  const h = harness({
    cards: [{ CustomerId: null, IsCardSold: 0, IsActivated: 0 }],
  });
  t.mock.method(globalThis, "fetch", async () => ({
    ok: true,
    json: async () => ({ status: true }),
  }));
  await h.service.employee(who, {
    ...employee(),
    ohoCardNumber: "123456789012",
  });
  assert.equal(h.state.orders[0].OHOCardNumber, "1234 5678 9012");
});

test("ambiguous card timeout is recorded and refresh reconciles without resending", async (t) => {
  const h = harness();
  let issued = 0;
  t.mock.method(globalThis, "fetch", async () => {
    issued++;
    throw Error("timeout");
  });
  const result = await h.service.employee(who, employee());
  assert.equal(result.onboardingStatus, "Review");
  assert.equal(h.state.orders.length, 2);
  assert.equal(
    (await h.onboarding.complete(who, result.employeeId)).onboardingStatus,
    "Review",
  );
  assert.equal(issued, 1);
  h.state.orders[0].Status = "Completed";
  assert.equal(
    (await h.onboarding.complete(who, result.employeeId)).onboardingStatus,
    "Completed",
  );
  assert.equal(issued, 1);
});

test("free group products use zero payable amount and required nominees use included family orders", async (t) => {
  const h = harness({
    product: { IsFree: 1, IsCombo: 0, IsNomineeRequired: 1 },
  });
  t.mock.method(globalThis, "fetch", async () => ({
    ok: true,
    json: async () => ({ status: true }),
  }));
  const body = employee();
  body.nominees = [{ productsId: 10, familyIndex: 0, guardianIndex: -1 }];
  await h.service.employee(who, body);
  assert.equal(h.state.orders[0].PayableAmount, 0);
  const nominee = h.calls.find((c) => c.sql.startsWith("INSERT INTO Nominee"));
  assert.equal(nominee.values[0], "Spouse");
  const invalid = harness({ product: { IsNomineeRequired: 1 } });
  await assert.rejects(invalid.service.employee(who, employee()), {
    status: 400,
  });
  assert.equal(invalid.state.orders.length, 0);
});

test("customer details and provisioning reject an employee outside the company", async () => {
  const h = harness();
  await assert.rejects(h.onboarding.details(who, 999), { status: 404 });
  await assert.rejects(h.onboarding.complete(who, 999), { status: 404 });
  await assert.rejects(
    h.service.employee({ ...who, permissions: [] }, employee()),
    { status: 403 },
  );
  assert.equal(h.state.roster, null);
});

test("two-card products require a spouse and customer creation remains API-owned", async (t) => {
  const invalid = harness({ product: { NoOfCardHolders: 2 } });
  await assert.rejects(
    invalid.service.employee(who, { ...employee(), family: [] }),
    { status: 400 },
  );
  const h = harness();
  t.mock.method(globalThis, "fetch", async () => ({
    ok: true,
    json: async () => ({ status: true }),
  }));
  await h.service.employee(who, employee());
  assert.equal(h.state.customer, null);
  assert.equal(h.state.roster.CustomerId, null);
  assert.ok(h.state.orders.every((o) => o.CustomerId === null));
});

test("inactive products attached to the group are listed and generate Primary, Secondary and Family orders", async (t) => {
  const h = harness({
    product: { IsActive: 0, ProductsIsActive: 0, MaximumAdult: 4 },
  });
  const listed = await h.onboarding.products(who);
  assert.equal(listed[0].id, 10);
  t.mock.method(globalThis, "fetch", async () => ({
    ok: true,
    json: async () => ({ status: true }),
  }));
  const body = employee();
  body.family.push({
    fullName: "Mother",
    gender: "Female",
    dateofBirth: "1960-01-01",
    relationship: "Mother",
  });
  await h.service.employee(who, body);
  assert.deepEqual(
    h.state.orders.map((o) => o.CardHolderType),
    ["Primary", "Secondary", "Family"],
  );
  assert.ok(
    h.state.orders.every((o) => o.ProductsId === 10 && o.CustomerId === null),
  );
  const attachmentQueries = h.calls.filter((c) =>
    c.sql.includes("FROM GroupProducts"),
  );
  assert.ok(attachmentQueries.every((c) => !/\bp\.IsActive/.test(c.sql)));
  const details = await h.onboarding.details(who, h.state.roster.Id);
  assert.equal(details.customerId, null);
  assert.equal(details.onboarding.orderId, h.state.orders[0].OrdersId);
  assert.equal(details.family.length, 2);
});

test("Excel order addresses and declared amounts persist without Customer writes", async (t) => {
 const h=harness();
 t.mock.method(globalThis,"fetch",async()=>({ok:true,json:async()=>({status:true})}));
 const body=employee();body.email="";
 body.orderDetails={addressLine1:"Example address",state:"Telangana",district:"Hyderabad",pinCode:"500001",paidAmount:0};
 body.family[0].orderDetails={paidAmount:125};
 await h.service.employee(who,body);
 const updates=h.calls.filter(c=>c.sql.startsWith("UPDATE Orders SET AddressLine1"));
 assert.equal(updates.length,2);assert.deepEqual(updates[0].values.slice(0,1),["Example address"]);
 assert.deepEqual(updates[0].values.slice(5,10),[1,2,"500001",0,0]);
 assert.equal(updates[1].values[8],125);assert.equal(h.state.customer,null);
 const invalid=harness({missingState:true});
 await assert.rejects(invalid.service.employee(who,body),{status:400});
 assert.equal(invalid.state.orders.length,0);
});


test("pending enrollment holds orders until activation and cannot provision early", async (t) => {
  const h = harness();
  let issued = 0;
  t.mock.method(globalThis, "fetch", async () => {
    issued++;
    assert.equal(h.inTransaction, false);
    assert.equal(h.state.roster.Status, "Active");
    return { ok: true, json: async () => ({ status: true }) };
  });
  const body = { ...employee(), status: "Pending" };
  const saved = await h.service.employee(who, body);
  assert.equal(saved.onboardingStatus, "Ready");
  assert.equal(h.state.orders.length, 2);
  assert.equal(issued, 0);
  await h.onboarding.complete(who, saved.employeeId);
  await h.service.employee(who, body);
  assert.equal(issued, 0);
  await h.service.employee(who, { ...body, id: saved.employeeId, status: "Active" });
  assert.equal(issued, 1);
  assert.equal(h.state.orders.length, 2);
  await h.service.employee(who, { ...body, id: saved.employeeId, status: "Active" });
  await h.onboarding.complete(who, saved.employeeId);
  assert.equal(issued, 1);
});
