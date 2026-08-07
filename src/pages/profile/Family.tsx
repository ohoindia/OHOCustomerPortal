import { AppShell, PageHeader } from '../../components/Layout';

export function Family() {
  return (
    <AppShell nav={false}>
      <PageHeader title="My Family" />
      <div className="stack">
        {[
          ['Srikanth Reddy', 'Self', '👨🏻'],
          ['Sujatha Reddy', 'Wife', '👩🏻'],
          ['Chinnu Reddy', 'Daughter', '👧🏻'],
        ].map(([n, r, a]) => (
          <article className="family-row" key={n}>
            <span>{a}</span>
            <div>
              <b>{n}</b>
              <small>{r}</small>
            </div>
            <span>›</span>
          </article>
        ))}
      </div>
      <button className="outline-btn">+ Add Family Member</button>
    </AppShell>
  );
}
