import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { createHash, randomBytes } from "node:crypto";
import { DatabaseService, Connection } from "../database/database.service";
import {
  AssignDto,
  EmployeeDto,
  InventoryDto,
  RoleDto,
  UserDto,
} from "./corporate.dto";
import { hashPassword, verifyPassword } from "./password";
import { CorporateOnboardingService, enrollmentFingerprint } from "./corporate-onboarding";

export interface CorporateIdentity {
  userId: number;
  companyId: number;
  name: string;
  email: string;
  role: string;
  permissions: string[];
}
const digest = (token: string) =>
  createHash("sha256").update(token).digest("hex");
export function checkPermission(
  identity: CorporateIdentity,
  permission: string,
) {
  if (!identity.permissions.includes(permission))
    throw new ForbiddenException("Your role does not allow this action.");
}
function parsePermissions(value: unknown): string[] {
  return typeof value === "string" ? JSON.parse(value) : (value as string[]);
}
@Injectable()
export class CorporateService {
  constructor(private readonly db: DatabaseService, private readonly onboarding: CorporateOnboardingService) {}
  async login(email: string, password: string) {
    const [user] = await this.db.rows(
      "SELECT u.*, c.IsActive AS CompanyActive FROM CorporateUser u JOIN CorporateCompany c ON c.Id=u.CompanyId WHERE u.Email=?",
      [email.trim().toLowerCase()],
    );
    // Perform the same expensive derivation for unknown accounts.
    const valid = await verifyPassword(
      password,
      String(user?.PasswordHash ?? `${"0".repeat(32)}:${"0".repeat(128)}`),
    );
    if (!user || !valid || user.Status !== "Active" || !user.CompanyActive)
      throw new UnauthorizedException(
        "Invalid email or password, or access is disabled.",
      );
    const token = randomBytes(32).toString("hex");
    await this.db.execute(
      "INSERT INTO CorporateSession (TokenHash,UserId,ExpiresAt) VALUES (?,?,DATE_ADD(UTC_TIMESTAMP(),INTERVAL 8 HOUR))",
      [digest(token), Number(user.Id)],
    );
    return { token };
  }
  async identity(token: string): Promise<CorporateIdentity> {
    const [row] = await this.db.rows(
      `SELECT u.Id,u.CompanyId,u.Name,u.Email,r.Name AS RoleName,r.Permissions FROM CorporateSession s JOIN CorporateUser u ON u.Id=s.UserId JOIN CorporateRole r ON r.Id=u.RoleId AND r.CompanyId=u.CompanyId JOIN CorporateCompany c ON c.Id=u.CompanyId WHERE s.TokenHash=? AND s.ExpiresAt>UTC_TIMESTAMP() AND u.Status='Active' AND c.IsActive=1`,
      [digest(token)],
    );
    if (!row)
      throw new UnauthorizedException(
        "Your corporate session has expired. Please sign in again.",
      );
    return {
      userId: Number(row.Id),
      companyId: Number(row.CompanyId),
      name: String(row.Name),
      email: String(row.Email),
      role: String(row.RoleName),
      permissions: parsePermissions(row.Permissions),
    };
  }
  async logout(token: string) {
    await this.db.execute("DELETE FROM CorporateSession WHERE TokenHash=?", [
      digest(token),
    ]);
    return { success: true };
  }
  async workspace(who: CorporateIdentity) {
    const [company] = await this.db.rows(
      "SELECT Id AS id,Name AS name,GroupId AS groupId FROM CorporateCompany WHERE Id=?",
      [who.companyId],
    );
    const employees = await this.db.rows(
      "SELECT Id AS id,CustomerId AS customerId,CommunityCustomerId AS communityCustomerId,Name AS name,Email AS email,Mobile AS mobile,EmployeeCode AS employeeCode,Department AS department,DATE_FORMAT(JoinedOn,'%Y-%m-%d') AS joinedOn,Status AS status FROM CorporateEmployee WHERE CompanyId=? ORDER BY Id DESC",
      [who.companyId],
    );
    const inventory = who.permissions.includes("inventory")
      ? await this.db.rows(
          "SELECT i.Id AS id,i.Name AS name,i.Sku AS sku,i.Quantity AS quantity,(SELECT COUNT(*) FROM CorporateAssignment a WHERE a.InventoryId=i.Id AND a.CompanyId=i.CompanyId) AS assigned FROM CorporateInventory i WHERE i.CompanyId=?",
          [who.companyId],
        )
      : [];
    const invoices = who.permissions.includes("invoices")
      ? await this.db.rows(
          "SELECT Id AS id,InvoiceNumber AS number,DATE_FORMAT(IssuedOn,'%Y-%m-%d') AS issuedOn,DATE_FORMAT(DueOn,'%Y-%m-%d') AS dueOn,AmountPaise AS amountPaise,Status AS status,Description AS description FROM CorporateInvoice WHERE CompanyId=? ORDER BY IssuedOn DESC",
          [who.companyId],
        )
      : [];
    const roles = who.permissions.includes("access")
      ? (
          await this.db.rows(
            "SELECT Id AS id,Name AS name,Permissions AS permissions,IsSystem AS isSystem FROM CorporateRole WHERE CompanyId=?",
            [who.companyId],
          )
        ).map((r) => ({ ...r, permissions: parsePermissions(r.permissions) }))
      : [];
    const users = who.permissions.includes("access")
      ? await this.db.rows(
          "SELECT u.Id AS id,u.Name AS name,u.Email AS email,u.RoleId AS roleId,r.Name AS role,u.Status AS status FROM CorporateUser u JOIN CorporateRole r ON r.Id=u.RoleId WHERE u.CompanyId=?",
          [who.companyId],
        )
      : [];
    const activity = await this.db.rows(
      "SELECT Action AS action,ActorName AS actor,CreatedAt AS createdAt FROM CorporateAudit WHERE CompanyId=? ORDER BY Id DESC LIMIT 20",
      [who.companyId],
    );
    return {
      company,
      identity: who,
      employees,
      inventory,
      invoices,
      roles,
      users,
      activity,
      products: await this.onboarding.products(who),
    };
  }
  private async audit(who: CorporateIdentity, action: string, c: Connection) {
    await this.db.execute(
      "INSERT INTO CorporateAudit (CompanyId,UserId,ActorName,Action) VALUES (?,?,?,?)",
      [who.companyId, who.userId, who.name, action],
      c,
    );
  }
  private async own(
    table:
      | "CorporateEmployee"
      | "CorporateInventory"
      | "CorporateUser"
      | "CorporateRole",
    id: number,
    who: CorporateIdentity,
    c: Connection,
  ) {
    const [row] = await this.db.rows(
      `SELECT * FROM ${table} WHERE Id=? AND CompanyId=? FOR UPDATE`,
      [id, who.companyId],
      c,
    );
    if (!row) throw new NotFoundException("Record not found in your company.");
    return row;
  }
  async employee(who: CorporateIdentity, dto: EmployeeDto) {
    checkPermission(who, "employees");
    const date = new Date(`${dto.joinedOn}T00:00:00Z`);
    if (
      !Number.isFinite(date.getTime()) ||
      date.toISOString().slice(0, 10) !== dto.joinedOn
    )
      throw new BadRequestException("Invalid joining date.");
    const saved = await this.db.transaction(async (c) => {
      if (!dto.id && dto.requestId) {
        const [existing] = await this.db.rows("SELECT EmployeeId,RequestHash FROM CorporateOnboarding WHERE CompanyId=? AND RequestId=?", [who.companyId, dto.requestId], c);
        if (existing) {
          if (existing.RequestHash !== enrollmentFingerprint(dto)) throw new ConflictException("This onboarding request was already saved with different details. Open the existing employee's customer profile.");
          return { success: true, employeeId: Number(existing.EmployeeId), created: true };
        }
      }
      let employeeId = dto.id ?? 0;
      const [duplicate] = await this.db.rows(
        "SELECT Id FROM CorporateEmployee WHERE CompanyId=? AND (Mobile=? OR EmployeeCode=?) AND Id<>?",
        [who.companyId, dto.mobile, dto.employeeCode.trim(), dto.id ?? 0],
        c,
      );
      if (duplicate)
        throw new ConflictException(
          "This mobile number or employee ID is already on the company roster.",
        );
      if (dto.id) {
        const previous = await this.own("CorporateEmployee", dto.id, who, c);
        if (previous.Mobile !== dto.mobile)
          throw new BadRequestException(
            "Contact OHOINDIA to change a linked customer's mobile number.",
          );
        if (previous.Status === "Removed") {
          const [company] = await this.db.rows(
            "SELECT GroupId FROM CorporateCompany WHERE Id=?",
            [who.companyId],
            c,
          );
          const [community] = await this.db.rows(
            "SELECT GroupId FROM CommunityCustomers WHERE CommunityCustomersId=? FOR UPDATE",
            [Number(previous.CommunityCustomerId)],
            c,
          );
          if (!community)
            throw new BadRequestException(
              "The linked customer no longer exists. Contact OHOINDIA.",
            );
          if (
            community.GroupId != null &&
            Number(community.GroupId) !== Number(company.GroupId)
          )
            throw new ConflictException(
              "Customer now belongs to another group. Contact OHOINDIA for a transfer.",
            );
          await this.db.execute(
            "UPDATE CommunityCustomers SET GroupId=? WHERE CommunityCustomersId=?",
            [Number(company.GroupId), Number(previous.CommunityCustomerId)],
            c,
          );
        }
        await this.db.execute(
          "UPDATE CorporateEmployee SET Name=?,Email=?,Department=?,EmployeeCode=?,JoinedOn=?,Status=? WHERE Id=? AND CompanyId=?",
          [
            dto.name.trim(),
            dto.email.trim(),
            dto.department.trim(),
            dto.employeeCode.trim(),
            dto.joinedOn,
            dto.status,
            dto.id,
            who.companyId,
          ],
          c,
        );
      } else {
        const [company] = await this.db.rows(
          "SELECT GroupId FROM CorporateCompany WHERE Id=?",
          [who.companyId],
          c,
        );
        const [customer] = await this.db.rows(
          "SELECT CustomerId FROM Customer WHERE MobileNumber=? AND RelatedCustomerId IS NULL LIMIT 1",
          [dto.mobile],
          c,
        );
        let [community] = await this.db.rows(
          "SELECT CommunityCustomersId,GroupId FROM CommunityCustomers WHERE MobileNumber=? LIMIT 1 FOR UPDATE",
          [dto.mobile],
          c,
        );
        if (
          community &&
          community.GroupId != null &&
          Number(community.GroupId) !== Number(company.GroupId)
        )
          throw new ConflictException(
            "Customer already belongs to another group. Contact OHOINDIA for a transfer.",
          );
        if (!community) {
          const result = await this.db.execute(
            "INSERT INTO CommunityCustomers (Name,MobileNumber,GroupId,IsActive,RegisteredOn) VALUES (?,?,?,1,NOW())",
            [dto.name.trim(), dto.mobile, Number(company.GroupId)],
            c,
          );
          community = { CommunityCustomersId: result.insertId };
        } else if (community.GroupId == null) {
          await this.db.execute(
            "UPDATE CommunityCustomers SET GroupId=? WHERE CommunityCustomersId=?",
            [Number(company.GroupId), Number(community.CommunityCustomersId)],
            c,
          );
        }
        const roster = await this.db.execute(
          "INSERT INTO CorporateEmployee (CompanyId,CustomerId,CommunityCustomerId,Name,Email,Mobile,EmployeeCode,Department,JoinedOn,Status) VALUES (?,?,?,?,?,?,?,?,?,?)",
          [
            who.companyId,
            customer ? Number(customer.CustomerId) : null,
            Number(community.CommunityCustomersId),
            dto.name.trim(),
            dto.email.trim(),
            dto.mobile,
            dto.employeeCode.trim(),
            dto.department.trim(),
            dto.joinedOn,
            dto.status,
          ],
          c,
        );
        employeeId = roster.insertId;
        await this.onboarding.prepare(who, employeeId, dto, c);
      }
      await this.audit(
        who,
        `${dto.id ? "Updated" : "Onboarded"} employee ${dto.employeeCode}`,
        c,
      );
      return { success: true, employeeId, created: !dto.id };
    }, dto.id ? `corporate-company:${who.companyId}` : "corporate-onboarding");
    return saved.created ? this.onboarding.complete(who, saved.employeeId) : saved;
  }
  async remove(who: CorporateIdentity, id: number) {
    checkPermission(who, "employees");
    return this.db.transaction(async (c) => {
      const employee = await this.own("CorporateEmployee", id, who, c);
      await this.db.execute(
        "UPDATE CommunityCustomers SET GroupId=NULL WHERE CommunityCustomersId=? AND GroupId=(SELECT GroupId FROM CorporateCompany WHERE Id=?)",
        [Number(employee.CommunityCustomerId), who.companyId],
        c,
      );
      await this.db.execute(
        "UPDATE CorporateEmployee SET Status='Removed' WHERE Id=? AND CompanyId=?",
        [id, who.companyId],
        c,
      );
      await this.db.execute(
        "DELETE FROM CorporateAssignment WHERE EmployeeId=? AND CompanyId=?",
        [id, who.companyId],
        c,
      );
      await this.audit(
        who,
        `Removed employee ${employee.EmployeeCode} from company roster`,
        c,
      );
      return { success: true };
    }, `corporate-company:${who.companyId}`);
  }
  async inventory(who: CorporateIdentity, dto: InventoryDto) {
    checkPermission(who, "inventory");
    return this.db.transaction(async (c) => {
      const [duplicate] = await this.db.rows(
        "SELECT Id FROM CorporateInventory WHERE CompanyId=? AND Sku=?",
        [who.companyId, dto.sku.trim()],
        c,
      );
      if (duplicate) throw new ConflictException("SKU already exists.");
      await this.db.execute(
        "INSERT INTO CorporateInventory (CompanyId,Name,Sku,Quantity) VALUES (?,?,?,?)",
        [who.companyId, dto.name.trim(), dto.sku.trim(), dto.quantity],
        c,
      );
      await this.audit(who, `Added inventory ${dto.sku}`, c);
      return { success: true };
    }, `corporate-company:${who.companyId}`);
  }
  async assign(who: CorporateIdentity, dto: AssignDto) {
    checkPermission(who, "inventory");
    return this.db.transaction(async (c) => {
      const item = await this.own("CorporateInventory", dto.id, who, c);
      const employee = await this.own(
        "CorporateEmployee",
        dto.employeeId,
        who,
        c,
      );
      if (employee.Status !== "Active")
        throw new BadRequestException(
          "Only active employees can receive inventory.",
        );
      const [count] = await this.db.rows(
        "SELECT COUNT(*) AS total FROM CorporateAssignment WHERE InventoryId=? AND CompanyId=?",
        [dto.id, who.companyId],
        c,
      );
      if (Number(count.total) >= Number(item.Quantity))
        throw new ConflictException("No inventory available.");
      const [duplicate] = await this.db.rows(
        "SELECT Id FROM CorporateAssignment WHERE InventoryId=? AND EmployeeId=? AND CompanyId=?",
        [dto.id, dto.employeeId, who.companyId],
        c,
      );
      if (duplicate)
        throw new ConflictException(
          "This item is already assigned to the employee.",
        );
      await this.db.execute(
        "INSERT INTO CorporateAssignment (CompanyId,InventoryId,EmployeeId) VALUES (?,?,?)",
        [who.companyId, dto.id, dto.employeeId],
        c,
      );
      await this.audit(
        who,
        `Assigned ${item.Sku} to ${employee.EmployeeCode}`,
        c,
      );
      return { success: true };
    }, `corporate-company:${who.companyId}`);
  }
  async role(who: CorporateIdentity, dto: RoleDto) {
    checkPermission(who, "access");
    return this.db.transaction(async (c) => {
      const [duplicate] = await this.db.rows(
        "SELECT Id FROM CorporateRole WHERE CompanyId=? AND Name=?",
        [who.companyId, dto.name.trim()],
        c,
      );
      if (duplicate) throw new ConflictException("Role name already exists.");
      await this.db.execute(
        "INSERT INTO CorporateRole (CompanyId,Name,Permissions,IsSystem) VALUES (?,?,?,0)",
        [who.companyId, dto.name.trim(), JSON.stringify(dto.permissions)],
        c,
      );
      await this.audit(who, `Created role ${dto.name}`, c);
      return { success: true };
    }, `corporate-company:${who.companyId}`);
  }
  async user(who: CorporateIdentity, dto: UserDto) {
    checkPermission(who, "access");
    const password = dto.password ? await hashPassword(dto.password) : null;
    return this.db.transaction(async (c) => {
      await this.own("CorporateRole", dto.roleId, who, c);
      const email = dto.email.trim().toLowerCase();
      const [duplicate] = await this.db.rows(
        "SELECT Id FROM CorporateUser WHERE Email=? AND Id<>?",
        [email, dto.id ?? 0],
        c,
      );
      if (duplicate)
        throw new ConflictException("Email is already registered.");
      if (dto.id) {
        await this.own("CorporateUser", dto.id, who, c);
        if (dto.id === who.userId)
          throw new BadRequestException(
            "Ask another administrator to change your access.",
          );
        const [admin] = await this.db.rows(
          `SELECT COUNT(*) AS total FROM CorporateUser u JOIN CorporateRole r ON r.Id=u.RoleId WHERE u.CompanyId=? AND u.Id<>? AND u.Status='Active' AND JSON_CONTAINS(r.Permissions,'"access"')`,
          [who.companyId, dto.id],
          c,
        );
        if (!Number(admin.total))
          throw new BadRequestException(
            "Keep at least one active access administrator.",
          );
        await this.db.execute(
          "UPDATE CorporateUser SET Name=?,Email=?,RoleId=?,Status=?,PasswordHash=COALESCE(?,PasswordHash) WHERE Id=? AND CompanyId=?",
          [
            dto.name.trim(),
            email,
            dto.roleId,
            dto.status,
            password,
            dto.id,
            who.companyId,
          ],
          c,
        );
        await this.db.execute(
          "DELETE FROM CorporateSession WHERE UserId=?",
          [dto.id],
          c,
        );
      } else {
        if (!password)
          throw new BadRequestException(
            "A password of at least 12 characters is required.",
          );
        await this.db.execute(
          "INSERT INTO CorporateUser (CompanyId,Name,Email,RoleId,Status,PasswordHash) VALUES (?,?,?,?,?,?)",
          [
            who.companyId,
            dto.name.trim(),
            email,
            dto.roleId,
            dto.status,
            password,
          ],
          c,
        );
      }
      await this.audit(
        who,
        `${dto.id ? "Updated" : "Created"} portal user ${email}`,
        c,
      );
      return { success: true };
    }, `corporate-company:${who.companyId}`);
  }
}
