import { ApiTags, ApiOperation, ApiOkResponse } from "@nestjs/swagger";
import { Controller, Get, Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerModule } from "@nestjs/throttler";
import { ApiThrottlerGuard } from "./common/api-throttler.guard";
import { DatabaseModule } from "./database/database.module";
import { CustomerAuthModule } from "./customer-auth/customer-auth.module";
import { CustomersModule } from "./customers/customers.module";
import { CardsModule } from "./cards/cards.module";
import { ConsultationsModule } from "./consultations/consultations.module";
import { CommunitiesModule } from "./communities/communities.module";
import { CatalogModule } from "./catalog/catalog.module";
import { PortalModule } from "./portal/portal.module";
import { PurchasesModule } from "./purchases/purchases.module";
import { RuntimeConfigModule } from "./runtime-config/runtime-config.module";
import { AuthModule } from "./auth/auth.module";
import { JwtAuthGuard, Public } from "./auth/jwt-auth.guard";

@ApiTags("Health")
@Controller("health")
@Public()
class HealthController {
  @ApiOperation({
    summary: "Check server process health without checking database or SMS",
  })
  @ApiOkResponse({
    schema: {
      type: "object",
      properties: {
        status: { type: "boolean", example: true },
        service: { type: "string", example: "oho-customer-server" },
      },
    },
  })
  @Get()
  get() {
    return { status: true, service: "oho-customer-server" };
  }
}
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([
      { name: "default", ttl: 60000, limit: 120 },
      {
        name: "auth",
        ttl: 300000,
        limit: 60,
        skipIf: (context) =>
          context.getClass().name !== "CustomerAuthController",
      },
      {
        name: "sensitive",
        ttl: 60000,
        limit: 10,
        skipIf: (context) =>
          context.getClass().name !== "CustomerAuthController",
      },
    ]),
    DatabaseModule,
    RuntimeConfigModule,
    AuthModule,
    CustomerAuthModule,
    CustomersModule,
    CardsModule,
    ConsultationsModule,
    CommunitiesModule,
    CatalogModule,
    PortalModule,
    PurchasesModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_GUARD, useClass: ApiThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AppModule {}
