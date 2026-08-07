import { AppShell, PageHeader } from '../../components/Layout';
import { BookingCard } from '../../components/Cards';
import { bookings } from '../../data/mockData';

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
