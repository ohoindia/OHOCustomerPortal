import { JwtService } from "@nestjs/jwt";
import {
  BadRequestException,
  ConflictException,
  Body,
  CanActivate,
  Controller,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Param,
  ParseIntPipe,
  Post,
  Req,
  ServiceUnavailableException,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import { Public } from "../auth/jwt-auth.guard";
import { RuntimeConfigService } from "../runtime-config/runtime-config.service";
import { DatabaseService } from "../database/database.service";
import { CorporateService, CorporateIdentity } from "./corporate.service";
import { ProvisionDto, RoleDto, UserDto, IdDto, CorporateInvoiceDto } from "./corporate.dto";
import { hashPassword } from "./password";
import { CorporateOnboardingService } from "./corporate-onboarding";
import { employeeCounts } from "./employee-counts";

interface AdminRequest {
  headers: { authorization?: string };
  operator: string;
  adminUserId: number;
}
@Injectable()
export class CorporateAdminGuard implements CanActivate {
  constructor(private readonly config: RuntimeConfigService, private readonly db: DatabaseService) {}
  private async secret() {
    const secret = await this.config.getSecret("JWT_SECRET");
    if (Buffer.byteLength(secret) < 32) throw new ServiceUnavailableException("Corporate sessions are not configured.");
    return secret;
  }
  async session(userId: number) {
    const token = await new JwtService().signAsync({ adminUserId: userId }, {
      secret: await this.secret(), algorithm: "HS256", issuer: "oho-corporate-admin",
      audience: "oho-frontweb", expiresIn: "8h",
    });
    return { token };
  }
  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AdminRequest>();
    const bearer = /^Bearer ([^\s]+)$/.exec(request.headers.authorization ?? "");
    if (bearer) {
      if (!/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(bearer[1])) throw new UnauthorizedException("Invalid administrator session.");
      let claims;
      const secret = await this.secret();
      try {
        claims = await new JwtService().verifyAsync(bearer[1], {
          secret, algorithms: ["HS256"], issuer: "oho-corporate-admin", audience: "oho-frontweb",
        });
      } catch { throw new UnauthorizedException("Your session expired. Please log in again."); }
      if (!Number.isSafeInteger(claims.adminUserId) || claims.adminUserId < 1)
        throw new UnauthorizedException("Invalid administrator session.");
      const allowed = (await this.config.get("CORPORATE_ADMIN_ROLE_IDS")).split(",").map(s => s.trim()).filter(s => /^[1-9]\d*$/.test(s));
      const [user] = await this.db.rows("SELECT EmployeeId,UserRoleId,IsActive FROM Employee WHERE EmployeeId=?", [claims.adminUserId]);
      if (!user || !Number(user.IsActive) || !allowed.includes(String(user.UserRoleId)))
        throw new ForbiddenException("Your role cannot manage corporate users.");
      request.adminUserId = claims.adminUserId;
      request.operator = `OHOINDIA admin #${claims.adminUserId}`;
      return true;
    }
    const match = /^Basic ([A-Za-z0-9+/=]+)$/.exec(
      request.headers.authorization ?? "",
    );
    if (!match)
      throw new UnauthorizedException(
        "Confirm your OHOINDIA admin credentials.",
      );
    const credentials = Buffer.from(match[1], "base64").toString("utf8");
    const separator = credentials.indexOf(":");
    if (
      separator < 1 ||
      separator === credentials.length - 1 ||
      credentials.length > 512
    )
      throw new UnauthorizedException("Invalid admin credentials.");
    const endpoint = await this.config.get("CORPORATE_ADMIN_LOGIN_URL");
    const allowed = (await this.config.get("CORPORATE_ADMIN_ROLE_IDS"))
      .split(",")
      .map((s) => s.trim())
      .filter((s) => /^[1-9]\d*$/.test(s));
    if (!endpoint || !allowed.length)
      throw new ServiceUnavailableException(
        "Corporate admin authentication has not been configured.",
      );
    let url: URL;
    try {
      url = new URL(endpoint);
    } catch {
      throw new ServiceUnavailableException(
        "Configure a valid admin login endpoint.",
      );
    }
    if (
      url.protocol !== "https:" &&
      !(
        url.protocol === "http:" &&
        ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)
      )
    )
      throw new ServiceUnavailableException(
        "Configure an HTTPS admin login endpoint.",
      );
    let data;
    try {
      const response = await fetch(url, {
        method: "POST",
        redirect: "error",
        signal: AbortSignal.timeout(10000),
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userName: credentials.slice(0, separator),
          password: credentials.slice(separator + 1),
        }),
      });
      if (!response.ok) throw new Error();
      data = await response.json();
    } catch {
      throw new UnauthorizedException(
        "Admin verification failed. Check your credentials and retry.",
      );
    }
    const user = data?.data?.[0];
    if (
      data?.status !== true ||
      !Number.isSafeInteger(Number(user?.UserId)) ||
      Number(user?.UserId) < 1
    )
      throw new UnauthorizedException("Invalid admin credentials.");
    if (!allowed.includes(String(user.UserRoleId)))
      throw new ForbiddenException(
        "Your admin role cannot manage corporate access.",
      );
    request.adminUserId = Number(user.UserId);
    request.operator = `OHOINDIA admin #${user.UserId}`;
    return true;
  }
}

