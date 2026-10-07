import { useSyncExternalStore } from "react";
import {
  getLocale,
  LANGUAGE_KEY,
  normalizeLocale,
  setLocale,
  subscribeLocale,
} from "../../common/content/locale";
import type { Locale } from "../../common/content/locale";

try {
  setLocale(
    normalizeLocale(localStorage.getItem(LANGUAGE_KEY) ?? navigator.language),
  );
} catch {
  /* English works when browser storage is unavailable. */
}

export function useLocale() {
  return useSyncExternalStore(subscribeLocale, getLocale, () => "en" as Locale);
}
export function changeLanguage(locale: Locale) {
  localStorage.setItem(LANGUAGE_KEY, locale);
  setLocale(locale);
}
window.addEventListener("storage", (event) => {
  if (event.key === LANGUAGE_KEY) setLocale(normalizeLocale(event.newValue));
});
