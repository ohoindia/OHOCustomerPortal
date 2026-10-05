export const HEALTH_BENEFIT_VALUE = 37000;

type SavingsBooking = {
  Appointment?: unknown;
  PoliciesType?: unknown;
  StatusName?: unknown;
  TotalAmount?: unknown;
  PaidAmount?: unknown;
};

export function consultationSavings(rows: readonly SavingsBooking[]) {
  let freeConsultation = 0;
  let labInvestigation = 0;
  let pharmacyDiscount = 0;
  for (const row of rows) {
    if (
      !/^(visited|success|successful|successful visit)$/i.test(
        String(row.StatusName ?? "").trim(),
      )
    )
      continue;
    const appointment = String(
      String(row.Appointment ?? "").trim() || row.PoliciesType || "",
    )
      .trim()
      .toLowerCase();
    if (appointment === "free consultation") {
      freeConsultation += 500;
      continue;
    }
    if (
      row.TotalAmount == null ||
      row.PaidAmount == null ||
      row.TotalAmount === "" ||
      row.PaidAmount === ""
    )
      continue;
    const total = Number(row.TotalAmount);
    const paid = Number(row.PaidAmount);
    if (
      !Number.isFinite(total) ||
      !Number.isFinite(paid) ||
      total < 0 ||
      paid < 0
    )
      continue;
    const discount = Math.round(Math.max(0, total - paid) * 100) / 100;
    if (appointment === "lab investigation") labInvestigation += discount;
    if (appointment === "pharmacy discount") pharmacyDiscount += discount;
  }
  const total =
    Math.round((freeConsultation + labInvestigation + pharmacyDiscount) * 100) /
    100;
  return {
    freeConsultation,
    labInvestigation,
    pharmacyDiscount,
    total,
    remaining: Math.max(0, HEALTH_BENEFIT_VALUE - total),
  };
}

export function savingsCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  })
    .format(amount)
    .replace("₹", "₹ ");
}
