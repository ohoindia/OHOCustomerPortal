import { sampleNotifications } from "../../../../common/content/options";
import { UI_TEXT } from "../../../../common/content/labels";
import { AppShell, PageHeader } from "../../components/Layout";

export function Notifications() {
  return (
    <AppShell>
      <PageHeader title={UI_TEXT.notifications} back={false} />
      <h4 className="day-label">{UI_TEXT.today}</h4>
      {sampleNotifications.map(([i, a, b]) => (
        <article className="notification-row" key={a}>
          <span>{i}</span>
          <div>
            <b>{a}</b>
            <p>{b}</p>
          </div>
          <small>{UI_TEXT.value405m}</small>
        </article>
      ))}
      <h4 className="day-label">{UI_TEXT.yesterday}</h4>
      <article className="notification-row">
        <span>{UI_TEXT.giftEmoji}</span>
        <div>
          <b>{UI_TEXT.offerForYou}</b>
          <p>{UI_TEXT.get20OffOnHealthPackages}</p>
        </div>
      </article>
    </AppShell>
  );
}
