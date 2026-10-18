import { isRunningInExpoGo, requireOptionalNativeModule } from "expo";
import { Platform } from "react-native";
import { parseUpiUri } from "../../../common/utils/upi";

export {
  buildBookingUpiUri,
  normalizeUpiAmount,
  parseUpiUri,
} from "../../../common/utils/upi";

export type UpiApp = {
  packageName: string;
  name: string;
  /** A small PNG data URI returned by PackageManager, when available. */
  icon?: string;
};

/** App-reported evidence only. SUCCESS must still be verified by the PSP. */
export type UpiPaymentResult = {
  outcome: "SUCCESS" | "CANCELLED" | "FAILURE" | "UNKNOWN";
  appPackage: string;
  resultCode: number | null;
  responseCode?: string;
  txnId?: string;
  approvalRefNo?: string;
  transactionRef?: string;
  rawResponse?: string;
  reason?: string;
};

type NativeUpiModule = {
  listApps(): Promise<UpiApp[]>;
  launchPayment(uri: string, packageName: string): Promise<UpiPaymentResult>;
};

function nativeModule(): NativeUpiModule | null {
  if (Platform.OS !== "android" || isRunningInExpoGo()) return null;
  return requireOptionalNativeModule<NativeUpiModule>("OhoUpi");
}

export function getUpiAvailability(): { available: boolean; reason?: string } {
  if (Platform.OS !== "android") {
    return {
      available: false,
      reason: "QR payment app selection is available in the Android app.",
    };
  }
  if (isRunningInExpoGo()) {
    return {
      available: false,
      reason:
        "Install an OHOINDIA Android build to scan and pay. Expo Go cannot receive payment app results.",
    };
  }
  if (!nativeModule()) {
    return {
      available: false,
      reason: "Update your OHOINDIA Android app to enable QR booking payments.",
    };
  }
  return { available: true };
}

function requireUpiModule(): NativeUpiModule {
  const module = nativeModule();
  if (!module) throw new Error(getUpiAvailability().reason);
  return module;
}

export async function listUpiApps(): Promise<UpiApp[]> {
  return requireUpiModule().listApps();
}

let paymentInFlight = false;

/** Resolves when Android delivers a result, or UNKNOWN if an app returns silently. */
export async function launchUpiPayment(
  uri: string,
  packageName: string,
): Promise<UpiPaymentResult> {
  const module = requireUpiModule();
  const request = parseUpiUri(uri);
  if (!request.amount || !request.transactionRef) {
    throw new Error(
      "Create a booking payment attempt before opening a payment app.",
    );
  }
  if (!/^[a-z][a-z0-9_]*(?:\.[a-z0-9_]+)+$/i.test(packageName)) {
    throw new Error("Choose an installed UPI payment app.");
  }
  if (paymentInFlight)
    throw new Error(
      "A payment app is already open. Return to OHOINDIA to continue.",
    );
  paymentInFlight = true;
  try {
    return await module.launchPayment(request.uri, packageName);
  } finally {
    paymentInFlight = false;
  }
}
