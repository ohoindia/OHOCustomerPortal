import { DISPLAY_FORMAT } from "../../../../common/content/config";
import { APP_LINKS } from "../../../../common/content/config";
import {
  portalServices,
  customerProfileFields,
  familyMemberFields,
  bookingPeriods,
  appointmentFields,
  policyFields,
  insurerFields,
  dependentFields,
  nomineeFields,
  packageValidityFields,
  hospitalFields,
  productFields,
} from "../../../../common/content/options";
import { UI_TEXT, UI_MESSAGES } from "../../../../common/content/labels";
import { useState } from "react";
import type { ReactNode } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { AppShell, PageHeader, Logo } from "../../components/Layout";
import { getSessionMember } from "../auth/member";
import { authRequest, remainingSeconds } from "../auth/api";
import { apiRequest } from "../../services/api";
import { childRows, textValue, usePortalData } from "./usePortalData";
import type { PortalRow } from "./usePortalData";
import "./portal.css";
import { HospitalDirectory } from "../discovery/HospitalDirectory";
import { bookingPeriod } from "../../../../common/utils/bookings";
import "../booking/bookings.css";

function customerId() {
  return Number(getSessionMember()?.MemberId || 0);
}
function Page({ title, children }: { title: string; children: ReactNode }) {
  return (
    <AppShell className="portal-page">
      <PageHeader title={title} />
      <div className="portal-content">{children}</div>
    </AppShell>
  );
}
function Status({ data }: { data: ReturnType<typeof usePortalData> }) {
  if (data.loading) return <p role="status">{UI_TEXT.loadingDetails}</p>;
  if (data.error)
    return (
      <div role="alert">
        <p>{data.error}</p>
        <button className="outline-btn" onClick={data.retry}>
          {UI_TEXT.tryAgain}
        </button>
      </div>
    );
  return null;
}
function Fields({
  row,
  fields,
}: {
  row?: PortalRow;
  fields: [string, string][];
}) {
  return (
    <dl className="portal-fields">
      {fields.map(([key, label]) => (
        <div key={key}>
          <dt>{label}</dt>
          <dd>{textValue(row, key) || UI_TEXT.notProvided}</dd>
        </div>
      ))}
    </dl>
  );
}

const portalLinks = portalServices;
export function PortalMenu() {
  return (
    <Page title={UI_TEXT.moreServices}>
      <nav className="portal-links" aria-label={UI_TEXT.customerServices}>
        {portalLinks.map(([title, path]) => (
          <Link key={path} to={path}>
            {title}
            <span aria-hidden="true">{UI_TEXT.chevronRight}</span>
          </Link>
        ))}
      </nav>
    </Page>
  );
}

export function CustomerProfile() {
  const id = customerId();
  return id ? (
    <MemberProfile id={id} />
  ) : (
    <Page title={UI_TEXT.myProfile}>
      <p>
        {UI_TEXT.customerProfileDetailsAreAvailableForIndividualMemberships}
      </p>
    </Page>
  );
}
function MemberProfile({ id }: { id: number }) {
  const data = usePortalData(`api/Customer/GetById/${id}`);
  return (
    <Page title={UI_TEXT.myProfile}>
      <Status data={data} />
      {!data.loading && !data.error && (
        <>
          <Fields row={data.rows[0]} fields={customerProfileFields} />
          <Link to="/kyc-verification">{UI_TEXT.viewKycStatus}</Link>
        </>
      )}
    </Page>
  );
}

export function FamilyMembers() {
  const id = customerId();
  return id ? (
    <DependentList id={id} />
  ) : (
    <Page title={UI_TEXT.familyMembers2}>
      <p>{UI_TEXT.noIndividualCustomerMembershipIsLinkedToThisAccount}</p>
    </Page>
  );
}
function DependentList({ id }: { id: number }) {
  const data = usePortalData(`api/Customer/GetDependentsByCustomerId/${id}`);
  return (
    <Page title={UI_TEXT.familyMembers2}>
      <Status data={data} />
      {data.rows.map((row) => (
        <article className="portal-card" key={textValue(row, "CustomerId")}>
          <Fields row={row} fields={familyMemberFields} />
        </article>
      ))}
      {!data.loading && !data.error && !data.rows.length && (
        <p>{UI_TEXT.noFamilyMembersHaveBeenAdded}</p>
      )}
    </Page>
  );
}

