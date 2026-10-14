import { Stack } from "expo-router";
import { View } from "react-native";
import BottomNavigation from "../../components/BottomNavigation";
export default function MemberLayout() {
  return (
    <View style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }} />
      <BottomNavigation />
    </View>
  );
}
