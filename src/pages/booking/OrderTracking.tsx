import { AppShell, PageHeader } from "../../components/Layout";

export function OrderTracking() {
  return (
    <AppShell nav={false}>
      <PageHeader title="Order Tracking" />
      <div className="timeline">
        {[
          ["Order Placed", "20 May 2026, 10:00 AM"],
          ["Confirmed", "20 May 2026, 10:05 AM"],
          ["Packed", "20 May 2026, 11:30 AM"],
          ["Out for Delivery", "20 May 2026, 04:00 PM"],
          ["Delivered", "20 May 2026, 06:15 PM"],
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
