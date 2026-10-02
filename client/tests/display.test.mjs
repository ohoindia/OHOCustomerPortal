import assert from "node:assert/strict";
import test from "node:test";
import { loadModule } from "./load-common.mjs";

test("shared membership display distinguishes loading, missing membership, failed requests and empty cards", () => {
  const { membershipState } = loadModule("../../common/utils/membership.ts");
  assert.equal(membershipState(null), "Loading membership...");
  assert.equal(
    membershipState({ hasMember: false, membershipLoaded: false, card: null }),
    "No membership card",
  );
  assert.equal(
    membershipState({ hasMember: true, membershipLoaded: false, card: null }),
    "Membership unavailable",
  );
  assert.equal(
    membershipState({ hasMember: true, membershipLoaded: true, card: null }),
    "No membership card",
  );
  assert.equal(
    membershipState({ hasMember: true, membershipLoaded: true, card: {} }),
    "OHO Membership Card",
  );
});

test("appointment display preserves the distinction between pending, failed and successful empty requests", () => {
  const { appointmentState } = loadModule("../../common/utils/home.ts");
  assert.equal(appointmentState(0, undefined), "No upcoming appointments");
  assert.equal(appointmentState(7, undefined), "Loading appointment...");
  assert.equal(appointmentState(7, null), "Appointments unavailable");
  assert.equal(appointmentState(7, []), "No upcoming appointments");
});

test("web and mobile share special membership badges and dynamic messages without changing user data", () => {
  const { membershipBadge } = loadModule("../../common/utils/membership.ts");
  const { UI_MESSAGES } = loadModule("../../common/content/labels.ts");
  assert.equal(membershipBadge("Expires today"), "TODAY");
  assert.equal(membershipBadge("Expiry not provided"), "UNKNOWN");
  assert.equal(membershipBadge("Not started"), "PENDING");
  assert.equal(membershipBadge("Active"), "ACTIVE");
  assert.equal(UI_MESSAGES.resendOtpInS(12), "Resend OTP in 12s");
  assert.equal(UI_MESSAGES.ageInYears(0), "0 years");
  assert.equal(
    UI_MESSAGES.relationshipSuffix("Parent & guardian"),
    " (Parent & guardian)",
  );
});
