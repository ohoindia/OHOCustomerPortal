import AsyncStorage from "@react-native-async-storage/async-storage";
import type {
  HospitalBookingPaymentAttempt,
  HospitalBookingPayments,
  PrepareBookingPayment,
  ReportBookingPayment,
} from "../../../common/models/booking-payment";
import { api } from "./api";
import { getAccessToken, getSession } from "./session";
import type { UpiPaymentResult } from "./upi";

export type {
  HospitalBookingPaymentAttempt,
  HospitalBookingPayments,
  PrepareBookingPayment,
  ReportBookingPayment,
} from "../../../common/models/booking-payment";

type PaymentResponse = UpiPaymentResult | ReportBookingPayment;
type SavedPaymentResponse = {
  version: 1;
  customerId: number;
  bookingId: number;
  attemptId: string;
  result: ReportBookingPayment;
};
const outboxPrefix = "oho.booking-payment-result.v1:";
const attemptPattern =
  /^[a-f\d]{8}-[a-f\d]{4}-4[a-f\d]{3}-[89ab][a-f\d]{3}-[a-f\d]{12}$/i;
const operations = new Map<string, Promise<unknown>>();

function positiveId(value: number) {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error("A valid booking and customer account are required.");
  }
  return value;
}

function attemptReference(value: string) {
  if (!attemptPattern.test(value)) {
    throw new Error("A valid booking payment attempt is required.");
  }
  return value.toLowerCase();
}

function paymentPath(bookingId: number) {
  return `api/BookingConsultation/${positiveId(bookingId)}/payments`;
}

export function getBookingPayments(bookingId: number, signal?: AbortSignal) {
  return api<HospitalBookingPayments>(paymentPath(bookingId), {
    signal,
    serverErrors: true,
  });
}

export function prepareBookingPayment(
  bookingId: number,
  input: PrepareBookingPayment,
) {
  return api<HospitalBookingPaymentAttempt>(paymentPath(bookingId), {
    body: { ...input },
    serverErrors: true,
  });
}

/** The DTO contains app evidence only; it never upgrades verification status. */
export function toReport(result: PaymentResponse): ReportBookingPayment {
  if (
    !result ||
    !["SUCCESS", "CANCELLED", "FAILURE", "UNKNOWN"].includes(result.outcome) ||
    typeof result.appPackage !== "string" ||
    result.appPackage.length > 200 ||
    !/^[A-Za-z][A-Za-z0-9_]*(?:\.[A-Za-z][A-Za-z0-9_]*)+$/.test(
      result.appPackage,
    )
  ) {
    throw new Error("The payment app returned an invalid response.");
  }
  const report: ReportBookingPayment = {
    appPackage: result.appPackage,
    outcome: result.outcome,
  };
  const optional = (value: unknown, limit: number, trim = true) => {
    if (typeof value !== "string") return undefined;
    const text = trim ? value.trim() : value;
    return text ? text.slice(0, limit) : undefined;
  };
  const responseCode = optional(result.responseCode, 100);
  const txnId = optional(result.txnId, 200);
  const approvalRefNo = optional(result.approvalRefNo, 200);
  const rawResponse = optional(result.rawResponse, 4096, false);
  if (responseCode !== undefined) report.responseCode = responseCode;
  if (txnId !== undefined) report.txnId = txnId;
  if (approvalRefNo !== undefined) report.approvalRefNo = approvalRefNo;
  if (rawResponse !== undefined) report.rawResponse = rawResponse;
  if (
    typeof result.resultCode === "number" &&
    Number.isInteger(result.resultCode) &&
    result.resultCode >= -2147483648 &&
    result.resultCode <= 2147483647
  ) {
    report.resultCode = result.resultCode;
  }
  return report;
}

export function reportBookingPayment(
  bookingId: number,
  attemptId: string,
  result: PaymentResponse,
) {
  return api<HospitalBookingPaymentAttempt>(
    `${paymentPath(bookingId)}/${attemptReference(attemptId)}/result`,
    { body: { ...toReport(result) }, serverErrors: true },
  );
}

function bookingPrefix(customerId: number, bookingId: number) {
  return `${outboxPrefix}${positiveId(customerId)}:${positiveId(bookingId)}:`;
}

/** Serialize the same attempt without making unrelated callbacks wait. */
function forAttempt<T>(key: string, work: () => Promise<T>): Promise<T> {
  const previous = operations.get(key) ?? Promise.resolve();
  const pending = previous.catch(() => undefined).then(work);
  operations.set(key, pending);
  const release = () => {
    if (operations.get(key) === pending) operations.delete(key);
  };
  void pending.then(release, release);
  return pending;
}

/** Save before attempting the network request, including when the user went offline. */
export async function rememberPaymentResult(
  customerId: number,
  bookingId: number,
  attemptId: string,
  result: PaymentResponse,
): Promise<void> {
  const id = attemptReference(attemptId);
  const key = `${bookingPrefix(customerId, bookingId)}${id}`;
  const saved: SavedPaymentResponse = {
    version: 1,
    customerId,
    bookingId,
    attemptId: id,
    result: toReport(result),
  };
  await forAttempt(key, () => AsyncStorage.setItem(key, JSON.stringify(saved)));
}

function currentCustomer(customerId: number, expectedToken?: string) {
  const token = getAccessToken();
  const session = getSession();
  const id = Number(
    session?.member.MemberId || session?.member.CommunityCustomerId,
  );
  return token &&
    id === customerId &&
    (!expectedToken || token === expectedToken)
    ? token
    : null;
}

function restoreResponse(
  raw: string,
  customerId: number,
  bookingId: number,
  attemptId: string,
): SavedPaymentResponse {
  let value: SavedPaymentResponse;
  try {
    value = JSON.parse(raw) as SavedPaymentResponse;
    if (
      !value ||
      value.version !== 1 ||
      value.customerId !== customerId ||
      value.bookingId !== bookingId ||
      value.attemptId !== attemptId
    ) {
      throw new Error("Mismatched payment response.");
    }
    return { ...value, result: toReport(value.result) };
  } catch {
    throw new Error(
      "A saved payment response could not be restored. Please contact support.",
    );
  }
}

/** Replay only this booking's evidence using its owner's current login. */
export async function syncPaymentResults(
  customerId: number,
  bookingId: number,
): Promise<void> {
  const prefix = bookingPrefix(customerId, bookingId);
  const token = currentCustomer(customerId);
  if (!token) return;
  const keys = (await AsyncStorage.getAllKeys()).filter(
    (key) =>
      key.startsWith(prefix) && attemptPattern.test(key.slice(prefix.length)),
  );
  let firstError: unknown;
  for (const key of keys) {
    if (!currentCustomer(customerId, token)) break;
    try {
      await forAttempt(key, async () => {
        if (!currentCustomer(customerId, token)) return;
        const raw = await AsyncStorage.getItem(key);
        if (!raw || !currentCustomer(customerId, token)) return;
        const attemptId = key.slice(prefix.length);
        const saved = restoreResponse(raw, customerId, bookingId, attemptId);
        if (!currentCustomer(customerId, token)) return;
        await reportBookingPayment(bookingId, attemptId, saved.result);
        // Keep it if a logout/account switch interrupted the request. The
        // backend accepts an identical retry if the report already arrived.
        if (currentCustomer(customerId, token))
          await AsyncStorage.removeItem(key);
      });
    } catch (error) {
      firstError ??= error;
    }
  }
  if (firstError) throw firstError;
}
