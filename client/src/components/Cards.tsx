import { translate as localize } from "../../../common/content/locale";
import { UI_TEXT } from "../../../common/content/labels";
import { Star, ChevronRight } from "./Icons";
import { useNavigate } from "react-router-dom";
import type { ReactNode } from "react";
import { BookingQr } from "./BookingQr";

type Hospital = {
  id: number;
  name: string;
  area: string;
  rating: number;
  reviews: number;
  distance: string;
  icon: string;
};

type Booking = {
  id: number;
  title: string;
  subtitle: string;
  patientName?: string;
  date: string;
  status: string;
  icon: string;
};

type HospitalCardProps = {
  hospital: Hospital;
};

export function HospitalCard({ hospital }: HospitalCardProps) {
  const navigate = useNavigate();
  return (
    <article className="list-card hospital-card">
      <div className="card-visual">{hospital.icon}</div>
      <div className="card-grow">
        <h3>{hospital.name}</h3>
        <p>{hospital.area}</p>
        <div className="rating">
          <Star size={13} /> {hospital.rating}
          {UI_TEXT.openParenthesis}
          {hospital.reviews}
          {UI_TEXT.closeParenthesis}
        </div>
        <button className="text-btn" onClick={() => navigate("/doctor/1")}>
          {UI_TEXT.bookNow}
        </button>
      </div>
      <span className="distance">{hospital.distance}</span>
    </article>
  );
}

type BookingCardProps = {
  item: Booking;
  qrValue?: string | null;
  onViewDetails?: () => void;
};

export function BookingCard({
  item,
  onViewDetails,
  qrValue,
}: BookingCardProps) {
  return (
    <article className="list-card booking-card">
      <div className="card-visual avatar">{item.icon}</div>
      <div className="card-grow">
        <span className="status-pill">{item.status}</span>
        <h3>{item.title}</h3>
        <p>{item.subtitle}</p>
        {item.patientName && (
          <p>
            {localize("Patient: ")}
            {item.patientName}
          </p>
        )}
        <p className="strong">{item.date}</p>
        <button className="text-btn" onClick={onViewDetails}>
          {UI_TEXT.viewDetails}
        </button>
      </div>
      <BookingQr value={qrValue} booking={item.id} />
    </article>
  );
}

type MenuRowProps = {
  icon: ReactNode;
  title: ReactNode;
  subtitle: ReactNode;
  onClick?: () => void;
};

export function MenuRow({ icon, title, subtitle, onClick }: MenuRowProps) {
  return (
    <button className="menu-row" onClick={onClick}>
      <span className="menu-icon">{icon}</span>
      <span>
        <strong>{title}</strong>
        <small>{subtitle}</small>
      </span>
      <ChevronRight size={18} />
    </button>
  );
}
