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
      <PageHeader title="Hospitals" right={<Heart size={19} />} />
      <SearchBar placeholder="Search hospitals..." />
      <div className="chips">
        <Chip active>All</Chip>
        <Chip>Multi Speciality</Chip>
        <Chip>Cardiac</Chip>
        <Chip>Ortho</Chip>
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

export function DoctorProfile() {
  const nav = useNavigate();
  const d = doctors[0];
  return (
    <AppShell>
      <PageHeader title="Doctor Profile" right={<Share2 size={18} />} />
      <section className="doctor-profile">
        <div className="doctor-big">{d.avatar}</div>
        <h1>{d.name}</h1>
        <p>{d.degree}</p>
        <p>♡ {d.experience} Experience</p>
        <p>⌖ {d.hospital}</p>
        <span className="review-badge">
          ★ {d.rating} ({d.reviews} Reviews)
        </span>
      </section>
      <div className="tabs">
        <b>About</b>
        <span>Experience</span>
        <span>Reviews</span>
        <span>Fees</span>
      </div>
      <p className="body-copy">
        Cardiologist with 15+ years of experience in interventional cardiology,
        angioplasty, heart failure and preventive cardiology.
      </p>
      <div className="fee">
        <span>Consultation Fee</span>
        <b>₹{d.fee}</b>
      </div>
      <PrimaryButton onClick={() => nav("/book-appointment")}>
        Book Appointment
      </PrimaryButton>
    </AppShell>
  );
}

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

export function Pharmacy() {
  return (
    <AppShell>
      <PageHeader title="Pharmacy" />
      <SearchBar placeholder="Search medicines..." />
      <section className="upload-card">
        <div>
          <b>Upload Prescription</b>
          <p>Get medicines at best prices</p>
          <button>Upload Now</button>
        </div>
        <span>📄</span>
      </section>
      <div className="service-grid four">
        {["All Medicines", "Health Care", "Baby Care", "Devices"].map(
          (x, i) => (
            <button key={x}>
              <span>{["💊", "🧴", "👶", "⌚"][i]}</span>
              <small>{x}</small>
            </button>
          ),
        )}
      </div>
      <div className="section-title">
        <h2>Order Again</h2>
        <button>View All</button>
      </div>
      {medicines.map((m) => (
        <article className="medicine-row" key={m.id}>
          <span className="med-icon">{m.icon}</span>
          <div>
            <b>{m.name}</b>
            <small>{m.pack}</small>
            <strong>₹{m.price}</strong>
          </div>
          <button>Add</button>
        </article>
      ))}
    </AppShell>
  );
}
