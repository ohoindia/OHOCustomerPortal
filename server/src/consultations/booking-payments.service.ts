import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  ServiceUnavailableException,
} from "@nestjs/common";
import { createHash, randomUUID } from "node:crypto";
import {
  Connection,
  DatabaseService,
  DbRow,
  SqlValue,
} from "../database/database.service";
import {
  PrepareBookingPaymentDto,
  ReportBookingPaymentDto,
} from "./booking-payment.dto";

const VPA = /^[A-Za-z0-9][A-Za-z0-9._-]{0,254}@[A-Za-z][A-Za-z0-9.-]{1,99}$/;
const ATTEMPT_COLUMNS = `Id, BookingConsultationId, TransactionRef, Amount, PayeeVpa, PayeeName,
  UpiUri, Status, VerificationStatus, AppPackage, ResponseCode, ResultCode, TxnId, ApprovalRefNo,
  RequestHash, ClientRequestId, ResultHash,
  DATE_FORMAT(CreatedAt, '%Y-%m-%dT%H:%i:%s.000Z') AS CreatedAt,
  DATE_FORMAT(UpdatedAt, '%Y-%m-%dT%H:%i:%s.000Z') AS UpdatedAt,
  DATE_FORMAT(ExpiresAt, '%Y-%m-%dT%H:%i:%s.000Z') AS ExpiresAt,
  DATE_FORMAT(ReportedAt, '%Y-%m-%dT%H:%i:%s.000Z') AS ReportedAt,
  DATE_FORMAT(VerifiedAt, '%Y-%m-%dT%H:%i:%s.000Z') AS VerifiedAt`;

