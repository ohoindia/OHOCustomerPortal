import { createApiRequest } from "../../../common/api/transport";
import { clearAuthSession, getAccessToken } from "../pages/auth/session";

// Only the web adapter reads Vite environment variables.
export const apiRequest = createApiRequest({
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL,
  legacyApiBaseUrl: import.meta.env.VITE_LEGACY_API_BASE_URL,
  getAccessToken,
  onUnauthorized: (rejectedToken) => {
    // A late response from an old session must not clear a fresh login.
    if (sessionStorage.getItem("accessToken") === (rejectedToken ?? null))
      clearAuthSession();
  },
});
