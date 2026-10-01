import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { AppointmentDto } from '../common/dto';
import { ConsultationsService } from './consultations.service';
@Controller('lambdaAPI/BookingConsultation')
export class ConsultationsController {
  constructor(private readonly service: ConsultationsService) {}
  @Post('PendingAndSuccessConsultationList') @HttpCode(200)
  list(@Body() dto: AppointmentDto) { return this.service.list(dto); }
}
