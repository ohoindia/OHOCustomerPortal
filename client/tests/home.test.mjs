import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

// Exercise the real service with a mock transport; no customer API is contacted.
function service(
  request = () => {
    throw new Error("Unexpected request");
  },
) {
  const source = readFileSync(
    new URL("../src/services/home.ts", import.meta.url),
    "utf8",
  );
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  });
  const exports = {};
  vm.runInNewContext(outputText, {
    exports,
    Date,
    require: () => ({ apiRequest: request }),
  });
  return exports;
}

test("card and package expiry distinguish yesterday, today, future and missing dates", () => {
  const { expiryStatus, cardStatus } = service();
  const now = new Date(2026, 8, 17, 12);
  assert.equal(expiryStatus("2026-09-16T23:59:00", now), "Expired");
  assert.equal(expiryStatus("2026-09-17T00:00:00", now), "Expires today");
  assert.equal(expiryStatus("2026-09-18T00:00:00", now), "Valid");
  assert.equal(expiryStatus("invalid", now), "Expiry not provided");
  assert.equal(
    cardStatus({ IsActivated: true, EndDate: "2026-09-16" }, now),
    "Expired",
  );
  assert.equal(
    cardStatus({ IsActivated: false, EndDate: "2026-09-18" }, now),
    "Inactive",
  );
  assert.equal(
    cardStatus({ IsActivated: true, EndDate: "2026-09-18" }, now),
    "Active",
  );
});

test("loads every applicable dashboard endpoint once and uses fresh profile for group and KYC", async () => {
  const calls = [];
  const { loadHomeData } = service(async (path, options) => {
    calls.push({ path, ...options });
    if (path.includes("Customer/GetById"))
      return [
        {
          MemberId: 7,
          GroupId: 9,
          AadhaarNumber: "test",
          FaceIdentityImage: "photo",
        },
      ];
    if (path.includes("Group/GetById")) return [{ GroupName: "Community" }];
    if (path.includes("GetMemberProducts"))
      return [
        {
          Products: [
            { ProductName: "Older", IssuedOn: "2025-01-01" },
            { ProductName: "Latest", IssuedOn: "2026-01-01" },
          ],
        },
      ];
    if (path.includes("GetMemberCard"))
      return { status: true, returnData: [{ IsActivated: true }] };
    if (path.includes("ConsultationList")) return [];
    if (path === "ConfigValues/all")
      return [{ ConfigKey: "HealthTip", ConfigValue: "Daily tip" }];
    if (path === "Products/all")
      return [
        { ProductName: "Free", IsFree: true, IsActive: true },
        { ProductName: "Inactive", IsFree: true, IsActive: false },
      ];
    return { status: true };
  });
  const result = await loadHomeData(7, 0, 2, new AbortController().signal);
  assert.equal(calls.length, 10);
  assert.equal(new Set(calls.map((call) => call.path)).size, 10);
  assert.ok(calls.some((call) => call.path === "lambdaAPI/Group/GetById/9"));
  assert.equal(
    calls.find((call) => call.path.endsWith("KYCVerifiedOrNot")).body
      .aadhaarNumber,
    "test",
  );
  assert.equal(result.products[0].ProductName, "Latest");
  assert.equal(result.kyc, true);
  assert.equal(result.freeProducts.length, 1);
  assert.equal(result.config.HealthTip, "Daily tip");
  assert.equal(result.errors.length, 0);
});

test("partial failures retain successful data and distinguish errors from empty records", async () => {
  const { loadHomeData } = service(async (path) => {
    if (path.includes("Customer/GetById")) return [{ MemberId: 7 }];
    if (path.includes("GetMemberCard")) return { status: false };
    if (path.includes("GetMemberProducts")) return [];
    throw new Error("Offline");
  });
  const result = await loadHomeData(7, 0, 0, new AbortController().signal);
  assert.equal(result.customer.MemberId, 7);
  assert.equal(result.membershipLoaded, true);
  assert.equal(result.card, null);
  assert.equal(result.products.length, 0);
  assert.equal(result.appointmentsLoaded, false);
  assert.equal(result.kyc, undefined);
  assert.ok(
    result.errors.includes("Appointments unavailable. Please try again later."),
  );
});

test("latest active package skips expired, inactive and future packages without mutating the list", () => {
  const { latestActivePackage } = service();
  const products = [
    {
      ProductName: "Older active",
      IssuedOn: "2026-01-01",
      ValidTill: "2026-12-31",
    },
    {
      ProductName: "Expired",
      IssuedOn: "2026-09-16",
      ValidTill: "2026-09-16",
      IsActive: true,
    },
    {
      ProductName: "Inactive",
      IssuedOn: "2026-09-15",
      ValidTill: "2026-12-31",
      IsActive: false,
    },
    {
      ProductName: "Latest active",
      IssuedOn: "2026-09-01",
      ValidTill: "2026-09-17",
    },
    { ProductName: "Future", IssuedOn: "2026-10-01", ValidTill: "2026-12-31" },
  ];
  const now = new Date(2026, 8, 17, 12);
  assert.equal(latestActivePackage(products, now).ProductName, "Latest active");
  assert.equal(products[0].ProductName, "Older active");
  assert.equal(latestActivePackage([], now), undefined);
  assert.equal(
    latestActivePackage([{ ProductName: "Unknown" }], now),
    undefined,
  );
});

test("community customers use fallback without sending invalid member requests", async () => {
  const paths = [];
  const { loadHomeData } = service(async (path) => {
    paths.push(path);
    return path.includes("CommunityCustomers")
      ? [{ Name: "Community customer" }]
      : [];
  });
  const result = await loadHomeData(0, 12, 0, new AbortController().signal);
  assert.equal(result.customer.Name, "Community customer");
  assert.equal(paths.length, 3);
  assert.ok(paths.includes("lambdaAPI/CommunityCustomers/GetById/12"));
});

test("upcoming appointments exclude past and cancelled bookings and sort earliest first", () => {
  const { nextAppointment } = service();
  const appointment = (id, date, status = "Booked") => ({
    BookingConsultationId: id,
    AppointmentDate: date,
    StatusName: status,
    IsCouponClaimed: true,
  });
  assert.equal(
    nextAppointment(
      [
        appointment(1, "2026-09-16"),
        appointment(2, "2026-09-18"),
        appointment(3, "2026-09-17", "Cancelled"),
        appointment(4, "2026-09-17"),
      ],
      new Date(2026, 8, 17, 12),
    ).BookingConsultationId,
    4,
  );
});
