import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import DateBadge from "../components/DateBadge";
import { translate } from "../lib/localization";
import { Card, Copy, Heading, Page, Status } from "../components/ui";
import { Choice } from "../components/Choice";
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
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 8,
            }}
          >
            <Heading>Transaction statement</Heading>
            <Copy>
              {statement.length} {translate("transactions")}
            </Copy>
          </View>
          <Copy>Benefit credits and usage - Latest first</Copy>
          <Choice
            label="Filter transactions"
            options={categories}
            selected={filter}
            onSelect={setFilter}
          />
          {!statement.length && (
            <Card>
              <Heading>No transactions yet</Heading>
              <Copy>
                Subscription credits and completed care will appear here.
              </Copy>
            </Card>
          )}
          {statement.map((entry, i) => {
            const id = `${value(entry.row, "BookingConsultationId")}:${i}`;
            return (
              <Card key={id}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ expanded: expanded === id }}
                  onPress={() => setExpanded(expanded === id ? null : id)}
                  style={{ gap: 12 }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 12,
                    }}
                  >
                    <DateBadge
                      value={
                        value(entry.row, "AppointmentDate") ||
                        value(entry.row, "BookingDate")
                      }
                      time
                    />
                    <View style={{ flex: 1, gap: 6 }}>
                      <Text
                        style={{
                          fontSize: 10,
                          color: "#007ca8",
                          backgroundColor: "#e7f6fc",
                          padding: 6,
                          borderRadius: 6,
                          alignSelf: "flex-start",
                        }}
                      >
                        {translate(entry.category)}
                      </Text>
                      <Text
                        style={{
                          fontSize: 13,
                          fontFamily: "InterSemiBold",
                          color: "#142344",
                        }}
                      >
                        {entry.credit
                          ? translate("Subscription benefits added")
                          : value(entry.row, "HospitalName") ||
                            value(entry.row, "ServiceName") ||
                            translate(entry.category)}
                      </Text>
                      <Copy>
                        {entry.credit
                          ? "Family account"
                          : value(entry.row, "Name") || "Family member"}
                      </Copy>
                      <Text style={{ fontSize: 10, color: "#64748b" }}>
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
                  <View style={{ alignItems: "flex-end", gap: 5 }}>
                    <Text
                      style={{
                        fontSize: 17,
                        fontFamily: "JakartaBold",
                        color: entry.credit ? "#168572" : "#142344",
                      }}
                    >
                      {entry.isOpd
                        ? `${entry.credit ? "+" : "−"}${entry.visits} ${translate("OPD")}`
                        : entry.saved === null
                          ? translate("Not recorded")
                          : `${entry.credit ? "+" : "−"}${savingsCurrency(entry.saved)}`}
                    </Text>
                    {entry.isOpd && (
                      <Copy>
                        {savingsCurrency(
                          entry.credit ? entry.visits * 500 : 500,
                        )}{" "}
                        {translate(
                          entry.credit ? "Benefit value" : "Benefit applied",
                        )}
                      </Copy>
                    )}
                    <Copy>
                      {translate("Remaining")}:{" "}
                      {entry.remainingAmount === null
                        ? translate("Not recorded")
                        : savingsCurrency(entry.remainingAmount)}
                      {entry.remainingOpds !== null
                        ? ` (${entry.remainingOpds} ${translate("OPDs")})`
                        : ""}
                    </Copy>
                    <Text style={{ fontSize: 11, color: "#64748b" }}>
                      {translate(entry.credit ? "Added" : "Used")}{" "}
                      {expanded === id ? "⌃" : "⌄"}
                    </Text>
                  </View>
                </Pressable>
                {expanded === id && (
                  <>
                    <Copy>
                      Booking #{value(entry.row, "BookingConsultationId")}
                    </Copy>
                    <Copy>
                      Total bill:{" "}
                      {value(entry.row, "TotalAmount") || "Not recorded"}
                    </Copy>
                    <Copy>
                      Paid: {value(entry.row, "PaidAmount") || "Not recorded"}
                    </Copy>
                    <Copy>
                      Benefit applied:{" "}
                      {entry.saved === null
                        ? "Not recorded"
                        : savingsCurrency(entry.saved)}
                    </Copy>
                  </>
                )}
              </Card>
            );
          })}
        </>
      )}
    </Page>
  );
}
