import {
  ApiTags,
  ApiOperation,
  ApiBadRequestResponse,
  ApiOkResponse,
  ApiBearerAuth,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
} from "@nestjs/swagger";
import { CurrentSession, requireOwner } from "../auth/current-session";
import { SessionClaims } from "../auth/session.service";
import { Body, Controller, HttpCode, Post } from "@nestjs/common";
import { AppointmentDto } from "../common/dto";
import { ConsultationsService } from "./consultations.service";
import { BookServiceService } from "./book-service.service";
import { BookServiceDto, CouponDto } from "./booking.dto";
@ApiTags("Consultations")
@ApiBadRequestResponse({ description: "Malformed or invalid request." })
@ApiBearerAuth("jwt")
@ApiUnauthorizedResponse({
  description: "Missing, invalid, expired, or revoked session.",
})
@ApiForbiddenResponse({
  description: "Requested data does not belong to the authenticated account.",
})
@Controller("api/BookingConsultation")
export class ConsultationsController {
  constructor(
    private readonly service: ConsultationsService,
    private readonly booking: BookServiceService,
  ) {}
  @Post("walletOpds")
  @HttpCode(200)
  @ApiOperation({
    summary: "Read family OPD entitlement and utilization for the wallet",
  })
  walletOpds(
    @Body() dto: AppointmentDto,
    @CurrentSession() session: SessionClaims,
  ) {
    requireOwner(session, "customerId", dto.customerId);
    return this.service.walletOpds(dto.customerId);
  }
  @Post("checkAvailableCoupons")
  @HttpCode(200)
  @ApiOperation({
    summary: "Check free consultation coupon availability for your patient",
  })
  coupons(@Body() dto: CouponDto, @CurrentSession() session: SessionClaims) {
    requireOwner(session, "customerId", dto.customerId);
    return this.booking.coupons(dto);
  }
  @Post("checkIndividualCoupons")
  @HttpCode(200)
  individualCoupons(
    @Body() dto: CouponDto,
    @CurrentSession() session: SessionClaims,
  ) {
    requireOwner(session, "customerId", dto.customerId);
    return this.booking.coupons(dto);
  }
  @Post("bookAppointment/add")
  @HttpCode(200)
  @ApiOperation({
    summary: "Initiate a free consultation booking for your patient",
  })
  book(@Body() dto: BookServiceDto, @CurrentSession() session: SessionClaims) {
    requireOwner(session, "customerId", dto.customerId);
    return this.booking.book(dto);
  }
  @Post("PendingAndSuccessConsultationList")
  @HttpCode(200)
  @ApiOperation({ summary: "Read your pending and successful consultations" })
  @ApiOkResponse({
    schema: {
      type: "array",
      items: { type: "object", additionalProperties: true },
    },
  })
  list(@Body() dto: AppointmentDto, @CurrentSession() session: SessionClaims) {
    requireOwner(session, "customerId", dto.customerId);
    return this.service.list(dto);
  }
}
