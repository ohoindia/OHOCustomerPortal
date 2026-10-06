import { useEffect, useRef, useSyncExternalStore } from "react";
import { Alert, AppState, Platform } from "react-native";
import Constants from "expo-constants";
import { nativeApplicationVersion } from "expo-application";
import * as Linking from "expo-linking";
import type { ConfigEntry } from "../../../common";
import { api } from "../lib/api";
import { appUpdateUrl, isNewerVersion } from "../lib/app-version";
import { getSession, subscribeSession } from "../lib/session";

export default function AppVersionCheck() {
  const session = useSyncExternalStore(subscribeSession, getSession, () => null);
  const prompted = useRef<string | null>(null);

  useEffect(() => {
    // Configuration uses the existing authenticated endpoint.
    if (!session || Platform.OS === "web") return;
    const installed = Constants.appOwnership === "expo"
      ? Constants.expoConfig?.version
      : nativeApplicationVersion ?? Constants.expoConfig?.version;
    if (!installed) return;
    const controller = new AbortController();
    let checking = false;
    async function check() {
      if (checking || controller.signal.aborted) return;
      checking = true;
      try {
        const entries = await api<ConfigEntry[]>("api/ConfigValues/all", {
          body: { skip: 0, take: 0 },
          signal: controller.signal,
        });
        const values = new Map(entries.map((entry) => [
          entry.ConfigKey.toLowerCase(), entry.ConfigValue,
        ]));
        const latest = values.get("bizmanageversion")?.trim();
        const location = appUpdateUrl(values.get("bizmanageapplocation") ?? "");
        if (controller.signal.aborted || !latest || !location ||
            !isNewerVersion(latest, installed!) || prompted.current === latest) return;
        prompted.current = latest;
        Alert.alert("Update available", `OHOINDIA version ${latest} is available. You are using version ${installed}. Please update your app.`, [
          { text: "Later", style: "cancel" },
          { text: "Update now", onPress: () => {
            void Linking.openURL(location).catch(() => {
              prompted.current = null;
              Alert.alert("Unable to open update", "Please try again when you have an internet connection.");
            });
          } },
        ]);
      } catch {
        // An unavailable version service must not prevent using the app.
      } finally {
        checking = false;
      }
    }
    void check();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void check();
    });
    return () => {
      controller.abort();
      subscription.remove();
    };
  }, [session]);
  return null;
}
