import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Post,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentSession } from "../auth/current-session";
import { SessionClaims } from "../auth/session.service";
import {
  PrepareBookingPaymentDto,
  ReportBookingPaymentDto,
} from "./booking-payment.dto";
import { BookingPaymentsService } from "./booking-payments.service";

@ApiTags("Hospital booking payments")
@ApiBearerAuth("jwt")
@Controller("api/BookingConsultation/:bookingId/payments")
export class BookingPaymentsController {
  constructor(private readonly payments: BookingPaymentsService) {}

  @Get()
  @ApiOperation({
    summary:
      "Read approved hospital payee and payment-attempt history for your booking",
  })
  list(
    @Param("bookingId", ParseIntPipe) bookingId: number,
    @CurrentSession() session: SessionClaims,
  ) {
    return this.payments.list(bookingId, session.customerId);
  }

  @Post()
  @HttpCode(200)
  @ApiOperation({
    summary:
      "Validate a hospital UPI QR and prepare an idempotent booking payment",
  })
  prepare(
    @Param("bookingId", ParseIntPipe) bookingId: number,
    @Body() dto: PrepareBookingPaymentDto,
    @CurrentSession() session: SessionClaims,
  ) {
    return this.payments.prepare(bookingId, session.customerId, dto);
  }

  @Post(":attemptId/result")
  @HttpCode(200)
  @ApiOperation({
    summary:
      "Record an unverified payment-app callback without marking the booking paid",
  })
  report(
    @Param("bookingId", ParseIntPipe) bookingId: number,
    @Param("attemptId", new ParseUUIDPipe({ version: "4" })) attemptId: string,
    @Body() dto: ReportBookingPaymentDto,
    @CurrentSession() session: SessionClaims,
  ) {
    return this.payments.report(bookingId, session.customerId, attemptId, dto);
  }
}
