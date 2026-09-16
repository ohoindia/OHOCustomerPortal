import { AppShell, PageHeader } from "../../components/Layout";
import { MenuRow } from "../../components/Cards";

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
