import { ActivityIndicator, Image, StyleSheet, Text, View } from "react-native";
import Constants from "expo-constants";
import { nativeApplicationVersion } from "expo-application";

export default function Startup() {
  const version = nativeApplicationVersion ?? Constants.expoConfig?.version;
  return (
    <View style={styles.container}>
      <View style={styles.circle}>
        <Image
          source={require("../../assets/oho-brand.png")}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>
      <Text style={styles.title}>OHOINDIA</Text>
      <ActivityIndicator
        color="#fff"
        size="large"
        accessibilityLabel="Loading your account"
      />
      <Text style={styles.copy}>Loading your account…</Text>
      {version && <Text style={styles.copy}>Version {version}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0094C6",
    alignItems: "center",
    justifyContent: "center",
    gap: 20,
    padding: 24,
  },
  circle: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  logo: { width: 120, height: 120 },
  title: { color: "#fff", fontSize: 30, fontWeight: "bold" },
  copy: { color: "#fff", fontSize: 14 },
});
