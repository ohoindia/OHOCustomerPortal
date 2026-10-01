import { Injectable } from '@nestjs/common';
import { PaginationDto } from '../common/dto';
import { DatabaseService } from '../database/database.service';
@Injectable()
export class CatalogService {
  constructor(private readonly db: DatabaseService) {}
  configValues(dto: PaginationDto) {
    // Only the two public columns used by the customer app; ConfigSecrets is deliberately separate.
    return this.paginate('SELECT ConfigKey, ConfigValue FROM ConfigValues', dto);
  }
  products(dto: PaginationDto) { return this.paginate('SELECT * FROM ProductsDetails', dto); }
  private paginate(query: string, dto: PaginationDto) {
    // Numeric DTOs are validated; LIMIT literals avoid MySQL prepared LIMIT incompatibilities.
    return this.db.rows(dto.take > 0 ? `${query} LIMIT ${dto.skip}, ${dto.take}` : query);
  }
}
