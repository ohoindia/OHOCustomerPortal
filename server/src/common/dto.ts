import { IsBoolean, IsInt, IsOptional, IsString, IsUUID, Matches, Max, MaxLength, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MobileDto {
  @ApiProperty({ example: '9876543210', pattern: '^[6-9]\\d{9}$', description: 'Ten-digit Indian mobile number.' })
  @Matches(/^[6-9]\d{9}$/) mobileNumber!: string;
}
export class LoginDto extends MobileDto {
  @ApiProperty({ example: '4321', pattern: '^\\d{4}$', writeOnly: true })
  @Matches(/^\d{4}$/) password!: string;
}
export class OtpDto extends MobileDto {
  @ApiProperty({ example: '2f842899-28ac-4f0b-a2da-258529e5d0b3', format: 'uuid', description: 'Proof GUID returned by the OTP send endpoint.' })
  @IsUUID() guid!: string;
  @ApiProperty({ example: '123456', pattern: '^\\d{6}$', writeOnly: true })
  @Matches(/^\d{6}$/) otpGenerated!: string;
}
export class RegisterDto extends OtpDto {
  @ApiProperty({ example: 'Example Customer', maxLength: 150 })
  @IsString() @MaxLength(150) @Matches(/\S/) name!: string;
  @ApiProperty({ enum: ['Primary'], example: 'Primary' })
  @Matches(/^Primary$/) cardHolderType!: string;
}
export class ResetPasswordDto extends OtpDto {
  @ApiProperty({ example: '4321', pattern: '^\\d{4}$', writeOnly: true })
  @Matches(/^\d{4}$/) password!: string;
}
export class CustomerIdDto {
  @ApiProperty({ example: 12, minimum: 1, type: 'integer', description: 'Must match the authenticated customer ID.' })
  @IsInt() @Min(1) customerId!: number;
}
export class KycDto extends CustomerIdDto {
  @ApiProperty({ example: '123456789012', pattern: '^\\d{12}$', description: 'Must match the authenticated customer’s stored Aadhaar number.' })
  @Matches(/^\d{12}$/) aadhaarNumber!: string;
}
export class AppointmentDto extends CustomerIdDto {
  @ApiPropertyOptional({ example: true, description: 'Optional coupon-claimed filter.' })
  @IsOptional() @IsBoolean() isCouponClaimed?: boolean;
}
export class PaginationDto {
  @ApiPropertyOptional({ default: 0, minimum: 0, type: 'integer' })
  @IsOptional() @IsInt() @Min(0) skip = 0;
  @ApiPropertyOptional({ default: 0, minimum: 0, maximum: 1000, type: 'integer', description: 'Zero returns all matching records.' })
  @IsOptional() @IsInt() @Min(0) @Max(1000) take = 0;
}
