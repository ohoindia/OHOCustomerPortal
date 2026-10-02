import { UI_TEXT, UI_MESSAGES } from "../../../common/content/labels";
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
  formatHomeDate(value ?? undefined) || UI_TEXT.notProvided;
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
          ? UI_TEXT.notProvided
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
          name: person.DependentFullName || UI_TEXT.nameNotProvided,
          relationship: person.DependentRelationship || UI_TEXT.familyMember,
          dob: person.DependentDateofBirth,
          gender: person.DependentGender,
        })),
        ...(policy.Insurer ?? []).map((person) => ({
          name: person.InsurerName || UI_TEXT.nameNotProvided,
          relationship: person.InsurerRelationship || UI_TEXT.coveredMember,
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
      <PageHeader title={UI_TEXT.accountDetails2} />
      <section className="account-intro">
        <span>{UI_TEXT.yourFamilyHealthAccount}</span>
        <h2>{member?.Name || UI_TEXT.yourAccount}</h2>
        <p>{UI_TEXT.membershipFamilyCoverageAndPackageValidityInOnePlace}</p>
      </section>
      {!data && <p role="status">{UI_TEXT.loadingAccountDetails}</p>}
      {Boolean(data?.errors.length) && (
        <aside className="account-notice" role="status">
          <p>{UI_TEXT.someDetailsCouldNotBeLoaded}</p>
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
            {UI_TEXT.tryAgain}
          </button>
        </aside>
      )}
      <section className="account-section">
        <h2>{UI_TEXT.accountHolder}</h2>
        <dl className="account-fields">
          <Field label={UI_TEXT.fullName} value={member?.Name} />
          <Field
            label={UI_TEXT.memberId}
            value={member?.MemberId || undefined}
          />
          <Field label={UI_TEXT.mobileNumber} value={member?.MobileNumber} />
          <Field label={UI_TEXT.email} value={member?.Email} />
          <Field
            label={UI_TEXT.dateOfBirth}
            value={date(member?.DateofBirth)}
          />
          <Field label={UI_TEXT.age} value={member?.Age} />
          <Field label={UI_TEXT.gender} value={member?.Gender} />
          <Field label={UI_TEXT.group} value={data?.groupName} />
          <Field label={UI_TEXT.address} value={address} />
          <Field
            label={UI_TEXT.kycVerification}
            value={
              !data
                ? UI_TEXT.loading
                : data.kyc === undefined
                  ? UI_TEXT.unavailable
                  : data.kyc
                    ? UI_TEXT.verified
                    : UI_TEXT.incomplete
            }
          />
          <Field
            label={UI_TEXT.addressVerification}
            value={
              !data
                ? UI_TEXT.loading
                : data.address === undefined
                  ? UI_TEXT.unavailable
                  : data.address
                    ? UI_TEXT.verified
                    : UI_TEXT.incomplete
            }
          />
        </dl>
      </section>
      <section className="account-section">
        <h2>{UI_TEXT.membership}</h2>
        <dl className="account-fields">
          <Field
            label={UI_TEXT.status}
            value={
              !data
                ? UI_TEXT.loading
                : !data.membershipLoaded && data.hasMember
                  ? UI_TEXT.unavailable
                  : cardStatus(data.card)
            }
          />
          <Field label={UI_TEXT.cardNumber} value={data?.card?.OHOCardnumber} />
          <Field
            label={UI_TEXT.validFrom}
            value={date(data?.card?.StartDate)}
          />
          <Field label={UI_TEXT.validUntil} value={date(data?.card?.EndDate)} />
        </dl>
        <MembershipCard data={data} />
      </section>
      <section className="account-section">
        <h2>{UI_TEXT.familyMembers}</h2>
        <p className="account-caption">
          {UI_TEXT.accountHolderAndFamilyMembersListedInYourPackage}
        </p>
        <article className="account-person">
          <h3>{member?.Name || UI_TEXT.accountHolder}</h3>
          <span className="account-status is-active">
            {UI_TEXT.selfAccountHolder}
          </span>
          <p>
            {[
              member?.Gender,
              member?.Age != null ? UI_MESSAGES.ageInYears(member.Age) : "",
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </article>
        {[...family.entries()].map(([key, person]) => (
          <article className="account-person" key={key}>
            <h3>{person.name}</h3>
            <span className="account-status">{person.relationship}</span>
            <dl className="account-fields">
              <Field label={UI_TEXT.dateOfBirth} value={date(person.dob)} />
              <Field label={UI_TEXT.gender} value={person.gender} />
              {person.mobile && (
                <Field label={UI_TEXT.mobile} value={person.mobile} />
              )}
            </dl>
            <div className="account-coverage">
              <h4>{UI_TEXT.packageCoverage}</h4>
              {[...person.packages.entries()].map(([id, product]) => (
                <dl className="account-fields" key={id}>
                  <Field
                    label={UI_TEXT.package}
                    value={product.ProductName || UI_TEXT.package}
                  />
                  <Field
                    label={UI_TEXT.validityStatus}
                    value={expiryStatus(product.ValidTill, now)}
                  />
                  <Field
                    label={UI_TEXT.issuedOn}
                    value={date(product.IssuedOn)}
                  />
                  <Field
                    label={UI_TEXT.validUntil}
                    value={date(product.ValidTill)}
                  />
                </dl>
              ))}
            </div>
          </article>
        ))}
        {!data ? (
          <p>{UI_TEXT.loadingFamilyDetails}</p>
        ) : products === null && data.hasMember ? (
          <p>{UI_TEXT.familyCoverageUnavailablePleaseTryAgainLater}</p>
        ) : (
          !family.size && (
            <p>{UI_TEXT.noAdditionalFamilyMembersListedInYourPackageRecords}</p>
          )
        )}
      </section>
      <section className="account-section">
        <div className="account-section-heading">
          <h2>{UI_TEXT.packagesValidity}</h2>
          <button onClick={() => navigate("/packages")}>
            {UI_TEXT.explorePackages}
          </button>
        </div>
        {!data ? (
          <p>{UI_TEXT.loadingPackages}</p>
        ) : products === null && data.hasMember ? (
          <p>{UI_TEXT.packagesUnavailablePleaseTryAgainLater}</p>
        ) : !products?.length ? (
          <p>{UI_TEXT.noPurchasedPackages}</p>
        ) : (
          products.map((product, index) => {
            const expiry = expiryStatus(product.ValidTill, now);
            const status =
              expiry === UI_TEXT.expired
                ? expiry
                : product.IsActive === false
                  ? UI_TEXT.inactive
                  : Date.parse(product.IssuedOn ?? "") > now.getTime()
                    ? UI_TEXT.notStarted
                    : expiry === UI_TEXT.valid
                      ? UI_TEXT.active
                      : expiry;
            return (
              <article
                className="account-package"
                key={product.MemberProductProductsId ?? index}
              >
                <div className="account-section-heading">
                  <h3>{product.ProductName || UI_TEXT.package}</h3>
                  <span
                    className={`account-status ${status === UI_TEXT.active ? "is-active" : status === UI_TEXT.expired ? "is-expired" : ""}`}
                  >
                    {status}
                  </span>
                </div>
                {product.ShortDescription && <p>{product.ShortDescription}</p>}
                <dl className="account-fields">
                  <Field
                    label={UI_TEXT.issuedOn}
                    value={date(product.IssuedOn)}
                  />
                  <Field
                    label={UI_TEXT.validUntil}
                    value={date(product.ValidTill)}
                  />
                  <Field label={UI_TEXT.expiryStatus} value={expiry} />
                  {product.ProductCategoryName && (
                    <Field
                      label={UI_TEXT.category}
                      value={product.ProductCategoryName}
                    />
                  )}
                  {product.PaidAmount != null && (
                    <Field
                      label={UI_TEXT.amountPaid}
                      value={money(product.PaidAmount)}
                    />
                  )}
                  {product.SumAssured != null && product.SumAssured > 0 && (
                    <Field
                      label={UI_TEXT.sumAssured}
                      value={money(product.SumAssured)}
                    />
                  )}
                  {product.MaximumAdult != null && (
                    <Field
                      label={UI_TEXT.adultLimit}
                      value={product.MaximumAdult}
                    />
                  )}
                  {product.MaximumChild != null && (
                    <Field
                      label={UI_TEXT.childLimit}
                      value={product.MaximumChild}
                    />
                  )}
                  {product.MaximumMembers != null && (
                    <Field
                      label={UI_TEXT.memberLimit}
                      value={product.MaximumMembers}
                    />
                  )}
                </dl>
                {product.Policies?.map((policy, i) => (
                  <div className="account-policy" key={policy.PoliciesId ?? i}>
                    <h4>{policy.PoliciesProductName || UI_TEXT.policy}</h4>
                    {policy.PolicyCOINumber && (
                      <p>
                        {UI_TEXT.policyCoiNumber}
                        {policy.PolicyCOINumber}
                      </p>
                    )}
                    {policy.Nominees?.map((nominee, j) => (
                      <p key={nominee.NomineeId ?? j}>
                        {UI_TEXT.nominee}
                        {nominee.NomineeFullName || UI_TEXT.notProvided}
                        {nominee.NomineeRelationship
                          ? UI_MESSAGES.relationshipSuffix(
                              nominee.NomineeRelationship,
                            )
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
          <h2>{UI_TEXT.needHelpWithYourAccount}</h2>
          <a
            href={`tel:${data.config.OHOCareMobileNumber.replace(/[^+\d]/g, "")}`}
          >
            {UI_TEXT.call}
            {data.config.OHOCareMobileNumber}
          </a>
        </section>
      )}
    </AppShell>
  );
}
