import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import DateBadge from "../components/DateBadge";
import { translate } from "../lib/localization";
import { Page, Status } from "../components/ui";
import HealthBalanceCard from "../components/HealthBalanceCard";
import { getSession } from "../lib/session";
import { useData, value, type Row } from "../lib/data";
import { categories, walletStatement } from "../lib/wallet";
import { savingsCurrency } from "../../../common/utils/savings";

export default function Wallet() {
  const customerId = getSession()!.member.MemberId;
  const data = useData<Row[]>(
    "api/BookingConsultation/PendingAndSuccessConsultationList",
    { customerId },
  );
  const opds = useData<Row[]>("api/BookingConsultation/walletOpds", {
    customerId,
  });
  const [filter, setFilter] = useState(categories[0]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const summary = opds.data?.[0];
  const statement = walletStatement(data.data ?? [], summary).filter(
    (entry) =>
      filter === categories[0] ||
      entry.category === filter ||
      (filter === categories[4] && entry.credit) ||
      (entry.category === "Labs & medicines" &&
        [categories[2], categories[3]].includes(filter)),
  );
  const loading = data.loading || opds.loading;
  const error = data.error || opds.error;
  return (
    <Page title="Wallet & Balance" back={false}>
      <Status
        loading={loading}
        error={error}
        retry={() => {
          data.retry();
          opds.retry();
        }}
      />
      {!loading && !error && (
        <>
          <HealthBalanceCard summary={summary} rows={data.data ?? []} />
          <View style={w.statement}>
            <View style={w.headingRow}>
              <Text style={w.heading}>
                {translate("Transaction statement")}
              </Text>
              <Text style={w.small}>
                {statement.length} {translate("transactions")}
              </Text>
            </View>
            <Text style={w.subtitle}>
              {translate("Benefit credits and usage - Latest first")}
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={w.filters}
              accessibilityLabel={translate("Filter transactions")}
            >
              {categories.map((category) => (
                <Pressable
                  key={category}
                  accessibilityRole="button"
                  accessibilityState={{ selected: filter === category }}
                  onPress={() => setFilter(category)}
                  style={[w.filter, filter === category && w.activeFilter]}
                >
                  <Text
                    style={[
                      w.filterText,
                      filter === category && w.activeFilterText,
                    ]}
                  >
                    {translate(category)}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
            {!statement.length && (
              <View style={w.empty}>
                <Text style={w.heading}>
                  {translate("No transactions yet")}
                </Text>
                <Text style={w.subtitle}>
                  {translate(
                    "Subscription credits and completed care will appear here.",
                  )}
                </Text>
              </View>
            )}
            {statement.map((entry, i) => {
              const id = `${value(entry.row, "BookingConsultationId")}:${i}`;
              const open = expanded === id;
              const remaining =
                entry.remainingAmount === null
                  ? translate("Not recorded")
                  : savingsCurrency(entry.remainingAmount);
              const tone = entry.isOpd
                ? ["#007ca8", "#e7f6fc"]
                : entry.category === categories[2]
                  ? ["#148360", "#e7f7ef"]
                  : ["#626098", "#f0eff9"];
              const grant = summary?.subscriptionCredit as Row | undefined;
              const details = [
                [
                  entry.credit
                    ? "Subscription reference"
                    : "Transaction reference",
                  entry.credit
                    ? String(grant?.reference || translate("Not recorded"))
                    : value(entry.row, "BookingConsultationId") ||
                      translate("Not recorded"),
                ],
                ["Status", translate(entry.credit ? "Added" : "Completed")],
                [
                  entry.credit ? "Benefit value" : "Benefit applied",
                  entry.saved === null
                    ? translate("Not recorded")
                    : savingsCurrency(entry.saved),
                ],
                [
                  entry.isOpd
                    ? "Remaining OPD benefit"
                    : "Remaining lab & medicine subsidy",
                  `${remaining}${entry.remainingOpds !== null ? ` (${entry.remainingOpds} ${translate("OPDs")})` : ""}`,
                ],
                ...(!entry.isOpd && !entry.credit
                  ? ["TotalAmount", "PaidAmount"].map((key, index) => [
                      index ? "Paid amount" : "Bill amount",
                      entry.row[key] != null &&
                      entry.row[key] !== "" &&
                      Number.isFinite(Number(entry.row[key])) &&
                      Number(entry.row[key]) >= 0
                        ? savingsCurrency(Number(entry.row[key]))
                        : translate("Not recorded"),
                    ])
                  : []),
              ];
              return (
                <View key={id}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ expanded: open }}
                    onPress={() => setExpanded(open ? null : id)}
                    style={({ pressed }) => [
                      w.row,
                      pressed && { opacity: 0.65 },
                    ]}
                  >
                    <View style={w.descriptionRow}>
                      <DateBadge
                        value={
                          value(entry.row, "AppointmentDate") ||
                          value(entry.row, "BookingDate")
                        }
                        time
                        compact
                      />
                      <View style={w.description}>
                        <Text
                          style={[
                            w.badge,
                            { color: tone[0], backgroundColor: tone[1] },
                          ]}
                        >
                          {translate(entry.category)}
                        </Text>
                        <Text style={w.name}>
                          {entry.credit
                            ? translate("Subscription benefits added")
                            : value(entry.row, "HospitalName") ||
                              value(entry.row, "ServiceName") ||
                              translate(entry.category)}
                        </Text>
                        <Text style={w.small}>
                          {entry.credit
                            ? translate("Family account")
                            : value(entry.row, "Name") ||
                              translate("Family member")}
                        </Text>
                        <Text style={w.note}>
                          {translate(
                            entry.credit
                              ? "Subscription credit"
                              : entry.isOpd
                                ? "OPD benefit used"
                                : "Shared benefit used",
                          )}
                        </Text>
                      </View>
                    </View>
                    <View style={w.amounts}>
                      <Text
                        style={[w.amount, entry.credit && { color: "#19734f" }]}
                      >
                        {entry.isOpd
                          ? `${entry.credit ? "+" : "\u2212"}${entry.visits} ${translate("OPD")}`
                          : entry.saved === null
                            ? translate("Not recorded")
                            : `${entry.credit ? "+" : "\u2212"}${savingsCurrency(entry.saved)}`}
                      </Text>
                      {entry.isOpd && (
                        <Text style={w.amountNote}>
                          {savingsCurrency(
                            entry.credit ? entry.visits * 500 : 500,
                          )}{" "}
                          {translate(
                            entry.credit ? "Benefit value" : "Benefit applied",
                          )}
                        </Text>
                      )}
                      <Text style={w.amountNote}>
                        {translate("Remaining")}: {remaining}
                        {entry.remainingOpds !== null
                          ? ` (${entry.remainingOpds} ${translate("OPDs")})`
                          : ""}
                      </Text>
                      <Text style={w.amountNote}>
                        {translate(entry.credit ? "Added" : "Used")}{" "}
                        {open ? "\u2303" : "\u2304"}
                      </Text>
                    </View>
                  </Pressable>
                  {open && (
                    <View style={w.details}>
                      {details.map(([label, text]) => (
                        <View key={label} style={w.detailRow}>
                          <Text style={w.detailLabel}>{translate(label)}</Text>
                          <Text style={w.detailValue}>{text}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </>
      )}
    </Page>
  );
}
const w = StyleSheet.create({
  statement: {
    borderWidth: 1,
    borderColor: "#e2e8ef",
    borderRadius: 12,
    padding: 14,
    backgroundColor: "#fff",
  },
  headingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 8,
  },
  heading: { fontFamily: "JakartaBold", fontSize: 15, color: "#19364e" },
  subtitle: {
    fontFamily: "Inter",
    fontSize: 11,
    lineHeight: 18,
    color: "#607080",
    marginTop: 7,
  },
  small: {
    fontFamily: "Inter",
    fontSize: 10,
    lineHeight: 16,
    color: "#607080",
  },
  filters: { gap: 6, paddingTop: 14, paddingBottom: 10 },
  filter: {
    minHeight: 44,
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#dce5eb",
    borderRadius: 22,
    paddingHorizontal: 12,
  },
  activeFilter: { backgroundColor: "#123d63", borderColor: "#123d63" },
  filterText: { fontFamily: "Inter", fontSize: 11, color: "#526577" },
  activeFilterText: { color: "#fff" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 17,
    borderBottomWidth: 1,
    borderColor: "#eef1f5",
    gap: 12,
  },
  descriptionRow: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  description: { flex: 1, minWidth: 0, gap: 4 },
  badge: {
    alignSelf: "flex-start",
    flexShrink: 1,
    fontFamily: "InterSemiBold",
    fontSize: 10,
    lineHeight: 15,
    paddingVertical: 3,
    paddingHorizontal: 7,
    borderRadius: 6,
  },
  name: {
    fontFamily: "InterSemiBold",
    fontSize: 12,
    lineHeight: 18,
    color: "#19364e",
  },
  note: { fontFamily: "Inter", fontSize: 9, lineHeight: 14, color: "#7a8794" },
  amounts: { width: "32%", minWidth: 0, gap: 5, alignItems: "flex-end" },
  amount: {
    fontFamily: "JakartaBold",
    fontSize: 13,
    color: "#19364e",
    fontVariant: ["tabular-nums"],
    textAlign: "right",
  },
  amountNote: {
    fontFamily: "Inter",
    fontSize: 10,
    lineHeight: 15,
    color: "#7a8794",
    textAlign: "right",
  },
  empty: {
    padding: 22,
    borderRadius: 10,
    backgroundColor: "#f7fafb",
    alignItems: "center",
  },
  details: {
    backgroundColor: "#f7f9fc",
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    gap: 10,
  },
  detailRow: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  detailLabel: {
    flex: 1,
    fontFamily: "Inter",
    fontSize: 11,
    lineHeight: 17,
    color: "#607080",
  },
  detailValue: {
    flex: 1,
    fontFamily: "InterSemiBold",
    fontSize: 11,
    lineHeight: 17,
    color: "#19364e",
    textAlign: "right",
  },
});
