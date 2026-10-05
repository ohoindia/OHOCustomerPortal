require("reflect-metadata");
const assert = require("node:assert/strict");
const { test, before, after } = require("node:test");
const { Test } = require("@nestjs/testing");
const { AppModule } = require("../dist/app.module");
const { configureApp } = require("../dist/bootstrap");
const { DatabaseService } = require("../dist/database/database.service");
const {
  NotificationsService,
} = require("../dist/notifications/notifications.service");
const {
  CustomerAuthService,
} = require("../dist/customer-auth/customer-auth.service");
const { SessionService } = require("../dist/auth/session.service");
const {
  RuntimeConfigService,
} = require("../dist/runtime-config/runtime-config.service");
const {
  transformSubscriptions,
} = require("../dist/customers/subscriptions.mapper");

let app, base, accessToken;
const calls = [];
const guid = "2f842899-28ac-4f0b-a2da-258529e5d0b3";
let otp = {
  OTPGenerated: "654321",
  ExpiredOTPOn: new Date(Date.now() + 120000),
  ValidFor: "CustomerPasswordReset",
};
const customer = {
  CustomerId: 12,
  Name: "Customer",
  MobileNumber: "9876543210",
  Password: "4321",
  CardHolderType: "Primary",
  AddressLine1: "Hyderabad",
  RegisteredWithOTP: "secret",
  AadhaarNumber: "123456789012",
};
let read = async (sql) => {
  if (sql.includes("MobileOTPHistory")) return otp ? [otp] : [];
  if (sql.includes("FROM ConfigSecrets"))
    return [
      {
        ConfigKey: "JWT_SECRET",
        ConfigValue: "test-only-secret-at-least-thirty-two-characters",
      },
    ];
  if (sql.includes("FROM CommunityCustomers"))
    return [
      {
        CommunityCustomersId: 4,
        GroupId: 3,
        MobileNumber: "9876543210",
        Password: "4321",
        IsActive: true,
      },
    ];
  if (sql.includes("FROM Customer")) return [customer];
  if (sql.includes("FROM OHOCards"))
    return [{ OHOCardnumber: "1234 5678", IsActivated: true }];
  if (sql.includes("BookingConsultation bc"))
    return [{ BookingConsultationId: 1, IsCouponClaimed: true }];
  if (sql.includes("FROM View_Subscription"))
    return [
      {
        MemberId: 12,
        MemberProductId: 21,
        ProductName: "Package",
        IsFree: true,
      },
    ];
  if (sql.includes("FROM AadhaarOTPVerificationData"))
    return [{ CustomerId: 12 }];
  if (sql.includes("FROM PANVerification"))
    return [{ PANDocument: "pan.pdf", Valid: true }];
  if (sql.includes("FROM `Group`")) return [{ GroupName: "Group" }];
  if (sql.includes("FROM ProductsDetails"))
    return [{ ProductName: "Package", IsFree: true }];
  if (sql.includes("FROM ConfigValues"))
    return [{ ConfigKey: "HealthTip", ConfigValue: "value" }];
  return [];
};
const db = {
  async rows(sql, values = []) {
    calls.push({ sql, values });
    return read(sql, values);
  },
  async execute(sql, values = []) {
    calls.push({ sql, values });
    return { affectedRows: 1, insertId: 12 };
  },
  async transaction(work) {
    return work({});
  },
};
const notifications = { async sendOtp() {}, async onboarding() {} };
before(async () => {
  const module = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(DatabaseService)
    .useValue(db)
    .overrideProvider(NotificationsService)
    .useValue(notifications)
    .compile();
  app = module.createNestApplication({ logger: false });
  configureApp(app);
  await app.listen(0, "127.0.0.1");
  base = await app.getUrl();
  accessToken = (
    await app
      .get(SessionService)
      .issue({ customerId: 12, communityCustomerId: 4, groupId: 3 }, "4321")
  ).JwtToken;
});
after(async () => {
  await app?.close();
});
async function request(path, body, token = accessToken) {
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  const response = await fetch(`${base}/${path}`, {
    headers,
    ...(body === undefined
      ? {}
      : { method: "POST", body: JSON.stringify(body) }),
  });
  return { status: response.status, body: await response.json() };
}

