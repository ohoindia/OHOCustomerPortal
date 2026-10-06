import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import { Linking } from "react-native";
import { clearSession, saveSession } from "./session";
import type { Member } from "../../../common";

export type ClientMessage = {
  type: string;
  id?: number;
  url?: string;
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  value?: Record<string, string>;
  canGoBack?: boolean;
  route?: string;
};
export type ClientReply = { id: number; value?: unknown; error?: string };
export const localKey = "oho.client.local";

export function createClientHost(
  apiBaseUrl: string,
  reply: (value: ClientReply) => void,
  mobileSession = false,
) {
  const requests = new Map<number, AbortController>();
  let persistence = Promise.resolve();
  function persist(work: () => Promise<unknown>) {
    persistence = persistence
      .then(work)
      .then(() => undefined)
      .catch(() => undefined);
    return persistence;
  }
  return {
    flush() {
      return persistence;
    },
    dispose() {
      for (const controller of requests.values()) controller.abort();
      requests.clear();
    },
    async receive(message: ClientMessage) {
      const id = message.id ?? 0;
      try {
        switch (message.type) {
          case "cancel":
            requests.get(id)?.abort();
            requests.delete(id);
            break;
          case "fetch": {
            const base = new URL(apiBaseUrl);
            const url = new URL(message.url ?? "");
            // Only the configured backend may receive authentication headers.
            if (
              url.origin !== base.origin ||
              !url.pathname.startsWith(
                `${base.pathname.replace(/\/$/, "")}/api/`,
              )
            )
              throw new Error("Invalid customer service request.");
            if (!["GET", "POST"].includes(message.method ?? "GET"))
              throw new Error("Invalid customer service method.");
            const controller = new AbortController();
            requests.set(id, controller);
            try {
              const response = await fetch(url.href, {
                method: message.method,
                headers: message.headers,
                body: mobileSession && message.method === "POST" &&
                  /\/api\/Customer\/(memberlogin|add)$/i.test(url.pathname)
                  ? JSON.stringify({ ...JSON.parse(message.body ?? "{}"), mobileSession: true })
                  : message.body,
                signal: controller.signal,
              });
              const body = await response.text();
              reply({
                id,
                value: {
                  status: response.status,
                  body,
                  headers: { "Content-Type": "application/json" },
                },
              });
            } finally {
              requests.delete(id);
            }
            break;
          }
          case "session":
            await persist(async () => {
              const value = message.value;
              if (!value?.accessToken) await clearSession();
              else
                await saveSession(
                  {
                    status: true,
                    JwtToken: value.accessToken,
                    expiresAt: value.tokenExpiresAt,
                  },
                  JSON.parse(value.member) as Member,
                );
            });
            break;
          case "local":
            await persist(() =>
              AsyncStorage.setItem(
                localKey,
                JSON.stringify(message.value ?? {}),
              ),
            );
            break;
          case "location": {
            const permission =
              await Location.requestForegroundPermissionsAsync();
            if (!permission.granted)
              throw new Error(
                "Allow location access to find nearby hospitals.",
              );
            const position = await Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.Balanced,
            });
            reply({
              id,
              value: { coords: position.coords, timestamp: position.timestamp },
            });
            break;
          }
          case "external":
            if (message.url && /^(https?:|tel:|mailto:)/i.test(message.url))
              await Linking.openURL(message.url);
            break;
        }
      } catch (error) {
        if (id)
          reply({
            id,
            error:
              error instanceof Error
                ? error.message
                : "Unable to complete the request. Please try again.",
          });
      }
    },
  };
}
