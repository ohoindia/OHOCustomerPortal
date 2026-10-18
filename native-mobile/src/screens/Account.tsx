import { useState } from "react";
import { Image, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import BookingQr from "../components/BookingQr";
import DateBadge from "../components/DateBadge";
import { getLocaleTag } from "../../../common/content/locale";
import {
  consultationSavings,
  savingsCurrency,
} from "../../../common/utils/savings";
import { translate } from "../lib/localization";
import {
  UI_TEXT,
  appointmentFields,
  bookingPeriods,
  customerProfileFields,
  familyMemberFields,
  packageValidityFields,
  policyFields,
  nomineeFields,
  insurerFields,
  portalServices,
} from "../../../common";
import { bookingPeriod } from "../../../common/utils/bookings";
import {
  Brand,
  Button,
  Card,
  Copy,
  Heading,
  Menu,
  Page,
  Status,
  s,
} from "../components/ui";
import { children, useData, value, type Row } from "../lib/data";
import { clearSession, getSession } from "../lib/session";
import { destination } from "../lib/navigation";
const bookingAppointment = (input: string) =>
  new Date(
    /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?$/.test(input)
      ? `${input.replace(" ", "T")}+05:30`
      : input,
  );
export function Details({
  row,
  fields,
}: {
  row: Row;
  fields: [string, string][];
}) {
  return (
    <>
      {fields.map(([key, label]) => (
        <View
          key={key}
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            gap: 16,
            paddingVertical: 8,
            borderBottomWidth: 1,
            borderColor: "#eef1f5",
          }}
        >
          <Text style={[s.copy, { flex: 1 }]}>{translate(label)}</Text>
          <Text
            style={[s.label, { flex: 1, textAlign: "right", fontSize: 12 }]}
          >
            {value(row, key) || "\u2014"}
          </Text>
        </View>
      ))}
    </>
  );
}
export function Profile() {
  const member = getSession()!.member;
  return (
    <Page title="Profile" back={false}>
      <Card>
        <Heading>{member.Name || "OHO Member"}</Heading>
        <Copy>{member.MobileNumber}</Copy>
        <Button
          title="Account details"
          onPress={() => router.push("/account-details")}
        />
      </Card>
      <Menu title="My membership" onPress={() => router.push("/membership")} />
      <Menu title="Change Language" onPress={() => router.push("/language")} />
      <Menu title="Family members" onPress={() => router.push("/family")} />
      <Menu title="Health records" onPress={() => router.push("/records")} />
      <Menu title="More services" onPress={() => router.push("/menu")} />
      <Menu title="Help & support" onPress={() => router.push("/support")} />
      <Button title="Logout" secondary onPress={() => void clearSession()} />
    </Page>
  );
}
export function MoreServices() {
  return (
    <Page title="More services">
      {portalServices.map(([title, path]) => (
        <Menu
          key={path}
          title={title}
          onPress={() => router.push(destination(path))}
        />
      ))}
    </Page>
  );
}
export function CustomerProfile() {
  const member = getSession()!.member;
  return (
    <Page title="Account details">
      <Card>
        <Details row={member} fields={customerProfileFields} />
      </Card>
    </Page>
  );
}
export function Family() {
  const id = getSession()!.member.MemberId;
  const data = useData<Row[]>(`api/Customer/GetDependentsByCustomerId/${id}`);
  return (
    <Page title="Family members">
      <Status {...data} empty={data.data?.length === 0} />
      {data.data?.map((row, i) => (
        <Card key={i}>
          <Details row={row} fields={familyMemberFields} />
        </Card>
      ))}
    </Page>
  );
}
export function Bookings() {
  return <BookingRecords />;
}
export function BookingDetails() {
  return <BookingRecords detail />;
}
function BookingRecords({ detail = false }: { detail?: boolean }) {
  const id = getSession()!.member.MemberId;
  const params = useLocalSearchParams<{ bookingId?: string }>();
  const bookingId = detail ? params.bookingId || "invalid" : undefined;
  const [period, setPeriod] = useState(bookingPeriods[0]);
  const data = useData<Row[]>(
    "api/BookingConsultation/PendingAndSuccessConsultationList",
    { customerId: id },
  );
  const rows = data.data?.filter((row) =>
    bookingId
      ? value(row, "BookingConsultationId") === bookingId
      : period === bookingPeriods[0] ||
        translate(bookingPeriod(row)) === period,
  );
  return (
    <Page
      title={bookingId ? "Booking details" : "My bookings"}
      back={Boolean(bookingId)}
    >
      {!bookingId && (
        <View
          style={{
            padding: 23,
            borderRadius: 24,
            backgroundColor: "#e7f6fb",
            borderWidth: 1,
            borderColor: "#d8edf3",
            gap: 13,
            overflow: "hidden",
          }}
        >
          <Text
            accessibilityElementsHidden
            importantForAccessibility="no"
            style={{
              position: "absolute",
              right: -15,
              top: 45,
              color: "#cae9f2",
              fontSize: 150,
              transform: [{ rotate: "-12deg" }],
            }}
          >
            +
          </Text>
          <Text
            style={{
              fontSize: 10,
              letterSpacing: 1.7,
              color: "#28738a",
              fontFamily: "InterSemiBold",
            }}
          >
            {UI_TEXT.yourCareInOnePlace}
          </Text>
          <Text
            style={{
              fontFamily: "JakartaBold",
              fontSize: 27,
              lineHeight: 35,
              color: "#142344",
            }}
          >
            {UI_TEXT.everyVisit}
            {"\n"}
            {UI_TEXT.alwaysWithinReach}
          </Text>
          <Copy>{UI_TEXT.keepTrackOfYourCareAndYourFamilyS}</Copy>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push("/hospitals")}
            style={{
              backgroundColor: "#142344",
              borderRadius: 12,
              padding: 13,
              alignSelf: "flex-start",
            }}
          >
            <Text
              style={{
                color: "white",
                fontFamily: "InterSemiBold",
                fontSize: 12,
              }}
            >
              {UI_TEXT.findAHospital} ↗
            </Text>
          </Pressable>
        </View>
      )}
      {!bookingId && (
        <View
          style={{
            flexDirection: "row",
            padding: 5,
            backgroundColor: "#eaf0f5",
            borderRadius: 14,
            gap: 3,
          }}
        >
          {bookingPeriods.map((title) => (
            <Pressable
              key={title}
              accessibilityRole="button"
              accessibilityState={{ selected: period === title }}
              onPress={() => setPeriod(title)}
              style={{
                flex: 1,
                paddingVertical: 10,
                borderRadius: 10,
                alignItems: "center",
                gap: 6,
                backgroundColor: period === title ? "#fff" : "transparent",
              }}
            >
              <Text
                style={{
                  fontSize: 11,
                  color: period === title ? "#007ca8" : "#64748b",
                  fontFamily: "InterSemiBold",
                }}
              >
                {title}
              </Text>
              <Text style={{ fontSize: 10, color: "#64748b" }}>
                {
                  (data.data ?? []).filter(
                    (row) =>
                      title === bookingPeriods[0] ||
                      translate(bookingPeriod(row)) === title,
                  ).length
                }
              </Text>
            </Pressable>
          ))}
        </View>
      )}
      <Status {...data} />
      {!!bookingId && !data.loading && !data.error && !!rows?.length && (
        <Card>
          <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
            <Ionicons name="calendar-outline" size={27} color="#0094c6" />
            <View style={{ flex: 1, gap: 5 }}>
              <Heading>Your hospital visit</Heading>
              <Copy>
                Booking #{bookingId} ·{" "}
                {value(rows[0], "StatusName") || "Awaiting update"}
              </Copy>
            </View>
          </View>
          <Copy>
            {/initiated|pending|requested/i.test(value(rows[0], "StatusName"))
              ? "Your request is with the hospital. Wait for its confirmation before your visit."
              : /cancelled|canceled|rejected|closed/i.test(
                    value(rows[0], "StatusName"),
                  )
                ? "This visit is closed. Your booking and payment records are still available."
                : "Check your visit details and show your check-in QR to the hospital team."}
          </Copy>
          <Button
            title="Refresh booking status"
            secondary
            onPress={data.retry}
          />
        </Card>
      )}
      {!bookingId && !data.loading && !data.error && (
        <View
          style={{
            padding: 16,
            backgroundColor: "#f0fdf4",
            borderWidth: 1,
            borderColor: "#bbf7d0",
            borderRadius: 14,
            gap: 8,
          }}
        >
          <Copy>Savings from these bookings, including family visits</Copy>
          <Text
            style={{
              fontSize: 20,
              color: "#166534",
              fontFamily: "JakartaBold",
            }}
          >
            {savingsCurrency(consultationSavings(rows ?? []).total)}
          </Text>
        </View>
      )}
      {!bookingId && !data.loading && !data.error && (
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            gap: 8,
          }}
        >
          <Heading>
            {period === bookingPeriods[0]
              ? UI_TEXT.allAppointments
              : `${period} ${translate("appointments")}`}
          </Heading>
          <Copy>
            {rows?.length ?? 0} {translate("bookings")}
          </Copy>
        </View>
      )}
      {!data.loading && !data.error && !rows?.length && (
        <Card>
          <Heading>
            {bookingId
              ? UI_TEXT.bookingUnavailable
              : UI_TEXT.aLittleRoomForYourNextVisit}
          </Heading>
          <Copy>
            {bookingId
              ? UI_TEXT.thisConsultationWasNotFoundInYourAccount
              : UI_TEXT.noBookingsFound}
          </Copy>
        </Card>
      )}
      {!data.loading &&
        !data.error &&
        rows?.map((row, i) => (
          <Card key={value(row, "BookingConsultationId") || i}>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                gap: 8,
              }}
            >
              <Text style={{ flex: 1, fontSize: 11, color: "#64748b" }}>
                {value(row, "ServiceName") ||
                  value(row, "PoliciesType") ||
                  UI_TEXT.hospitalConsultation}
              </Text>
              <Text
                style={{
                  fontSize: 10,
                  borderRadius: 20,
                  padding: 6,
                  backgroundColor: "#e7f6fc",
                  color: "#007ca8",
                }}
              >
                {translate(bookingPeriod(row))}
              </Text>
            </View>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 14,
                flexWrap: "wrap",
              }}
            >
              <DateBadge
                value={
                  Number.isFinite(
                    bookingAppointment(value(row, "AppointmentDate")).getTime(),
                  )
                    ? bookingAppointment(
                        value(row, "AppointmentDate"),
                      ).toISOString()
                    : ""
                }
              />
              <View style={{ flex: 1, minWidth: 100, gap: 8 }}>
                <Text
                  style={{
                    fontFamily: "JakartaBold",
                    fontSize: 16,
                    color: "#142344",
                  }}
                >
                  {value(row, "HospitalName") || UI_TEXT.hospitalAppointment}
                </Text>
                <Copy>
                  {value(row, "AppointmentDate") &&
                  Number.isFinite(
                    bookingAppointment(value(row, "AppointmentDate")).getTime(),
                  )
                    ? bookingAppointment(
                        value(row, "AppointmentDate"),
                      ).toLocaleString(getLocaleTag(), {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                        timeZone: "Asia/Kolkata",
                      }) + " IST"
                    : UI_TEXT.appointmentDateToBeConfirmed}
                </Copy>
                <Text
                  style={{
                    fontSize: 11,
                    backgroundColor: "#f1f5f9",
                    color: "#496173",
                    padding: 6,
                    borderRadius: 6,
                  }}
                >
                  {translate("Patient:")}{" "}
                  {value(row, "Name") || UI_TEXT.patientNotProvided}
                </Text>
              </View>
              <BookingQr
                booking={value(row, "BookingConsultationId")}
                value={value(row, "QRCode") || value(row, "QRCodeUrl")}
              />
            </View>
            <View
              style={{
                padding: 10,
                borderRadius: 8,
                backgroundColor: "#f0fdf4",
                flexDirection: "row",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 8,
              }}
            >
              <Text style={{ color: "#166534", fontSize: 12 }}>
                {translate("Savings from this visit")}
              </Text>
              <Text style={{ color: "#166534", fontFamily: "InterSemiBold" }}>
                {savingsCurrency(consultationSavings([row]).total)}
              </Text>
            </View>
            <View
              style={{
                borderTopWidth: 1,
                borderColor: "#edf2f6",
                paddingTop: 13,
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
              }}
            >
              <View style={{ flex: 1, gap: 5 }}>
                <Text style={{ fontSize: 9, color: "#8392a4" }}>
                  {translate("Booking #")}
                  {value(row, "BookingConsultationId")}
                </Text>
                <Copy>
                  {value(row, "StatusName") || UI_TEXT.statusNotProvided}
                </Copy>
              </View>
              {!bookingId && (
                <Pressable
                  accessibilityRole="button"
                  onPress={() =>
                    router.push(
                      `/hospitalConsulationForm?bookingId=${encodeURIComponent(value(row, "BookingConsultationId"))}`,
                    )
                  }
                >
                  <Text
                    style={{
                      fontSize: 11,
                      color: "#007ca8",
                      fontFamily: "InterSemiBold",
                      paddingVertical: 10,
                    }}
                  >
                    {UI_TEXT.viewDetails3} →
                  </Text>
                </Pressable>
              )}
            </View>
            {!!bookingId && <Details row={row} fields={appointmentFields} />}
            {!!bookingId && (
              <View
                style={{
                  backgroundColor: "#f4f8fc",
                  borderRadius: 12,
                  padding: 14,
                  gap: 8,
                }}
              >
                <Heading>At the hospital</Heading>
                <Copy>
                  Show the booking QR above to check in. To pay an additional
                  bill, scan the UPI payment QR provided by the hospital.
                </Copy>
                {!!value(row, "Reason") && (
                  <Copy>
                    {translate("Reason to visit:")} {value(row, "Reason")}
                  </Copy>
                )}
              </View>
            )}
            <Button
              title={
                /cancelled|canceled|rejected|closed/i.test(
                  value(row, "StatusName"),
                )
                  ? "View payment history"
                  : "Scan & pay hospital"
              }
              secondary
              onPress={() =>
                router.push({
                  pathname: "/booking-payment",
                  params: { bookingId: value(row, "BookingConsultationId") },
                })
              }
            />
            {!!bookingId && (
              <Copy>
                Payment results and attempts are tracked against this booking.
                Open payments to check their latest status.
              </Copy>
            )}
          </Card>
        ))}
      <Button
        title="Book a service"
        onPress={() => router.push("/hospitals")}
      />
      {!!bookingId && (
        <Button
          title="Go to My bookings"
          secondary
          onPress={() => router.replace("/bookings")}
        />
      )}
    </Page>
  );
}
export function Membership({
  nominees = false,
  policyId,
}: {
  nominees?: boolean;
  policyId?: string;
}) {
  const id = getSession()!.member.MemberId;
  const data = useData<Row[]>(`api/Customer/GetMemberProducts/${id}`);
  const products = data.data?.flatMap((row) => children(row, "Products"));
  const policies = products?.flatMap((row) => children(row, "Policies")) ?? [];
  const selectedPolicy = policies.find(
    (row) => value(row, "PoliciesId") === policyId,
  );
  const uniqueNominees = [
    ...new Map(
      policies
        .flatMap((row) => children(row, "Nominees"))
        .map((row, i) => [
          value(row, "NomineeId") ||
            `${value(row, "NomineeFullName")}:${value(row, "NomineeRelationship")}:${i}`,
          row,
        ]),
    ).values(),
  ];
  if (nominees)
    return (
      <Page title="Nominee details">
        <Status {...data} />
        {!data.loading && !data.error && !uniqueNominees.length && (
          <Copy>No nominees have been added to your policies.</Copy>
        )}
        {uniqueNominees.map((row, i) => (
          <Card key={i}>
            <Details row={row} fields={nomineeFields} />
          </Card>
        ))}
      </Page>
    );
  if (policyId)
    return (
      <Page title="Policy details">
        <Status {...data} />
        {selectedPolicy ? (
          <>
            <Card>
              <Details row={selectedPolicy} fields={policyFields} />
            </Card>
            <Heading>Insured members</Heading>
            {children(selectedPolicy, "Insurer").map((row, i) => (
              <Card key={i}>
                <Details row={row} fields={insurerFields} />
              </Card>
            ))}
            <Heading>Dependents</Heading>
            {children(selectedPolicy, "Dependents").map((row, i) => (
              <Card key={i}>
                <Copy>
                  {value(row, "DependentFullName")} ·{" "}
                  {value(row, "DependentRelationship")}
                </Copy>
                <Copy>
                  {value(row, "DependentDateofBirth")} ·{" "}
                  {value(row, "DependentGender")}
                </Copy>
              </Card>
            ))}
            <Button
              title="View nominees"
              onPress={() => router.push("/NomineeDetails")}
            />
          </>
        ) : (
          !data.loading &&
          !data.error && (
            <Copy>This policy was not found in your membership.</Copy>
          )
        )}
      </Page>
    );
  return (
    <Page title={nominees ? "Nominee details" : "My membership"}>
      <Status {...data} empty={products?.length === 0} />
      {products?.map((row, i) => (
        <Card key={i}>
          <Heading>{value(row, "ProductName") || "Membership"}</Heading>
          {!nominees && (
            <>
              <Details row={row} fields={packageValidityFields} />
              <Copy>{value(row, "ShortDescription")}</Copy>
            </>
          )}
          {children(row, "Policies")
            .filter(
              (policy) =>
                !policyId ||
                String(policy.PoliciesId ?? policy.PolicyId) === policyId,
            )
            .map((policy, index) => (
              <Card key={index}>
                {!nominees && (
                  <>
                    <Details row={policy} fields={policyFields} />
                    {!policyId && (
                      <Button
                        title="View policy"
                        secondary
                        onPress={() =>
                          router.push(
                            `/policies/${value(policy, "PoliciesId")}`,
                          )
                        }
                      />
                    )}
                  </>
                )}
                {children(policy, "Nominees").map((nominee, n) => (
                  <Details key={n} row={nominee} fields={nomineeFields} />
                ))}
                {!nominees &&
                  children(policy, "Insurer").map((insurer, n) => (
                    <Details
                      key={`insurer:${n}`}
                      row={insurer}
                      fields={insurerFields}
                    />
                  ))}
                {!nominees &&
                  children(policy, "Dependents").map((dependent, n) => (
                    <Copy key={n}>
                      {value(dependent, "DependentFullName")} ·{" "}
                      {value(dependent, "DependentRelationship")}
                    </Copy>
                  ))}
              </Card>
            ))}
        </Card>
      ))}
    </Page>
  );
}
export function About() {
  return (
    <Page title="About us">
      <Brand />
      <Image
        source={require("../../assets/hero.png")}
        style={{ width: "100%", height: 240, borderRadius: 18 }}
        resizeMode="cover"
      />
      <Copy>
        Access your family’s health benefits, memberships and hospital network
        with OHOINDIA.
      </Copy>
      <Button
        title="Contact OHO Care"
        onPress={() => router.push("/support")}
      />
    </Page>
  );
}