test("portal APIs use only /api and require authentication and customer ownership", async () => {
  const cases = [
    ["api/Customer/GetDependentsByCustomerId/12", undefined],
    ["api/Hospital/all", { skip: 0, take: 10 }],
    ["api/Hospital/GetById/1", undefined],
    ["api/HospitalPoliciesProvision/GetByHospitalId/1", undefined],
    ["api/Products/GetById/1", undefined],
  ];
  for (const [path, body] of cases) {
    assert.equal((await request(path, body, null)).status, 401, path);
    const response = await request(path, body);
    assert.equal(response.status, 200, path);
    assert.ok(Array.isArray(response.body), path);
  }
  const family = await request("api/Customer/GetDependentsByCustomerId/12");
  assert.ok(
    family.body.every(
      (row) => !("Password" in row) && !("RegisteredWithOTP" in row),
    ),
  );
  assert.equal(
    (await request("api/Customer/GetDependentsByCustomerId/13")).status,
    403,
  );
  assert.equal((await request("api/Hospital/GetById/0")).status, 400);
  assert.equal((await request("api/Hospital/all", { take: -1 })).status, 400);
  assert.equal((await request("api/Hospital/all", { take: 1001 })).status, 400);
  assert.equal((await request("lambdaAPI/Hospital/GetById/1")).status, 404);
  assert.equal((await request("apiLambda/Hospital/GetById/1")).status, 404);
  assert.ok(
    calls.some(
      ({ sql, values }) =>
        sql.includes("RelatedCustomerId = ?") && values[0] === 12,
    ),
  );
  assert.ok(
    calls.some(
      ({ sql, values }) =>
        sql.includes("hpp.HospitalId = ?") &&
        sql.includes("hp.PoliciesType") &&
        values[0] === 1,
    ),
  );
});

test("health and every home API return the JSON contracts consumed by React", async () => {
  const cases = [
    ["health", undefined, (b) => b.status === true],
    [
      "api/Customer/GetById/12",
      undefined,
      (b) =>
        b[0].MemberId === 12 &&
        !("Password" in b[0]) &&
        !("RegisteredWithOTP" in b[0]),
    ],
    [
      "api/Customer/GetMemberProducts/12",
      undefined,
      (b) => b[0].Products[0].ProductName === "Package",
    ],
    ["api/Customer/AddressExistsOrNot/12", undefined, (b) => b.status === true],
    [
      "api/Customer/KYCVerifiedOrNot",
      { customerId: 12, aadhaarNumber: "123456789012" },
      (b) => b.status === true,
    ],
    [
      "api/Customer/PANVerifiedOrNot",
      { CustomerId: 12 },
      (b) => b.status === true,
    ],
    [
      "api/OHOCards/GetMemberCardByMemberId/12",
      undefined,
      (b) => b.returnData[0].IsActivated === true,
    ],
    [
      "api/BookingConsultation/PendingAndSuccessConsultationList",
      { CustomerId: 12 },
      (b) => b[0].IsCouponClaimed === true,
    ],
    ["api/CommunityCustomers/GetById/4", undefined, Array.isArray],
    ["api/Group/GetById/3", undefined, (b) => b[0].GroupName === "Group"],
    [
      "api/ConfigValues/all",
      { skip: 0, take: 0 },
      (b) => b[0].ConfigKey === "HealthTip",
    ],
    ["api/Products/all", { Skip: 0, Take: 0 }, (b) => b[0].IsFree === true],
    ["api/Products/all", { skip: 0, take: 10 }, Array.isArray],
  ];
  for (const [path, payload, verify] of cases) {
    const result = await request(path, payload);
    assert.equal(result.status, 200, path);
    assert.ok(verify(result.body), path);
  }
});

test("PascalCase login and camelCase login preserve MemberId and hide credentials", async () => {
  for (const body of [
    { MobileNumber: "9876543210", Password: "4321" },
    { mobileNumber: "9876543210", password: "4321" },
  ]) {
    const result = await request("api/Customer/memberlogin", body);
    assert.equal(result.status, 200);
    assert.equal(result.body.memberData[0].MemberId, 12);
    assert.equal(result.body.memberData[0].Password, undefined);
    assert.equal(result.body.memberData[0].RegisteredWithOTP, undefined);
    assert.equal(typeof result.body.JwtToken, "string");
    assert.equal(result.body.tokenType, "Bearer");
    assert.ok(Date.parse(result.body.expiresAt) > Date.now());
    assert.equal(
      (
        await request(
          "api/Customer/GetById/12",
          undefined,
          result.body.JwtToken,
        )
      ).status,
      200,
    );
  }
  assert.ok(calls.some((call) => call.sql.startsWith("INSERT INTO UserLogin")));
});

