import type { Member } from "./api";

export function getSessionMember(): Member | null {
  try {
    const member = JSON.parse(sessionStorage.getItem("member") ?? "null");
    return member &&
      Number.isFinite(Number(member.MemberId)) &&
      Number(member.MemberId) > 0
      ? (member as Member)
      : null;
  } catch {
    return null;
  }
}
