import { useCallback, useEffect, useState } from "react";
import { Image, Pressable, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import {
  cardStatus,
  serviceAccess,
  serviceAccessMessage,
  formatHomeDate,
  membershipState,
  UI_TEXT,
} from "../../../common";
import {
  Brand,
  Button,
  Card,
  Copy,
  Heading,
  Menu,
  Page,
  s,
  colors,
} from "../components/ui";
import { loadHomeData } from "../lib/api";
import { getSession } from "../lib/session";
type Dashboard = Awaited<ReturnType<typeof loadHomeData>>;
export default function Home() {
  const member = getSession()!.member;
  const [data, setData] = useState<Dashboard | null>(null);
  const [attempt, setAttempt] = useState(0);
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
  const [serviceMessage, setServiceMessage] = useState("");
  const access = serviceAccess(data);
  function allowService() {
    if (access === "available") return true;
    setServiceMessage(serviceAccessMessage(access));
    return false;
  }
  return (
    <Page back={false}>
      <Brand />
      <View>
        <Copy>Welcome back,</Copy>
        <Heading>{data?.customer?.Name || member.Name || "OHO Member"}</Heading>
      </View>
      <Card>
        <Text style={[s.label, { color: colors.brand }]}>
          YOUR HEALTH MEMBERSHIP
        </Text>
        <Heading>{UI_TEXT.value37000}</Heading>
        <Copy>{UI_TEXT.healthBenefitValue}</Copy>
        <Copy>
          {access === "available"
            ? UI_TEXT.activeHealthBenefitsDescription
            : UI_TEXT.purchaseHealthBenefitsDescription}
        </Copy>
        <Copy>{UI_TEXT.vaultBenefitOpd}</Copy>
        <Copy>{UI_TEXT.vaultBenefitPharmacy}</Copy>
        <Copy>{UI_TEXT.vaultBenefitCheckups}</Copy>
        <Text style={s.label}>{UI_TEXT.vaultPackageBenefitsNote}</Text>
        <Heading>{membershipState(data)}</Heading>
        <Copy>
          {data?.card
            ? `${data.card.OHOCardnumber} · ${cardStatus(data.card)}`
            : "Access your family’s health benefits and hospital network."}
        </Copy>
        {data?.card && (
          <Image
            source={require("../../assets/oho-card-front.jpg")}
            style={{ width: "100%", height: 170, borderRadius: 12 }}
            resizeMode="contain"
          />
        )}
        {data?.card && (
          <View style={{ flexDirection: "row", gap: 24 }}>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={s.label}>{UI_TEXT.validFrom}</Text>
              <Text style={[s.copy, { fontWeight: "700" }]}>
                {formatHomeDate(data.card.StartDate) || UI_TEXT.notProvided}
              </Text>
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={s.label}>{UI_TEXT.validUntil}</Text>
              <Text style={[s.copy, { fontWeight: "700" }]}>
                {formatHomeDate(data.card.EndDate) || UI_TEXT.notProvided}
              </Text>
            </View>
          </View>
        )}
        {access === "purchase" && (
          <>
            <Button
              title={UI_TEXT.choosePackage}
              onPress={() => router.push("/packages")}
            />
          </>
        )}
        <Button
          title="View membership"
          onPress={() => router.push("/membership")}
        />
      </Card>
      {!!data?.errors.length && (
        <Card>
          {data.errors.map((error) => (
            <Text key={error} style={s.error}>
              {error}
            </Text>
          ))}
          <Button
            title="Refresh dashboard"
            secondary
            onPress={() => {
              setData(null);
              setAttempt((n) => n + 1);
            }}
          />
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
      <Heading>{UI_TEXT.quickActions}</Heading>
      <Menu
        title="Zero-Cash OPD"
        subtitle="Use your free consultation benefits"
        onPress={() => {
          if (allowService()) router.push("/hospitals");
        }}
      />
      <View style={s.grid}>
        <Pressable
          style={s.tile}
          onPress={() => {
            if (allowService()) router.push("/payment");
          }}
        >
          <Text style={s.label}>Scan & Pay QR</Text>
        </Pressable>
        <Pressable
          style={s.tile}
          onPress={() => {
            if (allowService()) router.push("/pharmacy");
          }}
        >
          <Text style={s.label}>Pharmacy Subsidies</Text>
        </Pressable>
      </View>
      <Menu
        title={UI_TEXT.packages}
        subtitle="Explore health packages and purchase for your family"
        onPress={() => router.push("/packages")}
      />
      <Card>
        <Heading>Your next appointment</Heading>
        <Copy>
          {!data
            ? "Loading appointments…"
            : !data.appointmentsLoaded
              ? "Appointments unavailable."
              : data.appointment
                ? `${data.appointment.HospitalName} · ${data.appointment.AppointmentDate}`
                : "No upcoming appointments."}
        </Copy>
        <Button
          title="View my bookings"
          secondary
          onPress={() => router.push("/bookings")}
        />
      </Card>
      <Card>
        <Heading>Health tip</Heading>
        <Copy>
          {data?.config.HealthTip ||
            "Explore wellness tools and keep track of your daily health goals."}
        </Copy>
        <Button
          title="More services"
          secondary
          onPress={() => {
            if (allowService()) router.push("/menu");
          }}
        />
      </Card>
    </Page>
  );
}
