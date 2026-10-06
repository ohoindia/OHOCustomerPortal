import {
  createApiRequest,
  createAuthController,
  createHomeController,
} from "../../../common";
import { clearSession, getAccessToken } from "./session";
import { Platform } from "react-native";
export const api = createApiRequest({
  apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL,
  getAccessToken,
  onUnauthorized: clearSession,
});
const auth = createAuthController(api);
export const authRequest: typeof auth.authRequest = (action, body, signal) =>
  auth.authRequest(action, Platform.OS !== "web" && (action === "memberlogin" || action === "add")
    ? { ...body, mobileSession: true } : body, signal);
export const { loadHomeData } = createHomeController(api);
