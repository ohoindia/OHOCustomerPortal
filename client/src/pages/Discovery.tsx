import {
  pharmacyCategories,
  pharmacyCategoryIcons,
} from "../../../common/content/options";
import { UI_TEXT } from "../../../common/content/labels";
import { Heart, Share2 } from "../components/Icons";
import { useNavigate } from "react-router-dom";
import {
  AppShell,
  PageHeader,
  SearchBar,
  Chip,
  PrimaryButton,
} from "../components/Layout";
import { HospitalCard } from "../components/Cards";
import {
  hospitals,
  doctors,
  packages,
  labTests,
  medicines,
} from "../data/mockData";

export function Hospitals() {
  return (
    <AppShell>
      <PageHeader title={UI_TEXT.hospitals} right={<Heart size={19} />} />
      <SearchBar placeholder={UI_TEXT.searchHospitals2} />
      <div className="chips">
        <Chip active>{UI_TEXT.all}</Chip>
        <Chip>{UI_TEXT.multiSpeciality}</Chip>
        <Chip>{UI_TEXT.cardiac}</Chip>
        <Chip>{UI_TEXT.ortho}</Chip>
      </div>
      <div className="stack">
        {hospitals.map((h) => (
          <HospitalCard key={h.id} hospital={h} />
        ))}
      </div>
    </AppShell>
  );
}

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

export function DoctorProfile() {
  const nav = useNavigate();
  const d = doctors[0];
  return (
    <AppShell>
      <PageHeader title={UI_TEXT.doctorProfile} right={<Share2 size={18} />} />
      <section className="doctor-profile">
        <div className="doctor-big">{d.avatar}</div>
        <h1>{d.name}</h1>
        <p>{d.degree}</p>
        <p>
          {UI_TEXT.heartPrefix}
          {d.experience}
          {UI_TEXT.experience}
        </p>
        <p>
          {UI_TEXT.locationPrefix}
          {d.hospital}
        </p>
        <span className="review-badge">
          {UI_TEXT.starPrefix}
          {d.rating}
          {UI_TEXT.openParenthesis}
          {d.reviews}
          {UI_TEXT.reviews}
        </span>
      </section>
      <div className="tabs">
        <b>{UI_TEXT.about}</b>
        <span>{UI_TEXT.experience2}</span>
        <span>{UI_TEXT.reviews2}</span>
        <span>{UI_TEXT.fees}</span>
      </div>
      <p className="body-copy">
        {UI_TEXT.cardiologistWith15YearsOfExperienceInInterventionalCardiology}
      </p>
      <div className="fee">
        <span>{UI_TEXT.consultationFee}</span>
        <b>
          {UI_TEXT.currencySymbol}
          {d.fee}
        </b>
      </div>
      <PrimaryButton onClick={() => nav("/book-appointment")}>
        {UI_TEXT.bookAppointment}
      </PrimaryButton>
    </AppShell>
  );
}

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

export function Pharmacy() {
  return (
    <AppShell>
      <PageHeader title={UI_TEXT.pharmacy} />
      <SearchBar placeholder={UI_TEXT.searchMedicines} />
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
      {medicines.map((m) => (
        <article className="medicine-row" key={m.id}>
          <span className="med-icon">{m.icon}</span>
          <div>
            <b>{m.name}</b>
            <small>{m.pack}</small>
            <strong>
              {UI_TEXT.currencySymbol}
              {m.price}
            </strong>
          </div>
          <button>{UI_TEXT.add}</button>
        </article>
      ))}
    </AppShell>
  );
}
