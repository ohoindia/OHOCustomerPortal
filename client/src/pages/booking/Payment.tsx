import {
  paymentMethods,
  paymentMethodIcons,
} from "../../../../common/content/options";
import { UI_TEXT } from "../../../../common/content/labels";
import { useNavigate } from "react-router-dom";
import { AppShell, PageHeader, PrimaryButton } from "../../components/Layout";

export function Payment() {
  const nav = useNavigate();
  return (
    <AppShell nav={false}>
      <PageHeader title={UI_TEXT.payment} />
      <section className="amount-box">
        <span>{UI_TEXT.amountToPay}</span>
        <strong>{UI_TEXT.value8002}</strong>
        <button>{UI_TEXT.viewDetails}</button>
      </section>
      <h3>{UI_TEXT.paymentMethods}</h3>
      {paymentMethods.map((m, i) => (
        <label className="payment-row" key={m}>
          <span>{paymentMethodIcons[i]}</span>
          <b>{m}</b>
          <input type="radio" name="pay" defaultChecked={i === 3} />
        </label>
      ))}
      <PrimaryButton onClick={() => nav("/order-tracking")}>
        {UI_TEXT.pay800}
      </PrimaryButton>
    </AppShell>
  );
}
