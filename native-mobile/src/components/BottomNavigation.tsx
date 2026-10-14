import { Pressable, Text, View } from "react-native";
import { router, usePathname } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { translate } from "../lib/localization";
import { colors } from "./ui";
const items = [
  { path: "/home", label: "Home", icon: "home-outline" },
  { path: "/bookings", label: "Bookings", icon: "calendar-outline" },
  { path: "/wallet", label: "Wallet", icon: "wallet-outline" },
  { path: "/packages", label: "Packages", icon: "cube-outline" },
  { path: "/profile", label: "Profile", icon: "person-outline" },
] as const;
export default function BottomNavigation() {
  const pathname = usePathname();
  return (
    <SafeAreaView
      edges={["bottom", "left", "right"]}
      style={{
        backgroundColor: "#fff",
        borderTopWidth: 1,
        borderColor: colors.line,
      }}
    >
      <View style={{ flexDirection: "row" }}>
        {items.map((item) => {
          const active = pathname === item.path;
          const color = active ? colors.brand : colors.muted;
          return (
            <Pressable
              key={item.path}
              accessibilityRole="tab"
              accessibilityLabel={translate(item.label)}
              accessibilityState={{ selected: active }}
              onPress={() => {
                if (!active) router.navigate(item.path);
              }}
              style={{
                flex: 1,
                minHeight: 62,
                alignItems: "center",
                justifyContent: "center",
                gap: 4,
              }}
            >
              <Ionicons name={item.icon} size={23} color={color} />
              <Text
                style={{
                  fontSize: 10,
                  fontWeight: active ? "700" : "500",
                  color,
                }}
              >
                {translate(item.label)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </SafeAreaView>
  );
}
