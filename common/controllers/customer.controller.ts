import type { ApiRequest } from "../api/transport";
import type { Member, MemberProduct, Verification } from "../models/customer";
export function createCustomerController(apiRequest: ApiRequest) {
  const fetchMember = (id: number, signal?: AbortSignal) =>
    apiRequest<Member[]>(`api/Customer/GetById/${id}`, { signal });
  const fetchMemberProducts = (id: number, signal?: AbortSignal) =>
    apiRequest<
      Array<{
        Products?: MemberProduct[];
      }>
    >(`api/Customer/GetMemberProducts/${id}`, { signal });
  const fetchAddressStatus = (id: number, signal?: AbortSignal) =>
    apiRequest<Verification>(`api/Customer/AddressExistsOrNot/${id}`, {
      signal,
    });
  const fetchKYCStatus = (
    id: number,
    aadhaarNumber: string | number,
    signal?: AbortSignal,
  ) =>
    apiRequest<Verification>("api/Customer/KYCVerifiedOrNot", {
      body: { customerId: id, aadhaarNumber },
      signal,
    });
  const fetchPANStatus = (id: number, signal?: AbortSignal) =>
    apiRequest<Verification>("api/Customer/PANVerifiedOrNot", {
      body: { customerId: id },
      signal,
    });
  return {
    fetchMember,
    fetchMemberProducts,
    fetchAddressStatus,
    fetchKYCStatus,
    fetchPANStatus,
  };
}
