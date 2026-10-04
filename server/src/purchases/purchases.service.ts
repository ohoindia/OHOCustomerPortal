import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { randomUUID } from "node:crypto";
import {
  DatabaseService,
  DbRow,
  Connection,
  SqlValue,
} from "../database/database.service";
import { RuntimeConfigService } from "../runtime-config/runtime-config.service";
import { validId } from "../customers/customers.service";
import { NomineeDto, PersonDto, PurchaseDto } from "./purchase.dto";
import { flag, personAge, premiums, quote } from "./purchase.utils";

const orderFields =
  "OrdersId, ProductsId, FullName, Gender, DateofBirth, Age, MobileNumber, Relationship, CardHolderType, PayableAmount, Status";
@Injectable()
export class PurchasesService {
  constructor(
    private readonly db: DatabaseService,
    private readonly config: RuntimeConfigService,
  ) {}

  async product(
    id: number,
    requireAvailable = true,
  ): Promise<
    DbRow & { InsurancePremiums: DbRow[]; includedProducts: DbRow[] }
  > {
    const rows = await this.db.rows(
      "SELECT * FROM ProductsDetails WHERE ProductsId = ?",
      [validId(id)],
    );
    const product = rows[0];
    if (!product) throw new NotFoundException("Package not found.");
    if (
      requireAvailable &&
      (!flag(product.IsCombo) ||
        flag(product.IsFree) ||
        !flag(product.IsActive ?? product.ProductsIsActive))
    )
      throw new BadRequestException(
        "This package is not available for purchase.",
      );
    const included = await this.db.rows(
      "SELECT p.ProductsId, p.ProductName, p.IsNomineeRequired FROM ComboProducts cp JOIN Products p ON p.ProductsId = cp.ProductsId WHERE cp.ComboId = ? AND cp.IsActive = TRUE",
      [id],
    );
    return {
      ...product,
      InsurancePremiums: premiums(product),
      includedProducts: included,
    };
  }

  private async owned(customerId: number, id: number, connection?: Connection) {
    const rows = await this.db.rows(
      "SELECT * FROM Orders WHERE OrdersId = ? AND CustomerId = ? AND RelatedOrderId IS NULL",
      [validId(id), validId(customerId)],
      connection,
    );
    if (!rows[0])
      throw new ForbiddenException(
        "This purchase does not belong to your account.",
      );
    return rows[0];
  }
  private async editable(order: DbRow, connection?: Connection) {
    if (order.Status === "Completed" || order.Status === "Paid")
      throw new ConflictException("This purchase has already been paid.");
    const links = await this.db.rows(
      "SELECT LinkId, LinkStatus, LinkExpiryTime, TransactionStatus FROM PaymentLinkHistory WHERE OrderId = ? ORDER BY PaymentLinkHistoryId DESC LIMIT 1",
      [Number(order.OrdersId)],
      connection,
    );
    const link = links[0];
    if (
      link &&
      (link.TransactionStatus === "SUCCESS" ||
        link.LinkStatus === "PAID" ||
        (link.LinkStatus === "ACTIVE" &&
          new Date(String(link.LinkExpiryTime)).getTime() > Date.now()))
    )
      throw new ConflictException(
        "Finish the current payment before changing purchase details.",
      );
    if (link?.LinkStatus === "ACTIVE") {
      const status = await this.gateway(
        `/${encodeURIComponent(String(link.LinkId))}`,
      );
      if (!["EXPIRED", "CANCELLED"].includes(String(status.link_status)))
        throw new ConflictException(
          "The current payment must expire or be cancelled before editing this purchase.",
        );
    }
  }

