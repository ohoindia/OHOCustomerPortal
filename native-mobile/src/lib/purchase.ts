import type { Row } from "./data";
export const relationships = [
  "Spouse",
  "Son",
  "Daughter",
  "Father",
  "Mother",
  "Father-in-law",
  "Mother-in-law",
  "Brother",
  "Sister",
];
export type Person = {
  fullName: string;
  dateofBirth: string;
  gender: string;
  mobileNumber: string;
  relationship: string;
};
export const blankPerson: Person = {
  fullName: "",
  dateofBirth: "",
  gender: "",
  mobileNumber: "",
  relationship: "",
};
export function personError(person: Person, primary = false) {
  if (!person.fullName.trim()) return "Full name is required.";
  const date = new Date(`${person.dateofBirth}T00:00:00Z`);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(person.dateofBirth) ||
    !Number.isFinite(date.getTime()) ||
    date.toISOString().slice(0, 10) !== person.dateofBirth ||
    date.getTime() > Date.now()
  )
    return "Enter a valid date of birth in YYYY-MM-DD format.";
  if (!["Male", "Female", "Other"].includes(person.gender))
    return "Select a gender.";
  if (!primary && !relationships.includes(person.relationship))
    return "Select a relationship.";
  if (
    (primary || person.mobileNumber) &&
    !/^[6-9]\d{9}$/.test(person.mobileNumber)
  )
    return "Enter a valid 10-digit mobile number.";
  return "";
}
export const isPaymentLink = (row: Row) =>
  /^(cashfree)?paymentlink(andqrcode)?$/.test(
    String(row.PaymentTypeName ?? "")
      .replace(/[\s_-]/g, "")
      .toLowerCase(),
  );
export function safePaymentUrl(url: string) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && !parsed.username && !parsed.password;
  } catch {
    return false;
  }
}
export const money = (amount: unknown) =>
  `₹${Number(amount).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
export function plainText(html: string) {
  return html
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, "")
    .replace(/<\/?(?:p|div|li|br)\b[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}
