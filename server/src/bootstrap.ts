import { INestApplication, ValidationPipe } from "@nestjs/common";
import { RuntimeConfigService } from "./runtime-config/runtime-config.service";
import { LegacyBodyPipe } from "./common/legacy-body.pipe";
import { ApiExceptionFilter } from "./common/http-exception.filter";
import { configureSwagger } from "./swagger";

export function configureApp(app: INestApplication, shutdownHooks = true) {
  app.use(
    (
      _request: unknown,
      response: { setHeader(name: string, value: string): void },
      next: () => void,
    ) => {
      response.setHeader("Cache-Control", "no-store");
      next();
    },
  );
  const config = app.get(RuntimeConfigService);
  app.enableCors({
    origin(
      origin: string | undefined,
      callback: (error: Error | null, allowed: boolean) => void,
    ) {
      if (!origin) {
        callback(null, true);
        return;
      }
      config
        .get("CORS_ORIGINS", "http://localhost:5173")
        .then((value) => {
          const allowed = value.split(",").map((item) => item.trim());
          callback(null, allowed.includes(origin));
        })
        .catch((error) => callback(error, false));
    },
  });
  app.useGlobalPipes(
    new LegacyBodyPipe(),
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalFilters(new ApiExceptionFilter());
  configureSwagger(app);
  if (shutdownHooks) app.enableShutdownHooks();
}
