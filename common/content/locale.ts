import telugu from "./locales/te";
import hindi from "./locales/hi";

export type Locale = "en" | "te" | "hi";
export const LANGUAGE_KEY = "language";
export const locales = [
  { code: "te", name: "తెలుగు", tag: "te-IN" },
  { code: "hi", name: "हिंदी", tag: "hi-IN" },
  { code: "en", name: "English", tag: "en-IN" },
] as const;
let locale: Locale = "en";
const listeners = new Set<() => void>();

export function normalizeLocale(value: string | null | undefined): Locale {
  const code = value?.toLowerCase().split(/[-_]/)[0];
  if (code === "te" || code === "telugu") return "te";
  if (code === "hi" || code === "hindi") return "hi";
  return "en";
}
export function getLocale() {
  return locale;
}
export function getLocaleTag() {
  return `${locale}-IN`;
}
export function setLocale(value: Locale) {
  if (locale === value) return;
  locale = value;
  listeners.forEach((listener) => listener());
}
export function subscribeLocale(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
export function translate(text: string): string {
  const dictionary = locale === "te" ? telugu : locale === "hi" ? hindi : null;
  return dictionary?.[text] || text;
}
export function formatMessage(template: string, values: unknown[]): string {
  return translate(template).replace(/\{(\d+)\}/g, (_match, index) =>
    String(values[Number(index)]),
  );
}
