import { Module } from "@nestjs/common";
import { ConsultationsController } from "./consultations.controller";
import { ConsultationsService } from "./consultations.service";
import { BookServiceService } from "./book-service.service";
import { BookingPaymentsController } from "./booking-payments.controller";
import { BookingPaymentsService } from "./booking-payments.service";
@Module({
  controllers: [ConsultationsController, BookingPaymentsController],
  providers: [ConsultationsService, BookServiceService, BookingPaymentsService],
})
export class ConsultationsModule {}
