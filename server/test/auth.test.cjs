require("reflect-metadata");
const assert = require("node:assert/strict");
const { test } = require("node:test");
const { JwtService } = require("@nestjs/jwt");
const { SessionService } = require("../dist/auth/session.service");

const secret = "test-only-random-secret-with-more-than-32-characters";
const jwt = new JwtService();
const identity = { customerId: 12, communityCustomerId: 0, groupId: 0 };

test("mobile sessions survive ordinary expiry and revoke after password changes", async () => {
  const state = fixture();
  const result = await state.sessions.issue(identity, "4321", true);
  const claims = await state.sessions.verify(result.JwtToken);
  assert.equal(claims.exp, 253402300799);
  assert.equal(result.expiresAt, "9999-12-31T23:59:59.000Z");
  state.setAccount({ Password: "5678", IsActive: true });
  await assert.rejects(state.sessions.verify(result.JwtToken), error => error.getStatus() === 401);
});
function fixture(settings = {}) {
  let account = {
    Password: "4321",
    IsActive: true,
    MobileNumber: "9876543210",
  };
  const config = {
    async get(key, fallback = "") {
      return { JWT_SECRET: secret, ...settings }[key] ?? fallback;
    },
    async getSecret(key) {
      return this.get(key);
    },
  };
  const sessions = new SessionService(jwt, config, {
    async rows() {
      return account ? [account] : [];
    },
  });
  return {
    sessions,
    setAccount: (value) => {
      account = value;
    },
  };
}

test("JWT issuance sets a one-hour expiry, issuer, audience, subject and unique ID", async () => {
  const { sessions } = fixture();
  const result = await sessions.issue(identity, "4321");
  const claims = await sessions.verify(result.JwtToken);
  assert.equal(claims.sub, "customer:12");
  assert.equal(claims.exp - claims.iat, 3600);
  assert.equal(claims.iss, "oho-customer-server");
  assert.equal(claims.aud, "oho-customer-app");
  assert.equal(new Date(claims.exp * 1000).toISOString(), result.expiresAt);
  assert.ok(claims.jti);
  assert.equal(claims.password, undefined);
});

test("JWT verification rejects tampering, expiry, incorrect keys, algorithms, issuer and audience", async () => {
  const { sessions } = fixture();
  const { JwtToken } = await sessions.issue(identity, "4321");
  const original = jwt.decode(JwtToken);
  const withoutExpiry = { ...original };
  delete withoutExpiry.exp;
  for (const token of [
    "bad-token",
    JwtToken.slice(0, -10) + "tampered00",
    jwt.sign(
      { ...original, exp: Math.floor(Date.now() / 1000) - 1 },
      { secret, algorithm: "HS256" },
    ),
    jwt.sign(original, {
      secret: "another-32-character-secret-for-tests",
      algorithm: "HS256",
    }),
    jwt.sign(original, { secret, algorithm: "HS384" }),
    jwt.sign({ ...original, iss: "another-service" }, { secret }),
    jwt.sign({ ...original, aud: "another-client" }, { secret }),
    jwt.sign(withoutExpiry, { secret }),
    jwt.sign({ ...original, sub: "customer:99" }, { secret }),
  ])
    await assert.rejects(
      sessions.verify(token),
      (error) => error.getStatus() === 401,
    );
});

test("password changes, disabled accounts, and deleted accounts revoke issued tokens", async () => {
  const fixtureState = fixture();
  const { JwtToken } = await fixtureState.sessions.issue(identity, "4321");
  for (const account of [
    { Password: "1234", IsActive: true },
    { Password: "4321", IsActive: false },
    null,
  ]) {
    fixtureState.setAccount(account);
    await assert.rejects(
      fixtureState.sessions.verify(JwtToken),
      (error) => error.getStatus() === 401,
    );
  }
});

test("JWT configuration fails closed for missing secrets and invalid lifetimes", async () => {
  for (const settings of [
    { JWT_SECRET: "" },
    { JWT_SECRET: "short" },
    { JWT_TTL_SECONDS: "0" },
    { JWT_TTL_SECONDS: "86401" },
    { JWT_TTL_SECONDS: "invalid" },
  ]) {
    await assert.rejects(
      fixture(settings).sessions.issue(identity, "4321"),
      (error) => error.getStatus() === 503,
    );
  }
});

test("community tokens cannot acquire customer access and group membership changes invalidate them", async () => {
  const state = fixture();
  state.setAccount({
    Password: "4321",
    MobileNumber: "9876543210",
    GroupId: 3,
  });
  const { JwtToken } = await state.sessions.issue(
    { customerId: 0, communityCustomerId: 4, groupId: 3 },
    "4321",
  );
  assert.equal((await state.sessions.verify(JwtToken)).customerId, 0);
  state.setAccount({
    Password: "4321",
    MobileNumber: "9876543210",
    GroupId: 9,
  });
  await assert.rejects(
    state.sessions.verify(JwtToken),
    (error) => error.getStatus() === 401,
  );
});
