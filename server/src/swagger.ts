import { INestApplication } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";

export function configureSwagger(app: INestApplication) {
  const configuration = new DocumentBuilder()
    .setTitle("OHO Customer API")
    .setDescription(
      "Customer web and mobile APIs. Login or register to obtain JwtToken, then use Authorize to paste the token. Customer data is restricted to the authenticated account. Request examples use camelCase; legacy PascalCase aliases are also accepted, but do not send both aliases together.",
    )
    .setVersion("1.0.0")
    .addBearerAuth(
      {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description:
          "Paste JwtToken from a successful login or registration, without the Bearer prefix.",
      },
      "jwt",
    )
    .build();
  const document = SwaggerModule.createDocument(app, configuration);
  SwaggerModule.setup("swagger", app, document, {
    jsonDocumentUrl: "swagger-json",
    swaggerOptions: {
      persistAuthorization: false,
      tagsSorter: "alpha",
      docExpansion: "list",
    },
    customSiteTitle: "OHO Customer API documentation",
  });
}
