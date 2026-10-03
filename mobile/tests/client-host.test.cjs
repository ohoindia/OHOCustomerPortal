const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");
const ts = require("typescript");

function setup(fetch = async () => new Response("[]")) {
  const exports = {};
  const writes = [];
  const sessions = [];
  const replies = [];
  const js = ts.transpileModule(
    fs.readFileSync(path.join(__dirname, "../src/lib/client-host.ts"), "utf8"),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    },
  ).outputText;
  const dependencies = {
    "@react-native-async-storage/async-storage": {
      setItem: async (...value) => writes.push(value),
    },
    "expo-location": {
      requestForegroundPermissionsAsync: async () => ({ granted: false }),
    },
    "react-native": { Linking: { openURL: async () => {} } },
    "./session": {
      saveSession: async (...args) => sessions.push(args),
      clearSession: async () => sessions.push(null),
    },
  };
  vm.runInNewContext(js, {
    exports,
    require: (name) => dependencies[name],
    URL,
    AbortController,
    fetch,
  });
  return {
    host: exports.createClientHost("https://api.example.com", (value) =>
      replies.push(value),
    ),
    writes,
    sessions,
    replies,
  };
}

test("native API bridge forwards requests and preserves unauthorized status", async () => {
  let request;
  const { host, replies } = setup(async (url, options) => {
    request = { url, options };
    return new Response('{"message":"expired"}', { status: 401 });
  });
  await host.receive({
    type: "fetch",
    id: 1,
    url: "https://api.example.com/api/Customer/7",
    method: "POST",
    body: "{}",
    headers: { Authorization: "Bearer token" },
  });
  assert.equal(request.options.headers.Authorization, "Bearer token");
  assert.equal(request.options.body, "{}");
  assert.equal(replies[0].value.status, 401);
});

test("bridge rejects requests outside the configured API before sending credentials", async () => {
  let calls = 0;
  const { host, replies } = setup(async () => {
    calls++;
    return new Response("[]");
  });
  for (const url of [
    "https://other.example.com/api/Customer",
    "https://api.example.com/other",
    "https://api.example.com/api/../other",
  ]) {
    await host.receive({ type: "fetch", id: 1, url });
  }
  assert.equal(calls, 0);
  assert.equal(replies.length, 3);
  assert.ok(replies.every((value) => value.error));
});

test("cancellation aborts an in-flight native request", async () => {
  let signal;
  const { host } = setup(async (_, options) => {
    signal = options.signal;
    return new Promise((_, reject) =>
      signal.addEventListener("abort", () => reject(new Error("Aborted"))),
    );
  });
  const pending = host.receive({
    type: "fetch",
    id: 2,
    url: "https://api.example.com/api/Customer",
  });
  await host.receive({ type: "cancel", id: 2 });
  await pending;
  assert.equal(signal.aborted, true);
});

test("login, local tracker updates and logout persist in message order", async () => {
  const { host, sessions, writes } = setup();
  await Promise.all([
    host.receive({
      type: "session",
      value: {
        accessToken: "token",
        tokenExpiresAt: "later",
        member: '{"MemberId":7}',
      },
    }),
    host.receive({ type: "local", value: { steps: "123" } }),
    host.receive({ type: "session", value: {} }),
  ]);
  assert.equal(sessions[0][0].JwtToken, "token");
  assert.equal(sessions[1], null);
  assert.equal(writes[0][1], '{"steps":"123"}');
});

test("denied location permission returns an actionable error", async () => {
  const { host, replies } = setup();
  await host.receive({ type: "location", id: 3 });
  assert.match(replies[0].error, /Allow location access/);
});
