import { useNavigate } from "react-router-dom";
import { AppShell } from "../components/Layout";
import { BookingCard } from "../components/Cards";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { getSessionMember } from "./auth/member";
import { loadHomeData, formatHomeDate, expiryStatus, cardStatus, latestActivePackage } from "../services/home";
import "./home-member.css";

const services = [
  ["🏥", "Hospitals", "/hospitals"],
  ["👨🏻‍⚕️", "Doctors", "/doctors"],
  ["🧪", "Lab Tests", "/lab-tests"],
  ["💊", "Pharmacy", "/pharmacy"],
  ["♡", "Wellness", "/packages"],
  ["🩺", "Health Checkups", "/packages"],
  ["📦", "Packages", "/packages"],
  ["•••", "More", "/profile"],
];
export default function Home() {
  const navigate = useNavigate();
  const [sessionMember] = useState(getSessionMember);
  const [data, setData] = useState<Awaited<ReturnType<typeof loadHomeData>> | null>(null);
  const memberId = Number(sessionMember?.MemberId || sessionStorage.getItem("memberId"));
  const communityId = Number(sessionMember?.communityCustomerId || sessionStorage.getItem("communityCustomerId"));
  const groupId = Number(sessionMember?.GroupId || sessionStorage.getItem("groupId"));

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;
    void loadHomeData(memberId, communityId, groupId, signal).then(result => {
      if (!signal.aborted) setData(result);
    });
    return () => controller.abort();
  }, [memberId, communityId, groupId]);

  const member = data?.customer ?? sessionMember;
  const card = data?.card ?? null;
  const appointment = data?.appointment;
  const activePackage = latestActivePackage(data?.products ?? []);
  const membershipState = !data ? "Loading membership..." : !data.hasMember ? "No membership card"
    : !data.membershipLoaded ? "Membership unavailable" : card ? "OHO Membership Card" : "No membership card";
  const appointmentState = !data ? "Loading appointment..." : !data.hasMember ? "No upcoming appointments"
    : data.appointmentsLoaded ? "No upcoming appointments" : "Appointments unavailable";
  const expiry = formatHomeDate(card?.EndDate);
  const status = cardStatus(card);
  const cardBadge = status === "Expires today" ? "TODAY" : status === "Expiry not provided"
    ? "UNKNOWN" : status === "Not started" ? "PENDING" : status.toUpperCase();
  const profileMessages = data ? [
    !member?.DateofBirth || !member?.Age || !member?.Gender ? "Complete your date of birth, age and gender in Profile." : "",
    data.address === false ? "Add your address in Profile." : "",
    data.hasMember ? data.kyc === undefined ? "KYC verification unavailable." : data.kyc ? ""
      : "KYC incomplete: complete Aadhaar, PAN and face verification in Profile." : "",
  ].filter(Boolean) : [];
  const actionMessages = [...new Set([
    ...profileMessages,
    ...(data?.errors ?? []),
    ...(card && ["Expired", "Expires today", "Inactive"].includes(status)
      ? [`Your membership card is ${status.toLowerCase()}. ${status === "Inactive" ? "Contact support for activation." : "Review renewal options in Packages."}`] : []),
    ...(data?.products ?? []).filter(product => ["Expired", "Expires today"].includes(expiryStatus(product.ValidTill)))
      .map(product => `${product.ProductName || "Your package"}: ${expiryStatus(product.ValidTill).toLowerCase()}. Review renewal options in Packages.`),
  ])];
  const freePackages = data?.freeProducts.map(item => [
    item.ProductName || "Free package",
    item.MaximumAdult != null ? `${item.MaximumAdult} adults` : "",
    item.MaximumChild != null ? `${item.MaximumChild} children` : "",
  ].filter(Boolean).join(" · ")).join("; ");
  const booking = {
    id: appointment?.BookingConsultationId ?? 0,
    title: appointment ? appointment.ServiceName || appointment.PoliciesType || "Hospital appointment" : appointmentState,
    subtitle: appointment?.HospitalName || "",
    date: formatHomeDate(appointment?.AppointmentDate),
    status: appointment?.StatusName || (appointment ? "Booked" : "—"),
    icon: "👨🏻‍⚕️",
  };
  const name = member?.Name?.trim() || sessionStorage.getItem("FullName") || "Guest";
  const location = [member?.Village, member?.City].filter((value, index, values) => value && values.indexOf(value) === index).join(", ");
  const initials = name.split(/\s+/).slice(0, 2).map(part => part[0]).join("").toUpperCase();
  return (
    <AppShell>
      <div className="home-top">
        <div>
          <small>⌖ {location || "Location not provided"}</small>
          <h1>Hello, {name} 👋</h1>
        </div>
        <button className="profile-mini" aria-label="View profile" onClick={() => navigate("/profile")}>{initials}</button>
      </div>      
      {/* <SearchBar /> */}
      <section className="membership-card home-membership">
        <div className="home-membership-main">
          <small>My Membership{data?.groupName ? ` · ${data.groupName}` : ""}</small>
          <h2>{membershipState}</h2>
          {card?.OHOCardnumber && <p className="home-card-number">{String(card.OHOCardnumber).replace(/\s/g, "").match(/.{1,4}/g)?.join(" ")}</p>}
          {card && <p>{expiry ? `${status === "Expired" ? "Expired on" : "Valid till"} ${expiry}` : "Expiry not provided"}</p>}
          <button onClick={() => navigate("/membership")}>View Benefits</button>
        </div>
        <div className="gold-card" title={card ? status : "OHO Membership"}>
          ∞<b>{card ? cardBadge : "OHO"}</b>
        </div>
      </section>
          <details className="home-package-details">
            <summary>
              My Packages{Boolean(data?.products?.length) && <span>{data?.products?.length}</span>}
              {activePackage ? (
                <span className="home-featured-package">
                  <span className="home-package-name"><span aria-hidden="true">♥</span>{activePackage.ProductName || "Package"}</span>
                  <span className="home-package-active">Active</span>
                  <small>{formatHomeDate(activePackage.ValidTill) ? `Valid till ${formatHomeDate(activePackage.ValidTill)}` : "Expiry not provided"}</small>
                </span>
              ) : <small className="home-package-status">{!data ? "Loading packages..." : data.products === null && data.hasMember ? "Packages unavailable" : "No active package"}</small>}
            </summary>
            <table className="home-benefits-table">
              <thead>
                <tr><th scope="col">Asset Category</th><th scope="col">Benefit Description</th><th scope="col">Maximum Value</th></tr>
              </thead>
              <tbody>
                <tr><th scope="row">Service Credit Vault</th><td>24 Managed Zero Cash Consultation Credits</td><td>₹12,000</td></tr>
                <tr><th scope="row">Smart Savings Wallet</th><td>Up to 30% Savings on Pharmacy, Labs, and Hospital Bills.</td><td>₹25,000</td></tr>
              </tbody>
              <tfoot>
                <tr><th scope="row">TOTAL VALUE</th><td>TOTAL MANAGED HEALTH LIQUIDITY</td><td>₹37,000</td></tr>
              </tfoot>
            </table>
            {data?.products?.map((product, index) => (
              <div className="home-package-row" key={product.MemberProductProductsId ?? index}>
                <strong>{product.ProductName || "Package"}</strong>
                <span>{expiryStatus(product.ValidTill)}{formatHomeDate(product.ValidTill) && ` · ${formatHomeDate(product.ValidTill)}`}</span>
                {formatHomeDate(product.IssuedOn) && <small>Issued {formatHomeDate(product.IssuedOn)}</small>}
              </div>
            ))}
            {data?.products?.length === 0 && <p className="home-package-empty">No purchased packages</p>}
          </details>
      {actionMessages.length > 0 && <ActionNotice key={actionMessages.join("|")} messages={actionMessages} />}
      <SectionTitle title="Quick Services" />
      <div className="service-grid">
        {services.map(([icon, label, to]) => (
          <button key={label} onClick={() => navigate(to)}>
            <span>{icon}</span>
            <small>{label}</small>
          </button>
        ))}
      </div>
      <SectionTitle
        title="Upcoming Appointment"
        action="View All"
        onClick={() => navigate("/bookings")}
      />
      <BookingCard item={booking} />
      <section className="offer-banner">
        <div>
          <b>{freePackages ? "Available free packages" : "Today's Health Tip"}</b>
          <p aria-live="polite">
            {freePackages || data?.config.HealthTip || (data ? "Health tips currently unavailable." : "Loading health tips...")}
            {freePackages && data?.config.HealthTip && <><br />{data.config.HealthTip}</>}
            {data?.config.OHOCareMobileNumber && <><br />Support: <a href={`tel:${data.config.OHOCareMobileNumber.replace(/[^+\d]/g, "")}`}>{data.config.OHOCareMobileNumber}</a></>}
          </p>
        </div>
        <span>🎁</span>
      </section>
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
        <button aria-label="Dismiss notices" onClick={() => setVisible(false)}>×</button>
      </div>
      <ul>{messages.map(message => <li key={message}>{message}</li>)}</ul>
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
