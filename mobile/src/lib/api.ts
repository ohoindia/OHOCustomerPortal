import {
  createApiRequest,
  createAuthController,
  createHomeController,
} from "../../../common";
import { clearSession, getAccessToken } from "./session";
export const api = createApiRequest({
  apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL,
  getAccessToken,
  onUnauthorized: clearSession,
});
export const { authRequest } = createAuthController(api);
export const { loadHomeData } = createHomeController(api);
