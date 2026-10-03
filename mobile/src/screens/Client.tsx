import { useCallback, useEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";
import ClientView from "../components/ClientView";
import type { ClientViewProps } from "../components/ClientView";
import { Brand, Copy, Page } from "../components/ui";
import { getSession, restoreSession } from "../lib/session";
import { localKey } from "../lib/client-host";

export default function Client() {
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
      const session: Record<string, string> = {};
      if (current) {
        Object.assign(session, {
          accessToken: current.token,
          tokenExpiresAt: current.expiresAt,
          member: JSON.stringify(current.member),
          memberId: String(current.member.MemberId),
          gender: String(current.member.Gender ?? ""),
          FullName: current.member.Name ?? "",
          UserImage: current.member.Image ?? "",
          groupId: String(current.member.GroupId ?? ""),
          communityCustomerId: String(current.member.CommunityCustomerId ?? ""),
        });
      }
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
      const route = `/${path?.join("/") ?? ""}${search.size ? `?${search}` : ""}`;
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
  if (!props)
    return (
      <Page>
        <Brand />
        <Copy>Loading your account…</Copy>
      </Page>
    );
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      <ClientView {...props} />
    </SafeAreaView>
  );
}
