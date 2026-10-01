import { useNavigate } from "react-router-dom";
import { DashboardIcon } from "../components/DashboardIcon";
import { AppShell } from "../components/Layout";
import { BookingCard } from "../components/Cards";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { getSessionMember } from "./auth/member";
import {
  loadHomeData,
  formatHomeDate,
  expiryStatus,
  cardStatus,
  latestActivePackage,
} from "../services/home";
import "./home-member.css";

export default function Home() {
  const navigate = useNavigate();
  const [sessionMember] = useState(getSessionMember);
  const [cardFlipped, setCardFlipped] = useState(false);
  const [showScanNotice, setShowScanNotice] = useState(false);
  const [data, setData] = useState<Awaited<
    ReturnType<typeof loadHomeData>
  > | null>(null);
  const memberId = Number(
    sessionMember?.MemberId || sessionStorage.getItem("memberId"),
  );
  const communityId = Number(
    sessionMember?.communityCustomerId ||
      sessionStorage.getItem("communityCustomerId"),
  );
  const groupId = Number(
    sessionMember?.GroupId || sessionStorage.getItem("groupId"),
  );

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;
    void loadHomeData(memberId, communityId, groupId, signal).then((result) => {
      if (!signal.aborted) setData(result);
    });
    return () => controller.abort();
  }, [memberId, communityId, groupId]);

  const member = data?.customer ?? sessionMember;
  const card = data?.card ?? null;
  const appointment = data?.appointment;
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
  const appointmentState = !data
    ? "Loading appointment..."
    : !data.hasMember
      ? "No upcoming appointments"
      : data.appointmentsLoaded
        ? "No upcoming appointments"
        : "Appointments unavailable";
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
  const profileMessages = data
    ? [
        !member?.DateofBirth || !member?.Age || !member?.Gender
          ? "Complete your date of birth, age and gender in Profile."
          : "",
        data.address === false ? "Add your address in Profile." : "",
        data.hasMember
          ? data.kyc === undefined
            ? "KYC verification unavailable."
            : data.kyc
              ? ""
              : "KYC incomplete: complete Aadhaar, PAN and face verification in Profile."
          : "",
      ].filter(Boolean)
    : [];
  const actionMessages = [
    ...new Set([
      ...profileMessages,
      ...(data?.errors ?? []),
      ...(card && ["Expired", "Expires today", "Inactive"].includes(status)
        ? [
            `Your membership card is ${status.toLowerCase()}. ${status === "Inactive" ? "Contact support for activation." : "Review renewal options in Packages."}`,
          ]
        : []),
      ...(data?.products ?? [])
        .filter((product) =>
          ["Expired", "Expires today"].includes(
            expiryStatus(product.ValidTill),
          ),
        )
        .map(
          (product) =>
            `${product.ProductName || "Your package"}: ${expiryStatus(product.ValidTill).toLowerCase()}. Review renewal options in Packages.`,
        ),
    ]),
  ];
  const freePackages = data?.freeProducts
    .map((item) =>
      [
        item.ProductName || "Free package",
        item.MaximumAdult != null ? `${item.MaximumAdult} adults` : "",
        item.MaximumChild != null ? `${item.MaximumChild} children` : "",
      ]
        .filter(Boolean)
        .join(" · "),
    )
    .join("; ");
  const booking = {
    id: appointment?.BookingConsultationId ?? 0,
    title: appointment
      ? appointment.ServiceName ||
        appointment.PoliciesType ||
        "Hospital appointment"
      : appointmentState,
    subtitle: appointment?.HospitalName || "",
    date: formatHomeDate(appointment?.AppointmentDate),
    status: appointment?.StatusName || (appointment ? "Booked" : "—"),
    icon: "👨🏻‍⚕️",
  };
  const name =
    member?.Name?.trim() || sessionStorage.getItem("FullName") || "Guest";
  return (
    <AppShell className="family-home">
      <header className="family-header">
        <div className="family-brand"><DashboardIcon name="brand" /><strong>OHOINDIA</strong></div>
        <div className="family-header-actions">
          <button aria-label="Search doctors and hospitals" onClick={() => navigate("/doctors")}><DashboardIcon name="search" /></button>
          <button aria-label="View notifications" onClick={() => navigate("/notifications")}><DashboardIcon name="bell" /></button>
        </div>
      </header>
      <h3>Hello, {name} 👋</h3>
      <section className="family-vault" aria-label="Family Health Account Vault">
        <div className="family-vault-heading"><h2>Family Health Account Vault</h2><span>Liquidity</span></div>
        <strong className="family-vault-value">&#8377;37,000</strong>
        <p>Pre-loaded Health Liquidity</p>
        <div className="family-vault-pattern" aria-hidden="true"><DashboardIcon name="doctor" /><DashboardIcon name="pharmacy" /><DashboardIcon name="records" /></div>
        <button onClick={() => navigate("/membership")}>Account Details</button>
      </section>
      <section className="family-actions" aria-labelledby="quick-actions-title">
        <h2 id="quick-actions-title">Quick Actions</h2>
        <div className="family-action-grid">
          <button onClick={() => navigate("/doctors")}><span><DashboardIcon name="doctor" /></span>Zero-Cash<br />OPD</button>
          <button className="family-scan-action" onClick={() => setShowScanNotice((value) => !value)} aria-expanded={showScanNotice} aria-controls="scan-payment-notice"><span><DashboardIcon name="qr" /></span>Scan &amp; Pay<br />QR</button>
          <button onClick={() => navigate("/pharmacy")}><span><DashboardIcon name="pharmacy" /></span>Pharmacy<br />Subsidies</button>
        </div>
        {showScanNotice && <p id="scan-payment-notice" className="family-scan-notice" role="status">QR payments are not available yet. Please contact your healthcare provider for payment assistance.</p>}
      </section>
      <section className="family-activities" aria-labelledby="recent-activities-title">
        <h2 id="recent-activities-title">Recent Activities</h2>
        <article className="family-activity"><span className="family-activity-icon"><DashboardIcon name="records" /></span><div><h3>No recent activities yet</h3><p>Your health visits and vault transactions will appear here.</p></div></article>
      </section>
      <details className="family-member-details"><summary>Membership &amp; care details</summary>
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
      <details className="home-package-details">
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
      {actionMessages.length > 0 && (
        <ActionNotice
          key={actionMessages.join("|")}
          messages={actionMessages}
        />
      )}
      <SectionTitle
        title="Upcoming Appointment"
        action="View All"
        onClick={() => navigate("/bookings")}
      />
      <BookingCard item={booking} />
      <section className="offer-banner">
        <div>
          <b>
            {freePackages ? "Available free packages" : "Today's Health Tip"}
          </b>
          <p aria-live="polite">
            {freePackages ||
              data?.config.HealthTip ||
              (data
                ? "Health tips currently unavailable."
                : "Loading health tips...")}
            {freePackages && data?.config.HealthTip && (
              <>
                <br />
                {data.config.HealthTip}
              </>
            )}
            {data?.config.OHOCareMobileNumber && (
              <>
                <br />
                Support:{" "}
                <a
                  href={`tel:${data.config.OHOCareMobileNumber.replace(/[^+\d]/g, "")}`}
                >
                  {data.config.OHOCareMobileNumber}
                </a>
              </>
            )}
          </p>
        </div>
        <span>🎁</span>
      </section>
      </details>

    </AppShell>
  );
}
function ActionNotice({ messages }: { messages: string[] }) {
  const [visible, setVisible] = useState(true);
  const navigate = useNavigate();
  useEffect(() => {
    const timer = window.setTimeout(() => setVisible(false), 30_000);
    return () => window.clearTimeout(timer);
  }, []);
  if (!visible) return null;
  return (
    <aside className="home-action-notice" aria-live="polite">
      <div className="home-notice-heading">
        <strong>Needs your attention</strong>
        <button aria-label="Dismiss notices" onClick={() => setVisible(false)}>
          ×
        </button>
      </div>
      <ul>
        {messages.map((message) => (
          <li key={message}>{message}</li>
        ))}
      </ul>
      <div className="home-notice-actions">
        <button onClick={() => navigate("/profile")}>Review profile</button>
        <button onClick={() => navigate("/packages")}>View packages</button>
      </div>
    </aside>
  );
}
type SectionTitleProps = {
  title: ReactNode;
  action?: ReactNode;
  onClick?: () => void;
};

function SectionTitle({ title, action, onClick }: SectionTitleProps) {
  return (
    <div className="section-title">
      <h2>{title}</h2>
      {action && <button onClick={onClick}>{action}</button>}
    </div>
  );
}
