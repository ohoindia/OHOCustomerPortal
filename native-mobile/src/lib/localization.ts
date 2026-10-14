import {
  getLocale,
  translate as exactTranslate,
} from "../../../common/content/locale";
import telugu from "../../../common/content/locales/te";
import hindi from "../../../common/content/locales/hi";
const normalized = {
  te: new Map(
    Object.entries(telugu).map(([key, value]) => [
      key.trim().toLowerCase(),
      value,
    ]),
  ),
  hi: new Map(
    Object.entries(hindi).map(([key, value]) => [
      key.trim().toLowerCase(),
      value,
    ]),
  ),
};
// Native headers use sentence case; reuse the same translated content as the client.
export function translate(text: string) {
  const locale = getLocale();
  if (locale === "en") return text;
  const exact = exactTranslate(text);
  return exact !== text
    ? exact
    : (normalized[locale].get(text.trim().toLowerCase()) ?? text);
}
