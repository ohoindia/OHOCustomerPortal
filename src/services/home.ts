import type { Member } from "../pages/auth/api";
import { apiRequest } from "./api";

export type MemberProduct = {
  ProductName?: string;
  IssuedOn?: string;
  ValidTill?: string;
  MemberProductProductsId?: number;
  ProductsId?: number;
  IsFree?: boolean;
  IsActive?: boolean;
  MaximumAdult?: number;
  MaximumChild?: number;
};
export type MemberCard = {
  OHOCardnumber?: string;
  StartDate?: string;
  EndDate?: string;
  IsActivated?: boolean;
};
export type Appointment = {
  BookingConsultationId: number;
  AppointmentDate?: string;
  HospitalName?: string;
  ServiceName?: string;
  PoliciesType?: string;
  StatusName?: string;
  IsCouponClaimed?: boolean;
};

export const fetchMember = (id: number, signal: AbortSignal) =>
  apiRequest<Member[]>(`lambdaAPI/Customer/GetById/${id}`, { signal });

export const fetchMemberProducts = (id: number, signal: AbortSignal) =>
  apiRequest<Array<{ Products?: MemberProduct[] }>>(
    `lambdaAPI/Customer/GetMemberProducts/${id}`, { signal },
  );

export const fetchMemberCard = (id: number, signal: AbortSignal) =>
  apiRequest<{ status: boolean; returnData?: MemberCard[] }>(
    `lambdaAPI/OHOCards/GetMemberCardByMemberId/${id}`, { signal },
  );

export const fetchAppointments = (id: number, signal: AbortSignal) =>
  apiRequest<Appointment[]>("lambdaAPI/BookingConsultation/PendingAndSuccessConsultationList", {
    body: { CustomerId: id }, signal,
  });

export function formatHomeDate(value?: string) {
  if (!value || !Number.isFinite(Date.parse(value))) return "";
  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
  }).replace(/ /g, "-");
}

export function nextAppointment(appointments: Appointment[], now = new Date()) {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  return appointments.filter(item =>
    item.IsCouponClaimed === true &&
    !/cancel|complet|reject/i.test(item.StatusName ?? "") &&
    Date.parse(item.AppointmentDate ?? "") >= today.getTime(),
  ).sort((a, b) => Date.parse(a.AppointmentDate!) - Date.parse(b.AppointmentDate!))[0];
}

export function expiryStatus(value?: string, now = new Date()) {
  if (!value || !Number.isFinite(Date.parse(value))) return "Expiry not provided";
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
  if (card.StartDate && Date.parse(card.StartDate) > now.getTime()) return "Not started";
  return expiry === "Valid" ? "Active" : expiry;
}

export function latestActivePackage(products: MemberProduct[], now = new Date()) {
  return products.filter(product => {
    const expiry = expiryStatus(product.ValidTill, now);
    return product.IsActive !== false && expiry !== "Expired"
      && (expiry !== "Expiry not provided" || product.IsActive === true)
      && !(Date.parse(product.IssuedOn ?? "") > now.getTime());
  }).sort((a, b) => (Date.parse(b.IssuedOn ?? "") || 0) - (Date.parse(a.IssuedOn ?? "") || 0))[0];
}

type Verification = { status: boolean };
type Group = { GroupName?: string; Name?: string };
type ConfigEntry = { ConfigKey: string; ConfigValue: string | null };

export const fetchCommunityMember = (id: number, signal: AbortSignal) =>
  apiRequest<Member[]>(`lambdaAPI/CommunityCustomers/GetById/${id}`, { signal });
export const fetchGroup = (id: number, signal: AbortSignal) =>
  apiRequest<Group[]>(`lambdaAPI/Group/GetById/${id}`, { signal });
export const fetchAddressStatus = (id: number, signal: AbortSignal) =>
  apiRequest<Verification>(`lambdaAPI/Customer/AddressExistsOrNot/${id}`, { signal });
export const fetchKYCStatus = (id: number, aadhaarNumber: string | number, signal: AbortSignal) =>
  apiRequest<Verification>("lambdaAPI/Customer/KYCVerifiedOrNot", {
    body: { customerId: id, aadhaarNumber }, signal,
  });
