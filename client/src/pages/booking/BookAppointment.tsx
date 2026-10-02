import {
  appointmentDates,
  appointmentTimeSlots,
} from "../../../../common/content/options";
import { UI_TEXT } from "../../../../common/content/labels";
import { useNavigate } from "react-router-dom";
import { AppShell, PageHeader, PrimaryButton } from "../../components/Layout";
import { doctors } from "../../data/mockData";

export function BookAppointment() {
  const nav = useNavigate();
  const d = doctors[0];
  return (
    <AppShell>
      <PageHeader title={UI_TEXT.bookAppointment} />
      <article className="doctor-summary">
        <span>{d.avatar}</span>
        <div>
          <b>{d.name}</b>
          <small>{d.specialty}</small>
          <small>{d.hospital}</small>
        </div>
      </article>
      <h3 className="form-title">{UI_TEXT.selectDate}</h3>
      <div className="date-grid">
        {appointmentDates.map((d, i) => (
          <button className={i === 0 ? "selected" : ""} key={d[1]}>
            <small>{d[0]}</small>
            <b>{d[1]}</b>
            <small>{UI_TEXT.may}</small>
          </button>
        ))}
      </div>
      <h3 className="form-title">{UI_TEXT.selectTime}</h3>
      <div className="time-grid">
        {appointmentTimeSlots.map((t, i) => (
          <button className={i === 3 ? "selected" : ""} key={t}>
            {t}
          </button>
        ))}
      </div>
      <h3 className="form-title">{UI_TEXT.patientDetails}</h3>
      <article className="patient-row">
        <span>{UI_TEXT.personIcon}</span>
        <div>
          <b>{UI_TEXT.srikanthReddy}</b>
          <small>{UI_TEXT.value919876543210}</small>
        </div>
        <span>{UI_TEXT.chevronRight}</span>
      </article>
      <PrimaryButton onClick={() => nav("/payment")}>
        {UI_TEXT.proceedToPay}
        <span>{UI_TEXT.value800}</span>
      </PrimaryButton>
    </AppShell>
  );
}
