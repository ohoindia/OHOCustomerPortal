import {
  Home,
  CalendarDays,
  WalletCards,
  Bell,
  UserRound,
  ArrowLeft,
} from "./Icons";
import { NavLink, useNavigate } from "react-router-dom";
import type { ReactNode } from "react";
import type { ComponentType } from "react";

type LogoProps = {
  compact?: boolean;
};

export function Logo({ compact = false }: LogoProps) {
  return (
    <div className={`logo ${compact ? "compact" : ""}`}>
      <strong>OHO</strong>
      <span>INDIA LIFE</span>
    </div>
  );
}

type PageHeaderProps = {
  title: ReactNode;
  right?: ReactNode;
  back?: boolean;
};

export function PageHeader({ title, right, back = true }: PageHeaderProps) {
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

type BottomNavItem = {
  to: string;
  Icon: ComponentType<{ size?: number; className?: string }>;
  label: string;
};

const nav: BottomNavItem[] = [
  { to: "/", Icon: Home, label: "Home" },
  { to: "/bookings", Icon: CalendarDays, label: "Bookings" },
  { to: "/wallet", Icon: WalletCards, label: "Wallet" },
  { to: "/notifications", Icon: Bell, label: "Notifications" },
  { to: "/profile", Icon: UserRound, label: "Profile" },
];
export function BottomNav() {
  return (
    <nav className="bottom-nav">
      {nav.map(({ to, Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          end={to === "/"}
          className={({ isActive }) => (isActive ? "active" : "")}
        >
          <Icon size={19} />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

type AppShellProps = {
  children: ReactNode;
  nav?: boolean;
  className?: string;
};

export function AppShell({
  children,
  nav = true,
  className = "",
}: AppShellProps) {
  return (
    <main className={`phone-shell ${className}`}>
      <div className="phone-content">{children}</div>
      {nav && <BottomNav />}
    </main>
  );
}

export function SearchBar({
  placeholder = "Search doctors, hospitals, tests...",
}: {
  placeholder?: string;
}) {
  return (
    <label className="search-bar">
      <span>⌕</span>
      <input placeholder={placeholder} />
      <span>🎙️</span>
    </label>
  );
}

type ChipProps = {
  children: ReactNode;
  active?: boolean;
};

export function Chip({ children, active = false }: ChipProps) {
  return (
    <button className={`chip ${active ? "active" : ""}`}>{children}</button>
  );
}
type PrimaryButtonProps = {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
};

export function PrimaryButton({
  children,
  onClick,
  className = "",
}: PrimaryButtonProps) {
  return (
    <button onClick={onClick} className={`primary-btn ${className}`}>
      {children}
    </button>
  );
}
