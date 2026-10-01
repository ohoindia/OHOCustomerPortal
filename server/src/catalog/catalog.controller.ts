import {
  ApiTags,
  ApiOperation,
  ApiBadRequestResponse,
  ApiOkResponse,
  ApiBearerAuth,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
} from "@nestjs/swagger";
import { Body, Controller, HttpCode, Post } from "@nestjs/common";
import { PaginationDto } from "../common/dto";
import { CatalogService } from "./catalog.service";
@ApiTags("Catalog")
@ApiBadRequestResponse({ description: "Malformed or invalid request." })
@ApiBearerAuth("jwt")
@ApiUnauthorizedResponse({
  description: "Missing, invalid, expired, or revoked session.",
})
@ApiForbiddenResponse({
  description: "Requested data does not belong to the authenticated account.",
})
@Controller(["ConfigValues", "api/ConfigValues", "apiLambda/ConfigValues"])
export class ConfigValuesController {
  constructor(private readonly service: CatalogService) {}
  @Post("all")
  @HttpCode(200)
  @ApiOperation({ summary: "Read public dashboard configuration values" })
  @ApiOkResponse({
    schema: {
      type: "array",
      items: { type: "object", additionalProperties: true },
    },
  })
  all(@Body() dto: PaginationDto) {
    return this.service.configValues(dto);
  }
}
@ApiTags("Catalog")
@ApiBadRequestResponse({ description: "Malformed or invalid request." })
@ApiBearerAuth("jwt")
@ApiUnauthorizedResponse({
  description: "Missing, invalid, expired, or revoked session.",
})
@ApiForbiddenResponse({
  description: "Requested data does not belong to the authenticated account.",
})
@Controller(["Products", "api/Products", "apiLambda/Products"])
export class ProductsController {
  constructor(private readonly service: CatalogService) {}
  @Post("all")
  @HttpCode(200)
  @ApiOperation({ summary: "Read catalog records" })
  @ApiOkResponse({
    schema: {
      type: "array",
      items: { type: "object", additionalProperties: true },
    },
  })
  all(@Body() dto: PaginationDto) {
    return this.service.products(dto);
  }
}
