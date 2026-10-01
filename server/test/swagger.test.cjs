require("reflect-metadata");
const assert = require("node:assert/strict");
const { test, before, after } = require("node:test");
const { Test } = require("@nestjs/testing");
const { AppModule } = require("../dist/app.module");
const { DatabaseService } = require("../dist/database/database.service");
const { configureApp } = require("../dist/bootstrap");

let app, base;
before(async () => {
  const module = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(DatabaseService)
    .useValue({
      rows: () => assert.fail("Swagger must not query the database"),
    })
    .compile();
  app = module.createNestApplication({ logger: false });
  configureApp(app, false);
  await app.listen(0, "127.0.0.1");
  base = await app.getUrl();
});
after(async () => {
  await app?.close();
});

test("Swagger UI and bundled assets are publicly available without database access", async () => {
  const response = await fetch(`${base}/swagger`);
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type"), /text\/html/);
  assert.match(await response.text(), /swagger-ui/);
  for (const path of [
    "swagger/swagger-ui.css",
    "swagger/swagger-ui-bundle.js",
    "swagger/swagger-ui-init.js",
  ]) {
    const asset = await fetch(`${base}/${path}`);
    assert.equal(asset.status, 200, path);
    await asset.text();
  }
});

test("OpenAPI documents routes, inherited DTO fields and JWT security accurately", async () => {
  const response = await fetch(`${base}/swagger-json`);
  assert.equal(response.status, 200);
  const document = await response.json();
  assert.equal(document.info.title, "OHO Customer API");
  assert.equal(document.components.securitySchemes.jwt.scheme, "bearer");
  const paths = document.paths;
  assert.deepEqual(paths["/api/Customer/GetById/{id}"].get.security, [
    { jwt: [] },
  ]);
  assert.deepEqual(paths["/api/ConfigValues/all"].post.security, [{ jwt: [] }]);
  assert.equal(
    paths["/api/Customer/memberlogin"].post.security?.length ?? 0,
    0,
  );
  assert.equal(paths["/health"].get.security?.length ?? 0, 0);
  assert.ok(paths["/api/Products/all"]);
  const schemas = document.components.schemas;
  assert.ok(schemas.LoginDto.properties.mobileNumber);
  assert.ok(schemas.LoginDto.properties.password.writeOnly);
  assert.ok(schemas.RegisterDto.required.includes("guid"));
  assert.ok(schemas.RegisterDto.required.includes("otpGenerated"));
  assert.equal(schemas.PaginationDto.properties.take.maximum, 1000);
  assert.equal(schemas.PaginationDto.required?.length ?? 0, 0);
  assert.ok(schemas.AuthResponseDto.properties.JwtToken);
  // Publishing the docs does not bypass API authentication.
  assert.equal(
    (await fetch(`${base}/api/Customer/GetById/12`)).status,
    401,
  );
});
