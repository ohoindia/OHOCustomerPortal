import { DISPLAY_FORMAT } from "../content/config";
export type BookingPeriod = "Previous" | "Upcoming" | "Running";

const indiaDay = (date: Date) =>
  new Intl.DateTimeFormat(DISPLAY_FORMAT.dayKeyLocale, {
    timeZone: DISPLAY_FORMAT.timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);

export function bookingPeriod(
  row: Record<string, unknown>,
  now = new Date(),
): BookingPeriod {
  const status = String(row.StatusName ?? "")
    .trim()
    .toLowerCase();
  if (/completed|cancelled|canceled|rejected|closed/.test(status))
    return "Previous";
  if (/running|in progress|ongoing/.test(status)) return "Running";
  const value = row.AppointmentDate;
  if (typeof value === "string" && value.trim()) {
    const date = new Date(value);
    if (Number.isFinite(date.getTime())) {
      // Dates without an offset in the legacy API represent an India calendar day.
      const day =
        /^\d{4}-\d{2}-\d{2}(?:$|T| )/.test(value) &&
        !/(Z|[+-]\d{2}:?\d{2})$/i.test(value)
          ? value.slice(0, 10)
          : indiaDay(date);
      const today = indiaDay(now);
      if (day < today) return "Previous";
      if (day > today) return "Upcoming";
    }
  }
  return "Running";
}