@Injectable()
export class CorporateAdminService {
  constructor(
    private readonly db: DatabaseService,
    private readonly corporate: CorporateService,
  ) {}
  async identity(
    groupId: number,
    operator: string,
  ): Promise<CorporateIdentity> {
    const [company] = await this.db.rows(
      "SELECT Id FROM CorporateCompany WHERE GroupId=? AND IsActive=1",
      [groupId],
    );
    if (!company)
      throw new ForbiddenException(
        "Provision an active company for this Group first.",
      );
    return {
      companyId: Number(company.Id),
      userId: 0,
      name: operator,
      email: "",
      role: "OHOINDIA operator",
      permissions: ["access"],
    };
  }
  async access(groupId: number) {
    const [company] = await this.db.rows(
      "SELECT Id,Name,IsActive FROM CorporateCompany WHERE GroupId=?",
      [groupId],
    );
    if (!company) return { company: null, roles: [], users: [] };
    const roles = await this.db.rows(
      "SELECT Id,Name,Permissions FROM CorporateRole WHERE CompanyId=? ORDER BY Id",
      [Number(company.Id)],
    );
    const users = await this.db.rows(
      "SELECT u.Id,u.Name,u.Email,u.RoleId,u.Status,r.Name AS Role FROM CorporateUser u JOIN CorporateRole r ON r.Id=u.RoleId AND r.CompanyId=u.CompanyId WHERE u.CompanyId=? ORDER BY u.Id",
      [Number(company.Id)],
    );
    const employees = await this.db.rows(
      "SELECT e.Id AS id,c.CustomerId AS customerId,c.IsActive AS customerActive,e.CommunityCustomerId AS communityCustomerId,e.Name AS name,e.Email AS email,e.Mobile AS mobile,e.EmployeeCode AS employeeCode,e.Department AS department,DATE_FORMAT(e.JoinedOn,'%Y-%m-%d') AS joinedOn,e.Status AS status,e.OnboardingStatus AS onboardingStatus FROM CorporateEmployee e LEFT JOIN Customer c ON c.CustomerId=e.CustomerId WHERE e.CompanyId=? ORDER BY e.Id DESC",
      [Number(company.Id)],
    );
    const invoices = await this.db.rows(
      "SELECT Id AS id,InvoiceNumber AS number,DATE_FORMAT(IssuedOn,'%Y-%m-%d') AS issuedOn,DATE_FORMAT(DueOn,'%Y-%m-%d') AS dueOn,AmountPaise AS amountPaise,Status AS status,Description AS description FROM CorporateInvoice WHERE CompanyId=? ORDER BY IssuedOn DESC,Id DESC",
      [Number(company.Id)],
    );
    const customerLinks = await this.db.rows(
      "SELECT DISTINCT c.CustomerId AS customerId,c.IsActive AS customerActive FROM Customer c JOIN CommunityCustomers m ON m.MobileNumber=c.MobileNumber JOIN CorporateCompany co ON co.GroupId=m.GroupId WHERE co.Id=? AND c.RelatedCustomerId IS NULL",
      [Number(company.Id)],
    );
    return { company, roles, users, employees, invoices, customerLinks, employeeCounts: await employeeCounts(this.db, Number(company.Id)) };
  }
  async invoice(groupId: number, dto: CorporateInvoiceDto, operator: string) {
    const validDate = (value: string) => {
      const date = new Date(`${value}T00:00:00Z`);
      return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
    };
    if (!validDate(dto.issuedOn) || !validDate(dto.dueOn) || dto.dueOn < dto.issuedOn)
      throw new BadRequestException("Enter valid invoice dates; due date cannot precede issue date.");
    const who = await this.identity(groupId, operator);
    try {
      return await this.db.transaction(async (c) => {
        const result = await this.db.execute(
          "INSERT INTO CorporateInvoice (CompanyId,InvoiceNumber,IssuedOn,DueOn,AmountPaise,Status,Description) VALUES (?,?,?,?,?,'Due',?)",
          [who.companyId, dto.number.trim(), dto.issuedOn, dto.dueOn, dto.amountPaise, dto.description.trim()], c,
        );
        await this.db.execute(
          "INSERT INTO CorporateAudit (CompanyId,UserId,ActorName,Action) VALUES (?,0,?,?)",
          [who.companyId, operator, `Invoice raised: ${dto.number.trim()}`], c,
        );
        return { invoiceId: result.insertId };
      });
    } catch (error) {
      if ((error as { code?: string }).code === "ER_DUP_ENTRY")
        throw new ConflictException("This invoice number already exists for this company.");
      throw error;
    }
  }
  async provision(groupId: number, dto: ProvisionDto, operator: string) {
    const password = await hashPassword(dto.password);
    return this.db.transaction(async (c) => {
      const [group] = await this.db.rows(
        "SELECT GroupId FROM `Group` WHERE GroupId=? FOR UPDATE",
        [groupId],
        c,
      );
      if (!group)
        throw new ForbiddenException("Create the Group in OHOINDIA first.");
      const [existing] = await this.db.rows(
        "SELECT Id FROM CorporateCompany WHERE GroupId=?",
        [groupId],
        c,
      );
      if (existing)
        throw new ForbiddenException(
          "This Group already has corporate access. Load its roles and users.",
        );
      const [duplicate] = await this.db.rows(
        "SELECT Id FROM CorporateUser WHERE Email=?",
        [dto.email.trim().toLowerCase()],
        c,
      );
      if (duplicate)
        throw new ForbiddenException("Email is already registered.");
      const company = await this.db.execute(
        "INSERT INTO CorporateCompany (GroupId,Name) VALUES (?,?)",
        [groupId, dto.companyName.trim()],
        c,
      );
      let adminId = 0;
      for (const [name, permissions] of [
        ["Admin", ["employees", "inventory", "invoices", "access"]],
        ["HR", ["employees", "inventory"]],
        ["Finance", ["invoices"]],
        ["Viewer", []],
      ] as const) {
        const role = await this.db.execute(
          "INSERT INTO CorporateRole (CompanyId,Name,Permissions,IsSystem) VALUES (?,?,?,1)",
          [company.insertId, name, JSON.stringify(permissions)],
          c,
        );
        if (name === "Admin") adminId = role.insertId;
      }
      await this.db.execute(
        "INSERT INTO CorporateUser (CompanyId,RoleId,Name,Email,PasswordHash,Status) VALUES (?,?,?,?,?,'Active')",
        [
          company.insertId,
          adminId,
          dto.name.trim(),
          dto.email.trim().toLowerCase(),
          password,
        ],
        c,
      );
      await this.db.execute(
        "INSERT INTO CorporateAudit (CompanyId,UserId,ActorName,Action) VALUES (?,0,?,'Company portal provisioned')",
        [company.insertId, operator],
        c,
      );
      return { companyId: company.insertId };
    }, `corporate-group:${groupId}`);
  }
}

