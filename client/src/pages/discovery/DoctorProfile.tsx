import { useNavigate } from "react-router-dom";
import { Share2 } from "../../components/Icons";
import { AppShell, PageHeader, PrimaryButton } from "../../components/Layout";
import { doctors } from "../../data/mockData";

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
