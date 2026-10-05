import {
  Body,
  Controller,
  Get,
  HttpCode,
  Module,
  Param,
  ParseIntPipe,
  Post,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { CurrentSession } from "../auth/current-session";
import { SessionClaims } from "../auth/session.service";
import { DatabaseModule } from "../database/database.module";
import { RuntimeConfigModule } from "../runtime-config/runtime-config.module";
import {
  CreatePaymentLinkDto,
  NomineeDto,
  PaymentMethodDto,
  PersonDto,
  PurchaseDto,
} from "./purchase.dto";
import { PurchasesService } from "./purchases.service";

@ApiTags("Package purchases")
@ApiBearerAuth("jwt")
@Controller("api/purchases")
export class PurchasesController {
  constructor(private readonly service: PurchasesService) {}
  @Get("products/:id")
  product(@Param("id", ParseIntPipe) id: number) {
    return this.service.product(id);
  }
  @Post()
  @HttpCode(200)
  create(@Body() body: PurchaseDto, @CurrentSession() session: SessionClaims) {
    return this.service.create(session.customerId, body);
  }
  @Get(":id")
  get(
    @Param("id", ParseIntPipe) id: number,
    @CurrentSession() session: SessionClaims,
  ) {
    return this.service.snapshot(session.customerId, id);
  }
  @Post(":id/family")
  @HttpCode(200)
  family(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: PersonDto,
    @CurrentSession() session: SessionClaims,
  ) {
    return this.service.addFamily(session.customerId, id, body);
  }
  @Post(":id/family/:memberId/remove")
  @HttpCode(200)
  remove(
    @Param("id", ParseIntPipe) id: number,
    @Param("memberId", ParseIntPipe) memberId: number,
    @CurrentSession() session: SessionClaims,
  ) {
    return this.service.removeFamily(session.customerId, id, memberId);
  }
  @Post(":id/nominees")
  @HttpCode(200)
  nominee(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: NomineeDto,
    @CurrentSession() session: SessionClaims,
  ) {
    return this.service.nominee(session.customerId, id, body);
  }
  @Post(":id/payment")
  @HttpCode(200)
  payment(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: PaymentMethodDto,
    @CurrentSession() session: SessionClaims,
  ) {
    return this.service.payment(session.customerId, id, body.paymentTypeId);
  }
  @Get(":id/payment-status")
  status(
    @Param("id", ParseIntPipe) id: number,
    @CurrentSession() session: SessionClaims,
  ) {
    return this.service.paymentStatus(session.customerId, id);
  }
}
@ApiTags("Payments")
@ApiBearerAuth("jwt")
@Controller("api/payment")
export class PaymentController {
  constructor(private readonly service: PurchasesService) {}

  @Post("createPaymentLink")
  @HttpCode(200)
  create(
    @Body() body: CreatePaymentLinkDto,
    @CurrentSession() session: SessionClaims,
  ) {
    return this.service.payment(
      session.customerId,
      body.orderId,
      body.paymentTypeId,
    );
  }

  @Get("fetchPaymentLinksByLinkId/:linkId")
  fetch(
    @Param("linkId") linkId: string,
    @CurrentSession() session: SessionClaims,
  ) {
    return this.service.fetchPaymentLink(session.customerId, linkId);
  }
}

@Module({
  imports: [DatabaseModule, RuntimeConfigModule],
  controllers: [PurchasesController, PaymentController],
  providers: [PurchasesService],
})
export class PurchasesModule {}
