import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  ServiceUnavailableException,
} from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { Connection, DatabaseService } from "../database/database.service";
import { BookServiceDto, CouponDto } from "./booking.dto";

function istToday() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}
function dateOnly(value: unknown) {
  if (value instanceof Date)
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(value);
  return String(value ?? "").slice(0, 10);
}
@Injectable()
export class BookServiceService {
  constructor(private readonly db: DatabaseService) {}

  private async patient(dto: CouponDto, connection?: Connection) {
    const id = dto.dependentCustomerId ?? dto.customerId;
    const rows = await this.db.rows(
      "SELECT CustomerId, RelatedCustomerId, Name, Gender, Age, DateofBirth, MobileNumber, AddressLine1 FROM Customer WHERE CustomerId = ?",
      [id],
      connection,
    );
    if (
      !rows[0] ||
      (dto.dependentCustomerId != null &&
        Number(rows[0].RelatedCustomerId) !== dto.customerId)
    )
      throw new ForbiddenException(
        "The selected patient does not belong to your account.",
      );
    return rows[0];
  }

  private async card(customerId: number, connection?: Connection) {
    const rows = await this.db.rows(
      "SELECT OHOCardsId, OHOCardnumber, StartDate, EndDate, IsActivated FROM OHOCards WHERE CustomerId = ? AND IsActivated = TRUE ORDER BY EndDate DESC LIMIT 1",
      [customerId],
      connection,
    );
    const card = rows[0];
    const today = istToday();
    if (
      !card ||
      !card.IsActivated ||
      !/^\d{4}-\d{2}-\d{2}$/.test(dateOnly(card.EndDate)) ||
      dateOnly(card.EndDate) < today ||
      (card.StartDate && dateOnly(card.StartDate) > today)
    )
      throw new BadRequestException(
        "An active, unexpired membership card is required to book this service.",
      );
    return card;
  }

  private async availability(dto: CouponDto, connection?: Connection) {
    // Same product/combination entitlement source as the .NET coupon endpoints.
    const entitlement = await this.db.rows(
      `SELECT MAX(entitlements.HospitalCoupons) AS MaxHospitalCoupons FROM (
      SELECT p.HospitalCoupons FROM Subscription s JOIN Products p ON p.ProductsId = s.ProductsId WHERE s.CustomerId = ?
      UNION ALL SELECT p.HospitalCoupons FROM Subscription s JOIN Products combo ON combo.ProductsId = s.ProductsId AND combo.IsCombo = TRUE JOIN ComboProducts cp ON cp.ComboId = combo.ProductsId JOIN Products p ON p.ProductsId = cp.ProductsId WHERE s.CustomerId = ?
    ) entitlements`,
      [dto.customerId, dto.customerId],
      connection,
    );
    const rawMax = Number(entitlement[0]?.MaxHospitalCoupons ?? 0);
    const maximum = rawMax === 24 ? 4 : rawMax;
    const used = await this.db.rows(
      "SELECT COUNT(*) AS UsedCoupons FROM BookingConsultation bc JOIN HospitalPolicies hp ON hp.HospitalPoliciesId = bc.HospitalPoliciesId WHERE bc.CustomerId = ? AND hp.PoliciesType = 'Free Consultation' AND bc.IsCouponClaimed = TRUE",
      [dto.customerId],
      connection,
    );
    const individual = await this.db.rows(
      "SELECT COUNT(*) AS UsedCoupons FROM BookingConsultation bc JOIN HospitalPolicies hp ON hp.HospitalPoliciesId = bc.HospitalPoliciesId WHERE bc.CustomerId = ? AND bc.DependentCustomerId <=> ? AND hp.PoliciesType = 'Free Consultation' AND bc.IsCouponClaimed = TRUE",
      [dto.customerId, dto.dependentCustomerId ?? null],
      connection,
    );
    const extras = await this.db.rows(
      "SELECT COALESCE(SUM(NumberOfCoupons), 0) AS AvailableCoupons FROM RequestedCoupons WHERE CustomerId = ? AND HospitalId = ? AND DATE(EndDate) >= ?",
      [dto.dependentCustomerId ?? dto.customerId, dto.hospitalId, istToday()],
      connection,
    );
    const extra = Math.max(0, Number(extras[0]?.AvailableCoupons ?? 0));
    const familyRemaining = Math.max(
      0,
      maximum - Number(used[0]?.UsedCoupons ?? 0),
    );
    const patientRemaining = Math.max(
      0,
      (maximum > 0 ? 1 : 0) + extra - Number(individual[0]?.UsedCoupons ?? 0),
    );
    const availableCoupons = Math.min(
      familyRemaining + extra,
      patientRemaining,
    );
    return {
      status: availableCoupons > 0,
      availableCoupons,
      message:
        availableCoupons > 0
          ? "Free consultation coupon available."
          : "No free consultation coupons are available for this patient.",
    };
  }

