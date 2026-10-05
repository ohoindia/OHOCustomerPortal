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
export class NomineeDto {
  @IsInt() @Min(1) productsId!: number;
  @IsInt() @Min(1) familyOrderId!: number;
  @IsOptional() @IsInt() @Min(1) guardianOrderId?: number;
}
export class PaymentMethodDto {
  @IsInt() @Min(1) paymentTypeId!: number;
}

export class CreatePaymentLinkDto extends PaymentMethodDto {
  @IsInt() @Min(1) orderId!: number;
}
