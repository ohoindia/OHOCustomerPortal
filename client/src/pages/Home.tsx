import { useNavigate } from "react-router-dom";
import { Logo, AppShell } from "../components/Layout";
import AccountDetails from "../components/AccountDetails";
import { BookingCard } from "../components/Cards";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { getSessionMember } from "./auth/member";
import {
  loadHomeData,
  formatHomeDate,
  expiryStatus,
  cardStatus,
} from "../services/home";
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
  const [accountDetailsVisible, setAccountDetailsVisible] = useState(false);
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
  const appointmentState = !data
    ? "Loading appointment..."
    : !data.hasMember
      ? "No upcoming appointments"
      : data.appointmentsLoaded
        ? "No upcoming appointments"
        : "Appointments unavailable";
  const status = cardStatus(card);
  const membershipExpiry = expiryStatus(card?.EndDate);
  const vaultMembershipStatus =
    membershipExpiry === "Expired"
      ? "Expired"
      : membershipExpiry === "Valid" || membershipExpiry === "Expires today"
        ? "Active"
        : null;
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
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
  return (
    <AppShell>
      <header className="home-brand">
        <Logo compact />
        <button
          className="profile-mini"
          aria-label="View profile"
          onClick={() => navigate("/profile")}
        >
          {initials}
        </button>
      </header>
      <div className="home-top">
        <div>
          <h1>Hello, {name} 👋</h1>
        </div>
      </div>
      <section
        className="home-family-vault"
        aria-labelledby="home-family-vault-title"
      >
        <div className="home-vault-heading">
          <h2 id="home-family-vault-title">Family Health Account Vault</h2>
          <span className="home-vault-badge">Liquidity</span>
        </div>
        <strong className="home-vault-value">₹37,000</strong>
        <p>Pre-loaded Health Liquidity</p>
        <div className="home-vault-pattern" aria-hidden="true">
          <svg
            viewBox="0 0 180 140"
            fill="none"
            stroke="currentColor"
            strokeWidth="5"
          >
            <path d="M20 25h20m-10-10v20M125 95h24m-12-12v24M65 75h22m-11-11v22" />
            <rect x="55" y="54" width="42" height="42" rx="7" />
            <path d="M68 54v-8h16v8M105 27h12l7-12 10 26 7-14h15M30 112h18m-9-9v18" />
            <rect
              x="117"
              y="76"
              width="40"
              height="40"
              rx="7"
              transform="rotate(-12 137 96)"
            />
            <circle cx="158" cy="53" r="12" />
          </svg>
        </div>
        <div className="home-vault-actions">
          {vaultMembershipStatus && (
            <span
              className={`home-vault-status${vaultMembershipStatus === "Expired" ? " is-expired" : ""}`}
              aria-label={`Membership ${vaultMembershipStatus.toLowerCase()}`}
            >
              {vaultMembershipStatus}
            </span>
          )}
          <button
            type="button"
            aria-controls="home-account-details"
            aria-expanded={accountDetailsVisible}
            onClick={() => setAccountDetailsVisible((visible) => !visible)}
          >
            Account Details
          </button>
        </div>
      </section>
      <section className="home-welcome" aria-labelledby="home-welcome-title">
        <span>CARE FOR THE WHOLE FAMILY</span>
        <h2 id="home-welcome-title">
          Your health. Your account.
          <br />
          All in one place.
        </h2>
        <p>Access your benefits and find care close to home.</p>
        <button onClick={() => navigate("/hospitals")}>
          Explore your care network <span aria-hidden="true">→</span>
        </button>
      </section>
      <AccountDetails data={data} visible={accountDetailsVisible} />
      {actionMessages.length > 0 && (
        <ActionNotice
          key={actionMessages.join("|")}
          messages={actionMessages}
        />
      )}
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