  async coupons(dto: CouponDto) {
    await this.patient(dto);
    await this.card(dto.customerId);
    return this.availability(dto);
  }

  async book(dto: BookServiceDto) {
    // Serialize family bookings so retries cannot create duplicate initiated visits.
    return this.db.transaction(async (connection) => {
      const patient = await this.patient(dto, connection);
      const card = await this.card(dto.customerId, connection);
      // The reference portal sends local appointment time in India.
      const appointment = new Date(
        /(Z|[+-]\d{2}:\d{2})$/.test(dto.appointmentDate ?? "")
          ? dto.appointmentDate
          : `${dto.appointmentDate}+05:30`,
      );
      if (
        !Number.isFinite(appointment.getTime()) ||
        appointment.getTime() < Date.now()
      )
        throw new BadRequestException(
          "Select a future appointment date and time.",
        );
      const appointmentDate = new Date(appointment.getTime() + 330 * 60000)
        .toISOString()
        .slice(0, 19)
        .replace("T", " ");
      const serviceTypes = await this.db.rows(
        "SELECT HospitalServicesId FROM HospitalServices WHERE HospitalServicesId = ? AND IsActive = TRUE",
        [dto.serviceTypeId],
        connection,
      );
      if (!serviceTypes.length)
        throw new BadRequestException("Select an available service type.");
      const service = await this.db.rows(
        "SELECT h.HospitalName, hp.PoliciesType FROM HospitalPoliciesProvision hpp JOIN Hospital h ON h.HospitalId = hpp.HospitalId JOIN HospitalPolicies hp ON hp.HospitalPoliciesId = hpp.HospitalPoliciesId WHERE hpp.HospitalId = ? AND hpp.HospitalPoliciesId = ? AND hpp.IsActive = TRUE AND h.IsActive = TRUE",
        [dto.hospitalId, dto.hospitalPoliciesId],
        connection,
      );
      if (!service[0] || service[0].PoliciesType !== "Free Consultation")
        throw new BadRequestException(
          "Free consultation is not available at the selected hospital.",
        );
      const coupons = await this.availability(dto, connection);
      if (!coupons.status) return coupons;
      const existing = await this.db.rows(
        "SELECT bc.BookingConsultationId FROM BookingConsultation bc JOIN Status s ON s.StatusId = bc.Status WHERE bc.CustomerId = ? AND bc.DependentCustomerId <=> ? AND DATE(bc.BookingDate) = ? AND s.Value = 'Initiated' LIMIT 1",
        [dto.customerId, dto.dependentCustomerId ?? null, istToday()],
        connection,
      );
      if (existing.length)
        return {
          status: false,
          message: "A booking is already initiated for this patient today.",
          data: { BookingConsultationId: existing[0].BookingConsultationId },
        };
      const statuses = await this.db.rows(
        "SELECT StatusId FROM Status WHERE Value = 'Initiated' AND IsActive = TRUE LIMIT 1",
        [],
        connection,
      );
      if (!statuses[0])
        throw new ServiceUnavailableException(
          "The booking status is not configured.",
        );
      const statusId = Number(statuses[0].StatusId);
      const hash = randomUUID();
      const result = await this.db.execute(
        `INSERT INTO BookingConsultation (CustomerId, DependentCustomerId, Name, Gender, Age, DateofBirth, MobileNumber, Address, CardNumber, HospitalId, HospitalName, HospitalPoliciesId, AppointmentDate, ServiceTypeId, Reason, Appointment, BookingDate, Status, IsActive, IsCouponClaimed, IdHashCode)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Free Consultation', CONVERT_TZ(UTC_TIMESTAMP(), '+00:00', '+05:30'), ?, TRUE, FALSE, ?)`,
        [
          dto.customerId,
          dto.dependentCustomerId ?? null,
          String(patient.Name ?? ""),
          String(patient.Gender ?? ""),
          patient.Age == null ? null : Number(patient.Age),
          patient.DateofBirth == null ? null : dateOnly(patient.DateofBirth),
          String(patient.MobileNumber ?? ""),
          String(patient.AddressLine1 ?? ""),
          String(card.OHOCardnumber ?? ""),
          dto.hospitalId,
          String(service[0].HospitalName),
          dto.hospitalPoliciesId,
          appointmentDate,
          dto.serviceTypeId,
          dto.reason?.trim() || null,
          statusId,
          hash,
        ],
        connection,
      );
      await this.db.execute(
        "INSERT INTO BookingConsultationActivity (BookingConsultationId, Status, CreatedDate, ActivityCategory) VALUES (?, ?, CONVERT_TZ(UTC_TIMESTAMP(), '+00:00', '+05:30'), 'Booking')",
        [result.insertId, statusId],
        connection,
      );
      return {
        status: true,
        message: "Your booking is successfully initiated.",
        data: { BookingConsultationId: result.insertId, IdHashCode: hash },
      };
    }, `oho-book-service:${dto.customerId}`);
  }
}
