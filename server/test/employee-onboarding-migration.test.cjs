const { test } = require('node:test');
const assert = require('node:assert/strict');
const { migrateEmployeeOnboarding } = require('../scripts/migrate-employee-onboarding.cjs');

function database({ legacy = true, conflict = false, mismatch = false } = {}) {
  const calls = [];
  let counts = 0;
  return {
    calls,
    query: async (sql) => {
      calls.push(sql);
      if (sql.startsWith('SHOW')) return [[]];
      if (sql.startsWith('SELECT COUNT'))
        return [[{ count: counts++ === 0 ? Number(conflict) : Number(mismatch) }]];
      return [[]];
    },
    execute: async () => [legacy ? [{ TABLE_NAME: 'CorporateOnboarding' }] : []],
    beginTransaction: async () => calls.push('begin'),
    commit: async () => calls.push('commit'),
    rollback: async () => calls.push('rollback'),
  };
}

test('legacy onboarding is copied and verified before dropping its table', async () => {
  const db = database();
  await migrateEmployeeOnboarding(db);
  assert.equal(db.calls.filter(sql => sql.startsWith('SELECT COUNT')).length, 2);
  assert.ok(db.calls.some(sql => sql.startsWith('UPDATE CorporateEmployee')));
  assert.ok(db.calls.indexOf('commit') < db.calls.indexOf('DROP TABLE CorporateOnboarding'));
});

test('conflicts and failed verification retain the legacy onboarding table', async () => {
  for (const options of [{ conflict: true }, { mismatch: true }]) {
    const db = database(options);
    await assert.rejects(migrateEmployeeOnboarding(db));
    assert.ok(db.calls.includes('rollback'));
    assert.ok(!db.calls.includes('DROP TABLE CorporateOnboarding'));
  }
});

test('new installations do not create or drop the legacy table', async () => {
  const db = database({ legacy: false });
  await migrateEmployeeOnboarding(db);
  assert.ok(!db.calls.includes('begin'));
  assert.ok(!db.calls.some(sql => /CREATE TABLE|DROP TABLE/.test(sql)));
  assert.equal(db.calls.filter(sql => sql.startsWith('ALTER TABLE')).length, 8);
});

test('legacy table can be retained after copying and verifying onboarding data', async () => {
  const db = database();
  await migrateEmployeeOnboarding(db, { retainLegacyTable: true });
  assert.equal(db.calls.filter(sql => sql.startsWith('SELECT COUNT')).length, 2);
  assert.ok(db.calls.some(sql => sql.startsWith('UPDATE CorporateEmployee')));
  assert.ok(db.calls.includes('commit'));
  assert.ok(!db.calls.includes('DROP TABLE CorporateOnboarding'));
});
