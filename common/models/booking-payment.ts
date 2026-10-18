/** App-reported outcomes are not confirmation that money reached the hospital. */
export type BookingPaymentOutcome =
  "SUCCESS" | "CANCELLED" | "FAILURE" | "UNKNOWN";
export type BookingPaymentStatus =
  BookingPaymentOutcome | "CREATED" | "EXPIRED";
export type BookingPaymentVerification = "UNVERIFIED" | "VERIFIED" | "REJECTED";

export interface HospitalBookingPaymentAttempt {
  id: string;
  bookingId: number;
  transactionRef: string;
  amount: number;
  payeeVpa: string;
  payeeName: string;
  upiUri: string;
  status: BookingPaymentStatus;
  verificationStatus: BookingPaymentVerification;
  appPackage: string | null;
  responseCode: string | null;
  resultCode: number | null;
  txnId: string | null;
  approvalRefNo: string | null;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  reportedAt: string | null;
  verifiedAt: string | null;
}

export interface HospitalBookingPayments {
  bookingId: number;
  booking: {
    id: number;
    hospitalId: number;
    hospitalName: string;
    patientName: string;
  };
  paymentEnabled: boolean;
  disabledReason: string | null;
  approvedPayee: { upiId: string; payeeName: string } | null;
  attempts: HospitalBookingPaymentAttempt[];
}

export interface PrepareBookingPayment {
  upiUri: string;
  amount?: number;
  clientRequestId: string;
  appPackage?: string;
}

export interface ReportBookingPayment {
  appPackage: string;
  outcome: BookingPaymentOutcome;
  responseCode?: string;
  resultCode?: number;
  txnId?: string;
  approvalRefNo?: string;
  rawResponse?: string;
}
