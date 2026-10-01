import { AppShell, PageHeader, SearchBar, Chip } from "../../components/Layout";
import { packages } from "../../data/mockData";

export function Packages() {
  return (
    <AppShell>
      <PageHeader title="Wellness Packages" />
      <SearchBar placeholder="Search packages..." />
      <div className="chips">
        <Chip active>All</Chip>
        <Chip>Full Body Checkup</Chip>
        <Chip>Senior Citizen</Chip>
      </div>
      <div className="stack">
        {packages.map((p) => (
          <article className="list-card package-card" key={p.id}>
            <div className="card-visual">{p.icon}</div>
            <div className="card-grow">
              <h3>{p.name}</h3>
              <p>{p.tests} Tests</p>
              <b>
                ₹{p.price} <del>₹{p.oldPrice}</del>
              </b>
              <span className="discount">{p.off} OFF</span>
              <button className="text-btn">Book Now</button>
            </div>
          </article>
        ))}
      </div>
    </AppShell>
  );
}
