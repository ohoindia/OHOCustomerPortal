import { AuthResponseDto } from '../common/auth-response.dto';
import { ApiTags, ApiOperation, ApiBadRequestResponse, ApiOkResponse } from '@nestjs/swagger';
import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { LoginDto, MobileDto, OtpDto, RegisterDto, ResetPasswordDto } from '../common/dto';
import { CustomerAuthService } from './customer-auth.service';
import { Public } from '../auth/jwt-auth.guard';

@ApiTags('Authentication')
@ApiBadRequestResponse({ description: 'Malformed or invalid request.' })
@ApiOkResponse({ type: AuthResponseDto })
@Controller('lambdaAPI/Customer')
@Public()
export class CustomerAuthController {
  constructor(private readonly service: CustomerAuthService) {}
  @Post('mobileNoValid') @HttpCode(200)
  @ApiOperation({ summary: 'Check whether a mobile number is registered' })
  mobileNoValid(@Body() dto: MobileDto) { return this.service.mobileNoValid(dto); }
  @Post('checkingMobileno') @HttpCode(200)
  @ApiOperation({ summary: 'Send a registration OTP' })
  registrationOtp(@Body() dto: MobileDto) { return this.service.sendOtp(dto, false); }
  @Post('toSetNewPassword') @HttpCode(200)
  @ApiOperation({ summary: 'Send a password-reset OTP' })
  resetOtp(@Body() dto: MobileDto) { return this.service.sendOtp(dto, true); }
  @Post('OTPValidation') @HttpCode(200)
  @ApiOperation({ summary: 'Validate an OTP proof' })
  validateOtp(@Body() dto: OtpDto) { return this.service.validateOtp(dto); }
  @Post('memberlogin') @HttpCode(200)
  @ApiOperation({ summary: 'Log in and issue a JWT session' })
  login(@Body() dto: LoginDto) { return this.service.login(dto); }
  @Post('add') @HttpCode(200)
  @ApiOperation({ summary: 'Register with an OTP proof and issue a JWT session' })
  register(@Body() dto: RegisterDto) { return this.service.register(dto); }
  @Post('updatePassword') @HttpCode(200)
  @ApiOperation({ summary: 'Reset password with an OTP proof' })
  resetPassword(@Body() dto: ResetPasswordDto) { return this.service.resetPassword(dto); }
}
