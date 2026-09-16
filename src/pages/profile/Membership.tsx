import { AppShell, PageHeader } from "../../components/Layout";

function LogoMini() {
  return <div className="logo-mini">OHO</div>;
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
        "Discounts at partner hospitals",
        "Free annual health check",
        "Priority appointment booking",
        "OHO Coins on every purchase",
      ].map((x) => (
        <div className="benefit" key={x}>
          ✓ {x}
        </div>
      ))}
    </AppShell>
  );
}
