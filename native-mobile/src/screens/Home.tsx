import { useCallback, useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  cardStatus,
  expiryStatus,
  serviceAccess,
  serviceAccessMessage,
  formatHomeDate,
  membershipAttentionStatuses,
  renewalStatuses,
  UI_TEXT,
  UI_MESSAGES,
  type Appointment,
} from "../../../common";
import { capitalizeName } from "../../../common/utils/names";
import {
  Brand,
  Button,
  Card,
  Copy,
  Heading,
  Menu,
  Page,
  Status,
  colors,
  s,
} from "../components/ui";
import HealthBalanceCard from "../components/HealthBalanceCard";
import BookingQr from "../components/BookingQr";
import { loadHomeData } from "../lib/api";
import { getSession } from "../lib/session";
import { useData, value, type Row } from "../lib/data";
import { money } from "../lib/purchase";
import { translate } from "../lib/localization";
type Dashboard = Awaited<ReturnType<typeof loadHomeData>>;
export default function Home() {
  const member = getSession()!.member;
  const [data, setData] = useState<Dashboard | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [serviceMessage, setServiceMessage] = useState("");
  const [notices, setNotices] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const pending = useData<Row[]>("api/purchases/pending");
  const history = useData<Row[]>(
    "api/BookingConsultation/PendingAndSuccessConsultationList",
    { customerId: member.MemberId },
  );
  const wallet = useData<Row[]>("api/BookingConsultation/walletOpds", {
    customerId: member.MemberId,
  });
  useFocusEffect(
    useCallback(() => {
      setAttempt((n) => n + 1);
    }, []),
  );
  useEffect(() => {
    const controller = new AbortController();
    void loadHomeData(
      member.MemberId,
      Number(member.CommunityCustomerId || member.communityCustomerId || 0),
      Number(member.GroupId || 0),
      controller.signal,
      undefined,
      member,
    ).then((result) => {
      if (!controller.signal.aborted) setData(result);
    });
    return () => controller.abort();
  }, [member, attempt]);
  const access = serviceAccess(data);
  const name = capitalizeName(
    data?.customer?.Name || member.Name || "OHO Member",
  );
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("");
  const card = data?.card;
  const messages = data
    ? [
        ...(data.errors ?? []),
        !data.customer?.DateofBirth || !data.customer.Gender
          ? UI_TEXT.completeYourDateOfBirthAgeAndGenderIn
          : "",
        data.address === false ? UI_TEXT.addYourAddressInProfile : "",
        data.kyc === false
          ? UI_TEXT.kycIncompleteCompleteAadhaarPanAndFaceVerificationIn
          : "",
        card && membershipAttentionStatuses.includes(cardStatus(card))
          ? UI_MESSAGES.yourMembershipCardIs(
              cardStatus(card),
              UI_TEXT.reviewRenewalOptionsInPackages,
            )
          : "",
        ...(data.products ?? [])
          .filter((product) =>
            renewalStatuses.includes(expiryStatus(product.ValidTill)),
          )
          .map(
            (product) =>
              `${product.ProductName}: ${expiryStatus(product.ValidTill)}`,
          ),
      ].filter(Boolean)
    : [];
  function allowService() {
    if (access === "available") return true;
    setServiceMessage(serviceAccessMessage(access));
    return false;
  }
  const appointment = data?.appointment;
  return (
    <Page back={false}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Brand />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="View profile"
          onPress={() => router.push("/profile")}
          style={{
            width: 42,
            height: 42,
            borderRadius: 21,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#e0f2fe",
          }}
        >
          <Text style={[s.label, { color: colors.brand }]}>{initials}</Text>
        </Pressable>
      </View>
      <Heading>
        {UI_TEXT.hello}
        {name} 👋
      </Heading>
      <Status
        loading={wallet.loading || history.loading}
        error={wallet.error || history.error}
        retry={() => {
          wallet.retry();
          history.retry();
        }}
      />
      {!wallet.loading &&
        !history.loading &&
        !wallet.error &&
        !history.error && (
          <HealthBalanceCard
            summary={wallet.data?.[0]}
            rows={history.data ?? []}
          />
        )}
      {notices && messages.length > 0 && (
        <Card>
          <Heading>Needs your attention</Heading>
          {messages.map((message, i) => (
            <Copy key={i}>• {message}</Copy>
          ))}
          <Button
            title="Review profile"
            secondary
            onPress={() => router.push("/profile")}
          />
          <Button
            title="View packages"
            secondary
            onPress={() => router.push("/packages")}
          />
          <Button title="Dismiss" secondary onPress={() => setNotices(false)} />
        </Card>
      )}
      {serviceMessage && (
        <Card>
          <Copy>{serviceMessage}</Copy>
          {access === "purchase" && (
            <Button
              title="Purchase a package"
              onPress={() => router.push("/packages")}
            />
          )}
          <Button
            title="Dismiss"
            secondary
            onPress={() => setServiceMessage("")}
          />
        </Card>
      )}
      <Heading>Quick actions</Heading>
      <View style={{ flexDirection: "row", gap: 10 }}>
        {(
          [
            ["medkit-outline", "Zero-Cash OPD", false, "/hospitallist"],
            ["qr-code-outline", "Scan & Pay QR", true, "/payment"],
            ["medical-outline", "Pharmacy Subsidies", true, "/pharmacy"],
          ] as const
        ).map(([icon, label, disabled, path]) => (
          <Pressable
            key={label}
            accessibilityRole="button"
            accessibilityState={{ disabled }}
            disabled={disabled}
            onPress={() => {
              if (allowService()) router.push(path);
            }}
            style={{
              flex: 1,
              borderRadius: 18,
              padding: 14,
              gap: 12,
              backgroundColor: "#fff",
              borderWidth: 1,
              borderColor: colors.line,
              opacity: disabled ? 0.45 : 1,
              alignItems: "center",
            }}
          >
            <Ionicons name={icon} size={28} color={colors.brand} />
            <Text
              style={{
                fontSize: 12,
                color: colors.navy,
                fontWeight: "600",
                textAlign: "center",
              }}
            >
              {translate(label)}
            </Text>
          </Pressable>
        ))}
      </View>
      {pending.error && <Status {...pending} />}
      {!!pending.data?.length && (
        <Card>
          <Heading>Pending Orders</Heading>
          {(expanded ? pending.data : pending.data.slice(0, 1)).map(
            (order, i) => (
              <View key={i} style={{ gap: 8 }}>
                <Heading>
                  {value(order, "ProductName") || "Package purchase"}
                </Heading>
                <Copy>
                  Order #{value(order, "OrdersId")} · {value(order, "FullName")}{" "}
                  · Pending
                </Copy>
                <Heading>{money(order.PayableAmount)}</Heading>
                <Button
                  title="Continue purchase →"
                  onPress={() =>
                    router.push(`/purchase/${value(order, "OrdersId")}/payment`)
                  }
                />
              </View>
            ),
          )}
          {pending.data.length > 1 && (
            <Button
              title={
                expanded ? "Collapse" : `View all (${pending.data.length})`
              }
              secondary
              onPress={() => setExpanded((v) => !v)}
            />
          )}
        </Card>
      )}
      <Heading>Quick services</Heading>
      <View style={s.grid}>
        {(
          [
            ["business-outline", "Hospitals", "/hospitals"],
            ["flask-outline", "Lab tests", "/lab-tests"],
            ["medical-outline", "Pharmacy", "/pharmacy"],
            ["shield-checkmark-outline", "Health checkups", "/packages"],
          ] as const
        ).map(([icon, label, path]) => (
          <Pressable
            key={path}
            accessibilityRole="button"
            onPress={() => {
              if (path === "/packages" || allowService()) router.push(path);
            }}
            style={[s.tile, { backgroundColor: "#fff", alignItems: "center" }]}
          >
            <Ionicons name={icon} color={colors.brand} size={30} />
            <Text style={s.label}>{translate(label)}</Text>
          </Pressable>
        ))}
      </View>
      <Menu
        title="Packages"
        subtitle="Explore health benefits for your family"
        onPress={() => router.push("/packages")}
      />
      <Heading>Upcoming appointment</Heading>
      {appointment ? (
        <AppointmentCard appointment={appointment} />
      ) : (
        <Copy>
          {!data
            ? "Loading appointments…"
            : !data.appointmentsLoaded
              ? "Appointments unavailable."
              : "No upcoming appointments."}
        </Copy>
      )}
      <Button
        title="View all bookings"
        secondary
        onPress={() => router.push("/bookings")}
      />
      <Card>
        <Heading>
          {data?.freeProducts?.length
            ? "Available free packages"
            : "Today’s health tip"}
        </Heading>
        {data?.freeProducts?.map((product, i) => (
          <Copy key={i}>
            {product.ProductName} ·{" "}
            {UI_MESSAGES.adultCount(product.MaximumAdult ?? 0)} ·{" "}
            {UI_MESSAGES.childCount(product.MaximumChild ?? 0)}
          </Copy>
        ))}
        <Copy>
          {data?.config.HealthTip ||
            "Explore wellness tools and keep track of your daily health goals."}
        </Copy>
        <Button
          title="More services"
          secondary
          onPress={() => router.push("/menu")}
        />
      </Card>
    </Page>
  );
}
function AppointmentCard({ appointment }: { appointment: Appointment }) {
  return (
    <Card>
      <Copy>
        {appointment.ServiceName ||
          appointment.PoliciesType ||
          "Hospital appointment"}{" "}
        · {appointment.StatusName}
      </Copy>
      <Heading>{appointment.HospitalName}</Heading>
      <Copy>
        {formatHomeDate(appointment.AppointmentDate)} · {appointment.Name}
      </Copy>
      <BookingQr
        value={appointment.QRCode || appointment.QRCodeUrl || ""}
        booking={String(appointment.BookingConsultationId)}
      />
      <Button
        title="View details"
        secondary
        onPress={() =>
          router.push(
            `/hospitalConsulationForm?bookingId=${appointment.BookingConsultationId}`,
          )
        }
      />
    </Card>
  );
}
