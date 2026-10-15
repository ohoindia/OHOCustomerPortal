export type Permission = "employees" | "invoices" | "access";
export interface Employee {
  id: number;
  customerId: number | null;
  communityCustomerId: number;
  name: string;
  email: string;
  mobile: string;
  employeeCode: string;
  department: string;
  joinedOn: string;
  status: "Active" | "Pending" | "Removed";
}
export interface Invoice {
  id: number;
  number: string;
  issuedOn: string;
  dueOn: string;
  amountPaise: number;
  status: string;
  description: string;
}
export interface Role {
  id: number;
  name: string;
  permissions: Permission[];
  isSystem: boolean;
}
export interface PortalUser {
  id: number;
  name: string;
  email: string;
  roleId: number;
  role: string;
  status: string;
}
export interface Workspace {
  products: { id: number; name: string; maximumMembers: number; requiresSpouse: boolean; nominees: { id: number; name: string }[] }[];
  company: { id: number; name: string; groupId: number };
  identity: {
    userId: number;
    companyId: number;
    name: string;
    email: string;
    role: string;
    permissions: Permission[];
  };
  employees: Employee[];
  invoices: Invoice[];
  roles: Role[];
  users: PortalUser[];
  activity: { action: string; actor: string; createdAt: string }[];
}
export interface EmployeeCustomer {
  customerId: number | null;
  onboarding: { orderId: number; status: string } | null;
  cards: { number: string; startDate: string | null; endDate: string | null; active: boolean }[];
  products: { id: number; name: string; issuedOn: string | null; validTill: string | null }[];
  family: { id: number; name: string; relationship: string; cardHolderType?: string; dateofBirth: string; gender: string }[];
}
let accessToken = "";
const base = (import.meta.env.VITE_CORPORATE_API_BASE_URL || "").replace(
  /\/$/,
  "",
);
export async function request<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(`${base}/api/corporate/${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 401 && accessToken) {
      accessToken = "";
      window.dispatchEvent(new Event("oho-corporate-session-ended"));
    }
    const message = data?.message;
    throw new Error(
      Array.isArray(message)
        ? message.join(". ")
        : typeof message === "string"
          ? message
          : `Request failed (${response.status}). Please retry.`,
    );
  }
  return data;
}
export async function login(email: string, password: string) {
  const result = await request<{ token: string }>("login", { email, password });
  accessToken = result.token;
}
export async function logout() {
  try {
    await request("logout", {});
  } finally {
    accessToken = "";
  }
}
export const money = (paise: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(paise) / 100);
export function exportCsv(filename: string, rows: unknown[][]) {
  // Prevent spreadsheet formula execution when customer-supplied fields are opened in Excel.
  const csv = rows
    .map((row) =>
      row
        .map((cell) => {
          const text = String(cell ?? "");
          return `"${(/^[\s]*[=+@-]/.test(text) ? "'" + text : text).replaceAll('"', '""')}"`;
        })
        .join(","),
    )
    .join("\r\n");
  const url = URL.createObjectURL(
    new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
