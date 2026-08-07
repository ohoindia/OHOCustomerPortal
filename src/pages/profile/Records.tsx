import { AppShell, PageHeader } from '../../components/Layout';

export function Records() {
  return (
    <AppShell nav={false}>
      <PageHeader title="Health Records" />
      <div className="tabs">
        <b>Reports</b>
        <span>Prescriptions</span>
      </div>
      {[
        ['Blood Test Report', '20 May 2026'],
        ['X-Ray Chest', '15 Apr 2026'],
        ['ECG Report', '10 Mar 2026'],
        ['MRI Scan', '05 Feb 2026'],
      ].map(([a, b]) => (
        <article className="record-row" key={a}>
          <span>📄</span>
          <div>
            <b>{a}</b>
            <small>{b}</small>
          </div>
          <span>›</span>
        </article>
      ))}
    </AppShell>
  );
}
