import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { UI_TEXT } from "../../../common";
import { Brand, Heading } from "../components/ui";
export default function Splash() {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={UI_TEXT.tapAnywhereToContinue}
      onPress={() => router.replace("/login")}
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#f0f9ff",
        gap: 32,
      }}
    >
      <Brand />
      <Heading>
        {UI_TEXT.yourHealth}
        {"\n"}
        {UI_TEXT.ourPriority}
      </Heading>
      <View>
        <Text style={{ fontSize: 80 }}>{UI_TEXT.familyIcon}</Text>
        <Text style={{ fontSize: 30, textAlign: "right" }}>
          {UI_TEXT.shieldIcon}
        </Text>
      </View>
      <Text>{UI_TEXT.tapAnywhereToContinue}</Text>
    </Pressable>
  );
}
