export type Cell = string | number | boolean | Date | null;
export type OrderDetails = {
  addressLine1?: string;
  addressLine2?: string;
  village?: string;
  mandal?: string;
  city?: string;
  district?: string;
  state?: string;
  pinCode?: string;
  paidAmount?: number;
};
export type ImportPerson = {
  fullName: string;
  dateofBirth: string;
  gender: string;
  relationship: string;
  mobileNumber?: string;
  cardHolderType: string;
  orderDetails: OrderDetails;
};
export type ImportEmployee = {
  row: number;
  sno: string;
  name: string;
  mobile: string;
  email: string;
  employeeCode: string;
  department: string;
  dateofBirth: string;
  gender: string;
  ohoCardNumber?: string;
  orderDetails: OrderDetails;
  family: ImportPerson[];
};
const header = (value: Cell) =>
  String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
const text = (value: Cell) => {
  const result = String(value ?? "").trim();
  return /^null$/i.test(result) ? "" : result;
};
const required = [
  "sno",
  "fullname",
  "gender",
  "dateofbirth",
  "mobilenumber",
  "cardholdertype",
  "relationship",
];
export const compatibleSheet = (rows: Cell[][]) =>
  required.every((key) => (rows[0] ?? []).map(header).includes(key));

export function excelDate(value: Cell, dayFirst = true): string {
  if (value instanceof Date) value = value.toISOString().slice(0, 10);
  if (typeof value === "number" && value > 0 && value < 100000)
    value = new Date(Date.UTC(1899, 11, 30) + Math.floor(value) * 86400000)
      .toISOString()
      .slice(0, 10);
  const s = text(value);
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:T.*)?$/.exec(s);
  const local = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(s);
  const result = iso
    ? `${iso[1]}-${iso[2].padStart(2, "0")}-${iso[3].padStart(2, "0")}`
    : local
      ? `${local[3]}-${local[dayFirst ? 2 : 1].padStart(2, "0")}-${local[dayFirst ? 1 : 2].padStart(2, "0")}`
      : "";
  const date = new Date(result);
  if (
    !result ||
    !Number.isFinite(date.getTime()) ||
    date.toISOString().slice(0, 10) !== result ||
    date > new Date()
  )
    throw Error(
      "Invalid date of birth. Use an Excel date or the selected text date format.",
    );
  return result;
}

