import type { PropsWithChildren } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import type { TextInputProps } from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
export const colors = {
  brand: "#0094c6",
  navy: "#142344",
  muted: "#64748b",
  surface: "#f4f8fc",
  line: "#e2e8f0",
};
export function Page({
  title,
  children,
  back = true,
}: PropsWithChildren<{ title?: string; back?: boolean }>) {
  return (
    <SafeAreaView edges={["top", "left", "right"]} style={s.safe}>
      <KeyboardAvoidingView
        style={s.safe}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {title && (
          <View style={s.header}>
            {back ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Go back"
                onPress={() =>
                  router.canGoBack() ? router.back() : router.replace("/")
                }
                style={s.back}
              >
                <Text style={s.heading}>‹</Text>
              </Pressable>
            ) : (
              <View style={s.back} />
            )}
            <Text style={[s.heading, { flex: 1, textAlign: "center" }]}>
              {title}
            </Text>
            <View style={s.back} />
          </View>
        )}
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={s.content}
        >
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
export function Brand() {
  return (
    <View style={s.brand}>
      <Image
        source={require("../../assets/oho-brand.png")}
        style={{ width: 46, height: 46 }}
        resizeMode="contain"
      />
      <View>
        <Text style={[s.heading, { color: colors.brand }]}>OHOINDIA</Text>
        <Text style={{ fontSize: 10, color: colors.muted }}>
          A Hyperlocal Health Fintech for Bharat
        </Text>
      </View>
    </View>
  );
}
export function Button({
  title,
  onPress,
  disabled,
  secondary,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  secondary?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(disabled) }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        s.button,
        secondary && s.outline,
        (disabled || pressed) && { opacity: 0.5 },
      ]}
    >
      <Text
        style={{
          color: secondary ? colors.brand : "#fff",
          fontWeight: "700",
          textAlign: "center",
        }}
      >
        {title}
      </Text>
    </Pressable>
  );
}
export function Field({ label, ...props }: TextInputProps & { label: string }) {
  return (
    <View style={{ gap: 8 }}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.muted}
        {...props}
        style={[s.input, props.style]}
      />
    </View>
  );
}
export function Card({ children }: PropsWithChildren) {
  return <View style={s.card}>{children}</View>;
}
export function Heading({ children }: PropsWithChildren) {
  return <Text style={s.heading}>{children}</Text>;
}
export function Copy({ children }: PropsWithChildren) {
  return <Text style={s.copy}>{children}</Text>;
}
export function Menu({
  title,
  subtitle,
  onPress,
}: {
  title: string;
  subtitle?: string;
  onPress: () => void;
}) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={s.menu}>
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={s.label}>{title}</Text>
        {subtitle && <Text style={s.copy}>{subtitle}</Text>}
      </View>
      <Text style={{ color: colors.brand, fontSize: 24 }}>›</Text>
    </Pressable>
  );
}
export function Status({
  loading,
  error,
  retry,
  empty,
}: {
  loading: boolean;
  error: string;
  retry: () => void;
  empty?: boolean;
}) {
  return loading ? (
    <ActivityIndicator
      accessibilityLabel="Loading"
      color={colors.brand}
      style={{ margin: 24 }}
    />
  ) : error ? (
    <Card>
      <Text accessibilityRole="alert" style={s.error}>
        {error}
      </Text>
      <Button title="Try again" secondary onPress={retry} />
    </Card>
  ) : empty ? (
    <Copy>No records found.</Copy>
  ) : null;
}
export const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  content: { padding: 18, paddingBottom: 36, gap: 16 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 54,
    backgroundColor: "#fff",
  },
  back: { width: 46, alignItems: "center", padding: 10 },
  brand: { flexDirection: "row", alignItems: "center", gap: 10 },
  heading: { fontSize: 20, fontWeight: "700", color: colors.navy },
  label: { fontSize: 15, fontWeight: "600", color: colors.navy },
  copy: { color: colors.muted, fontSize: 14, lineHeight: 22 },
  card: {
    padding: 18,
    borderRadius: 18,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: colors.line,
    gap: 12,
  },
  button: {
    backgroundColor: colors.brand,
    minHeight: 48,
    padding: 14,
    borderRadius: 12,
    justifyContent: "center",
  },
  outline: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: colors.brand,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: "#fff",
    color: colors.navy,
    minHeight: 50,
    padding: 14,
    borderRadius: 12,
    fontSize: 16,
  },
  menu: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
  },
  error: { color: "#b42318", lineHeight: 22 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  tile: {
    width: "47%",
    padding: 16,
    borderRadius: 16,
    backgroundColor: "#e0f2fe",
    gap: 10,
  },
});
