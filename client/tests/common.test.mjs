import assert from "node:assert/strict";
import test from "node:test";
import { loadModule } from "./load-common.mjs";

test("shared transport uses one API base for customer and catalog requests, serializes POST bodies, and forwards cancellation", async () => {
  const calls = [];
  const { createApiRequest } = loadModule("../../common/api/transport.ts");
  const request = createApiRequest({
    apiBaseUrl: "https://customer.test///",
    fetch: async (url, options) => {
      calls.push({ url, ...options });
      return { ok: true, json: async () => ({ status: true }) };
    },
  });
  const signal = new AbortController().signal;
  await request("/api/Customer/GetById/7", { signal });
  await request("api/Products/all", { body: { skip: 0, take: 0 } });
  assert.equal(calls[0].url, "https://customer.test/api/Customer/GetById/7");
  assert.equal(calls[0].method, "GET");
  assert.equal(calls[0].body, undefined);
  assert.equal(calls[0].signal, signal);
  assert.equal(calls[1].url, "https://customer.test/api/Products/all");
  assert.equal(calls[1].method, "POST");
  await request("api/ConfigValues/all");
  assert.equal(calls[2].url, "https://customer.test/api/ConfigValues/all");
  assert.equal(calls[1].body, '{"skip":0,"take":0}');
});

test("shared transport reports configuration and HTTP failures and preserves abort errors", async () => {
  const { createApiRequest } = loadModule("../../common/api/transport.ts");
  await assert.rejects(
    createApiRequest({})("api/Products/all"),
    /not configured/,
  );
  const failed = createApiRequest({
    apiBaseUrl: "https://test",
    fetch: async () => ({ ok: false, status: 503 }),
  });
  await assert.rejects(failed("api/Customer/GetById/7"), /503/);
  const abort = new Error("aborted");
  const cancelled = createApiRequest({
    apiBaseUrl: "https://test",
    fetch: async () => {
      throw abort;
    },
  });
  await assert.rejects(
    cancelled("api/Customer/GetById/7"),
    (error) => error === abort,
  );
});

test("checkout can display server validation errors without changing other API callers", async () => {
  const { createApiRequest } = loadModule("../../common/api/transport.ts");
  const request = createApiRequest({
    apiBaseUrl: "https://test",
    fetch: async () => ({
      ok: false,
      status: 400,
      json: async () => ({
        message: "Your age is outside this package's eligibility range.",
      }),
    }),
  });
  await assert.rejects(
    request("api/purchases", { serverErrors: true }),
    /eligibility range/,
  );
  await assert.rejects(request("api/purchases"), /400/);
});

test("auth controller preserves OTP proofs and validates the response envelope", async () => {
  const { createAuthController } = loadModule(
    "../../common/controllers/auth.controller.ts",
  );
  const body = {
    mobileNumber: "9999999999",
    guid: "proof",
    otpGenerated: "123456",
    password: "1234",
  };
  let captured;
  const auth = createAuthController(async (path, options) => {
    captured = { path, options };
    return { status: false, message: "Invalid OTP" };
  });
  assert.equal((await auth.authRequest("updatePassword", body)).status, false);
  assert.equal(captured.path, "api/Customer/updatePassword");
  assert.equal(captured.options.body, body);
  await assert.rejects(
    createAuthController(async () => ({})).authRequest("memberlogin", {}),
    /Unexpected response/,
  );
  await assert.rejects(
    createAuthController(async () => null).authRequest("memberlogin", {}),
    /Unexpected response/,
  );
});

test("shared transport attaches tokens from async mobile storage and handles protected 401 responses", async () => {
  const { createApiRequest } = loadModule("../../common/api/transport.ts");
  let headers;
  let rejectedToken;
  const request = createApiRequest({
    apiBaseUrl: "https://test",
    getAccessToken: async () => "session-token",
    onUnauthorized: async (token) => {
      rejectedToken = token;
    },
    fetch: async (_url, options) => {
      headers = options.headers;
      return { ok: false, status: 401 };
    },
  });
  await assert.rejects(
    request("api/Customer/GetById/7"),
    /session has expired/,
  );
  assert.equal(headers.Authorization, "Bearer session-token");
  assert.equal(rejectedToken, "session-token");
  rejectedToken = undefined;
  await assert.rejects(
    request("api/Customer/memberlogin", {
      body: {},
      authentication: false,
    }),
    /401/,
  );
  assert.equal(headers.Authorization, undefined);
  assert.equal(rejectedToken, undefined);
});

test("403 responses keep the signed-in session", async () => {
  const { createApiRequest } = loadModule("../../common/api/transport.ts");
  const request = createApiRequest({
    apiBaseUrl: "https://test",
    getAccessToken: () => "session-token",
    onUnauthorized: () =>
      assert.fail("Forbidden access must not log out the user"),
    fetch: async () => ({ ok: false, status: 403 }),
  });
  await assert.rejects(request("api/Customer/GetById/99"), /403/);
});