  async create(customerId: number, body: PurchaseDto) {
    const product = await this.product(body.productsId);
    console.log("customerId", customerId);
    const age = personAge(body.dateofBirth);
    const pricing = quote(product, age);
    return this.db.transaction(async (connection) => {
      // Reuse the unfinished purchase so retries and multiple tabs cannot create duplicates.
      const pending = await this.db.rows(
        "SELECT OrdersId FROM Orders WHERE CustomerId = ? AND ProductsId = ? AND RelatedOrderId IS NULL AND Status = 'Pending' ORDER BY OrdersId DESC LIMIT 1",
        [customerId, body.productsId],
        connection,
      );
      if (pending[0])
        return { orderId: Number(pending[0].OrdersId), resumed: true };
      const customers = await this.db.rows(
        "SELECT Name, MobileNumber, Email, AddressLine1, AddressLine2, Village, Mandal, City, DistrictId, StateId, Pincode FROM Customer WHERE CustomerId = ?",
        [customerId],
        connection,
      );
      const customer = customers[0];
      if (!customer) throw new NotFoundException("Customer profile not found.");
      const mobile = String(customer.MobileNumber ?? "");
      if (body.mobileNumber && body.mobileNumber !== mobile)
        throw new BadRequestException(
          "Use your account's mobile number for this purchase. Update your profile first if it has changed.",
        );
      if (!/^[6-9]\d{9}$/.test(mobile))
        throw new BadRequestException(
          "A valid mobile number is required for payment.",
        );
      await this.db.execute(
        "UPDATE Customer SET Name = ?, Gender = ?, DateofBirth = ?, Age = ? WHERE CustomerId = ?",
        [
          body.fullName.trim(),
          body.gender,
          body.dateofBirth.slice(0, 10),
          age,
          customerId,
        ],
        connection,
      );
      const result = await this.db.execute(
        "INSERT INTO Orders (CustomerId, ProductsId, PayableAmount, PaidAmount, FullName, Gender, DateofBirth, Age, MobileNumber, Email, AddressLine1, AddressLine2, Village, Mandal, City, DistrictId, StateId, PinCode, CreatedTime, Status, CardHolderType, Description, CreatedSource, TypeofService) VALUES (?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), 'Pending', 'Primary', ?, 'CustomerApp', (SELECT ServiceId FROM Service WHERE ServiceName = 'OHO Card' AND IsActive = TRUE LIMIT 1))",
        [
          customerId,
          body.productsId,
          pricing.amount,
          body.fullName.trim(),
          body.gender,
          body.dateofBirth.slice(0, 10),
          age,
          mobile,
          ...[
            "Email",
            "AddressLine1",
            "AddressLine2",
            "Village",
            "Mandal",
            "City",
            "DistrictId",
            "StateId",
            "Pincode",
          ].map((key) => (customer[key] ?? null) as SqlValue),
          String(product.ShortDescription ?? "").slice(0, 500),
        ],
        connection,
      );
      return { orderId: result.insertId, resumed: false };
    }, `purchase-create-${customerId}-${body.productsId}`);
  }

  private nomineeProducts(product: DbRow) {
    const included = product.includedProducts as DbRow[];
    const required = included.filter((row) => flag(row.IsNomineeRequired));
    return required.length
      ? required
      : flag(product.IsNomineeRequired)
        ? [{ ProductsId: product.ProductsId, ProductName: product.ProductName }]
        : [];
  }
  async snapshot(customerId: number, id: number) {
    const order = await this.owned(customerId, id);
    const product = await this.product(Number(order.ProductsId), false);
    const [family, nominees, methods] = await Promise.all([
      this.db.rows(
        `SELECT ${orderFields} FROM Orders WHERE RelatedOrderId = ? ORDER BY OrdersId`,
        [id],
      ),
      this.db.rows(
        "SELECT NomineeId, ProductsId, FullName, DateofBirth, Age, Gender, Relationship, MobileNumber, GuardianName, GuardianDateofBirth, GuardianGender, GuardianRelationship, GuardianMobileNumber FROM Nominee WHERE CustomerOrderId = ?",
        [id],
      ),
      this.db.rows(
        "SELECT PaymentTypeId, PaymentTypeName FROM PaymentType WHERE IsActive = TRUE AND IsWeb = TRUE AND PaymentTypeId IN (1, 3, 4, 5) ORDER BY PaymentTypeId",
      ),
    ]);
    return {
      order: Object.fromEntries(
        orderFields.split(", ").map((key) => [key, order[key]]),
      ),
      product,
      family,
      nominees,
      nomineeProducts: this.nomineeProducts(product),
      paymentMethods: methods,
    };
  }

