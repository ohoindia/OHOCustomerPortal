const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const source = fs.readFileSync(
  path.resolve(__dirname, "../src/lib/validation.ts"),
  "utf8",
);
const js = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const validation = import(
  `data:text/javascript;base64,${Buffer.from(js).toString("base64")}`
);
test("sessions require a live token, expiry, and linked individual or community account", async () => {
  const { validSession } = await validation;
  const now = Date.parse("2026-10-02T00:00:00Z");
  const session = {
    token: "test",
    expiresAt: "2026-10-03T00:00:00Z",
    member: { MemberId: 7 },
  };
  assert.equal(validSession(session, now), true);
  assert.equal(
    validSession(
      { ...session, member: { MemberId: 0, CommunityCustomerId: 9 } },
      now,
    ),
    true,
  );
  for (const bad of [
    null,
    {},
    { ...session, token: "" },
    { ...session, expiresAt: "invalid" },
    { ...session, expiresAt: "2026-10-01T00:00:00Z" },
    { ...session, member: {} },
  ])
    assert.equal(validSession(bad, now), false);
});
test("appointments use India time independent of device timezone", async () => {
  const { indiaAppointment } = await validation;
  assert.equal(
    indiaAppointment(
      "2026-10-03 10:30",
      Date.parse("2026-10-02T00:00:00Z"),
    ).toISOString(),
    "2026-10-03T05:00:00.000Z",
  );
});
test("appointments reject past dates, invalid days, and invalid time components", async () => {
  const { indiaAppointment } = await validation;
  const now = Date.parse("2026-01-01T00:00:00Z");
  for (const bad of [
    "",
    "2025-12-31 10:30",
    "2026-02-29 10:30",
    "2026-04-31 10:30",
    "2026-13-01 10:30",
    "2026-10-03 24:00",
    "2026-10-03 10:60",
    "2026-10-03T10:30Z",
  ])
    assert.equal(indiaAppointment(bad, now), null, bad);
  assert.equal(
    indiaAppointment("2028-02-29 10:30", now).toISOString(),
    "2028-02-29T05:00:00.000Z",
  );
});
