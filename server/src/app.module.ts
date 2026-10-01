import { ApiTags, ApiOperation, ApiOkResponse } from '@nestjs/swagger';
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
import { RuntimeConfigModule } from './runtime-config/runtime-config.module';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard, Public } from './auth/jwt-auth.guard';

@ApiTags('Health')
@Controller('health')
@Public()
class HealthController {
  @ApiOperation({ summary: 'Check server process health without checking database or SMS' })
  @ApiOkResponse({ schema: { type: 'object', properties: { status: { type: 'boolean', example: true }, service: { type: 'string', example: 'oho-customer-server' } } } })
  @Get() get() { return { status: true, service: 'oho-customer-server' }; }
}
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 60 }]),
    DatabaseModule, RuntimeConfigModule, AuthModule, CustomerAuthModule, CustomersModule, CardsModule,
    ConsultationsModule, CommunitiesModule, CatalogModule,
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }, { provide: APP_GUARD, useClass: JwtAuthGuard }],
})
export class AppModule {}