  async addFamily(customerId: number, id: number, body: PersonDto) {
    return this.db.transaction(async (connection) => {
      const order = await this.owned(customerId, id, connection);
      await this.editable(order, connection);
      const product = await this.product(Number(order.ProductsId));
      const family = await this.db.rows(
        "SELECT OrdersId, FullName, DATE_FORMAT(DateofBirth, '%Y-%m-%d') AS DateofBirth, Relationship, Age FROM Orders WHERE RelatedOrderId = ?",
        [id],
        connection,
      );
      if (family.length >= Math.max(0, Number(product.MaximumMembers) - 1))
        throw new BadRequestException(
          "The package's member limit has been reached.",
        );
      if (
        ![
          "Spouse",
          "Son",
          "Daughter",
          "Father",
          "Mother",
          "Father-in-law",
          "Mother-in-law",
          "Brother",
          "Sister",
        ].includes(body.relationship)
      )
        throw new BadRequestException("Select a valid family relationship.");
      if (
        Number(product.NoOfCardHolders) === 2 &&
        family.length === 0 &&
        body.relationship !== "Spouse"
      )
        throw new BadRequestException(
          "Add your spouse first for this package.",
        );
      if (
        body.relationship === "Spouse" &&
        family.some((row) => row.Relationship === "Spouse")
      )
        throw new BadRequestException("A spouse is already included.");
      const age = personAge(body.dateofBirth);
      const child =
        body.relationship === "Son" || body.relationship === "Daughter";
      const minimum = Number(
        product.ProductsMinimumAge ?? product.MinimumAge ?? 18,
      );
      const maximum = Number(
        product.ProductsMaximumAge ?? product.MaximumAge ?? 120,
      );
      const childrenAge = Number(
        product.ProductsChildrenAge ?? product.ChildrenAge ?? 18,
      );
      if (
        (!child && (age < minimum || age > maximum)) ||
        (child && age > childrenAge)
      )
        throw new BadRequestException(
          "This family member is outside the package's age limits.",
        );
      const adultLimit = Number(product.MaximumAdult);
      const childLimit = Number(
        product.ProductsMaximumChild ?? product.MaximumChild,
      );
      if (
        adultLimit > 0 &&
        age >= 18 &&
        family.filter((row) => Number(row.Age) >= 18).length +
          (Number(order.Age) >= 18 ? 1 : 0) >=
          adultLimit
      )
        throw new BadRequestException(
          "The package's adult limit has been reached.",
        );
      if (
        childLimit > 0 &&
        age < 18 &&
        family.filter((row) => Number(row.Age) < 18).length >= childLimit
      )
        throw new BadRequestException(
          "The package's child limit has been reached.",
        );
      if (
        family.some(
          (row) =>
            String(row.FullName).trim().toLowerCase() ===
              body.fullName.trim().toLowerCase() &&
            String(row.DateofBirth).slice(0, 10) ===
              body.dateofBirth.slice(0, 10),
        )
      )
        throw new BadRequestException(
          "This family member is already included.",
        );
      const result = await this.db.execute(
        "INSERT INTO Orders (CustomerId, ProductsId, RelatedOrderId, Relationship, FullName, Gender, DateofBirth, Age, MobileNumber, CreatedTime, Status, CardHolderType, CreatedSource) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), 'Pending', 'Dependent', 'CustomerApp')",
        [
          customerId,
          Number(order.ProductsId),
          id,
          body.relationship,
          body.fullName.trim(),
          body.gender,
          body.dateofBirth.slice(0, 10),
          age,
          body.mobileNumber || null,
        ],
        connection,
      );
      return { memberId: result.insertId };
    }, `purchase-edit-${id}`);
  }
  async removeFamily(customerId: number, id: number, memberId: number) {
    return this.db.transaction(async (connection) => {
      const order = await this.owned(customerId, id, connection);
      await this.editable(order, connection);
      await this.db.execute(
        "DELETE FROM Orders WHERE OrdersId = ? AND RelatedOrderId = ?",
        [validId(memberId), id],
        connection,
      );
      return { status: true };
    }, `purchase-edit-${id}`);
  }
  async nominee(customerId: number, id: number, selection: NomineeDto) {
    return this.db.transaction(async (connection) => {
      const order = await this.owned(customerId, id, connection);
      await this.editable(order, connection);
      const product = await this.product(Number(order.ProductsId));
      if (
        !this.nomineeProducts(product).some(
          (row) => Number(row.ProductsId) === selection.productsId,
        )
      )
        throw new BadRequestException(
          "This product does not require a nominee in your package.",
        );
      const family = await this.db.rows(
        "SELECT OrdersId, FullName, Gender, DATE_FORMAT(DateofBirth, '%Y-%m-%d') AS DateofBirth, Age, MobileNumber, Relationship FROM Orders WHERE RelatedOrderId = ?",
        [id],
        connection,
      );
      const member = family.find(
        (row) => Number(row.OrdersId) === selection.familyOrderId,
      );
      if (!member)
        throw new BadRequestException(
          "Choose a family member included in this purchase as your nominee.",
        );
      const age = personAge(String(member.DateofBirth));
      const guardian =
        selection.guardianOrderId === id
          ? order
          : family.find(
              (row) => Number(row.OrdersId) === selection.guardianOrderId,
            );
      if (age < 18 && (!guardian || Number(guardian.Age) < 18))
        throw new BadRequestException(
          "Choose an adult family member as guardian for your minor nominee.",
        );
      const guardianDate =
        guardian?.DateofBirth instanceof Date
          ? new Intl.DateTimeFormat("en-CA", {
              timeZone: "Asia/Kolkata",
            }).format(guardian.DateofBirth)
          : String(guardian?.DateofBirth ?? "").slice(0, 10);
      const body = {
        productsId: selection.productsId,
        fullName: String(member.FullName),
        dateofBirth: String(member.DateofBirth),
        gender: String(member.Gender),
        mobileNumber: member.MobileNumber
          ? String(member.MobileNumber)
          : undefined,
        relationship: String(member.Relationship),
        ...(age < 18 && guardian
          ? {
              guardianName: String(guardian.FullName),
              guardianDateofBirth: guardianDate,
              guardianGender: String(guardian.Gender),
              guardianRelationship:
                selection.guardianOrderId === id
                  ? ["Son", "Daughter"].includes(String(member.Relationship))
                    ? "Parent"
                    : "Family"
                  : String(guardian.Relationship),
              guardianMobileNumber: guardian.MobileNumber
                ? String(guardian.MobileNumber)
                : undefined,
            }
          : {}),
      };
      if (
        age < 18 &&
        (!body.guardianName?.trim() ||
          !body.guardianDateofBirth ||
          personAge(body.guardianDateofBirth) < 18 ||
          !body.guardianGender ||
          !body.guardianRelationship?.trim())
      )
        throw new BadRequestException(
          "An adult guardian's details are required for a minor nominee.",
        );
      const existing = await this.db.rows(
        "SELECT NomineeId FROM Nominee WHERE CustomerOrderId = ? AND ProductsId = ? LIMIT 1",
        [id, body.productsId],
        connection,
      );
      const values: SqlValue[] = [
        body.fullName.trim(),
        body.dateofBirth.slice(0, 10),
        age,
        body.gender,
        body.mobileNumber || null,
        body.relationship,
        body.guardianName?.trim() || null,
        body.guardianDateofBirth?.slice(0, 10) || null,
        body.guardianDateofBirth ? personAge(body.guardianDateofBirth) : null,
        body.guardianGender || null,
        body.guardianRelationship || null,
        body.guardianMobileNumber || null,
      ];
      if (existing[0])
        await this.db.execute(
          "UPDATE Nominee SET FullName = ?, DateofBirth = ?, Age = ?, Gender = ?, MobileNumber = ?, Relationship = ?, GuardianName = ?, GuardianDateofBirth = ?, GuardianAge = ?, GuardianGender = ?, GuardianRelationship = ?, GuardianMobileNumber = ? WHERE NomineeId = ?",
          [...values, Number(existing[0].NomineeId)],
          connection,
        );
      else
        await this.db.execute(
          "INSERT INTO Nominee (FullName, DateofBirth, Age, Gender, MobileNumber, Relationship, GuardianName, GuardianDateofBirth, GuardianAge, GuardianGender, GuardianRelationship, GuardianMobileNumber, CustomerId, CustomerOrderId, OrderId, ProductsId, CreatedOn, IsActive) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), TRUE)",
          [...values, customerId, id, id, body.productsId],
          connection,
        );
      return { status: true };
    }, `purchase-edit-${id}`);
  }

