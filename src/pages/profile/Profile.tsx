import { useNavigate } from "react-router-dom";
import { Settings } from "../../components/Icons";
import { AppShell } from "../../components/Layout";
import { MenuRow } from "../../components/Cards";
import { clearSession } from "../auth/logout";

export function Profile() {
  const nav = useNavigate();
  return (
    <AppShell>
      <section className="profile-hero">
        <div className="profile-photo">SR</div>
        <div>
          <h2>Srikanth Reddy</h2>
          <p>+91 98765 43210</p>
        </div>
        <Settings />
      </section>
      <div className="menu-list">
        <MenuRow
          icon="👨‍👩‍👧"
          title="My Family"
          subtitle="Manage family members"
          onClick={() => nav("/family")}
        />
        <MenuRow
          icon="📋"
          title="My Health Records"
          subtitle="View reports & prescriptions"
          onClick={() => nav("/records")}
        />
        <MenuRow
          icon="🏅"
          title="Membership"
          subtitle="Gold Wellness Card"
          onClick={() => nav("/membership")}
        />
        <MenuRow
          icon="👛"
          title="Wallet & Rewards"
          subtitle="Cashback, offers & coupons"
          onClick={() => nav("/wallet")}
        />
        <MenuRow
          icon="💳"
          title="Payment Methods"
          subtitle="Cards, UPI & wallets"
        />
        <MenuRow icon="🎧" title="Support" subtitle="Help & support" />
      </div>
      <MenuRow
        icon="↪"
        title="Logout"
        subtitle="Sign out of your account"
        onClick={() => {
          clearSession();
          window.location.replace("/login");
        }}
      />
    </AppShell>
  );
}
