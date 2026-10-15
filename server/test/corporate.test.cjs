require("reflect-metadata");
const assert = require("node:assert/strict");
const { test } = require("node:test");
const {
  CorporateService,
  checkPermission,
} = require("../dist/corporate/corporate.service");
const { hashPassword, verifyPassword } = require("../dist/corporate/password");
const who = {
  userId: 1,
  companyId: 7,
  name: "HR",
  email: "hr@example.com",
  role: "HR",
  permissions: ["employees", "inventory"],
};
const onboarding = { products: async () => [], prepare: async () => {}, complete: async () => ({ success: true }) };
function database(read) {
  const calls = [];
  return {
    calls,
    rows: async (sql, values = []) => {
      calls.push({ sql, values });
      return read(sql, values);
    },
    execute: async (sql, values = []) => {
      calls.push({ sql, values });
      return { insertId: 99, affectedRows: 1 };
    },
    transaction: async (work) => work({}),
  };
}
test("corporate passwords use salted hashes and reject wrong passwords", async () => {
  const hash = await hashPassword("very-secure-test-password");
  assert.notEqual(hash, await hashPassword("very-secure-test-password"));
  assert.equal(await verifyPassword("very-secure-test-password", hash), true);
  assert.equal(await verifyPassword("wrong", hash), false);
});
test("HR cannot manage roles or invoices and role checks precede database writes", async () => {
  assert.throws(() => checkPermission(who, "invoices"), { status: 403 });
  const db = database(() => []);
  await assert.rejects(
    new CorporateService(db, onboarding).role(who, {
      name: "Admin",
      permissions: ["access"],
    }),
    { status: 403 },
  );
  assert.equal(db.calls.length, 0);
});
test("expired, disabled or revoked sessions cannot authenticate", async () => {
  const db = database(() => []);
  await assert.rejects(new CorporateService(db, onboarding).identity("a".repeat(64)), {
    status: 401,
  });
  assert.match(db.calls[0].sql, /ExpiresAt>UTC_TIMESTAMP\(\)/);
  assert.match(db.calls[0].sql, /u.Status='Active'/);
  assert.match(db.calls[0].sql, /c.IsActive=1/);
  assert.notEqual(db.calls[0].values[0], "a".repeat(64));
});
test("cross-company employee IDs are rejected before mutation", async () => {
  const db = database(() => []);
  await assert.rejects(new CorporateService(db, onboarding).remove(who, 88), {
    status: 404,
  });
  assert.deepEqual(db.calls[0].values, [88, 7]);
  assert.equal(
    db.calls.some((c) => c.sql.startsWith("UPDATE")),
    false,
  );
});
test("inventory cannot be assigned across companies or beyond stock", async () => {
  const db = database((sql) =>
    sql.includes("FROM CorporateInventory")
      ? [{ Id: 9, Quantity: 1 }]
      : sql.includes("FROM CorporateEmployee")
        ? [{ Id: 3, Status: "Active" }]
        : sql.includes("COUNT(*)")
          ? [{ total: 1 }]
          : [],
  );
  await assert.rejects(
    new CorporateService(db, onboarding).assign(who, { id: 9, employeeId: 3 }),
    { status: 409 },
  );
  assert.deepEqual(db.calls[0].values, [9, 7]);
  assert.deepEqual(db.calls[1].values, [3, 7]);
  assert.equal(
    db.calls.some((c) => c.sql.startsWith("INSERT")),
    false,
  );
});
test("HR workspace excludes invoices, roles and credentials", async () => {
  const db = database((sql) =>
    sql.includes("FROM CorporateCompany")
      ? [{ id: 7, name: "Company", groupId: 20 }]
      : [],
  );
  const result = await new CorporateService(db, onboarding).workspace(who);
  assert.deepEqual(result.invoices, []);
  assert.deepEqual(result.roles, []);
  assert.deepEqual(result.users, []);
  assert.equal(
    db.calls.some(
      (c) =>
        c.sql.includes("CorporateInvoice") ||
        c.sql.includes("CorporateUser") ||
        c.sql.includes("PasswordHash"),
    ),
    false,
  );
  for (const call of db.calls) assert.deepEqual(call.values, [7]);
});
test("onboarding creates a community customer and links an existing customer in one transaction", async () => {
  const db = database((sql) =>
    sql.includes("SELECT GroupId FROM CorporateCompany")
      ? [{ GroupId: 20 }]
      : sql.includes("SELECT CustomerId FROM Customer")
        ? [{ CustomerId: 30 }]
        : [],
  );
  await new CorporateService(db, onboarding).employee(who, {
    name: "New Employee",
    mobile: "9876543210",
    email: "new@example.com",
    employeeCode: "EMP-1",
    department: "Sales",
    joinedOn: "2026-10-15",
    status: "Pending",
  });
  assert.ok(
    db.calls.some(
      (c) =>
        c.sql.startsWith("INSERT INTO CommunityCustomers") &&
        c.values[2] === 20,
    ),
  );
  const roster = db.calls.find((c) =>
    c.sql.startsWith("INSERT INTO CorporateEmployee"),
  );
  assert.deepEqual(roster.values.slice(0, 3), [7, 30, 99]);
  assert.ok(
    db.calls.some((c) => c.sql.startsWith("INSERT INTO CorporateAudit")),
  );
});
test("onboarding rejects another company group and invalid calendar dates", async () => {
  const db = database((sql) =>
    sql.includes("SELECT GroupId FROM CorporateCompany")
      ? [{ GroupId: 20 }]
      : sql.includes("FROM CommunityCustomers")
        ? [{ CommunityCustomersId: 4, GroupId: 50 }]
        : [],
  );
  const employee = {
    name: "Employee",
    mobile: "9876543210",
    email: "new@example.com",
    employeeCode: "EMP-1",
    department: "Sales",
    joinedOn: "2026-10-15",
    status: "Pending",
  };
  await assert.rejects(new CorporateService(db, onboarding).employee(who, employee), {
    status: 409,
  });
  await assert.rejects(
    new CorporateService(db, onboarding).employee(who, {
      ...employee,
      joinedOn: "2026-02-30",
    }),
    { status: 400 },
  );
  assert.equal(
    db.calls.some((c) => c.sql.startsWith("INSERT")),
    false,
  );
});
test("removal releases stock, retains customer records, and audits the company change", async () => {
  const db = database((sql) =>
    sql.includes("FROM CorporateEmployee")
      ? [{ Id: 8, EmployeeCode: "EMP-8", CommunityCustomerId: 18 }]
      : [],
  );
  await new CorporateService(db, onboarding).remove(who, 8);
  assert.ok(
    db.calls.some(
      (c) =>
        c.sql.startsWith("DELETE FROM CorporateAssignment") &&
        c.values[1] === 7,
    ),
  );
  assert.ok(
    db.calls.some(
      (c) => c.sql.includes("SET Status='Removed'") && c.values[1] === 7,
    ),
  );
  assert.equal(
    db.calls.some((c) =>
      /DELETE FROM (Customer|CommunityCustomers)\b/.test(c.sql),
    ),
    false,
  );
  assert.ok(
    db.calls.some(
      (c) =>
        c.sql.includes("SET GroupId=NULL") &&
        c.values[0] === 18 &&
        c.values[1] === 7,
    ),
  );
});
test("user management rejects foreign company role IDs and self modifications", async () => {
  const admin = { ...who, permissions: ["access"] };
  const db = database(() => []);
  await assert.rejects(
    new CorporateService(db, onboarding).user(admin, {
      name: "Test",
      email: "test@example.com",
      roleId: 100,
      status: "Active",
    }),
    { status: 404 },
  );
  assert.deepEqual(db.calls[0].values, [100, 7]);
  const own = database((sql) =>
    sql.includes("FROM CorporateRole")
      ? [{ Id: 1 }]
      : sql.includes("SELECT * FROM CorporateUser")
        ? [{ Id: 1 }]
        : [],
  );
  await assert.rejects(
    new CorporateService(own, onboarding).user(admin, {
      id: 1,
      name: "Test",
      email: "test@example.com",
      roleId: 1,
      status: "Disabled",
    }),
    { status: 400 },
  );
});

