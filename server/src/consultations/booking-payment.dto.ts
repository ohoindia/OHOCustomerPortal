import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
} from "class-validator";

export class PrepareBookingPaymentDto {
  @ApiProperty({
    description:
      "The scanned upi://pay URI. If this hospital has an approved account configured, the payee must match it.",
  })
  @IsString()
  @MaxLength(2048)
  upiUri!: string;

  @ApiPropertyOptional({
    minimum: 0.01,
    maximum: 100000,
    description:
      "Required when the QR has no amount. Must match any amount in the QR.",
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2, allowInfinity: false, allowNaN: false })
  @Min(0.01)
  @Max(100000)
  amount?: number;

  @ApiProperty({
    format: "uuid",
    description: "Reuse this UUID when retrying the same prepare request.",
  })
  @IsUUID("4")
  clientRequestId!: string;

  @ApiPropertyOptional({
    description:
      "Selected installed payment app, saved before Android launches it.",
  })
  @IsOptional()
  @Matches(/^[A-Za-z][A-Za-z0-9_]*(?:\.[A-Za-z][A-Za-z0-9_]*)+$/)
  @MaxLength(200)
  appPackage?: string;
}

export class ReportBookingPaymentDto {
  @ApiProperty()
  @Matches(/^[A-Za-z][A-Za-z0-9_]*(?:\.[A-Za-z][A-Za-z0-9_]*)+$/)
  @MaxLength(200)
  appPackage!: string;

  @ApiProperty({ enum: ["SUCCESS", "CANCELLED", "FAILURE", "UNKNOWN"] })
  @IsIn(["SUCCESS", "CANCELLED", "FAILURE", "UNKNOWN"])
  outcome!: "SUCCESS" | "CANCELLED" | "FAILURE" | "UNKNOWN";

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  responseCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(-2147483648)
  @Max(2147483647)
  resultCode?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  txnId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  approvalRefNo?: string;

  @ApiPropertyOptional({
    description:
      "Untrusted Android activity response, retained for reconciliation only.",
  })
  @IsOptional()
  @IsString()
  @MaxLength(4096)
  rawResponse?: string;
}
