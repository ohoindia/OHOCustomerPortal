import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import type { AuthResponse, Member } from "../../../common";
import { validSession } from "./validation";
import type { Session } from "./validation";

export type { Session } from "./validation";
let current: Session | null = null;
let revision = 0;
let persistence: Promise<unknown> = Promise.resolve();
function persist(work: () => Promise<unknown>) {
  const pending = persistence.then(work);
  persistence = pending.catch(() => undefined);
  return pending;
}
const listeners = new Set<() => void>();
const key = "oho.session";
export const subscribeSession = (fn: () => void) => {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
};
export const getSession = () => current;
const publish = (value: Session | null) => {
  current = value;
  listeners.forEach((fn) => fn());
};
export async function restoreSession() {
  // Browser preview sessions remain in memory; device sessions use Keychain/Keystore.
  if (Platform.OS === "web") return;
  try {
    const saved = await SecureStore.getItemAsync(key);
    const value: Session | null = saved ? JSON.parse(saved) : null;
    if (validSession(value)) publish(value);
    else await SecureStore.deleteItemAsync(key);
  } catch {
    await SecureStore.deleteItemAsync(key).catch(() => undefined);
  }
}
export async function clearSession(rejectedToken?: string | null) {
  if (rejectedToken !== undefined && current?.token !== rejectedToken) return;
  revision += 1;
  publish(null);
  if (Platform.OS !== "web")
    await persist(() => SecureStore.deleteItemAsync(key));
}
export async function saveSession(response: AuthResponse, member: Member) {
  const value = {
    token: response.JwtToken ?? "",
    expiresAt: response.expiresAt ?? "",
    member,
  };
  if (!validSession(value))
    throw new Error("Login did not return a valid session. Please try again.");
  const savingRevision = ++revision;
  if (Platform.OS !== "web")
    await persist(() => SecureStore.setItemAsync(key, JSON.stringify(value)));
  if (revision === savingRevision) publish(value);
}
export function getAccessToken() {
  if (current && !validSession(current)) {
    void clearSession();
    return null;
  }
  return current?.token ?? null;
}
