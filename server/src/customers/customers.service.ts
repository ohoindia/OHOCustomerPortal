import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { DatabaseService } from "../database/database.service";
import { KycDto } from "../common/dto";
import { toMember } from "./member.mapper";
import { transformSubscriptions } from "./subscriptions.mapper";

export function validId(id: number) {
  if (!Number.isSafeInteger(id) || id <= 0)
    throw new BadRequestException("A positive integer ID is required.");
  return id;
}
@Injectable()
export class CustomersService {
  constructor(private readonly db: DatabaseService) {}
  async getById(id: number) {
    return (
      await this.db.rows("SELECT * FROM Customer WHERE CustomerId = ?", [
        validId(id),
      ])
    ).map((row) => ({ ...toMember(row), CustomerId: row.CustomerId }));
  }
  async products(id: number) {
    return transformSubscriptions(
      await this.db.rows("SELECT * FROM View_Subscription WHERE MemberId = ?", [
        validId(id),
      ]),
    );
  }
  async address(id: number) {
    const rows = await this.db.rows(
      "SELECT Name, AddressLine1 FROM Customer WHERE CustomerId = ?",
      [validId(id)],
    );
    const status = Boolean(rows[0]?.AddressLine1);
    return {
      status,
      message: `${status ? "Already Address Exists" : "Address not found"} for this Customer : ${rows[0]?.Name ?? ""}`,
    };
  }
  async kyc(dto: KycDto) {
    const customer = await this.db.rows(
      "SELECT AadhaarNumber FROM Customer WHERE CustomerId = ?",
      [validId(dto.customerId)],
    );
    if (String(customer[0]?.AadhaarNumber ?? "") !== dto.aadhaarNumber)
      throw new ForbiddenException(
        "Aadhaar number does not belong to this customer.",
      );
    const rows = await this.db.rows(
      "SELECT CustomerId FROM AadhaarOTPVerificationData WHERE AadhaarNumber = ? AND Status IN ('VALID', 'success') ORDER BY AadharOTPVerificationDataId DESC LIMIT 1",
      [dto.aadhaarNumber],
    );
    if (
      Number(rows[0]?.CustomerId ?? 0) > 0 &&
      Number(rows[0].CustomerId) !== dto.customerId
    )
      throw new ForbiddenException("Verification belongs to another customer.");
    if (rows.length && Number(rows[0].CustomerId ?? 0) <= 0) {
      await this.db.execute(
        "UPDATE AadhaarOTPVerificationData SET CustomerId = ? WHERE AadhaarNumber = ? AND Status IN ('VALID', 'success') AND (CustomerId IS NULL OR CustomerId <= 0) ORDER BY AadharOTPVerificationDataId DESC LIMIT 1",
        [dto.customerId, dto.aadhaarNumber],
      );
    }
    return {
      status: rows.length > 0,
      message: rows.length ? "KYC Already Verified" : "KYC not Verified",
    };
  }
  async pan(id: number) {
    const rows = await this.db.rows(
      "SELECT PANDocument, Valid FROM PANVerification WHERE CustomerId = ? AND Valid = TRUE",
      [validId(id)],
    );
    return {
      status: Boolean(rows[0]?.PANDocument),
      message: !rows.length
        ? "PAN not verified "
        : rows[0].PANDocument
          ? "PAN Details already verified"
          : "Pending to upload",
    };
  }
}
