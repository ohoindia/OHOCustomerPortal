import { getLocaleTag, translate } from "../content/locale";
import { UI_TEXT } from "../content/labels";
export function serviceAccess(
  data: {
    card: MemberCard | null;
    membershipLoaded: boolean;
    hasMember?: boolean;
  } | null,
  now = new Date(),
) {
  if (!data) return "loading";
  if (data.hasMember === false) return "purchase";
  if (!data.membershipLoaded) return "unavailable";
  const status = cardStatus(data.card, now);
  return status === UI_TEXT.active || status === UI_TEXT.expiresToday
    ? "available"
    : "purchase";
}
export function serviceAccessMessage(access: ReturnType<typeof serviceAccess>) {
  return access === "loading"
    ? translate("Checking membership validity. Please try again shortly.")
    : access === "unavailable"
      ? translate(
          "Unable to check membership validity. Please refresh and try again.",
        )
      : access === "purchase"
        ? translate("Purchase a package to use our services.")
        : "";
}
import type {
  Appointment,
  MemberCard,
  MemberProduct,
} from "../models/customer";
export function appointmentState(
  memberId: number,
  appointments: Appointment[] | null | undefined,
) {
  if (!(memberId > 0)) return UI_TEXT.noUpcomingAppointments;
  if (appointments === undefined) return UI_TEXT.loadingAppointment;
  return appointments !== null
    ? UI_TEXT.noUpcomingAppointments
    : UI_TEXT.appointmentsUnavailable;
}
export function formatHomeDate(value?: string) {
  if (!value || !Number.isFinite(Date.parse(value))) return "";
  return new Date(value)
    .toLocaleDateString(getLocaleTag(), {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
    .replace(/ /g, "-");
}
export function nextAppointment(appointments: Appointment[], now = new Date()) {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  return appointments
    .filter(
      (item) =>
        !/cancel|complet|reject/i.test(item.StatusName ?? "") &&
        Date.parse(item.AppointmentDate ?? "") >= today.getTime(),
    )
    .sort(
      (a, b) => Date.parse(a.AppointmentDate!) - Date.parse(b.AppointmentDate!),
    )[0];
}
export function expiryStatus(value?: string, now = new Date()) {
  if (!value || !Number.isFinite(Date.parse(value)))
    return UI_TEXT.expiryNotProvided;
  const expiry = new Date(value);
  const today = new Date(now);
  expiry.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  if (expiry < today) return UI_TEXT.expired;
  if (expiry.getTime() === today.getTime()) return UI_TEXT.expiresToday;
  return UI_TEXT.valid;
}
export function cardStatus(card: MemberCard | null, now = new Date()) {
  if (!card) return UI_TEXT.noCard;
  const expiry = expiryStatus(card.EndDate, now);
  if (expiry === UI_TEXT.expired) return expiry;
  if (!card.IsActivated) return UI_TEXT.inactive;
  if (card.StartDate && Date.parse(card.StartDate) > now.getTime())
    return UI_TEXT.notStarted;
  return expiry === UI_TEXT.valid ? UI_TEXT.active : expiry;
}
export function latestActivePackage(
  products: MemberProduct[],
  now = new Date(),
) {
  return products
    .filter((product) => {
      const expiry = expiryStatus(product.ValidTill, now);
      return (
        product.IsActive !== false &&
        expiry !== UI_TEXT.expired &&
        (expiry !== UI_TEXT.expiryNotProvided || product.IsActive === true) &&
        !(Date.parse(product.IssuedOn ?? "") > now.getTime())
      );
    })
    .sort(
      (a, b) =>
        (Date.parse(b.IssuedOn ?? "") || 0) -
        (Date.parse(a.IssuedOn ?? "") || 0),
    )[0];
}
