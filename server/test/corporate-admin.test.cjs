require("reflect-metadata");
const assert = require("node:assert/strict");
const { test } = require("node:test");
const {
  CorporateAdminGuard,
  CorporateAdminService,
} = require("../dist/corporate/corporate-admin");

test("admin guard fails closed and does not trust customer or corporate bearer tokens", async () => {
  const guard = new CorporateAdminGuard({ get: async () => "" });
  for (const authorization of [
    undefined,
    "Bearer customer.jwt",
    "Bearer " + "a".repeat(64),
  ]) {
    await assert.rejects(
      guard.canActivate({
        switchToHttp: () => ({
          getRequest: () => ({ headers: { authorization } }),
        }),
      }),
      (e) => e.getStatus() === 401,
    );
  }
  await assert.rejects(
    guard.canActivate({
      switchToHttp: () => ({
        getRequest: () => ({
          headers: {
            authorization:
              "Basic " + Buffer.from("admin:password").toString("base64"),
          },
        }),
      }),
    }),
    (e) => e.getStatus() === 503,
  );
});

test("admin guard authenticates upstream and permits only configured server-side roles", async () => {
  const previous = global.fetch;
  const config = {
    get: async (key) =>
      key === "CORPORATE_ADMIN_LOGIN_URL"
        ? "https://admin.example.test/lambdaAPI/Employee/adminloginm"
        : "1, 9",
  };
  const guard = new CorporateAdminGuard(config);
  const request = {
    headers: {
      authorization: "Basic " + Buffer.from("admin:secret").toString("base64"),
    },
  };
  const context = { switchToHttp: () => ({ getRequest: () => request }) };
  try {
    global.fetch = async (url, options) => {
      assert.equal(url.hostname, "admin.example.test");
      assert.equal(options.redirect, "error");
      assert.deepEqual(JSON.parse(options.body), {
        userName: "admin",
        password: "secret",
      });
      return {
        ok: true,
        json: async () => ({
          status: true,
          data: [{ UserId: 8, UserRoleId: 2 }],
        }),
      };
    };
    await assert.rejects(
      guard.canActivate(context),
      (e) => e.getStatus() === 403,
    );
    global.fetch = async () => ({
      ok: true,
      json: async () => ({
        status: true,
        data: [{ UserId: 8, UserRoleId: 9 }],
      }),
    });
    assert.equal(await guard.canActivate(context), true);
    assert.equal(request.operator, "OHOINDIA admin #8");
    global.fetch = async () => ({
      ok: true,
      json: async () => ({
        status: false,
        data: [{ UserId: 8, UserRoleId: 9 }],
      }),
    });
    await assert.rejects(
      guard.canActivate(context),
      (e) => e.getStatus() === 401,
    );
  } finally {
    global.fetch = previous;
  }
});

test("new group provisioning creates company, four roles and hashed initial admin in one transaction", async () => {
  const calls = [];
  const connection = {};
  let nextId = 40;
  const db = {
    rows: async (sql, values, c) => {
      assert.equal(c, connection);
      return sql.includes("FROM `Group`") ? [{ GroupId: 55 }] : [];
    },
    execute: async (sql, values, c) => {
      assert.equal(c, connection);
      calls.push({ sql, values });
      return { insertId: nextId++ };
    },
    transaction: async (work, lock) => {
      assert.equal(lock, "corporate-group:55");
      return work(connection);
    },
  };
  const service = new CorporateAdminService(db, {});
  const result = await service.provision(
    55,
    {
      companyName: "Example",
      name: "First Admin",
      email: "ADMIN@example.com",
      password: "strong-password-for-test",
    },
    "OHOINDIA admin #8",
  );
  assert.equal(result.companyId, 40);
  const roles = calls.filter((c) =>
    c.sql.includes("INSERT INTO CorporateRole"),
  );
  assert.deepEqual(
    roles.map((c) => c.values[1]),
    ["Admin", "HR", "Finance", "Viewer"],
  );
  const user = calls.find((c) => c.sql.includes("INSERT INTO CorporateUser"));
  assert.equal(user.values[0], 40);
  assert.equal(user.values[1], 41);
  assert.equal(user.values[3], "admin@example.com");
  assert.equal(
    await require("../dist/corporate/password").verifyPassword(
      "strong-password-for-test",
      user.values[4],
    ),
    true,
  );
  assert.equal(calls.at(-1).values[1], "OHOINDIA admin #8");
});