test("CORS reads allowed origins from ConfigSecrets with precedence over ConfigValues", async () => {
  const original = read;
  read = async (sql) =>
    sql.includes("FROM ConfigSecrets")
      ? [{ ConfigKey: "CORS_ORIGINS", ConfigValue: "https://customer.example" }]
      : sql.includes("FROM ConfigValues")
        ? [{ ConfigKey: "CORS_ORIGINS", ConfigValue: "https://old.example" }]
        : original(sql);
  try {
    app.get(RuntimeConfigService).expiresAt = 0;
    const allowed = await fetch(`${base}/health`, {
      headers: { Origin: "https://customer.example" },
    });
    assert.equal(
      allowed.headers.get("access-control-allow-origin"),
      "https://customer.example",
    );
    const blocked = await fetch(`${base}/health`, {
      headers: { Origin: "https://old.example" },
    });
    assert.equal(blocked.headers.get("access-control-allow-origin"), null);
  } finally {
    read = original;
    app.get(RuntimeConfigService).expiresAt = 0;
  }
});

test("mobile lookup and both OTP send routes use the expected business response envelope", async () => {
  assert.equal(
    (
      await request("api/Customer/mobileNoValid", {
        mobileNumber: "9876543210",
      })
    ).body.status,
    true,
  );
  const registration = await request("api/Customer/checkingMobileno", {
    mobileNumber: "9876543210",
  });
  assert.equal(registration.status, 200);
  assert.equal(registration.body.status, false);
  const reset = await request("api/Customer/toSetNewPassword", {
    mobileNumber: "9876543210",
  });
  assert.equal(reset.status, 200);
  assert.equal(reset.body.message, "OTP already sent");
});

test("validation rejects malformed IDs, duplicate case aliases, SQL payloads and unknown fields", async () => {
  for (const [path, payload] of [
    ["api/Customer/GetById/-1"],
    ["api/Customer/GetById/not-a-number"],
    [
      "api/Customer/memberlogin",
      { mobileNumber: "9876543210' OR 1=1", password: "4321" },
    ],
    [
      "api/Customer/memberlogin",
      {
        mobileNumber: "9876543210",
        MobileNumber: "9876543210",
        password: "4321",
      },
    ],
    [
      "api/Customer/memberlogin",
      {
        mobileNumber: "9876543210",
        password: "4321",
        sql: "DROP TABLE Customer",
      },
    ],
    ["api/Products/all", { take: -1 }],
  ]) {
    const count = calls.length;
    assert.equal((await request(path, payload)).status, 400, path);
    assert.ok(
      calls
        .slice(count)
        .every(
          (call) =>
            call.sql.startsWith("SELECT Password, IsActive, MobileNumber") ||
            call.sql.startsWith("SELECT GroupId, MobileNumber, IsActive") ||
            /^SELECT ConfigKey, ConfigValue FROM Config(Values|Secrets) ORDER BY/.test(
              call.sql,
            ),
        ),
      "Invalid input must not reach business SQL",
    );
  }
});

test("password reset cannot bypass OTP and consumes a valid proof", async () => {
  const path = "api/Customer/updatePassword";
  const body = {
    mobileNumber: "9876543210",
    password: "1234",
    guid,
    otpGenerated: "654321",
  };
  assert.equal(
    (
      await request(path, {
        mobileNumber: body.mobileNumber,
        password: body.password,
      })
    ).status,
    400,
  );
  for (const record of [
    null,
    { ...otp, OTPGenerated: "111111" },
    { ...otp, ExpiredOTPOn: new Date(0) },
    { ...otp, ExpiredOTPOn: "invalid" },
    { ...otp, ValidFor: "CustomerRegistration" },
  ]) {
    const saved = otp;
    otp = record;
    const start = calls.length;
    const result = await request(path, body);
    assert.equal(result.body.status, false);
    assert.ok(
      !calls
        .slice(start)
        .some((call) => call.sql.startsWith("UPDATE Customer")),
    );
    otp = saved;
  }
  const result = await request(path, body);
  assert.equal(result.body.status, true);
  assert.ok(
    calls.some((call) =>
      call.sql.startsWith("UPDATE MobileOTPHistory SET ExpiredOTPOn"),
    ),
  );
});