@Public()
@UseGuards(CorporateAdminGuard)
@Controller("api/corporate-admin/groups/:groupId")
export class CorporateAdminController {
  constructor(
    private readonly admin: CorporateAdminService,
    private readonly corporate: CorporateService,
    private readonly onboarding: CorporateOnboardingService,
  ) {}
  @Post("access") access(@Param("groupId", ParseIntPipe) groupId: number) {
    return this.admin.access(groupId);
  }
  @Post("employees/customer") async employeeDetails(
    @Param("groupId", ParseIntPipe) groupId: number,
    @Body() dto: IdDto,
    @Req() r: AdminRequest,
  ) {
    return this.onboarding.details(await this.admin.identity(groupId, r.operator), dto.id);
  }
  @Post("invoices/raise") invoice(
    @Param("groupId", ParseIntPipe) groupId: number,
    @Body() dto: CorporateInvoiceDto,
    @Req() r: AdminRequest,
  ) {
    return this.admin.invoice(groupId, dto, r.operator);
  }
  @Post("provision") provision(
    @Param("groupId", ParseIntPipe) groupId: number,
    @Body() dto: ProvisionDto,
    @Req() r: AdminRequest,
  ) {
    return this.admin.provision(groupId, dto, r.operator);
  }
  @Post("roles/save") async role(
    @Param("groupId", ParseIntPipe) groupId: number,
    @Body() dto: RoleDto,
    @Req() r: AdminRequest,
  ) {
    return this.corporate.role(
      await this.admin.identity(groupId, r.operator),
      dto,
    );
  }
  @Post("users/save") async user(
    @Param("groupId", ParseIntPipe) groupId: number,
    @Body() dto: UserDto,
    @Req() r: AdminRequest,
  ) {
    return this.corporate.user(
      await this.admin.identity(groupId, r.operator),
      dto,
    );
  }
}

@Public()
@UseGuards(CorporateAdminGuard)
@Controller("api/corporate-admin")
export class CorporateAdminSessionController {
  constructor(private readonly guard: CorporateAdminGuard) {}
  @Post("session") session(@Req() request: AdminRequest) {
    if (!request.headers.authorization?.startsWith("Basic "))
      throw new UnauthorizedException("Sign in through OHOINDIA to start a session.");
    return this.guard.session(request.adminUserId);
  }
}
