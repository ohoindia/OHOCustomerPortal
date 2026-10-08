import { useEffect, useRef, useState } from "react";
import { AppState, Linking, Text } from "react-native";
import { router } from "expo-router";
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
import { api } from "../lib/api";
import { getSession } from "../lib/session";
import { value, type Row } from "../lib/data";
type Product = Row & { includedProducts: Row[] };
type Snapshot = {
  order: Row;
  product: Product;
  family: Row[];
  nominees: Row[];
  nomineeProducts: Row[];
  paymentMethods: Row[];
};
type Person = {
  fullName: string;
  dateofBirth: string;
  gender: string;
  mobileNumber: string;
  relationship: string;
};
type PaymentLink = {
  url: string;
  linkId: string;
  expiresAt: string;
  status: string;
};
const blank: Person = {
  fullName: "",
  dateofBirth: "",
  gender: "",
  mobileNumber: "",
  relationship: "",
};
function go(id: string | number, step: "family" | "nominees" | "payment") {
  router.push(purchaseRoute(id, step) as never);
}
function usePurchase<T>(path: string) {
  const [attempt, setAttempt] = useState(0);
  const key = `${path}:${attempt}`;
  const [state, setState] = useState<{
    key: string;
    data: T | null;
    loading: boolean;
    error: string;
  }>({ key: "", data: null, loading: true, error: "" });
  useEffect(() => {
    const controller = new AbortController();
    void api<T>(path, { signal: controller.signal, serverErrors: true })
      .then((data) => {
        if (!controller.signal.aborted)
          setState({ key, data, loading: false, error: "" });
      })
      .catch((error) => {
        if (!controller.signal.aborted)
          setState({
            key,
            data: null,
            loading: false,
            error:
              error instanceof Error
                ? error.message
                : "Unable to load purchase.",
          });
      });
    return () => controller.abort();
  }, [path, key]);
  return {
    ...(state.key === key
      ? { data: state.data, error: state.error, loading: state.loading }
      : { data: null, loading: true, error: "" }),
    retry: () => setAttempt((n) => n + 1),
  };
}
function useAction() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const lock = useRef(false);
  const run = async (work: () => Promise<void>) => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      await work();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please try again.");
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  return { busy, error, run };
}
function PersonFields({
  person,
  change,
  primary = false,
}: {
  person: Person;
  change: (p: Person) => void;
  primary?: boolean;
}) {
  return (
    <>
      <Field
        label="Full name"
        value={person.fullName}
        maxLength={100}
        onChangeText={(fullName) => change({ ...person, fullName })}
      />
      <Field
        label="Date of birth (YYYY-MM-DD)"
        value={person.dateofBirth}
        maxLength={10}
        onChangeText={(dateofBirth) => change({ ...person, dateofBirth })}
      />
      <Copy>Gender</Copy>
      {["Male", "Female", "Other"].map((gender) => (
        <Button
          key={gender}
          title={gender}
          secondary={person.gender !== gender}
          onPress={() => change({ ...person, gender })}
        />
      ))}
      {!primary && (
        <>
          <Copy>Relationship</Copy>
          {[
            "Spouse",
            "Son",
            "Daughter",
            "Father",
            "Mother",
            "Father-in-law",
            "Mother-in-law",
            "Brother",
            "Sister",
          ].map((relationship) => (
            <Button
              key={relationship}
              title={relationship}
              secondary={person.relationship !== relationship}
              onPress={() => change({ ...person, relationship })}
            />
          ))}
        </>
      )}
      <Field
        label={primary ? "Mobile number" : "Mobile number (optional)"}
        value={person.mobileNumber}
        keyboardType="phone-pad"
        maxLength={10}
        editable={!primary}
        onChangeText={(mobileNumber) =>
          change({ ...person, mobileNumber: mobileNumber.replace(/\D/g, "") })
        }
      />
    </>
  );
}
function validate(person: Person) {
  const date = new Date(person.dateofBirth + "T00:00:00Z");
  if (
    !person.fullName.trim() ||
    !/^\d{4}-\d{2}-\d{2}$/.test(person.dateofBirth) ||
    !Number.isFinite(date.getTime()) ||
    date.toISOString().slice(0, 10) !== person.dateofBirth ||
    date > new Date() ||
    !person.gender ||
    !person.relationship
  )
    throw new Error(
      "Enter a name, valid date of birth, gender and relationship.",
    );
  if (person.mobileNumber && !/^[6-9]\d{9}$/.test(person.mobileNumber))
    throw new Error("Enter a valid 10-digit mobile number.");
}
export function PackageDetails({ productId }: { productId: string }) {
  const data = usePurchase<Product>(
    `api/purchases/products/${Number(productId)}`,
  );
  const member = getSession()!.member;
  const [person, change] = useState<Person>({
    fullName: String(member.Name ?? ""),
    dateofBirth: String(member.DateofBirth ?? "").slice(0, 10),
    gender: String(member.Gender ?? ""),
    mobileNumber: String(member.MobileNumber ?? ""),
    relationship: "Self",
  });
  const action = useAction();
  return (
    <Page title="Package details">
      <Status {...data} />
      {data.data && (
        <>
          <Card>
            <Heading>{value(data.data, "ProductName")}</Heading>
            <Copy>{value(data.data, "ShortDescription")}</Copy>
            <Copy>
              {packageAmount(data.data) === null
                ? "Price unavailable"
                : `₹${packageAmount(data.data)}`}
            </Copy>
            {data.data.includedProducts.map((product, i) => (
              <Copy key={i}>
                {value(product, "ProductName")} ·{" "}
                {value(product, "ShortDescription")}
              </Copy>
            ))}
          </Card>
          <Card>
            <Heading>Primary member</Heading>
            <PersonFields person={person} change={change} primary />
            <Text style={s.error}>{action.error}</Text>
            <Button
              title={action.busy ? "Creating purchase…" : "Continue purchase"}
              disabled={action.busy}
              onPress={() =>
                void action.run(async () => {
                  validate(person);
                  const result = await api<{ orderId: number }>(
                    "api/purchases",
                    {
                      body: { ...person, productsId: Number(productId) },
                      serverErrors: true,
                    },
                  );
                  go(result.orderId, firstPurchaseStep(data.data!));
                })
              }
            />
          </Card>
        </>
      )}
    </Page>
  );
}
export function Purchase({ orderId, step }: { orderId: string; step: string }) {
  const data = usePurchase<Snapshot>(`api/purchases/${Number(orderId)}`);
  return (
    <Page title="Complete purchase">
      <Status {...data} />
      {data.data && (
        <>
          <Card>
            <Heading>{value(data.data.product, "ProductName")}</Heading>
            <Copy>Order #{orderId}</Copy>
          </Card>
          {step === "family" ? (
            <FamilyStep id={orderId} snapshot={data.data} reload={data.retry} />
          ) : step === "nominees" ? (
            <NomineeStep id={orderId} snapshot={data.data} />
          ) : (
            <PaymentStep id={orderId} snapshot={data.data} />
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
  id: string;
  snapshot: Snapshot;
  reload: () => void;
}) {
  const [person, change] = useState(blank);
  const action = useAction();
  const limit = Math.max(0, Number(snapshot.product.MaximumMembers) - 1);
  const spouseRequired =
    Number(snapshot.product.NoOfCardHolders) === 2 &&
    !snapshot.family.some((row) => row.Relationship === "Spouse");
  return (
    <>
      <Heading>
        Family members ({snapshot.family.length}/{limit})
      </Heading>
      {snapshot.family.map((member) => (
        <Card key={value(member, "OrdersId")}>
          <Heading>{value(member, "FullName")}</Heading>
          <Copy>{value(member, "Relationship")}</Copy>
          <Button
            title="Remove"
            secondary
            disabled={action.busy}
            onPress={() =>
              void action.run(async () => {
                await api(
                  `api/purchases/${id}/family/${value(member, "OrdersId")}/remove`,
                  { body: {}, serverErrors: true },
                );
                reload();
              })
            }
          />
        </Card>
      ))}
      {snapshot.family.length < limit && (
        <Card>
          <PersonFields person={person} change={change} />
          <Button
            title="Add family member"
            disabled={action.busy}
            onPress={() =>
              void action.run(async () => {
                validate(person);
                if (spouseRequired && person.relationship !== "Spouse")
                  throw new Error("Add your spouse first for this package.");
                await api(`api/purchases/${id}/family`, {
                  body: {
                    ...person,
                    mobileNumber: person.mobileNumber || undefined,
                  },
                  serverErrors: true,
                });
                change(blank);
                reload();
              })
            }
          />
        </Card>
      )}
      <Text style={s.error}>{action.error}</Text>
      {spouseRequired && (
        <Copy>This package requires your spouse to be added.</Copy>
      )}
      <Button
        title="Continue"
        disabled={action.busy || spouseRequired}
        onPress={() =>
          go(
            id,
            allNomineesAdded(snapshot.nomineeProducts, snapshot.nominees)
              ? "payment"
              : "nominees",
          )
        }
      />
    </>
  );
}
function NomineeStep({ id, snapshot }: { id: string; snapshot: Snapshot }) {
  const [selected, setSelected] = useState("");
  const [guardian, setGuardian] = useState("");
  const action = useAction();
  const member = snapshot.family.find(
    (row) => value(row, "OrdersId") === selected,
  );
  const minor = member && Number(member.Age) < 18;
  const saved = allNomineesAdded(snapshot.nomineeProducts, snapshot.nominees);
  return (
    <>
      <Heading>Choose a nominee</Heading>
      {snapshot.nominees.map((row, i) => (
        <Copy key={i}>Saved nominee: {value(row, "FullName")}</Copy>
      ))}
      {snapshot.family.map((row) => (
        <Button
          key={value(row, "OrdersId")}
          title={`${value(row, "FullName")} · ${value(row, "Relationship")}`}
          secondary={value(row, "OrdersId") !== selected}
          disabled={action.busy}
          onPress={() => {
            setSelected(value(row, "OrdersId"));
            setGuardian("");
          }}
        />
      ))}
      {!snapshot.family.length && (
        <Button title="Add family member" onPress={() => go(id, "family")} />
      )}
      {minor && (
        <>
          <Heading>Adult guardian</Heading>
          {[snapshot.order, ...snapshot.family]
            .filter(
              (row) =>
                Number(row.Age) >= 18 && value(row, "OrdersId") !== selected,
            )
            .map((row) => (
              <Button
                key={value(row, "OrdersId")}
                title={value(row, "FullName")}
                secondary={value(row, "OrdersId") !== guardian}
                disabled={action.busy}
                onPress={() => setGuardian(value(row, "OrdersId"))}
              />
            ))}
        </>
      )}
      <Text style={s.error}>{action.error}</Text>
      <Button
        title="Save nominee and continue"
        disabled={action.busy || !member || Boolean(minor && !guardian)}
        onPress={() =>
          void action.run(async () => {
            for (const product of snapshot.nomineeProducts)
              await api(`api/purchases/${id}/nominees`, {
                body: {
                  productsId: Number(product.ProductsId),
                  familyOrderId: Number(selected),
                  ...(minor ? { guardianOrderId: Number(guardian) } : {}),
                },
                serverErrors: true,
              });
            go(id, "payment");
          })
        }
      />
      {saved && (
        <Button
          title="Continue with saved nominee"
          secondary
          onPress={() => go(id, "payment")}
        />
      )}
    </>
  );
}
const isLink = (row: Row) =>
  /^(cashfree)?paymentlink(andqrcode)?$/.test(
    String(row.PaymentTypeName ?? "")
      .replace(/[\s_-]/g, "")
      .toLowerCase(),
  );
function PaymentStep({ id, snapshot }: { id: string; snapshot: Snapshot }) {
  const [method, setMethod] = useState(
    value(snapshot.paymentMethods.find(isLink), "PaymentTypeId"),
  );
  const [link, setLink] = useState<PaymentLink | null>(null);
  const [status, setStatus] = useState("");
  const [completed, setCompleted] = useState(false);
  const action = useAction();
  const linkId = link?.linkId;
  useEffect(() => {
    const controller = new AbortController();
    let inFlight = false;
    async function check() {
      if (inFlight || AppState.currentState === "background") return;
      inFlight = true;
      try {
        const result = await api<{
          status: string;
          completed: boolean;
          link?: PaymentLink;
        }>(
          linkId
            ? `api/payment/fetchPaymentLinksByLinkId/${encodeURIComponent(linkId)}`
            : `api/purchases/${id}/payment-status`,
          { signal: controller.signal, serverErrors: true },
        );
        if (!controller.signal.aborted) {
          setStatus(result.status);
          setCompleted(result.completed);
          if (result.link) setLink(result.link);
        }
      } catch {
        /* Manual status check below reports request errors. */
      } finally {
        inFlight = false;
      }
    }
    void check();
    const timer = setInterval(() => {
      if (!completed) void check();
    }, 10000);
    const listener = AppState.addEventListener("change", (state) => {
      if (state === "active") void check();
    });
    return () => {
      controller.abort();
      clearInterval(timer);
      listener.remove();
    };
  }, [id, linkId, completed]);
  const eligible = allNomineesAdded(
    snapshot.nomineeProducts,
    snapshot.nominees,
  );
  return (
    <>
      <Heading>{completed ? "Payment confirmed" : "Secure payment"}</Heading>
      <Copy>Amount payable: ₹{value(snapshot.order, "PayableAmount")}</Copy>
      <Copy>Status: {status || "Checking…"}</Copy>
      {completed ? (
        <Button
          title="View membership"
          onPress={() => router.replace("/membership")}
        />
      ) : (
        <>
          {snapshot.paymentMethods.filter(isLink).map((row) => (
            <Button
              key={value(row, "PaymentTypeId")}
              title={value(row, "PaymentTypeName")}
              secondary={method !== value(row, "PaymentTypeId")}
              onPress={() => setMethod(value(row, "PaymentTypeId"))}
            />
          ))}
          {!eligible && (
            <Button
              title="Complete nominee details"
              onPress={() => go(id, "nominees")}
            />
          )}
          <Button
            title={action.busy ? "Please wait…" : "Create payment link"}
            disabled={action.busy || !method || !eligible}
            onPress={() =>
              void action.run(async () => {
                const result = await api<PaymentLink>(
                  "api/payment/createPaymentLink",
                  {
                    body: {
                      orderId: Number(id),
                      paymentTypeId: Number(method),
                    },
                    serverErrors: true,
                  },
                );
                setLink(result);
                setStatus(result.status);
              })
            }
          />
          {link && (
            <Card>
              <Copy>Expires: {link.expiresAt}</Copy>
              <Button
                title="Open secure payment"
                disabled={status !== "ACTIVE" || action.busy}
                onPress={() =>
                  void action.run(async () => {
                    if (new Date(link.expiresAt).getTime() <= Date.now())
                      throw new Error(
                        "This payment link has expired. Create a new link.",
                      );
                    if (!/^https:\/\//i.test(link.url))
                      throw new Error(
                        "The payment service returned an invalid secure link.",
                      );
                    await Linking.openURL(link.url);
                  })
                }
              />
            </Card>
          )}
          <Button
            title="Check payment status"
            secondary
            disabled={action.busy}
            onPress={() =>
              void action.run(async () => {
                const result = await api<{
                  status: string;
                  completed: boolean;
                }>(`api/purchases/${id}/payment-status`, {
                  serverErrors: true,
                });
                setStatus(result.status);
                setCompleted(result.completed);
              })
            }
          />
        </>
      )}
      <Text style={s.error}>{action.error}</Text>
    </>
  );
}