function fingerprint(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function money(value: unknown) {
  const raw = typeof value === "number" ? String(value) : String(value ?? "");
  if (!/^\d{1,9}(?:\.\d{1,2})?$/.test(raw))
    throw new BadRequestException(
      "Enter a valid INR amount with at most two decimal places.",
    );
  const amount = Number(raw);
  if (!Number.isFinite(amount) || amount <= 0 || amount > 100000)
    throw new BadRequestException(
      "The payment amount must be between ₹0.01 and ₹1,00,000.",
    );
  return amount;
}

/** Only plain UPI pay intents are accepted; never follow QR links or arbitrary intents. */
export function parseHospitalUpiUri(raw: string) {
  if (
    typeof raw !== "string" ||
    raw.length > 2048 ||
    /[\u0000-\u001f\u007f]/.test(raw)
  )
    throw new BadRequestException("Scan a valid hospital UPI payment QR code.");
  let uri: URL;
  try {
    uri = new URL(raw.trim());
  } catch {
    throw new BadRequestException("Scan a valid hospital UPI payment QR code.");
  }
  if (
    uri.protocol !== "upi:" ||
    uri.hostname !== "pay" ||
    !["", "/"].includes(uri.pathname) ||
    uri.username ||
    uri.password ||
    uri.port ||
    uri.hash
  )
    throw new BadRequestException("Only a UPI payment QR code is supported.");
  try {
    decodeURIComponent(uri.search.slice(1).replace(/\+/g, " "));
  } catch {
    throw new BadRequestException(
      "The payment QR contains malformed encoded parameters.",
    );
  }
  const seen = new Set<string>();
  const parameters = new Map<string, string>();
  for (const [key, value] of uri.searchParams) {
    const normalized = key.toLowerCase();
    if (!/^[a-z][a-z0-9]*$/.test(normalized) || seen.has(normalized))
      throw new BadRequestException(
        "The payment QR contains ambiguous parameters.",
      );
    if (/[\u0000-\u001f\u007f-\u009f]/.test(value) || value.length > 512)
      throw new BadRequestException("The payment QR contains invalid details.");
    seen.add(normalized);
    parameters.set(normalized, value.trim());
  }
  if (seen.has("sign") || seen.has("signature"))
    throw new BadRequestException(
      "Signed payment QR codes require the hospital's supported payment provider. Ask for its regular UPI QR.",
    );
  const payeeVpa = (parameters.get("pa") ?? "").toLowerCase();
  if (payeeVpa.length > 255 || !VPA.test(payeeVpa))
    throw new BadRequestException("The QR has an invalid UPI ID.");
  const currency = parameters.get("cu");
  if (currency && currency.toUpperCase() !== "INR")
    throw new BadRequestException("Only INR payments are supported.");
  const rawAmount = parameters.get("am");
  const payeeName = parameters.get("pn") || payeeVpa;
  if (payeeName.length > 128)
    throw new BadRequestException(
      "The payment recipient name must be at most 128 characters.",
    );
  const merchantCode = parameters.get("mc");
  if (merchantCode && !/^\d{4}$/.test(merchantCode))
    throw new BadRequestException("The QR has an invalid merchant code.");
  return {
    payeeVpa,
    payeeName,
    amount: rawAmount === undefined ? undefined : money(rawAmount),
    ...(merchantCode ? { merchantCode } : {}),
  };
}

function attempt(row: DbRow) {
  return {
    id: String(row.Id),
    bookingId: Number(row.BookingConsultationId),
    transactionRef: String(row.TransactionRef),
    amount: Number(row.Amount),
    payeeVpa: String(row.PayeeVpa),
    payeeName: String(row.PayeeName),
    upiUri: String(row.UpiUri),
    status: String(row.Status),
    verificationStatus: String(row.VerificationStatus),
    appPackage: row.AppPackage == null ? null : String(row.AppPackage),
    responseCode: row.ResponseCode == null ? null : String(row.ResponseCode),
    resultCode: row.ResultCode == null ? null : Number(row.ResultCode),
    txnId: row.TxnId == null ? null : String(row.TxnId),
    approvalRefNo: row.ApprovalRefNo == null ? null : String(row.ApprovalRefNo),
    createdAt: String(row.CreatedAt),
    updatedAt: String(row.UpdatedAt),
    expiresAt: String(row.ExpiresAt),
    reportedAt: row.ReportedAt == null ? null : String(row.ReportedAt),
    verifiedAt: row.VerifiedAt == null ? null : String(row.VerifiedAt),
  };
}

@Injectable()
export class BookingPaymentsService {
  constructor(private readonly db: DatabaseService) {}

  private paymentSchemaError(error: unknown): never {
    if (
      error &&
      typeof error === "object" &&
      (("code" in error && error.code === "ER_NO_SUCH_TABLE") ||
        ("errno" in error && error.errno === 1146))
    ) {
      throw new ServiceUnavailableException(
        "Hospital payments are not available yet. Please try again later.",
      );
    }
    throw error;
  }

  // Only SQL against the new payment tables is translated. Legacy booking,
  // ownership, connection and unexpected query errors retain their behavior.
  private async paymentRows(
    sql: string,
    values: SqlValue[],
    connection?: Connection,
  ) {
    try {
      return await this.db.rows(sql, values, connection);
    } catch (error) {
      return this.paymentSchemaError(error);
    }
  }

  private async paymentExecute(
    sql: string,
    values: SqlValue[],
    connection?: Connection,
  ) {
    try {
      return await this.db.execute(sql, values, connection);
    } catch (error) {
      return this.paymentSchemaError(error);
    }
  }

  private async expireCreated(bookingId: number, connection: Connection) {
    await this.paymentExecute(
      "UPDATE HospitalBookingPaymentAttempt SET Status = 'EXPIRED', UpdatedAt = UTC_TIMESTAMP(3) WHERE BookingConsultationId = ? AND Status = 'CREATED' AND VerificationStatus = 'UNVERIFIED' AND ExpiresAt <= UTC_TIMESTAMP(3)",
      [bookingId],
      connection,
    );
  }

  private async booking(
    bookingId: number,
    customerId: number,
    connection?: Connection,
  ) {
    if (
      !Number.isSafeInteger(bookingId) ||
      bookingId < 1 ||
      !Number.isSafeInteger(customerId) ||
      customerId < 1
    )
      throw new ForbiddenException(
        "This booking does not belong to your account.",
      );
    const [row] = await this.db.rows(
      `SELECT bc.BookingConsultationId, bc.HospitalId, bc.Name, bc.IsActive,
      COALESCE(h.HospitalName, bc.HospitalName) AS HospitalName, s.Value AS StatusName
      FROM BookingConsultation bc LEFT JOIN Hospital h ON h.HospitalId = bc.HospitalId
      LEFT JOIN Status s ON s.StatusId = bc.Status
      WHERE bc.BookingConsultationId = ? AND (bc.CustomerId = ? OR EXISTS (
        SELECT 1 FROM Customer family WHERE family.CustomerId = bc.CustomerId AND family.RelatedCustomerId = ?
      ))${connection ? " FOR UPDATE" : ""}`,
      [bookingId, customerId, customerId],
      connection,
    );
    if (!row)
      throw new ForbiddenException(
        "This booking does not belong to your account.",
      );
    return row;
  }

  private async settings(hospitalId: number, connection?: Connection) {
    const [row] = await this.paymentRows(
      "SELECT UpiId, PayeeName, MerchantCode, IsEnabled, MaxPaymentAmount FROM HospitalBookingPaymentSettings WHERE HospitalId = ?",
      [hospitalId],
      connection,
    );
    return row;
  }

  private disabledReason(booking: DbRow, settings?: DbRow) {
    if (booking.IsActive != null && !Number(booking.IsActive))
      return "Payments are unavailable for this inactive booking.";
    if (
      /^(cancelled|canceled|rejected)$/i.test(
        String(booking.StatusName ?? "").trim(),
      )
    )
      return "Payments are unavailable for this cancelled booking.";
    if (settings && !Number(settings.IsEnabled))
      return "This hospital has disabled booking payments.";
    if (
      settings &&
      (String(settings.UpiId ?? "").length > 255 ||
        !VPA.test(String(settings.UpiId ?? "")) ||
        String(settings.PayeeName ?? "").length > 128 ||
        /[\u0000-\u001f\u007f-\u009f]/.test(String(settings.PayeeName ?? "")) ||
        !String(settings.PayeeName ?? "").trim())
    )
      return "This hospital has not enabled verified UPI payment details yet.";
    return null;
  }

  private async find(bookingId: number, id: string, connection?: Connection) {
    const [row] = await this.paymentRows(
      `SELECT ${ATTEMPT_COLUMNS} FROM HospitalBookingPaymentAttempt WHERE BookingConsultationId = ? AND Id = ?`,
      [bookingId, id],
      connection,
    );
    if (!row)
      throw new ForbiddenException(
        "This payment attempt does not belong to your booking.",
      );
    return row;
  }

  async list(bookingId: number, customerId: number) {
    return this.db.transaction(async (connection) => {
      const booking = await this.booking(bookingId, customerId, connection);
      const settings = await this.settings(
        Number(booking.HospitalId),
        connection,
      );
      const disabledReason = this.disabledReason(booking, settings);
      // Return the persisted EXPIRED state so the UI can warn before a retry.
      // Success and unknown app reports never expire automatically.
      await this.expireCreated(bookingId, connection);
      const rows = await this.paymentRows(
        `SELECT ${ATTEMPT_COLUMNS} FROM HospitalBookingPaymentAttempt WHERE BookingConsultationId = ? ORDER BY CreatedAt DESC, Id DESC LIMIT 100`,
        [bookingId],
        connection,
      );
      return {
        bookingId,
        booking: {
          id: bookingId,
          hospitalId: Number(booking.HospitalId),
          hospitalName: String(booking.HospitalName ?? "Hospital"),
          patientName: String(booking.Name ?? "Patient"),
        },
        paymentEnabled: !disabledReason,
        disabledReason,
        approvedPayee:
          disabledReason || !settings
            ? null
            : {
                upiId: String(settings.UpiId),
                payeeName: String(settings.PayeeName),
              },
        attempts: rows.map((row) => attempt(row)),
      };
    }, `oho-booking-payment:${bookingId}`);
  }

  async prepare(
    bookingId: number,
    customerId: number,
    dto: PrepareBookingPaymentDto,
  ) {
    const scanned = parseHospitalUpiUri(dto.upiUri);
    const amount = money(dto.amount ?? scanned.amount);
    if (scanned.amount !== undefined && amount !== scanned.amount)
      throw new BadRequestException(
        "The entered amount must match the amount in the hospital QR.",
      );
    return this.db.transaction(async (connection) => {
      const booking = await this.booking(bookingId, customerId, connection);
      // Expire before idempotency lookup so retrying an old request cannot
      // return a stale CREATED attempt that Android might launch again.
      await this.expireCreated(bookingId, connection);
      const requestHash = fingerprint({
        bookingId,
        payeeVpa: scanned.payeeVpa,
        payeeName: scanned.payeeName,
        merchantCode: scanned.merchantCode ?? null,
        amount,
        appPackage: dto.appPackage ?? null,
      });
      const [previous] = await this.paymentRows(
        `SELECT ${ATTEMPT_COLUMNS} FROM HospitalBookingPaymentAttempt WHERE BookingConsultationId = ? AND ClientRequestId = ?`,
        [bookingId, dto.clientRequestId],
        connection,
      );
      if (previous) {
        if (previous.RequestHash !== requestHash)
          throw new ConflictException(
            "This payment request ID was already used with different details.",
          );
        return attempt(previous);
      }
      const settings = await this.settings(
        Number(booking.HospitalId),
        connection,
      );
      const disabledReason = this.disabledReason(booking, settings);
      if (disabledReason) throw new BadRequestException(disabledReason);
      if (settings && scanned.payeeVpa !== String(settings.UpiId).toLowerCase())
        throw new BadRequestException(
          "This QR does not match the hospital's approved UPI ID. Please ask the hospital for its payment QR.",
        );
      if (amount > Number(settings?.MaxPaymentAmount ?? 100000))
        throw new BadRequestException(
          "This amount exceeds the hospital's configured payment limit.",
        );
      // The row lock and named lock serialize every prepare/report for this booking.
      const [blocking] = await this.paymentRows(
        "SELECT Id, Status FROM HospitalBookingPaymentAttempt WHERE BookingConsultationId = ? AND (VerificationStatus = 'VERIFIED' OR (VerificationStatus = 'UNVERIFIED' AND Status IN ('CREATED','SUCCESS','UNKNOWN'))) LIMIT 1",
        [bookingId],
        connection,
      );
      if (blocking)
        throw new ConflictException(
          blocking.Status === "CREATED"
            ? "A payment is already in progress for this booking. Check its history before retrying."
            : "A previous payment needs hospital confirmation. Check its history before paying again.",
        );
      const id = randomUUID();
      const transactionRef = `OHO${randomUUID().replace(/-/g, "").toUpperCase()}`;
      const payeeVpa = settings ? String(settings.UpiId) : scanned.payeeVpa;
      const payeeName = settings
        ? String(settings.PayeeName)
        : scanned.payeeName;
      const merchantCode = settings?.MerchantCode ?? scanned.merchantCode;
      const params = new URLSearchParams({
        pa: payeeVpa,
        pn: payeeName,
        tr: transactionRef,
        tn: `OHO hospital booking ${bookingId}`,
        am: amount.toFixed(2),
        cu: "INR",
      });
      if (merchantCode && /^\d{4}$/.test(String(merchantCode)))
        params.set("mc", String(merchantCode));
      const upiUri = `upi://pay?${params.toString()}`;
      await this.paymentExecute(
        `INSERT INTO HospitalBookingPaymentAttempt (Id, BookingConsultationId, CustomerId, ClientRequestId, RequestHash, TransactionRef, Amount, PayeeVpa, PayeeName, UpiUri, Status, VerificationStatus, AppPackage, CreatedAt, UpdatedAt, ExpiresAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'CREATED', 'UNVERIFIED', ?, UTC_TIMESTAMP(3), UTC_TIMESTAMP(3), DATE_ADD(UTC_TIMESTAMP(3), INTERVAL 15 MINUTE))`,
        [
          id,
          bookingId,
          customerId,
          dto.clientRequestId,
          requestHash,
          transactionRef,
          amount,
          payeeVpa,
          payeeName,
          upiUri,
          dto.appPackage ?? null,
        ],
        connection,
      );
      return attempt(await this.find(bookingId, id, connection));
    }, `oho-booking-payment:${bookingId}`);
  }

  async report(
    bookingId: number,
    customerId: number,
    attemptId: string,
    dto: ReportBookingPaymentDto,
  ) {
    return this.db.transaction(async (connection) => {
      await this.booking(bookingId, customerId, connection);
      const current = await this.find(bookingId, attemptId, connection);
      if (current.AppPackage && current.AppPackage !== dto.appPackage)
        throw new ConflictException(
          "The response app does not match the selected payment app.",
        );
      const response = {
        appPackage: dto.appPackage,
        outcome: dto.outcome,
        responseCode: dto.responseCode ?? null,
        resultCode: dto.resultCode ?? null,
        txnId: dto.txnId ?? null,
        approvalRefNo: dto.approvalRefNo ?? null,
        rawResponse: dto.rawResponse ?? null,
      };
      const resultHash = fingerprint(response);
      if (current.ResultHash) {
        if (current.ResultHash !== resultHash)
          throw new ConflictException(
            "A different response has already been recorded for this attempt.",
          );
        return attempt(current);
      }
      // A callback is untrusted client data. It never changes bank verification,
      // booking visit status, coupons, wallets, or the hospital's paid balance.
      await this.paymentExecute(
        `UPDATE HospitalBookingPaymentAttempt SET Status = ?, AppPackage = ?, ResponseCode = ?, ResultCode = ?, TxnId = ?, ApprovalRefNo = ?, RawResponse = ?, ResultHash = ?, ReportedAt = UTC_TIMESTAMP(3), UpdatedAt = UTC_TIMESTAMP(3) WHERE Id = ? AND BookingConsultationId = ?`,
        [
          dto.outcome,
          dto.appPackage,
          dto.responseCode ?? null,
          dto.resultCode ?? null,
          dto.txnId ?? null,
          dto.approvalRefNo ?? null,
          dto.rawResponse ?? null,
          resultHash,
          attemptId,
          bookingId,
        ],
        connection,
      );
      return attempt(await this.find(bookingId, attemptId, connection));
    }, `oho-booking-payment:${bookingId}`);
  }
}