  private async gateway(path: string, body?: Record<string, unknown>) {
    const [clientId, secret, endpoint] = await Promise.all([
      this.config.getSecret("OrderCreationClientId"),
      this.config.getSecret("OrderCreationSecretId"),
      this.config.get(
        body ? "paymentlinkURLCashfree" : "fetchpaymentLinkDetailsURL",
      ),
    ]);
    if (!clientId || !secret || !endpoint)
      throw new ServiceUnavailableException(
        "Online payment is not configured. Please contact support.",
      );
    const url = new URL(`${endpoint.replace(/\/$/, "")}${path}`);
    if (
      url.protocol !== "https:" ||
      !["api.cashfree.com", "sandbox.cashfree.com"].includes(url.hostname)
    )
      throw new ServiceUnavailableException(
        "The payment provider endpoint is not configured correctly.",
      );
    let response: Response;
    try {
      response = await fetch(url, {
        method: body ? "POST" : "GET",
        headers: {
          "Content-Type": "application/json",
          "x-api-version": "2023-08-01",
          "x-client-id": clientId,
          "x-client-secret": secret,
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(20000),
      });
    } catch {
      throw new ServiceUnavailableException(
        "Unable to reach the payment provider. Please try again.",
      );
    }
    if (!response.ok)
      throw new ServiceUnavailableException(
        "The payment provider could not process this request. Please try again.",
      );
    return (await response.json()) as DbRow;
  }
  private publicLink(link: DbRow) {
    return {
      linkId: link.LinkId,
      url: link.LinkUrl,
      expiresAt: link.LinkExpiryTime,
      status: link.LinkStatus,
    };
  }
  async payment(customerId: number, id: number, methodId: number) {
    return this.db.transaction(async (connection) => {
      const order = await this.owned(customerId, id, connection);
      if (order.Status === "Completed" || order.Status === "Paid")
        throw new ConflictException("This purchase is already paid.");
      const product = await this.product(Number(order.ProductsId));
      const methods = await this.db.rows(
        "SELECT PaymentTypeId, PaymentTypeName FROM PaymentType WHERE PaymentTypeId = ? AND IsActive = TRUE AND IsWeb = TRUE AND PaymentTypeId IN (1, 3, 4, 5)",
        [methodId],
        connection,
      );
      if (!methods.length)
        throw new BadRequestException("Select an available payment method.");
      const family = await this.db.rows(
        "SELECT Relationship FROM Orders WHERE RelatedOrderId = ?",
        [id],
        connection,
      );
      if (
        Number(product.NoOfCardHolders) === 2 &&
        !family.some((row) => row.Relationship === "Spouse")
      )
        throw new BadRequestException(
          "Spouse details are required before payment.",
        );
      const nominees = await this.db.rows(
        "SELECT ProductsId FROM Nominee WHERE CustomerOrderId = ?",
        [id],
        connection,
      );
      if (
        this.nomineeProducts(product).some(
          (row) =>
            !nominees.some(
              (nominee) =>
                Number(nominee.ProductsId) === Number(row.ProductsId),
            ),
        )
      )
        throw new BadRequestException(
          "Add the required nominees before payment.",
        );
      const pricing = quote(product, Number(order.Age));
      if (pricing.amount !== Number(order.PayableAmount))
        throw new ConflictException(
          "The package price has changed. Please contact support before paying.",
        );
      const links = await this.db.rows(
        "SELECT * FROM PaymentLinkHistory WHERE OrderId = ? ORDER BY PaymentLinkHistoryId DESC LIMIT 1",
        [id],
        connection,
      );
      const existing = links[0];
      if (
        existing?.TransactionStatus === "SUCCESS" ||
        existing?.LinkStatus === "PAID"
      )
        throw new ConflictException(
          "Payment is already received and is being processed.",
        );
      if (
        existing?.LinkStatus === "ACTIVE" &&
        new Date(String(existing.LinkExpiryTime)).getTime() > Date.now()
      )
        return this.publicLink(existing);
      if (existing?.LinkStatus === "ACTIVE") {
        const previous = await this.gateway(
          `/${encodeURIComponent(String(existing.LinkId))}`,
        );
        if (!["EXPIRED", "CANCELLED"].includes(String(previous.link_status)))
          throw new ConflictException(
            "Your previous payment is still active or being processed. Check its payment status before retrying.",
          );
      }
      if ((await this.config.get("sendPaymentlink")).toLowerCase() !== "true")
        throw new ServiceUnavailableException(
          "Online payments are currently unavailable. Please contact support.",
        );
      const notifyUrl = await this.config.get("newCashfreewebhookurl");
      if (!notifyUrl.startsWith("https://"))
        throw new ServiceUnavailableException(
          "Payment confirmation is not configured. Please contact support.",
        );
      const linkId = `OHOAPP_${id}_${randomUUID().slice(0, 8)}`;
      const link = await this.gateway("", {
        customer_details: {
          customer_name: order.FullName,
          customer_phone: order.MobileNumber,
        },
        link_notify: { send_sms: false, send_email: false },
        link_meta: {
          notify_url: notifyUrl,
          ...(methodId === 5 ? { payment_methods: "upi" } : {}),
        },
        link_id: linkId,
        link_amount: pricing.amount,
        link_currency: "INR",
        link_purpose: "Wellness",
        link_partial_payments: false,
        link_auto_reminders: false,
        link_expiry_time: new Date(Date.now() + 15 * 60000).toISOString(),
      });
      const paymentUrl = new URL(String(link.link_url));
      if (
        link.link_status !== "ACTIVE" ||
        paymentUrl.protocol !== "https:" ||
        !paymentUrl.hostname.endsWith(".cashfree.com")
      )
        throw new ServiceUnavailableException(
          "The provider did not return a valid payment link.",
        );
      const expiry = new Date(String(link.link_expiry_time));
      if (!Number.isFinite(expiry.getTime()))
        throw new ServiceUnavailableException(
          "The provider did not return a payment expiry.",
        );
      // Preserve the history contract consumed by the existing Cashfree webhook / order completion worker.
      await this.db.execute(
        "INSERT INTO PaymentLinkHistory (MobileNumber, CustomerOrderId, OrderId, LinkId, CfLinkId, LinkStatus, LinkCurrency, LinkAmount, LinkAmountPaid, LinkUrl, LinkExpiryTime, LinkCreatedAt, CustomerName, CustomerPhone, NotifyUrl, LinkPurpose, SendSms, SendEmail) VALUES (?, ?, ?, ?, ?, 'ACTIVE', 'INR', ?, 0, ?, ?, NOW(), ?, ?, ?, 'Wellness', FALSE, FALSE)",
        [
          String(order.MobileNumber),
          id,
          id,
          String(link.link_id ?? linkId),
          String(link.cf_link_id),
          pricing.amount,
          paymentUrl.toString(),
          expiry,
          String(order.FullName),
          String(order.MobileNumber),
          notifyUrl,
        ],
        connection,
      );
      await this.db.execute(
        "UPDATE Orders SET PaymentType = ? WHERE OrdersId = ?",
        [String(methodId), id],
        connection,
      );
      return {
        linkId: String(link.link_id ?? linkId),
        url: paymentUrl.toString(),
        expiresAt: expiry.toISOString(),
        status: "ACTIVE",
      };
    }, `purchase-edit-${id}`);
  }
  async paymentStatus(customerId: number, id: number) {
    const order = await this.owned(customerId, id);
    if (order.Status === "Completed")
      return { status: "COMPLETED", completed: true };
    const links = await this.db.rows(
      "SELECT * FROM PaymentLinkHistory WHERE OrderId = ? ORDER BY PaymentLinkHistoryId DESC LIMIT 1",
      [id],
    );
    const existing = links[0];
    if (!existing) return { status: "NOT_STARTED", completed: false };
    const link = await this.gateway(
      `/${encodeURIComponent(String(existing.LinkId))}`,
    );
    if (
      String(link.link_id) !== String(existing.LinkId) ||
      Number(link.link_amount) !== Number(order.PayableAmount) ||
      link.link_currency !== "INR"
    )
      throw new ServiceUnavailableException(
        "Payment details could not be verified.",
      );
    const paid =
      link.link_status === "PAID" &&
      Number(link.link_amount_paid) >= Number(order.PayableAmount);
    if (link.link_status === "PAID" && !paid)
      throw new ServiceUnavailableException(
        "The full payment amount could not be verified. Please contact support.",
      );
    // The existing webhook completes the order and generates membership; browser status never grants coverage.
    return {
      status: paid ? "PAID" : String(link.link_status),
      completed: false,
      link: this.publicLink(existing),
    };
  }
}
