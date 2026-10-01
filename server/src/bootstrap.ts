import { INestApplication, ValidationPipe } from '@nestjs/common';
import { RuntimeConfigService } from './runtime-config/runtime-config.service';
import { LegacyBodyPipe } from './common/legacy-body.pipe';
import { ApiExceptionFilter } from './common/http-exception.filter';

export function configureApp(app: INestApplication, shutdownHooks = true) {
  const config = app.get(RuntimeConfigService);
  app.enableCors({
    origin(origin: string | undefined, callback: (error: Error | null, allowed: boolean) => void) {
      if (!origin) { callback(null, true); return; }
      config.get('CORS_ORIGINS', 'http://localhost:5173').then(value => {
        const allowed = value.split(',').map(item => item.trim());
        callback(null, allowed.includes(origin));
      }).catch(error => callback(error, false));
    },
  });
  app.useGlobalPipes(new LegacyBodyPipe(), new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }));
  app.useGlobalFilters(new ApiExceptionFilter());
  if (shutdownHooks) app.enableShutdownHooks();
}