export function PurchasedPackages() {
  const id = customerId();
  return id ? (
    <SubscriptionDetails id={id} />
  ) : (
    <Page title={UI_TEXT.myMembership}>
      <p>{UI_TEXT.noIndividualCustomerMembershipIsLinkedToThisAccount}</p>
      <Link to="/account-details">{UI_TEXT.viewAccountDetails}</Link>
    </Page>
  );
}
export function ConsultationList() {
  const id = customerId();
  return id ? (
    <Consultations id={id} />
  ) : (
    <Page title={UI_TEXT.myBookings}>
      <p>{UI_TEXT.noIndividualCustomerMembershipIsLinkedToThisAccount}</p>
    </Page>
  );
}
function Consultations({ id }: { id: number }) {
  const [period, setPeriod] = useState<string>(UI_TEXT.all);
  const data = usePortalData(
    "api/BookingConsultation/PendingAndSuccessConsultationList",
    { customerId: id },
  );
  const location = useLocation();
  const bookingId = new URLSearchParams(location.search).get("bookingId");
  const rows = bookingId
    ? data.rows.filter(
        (row) => textValue(row, "BookingConsultationId") === bookingId,
      )
    : data.rows.filter(
        (row) => period === UI_TEXT.all || bookingPeriod(row) === period,
      );
  return (
    <AppShell className="bookings-page">
      <PageHeader
        title={bookingId ? UI_TEXT.bookingDetails : UI_TEXT.myBookings}
      />
      <div className="bookings-content">
        {!bookingId && (
          <section className="bookings-intro">
            <span className="bookings-eyebrow">
              {UI_TEXT.yourCareInOnePlace}
            </span>
            <h2>
              {UI_TEXT.everyVisit}
              <br />
              {UI_TEXT.alwaysWithinReach}
            </h2>
            <p>{UI_TEXT.keepTrackOfYourCareAndYourFamilyS}</p>
            <Link to="/network" className="bookings-new">
              {UI_TEXT.findAHospital}
              <span aria-hidden="true">{UI_TEXT.externalLinkIcon}</span>
            </Link>
            <span className="bookings-intro-art" aria-hidden="true">
              {UI_TEXT.medicalCrossIcon}
            </span>
          </section>
        )}
        <Status data={data} />
        {!bookingId && (
          <div
            className="bookings-filters"
            role="group"
            aria-label={UI_TEXT.filterBookings}
          >
            {bookingPeriods.map((tab) => (
              <button
                key={tab}
                aria-pressed={period === tab}
                onClick={() => setPeriod(tab)}
              >
                {tab}{" "}
                <span>
                  {
                    data.rows.filter(
                      (row) =>
                        tab === UI_TEXT.all || bookingPeriod(row) === tab,
                    ).length
                  }
                </span>
              </button>
            ))}
          </div>
        )}
        {!bookingId && !data.loading && !data.error && (
          <div className="bookings-list-heading">
            <h2>
              {period === UI_TEXT.all
                ? UI_TEXT.allAppointments
                : UI_MESSAGES.appointmentPeriod(period)}
            </h2>
            <span>
              {rows.length}{" "}
              {rows.length === 1 ? UI_TEXT.bookingUnit : UI_TEXT.bookingsUnit}
            </span>
          </div>
        )}
        <div className="bookings-list">
          {rows.map((row) => (
            <AppointmentCard
              row={row}
              details={Boolean(bookingId)}
              key={textValue(row, "BookingConsultationId")}
            />
          ))}
        </div>
        {!data.loading && !data.error && !rows.length && (
          <div className="bookings-empty">
            <span aria-hidden="true">{UI_TEXT.medicalCrossIcon}</span>
            <h2>
              {bookingId
                ? UI_TEXT.bookingUnavailable
                : UI_TEXT.aLittleRoomForYourNextVisit}
            </h2>
            <p>
              {bookingId
                ? UI_TEXT.thisConsultationWasNotFoundInYourAccount
                : period === UI_TEXT.all
                  ? UI_TEXT.noBookingsFound
                  : UI_MESSAGES.noBookingsFound2(period.toLowerCase())}
            </p>
            <Link to="/network">
              {UI_TEXT.exploreHospitals}
              <span aria-hidden="true">{UI_TEXT.forwardArrow}</span>
            </Link>
          </div>
        )}
      </div>
    </AppShell>
  );
}

