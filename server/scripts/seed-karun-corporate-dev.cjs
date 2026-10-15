// Explicitly dev-only. Refuses existing tags; never overwrites accounts or records.
const { ConfigModule, ConfigService } = require("@nestjs/config");
const { createConnection } = require("mysql2/promise");
const { randomBytes, scrypt: scryptCallback } = require("node:crypto");
const { promisify } = require("node:util");
const path = require("node:path");
const scrypt = promisify(scryptCallback);
const database = "ohoindiadev";
const tag = "Karun Corporate Test";
async function main() {
  if (process.argv[2] !== "--apply-ohoindiadev" || process.argv.length !== 3)
    throw Error("Use --apply-ohoindiadev to create the tagged test records.");
  await ConfigModule.forRoot({ envFilePath: path.resolve(__dirname, "../.env") });
  const config = new ConfigService();
  if (!config.get("DB_HOST") || !config.get("DB_USER")) throw Error("Database configuration missing.");
  const db = await createConnection({
    host: config.get("DB_HOST"), port: Number(config.get("DB_PORT", 3306)),
    user: config.get("DB_USER"), password: config.get("DB_PASSWORD", ""), database,
    ssl: config.get("DB_SSL") === "true" ? { rejectUnauthorized: true } : undefined,
  });
  let locked = false;
  let begun = false;
  try {
    const [[selected]] = await db.query("SELECT DATABASE() AS name");
    if (selected.name !== database) throw Error("Wrong database.");
    const [[lock]] = await db.execute("SELECT GET_LOCK(?,10) AS acquired", ["oho:ohoindiadev:karun-corporate-seed"]);
    if (Number(lock.acquired) !== 1) throw Error("Seed lock unavailable.");
    locked = true;
    await db.beginTransaction(); begun = true;
    const [existing] = await db.execute("SELECT GroupId FROM `Group` WHERE GroupName=? OR Code=?", [tag, "KARUN-CORP-TEST"]);
    if (existing.length) throw Error("Test group already exists; refusing to duplicate or overwrite.");
    const [group] = await db.execute("INSERT INTO `Group` (GroupName,Name,Code,GroupAddress,ContactName,Email,NoOfStaff,IsActive,IsFreeCardAvailable) VALUES (?,?,?,?,?,?,?,1,0)", [tag,tag,"KARUN-CORP-TEST","DEV TEST DATA ONLY","Karun Test Operator","karun.corporate@example.test","3"]);
    const groupId = group.insertId;
    const [company] = await db.execute("INSERT INTO CorporateCompany (GroupId,Name) VALUES (?,?)", [groupId,tag]);
    const companyId = company.insertId;
    const credentials = [];
    for (const [role, permissions] of [
      ["Admin", ["employees","inventory","invoices","access"]],
      ["HR", ["employees","inventory"]], ["Finance", ["invoices"]], ["Viewer", []],
    ]) {
      const [r] = await db.execute("INSERT INTO CorporateRole (CompanyId,Name,Permissions,IsSystem) VALUES (?,?,?,1)", [companyId,role,JSON.stringify(permissions)]);
      const password = randomBytes(18).toString("base64url");
      const salt = randomBytes(16).toString("hex");
      const hash = `${salt}:${(await scrypt(password,salt,64)).toString("hex")}`;
      const email = `karun.corporate.${role.toLowerCase()}@example.test`;
      await db.execute("INSERT INTO CorporateUser (CompanyId,RoleId,Name,Email,PasswordHash,Status) VALUES (?,?,?,?,?,'Active')", [companyId,r.insertId,`Karun Test ${role}`,email,hash]);
      credentials.push({role,email,password});
    }
    const employees = [];
    for (const [i, department, status] of [[1,"Human Resources","Active"],[2,"Engineering","Active"],[3,"Operations","Pending"]]) {
      // Non-dialable test values, intentionally not real Indian mobile numbers.
      const mobile = `000000000${i}`;
      const [[collision]] = await db.execute("SELECT (SELECT COUNT(*) FROM Customer WHERE MobileNumber=?) + (SELECT COUNT(*) FROM CommunityCustomers WHERE MobileNumber=?) AS total", [mobile,mobile]);
      if (Number(collision.total)) throw Error("Dummy mobile already exists; refusing to link existing identities.");
      const name = `Karun Test Employee ${i}`;
      const [community] = await db.execute("INSERT INTO CommunityCustomers (Name,MobileNumber,GroupId,IsActive,RegisteredOn) VALUES (?,?,?,1,NOW())", [name,mobile,groupId]);
      const [employee] = await db.execute("INSERT INTO CorporateEmployee (CompanyId,CommunityCustomerId,Name,Email,Mobile,EmployeeCode,Department,JoinedOn,Status) VALUES (?,?,?,?,?,?,?,'2026-10-15',?)", [companyId,community.insertId,name,`karun.employee${i}@example.test`,mobile,`KCT-00${i}`,department,status]);
      employees.push(employee.insertId);
    }
    for (const [name,sku,quantity] of [["Karun Test Welcome Kit","KCT-KIT",10],["Karun Test ID Card","KCT-ID",20]]) {
      const [item] = await db.execute("INSERT INTO CorporateInventory (CompanyId,Name,Sku,Quantity) VALUES (?,?,?,?)", [companyId,name,sku,quantity]);
      await db.execute("INSERT INTO CorporateAssignment (CompanyId,InventoryId,EmployeeId) VALUES (?,?,?)", [companyId,item.insertId,employees[0]]);
    }
    for (const [number,amount,status] of [["KCT-INV-001",150000,"Paid"],["KCT-INV-002",75000,"Due"]]) {
      await db.execute("INSERT INTO CorporateInvoice (CompanyId,InvoiceNumber,IssuedOn,DueOn,AmountPaise,Status,Description) VALUES (?,?,'2026-10-15','2026-10-30',?,?,?)", [companyId,number,amount,status,`${tag} - sample invoice, no real charge`]);
    }
    await db.execute("INSERT INTO CorporateAudit (CompanyId,UserId,ActorName,Action) VALUES (?,0,'OHOINDIA',?)", [companyId,`${tag}: seeded dev-only users, employees, inventory, assignments and invoices`]);
    const counts = {};
    for (const table of ["CorporateRole","CorporateUser","CorporateEmployee","CorporateInventory","CorporateAssignment","CorporateInvoice","CorporateAudit"]) {
      const [[row]] = await db.execute(`SELECT COUNT(*) AS total FROM ${table} WHERE CompanyId=?`, [companyId]);
      counts[table] = row.total;
    }
    await db.commit(); begun = false;
    console.log(JSON.stringify({database,tag,groupId,companyId,counts,credentials},null,2));
  } catch (error) {
    if (begun) await db.rollback();
    throw error;
  } finally {
    if (locked) await db.execute("SELECT RELEASE_LOCK(?)", ["oho:ohoindiadev:karun-corporate-seed"]);
    await db.end();
  }
}
main().catch(error => { console.error(error.code || error.message); process.exitCode = 1; });
