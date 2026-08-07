import { AppShell, PageHeader } from '../../components/Layout';

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
