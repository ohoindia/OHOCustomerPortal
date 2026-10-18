import { useCallback, useEffect, useRef, useState } from "react";
import {
  BackHandler,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import {
  bookableCardStatuses,
  cardStatus,
  type MemberCard,
} from "../../../common";
import {
  serviceAccess,
  serviceAccessMessage,
} from "../../../common/utils/home";
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
import { Choice } from "../components/Choice";
import { api } from "../lib/api";
import { getSession } from "../lib/session";
import { value, type Row } from "../lib/data";
import { translate } from "../lib/localization";
import { indiaAppointment } from "../lib/validation";

type Options = {
  hospital: Row;
  patients: Row[];
  services: Row[];
  policy: Row | undefined;
};
const steps = ["Patient", "Visit", "Review", "Request sent"];
const indiaDate = (offset: number) =>
  new Date(Date.now() + 330 * 60_000 + offset * 86_400_000)
    .toISOString()
    .slice(0, 10);
const appointmentLabel = (date: string, time: string) => {
  const appointment = new Date(`${date}T${time}:00+05:30`);
  return Number.isFinite(appointment.getTime())
    ? appointment.toLocaleString("en-IN", {
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        timeZone: "Asia/Kolkata",
      }) + " IST"
    : `${date} ${time}`;
};

export default function BookService() {
  const { hospitalId: param } = useLocalSearchParams<{ hospitalId: string }>();
  const hospitalId = Number(param);
  const customerId = getSession()!.member.MemberId;
  const [membershipAttempt, setMembershipAttempt] = useState(0);
  const [membership, setMembership] = useState<{
    card: MemberCard | null;
    membershipLoaded: boolean;
  } | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    if (!(customerId > 0)) return;
    void api<{ status: boolean; returnData?: MemberCard[] }>(
      `api/OHOCards/GetMemberCardByMemberId/${customerId}`,
      { signal: controller.signal },
    )
      .then((result) => {
        if (
          typeof result.status !== "boolean" ||
          (result.status && !Array.isArray(result.returnData))
        )
          throw new Error("Unexpected membership response");
        if (!controller.signal.aborted)
          setMembership({
            card: result.status
              ? (result.returnData?.find((card) =>
                  bookableCardStatuses.includes(cardStatus(card)),
                ) ?? null)
              : null,
            membershipLoaded: true,
          });
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setMembership({ card: null, membershipLoaded: false });
      });
    return () => controller.abort();
  }, [customerId, membershipAttempt]);
  const access = customerId > 0 ? serviceAccess(membership) : "purchase";
  if (
    access === "available" &&
    Number.isSafeInteger(hospitalId) &&
    hospitalId > 0
  )
    return (
      <ServiceForm
        key={`${customerId}:${hospitalId}`}
        customerId={customerId}
        hospitalId={hospitalId}
      />
    );
  return (
    <Page title="Book service">
      <Card>
        <Heading>Your next hospital visit</Heading>
        <Copy>
          {access === "available"
            ? "Choose a hospital to start your booking."
            : serviceAccessMessage(access)}
        </Copy>
        {access === "unavailable" && (
          <Button
            title="Try again"
            onPress={() => {
              setMembership(null);
              setMembershipAttempt((n) => n + 1);
            }}
          />
        )}
        {access === "purchase" && (
          <Button
            title="Purchase a package"
            onPress={() => router.push("/packages")}
          />
        )}
        {access === "available" && (
          <Button
            title="Choose hospital"
            onPress={() => router.push("/hospitals")}
          />
        )}
      </Card>
    </Page>
  );
}

