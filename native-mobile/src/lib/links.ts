import { Linking } from "react-native";
import { safePaymentUrl } from "./purchase";
export async function openExternal(url: string) {
  if (!safePaymentUrl(url)) throw new Error("A secure HTTPS link is required.");
  await Linking.openURL(url);
}
