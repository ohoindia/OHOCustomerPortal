import { useEffect, useState, useSyncExternalStore } from "react";
import { AppState, Pressable, Text, View } from "react-native";
import { Stack, router, usePathname } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import {
  getAccessToken,
  getSession,
  restoreSession,
  subscribeSession,
} from "../lib/session";
import Startup from "../components/Startup";
import NetworkGuard from "../components/NetworkGuard";
import Ionicons from "@expo/vector-icons/Ionicons";
import { restoreLocale, useLocale } from "../lib/locale";
import { UI_TEXT } from "../../../common";

const tabs = [
  ["home", "/home", "home-outline"],
  ["bookings", "/bookings", "calendar-outline"],
  ["wallet", "/wallet", "wallet-outline"],
  ["packages", "/packages", "cube-outline"],
  ["profile", "/profile", "person-outline"],
] as const;
export default function Layout() {
  useLocale();
  const [ready, setReady] = useState(false);
  const session = useSyncExternalStore(
    subscribeSession,
    getSession,
    getSession,
  );
  const path = usePathname();
  useEffect(() => {
    void Promise.all([
      restoreSession(),
      restoreLocale().catch(() => undefined),
    ]).finally(() => setReady(true));
    const timer = setInterval(getAccessToken, 30000);
    const listener = AppState.addEventListener("change", (state) => {
      if (state === "active") getAccessToken();
    });
    return () => {
      clearInterval(timer);
      listener.remove();
    };
  }, []);
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      {!ready ? (
        <Startup />
      ) : (
        <View style={{ flex: 1 }}>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="language" />
            <Stack.Screen name="splash" />
            <Stack.Screen name="otp" />
            <Stack.Protected guard={!session}>
              <Stack.Screen name="login" />
            </Stack.Protected>
            <Stack.Protected guard={!!session}>
              <Stack.Screen name="[...path]" />
            </Stack.Protected>
          </Stack>
          {!!session &&
            !["/language", "/otp", "/login", "/splash"].includes(path) && (
              <SafeAreaView
                edges={["bottom"]}
                style={{ backgroundColor: "white" }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    borderTopWidth: 1,
                    borderTopColor: "#e2e8f0",
                  }}
                >
                  {tabs.map(([label, href, icon]) => (
                    <Pressable
                      key={href}
                      accessibilityRole="button"
                      accessibilityLabel={UI_TEXT[label]}
                      accessibilityState={{ selected: path === href }}
                      onPress={() => router.replace(href)}
                      style={{
                        flex: 1,
                        paddingVertical: 16,
                        alignItems: "center",
                      }}
                    >
                      <Ionicons
                        name={icon}
                        size={19}
                        color={path === href ? "#0094c6" : "#64748b"}
                      />
                      <Text
                        style={{
                          color: path === href ? "#0094c6" : "#64748b",
                          fontWeight: "600",
                        }}
                      >
                        {UI_TEXT[label]}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </SafeAreaView>
            )}
        </View>
      )}
      <NetworkGuard />
    </SafeAreaProvider>
  );
}
