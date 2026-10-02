import { UI_TEXT } from "../../../../common/content/labels";
import { useNavigate } from "react-router-dom";
import { AppShell, PageHeader, SearchBar, Chip } from "../../components/Layout";
import { doctors } from "../../data/mockData";

export function Doctors() {
  const nav = useNavigate();
  return (
    <AppShell>
      <PageHeader title={UI_TEXT.doctors} />
      <SearchBar placeholder={UI_TEXT.searchDoctorsOrSpecialty} />
      <div className="chips">
        <Chip active>{UI_TEXT.all}</Chip>
        <Chip>{UI_TEXT.cardiology}</Chip>
        <Chip>{UI_TEXT.pediatrics}</Chip>
      </div>
      <div className="stack">
        {doctors.map((d) => (
          <article className="list-card doctor-row" key={d.id}>
            <div className="doctor-avatar">{d.avatar}</div>
            <div className="card-grow">
              <h3>{d.name}</h3>
              <p>
                {d.specialty}
                {UI_TEXT.separator}
                {d.experience}
              </p>
              <p>{d.hospital}</p>
              <div className="rating">
                {UI_TEXT.starPrefix}
                {d.rating}
                {UI_TEXT.openParenthesis}
                {d.reviews}
                {UI_TEXT.closeParenthesis}
              </div>
              <button
                className="text-btn"
                onClick={() => nav(`/doctor/${d.id}`)}
              >
                {UI_TEXT.viewProfile}
              </button>
            </div>
          </article>
        ))}
      </div>
    </AppShell>
  );
}
