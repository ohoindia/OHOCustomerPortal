import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { PaginationDto } from '../common/dto';
import { CatalogService } from './catalog.service';
@Controller(['ConfigValues', 'api/ConfigValues', 'apiLambda/ConfigValues'])
export class ConfigValuesController {
  constructor(private readonly service: CatalogService) {}
  @Post('all') @HttpCode(200)
  all(@Body() dto: PaginationDto) { return this.service.configValues(dto); }
}
@Controller(['Products', 'api/Products', 'apiLambda/Products'])
export class ProductsController {
  constructor(private readonly service: CatalogService) {}
  @Post('all') @HttpCode(200)
  all(@Body() dto: PaginationDto) { return this.service.products(dto); }
}
