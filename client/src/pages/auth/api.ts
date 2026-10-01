export interface Member {
  MemberId: number;
  Name?: string | null;
  MobileNumber?: string | null;
  Gender?: string | null;
  Age?: number | null;
  DateofBirth?: string | null;
  MemberTypeId?: string | null;
  AddressLine1?: string | null;
  AddressLine2?: string | null;
  Village?: string | null;
  City?: string | null;
  Image?: string | null;
  GroupId?: number | null;
  [key: string]: string | number | boolean | null | undefined;
}

export interface AuthResponse {
  status: boolean;
  message?: string;
  msg?: string;
  guid?: string;
  futureTime?: string;
  JwtToken?: string;
  memberData?: Member[];
  data?: { customerId?: number };
}

export async function authRequest(
  action: string,
  body: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<AuthResponse> {
  const base = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "");
  if (!base)
    throw new Error("Login service is not configured. Please contact support.");
  const response = await fetch(`${base}/lambdaAPI/Customer/${action}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  if (!response.ok)
    throw new Error("Unable to contact the login service. Please try again.");
  const data: AuthResponse = await response.json();
  if (typeof data.status !== "boolean")
    throw new Error(
      "Unexpected response from the login service. Please try again.",
    );
  return data;
}

export function remainingSeconds(futureTime?: string) {
  const seconds = Math.floor(
    (Date.parse(futureTime ?? "") - Date.now()) / 1000,
  );
  return Number.isFinite(seconds) ? Math.max(0, seconds) : 60;
}
