import type { Member } from "../models/customer";

export const authSessionKeys = [
  "accessToken",
  "tokenExpiresAt",
  "member",
  "memberId",
  "gender",
  "FullName",
  "UserImage",
  "groupId",
  "communityCustomerId",
] as const;

/** Storage-independent session values used by the client and mobile bridge. */
export function authSessionValues(
  token: string,
  expiresAt: string,
  member: Member,
): Record<string, string> {
  return {
    accessToken: token,
    tokenExpiresAt: expiresAt,
    member: JSON.stringify(member),
    memberId: String(member.MemberId ?? ""),
    gender: String(member.Gender ?? ""),
    FullName: String(member.Name ?? ""),
    UserImage: String(member.Image ?? ""),
    groupId: String(member.GroupId ?? ""),
    communityCustomerId: String(member.CommunityCustomerId ?? ""),
  };
}
