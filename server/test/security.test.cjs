require("reflect-metadata");
const assert = require("node:assert/strict");
const { test } = require("node:test");
const { Test } = require("@nestjs/testing");
const { AppModule } = require("../dist/app.module");
const { configureApp } = require("../dist/bootstrap");
const { DatabaseService } = require("../dist/database/database.service");

async function withApp(work) {
  const module = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(DatabaseService).useValue({ async rows() { return []; } }).compile();
  const app = module.createNestApplication({ logger: false });
  try {
    configureApp(app, false);
    await app.listen(0, "127.0.0.1");
    await work(await app.getUrl());
  } finally { await app.close(); }
}

test("shared IP budget spans routes and ignores spoofed forwarding headers", async () => {
  await withApp(async (base) => {
    for (let i = 0; i < 120; i++) {
      const response = await fetch(`${base}/${i % 2 ? "api/Customer/GetById/12" : "health"}`, {
        headers: { "X-Forwarded-For": `198.51.100.${i + 1}` },
      });
      assert.equal(response.status, i % 2 ? 401 : 200);
      await response.arrayBuffer();
    }
    const blocked = await fetch(`${base}/health`);
    assert.equal(blocked.status, 429);
    assert.ok(Number(blocked.headers.get("retry-after")) > 0);
    assert.equal((await blocked.json()).statusCode, 429);
  });
});

test("login attempts have a tighter budget before authentication or business SQL", async () => {
  await withApp(async (base) => {
    for (let i = 0; i < 11; i++) {
      const response = await fetch(`${base}/api/Customer/memberlogin`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: "{}",
      });
      assert.equal(response.status, i < 10 ? 400 : 429);
      await response.arrayBuffer();
    }
  });
});

test("security headers, body size limits, malformed JSON and prototype keys", async () => {
  await withApp(async (base) => {
    const health = await fetch(`${base}/health`);
    assert.equal(health.headers.get("x-powered-by"), null);
    assert.equal(health.headers.get("x-content-type-options"), "nosniff");
    assert.equal(health.headers.get("x-frame-options"), "SAMEORIGIN");
    assert.equal(health.headers.get("cache-control"), "no-store");
    await health.arrayBuffer();
    for (const [body, status] of [
      [JSON.stringify({ padding: "x".repeat(33000) }), 413],
      ['{"mobileNumber":', 400],
      ['{"__proto__":{"polluted":true}}', 400],
    ]) {
      const response = await fetch(`${base}/api/Customer/memberlogin`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body,
      });
      assert.equal(response.status, status);
      await response.arrayBuffer();
    }
    assert.equal({}.polluted, undefined);
  });
});

test("production disables documentation and has no default browser origin", async () => {
  const previous = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";
  try {
    await withApp(async (base) => {
      for (const path of ["swagger", "swagger-json"]) {
        const response = await fetch(`${base}/${path}`);
        assert.equal(response.status, 404);
        await response.arrayBuffer();
      }
      const response = await fetch(`${base}/health`, { headers: { Origin: "http://localhost:5173" } });
      assert.equal(response.headers.get("access-control-allow-origin"), null);
      assert.match(response.headers.get("strict-transport-security"), /max-age=31536000/);
      await response.arrayBuffer();
    });
  } finally {
    if (previous === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previous;
  }
});