function AppointmentCard({
  row,
  details,
}: {
  row: PortalRow;
  details: boolean;
}) {
  const period = bookingPeriod(row);
  const dateValue = textValue(row, "AppointmentDate");
  const parsedDate = dateValue ? new Date(dateValue) : null;
  const date =
    parsedDate && Number.isFinite(parsedDate.getTime()) ? parsedDate : null;
  const options = { timeZone: DISPLAY_FORMAT.timeZone };
  const booking = textValue(row, "BookingConsultationId");
  return (
    <article className={`appointment-card appointment-${period.toLowerCase()}`}>
      <div className="appointment-top">
        <span className="appointment-service">
          {textValue(row, "ServiceName") ||
            textValue(row, "PoliciesType") ||
            UI_TEXT.hospitalConsultation}
        </span>
        <span className="appointment-badge">
          <i />
          {period}
        </span>
      </div>
      <div className="appointment-main">
        <div
          className="appointment-date"
          aria-label={
            date
              ? date.toLocaleDateString("en-IN", options)
              : UI_TEXT.dateNotScheduled
          }
        >
          <span>
            {date
              ? date.toLocaleDateString("en-IN", { ...options, month: "short" })
              : UI_TEXT.dateBadge}
          </span>
          <strong>
            {date
              ? date.toLocaleDateString("en-IN", { ...options, day: "2-digit" })
              : UI_TEXT.emptyValue}
          </strong>
          <small>
            {date
              ? date.toLocaleDateString("en-IN", {
                  ...options,
                  weekday: "short",
                })
              : UI_TEXT.pending}
          </small>
        </div>
        <div className="appointment-hospital">
          <h2>
            {textValue(row, "HospitalName") || UI_TEXT.hospitalAppointment}
          </h2>
          <p>
            {date
              ? date.toLocaleDateString("en-IN", {
                  ...options,
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })
              : UI_TEXT.appointmentDateToBeConfirmed}
          </p>
          <span className="appointment-patient">
            {textValue(row, "Name") || UI_TEXT.patientNotProvided}
          </span>
        </div>
      </div>
      <div className="appointment-footer">
        <div>
          <small>
            {UI_TEXT.booking}
            {booking}
          </small>
          <span>
            {textValue(row, "StatusName") || UI_TEXT.statusNotProvided}
          </span>
        </div>
        {!details && (
          <Link
            to={`/hospitalConsulationForm?bookingId=${encodeURIComponent(booking)}`}
          >
            {UI_TEXT.viewDetails3}
            <span aria-hidden="true">{UI_TEXT.forwardArrow}</span>
          </Link>
        )}
      </div>
      {details && <Fields row={row} fields={appointmentFields} />}
    </article>
  );
}
function SubscriptionDetails({ id }: { id: number }) {
  const data = usePortalData(`api/Customer/GetMemberProducts/${id}`);
  const location = useLocation();
  const { policyId } = useParams();
  const isNominees = location.pathname.toLowerCase().includes("nominee");
  const products = data.rows.flatMap((row) => childRows(row, "Products"));
  const policies = products.flatMap((row) => childRows(row, "Policies"));
  const policy = policies.find(
    (row) => textValue(row, "PoliciesId") === policyId,
  );
  const nominees = policies.flatMap((row) => childRows(row, "Nominees"));
  const uniqueNominees = [
    ...new Map(
      nominees.map((row) => [textValue(row, "NomineeId"), row]),
    ).values(),
  ];
  return (
    <Page
      title={
        policyId
          ? UI_TEXT.policyDetails
          : isNominees
            ? UI_TEXT.nomineeDetails
            : UI_TEXT.myMembership
      }
    >
      <Status data={data} />
      {!data.loading &&
        !data.error &&
        (policyId ? (
          policy ? (
            <>
              <Fields row={policy} fields={policyFields} />
              <h2>{UI_TEXT.insuredMembers}</h2>
              {childRows(policy, "Insurer").map((row, i) => (
                <Fields key={i} row={row} fields={insurerFields} />
              ))}
              <h2>{UI_TEXT.dependents}</h2>
              {childRows(policy, "Dependents").map((row, i) => (
                <Fields key={i} row={row} fields={dependentFields} />
              ))}
              <Link to="/NomineeDetails">{UI_TEXT.viewNominees}</Link>
            </>
          ) : (
            <p>{UI_TEXT.thisPolicyWasNotFoundInYourMembership}</p>
          )
        ) : isNominees ? (
          uniqueNominees.length ? (
            uniqueNominees.map((row, i) => (
              <article className="portal-card" key={i}>
                <Fields row={row} fields={nomineeFields} />
              </article>
            ))
          ) : (
            <p>{UI_TEXT.noNomineesHaveBeenAddedToYourPolicies}</p>
          )
        ) : products.length ? (
          products.map((row, i) => (
            <article className="portal-card" key={i}>
              <h2>{textValue(row, "ProductName")}</h2>
              <Fields row={row} fields={packageValidityFields} />
              <p>{textValue(row, "ShortDescription")}</p>
              {childRows(row, "Policies").map((policy) => (
                <Link
                  className="portal-list-link"
                  key={textValue(policy, "PoliciesId")}
                  to={`/policies/${textValue(policy, "PoliciesId")}`}
                >
                  {textValue(policy, "PoliciesProductName") ||
                    UI_TEXT.viewPolicy}
                  {UI_TEXT.chevronRightSuffix}
                </Link>
              ))}
            </article>
          ))
        ) : (
          <p>{UI_TEXT.noPurchasedPackagesFound}</p>
        ))}
      <Link to="/packages">{UI_TEXT.explorePackages}</Link>
    </Page>
  );
}

