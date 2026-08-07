import {
  Home,
  CalendarDays,
  WalletCards,
  Bell,
  UserRound,
  ArrowLeft,
} from './Icons';
import { NavLink, useNavigate } from 'react-router-dom';

export function Logo({ compact = false }) {
  return (
    <div className={`logo ${compact ? 'compact' : ''}`}>
      <strong>OHO</strong>
      <span>INDIA LIFE</span>
    </div>
  );
}

export function PageHeader({ title, right, back = true }) {
  const navigate = useNavigate();
  return (
    <header className="page-header">
      <div className="header-slot">
        {back && (
          <button className="icon-btn" onClick={() => navigate(-1)}>
            <ArrowLeft size={20} />
          </button>
        )}
      </div>
      <h1>{title}</h1>
      <div className="header-slot right">{right}</div>
    </header>
  );
}

const nav = [
  ['/', Home, 'Home'],
  ['/bookings', CalendarDays, 'Bookings'],
  ['/wallet', WalletCards, 'Wallet'],
  ['/notifications', Bell, 'Notifications'],
  ['/profile', UserRound, 'Profile'],
];
export function BottomNav() {
  return (
    <nav className="bottom-nav">
      {nav.map(([to, Icon, label]) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          className={({ isActive }) => (isActive ? 'active' : '')}
        >
          <Icon size={19} />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

export function AppShell({ children, nav = true, className = '' }) {
  return (
    <main className={`phone-shell ${className}`}>
      <div className="phone-content">{children}</div>
      {nav && <BottomNav />}
    </main>
  );
}

export function SearchBar({
  placeholder = 'Search doctors, hospitals, tests...',
}) {
  return (
    <label className="search-bar">
      <span>⌕</span>
      <input placeholder={placeholder} />
      <span>🎙️</span>
    </label>
  );
}

export function Chip({ children, active }) {
  return (
    <button className={`chip ${active ? 'active' : ''}`}>{children}</button>
  );
}
export function PrimaryButton({ children, onClick, className = '' }) {
  return (
    <button onClick={onClick} className={`primary-btn ${className}`}>
      {children}
    </button>
  );
}
