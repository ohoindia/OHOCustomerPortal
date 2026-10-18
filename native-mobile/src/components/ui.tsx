import type { PropsWithChildren, ReactNode } from "react";
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
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { translate } from "../lib/localization";
import { useLocale } from "../lib/AppContext";
const localized = (node: ReactNode): ReactNode =>
  typeof node === "string"
    ? translate(node)
    : Array.isArray(node)
      ? node.map(localized)
      : node;
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
  onBack,
}: PropsWithChildren<{ title?: string; back?: boolean; onBack?: () => void }>) {
  useLocale();
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
                onPress={
                  onBack ??
                  (() =>
                    router.canGoBack() ? router.back() : router.replace("/"))
                }
                style={s.back}
              >
                <Ionicons name="chevron-back" size={22} color={colors.navy} />
              </Pressable>
            ) : (
              <View style={s.back} />
            )}
            <Text
              style={[
                s.heading,
                { flex: 1, textAlign: "center", fontSize: 18 },
              ]}
            >
              {translate(title)}
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
          fontFamily: "InterSemiBold",
          fontSize: 13,
          textAlign: "center",
        }}
      >
        {translate(title)}
      </Text>
    </Pressable>
  );
}
export function Field({ label, ...props }: TextInputProps & { label: string }) {
  return (
    <View style={{ gap: 8 }}>
      <Text style={s.label}>{translate(label)}</Text>
      <TextInput
        accessibilityLabel={translate(label)}
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
  return <Text style={s.heading}>{localized(children)}</Text>;
}
export function Copy({ children }: PropsWithChildren) {
  return <Text style={s.copy}>{localized(children)}</Text>;
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
      <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
        <Text style={s.label}>{translate(title)}</Text>
        {subtitle && <Text style={s.copy}>{translate(subtitle)}</Text>}
      </View>
      <Ionicons name="chevron-forward" color={colors.muted} size={18} />
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
  safe: { flex: 1, backgroundColor: "#fff" },
  content: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 28,
    gap: 16,
    width: "100%",
    maxWidth: 600,
    alignSelf: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 54,
    backgroundColor: "#fff",
  },
  back: { width: 46, alignItems: "center", padding: 10 },
  brand: { flexDirection: "row", alignItems: "center", gap: 10 },
  heading: {
    fontSize: 16,
    lineHeight: 24,
    fontFamily: "JakartaBold",
    color: colors.navy,
  },
  label: {
    fontSize: 13,
    lineHeight: 20,
    fontFamily: "InterSemiBold",
    color: colors.navy,
  },
  copy: {
    color: colors.muted,
    fontFamily: "Inter",
    fontSize: 12,
    lineHeight: 19,
  },
  card: {
    padding: 16,
    borderRadius: 14,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: colors.line,
    gap: 12,
  },
  button: {
    backgroundColor: colors.brand,
    minHeight: 46,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexShrink: 1,
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
    fontSize: 14,
    fontFamily: "Inter",
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
    flexBasis: "47%",
    flexGrow: 1,
    minWidth: 0,
    padding: 16,
    borderRadius: 16,
    backgroundColor: "#e0f2fe",
    gap: 10,
  },
});
