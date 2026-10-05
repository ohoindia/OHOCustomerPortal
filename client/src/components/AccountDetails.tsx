import { UI_TEXT } from "../../../common/content/labels";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  type loadHomeData,
  formatHomeDate,
  cardStatus,
  membershipState as getMembershipState,
  membershipBadge,
} from "../services/home";

type AccountDetailsProps = {
  data: Awaited<ReturnType<typeof loadHomeData>> | null;
};

export default function AccountDetails({ data }: AccountDetailsProps) {
  const navigate = useNavigate();
  const [cardFlipped, setCardFlipped] = useState(false);
  const card = data?.card ?? null;
  const membershipState = getMembershipState(data);
  const expiry = formatHomeDate(card?.EndDate);
  const status = cardStatus(card);
  const cardBadge = membershipBadge(status);

  return (
    <section id="home-account-details" aria-label={UI_TEXT.accountDetails}>
      <section
        className="oho-membership"
        aria-label={UI_TEXT.ohoindiaMembershipCard}
      >
        <div
          className={`oho-card-flipper${cardFlipped ? " is-flipped" : ""}`}
          role="button"
          tabIndex={0}
          aria-label={UI_TEXT.showBackOfOhoindiaMembershipCard}
          aria-pressed={cardFlipped}
          onPointerEnter={(event) => {
            if (event.pointerType === "mouse") setCardFlipped(true);
          }}
          onPointerLeave={(event) => {
            if (event.pointerType === "mouse") setCardFlipped(false);
          }}
          onClick={() => setCardFlipped((value) => !value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              setCardFlipped((value) => !value);
            } else if (event.key === "Escape") setCardFlipped(false);
          }}
          onBlur={() => setCardFlipped(false)}
        >
          <div className="oho-card-rotation">
            <div
              className="oho-card-face oho-card-front"
              aria-hidden={cardFlipped}
            >
              <img
                className="oho-card-artwork"
                src="/oho-card-front.jpg"
                alt={
                  UI_TEXT.ohoindiaPrivilegeFamilyCareHealthcareWellnessHappinessNotTransferable
                }
              />
              <div
                className="oho-card-number"
                aria-label={UI_TEXT.membershipNumber}
              >
                {card?.OHOCardnumber
                  ? String(card.OHOCardnumber)
                      .replace(/\s/g, "")
                      .match(/.{1,4}/g)
                      ?.join(" ")
                  : membershipState}
              </div>
              {card && (
                <div className="oho-card-validity">
                  <div>
                    <span>{UI_TEXT.validFrom}</span>
                    <strong>
                      {formatHomeDate(card.StartDate) || UI_TEXT.notProvided}
                    </strong>
                  </div>
                  <div>
                    <span>{UI_TEXT.validUntil}</span>
                    <strong>{expiry || UI_TEXT.notProvided}</strong>
                  </div>
                </div>
              )}
            </div>
            <div
              className="oho-card-face oho-card-back"
              aria-hidden={!cardFlipped}
            >
              <img
                className="oho-card-artwork"
                src="/oho-card-back.png"
                alt={
                  UI_TEXT.ohoindiaCardBackConsultationsDiscountsDiagnosticsHealthCampsAnd
                }
              />
            </div>
          </div>
        </div>
        <div className="oho-card-footer">
          <span
            className="oho-card-status"
            title={card ? status : membershipState}
          >
            {card ? cardBadge : membershipState}
          </span>
          {data?.groupName && (
            <span className="oho-card-group">{data.groupName}</span>
          )}
          <button onClick={() => navigate("/membership")}>
            {UI_TEXT.viewBenefits}
          </button>
        </div>
      </section>
    </section>
  );
}
