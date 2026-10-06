import { Injectable } from "@nestjs/common";
import { PaginationDto } from "../common/dto";
import { DatabaseService } from "../database/database.service";
@Injectable()
export class CatalogService {
  constructor(private readonly db: DatabaseService) {}
  configValues(dto: PaginationDto) {
    // Only settings consumed by the customer app may leave the server.
    return this.paginate(
      "SELECT ConfigKey, ConfigValue FROM ConfigValues WHERE ConfigKey IN ('HealthTip', 'OHOCareMobileNumber', 'BizManageVersion', 'BizManageAppLocation') ORDER BY ConfigValuesId",
      dto,
    );
  }
  products(dto: PaginationDto) {
    return this.paginate("SELECT * FROM ProductsDetails", dto);
  }
  private paginate(query: string, dto: PaginationDto) {
    // Numeric DTOs are validated; LIMIT literals avoid MySQL prepared LIMIT incompatibilities.
    return this.db.rows(
      dto.take > 0 ? `${query} LIMIT ${dto.skip}, ${dto.take}` : query,
    );
  }
}
