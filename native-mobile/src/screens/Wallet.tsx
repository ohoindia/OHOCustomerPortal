import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { getLocaleTag, translate as t } from "../../../common/content/locale";
import {
  consultationSavings,
  LAB_MEDICINE_BENEFIT_VALUE,
  savingsCurrency,
  walletBalances,
} from "../../../common/utils/savings";
import { Page, Status } from "../components/ui";
import { getSession } from "../lib/session";
import { children, useData, value, type Row } from "../lib/data";

const categories = [
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
function recorded(amount: unknown) {
  return (
    amount != null &&
    amount !== "" &&
    Number.isFinite(Number(amount)) &&
    Number(amount) >= 0
  );
}
function amount(number: unknown) {
  return recorded(number) ? savingsCurrency(Number(number)) : t("Not recorded");
}
function date(number: unknown) {
  if (!number) return t("Date unavailable");
  const parsed = new Date(String(number));
  return Number.isNaN(parsed.getTime())
    ? t("Date unavailable")
    : new Intl.DateTimeFormat(getLocaleTag(), {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "Asia/Kolkata",
      }).format(parsed);
}
export default function Wallet() {
  const [filter, setFilter] = useState(categories[0]);
  const [expanded, setExpanded] = useState("");
  const customerId = getSession()!.member.MemberId;
  const data = useData<Row[]>(
    "api/BookingConsultation/PendingAndSuccessConsultationList",
    { customerId },
  );
  const opds = useData<Row[]>("api/BookingConsultation/walletOpds", {
    customerId,
  });
  const summary = opds.data?.[0];
  const remaining = Number(summary?.availableOpds ?? 0);
  const savings = consultationSavings(data.data ?? []);
  const balances = walletBalances(remaining, savings);
  const grant = summary?.subscriptionCredit as Row | undefined;
  const entries = (data.data ?? []).flatMap<Entry>((row) => {
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
            : "";
    return category
      ? [
          {
            row,
            category,
            saved:
              category === categories[1] ||
              (recorded(row.TotalAmount) && recorded(row.PaidAmount))
                ? consultationSavings([row]).total
                : null,
            credit: false,
            visits: 1,
          },
        ]
      : [];
  });
  if (grant) {
    for (const isOpd of [true, false])
      entries.push({
        row: {
          BookingConsultationId: `subscription-${isOpd ? "opd" : "shared"}-${grant.reference}`,
          AppointmentDate: grant.date,
        },
        category: isOpd ? categories[1] : "Labs & medicines",
        saved: isOpd ? Number(grant.opds) * 500 : Number(grant.labAndMedicines),
        credit: true,
        visits: isOpd ? Number(grant.opds) : 0,
      });
  }
  entries.sort(
    (a, b) =>
      (Date.parse(String(b.row.AppointmentDate || b.row.BookingDate || "")) ||
        0) -
      (Date.parse(String(a.row.AppointmentDate || a.row.BookingDate || "")) ||
        0),
  );
  const shown = entries.filter(
    (entry) =>
      filter === categories[0] ||
      (filter === categories[4] && entry.credit) ||
      filter === entry.category ||
      (entry.category === "Labs & medicines" &&
        [categories[2], categories[3]].includes(filter)),
  );
  const ready = !data.loading && !opds.loading && !data.error && !opds.error;
  const members = summary ? children(summary, "members") : [];
  return (
    <Page title="Health Account" back={false}>
      <Status
        loading={data.loading || opds.loading}
        error={data.error || opds.error}
        retry={() => {
          data.retry();
          opds.retry();
        }}
      />
      {ready && (
        <>
          <View style={s.balance}>
            <View style={s.sectionHeading}>
              <Text style={s.whiteLabel}>{t("Available health benefits")}</Text>
              <Text style={s.badge}>{t("Family account")}</Text>
            </View>
            <View style={s.accounts}>
              <View style={s.opdAccount}>
                <Text style={s.balanceLabel}>{t("Available OPDs")}</Text>
                <Text style={s.balanceValue}>
                  {remaining} <Text style={s.unit}>{t("visits")}</Text>
                </Text>
                <Text style={s.balanceCopy}>
                  {Number(summary?.usedOpds ?? 0)} {t("used")} ·{" "}
                  {Number(summary?.totalOpds ?? 0)} {t("included")}
                </Text>
                <Text style={s.balanceCopy}>
                  {savingsCurrency(500)} {t("benefit per OPD visit")}
                </Text>
              </View>
              <View style={s.sharedAccount}>
                <Text style={s.balanceLabel}>
                  {t("Lab & medicine benefit")}
                </Text>
                <Text style={s.balanceValue}>
                  {savingsCurrency(balances.labAndMedicines)}
                </Text>
                <Text style={s.balanceCopy}>
                  {t("Shared allowance")} ·{" "}
                  {savingsCurrency(LAB_MEDICINE_BENEFIT_VALUE)}
                </Text>
              </View>
            </View>
            <View style={s.footer}>
              <Text style={s.balanceCopy}>
                {t("Lab used")}: {savingsCurrency(savings.labInvestigation)} ·{" "}
                {t("Medicine used")}:{" "}
                {savingsCurrency(savings.pharmacyDiscount)}
              </Text>
              {Boolean(summary?.cardExpiry) && (
                <Text style={s.balanceCopy}>
                  {t("Valid until")} {date(summary?.cardExpiry)}
                </Text>
              )}
            </View>
            {summary?.cardValid === false && (
              <Text style={s.note}>
                {t("An active card is required to use remaining benefits.")}
              </Text>
            )}
          </View>
          <View style={s.section}>
            <View style={s.sectionHeading}>
              <Text style={s.heading}>{t("Transaction statement")}</Text>
              <Text style={s.small}>
                {shown.length} {t("transactions")}
              </Text>
            </View>
            <Text style={s.subtitle}>
              {t("Benefit credits and usage - Latest first")}
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.filters}
            >
              {categories.map((category) => (
                <Pressable
                  key={category}
                  accessibilityRole="button"
                  accessibilityState={{ selected: filter === category }}
                  onPress={() => setFilter(category)}
                  style={[s.filter, filter === category && s.activeFilter]}
                >
                  <Text
                    style={[s.filterText, filter === category && s.activeText]}
                  >
                    {t(category)}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
            {!shown.length && (
              <View style={s.empty}>
                <Text style={s.title}>{t("No transactions yet")}</Text>
                <Text style={[s.subtitle, s.center]}>
                  {t(
                    "Subscription credits and completed care will appear here.",
                  )}
                </Text>
              </View>
            )}
            {shown.map(({ row, category, saved, credit, visits }, index) => {
              const id = `${value(row, "BookingConsultationId")}-${index}`;
              const entryDate = date(row.AppointmentDate || row.BookingDate);
              const previous = shown[index - 1]?.row;
              const isOpd = category === categories[1];
              const open = expanded === id;
              const details = [
                [
                  t(
                    credit ? "Subscription reference" : "Transaction reference",
                  ),
                  (credit
                    ? String(grant?.reference || "")
                    : value(row, "BookingConsultationId")) || t("Not recorded"),
                ],
                [t("Date"), entryDate],
                [t("Status"), t(credit ? "Added" : "Completed")],
                [
                  t(credit ? "Benefit value" : "Benefit applied"),
                  saved === null ? t("Not recorded") : savingsCurrency(saved),
                ],
                ...(!isOpd && !credit
                  ? [
                      [t("Bill amount"), amount(row.TotalAmount)],
                      [t("Paid amount"), amount(row.PaidAmount)],
                    ]
                  : []),
              ];
              return (
                <View key={id}>
                  {(!previous ||
                    entryDate !==
                      date(
                        previous.AppointmentDate || previous.BookingDate,
                      )) && <Text style={s.date}>{entryDate}</Text>}
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ expanded: open }}
                    onPress={() => setExpanded(open ? "" : id)}
                    style={s.transaction}
                  >
                    <View
                      style={[
                        s.icon,
                        !isOpd && s.sharedIcon,
                        credit && s.creditIcon,
                      ]}
                    >
                      <Text style={[s.iconText, credit && s.creditText]}>
                        {credit ? "+" : isOpd ? "−1" : "₹"}
                      </Text>
                    </View>
                    <View style={s.description}>
                      <Text style={s.title}>
                        {credit
                          ? t("Subscription benefits added")
                          : value(row, "HospitalName") ||
                            value(row, "ServiceName") ||
                            t(category)}
                      </Text>
                      <Text style={s.small}>
                        {t(category)} ·{" "}
                        {credit
                          ? t("Family account")
                          : value(row, "Name") || t("Family member")}
                      </Text>
                      <Text style={s.caption}>
                        {t(
                          credit
                            ? "Subscription credit"
                            : isOpd
                              ? "OPD benefit used"
                              : "Shared benefit used",
                        )}
                      </Text>
                    </View>
                    <View style={s.debit}>
                      <Text style={[s.amount, credit && s.creditText]}>
                        {isOpd
                          ? `${credit ? "+" : "−"}${visits} ${t("OPD")}`
                          : saved === null
                            ? t("Not recorded")
                            : `${credit ? "+" : "−"}${savingsCurrency(saved)}`}
                      </Text>
                      {isOpd && (
                        <Text style={s.caption}>
                          {savingsCurrency(credit ? visits * 500 : 500)}{" "}
                          {t(credit ? "Benefit value" : "Benefit applied")}
                        </Text>
                      )}
                      <Text style={s.caption}>
                        {t(credit ? "Added" : "Used")} {open ? "⌃" : "⌄"}
                      </Text>
                    </View>
                  </Pressable>
                  {open && (
                    <View style={s.detail}>
                      {details.map(([label, content]) => (
                        <View key={label} style={s.detailRow}>
                          <Text style={s.detailLabel}>{label}</Text>
                          <Text style={s.detailValue}>{content}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
          {members.length > 0 && (
            <View style={s.section}>
              <View style={s.sectionHeading}>
                <Text style={s.heading}>{t("Family OPD usage")}</Text>
                <Text style={s.small}>{t("Current card period")}</Text>
              </View>
              {members.map((member) => (
                <View key={String(member.customerId)} style={s.member}>
                  <Text style={s.title}>{String(member.name)}</Text>
                  <Text style={s.small}>
                    {Number(member.usedOpds ?? 0)} {t("visits used")}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </>
      )}
    </Page>
  );
}
const s = StyleSheet.create({
  balance: { backgroundColor: "#123d63", borderRadius: 16, padding: 18 },
  sectionHeading: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 10,
  },
  whiteLabel: { color: "#fff", fontSize: 12 },
  badge: {
    color: "#fff",
    backgroundColor: "#ffffff16",
    borderWidth: 1,
    borderColor: "#ffffff25",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
    fontSize: 10,
  },
  accounts: { flexDirection: "row", marginTop: 22, marginBottom: 16 },
  opdAccount: { flex: 0.8, paddingRight: 10, gap: 7 },
  sharedAccount: {
    flex: 1.2,
    borderLeftWidth: 1,
    borderColor: "#ffffff30",
    paddingLeft: 12,
    gap: 7,
  },
  balanceLabel: { color: "#d1e5f4", fontSize: 11 },
  balanceValue: {
    color: "#fff",
    fontSize: 23,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  unit: { fontSize: 12, fontWeight: "400" },
  balanceCopy: { color: "#c1d8e9", fontSize: 10, lineHeight: 16 },
  footer: {
    borderTopWidth: 1,
    borderColor: "#ffffff25",
    paddingTop: 14,
    gap: 8,
  },
  note: { color: "#f9dfa5", fontSize: 11, marginTop: 10 },
  section: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e2e8ef",
    borderRadius: 12,
    padding: 18,
  },
  heading: { fontSize: 15, color: "#19364e", fontWeight: "700" },
  subtitle: { color: "#607080", fontSize: 12, lineHeight: 19, marginTop: 8 },
  small: { color: "#607080", fontSize: 10, lineHeight: 16 },
  filters: { gap: 6, paddingTop: 14, paddingBottom: 10 },
  filter: {
    borderWidth: 1,
    borderColor: "#dce5eb",
    borderRadius: 20,
    paddingHorizontal: 12,
    minHeight: 44,
    justifyContent: "center",
  },
  activeFilter: { backgroundColor: "#123d63", borderColor: "#123d63" },
  filterText: { fontSize: 11, color: "#526577" },
  activeText: { color: "#fff" },
  date: {
    marginHorizontal: -18,
    paddingHorizontal: 18,
    paddingVertical: 10,
    backgroundColor: "#f4f7fa",
    color: "#526577",
    fontSize: 10,
    fontWeight: "600",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#e8edf2",
  },
  transaction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 17,
    borderBottomWidth: 1,
    borderColor: "#eef1f5",
  },
  icon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#edf6fb",
    alignItems: "center",
    justifyContent: "center",
  },
  iconText: { color: "#246788", fontSize: 13, fontWeight: "700" },
  sharedIcon: { backgroundColor: "#f0eff9" },
  creditIcon: { backgroundColor: "#eaf7f0" },
  creditText: { color: "#19734f" },
  description: { flex: 1, gap: 3 },
  title: { color: "#19364e", fontSize: 12, lineHeight: 18, fontWeight: "600" },
  caption: { color: "#7a8794", fontSize: 10, marginTop: 4 },
  debit: { maxWidth: "35%", alignItems: "flex-end" },
  amount: {
    color: "#19364e",
    fontSize: 13,
    fontWeight: "700",
    textAlign: "right",
    fontVariant: ["tabular-nums"],
  },
  detail: {
    backgroundColor: "#f7f9fc",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 16,
    paddingVertical: 5,
  },
  detailLabel: { flex: 1, fontSize: 11, color: "#607080" },
  detailValue: { flex: 1, fontSize: 11, color: "#19364e", textAlign: "right" },
  empty: {
    paddingVertical: 26,
    paddingHorizontal: 12,
    alignItems: "center",
    backgroundColor: "#f7fafb",
    borderRadius: 10,
  },
  center: { textAlign: "center" },
  member: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 16,
    paddingVertical: 14,
    marginTop: 12,
    borderTopWidth: 1,
    borderColor: "#e7edf1",
  },
});
