// Trusted OHOINDIA operator utility. Read JSON from stdin, never command-line passwords.
require("reflect-metadata");
const { NestFactory } = require("@nestjs/core");
const { AppModule } = require("../dist/app.module");
const { DatabaseService } = require("../dist/database/database.service");
const { hashPassword } = require("../dist/corporate/password");
const { manageAccess } = require("./corporate-access.cjs");
async function main() {
  let input = "";
  for await (const chunk of process.stdin) input += chunk;
  const data = JSON.parse(input);
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: false,
  });
  try {
    const db = app.get(DatabaseService);
    if (["list-access", "save-user"].includes(data.action)) {
      console.log(JSON.stringify(await manageAccess(db, hashPassword, data)));
    } else if (data.action === "provision") {
      if (
        !Number.isSafeInteger(data.groupId) ||
        data.groupId < 1 ||
        !data.companyName?.trim() ||
        !data.name?.trim() ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email || "") ||
        typeof data.password !== "string" ||
        data.password.length < 12 ||
        data.password.length > 128
      )
        throw Error(
          "Provide groupId, companyName, name, email, password (12–128 characters).",
        );
      const password = await hashPassword(data.password);
      const id = await db.transaction(async (c) => {
        const [group] = await db.rows(
          "SELECT GroupId FROM `Group` WHERE GroupId=?",
          [data.groupId],
          c,
        );
        if (!group) throw Error("Create the Group in OHOINDIA first.");
        const result = await db.execute(
          "INSERT INTO CorporateCompany (GroupId,Name) VALUES (?,?)",
          [data.groupId, data.companyName.trim()],
          c,
        );
        const companyId = result.insertId;
        let adminId;
        for (const [name, permissions] of [
          ["Admin", ["employees", "inventory", "invoices", "access"]],
          ["HR", ["employees", "inventory"]],
          ["Finance", ["invoices"]],
          ["Viewer", []],
        ]) {
          const role = await db.execute(
            "INSERT INTO CorporateRole (CompanyId,Name,Permissions,IsSystem) VALUES (?,?,?,1)",
            [companyId, name, JSON.stringify(permissions)],
            c,
          );
          if (name === "Admin") adminId = role.insertId;
        }
        await db.execute(
          "INSERT INTO CorporateUser (CompanyId,RoleId,Name,Email,PasswordHash,Status) VALUES (?,?,?,?,?,'Active')",
          [
            companyId,
            adminId,
            data.name.trim(),
            data.email.trim().toLowerCase(),
            password,
          ],
          c,
        );
        await db.execute(
          "INSERT INTO CorporateAudit (CompanyId,UserId,ActorName,Action) VALUES (?,0,'OHOINDIA','Company portal provisioned')",
          [companyId],
          c,
        );
        return companyId;
      });
      console.log(JSON.stringify({ companyId: id }));
    } else if (data.action === "invoice") {
      if (
        !Number.isSafeInteger(data.companyId) ||
        data.companyId < 1 ||
        !Number.isSafeInteger(data.amountPaise) ||
        data.amountPaise < 0 ||
        !["Paid", "Due", "Overdue"].includes(data.status) ||
        !data.number ||
        !data.description
      )
        throw Error("Invalid invoice fields. Amount must be integer paise.");
      for (const value of [data.issuedOn, data.dueOn]) {
        if (
          !/^\d{4}-\d{2}-\d{2}$/.test(value || "") ||
          new Date(value).toISOString().slice(0, 10) !== value
        )
          throw Error("Invalid invoice date.");
      }
      await db.transaction(async (c) => {
        await db.execute(
          "INSERT INTO CorporateInvoice (CompanyId,InvoiceNumber,IssuedOn,DueOn,AmountPaise,Status,Description) VALUES (?,?,?,?,?,?,?)",
          [
            data.companyId,
            data.number,
            data.issuedOn,
            data.dueOn,
            data.amountPaise,
            data.status,
            data.description,
          ],
          c,
        );
        await db.execute(
          "INSERT INTO CorporateAudit (CompanyId,UserId,ActorName,Action) VALUES (?,0,'OHOINDIA',?)",
          [data.companyId, `Issued invoice ${data.number}`],
          c,
        );
      });
      console.log(JSON.stringify({ success: true }));
    } else throw Error("Unknown action: use provision, list-access, save-user or invoice.");
  } finally {
    await app.close();
  }
}
main().catch(() => {
  console.error(
    "Corporate operation failed. Check input, existing records, database configuration and migrations. No credentials were logged.",
  );
  process.exitCode = 1;
});
