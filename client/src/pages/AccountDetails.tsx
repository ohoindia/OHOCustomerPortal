import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { AppShell, PageHeader } from "../components/Layout";
import MembershipCard from "../components/AccountDetails";
import { getSessionMember } from "./auth/member";
import {
  loadHomeData,
  formatHomeDate,
  expiryStatus,
  cardStatus,
  type MemberProduct,
} from "../services/home";
import "./home-member.css";
import "./account-details.css";

const date = (value?: string | null) =>
  formatHomeDate(value ?? undefined) || "Not provided";
const money = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);

function Field({ label, value }: { label: string; value?: ReactNode }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>
        {value === null || value === undefined || value === ""
          ? "Not provided"
          : value}
      </dd>
    </div>
  );
}

export default function AccountDetailsPage() {
  const navigate = useNavigate();
  const [sessionMember] = useState(getSessionMember);
  const [data, setData] = useState<Awaited<
    ReturnType<typeof loadHomeData>
  > | null>(null);
  const [retry, setRetry] = useState(0);
  const [now] = useState(() => new Date());
  useEffect(() => {
    const controller = new AbortController();
    void loadHomeData(
      Number(sessionMember?.MemberId || sessionStorage.getItem("memberId")),
      Number(
        sessionMember?.communityCustomerId ||
          sessionStorage.getItem("communityCustomerId"),
      ),
      Number(sessionMember?.GroupId || sessionStorage.getItem("groupId")),
      controller.signal,
    ).then((result) => {
      if (!controller.signal.aborted) setData(result);
    });
    return () => controller.abort();
  }, [sessionMember, retry]);

  const member = data?.customer ?? sessionMember;
  const products = data?.products;
  const family = new Map<
    string,
    {
      name: string;
      relationship: string;
      dob?: string | null;
      gender?: string | null;
      mobile?: string | null;
      packages: Map<string, MemberProduct>;
    }
  >();
  for (const product of products ?? []) {
    for (const policy of product.Policies ?? []) {
      const people = [
        ...(policy.Dependents ?? []).map((person) => ({
          name: person.DependentFullName || "Name not provided",
          relationship: person.DependentRelationship || "Family member",
          dob: person.DependentDateofBirth,
          gender: person.DependentGender,
        })),
        ...(policy.Insurer ?? []).map((person) => ({
          name: person.InsurerName || "Name not provided",
          relationship: person.InsurerRelationship || "Covered member",
          dob: person.InsurerDateofBirth,
          gender: person.InsurerGender,
          mobile: person.InsurerMobileNumber,
        })),
      ];
      for (const person of people) {
        if (
          person.name.trim().toLowerCase() ===
            member?.Name?.trim().toLowerCase() &&
          /^self$/i.test(person.relationship.trim())
        )
          continue;
        const key = `${person.name.trim().toLowerCase()}|${person.relationship.toLowerCase()}|${person.dob ?? ""}`;
        const existing = family.get(key) ?? {
          ...person,
          packages: new Map<string, MemberProduct>(),
        };
        existing.packages.set(
          String(
            product.MemberProductProductsId ??
              `${product.ProductName}|${product.IssuedOn}|${product.ValidTill}`,
          ),
          product,
        );
        family.set(key, existing);
      }
    }
  }
  const address = [
    member?.AddressLine1,
    member?.AddressLine2,
    member?.Village,
    member?.Mandal,
    member?.City,
    member?.MemberDistrictName,
    member?.MemberStateNameState,
    member?.Pincode,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <AppShell nav={false} className="account-page">
      <PageHeader title="Account Details" />
      <section className="account-intro">
        <span>YOUR FAMILY HEALTH ACCOUNT</span>
        <h2>{member?.Name || "Your account"}</h2>
        <p>Membership, family coverage and package validity in one place.</p>
      </section>
      {!data && <p role="status">Loading account details...</p>}
      {Boolean(data?.errors.length) && (
        <aside className="account-notice" role="status">
          <p>Some details could not be loaded.</p>
          <ul>
            {data?.errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
          <button
            onClick={() => {
              setData(null);
              setRetry((value) => value + 1);
            }}
          >
            Try again
          </button>
        </aside>
      )}
      <section className="account-section">
        <h2>Account holder</h2>
        <dl className="account-fields">
          <Field label="Full name" value={member?.Name} />
          <Field label="Member ID" value={member?.MemberId || undefined} />
          <Field label="Mobile number" value={member?.MobileNumber} />
          <Field label="Email" value={member?.Email} />
          <Field label="Date of birth" value={date(member?.DateofBirth)} />
          <Field label="Age" value={member?.Age} />
          <Field label="Gender" value={member?.Gender} />
          <Field label="Group" value={data?.groupName} />
          <Field label="Address" value={address} />
          <Field
            label="KYC verification"
            value={
              !data
                ? "Loading..."
                : data.kyc === undefined
                  ? "Unavailable"
                  : data.kyc
                    ? "Verified"
                    : "Incomplete"
            }
          />
          <Field
            label="Address verification"
            value={
              !data
                ? "Loading..."
                : data.address === undefined
                  ? "Unavailable"
                  : data.address
                    ? "Verified"
                    : "Incomplete"
            }
          />
        </dl>
      </section>
      <section className="account-section">
        <h2>Membership</h2>
        <dl className="account-fields">
          <Field
            label="Status"
            value={
              !data
                ? "Loading..."
                : !data.membershipLoaded && data.hasMember
                  ? "Unavailable"
                  : cardStatus(data.card)
            }
          />
          <Field label="Card number" value={data?.card?.OHOCardnumber} />
          <Field label="Valid from" value={date(data?.card?.StartDate)} />
          <Field label="Valid until" value={date(data?.card?.EndDate)} />
        </dl>
        <MembershipCard data={data} />
      </section>
      <section className="account-section">
        <h2>Family members</h2>
        <p className="account-caption">
          Account holder and family members listed in your package policies.
        </p>
        <article className="account-person">
          <h3>{member?.Name || "Account holder"}</h3>
          <span className="account-status is-active">
            Self · Account holder
          </span>
          <p>
            {[member?.Gender, member?.Age != null ? `${member.Age} years` : ""]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </article>
        {[...family.entries()].map(([key, person]) => (
          <article className="account-person" key={key}>
            <h3>{person.name}</h3>
            <span className="account-status">{person.relationship}</span>
            <dl className="account-fields">
              <Field label="Date of birth" value={date(person.dob)} />
              <Field label="Gender" value={person.gender} />
              {person.mobile && <Field label="Mobile" value={person.mobile} />}
            </dl>
            <div className="account-coverage">
              <h4>Package coverage</h4>
              {[...person.packages.entries()].map(([id, product]) => (
                <dl className="account-fields" key={id}>
                  <Field
                    label="Package"
                    value={product.ProductName || "Package"}
                  />
                  <Field
                    label="Validity status"
                    value={expiryStatus(product.ValidTill, now)}
                  />
                  <Field label="Issued on" value={date(product.IssuedOn)} />
                  <Field label="Valid until" value={date(product.ValidTill)} />
                </dl>
              ))}
            </div>
          </article>
        ))}
        {!data ? (
          <p>Loading family details...</p>
        ) : products === null && data.hasMember ? (
          <p>Family coverage unavailable. Please try again later.</p>
        ) : (
          !family.size && (
            <p>No additional family members listed in your package records.</p>
          )
        )}
      </section>
      <section className="account-section">
        <div className="account-section-heading">
          <h2>Packages & validity</h2>
          <button onClick={() => navigate("/packages")}>
            Explore packages
          </button>
        </div>
        {!data ? (
          <p>Loading packages...</p>
        ) : products === null && data.hasMember ? (
          <p>Packages unavailable. Please try again later.</p>
        ) : !products?.length ? (
          <p>No purchased packages.</p>
        ) : (
          products.map((product, index) => {
            const expiry = expiryStatus(product.ValidTill, now);
            const status =
              expiry === "Expired"
                ? expiry
                : product.IsActive === false
                  ? "Inactive"
                  : Date.parse(product.IssuedOn ?? "") > now.getTime()
                    ? "Not started"
                    : expiry === "Valid"
                      ? "Active"
                      : expiry;
            return (
              <article
                className="account-package"
                key={product.MemberProductProductsId ?? index}
              >
                <div className="account-section-heading">
                  <h3>{product.ProductName || "Package"}</h3>
                  <span
                    className={`account-status ${status === "Active" ? "is-active" : status === "Expired" ? "is-expired" : ""}`}
                  >
                    {status}
                  </span>
                </div>
                {product.ShortDescription && <p>{product.ShortDescription}</p>}
                <dl className="account-fields">
                  <Field label="Issued on" value={date(product.IssuedOn)} />
                  <Field label="Valid until" value={date(product.ValidTill)} />
                  <Field label="Expiry status" value={expiry} />
                  {product.ProductCategoryName && (
                    <Field
                      label="Category"
                      value={product.ProductCategoryName}
                    />
                  )}
                  {product.PaidAmount != null && (
                    <Field
                      label="Amount paid"
                      value={money(product.PaidAmount)}
                    />
                  )}
                  {product.SumAssured != null && product.SumAssured > 0 && (
                    <Field
                      label="Sum assured"
                      value={money(product.SumAssured)}
                    />
                  )}
                  {product.MaximumAdult != null && (
                    <Field label="Adult limit" value={product.MaximumAdult} />
                  )}
                  {product.MaximumChild != null && (
                    <Field label="Child limit" value={product.MaximumChild} />
                  )}
                  {product.MaximumMembers != null && (
                    <Field
                      label="Member limit"
                      value={product.MaximumMembers}
                    />
                  )}
                </dl>
                {product.Policies?.map((policy, i) => (
                  <div className="account-policy" key={policy.PoliciesId ?? i}>
                    <h4>{policy.PoliciesProductName || "Policy"}</h4>
                    {policy.PolicyCOINumber && (
                      <p>Policy / COI number: {policy.PolicyCOINumber}</p>
                    )}
                    {policy.Nominees?.map((nominee, j) => (
                      <p key={nominee.NomineeId ?? j}>
                        Nominee: {nominee.NomineeFullName || "Not provided"}
                        {nominee.NomineeRelationship
                          ? ` (${nominee.NomineeRelationship})`
                          : ""}
                      </p>
                    ))}
                  </div>
                ))}
              </article>
            );
          })
        )}
      </section>
      {data?.config.OHOCareMobileNumber && (
        <section className="account-section">
          <h2>Need help with your account?</h2>
          <a
            href={`tel:${data.config.OHOCareMobileNumber.replace(/[^+\d]/g, "")}`}
          >
            Call {data.config.OHOCareMobileNumber}
          </a>
        </section>
      )}
    </AppShell>
  );
}
