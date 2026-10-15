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