test("a consumed reset OTP cannot authorize another password update", async () => {
  let proof = {
    OTPGenerated: "654321",
    ExpiredOTPOn: new Date(Date.now() + 120000),
    ValidFor: "CustomerPasswordReset",
  };
  let passwordWrites = 0;
  const statefulDb = {
    async rows() {
      return [proof];
    },
    async execute(sql, values) {
      if (sql.startsWith("UPDATE Customer")) passwordWrites++;
      if (sql.startsWith("UPDATE MobileOTPHistory"))
        proof = { ...proof, ExpiredOTPOn: values[0] };
      return { affectedRows: 1 };
    },
    async transaction(work) {
      return work({});
    },
  };
  const service = new CustomerAuthService(
    statefulDb,
    notifications,
    app.get(SessionService),
  );
  const body = {
    mobileNumber: "9876543210",
    password: "1234",
    guid,
    otpGenerated: "654321",
  };
  assert.equal((await service.resetPassword(body)).status, true);
  assert.equal((await service.resetPassword(body)).status, false);
  assert.equal(passwordWrites, 1);
});

test("OTP validation supports legacy aliases and rejects an incorrect code", async () => {
  const result = await request("api/Customer/OTPValidation", {
    MobileNumber: "9876543210",
    GUID: guid,
    OTPGenerated: "654321",
  });
  assert.equal(result.body.status, true);
  assert.equal(
    (
      await request("api/Customer/OTPValidation", {
        mobileNumber: "9876543210",
        guid,
        otpGenerated: "000000",
      })
    ).body.status,
    false,
  );
});

test("registration verifies the proof, assigns OHOCODE and returns data.customerId", async () => {
  const original = read;
  const originalOtp = otp;
  otp = { ...otp, ValidFor: "CustomerRegistration" };
  read = async (sql) =>
    sql.includes("MobileOTPHistory")
      ? [otp]
      : sql.includes("SELECT OHOCODE")
        ? [{ OHOCODE: "OHO 000041" }]
        : [];
  try {
    const result = await request("api/Customer/add", {
      mobileNumber: "9876543210",
      guid,
      otpGenerated: "654321",
      name: "Customer",
      cardHolderType: "Primary",
    });
    assert.equal(result.body.status, true);
    assert.equal(result.body.data.customerId, 12);
    assert.equal(typeof result.body.JwtToken, "string");
    assert.ok(
      calls.some(
        (call) =>
          call.sql.startsWith("INSERT INTO Customer") &&
          call.values.includes("OHO 000042"),
      ),
    );
  } finally {
    read = original;
    otp = originalOtp;
  }
});

test("OTP send enforces daily limit and resend cooldown without invoking SMS", async () => {
  const service = new CustomerAuthService(db, {
    sendOtp: () => assert.fail("SMS must not be sent"),
  });
  const original = read;
  try {
    read = async (sql) =>
      sql.includes("MobileOTPHistory")
        ? Array.from({ length: 5 }, () => ({ ExpiredOTPOn: new Date(0) }))
        : [];
    assert.equal(
      (await service.sendOtp({ mobileNumber: "9876543210" }, false)).status,
      false,
    );
    read = async (sql) =>
      sql.includes("MobileOTPHistory")
        ? [{ ExpiredOTPOn: new Date(Date.now() + 120000) }]
        : [];
    assert.equal(
      (await service.sendOtp({ mobileNumber: "9876543210" }, false)).message,
      "OTP already sent",
    );
  } finally {
    read = original;
  }
});

