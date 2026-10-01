import { Module } from "@nestjs/common";
import {
  ConfigValuesController,
  ProductsController,
} from "./catalog.controller";
import { CatalogService } from "./catalog.service";
@Module({
  controllers: [ConfigValuesController, ProductsController],
  providers: [CatalogService],
})
export class CatalogModule {}
