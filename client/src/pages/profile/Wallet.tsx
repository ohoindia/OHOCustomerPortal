import { translate as localize } from "../../../../common/content/locale";
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
        <>
          <section className="wallet-card">
            <span>{localize("Available benefit amount")}</span>
            <strong>{savingsCurrency(balances.total)}</strong>
          </section>
          <div className="wallet-stats">
            <article>
              <span>{localize("Free Consultation available")}</span>
              <b>{savingsCurrency(balances.consultation)}</b>
              <span>
                {Number(opds.rows[0]?.availableOpds ?? 0)}
                {localize(" OPDs available × ₹500")}
              </span>
              <span>
                {Number(opds.rows[0]?.usedOpds ?? 0)}
                {localize(" OPDs utilized")}
              </span>
              <span>
                {Number(opds.rows[0]?.totalOpds ?? 0)}
                {localize(" OPDs for the card validity period")}
              </span>
              {Boolean(opds.rows[0]?.cardExpiry) && (
                <span>
                  {localize("Card expiry: ")}
                  {String(opds.rows[0].cardExpiry)}
                </span>
              )}
            </article>
            <article>
              <span>{localize("Labs and Medicines available")}</span>
              <b>{savingsCurrency(balances.labAndMedicines)}</b>
              <span>
                {localize(
                  "Shared ₹25,000 allowance, less lab and medicine discounts used.",
                )}
              </span>
            </article>
          </div>
          <h3>{localize("Free consultation utilization by family member")}</h3>
          <div className="wallet-stats">
            {childRows(opds.rows[0], "members").map((member) => (
              <article key={String(member.customerId)}>
                <b>{String(member.name)}</b>
                <span>
                  {Number(member.usedOpds)}
                  {localize(" OPDs utilized")}
                </span>
                <span>
                  {savingsCurrency(Number(member.utilizedAmount))}
                  {localize(" used")}
                </span>
              </article>
            ))}
          </div>
          <section className="wallet-card">
            <span>{localize("Total savings")}</span>
            <strong>{savingsCurrency(savings.total)}</strong>
            <b>{UI_TEXT.purseEmoji}</b>
          </section>
          <p>
            {localize(
              "Your family saved this amount on successful visits through your health benefits.",
            )}
          </p>
          <div className="wallet-stats">
            {[
              ["Free Consultation", savings.freeConsultation],
              ["Lab Investigation", savings.labInvestigation],
              ["Pharmacy Discount", savings.pharmacyDiscount],
            ].map(([label, amount]) => (
              <article key={label}>
                <span>{localize(String(label))}</span>
                <b>{savingsCurrency(Number(amount))}</b>
              </article>
            ))}
          </div>
        </>
      )}
    </AppShell>
  );
}
