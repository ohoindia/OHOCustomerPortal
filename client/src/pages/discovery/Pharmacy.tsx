import {
  pharmacyCategories,
  pharmacyCategoryIcons,
} from "../../../../common/content/options";
import { UI_TEXT } from "../../../../common/content/labels";
import { AppShell, PageHeader } from "../../components/Layout";

export function Pharmacy() {
  return (
    <AppShell>
      <PageHeader title={UI_TEXT.pharmacy} />
      <section className="upload-card">
        <div>
          <b>{UI_TEXT.uploadPrescription}</b>
          <p>{UI_TEXT.getMedicinesAtBestPrices}</p>
          <button>{UI_TEXT.uploadNow}</button>
        </div>
        <span>{UI_TEXT.decoration1F4C4}</span>
      </section>
      <div className="service-grid four">
        {pharmacyCategories.map((x, i) => (
          <button key={x}>
            <span>{pharmacyCategoryIcons[i]}</span>
            <small>{x}</small>
          </button>
        ))}
      </div>
      <div className="section-title">
        <h2>{UI_TEXT.orderAgain}</h2>
        <button>{UI_TEXT.viewAll}</button>
      </div>
    </AppShell>
  );
}
