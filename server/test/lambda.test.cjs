const assert = require("node:assert/strict");
const { test } = require("node:test");
const { handler } = require("../dist/lambda");

function event(path, method = "GET", body) {
  return {
    version: "2.0",
    routeKey: "ANY /{proxy+}",
    rawPath: path,
    rawQueryString: "",
    headers: {
      host: "test.execute-api.ap-south-1.amazonaws.com",
      "content-type": "application/json",
    },
    requestContext: {
      accountId: "123456789012",
      apiId: "test",
      domainName: "test.execute-api.ap-south-1.amazonaws.com",
      domainPrefix: "test",
      requestId: "local-test",
      routeKey: "ANY /{proxy+}",
      stage: "$default",
      time: "01/Oct/2026:00:00:00 +0000",
      timeEpoch: Date.now(),
      http: {
        method,
        path,
        protocol: "HTTP/1.1",
        sourceIp: "127.0.0.1",
        userAgent: "node-test",
      },
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    isBase64Encoded: false,
  };
}

test("Lambda handles cold and warm HTTP API requests without listening on a port", async () => {
  for (let invocation = 0; invocation < 2; invocation++) {
    const context = {
      callbackWaitsForEmptyEventLoop: true,
      getRemainingTimeInMillis: () => 29000,
    };
    const response = await handler(event("/health"), context, () => {});
    assert.equal(context.callbackWaitsForEmptyEventLoop, false);
    assert.equal(response.statusCode, 200);
    assert.deepEqual(JSON.parse(response.body), {
      status: true,
      service: "oho-customer-server",
    });
  }
});

test("Lambda forwards JSON bodies through the normal Nest validation and error filter", async () => {
  const response = await handler(
    event("/lambdaAPI/Customer/memberlogin", "POST", {
      mobileNumber: "invalid",
      Password: "1234",
    }),
    { getRemainingTimeInMillis: () => 29000 },
    () => {},
  );
  assert.equal(response.statusCode, 400);
  assert.equal(JSON.parse(response.body).status, false);
});

test("Lambda serves Swagger UI, its assets and the OpenAPI document without a JWT", async () => {
  for (const path of ["/swagger", "/swagger/swagger-ui.css", "/swagger-json"]) {
    const response = await handler(
      event(path),
      { getRemainingTimeInMillis: () => 29000 },
      () => {},
    );
    assert.equal(response.statusCode, 200, path);
    if (path === "/swagger-json")
      assert.equal(JSON.parse(response.body).info.title, "OHO Customer API");
  }
});
