import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, Image, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import {
  allNomineesAdded,
  firstPurchaseStep,
  packageAmount,
  purchaseRoute,
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
import { Choice } from "../components/Choice";
import { api } from "../lib/api";
import { getSession } from "../lib/session";
import { useData, children, value, type Row } from "../lib/data";
import { useResource } from "../lib/resource";
import {
  blankPerson,
  money,
  personError,
  plainText,
  relationships,
  type Person,
} from "../lib/purchase";
import { openExternal } from "../lib/links";
type Product = Row & { InsurancePremiums: Row[]; includedProducts: Row[] };
type Snapshot = {
  order: Row;
  product: Product;
  family: Row[];
  nominees: Row[];
  nomineeProducts: Row[];
  paymentMethods: Row[];
};
type PaymentLink = {
  mode: "link" | "qr";
  qrCode?: string;
  linkId: string;
  url: string;
  expiresAt: string;
  status: string;
};
type PaymentStatus = { status: string; completed: boolean; link?: PaymentLink };
function ErrorMessage({ error }: { error: string }) {
  return error ? (
    <Text accessibilityRole="alert" style={s.error}>
      {error}
    </Text>
  ) : null;
}
function PersonFields({
  person,
  setPerson,
  primary = false,
  spouse = false,
  busy = false,
}: {
  person: Person;
  setPerson: (value: Person) => void;
  primary?: boolean;
  spouse?: boolean;
  busy?: boolean;
}) {
  const update = (key: keyof Person, next: string) =>
    setPerson({ ...person, [key]: next });
  return (
    <>
      <Field
        label="Full name"
        value={person.fullName}
        maxLength={100}
        editable={!busy}
        onChangeText={(v) => update("fullName", v)}
      />
      <Field
        label="Date of birth"
        placeholder="YYYY-MM-DD"
        value={person.dateofBirth}
        maxLength={10}
        editable={!busy}
        onChangeText={(v) => update("dateofBirth", v)}
      />
      <Choice
        label="Gender"
        options={["Male", "Female", "Other"]}
        selected={person.gender}
        disabled={busy}
        onSelect={(v) => update("gender", v)}
      />
      {!primary && (
        <Choice
          label="Relationship"
          options={spouse ? ["Spouse"] : relationships}
          selected={spouse ? "Spouse" : person.relationship}
          disabled={busy || spouse}
          onSelect={(v) => update("relationship", v)}
        />
      )}
      <Field
        label={primary ? "Mobile number" : "Mobile number (optional)"}
        value={person.mobileNumber}
        editable={!primary && !busy}
        keyboardType="phone-pad"
        maxLength={10}
        onChangeText={(v) => update("mobileNumber", v.replace(/\D/g, ""))}
      />
    </>
  );
}
export function PackageDetails({ productId }: { productId: string }) {
  return <ProductDetailsRoute productId={productId} />;
}
export function ProductDetailsRoute({
  productId: supplied,
}: { productId?: string } = {}) {
  const params = useLocalSearchParams<{
    productId?: string;
    id?: string;
    purchase?: string;
  }>();
  const id = Number(supplied ?? params.productId ?? params.id);
  if (!Number.isSafeInteger(id) || id <= 0)
    return (
      <Page title="Package details">
        <Copy>Select a package to continue.</Copy>
        <Button
          title="Browse packages"
          onPress={() => router.replace("/packages")}
        />
      </Page>
    );
  return <Details key={id} id={id} />;
}
function Details({ id }: { id: number }) {
  const data = useResource<Product>(`api/purchases/products/${id}`);
  const member = getSession()!.member;
  const [person, setPerson] = useState<Person>({
    fullName: member.Name ?? "",
    dateofBirth: String(member.DateofBirth ?? "").slice(0, 10),
    gender: String(member.Gender ?? ""),
    mobileNumber: member.MobileNumber ?? "",
    relationship: "Self",
  });
  const [busy, setBusy] = useState(false);
  const locked = useRef(false);
  const [error, setError] = useState("");
  async function purchase() {
    if (locked.current || !data.data) return;
    const invalid = personError(person, true);
    if (invalid) {
      setError(invalid);
      return;
    }
    locked.current = true;
    setBusy(true);
    setError("");
    try {
      const result = await api<{ orderId: number }>("api/purchases", {
        body: {
          ...person,
          fullName: person.fullName.trim(),
          productsId: id,
          relationship: "Self",
        },
        serverErrors: true,
      });
      if (!(Number(result.orderId) > 0))
        throw new Error("Purchase could not be created.");
      router.push(purchaseRoute(result.orderId, firstPurchaseStep(data.data)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to create purchase.");
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }
  const product = data.data;
  return (
    <Page title="Package details">
      <Status {...data} />
      {product && (
        <>
          <Card>
            <Copy>
              {value(product, "ProductCategoryName") || "HEALTH PACKAGE"}
            </Copy>
            <Heading>{value(product, "ProductName")}</Heading>
            <Copy>{value(product, "ShortDescription")}</Copy>
            {packageAmount(product) !== null && (
              <Heading>{money(packageAmount(product))}</Heading>
            )}
            <Copy>
              Inclusive of applicable taxes · Final price depends on age
              eligibility
            </Copy>
            <Copy>
              Up to {value(product, "MaximumMembers")} members ·{" "}
              {value(product, "ValidForDays")} days validity
            </Copy>
          </Card>
          <Card>
            <Heading>Premium breakdown & eligibility</Heading>
            {children(product, "InsurancePremiums").map((row, i) => (
              <View key={i} style={{ gap: 6 }}>
                <Copy>
                  Ages {value(row, "MinimumAge")}–{value(row, "MaximumAge")}
                </Copy>
                <Copy>
                  Base premium {money(row.BasePremium)} · GST{" "}
                  {value(row, "GST")}%
                </Copy>
                <Heading>{money(row.TotalAmount)}</Heading>
              </View>
            ))}
          </Card>
          <Card>
            <Heading>Package benefits</Heading>
            <Copy>
              {plainText(
                value(product, "KeyFeatures") ||
                  value(product, "LongDescription"),
              )}
            </Copy>
            {product.includedProducts.map((row, i) => (
              <Copy key={i}>✓ {value(row, "ProductName")}</Copy>
            ))}
          </Card>
          <Card>
            <Heading>Confirm your details</Heading>
            <Copy>Review your details before continuing.</Copy>
            <PersonFields
              person={person}
              setPerson={setPerson}
              primary
              busy={busy}
            />
            <ErrorMessage error={error} />
            <Button
              title={busy ? "Creating purchase…" : "Save details and continue"}
              disabled={busy}
              onPress={() => void purchase()}
            />
          </Card>
        </>
      )}
    </Page>
  );
}
export function PurchaseRoute() {
  const { orderId, step, review } = useLocalSearchParams<{
    orderId: string;
    step: string;
    review?: string;
  }>();
  const id = Number(orderId);
  if (
    !Number.isSafeInteger(id) ||
    id <= 0 ||
    !["family", "nominees", "payment"].includes(step)
  )
    return (
      <Page title="Purchase">
        <Copy>This purchase link is invalid.</Copy>
        <Button
          title="Browse packages"
          onPress={() => router.replace("/packages")}
        />
      </Page>
    );
  return (
    <OrderFlow
      key={`${id}/${step}`}
      id={id}
      step={step}
      review={review === "1"}
    />
  );
}
function OrderFlow({
  id,
  step,
  review,
}: {
  id: number;
  step: string;
  review: boolean;
}) {
  const data = useResource<Snapshot>(`api/purchases/${id}`);
  const snapshot = data.data;
  useEffect(() => {
    if (
      snapshot &&
      step === "nominees" &&
      !review &&
      allNomineesAdded(snapshot.nomineeProducts, snapshot.nominees)
    )
      router.replace(purchaseRoute(id, "payment"));
  }, [id, snapshot, step, review]);
  return (
    <Page
      title={
        step === "family"
          ? "Family members"
          : step === "nominees"
            ? "Nominee details"
            : "Payment"
      }
    >
      <Status {...data} />
      {snapshot && (
        <>
          <View style={s.grid}>
            {["family", "nominees", "payment"].map((item, i) => (
              <Text
                key={item}
                style={[s.label, { opacity: step === item ? 1 : 0.4 }]}
              >
                {i + 1} {item}
              </Text>
            ))}
          </View>
          <Card>
            <Copy>Order #{id}</Copy>
            <Heading>{value(snapshot.product, "ProductName")}</Heading>
            <Heading>{money(snapshot.order.PayableAmount)}</Heading>
            <Copy>{value(snapshot.order, "FullName")}</Copy>
          </Card>
          {step === "family" ? (
            <FamilyStep id={id} snapshot={snapshot} reload={data.retry} />
          ) : step === "nominees" ? (
            <NomineeStep id={id} snapshot={snapshot} reload={data.retry} />
          ) : (
            <PaymentStep id={id} snapshot={snapshot} />
          )}
        </>
      )}
    </Page>
  );
}
function FamilyStep({
  id,
  snapshot,
  reload,
}: {
  id: number;
  snapshot: Snapshot;
  reload: () => void;
}) {
  const spouseRequired =
    Number(snapshot.product.NoOfCardHolders) === 2 &&
    !snapshot.family.some((row) => row.Relationship === "Spouse");
  const limit = Math.max(0, Number(snapshot.product.MaximumMembers) - 1);
  const dependents = useData<Row[]>(
    `api/Customer/GetDependentsByCustomerId/${getSession()!.member.MemberId}`,
  );
  const [person, setPerson] = useState<Person>({
    ...blankPerson,
    relationship: spouseRequired ? "Spouse" : "",
  });
  const [busy, setBusy] = useState(false);
  const locked = useRef(false);
  const [error, setError] = useState("");
  async function mutate(remove?: number) {
    if (locked.current) return;
    const selected = {
      ...person,
      relationship: spouseRequired ? "Spouse" : person.relationship,
    };
    const invalid = remove ? "" : personError(selected);
    if (invalid) {
      setError(invalid);
      return;
    }
    locked.current = true;
    setBusy(true);
    setError("");
    try {
      await api(
        remove
          ? `api/purchases/${id}/family/${remove}/remove`
          : `api/purchases/${id}/family`,
        {
          body: remove
            ? {}
            : { ...selected, mobileNumber: selected.mobileNumber || undefined },
          serverErrors: true,
        },
      );
      setPerson(blankPerson);
      reload();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Unable to save family member.",
      );
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }
  return (
    <Card>
      <Heading>
        {spouseRequired ? "Add your spouse" : "Add your family"}
      </Heading>
      <Copy>Your package covers up to {limit + 1} members, including you.</Copy>
      <Copy>{value(snapshot.order, "FullName")} · Primary member</Copy>
      {snapshot.family.map((row, i) => (
        <View key={i} style={{ gap: 8 }}>
          <Heading>{value(row, "FullName")}</Heading>
          <Copy>
            {value(row, "Relationship")} · {value(row, "Age")} years
          </Copy>
          <Button
            title="Remove"
            secondary
            disabled={busy}
            onPress={() => void mutate(Number(row.OrdersId))}
          />
        </View>
      ))}
      {snapshot.family.length < limit && (
        <>
          <Status {...dependents} />
          {dependents.data?.map((row, i) => (
            <Button
              key={i}
              title={`Use ${value(row, "Name")}`}
              secondary
              disabled={busy}
              onPress={() =>
                setPerson({
                  fullName: value(row, "Name"),
                  dateofBirth: value(row, "DateofBirth").slice(0, 10),
                  gender: value(row, "Gender"),
                  relationship: spouseRequired
                    ? "Spouse"
                    : value(row, "Relationship"),
                  mobileNumber: value(row, "MobileNumber"),
                })
              }
            />
          ))}
          <PersonFields
            person={person}
            setPerson={setPerson}
            spouse={spouseRequired}
            busy={busy}
          />
          <Button
            title={busy ? "Saving…" : "Add member"}
            secondary
            disabled={busy}
            onPress={() => void mutate()}
          />
        </>
      )}
      <ErrorMessage error={error} />
      {spouseRequired && (
        <Copy>Spouse details are required for this package.</Copy>
      )}
      <Button
        title="Continue"
        disabled={busy || spouseRequired}
        onPress={() =>
          router.push(
            purchaseRoute(
              id,
              allNomineesAdded(snapshot.nomineeProducts, snapshot.nominees)
                ? "payment"
                : "nominees",
            ),
          )
        }
      />
    </Card>
  );
}
function NomineeStep({
  id,
  snapshot,
  reload,
}: {
  id: number;
  snapshot: Snapshot;
  reload: () => void;
}) {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [guardianId, setGuardianId] = useState<number | null>(
    Number(snapshot.order.Age) >= 18 ? id : null,
  );
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const locked = useRef(false);
  const [error, setError] = useState("");
  const allAdded = allNomineesAdded(
    snapshot.nomineeProducts,
    snapshot.nominees,
  );
  const selected = snapshot.family.find(
    (row) => Number(row.OrdersId) === selectedId,
  );
  const minor = selected && Number(selected.Age) < 18;
  const guardians = [snapshot.order, ...snapshot.family].filter(
    (row) => Number(row.Age) >= 18 && Number(row.OrdersId) !== selectedId,
  );
  const guardianValid = guardians.some(
    (row) => Number(row.OrdersId) === guardianId,
  );
  async function save() {
    if (locked.current || !selected || (minor && !guardianValid)) return;
    locked.current = true;
    setBusy(true);
    setError("");
    try {
      for (const product of snapshot.nomineeProducts)
        await api(`api/purchases/${id}/nominees`, {
          body: {
            productsId: Number(product.ProductsId),
            familyOrderId: selectedId,
            ...(minor ? { guardianOrderId: guardianId } : {}),
          },
          serverErrors: true,
        });
      setEditing(false);
      reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save nominee.");
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }
  return (
    <Card>
      <Heading>Protect the people who matter</Heading>
      <Copy>
        Choose a family member as nominee for products in this package.
      </Copy>
      {allAdded && !editing ? (
        <>
          {snapshot.nomineeProducts.map((product, i) => {
            const nominee = snapshot.nominees.find(
              (row) => Number(row.ProductsId) === Number(product.ProductsId),
            );
            return (
              <Copy key={i}>
                ✓ {value(nominee, "FullName")} ·{" "}
                {value(nominee, "Relationship")} ·{" "}
                {value(product, "ProductName")}
              </Copy>
            );
          })}
          <Button
            title="Change nominee"
            secondary
            onPress={() => setEditing(true)}
          />
          <Button
            title="Continue to payment"
            onPress={() => router.push(purchaseRoute(id, "payment"))}
          />
        </>
      ) : (
        <>
          <Copy>{value(snapshot.order, "FullName")} · You, primary member</Copy>
          {snapshot.family.map((row, i) => (
            <Button
              key={i}
              title={`${value(row, "FullName")} · ${value(row, "Relationship")} · ${value(row, "Age")} years${selectedId === Number(row.OrdersId) ? " ✓" : ""}`}
              secondary={selectedId !== Number(row.OrdersId)}
              disabled={busy}
              onPress={() => setSelectedId(Number(row.OrdersId))}
            />
          ))}
          {!snapshot.family.length && (
            <Button
              title="Add a family member"
              onPress={() => router.push(purchaseRoute(id, "family"))}
            />
          )}
          {minor && (
            <>
              <Heading>Choose an adult guardian</Heading>
              {guardians.map((row, i) => (
                <Button
                  key={i}
                  title={value(row, "FullName")}
                  secondary={guardianId !== Number(row.OrdersId)}
                  disabled={busy}
                  onPress={() => setGuardianId(Number(row.OrdersId))}
                />
              ))}
              {!guardians.length && (
                <Button
                  title="Add an adult family member"
                  onPress={() => router.push(purchaseRoute(id, "family"))}
                />
              )}
            </>
          )}
          <ErrorMessage error={error} />
          <Button
            title={busy ? "Saving nominee…" : "Save nominee and continue"}
            disabled={busy || !selected || Boolean(minor && !guardianValid)}
            onPress={() => void save()}
          />
        </>
      )}
    </Card>
  );
}
function PaymentStep({
  id,
  snapshot,
  selectedMethod,
  checkout = false,
}: {
  id: number;
  snapshot: Snapshot;
  selectedMethod?: number;
  checkout?: boolean;
}) {
  const [method, setMethod] = useState(
    selectedMethod ?? Number(snapshot.paymentMethods[0]?.PaymentTypeId),
  );
  const [link, setLink] = useState<PaymentLink | null>(null);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [now, setNow] = useState(Date.now);
  const [failedQr, setFailedQr] = useState(false);
  const checking = useRef(false);
  const creating = useRef(false);
  const linkId = link?.linkId;
  const check = useCallback(
    async (signal?: AbortSignal) => {
      if (checking.current) return;
      checking.current = true;
      try {
        const result = await api<PaymentStatus>(
          linkId
            ? `api/payment/fetchPaymentLinksByLinkId/${encodeURIComponent(linkId)}`
            : `api/purchases/${id}/payment-status`,
          { signal, serverErrors: true },
        );
        if (!signal?.aborted) {
          setStatus(result.status);
          if (result.link) setLink(result.link);
          setError("");
        }
      } catch (e) {
        if (!signal?.aborted)
          setError(
            e instanceof Error ? e.message : "Unable to verify payment.",
          );
      } finally {
        checking.current = false;
      }
    },
    [id, linkId],
  );
  useEffect(() => {
    const controller = new AbortController();
    void Promise.resolve().then(() => {
      if (!controller.signal.aborted) return check(controller.signal);
    });
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void check(controller.signal);
    });
    const timer = setInterval(() => {
      if (
        AppState.currentState === "active" &&
        !["COMPLETED", "EXPIRED", "CANCELLED"].includes(status)
      )
        void check(controller.signal);
    }, 10000);
    return () => {
      controller.abort();
      clearInterval(timer);
      subscription.remove();
    };
  }, [check, status]);
  useEffect(() => {
    if (status !== "ACTIVE") return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [status]);
  async function pay() {
    if (
      creating.current ||
      !snapshot.paymentMethods.some(
        (row) => Number(row.PaymentTypeId) === method,
      )
    )
      return;
    if (!checkout) {
      const selected = snapshot.paymentMethods.find(
        (row) => Number(row.PaymentTypeId) === method,
      );
      const route = [
        "/PaymentLinks",
        "/StaticQRCode",
        "/UPIPayment",
        "/PaymentDetails",
      ].includes(String(selected?.route))
        ? String(selected?.route)
        : "/PaymentDetails";
      router.push({
        pathname: route as "/PaymentDetails",
        params: { orderId: id, paymentTypeId: method },
      });
      return;
    }
    creating.current = true;
    setBusy(true);
    setError("");
    try {
      const result = await api<PaymentLink>("api/payment/createPaymentLink", {
        body: { orderId: id, paymentTypeId: method },
        serverErrors: true,
      });
      setLink(result);
      setStatus(result.status);
      setFailedQr(false);
      setNow(Date.now());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to start payment.");
    } finally {
      creating.current = false;
      setBusy(false);
    }
  }
  const expires = link ? Date.parse(link.expiresAt) : NaN;
  const remaining = Number.isFinite(expires)
    ? Math.max(0, Math.ceil((expires - now) / 1000))
    : null;
  const active = link && status === "ACTIVE" && remaining !== 0;
  if (["COMPLETED", "PAID"].includes(status))
    return (
      <Card>
        <Heading>✓ Payment received</Heading>
        <Copy>
          {status === "COMPLETED"
            ? "Your package purchase is complete."
            : "Your payment is verified. We’re activating your package."}
        </Copy>
        <Button
          title="View my packages"
          onPress={() => router.replace("/PurchasedPackages")}
        />
        <Button
          title="Back to home"
          secondary
          onPress={() => router.replace("/home")}
        />
        <ErrorMessage error={error} />
      </Card>
    );
  return (
    <Card>
      <Heading>Complete your purchase</Heading>
      <Copy>Choose how you’d like to pay.</Copy>
      <Heading>{money(snapshot.order.PayableAmount)}</Heading>
      {!active &&
        !checkout &&
        snapshot.paymentMethods.map((row, i) => (
          <Button
            key={i}
            title={value(row, "PaymentTypeName")}
            secondary={method !== Number(row.PaymentTypeId)}
            disabled={busy}
            onPress={() => setMethod(Number(row.PaymentTypeId))}
          />
        ))}
      <ErrorMessage error={error} />
      {active ? (
        <>
          {remaining !== null && (
            <Heading>
              Expires in {Math.floor(remaining / 60)}:
              {String(remaining % 60).padStart(2, "0")}
            </Heading>
          )}
          {link.qrCode && !failedQr ? (
            <Image
              accessibilityLabel="Cashfree payment QR code"
              source={{ uri: link.qrCode }}
              style={{ width: 240, height: 240, alignSelf: "center" }}
              resizeMode="contain"
              onError={() => setFailedQr(true)}
            />
          ) : (
            <Copy>Use the secure payment link below.</Copy>
          )}
          <Button
            title="Open secure payment"
            onPress={() =>
              void openExternal(link.url).catch((e) => setError(e.message))
            }
          />
          <Copy>Return here after paying to see your confirmation.</Copy>
        </>
      ) : (
        <Button
          title={
            busy
              ? "Preparing payment…"
              : link
                ? "Create a new payment link"
                : "Continue to payment"
          }
          disabled={
            busy ||
            !snapshot.paymentMethods.some(
              (row) => Number(row.PaymentTypeId) === method,
            )
          }
          onPress={() => void pay()}
        />
      )}
      <Button
        title="Check payment status"
        secondary
        onPress={() => void check()}
      />
      <Button
        title="Review family members"
        secondary
        disabled={busy || Boolean(active)}
        onPress={() => router.push(purchaseRoute(id, "family"))}
      />
      {snapshot.nomineeProducts.length > 0 && (
        <Button
          title="Review nominees"
          secondary
          disabled={busy || Boolean(active)}
          onPress={() =>
            router.push(`${purchaseRoute(id, "nominees")}?review=1`)
          }
        />
      )}
    </Card>
  );
}

type PaymentDetails = {
  method: Row;
  route: string;
  qrCode: string;
  amount: unknown;
  reference: string;
};
export function PaymentDestination() {
  const params = useLocalSearchParams<{
    orderId: string;
    paymentTypeId: string;
  }>();
  const id = Number(params.orderId);
  const method = Number(params.paymentTypeId);
  if (
    !Number.isSafeInteger(id) ||
    id <= 0 ||
    !Number.isSafeInteger(method) ||
    method <= 0
  )
    return (
      <Page title="Payment">
        <Copy>Select a payment method from your purchase.</Copy>
        <Button title="Back to home" onPress={() => router.replace("/home")} />
      </Page>
    );
  return (
    <PaymentDestinationContent
      key={`${id}/${method}`}
      id={id}
      method={method}
    />
  );
}
function PaymentDestinationContent({
  id,
  method,
}: {
  id: number;
  method: number;
}) {
  const details = useResource<PaymentDetails>(
    `api/purchases/${id}/payment-methods/${method}`,
  );
  const snapshot = useResource<Snapshot>(`api/purchases/${id}`);
  const [reference, setReference] = useState("");
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const submitting = useRef(false);
  async function submit() {
    if (submitting.current || !reference.trim()) return;
    submitting.current = true;
    setBusy(true);
    setError("");
    try {
      await api(`api/purchases/${id}/payment-reference`, {
        body: { paymentTypeId: method, reference: reference.trim() },
        serverErrors: true,
      });
      setSubmitted(true);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Unable to submit payment reference.",
      );
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }
  const data = details.data;
  return (
    <Page title="Payment">
      <Status {...details} />
      <Status {...snapshot} />
      {data &&
        snapshot.data &&
        (data.route === "/PaymentLinks" ? (
          <PaymentStep
            id={id}
            snapshot={snapshot.data}
            selectedMethod={method}
            checkout
          />
        ) : (
          <Card>
            <Heading>{value(data.method, "PaymentTypeName")}</Heading>
            <Heading>{money(data.amount)}</Heading>
            {data.qrCode ? (
              <Image
                source={{ uri: data.qrCode }}
                accessibilityLabel="Payment QR code"
                style={{ width: 240, height: 240, alignSelf: "center" }}
                resizeMode="contain"
              />
            ) : (
              <Copy>Contact support for payment instructions if needed.</Copy>
            )}
            {submitted || data.reference ? (
              <Copy>
                Payment reference submitted. Your payment is pending
                verification.
              </Copy>
            ) : (
              <>
                <Field
                  label="UTR / payment reference"
                  value={reference}
                  onChangeText={setReference}
                  maxLength={50}
                />
                <Button
                  title={busy ? "Submitting…" : "Submit payment reference"}
                  disabled={busy || !reference.trim()}
                  onPress={() => void submit()}
                />
              </>
            )}
            <ErrorMessage error={error} />
          </Card>
        ))}
      <Button
        title="Back to payment options"
        secondary
        onPress={() => router.replace(purchaseRoute(id, "payment"))}
      />
    </Page>
  );
}

export function PaymentSelection() {
  const { orderId } = useLocalSearchParams<{ orderId?: string }>();
  const id = Number(orderId);
  const data = useResource<Row[]>("api/purchases/pending");
  useEffect(() => {
    if (Number.isSafeInteger(id) && id > 0)
      router.replace(purchaseRoute(id, "payment"));
  }, [id]);
  return (
    <Page title="Payment">
      <Status {...data} />
      {data.data?.map((order) => (
        <Button
          key={value(order, "OrdersId")}
          title={`${value(order, "ProductName")} - ${value(order, "FullName")}`}
          onPress={() =>
            router.push(purchaseRoute(value(order, "OrdersId"), "payment"))
          }
        />
      ))}
      <Button
        title="Browse packages"
        secondary
        onPress={() => router.push("/packages")}
      />
    </Page>
  );
}
