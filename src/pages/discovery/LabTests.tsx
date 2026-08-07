import {
  AppShell,
  PageHeader,
  SearchBar,
  Chip,
} from '../../components/Layout';
import { labTests } from '../../data/mockData';

export function LabTests() {
  return (
    <AppShell>
      <PageHeader title="Lab Tests" />
      <SearchBar placeholder="Search tests..." />
      <div className="chips">
        <Chip active>Popular</Chip>
        <Chip>Blood Tests</Chip>
        <Chip>Diabetes</Chip>
        <Chip>Thyroid</Chip>
      </div>
      <div className="stack">
        {labTests.map((t) => (
          <article className="test-row" key={t.id}>
            <span>{t.name}</span>
            <b>₹{t.price}</b>
            <button>Book</button>
          </article>
        ))}
      </div>
      <section className="blue-banner">
        <span>🚐</span>
        <div>
          <b>Book Home Collection</b>
          <p>Free sample pickup at your home</p>
        </div>
      </section>
    </AppShell>
  );
}
