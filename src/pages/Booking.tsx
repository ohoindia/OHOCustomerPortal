import { useNavigate } from 'react-router-dom';
import { AppShell, PageHeader, PrimaryButton } from '../components/Layout';
import { BookingCard } from '../components/Cards';
import { bookings, doctors } from '../data/mockData';

export function BookAppointment() {
  const nav = useNavigate();
  const d = doctors[0];
  return (
    <AppShell>
      <PageHeader title="Book Appointment" />
      <article className="doctor-summary">
        <span>{d.avatar}</span>
        <div>
          <b>{d.name}</b>
          <small>{d.specialty}</small>
          <small>{d.hospital}</small>
        </div>
      </article>
      <h3 className="form-title">Select Date</h3>
      <div className="date-grid">
        {[
          ['Mon', '20'],
          ['Tue', '21'],
          ['Wed', '22'],
          ['Thu', '23'],
          ['Fri', '24'],
        ].map((d, i) => (
          <button className={i === 0 ? 'selected' : ''} key={d[1]}>
            <small>{d[0]}</small>
            <b>{d[1]}</b>
            <small>May</small>
          </button>
        ))}
      </div>
      <h3 className="form-title">Select Time</h3>
      <div className="time-grid">
        {[
          '09:00 AM',
          '09:30 AM',
          '10:00 AM',
          '10:30 AM',
          '11:00 AM',
          '11:30 AM',
        ].map((t, i) => (
          <button className={i === 3 ? 'selected' : ''} key={t}>
            {t}
          </button>
        ))}
      </div>
      <h3 className="form-title">Patient Details</h3>
      <article className="patient-row">
        <span>👤</span>
        <div>
          <b>Srikanth Reddy</b>
          <small>+91 98765 43210</small>
        </div>
        <span>›</span>
      </article>
      <PrimaryButton onClick={() => nav('/payment')}>
        Proceed to Pay <span>₹800 →</span>
      </PrimaryButton>
    </AppShell>
  );
}

export function Bookings() {
  return (
    <AppShell>
      <PageHeader title="My Bookings" back={false} />
      <div className="tabs booking-tabs">
        <b>Upcoming</b>
        <span>Completed</span>
        <span>Cancelled</span>
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
    <AppShell nav={false}>
      <PageHeader title="Payment" />
      <section className="amount-box">
        <span>Amount to Pay</span>
        <strong>₹800</strong>
        <button>View Details</button>
      </section>
      <h3>Payment Methods</h3>
      {[
        'UPI (PhonePe / GPay / Paytm)',
        'Credit / Debit Card',
        'Net Banking',
        'OHO Wallet · Balance ₹2,450',
      ].map((m, i) => (
        <label className="payment-row" key={m}>
          <span>{['◉', '▣', '⌂', '▰'][i]}</span>
          <b>{m}</b>
          <input type="radio" name="pay" defaultChecked={i === 3} />
        </label>
      ))}
      <PrimaryButton onClick={() => nav('/order-tracking')}>
        Pay ₹800
      </PrimaryButton>
    </AppShell>
  );
}

export function OrderTracking() {
  return (
    <AppShell nav={false}>
      <PageHeader title="Order Tracking" />
      <div className="timeline">
        {[
          ['Order Placed', '20 May 2026, 10:00 AM'],
          ['Confirmed', '20 May 2026, 10:05 AM'],
          ['Packed', '20 May 2026, 11:30 AM'],
          ['Out for Delivery', '20 May 2026, 04:00 PM'],
          ['Delivered', '20 May 2026, 06:15 PM'],
        ].map(([a, b]) => (
          <div className="timeline-row" key={a}>
            <span>✓</span>
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
