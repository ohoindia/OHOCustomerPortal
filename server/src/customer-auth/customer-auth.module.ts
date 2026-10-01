import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { CustomerAuthController } from './customer-auth.controller';
import { CustomerAuthService } from './customer-auth.service';
@Module({ imports: [NotificationsModule], controllers: [CustomerAuthController], providers: [CustomerAuthService] })
export class CustomerAuthModule {}
