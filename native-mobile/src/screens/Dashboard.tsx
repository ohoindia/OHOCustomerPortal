import { capitalizeName } from "../../../common/utils/names";
import { useCallback, useEffect, useState } from "react";
import { Linking, Pressable, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import {
  UI_TEXT,
  cardStatus,
  formatHomeDate,
  homeServices,
  serviceAccess,
  serviceAccessMessage,
  type Appointment,
} from "../../../common";
import {
  consultationSavings,
  savingsCurrency,
} from "../../../common/utils/savings";
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
import { loadHomeData } from "../lib/api";
import { getSession } from "../lib/session";
import { useData, value, type Row } from "../lib/data";
export function useDashboard() {
  const member = getSession()!.member;
  const [data, setData] = useState<Awaited<
    ReturnType<typeof loadHomeData>
  > | null>(null);
  const [appointments, setAppointments] = useState<Appointment[] | null>();
  const [attempt, setAttempt] = useState(0);
  useFocusEffect(
    useCallback(() => {
      setAttempt((n) => n + 1);
    }, []),
  );
  useEffect(() => {
    const controller = new AbortController();
    void loadHomeData(
      Number(member.MemberId),
      Number(member.CommunityCustomerId || member.communityCustomerId || 0),
      Number(member.GroupId || 0),
      controller.signal,
      setAppointments,
      member,
    ).then((result) => {
      if (!controller.signal.aborted) setData(result);
    });
    return () => controller.abort();
  }, [member, attempt]);
  return {
    data,
    appointments,
    retry: () => setAttempt((n) => n + 1),
    member: data?.customer ?? member,
  };
}
export default function Dashboard() {
  const { data, appointments, retry, member } = useDashboard();
  const pending = useData<Row[]>("api/purchases/pending");
  const [expanded, setExpanded] = useState(false);
  const [message, setMessage] = useState("");
  const access = serviceAccess(data);
  const savings = appointments ? consultationSavings(appointments) : null;
  const name = capitalizeName(member.Name || UI_TEXT.guest);
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
  const allow = (href: string) => {
    if (access === "available") router.push(href as never);
    else setMessage(serviceAccessMessage(access));
  };
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
          accessibilityLabel={UI_TEXT.viewProfile2}
          onPress={() => router.push("/profile")}
          style={{
            backgroundColor: "#e0f2fe",
            borderRadius: 24,
            width: 42,
            height: 42,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={s.label}>{initials}</Text>
        </Pressable>
      </View>
      <Heading>
        {UI_TEXT.hello}
        {name} 👋
      </Heading>
      <View
        style={{
          backgroundColor: "#007ca8",
          borderRadius: 22,
          padding: 22,
          gap: 12,
        }}
      >
        <Text style={{ color: "white", fontWeight: "700", fontSize: 19 }}>
          {UI_TEXT.familyHealthAccountVault}
        </Text>
        <Text style={{ color: "#d8f4ff", fontSize: 12 }}>
          {access === "purchase" ? UI_TEXT.packageRequired : UI_TEXT.liquidity}
        </Text>
        <Text style={{ color: "white", fontWeight: "800", fontSize: 36 }}>
          {savings
            ? savingsCurrency(savings.remaining)
            : appointments === null
              ? "Unavailable"
              : "Loading…"}
        </Text>
        <Text style={{ color: "white" }}>Remaining health benefit value</Text>
        {savings && (
          <Text style={{ color: "#d8f4ff", lineHeight: 20 }}>
            Your family has saved {savingsCurrency(savings.total)} on successful
            visits.
          </Text>
        )}
        {access === "purchase" && (
          <>
            <Text style={{ color: "white", lineHeight: 21 }}>
              {UI_TEXT.purchaseHealthBenefitsDescription}
            </Text>
            {[
              UI_TEXT.vaultBenefitOpd,
              UI_TEXT.vaultBenefitPharmacy,
              UI_TEXT.vaultBenefitCheckups,
            ].map((text) => (
              <Text key={text} style={{ color: "white" }}>
                ✓ {text}
              </Text>
            ))}
            <Copy>{UI_TEXT.vaultPackageBenefitsNote}</Copy>
            <Button
              title={UI_TEXT.choosePackage}
              secondary
              onPress={() => router.push("/packages")}
            />
          </>
        )}
        {data?.card && (
          <Text style={{ color: "white" }}>
            {cardStatus(data.card)} · {UI_TEXT.validUntil}{" "}
            {formatHomeDate(data.card.EndDate)}
          </Text>
        )}
        <Button
          title={UI_TEXT.viewAccountDetails}
          secondary
          onPress={() => router.push("/account-details")}
        />
      </View>
      {!!data?.errors.length && (
        <Card>
          <Copy>{data.errors.join("\n")}</Copy>
          <Button title={UI_TEXT.tryAgain} secondary onPress={retry} />
        </Card>
      )}
      {!!message && (
        <Card>
          <Copy>{message}</Copy>
          {access === "purchase" && (
            <Button
              title={UI_TEXT.choosePackage}
              onPress={() => router.push("/packages")}
            />
          )}
          <Button title="Dismiss" secondary onPress={() => setMessage("")} />
        </Card>
      )}
      <Heading>{UI_TEXT.quickActions}</Heading>
      <View style={{ flexDirection: "row", gap: 10 }}>
        {[
          ["Zero-Cash OPD", "medical-outline", "/hospitallist"],
          ["Scan & Pay QR", "qr-code-outline", ""],
          ["Pharmacy Subsidies", "medkit-outline", ""],
        ].map(([label, icon, href]) => (
          <Pressable
            key={label}
            accessibilityRole="button"
            accessibilityState={{ disabled: !href }}
            disabled={!href}
            onPress={() => allow(href)}
            style={{
              flex: 1,
              backgroundColor: "#e0f2fe",
              borderRadius: 16,
              padding: 12,
              alignItems: "center",
              gap: 8,
              opacity: href ? 1 : 0.45,
            }}
          >
            <Ionicons
              name={icon as "medical-outline"}
              size={30}
              color={colors.brand}
            />
            <Text
              style={{
                textAlign: "center",
                color: colors.navy,
                fontWeight: "600",
                fontSize: 12,
              }}
            >
              {label}
            </Text>
          </Pressable>
        ))}
      </View>
      {!!pending.error && <Status {...pending} />}
      {!!pending.data?.length && (
        <Card>
          <Heading>Pending Orders ({pending.data.length})</Heading>
          {(expanded ? pending.data : pending.data.slice(0, 1)).map((order) => (
            <Menu
              key={value(order, "OrdersId")}
              title={value(order, "ProductName")}
              subtitle={`Order #${value(order, "OrdersId")} · Pending · ₹${value(order, "PayableAmount")}`}
              onPress={() =>
                router.push(
                  `/purchase/${value(order, "OrdersId")}/payment` as never,
                )
              }
            />
          ))}
          {pending.data.length > 1 && (
            <Button
              title={
                expanded ? "Collapse" : `View all (${pending.data.length})`
              }
              secondary
              onPress={() => setExpanded(!expanded)}
            />
          )}
        </Card>
      )}
      <Heading>{UI_TEXT.quickServices}</Heading>
      <View style={s.grid}>
        {homeServices.map(([icon, label, href]) => (
          <Pressable
            key={label}
            disabled={!href}
            style={[s.tile, { opacity: href ? 1 : 0.45 }]}
            onPress={() => allow(href)}
          >
            <Text style={{ fontSize: 24 }}>{icon}</Text>
            <Text style={s.label}>{label}</Text>
          </Pressable>
        ))}
      </View>
      <Heading>{UI_TEXT.upcomingAppointment}</Heading>
      {data?.appointment ? (
        <Card>
          <Heading>
            {data.appointment.ServiceName ||
              data.appointment.PoliciesType ||
              UI_TEXT.hospitalAppointment}
          </Heading>
          <Copy>{data.appointment.HospitalName}</Copy>
          <Copy>
            {data.appointment.Name} ·{" "}
            {formatHomeDate(data.appointment.AppointmentDate)}
          </Copy>
          <Button
            title="View details"
            secondary
            onPress={() =>
              router.push({
                pathname: "/hospitalConsulationForm",
                params: {
                  bookingId: String(data.appointment!.BookingConsultationId),
                },
              })
            }
          />
        </Card>
      ) : (
        <Copy>
          {!data
            ? "Loading appointments…"
            : data.appointmentsLoaded
              ? "No upcoming appointments."
              : "Appointments unavailable."}
        </Copy>
      )}
      <Button
        title={UI_TEXT.viewAll}
        secondary
        onPress={() => router.push("/bookings")}
      />
      <Card>
        <Heading>
          {data?.freeProducts.length
            ? UI_TEXT.availableFreePackages
            : UI_TEXT.todaySHealthTip}
        </Heading>
        {data?.freeProducts.map((row, i) => (
          <Copy key={i}>{row.ProductName}</Copy>
        ))}
        <Copy>
          {data?.config.HealthTip || UI_TEXT.healthTipsCurrentlyUnavailable}
        </Copy>
        {!!data?.config.OHOCareMobileNumber && (
          <Button
            title={`Support ${data.config.OHOCareMobileNumber}`}
            secondary
            onPress={() =>
              void Linking.openURL(
                `tel:${data.config.OHOCareMobileNumber!.replace(/[^+\d]/g, "")}`,
              )
            }
          />
        )}
      </Card>
    </Page>
  );
}
