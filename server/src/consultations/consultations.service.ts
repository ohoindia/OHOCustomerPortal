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
  async walletOpds(customerId: number) {
    const cards = await this.db.rows(
      `SELECT OHOCardnumber, IsActivated, DATE_FORMAT(StartDate, '%Y-%m-%d') AS StartDate,
      DATE_FORMAT(EndDate, '%Y-%m-%d') AS EndDate,
      (StartDate IS NOT NULL AND DATE(StartDate) <= DATE(CONVERT_TZ(UTC_TIMESTAMP(), '+00:00', '+05:30'))) AS HasStarted,
      (IsActivated = TRUE AND DATE(EndDate) >= DATE(CONVERT_TZ(UTC_TIMESTAMP(), '+00:00', '+05:30'))
      AND (StartDate IS NULL OR DATE(StartDate) <= DATE(CONVERT_TZ(UTC_TIMESTAMP(), '+00:00', '+05:30')))) AS IsValid
      FROM OHOCards WHERE CustomerId = ? ORDER BY IsValid DESC, EndDate DESC, OHOCardsId DESC LIMIT 1`,
      [customerId],
    );
    const card = cards[0];
    const usage = card
      ? await this.db.rows(
          `SELECT COALESCE(bc.DependentCustomerId, bc.CustomerId) AS CustomerId,
      MAX(bc.Name) AS Name, COUNT(*) AS UsedOpds FROM BookingConsultation bc
      JOIN HospitalPolicies hp ON hp.HospitalPoliciesId = bc.HospitalPoliciesId
      LEFT JOIN Status s ON s.StatusId = bc.Status
      WHERE (bc.CustomerId = ? OR EXISTS (
        SELECT 1 FROM Customer family WHERE family.CustomerId = bc.CustomerId AND family.RelatedCustomerId = ?
      )) AND hp.PoliciesType = 'Free Consultation'
      AND bc.CardNumber = ?
      AND (? IS NULL OR DATE(COALESCE(bc.AppointmentDate, bc.BookingDate)) >= ?)
      AND DATE(COALESCE(bc.AppointmentDate, bc.BookingDate)) <= ?
      AND (bc.IsCouponClaimed = TRUE OR LOWER(TRIM(s.Value)) IN ('visited', 'success', 'successful', 'successful visit'))
      GROUP BY COALESCE(bc.DependentCustomerId, bc.CustomerId)`,
          [
            customerId,
            customerId,
            String(card.OHOCardnumber ?? ""),
            card.StartDate ? String(card.StartDate) : null,
            card.StartDate ? String(card.StartDate) : null,
            String(card.EndDate ?? ""),
          ],
        )
      : [];
    const family = await this.db.rows(
      "SELECT CustomerId, Name FROM Customer WHERE CustomerId = ? OR RelatedCustomerId = ? ORDER BY CustomerId",
      [customerId, customerId],
    );
    const totalOpds = card ? 24 : 0;
    const cardValid = Number(card?.IsValid ?? 0) === 1;
    const usedOpds = usage.reduce(
      (total, row) => total + Math.max(0, Number(row.UsedOpds ?? 0)),
      0,
    );
    const members = [
      ...family,
      ...usage.filter(
        (row) =>
          !family.some(
            (member) => Number(member.CustomerId) === Number(row.CustomerId),
          ),
      ),
    ].map((member) => {
      const used = Math.max(
        0,
        Number(
          usage.find(
            (row) => Number(row.CustomerId) === Number(member.CustomerId),
          )?.UsedOpds ?? 0,
        ),
      );
      return {
        customerId: Number(member.CustomerId),
        name: String(member.Name || "Family member"),
        usedOpds: used,
        utilizedAmount: used * 500,
      };
    });
    return [
      {
        totalOpds,
        usedOpds,
        availableOpds: cardValid ? Math.max(0, totalOpds - usedOpds) : 0,
        cardValid,
        cardExpiry: card?.EndDate ?? null,
        subscriptionCredit:
          card?.StartDate &&
          Number(card.IsActivated) === 1 &&
          Number(card.HasStarted) === 1
            ? {
                date: card.StartDate,
                reference: String(card.OHOCardnumber ?? ""),
                opds: totalOpds,
                labAndMedicines: 25000,
              }
            : null,
        members,
      },
    ];
  }
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
