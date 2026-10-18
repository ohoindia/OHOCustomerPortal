-- Additive, idempotent migration. Timestamps in these tables are always UTC.
-- Optional approved payees may be configured by an authorized administrator.
-- An explicit settings row defaults disabled; absent rows allow scanned UPI payees.
CREATE TABLE IF NOT EXISTS HospitalBookingPaymentSettings (
  HospitalId BIGINT UNSIGNED NOT NULL,
  UpiId VARCHAR(255) NOT NULL,
  PayeeName VARCHAR(150) NOT NULL,
  MerchantCode CHAR(4) NULL,
  IsEnabled BOOLEAN NOT NULL DEFAULT FALSE,
  MaxPaymentAmount DECIMAL(10,2) NOT NULL DEFAULT 100000.00,
  CreatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UpdatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (HospitalId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS HospitalBookingPaymentAttempt (
  Id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  BookingConsultationId BIGINT UNSIGNED NOT NULL,
  CustomerId BIGINT UNSIGNED NOT NULL,
  ClientRequestId CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  RequestHash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  TransactionRef VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  Amount DECIMAL(10,2) NOT NULL,
  PayeeVpa VARCHAR(255) NOT NULL,
  PayeeName VARCHAR(150) NOT NULL,
  UpiUri VARCHAR(2048) NOT NULL,
  Status ENUM('CREATED','SUCCESS','CANCELLED','FAILURE','UNKNOWN','EXPIRED') NOT NULL DEFAULT 'CREATED',
  VerificationStatus ENUM('UNVERIFIED','VERIFIED','REJECTED') NOT NULL DEFAULT 'UNVERIFIED',
  AppPackage VARCHAR(200) NULL,
  ResponseCode VARCHAR(100) NULL,
  ResultCode INT NULL,
  TxnId VARCHAR(200) NULL,
  ApprovalRefNo VARCHAR(200) NULL,
  RawResponse TEXT NULL,
  ResultHash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL,
  CreatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UpdatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  ExpiresAt DATETIME(3) NOT NULL,
  ReportedAt DATETIME(3) NULL,
  VerifiedAt DATETIME(3) NULL,
  PRIMARY KEY (Id),
  UNIQUE KEY uq_hospital_booking_payment_request (BookingConsultationId, ClientRequestId),
  UNIQUE KEY uq_hospital_booking_payment_reference (TransactionRef),
  KEY ix_hospital_booking_payment_history (BookingConsultationId, CreatedAt),
  KEY ix_hospital_booking_payment_reconcile (VerificationStatus, Status, CreatedAt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
