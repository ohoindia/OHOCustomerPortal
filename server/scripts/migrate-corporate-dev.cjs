// This runner is deliberately restricted to ohoindiadev. It never uses DB_NAME.
const { ConfigModule, ConfigService } = require("@nestjs/config");
const { createConnection } = require("mysql2/promise");
const { readFile } = require("node:fs/promises");
const path = require("node:path");
const database = "ohoindiadev";
const tables = [
  "CorporateCompany",
  "CorporateRole",
  "CorporateUser",
  "CorporateSession",
  "CorporateEmployee",
  "CorporateInventory",
  "CorporateAssignment",
  "CorporateInvoice",
  "CorporateAudit",
];

async function main() {
  const apply = process.argv[2] === "--apply-ohoindiadev";
  if (process.argv.length > (apply ? 3 : 2))
    throw Error(
      "Use no arguments for preflight or --apply-ohoindiadev to apply.",
    );
  await ConfigModule.forRoot({
    envFilePath: path.resolve(__dirname, "../.env"),
  });
  const config = new ConfigService();
  if (!config.get("DB_HOST") || !config.get("DB_USER"))
    throw Error("Backend DB_HOST and DB_USER must be configured.");
  const sql = (
    (await Promise.all(["20261015-corporate.sql"].map((file) => readFile(path.resolve(__dirname, "../migrations", file), "utf8")))).join("\n")
  ).replace(/^\s*--.*$/gm, "");
  const statements = sql
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);
  if (
    statements.length !== tables.length ||
    statements.some(
      (statement, index) =>
        !statement.startsWith(`CREATE TABLE IF NOT EXISTS ${tables[index]} (`),
    )
  )
    throw Error("Unexpected migration contents.");
  const connection = await createConnection({
    host: config.get("DB_HOST"),
    port: Number(config.get("DB_PORT", 3306)),
    user: config.get("DB_USER"),
    password: config.get("DB_PASSWORD", ""),
    database,
    connectTimeout: 10000,
    ssl:
      config.get("DB_SSL") === "true"
        ? { rejectUnauthorized: true }
        : undefined,
  });
  let locked = false;
  try {
    const [[selected]] = await connection.query(
      "SELECT DATABASE() AS databaseName",
    );
    if (selected.databaseName !== database)
      throw Error("Database target check failed. No migration executed.");
    const [legacy] = await connection.execute(
      "SELECT TABLE_NAME AS name FROM information_schema.TABLES WHERE TABLE_SCHEMA=? AND TABLE_NAME IN (?,?,?)",
      [database, "Group", "Customer", "CommunityCustomers"],
    );
    if (legacy.length !== 3)
      throw Error(
        "Expected legacy OHOINDIA tables are missing. No migration executed.",
      );
    const [before] = await connection.execute(
      "SELECT TABLE_NAME AS name FROM information_schema.TABLES WHERE TABLE_SCHEMA=? AND TABLE_NAME LIKE ?",
      [database, "Corporate%"],
    );
    console.log(
      JSON.stringify({
        database: selected.databaseName,
        legacyTablesVerified: legacy.length,
        corporateTablesBefore: before.map((row) => row.name),
        mode: apply ? "apply" : "preflight",
      }),
    );
    if (!apply) return;
    const [[lock]] = await connection.execute(
      "SELECT GET_LOCK(?,10) AS acquired",
      ["oho:ohoindiadev:corporate-migration"],
    );
    if (Number(lock.acquired) !== 1)
      throw Error("Could not acquire migration lock.");
    locked = true;
    // DDL autocommits in MySQL. These CREATE IF NOT EXISTS statements are rerunnable.
    for (let index = 0; index < statements.length; index++) {
      const [[target]] = await connection.query(
        "SELECT DATABASE() AS databaseName",
      );
      if (target.databaseName !== database)
        throw Error("Database target changed. Stopping migration.");
      await connection.query(statements[index]);
      console.log(
        JSON.stringify({ database, table: tables[index], applied: true }),
      );
    }
    await require("./migrate-employee-onboarding.cjs").migrateEmployeeOnboarding(connection);
    const [created] = await connection.execute(
      "SELECT TABLE_NAME AS name,ENGINE AS engine FROM information_schema.TABLES WHERE TABLE_SCHEMA=? AND TABLE_NAME LIKE ?",
      [database, "Corporate%"],
    );
    for (const table of tables) {
      if (!created.some((row) => row.name === table && row.engine === "InnoDB"))
        throw Error(`Table verification failed: ${table}`);
    }
    const [foreignKeys] = await connection.execute(
      "SELECT TABLE_NAME AS tableName,CONSTRAINT_NAME AS constraintName FROM information_schema.REFERENTIAL_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=? AND TABLE_NAME LIKE ?",
      [database, "Corporate%"],
    );
    if (foreignKeys.length < 11)
      throw Error("Expected corporate foreign keys are missing.");
    console.log(
      JSON.stringify({
        database,
        migration: "20261015-corporate.sql + employee onboarding consolidation",
        verifiedTables: tables.length,
        verifiedForeignKeys: foreignKeys.length,
        completedAt: new Date().toISOString(),
        success: true,
      }),
    );
  } finally {
    if (locked)
      await connection.execute("SELECT RELEASE_LOCK(?)", [
        "oho:ohoindiadev:corporate-migration",
      ]);
    await connection.end();
  }
}
main().catch((error) => {
  console.error(
    JSON.stringify({
      database,
      success: false,
      message: error.code
        ? `Database operation failed (${error.code}).`
        : error.message,
    }),
  );
  process.exitCode = 1;
});
