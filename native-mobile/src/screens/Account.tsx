import { capitalizeName } from "../../../common/utils/names";
import { useState } from "react";
import { Image, Text, View } from "react-native";
import { router } from "expo-router";
import {
  appointmentFields,
  bookingPeriods,
  customerProfileFields,
  familyMemberFields,
  dependentFields,
  packageValidityFields,
  policyFields,
  nomineeFields,
  insurerFields,
  portalServices,
  UI_TEXT,
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
  const name = capitalizeName(member.Name || UI_TEXT.myProfile);
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0])
    .join("");
  return (
    <Page back={false}>
      <View
        style={{
          flexDirection: "row",
          gap: 16,
          alignItems: "center",
          paddingVertical: 20,
        }}
      >
        <View
          style={{
            width: 64,
            height: 64,
            borderRadius: 32,
            backgroundColor: "#e0f2fe",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ fontSize: 24, color: "#007ca8", fontWeight: "700" }}>
            {initials}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Heading>{name}</Heading>
          <Copy>{member.MobileNumber || UI_TEXT.mobileNumberNotProvided}</Copy>
        </View>
        <Button
          title="⚙"
          secondary
          onPress={() => router.push("/account-management")}
        />
      </View>
      {Number(member.MemberId) > 0 && (
        <ProfileFamily id={Number(member.MemberId)} />
      )}
      <Menu title="Change Language" onPress={() => router.push("/language")} />
      <Menu
        title={UI_TEXT.myFamily}
        subtitle={UI_TEXT.manageFamilyMembers}
        onPress={() => router.push("/family")}
      />
      <Menu
        title={UI_TEXT.membership}
        subtitle={UI_TEXT.goldWellnessCard}
        onPress={() => router.push("/account-details")}
      />
      <Menu
        title={UI_TEXT.walletRewards}
        subtitle={UI_TEXT.cashbackOffersCoupons}
        onPress={() => router.push("/wallet")}
      />
      <Menu
        title={UI_TEXT.logout}
        subtitle={UI_TEXT.signOutOfYourAccount}
        onPress={() => void clearSession()}
      />
    </Page>
  );
}
function ProfileFamily({ id }: { id: number }) {
  const data = useData<Row[]>("api/Customer/GetDependentsByCustomerId/" + id);
  return (
    <>
      <Heading>{UI_TEXT.familyDetails}</Heading>
      <Status {...data} />
      {data.data?.map((row, i) => (
        <Card key={i}>
          <Heading>{value(row, "Name") || UI_TEXT.nameNotProvided}</Heading>
          <Copy>{value(row, "Relationship") || UI_TEXT.familyMember}</Copy>
          <Copy>
            {value(row, "Gender")} · {value(row, "DateofBirth").split("T")[0]}
          </Copy>
        </Card>
      ))}
      {!data.loading && !data.error && !data.data?.length && (
        <Copy>{UI_TEXT.noFamilyMembersHaveBeenAdded}</Copy>
      )}
    </>
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
  if (policyId) {
    const policy = policies.find(
      (row) => value(row, "PoliciesId") === policyId,
    );
    return (
      <Page title={UI_TEXT.policyDetails}>
        <Status {...data} />
        {policy ? (
          <>
            <Details row={policy} fields={policyFields} />
            <Heading>{UI_TEXT.insuredMembers}</Heading>
            {children(policy, "Insurer").map((row, i) => (
              <Card key={i}>
                <Details row={row} fields={insurerFields} />
              </Card>
            ))}
            <Heading>{UI_TEXT.dependents}</Heading>
            {children(policy, "Dependents").map((row, i) => (
              <Card key={i}>
                <Details row={row} fields={dependentFields} />
              </Card>
            ))}
            <Button
              title={UI_TEXT.viewNominees}
              onPress={() => router.push("/NomineeDetails")}
            />
          </>
        ) : (
          !data.loading &&
          !data.error && (
            <Copy>{UI_TEXT.thisPolicyWasNotFoundInYourMembership}</Copy>
          )
        )}
      </Page>
    );
  }
  if (nominees) {
    const unique = [
      ...new Map(
        policies
          .flatMap((row) => children(row, "Nominees"))
          .map((row) => [value(row, "NomineeId"), row]),
      ).values(),
    ];
    return (
      <Page title={UI_TEXT.nomineeDetails}>
        <Status {...data} empty={!unique.length} />
        {unique.map((row, i) => (
          <Card key={i}>
            <Details row={row} fields={nomineeFields} />
          </Card>
        ))}
      </Page>
    );
  }
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
              {!nominees && (
                <>
                  <Details row={policy} fields={policyFields} />
                  <Button
                    title={UI_TEXT.viewDetails3}
                    secondary
                    onPress={() =>
                      router.push(
                        `/policies/${value(policy, "PoliciesId")}` as never,
                      )
                    }
                  />
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
