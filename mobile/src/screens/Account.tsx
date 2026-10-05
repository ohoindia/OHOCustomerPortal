import { useState } from "react";
import { Image, Text, View } from "react-native";
import { router } from "expo-router";
import {
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
        <View key={key} style={{ gap: 4 }}>
          <Text style={s.label}>{label}</Text>
          <Copy>{value(row, key) || "—"}</Copy>
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
  const id = getSession()!.member.MemberId;
  const [period, setPeriod] = useState("All");
  const data = useData<Row[]>(
    "api/BookingConsultation/PendingAndSuccessConsultationList",
    { customerId: id },
  );
  const rows = data.data?.filter(
    (row) => period === "All" || bookingPeriod(row) === period,
  );
  return (
    <Page title="My bookings" back={false}>
      <Copy>Your care in one place</Copy>
      <View style={s.grid}>
        {bookingPeriods.map((title) => (
          <Button
            key={title}
            title={title}
            secondary={period !== title}
            onPress={() => setPeriod(title)}
          />
        ))}
      </View>
      <Status {...data} empty={rows?.length === 0} />
      {rows?.map((row, i) => (
        <Card key={value(row, "BookingConsultationId") || i}>
          <Heading>
            {value(row, "HospitalName") || "Hospital appointment"}
          </Heading>
          <Details row={row} fields={appointmentFields} />
          <Copy>Booking #{value(row, "BookingConsultationId")}</Copy>
        </Card>
      ))}
      <Button
        title="Book a service"
        onPress={() => router.push("/hospitals")}
      />
    </Page>
  );
}
export function Membership({ nominees = false }: { nominees?: boolean }) {
  const id = getSession()!.member.MemberId;
  const data = useData<Row[]>(`api/Customer/GetMemberProducts/${id}`);
  const products = data.data?.flatMap((row) => children(row, "Products"));
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
          {children(row, "Policies").map((policy, index) => (
            <Card key={index}>
              {!nominees && <Details row={policy} fields={policyFields} />}
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
