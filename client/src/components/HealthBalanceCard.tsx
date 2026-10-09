import { translate as localize } from "../../../common/content/locale";
import {
  consultationSavings,
  LAB_MEDICINE_BENEFIT_VALUE,
  savingsCurrency,
  walletBalances,
} from "../../../common/utils/savings";
import type { PortalRow } from "../pages/portal/usePortalData";
import { formatHomeDate } from "../services/home";

type Props = {
  summary?: PortalRow;
  savings: ReturnType<typeof consultationSavings>;
};
export default function HealthBalanceCard({ summary, savings }: Props) {
  const used = Number(summary?.usedOpds ?? 0);
  const remaining = Number(summary?.availableOpds ?? 0);
  const entitled = Number(summary?.totalOpds ?? 0);
  const balances = walletBalances(remaining, savings);
  return (
    <section
      className="health-balance-summary"
      aria-label={localize("Available health benefits")}
    >
      <div className="health-balance-heading">
        <span>{localize("Available health benefits")}</span>
        <span className="health-account-status">
          {localize("Family account")}
        </span>
      </div>
      <div className="health-balance-accounts">
        <div>
          <span>{localize("Available OPDs")}</span>
          <strong>
            {remaining}
            <small>{localize("visits")}</small>
          </strong>
          <p>
            {used} {localize("used")} &middot; {entitled} {localize("included")}
          </p>
          <p>
            {savingsCurrency(500)} {localize("benefit per OPD visit")}
          </p>
        </div>
        <div>
          <span>{localize("Lab & medicine benefit")}</span>
          <strong>{savingsCurrency(balances.labAndMedicines)}</strong>
          <p>
            {localize("Shared allowance")} &middot;{" "}
            {savingsCurrency(LAB_MEDICINE_BENEFIT_VALUE)}
          </p>
        </div>
      </div>
      <div className="health-balance-footer">
        <span>
          {localize("Lab used")}: {savingsCurrency(savings.labInvestigation)}{" "}
          &middot; {localize("Medicine used")}:{" "}
          {savingsCurrency(savings.pharmacyDiscount)}
        </span>
        {Boolean(summary?.cardExpiry) && (
          <span>
            {localize("Valid until")}{" "}
            {formatHomeDate(String(summary?.cardExpiry)) ||
              localize("Date unavailable")}
          </span>
        )}
      </div>
      {summary?.cardValid === false && (
        <p className="health-account-note">
          {localize("An active card is required to use remaining benefits.")}
        </p>
      )}
    </section>
  );
}