test("rehiring restores only an unassigned customer's original company group", async () => {
  const db = database((sql) =>
    sql.includes("SELECT * FROM CorporateEmployee")
      ? [
          {
            Id: 9,
            Status: "Removed",
            Mobile: "9876543210",
            CommunityCustomerId: 18,
          },
        ]
      : sql.includes("FROM CorporateCompany")
        ? [{ GroupId: 20 }]
        : sql.includes("FROM CommunityCustomers")
          ? [{ GroupId: null }]
          : [],
  );
  await new CorporateService(db, onboarding).employee(who, {
    id: 9,
    name: "Returning Employee",
    mobile: "9876543210",
    email: "return@example.com",
    employeeCode: "EMP-9",
    department: "Sales",
    joinedOn: "2026-10-15",
    status: "Pending",
  });
  assert.ok(
    db.calls.some(
      (c) =>
        c.sql.startsWith("UPDATE CommunityCustomers SET GroupId=?") &&
        c.values[0] === 20 &&
        c.values[1] === 18,
    ),
  );
});

test("rehiring cannot take a customer away from another company group", async () => {
  const db = database((sql) =>
    sql.includes("SELECT * FROM CorporateEmployee")
      ? [
          {
            Id: 9,
            Status: "Removed",
            Mobile: "9876543210",
            CommunityCustomerId: 18,
          },
        ]
      : sql.includes("FROM CorporateCompany")
        ? [{ GroupId: 20 }]
        : sql.includes("FROM CommunityCustomers")
          ? [{ GroupId: 50 }]
          : [],
  );
  await assert.rejects(
    new CorporateService(db, onboarding).employee(who, {
      id: 9,
      name: "Returning Employee",
      mobile: "9876543210",
      email: "return@example.com",
      employeeCode: "EMP-9",
      department: "Sales",
      joinedOn: "2026-10-15",
      status: "Pending",
    }),
    { status: 409 },
  );
  assert.equal(
    db.calls.some((c) => c.sql.startsWith("UPDATE")),
    false,
  );
});
