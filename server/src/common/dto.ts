import { IsBoolean, IsInt, IsOptional, IsString, IsUUID, Matches, Max, MaxLength, Min } from 'class-validator';

export class MobileDto {
  @Matches(/^[6-9]\d{9}$/) mobileNumber!: string;
}
export class LoginDto extends MobileDto {
  @Matches(/^\d{4}$/) password!: string;
}
export class OtpDto extends MobileDto {
  @IsUUID() guid!: string;
  @Matches(/^\d{6}$/) otpGenerated!: string;
}
export class RegisterDto extends OtpDto {
  @IsString() @MaxLength(150) @Matches(/\S/) name!: string;
  @Matches(/^Primary$/) cardHolderType!: string;
}
export class ResetPasswordDto extends OtpDto {
  @Matches(/^\d{4}$/) password!: string;
}
export class CustomerIdDto {
  @IsInt() @Min(1) customerId!: number;
}
export class KycDto extends CustomerIdDto {
  @Matches(/^\d{12}$/) aadhaarNumber!: string;
}
export class AppointmentDto extends CustomerIdDto {
  @IsOptional() @IsBoolean() isCouponClaimed?: boolean;
}
export class PaginationDto {
  @IsOptional() @IsInt() @Min(0) skip = 0;
  @IsOptional() @IsInt() @Min(0) @Max(1000) take = 0;
}
