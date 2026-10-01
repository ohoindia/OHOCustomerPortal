import { useNavigate } from "react-router-dom";
import { AppShell, PageHeader, PrimaryButton } from "../../components/Layout";

export function Payment() {
  const nav = useNavigate();
  return (
    <AppShell nav={false}>
      <PageHeader title="Payment" />
      <section className="amount-box">
        <span>Amount to Pay</span>
        <strong>₹800</strong>
        <button>View Details</button>
      </section>
      <h3>Payment Methods</h3>
      {[
        "UPI (PhonePe / GPay / Paytm)",
        "Credit / Debit Card",
        "Net Banking",
        "OHO Wallet · Balance ₹2,450",
      ].map((m, i) => (
        <label className="payment-row" key={m}>
          <span>{["◉", "▣", "⌂", "▰"][i]}</span>
          <b>{m}</b>
          <input type="radio" name="pay" defaultChecked={i === 3} />
        </label>
      ))}
      <PrimaryButton onClick={() => nav("/order-tracking")}>
        Pay ₹800
      </PrimaryButton>
    </AppShell>
  );
}
