import { useEffect, useState } from "react";
import { Linking, Text } from "react-native";
import { router } from "expo-router";
import {
  APP_LINKS,
  hospitalFields,
  productFields,
  createCustomerController,
} from "../../../common";
import { Button, Card, Copy, Heading, Page, Status, s } from "../components/ui";
import { Details } from "./Account";
import { api } from "../lib/api";
import { getSession } from "../lib/session";
import { useData, value, type Row } from "../lib/data";
export function Products({ id }: { id?: string }) {
  const data = useData<Row[]>(
    id ? `api/Products/GetById/${Number(id)}` : "api/Products/all",
    id ? undefined : { skip: 0, take: 1000 },
  );
  return (
    <Page title={id ? "Product details" : "Health products"}>
      <Status {...data} empty={data.data?.length === 0} />
      {data.data?.map((row, i) => (
        <Card key={i}>
          <Heading>{value(row, "ProductName")}</Heading>
          <Copy>{value(row, "ShortDescription")}</Copy>
          <Details row={row} fields={productFields} />
          {!id && (
            <Button
              title="View details"
              onPress={() =>
                router.push({
                  pathname: "/product-details",
                  params: { id: value(row, "ProductsId") },
                })
              }
            />
          )}
        </Card>
      ))}
    </Page>
  );
}
export function HospitalDetails({ id }: { id: string }) {
  const data = useData<Row[]>(`api/Hospital/GetById/${Number(id)}`);
  const benefits = useData<Row[]>(
    `api/HospitalPoliciesProvision/GetByHospitalId/${Number(id)}`,
  );
  return (
    <Page title="Hospital details">
      <Status {...data} />
      {data.data?.map((row, i) => (
        <Card key={i}>
          <Heading>{value(row, "HospitalName")}</Heading>
          <Details row={row} fields={hospitalFields} />
        </Card>
      ))}
      <Heading>Hospital benefits</Heading>
      <Status {...benefits} empty={benefits.data?.length === 0} />
      {benefits.data?.map((row, i) => (
        <Card key={i}>
          <Heading>{value(row, "PoliciesType")}</Heading>
          <Copy>{value(row, "Description") || value(row, "PoliciesName")}</Copy>
        </Card>
      ))}
      <Button
        title="Book service"
        onPress={() =>
          router.push({ pathname: "/book-service", params: { hospitalId: id } })
        }
      />
    </Page>
  );
}
export function Support() {
  const data = useData<Row[]>("api/ConfigValues/all", { skip: 0, take: 0 });
  const phone = value(
    data.data?.find((row) => row.ConfigKey === "OHOCareMobileNumber"),
    "ConfigValue",
  );
  return (
    <Page title="Help & support">
      <Copy>
        Contact OHO Care for help with membership, bookings or benefits.
      </Copy>
      <Status {...data} />
      {phone ? (
        <Button
          title={`Call OHO Care · ${phone}`}
          onPress={() =>
            void Linking.openURL(`tel:${phone.replace(/[^+\d]/g, "")}`)
          }
        />
      ) : (
        !data.loading &&
        !data.error && <Copy>Support contact is currently unavailable.</Copy>
      )}
    </Page>
  );
}
export function Privacy() {
  return (
    <Page title="Privacy policy & terms">
      <Copy>Read OHOINDIA’s privacy policy and terms of service.</Copy>
      <Button
        title="Read privacy policy"
        secondary
        onPress={() => void Linking.openURL(APP_LINKS.privacyPolicy)}
      />
      <Button
        title="Read terms & conditions"
        secondary
        onPress={() => void Linking.openURL(APP_LINKS.termsAndConditions)}
      />
    </Page>
  );
}
export function Kyc() {
  const member = getSession()!.member;
  const [status, setStatus] = useState<{
    address: boolean;
    pan: boolean;
    aadhaar: boolean;
    face: boolean;
  } | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    const customer = createCustomerController(api);
    void customer
      .fetchMember(member.MemberId, controller.signal)
      .then(async (rows) => {
        const row = rows[0];
        if (!row) throw new Error("Profile not found.");
        const [address, pan, aadhaar] = await Promise.all([
          customer.fetchAddressStatus(member.MemberId, controller.signal),
          customer.fetchPANStatus(member.MemberId, controller.signal),
          row.AadhaarNumber
            ? customer.fetchKYCStatus(
                member.MemberId,
                String(row.AadhaarNumber),
                controller.signal,
              )
            : Promise.resolve({ status: false }),
        ]);
        if (!controller.signal.aborted)
          setStatus({
            address: address.status,
            pan: pan.status,
            aadhaar: aadhaar.status,
            face: Boolean(row.FaceIdentityImage),
          });
      })
      .catch((e: unknown) => {
        if (!controller.signal.aborted)
          setError(e instanceof Error ? e.message : "Unable to verify status.");
      });
    return () => controller.abort();
  }, [member.MemberId, attempt]);
  return (
    <Page title="KYC verification">
      <Status
        loading={!status && !error}
        error={error}
        retry={() => {
          setStatus(null);
          setError("");
          setAttempt((n) => n + 1);
        }}
      />
      {status &&
        Object.entries(status).map(([key, verified]) => (
          <Card key={key}>
            <Heading>{key.toUpperCase()}</Heading>
            <Text style={verified ? s.copy : s.error}>
              {verified ? "Verified" : "Incomplete"}
            </Text>
          </Card>
        ))}
      <Button title="Contact support" onPress={() => router.push("/support")} />
    </Page>
  );
}
