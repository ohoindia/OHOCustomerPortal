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
        paddingHorizontal: 16,
        paddingBottom: 8,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          padding: 6,
          borderWidth: 1,
          borderColor: "#e2edf5",
          borderRadius: 24,
          width: "100%",
          maxWidth: 568,
          alignSelf: "center",
        }}
      >
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
                minHeight: 58,
                minWidth: 0,
                borderRadius: 18,
                backgroundColor: active ? "#e7f6fc" : "transparent",
                alignItems: "center",
                justifyContent: "center",
                gap: 4,
              }}
            >
              <Ionicons name={item.icon} size={23} color={color} />
              <Text
                style={{
                  fontSize: 10,
                  fontFamily: active ? "InterSemiBold" : "Inter",
                  textAlign: "center",
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
