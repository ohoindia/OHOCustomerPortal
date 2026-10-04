import assert from "node:assert/strict";
import test from "node:test";
import { loadModule } from "./load-common.mjs";

function fixture() {
  const values = new Map();
  const listeners = new Set();
  const sessionStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
  const window = {
    dispatchEvent: () => {
      for (const listener of listeners) listener();
    },
    addEventListener: (_name, listener) => listeners.add(listener),
    removeEventListener: (_name, listener) => listeners.delete(listener),
  };
  return {
    values,
    ...loadModule("../src/pages/auth/session.ts", {
      sessionStorage,
      window,
      Event,
    }),
  };
}

const member = {
  MemberId: 7,
  Name: "Customer",
  CommunityCustomerId: 4,
  GroupId: 3,
};
const response = () => ({
  JwtToken: "test-session",
  expiresAt: new Date(Date.now() + 60000).toISOString(),
});

test("shared session mapping preserves community accounts and clears missing profile fields", () => {
  const { authSessionValues, authSessionKeys } = loadModule(
    "../../common/utils/session.ts",
  );
  const profile = { MemberId: 0, CommunityCustomerId: 12 };
  const values = authSessionValues("token", "expiry", profile);
  assert.equal(values.memberId, "0");
  assert.equal(values.communityCustomerId, "12");
  assert.equal(values.FullName, "");
  assert.equal(values.UserImage, "");
  assert.equal(values.gender, "");
  assert.equal(values.groupId, "");
  assert.equal(values.member, JSON.stringify(profile));
  assert.deepEqual(Object.keys(values).sort(), Array.from(authSessionKeys).sort());
});

test("client persists token and profile, notifies route guards, and clears credentials on logout", () => {
  const session = fixture();
  let notifications = 0;
  const unsubscribe = session.subscribeAuthSession(() => notifications++);
  session.saveAuthSession(response(), member);
  assert.equal(session.getAccessToken(), "test-session");
  assert.equal(session.values.get("memberId"), "7");
  assert.equal(session.values.get("communityCustomerId"), "4");
  session.clearAuthSession();
  assert.equal(session.getAccessToken(), null);
  assert.equal(session.values.get("member"), undefined);
  assert.equal(session.values.get("tokenExpiresAt"), undefined);
  assert.equal(notifications, 2);
  unsubscribe();
});

test("expired and old profile-only sessions cannot authenticate", () => {
  const session = fixture();
  session.values.set("member", JSON.stringify(member));
  assert.equal(session.getAccessToken(), null);
  assert.equal(session.values.get("member"), undefined);
  session.saveAuthSession(response(), member);
  session.values.set("tokenExpiresAt", new Date(0).toISOString());
  assert.equal(session.getAccessToken(), null);
  assert.equal(session.values.get("accessToken"), undefined);
});

test("client rejects login and registration responses without valid token expiry", () => {
  const session = fixture();
  for (const data of [
    {},
    { JwtToken: "token" },
    { JwtToken: "token", expiresAt: "invalid" },
    { JwtToken: "token", expiresAt: new Date(0).toISOString() },
  ]) {
    assert.throws(() => session.saveAuthSession(data, member), /valid session/);
  }
  assert.equal(session.values.size, 0);
});
