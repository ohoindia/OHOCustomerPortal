import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  type loadHomeData,
  formatHomeDate,
  cardStatus,
} from "../services/home";

type AccountDetailsProps = {
  data: Awaited<ReturnType<typeof loadHomeData>> | null;
};

export default function AccountDetails({ data }: AccountDetailsProps) {
  const navigate = useNavigate();
  const [cardFlipped, setCardFlipped] = useState(false);
  const card = data?.card ?? null;
  const membershipState = !data
    ? "Loading membership..."
    : !data.hasMember
      ? "No membership card"
      : !data.membershipLoaded
        ? "Membership unavailable"
        : card
          ? "OHO Membership Card"
          : "No membership card";
  const expiry = formatHomeDate(card?.EndDate);
  const status = cardStatus(card);
  const cardBadge =
    status === "Expires today"
      ? "TODAY"
      : status === "Expiry not provided"
        ? "UNKNOWN"
        : status === "Not started"
          ? "PENDING"
          : status.toUpperCase();

  return (
    <section id="home-account-details" aria-label="Account details">
      <section className="oho-membership" aria-label="OHOINDIA membership card">
        <div
          className={`oho-card-flipper${cardFlipped ? " is-flipped" : ""}`}
          role="button"
          tabIndex={0}
          aria-label="Show back of OHOINDIA membership card"
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
                alt="OHOINDIA Privilege Family Care. Healthcare, Wellness, Happiness. Not transferable."
              />
              <div className="oho-card-number" aria-label="Membership number">
                {card?.OHOCardnumber
                  ? String(card.OHOCardnumber)
                      .replace(/\s/g, "")
                      .match(/.{1,4}/g)
                      ?.join(" ")
                  : membershipState}
              </div>
              {card && (
                <div className="oho-card-validity">
                  <span>
                    {status === "Expired" ? "Validity · Expired" : "Validity"}
                  </span>
                  <strong>
                    {formatHomeDate(card.StartDate) || "Not provided"} to{" "}
                    {expiry || "Not provided"}
                  </strong>
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
                alt="OHOINDIA card back: consultations, discounts, diagnostics, health camps and insurance. Call or WhatsApp +91 7032 107 108 or +91 7671 997 108. Terms and conditions apply; insurance is provided by partners. This card is company property."
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
          <button onClick={() => navigate("/membership")}>View Benefits</button>
        </div>
      </section>
    </section>
  );
}
