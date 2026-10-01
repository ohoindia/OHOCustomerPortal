import { ArrowLeft } from "./Icons";
import { DashboardIcon } from "./DashboardIcon";
import { NavLink, useNavigate } from "react-router-dom";
import type { ReactNode } from "react";

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

const nav = [
  { to: "/home", icon: "home", label: "Home" },
  { to: "/bookings", icon: "calendar", label: "Appointments" },
  { to: "/records", icon: "records", label: "Health Records" },
  { to: "/profile", icon: "profile", label: "Profile" },
] as const;

export function BottomNav() {
  return (
    <nav className="family-bottom-nav" aria-label="Main navigation">
      {nav.map(({ to, icon, label }) => (
        <NavLink key={to} to={to} end={to === "/home"}>
          <DashboardIcon name={icon} />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

type AppShellProps = {
  children: ReactNode;
  className?: string;
};

export function AppShell({
  children,
  className = "",
}: AppShellProps) {
  return (
    <main className={`phone-shell ${className}`}>
      <div className="phone-content">{children}</div>
      <BottomNav />
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
