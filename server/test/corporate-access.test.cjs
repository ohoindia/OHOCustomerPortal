const { test } = require("node:test");
const assert = require("node:assert/strict");
const { manageAccess } = require("../scripts/corporate-access.cjs");
const input = { action: "save-user", companyId: 3, name: "HR Operator", email: "HR@example.com", role: "HR", status: "Active", password: "private-test-password" };
function fixture({ role = true, user = true, admins = 1 } = {}) {
  const writes = [];
  const db = {
    transaction: async (fn, lock) => { assert.equal(lock, "corporate-company:3"); return fn("connection"); },
    rows: async (sql, values, c) => {
      assert.equal(c, "connection");
      if (sql.includes("FROM CorporateCompany")) return [{ Id: 3 }];
      if (sql.includes("SELECT Id,Permissions")) { assert.deepEqual(values, [3, "HR"]); return role ? [{ Id: 8, Permissions: '["employees","inventory"]' }] : []; }
      if (sql.includes("COUNT(*)")) return [{ total: admins }];
      if (sql.includes("FOR UPDATE")) return user ? [{ Id: 4 }] : [];
      return [];
    },
    execute: async (sql, values, c) => { assert.equal(c, "connection"); writes.push({ sql, values }); return { insertId: 4 }; },
  };
  return { db, writes };
}
test("operator creates a scoped HR user with a hash and audit entry", async () => {
  const { db, writes } = fixture();
  const result = await manageAccess(db, async () => "salt:hash", input);
  assert.equal(result.userId, 4);
  assert.deepEqual(writes[0].values, [3, 8, "HR Operator", "hr@example.com", "salt:hash", "Active"]);
  assert.match(writes[1].sql, /CorporateAudit/);
  assert.ok(!JSON.stringify(writes).includes(input.password));
});
test("operator rejects missing roles and foreign users before writes", async () => {
  for (const options of [{ role: false }, { user: false }]) {
    const { db, writes } = fixture(options);
    await assert.rejects(manageAccess(db, async () => "hash", { ...input, userId: 4 }));
    assert.equal(writes.length, 0);
  }
});
test("operator cannot remove the last active administrator", async () => {
  const { db, writes } = fixture({ admins: 0 });
  await assert.rejects(manageAccess(db, async () => "hash", { ...input, userId: 4 }), /at least one/);
  assert.equal(writes.length, 0);
});
test("updates preserve an omitted password and revoke sessions", async () => {
  const { db, writes } = fixture();
  await manageAccess(db, async () => { throw Error("Must not hash"); }, { ...input, userId: 4, password: undefined, status: "Disabled" });
  assert.equal(writes[0].values[4], null);
  assert.match(writes[1].sql, /DELETE FROM CorporateSession/);
  assert.match(writes[2].sql, /CorporateAudit/);
});
test("list-access returns no password hashes and performs no writes", async () => {
  const { db, writes } = fixture();
  const result = await manageAccess(db, async () => {}, { action: "list-access", companyId: 3 });
  assert.deepEqual(result.users, []);
  assert.equal(writes.length, 0);
});
