import type { Member } from "./api";
import { getAccessToken } from './session';

export function getSessionMember(): Member | null {
  try {
    if (!getAccessToken()) return null;
    const member = JSON.parse(sessionStorage.getItem("member") ?? "null");
    return member &&
      Number.isFinite(Number(member.MemberId)) &&
      (Number(member.MemberId) > 0 || Number(member.CommunityCustomerId) > 0)
      ? (member as Member)
      : null;
  } catch {
    return null;
  }
}