test("missing or already provisioned groups cannot create corporate accounts", async () => {
  for (const exists of [false, true]) {
    const db = {
      transaction: async (work) => work({}),
      rows: async (sql) =>
        sql.includes("FROM `Group`")
          ? exists
            ? [{ GroupId: 55 }]
            : []
          : [{ Id: 40 }],
      execute: async () => assert.fail("Must not write"),
    };
    await assert.rejects(
      new CorporateAdminService(db, {}).provision(
        55,
        {
          companyName: "Example",
          name: "Admin",
          email: "admin@example.com",
          password: "strong-password-for-test",
        },
        "Operator",
      ),
      (e) => e.getStatus() === 403,
    );
  }
});

test("admin user and role actions derive company identity from Group on the server", async () => {
  const service = new CorporateAdminService(
    {
      rows: async (sql, values) => {
        assert.deepEqual(values, [55]);
        return [{ Id: 40 }];
      },
    },
    {},
  );
  const identity = await service.identity(55, "OHOINDIA admin #8");
  assert.equal(identity.companyId, 40);
  assert.equal(identity.userId, 0);
  assert.deepEqual(identity.permissions, ["access"]);
});


test("existing group access lists scoped users, roles and numeric employee counts without writes", async () => {
  const calls = [];
  const db = {
    rows: async (sql, values) => {
      calls.push({ sql, values });
      if (sql.includes("FROM CorporateCompany WHERE GroupId")) return [{ Id: 40, Name: "Existing", IsActive: 1 }];
      assert.deepEqual(values, [40]);
      if (sql.includes("AS groupMembers")) return [{ groupMembers: "12", total: "10", active: "7", pending: "3", onboarded: "6" }];
      if (sql.includes("FROM CorporateRole")) return [{ Id: 2, Name: "HR", Permissions: '["employees"]' }];
      if (sql.includes("FROM CorporateUser")) return [{ Id: 3, Name: "HR User", RoleId: 2, Role: "HR", Status: "Active" }];
      if (sql.includes("FROM Customer c JOIN CommunityCustomers")) return [{ customerId: 12, customerActive: 1 }];
      if (sql.includes("FROM CorporateEmployee") || sql.includes("FROM CorporateInvoice")) return [];
      assert.fail(sql);
    },
    execute: async () => assert.fail("Reading access must not create records"),
  };
  const result = await new CorporateAdminService(db, {}).access(55);
  assert.deepEqual(calls[0].values, [55]);
  assert.deepEqual(result.customerLinks, [{ customerId: 12, customerActive: 1 }]);
  assert.match(calls.find(c => c.sql.includes("FROM CorporateEmployee")).sql, /LEFT JOIN Customer c ON c.CustomerId=e.CustomerId/);
  assert.equal(result.users[0].Role, "HR");
  assert.equal(result.roles[0].Name, "HR");
  assert.deepEqual(result.employeeCounts, { groupMembers: 12, total: 10, active: 7, pending: 3, onboarded: 6 });
  assert.ok(calls.find(c => c.sql.includes("AS groupMembers")).sql.includes("OnboardingStatus='Completed'"));
});


