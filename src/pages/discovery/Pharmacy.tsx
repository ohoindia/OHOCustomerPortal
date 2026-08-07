import { AppShell, PageHeader } from '../../components/Layout';

export function Pharmacy() {
  return (
    <AppShell>
      <PageHeader title="Pharmacy" />
      <section className="upload-card">
        <div>
          <b>Upload Prescription</b>
          <p>Get medicines at best prices</p>
          <button>Upload Now</button>
        </div>
        <span>📄</span>
      </section>
      <div className="service-grid four">
        {['All Medicines', 'Health Care', 'Baby Care', 'Devices'].map(
          (x, i) => (
            <button key={x}>
              <span>{['💊', '🧴', '👶', '⌚'][i]}</span>
              <small>{x}</small>
            </button>
          )
        )}
      </div>
      <div className="section-title">
        <h2>Order Again</h2>
        <button>View All</button>
      </div>
    </AppShell>
  );
}
