import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  type loadHomeData,
  formatHomeDate,
  expiryStatus,
  cardStatus,
  latestActivePackage,
} from "../services/home";

type AccountDetailsProps = {
  data: Awaited<ReturnType<typeof loadHomeData>> | null;
  visible: boolean;
};

export default function AccountDetails({ data, visible }: AccountDetailsProps) {
  const navigate = useNavigate();
  const [cardFlipped, setCardFlipped] = useState(false);
  const containerRef = useRef<HTMLElement>(null);
  const card = data?.card ?? null;
  const activePackage = latestActivePackage(data?.products ?? []);
  const expiredPackages = (data?.products ?? []).filter(
    (product) => expiryStatus(product.ValidTill) === "Expired",
  );
  const remainingPackages = (data?.products ?? []).filter(
    (product) => expiryStatus(product.ValidTill) !== "Expired",
  );
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

  useEffect(() => {
    if (visible) {
      containerRef.current?.scrollIntoView({ block: "start" });
      containerRef.current?.focus({ preventScroll: true });
    }
  }, [visible]);

  return (
    <section
      id="home-account-details"
      aria-label="Account details"
      hidden={!visible}
      tabIndex={-1}
      ref={containerRef}
    >
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
      <details className="home-package-details" id="home-package-details" open>
        <summary>
          My Packages
          {Boolean(data?.products?.length) && (
            <span>{data?.products?.length}</span>
          )}
          {activePackage ? (
            <span className="home-featured-package">
              <span className="home-package-name">
                <span aria-hidden="true">♥</span>
                {activePackage.ProductName || "Package"}
              </span>
              <span className="home-package-active">Active</span>
              <small>
                {formatHomeDate(activePackage.ValidTill)
                  ? `Valid till ${formatHomeDate(activePackage.ValidTill)}`
                  : "Expiry not provided"}
              </small>
            </span>
          ) : (
            <small className="home-package-status">
              {!data
                ? "Loading packages..."
                : data.products === null && data.hasMember
                  ? "Packages unavailable"
                  : "No Active packages"}
            </small>
          )}
        </summary>
        <table className="home-benefits-table">
          <thead>
            <tr>
              <th scope="col">Asset Category</th>
              <th scope="col">Benefit Description</th>
              <th scope="col">Maximum Value</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">Service Credit Vault</th>
              <td>24 Managed Zero Cash Consultation Credits</td>
              <td>₹12,000</td>
            </tr>
            <tr>
              <th scope="row">Smart Savings Wallet</th>
              <td>Up to 30% Savings on Pharmacy, Labs, and Hospital Bills.</td>
              <td>₹25,000</td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <th scope="row">TOTAL VALUE</th>
              <td>TOTAL MANAGED HEALTH LIQUIDITY</td>
              <td>₹37,000</td>
            </tr>
          </tfoot>
        </table>
        {remainingPackages.map((product, index) => (
          <div
            className="home-package-row"
            key={product.MemberProductProductsId ?? index}
          >
            <strong>{product.ProductName || "Package"}</strong>
            <span>
              {expiryStatus(product.ValidTill)}
              {formatHomeDate(product.ValidTill) &&
                ` · ${formatHomeDate(product.ValidTill)}`}
            </span>
            {formatHomeDate(product.IssuedOn) && (
              <small>Issued {formatHomeDate(product.IssuedOn)}</small>
            )}
          </div>
        ))}
        {expiredPackages.length > 0 && (
          <section
            className="home-expired-packages"
            aria-label="Expired packages"
          >
            <h3>
              Expired packages <span>{expiredPackages.length}</span>
            </h3>
            {expiredPackages.map((product, index) => (
              <div
                className="home-package-row"
                key={product.MemberProductProductsId ?? index}
              >
                <strong>{product.ProductName || "Package"}</strong>
                <span>Expired on {formatHomeDate(product.ValidTill)}</span>
                {formatHomeDate(product.IssuedOn) && (
                  <small>Issued {formatHomeDate(product.IssuedOn)}</small>
                )}
              </div>
            ))}
          </section>
        )}
        {data?.products?.length === 0 && (
          <p className="home-package-empty">No purchased packages</p>
        )}
      </details>
    </section>
  );
}
