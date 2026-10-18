/** A parsed payment request. This describes a request, never proof of payment. */
export type UpiPaymentRequest = {
  uri: string;
  payeeAddress: string;
  payeeName: string;
  amount?: string;
  currency: "INR";
  transactionRef?: string;
  note?: string;
  parameters: Record<string, string>;
};

const parameterOrder = [
  "pa",
  "pn",
  "mc",
  "tr",
  "tn",
  "am",
  "cu",
  "tid",
  "mode",
  "purpose",
  "orgid",
] as const;
const supportedParameters = new Set<string>(parameterOrder);
function hasControlCharacters(value: string) {
  return Array.from(value).some((character) => {
    const code = character.charCodeAt(0);
    return code <= 31 || (code >= 127 && code <= 159);
  });
}

/** Decimal arithmetic keeps the displayed amount and launched amount identical. */
export function normalizeUpiAmount(value: string | number): string {
  const input = String(value).trim();
  if (!/^\d{1,9}(?:\.\d{1,2})?$/.test(input)) {
    throw new Error(
      "Enter a valid payment amount with up to two decimal places.",
    );
  }
  const [whole, fraction = ""] = input.split(".");
  const minorUnits = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (!Number.isSafeInteger(minorUnits) || minorUnits <= 0) {
    throw new Error("The payment amount must be greater than zero.");
  }
  return `${Math.floor(minorUnits / 100)}.${String(minorUnits % 100).padStart(2, "0")}`;
}

function encodeParameters(parameters: Record<string, string>) {
  return `upi://pay?${parameterOrder
    .filter((key) => Boolean(parameters[key]))
    .map((key) => `${key}=${encodeURIComponent(parameters[key])}`)
    .join("&")}`;
}

/**
 * Accept only the UPI payment URI, not intent://, HTTP redirects or app schemes.
 * Unknown extras are deliberately omitted from the rebuilt payment intent.
 */
export function parseUpiUri(value: string): UpiPaymentRequest {
  if (typeof value !== "string" || value.length > 4096) {
    throw new Error("Scan a valid hospital UPI payment QR code.");
  }
  const raw = value.trim();
  if (hasControlCharacters(raw)) {
    throw new Error("The QR code contains invalid characters.");
  }
  const match = /^upi:\/\/pay\?([^#]+)$/i.exec(raw);
  if (!match) {
    throw new Error(
      "This is not a UPI payment QR code. Scan a upi://pay QR code.",
    );
  }
  const parameters: Record<string, string> = {};
  const seen = new Set<string>();
  for (const entry of match[1].split("&")) {
    const separator = entry.indexOf("=");
    if (separator < 1) throw new Error("The payment QR code is incomplete.");
    let key: string;
    let decoded: string;
    try {
      key = decodeURIComponent(entry.slice(0, separator)).toLowerCase();
      decoded = decodeURIComponent(
        entry.slice(separator + 1).replace(/\+/g, " "),
      ).trim();
    } catch {
      throw new Error("The payment QR code contains invalid encoding.");
    }
    if (!/^[a-z][a-z0-9]*$/.test(key) || seen.has(key)) {
      throw new Error(
        "The payment QR code contains duplicate or invalid details.",
      );
    }
    seen.add(key);
    if (hasControlCharacters(decoded) || decoded.length > 512) {
      throw new Error("The payment QR code contains invalid details.");
    }
    if (key === "sign" || key === "signature") {
      throw new Error(
        "This QR uses a signed request. Ask the hospital for a standard UPI payment QR code.",
      );
    }
    if (supportedParameters.has(key) && decoded) parameters[key] = decoded;
  }
  if (
    (parameters.pa?.length || 0) > 255 ||
    !/^[a-z0-9][a-z0-9._-]{0,254}@[a-z][a-z0-9.-]{1,99}$/i.test(
      parameters.pa || "",
    )
  ) {
    throw new Error("The QR code does not contain a valid UPI ID.");
  }
  if (
    (parameters.pn?.length || 0) > 128 ||
    (parameters.tn?.length || 0) > 140
  ) {
    throw new Error("The payment name or note is too long.");
  }
  if (parameters.cu && parameters.cu.toUpperCase() !== "INR") {
    throw new Error("Only payments in INR are supported.");
  }
  parameters.cu = "INR";
  if (parameters.am) parameters.am = normalizeUpiAmount(parameters.am);
  if (parameters.mc && !/^\d{4}$/.test(parameters.mc)) {
    throw new Error("The QR code contains an invalid merchant code.");
  }
  for (const key of ["tr", "tid"]) {
    if (parameters[key] && !/^[a-z0-9._-]{1,128}$/i.test(parameters[key])) {
      throw new Error("The QR code contains an invalid transaction reference.");
    }
  }
  for (const key of ["mode", "purpose", "orgid"]) {
    if (parameters[key] && !/^\d{1,12}$/.test(parameters[key])) {
      throw new Error("The QR code contains invalid payment details.");
    }
  }
  return {
    uri: encodeParameters(parameters),
    payeeAddress: parameters.pa,
    payeeName: parameters.pn || parameters.pa,
    amount: parameters.am,
    currency: "INR",
    transactionRef: parameters.tr,
    note: parameters.tn,
    parameters,
  };
}

/** Bind the payment intent to the server-created booking attempt. */
export function buildBookingUpiUri(
  value: string,
  booking: { amount: string | number; transactionRef: string; note?: string },
): string {
  const parsed = parseUpiUri(value);
  const amount = normalizeUpiAmount(booking.amount);
  if (parsed.amount && parsed.amount !== amount) {
    throw new Error(
      "The QR amount does not match this booking payment amount.",
    );
  }
  if (!/^[a-z0-9._-]{1,128}$/i.test(booking.transactionRef)) {
    throw new Error("A valid booking payment reference is required.");
  }
  const parameters: Record<string, string> = {
    ...parsed.parameters,
    am: amount,
    tr: booking.transactionRef,
  };
  if (booking.note) {
    if (
      hasControlCharacters(booking.note) ||
      booking.note.trim().length > 140
    ) {
      throw new Error("The booking payment note is invalid.");
    }
    parameters.tn = booking.note.trim();
  }
  return encodeParameters(parameters);
}
