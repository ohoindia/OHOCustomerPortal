import { sampleOrderTimeline } from "../../../../common/content/options";
import { UI_TEXT } from "../../../../common/content/labels";
import { AppShell, PageHeader } from "../../components/Layout";

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