export function HospitalNetwork() {
  return <HospitalDirectory />;
}
export function HospitalDetails() {
  const location = useLocation();
  const state = location.state as {
    hospitalId?: number;
    HospitalId?: number;
  } | null;
  const id = Number(
    new URLSearchParams(location.search).get("hospitalId") ||
      state?.hospitalId ||
      state?.HospitalId,
  );
  return Number.isSafeInteger(id) && id > 0 ? (
    <HospitalDetail id={id} />
  ) : (
    <Page title={UI_TEXT.hospitalDetails}>
      <p>{UI_TEXT.selectAHospitalToViewItsDetails}</p>
      <Link to="/network">{UI_TEXT.findAHospital2}</Link>
    </Page>
  );
}
function HospitalDetail({ id }: { id: number }) {
  const data = usePortalData(`api/Hospital/GetById/${id}`);
  const services = usePortalData(
    `api/HospitalPoliciesProvision/GetByHospitalId/${id}`,
  );
  const row = data.rows[0];
  return (
    <Page title={UI_TEXT.hospitalDetails}>
      <Status data={data} />
      {row && (
        <>
          <h2>{textValue(row, "HospitalName")}</h2>
          <Fields row={row} fields={hospitalFields} />
          {textValue(row, "MobileNumber") && (
            <a
              href={`tel:${textValue(row, "MobileNumber").replace(/[^+\d]/g, "")}`}
            >
              {UI_TEXT.callHospital}
            </a>
          )}
          <p>
            <Link to={`/hospital-map?hospitalId=${id}`}>
              {UI_TEXT.viewOnMap}
            </Link>
          </p>
          <h2>{UI_TEXT.servicesBenefits}</h2>
          <Status data={services} />
          {services.rows.map((service, i) => (
            <article className="portal-card" key={i}>
              <h3>
                {textValue(service, "PoliciesType") || UI_TEXT.hospitalBenefit}
              </h3>
              {textValue(service, "DiscountPercentage") && (
                <p>
                  {UI_TEXT.discount}
                  {textValue(service, "DiscountPercentage")}
                  {UI_TEXT.percentSymbol}
                </p>
              )}
            </article>
          ))}
          {!services.loading && !services.error && !services.rows.length && (
            <p>{UI_TEXT.noServicesListedForThisHospital}</p>
          )}
          <Link
            to="/book-appointment"
            state={{
              hospitalId: id,
              hospitalName: textValue(row, "HospitalName"),
            }}
          >
            {UI_TEXT.bookAnAppointment}
          </Link>
        </>
      )}
      {!data.loading && !data.error && !row && (
        <p>{UI_TEXT.hospitalNotFound}</p>
      )}
    </Page>
  );
}

