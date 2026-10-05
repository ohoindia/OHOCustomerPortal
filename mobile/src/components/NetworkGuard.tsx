import { useEffect, useState } from "react";
import { AppState, StyleSheet, Text, View } from "react-native";
import * as Network from "expo-network";
import { Button } from "./ui";

export default function NetworkGuard() {
  const [offline, setOffline] = useState(false);
  const [checking, setChecking] = useState(false);
  useEffect(() => {
    let mounted = true;
    const update = (state: Network.NetworkState) => {
      if (mounted)
        setOffline(
          state.isConnected === false || state.isInternetReachable === false,
        );
    };
    const check = () => {
      void Network.getNetworkStateAsync()
        .then(update)
        .catch(() => {});
    };
    const subscription = Network.addNetworkStateListener(update);
    const active = AppState.addEventListener("change", (state) => {
      if (state === "active") check();
    });
    check();
    return () => {
      mounted = false;
      subscription.remove();
      active.remove();
    };
  }, []);
  async function retry() {
    setChecking(true);
    try {
      const state = await Network.getNetworkStateAsync();
      setOffline(
        state.isConnected === false || state.isInternetReachable === false,
      );
    } finally {
      setChecking(false);
    }
  }
  if (!offline) return null;
  return (
    <View style={styles.overlay} accessibilityViewIsModal>
      <Text style={styles.title} accessibilityRole="alert">
        Connection Lost
      </Text>
      <Text style={styles.message}>No internet available.</Text>
      <Text style={styles.message}>
        {"It looks like you're offline. Please check your network settings and try again."}
      </Text>
      <Button
        title={checking ? "Checking…" : "Retry"}
        disabled={checking}
        onPress={() => void retry().catch(() => {})}
      />
    </View>
  );
}
const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 100,
    backgroundColor: "#f8f9fa",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    gap: 20,
  },
  title: { fontSize: 24, fontWeight: "bold", color: "#333" },
  message: { fontSize: 16, textAlign: "center", color: "#666" },
});
