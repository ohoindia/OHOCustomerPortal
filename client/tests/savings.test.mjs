import assert from "node:assert/strict";
import test from "node:test";
import { loadModule } from "./load-common.mjs";
const { consultationSavings } = loadModule("../../common/utils/savings.ts");
test("customer 42463: four visited consultations including family and two initiated bookings", () => {
  const rows = [
    {
      BookingConsultationId: 1304,
      DependentCustomerId: 42464,
      StatusName: "Visited",
      Appointment: null,
      PoliciesType: "Free Consultation",
      TotalAmount: 0,
      PaidAmount: 0,
    },
    {
      BookingConsultationId: 1305,
      DependentCustomerId: 42464,
      StatusName: "Visited",
      Appointment: null,
      PoliciesType: "Free Consultation",
      TotalAmount: 0,
      PaidAmount: 0,
    },
    {
      BookingConsultationId: 1306,
      DependentCustomerId: 42464,
      StatusName: "Initiated",
      Appointment: null,
      PoliciesType: null,
    },
    {
      BookingConsultationId: 1366,
      StatusName: "Visited",
      Appointment: null,
      PoliciesType: "Free Consultation",
      TotalAmount: 0,
      PaidAmount: 0,
    },
    {
      BookingConsultationId: 1367,
      StatusName: "Visited",
      Appointment: null,
      PoliciesType: "Free Consultation",
      TotalAmount: 0,
      PaidAmount: 0,
    },
    {
      BookingConsultationId: 1368,
      StatusName: "Initiated",
      Appointment: null,
      PoliciesType: null,
    },
  ];
  const savings = consultationSavings(rows);
  assert.equal(savings.total, 2000);
  assert.equal(savings.remaining, 35000);
});

test("visited lab and pharmacy bookings use policy type when appointment is missing", () => {
  const result = consultationSavings([
    {
      StatusName: "Visited",
      PoliciesType: "Lab Investigation",
      Appointment: " ",
      TotalAmount: "1500",
      PaidAmount: "1200",
    },
    {
      StatusName: "Visited",
      PoliciesType: "Pharmacy Discount",
      Appointment: null,
      TotalAmount: "600",
      PaidAmount: "500",
    },
    { StatusName: "Cancelled", PoliciesType: "Free Consultation" },
  ]);
  assert.equal(result.total, 400);
});
test("primary and family visits contribute to the same savings total", () => {
  const result = consultationSavings([
    { CustomerId: 12, Appointment: "Free Consultation", StatusName: "Success" },
    {
      CustomerId: 12,
      DependentCustomerId: 15,
      Appointment: "Free Consultation",
      StatusName: "Success",
    },
    {
      CustomerId: 15,
      Appointment: "Lab Investigation",
      StatusName: "Success",
      TotalAmount: 1000,
      PaidAmount: 750,
    },
    {
      CustomerId: 15,
      Appointment: "Free Consultation",
      StatusName: "Initiated",
    },
  ]);
  assert.equal(result.total, 1250);
  assert.equal(result.remaining, 35750);
});
test("only successful visits count, with fixed consultation and actual discounts", () => {
  const result = consultationSavings([
    {
      Appointment: "Free Consultation",
      StatusName: "Success",
      TotalAmount: 800,
      PaidAmount: 0,
    },
    {
      Appointment: "Lab Investigation",
      StatusName: "Successful",
      TotalAmount: "1200.50",
      PaidAmount: "900",
    },
    {
      Appointment: "Pharmacy Discount",
      StatusName: "Success",
      TotalAmount: 500,
      PaidAmount: 450,
    },
    { Appointment: "Free Consultation", StatusName: "Initiated" },
    { Appointment: "Free Consultation", StatusName: "Cancelled" },
  ]);
  assert.equal(result.total, 850.5);
  assert.equal(result.remaining, 36149.5);
  assert.equal(result.freeConsultation, 500);
});
test("invalid amounts cannot inflate savings and remaining value stays nonnegative", () => {
  const rows = [
    { Appointment: "Lab Investigation", TotalAmount: 500, PaidAmount: null },
    {
      Appointment: "Pharmacy Discount",
      TotalAmount: "invalid",
      PaidAmount: 20,
    },
    { Appointment: "Lab Investigation", TotalAmount: 10, PaidAmount: 20 },
    { Appointment: "Other", TotalAmount: 500, PaidAmount: 0 },
  ].map((row) => ({ ...row, StatusName: "Success" }));
  assert.equal(consultationSavings(rows).total, 0);
  assert.equal(
    consultationSavings(
      Array.from({ length: 80 }, () => ({
        Appointment: "Free Consultation",
        StatusName: "Success",
      })),
    ).remaining,
    0,
  );
});
