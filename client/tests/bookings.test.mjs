import assert from "node:assert/strict";
import test from "node:test";
import { loadModule } from "./load-common.mjs";

const { bookingPeriod } = loadModule("../../common/utils/bookings.ts");
const now = new Date("2026-10-02T10:00:00+05:30");

test("bookings cover past, future and the whole current India day", () => {
  assert.equal(
    bookingPeriod({ AppointmentDate: "2026-10-01" }, now),
    "Previous",
  );
  assert.equal(
    bookingPeriod({ AppointmentDate: "2026-10-03" }, now),
    "Upcoming",
  );
  assert.equal(
    bookingPeriod({ AppointmentDate: "2026-10-02T00:00:00" }, now),
    "Running",
  );
  assert.equal(
    bookingPeriod({ AppointmentDate: "2026-10-01T20:00:00Z" }, now),
    "Running",
  );
});

test("terminal statuses take precedence and undated initiated visits remain visible", () => {
  for (const StatusName of ["Completed", "Cancelled", "Rejected"]) {
    assert.equal(
      bookingPeriod({ StatusName, AppointmentDate: "2026-10-03" }, now),
      "Previous",
    );
  }
  assert.equal(bookingPeriod({ StatusName: "In Progress" }, now), "Running");
  assert.equal(
    bookingPeriod({ StatusName: "Initiated", AppointmentDate: null }, now),
    "Running",
  );
  assert.equal(bookingPeriod({ AppointmentDate: "invalid" }, now), "Running");
});
