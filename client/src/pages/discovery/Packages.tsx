import { UI_TEXT } from "../../../../common/content/labels";
import { AppShell, PageHeader, SearchBar, Chip } from "../../components/Layout";
import { packages } from "../../data/mockData";

export function Packages() {
  return (
    <AppShell>
      <PageHeader title={UI_TEXT.wellnessPackages} />
      <SearchBar placeholder={UI_TEXT.searchPackages} />
      <div className="chips">
        <Chip active>{UI_TEXT.all}</Chip>
        <Chip>{UI_TEXT.fullBodyCheckup}</Chip>
        <Chip>{UI_TEXT.seniorCitizen}</Chip>
      </div>
      <div className="stack">
        {packages.map((p) => (
          <article className="list-card package-card" key={p.id}>
            <div className="card-visual">{p.icon}</div>
            <div className="card-grow">
              <h3>{p.name}</h3>
              <p>
                {p.tests}
                {UI_TEXT.tests}
              </p>
              <b>
                {UI_TEXT.currencySymbol}
                {p.price}{" "}
                <del>
                  {UI_TEXT.currencySymbol}
                  {p.oldPrice}
                </del>
              </b>
              <span className="discount">
                {p.off}
                {UI_TEXT.off}
              </span>
              <button className="text-btn">{UI_TEXT.bookNow}</button>
            </div>
          </article>
        ))}
      </div>
    </AppShell>
  );
}
