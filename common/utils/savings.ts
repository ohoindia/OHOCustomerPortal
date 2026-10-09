import { getLocaleTag } from "../content/locale";
export const HEALTH_BENEFIT_VALUE = 37000;
export const LAB_MEDICINE_BENEFIT_VALUE = 25000;

export function transactionBalances<T extends {
  credit: boolean;
  saved: number | null;
  visits: number;
  isOpd: boolean;
}>(entries: readonly T[], openingOpds: number, openingShared: number) {
  let opds = openingOpds;
  let shared: number | null = openingShared;
  return entries.map((entry) => {
    const direction = entry.credit ? 1 : -1;
    if (entry.isOpd) opds = Math.max(0, opds + direction * entry.visits);
    else if (entry.saved === null || shared === null) shared = null;
    else shared = Math.max(0, Math.round((shared + direction * entry.saved) * 100) / 100);
    return {
      ...entry,
      remainingAmount: entry.isOpd ? opds * 500 : shared,
      remainingOpds: entry.isOpd ? opds : null,
    };
  });
}

export function walletBalances(
  availableOpds: number,
  savings: { labInvestigation: number; pharmacyDiscount: number },
) {
  const consultation = Math.max(0, availableOpds) * 500;
  const labAndMedicines = Math.max(
    0,
    Math.round(
      (LAB_MEDICINE_BENEFIT_VALUE -
        savings.labInvestigation -
        savings.pharmacyDiscount) *
        100,
    ) / 100,
  );
  return {
    consultation,
    labAndMedicines,
    total: consultation + labAndMedicines,
  };
}

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
  return new Intl.NumberFormat(getLocaleTag(), {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  })
    .format(amount)
    .replace("₹", "₹ ");
}
