import { useState } from "react";
import { Button, Card, Copy, Heading, Page, Status } from "../components/ui";
import { Choice } from "../components/Choice";
import HealthBalanceCard from "../components/HealthBalanceCard";
import { getSession } from "../lib/session";
import { useData, value, type Row } from "../lib/data";
import { categories, walletStatement } from "../lib/wallet";
import { savingsCurrency } from "../../../common/utils/savings";
import { formatHomeDate } from "../../../common";
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
          <Heading>Transaction statement</Heading>
          <Copy>Benefit credits and usage - Latest first</Copy>
          <Choice
            label="Filter transactions"
            options={categories}
            selected={filter}
            onSelect={setFilter}
          />
          {!statement.length && (
            <Copy>
              Subscription credits and completed care will appear here.
            </Copy>
          )}
          {statement.map((entry, i) => {
            const id = `${value(entry.row, "BookingConsultationId")}:${i}`;
            return (
              <Card key={id}>
                <Copy>
                  {formatHomeDate(
                    value(entry.row, "AppointmentDate") ||
                      value(entry.row, "BookingDate"),
                  )}
                </Copy>
                <Heading>
                  {entry.credit
                    ? "Subscription benefits added"
                    : value(entry.row, "HospitalName") ||
                      value(entry.row, "ServiceName")}
                </Heading>
                <Copy>
                  {entry.category} · {value(entry.row, "Name")}
                </Copy>
                <Heading>
                  {entry.isOpd
                    ? `${entry.credit ? "+" : "−"}${entry.visits} OPD`
                    : entry.saved === null
                      ? "Not recorded"
                      : `${entry.credit ? "+" : "−"}${savingsCurrency(entry.saved)}`}
                </Heading>
                <Copy>
                  Remaining:{" "}
                  {entry.remainingAmount === null
                    ? "Not recorded"
                    : savingsCurrency(entry.remainingAmount)}
                  {entry.remainingOpds !== null
                    ? ` (${entry.remainingOpds} OPDs)`
                    : ""}
                </Copy>
                <Button
                  title={expanded === id ? "Hide details" : "View details"}
                  secondary
                  onPress={() => setExpanded(expanded === id ? null : id)}
                />
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
