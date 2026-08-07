import { useNavigate } from 'react-router-dom';
import { AppShell, SearchBar } from '../components/Layout';
import { BookingCard } from '../components/Cards';
import { bookings } from '../data/mockData';
import type { ReactNode } from 'react';

const services = [
  ['🏥', 'Hospitals', '/hospitals'],
  ['👨🏻‍⚕️', 'Doctors', '/doctors'],
  ['🧪', 'Lab Tests', '/lab-tests'],
  ['💊', 'Pharmacy', '/pharmacy'],
  ['♡', 'Wellness', '/packages'],
  ['🩺', 'Health Checkups', '/packages'],
  ['📦', 'Packages', '/packages'],
  ['•••', 'More', '/profile'],
];
export default function Home() {
  const navigate = useNavigate();
  return (
    <AppShell>
      <div className="home-top">
        <div>
          <small>⌖ Hyderabad⌄</small>
          <h1>Hello, Srikanth 👋</h1>
        </div>
        <button className="profile-mini">SR</button>
      </div>
      <SearchBar />
      <section className="membership-card">
        <div>
          <small>My Membership</small>
          <h2>Gold Wellness Card</h2>
          <p>Expires on 20-Dec-2026</p>
          <button onClick={() => navigate('/membership')}>View Benefits</button>
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
        onClick={() => navigate('/bookings')}
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
