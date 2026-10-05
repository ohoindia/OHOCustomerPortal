import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import {
  bookableCardStatuses,
  cardStatus,
  type MemberCard,
  UI_TEXT,
} from "../../../common";
import {
  Button,
  Card,
  Copy,
  Field,
  Heading,
  Page,
  Status,
  s,
} from "../components/ui";
import { api } from "../lib/api";
import { getSession } from "../lib/session";
import { value, type Row } from "../lib/data";
import { indiaAppointment } from "../lib/validation";
type Options = {
  hospital: Row;
  patients: Row[];
  services: Row[];
  policy: Row | undefined;
  card: MemberCard | undefined;
};
export default function BookService() {
  const { hospitalId: param } = useLocalSearchParams<{ hospitalId: string }>();
  const hospitalId = Number(param);
  const customerId = getSession()!.member.MemberId;
  return (
    <Page title="Book service">
      {!(customerId > 0) ? (
        <Copy>
          An individual customer membership is required to book this service.
        </Copy>
      ) : !(Number.isSafeInteger(hospitalId) && hospitalId > 0) ? (
        <Button
          title="Choose hospital"
          onPress={() => router.push("/hospitals")}
        />
      ) : (
        <ServiceForm
          key={`${customerId}:${hospitalId}`}
          customerId={customerId}
          hospitalId={hospitalId}
        />
      )}
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
  const [patientId, setPatientId] = useState(customerId);
  const [coupon, setCoupon] = useState<{
    patientId: number;
    count: number;
    message: string;
  } | null>(null);
  const [couponAttempt, setCouponAttempt] = useState(0);
  const [serviceId, setServiceId] = useState(0);
  const [date, setDate] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [bookingError, setBookingError] = useState("");
  const dependentCustomerId = patientId === customerId ? null : patientId;
  useEffect(() => {
    const controller = new AbortController();
    const options = { signal: controller.signal };
    void Promise.all([
      api<Row[]>(`api/Hospital/GetById/${hospitalId}`, options),
      api<Row[]>(
        `api/HospitalPoliciesProvision/GetByHospitalId/${hospitalId}`,
        options,
      ),
      Promise.resolve(getSession() ? [getSession()!.member] : []),
      api<Row[]>(
        `api/Customer/GetDependentsByCustomerId/${customerId}`,
        options,
      ),
      api<{ returnData: MemberCard[] }>(
        `api/OHOCards/GetMemberCardByMemberId/${customerId}`,
        options,
      ),
      api<Row[]>("api/HospitalServices/all", {
        ...options,
        body: { skip: 0, take: 0 },
      }),
    ])
      .then(([hospitals, policies, members, dependents, cards, services]) => {
        if (!hospitals[0] || !members[0])
          throw new Error("Hospital or customer details could not be found.");
        if (!controller.signal.aborted)
          setData({
            hospital: hospitals[0],
            patients: [members[0], ...dependents],
            services,
            policy: policies.find(
              (row) => row.PoliciesType === UI_TEXT.freeConsultation,
            ),
            card: cards.returnData.find((card) =>
              bookableCardStatuses.includes(cardStatus(card)),
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
    if (!data?.card || !data.policy) return;
    const controller = new AbortController();
    void api<{ availableCoupons: number; message?: string }>(
      "api/BookingConsultation/checkIndividualCoupons",
      {
        signal: controller.signal,
        body: { customerId, hospitalId, dependentCustomerId },
      },
    )
      .then((result) => {
        if (!Number.isFinite(result.availableCoupons))
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
  async function book() {
    if (
      busy ||
      coupon?.patientId !== patientId ||
      !coupon.count ||
      !data?.policy
    )
      return;
    setBookingError("");
    // The text field explicitly represents India time, independent of device timezone.
    const appointment = indiaAppointment(date);
    if (
      !appointment ||
      !Number.isFinite(appointment.getTime()) ||
      appointment.getTime() <= Date.now()
    ) {
      setBookingError(
        "Select a future appointment date and time in YYYY-MM-DD HH:mm format.",
      );
      return;
    }
    if (
      !data.services.some((row) => Number(row.HospitalServicesId) === serviceId)
    ) {
      setBookingError("Please select a service type.");
      return;
    }
    setBusy(true);
    try {
      const result = await api<{
        status: boolean;
        message?: string;
        data?: { BookingConsultationId: number };
      }>("api/BookingConsultation/bookAppointment/add", {
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
      if (!result.status || !result.data?.BookingConsultationId)
        throw new Error(result.message || "Unable to initiate the booking.");
      router.replace("/bookings");
    } catch (e) {
      setBookingError(
        e instanceof Error ? e.message : "Unable to book. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  if (!data)
    return (
      <Status
        loading={!error}
        error={error}
        retry={() => {
          setError("");
          setAttempt((n) => n + 1);
        }}
      />
    );
  return (
    <>
      <Heading>{value(data.hospital, "HospitalName")}</Heading>
      <Card>
        <Heading>Zero-Cash OPD</Heading>
        <Copy>
          Use an available free consultation coupon for yourself or a family
          member.
        </Copy>
      </Card>
      {!data.card ? (
        <>
          <Copy>An active, unexpired membership card is required to book.</Copy>
          <Button
            title="View membership"
            onPress={() => router.push("/membership")}
          />
        </>
      ) : !data.policy ? (
        <>
          <Copy>Free consultation is not available at this hospital.</Copy>
          <Button
            title="Choose another hospital"
            onPress={() => router.push("/hospitals")}
          />
        </>
      ) : (
        <>
          <Heading>Select patient</Heading>
          <View style={s.grid}>
            {data.patients.map((patient, i) => {
              const id = Number(patient.CustomerId || patient.MemberId);
              return (
                <Button
                  key={id || i}
                  title={`${value(patient, "Name")}${id === customerId ? " (Self)" : ""}`}
                  secondary={id !== patientId}
                  disabled={busy}
                  onPress={() => {
                    setPatientId(id);
                    setBookingError("");
                  }}
                />
              );
            })}
          </View>
          <Copy>
            {coupon?.patientId !== patientId
              ? "Checking free consultation coupons…"
              : coupon.count > 0
                ? `${coupon.count} free consultation coupon(s) available`
                : coupon.message || "No coupons available for this patient."}
          </Copy>
          {coupon?.patientId === patientId && !coupon.count && (
            <Button
              title="Check again"
              secondary
              disabled={busy}
              onPress={() => {
                setCoupon(null);
                setCouponAttempt((n) => n + 1);
              }}
            />
          )}
          <Field
            label="Appointment date & time (India time)"
            placeholder="YYYY-MM-DD HH:mm"
            value={date}
            onChangeText={setDate}
            editable={!busy}
          />
          <Field
            label="Reason to visit (optional)"
            placeholder="Enter reason to visit"
            value={reason}
            onChangeText={setReason}
            multiline
            maxLength={1000}
            editable={!busy}
          />
          <Heading>Service type</Heading>
          {data.services.map((service, i) => (
            <Button
              key={value(service, "HospitalServicesId") || i}
              title={value(service, "ServiceName")}
              secondary={Number(service.HospitalServicesId) !== serviceId}
              disabled={busy}
              onPress={() => setServiceId(Number(service.HospitalServicesId))}
            />
          ))}
          {!data.services.length && (
            <Copy>
              No service types are currently available. Contact support.
            </Copy>
          )}
          {!!bookingError && (
            <Text accessibilityRole="alert" style={s.error}>
              {bookingError}
            </Text>
          )}
          <Button
            title={busy ? "Initiating booking…" : "Book free consultation"}
            disabled={
              busy ||
              coupon?.patientId !== patientId ||
              !(coupon.count > 0) ||
              !data.services.length
            }
            onPress={() => void book()}
          />
          <Copy>
            Your booking will be initiated for the hospital to review.
          </Copy>
        </>
      )}
      <Button
        title="Contact support"
        secondary
        onPress={() => router.push("/support")}
      />
    </>
  );
}