export function ProductDetails() {
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
    <ProductDetail id={id} />
  ) : (
    <Page title={UI_TEXT.productDetails}>
      <p>{UI_TEXT.selectAPackageToViewItsDetails}</p>
      <Link to="/products">{UI_TEXT.browseProducts}</Link>
    </Page>
  );
}
function ProductDetail({ id }: { id: number }) {
  const data = usePortalData(`api/Products/GetById/${id}`);
  return (
    <Page title={UI_TEXT.productDetails}>
      <Status data={data} />
      {data.rows[0] && (
        <>
          <h2>{textValue(data.rows[0], "ProductName")}</h2>
          <p>{textValue(data.rows[0], "ShortDescription")}</p>
          <Fields row={data.rows[0]} fields={productFields} />
        </>
      )}
      {!data.loading && !data.error && !data.rows.length && (
        <p>{UI_TEXT.productNotFound}</p>
      )}
    </Page>
  );
}
export function Products() {
  const data = usePortalData("api/Products/all", { skip: 0, take: 1000 });
  return (
    <Page title={UI_TEXT.healthProducts}>
      <Status data={data} />
      {data.rows.map((row, i) => (
        <Link
          key={i}
          className="portal-card portal-list-link"
          to={`/product-details?productId=${textValue(row, "ProductsId")}`}
        >
          <h2>{textValue(row, "ProductName")}</h2>
          <p>{textValue(row, "ShortDescription")}</p>
        </Link>
      ))}
      {!data.loading && !data.error && !data.rows.length && (
        <p>{UI_TEXT.noProductsAvailable}</p>
      )}
    </Page>
  );
}

