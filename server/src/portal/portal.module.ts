import {
  Body,
  Controller,
  Get,
  HttpCode,
  Injectable,
  Module,
  Param,
  ParseIntPipe,
  Post,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { DatabaseService } from "../database/database.service";
import { DatabaseModule } from "../database/database.module";
import { CurrentSession, requireOwner } from "../auth/current-session";
import { SessionClaims } from "../auth/session.service";
import { validId } from "../customers/customers.service";
import { toMember } from "../customers/member.mapper";
import { PaginationDto } from "../common/dto";

// The reference backend splits these contracts across several hosts. Customer
// clients use one /api namespace here, with the same session guard as the app.
@Injectable()
export class PortalService {
  constructor(private readonly db: DatabaseService) {}

  async dependents(customerId: number) {
    return (
      await this.db.rows("SELECT * FROM Customer WHERE RelatedCustomerId = ?", [
        validId(customerId),
      ])
    ).map((row) => ({
      ...toMember(row),
      CustomerId: row.CustomerId,
      Relationship: row.Relationship ?? null,
    }));
  }

  hospitals(dto: PaginationDto) {
    return this.db.rows(
      `SELECT HospitalId, HospitalName, Specialization, AddressLine1, AddressLine2, City, MobileNumber, Landline, Latitude, Longitude, HospitalCode FROM Hospital WHERE IsActive = TRUE ORDER BY HospitalName${dto.take > 0 ? ` LIMIT ${dto.skip}, ${dto.take}` : ""}`,
    );
  }

  hospitalServices() {
    return this.db.rows(
      "SELECT HospitalServicesId, ServiceName FROM HospitalServices WHERE IsActive = TRUE ORDER BY ServiceName",
    );
  }

  hospital(id: number) {
    return this.db.rows(
      "SELECT HospitalId, HospitalName, Specialization, AddressLine1, AddressLine2, City, MobileNumber, Landline, Latitude, Longitude, HospitalCode FROM Hospital WHERE HospitalId = ? AND IsActive = TRUE",
      [validId(id)],
    );
  }

  services(id: number) {
    return this.db.rows(
      "SELECT hpp.HospitalPoliciesProvisionId, hpp.HospitalId, hpp.HospitalPoliciesId, hpp.DiscountPercentage, hp.PoliciesType FROM HospitalPoliciesProvision hpp LEFT JOIN HospitalPolicies hp ON hp.HospitalPoliciesId = hpp.HospitalPoliciesId WHERE hpp.HospitalId = ? AND hpp.IsActive = TRUE",
      [validId(id)],
    );
  }

  product(id: number) {
    return this.db.rows("SELECT * FROM ProductsDetails WHERE ProductsId = ?", [
      validId(id),
    ]);
  }
}

@ApiTags("Customer portal")
@ApiBearerAuth("jwt")
@Controller("api")
export class PortalController {
  constructor(private readonly service: PortalService) {}

  @Get("Customer/GetDependentsByCustomerId/:id")
  dependents(
    @Param("id", ParseIntPipe) id: number,
    @CurrentSession() session: SessionClaims,
  ) {
    requireOwner(session, "customerId", id);
    return this.service.dependents(id);
  }

  @Post("Hospital/all")
  @HttpCode(200)
  hospitals(@Body() dto: PaginationDto) {
    return this.service.hospitals(dto);
  }

  @Post("HospitalServices/all")
  @HttpCode(200)
  hospitalServices(@Body() _dto: PaginationDto) {
    return this.service.hospitalServices();
  }

  @Get("Hospital/GetById/:id")
  hospital(@Param("id", ParseIntPipe) id: number) {
    return this.service.hospital(id);
  }

  @Get("HospitalPoliciesProvision/GetByHospitalId/:id")
  services(@Param("id", ParseIntPipe) id: number) {
    return this.service.services(id);
  }

  @Get("Products/GetById/:id")
  product(@Param("id", ParseIntPipe) id: number) {
    return this.service.product(id);
  }
}

@Module({
  imports: [DatabaseModule],
  controllers: [PortalController],
  providers: [PortalService],
})
export class PortalModule {}
