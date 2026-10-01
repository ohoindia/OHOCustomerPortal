import type {
  Appointment,
  MemberCard,
  MemberProduct,
} from "../models/customer";
export function formatHomeDate(value?: string) {
  if (!value || !Number.isFinite(Date.parse(value))) return "";
  return new Date(value)
    .toLocaleDateString("en-GB", {
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
        item.IsCouponClaimed === true &&
        !/cancel|complet|reject/i.test(item.StatusName ?? "") &&
        Date.parse(item.AppointmentDate ?? "") >= today.getTime(),
    )
    .sort(
      (a, b) => Date.parse(a.AppointmentDate!) - Date.parse(b.AppointmentDate!),
    )[0];
}
export function expiryStatus(value?: string, now = new Date()) {
  if (!value || !Number.isFinite(Date.parse(value)))
    return "Expiry not provided";
  const expiry = new Date(value);
  const today = new Date(now);
  expiry.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  if (expiry < today) return "Expired";
  if (expiry.getTime() === today.getTime()) return "Expires today";
  return "Valid";
}
export function cardStatus(card: MemberCard | null, now = new Date()) {
  if (!card) return "No card";
  const expiry = expiryStatus(card.EndDate, now);
  if (expiry === "Expired") return expiry;
  if (!card.IsActivated) return "Inactive";
  if (card.StartDate && Date.parse(card.StartDate) > now.getTime())
    return "Not started";
  return expiry === "Valid" ? "Active" : expiry;
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
        expiry !== "Expired" &&
        (expiry !== "Expiry not provided" || product.IsActive === true) &&
        !(Date.parse(product.IssuedOn ?? "") > now.getTime())
      );
    })
    .sort(
      (a, b) =>
        (Date.parse(b.IssuedOn ?? "") || 0) -
        (Date.parse(a.IssuedOn ?? "") || 0),
    )[0];
}
