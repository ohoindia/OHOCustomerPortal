// Development-only configuration. No credentials are printed or persisted here.
const { readFileSync } = require("node:fs");
const path = require("node:path");
const dotenv = require("dotenv");
const { createConnection } = require("mysql2/promise");

async function main() {
  const apply = process.argv[2] === "--apply-ohoindiadev";
  if (process.argv.length !== (apply ? 3 : 2))
    throw Error("Use --apply-ohoindiadev or no arguments for preflight.");
  dotenv.config({ path: path.resolve(__dirname, "../.env"), quiet: true });
  if (process.env.DB_NAME !== "ohoindiadev")
    throw Error("Refusing to configure a database other than ohoindiadev.");
  const frontend = dotenv.parse(
    readFileSync(
      path.resolve(
        __dirname,
        "../../../../office/OHOINDIAGit/FrontWebReact/.env",
      ),
    ),
  );
  const upstream = new URL(
    frontend.REACT_APP_BASEURL_NEW.replace(/\/$/, "") +
      "/lambdaAPI/Employee/adminloginm",
  );
  if (
    upstream.protocol !== "https:" ||
    upstream.hostname !== "api.ohoindialife.com" ||
    !upstream.pathname.startsWith("/dev2/")
  )
    throw Error("Expected the existing OHOINDIA dev2 admin login endpoint.");
  const db = await createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: "ohoindiadev",
    ssl:
      process.env.DB_SSL === "true" ? { rejectUnauthorized: true } : undefined,
  });
  try {
    const [[database]] = await db.query("SELECT DATABASE() AS name");
    if (database.name !== "ohoindiadev") throw Error("Unexpected database.");
    const [roles] = await db.query(
      "SELECT UserRoleId,RoleType FROM UserRole WHERE TRIM(RoleType) IN ('Admin','Super Admin') ORDER BY UserRoleId",
    );
    if (!roles.length) throw Error("No global administrator roles found.");
    const settings = {
      CORPORATE_ADMIN_LOGIN_URL: upstream.href,
      CORPORATE_ADMIN_ROLE_IDS: roles.map((r) => r.UserRoleId).join(","),
    };
    const origins = [
      "http://localhost:3001",
      "http://127.0.0.1:3001",
      "http://localhost:5174",
      "http://127.0.0.1:5174",
    ];
    if (apply) {
      await db.beginTransaction();
      try {
        for (const [key, value] of Object.entries(settings)) {
          const [overrides] = await db.execute(
            "SELECT ConfigSecretsId FROM ConfigSecrets WHERE UPPER(ConfigKey)=?",
            [key],
          );
          if (overrides.length)
            throw Error(
              `${key} has a secret override; review it before configuring.`,
            );
          const [rows] = await db.execute(
            "SELECT ConfigValuesId FROM ConfigValues WHERE UPPER(ConfigKey)=? ORDER BY ConfigValuesId DESC FOR UPDATE",
            [key],
          );
          if (rows.length)
            await db.execute(
              "UPDATE ConfigValues SET ConfigValue=? WHERE ConfigValuesId=?",
              [value, rows[0].ConfigValuesId],
            );
          else
            await db.execute(
              "INSERT INTO ConfigValues (ConfigKey,ConfigValue) VALUES (?,?)",
              [key, value],
            );
        }
        // Preserve existing origins and the precedence of ConfigSecrets over ConfigValues.
        const [secret] = await db.execute(
          "SELECT ConfigSecretsId AS Id,ConfigValue FROM ConfigSecrets WHERE UPPER(ConfigKey)='CORS_ORIGINS' ORDER BY ConfigSecretsId DESC FOR UPDATE",
        );
        const [values] = await db.execute(
          "SELECT ConfigValuesId AS Id,ConfigValue FROM ConfigValues WHERE UPPER(ConfigKey)='CORS_ORIGINS' ORDER BY ConfigValuesId DESC FOR UPDATE",
        );
        const row = secret[0] || values[0];
        const merged = [
          ...new Set([
            ...(row?.ConfigValue || "")
              .split(",")
              .map((v) => v.trim())
              .filter(Boolean),
            ...origins,
          ]),
        ].join(",");
        if (row)
          await db.execute(
            secret.length
              ? "UPDATE ConfigSecrets SET ConfigValue=? WHERE ConfigSecretsId=?"
              : "UPDATE ConfigValues SET ConfigValue=? WHERE ConfigValuesId=?",
            [merged, row.Id],
          );
        else
          await db.execute(
            "INSERT INTO ConfigValues (ConfigKey,ConfigValue) VALUES ('CORS_ORIGINS',?)",
            [merged],
          );
        await db.commit();
      } catch (error) {
        await db.rollback();
        throw error;
      }
    }
    console.log(
      JSON.stringify(
        {
          database: database.name,
          applied: apply,
          settings,
          allowedRoles: roles,
          addedOrigins: origins,
        },
        null,
        2,
      ),
    );
  } finally {
    await db.end();
  }
}
main().catch((error) => {
  console.error(error.code || error.message);
  process.exitCode = 1;
});
