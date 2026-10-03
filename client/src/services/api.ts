import { createApiRequest } from "../../../common/api/transport";
import { clearAuthSession, getAccessToken } from "../pages/auth/session";
import { mobileHost } from "../platform";

// Only the web adapter reads Vite environment variables.
export const apiRequest = createApiRequest({
  apiBaseUrl: mobileHost
    ? mobileHost.apiBaseUrl
    : import.meta.env.VITE_API_BASE_URL === "/"
      ? window.location.origin
      : import.meta.env.VITE_API_BASE_URL,
  getAccessToken,
  fetch: mobileHost?.fetch,
  onUnauthorized: (rejectedToken) => {
    // A late response from an old session must not clear a fresh login.
    if (sessionStorage.getItem("accessToken") === (rejectedToken ?? null))
      clearAuthSession();
  },
});
