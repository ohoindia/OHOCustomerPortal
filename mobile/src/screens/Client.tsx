import { useCallback, useEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";
import ClientView from "../components/ClientView";
import type { ClientViewProps } from "../components/ClientView";
import Startup from "../components/Startup";
import { getSession, restoreSession } from "../lib/session";
import { localKey } from "../lib/client-host";
import { authSessionValues } from "../../../common/utils/session";

export default function Client({
  initialRoute,
}: { initialRoute?: string } = {}) {
  const params = useLocalSearchParams<{ path?: string[] }>();
  const [props, setProps] = useState<ClientViewProps | null>(null);
  const [generation, setGeneration] = useState(0);
  const restartRoute = useRef<string | null>(null);
  const onRestart = useCallback((route: string) => {
    restartRoute.current = route;
    setProps(null);
    setGeneration((value) => value + 1);
  }, []);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      await restoreSession();
      const current = getSession();
      const session = current
        ? authSessionValues(current.token, current.expiresAt, current.member)
        : {};
      let local: Record<string, string> = {};
      try {
        local = JSON.parse((await AsyncStorage.getItem(localKey)) ?? "{}");
      } catch {
        /* Discard invalid local data. */
      }
      const { path, ...query } = params;
      const search = new URLSearchParams();
      for (const [key, value] of Object.entries(query))
        if (typeof value === "string") search.set(key, value);
      const route =
        initialRoute ??
        `/${path?.join("/") ?? ""}${search.size ? `?${search}` : ""}`;
      if (!cancelled)
        setProps({
          apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? "",
          session,
          local,
          route: restartRoute.current ?? route,
          onRestart,
        });
    })();
    return () => {
      cancelled = true;
    };
    // Reload only after renderer recovery; normal navigation/auth must keep the document.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [generation, onRestart]);
  if (!props) return <Startup />;
  const content = (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      <ClientView {...props} />
    </SafeAreaView>
  );
  if (Platform.OS === "web") return content;
  // Native stack screens can already be inset from the Android system bars.
  // Measure this screen's remaining overlap instead of reusing root insets.
  return <SafeAreaProvider>{content}</SafeAreaProvider>;
}
