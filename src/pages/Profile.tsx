import { useNavigate } from 'react-router-dom';
import { Settings } from '../components/Icons';
import { AppShell, PageHeader } from '../components/Layout';
import { MenuRow } from '../components/Cards';

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
          onClick={() => nav('/family')}
        />
        <MenuRow
          icon="📋"
          title="My Health Records"
          subtitle="View reports & prescriptions"
          onClick={() => nav('/records')}
        />
        <MenuRow
          icon="🏅"
          title="Membership"
          subtitle="Gold Wellness Card"
          onClick={() => nav('/membership')}
        />
        <MenuRow
          icon="👛"
          title="Wallet & Rewards"
          subtitle="Cashback, offers & coupons"
          onClick={() => nav('/wallet')}
        />
        <MenuRow
          icon="💳"
          title="Payment Methods"
          subtitle="Cards, UPI & wallets"
        />
        <MenuRow icon="🎧" title="Support" subtitle="Help & support" />
      </div>
    </AppShell>
  );
}

export function Family() {
  return (
    <AppShell nav={false}>
      <PageHeader title="My Family" />
      <div className="stack">
        {[
          ['Srikanth Reddy', 'Self', '👨🏻'],
          ['Sujatha Reddy', 'Wife', '👩🏻'],
          ['Chinnu Reddy', 'Daughter', '👧🏻'],
        ].map(([n, r, a]) => (
          <article className="family-row" key={n}>
            <span>{a}</span>
            <div>
              <b>{n}</b>
              <small>{r}</small>
            </div>
            <span>›</span>
          </article>
        ))}
      </div>
      <button className="outline-btn">+ Add Family Member</button>
    </AppShell>
  );
}

export function Records() {
  return (
    <AppShell nav={false}>
      <PageHeader title="Health Records" />
      <div className="tabs">
        <b>Reports</b>
        <span>Prescriptions</span>
      </div>
      {[
        ['Blood Test Report', '20 May 2026'],
        ['X-Ray Chest', '15 Apr 2026'],
        ['ECG Report', '10 Mar 2026'],
        ['MRI Scan', '05 Feb 2026'],
      ].map(([a, b]) => (
        <article className="record-row" key={a}>
          <span>📄</span>
          <div>
            <b>{a}</b>
            <small>{b}</small>
          </div>
          <span>›</span>
        </article>
      ))}
    </AppShell>
  );
}

export function Wallet() {
  return (
    <AppShell>
      <PageHeader title="Wallet & Rewards" back={false} />
      <section className="wallet-card">
        <span>Total Balance</span>
        <strong>₹2,450</strong>
        <b>👛</b>
      </section>
      <div className="wallet-stats">
        <article>
          <span>Cashback</span>
          <b>₹850</b>
        </article>
        <article>
          <span>OHO Coins</span>
          <b>🪙 1,600</b>
        </article>
      </div>
      <MenuRow
        icon="↔"
        title="Transaction History"
        subtitle="View recent transactions"
      />
      <MenuRow
        icon="🎁"
        title="Redeem Coins"
        subtitle="Use coins for rewards"
      />
    </AppShell>
  );
}

export function Notifications() {
  return (
    <AppShell>
      <PageHeader title="Notifications" back={false} />
      <h4 className="day-label">Today</h4>
      {[
        [
          '📅',
          'Appointment Confirmed',
          'Dr. Rajesh Sharma on 20 May, 10:30 AM',
        ],
        ['🧪', 'Lab Test Reminder', 'Your blood test is scheduled tomorrow'],
      ].map(([i, a, b]) => (
        <article className="notification-row" key={a}>
          <span>{i}</span>
          <div>
            <b>{a}</b>
            <p>{b}</p>
          </div>
          <small>4:05m</small>
        </article>
      ))}
      <h4 className="day-label">Yesterday</h4>
      <article className="notification-row">
        <span>🎁</span>
        <div>
          <b>Offer for You</b>
          <p>Get 20% off on health packages</p>
        </div>
      </article>
    </AppShell>
  );
}

export function Membership() {
  return (
    <AppShell nav={false}>
      <PageHeader title="Membership" />
      <section className="membership-detail">
        <LogoMini />
        <span>GOLD</span>
        <h2>OHO Gold Wellness Card</h2>
        <p>Card No: 2804 0001 5854</p>
        <p>Valid till 20-Dec-2026</p>
      </section>
      <h3>Membership Benefits</h3>
      {[
        'Discounts at partner hospitals',
        'Free annual health check',
        'Priority appointment booking',
        'OHO Coins on every purchase',
      ].map((x) => (
        <div className="benefit" key={x}>
          ✓ {x}
        </div>
      ))}
    </AppShell>
  );
}
function LogoMini() {
  return <div className="logo-mini">OHO</div>;
}
