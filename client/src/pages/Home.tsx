import {
  homeServices,
  membershipAttentionStatuses,
  renewalStatuses,
} from "../../../common/content/options";
import { UI_TEXT, UI_MESSAGES } from "../../../common/content/labels";
import { Link, useNavigate } from "react-router-dom";
import { Logo, AppShell } from "../components/Layout";
import { BookingCard } from "../components/Cards";
import { QuickActions } from "../components/QuickActions";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { getSessionMember } from "./auth/member";
import { textValue, usePortalData } from "./portal/usePortalData";
import {
  loadHomeData,
  formatHomeDate,
  expiryStatus,
  cardStatus,
  latestActivePackage,
  nextAppointment,
  appointmentState as getAppointmentState,
  vaultMembershipStatus as getVaultMembershipStatus,
  type Appointment,
} from "../services/home";
import "./home-member.css";
import {
  serviceAccess,
  serviceAccessMessage,
} from "../../../common/utils/home";

const services = homeServices;
export default function Home() {
  const navigate = useNavigate();
  const pending = usePortalData("api/purchases/pending");
  const [pendingOrdersExpanded, setPendingOrdersExpanded] = useState(false);
  const [sessionMember] = useState(getSessionMember);
  const [data, setData] = useState<Awaited<
    ReturnType<typeof loadHomeData>
  > | null>(null);
  const memberId = Number(
    sessionMember?.MemberId || sessionStorage.getItem("memberId"),
  );
  const [appointments, setAppointments] = useState<
    Appointment[] | null | undefined
  >();
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
    void loadHomeData(
      memberId,
      communityId,
      groupId,
      signal,
      setAppointments,
      sessionMember,
    ).then((result) => {
      if (!signal.aborted) setData(result);
    });
    return () => controller.abort();
  }, [memberId, communityId, groupId, sessionMember]);

  const member = data?.customer ?? sessionMember;
  const [serviceMessage, setServiceMessage] = useState("");
  const access = serviceAccess(data);
  const showPackageBenefits =
    access === "purchase" &&
    (data?.hasMember === false || data?.products != null) &&
    !latestActivePackage(data?.products ?? []);
  function allowService() {
    if (access === "available") return true;
    setServiceMessage(serviceAccessMessage(access));
    return false;
  }
  const card = data?.card ?? null;
  const appointment = appointments ? nextAppointment(appointments) : null;
  const appointmentState = getAppointmentState(memberId, appointments);
  const status = cardStatus(card);
  const vaultMembershipStatus = getVaultMembershipStatus(card);
  const profileMessages = data
    ? [
        !member?.DateofBirth || !member?.Age || !member?.Gender
          ? UI_TEXT.completeYourDateOfBirthAgeAndGenderIn
          : "",
        data.address === false ? UI_TEXT.addYourAddressInProfile : "",
        data.hasMember
          ? data.kyc === undefined
            ? UI_TEXT.kycVerificationUnavailable
            : data.kyc
              ? ""
              : UI_TEXT.kycIncompleteCompleteAadhaarPanAndFaceVerificationIn
          : "",
      ].filter(Boolean)
    : [];
  const actionMessages = [
    ...new Set([
      ...profileMessages,
      ...(data?.errors ?? []),
      ...(card && membershipAttentionStatuses.includes(status)
        ? [
            UI_MESSAGES.yourMembershipCardIs(
              status.toLowerCase(),
              status === UI_TEXT.inactive
                ? UI_TEXT.contactSupportForActivation
                : UI_TEXT.reviewRenewalOptionsInPackages,
            ),
          ]
        : []),
      ...(data?.products ?? [])
        .filter((product) =>
          renewalStatuses.includes(expiryStatus(product.ValidTill)),
        )
        .map((product) =>
          UI_MESSAGES.reviewRenewalOptionsInPackages2(
            product.ProductName || UI_TEXT.yourPackage,
            expiryStatus(product.ValidTill).toLowerCase(),
          ),
        ),
    ]),
  ];
  const freePackages = data?.freeProducts
    .map((item) =>
      [
        item.ProductName || UI_TEXT.freePackage,
        item.MaximumAdult != null
          ? UI_MESSAGES.adultCount(item.MaximumAdult)
          : "",
        item.MaximumChild != null
          ? UI_MESSAGES.childCount(item.MaximumChild)
          : "",
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
        UI_TEXT.hospitalAppointment
      : appointmentState,
    subtitle: appointment?.HospitalName || "",
    date: formatHomeDate(appointment?.AppointmentDate),
    status:
      appointment?.StatusName ||
      (appointment ? UI_TEXT.booked : UI_TEXT.emptyValue),
    icon: UI_TEXT.doctorEmoji,
  };
  const name =
    member?.Name?.trim() || sessionStorage.getItem("FullName") || UI_TEXT.guest;
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
          aria-label={UI_TEXT.viewProfile2}
          onClick={() => navigate("/profile")}
        >
          {initials}
        </button>
      </header>
      <div className="home-top">
        <div>
          <h1>
            {UI_TEXT.hello}
            {name}
            {UI_TEXT.decoration1F44B}
          </h1>
        </div>
      </div>
      <section
        className="home-family-vault"
        aria-labelledby="home-family-vault-title"
      >
        <div className="home-vault-heading">
          <h2 id="home-family-vault-title">
            {UI_TEXT.familyHealthAccountVault}
          </h2>
          <span className="home-vault-badge">
            {access === "purchase"
              ? UI_TEXT.packageRequired
              : UI_TEXT.liquidity}
          </span>
        </div>
        <strong className="home-vault-value">{UI_TEXT.value37000}</strong>
        <span className="home-vault-value-label">
          {UI_TEXT.healthBenefitValue}
        </span>
        {showPackageBenefits && (
          <>
            <p>{UI_TEXT.purchaseHealthBenefitsDescription}</p>
            <ul
              className="home-vault-benefits"
              aria-label={UI_TEXT.membershipBenefits}
            >
              <li>{UI_TEXT.vaultBenefitOpd}</li>
              <li>{UI_TEXT.vaultBenefitPharmacy}</li>
              <li>{UI_TEXT.vaultBenefitCheckups}</li>
            </ul>
            <small className="home-vault-benefits-note">
              {UI_TEXT.vaultPackageBenefitsNote}
            </small>
          </>
        )}
        {(access === "loading" || access === "unavailable") && (
          <p role="status">{serviceAccessMessage(access)}</p>
        )}
        {card && formatHomeDate(card.EndDate) && (
          <div className="home-vault-validity">
            <span>{UI_TEXT.validUntil}</span>
            <strong>
              {formatHomeDate(card.EndDate) || UI_TEXT.notProvided}
            </strong>
          </div>
        )}
        {access === "purchase" && (
          <div className="home-vault-purchase">
            <button
              className="outline-btn"
              onClick={() => navigate("/packages")}
            >
              {UI_TEXT.choosePackage}
            </button>
          </div>
        )}
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
              className={`home-vault-status${vaultMembershipStatus === UI_TEXT.expired ? " is-expired" : ""}`}
              aria-label={UI_MESSAGES.membership2(
                vaultMembershipStatus.toLowerCase(),
              )}
            >
              {vaultMembershipStatus}
            </span>
          )}
          <button type="button" onClick={() => navigate("/account-details")}>
            {UI_TEXT.accountDetails2}
          </button>
        </div>
      </section>
      {/* <section className="home-welcome" aria-labelledby="home-welcome-title">
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
      </section> */}
      {actionMessages.length > 0 && (
        <ActionNotice
          key={actionMessages.join("|")}
          messages={actionMessages}
        />
      )}
      {serviceMessage && (
        <aside className="home-action-notice" role="alert">
          <p>{serviceMessage}</p>
          {access === "purchase" && (
            <button
              className="primary-btn"
              onClick={() => navigate("/packages")}
            >
              Purchase a package
            </button>
          )}
          <button
            className="text-btn"
            aria-label="Dismiss"
            onClick={() => setServiceMessage("")}
          >
            {UI_TEXT.dismissIcon}
          </button>
        </aside>
      )}
      <QuickActions
        memberId={memberId}
        communityId={communityId}
        allowService={allowService}
      />
      {pending.error && (
        <aside className="home-action-notice" role="alert">
          <p>Unable to load pending orders.</p>
          <button className="outline-btn" onClick={pending.retry}>
            {UI_TEXT.tryAgain}
          </button>
        </aside>
      )}
      {pending.rows.length > 0 && (
        <section
          className="home-pending-orders"
          aria-labelledby="pending-orders-heading"
        >
          <div className="section-title">
            <h2 id="pending-orders-heading">Pending Orders</h2>
            <span>{pending.rows.length}</span>
            {pending.rows.length > 1 && (
              <button
                type="button"
                aria-expanded={pendingOrdersExpanded}
                aria-controls="pending-orders-list"
                onClick={() =>
                  setPendingOrdersExpanded((expanded) => !expanded)
                }
              >
                {pendingOrdersExpanded
                  ? "Collapse"
                  : `View all (${pending.rows.length})`}
              </button>
            )}
          </div>
          <ul id="pending-orders-list">
            {(pendingOrdersExpanded
              ? pending.rows
              : pending.rows.slice(0, 1)
            ).map((order) => (
              <li key={textValue(order, "OrdersId")}>
                <Link to={`/purchase/${textValue(order, "OrdersId")}/payment`}>
                  <span className="home-pending-order-details">
                    <strong>
                      {textValue(order, "ProductName") || "Package purchase"}
                    </strong>
                    <small>
                      Order #{textValue(order, "OrdersId")} · Pending
                    </small>
                    <small>{textValue(order, "FullName")}</small>
                  </span>
                  <span className="home-pending-order-action">
                    <strong>
                      {UI_TEXT.currencySymbol}
                      {Number(order.PayableAmount).toLocaleString("en-IN")}
                    </strong>
                    <span>Continue purchase →</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      <SectionTitle title={UI_TEXT.quickServices} />
      <div className="service-grid">
        {services.map(([icon, label, to]) => (
          <button
            key={label}
            onClick={() => {
              if (allowService()) navigate(to);
            }}
          >
            <span>{icon}</span>
            <small>{label}</small>
          </button>
        ))}
      </div>
      <SectionTitle
        title={UI_TEXT.upcomingAppointment}
        action={UI_TEXT.viewAll}
        onClick={() => navigate("/bookings")}
      />
      {appointment ? (
        <BookingCard
          item={booking}
          onViewDetails={() =>
            navigate(
              `/hospitalConsulationForm?bookingId=${appointment.BookingConsultationId}`,
            )
          }
        />
      ) : (
        <p role="status">{appointmentState}</p>
      )}
      <section className="offer-banner">
        <div>
          <b>
            {freePackages
              ? UI_TEXT.availableFreePackages
              : UI_TEXT.todaySHealthTip}
          </b>
          <p aria-live="polite">
            {freePackages ||
              data?.config.HealthTip ||
              (data
                ? UI_TEXT.healthTipsCurrentlyUnavailable
                : UI_TEXT.loadingHealthTips)}
            {freePackages && data?.config.HealthTip && (
              <>
                <br />
                {data.config.HealthTip}
              </>
            )}
            {data?.config.OHOCareMobileNumber && (
              <>
                <br />
                {UI_TEXT.support}{" "}
                <a
                  href={`tel:${data.config.OHOCareMobileNumber.replace(/[^+\d]/g, "")}`}
                >
                  {data.config.OHOCareMobileNumber}
                </a>
              </>
            )}
          </p>
        </div>
        <span>{UI_TEXT.giftEmoji}</span>
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
        <strong>{UI_TEXT.needsYourAttention}</strong>
        <button
          aria-label={UI_TEXT.dismissNotices}
          onClick={() => setVisible(false)}
        >
          {UI_TEXT.dismissIcon}
        </button>
      </div>
      <ul>
        {messages.map((message) => (
          <li key={message}>{message}</li>
        ))}
      </ul>
      <div className="home-notice-actions">
        <button onClick={() => navigate("/profile")}>
          {UI_TEXT.reviewProfile}
        </button>
        <button onClick={() => navigate("/packages")}>
          {UI_TEXT.viewPackages}
        </button>
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