test("OTP sends persist six-digit proof only after successful delivery", async () => {
  const original = read;
  read = async () => [];
  const sent = [];
  const service = new CustomerAuthService(db, {
    async sendOtp(mobile, code) {
      sent.push({ mobile, code });
    },
  });
  try {
    const result = await service.sendOtp({ mobileNumber: "9876543210" }, false);
    assert.equal(result.status, true);
    assert.match(sent[0].code, /^\d{6}$/);
    const insert = calls.findLast((call) =>
      call.sql.startsWith("INSERT INTO MobileOTPHistory"),
    );
    assert.equal(insert.values[1], sent[0].code);
    assert.equal(insert.values[5], "CustomerRegistration");
    assert.ok(Date.parse(result.futureTime) > Date.now());
    const failed = new CustomerAuthService(db, {
      async sendOtp() {
        throw new Error("delivery failed");
      },
    });
    const start = calls.length;
    await assert.rejects(
      failed.sendOtp({ mobileNumber: "9876543210" }, false),
      /delivery failed/,
    );
    assert.ok(
      !calls
        .slice(start)
        .some((call) => call.sql.startsWith("INSERT INTO MobileOTPHistory")),
    );
  } finally {
    read = original;
  }
});

test("subscription mapping removes duplicate joins and preserves nested policy associations", () => {
  const row = {
    MemberId: 12,
    MemberProductId: 21,
    ProductName: "Package",
    PoliciesId: 7,
    PoliciesCustomerId: 40,
    IndividualProductsId: 9,
    MemberDependentId: 5,
    DependentMemberId: 40,
    InsurerDetailsId: 40,
    NomineeId: 6,
    NomineeProductsId: 9,
    EmployeeId: 3,
    EndorseEmail: "template",
  };
  const result = transformSubscriptions([
    row,
    { ...row },
    { ...row, NomineeId: 8, NomineeProductsId: 99 },
  ]);
  assert.equal(result.length, 1);
  assert.equal(result[0].Products.length, 1);
  const product = result[0].Products[0];
  assert.equal(product.RMId, 3);
  assert.equal(product.ProductEndorseEmail, "template");
  assert.equal(product.Policies.length, 1);
  assert.equal(product.Policies[0].Dependents.length, 1);
  assert.equal(product.Policies[0].Insurer.length, 1);
  assert.equal(product.Policies[0].Nominees.length, 1);
  assert.deepEqual(
    transformSubscriptions([{ MemberId: 12, MemberProductId: null }]),
    [],
  );
});

test("database releases advisory lock after commit or rollback, then returns connection", async () => {
  for (const shouldFail of [false, true]) {
    const events = [];
    const connection = {
      async execute(sql) {
        events.push(sql.includes("GET_LOCK") ? "lock" : "unlock");
        return [[{ Acquired: 1 }]];
      },
      async beginTransaction() {
        events.push("begin");
      },
      async commit() {
        events.push("commit");
      },
      async rollback() {
        events.push("rollback");
      },
      release() {
        events.push("release");
      },
    };
    const service = new DatabaseService({});
    service.getPool = () => ({
      async getConnection() {
        return connection;
      },
    });
    const work = service.transaction(async () => {
      events.push("work");
      if (shouldFail) throw new Error("failure");
    }, "lock-name");
    if (shouldFail) await assert.rejects(work, /failure/);
    else await work;
    assert.deepEqual(events, [
      "lock",
      "begin",
      "work",
      shouldFail ? "rollback" : "commit",
      "unlock",
      "release",
    ]);
  }
});

test("JWT protection denies anonymous access to every customer data endpoint", async () => {
  for (const [path, body] of [
    ["api/Customer/GetById/12"],
    ["api/Customer/GetMemberProducts/12"],
    ["api/Customer/AddressExistsOrNot/12"],
    ["api/OHOCards/GetMemberCardByMemberId/12"],
    ["api/CommunityCustomers/GetById/4"],
    ["api/Group/GetById/3"],
    [
      "api/Customer/KYCVerifiedOrNot",
      { customerId: 12, aadhaarNumber: "123456789012" },
    ],
    ["api/Customer/PANVerifiedOrNot", { customerId: 12 }],
    [
      "api/BookingConsultation/PendingAndSuccessConsultationList",
      { CustomerId: 12 },
    ],
    ["api/payment/createPaymentLink", { orderId: 50, paymentTypeId: 9 }],
    ["api/payment/fetchPaymentLinksByLinkId/test-link"],
    ["api/Products/all", {}],
    ["api/ConfigValues/all", {}],
  ])
    assert.equal((await request(path, body, null)).status, 401, path);
  assert.equal((await request("health", undefined, null)).status, 200);
  assert.equal(
    (
      await request(
        "api/Customer/mobileNoValid",
        { mobileNumber: "9876543210" },
        null,
      )
    ).status,
    200,
  );
});

