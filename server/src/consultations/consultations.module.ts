import { Module } from "@nestjs/common";
import { ConsultationsController } from "./consultations.controller";
import { ConsultationsService } from "./consultations.service";
import { BookServiceService } from "./book-service.service";
@Module({
  controllers: [ConsultationsController],
  providers: [ConsultationsService, BookServiceService],
})
export class ConsultationsModule {}
