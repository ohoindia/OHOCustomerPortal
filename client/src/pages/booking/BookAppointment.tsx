import { useNavigate } from "react-router-dom";
import { AppShell, PageHeader, PrimaryButton } from "../../components/Layout";
import { doctors } from "../../data/mockData";

export function BookAppointment() {
  const nav = useNavigate();
  const d = doctors[0];
  return (
    <AppShell>
      <PageHeader title="Book Appointment" />
      <article className="doctor-summary">
        <span>{d.avatar}</span>
        <div>
          <b>{d.name}</b>
          <small>{d.specialty}</small>
          <small>{d.hospital}</small>
        </div>
      </article>
      <h3 className="form-title">Select Date</h3>
      <div className="date-grid">
        {[
          ["Mon", "20"],
          ["Tue", "21"],
          ["Wed", "22"],
          ["Thu", "23"],
          ["Fri", "24"],
        ].map((d, i) => (
          <button className={i === 0 ? "selected" : ""} key={d[1]}>
            <small>{d[0]}</small>
            <b>{d[1]}</b>
            <small>May</small>
          </button>
        ))}
      </div>
      <h3 className="form-title">Select Time</h3>
      <div className="time-grid">
        {[
          "09:00 AM",
          "09:30 AM",
          "10:00 AM",
          "10:30 AM",
          "11:00 AM",
          "11:30 AM",
        ].map((t, i) => (
          <button className={i === 3 ? "selected" : ""} key={t}>
            {t}
          </button>
        ))}
      </div>
      <h3 className="form-title">Patient Details</h3>
      <article className="patient-row">
        <span>👤</span>
        <div>
          <b>Srikanth Reddy</b>
          <small>+91 98765 43210</small>
        </div>
        <span>›</span>
      </article>
      <PrimaryButton onClick={() => nav("/payment")}>
        Proceed to Pay <span>₹800 →</span>
      </PrimaryButton>
    </AppShell>
  );
}
