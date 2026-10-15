require("reflect-metadata");
const assert = require("node:assert/strict");
const { test, before, after } = require("node:test");
const { Test } = require("@nestjs/testing");
const { AppModule } = require("../dist/app.module");
const { DatabaseService } = require("../dist/database/database.service");
const { configureApp } = require("../dist/bootstrap");
let app, base;
const calls = [];
const db = {
  rows: async (sql, values) => {
    calls.push({ sql, values });
    if (sql.includes("FROM ConfigSecrets"))
      return [
        {
          ConfigKey: "JWT_SECRET",
          ConfigValue: "test-only-long-secret-with-thirty-two-characters",
        },
      ];
    if (
      sql.includes("FROM CorporateSession") &&
      values[0] ===
        require("node:crypto")
          .createHash("sha256")
          .update("a".repeat(64))
          .digest("hex")
    )
      return [
        {
          Id: 4,
          CompanyId: 8,
          Name: "Viewer",
          Email: "viewer@example.com",
          RoleName: "Viewer",
          Permissions: "[]",
        },
      ];
    if (sql.includes("FROM CorporateCompany"))
      return [{ id: 8, name: "Company", groupId: 30 }];
    return [];
  },
  execute: async () => ({ affectedRows: 1 }),
  transaction: async (work) => work({}),
};
before(async () => {
  const module = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(DatabaseService)
    .useValue(db)
    .compile();
  app = module.createNestApplication({ logger: false });
  configureApp(app, false);
  await app.listen(0, "127.0.0.1");
  base = await app.getUrl();
});
after(async () => {
  await app?.close();
});
function call(path, body, token) {
  return fetch(`${base}/api/corporate/${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body === undefined
      ? {}
      : { method: "POST", body: JSON.stringify(body) }),
  });
}
test("corporate HTTP routes reject anonymous requests, customer JWTs and invalid sessions", async () => {
  for (const token of [undefined, "customer.jwt.token", "b".repeat(64)]) {
    assert.equal((await call("workspace", undefined, token)).status, 401);
    assert.equal(
      (await call("employees/remove", { id: 1 }, token)).status,
      401,
    );
  }
});

test("corporate admin HTTP routes reject anonymous, customer and corporate sessions", async () => {
  for (const path of ["access", "provision", "roles/save", "users/save"]) {
    const tokens = ["customer.jwt.token", "a".repeat(64)];
    if (path === "access") tokens.push(undefined);
    for (const token of tokens) {
      const response = await fetch(
        `${base}/api/corporate-admin/groups/30/${path}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({}),
        },
      );
      assert.equal(response.status, 401);
    }
  }
});
test("valid corporate session reads only its company and cannot enter customer APIs", async () => {
  const response = await call("workspace", undefined, "a".repeat(64));
  assert.equal(response.status, 200);
  const workspace = await response.json();
  assert.equal(workspace.company.id, 8);
  assert.deepEqual(workspace.invoices, []);
  assert.deepEqual(workspace.roles, []);
  assert.equal(response.headers.get("cache-control"), "no-store");
  const customer = await fetch(`${base}/api/Group/GetById/30`, {
    headers: { Authorization: `Bearer ${"a".repeat(64)}` },
  });
  assert.equal(customer.status, 401);
});
test("viewer cannot mutate employees, roles, users or inventory over HTTP", async () => {
  const cases = [
    ["employees/remove", { id: 1 }],
    ["employees/provision", { id: 1 }],
    ["roles/save", { name: "Admin", permissions: ["access"] }],
    ["inventory/save", { name: "Kit", sku: "KIT", quantity: 1 }],
    [
      "users/save",
      {
        name: "Person",
        email: "person@example.com",
        roleId: 1,
        status: "Active",
        password: "long-test-password",
      },
    ],
  ];
  for (const [path, body] of cases)
    assert.equal((await call(path, body, "a".repeat(64))).status, 403);
});

test("employee enrollment validates nested family data and scopes customer details", async () => {
  const body = {
    name: "Employee", mobile: "9876543210", email: "employee@example.test",
    employeeCode: "EMP-1", department: "Sales", joinedOn: "2026-10-15", status: "Active",
    productsId: 1, dateofBirth: "1990-01-01", gender: "Male",
    requestId: "11111111-1111-4111-8111-111111111111",
    family: [{ fullName: "Child", dateofBirth: "invalid", gender: "Female", relationship: "Daughter" }],
  };
  assert.equal((await call("employees/save", body, "a".repeat(64))).status, 400);
  assert.equal((await call("employees/customer", { id: 999 }, "a".repeat(64))).status, 404);
  assert.equal((await call("employees/customer", { id: 999, companyId: 7 }, "a".repeat(64))).status, 400);
});
test("HTTP validation rejects unrecognized permissions and client supplied company identifiers", async () => {
  assert.equal(
    (
      await call(
        "roles/save",
        { name: "Custom", permissions: ["superadmin"] },
        "a".repeat(64),
      )
    ).status,
    400,
  );
  assert.equal(
    (await call("employees/remove", { id: 1, companyId: 999 }, "a".repeat(64)))
      .status,
    400,
  );
  assert.equal(
    (await call("login", { email: "bad", password: "short" })).status,
    400,
  );
});

test("corporate login has its own rate limit after normal workspace traffic", async () => {
  let response;
  for (let index = 0; index < 10; index++) {
    response = await call("login", { email: "bad", password: "short" });
  }
  assert.equal(response.status, 429);
  assert.ok(response.headers.get("retry-after"));
  assert.equal(
    (await call("workspace", undefined, "a".repeat(64))).status,
    200,
  );
});
