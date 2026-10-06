import { UI_TEXT } from "../../../../common/content/labels";
import {
  consultationSavings,
  savingsCurrency,
  walletBalances,
} from "../../../../common/utils/savings";
import { AppShell, PageHeader } from "../../components/Layout";
import { getSessionMember } from "../auth/member";
import { childRows, usePortalData } from "../portal/usePortalData";

export function Wallet() {
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
  const savings = consultationSavings(data.rows);
  const balances = walletBalances(
    Number(opds.rows[0]?.availableOpds ?? 0),
    savings,
  );
  const error = data.error || opds.error;
  return (
    <AppShell>
      <PageHeader title={UI_TEXT.walletRewards} back={false} />
      {data.loading || opds.loading ? (
        <p role="status">Loading wallet...</p>
      ) : error ? (
        <div role="alert">
          <p>{error}</p>
          <button
            onClick={() => {
              data.retry();
              opds.retry();
            }}
          >
            Retry
          </button>
        </div>
      ) : (
        <>
          <section className="wallet-card">
            <span>Available benefit amount</span>
            <strong>{savingsCurrency(balances.total)}</strong>
          </section>
          <div className="wallet-stats">
            <article>
              <span>Free Consultation available</span>
              <b>{savingsCurrency(balances.consultation)}</b>
              <span>
                {Number(opds.rows[0]?.availableOpds ?? 0)} OPDs available × ₹500
              </span>
              <span>{Number(opds.rows[0]?.usedOpds ?? 0)} OPDs utilized</span>
              <span>
                {Number(opds.rows[0]?.totalOpds ?? 0)} OPDs for the card
                validity period
              </span>
              {Boolean(opds.rows[0]?.cardExpiry) && (
                <span>Card expiry: {String(opds.rows[0].cardExpiry)}</span>
              )}
            </article>
            <article>
              <span>Labs and Medicines available</span>
              <b>{savingsCurrency(balances.labAndMedicines)}</b>
              <span>
                Shared ₹25,000 allowance, less lab and medicine discounts used.
              </span>
            </article>
          </div>
          <h3>Free consultation utilization by family member</h3>
          <div className="wallet-stats">
            {childRows(opds.rows[0], "members").map((member) => (
              <article key={String(member.customerId)}>
                <b>{String(member.name)}</b>
                <span>{Number(member.usedOpds)} OPDs utilized</span>
                <span>
                  {savingsCurrency(Number(member.utilizedAmount))} used
                </span>
              </article>
            ))}
          </div>
          <section className="wallet-card">
            <span>Total savings</span>
            <strong>{savingsCurrency(savings.total)}</strong>
            <b>{UI_TEXT.purseEmoji}</b>
          </section>
          <p>
            Your family saved this amount on successful visits through your
            health benefits.
          </p>
          <div className="wallet-stats">
            {[
              ["Free Consultation", savings.freeConsultation],
              ["Lab Investigation", savings.labInvestigation],
              ["Pharmacy Discount", savings.pharmacyDiscount],
            ].map(([label, amount]) => (
              <article key={label}>
                <span>{label}</span>
                <b>{savingsCurrency(Number(amount))}</b>
              </article>
            ))}
          </div>
        </>
      )}
    </AppShell>
  );
}
