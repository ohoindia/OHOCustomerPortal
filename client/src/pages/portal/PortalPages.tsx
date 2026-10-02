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
  if (data.loading) return <p role="status">Loading details...</p>;
  if (data.error)
    return (
      <div role="alert">
        <p>{data.error}</p>
        <button className="outline-btn" onClick={data.retry}>
          Try again
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
          <dd>{textValue(row, key) || "Not provided"}</dd>
        </div>
      ))}
    </dl>
  );
}

const portalLinks = [
  ["My Membership", "/PurchasedPackages"],
  ["Health Products", "/products"],
  ["My Bookings", "/ConsultationList"],
  ["Hospital Network", "/network"],
  ["My Profile", "/myprofile"],
  ["Family Members", "/family-members"],
  ["Nominee Details", "/NomineeDetails"],
  ["KYC Verification", "/kyc-verification"],
  ["Account Management", "/account-management"],
  ["BMI Calculator", "/BMICalculator"],
  ["Meditation & Breathing", "/MeditationBreathing"],
  ["Step Tracker", "/StepTracker"],
  ["Nutrition Tracking", "/NutritionTracking"],
  ["Support", "/support"],
  ["Privacy Policy", "/privacy-policy"],
  ["About Us", "/aboutus"],
] as const;
export function PortalMenu() {
  return (
    <Page title="More Services">
      <nav className="portal-links" aria-label="Customer services">
        {portalLinks.map(([title, path]) => (
          <Link key={path} to={path}>
            {title}
            <span aria-hidden="true">›</span>
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
    <Page title="My Profile">
      <p>Customer profile details are available for individual memberships.</p>
    </Page>
  );
}
function MemberProfile({ id }: { id: number }) {
  const data = usePortalData(`api/Customer/GetById/${id}`);
  return (
    <Page title="My Profile">
      <Status data={data} />
      {!data.loading && !data.error && (
        <>
          <Fields
            row={data.rows[0]}
            fields={[
              ["Name", "Name"],
              ["MobileNumber", "Mobile number"],
              ["Email", "Email"],
              ["DateofBirth", "Date of birth"],
              ["Gender", "Gender"],
              ["AddressLine1", "Address"],
              ["AddressLine2", "Address line 2"],
              ["Village", "Village"],
              ["City", "City"],
              ["Pincode", "Pincode"],
            ]}
          />
          <Link to="/kyc-verification">View KYC status</Link>
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
    <Page title="Family Members">
      <p>No individual customer membership is linked to this account.</p>
    </Page>
  );
}
function DependentList({ id }: { id: number }) {
  const data = usePortalData(`api/Customer/GetDependentsByCustomerId/${id}`);
  return (
    <Page title="Family Members">
      <Status data={data} />
      {data.rows.map((row) => (
        <article className="portal-card" key={textValue(row, "CustomerId")}>
          <Fields
            row={row}
            fields={[
              ["Name", "Name"],
              ["Relationship", "Relationship"],
              ["DateofBirth", "Date of birth"],
              ["Gender", "Gender"],
            ]}
          />
        </article>
      ))}
      {!data.loading && !data.error && !data.rows.length && (
        <p>No family members have been added.</p>
      )}
    </Page>
  );
}

export function PurchasedPackages() {
  const id = customerId();
  return id ? (
    <SubscriptionDetails id={id} />
  ) : (
    <Page title="My Membership">
      <p>No individual customer membership is linked to this account.</p>
      <Link to="/account-details">View account details</Link>
    </Page>
  );
}
export function ConsultationList() {
  const id = customerId();
  return id ? (
    <Consultations id={id} />
  ) : (
    <Page title="My Bookings">
      <p>No individual customer membership is linked to this account.</p>
    </Page>
  );
}
function Consultations({ id }: { id: number }) {
  const [period, setPeriod] = useState("All");
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
        (row) => period === "All" || bookingPeriod(row) === period,
      );
  return (
    <AppShell className="bookings-page">
      <PageHeader
        title={bookingId ? "Booking details" : "My Bookings"}
      />
      <div className="bookings-content">
        {!bookingId && (
          <section className="bookings-intro">
            <span className="bookings-eyebrow">YOUR CARE, IN ONE PLACE</span>
            <h2>
              Every visit.
              <br />
              Always within reach.
            </h2>
            <p>Keep track of your care and your family's appointments.</p>
            <Link to="/network" className="bookings-new">
              Find a hospital <span aria-hidden="true">↗</span>
            </Link>
            <span className="bookings-intro-art" aria-hidden="true">
              ✚
            </span>
          </section>
        )}
        <Status data={data} />
        {!bookingId && (
          <div
            className="bookings-filters"
            role="group"
            aria-label="Filter bookings"
          >
            {["All", "Previous", "Upcoming", "Running"].map((tab) => (
              <button
                key={tab}
                aria-pressed={period === tab}
                onClick={() => setPeriod(tab)}
              >
                {tab}{" "}
                <span>
                  {
                    data.rows.filter(
                      (row) => tab === "All" || bookingPeriod(row) === tab,
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
              {period === "All" ? "All appointments" : `${period} appointments`}
            </h2>
            <span>
              {rows.length} {rows.length === 1 ? "booking" : "bookings"}
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
            <span aria-hidden="true">✚</span>
            <h2>
              {bookingId
                ? "Booking unavailable"
                : "A little room for your next visit"}
            </h2>
            <p>
              {bookingId
                ? "This consultation was not found in your account."
                : period === "All"
                  ? "No bookings found."
                  : `No ${period.toLowerCase()} bookings found.`}
            </p>
            <Link to="/network">
              Explore hospitals <span aria-hidden="true">→</span>
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
  const options = { timeZone: "Asia/Kolkata" };
  const booking = textValue(row, "BookingConsultationId");
  return (
    <article className={`appointment-card appointment-${period.toLowerCase()}`}>
      <div className="appointment-top">
        <span className="appointment-service">
          {textValue(row, "ServiceName") ||
            textValue(row, "PoliciesType") ||
            "Hospital consultation"}
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
              : "Date not scheduled"
          }
        >
          <span>
            {date
              ? date.toLocaleDateString("en-IN", { ...options, month: "short" })
              : "DATE"}
          </span>
          <strong>
            {date
              ? date.toLocaleDateString("en-IN", { ...options, day: "2-digit" })
              : "—"}
          </strong>
          <small>
            {date
              ? date.toLocaleDateString("en-IN", {
                  ...options,
                  weekday: "short",
                })
              : "Pending"}
          </small>
        </div>
        <div className="appointment-hospital">
          <h2>{textValue(row, "HospitalName") || "Hospital appointment"}</h2>
          <p>
            {date
              ? date.toLocaleDateString("en-IN", {
                  ...options,
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })
              : "Appointment date to be confirmed"}
          </p>
          <span className="appointment-patient">
            {textValue(row, "Name") || "Patient not provided"}
          </span>
        </div>
      </div>
      <div className="appointment-footer">
        <div>
          <small>BOOKING #{booking}</small>
          <span>{textValue(row, "StatusName") || "Status not provided"}</span>
        </div>
        {!details && (
          <Link
            to={`/hospitalConsulationForm?bookingId=${encodeURIComponent(booking)}`}
          >
            View details <span aria-hidden="true">→</span>
          </Link>
        )}
      </div>
      {details && (
        <Fields
          row={row}
          fields={[
            ["BookingDate", "Booked on"],
            ["AppointmentDate", "Appointment date"],
            ["ServiceName", "Service"],
            ["Name", "Patient"],
            ["StatusName", "Status"],
          ]}
        />
      )}
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
          ? "Policy Details"
          : isNominees
            ? "Nominee Details"
            : "My Membership"
      }
    >
      <Status data={data} />
      {!data.loading &&
        !data.error &&
        (policyId ? (
          policy ? (
            <>
              <Fields
                row={policy}
                fields={[
                  ["PoliciesProductName", "Policy"],
                  ["PolicyCOINumber", "COI number"],
                ]}
              />
              <h2>Insured members</h2>
              {childRows(policy, "Insurer").map((row, i) => (
                <Fields
                  key={i}
                  row={row}
                  fields={[
                    ["InsurerName", "Name"],
                    ["InsurerRelationship", "Relationship"],
                  ]}
                />
              ))}
              <h2>Dependents</h2>
              {childRows(policy, "Dependents").map((row, i) => (
                <Fields
                  key={i}
                  row={row}
                  fields={[
                    ["DependentFullName", "Name"],
                    ["DependentRelationship", "Relationship"],
                  ]}
                />
              ))}
              <Link to="/NomineeDetails">View nominees</Link>
            </>
          ) : (
            <p>This policy was not found in your membership.</p>
          )
        ) : isNominees ? (
          uniqueNominees.length ? (
            uniqueNominees.map((row, i) => (
              <article className="portal-card" key={i}>
                <Fields
                  row={row}
                  fields={[
                    ["NomineeFullName", "Name"],
                    ["NomineeRelationship", "Relationship"],
                    ["NomineeDateofBirth", "Date of birth"],
                  ]}
                />
              </article>
            ))
          ) : (
            <p>No nominees have been added to your policies.</p>
          )
        ) : products.length ? (
          products.map((row, i) => (
            <article className="portal-card" key={i}>
              <h2>{textValue(row, "ProductName")}</h2>
              <Fields
                row={row}
                fields={[
                  ["IssuedOn", "Issued on"],
                  ["ValidTill", "Valid until"],
                  ["PaidAmount", "Paid amount"],
                ]}
              />
              <p>{textValue(row, "ShortDescription")}</p>
              {childRows(row, "Policies").map((policy) => (
                <Link
                  className="portal-list-link"
                  key={textValue(policy, "PoliciesId")}
                  to={`/policies/${textValue(policy, "PoliciesId")}`}
                >
                  {textValue(policy, "PoliciesProductName") || "View policy"} ›
                </Link>
              ))}
            </article>
          ))
        ) : (
          <p>No purchased packages found.</p>
        ))}
      <Link to="/packages">Explore packages</Link>
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
    <Page title="Hospital Details">
      <p>Select a hospital to view its details.</p>
      <Link to="/network">Find a hospital</Link>
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
    <Page title="Hospital Details">
      <Status data={data} />
      {row && (
        <>
          <h2>{textValue(row, "HospitalName")}</h2>
          <Fields
            row={row}
            fields={[
              ["Specialization", "Speciality"],
              ["AddressLine1", "Address"],
              ["AddressLine2", "Address line 2"],
              ["City", "City"],
              ["HospitalCode", "Hospital code"],
            ]}
          />
          {textValue(row, "MobileNumber") && (
            <a
              href={`tel:${textValue(row, "MobileNumber").replace(/[^+\d]/g, "")}`}
            >
              Call hospital
            </a>
          )}
          <p>
            <Link to={`/hospital-map?hospitalId=${id}`}>View on map</Link>
          </p>
          <h2>Services & Benefits</h2>
          <Status data={services} />
          {services.rows.map((service, i) => (
            <article className="portal-card" key={i}>
              <h3>
                {textValue(service, "PoliciesType") || "Hospital benefit"}
              </h3>
              {textValue(service, "DiscountPercentage") && (
                <p>Discount: {textValue(service, "DiscountPercentage")}%</p>
              )}
            </article>
          ))}
          {!services.loading && !services.error && !services.rows.length && (
            <p>No services listed for this hospital.</p>
          )}
          <Link
            to="/book-appointment"
            state={{
              hospitalId: id,
              hospitalName: textValue(row, "HospitalName"),
            }}
          >
            Book an appointment
          </Link>
        </>
      )}
      {!data.loading && !data.error && !row && <p>Hospital not found.</p>}
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
    <Page title="Product Details">
      <p>Select a package to view its details.</p>
      <Link to="/products">Browse products</Link>
    </Page>
  );
}
function ProductDetail({ id }: { id: number }) {
  const data = usePortalData(`api/Products/GetById/${id}`);
  return (
    <Page title="Product Details">
      <Status data={data} />
      {data.rows[0] && (
        <>
          <h2>{textValue(data.rows[0], "ProductName")}</h2>
          <p>{textValue(data.rows[0], "ShortDescription")}</p>
          <Fields
            row={data.rows[0]}
            fields={[
              ["SaleAmount", "Price"],
              ["MaximumAdult", "Adults covered"],
              ["MaximumChild", "Children covered"],
              ["SumAssured", "Sum assured"],
            ]}
          />
        </>
      )}
      {!data.loading && !data.error && !data.rows.length && (
        <p>Product not found.</p>
      )}
    </Page>
  );
}
export function Products() {
  const data = usePortalData("api/Products/all", { skip: 0, take: 1000 });
  return (
    <Page title="Health Products">
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
        <p>No products available.</p>
      )}
    </Page>
  );
}

export function KycVerification() {
  const id = customerId();
  return id ? (
    <KycStatus id={id} />
  ) : (
    <Page title="KYC Verification">
      <p>KYC status is available for individual customer memberships.</p>
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
        `Aadhaar: ${aadhaarStatus.status ? "Verified" : "Incomplete"}. PAN: ${pan.status ? "Verified" : "Incomplete"}.`,
      );
    } catch (error) {
      setStatus(
        error instanceof Error
          ? error.message
          : "Verification status unavailable.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <Page title="KYC Verification">
      <Status data={data} />
      <p>Check the verification status linked to your membership.</p>
      <button
        className="primary-btn"
        disabled={busy || data.loading || !!data.error}
        onClick={() => void check()}
      >
        {busy ? "Checking..." : "Check verification status"}
      </button>
      <p role="status">{status}</p>
      <Link to="/support">Contact support for verification assistance</Link>
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
        throw new Error("No mobile number is linked to this account.");
      const result = await authRequest("toSetNewPassword", { mobileNumber });
      if (!result.status || !result.guid)
        throw new Error(result.message || "Unable to send OTP.");
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
        err instanceof Error ? err.message : "Unable to reset password.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <Page title="Account Management">
      <Link to="/myprofile">View personal details</Link>
      <p>
        Reset your four-digit password using an OTP sent to your registered
        mobile number.
      </p>
      <button
        className="primary-btn"
        disabled={busy}
        onClick={() => void reset()}
      >
        {busy ? "Sending OTP..." : "Reset password"}
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
    <Page title="Help & Support">
      <Status data={data} />
      <p>
        Contact OHO Care for help with membership, bookings or verification.
      </p>
      {number ? (
        <a
          className="portal-list-link"
          href={`tel:${number.replace(/[^+\d]/g, "")}`}
        >
          Call OHO Care: {number}
        </a>
      ) : (
        !data.loading &&
        !data.error && <p>Support contact is currently unavailable.</p>
      )}
    </Page>
  );
}
export function PrivacyPolicy() {
  return (
    <Page title="Privacy Policy & Terms">
      <p>Read OHOINDIA’s privacy policy and terms of service.</p>
      <a
        className="portal-list-link"
        target="_blank"
        rel="noreferrer"
        href="https://www.ohoindialife.in/privacypolicy"
      >
        Read Privacy Policy ↗
      </a>
      <a
        className="portal-list-link"
        target="_blank"
        rel="noreferrer"
        href="https://www.ohoindialife.in/termsandconditions"
      >
        Read Terms & Conditions ↗
      </a>
    </Page>
  );
}
export function AboutUs() {
  return (
    <Page title="About Us">
      <Logo />
      <p>A Hyperlocal Health Fintech for Bharat</p>
      <p>
        Access your family’s health benefits, memberships and hospital network
        with OHOINDIA.
      </p>
      <Link to="/support">Contact OHO Care</Link>
    </Page>
  );
}
