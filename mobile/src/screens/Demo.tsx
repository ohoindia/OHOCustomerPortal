import { useState } from "react";
import { Text, View } from "react-native";
import { router } from "expo-router";
import {
  doctors,
  packages,
  labTests as tests,
  medicines,
  paymentMethods,
  sampleNotifications,
  sampleHealthRecords,
  sampleOrderTimeline,
  UI_TEXT,
} from "../../../common";
import {
  Button,
  Card,
  Copy,
  Field,
  Heading,
  Menu,
  Page,
  s,
} from "../components/ui";
export function DemoNotice() {
  return <Copy>Demo preview · sample data, matching the web client.</Copy>;
}
export function Wallet() {
  return (
    <Page title="Wallet & rewards" back={false}>
      <DemoNotice />
      <Card>
        <Copy>Total balance</Copy>
        <Heading>₹2,450</Heading>
        <View style={s.grid}>
          <Copy>Cashback · ₹850</Copy>
          <Copy>OHO Coins · 1,600</Copy>
        </View>
      </Card>
      <Copy>
        Wallet transactions and reward redemption are not connected to a payment
        service.
      </Copy>
      <Button title="Payment preview" onPress={() => router.push("/payment")} />
    </Page>
  );
}
export function Notifications() {
  return (
    <Page title="Notifications" back={false}>
      <DemoNotice />
      {sampleNotifications.map(([icon, title, copy]) => (
        <Card key={title}>
          <Heading>
            {icon} {title}
          </Heading>
          <Copy>{copy}</Copy>
        </Card>
      ))}
    </Page>
  );
}
export function Records() {
  return (
    <Page title="Health records">
      <DemoNotice />
      {sampleHealthRecords.map(([title, date]) => (
        <Card key={title}>
          <Heading>{title}</Heading>
          <Copy>{date}</Copy>
        </Card>
      ))}
    </Page>
  );
}
export function Catalog({ kind }: { kind: string }) {
  const [search, setSearch] = useState("");
  const title =
    kind === "doctors"
      ? "Doctors"
      : kind === "lab-tests"
        ? "Lab tests"
        : kind === "pharmacy"
          ? "Pharmacy"
          : "Health packages";
  const entries =
    kind === "doctors"
      ? doctors.map((row) => ({
          id: row.id,
          name: row.name,
          description: `${row.specialty} · ${row.hospital} · ${row.experience}`,
          price: row.fee,
        }))
      : kind === "lab-tests"
        ? tests.map((row) => ({ ...row, description: "Lab test" }))
        : kind === "pharmacy"
          ? medicines.map((row) => ({ ...row, description: row.pack }))
          : packages.map((row) => ({
              ...row,
              description: `${row.tests} tests · ${row.off}`,
            }));
  return (
    <Page title={title}>
      <DemoNotice />
      <Field
        label={`Search ${title.toLowerCase()}`}
        value={search}
        onChangeText={setSearch}
      />
      {entries
        .filter((row) =>
          `${row.name} ${row.description}`
            .toLowerCase()
            .includes(search.toLowerCase()),
        )
        .map((row) => (
          <Card key={row.id}>
            <Heading>{row.name}</Heading>
            <Copy>{row.description}</Copy>
            <Text style={s.label}>₹{row.price}</Text>
            <Button
              title={kind === "doctors" ? "View doctor" : "View details"}
              onPress={() =>
                router.push({
                  pathname: "/catalog-detail",
                  params: { kind, id: row.id },
                })
              }
            />
          </Card>
        ))}
    </Page>
  );
}
export function CatalogDetail({ kind, id }: { kind: string; id: string }) {
  const row =
    kind === "doctors"
      ? doctors.find((item) => item.id === Number(id))
      : kind === "lab-tests"
        ? tests.find((item) => item.id === Number(id))
        : kind === "pharmacy"
          ? medicines.find((item) => item.id === Number(id))
          : packages.find((item) => item.id === Number(id));
  return (
    <Page title="Details">
      <DemoNotice />
      {row ? (
        <Card>
          <Heading>{row.name}</Heading>
          {Object.entries(row)
            .filter(([key]) => !["id", "name", "icon", "avatar"].includes(key))
            .map(([key, item]) => (
              <Copy key={key}>
                {key}: {String(item)}
              </Copy>
            ))}
          <Button
            title="Appointment preview"
            onPress={() => router.push("/book-appointment")}
          />
        </Card>
      ) : (
        <Copy>Item not found.</Copy>
      )}
    </Page>
  );
}
export function AppointmentPreview() {
  const [date, setDate] = useState("");
  return (
    <Page title="Book appointment">
      <DemoNotice />
      <Field
        label="Preferred appointment date"
        placeholder="YYYY-MM-DD"
        value={date}
        onChangeText={setDate}
      />
      <Copy>
        This catalogue uses sample doctors. For a real consultation, book a
        service at a network hospital.
      </Copy>
      <Button
        title="Book a hospital service"
        onPress={() => router.push("/hospitals")}
      />
      <Button
        title="Preview payment"
        secondary
        onPress={() => router.push("/payment")}
      />
    </Page>
  );
}
export function Payment() {
  const [method, setMethod] = useState(0);
  return (
    <Page title="Payment">
      <DemoNotice />
      <Card>
        <Copy>Amount to pay</Copy>
        <Heading>₹800</Heading>
      </Card>
      <Heading>Payment methods</Heading>
      {paymentMethods.map((title, i) => (
        <Button
          key={title}
          title={title}
          secondary={method !== i}
          onPress={() => setMethod(i)}
        />
      ))}
      <Copy>This preview does not charge your account or scan a QR code.</Copy>
      <Button
        title="Preview order tracking"
        onPress={() => router.push("/order-tracking")}
      />
    </Page>
  );
}
export function OrderTracking() {
  return (
    <Page title={UI_TEXT.orderTracking}>
      <DemoNotice />
      {sampleOrderTimeline.map(([title, date]) => (
        <Menu key={title} title={title} subtitle={date} onPress={() => {}} />
      ))}
    </Page>
  );
}
