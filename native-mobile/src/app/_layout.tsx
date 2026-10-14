import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AppProvider, useApp, useLocale, useSession } from "../lib/AppContext";
import Startup from "../components/Startup";
import NetworkGuard from "../components/NetworkGuard";
import AppVersionCheck from "../components/AppVersionCheck";
import { useFonts } from "expo-font";
function Navigator() {
  const { ready } = useApp();
  const session = useSession();
  const [fontsLoaded, fontError] = useFonts({
    Inter: require("../../assets/fonts/font-0.ttf"),
    InterMedium: require("../../assets/fonts/font-1.ttf"),
    InterSemiBold: require("../../assets/fonts/font-2.ttf"),
    InterBold: require("../../assets/fonts/font-3.ttf"),
    JakartaBold: require("../../assets/fonts/font-6.ttf"),
  });
  const locale = useLocale();
  if (!ready || (!fontsLoaded && !fontError)) return <Startup />;
  return (
    <>
      <Stack key={locale} screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="language" />
        <Stack.Screen name="splash" />
        <Stack.Protected guard={!session}>
          <Stack.Screen name="login" />
          <Stack.Screen name="otp" />
        </Stack.Protected>
        <Stack.Protected guard={Boolean(session)}>
          <Stack.Screen name="(member)" />
        </Stack.Protected>
      </Stack>
      <NetworkGuard />
      <AppVersionCheck />
    </>
  );
}
export default function Layout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <AppProvider>
        <Navigator />
      </AppProvider>
    </SafeAreaProvider>
  );
}
