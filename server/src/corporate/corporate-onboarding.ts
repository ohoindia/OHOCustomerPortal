import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  DatabaseService,
  Connection,
  DbRow,
} from "../database/database.service";
import { flag, personAge, quote } from "../purchases/purchase.utils";
import { EmployeeDto, ExcelOrderDetailsDto } from "./corporate.dto";
import type { CorporateIdentity } from "./corporate.service";
import { createHash } from "node:crypto";

export function enrollmentFingerprint(dto: EmployeeDto): string {
  const ordered = (value: unknown): unknown =>
    Array.isArray(value)
      ? value.map(ordered)
      : value != null && typeof value === "object"
        ? Object.fromEntries(
            Object.entries(value)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([key, v]) => [key, ordered(v)]),
          )
        : value;
  return createHash("sha256")
    .update(JSON.stringify(ordered(dto)))
    .digest("hex");
}

@Injectable()
export class CorporateOnboardingService {
  constructor(private readonly db: DatabaseService) {}

  private async product(
    id: number,
    c?: Connection,
  ): Promise<DbRow & { nominees: DbRow[] }> {
    const [product] = await this.db.rows(
      "SELECT * FROM ProductsDetails WHERE ProductsId=?",
      [id],
      c,
    );
    if (!product)
      throw new BadRequestException("Group product details are unavailable.");
    const included = await this.db.rows(
      "SELECT p.ProductsId,p.ProductName,p.IsNomineeRequired FROM ComboProducts cp JOIN Products p ON p.ProductsId=cp.ProductsId WHERE cp.ComboId=? AND cp.IsActive=1",
      [id],
      c,
    );
    const required = included.filter((item) => flag(item.IsNomineeRequired));
    return {
      ...product,
      nominees: required.length
        ? required
        : flag(product.IsNomineeRequired)
          ? [product]
          : [],
    };
  }

  async products(who: CorporateIdentity) {
    // The group attachment grants eligibility, including an inactive product.
    const attached = await this.db.rows(
      "SELECT DISTINCT p.ProductsId FROM GroupProducts gp JOIN Products p ON p.ProductsId=gp.ProductsId JOIN CorporateCompany c ON c.GroupId=gp.GroupId WHERE c.Id=? AND gp.IsActive=1",
      [who.companyId],
    );
    return Promise.all(
      attached.map(async (row) => {
        const p = await this.product(Number(row.ProductsId));
        return {
          id: Number(p.ProductsId),
          name: String(p.ProductName),
          maximumMembers: Number(p.MaximumMembers ?? 1),
          requiresSpouse: Number(p.NoOfCardHolders) === 2,
          nominees: p.nominees.map((item) => ({
            id: Number(item.ProductsId),
            name: String(item.ProductName),
          })),
        };
      }),
    );
  }

