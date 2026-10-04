import { UI_TEXT } from "../../../../common/content/labels";
import type { AuthResponse, Member } from "../../../../common/models/customer";

import {
  authSessionKeys,
  authSessionValues,
} from "../../../../common/utils/session";

export function clearAuthSession(notify = true) {
  for (const key of authSessionKeys) sessionStorage.removeItem(key);
  if (notify) window.dispatchEvent(new Event("auth-session-changed"));
}

export function subscribeAuthSession(listener: () => void) {
  window.addEventListener("auth-session-changed", listener);
  return () => window.removeEventListener("auth-session-changed", listener);
}

export function getAccessToken(): string | null {
  const token = sessionStorage.getItem("accessToken");
  const expiresAt = Date.parse(sessionStorage.getItem("tokenExpiresAt") ?? "");
  if (!token || !Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
    // Old profile-only sessions must log in again to obtain a token.
    if (token || sessionStorage.getItem("member")) clearAuthSession(false);
    return null;
  }
  return token;
}

export function saveAuthSession(response: AuthResponse, member: Member) {
  if (
    !response.JwtToken ||
    !Number.isFinite(Date.parse(response.expiresAt ?? "")) ||
    Date.parse(response.expiresAt!) <= Date.now()
  ) {
    throw new Error(UI_TEXT.loginDidNotReturnAValidSessionPleaseTry);
  }
  for (const [key, value] of Object.entries(
    authSessionValues(response.JwtToken, response.expiresAt!, member),
  ))
    sessionStorage.setItem(key, value);
  window.dispatchEvent(new Event("auth-session-changed"));
}