export function KycVerification() {
  const id = customerId();
  return id ? (
    <KycStatus id={id} />
  ) : (
    <Page title={UI_TEXT.kycVerification2}>
      <p>{UI_TEXT.kycStatusIsAvailableForIndividualCustomerMemberships}</p>
    </Page>
  );
}
function KycStatus({ id }: { id: number }) {
  const data = usePortalData(`api/Customer/GetById/${id}`);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  async function check() {
    setBusy(true);
    setStatus("");
    try {
      const aadhaar = textValue(data.rows[0], "AadhaarNumber");
      const pan = await apiRequest<{ status: boolean }>(
        "api/Customer/PANVerifiedOrNot",
        { body: { customerId: id } },
      );
      const aadhaarStatus = /^\d{12}$/.test(aadhaar)
        ? await apiRequest<{ status: boolean }>(
            "api/Customer/KYCVerifiedOrNot",
            { body: { customerId: id, aadhaarNumber: aadhaar } },
          )
        : { status: false };
      setStatus(
        UI_MESSAGES.aadhaarPan(
          aadhaarStatus.status ? UI_TEXT.verified : UI_TEXT.incomplete,
          pan.status ? UI_TEXT.verified : UI_TEXT.incomplete,
        ),
      );
    } catch (error) {
      setStatus(
        error instanceof Error
          ? error.message
          : UI_TEXT.verificationStatusUnavailable,
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <Page title={UI_TEXT.kycVerification2}>
      <Status data={data} />
      <p>{UI_TEXT.checkTheVerificationStatusLinkedToYourMembership}</p>
      <button
        className="primary-btn"
        disabled={busy || data.loading || !!data.error}
        onClick={() => void check()}
      >
        {busy ? UI_TEXT.checking : UI_TEXT.checkVerificationStatus}
      </button>
      <p role="status">{status}</p>
      <Link to="/support">
        {UI_TEXT.contactSupportForVerificationAssistance}
      </Link>
    </Page>
  );
}

export function AccountManagement() {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function reset() {
    setBusy(true);
    setError("");
    try {
      const mobileNumber = getSessionMember()?.MobileNumber;
      if (!mobileNumber)
        throw new Error(UI_TEXT.noMobileNumberIsLinkedToThisAccount);
      const result = await authRequest("toSetNewPassword", { mobileNumber });
      if (!result.status || !result.guid)
        throw new Error(result.message || UI_TEXT.unableToSendOtp);
      navigate("/otp", {
        state: {
          mobileNumber,
          guid: result.guid,
          timer: remainingSeconds(result.futureTime),
          source: "reset",
        },
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : UI_TEXT.unableToResetPassword,
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <Page title={UI_TEXT.accountManagement}>
      <Link to="/myprofile">{UI_TEXT.viewPersonalDetails}</Link>
      <p>{UI_TEXT.resetYourFourDigitPasswordUsingAnOtpSent}</p>
      <button
        className="primary-btn"
        disabled={busy}
        onClick={() => void reset()}
      >
        {busy ? UI_TEXT.sendingOtp : UI_TEXT.resetPassword}
      </button>
      {error && <p role="alert">{error}</p>}
    </Page>
  );
}

export function Support() {
  const data = usePortalData("api/ConfigValues/all", { skip: 0, take: 0 });
  const number = textValue(
    data.rows.find((row) => row.ConfigKey === "OHOCareMobileNumber"),
    "ConfigValue",
  );
  return (
    <Page title={UI_TEXT.helpSupport}>
      <Status data={data} />
      <p>{UI_TEXT.contactOhoCareForHelpWithMembershipBookingsOr}</p>
      {number ? (
        <a
          className="portal-list-link"
          href={`tel:${number.replace(/[^+\d]/g, "")}`}
        >
          {UI_TEXT.callOhoCare}
          {number}
        </a>
      ) : (
        !data.loading &&
        !data.error && <p>{UI_TEXT.supportContactIsCurrentlyUnavailable}</p>
      )}
    </Page>
  );
}
export function PrivacyPolicy() {
  return (
    <Page title={UI_TEXT.privacyPolicyTerms}>
      <p>{UI_TEXT.readOhoindiaSPrivacyPolicyAndTermsOfService}</p>
      <a
        className="portal-list-link"
        target="_blank"
        rel="noreferrer"
        href={APP_LINKS.privacyPolicy}
      >
        {UI_TEXT.readPrivacyPolicy}
      </a>
      <a
        className="portal-list-link"
        target="_blank"
        rel="noreferrer"
        href={APP_LINKS.termsAndConditions}
      >
        {UI_TEXT.readTermsConditions}
      </a>
    </Page>
  );
}
export function AboutUs() {
  return (
    <Page title={UI_TEXT.aboutUs}>
      <Logo />
      <p>{UI_TEXT.aHyperlocalHealthFintechForBharat}</p>
      <p>{UI_TEXT.accessYourFamilySHealthBenefitsMembershipsAndHospital}</p>
      <Link to="/support">{UI_TEXT.contactOhoCare}</Link>
    </Page>
  );
}
