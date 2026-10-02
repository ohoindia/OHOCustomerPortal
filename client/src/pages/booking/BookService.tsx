import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AppShell, PageHeader } from "../../components/Layout";
import { getSessionMember } from "../auth/member";
import { apiRequest } from "../../services/api";
import { textValue } from "../portal/usePortalData";
import type { PortalRow } from "../portal/usePortalData";
import { cardStatus } from "../../services/home";
import type { MemberCard } from "../../services/home";
import "../portal/portal.css";

type BookingData = {
  hospital: PortalRow;
  patients: PortalRow[];
  services: PortalRow[];
  serviceTypes: PortalRow[];
  card?: MemberCard;
};
export function BookService() {
  const location = useLocation();
  const state = location.state as { hospitalId?: number } | null;
  const hospitalId = Number(
    new URLSearchParams(location.search).get("hospitalId") || state?.hospitalId,
  );
  const customerId = Number(getSessionMember()?.MemberId || 0);
  return (
    <AppShell className="portal-page">
      <PageHeader title="Book Service" />
      <div className="portal-content">
        {!customerId ? (
          <>
            <p>
              An individual customer membership is required to book this
              service.
            </p>
            <Link to="/support">Contact OHO Care</Link>
          </>
        ) : !Number.isSafeInteger(hospitalId) || hospitalId <= 0 ? (
          <>
            <p>Select a hospital for your Zero-Cash OPD consultation.</p>
            <Link to="/hospitallist" state={{ isFromBookService: true }}>
              Choose hospital
            </Link>
          </>
        ) : (
          <ServiceOptions
            key={`${customerId}:${hospitalId}`}
            customerId={customerId}
            hospitalId={hospitalId}
          />
        )}
      </div>
    </AppShell>
  );
}
function ServiceOptions({
  customerId,
  hospitalId,
}: {
  customerId: number;
  hospitalId: number;
}) {
  const [data, setData] = useState<BookingData | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    const options = { signal: controller.signal };
    void Promise.all([
      apiRequest<PortalRow[]>(`api/Hospital/GetById/${hospitalId}`, options),
      apiRequest<PortalRow[]>(
        `api/HospitalPoliciesProvision/GetByHospitalId/${hospitalId}`,
        options,
      ),
      apiRequest<PortalRow[]>(`api/Customer/GetById/${customerId}`, options),
      apiRequest<PortalRow[]>(
        `api/Customer/GetDependentsByCustomerId/${customerId}`,
        options,
      ),
      apiRequest<{ returnData: MemberCard[] }>(
        `api/OHOCards/GetMemberCardByMemberId/${customerId}`,
        options,
      ),
      apiRequest<PortalRow[]>("api/HospitalServices/all", {
        ...options,
        body: { skip: 0, take: 0 },
      }),
    ])
      .then(
        ([hospitals, services, members, dependents, cards, serviceTypes]) => {
          if (!hospitals[0] || !members[0])
            throw new Error("Hospital or customer details could not be found.");
          if (!controller.signal.aborted)
            setData({
              hospital: hospitals[0],
              services,
              serviceTypes,
              patients: [members[0], ...dependents],
              card: cards.returnData.find((card) =>
                ["Active", "Expires today"].includes(cardStatus(card)),
              ),
            });
        },
      )
      .catch((err: unknown) => {
        if (!controller.signal.aborted)
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load booking details.",
          );
      });
    return () => controller.abort();
  }, [customerId, hospitalId, attempt]);
  if (error)
    return (
      <div role="alert">
        <p>{error}</p>
        <button
          className="outline-btn"
          onClick={() => {
            setError("");
            setData(null);
            setAttempt((value) => value + 1);
          }}
        >
          Try again
        </button>
      </div>
    );
  if (!data)
    return <p role="status">Loading hospital services and membership...</p>;
  const freeServices = data.services.filter(
    (row) => row.PoliciesType === "Free Consultation",
  );
  return (
    <>
      <h2>{textValue(data.hospital, "HospitalName")}</h2>
      <p>
        {textValue(data.hospital, "AddressLine1")},{" "}
        {textValue(data.hospital, "City")}
      </p>
      <article className="portal-card">
        <h2>Zero-Cash OPD</h2>
        <p>
          Use an available free-consultation coupon for yourself or an eligible
          family member.
        </p>
      </article>
      {!data.card ? (
        <div role="status">
          <p>
            An active, unexpired membership card is required to book this
            service.
          </p>
          <Link to="/PurchasedPackages">View membership</Link>
          <p>
            <Link to="/support">Contact support</Link>
          </p>
        </div>
      ) : !freeServices.length ? (
        <>
          <p>Free consultation is not available at this hospital.</p>
          <Link to="/hospitallist" state={{ isFromBookService: true }}>
            Choose another hospital
          </Link>
        </>
      ) : (
        <PatientBooking
          customerId={customerId}
          hospitalId={hospitalId}
          serviceId={Number(freeServices[0].HospitalPoliciesId)}
          patients={data.patients}
          serviceTypes={data.serviceTypes}
        />
      )}
    </>
  );
}
function PatientBooking({
  customerId,
  hospitalId,
  serviceId,
  patients,
  serviceTypes,
}: {
  customerId: number;
  hospitalId: number;
  serviceId: number;
  patients: PortalRow[];
  serviceTypes: PortalRow[];
}) {
  const navigate = useNavigate();
  const [patientId, setPatientId] = useState(customerId);
  const [appointmentDate, setAppointmentDate] = useState("");
  const [reason, setReason] = useState("");
  const [serviceTypeId, setServiceTypeId] = useState("");
  const [localMinimum] = useState(() =>
    new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16),
  );
  const [coupon, setCoupon] = useState<{
    patientId: number;
    availableCoupons: number;
    message: string;
  } | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const dependentCustomerId = patientId === customerId ? null : patientId;
  useEffect(() => {
    const controller = new AbortController();
    void apiRequest<{ availableCoupons: number; message?: string }>(
      "api/BookingConsultation/checkIndividualCoupons",
      {
        signal: controller.signal,
        body: { customerId, hospitalId, dependentCustomerId },
      },
    )
      .then((result) => {
        if (!Number.isFinite(result.availableCoupons))
          throw new Error("Coupon availability could not be confirmed.");
        if (!controller.signal.aborted)
          setCoupon({
            patientId,
            availableCoupons: result.availableCoupons,
            message: result.message || "",
          });
      })
      .catch((err: unknown) => {
        if (!controller.signal.aborted)
          setCoupon({
            patientId,
            availableCoupons: 0,
            message:
              err instanceof Error ? err.message : "Unable to check coupons.",
          });
      });
    return () => controller.abort();
  }, [customerId, hospitalId, dependentCustomerId, patientId, attempt]);
  const checking = coupon?.patientId !== patientId;
  async function book() {
    if (busy || checking || !coupon?.availableCoupons) return;
    if (!appointmentDate || new Date(appointmentDate).getTime() < Date.now()) {
      setError("Select a future appointment date and time.");
      return;
    }
    if (!serviceTypeId) {
      setError("Please select a service type.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const result = await apiRequest<{
        status: boolean;
        message?: string;
        data?: { BookingConsultationId: number };
      }>("api/BookingConsultation/bookAppointment/add", {
        body: {
          customerId,
          hospitalId,
          hospitalPoliciesId: serviceId,
          dependentCustomerId,
          appointmentDate: new Date(appointmentDate).toISOString(),
          serviceTypeId: Number(serviceTypeId),
          reason: reason.trim(),
        },
      });
      if (!result.status || !result.data?.BookingConsultationId)
        throw new Error(result.message || "Unable to initiate the booking.");
      navigate(
        `/hospitalConsulationForm?bookingId=${result.data.BookingConsultationId}`,
        { replace: true, state: { bookingInitiated: true } },
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to book. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <label className="portal-label">
        Select patient
        <select
          className="book-service-select"
          value={patientId}
          disabled={busy}
          onChange={(event) => {
            setPatientId(Number(event.target.value));
            setError("");
          }}
        >
          {patients.map((patient) => {
            const id = Number(patient.CustomerId || patient.MemberId);
            return (
              <option key={id} value={id}>
                {textValue(patient, "Name")}
                {id === customerId ? " (Self)" : ""}
              </option>
            );
          })}
        </select>
      </label>
      <p role="status">
        {checking
          ? "Checking free consultation coupons..."
          : coupon?.availableCoupons
            ? `${coupon.availableCoupons} free consultation coupon${coupon.availableCoupons === 1 ? "" : "s"} available`
            : coupon?.message || "No coupons available for this patient."}
      </p>
      {!checking && !coupon?.availableCoupons && (
        <button
          className="outline-btn"
          disabled={busy}
          onClick={() => {
            setCoupon(null);
            setAttempt((value) => value + 1);
          }}
        >
          Check again
        </button>
      )}
      <label className="portal-label">
        Appointment Date &amp; Time *
        <input
          className="book-service-select"
          type="datetime-local"
          required
          min={localMinimum}
          value={appointmentDate}
          disabled={busy}
          onChange={(event) => setAppointmentDate(event.target.value)}
        />
      </label>
      <label className="portal-label">
        Reason to Visit
        <textarea
          className="book-service-select"
          rows={3}
          maxLength={1000}
          placeholder="Enter reason to visit"
          value={reason}
          disabled={busy}
          onChange={(event) => setReason(event.target.value)}
        />
      </label>
      <label className="portal-label">
        Service Type *
        <select
          className="book-service-select"
          required
          value={serviceTypeId}
          disabled={busy}
          onChange={(event) => setServiceTypeId(event.target.value)}
        >
          <option value="">Select Service</option>
          {serviceTypes.map((service) => (
            <option
              key={Number(service.HospitalServicesId)}
              value={Number(service.HospitalServicesId)}
            >
              {textValue(service, "ServiceName")}
            </option>
          ))}
        </select>
      </label>
      {!serviceTypes.length && (
        <p role="status">
          No service types are currently available. Please contact support.
        </p>
      )}
      <button
        className="primary-btn"
        disabled={busy || checking || !coupon?.availableCoupons}
        onClick={() => void book()}
      >
        {busy ? "Initiating booking..." : "Book Free Consultation"}
      </button>
      {error && <p role="alert">{error}</p>}
      <p>
        Your booking will be initiated for the hospital to confirm. Your coupon
        is claimed when the visit is completed.
      </p>
      <Link to="/ConsultationList">View my bookings</Link>
    </>
  );
}
