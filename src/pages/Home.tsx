import { useNavigate } from "react-router-dom";
import { AppShell } from "../components/Layout";
import { BookingCard } from "../components/Cards";
import { bookings } from "../data/mockData";
import type { ReactNode } from "react";
import { getSessionMember } from "./auth/member";
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
  const member = getSessionMember();
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
      <section className="membership-card">
        <div>
          <small>My Membership</small>
          <h2>Gold Wellness Card</h2>
          <p>Expires on 20-Dec-2026</p>
          <button onClick={() => navigate("/membership")}>View Benefits</button>
        </div>
        <div className="gold-card">
          ∞<b>GOLD</b>
        </div>
      </section>
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
      <BookingCard item={bookings[0]} />
      <section className="offer-banner">
        <div>
          <b>Flat 20% OFF</b>
          <p>On selected health packages</p>
        </div>
        <span>🎁</span>
      </section>
    </AppShell>
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