export const fetchPANStatus = (id: number, signal: AbortSignal) =>
  apiRequest<Verification>("lambdaAPI/Customer/PANVerifiedOrNot", { body: { customerId: id }, signal });
export const fetchConfigValues = (signal: AbortSignal) =>
  apiRequest<ConfigEntry[]>("ConfigValues/all", { body: { skip: 0, take: 0 }, signal });
export const fetchProducts = (signal: AbortSignal) =>
  apiRequest<MemberProduct[]>("Products/all", { body: { skip: 0, take: 0 }, signal });

export async function loadHomeData(memberId: number, communityId: number, groupId: number, signal: AbortSignal) {
  const errors: string[] = [];
  async function read<T>(label: string, request: Promise<T>, valid: (value: T) => boolean): Promise<T | null> {
    try {
      const value = await request;
      if (!valid(value)) throw new Error("Unexpected response");
      return value;
    } catch {
      if (!signal.aborted) errors.push(`${label} unavailable. Please try again later.`);
      return null;
    }
  }
  const hasMember = Number.isFinite(memberId) && memberId > 0;
  const hasCommunity = Number.isFinite(communityId) && communityId > 0;
  const verification = (value: Verification) => typeof value?.status === "boolean";
  const [profile, products, membership, appointments, address, pan, config, catalog] = await Promise.all([
    hasMember || hasCommunity ? read("Profile", hasMember ? fetchMember(memberId, signal) : fetchCommunityMember(communityId, signal), Array.isArray) : null,
    hasMember ? read("Your packages", fetchMemberProducts(memberId, signal), value => Array.isArray(value) && value.every(row => Array.isArray(row.Products))) : null,
    hasMember ? read("Membership", fetchMemberCard(memberId, signal), value => verification(value) && (!value.status || Array.isArray(value.returnData))) : null,
    hasMember ? read("Appointments", fetchAppointments(memberId, signal), Array.isArray) : null,
    hasMember ? read("Address verification", fetchAddressStatus(memberId, signal), verification) : null,
    hasMember ? read("PAN verification", fetchPANStatus(memberId, signal), verification) : null,
    read("Health tips and support details", fetchConfigValues(signal), Array.isArray),
    read("Available free packages", fetchProducts(signal), Array.isArray),
  ]);
  const customer = profile?.[0] ?? null;
  if ((hasMember || hasCommunity) && profile?.length === 0) errors.push("Profile details not found.");
  const resolvedGroup = Number(customer?.GroupId || groupId);
  const aadhaar = customer?.AadhaarNumber;
  const [group, kyc] = await Promise.all([
    resolvedGroup > 0 ? read("Group", fetchGroup(resolvedGroup, signal), Array.isArray) : null,
    hasMember && (typeof aadhaar === "string" || typeof aadhaar === "number") && aadhaar
      ? read("Aadhaar verification", fetchKYCStatus(memberId, aadhaar, signal), verification) : null,
  ]);
  return {
    customer, hasMember, errors,
    products: products ? products.flatMap(row => row.Products ?? []).sort((a, b) =>
      (Date.parse(b.IssuedOn ?? "") || 0) - (Date.parse(a.IssuedOn ?? "") || 0)) : null,
    card: membership?.status ? membership.returnData?.[0] ?? null : null,
    membershipLoaded: membership !== null,
    appointment: appointments ? nextAppointment(appointments) ?? null : null,
    appointmentsLoaded: appointments !== null,
    groupName: group?.[0]?.GroupName || group?.[0]?.Name,
    address: address?.status,
    kyc: !hasMember || !customer || pan === null || (aadhaar && kyc === null)
      ? undefined : Boolean(kyc?.status && pan.status && customer.FaceIdentityImage),
    config: Object.fromEntries((config ?? [])
      .filter(item => ["HealthTip", "OHOCareMobileNumber"].includes(item.ConfigKey))
      .map(item => [item.ConfigKey, item.ConfigValue])),
    freeProducts: catalog?.filter(item => item.IsFree && item.IsActive) ?? [],
  };
}
