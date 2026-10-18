const { execFileSync } = require("node:child_process");

const region = "ap-south-1";
const stack = "oho-customer-api-dev";
const paymentPath = "/api/BookingConsultation/{bookingId}/payments";

function devStack() {
  return JSON.parse(
    execFileSync(
      "aws",
      [
        "cloudformation",
        "describe-stacks",
        "--stack-name",
        stack,
        "--region",
        region,
        "--query",
        "Stacks[0]",
        "--output",
        "json",
      ],
      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
    ),
  );
}

async function verifyDevDeployment() {
  const current = devStack();
  if (
    !current.Parameters.some(
      (item) =>
        item.ParameterKey === "ApiStageName" && item.ParameterValue === "dev",
    )
  ) {
    throw Error("Expected the existing dev API stage.");
  }
  const base = current.Outputs.find(
    (item) => item.OutputKey === "ApiBaseUrl",
  )?.OutputValue;
  const url = new URL(base);
  if (url.protocol !== "https:" || url.pathname !== "/dev")
    throw Error("Unexpected dev API base URL.");
  const request = (path, method = "GET", body) =>
    fetch(`${base}${path}`, {
      method,
      redirect: "error",
      signal: AbortSignal.timeout(45000),
      ...(body
        ? {
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          }
        : {}),
    });
  const healthResponse = await request("/health");
  const health = await healthResponse.json();
  if (
    !healthResponse.ok ||
    health.status !== true ||
    health.service !== "oho-customer-server"
  )
    throw Error("Dev API health check failed.");
  const schemaResponse = await request("/swagger-json");
  const schema = await schemaResponse.json();
  const expected = [
    [paymentPath, "get"],
    [paymentPath, "post"],
    [`${paymentPath}/{attemptId}/result`, "post"],
  ];
  if (
    !schemaResponse.ok ||
    expected.some(([path, method]) => !schema.paths?.[path]?.[method])
  )
    throw Error(
      "Hospital booking payment routes are missing from the deployed API.",
    );
  // Unauthenticated probes must be rejected before reading or mutating booking data.
  const paths = [
    ["/api/BookingConsultation/1/payments", "GET"],
    ["/api/BookingConsultation/1/payments", "POST"],
    [
      "/api/BookingConsultation/1/payments/11111111-1111-4111-8111-111111111111/result",
      "POST",
    ],
  ];
  for (const [path, method] of paths) {
    const response = await request(
      path,
      method,
      method === "POST" ? {} : undefined,
    );
    if (response.status !== 401)
      throw Error(
        `Payment route authentication check failed (${method}, ${response.status}).`,
      );
  }
  console.log(
    JSON.stringify({
      stack,
      baseUrl: base,
      health: "passed",
      hospitalPaymentRoutes: expected.length,
      authentication: "required",
    }),
  );
}

module.exports = { devStack, verifyDevDeployment };
if (require.main === module)
  verifyDevDeployment().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
