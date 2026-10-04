import {
  appointmentDates,
  appointmentTimeSlots,
  paymentMethods,
  paymentMethodIcons,
  sampleOrderTimeline,
} from "../../../common/content/options";
import { UI_TEXT } from "../../../common/content/labels";
import { useNavigate } from "react-router-dom";
import { AppShell, PageHeader, PrimaryButton } from "../components/Layout";
import { BookingCard } from "../components/Cards";
import { bookings, doctors } from "../data/mockData";

export function BookAppointment() {
  const nav = useNavigate();
  const d = doctors[0];
  return (
    <AppShell>
      <PageHeader title={UI_TEXT.bookAppointment} />
      <article className="doctor-summary">
        <span>{d.avatar}</span>
        <div>
          <b>{d.name}</b>
          <small>{d.specialty}</small>
          <small>{d.hospital}</small>
        </div>
      </article>
      <h3 className="form-title">{UI_TEXT.selectDate}</h3>
      <div className="date-grid">
        {appointmentDates.map((d, i) => (
          <button className={i === 0 ? "selected" : ""} key={d[1]}>
            <small>{d[0]}</small>
            <b>{d[1]}</b>
            <small>{UI_TEXT.may}</small>
          </button>
        ))}
      </div>
      <h3 className="form-title">{UI_TEXT.selectTime}</h3>
      <div className="time-grid">
        {appointmentTimeSlots.map((t, i) => (
          <button className={i === 3 ? "selected" : ""} key={t}>
            {t}
          </button>
        ))}
      </div>
      <h3 className="form-title">{UI_TEXT.patientDetails}</h3>
      <article className="patient-row">
        <span>{UI_TEXT.personIcon}</span>
        <div>
          <b>{UI_TEXT.srikanthReddy}</b>
          <small>{UI_TEXT.value919876543210}</small>
        </div>
        <span>{UI_TEXT.chevronRight}</span>
      </article>
      <PrimaryButton onClick={() => nav("/payment")}>
        {UI_TEXT.proceedToPay}
        <span>{UI_TEXT.value800}</span>
      </PrimaryButton>
    </AppShell>
  );
}

export function Bookings() {
  return (
    <AppShell>
      <PageHeader title={UI_TEXT.myBookings} back={false} />
      <div className="tabs booking-tabs">
        <b>{UI_TEXT.upcoming}</b>
        <span>{UI_TEXT.completed}</span>
        <span>{UI_TEXT.cancelled}</span>
      </div>
      <div className="stack">
        {bookings.map((b) => (
          <BookingCard item={b} key={b.id} />
        ))}
      </div>
    </AppShell>
  );
}

export function Payment() {
  const nav = useNavigate();
  return (
    <AppShell>
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

export function OrderTracking() {
  return (
    <AppShell>
      <PageHeader title={UI_TEXT.orderTracking} />
      <div className="timeline">
        {sampleOrderTimeline.map(([a, b]) => (
          <div className="timeline-row" key={a}>
            <span>{UI_TEXT.checkmark}</span>
            <div>
              <b>{a}</b>
              <small>{b}</small>
            </div>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