test("booking endpoints require authentication and reject forged or malformed booking fields", async () => {
  for (const path of [
    "api/BookingConsultation/checkAvailableCoupons",
    "api/BookingConsultation/checkIndividualCoupons",
    "api/BookingConsultation/bookAppointment/add",
  ]) {
    const body = { customerId: 12, hospitalId: 5 };
    if (path.endsWith("/add"))
      Object.assign(body, {
        hospitalPoliciesId: 7,
        appointmentDate: "2099-01-02T10:30:00Z",
        serviceTypeId: 2,
      });
    assert.equal((await request(path, body, null)).status, 401);
    assert.equal(
      (await request(path, { ...body, hospitalId: -1 })).status,
      400,
    );
    assert.equal(
      (await request(path, { ...body, name: "Forged patient name" })).status,
      400,
    );
  }
});

test("ownership checks reject other customer, community and group IDs", async () => {
  for (const [path, body] of [
    ["api/Customer/GetById/99"],
    ["api/Customer/GetMemberProducts/99"],
    ["api/Customer/AddressExistsOrNot/99"],
    ["api/OHOCards/GetMemberCardByMemberId/99"],
    ["api/CommunityCustomers/GetById/99"],
    ["api/Group/GetById/99"],
    [
      "api/Customer/KYCVerifiedOrNot",
      { customerId: 99, aadhaarNumber: "123456789012" },
    ],
    ["api/Customer/PANVerifiedOrNot", { CustomerId: 99 }],
    [
      "api/BookingConsultation/checkAvailableCoupons",
      { customerId: 99, hospitalId: 5 },
    ],
    [
      "api/BookingConsultation/checkIndividualCoupons",
      { customerId: 99, hospitalId: 5 },
    ],
    [
      "api/BookingConsultation/bookAppointment/add",
      {
        customerId: 99,
        hospitalId: 5,
        hospitalPoliciesId: 7,
        appointmentDate: "2099-01-02T10:30:00Z",
        serviceTypeId: 2,
      },
    ],
    [
      "api/BookingConsultation/PendingAndSuccessConsultationList",
      { CustomerId: 99 },
    ],
  ])
    assert.equal((await request(path, body)).status, 403, path);
  assert.equal(
    (
      await request("api/Customer/KYCVerifiedOrNot", {
        customerId: 12,
        aadhaarNumber: "999999999999",
      })
    ).status,
    403,
  );
});

test("invalid tokens cannot reach customer SQL and failed login does not issue a token", async () => {
  const count = calls.length;
  assert.equal(
    (await request("api/Customer/GetById/12", undefined, "invalid-token"))
      .status,
    401,
  );
  assert.equal(calls.length, count);
  const result = await request(
    "api/Customer/memberlogin",
    { mobileNumber: "9876543210", password: "0000" },
    null,
  );
  assert.equal(result.body.status, false);
  assert.equal(result.body.JwtToken, undefined);
});

test("community password login cannot grant access to a customer with a different password", async () => {
  const original = read;
  read = async (sql) =>
    sql.startsWith("SELECT * FROM Customer WHERE MobileNumber")
      ? [{ ...customer, Password: "0000" }]
      : original(sql);
  try {
    const result = await request(
      "api/Customer/memberlogin",
      { mobileNumber: "9876543210", password: "4321" },
      null,
    );
    assert.equal(result.body.status, true);
    assert.equal(result.body.memberData[0].MemberId, 0);
    const token = result.body.JwtToken;
    assert.equal(
      (await request("api/Customer/GetById/12", undefined, token)).status,
      403,
    );
    assert.equal(
      (await request("api/CommunityCustomers/GetById/4", undefined, token))
        .status,
      200,
    );
    assert.equal(
      (await request("api/Group/GetById/3", undefined, token)).status,
      200,
    );
  } finally {
    read = original;
  }
});

test("payment creation validates the authenticated order and method payload", async () => {
  const beforeCalls = calls.length;
  const response = await request("api/payment/createPaymentLink", {
    orderId: -1,
    paymentTypeId: "QR",
    paidAmount: 1,
  });
  assert.equal(response.status, 400);
  assert.ok(
    !calls
      .slice(beforeCalls)
      .some((call) => /Orders|PaymentLinkHistory/.test(call.sql)),
  );
});
