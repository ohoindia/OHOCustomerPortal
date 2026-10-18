import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import { randomUUID } from "expo-crypto";
import {
  router,
  useFocusEffect,
  useIsFocused,
  useLocalSearchParams,
} from "expo-router";
import type {
  HospitalBookingPayments,
  HospitalBookingPaymentAttempt,
} from "../../../common/models/booking-payment";
import {
  Button,
  Card,
  Copy,
  Field,
  Heading,
  Page,
  Status,
  colors,
  s,
} from "../components/ui";
import { useSession } from "../lib/AppContext";
import { getSession } from "../lib/session";
import {
  getBookingPayments,
  prepareBookingPayment,
  reportBookingPayment,
  rememberPaymentResult,
  syncPaymentResults,
  toReport,
} from "../lib/booking-payments";
import {
  getUpiAvailability,
  launchUpiPayment,
  listUpiApps,
  normalizeUpiAmount,
  parseUpiUri,
} from "../lib/upi";
import type { UpiApp, UpiPaymentResult } from "../lib/upi";
import type { UpiPaymentRequest } from "../../../common/utils/upi";

const money = (amount: number) =>
  `₹${amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const message = (error: unknown) =>
  error instanceof Error ? error.message : "Please try again.";

function attemptLabel(attempt: HospitalBookingPaymentAttempt) {
  if (attempt.verificationStatus === "VERIFIED") return "Payment verified";
  if (attempt.verificationStatus === "REJECTED") return "Payment not verified";
  return {
    CREATED: "Awaiting app response",
    SUCCESS: "App reported success · verification pending",
    CANCELLED: "Cancelled in payment app",
    FAILURE: "Payment app reported failure",
    UNKNOWN: "Result unknown · check before paying again",
    EXPIRED: "No result recorded · attempt expired",
  }[attempt.status];
}

export default function BookingPayment() {
  const { bookingId: routeId } = useLocalSearchParams<{
    bookingId?: string | string[];
  }>();
  const bookingId = Number(Array.isArray(routeId) ? routeId[0] : routeId);
  const session = useSession();
  const customerId = Number(session?.member.MemberId);
  return (
    <BookingPaymentFlow
      key={`${customerId}:${bookingId}`}
      bookingId={bookingId}
      customerId={customerId}
    />
  );
}

function BookingPaymentFlow({
  bookingId,
  customerId,
}: {
  bookingId: number;
  customerId: number;
}) {
  const validBooking = Number.isSafeInteger(bookingId) && bookingId > 0;
  const focused = useIsFocused();
  const availability = getUpiAvailability();
  const [permission, requestPermission] = useCameraPermissions();
  const [data, setData] = useState<HospitalBookingPayments | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [syncError, setSyncError] = useState("");
  const [scanning, setScanning] = useState(false);
  const [torch, setTorch] = useState(false);
  const scanLock = useRef(false);
  const [qr, setQr] = useState<UpiPaymentRequest | null>(null);
  const [amount, setAmount] = useState("");
  const [apps, setApps] = useState<UpiApp[]>([]);
  const [selected, setSelected] = useState("");
  const [appsLoading, setAppsLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const paying = useRef(false);
  const request = useRef<{ signature: string; id: string } | null>(null);
  const [lastResult, setLastResult] = useState<UpiPaymentResult | null>(null);
  const [checkedPrevious, setCheckedPrevious] = useState(false);
  const [confirmedPayee, setConfirmedPayee] = useState(false);

  const refresh = useCallback(async () => {
    if (paying.current) return;
    if (!validBooking) {
      setError("Open payment from a saved hospital booking.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      try {
        await syncPaymentResults(customerId, bookingId);
        setSyncError("");
      } catch {
        setSyncError(
          "An app response is saved on this phone and is waiting to sync. Keep this booking open and retry when connected.",
        );
      }
      setData(await getBookingPayments(bookingId));
    } catch (e) {
      setError(message(e));
    } finally {
      setLoading(false);
    }
  }, [bookingId, customerId, validBooking]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
      return () => setScanning(false);
    }, [refresh]),
  );

  const loadApps = async () => {
    setAppsLoading(true);
    setError("");
    try {
      const found = await listUpiApps();
      setApps(found);
      setSelected((previous) =>
        found.some((app) => app.packageName === previous)
          ? previous
          : (found[0]?.packageName ?? ""),
      );
    } catch (e) {
      setError(message(e));
    } finally {
      setAppsLoading(false);
    }
  };

  const acceptQr = (raw: string) => {
    if (scanLock.current) return;
    scanLock.current = true;
    setScanning(false);
    try {
      const parsed = parseUpiUri(raw);
      if (parsed.uri.length > 2048)
        throw new Error(
          "This payment QR contains too many details. Ask the hospital for its regular UPI QR.",
        );
      if (
        data?.approvedPayee &&
        parsed.payeeAddress.toLowerCase() !==
          data.approvedPayee.upiId.toLowerCase()
      ) {
        throw new Error(
          "This QR belongs to a different UPI account. Scan the payment QR of the hospital shown above.",
        );
      }
      setQr(parsed);
      setAmount(parsed.amount ?? "");
      setConfirmedPayee(false);
      setLastResult(null);
      setError("");
      void loadApps();
    } catch (e) {
      setError(message(e));
    }
  };

  const startScan = async () => {
    setError("");
    try {
      const access = permission?.granted
        ? permission
        : await requestPermission();
      if (!access.granted) {
        setError(
          "Camera access is needed to scan the hospital payment QR. Enable it in your phone settings.",
        );
        return;
      }
      scanLock.current = false;
      setScanning(true);
    } catch (e) {
      setError(message(e));
    }
  };

  const pay = async () => {
    if (
      paying.current ||
      !qr ||
      !selected ||
      !canPay ||
      !confirmedPayee ||
      (previousNeedsCheck && !checkedPrevious)
    )
      return;
    paying.current = true;
    setBusy(true);
    setError("");
    setLastResult(null);
    try {
      const total = Number(normalizeUpiAmount(amount));
      if (total > 100000)
        throw new Error("The maximum supported payment is ₹1,00,000.");
      const signature = JSON.stringify([bookingId, qr.uri, total, selected]);
      if (request.current?.signature !== signature)
        request.current = { signature, id: randomUUID() };
      const attempt = await prepareBookingPayment(bookingId, {
        upiUri: qr.uri,
        amount: total,
        clientRequestId: request.current.id,
        appPackage: selected,
      });
      if (attempt.status !== "CREATED")
        throw new Error(
          "This attempt already has an app result. Refresh the history before continuing.",
        );
      if (Number(getSession()?.member.MemberId) !== customerId)
        throw new Error(
          "Your account changed. Reopen this booking to continue.",
        );
      setData((current) =>
        current
          ? {
              ...current,
              attempts: [
                attempt,
                ...current.attempts.filter((row) => row.id !== attempt.id),
              ],
            }
          : current,
      );
      let result: UpiPaymentResult;
      try {
        result = await launchUpiPayment(attempt.upiUri, selected);
      } catch (e) {
        const code = (e as { code?: string })?.code;
        const didNotOpen = [
          "ERR_UPI_APP_UNAVAILABLE",
          "ERR_UPI_NO_ACTIVITY",
          "ERR_UPI_INVALID_URI",
          "ERR_UPI_INVALID_APP",
        ].includes(code ?? "");
        result = {
          outcome: didNotOpen ? "FAILURE" : "UNKNOWN",
          appPackage: selected,
          resultCode: null,
        };
        setError(message(e));
      }
      setLastResult(result);
      setQr(null);
      // Save the callback before the network request, including when this screen loses focus.
      const report = toReport(result);
      try {
        await rememberPaymentResult(customerId, bookingId, attempt.id, report);
      } catch {
        // Storage can be full/unavailable; still deliver the actual response online.
        if (Number(getSession()?.member.MemberId) !== customerId)
          throw new Error(
            "Your payment response could not be saved. Sign back in to this account and contact support with the transaction reference.",
          );
        await reportBookingPayment(bookingId, attempt.id, report);
      }
      try {
        await syncPaymentResults(customerId, bookingId);
        setSyncError("");
      } catch {
        setSyncError(
          "Your app response is saved on this phone. Retry sync when connected; do not repeat the payment.",
        );
      }
      request.current = null;
      setCheckedPrevious(false);
      setData(await getBookingPayments(bookingId));
    } catch (e) {
      setError(message(e));
      // A prepare response can be lost after the server saved the attempt.
      // Refresh its history before allowing another handoff.
      try {
        setData(await getBookingPayments(bookingId));
      } catch {
        /* Retain the visible attempt and error for retry. */
      }
    } finally {
      paying.current = false;
      setBusy(false);
    }
  };

  const unresolved = data?.attempts.find(
    (attempt) =>
      attempt.verificationStatus === "UNVERIFIED" &&
      ["CREATED", "UNKNOWN", "SUCCESS"].includes(attempt.status),
  );
  const verified = data?.attempts.find(
    (attempt) => attempt.verificationStatus === "VERIFIED",
  );
  const canPay =
    availability.available &&
    data?.paymentEnabled &&
    !unresolved &&
    !verified &&
    !syncError &&
    !loading &&
    !busy;
  const selectedApp = apps.find((app) => app.packageName === selected);
  const previousNeedsCheck = Boolean(data?.attempts.length && !unresolved);

  return (
    <Page title="Hospital payment">
      <View style={styles.hero}>
        <View style={styles.heroIcon}>
          <Ionicons name="scan-outline" size={28} color="#fff" />
        </View>
        <Text style={styles.eyebrow}>
          BOOKING #{validBooking ? bookingId : "—"}
        </Text>
        <Text style={styles.heroTitle}>
          {data?.booking.hospitalName || "Scan, review & pay"}
        </Text>
        <Text style={styles.heroCopy}>
          {data?.booking.patientName ||
            "Pay hospital charges against your saved booking."}
        </Text>
      </View>

      <Status
        loading={loading}
        error={!data ? error : ""}
        retry={() => void refresh()}
      />
      {data && (
        <>
          <Card>
            <View style={styles.row}>
              <Ionicons
                name="shield-checkmark-outline"
                size={22}
                color={colors.brand}
              />
              <Heading>Hospital charges</Heading>
            </View>
            <Copy>
              Your membership free consultation stays free. Pay here only when
              the hospital has issued a separate bill for this booking.
            </Copy>
            {data.approvedPayee && (
              <View style={styles.payee}>
                <Text style={s.label}>{data.approvedPayee.payeeName}</Text>
                <Text selectable style={s.copy}>
                  {data.approvedPayee.upiId}
                </Text>
              </View>
            )}
            {!data.paymentEnabled && (
              <Text style={styles.notice}>
                {data.disabledReason ||
                  "UPI payments have not been enabled by this hospital."}
              </Text>
            )}
            {!availability.available && <Copy>{availability.reason}</Copy>}
          </Card>

          {!!syncError && (
            <Card>
              <Text accessibilityRole="alert" style={styles.notice}>
                {syncError}
              </Text>
              <Button
                title="Retry syncing response"
                secondary
                disabled={busy}
                onPress={() => void refresh()}
              />
            </Card>
          )}

          {lastResult && (
            <View accessibilityRole="alert" style={styles.result}>
              <Ionicons
                name={
                  lastResult.outcome === "SUCCESS"
                    ? "checkmark-circle-outline"
                    : "information-circle-outline"
                }
                size={28}
                color={colors.brand}
              />
              <Text style={s.label}>
                {lastResult.outcome === "SUCCESS"
                  ? "Payment app reported success"
                  : lastResult.outcome === "CANCELLED"
                    ? "Payment was cancelled"
                    : lastResult.outcome === "FAILURE"
                      ? "Payment app reported failure"
                      : "Payment response was not confirmed"}
              </Text>
              <Copy>
                {lastResult.outcome === "SUCCESS" ||
                lastResult.outcome === "UNKNOWN"
                  ? "Check the transaction in your payment app and ask the hospital to confirm receipt. Avoid paying again while verification is pending."
                  : "No successful payment has been confirmed. Check your payment app for a debit before trying again."}
              </Copy>
            </View>
          )}

          {unresolved && !busy && (
            <Card>
              <Heading>Check your existing payment first</Heading>
              <Text style={s.label}>{attemptLabel(unresolved)}</Text>
              <Copy>
                Confirm the transaction with your payment app and hospital
                before making another payment for this booking.
              </Copy>
              <Button
                title="Refresh payment history"
                secondary
                onPress={() => void refresh()}
              />
            </Card>
          )}

          {verified && (
            <Card>
              <Heading>Payment verified</Heading>
              <Copy>
                A payment has already been verified for this booking. Its
                receipt details are in the history below.
              </Copy>
            </Card>
          )}

          {canPay && !qr && !scanning && (
            <Card>
              <View style={styles.row}>
                <View style={styles.number}>
                  <Text style={styles.numberText}>1</Text>
                </View>
                <Heading>Scan the hospital payment QR</Heading>
              </View>
              <Copy>
                Use the hospital counter’s UPI QR. Review the recipient and bill
                amount before opening your payment app.
              </Copy>
              <Button
                title="Scan hospital UPI QR"
                onPress={() => void startScan()}
              />
              {permission?.canAskAgain === false && !permission.granted && (
                <Button
                  title="Open camera settings"
                  secondary
                  onPress={() => void Linking.openSettings()}
                />
              )}
            </Card>
          )}

          {canPay && previousNeedsCheck && (
            <Card>
              <Text style={styles.notice}>
                An earlier payment was cancelled, failed or returned no
                confirmed result. A debit may still need checking in your
                payment app.
              </Text>
              <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{ checked: checkedPrevious }}
                onPress={() => setCheckedPrevious(!checkedPrevious)}
                style={styles.row}
              >
                <Ionicons
                  name={checkedPrevious ? "checkbox" : "square-outline"}
                  size={24}
                  color={colors.brand}
                />
                <Text style={[s.copy, { flex: 1 }]}>
                  I checked with my payment app and hospital that no earlier
                  payment was received.
                </Text>
              </Pressable>
            </Card>
          )}

          {focused && scanning && canPay && (
            <Card>
              <Heading>Place the UPI QR inside the camera</Heading>
              <View style={styles.cameraFrame}>
                <CameraView
                  style={StyleSheet.absoluteFill}
                  facing="back"
                  enableTorch={torch}
                  barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
                  onBarcodeScanned={({ data: raw }) => acceptQr(raw)}
                  onMountError={() => {
                    setScanning(false);
                    setError(
                      "The camera could not open. Check camera permissions and try again.",
                    );
                  }}
                />
                <View pointerEvents="none" style={styles.scanGuide} />
              </View>
              <Button
                title={torch ? "Turn torch off" : "Turn torch on"}
                secondary
                onPress={() => setTorch(!torch)}
              />
              <Button
                title="Cancel scanning"
                secondary
                onPress={() => setScanning(false)}
              />
            </Card>
          )}

          {qr && canPay && (
            <Card>
              <View style={styles.row}>
                <View style={styles.number}>
                  <Text style={styles.numberText}>2</Text>
                </View>
                <Heading>Review payment</Heading>
              </View>
              <Text style={s.label}>
                {data.approvedPayee?.payeeName ||
                  qr.payeeName ||
                  "Scanned payment recipient"}
              </Text>
              <Text selectable style={s.copy}>
                {qr.payeeAddress}
              </Text>
              <Field
                label="Hospital bill amount (₹)"
                value={amount}
                onChangeText={(value) => {
                  setAmount(value);
                  setConfirmedPayee(false);
                }}
                keyboardType="decimal-pad"
                editable={!qr.amount && !busy}
                maxLength={12}
                placeholder="Enter amount from your hospital bill"
              />
              <Copy>
                {qr.amount
                  ? "The amount is fixed by the scanned QR."
                  : "Enter the exact bill amount agreed with the hospital."}
              </Copy>
              <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{ checked: confirmedPayee }}
                onPress={() => setConfirmedPayee(!confirmedPayee)}
                style={styles.row}
              >
                <Ionicons
                  name={confirmedPayee ? "checkbox" : "square-outline"}
                  size={24}
                  color={colors.brand}
                />
                <Text style={[s.copy, { flex: 1 }]}>
                  I confirmed this recipient and amount with the hospital.
                </Text>
              </Pressable>
              <View style={styles.row}>
                <View style={styles.number}>
                  <Text style={styles.numberText}>3</Text>
                </View>
                <Heading>Choose a UPI app</Heading>
              </View>
              {appsLoading && <ActivityIndicator color={colors.brand} />}
              {apps.map((app) => (
                <Pressable
                  key={app.packageName}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected === app.packageName }}
                  accessibilityLabel={app.name}
                  onPress={() => setSelected(app.packageName)}
                  style={[
                    styles.app,
                    selected === app.packageName && styles.appSelected,
                  ]}
                >
                  {app.icon ? (
                    <Image source={{ uri: app.icon }} style={styles.appIcon} />
                  ) : (
                    <Ionicons
                      name="wallet-outline"
                      size={26}
                      color={colors.brand}
                    />
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={s.label}>{app.name}</Text>
                    <Text style={s.copy}>Installed on this phone</Text>
                  </View>
                  <Ionicons
                    name={
                      selected === app.packageName
                        ? "radio-button-on"
                        : "radio-button-off"
                    }
                    size={22}
                    color={colors.brand}
                  />
                </Pressable>
              ))}
              {!apps.length && !appsLoading && (
                <Copy>
                  No installed UPI app can handle this payment. Install and set
                  up PhonePe, Google Pay, BHIM or another UPI app, then refresh
                  this list.
                </Copy>
              )}
              <Button
                title="Refresh installed payment apps"
                secondary
                onPress={() => void loadApps()}
                disabled={appsLoading}
              />
              <Button
                title={
                  selectedApp
                    ? `Continue with ${selectedApp.name}`
                    : "Choose a payment app"
                }
                disabled={
                  !selected ||
                  !confirmedPayee ||
                  !amount ||
                  appsLoading ||
                  (previousNeedsCheck && !checkedPrevious)
                }
                onPress={() => void pay()}
              />
              <Copy>
                Confirm the hospital name and amount in your payment app. Return
                here after completing or cancelling the payment.
              </Copy>
              <Button
                title="Scan another QR"
                secondary
                onPress={() => {
                  setQr(null);
                  void startScan();
                }}
              />
            </Card>
          )}

          {busy && (
            <Card>
              <ActivityIndicator color={colors.brand} />
              <Heading>Waiting for payment app</Heading>
              <Copy>
                Complete or cancel the payment, then return to OHOINDIA. Your
                payment attempt is linked to this booking.
              </Copy>
            </Card>
          )}

          {!!error && (
            <Text accessibilityRole="alert" style={s.error}>
              {error}
            </Text>
          )}

          <View style={styles.row}>
            <Heading>Payment history</Heading>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Refresh history"
              disabled={busy || loading}
              onPress={() => void refresh()}
              style={styles.refresh}
            >
              <Ionicons name="refresh" size={23} color={colors.brand} />
            </Pressable>
          </View>
          {!data.attempts.length && (
            <Copy>
              No payment attempts yet. Each app result and payment reference
              will appear here.
            </Copy>
          )}
          {data.attempts.map((attempt) => (
            <Card key={attempt.id}>
              <View style={styles.row}>
                <Text style={styles.amount}>{money(attempt.amount)}</Text>
                <Text style={styles.badge}>
                  {attempt.verificationStatus === "VERIFIED"
                    ? "VERIFIED"
                    : "APP RESULT"}
                </Text>
              </View>
              <Text style={s.label}>{attemptLabel(attempt)}</Text>
              <Text selectable style={s.copy}>
                {attempt.payeeName} · {attempt.payeeVpa}
              </Text>
              <Text style={s.copy}>
                {new Date(attempt.createdAt).toLocaleString("en-IN", {
                  timeZone: "Asia/Kolkata",
                })}{" "}
                IST
              </Text>
              <Text selectable style={s.copy}>
                Reference: {attempt.transactionRef}
              </Text>
              {!!attempt.txnId && (
                <Text selectable style={s.copy}>
                  Transaction: {attempt.txnId}
                </Text>
              )}
              {!!attempt.approvalRefNo && (
                <Text selectable style={s.copy}>
                  Bank reference: {attempt.approvalRefNo}
                </Text>
              )}
              {!!attempt.appPackage && (
                <Text style={s.copy}>
                  App:{" "}
                  {apps.find((app) => app.packageName === attempt.appPackage)
                    ?.name || attempt.appPackage}
                </Text>
              )}
              {attempt.verificationStatus === "UNVERIFIED" && (
                <Copy>
                  Hospital receipt has not been independently verified.
                </Copy>
              )}
            </Card>
          ))}
          <Button
            title="View booking details"
            secondary
            onPress={() =>
              router.navigate({
                pathname: "/hospitalConsulationForm",
                params: { bookingId: String(bookingId), id: String(bookingId) },
              })
            }
          />
        </>
      )}
      {!validBooking && (
        <Button
          title="Go to bookings"
          onPress={() => router.replace("/bookings")}
        />
      )}
    </Page>
  );
}

const styles = StyleSheet.create({
  hero: { padding: 24, borderRadius: 22, backgroundColor: colors.navy, gap: 9 },
  heroIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: "#24496a",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 5,
  },
  eyebrow: {
    color: "#8dd8ef",
    fontFamily: "InterSemiBold",
    fontSize: 11,
    letterSpacing: 1.3,
  },
  heroTitle: {
    color: "#fff",
    fontFamily: "JakartaBold",
    fontSize: 22,
    lineHeight: 30,
  },
  heroCopy: {
    color: "#cad7e8",
    fontFamily: "Inter",
    lineHeight: 21,
    fontSize: 13,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
  },
  payee: { borderRadius: 12, padding: 14, backgroundColor: "#eff9fc", gap: 5 },
  notice: {
    color: "#8a4b0f",
    backgroundColor: "#fff7e8",
    padding: 12,
    borderRadius: 10,
    lineHeight: 21,
  },
  result: {
    padding: 18,
    borderWidth: 1,
    borderColor: "#b7e2ef",
    backgroundColor: "#effafd",
    borderRadius: 16,
    gap: 10,
  },
  number: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#e3f5fc",
    alignItems: "center",
    justifyContent: "center",
  },
  numberText: { color: colors.brand, fontFamily: "InterBold" },
  cameraFrame: {
    height: 280,
    overflow: "hidden",
    backgroundColor: colors.navy,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  scanGuide: {
    width: 210,
    height: 210,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: "#fff",
  },
  app: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 14,
    padding: 14,
  },
  appSelected: { borderColor: colors.brand, backgroundColor: "#f0fafd" },
  appIcon: { width: 38, height: 38, borderRadius: 8 },
  refresh: { marginLeft: "auto", padding: 10 },
  amount: { color: colors.navy, fontFamily: "JakartaBold", fontSize: 22 },
  badge: {
    fontSize: 10,
    fontFamily: "InterSemiBold",
    color: colors.brand,
    padding: 7,
    backgroundColor: "#e7f6fb",
    borderRadius: 8,
    marginLeft: "auto",
  },
});
