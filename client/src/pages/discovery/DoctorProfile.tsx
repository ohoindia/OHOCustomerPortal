import { UI_TEXT } from "../../../../common/content/labels";
import { useNavigate } from "react-router-dom";
import { Share2 } from "../../components/Icons";
import { AppShell, PageHeader, PrimaryButton } from "../../components/Layout";
import { doctors } from "../../data/mockData";

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
