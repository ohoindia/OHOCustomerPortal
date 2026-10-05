import { bookableCardStatuses } from "../../../../common/content/options";
import { UI_TEXT, UI_MESSAGES } from "../../../../common/content/labels";
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
      <PageHeader title={UI_TEXT.bookService} />
      <div className="portal-content">
        {!customerId ? (
          <>
            <p>{UI_TEXT.anIndividualCustomerMembershipIsRequiredToBookThis}</p>
            <Link to="/support">{UI_TEXT.contactOhoCare}</Link>
          </>
        ) : !Number.isSafeInteger(hospitalId) || hospitalId <= 0 ? (
          <>
            <p>{UI_TEXT.selectAHospitalForYourZeroCashOpdConsultation}</p>
            <Link to="/hospitallist" state={{ isFromBookService: true }}>
              {UI_TEXT.chooseHospital}
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
      Promise.resolve(getSessionMember() ? [getSessionMember()!] : []),
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
            throw new Error(UI_TEXT.hospitalOrCustomerDetailsCouldNotBeFound);
          if (!controller.signal.aborted)
            setData({
              hospital: hospitals[0],
              services,
              serviceTypes,
              patients: [members[0], ...dependents],
              card: cards.returnData.find((card) =>
                bookableCardStatuses.includes(cardStatus(card)),
              ),
            });
        },
      )
      .catch((err: unknown) => {
        if (!controller.signal.aborted)
          setError(
            err instanceof Error
              ? err.message
              : UI_TEXT.unableToLoadBookingDetails,
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
          {UI_TEXT.tryAgain}
        </button>
      </div>
    );
  if (!data)
    return <p role="status">{UI_TEXT.loadingHospitalServicesAndMembership}</p>;
  const freeServices = data.services.filter(
    (row) => row.PoliciesType === UI_TEXT.freeConsultation,
  );
  return (
    <>
      <h2>{textValue(data.hospital, "HospitalName")}</h2>
      <p>
        {textValue(data.hospital, "AddressLine1")}
        {UI_TEXT.comma} {textValue(data.hospital, "City")}
      </p>
      <article className="portal-card">
        <h2>{UI_TEXT.zeroCashOpd}</h2>
        <p>{UI_TEXT.useAnAvailableFreeConsultationCouponForYourselfOr}</p>
      </article>
      {!data.card ? (
        <div role="status">
          <p>{UI_TEXT.anActiveUnexpiredMembershipCardIsRequiredToBook}</p>
          <Link to="/PurchasedPackages">{UI_TEXT.viewMembership}</Link>
          <p>
            <Link to="/support">{UI_TEXT.contactSupport}</Link>
          </p>
        </div>
      ) : !freeServices.length ? (
        <>
          <p>{UI_TEXT.freeConsultationIsNotAvailableAtThisHospital}</p>
          <Link to="/hospitallist" state={{ isFromBookService: true }}>
            {UI_TEXT.chooseAnotherHospital}
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
          throw new Error(UI_TEXT.couponAvailabilityCouldNotBeConfirmed);
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
              err instanceof Error ? err.message : UI_TEXT.unableToCheckCoupons,
          });
      });
    return () => controller.abort();
  }, [customerId, hospitalId, dependentCustomerId, patientId, attempt]);
  const checking = coupon?.patientId !== patientId;
  async function book() {
    if (busy || checking || !coupon?.availableCoupons) return;
    if (!appointmentDate || new Date(appointmentDate).getTime() < Date.now()) {
      setError(UI_TEXT.selectAFutureAppointmentDateAndTime);
      return;
    }
    if (!serviceTypeId) {
      setError(UI_TEXT.pleaseSelectAServiceType);
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
        throw new Error(result.message || UI_TEXT.unableToInitiateTheBooking);
      navigate(
        `/hospitalConsulationForm?bookingId=${result.data.BookingConsultationId}`,
        { replace: true, state: { bookingInitiated: true } },
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : UI_TEXT.unableToBookPleaseTryAgain,
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <label className="portal-label">
        {UI_TEXT.selectPatient}
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
                {id === customerId ? UI_TEXT.selfSuffix : ""}
              </option>
            );
          })}
        </select>
      </label>
      <p role="status">
        {checking
          ? UI_TEXT.checkingFreeConsultationCoupons
          : coupon?.availableCoupons
            ? UI_MESSAGES.freeConsultationCouponAvailable(
                coupon.availableCoupons,
                coupon.availableCoupons === 1 ? "" : UI_TEXT.pluralSuffix,
              )
            : coupon?.message || UI_TEXT.noCouponsAvailableForThisPatient}
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
          {UI_TEXT.checkAgain}
        </button>
      )}
      <label className="portal-label">
        {UI_TEXT.appointmentDateTime}
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
        {UI_TEXT.reasonToVisit}
        <textarea
          className="book-service-select"
          rows={3}
          maxLength={1000}
          placeholder={UI_TEXT.enterReasonToVisit}
          value={reason}
          disabled={busy}
          onChange={(event) => setReason(event.target.value)}
        />
      </label>
      <label className="portal-label">
        {UI_TEXT.serviceType}
        <select
          className="book-service-select"
          required
          value={serviceTypeId}
          disabled={busy}
          onChange={(event) => setServiceTypeId(event.target.value)}
        >
          <option value="">{UI_TEXT.selectService}</option>
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
          {UI_TEXT.noServiceTypesAreCurrentlyAvailablePleaseContactSupport}
        </p>
      )}
      <button
        className="primary-btn"
        disabled={busy || checking || !coupon?.availableCoupons}
        onClick={() => void book()}
      >
        {busy ? UI_TEXT.initiatingBooking : UI_TEXT.bookFreeConsultation}
      </button>
      {error && <p role="alert">{error}</p>}
      <p>{UI_TEXT.yourBookingWillBeInitiatedForTheHospitalTo}</p>
      <Link to="/ConsultationList">{UI_TEXT.viewMyBookings}</Link>
    </>
  );
}
