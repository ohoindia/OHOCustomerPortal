const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
function compile(name, dependencies) {
  const source = fs.readFileSync(
    path.resolve(__dirname, `../src/lib/${name}.ts`),
    "utf8",
  );
  const js = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const exports = {};
  vm.runInNewContext(js, {
    exports,
    require: (name) => dependencies[name],
    Date,
    Set,
    Promise,
  });
  return exports;
}
function setup() {
  let saved = null;
  const storage = {
    getItemAsync: async () => saved,
    setItemAsync: async (_, value) => {
      saved = value;
    },
    deleteItemAsync: async () => {
      saved = null;
    },
  };
  const session = compile("session", {
    "expo-secure-store": storage,
    "react-native": { Platform: { OS: "ios" } },
    "./validation": compile("validation", {}),
  });
  return { session, storage, saved: () => saved };
}
const response = (token) => ({
  JwtToken: token,
  expiresAt: new Date(Date.now() + 60000).toISOString(),
});
const member = { MemberId: 7, Name: "Member" };

test("persistent device login restores after restart and logout removes it", async () => {
  const first = setup();
  await first.session.saveSession({ JwtToken: "persistent", expiresAt: "9999-12-31T23:59:59.000Z" }, member);
  const restarted = compile("session", {
    "expo-secure-store": first.storage,
    "react-native": { Platform: { OS: "ios" } },
    "./validation": compile("validation", {}),
  });
  await restarted.restoreSession();
  assert.equal(restarted.getAccessToken(), "persistent");
  assert.equal(restarted.getSession().member.MemberId, 7);
  await restarted.clearSession();
  await restarted.restoreSession();
  assert.equal(restarted.getSession(), null);
  assert.equal(first.saved(), null);
});
test("device sessions persist, restore, and clear credentials", async () => {
  const { session, saved } = setup();
  let notifications = 0;
  const unsubscribe = session.subscribeSession(() => notifications++);
  await session.saveSession(response("first"), member);
  assert.equal(JSON.parse(saved()).token, "first");
  await session.restoreSession();
  assert.equal(session.getAccessToken(), "first");
  await session.clearSession();
  assert.equal(saved(), null);
  assert.equal(session.getSession(), null);
  assert.equal(notifications, 3);
  unsubscribe();
});
test("a late unauthorized response from an old login preserves the new session", async () => {
  const { session } = setup();
  await session.saveSession(response("first"), member);
  await session.saveSession(response("second"), member);
  await session.clearSession("first");
  assert.equal(session.getAccessToken(), "second");
  await session.clearSession("second");
  assert.equal(session.getSession(), null);
});
test("logout during secure storage write cannot resurrect the pending login", async () => {
  const { session, storage, saved } = setup();
  const original = storage.setItemAsync;
  let release;
  let started;
  const writing = new Promise((resolve) => {
    started = resolve;
  });
  storage.setItemAsync = async (...args) => {
    started();
    await new Promise((resolve) => {
      release = resolve;
    });
    await original(...args);
  };
  const login = session.saveSession(response("pending"), member);
  await writing;
  const logout = session.clearSession();
  release();
  await Promise.all([login, logout]);
  assert.equal(session.getSession(), null);
  assert.equal(saved(), null);
});
test("invalid sessions never persist or publish", async () => {
  const { session, saved } = setup();
  await assert.rejects(
    session.saveSession(
      { JwtToken: "expired", expiresAt: "2000-01-01" },
      member,
    ),
    /valid session/,
  );
  assert.equal(saved(), null);
  assert.equal(session.getSession(), null);
});
