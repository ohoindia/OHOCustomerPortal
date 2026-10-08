import type { Member } from "../../../common/models/customer";
export type Session = { token: string; expiresAt: string; member: Member };
export function validSession(
  value: unknown,
  now = Date.now(),
): value is Session {
  if (!value || typeof value !== "object") return false;
  const session = value as Partial<Session>;
  return (
    typeof session.token === "string" &&
    session.token.length > 0 &&
    typeof session.expiresAt === "string" &&
    Date.parse(session.expiresAt) > now &&
    Boolean(
      session.member &&
      (Number(session.member.MemberId) > 0 ||
        Number(session.member.CommunityCustomerId) > 0),
    )
  );
}
export function indiaAppointment(input: string, now = Date.now()) {
  if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(input)) return null;
  const [date, time] = input.split(" ");
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  if (
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > new Date(Date.UTC(year, month, 0)).getUTCDate() ||
    hour > 23 ||
    minute > 59
  )
    return null;
  const parsed = new Date(`${date}T${time}:00+05:30`);
  return Number.isFinite(parsed.getTime()) && parsed.getTime() > now
    ? parsed
    : null;
}
