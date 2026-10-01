import type { ApiRequest } from '../api/transport';
import type { ConfigEntry, MemberProduct } from '../models/customer';
export function createCatalogController(apiRequest: ApiRequest) {
    const fetchConfigValues = (signal?: AbortSignal) => apiRequest<ConfigEntry[]>("ConfigValues/all", {
        body: { skip: 0, take: 0 },
        signal,
    });
    const fetchProducts = (signal?: AbortSignal) => apiRequest<MemberProduct[]>("Products/all", {
        body: { skip: 0, take: 0 },
        signal,
    });
    return { fetchConfigValues, fetchProducts };
}
