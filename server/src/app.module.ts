import { Controller, Get, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { DatabaseModule } from './database/database.module';
import { CustomerAuthModule } from './customer-auth/customer-auth.module';
import { CustomersModule } from './customers/customers.module';
import { CardsModule } from './cards/cards.module';
import { ConsultationsModule } from './consultations/consultations.module';
import { CommunitiesModule } from './communities/communities.module';
import { CatalogModule } from './catalog/catalog.module';

@Controller('health')
class HealthController {
  @Get() get() { return { status: true, service: 'oho-customer-server' }; }
}
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 60 }]),
    DatabaseModule, CustomerAuthModule, CustomersModule, CardsModule,
    ConsultationsModule, CommunitiesModule, CatalogModule,
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
