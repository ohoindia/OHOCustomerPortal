import { INestApplication, ValidationPipe } from "@nestjs/common";
import { RuntimeConfigService } from "./runtime-config/runtime-config.service";
import { LegacyBodyPipe } from "./common/legacy-body.pipe";
import { ApiExceptionFilter } from "./common/http-exception.filter";
import { configureSwagger } from "./swagger";
import helmet from "helmet";
import type { NestExpressApplication } from "@nestjs/platform-express";

export function configureApp(app: INestApplication, shutdownHooks = true) {
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.disable("x-powered-by");
  // Trust only explicitly listed proxy IPs/subnets, never arbitrary forwarded headers.
  const trustedProxies = process.env.TRUSTED_PROXIES?.split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  expressApp.set(
    "trust proxy",
    trustedProxies?.length ? trustedProxies : false,
  );
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          upgradeInsecureRequests:
            process.env.NODE_ENV === "production" ? [] : null,
        },
      },
      strictTransportSecurity:
        process.env.NODE_ENV === "production" ? { maxAge: 31536000 } : false,
    }),
  );
  const expressNestApp = app as NestExpressApplication;
  expressNestApp.useBodyParser("json", { limit: "32kb" });
  expressNestApp.useBodyParser("urlencoded", {
    limit: "32kb",
    extended: false,
    parameterLimit: 100,
  });
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
        .get(
          "CORS_ORIGINS",
          process.env.NODE_ENV === "production" ? "" : "http://localhost:5173",
        )
        .then((value) => {
          const allowed = value.split(",").map((item) => item.trim());
          callback(null, allowed.includes(origin));
        })
        .catch((error) => callback(error, false));
    },
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Authorization", "Content-Type"],
    exposedHeaders: [
      "Retry-After",
      "X-RateLimit-Limit",
      "X-RateLimit-Remaining",
      "X-RateLimit-Reset",
    ],
    credentials: false,
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
