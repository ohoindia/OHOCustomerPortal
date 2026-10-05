import { Injectable } from "@nestjs/common";
import { AppointmentDto } from "../common/dto";
import { DatabaseService, SqlValue } from "../database/database.service";
@Injectable()
export class ConsultationsService {
  constructor(private readonly db: DatabaseService) {}
  list(dto: AppointmentDto) {
    const values: SqlValue[] = [dto.customerId, dto.customerId];
    const coupon =
      dto.isCouponClaimed === undefined ? "" : " AND bc.IsCouponClaimed = ?";
    if (dto.isCouponClaimed !== undefined) values.push(dto.isCouponClaimed);
    return this.db.rows(
      `SELECT bc.*, hs.ServiceName, s.Value AS StatusName, hp.PoliciesType,
      h.HospitalName FROM BookingConsultation bc
      LEFT JOIN HospitalServices hs ON bc.ServiceTypeId = hs.HospitalServicesId
      LEFT JOIN Status s ON s.StatusId = bc.Status
      LEFT JOIN HospitalPolicies hp ON hp.HospitalPoliciesId = bc.HospitalPoliciesId
      LEFT JOIN Hospital h ON h.HospitalId = bc.HospitalId
      WHERE (bc.CustomerId = ? OR EXISTS (
        SELECT 1 FROM Customer family
        WHERE family.CustomerId = bc.CustomerId AND family.RelatedCustomerId = ?
      ))${coupon} ORDER BY bc.BookingDate DESC`,
      values,
    );
  }
}
