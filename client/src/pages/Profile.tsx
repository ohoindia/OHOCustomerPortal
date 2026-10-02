import {
  sampleFamilyMembers,
  sampleHealthRecords,
  sampleNotifications,
  membershipBenefits,
} from "../../../common/content/options";
import { UI_TEXT } from "../../../common/content/labels";
import { useNavigate } from "react-router-dom";
import { Settings } from "../components/Icons";
import { AppShell, PageHeader } from "../components/Layout";
import { MenuRow } from "../components/Cards";

export function Profile() {
  const nav = useNavigate();
  return (
    <AppShell>
      <section className="profile-hero">
        <div className="profile-photo">{UI_TEXT.sr}</div>
        <div>
          <h2>{UI_TEXT.srikanthReddy}</h2>
          <p>{UI_TEXT.value919876543210}</p>
        </div>
        <Settings />
      </section>
      <div className="menu-list">
        <MenuRow
          icon={UI_TEXT.familyIcon}
          title={UI_TEXT.myFamily}
          subtitle={UI_TEXT.manageFamilyMembers}
          onClick={() => nav("/family")}
        />
        <MenuRow
          icon={UI_TEXT.recordsEmoji}
          title={UI_TEXT.myHealthRecords}
          subtitle={UI_TEXT.viewReportsPrescriptions}
          onClick={() => nav("/records")}
        />
        <MenuRow
          icon={UI_TEXT.medalEmoji}
          title={UI_TEXT.membership}
          subtitle={UI_TEXT.goldWellnessCard}
          onClick={() => nav("/membership")}
        />
        <MenuRow
          icon={UI_TEXT.purseEmoji}
          title={UI_TEXT.walletRewards}
          subtitle={UI_TEXT.cashbackOffersCoupons}
          onClick={() => nav("/wallet")}
        />
        <MenuRow
          icon={UI_TEXT.paymentCardEmoji}
          title={UI_TEXT.paymentMethods}
          subtitle={UI_TEXT.cardsUpiWallets}
        />
        <MenuRow
          icon={UI_TEXT.supportEmoji}
          title={UI_TEXT.support2}
          subtitle={UI_TEXT.helpSupport2}
        />
      </div>
    </AppShell>
  );
}

export function Family() {
  return (
    <AppShell nav={false}>
      <PageHeader title={UI_TEXT.myFamily} />
      <div className="stack">
        {sampleFamilyMembers.map(([n, r, a]) => (
          <article className="family-row" key={n}>
            <span>{a}</span>
            <div>
              <b>{n}</b>
              <small>{r}</small>
            </div>
            <span>{UI_TEXT.chevronRight}</span>
          </article>
        ))}
      </div>
      <button className="outline-btn">{UI_TEXT.addFamilyMember}</button>
    </AppShell>
  );
}

export function Records() {
  return (
    <AppShell nav={false}>
      <PageHeader title={UI_TEXT.healthRecords} />
      <div className="tabs">
        <b>{UI_TEXT.reports}</b>
        <span>{UI_TEXT.prescriptions}</span>
      </div>
      {sampleHealthRecords.map(([a, b]) => (
        <article className="record-row" key={a}>
          <span>{UI_TEXT.decoration1F4C4}</span>
          <div>
            <b>{a}</b>
            <small>{b}</small>
          </div>
          <span>{UI_TEXT.chevronRight}</span>
        </article>
      ))}
    </AppShell>
  );
}

export function Wallet() {
  return (
    <AppShell>
      <PageHeader title={UI_TEXT.walletRewards} back={false} />
      <section className="wallet-card">
        <span>{UI_TEXT.totalBalance}</span>
        <strong>{UI_TEXT.value2450}</strong>
        <b>{UI_TEXT.purseEmoji}</b>
      </section>
      <div className="wallet-stats">
        <article>
          <span>{UI_TEXT.cashback}</span>
          <b>{UI_TEXT.value850}</b>
        </article>
        <article>
          <span>{UI_TEXT.ohoCoins}</span>
          <b>{UI_TEXT.value1600}</b>
        </article>
      </div>
      <MenuRow
        icon={UI_TEXT.transferIcon}
        title={UI_TEXT.transactionHistory}
        subtitle={UI_TEXT.viewRecentTransactions}
      />
      <MenuRow
        icon={UI_TEXT.giftEmoji}
        title={UI_TEXT.redeemCoins}
        subtitle={UI_TEXT.useCoinsForRewards}
      />
    </AppShell>
  );
}

export function Notifications() {
  return (
    <AppShell>
      <PageHeader title={UI_TEXT.notifications} back={false} />
      <h4 className="day-label">{UI_TEXT.today}</h4>
      {sampleNotifications.map(([i, a, b]) => (
        <article className="notification-row" key={a}>
          <span>{i}</span>
          <div>
            <b>{a}</b>
            <p>{b}</p>
          </div>
          <small>{UI_TEXT.value405m}</small>
        </article>
      ))}
      <h4 className="day-label">{UI_TEXT.yesterday}</h4>
      <article className="notification-row">
        <span>{UI_TEXT.giftEmoji}</span>
        <div>
          <b>{UI_TEXT.offerForYou}</b>
          <p>{UI_TEXT.get20OffOnHealthPackages}</p>
        </div>
      </article>
    </AppShell>
  );
}

export function Membership() {
  return (
    <AppShell nav={false}>
      <PageHeader title={UI_TEXT.membership} />
      <section className="membership-detail">
        <LogoMini />
        <span>{UI_TEXT.gold}</span>
        <h2>{UI_TEXT.ohoGoldWellnessCard}</h2>
        <p>{UI_TEXT.cardNo280400015854}</p>
        <p>{UI_TEXT.validTill20Dec2026}</p>
      </section>
      <h3>{UI_TEXT.membershipBenefits}</h3>
      {membershipBenefits.map((x) => (
        <div className="benefit" key={x}>
          {UI_TEXT.checkmarkPrefix}
          {x}
        </div>
      ))}
    </AppShell>
  );
}
function LogoMini() {
  return <div className="logo-mini">{UI_TEXT.oho}</div>;
}
