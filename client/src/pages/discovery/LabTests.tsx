import { UI_TEXT } from "../../../../common/content/labels";
import { AppShell, PageHeader, SearchBar, Chip } from "../../components/Layout";
import { labTests } from "../../data/mockData";

export function LabTests() {
  return (
    <AppShell>
      <PageHeader title={UI_TEXT.labTests} />
      <SearchBar placeholder={UI_TEXT.searchTests} />
      <div className="chips">
        <Chip active>{UI_TEXT.popular}</Chip>
        <Chip>{UI_TEXT.bloodTests}</Chip>
        <Chip>{UI_TEXT.diabetes}</Chip>
        <Chip>{UI_TEXT.thyroid}</Chip>
      </div>
      <div className="stack">
        {labTests.map((t) => (
          <article className="test-row" key={t.id}>
            <span>{t.name}</span>
            <b>
              {UI_TEXT.currencySymbol}
              {t.price}
            </b>
            <button>{UI_TEXT.book}</button>
          </article>
        ))}
      </div>
      <section className="blue-banner">
        <span>{UI_TEXT.deliveryVanIcon}</span>
        <div>
          <b>{UI_TEXT.bookHomeCollection}</b>
          <p>{UI_TEXT.freeSamplePickupAtYourHome}</p>
        </div>
      </section>
    </AppShell>
  );
}
