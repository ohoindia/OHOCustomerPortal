import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from "class-validator";

export class PersonDto {
  @IsString() @MaxLength(100) @Matches(/\S/) fullName!: string;
  @IsDateString() dateofBirth!: string;
  @IsIn(["Male", "Female", "Other"]) gender!: string;
  @IsOptional() @Matches(/^[6-9]\d{9}$/) mobileNumber?: string;
  @IsString() @MaxLength(20) @Matches(/\S/) relationship!: string;
}
export class PurchaseDto extends PersonDto {
  @IsInt() @Min(1) productsId!: number;
}
export class NomineeDto extends PersonDto {
  @IsInt() @Min(1) productsId!: number;
  @IsOptional() @IsString() @MaxLength(100) guardianName?: string;
  @IsOptional() @IsDateString() guardianDateofBirth?: string;
  @IsOptional() @IsIn(["Male", "Female", "Other"]) guardianGender?: string;
  @IsOptional() @IsString() @MaxLength(50) guardianRelationship?: string;
  @IsOptional() @Matches(/^[6-9]\d{9}$/) guardianMobileNumber?: string;
}
export class PaymentMethodDto {
  @IsInt() @Min(1) paymentTypeId!: number;
}
