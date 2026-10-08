import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSyncExternalStore } from "react";
import {
  getLocale,
  normalizeLocale,
  setLocale,
  subscribeLocale,
  type Locale,
} from "../../../common/content/locale";
export const useLocale = () =>
  useSyncExternalStore(subscribeLocale, getLocale, getLocale);
export async function restoreLocale() {
  setLocale(normalizeLocale(await AsyncStorage.getItem("language")));
}
export async function changeLanguage(locale: Locale) {
  await AsyncStorage.setItem("language", locale);
  setLocale(locale);
}