  private age(dob: string) {
    const value = new Date(dob);
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(dob) ||
      !Number.isFinite(value.getTime()) ||
      value.toISOString().slice(0, 10) !== dob
    )
      throw new BadRequestException("Enter a valid date of birth.");
    return personAge(dob);
  }

  async prepare(
    who: CorporateIdentity,
    employeeId: number,
    dto: EmployeeDto,
    c: Connection,
  ) {
    if (!dto.requestId || !dto.productsId || !dto.dateofBirth || !dto.gender)
      throw new BadRequestException(
        "Select a group product and enter the employee's date of birth and gender.",
      );
    if (dto.email.length > 150)
      throw new BadRequestException(
        "Order email must be at most 150 characters.",
      );
    const [attached] = await this.db.rows(
      "SELECT gp.ProductsId FROM GroupProducts gp JOIN CorporateCompany c ON c.GroupId=gp.GroupId WHERE c.Id=? AND gp.ProductsId=? AND gp.IsActive=1 FOR UPDATE",
      [who.companyId, dto.productsId],
      c,
    );
    if (!attached)
      throw new BadRequestException(
        "This product is not attached to your company group.",
      );
    const product = await this.product(dto.productsId, c);
    const age = this.age(dto.dateofBirth);
    const minimum = Number(
      product.ProductsMinimumAge ?? product.MinimumAge ?? 0,
    );
    const maximum = Number(
      product.ProductsMaximumAge ?? product.MaximumAge ?? 120,
    );
    if (age < minimum || age > maximum)
      throw new BadRequestException(
        "The employee is outside the product's age limits.",
      );
    const family = (dto.family ?? []).map((person) => ({
      ...person,
      relationship: person.relationship.trim(),
      age: this.age(person.dateofBirth),
      cardHolderType:
        person.cardHolderType ??
        (person.relationship.trim() === "Spouse" ? "Secondary" : "Family"),
    }));
    if (family.length > Math.max(0, Number(product.MaximumMembers ?? 1) - 1))
      throw new BadRequestException(
        "The product's family member limit has been reached.",
      );
    if (
      Number(product.NoOfCardHolders) === 2 &&
      !family.some((p) => p.relationship === "Spouse")
    )
      throw new BadRequestException(
        "Spouse details are required for this product.",
      );
    if (
      family.filter((p) => p.relationship === "Spouse").length > 1 ||
      family.filter((p) => p.cardHolderType === "Secondary").length > 1
    )
      throw new BadRequestException(
        "Only one spouse and one Secondary member can be included.",
      );
    const relationships = [
      "Spouse",
      "Son",
      "Daughter",
      "Father",
      "Mother",
      "Father-in-law",
      "Mother-in-law",
      "Brother",
      "Sister",
    ];
    const seen = new Set<string>();
    for (const person of family) {
      const child = ["Son", "Daughter"].includes(person.relationship);
      if (
        !relationships.includes(person.relationship) ||
        !["Secondary", "Family"].includes(person.cardHolderType)
      )
        throw new BadRequestException(
          "Select a valid relationship and card holder type.",
        );
      if (
        (!child && (person.age < minimum || person.age > maximum)) ||
        (child &&
          person.age >
            Number(product.ProductsChildrenAge ?? product.ChildrenAge ?? 18))
      )
        throw new BadRequestException(
          "This family member is outside the product's age limits.",
        );
      const key =
        person.fullName.trim().toLowerCase() + ":" + person.dateofBirth;
      if (seen.has(key))
        throw new BadRequestException(
          "This family member is already included.",
        );
      seen.add(key);
    }
    const adultLimit = Number(product.MaximumAdult);
    const childLimit = Number(
      product.ProductsMaximumChild ?? product.MaximumChild,
    );
    if (
      adultLimit > 0 &&
      family.filter((p) => p.age >= 18).length + (age >= 18 ? 1 : 0) >
        adultLimit
    )
      throw new BadRequestException(
        "The product's adult limit has been reached.",
      );
    if (childLimit > 0 && family.filter((p) => p.age < 18).length > childLimit)
      throw new BadRequestException(
        "The product's child limit has been reached.",
      );
    const [employee] = await this.db.rows(
      "SELECT * FROM CorporateEmployee WHERE Id=? AND CompanyId=?",
      [employeeId, who.companyId],
      c,
    );
    let cardNumber: string | null = null;
    if (dto.ohoCardNumber) {
      const digits = dto.ohoCardNumber.replace(/\s/g, "");
      if (!/^\d{12}$/.test(digits))
        throw new BadRequestException("Enter a 12-digit OHO card number.");
      cardNumber = digits.match(/.{4}/g)!.join(" ");
      const cards = await this.db.rows(
        "SELECT CustomerId,IsActivated,IsCardSold FROM OHOCards WHERE REPLACE(OHOCardNumber,' ','')=? FOR UPDATE",
        [digits],
        c,
      );
      if (
        cards.some(
          (card) =>
            (Number(card.CustomerId) > 0 &&
              Number(card.CustomerId) !== Number(employee.CustomerId)) ||
            (!Number(card.CustomerId) &&
              (flag(card.IsCardSold) || flag(card.IsActivated))),
        )
      )
        throw new BadRequestException(
          "This OHO card is unavailable or belongs to another customer.",
        );
      const reserved = await this.db.rows(
        "SELECT OrdersId FROM Orders WHERE REPLACE(OHOCardNumber,' ','')=? AND (Status IS NULL OR Status='Pending') FOR UPDATE",
        [digits],
        c,
      );
      if (reserved.length)
        throw new ConflictException(
          "This OHO card is reserved for another order.",
        );
    }
    const amount =
      dto.orderDetails?.paidAmount ??
      (flag(product.IsFree) ? 0 : quote(product, age).amount);
    const insertOrder = async (
      person: {
        fullName: string;
        gender: string;
        dateofBirth: string;
        age: number;
        mobileNumber?: string;
        relationship: string;
        cardHolderType: string;
        orderDetails?: ExcelOrderDetailsDto;
      },
      parentId: number | null,
    ) => {
      // Match the import: orders first, null CustomerId, with customer/card work owned by cardCreation.
      const result = await this.db.execute(
        "INSERT INTO Orders (CustomerId,ProductsId,PayableAmount,PaidAmount,FullName,Gender,DateofBirth,Age,MobileNumber,Email,CreatedTime,Status,OHOCardNumber,PaymentType,UTRNumber,TypeofService,Description,RelatedOrderId,Relationship,CardHolderType,CreatedSource) VALUES (NULL,?,?,0,?,?,?,?,?,?,NOW(),NULL,?,'Cashfree','Free',2,?,?,?,?, 'Corporate')",
        [
          dto.productsId!,
          parentId == null ? amount : 0,
          person.fullName.trim(),
          person.gender,
          person.dateofBirth,
          person.age,
          person.mobileNumber || null,
          parentId == null ? dto.email.trim() || null : null,
          cardNumber,
          String(product.ShortDescription ?? "").slice(0, 500),
          parentId,
          person.relationship,
          person.cardHolderType,
        ],
        c,
      );
      if (person.orderDetails)
        await this.importDetails(result.insertId, person.orderDetails, c);
      return result.insertId;
    };
    const primary = {
      fullName: dto.name,
      gender: dto.gender,
      dateofBirth: dto.dateofBirth,
      age,
      mobileNumber: dto.mobile,
      relationship: "Self",
      cardHolderType: "Primary",
      orderDetails: dto.orderDetails,
    };
    const orderId = await insertOrder(primary, null);
    const familyIds: number[] = [];
    for (const person of family)
      familyIds.push(await insertOrder(person, orderId));
    const nominees = dto.nominees ?? [];
    if (
      nominees.length !== product.nominees.length ||
      product.nominees.some(
        (p) =>
          nominees.filter((n) => n.productsId === Number(p.ProductsId))
            .length !== 1,
      )
    )
      throw new BadRequestException(
        "Select a family nominee for each product that requires one.",
      );
    for (const selection of nominees) {
      const person = family[selection.familyIndex];
      const guardian =
        selection.guardianIndex == null || selection.guardianIndex === -1
          ? primary
          : family[selection.guardianIndex];
      if (!person || (person.age < 18 && (!guardian || guardian.age < 18)))
        throw new BadRequestException(
          "Select an included family nominee and an adult guardian for a minor.",
        );
      const minor = person.age < 18;
      await this.db.execute(
        "INSERT INTO Nominee (FullName,DateofBirth,Age,Gender,MobileNumber,Relationship,GuardianName,GuardianDateofBirth,GuardianAge,GuardianGender,GuardianRelationship,GuardianMobileNumber,CustomerId,CustomerOrderId,OrderId,ProductsId,CreatedOn,IsActive) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,NULL,?,?,?,NOW(),TRUE)",
        [
          person.fullName.trim(),
          person.dateofBirth,
          person.age,
          person.gender,
          person.mobileNumber || null,
          person.relationship,
          minor ? guardian.fullName.trim() : null,
          minor ? guardian.dateofBirth : null,
          minor ? guardian.age : null,
          minor ? guardian.gender : null,
          minor
            ? guardian === primary
              ? "Parent"
              : guardian.relationship
            : null,
          minor ? guardian.mobileNumber || null : null,
          orderId,
          orderId,
          selection.productsId,
        ],
        c,
      );
    }
    const [order] = await this.db.rows(
      "SELECT DATE_FORMAT(CreatedTime,'%Y-%m-%d %H:%i:%s') AS createdTime FROM Orders WHERE OrdersId=?",
      [orderId],
      c,
    );
    await this.db.execute(
      "UPDATE CorporateEmployee SET OnboardingRequestId=?,OnboardingRequestHash=?,OnboardingOrderId=?,OnboardingCreatedTime=?,OnboardingStatus='Ready',OnboardingUpdatedAt=NOW() WHERE Id=? AND CompanyId=?",
      [
        dto.requestId,
        enrollmentFingerprint(dto),
        orderId,
        String(order.createdTime),
        employeeId,
        who.companyId,
      ],
      c,
    );
  }

  private async importDetails(
    orderId: number,
    details: ExcelOrderDetailsDto,
    c: Connection,
  ) {
    let stateId: number | null = null;
    let districtId: number | null = null;
    if (details.state) {
      const [state] = await this.db.rows(
        "SELECT StateId FROM State WHERE TRIM(LOWER(StateName))=TRIM(LOWER(?)) OR StateId=? LIMIT 1",
        [
          details.state,
          /^\d+$/.test(details.state) ? Number(details.state) : 0,
        ],
        c,
      );
      if (!state)
        throw new BadRequestException(`State not found: ${details.state}`);
      stateId = Number(state.StateId);
    }
    if (details.district) {
      const [district] = await this.db.rows(
        "SELECT DistrictId FROM District WHERE (TRIM(LOWER(DistrictName))=TRIM(LOWER(?)) OR DistrictId=?) AND (? IS NULL OR StateId=?) LIMIT 1",
        [
          details.district,
          /^\d+$/.test(details.district) ? Number(details.district) : 0,
          stateId,
          stateId,
        ],
        c,
      );
      if (!district)
        throw new BadRequestException(
          `District not found in the selected state: ${details.district}`,
        );
      districtId = Number(district.DistrictId);
    }
    await this.db.execute(
      "UPDATE Orders SET AddressLine1=?,AddressLine2=?,Village=?,Mandal=?,City=?,StateId=?,DistrictId=?,PinCode=?,PaidAmount=COALESCE(?,PaidAmount),PayableAmount=COALESCE(?,PayableAmount) WHERE OrdersId=?",
      [
        details.addressLine1 ?? null,
        details.addressLine2 ?? null,
        details.village ?? null,
        details.mandal ?? null,
        details.city ?? null,
        stateId,
        districtId,
        details.pinCode ?? null,
        details.paidAmount ?? null,
        details.paidAmount ?? null,
        orderId,
      ],
      c,
    );
  }

  async complete(who: CorporateIdentity, employeeId: number) {
    // Persist the claim before the external call. A crash/timeout must never blindly repeat card issuance.
    const claim = await this.db.transaction(async (c) => {
      const [row] = await this.db.rows(
        "SELECT OnboardingOrderId AS OrderId,OnboardingCreatedTime AS CreatedTime,OnboardingStatus AS Status,OnboardingUpdatedAt AS UpdatedAt FROM CorporateEmployee WHERE Id=? AND CompanyId=? AND Status<>'Removed' AND OnboardingOrderId IS NOT NULL FOR UPDATE",
        [employeeId, who.companyId],
        c,
      );
      if (!row)
        throw new NotFoundException(
          "Employee onboarding not found in your company.",
        );
      if (row.Status !== "Ready") return { row, send: false };
      await this.db.execute(
        "UPDATE CorporateEmployee SET OnboardingStatus='Processing',OnboardingUpdatedAt=NOW() WHERE Id=? AND CompanyId=?",
        [employeeId, who.companyId],
        c,
      );
      return { row, send: true };
    }, `corporate-card:${employeeId}`);
    let accepted = false;
    if (claim.send) {
      try {
        const response = await fetch(
          "https://api.ohoindialife.com/dev2/lambdaAPI/Payment/cardCreation",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              customerOrderId: Number(claim.row.OrderId),
              CustomDate: claim.row.CreatedTime,
            }),
            signal: AbortSignal.timeout(30000),
            redirect: "error",
          },
        );
        const result = await response.json();
        accepted =
          response.ok &&
          result != null &&
          (result.status === true || result.success === true);
      } catch {
        /* Reconcile persisted customer/card data below, including ambiguous provider failures. */
      }
    }
    const [order] = await this.db.rows(
      "SELECT CustomerId,Status FROM Orders WHERE OrdersId=?",
      [Number(claim.row.OrderId)],
    );
    if (Number(order?.CustomerId) > 0)
      await this.db.execute(
        "UPDATE CorporateEmployee SET CustomerId=? WHERE Id=? AND CompanyId=?",
        [Number(order.CustomerId), employeeId, who.companyId],
      );
    const completed = ["Completed"].includes(String(order?.Status));
    const stale =
      Date.now() - new Date(String(claim.row.UpdatedAt)).getTime() > 120000;
    const status = completed
      ? "Completed"
      : claim.send
        ? accepted
          ? "Processing"
          : "Review"
        : claim.row.Status === "Processing" && stale
          ? "Review"
          : String(claim.row.Status);
    // A simultaneous refresh must not overwrite another request's completion.
    await this.db.execute(
      "UPDATE CorporateEmployee SET OnboardingStatus=?,OnboardingUpdatedAt=NOW() WHERE Id=? AND CompanyId=? AND OnboardingStatus<>'Completed'",
      [status, employeeId, who.companyId],
    );
    return {
      success: true,
      employeeId,
      orderId: Number(claim.row.OrderId),
      onboardingStatus: status,
      message:
        status === "Completed"
          ? "Employee onboarded. Customer benefits and card are available."
          : status === "Review"
            ? "Employee and order saved. Card creation needs OHOINDIA review. Do not create another employee or order."
            : "Employee and order saved. Card creation is processing; refresh the customer view to check progress.",
    };
  }

  async details(who: CorporateIdentity, employeeId: number) {
    const [employee] = await this.db.rows(
      "SELECT CustomerId FROM CorporateEmployee WHERE Id=? AND CompanyId=?",
      [employeeId, who.companyId],
    );
    if (!employee)
      throw new NotFoundException("Employee not found in your company.");
    const onboarding = await this.db.rows(
      "SELECT e.OnboardingOrderId AS orderId,e.OnboardingStatus AS status,o.CustomerId AS customerId FROM CorporateEmployee e JOIN Orders o ON o.OrdersId=e.OnboardingOrderId WHERE e.Id=? AND e.CompanyId=?",
      [employeeId, who.companyId],
    );
    const customerId = Number(onboarding[0]?.customerId ?? employee.CustomerId);
    const pendingFamily = onboarding.length
      ? await this.db.rows(
          "SELECT OrdersId AS id,FullName AS name,Relationship AS relationship,CardHolderType AS cardHolderType,DATE_FORMAT(DateofBirth,'%Y-%m-%d') AS dateofBirth,Gender AS gender FROM Orders WHERE RelatedOrderId=?",
          [Number(onboarding[0].orderId)],
        )
      : [];
    if (!customerId)
      return {
        customerId: null,
        onboarding: onboarding[0] ?? null,
        cards: [],
        products: [],
        family: pendingFamily,
      };
    const [cards, products, family] = await Promise.all([
      this.db.rows(
        "SELECT OHOCardNumber AS number,StartDate AS startDate,EndDate AS endDate,IsActivated AS active FROM OHOCards WHERE CustomerId=?",
        [customerId],
      ),
      this.db.rows(
        "SELECT DISTINCT MemberProductId AS id,ProductName AS name,IssuedOn AS issuedOn,ValidTill AS validTill FROM View_Subscription WHERE MemberId=?",
        [customerId],
      ),
      this.db.rows(
        "SELECT CustomerId AS id,Name AS name,Relationship AS relationship,CardHolderType AS cardHolderType,DATE_FORMAT(DateofBirth,'%Y-%m-%d') AS dateofBirth,Gender AS gender FROM Customer WHERE RelatedCustomerId=?",
        [customerId],
      ),
    ]);
    return {
      customerId: customerId || null,
      onboarding: onboarding[0] ?? null,
      cards,
      products,
      family: family.length ? family : pendingFamily,
    };
  }
}
