import { UI_TEXT } from "../../../../common/content/labels";
import { AppShell, PageHeader } from "../../components/Layout";
import { MenuRow } from "../../components/Cards";

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
