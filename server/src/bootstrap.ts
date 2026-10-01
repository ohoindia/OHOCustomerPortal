import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LegacyBodyPipe } from './common/legacy-body.pipe';
import { ApiExceptionFilter } from './common/http-exception.filter';

export function configureApp(app: INestApplication) {
  const config = app.get(ConfigService);
  app.enableCors({ origin: config.get('CORS_ORIGINS', 'http://localhost:5173').split(',').map((origin: string) => origin.trim()) });
  app.useGlobalPipes(new LegacyBodyPipe(), new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }));
  app.useGlobalFilters(new ApiExceptionFilter());
  app.enableShutdownHooks();
}
