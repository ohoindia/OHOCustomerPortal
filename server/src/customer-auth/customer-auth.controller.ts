import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { LoginDto, MobileDto, OtpDto, RegisterDto, ResetPasswordDto } from '../common/dto';
import { CustomerAuthService } from './customer-auth.service';

@Controller('lambdaAPI/Customer')
export class CustomerAuthController {
  constructor(private readonly service: CustomerAuthService) {}
  @Post('mobileNoValid') @HttpCode(200)
  mobileNoValid(@Body() dto: MobileDto) { return this.service.mobileNoValid(dto); }
  @Post('checkingMobileno') @HttpCode(200)
  registrationOtp(@Body() dto: MobileDto) { return this.service.sendOtp(dto, false); }
  @Post('toSetNewPassword') @HttpCode(200)
  resetOtp(@Body() dto: MobileDto) { return this.service.sendOtp(dto, true); }
  @Post('OTPValidation') @HttpCode(200)
  validateOtp(@Body() dto: OtpDto) { return this.service.validateOtp(dto); }
  @Post('memberlogin') @HttpCode(200)
  login(@Body() dto: LoginDto) { return this.service.login(dto); }
  @Post('add') @HttpCode(200)
  register(@Body() dto: RegisterDto) { return this.service.register(dto); }
  @Post('updatePassword') @HttpCode(200)
  resetPassword(@Body() dto: ResetPasswordDto) { return this.service.resetPassword(dto); }
}
