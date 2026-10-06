import { Injectable } from "@nestjs/common";
import { AppointmentDto } from "../common/dto";
import { DatabaseService, SqlValue } from "../database/database.service";
import { RuntimeConfigService } from "../runtime-config/runtime-config.service";
@Injectable()
export class ConsultationsService {
  constructor(
    private readonly db: DatabaseService,
    private readonly config: RuntimeConfigService,
  ) {}
  async list(dto: AppointmentDto) {
    const values: SqlValue[] = [dto.customerId, dto.customerId];
    const coupon =
      dto.isCouponClaimed === undefined ? "" : " AND bc.IsCouponClaimed = ?";
    if (dto.isCouponClaimed !== undefined) values.push(dto.isCouponClaimed);
    const rows = await this.db.rows(
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
    if (!rows.some((row) => !row.QRCode && row.IdHashCode)) return rows;
    const base = (await this.config.get("ConsultationApproveURL")).trim();
    if (!/^https?:\/\//i.test(base)) return rows;
    return rows.map((row) => ({
      ...row,
      // Match the legacy backend URL exactly when no saved PNG exists.
      ...(!row.QRCode && row.IdHashCode
        ? { QRCodeUrl: `${base}${row.IdHashCode}` }
        : {}),
    }));
  }
}
