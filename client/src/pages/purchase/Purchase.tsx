import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import {
  Link,
  Navigate,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";
import { AppShell, PageHeader } from "../../components/Layout";
import { apiRequest as request } from "../../services/api";
import type { RequestOptions } from "../../../../common/api/transport";
import { getSessionMember } from "../auth/member";
import { usePortalData, textValue } from "../portal/usePortalData";
import type { PortalRow } from "../portal/usePortalData";
import { packageAmount } from "../../../../common/utils/packages";
import {
  allNomineesAdded,
  firstPurchaseStep,
  purchaseRoute,
} from "../../../../common/utils/purchase";
import "../discovery/packages.css";
import "./purchase.css";

type Product = PortalRow & {
  InsurancePremiums: PortalRow[];
  includedProducts: PortalRow[];
};
type Snapshot = {
  order: PortalRow;
  product: Product;
  family: PortalRow[];
  nominees: PortalRow[];
  nomineeProducts: PortalRow[];
  paymentMethods: PortalRow[];
};
type Person = {
  fullName: string;
  dateofBirth: string;
  gender: string;
  mobileNumber: string;
  relationship: string;
};
type PaymentLink = {
  linkId: string;
  url: string;
  expiresAt: string;
  status: string;
};
type PaymentStatus = { status: string; completed: boolean; link?: PaymentLink };
const blankPerson: Person = {
  fullName: "",
  dateofBirth: "",
  gender: "",
  mobileNumber: "",
  relationship: "",
};
function apiRequest<T>(path: string, options: RequestOptions = {}) {
  return request<T>(path, { ...options, serverErrors: true });
}
const relationships = [
  "Spouse",
  "Son",
  "Daughter",
  "Father",
  "Mother",
  "Father-in-law",
  "Mother-in-law",
  "Brother",
  "Sister",
];
const currency = (value: unknown) =>
  `₹${Number(value).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
const dateInput = (value: unknown) => {
  if (typeof value !== "string") return "";
  if (!value.includes("T")) return value.slice(0, 10);
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(
        date,
      )
    : "";
};

function useData<T>(path: string) {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<{
    path: string;
    data?: T;
    error?: string;
  }>({ path: "" });
  useEffect(() => {
    const controller = new AbortController();
    void apiRequest<T>(path, { signal: controller.signal })
      .then((data) => {
        if (!controller.signal.aborted) setState({ path, data });
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted)
          setState({
            path,
            error:
              error instanceof Error
                ? error.message
                : "Unable to load purchase.",
          });
      });
    return () => controller.abort();
  }, [path, attempt]);
  return {
    ...(state.path === path ? state : { path }),
    reload: () => setAttempt((value) => value + 1),
  };
}
function Notice({ error, retry }: { error?: string; retry?: () => void }) {
  return (
    <div className="purchase-notice" role={error ? "alert" : "status"}>
      {error || "Loading your purchase…"}
      {error && retry && (
        <button className="outline-btn" onClick={retry}>
          Try again
        </button>
      )}
    </div>
  );
}
function cleanText(html: string) {
  const document = new DOMParser().parseFromString(html, "text/html");
  document.querySelectorAll("script, style").forEach((node) => node.remove());
  document
    .querySelectorAll("p, li, br, div")
    .forEach((node) => node.append("\n"));
  return (document.body.textContent ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}
function PersonFields({
  value,
  onChange,
  spouse = false,
  nominee = false,
  primary = false,
}: {
  value: Person;
  onChange: (value: Person) => void;
  spouse?: boolean;
  nominee?: boolean;
  primary?: boolean;
}) {
  const field = (key: keyof Person, next: string) =>
    onChange({ ...value, [key]: next });
  return (
    <div className="purchase-form-grid">
      <label className="purchase-full">
        Full name
        <input
          required
          maxLength={100}
          autoComplete="name"
          value={value.fullName}
          onChange={(event) => field("fullName", event.target.value)}
        />
      </label>
      <label>
        Date of birth
        <input
          required
          type="date"
          max={new Date().toLocaleDateString("en-CA")}
          value={value.dateofBirth}
          onChange={(event) => field("dateofBirth", event.target.value)}
        />
      </label>
      <label>
        Gender
        <select
          required
          value={value.gender}
          onChange={(event) => field("gender", event.target.value)}
        >
          <option value="">Select gender</option>
          {["Male", "Female", "Other"].map((gender) => (
            <option key={gender}>{gender}</option>
          ))}
        </select>
      </label>
      {!primary && (
        <label>
          Relationship
          <select
            required
            value={spouse ? "Spouse" : value.relationship}
            disabled={spouse}
            onChange={(event) => field("relationship", event.target.value)}
          >
            <option value="">Select relationship</option>
            {[...relationships, ...(nominee ? ["Other"] : [])].map(
              (relation) => (
                <option key={relation}>{relation}</option>
              ),
            )}
          </select>
        </label>
      )}
      <label>
        Mobile number{!primary && " (optional)"}
        <input
          required={primary}
          readOnly={primary}
          type="tel"
          inputMode="numeric"
          pattern="[6-9][0-9]{9}"
          maxLength={10}
          value={value.mobileNumber}
          onChange={(event) =>
            field("mobileNumber", event.target.value.replace(/\D/g, ""))
          }
        />
      </label>
    </div>
  );
}

export function PurchaseDetails() {
  const location = useLocation();
  const state = location.state as {
    productId?: number;
    productsId?: number;
    ProductsId?: number;
  } | null;
  const id = Number(
    new URLSearchParams(location.search).get("productId") ||
      state?.productId ||
      state?.productsId ||
      state?.ProductsId,
  );
  return Number.isSafeInteger(id) && id > 0 ? (
    <Details id={id} />
  ) : (
    <AppShell>
      <PageHeader title="Package details" />
      <p>Select a package to continue.</p>
      <Link to="/packages">Browse packages</Link>
    </AppShell>
  );
}
function Details({ id }: { id: number }) {
  const data = useData<Product>(`api/purchases/products/${id}`);
  const [sessionMember] = useState(getSessionMember);
  const memberId = Number(
    sessionMember?.MemberId || sessionStorage.getItem("memberId"),
  );
  const communityId = Number(
    sessionMember?.communityCustomerId ||
      sessionMember?.CommunityCustomerId ||
      sessionStorage.getItem("communityCustomerId"),
  );
  const profile = usePortalData(
    memberId > 0
      ? `api/Customer/GetById/${memberId}`
      : `api/CommunityCustomers/GetById/${communityId}`,
  );
  const [person, setPerson] = useState<Person | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submitting = useRef(false);
  const navigate = useNavigate();
  const customer = profile.rows[0];
  const accountValue = (key: string) =>
    textValue(customer, key).trim() ||
    textValue(sessionMember ?? undefined, key).trim();
  const purchaser = person ?? {
    fullName: accountValue("Name"),
    dateofBirth: dateInput(accountValue("DateofBirth")),
    gender: accountValue("Gender"),
    mobileNumber: accountValue("MobileNumber"),
    relationship: "Self",
  };
  const missingDetails =
    !accountValue("Name") ||
    !dateInput(accountValue("DateofBirth")) ||
    !accountValue("Gender");
  async function purchase(event: FormEvent) {
    event.preventDefault();
    if (submitting.current || !data.data) return;
    submitting.current = true;
    setBusy(true);
    setError("");
    try {
      const result = await apiRequest<{ orderId: number }>("api/purchases", {
        body: { ...purchaser, relationship: "Self", productsId: id },
      });
      navigate(purchaseRoute(result.orderId, firstPurchaseStep(data.data)));
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to create your purchase.",
      );
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }
  const product = data.data;
  const amount = product ? packageAmount(product) : null;
  return (
    <AppShell className="purchase-page">
      <PageHeader title="Package details" />
      {!product ? (
        <Notice error={data.error} retry={data.reload} />
      ) : (
        <>
          <section className="purchase-summary">
            <span className="purchase-eyebrow">
              {textValue(product, "ProductCategoryName") || "HEALTH PACKAGE"}
            </span>
            <h2>{textValue(product, "ProductName")}</h2>
            <p>{textValue(product, "ShortDescription")}</p>
            {amount !== null && (
              <strong className="purchase-price">{currency(amount)}</strong>
            )}
            <small>
              Inclusive of applicable taxes · Final price depends on age
              eligibility
            </small>
            <div className="catalog-package-meta">
              {Number(product.MaximumMembers) > 0 && (
                <span>Up to {String(product.MaximumMembers)} members</span>
              )}
              {Number(product.ValidForDays) > 0 && (
                <span>{String(product.ValidForDays)} days validity</span>
              )}
            </div>
            <details className="purchase-pricing">
              <summary>Premium breakdown & eligibility</summary>
              {product.InsurancePremiums.map((premium, i) => (
                <div className="purchase-premium" key={i}>
                  <b>
                    Ages {String(premium.MinimumAge)}–
                    {String(premium.MaximumAge)}
                  </b>
                  <span>Base premium {currency(premium.BasePremium)}</span>
                  <span>GST {String(premium.GST)}%</span>
                  <strong>Total {currency(premium.TotalAmount)}</strong>
                </div>
              ))}
            </details>
          </section>
          <section className="purchase-panel">
            <h2>Package benefits</h2>
            <ul className="catalog-package-benefits">
              {cleanText(
                textValue(product, "KeyFeatures") ||
                  textValue(product, "LongDescription"),
              ).map((line, i) => (
                <li key={i}>{line}</li>
              ))}
            </ul>
            {product.includedProducts.length > 0 && (
              <>
                <h3>Included in your package</h3>
                <ul className="purchase-included">
                  {product.includedProducts.map((row) => (
                    <li key={textValue(row, "ProductsId")}>
                      {textValue(row, "ProductName")}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>
          <section className="purchase-panel">
            <h2>
              {missingDetails
                ? "Add your customer details"
                : "Confirm your details"}
            </h2>
            <p>
              {missingDetails
                ? "Complete the missing details below to continue purchasing your package."
                : "Your Account Details are filled in below. Review them before continuing."}
            </p>
            <p>We’ll use these details for your package and payment.</p>
            {profile.loading ? (
              <Notice />
            ) : profile.error ? (
              <Notice error={profile.error} retry={profile.retry} />
            ) : (
              <form onSubmit={purchase}>
                <PersonFields value={purchaser} onChange={setPerson} primary />
                {error && <Notice error={error} />}
                <button className="purchase-primary" disabled={busy}>
                  {busy ? "Creating purchase…" : "Save details and continue"}
                  <span aria-hidden="true">→</span>
                </button>
                <small className="purchase-help">
                  Next:{" "}
                  {Number(product.MaximumMembers) > 1
                    ? "family members, then payment"
                    : "complete your package details and payment"}
                  .
                </small>
              </form>
            )}
          </section>
        </>
      )}
    </AppShell>
  );
}

export function PurchaseFlow() {
  const { orderId, step } = useParams();
  const id = Number(orderId);
  return Number.isSafeInteger(id) && id > 0 ? (
    <OrderFlow key={`${id}/${step}`} id={id} step={step || "payment"} />
  ) : (
    <AppShell>
      <PageHeader title="Purchase" />
      <Link to="/packages">Browse packages</Link>
    </AppShell>
  );
}
function OrderFlow({ id, step }: { id: number; step: string }) {
  const data = useData<Snapshot>(`api/purchases/${id}`);
  const location = useLocation();
  const snapshot = data.data;
  if (
    snapshot &&
    step === "nominees" &&
    allNomineesAdded(snapshot.nomineeProducts, snapshot.nominees) &&
    new URLSearchParams(location.search).get("review") !== "1"
  ) {
    return <Navigate to={`/purchase/${id}/payment`} replace />;
  }
  const label =
    step === "family"
      ? "Family members"
      : step === "nominees"
        ? "Nominee details"
        : "Payment";
  return (
    <AppShell className="purchase-page">
      <PageHeader title={label} />
      {!snapshot ? (
        <Notice error={data.error} retry={data.reload} />
      ) : (
        <>
          <div className="purchase-steps" aria-label="Purchase progress">
            {["family", "nominees", "payment"].map((item, i) => (
              <span
                key={item}
                className={item === step ? "active" : ""}
                aria-current={item === step ? "step" : undefined}
              >
                <b>{i + 1}</b>
                {item === "family"
                  ? "Family"
                  : item === "nominees"
                    ? "Nominees"
                    : "Payment"}
              </span>
            ))}
          </div>
          <section className="purchase-order">
            <span>Order #{id}</span>
            <h2>{textValue(snapshot.product, "ProductName")}</h2>
            <strong>{currency(snapshot.order.PayableAmount)}</strong>
            <p>{textValue(snapshot.order, "FullName")}</p>
          </section>
          {step === "family" ? (
            <FamilyStep id={id} snapshot={snapshot} reload={data.reload} />
          ) : step === "nominees" ? (
            <NomineeStep id={id} snapshot={snapshot} reload={data.reload} />
          ) : (
            <PaymentStep id={id} snapshot={snapshot} />
          )}
        </>
      )}
    </AppShell>
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
  const [person, setPerson] = useState<Person>({
    ...blankPerson,
    relationship: spouseRequired ? "Spouse" : "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const dependents = usePortalData(
    `api/Customer/GetDependentsByCustomerId/${getSessionMember()?.MemberId}`,
  );
  const limit = Math.max(0, Number(snapshot.product.MaximumMembers) - 1);
  async function add(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await apiRequest(`api/purchases/${id}/family`, {
        body: {
          ...person,
          relationship: spouseRequired ? "Spouse" : person.relationship,
          mobileNumber: person.mobileNumber || undefined,
        },
      });
      setPerson(blankPerson);
      reload();
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Unable to add family member.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function remove(memberId: number) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await apiRequest(`api/purchases/${id}/family/${memberId}/remove`, {
        body: {},
      });
      reload();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to remove family member.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="purchase-panel">
      <h2>{spouseRequired ? "Add your spouse" : "Add your family"}</h2>
      <p>
        Your package covers up to {limit + 1} members, including you.{" "}
        {spouseRequired
          ? "Spouse details are required for this package."
          : "Add the family members you want to include, or continue with yourself."}
      </p>
      <ul className="purchase-people">
        <li>
          <div>
            <b>{textValue(snapshot.order, "FullName")}</b>
            <small>
              Primary member · {textValue(snapshot.order, "Age")} years
            </small>
          </div>
          <span className="purchase-tag">You</span>
        </li>
        {snapshot.family.map((member) => (
          <li key={textValue(member, "OrdersId")}>
            <div>
              <b>{textValue(member, "FullName")}</b>
              <small>
                {textValue(member, "Relationship")} · {textValue(member, "Age")}{" "}
                years
              </small>
            </div>
            <button
              className="purchase-text"
              disabled={busy}
              onClick={() => void remove(Number(member.OrdersId))}
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
      {snapshot.family.length < limit && (
        <form onSubmit={add}>
          {dependents.rows.length > 0 && (
            <label className="purchase-existing">
              Use an existing family member
              <select
                defaultValue=""
                onChange={(event) => {
                  const row = dependents.rows.find(
                    (row) => String(row.CustomerId) === event.target.value,
                  );
                  if (row)
                    setPerson({
                      fullName: textValue(row, "Name"),
                      dateofBirth: dateInput(row.DateofBirth),
                      gender: textValue(row, "Gender"),
                      relationship: textValue(row, "Relationship"),
                      mobileNumber: textValue(row, "MobileNumber"),
                    });
                }}
              >
                <option value="">Select a family member</option>
                {dependents.rows.map((row) => (
                  <option
                    key={textValue(row, "CustomerId")}
                    value={textValue(row, "CustomerId")}
                  >
                    {textValue(row, "Name")}
                  </option>
                ))}
              </select>
            </label>
          )}
          <PersonFields
            value={person}
            onChange={setPerson}
            spouse={spouseRequired}
          />
          <button className="purchase-secondary" disabled={busy}>
            {busy ? "Saving…" : "Add member"}
          </button>
        </form>
      )}
      {error && <Notice error={error} />}
      <button
        className="purchase-primary"
        disabled={busy || spouseRequired}
        onClick={() =>
          navigate(
            `/purchase/${id}/${allNomineesAdded(snapshot.nomineeProducts, snapshot.nominees) ? "payment" : "nominees"}`,
          )
        }
      >
        Continue<span aria-hidden="true">→</span>
      </button>
    </section>
  );
}
function NomineeMemberCard({
  member,
  selected = false,
  onSelect,
  label,
}: {
  member: PortalRow;
  selected?: boolean;
  onSelect?: () => void;
  label?: string;
}) {
  const name = textValue(member, "FullName");
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("");
  const birthday = dateInput(member.DateofBirth);
  const content = (
    <>
      <div className="nominee-member-top">
        <span className="nominee-avatar" aria-hidden="true">
          {initials}
        </span>
        <div>
          <h3>{name}</h3>
          <span className="nominee-relation">
            {textValue(member, "Relationship") || "Primary member"}
          </span>
        </div>
        {onSelect && (
          <span className="nominee-selection-mark" aria-hidden="true">
            {selected ? "✓" : ""}
          </span>
        )}
      </div>
      <dl className="nominee-member-details">
        <div>
          <dt>Age</dt>
          <dd>{textValue(member, "Age")} years</dd>
        </div>
        <div>
          <dt>Gender</dt>
          <dd>{textValue(member, "Gender") || "Not provided"}</dd>
        </div>
        <div>
          <dt>Date of birth</dt>
          <dd>
            {birthday
              ? new Date(birthday + "T00:00:00").toLocaleDateString("en-IN", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })
              : "Not provided"}
          </dd>
        </div>
        <div>
          <dt>Mobile number</dt>
          <dd>{textValue(member, "MobileNumber") || "Not provided"}</dd>
        </div>
      </dl>
      <span className="nominee-card-caption">
        {onSelect
          ? selected
            ? "Selected"
            : "Tap to select"
          : "You · Primary member"}
      </span>
    </>
  );
  return onSelect ? (
    <button
      type="button"
      className={
        "nominee-member-card" + (selected ? " is-nominee-selected" : "")
      }
      aria-pressed={selected}
      aria-label={label}
      onClick={onSelect}
    >
      {content}
    </button>
  ) : (
    <div className="nominee-member-card primary-member">{content}</div>
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
  const [selectedMember, setSelectedMember] = useState<number | null>(() => {
    const saved = snapshot.nominees[0];
    const member = snapshot.family.find(
      (row) =>
        textValue(row, "FullName") === textValue(saved, "FullName") &&
        textValue(row, "Relationship") === textValue(saved, "Relationship"),
    );
    return member ? Number(member.OrdersId) : null;
  });
  const [guardianId, setGuardianId] = useState<number | null>(
    Number(snapshot.order.Age) >= 18 ? id : null,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const navigate = useNavigate();
  const allAdded = allNomineesAdded(
    snapshot.nomineeProducts,
    snapshot.nominees,
  );
  const selected = snapshot.family.find(
    (row) => Number(row.OrdersId) === selectedMember,
  );
  const minor = selected && Number(selected.Age) < 18;
  const guardians = [snapshot.order, ...snapshot.family].filter(
    (row) => Number(row.Age) >= 18 && Number(row.OrdersId) !== selectedMember,
  );
  const showSelection = !allAdded || editing;
  async function save(event: FormEvent) {
    event.preventDefault();
    if (busy || !selectedMember) return;
    setBusy(true);
    setError("");
    try {
      for (const product of snapshot.nomineeProducts) {
        await apiRequest(`api/purchases/${id}/nominees`, {
          body: {
            productsId: Number(product.ProductsId),
            familyOrderId: selectedMember,
            ...(minor ? { guardianOrderId: guardianId } : {}),
          },
        });
      }
      setEditing(false);
      reload();
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Unable to save your nominee.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="purchase-panel nominee-panel">
      <span className="purchase-eyebrow">FAMILY FIRST</span>
      <h2>
        {allAdded && !editing
          ? "Your nominee details"
          : "Protect the people who matter"}
      </h2>
      <p>
        {allAdded && !editing
          ? "Your nominee is saved. You can review or change your selection before payment."
          : "Choose one family member as your nominee. Their saved details will be used for all products in this package that require a nominee."}
      </p>
      {allAdded && !editing && (
        <>
          <div className="nominee-saved-list">
            {snapshot.nomineeProducts.map((product) => {
              const nominee = snapshot.nominees.find(
                (row) => Number(row.ProductsId) === Number(product.ProductsId),
              );
              return (
                <div key={textValue(product, "ProductsId")}>
                  <span className="nominee-saved-check" aria-hidden="true">
                    ✓
                  </span>
                  <div>
                    <strong>{textValue(nominee, "FullName")}</strong>
                    <small>
                      {textValue(nominee, "Relationship")} ·{" "}
                      {textValue(product, "ProductName")}
                    </small>
                  </div>
                </div>
              );
            })}
          </div>
          <button
            className="purchase-secondary"
            onClick={() => setEditing(true)}
          >
            Change nominee
          </button>
        </>
      )}
      {showSelection && (
        <form onSubmit={save}>
          <fieldset className="nominee-card-fieldset" disabled={busy}>
            <legend>Your family members</legend>
            <p className="nominee-selection-help">
              Select a card to choose your nominee.
            </p>
            <div className="nominee-member-grid">
              <NomineeMemberCard member={snapshot.order} />
              {snapshot.family.map((member) => (
                <NomineeMemberCard
                  key={textValue(member, "OrdersId")}
                  member={member}
                  selected={selectedMember === Number(member.OrdersId)}
                  label={
                    "Select " + textValue(member, "FullName") + " as nominee"
                  }
                  onSelect={() => setSelectedMember(Number(member.OrdersId))}
                />
              ))}
            </div>
          </fieldset>
          {snapshot.family.length === 0 && (
            <div className="purchase-notice">
              <strong>Add a family member to choose your nominee</strong>
              <span>
                Your nominee must be a family member included in this package.
              </span>
              <Link
                className="purchase-secondary"
                to={`/purchase/${id}/family`}
              >
                Add a family member
              </Link>
            </div>
          )}
          {minor && (
            <fieldset className="nominee-card-fieldset" disabled={busy}>
              <legend>Choose an adult guardian</legend>
              <p className="nominee-selection-help">
                A nominee under 18 needs an adult guardian. Select a family
                member below.
              </p>
              <div className="nominee-member-grid">
                {guardians.map((member) => (
                  <NomineeMemberCard
                    key={textValue(member, "OrdersId")}
                    member={member}
                    selected={guardianId === Number(member.OrdersId)}
                    label={
                      "Select " + textValue(member, "FullName") + " as guardian"
                    }
                    onSelect={() => setGuardianId(Number(member.OrdersId))}
                  />
                ))}
              </div>
              {guardians.length === 0 && (
                <p>
                  Add an adult family member before choosing a minor nominee.
                </p>
              )}
            </fieldset>
          )}
          {selected && (
            <div className="nominee-choice-summary">
              <span aria-hidden="true">✓</span>
              <div>
                <b>{textValue(selected, "FullName")}</b>
                <small>
                  Your selected nominee · {textValue(selected, "Relationship")}
                </small>
              </div>
            </div>
          )}
          {error && <Notice error={error} />}
          <button
            className="purchase-primary"
            disabled={busy || !selectedMember || Boolean(minor && !guardianId)}
          >
            {busy ? "Saving nominee…" : "Save nominee and continue"}
            <span aria-hidden="true">→</span>
          </button>
        </form>
      )}
      {allAdded && !editing && (
        <button
          className="purchase-primary"
          onClick={() => navigate(`/purchase/${id}/payment`)}
        >
          Continue to payment<span aria-hidden="true">→</span>
        </button>
      )}
    </section>
  );
}
function PaymentStep({ id, snapshot }: { id: number; snapshot: Snapshot }) {
  const [method, setMethod] = useState(
    Number(snapshot.paymentMethods[0]?.PaymentTypeId),
  );
  const [link, setLink] = useState<PaymentLink | null>(null);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const checking = useRef(false);
  async function check() {
    if (checking.current) return;
    checking.current = true;
    try {
      const result = await apiRequest<PaymentStatus>(
        `api/purchases/${id}/payment-status`,
      );
      setStatus(result.status);
      if (result.link) setLink(result.link);
      setError("");
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to verify payment status.",
      );
    } finally {
      checking.current = false;
    }
  }
  useEffect(() => {
    const controller = new AbortController();
    let inFlight = false;
    async function poll() {
      if (inFlight) return;
      inFlight = true;
      try {
        const result = await apiRequest<PaymentStatus>(
          `api/purchases/${id}/payment-status`,
          { signal: controller.signal },
        );
        if (!controller.signal.aborted) {
          setStatus(result.status);
          if (result.link) setLink(result.link);
          setError("");
        }
      } catch (error) {
        if (!controller.signal.aborted)
          setError(
            error instanceof Error
              ? error.message
              : "Unable to verify payment.",
          );
      } finally {
        inFlight = false;
      }
    }
    void poll();
    const timer = window.setInterval(() => {
      if (
        !document.hidden &&
        status !== "COMPLETED" &&
        status !== "EXPIRED" &&
        status !== "CANCELLED"
      )
        void poll();
    }, 10000);
    return () => {
      controller.abort();
      window.clearInterval(timer);
    };
  }, [id, status]);
  async function pay() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const result = await apiRequest<PaymentLink>(
        `api/purchases/${id}/payment`,
        { body: { paymentTypeId: method } },
      );
      setLink(result);
      setStatus(result.status);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Unable to start payment.",
      );
    } finally {
      setBusy(false);
    }
  }
  if (status === "COMPLETED" || status === "PAID")
    return (
      <section className="purchase-panel purchase-success">
        <span aria-hidden="true">✓</span>
        <h2>Payment received</h2>
        <p>
          {status === "COMPLETED"
            ? "Your package purchase is complete."
            : "Your payment is verified. We’re activating your package; this page will update automatically."}
        </p>
        <Link className="purchase-primary" to="/PurchasedPackages">
          View my packages
        </Link>
        <Link className="purchase-text" to="/home">
          Back to home
        </Link>
        {error && <Notice error={error} />}
      </section>
    );
  const active = link && status === "ACTIVE";
  return (
    <section className="purchase-panel">
      <h2>Complete your purchase</h2>
      <p>
        Choose how you’d like to pay. Your payment is handled securely by
        Cashfree.
      </p>
      <div className="purchase-payment-total">
        <span>Amount to pay</span>
        <strong>{currency(snapshot.order.PayableAmount)}</strong>
        <small>Inclusive of applicable taxes</small>
      </div>
      {!active &&
        snapshot.paymentMethods.map((row) => (
          <label
            className="purchase-payment-option"
            key={textValue(row, "PaymentTypeId")}
          >
            <input
              type="radio"
              name="payment-method"
              checked={method === Number(row.PaymentTypeId)}
              onChange={() => setMethod(Number(row.PaymentTypeId))}
            />
            <span>
              <b>{textValue(row, "PaymentTypeName")}</b>
              <small>
                {Number(row.PaymentTypeId) === 5
                  ? "Pay using your preferred UPI app"
                  : "Continue to secure online checkout"}
              </small>
            </span>
          </label>
        ))}
      {error && <Notice error={error} />}
      {active ? (
        <>
          <a
            className="purchase-primary"
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            Open secure payment<span aria-hidden="true">↗</span>
          </a>
          <p className="purchase-help">
            Payment opens in a new tab. Return here after paying to see your
            confirmation. Link expires at{" "}
            {new Date(link.expiresAt).toLocaleTimeString("en-IN", {
              hour: "2-digit",
              minute: "2-digit",
            })}
            .
          </p>
          <button className="purchase-secondary" onClick={() => void check()}>
            Check payment status
          </button>
        </>
      ) : (
        <>
          <button
            className="purchase-primary"
            disabled={busy || !method}
            onClick={() => void pay()}
          >
            {busy
              ? "Preparing payment…"
              : link
                ? "Create a new payment link"
                : "Continue to secure payment"}
            <span aria-hidden="true">→</span>
          </button>
          {!snapshot.paymentMethods.length && (
            <p className="purchase-help">
              No payment methods are currently available. Please contact
              support.
            </p>
          )}
          {(status === "EXPIRED" || status === "CANCELLED") && (
            <p className="purchase-help">
              The previous payment link {status.toLowerCase()}. You can create a
              new one.
            </p>
          )}
        </>
      )}
      <Link
        className="purchase-text"
        to={`/purchase/${id}/${snapshot.nomineeProducts.length ? "nominees?review=1" : "family"}`}
      >
        Review purchase details
      </Link>
    </section>
  );
}
