import type { Appointment, Member, Verification } from "../models/customer";
import type { ApiRequest } from "../api/transport";
import { nextAppointment } from "../utils/home";
import { createCustomerController } from "./customer.controller";
import { createMembershipController } from "./membership.controller";
import { createConsultationController } from "./consultation.controller";
import { createCommunityController } from "./community.controller";
import { createCatalogController } from "./catalog.controller";
export function createHomeController(apiRequest: ApiRequest) {
  const {
    fetchMemberProducts,
    fetchAddressStatus,
    fetchKYCStatus,
    fetchPANStatus,
  } = createCustomerController(apiRequest);
  const { fetchMemberCard } = createMembershipController(apiRequest);
  const { fetchAppointments } = createConsultationController(apiRequest);
  const { fetchCommunityMember, fetchGroup } =
    createCommunityController(apiRequest);
  const { fetchConfigValues, fetchProducts } =
    createCatalogController(apiRequest);
  async function loadHomeData(
    memberId: number,
    communityId: number,
    groupId: number,
    signal: AbortSignal,
    onAppointmentsLoaded?: (appointments: Appointment[] | null) => void,
    sessionMember?: Member | null,
  ) {
    const errors: string[] = [];
    async function read<T>(
      label: string,
      request: Promise<T>,
      valid: (value: T) => boolean,
    ): Promise<T | null> {
      try {
        const value = await request;
        if (!valid(value)) throw new Error("Unexpected response");
        return value;
      } catch {
        if (!signal.aborted)
          errors.push(`${label} unavailable. Please try again later.`);
        return null;
      }
    }
    const hasMember = Number.isFinite(memberId) && memberId > 0;
    const hasCommunity = Number.isFinite(communityId) && communityId > 0;
    const verification = (value: Verification) =>
      typeof value?.status === "boolean";
    const [
      profile,
      products,
      membership,
      appointments,
      address,
      pan,
      config,
      catalog,
    ] = await Promise.all([
      hasMember
        ? sessionMember && Number(sessionMember.MemberId) === memberId
          ? [sessionMember]
          : []
        : hasCommunity
          ? read(
              "Profile",
              fetchCommunityMember(communityId, signal),
              Array.isArray,
            )
          : null,
      hasMember
        ? read(
            "Your packages",
            fetchMemberProducts(memberId, signal),
            (value) =>
              Array.isArray(value) &&
              value.every((row) => Array.isArray(row.Products)),
          )
        : null,
      hasMember
        ? read(
            "Membership",
            fetchMemberCard(memberId, signal),
            (value) =>
              verification(value) &&
              (!value.status || Array.isArray(value.returnData)),
          )
        : null,
      hasMember
        ? read(
            "Appointments",
            fetchAppointments(memberId, signal),
            Array.isArray,
          ).then((value) => {
            if (!signal.aborted) onAppointmentsLoaded?.(value);
            return value;
          })
        : null,
      hasMember
        ? read(
            "Address verification",
            fetchAddressStatus(memberId, signal),
            verification,
          )
        : null,
      hasMember
        ? read(
            "PAN verification",
            fetchPANStatus(memberId, signal),
            verification,
          )
        : null,
      read(
        "Health tips and support details",
        fetchConfigValues(signal),
        Array.isArray,
      ),
      read("Available free packages", fetchProducts(signal), Array.isArray),
    ]);
    const customer = profile?.[0] ?? null;
    if ((hasMember || hasCommunity) && profile?.length === 0)
      errors.push("Profile details not found.");
    const resolvedGroup = Number(customer?.GroupId || groupId);
    const aadhaar = customer?.AadhaarNumber;
    const [group, kyc] = await Promise.all([
      resolvedGroup > 0
        ? read("Group", fetchGroup(resolvedGroup, signal), Array.isArray)
        : null,
      hasMember &&
      (typeof aadhaar === "string" || typeof aadhaar === "number") &&
      aadhaar
        ? read(
            "Aadhaar verification",
            fetchKYCStatus(memberId, aadhaar, signal),
            verification,
          )
        : null,
    ]);
    return {
      customer,
      hasMember,
      errors,
      products: products
        ? products
            .flatMap((row) => row.Products ?? [])
            .sort(
              (a, b) =>
                (Date.parse(b.IssuedOn ?? "") || 0) -
                (Date.parse(a.IssuedOn ?? "") || 0),
            )
        : null,
      card: membership?.status ? (membership.returnData?.[0] ?? null) : null,
      membershipLoaded: membership !== null,
      appointment: appointments
        ? (nextAppointment(appointments) ?? null)
        : null,
      appointmentsLoaded: appointments !== null,
      groupName: group?.[0]?.GroupName || group?.[0]?.Name,
      address: address?.status,
      kyc:
        !hasMember || !customer || pan === null || (aadhaar && kyc === null)
          ? undefined
          : Boolean(kyc?.status && pan.status && customer.FaceIdentityImage),
      config: Object.fromEntries(
        (config ?? [])
          .filter((item) =>
            ["HealthTip", "OHOCareMobileNumber"].includes(item.ConfigKey),
          )
          .map((item) => [item.ConfigKey, item.ConfigValue]),
      ),
      freeProducts:
        catalog?.filter((item) => item.IsFree && item.IsActive) ?? [],
    };
  }
  return { loadHomeData };
}
