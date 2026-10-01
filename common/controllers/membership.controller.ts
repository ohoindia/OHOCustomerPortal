import type { ApiRequest } from "../api/transport";
import type { MemberCard } from "../models/customer";
export function createMembershipController(apiRequest: ApiRequest) {
  const fetchMemberCard = (id: number, signal?: AbortSignal) =>
    apiRequest<{
      status: boolean;
      returnData?: MemberCard[];
    }>(`api/OHOCards/GetMemberCardByMemberId/${id}`, { signal });
  return { fetchMemberCard };
}
