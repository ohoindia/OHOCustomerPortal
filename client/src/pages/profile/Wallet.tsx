import { UI_TEXT } from "../../../../common/content/labels";
import {
  consultationSavings,
  savingsCurrency,
} from "../../../../common/utils/savings";
import { AppShell, PageHeader } from "../../components/Layout";
import { getSessionMember } from "../auth/member";
import { usePortalData } from "../portal/usePortalData";

export function Wallet() {
  const memberId = Number(
    getSessionMember()?.MemberId || sessionStorage.getItem("memberId"),
  );
  const data = usePortalData(
    "api/BookingConsultation/PendingAndSuccessConsultationList",
    { customerId: memberId },
  );
  const savings = consultationSavings(data.rows);
  return (
    <AppShell>
      <PageHeader title={UI_TEXT.walletRewards} back={false} />
      {data.loading ? (
        <p role="status">Loading savings...</p>
      ) : data.error ? (
        <div role="alert">
          <p>{data.error}</p>
          <button onClick={data.retry}>Retry</button>
        </div>
      ) : (
        <>
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