test("corporate management sessions validate signature, expiry and current employee role", async () => {
  const { JwtService } = require("@nestjs/jwt");
  const secret = "test-only-corporate-admin-secret-32-characters";
  let employee = { EmployeeId: 8, UserRoleId: 9, IsActive: 1 };
  const guard = new CorporateAdminGuard({ getSecret: async () => secret, get: async () => "9" }, { rows: async () => employee ? [employee] : [] });
  const { token } = await guard.session(8);
  const request = { headers: { authorization: `Bearer ${token}` } };
  const context = { switchToHttp: () => ({ getRequest: () => request }) };
  assert.equal(await guard.canActivate(context), true);
  assert.equal(request.operator, "OHOINDIA admin #8");
  employee.UserRoleId = 2;
  await assert.rejects(guard.canActivate(context), e => e.getStatus() === 403);
  employee.UserRoleId = 9;
  employee.IsActive = 0;
  await assert.rejects(guard.canActivate(context), e => e.getStatus() === 403);
  employee.IsActive = 1;
  for (const options of [
    { secret: "wrong-secret", expiresIn: "1h", audience: "oho-frontweb" },
    { secret, expiresIn: -1, audience: "oho-frontweb" },
    { secret, expiresIn: "1h", audience: "oho-customer-app" },
  ]) {
    const invalid = await new JwtService().signAsync({ adminUserId: 8 }, { algorithm: "HS256", issuer: "oho-corporate-admin", ...options });
    request.headers.authorization = `Bearer ${invalid}`;
    await assert.rejects(guard.canActivate(context), e => e.getStatus() === 401);
  }
});


test("raising an invoice scopes it to the company, stores paise and audits in one transaction", async () => {
  const writes = [];
  const connection = {};
  const db = {
    rows: async (sql, values) => { assert.deepEqual(values, [55]); return [{ Id: 40 }]; },
    transaction: async (work) => work(connection),
    execute: async (sql, values, c) => { assert.equal(c, connection); writes.push({ sql, values }); return { insertId: 91 }; },
  };
  const service = new CorporateAdminService(db, {});
  const invoice = { number: " INV-1 ", issuedOn: "2026-10-16", dueOn: "2026-10-30", amountPaise: 12345, description: "Benefits" };
  assert.deepEqual(await service.invoice(55, invoice, "Operator"), { invoiceId: 91 });
  assert.deepEqual(writes[0].values, [40, "INV-1", "2026-10-16", "2026-10-30", 12345, "Benefits"]);
  assert.match(writes[0].sql, /'Due'/);
  assert.deepEqual(writes[1].values, [40, "Operator", "Invoice raised: INV-1"]);
  await assert.rejects(service.invoice(55, { ...invoice, dueOn: "2026-10-15" }, "Operator"), e => e.getStatus() === 400);
  await assert.rejects(service.invoice(55, { ...invoice, issuedOn: "2026-02-30" }, "Operator"), e => e.getStatus() === 400);
  db.transaction = async () => { throw Object.assign(new Error(), { code: "ER_DUP_ENTRY" }); };
  await assert.rejects(service.invoice(55, invoice, "Operator"), e => e.getStatus() === 409);
});

test("invoice input rejects invalid amounts and blank invoice fields", async () => {
  const { validate } = require("class-validator");
  const { CorporateInvoiceDto } = require("../dist/corporate/corporate.dto");
  for (const amountPaise of [0, -1, 1.5, Number.MAX_SAFE_INTEGER]) {
    const value = Object.assign(new CorporateInvoiceDto(), { number: "INV-1", issuedOn: "2026-10-16", dueOn: "2026-10-30", amountPaise, description: "Benefits" });
    assert.ok((await validate(value)).some(e => e.property === "amountPaise"));
  }
  const value = Object.assign(new CorporateInvoiceDto(), { number: " ", description: " ", amountPaise: 1, issuedOn: "2026-10-16", dueOn: "2026-10-30" });
  assert.equal((await validate(value)).length, 2);
});


test("admin employee details resolve the selected group identity before loading the customer", async () => {
  const { CorporateAdminController } = require("../dist/corporate/corporate-admin");
  const who = { companyId: 40, userId: 0, permissions: ["access"] };
  const controller = new CorporateAdminController({ identity: async (group, actor) => {
    assert.equal(group, 55); assert.equal(actor, "Operator"); return who;
  } }, {}, { details: async (identity, id) => {
    assert.equal(identity, who); assert.equal(id, 13); return { customerId: 7 };
  } });
  assert.deepEqual(await controller.employeeDetails(55, { id: 13 }, { operator: "Operator" }), { customerId: 7 });
});