export function parseEmployees(rows: Cell[][], dayFirst = true) {
  if (!compatibleSheet(rows))
    throw Error(
      "This sheet needs Sno, FullName, Gender, DateofBirth, MobileNumber, CardHolder Type and Relationship columns.",
    );
  if (rows.length > 5001)
    throw Error("Use at most 5,000 data rows per upload.");
  const keys = rows[0].map(header);
  if (
    keys
      .filter(Boolean)
      .some((key, index, array) => array.indexOf(key) !== index)
  )
    throw Error("Duplicate column headings found.");
  const employees: ImportEmployee[] = [];
  const errors: string[] = [];
  let current: ImportEmployee | undefined;
  const mobile = (value: Cell, required: boolean) => {
    let result = text(value).replace(/[\s()-]/g, "");
    if (result.startsWith("+91")) result = result.slice(3);
    if ((!result && required) || (result && !/^[6-9]\d{9}$/.test(result)))
      throw Error(
        "MobileNumber must contain a valid 10-digit Indian mobile number.",
      );
    return result;
  };
  rows.slice(1).forEach((cells, index) => {
    if (cells.every((cell) => cell == null || text(cell) === "")) return;
    const row = index + 2;
    const d = Object.fromEntries(keys.map((key, i) => [key, cells[i] ?? null]));
    const starts = text(d.sno) !== "";
    if (starts) current = undefined;
    try {
      const fullName = text(d.fullname);
      if (fullName.length < 2 || fullName.length > 100)
        throw Error("FullName must be 2–100 characters.");
      const gender = (
        { male: "Male", female: "Female", other: "Other" } as Record<
          string,
          string
        >
      )[text(d.gender).toLowerCase()];
      if (!gender) throw Error("Gender must be Male, Female or Other.");
      const dateofBirth = excelDate(d.dateofbirth, dayFirst);
      const orderDetails: OrderDetails = {};
      for (const [source, target] of Object.entries({
        addressline1: "addressLine1",
        addressline2: "addressLine2",
        village: "village",
        mandal: "mandal",
        city: "city",
        district: "district",
        state: "state",
        pincode: "pinCode",
      })) {
        const value = text(d[source]);
        if (value) Object.assign(orderDetails, { [target]: value });
      }
      if (text(d.paidamount)) {
        const amount = Number(text(d.paidamount).replace(/,/g, ""));
        if (
          !Number.isFinite(amount) ||
          amount < 0 ||
          amount > 1000000 ||
          Math.abs(amount * 100 - Math.round(amount * 100)) > 0.00001
        )
          throw Error(
            "PaidAmount must be a non-negative amount with at most two decimal places.",
          );
        orderDetails.paidAmount = amount;
      }
      const kind = text(d.cardholdertype).toLowerCase();
      const relationship = text(d.relationship).toLowerCase();
      if (starts) {
        if (kind !== "primary" || relationship !== "self")
          throw Error(
            "A Sno row must be the Primary employee with Relationship Self.",
          );
        const number = mobile(d.mobilenumber, true);
        const email = text(d.email);
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
          throw Error("Email is invalid.");
        const card = text(d.ohocardnumber).replace(/\s/g, "");
        if (card && !/^\d{12}$/.test(card))
          throw Error("OHOCardNumber must contain 12 digits.");
        current = {
          row,
          sno: text(d.sno),
          name: fullName,
          mobile: number,
          email,
          employeeCode: text(d.employeecode) || `EMP-${number}`,
          department: text(d.department),
          dateofBirth,
          gender,
          orderDetails,
          family: [],
          ...(card ? { ohoCardNumber: card } : {}),
        };
        employees.push(current);
      } else {
        if (!current)
          throw Error(
            "Family row has no valid preceding Primary employee/Sno row.",
          );
        if (!["secondary", "family", "dependent"].includes(kind))
          throw Error(
            "Family rows must use Secondary or Family for CardHolder Type.",
          );
        const relation = [
          "Spouse",
          "Son",
          "Daughter",
          "Father",
          "Mother",
          "Father-in-law",
          "Mother-in-law",
          "Brother",
          "Sister",
        ].find((r) => r.toLowerCase() === relationship);
        if (!relation) throw Error("Select a supported family relationship.");
        const number = mobile(d.mobilenumber, false);
        // The reference workbook labels every dependent Secondary. Normalize to the requested member roles.
        current.family.push({
          fullName,
          dateofBirth,
          gender,
          relationship: relation,
          cardHolderType: relation === "Spouse" ? "Secondary" : "Family",
          orderDetails,
          ...(number ? { mobileNumber: number } : {}),
        });
      }
    } catch (e) {
      errors.push(
        `Row ${row}: ${e instanceof Error ? e.message : "Invalid row"}`,
      );
    }
  });
  for (const key of ["mobile", "employeeCode"] as const) {
    const seen = new Set<string>();
    for (const e of employees) {
      if (seen.has(e[key]))
        errors.push(`Row ${e.row}: Duplicate ${key} ${e[key]}.`);
      seen.add(e[key]);
    }
  }
  if (!employees.length) errors.push("No employees found in this sheet.");
  if (employees.length > 200)
    errors.push("Use at most 200 employees per upload.");
  return { employees, errors };
}

export async function importRequestId(
  companyId: number,
  sheet: string,
  body: object,
) {
  const bytes = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(JSON.stringify([companyId, sheet, body])),
  );
  const hex = Array.from(new Uint8Array(bytes), (n) =>
    n.toString(16).padStart(2, "0"),
  ).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}
