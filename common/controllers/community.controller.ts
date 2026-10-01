import type { ApiRequest } from "../api/transport";
import type { Member, Group } from "../models/customer";
export function createCommunityController(apiRequest: ApiRequest) {
  const fetchCommunityMember = (id: number, signal?: AbortSignal) =>
    apiRequest<Member[]>(`api/CommunityCustomers/GetById/${id}`, {
      signal,
    });
  const fetchGroup = (id: number, signal?: AbortSignal) =>
    apiRequest<Group[]>(`api/Group/GetById/${id}`, { signal });
  return { fetchCommunityMember, fetchGroup };
}
