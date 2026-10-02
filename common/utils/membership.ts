import { UI_TEXT } from "../content/labels";
import type { MemberCard } from "../models/customer";
import { cardStatus, expiryStatus } from "./home";

export const MEMBERSHIP_LABELS = {
  loading: UI_TEXT.loadingMembership,
  noCard: UI_TEXT.noMembershipCard,
  unavailable: UI_TEXT.membershipUnavailable,
  card: UI_TEXT.ohoMembershipCard,
} as const;

export type MembershipDisplayData = {
  hasMember: boolean;
  membershipLoaded: boolean;
  card: MemberCard | null;
};

export function membershipState(data: MembershipDisplayData | null) {
  if (!data) return MEMBERSHIP_LABELS.loading;
  if (!data.hasMember) return MEMBERSHIP_LABELS.noCard;
  if (!data.membershipLoaded) return MEMBERSHIP_LABELS.unavailable;
  return data.card ? MEMBERSHIP_LABELS.card : MEMBERSHIP_LABELS.noCard;
}

export function membershipBadge(status: ReturnType<typeof cardStatus>) {
  if (status === UI_TEXT.expiresToday) return UI_TEXT.todayBadge;
  if (status === UI_TEXT.expiryNotProvided) return UI_TEXT.unknownBadge;
  if (status === UI_TEXT.notStarted) return UI_TEXT.pendingBadge;
  return status.toUpperCase();
}

export function vaultMembershipStatus(card: MemberCard | null) {
  const expiry = expiryStatus(card?.EndDate);
  if (expiry === UI_TEXT.expired) return UI_TEXT.expired;
  if (expiry === UI_TEXT.valid || expiry === UI_TEXT.expiresToday)
    return UI_TEXT.active;
  return null;
}
