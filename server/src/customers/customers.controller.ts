import { Body, Controller, Get, HttpCode, Param, ParseIntPipe, Post } from '@nestjs/common';
import { CustomerIdDto, KycDto } from '../common/dto';
import { CustomersService } from './customers.service';
@Controller('lambdaAPI/Customer')
export class CustomersController {
  constructor(private readonly service: CustomersService) {}
  @Get('GetById/:id')
  getById(@Param('id', ParseIntPipe) id: number) { return this.service.getById(id); }
  @Get('GetMemberProducts/:id')
  products(@Param('id', ParseIntPipe) id: number) { return this.service.products(id); }
  @Get('AddressExistsOrNot/:id')
  address(@Param('id', ParseIntPipe) id: number) { return this.service.address(id); }
  @Post('KYCVerifiedOrNot') @HttpCode(200)
  kyc(@Body() dto: KycDto) { return this.service.kyc(dto); }
  @Post('PANVerifiedOrNot') @HttpCode(200)
  pan(@Body() dto: CustomerIdDto) { return this.service.pan(dto.customerId); }
}
