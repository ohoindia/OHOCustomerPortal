import { useNavigate } from "react-router-dom";
import { AppShell, PageHeader, SearchBar, Chip } from "../../components/Layout";
import { doctors } from "../../data/mockData";

export function Doctors() {
  const nav = useNavigate();
  return (
    <AppShell>
      <PageHeader title="Doctors" />
      <SearchBar placeholder="Search doctors or specialty..." />
      <div className="chips">
        <Chip active>All</Chip>
        <Chip>Cardiology</Chip>
        <Chip>Pediatrics</Chip>
      </div>
      <div className="stack">
        {doctors.map((d) => (
          <article className="list-card doctor-row" key={d.id}>
            <div className="doctor-avatar">{d.avatar}</div>
            <div className="card-grow">
              <h3>{d.name}</h3>
              <p>
                {d.specialty} · {d.experience}
              </p>
              <p>{d.hospital}</p>
              <div className="rating">
                ★ {d.rating} ({d.reviews})
              </div>
              <button
                className="text-btn"
                onClick={() => nav(`/doctor/${d.id}`)}
              >
                View Profile
              </button>
            </div>
          </article>
        ))}
      </div>
    </AppShell>
  );
}
