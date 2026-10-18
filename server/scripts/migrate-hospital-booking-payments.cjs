// Dry-run by default. Apply requires an explicit database name matching DB_NAME.
// MySQL DDL autocommits; every statement is additive and safe to rerun.
const { readFile } = require("node:fs/promises");
const { createHash } = require("node:crypto");
const path = require("node:path");

const paymentTables = [
  "HospitalBookingPaymentSettings",
  "HospitalBookingPaymentAttempt",
];

async function migrationStatements() {
  const sql = await readFile(
    path.resolve(
      __dirname,
      "../migrations/20261018-hospital-booking-payments.sql",
    ),
    "utf8",
  );
  const statements = sql
    .replace(/^\s*--.*$/gm, "")
    .split(";")
    .map((value) => value.trim())
    .filter(Boolean);
  if (
    statements.length !== paymentTables.length ||
    statements.some(
      (sql, index) =>
        !sql.startsWith(`CREATE TABLE IF NOT EXISTS ${paymentTables[index]} (`),
    )
  )
    throw Error("Unexpected hospital booking payment migration contents.");
  return statements;
}

function parseArguments(args, configuredDatabase) {
  const apply = args.includes("--apply");
  const databaseArgs = args.filter((arg) => arg.startsWith("--database="));
  if (
    args.some((arg) => arg !== "--apply" && !arg.startsWith("--database=")) ||
    args.filter((arg) => arg === "--apply").length > 1 ||
    databaseArgs.length > 1
  )
    throw Error(
      "Use no arguments for dry-run, or --apply --database=<DB_NAME>.",
    );
  if (!configuredDatabase)
    throw Error("Configure DB_NAME before running this migration.");
  const requested = databaseArgs[0]?.slice("--database=".length);
  if (
    (apply && !requested) ||
    (requested !== undefined && requested !== configuredDatabase)
  )
    throw Error(
      "Explicit --database must exactly match configured DB_NAME. No changes applied.",
    );
  return { apply, database: configuredDatabase };
}

async function migrateHospitalBookingPayments(
  connection,
  { apply = false, database, log = () => {} },
) {
  if (!database) throw Error("An explicit database target is required.");
  const statements = await migrationStatements();
  const [[target]] = await connection.query(
    "SELECT DATABASE() AS databaseName",
  );
  if (target.databaseName !== database)
    throw Error("Database target check failed. No changes applied.");
  const [legacy] = await connection.execute(
    "SELECT TABLE_NAME AS name FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME IN ('BookingConsultation','Hospital','Customer')",
    [database],
  );
  if (legacy.length !== 3)
    throw Error(
      "Required hospital booking tables are missing. No changes applied.",
    );
  const [before] = await connection.execute(
    "SELECT TABLE_NAME AS name FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME IN (?, ?)",
    [database, ...paymentTables],
  );
  log({
    database,
    mode: apply ? "apply" : "dry-run",
    tablesBefore: before.map((row) => row.name),
    tables: paymentTables,
  });
  if (!apply) return { database, applied: false, tables: paymentTables };
  const lockName = `oho:booking-payments:${createHash("sha256").update(database).digest("hex").slice(0, 32)}`;
  let locked = false;
  try {
    const [[lock]] = await connection.execute(
      "SELECT GET_LOCK(?, 10) AS acquired",
      [lockName],
    );
    if (Number(lock.acquired) !== 1)
      throw Error("Could not acquire migration lock. No changes applied.");
    locked = true;
    for (let index = 0; index < statements.length; index++) {
      const [[current]] = await connection.query(
        "SELECT DATABASE() AS databaseName",
      );
      if (current.databaseName !== database)
        throw Error("Database target changed. Migration stopped.");
      await connection.query(statements[index]);
      log({ table: paymentTables[index], applied: true });
    }
    const [created] = await connection.execute(
      "SELECT TABLE_NAME AS name, ENGINE AS engine FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME IN (?, ?)",
      [database, ...paymentTables],
    );
    if (
      paymentTables.some(
        (name) =>
          !created.some((row) => row.name === name && row.engine === "InnoDB"),
      )
    )
      throw Error(
        "Payment table verification failed. Review migration before enabling payments.",
      );
    const [[settings]] = await connection.query(
      "SELECT COUNT(*) AS configuredHospitals, COALESCE(SUM(IsEnabled = TRUE), 0) AS enabledHospitals FROM HospitalBookingPaymentSettings",
    );
    log({
      database,
      verified: true,
      configuredHospitals: Number(settings.configuredHospitals),
      enabledHospitals: Number(settings.enabledHospitals),
    });
    return { database, applied: true, tables: paymentTables };
  } finally {
    if (locked)
      await connection.execute("SELECT RELEASE_LOCK(?) AS released", [
        lockName,
      ]);
  }
}

async function main() {
  const { ConfigModule, ConfigService } = require("@nestjs/config");
  const { createConnection } = require("mysql2/promise");
  await ConfigModule.forRoot({
    envFilePath: path.resolve(__dirname, "../.env"),
  });
  const config = new ConfigService();
  const options = parseArguments(process.argv.slice(2), config.get("DB_NAME"));
  if (!config.get("DB_HOST") || !config.get("DB_USER"))
    throw Error("Configure DB_HOST and DB_USER before running this migration.");
  const connection = await createConnection({
    host: config.get("DB_HOST"),
    port: Number(config.get("DB_PORT", 3306)),
    user: config.get("DB_USER"),
    password: config.get("DB_PASSWORD", ""),
    database: options.database,
    connectTimeout: 10000,
    ssl:
      config.get("DB_SSL") === "true"
        ? { rejectUnauthorized: true }
        : undefined,
  });
  try {
    await migrateHospitalBookingPayments(connection, {
      ...options,
      log: (value) => console.log(JSON.stringify(value)),
    });
  } finally {
    await connection.end();
  }
}

module.exports = {
  paymentTables,
  migrationStatements,
  parseArguments,
  migrateHospitalBookingPayments,
};
if (require.main === module)
  main().catch((error) => {
    // Never print connection configuration, SQL values, QR payloads, or credentials.
    const safeCodes = new Set([
      "ETIMEDOUT",
      "ECONNREFUSED",
      "ENOTFOUND",
      "ER_ACCESS_DENIED_ERROR",
      "ER_BAD_DB_ERROR",
    ]);
    console.error(
      safeCodes.has(error.code)
        ? `Database connection failed (${error.code}). No migration completion confirmed.`
        : error.message,
    );
    process.exitCode = 1;
  });
