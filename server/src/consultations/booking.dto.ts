import {
  IsInt,
  IsOptional,
  Min,
  IsISO8601,
  IsString,
  MaxLength,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { CustomerIdDto } from "../common/dto";

export class CouponDto extends CustomerIdDto {
  @ApiProperty({ minimum: 1 })
  @IsInt()
  @Min(1)
  hospitalId!: number;

  @ApiPropertyOptional({ minimum: 1, nullable: true })
  @IsOptional()
  @IsInt()
  @Min(1)
  dependentCustomerId?: number | null;
}

export class BookServiceDto extends CouponDto {
  @ApiProperty()
  @IsISO8601({ strict: true })
  appointmentDate!: string;

  @ApiProperty({ minimum: 1 })
  @IsInt()
  @Min(1)
  serviceTypeId!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;

  @ApiProperty({ minimum: 1 })
  @IsInt()
  @Min(1)
  hospitalPoliciesId!: number;
}
