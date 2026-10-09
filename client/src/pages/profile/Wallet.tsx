import HealthBalanceCard from "../../components/HealthBalanceCard";
import { useState } from "react";
import "../booking/bookings.css";
import {
  getLocaleTag,
  translate as localize,
} from "../../../../common/content/locale";
import {
  consultationSavings,
  savingsCurrency,
  transactionBalances,
  LAB_MEDICINE_BENEFIT_VALUE,
} from "../../../../common/utils/savings";
import { AppShell, PageHeader } from "../../components/Layout";
import { getSessionMember } from "../auth/member";
import { textValue, usePortalData } from "../portal/usePortalData";
import type { PortalRow } from "../portal/usePortalData";

const categories = [
  "All transactions",
  "OPD consultations",
  "Lab investigations",
  "Medicines",
  "Subscription credits",
] as const;
type StatementEntry = {
  row: PortalRow;
  category: string;
  saved: number | null;
  credit: boolean;
  visits: number;
};
function displayDate(value: unknown, includeTime = false) {
  if (!value) return localize("Date unavailable");
  const date = new Date(String(value));
  return Number.isNaN(date.getTime())
    ? localize("Date unavailable")
    : new Intl.DateTimeFormat(getLocaleTag(), {
        day: "numeric",
        month: "short",
        year: "numeric",
        ...(includeTime
          ? {
              hour: "numeric" as const,
              minute: "2-digit" as const,
              hour12: true,
            }
          : {}),
        timeZone: "Asia/Kolkata",
      }).format(date);
}
function isRecordedAmount(value: unknown) {
  return (
    value != null &&
    value !== "" &&
    Number.isFinite(Number(value)) &&
    Number(value) >= 0
  );
}
function amount(value: unknown) {
  return isRecordedAmount(value)
    ? savingsCurrency(Number(value))
    : localize("Not recorded");
}
export function Wallet() {
  const [filter, setFilter] = useState<string>(categories[0]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const memberId = Number(
    getSessionMember()?.MemberId || sessionStorage.getItem("memberId"),
  );
  const data = usePortalData(
    "api/BookingConsultation/PendingAndSuccessConsultationList",
    { customerId: memberId },
  );
  const opds = usePortalData("api/BookingConsultation/walletOpds", {
    customerId: memberId,
  });
  const summary = opds.rows[0];
  const savings = consultationSavings(data.rows);
  const grant = summary?.subscriptionCredit as PortalRow | null | undefined;
  const credits: StatementEntry[] = grant
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
  const transactions = data.rows
    .flatMap<StatementEntry>((row) => {
      if (
        !/^(visited|success|successful|successful visit)$/i.test(
          textValue(row, "StatusName").trim(),
        )
      )
        return [];
      const policy = (
        textValue(row, "Appointment").trim() || textValue(row, "PoliciesType")
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
                (isRecordedAmount(row.TotalAmount) &&
                  isRecordedAmount(row.PaidAmount))
                  ? consultationSavings([row]).total
                  : null,
            },
          ]
        : [];
    })
    .concat(credits)
    .sort((a, b) => {
      const timestamp = (row: typeof a.row) =>
        Date.parse(String(row.AppointmentDate || row.BookingDate || "")) || 0;
      return timestamp(b.row) - timestamp(a.row);
    });
  const statement = transactionBalances(
    [...transactions].reverse().map((entry) => ({
      ...entry,
      isOpd: entry.category === categories[1],
    })),
    grant ? 0 : Number(summary?.totalOpds ?? 0),
    grant ? 0 : LAB_MEDICINE_BENEFIT_VALUE,
  ).reverse();
  const visible = statement.filter(
    (transaction) =>
      filter === categories[0] ||
      transaction.category === filter ||
      (filter === categories[4] && transaction.credit) ||
      (transaction.category === "Labs & medicines" &&
        (filter === categories[2] || filter === categories[3])),
  );
  const error = data.error || opds.error;
  return (
    <AppShell className="health-account-page">
      <PageHeader title={localize("Wallet & Balance")} />
      {data.loading || opds.loading ? (
        <p role="status">{localize("Loading wallet...")}</p>
      ) : error ? (
        <div role="alert">
          <p>{error}</p>
          <button
            onClick={() => {
              data.retry();
              opds.retry();
            }}
          >
            {localize("Retry")}
          </button>
        </div>
      ) : (
        <div className="health-account-content">
          <HealthBalanceCard summary={summary} savings={savings} />
          <section
            className="health-statement"
            aria-labelledby="health-statement-title"
          >
            <div className="health-section-heading">
              <div>
                <h3 id="health-statement-title">
                  {localize("Transaction statement")}
                </h3>
                <p>{localize("Benefit credits and usage - Latest first")}</p>
              </div>
              <span className="health-statement-count">
                {visible.length} {localize("transactions")}
              </span>
            </div>
            <div
              className="health-transaction-filters"
              role="group"
              aria-label={localize("Filter transactions")}
            >
              {categories.map((category) => (
                <button
                  key={category}
                  type="button"
                  aria-pressed={filter === category}
                  onClick={() => setFilter(category)}
                >
                  {localize(category)}
                </button>
              ))}
            </div>
            {visible.length === 0 ? (
              <div className="health-statement-empty">
                <strong>{localize("No transactions yet")}</strong>
                <p>
                  {localize(
                    "Subscription credits and completed care will appear here.",
                  )}
                </p>
              </div>
            ) : (
              <ol className="health-transactions">
                {visible.map(
                  ({ row, category, saved, credit, visits, remainingAmount, remainingOpds }, index) => {
                    const id = `${textValue(row, "BookingConsultationId")}-${index}`;
                    const date = displayDate(
                      row.AppointmentDate || row.BookingDate,
                      true,
                    );
                    const parsedDate = new Date(
                      String(row.AppointmentDate || row.BookingDate || ""),
                    );
                    const badgeDate = Number.isFinite(parsedDate.getTime())
                      ? parsedDate
                      : null;
                    const datePart = (options: Intl.DateTimeFormatOptions) =>
                      badgeDate
                        ? new Intl.DateTimeFormat(getLocaleTag(), {
                            ...options,
                            timeZone: "Asia/Kolkata",
                          }).format(badgeDate)
                        : "?";
                    const isOpd = category === categories[1];
                    const open = expanded === id;
                    return (
                      <li
                        key={id}
                        className={`health-ledger-entry${credit ? " health-ledger-credit" : ""}`}
                      >
                        <button
                          className="health-ledger-row"
                          type="button"
                          aria-expanded={open}
                          aria-controls={`health-detail-${index}`}
                          onClick={() => setExpanded(open ? null : id)}
                        >
                          <span
                            className="appointment-date health-ledger-date-card"
                            aria-label={date}
                          >
                            <span>{datePart({ month: "short" })}</span>
                            <strong>{datePart({ day: "2-digit" })}</strong>
                            <small>{datePart({ weekday: "short" })}</small>
                            <time className="health-ledger-time">
                              {datePart({
                                hour: "numeric",
                                minute: "2-digit",
                                hour12: true,
                              })}
                            </time>
                          </span>
                          <span className="health-ledger-description">
                            <span
                              className={`appointment-badge health-ledger-service ${isOpd ? "opd" : category === categories[2] ? "lab" : category === categories[3] ? "medicine" : "shared"}`}
                            >
                              <i aria-hidden="true" />
                              {localize(category)}
                            </span>
                            <strong>
                              {credit
                                ? localize("Subscription benefits added")
                                : textValue(row, "HospitalName") ||
                                  textValue(row, "ServiceName") ||
                                  localize(category)}
                            </strong>
                            <span>
                              {credit
                                ? localize("Family account")
                                : textValue(row, "Name") ||
                                  localize("Family member")}
                            </span>
                            <small>
                              {credit
                                ? localize("Subscription credit")
                                : isOpd
                                  ? localize("OPD benefit used")
                                  : localize("Shared benefit used")}
                            </small>
                          </span>
                          <span className="health-ledger-debit">
                            <strong>
                              {isOpd
                                ? `${credit ? "+" : "\u2212"}${visits} ${localize("OPD")}`
                                : saved === null
                                  ? localize("Not recorded")
                                  : `${credit ? "+" : "\u2212"}${savingsCurrency(saved)}`}
                            </strong>
                            {isOpd && (
                              <small>
                                {savingsCurrency(credit ? visits * 500 : 500)}{" "}
                                {localize(
                                  credit ? "Benefit value" : "Benefit applied",
                                )}
                              </small>
                            )}
                            <small>
                              {localize("Remaining")}: {remainingAmount === null
                                ? localize("Not recorded")
                                : savingsCurrency(remainingAmount)}
                            </small>
                            <small>
                              {localize(credit ? "Added" : "Used")}{" "}
                              <span aria-hidden="true">
                                {open ? "\u2303" : "\u2304"}
                              </span>
                            </small>
                          </span>
                        </button>
                        {open && (
                          <div
                            className="health-ledger-detail"
                            id={`health-detail-${index}`}
                          >
                            <dl>
                              <div>
                                <dt>
                                  {localize(
                                    credit
                                      ? "Subscription reference"
                                      : "Transaction reference",
                                  )}
                                </dt>
                                <dd>
                                  {(credit
                                    ? String(grant?.reference || "")
                                    : textValue(
                                        row,
                                        "BookingConsultationId",
                                      )) || localize("Not recorded")}
                                </dd>
                              </div>
                              <div>
                                <dt>{localize("Date")}</dt>
                                <dd>{date}</dd>
                              </div>
                              <div>
                                <dt>{localize("Status")}</dt>
                                <dd>
                                  {localize(credit ? "Added" : "Completed")}
                                </dd>
                              </div>
                              <div>
                                <dt>
                                  {localize(
                                    credit
                                      ? "Benefit value"
                                      : "Benefit applied",
                                  )}
                                </dt>
                                <dd>
                                  {saved === null
                                    ? localize("Not recorded")
                                    : savingsCurrency(saved)}
                                </dd>
                              </div>
                              <div>
                                <dt>{localize(isOpd ? "Remaining OPD benefit" : "Remaining lab & medicine benefit")}</dt>
                                <dd>{remainingAmount === null ? localize("Not recorded") : savingsCurrency(remainingAmount)}
                                  {remainingOpds !== null && ` (${remainingOpds} ${localize("OPDs")})`}
                                </dd>
                              </div>
                              {!isOpd && !credit && (
                                <>
                                  <div>
                                    <dt>{localize("Bill amount")}</dt>
                                    <dd>{amount(row.TotalAmount)}</dd>
                                  </div>
                                  <div>
                                    <dt>{localize("Paid amount")}</dt>
                                    <dd>{amount(row.PaidAmount)}</dd>
                                  </div>
                                </>
                              )}
                            </dl>
                          </div>
                        )}
                      </li>
                    );
                  },
                )}
              </ol>
            )}
          </section>
          {/* {childRows(summary, "members").length > 0 && (
            <section className="health-family">
              <div className="health-section-heading">
                <h3>{localize("Family OPD usage")}</h3>
                <span>{localize("Current card period")}</span>
              </div>
              <ul>
                {childRows(summary, "members").map((member) => (
                  <li key={String(member.customerId)}>
                    <strong>{String(member.name)}</strong>
                    <span>
                      {Number(member.usedOpds ?? 0)} {localize("visits used")}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )} */}
        </div>
      )}
    </AppShell>
  );
}
