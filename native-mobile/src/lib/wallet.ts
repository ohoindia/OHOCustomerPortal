import {
  consultationSavings,
  transactionBalances,
  LAB_MEDICINE_BENEFIT_VALUE,
} from "../../../common/utils/savings";
import { value, type Row } from "./data";
export const categories = [
  "All transactions",
  "OPD consultations",
  "Lab investigations",
  "Medicines",
  "Subscription credits",
];
type Entry = {
  row: Row;
  category: string;
  saved: number | null;
  credit: boolean;
  visits: number;
};
export function walletStatement(rows: Row[], summary?: Row) {
  const recorded = (amount: unknown) =>
    amount != null &&
    amount !== "" &&
    Number.isFinite(Number(amount)) &&
    Number(amount) >= 0;
  const grant = summary?.subscriptionCredit as Row | undefined;
  const credits: Entry[] = grant
    ? [
        {
          row: {
            BookingConsultationId: `subscription-opd-${grant.reference}`,
            AppointmentDate: grant.date,
            ServiceName: "Subscription benefits added",
            Name: "Family account",
          },
          category: categories[1],
          saved: Number(grant.opds) * 500,
          visits: Number(grant.opds),
          credit: true,
        },
        {
          row: {
            BookingConsultationId: `subscription-shared-${grant.reference}`,
            AppointmentDate: grant.date,
            ServiceName: "Subscription benefits added",
            Name: "Family account",
          },
          category: "Labs & medicines",
          saved: Number(grant.labAndMedicines),
          visits: 0,
          credit: true,
        },
      ]
    : [];
  const transactions = rows
    .flatMap<Entry>((row) => {
      if (
        !/^(visited|success|successful|successful visit)$/i.test(
          value(row, "StatusName").trim(),
        )
      )
        return [];
      const policy = (
        value(row, "Appointment").trim() || value(row, "PoliciesType")
      )
        .trim()
        .toLowerCase();
      const category =
        policy === "free consultation"
          ? categories[1]
          : policy === "lab investigation"
            ? categories[2]
            : policy === "pharmacy discount"
              ? categories[3]
              : null;
      return category
        ? [
            {
              row,
              category,
              credit: false,
              visits: 1,
              saved:
                category === categories[1] ||
                (recorded(row.TotalAmount) && recorded(row.PaidAmount))
                  ? consultationSavings([row]).total
                  : null,
            },
          ]
        : [];
    })
    .concat(credits)
    .sort(
      (a, b) =>
        (Date.parse(String(b.row.AppointmentDate || b.row.BookingDate || "")) ||
          0) -
        (Date.parse(String(a.row.AppointmentDate || a.row.BookingDate || "")) ||
          0),
    );
  return transactionBalances(
    [...transactions]
      .reverse()
      .map((entry) => ({ ...entry, isOpd: entry.category === categories[1] })),
    grant ? 0 : Number(summary?.totalOpds ?? 0),
    grant ? 0 : LAB_MEDICINE_BENEFIT_VALUE,
  ).reverse();
}
