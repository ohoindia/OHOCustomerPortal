import { sampleHealthRecords } from "../../../../common/content/options";
import { UI_TEXT } from "../../../../common/content/labels";
import { AppShell, PageHeader } from "../../components/Layout";

export function Records() {
  return (
    <AppShell>
      <PageHeader title={UI_TEXT.healthRecords} />
      <div className="tabs">
        <b>{UI_TEXT.reports}</b>
        <span>{UI_TEXT.prescriptions}</span>
      </div>
      {sampleHealthRecords.map(([a, b]) => (
        <article className="record-row" key={a}>
          <span>{UI_TEXT.decoration1F4C4}</span>
          <div>
            <b>{a}</b>
            <small>{b}</small>
          </div>
          <span>{UI_TEXT.chevronRight}</span>
        </article>
      ))}
    </AppShell>
  );
}
