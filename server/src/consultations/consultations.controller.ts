import { ApiTags, ApiOperation, ApiBadRequestResponse, ApiOkResponse, ApiBearerAuth, ApiUnauthorizedResponse, ApiForbiddenResponse } from '@nestjs/swagger';
import { CurrentSession, requireOwner } from '../auth/current-session';
import { SessionClaims } from '../auth/session.service';
import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { AppointmentDto } from '../common/dto';
import { ConsultationsService } from './consultations.service';
@ApiTags('Consultations')
@ApiBadRequestResponse({ description: 'Malformed or invalid request.' })
@ApiBearerAuth('jwt')
@ApiUnauthorizedResponse({ description: 'Missing, invalid, expired, or revoked session.' })
@ApiForbiddenResponse({ description: 'Requested data does not belong to the authenticated account.' })
@Controller('lambdaAPI/BookingConsultation')
export class ConsultationsController {
  constructor(private readonly service: ConsultationsService) {}
  @Post('PendingAndSuccessConsultationList') @HttpCode(200)
  @ApiOperation({ summary: 'Read your pending and successful consultations' })
  @ApiOkResponse({ schema: {"type":"array","items":{"type":"object","additionalProperties":true}} })
  list(@Body() dto: AppointmentDto, @CurrentSession() session: SessionClaims) { requireOwner(session, 'customerId', dto.customerId); return this.service.list(dto); }
}