function ServiceForm({
  customerId,
  hospitalId,
}: {
  customerId: number;
  hospitalId: number;
}) {
  const [data, setData] = useState<Options | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [step, setStep] = useState(0);
  const [patientId, setPatientId] = useState(customerId);
  const [coupon, setCoupon] = useState<{
    patientId: number;
    count: number;
    message: string;
    failed?: boolean;
  } | null>(null);
  const [couponAttempt, setCouponAttempt] = useState(0);
  const [serviceId, setServiceId] = useState(0);
  const [date, setDate] = useState(indiaDate(1));
  const [time, setTime] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  const [bookingError, setBookingError] = useState("");
  const [bookingId, setBookingId] = useState<number | null>(null);
  const [existingId, setExistingId] = useState<number | null>(null);
  const dependentCustomerId = patientId === customerId ? null : patientId;
  const patient = data?.patients.find(
    (row) => Number(row.CustomerId || row.MemberId) === patientId,
  );
  const service = data?.services.find(
    (row) => Number(row.HospitalServicesId) === serviceId,
  );
  const couponReady =
    coupon?.patientId === patientId && coupon.count > 0 && !coupon.failed;

  function back() {
    if (submitting.current) return;
    setBookingError("");
    if (bookingId) router.replace("/bookings");
    else if (step > 0) setStep((n) => n - 1);
    else if (router.canGoBack()) router.back();
    else router.replace("/hospitals");
  }
  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        () => {
          if (submitting.current) return true;
          if (step > 0 && step < 3) {
            setStep((n) => n - 1);
            setBookingError("");
            return true;
          }
          if (step === 3) {
            router.replace("/bookings");
            return true;
          }
          return false;
        },
      );
      return () => subscription.remove();
    }, [step]),
  );
  useEffect(() => {
    const controller = new AbortController();
    const options = { signal: controller.signal };
    void Promise.all([
      api<Row[]>(`api/Hospital/GetById/${hospitalId}`, options),
      api<Row[]>(
        `api/HospitalPoliciesProvision/GetByHospitalId/${hospitalId}`,
        options,
      ),
      api<Row[]>(
        `api/Customer/GetDependentsByCustomerId/${customerId}`,
        options,
      ),
      api<Row[]>("api/HospitalServices/all", {
        ...options,
        body: { skip: 0, take: 0 },
      }),
    ])
      .then(([hospitals, policies, dependents, services]) => {
        if (
          !Array.isArray(hospitals) ||
          !hospitals[0] ||
          !Array.isArray(policies) ||
          !Array.isArray(dependents) ||
          !Array.isArray(services)
        )
          throw new Error(
            "Hospital booking details could not be loaded. Please try again.",
          );
        if (!controller.signal.aborted)
          setData({
            hospital: hospitals[0],
            patients: [getSession()!.member, ...dependents].filter(
              (row) => Number(row.CustomerId || row.MemberId) > 0,
            ),
            services,
            policy: policies.find(
              (row) =>
                String(row.PoliciesType).trim().toLowerCase() ===
                "free consultation",
            ),
          });
      })
      .catch((e: unknown) => {
        if (!controller.signal.aborted)
          setError(
            e instanceof Error ? e.message : "Unable to load booking details.",
          );
      });
    return () => controller.abort();
  }, [customerId, hospitalId, attempt]);
  useEffect(() => {
    if (!data?.policy) return;
    const controller = new AbortController();
    void api<{ availableCoupons: number; message?: string }>(
      "api/BookingConsultation/checkIndividualCoupons",
      {
        signal: controller.signal,
        serverErrors: true,
        body: { customerId, hospitalId, dependentCustomerId },
      },
    )
      .then((result) => {
        if (
          !Number.isInteger(result.availableCoupons) ||
          result.availableCoupons < 0
        )
          throw new Error("Coupon availability could not be confirmed.");
        if (!controller.signal.aborted)
          setCoupon({
            patientId,
            count: result.availableCoupons,
            message: result.message || "",
          });
      })
      .catch((e: unknown) => {
        if (!controller.signal.aborted)
          setCoupon({
            patientId,
            count: 0,
            failed: true,
            message:
              e instanceof Error ? e.message : "Unable to check coupons.",
          });
      });
    return () => controller.abort();
  }, [
    customerId,
    hospitalId,
    patientId,
    dependentCustomerId,
    couponAttempt,
    data,
  ]);

  function review() {
    setBookingError("");
    setExistingId(null);
    if (!service) {
      setBookingError("Please select a service type.");
      return;
    }
    if (!indiaAppointment(`${date.trim()} ${time.trim()}`)) {
      setBookingError(
        "Choose a future date (YYYY-MM-DD) and time (HH:mm) in India time.",
      );
      return;
    }
    setStep(2);
  }
  async function book() {
    if (
      submitting.current ||
      !couponReady ||
      !data?.policy ||
      !patient ||
      !service
    )
      return;
    setBookingError("");
    setExistingId(null);
    const appointment = indiaAppointment(`${date.trim()} ${time.trim()}`);
    if (!appointment) {
      setStep(1);
      setBookingError(
        "Your selected appointment time has passed. Choose a future time.",
      );
      return;
    }
    submitting.current = true;
    setBusy(true);
    try {
      const result = await api<{
        status: boolean;
        message?: string;
        data?: { BookingConsultationId: number };
      }>("api/BookingConsultation/bookAppointment/add", {
        serverErrors: true,
        body: {
          customerId,
          hospitalId,
          hospitalPoliciesId: Number(data.policy.HospitalPoliciesId),
          dependentCustomerId,
          appointmentDate: appointment.toISOString(),
          serviceTypeId: serviceId,
          reason: reason.trim(),
        },
      });
      const id = Number(result.data?.BookingConsultationId);
      if (result.status !== true || !Number.isSafeInteger(id) || id <= 0) {
        if (Number.isSafeInteger(id) && id > 0) setExistingId(id);
        throw new Error(result.message || "Unable to initiate the booking.");
      }
      setBookingId(id);
      setStep(3);
    } catch (e) {
      setBookingError(
        e instanceof Error
          ? e.message
          : "Unable to book. Check My bookings before trying again.",
      );
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  if (!data)
    return (
      <Page title="Book service">
        <Status
          loading={!error}
          error={error}
          retry={() => {
            setError("");
            setAttempt((n) => n + 1);
          }}
        />
      </Page>
    );
  return (
    <Page
      key={step}
      title={bookingId ? "Booking request" : "Book service"}
      onBack={back}
    >
      <View style={styles.hospital}>
        <View style={styles.hospitalIcon}>
          <Ionicons name="medical-outline" size={25} color={colors.brand} />
        </View>
        <View style={{ flex: 1, gap: 5 }}>
          <Text style={styles.eyebrow}>
            {translate("YOUR CHOSEN HOSPITAL")}
          </Text>
          <Heading>{value(data.hospital, "HospitalName")}</Heading>
          <Copy>
            {[
              value(data.hospital, "AddressLine1"),
              value(data.hospital, "City"),
            ]
              .filter(Boolean)
              .join(", ")}
          </Copy>
        </View>
      </View>
      {!data.policy ? (
        <Card>
          <Heading>Consultation unavailable</Heading>
          <Copy>Free consultation is not available at this hospital.</Copy>
          <Button
            title="Choose another hospital"
            onPress={() => router.replace("/hospitals")}
          />
        </Card>
      ) : (
        <>
          <View
            style={styles.steps}
            accessibilityLabel={`Step ${step + 1} of 4: ${steps[step]}`}
          >
            {steps.map((label, index) => (
              <View key={label} style={styles.step}>
                <View
                  style={[
                    styles.stepCircle,
                    index <= step && styles.stepActive,
                  ]}
                >
                  {index < step ? (
                    <Ionicons name="checkmark" size={16} color="#fff" />
                  ) : (
                    <Text
                      style={[
                        styles.stepNumber,
                        index <= step && { color: "#fff" },
                      ]}
                    >
                      {index + 1}
                    </Text>
                  )}
                </View>
                <Text
                  style={[
                    styles.stepLabel,
                    index === step && { color: colors.navy },
                  ]}
                >
                  {translate(label)}
                </Text>
              </View>
            ))}
          </View>
          {step === 0 && (
            <>
              <View style={styles.intro}>
                <Text style={styles.title}>
                  {translate("Who is this visit for?")}
                </Text>
                <Copy>
                  Choose yourself or a family member. We will check their
                  consultation benefits.
                </Copy>
              </View>
              {data.patients.map((row, index) => {
                const id = Number(row.CustomerId || row.MemberId);
                const selected = id === patientId;
                return (
                  <Pressable
                    key={`${id}:${index}`}
                    accessibilityRole="radio"
                    accessibilityLabel={`${value(row, "Name")}${id === customerId ? " (Self)" : ""}`}
                    accessibilityState={{ checked: selected }}
                    onPress={() => {
                      setPatientId(id);
                      setCoupon(null);
                      setCouponAttempt((n) => n + 1);
                      setBookingError("");
                    }}
                    style={[styles.patient, selected && styles.selected]}
                  >
                    <View style={styles.avatar}>
                      <Ionicons
                        name="person-outline"
                        size={21}
                        color={colors.brand}
                      />
                    </View>
                    <View style={{ flex: 1, gap: 4 }}>
                      <Text style={s.label}>
                        {value(row, "Name") || translate("Family member")}
                      </Text>
                      <Copy>
                        {id === customerId
                          ? "Self · Account holder"
                          : value(row, "Relationship") || "Family member"}
                        {value(row, "Age")
                          ? ` · ${value(row, "Age")} ${translate("years")}`
                          : ""}
                      </Copy>
                    </View>
                    <Ionicons
                      name={selected ? "radio-button-on" : "radio-button-off"}
                      size={23}
                      color={selected ? colors.brand : colors.muted}
                    />
                  </Pressable>
                );
              })}
              <View
                style={[styles.benefit, couponReady && styles.benefitReady]}
                accessibilityLiveRegion="polite"
              >
                <Ionicons
                  name={
                    couponReady ? "shield-checkmark-outline" : "ticket-outline"
                  }
                  size={23}
                  color={couponReady ? "#166534" : colors.brand}
                />
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={s.label}>
                    {translate(
                      couponReady
                        ? "Free consultation available"
                        : "Consultation benefit",
                    )}
                  </Text>
                  <Copy>
                    {coupon?.patientId !== patientId
                      ? "Checking free consultation coupons…"
                      : coupon.count > 0
                        ? `${coupon.count} ${translate("free consultation coupon(s) available")}`
                        : coupon.message ||
                          "No coupons available for this patient."}
                  </Copy>
                </View>
              </View>
              {coupon?.patientId === patientId && !couponReady && (
                <Button
                  title={coupon.failed ? "Retry benefit check" : "Check again"}
                  secondary
                  onPress={() => {
                    setCoupon(null);
                    setCouponAttempt((n) => n + 1);
                  }}
                />
              )}
              <Button
                title="Continue to visit details"
                disabled={!couponReady || !patient}
                onPress={() => setStep(1)}
              />
            </>
          )}
          {step === 1 && (
            <>
              <View style={styles.intro}>
                <Text style={styles.title}>{translate("Plan your visit")}</Text>
                <Copy>
                  {translate("Booking for")} {value(patient, "Name")}.{" "}
                  {translate(
                    "Choose a service and your preferred appointment time.",
                  )}
                </Copy>
              </View>
              <Heading>Service type</Heading>
              {data.services.map((row, index) => (
                <Pressable
                  key={value(row, "HospitalServicesId") || index}
                  accessibilityRole="radio"
                  accessibilityLabel={value(row, "ServiceName")}
                  accessibilityState={{
                    checked: Number(row.HospitalServicesId) === serviceId,
                  }}
                  onPress={() => {
                    setServiceId(Number(row.HospitalServicesId));
                    setBookingError("");
                  }}
                  style={[
                    styles.patient,
                    Number(row.HospitalServicesId) === serviceId &&
                      styles.selected,
                  ]}
                >
                  <Ionicons
                    name="medkit-outline"
                    size={23}
                    color={colors.brand}
                  />
                  <Text style={[s.label, { flex: 1 }]}>
                    {value(row, "ServiceName")}
                  </Text>
                  <Ionicons
                    name={
                      Number(row.HospitalServicesId) === serviceId
                        ? "radio-button-on"
                        : "radio-button-off"
                    }
                    size={22}
                    color={colors.brand}
                  />
                </Pressable>
              ))}
              {!data.services.length && (
                <Copy>
                  No service types are currently available. Contact support.
                </Copy>
              )}
              <Heading>Preferred appointment date</Heading>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 9 }}
              >
                {Array.from({ length: 7 }, (_, index) => {
                  const day = indiaDate(index);
                  const stamp = new Date(`${day}T12:00:00+05:30`);
                  return (
                    <Pressable
                      key={day}
                      accessibilityRole="radio"
                      accessibilityLabel={day}
                      accessibilityState={{ checked: date === day }}
                      onPress={() => {
                        setDate(day);
                        setBookingError("");
                      }}
                      style={[styles.day, date === day && styles.selected]}
                    >
                      <Text style={styles.dayName}>
                        {translate(
                          index === 0
                            ? "Today"
                            : index === 1
                              ? "Tomorrow"
                              : stamp.toLocaleDateString("en-IN", {
                                  weekday: "short",
                                  timeZone: "Asia/Kolkata",
                                }),
                        )}
                      </Text>
                      <Text style={styles.dayNumber}>{stamp.getUTCDate()}</Text>
                      <Text style={styles.dayName}>
                        {stamp.toLocaleDateString("en-IN", {
                          month: "short",
                          timeZone: "Asia/Kolkata",
                        })}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
              <Field
                label="Appointment date"
                placeholder="YYYY-MM-DD"
                value={date}
                onChangeText={(text) => {
                  setDate(text);
                  setBookingError("");
                }}
                autoCorrect={false}
                maxLength={10}
              />
              <Choice
                label="Preferred time"
                options={["09:00", "10:30", "12:00", "15:00", "17:00"]}
                selected={time}
                onSelect={(text) => {
                  setTime(text);
                  setBookingError("");
                }}
              />
              <Field
                label="Appointment time (India time)"
                placeholder="HH:mm, for example 10:30"
                value={time}
                onChangeText={(text) => {
                  setTime(text);
                  setBookingError("");
                }}
                autoCorrect={false}
                maxLength={5}
              />
              <Copy>
                Times are preferences, subject to hospital confirmation. All
                appointments use India time (IST).
              </Copy>
              <Field
                label="Reason to visit (optional)"
                placeholder="Tell the care team what you need help with"
                value={reason}
                onChangeText={setReason}
                multiline
                maxLength={1000}
                style={{ minHeight: 90, textAlignVertical: "top" }}
              />
              <Button
                title="Review booking"
                disabled={!data.services.length}
                onPress={review}
              />
              <Button title="Back to patient" secondary onPress={back} />
            </>
          )}
          {(step === 2 || step === 3) && (
            <>
              {step === 3 ? (
                <View
                  style={styles.confirmation}
                  accessibilityLiveRegion="polite"
                >
                  <Ionicons name="checkmark-circle" size={54} color="#15803d" />
                  <Text style={styles.title}>
                    {translate("Your booking request is sent")}
                  </Text>
                  <Copy>
                    The hospital will review your request. You can follow its
                    status in My bookings.
                  </Copy>
                  <Text style={styles.reference}>
                    {translate("Booking #")}
                    {bookingId}
                  </Text>
                </View>
              ) : (
                <View style={styles.intro}>
                  <Text style={styles.title}>
                    {translate("Everything look right?")}
                  </Text>
                  <Copy>
                    Review your details before sending the request to the
                    hospital.
                  </Copy>
                </View>
              )}
              {step === 3 && bookingId && (
                <>
                  <Button
                    title="View booking & check-in QR"
                    onPress={() =>
                      router.replace({
                        pathname: "/hospitalConsulationForm",
                        params: { bookingId: String(bookingId) },
                      })
                    }
                  />
                  <Button
                    title="Scan & pay hospital"
                    secondary
                    onPress={() =>
                      router.replace({
                        pathname: "/booking-payment",
                        params: { bookingId: String(bookingId) },
                      })
                    }
                  />
                </>
              )}
              <Card>
                <Summary label="Patient" text={value(patient, "Name")} />
                <Summary
                  label="Hospital"
                  text={value(data.hospital, "HospitalName")}
                />
                <Summary label="Service" text={value(service, "ServiceName")} />
                <Summary
                  label="Preferred appointment"
                  text={appointmentLabel(date.trim(), time.trim())}
                />
                {!!reason.trim() && (
                  <Summary label="Reason to visit" text={reason.trim()} />
                )}
                <View style={styles.summaryBenefit}>
                  <Ionicons name="ticket-outline" size={20} color="#166534" />
                  <Text style={[s.label, { color: "#166534", flex: 1 }]}>
                    {translate("1 free consultation coupon")}
                  </Text>
                </View>
              </Card>
              {step === 2 && (
                <>
                  <Copy>
                    Your consultation uses your membership benefit. Any
                    additional hospital charges can be paid separately against
                    this booking.
                  </Copy>
                  <Button
                    title={
                      busy
                        ? "Sending booking request…"
                        : "Confirm booking request"
                    }
                    disabled={busy || !couponReady}
                    onPress={() => void book()}
                  />
                  <Button
                    title="Edit visit details"
                    secondary
                    disabled={busy}
                    onPress={() => {
                      setStep(1);
                      setBookingError("");
                    }}
                  />
                </>
              )}
              {step === 3 && bookingId && (
                <>
                  <Copy>
                    At the hospital, scan its UPI QR to pay a bill. Payment
                    attempts and the result will stay linked to this booking.
                  </Copy>
                  <Button
                    title="Go to My bookings"
                    secondary
                    onPress={() => router.replace("/bookings")}
                  />
                </>
              )}
            </>
          )}
          {!!bookingError && (
            <View accessibilityLiveRegion="polite" style={styles.error}>
              <Text accessibilityRole="alert" style={s.error}>
                {bookingError}
              </Text>
              <Button
                title={
                  existingId ? "View existing booking" : "Check My bookings"
                }
                secondary
                onPress={() =>
                  existingId
                    ? router.push({
                        pathname: "/hospitalConsulationForm",
                        params: { bookingId: String(existingId) },
                      })
                    : router.push("/bookings")
                }
              />
            </View>
          )}
        </>
      )}
      <Button
        title="Contact support"
        secondary
        disabled={busy}
        onPress={() => router.push("/support")}
      />
    </Page>
  );
}
function Summary({ label, text }: { label: string; text: string }) {
  return (
    <View style={{ gap: 5 }}>
      <Text style={s.copy}>{translate(label)}</Text>
      <Text style={s.label}>{text || "—"}</Text>
    </View>
  );
}
const styles = StyleSheet.create({
  hospital: {
    flexDirection: "row",
    gap: 13,
    backgroundColor: "#e7f6fb",
    padding: 18,
    borderRadius: 20,
    alignItems: "center",
  },
  hospitalIcon: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  eyebrow: {
    fontFamily: "InterSemiBold",
    fontSize: 9,
    letterSpacing: 1.3,
    color: "#28738a",
  },
  steps: { flexDirection: "row", paddingVertical: 6 },
  step: { flex: 1, alignItems: "center", gap: 8 },
  stepCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#edf2f6",
    alignItems: "center",
    justifyContent: "center",
  },
  stepActive: { backgroundColor: colors.brand },
  stepNumber: {
    color: colors.muted,
    fontFamily: "InterSemiBold",
    fontSize: 12,
  },
  stepLabel: {
    color: colors.muted,
    fontFamily: "InterSemiBold",
    fontSize: 10,
    textAlign: "center",
  },
  intro: { gap: 7 },
  title: {
    fontFamily: "JakartaBold",
    fontSize: 23,
    lineHeight: 31,
    color: colors.navy,
  },
  patient: {
    padding: 16,
    minHeight: 74,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 15,
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
  },
  selected: { borderColor: colors.brand, backgroundColor: "#edfaff" },
  avatar: {
    width: 43,
    height: 43,
    backgroundColor: "#e7f6fb",
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  benefit: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    borderRadius: 15,
    backgroundColor: "#f1f5f9",
  },
  benefitReady: { backgroundColor: "#f0fdf4" },
  day: {
    width: 76,
    minHeight: 98,
    padding: 12,
    gap: 7,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 14,
  },
  dayName: { color: colors.muted, fontFamily: "InterSemiBold", fontSize: 10 },
  dayNumber: { fontFamily: "JakartaBold", fontSize: 21, color: colors.navy },
  summaryBenefit: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#f0fdf4",
    padding: 12,
    borderRadius: 10,
  },
  confirmation: {
    gap: 10,
    alignItems: "center",
    padding: 20,
    backgroundColor: "#f0fdf4",
    borderRadius: 20,
  },
  reference: {
    fontFamily: "InterSemiBold",
    fontSize: 13,
    color: "#166534",
    marginTop: 5,
  },
  error: { backgroundColor: "#fff6f5", padding: 15, borderRadius: 12, gap: 10 },
});
