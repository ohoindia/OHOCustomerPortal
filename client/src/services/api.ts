/** Shared transport for customer API calls. */
export async function apiRequest<T>(
  path: string,
  options: { body?: Record<string, unknown>; signal?: AbortSignal } = {},
): Promise<T> {
  const base = (
    path.startsWith("lambdaAPI/")
      ? import.meta.env.VITE_API_BASE_URL
      : import.meta.env.VITE_LEGACY_API_BASE_URL
  )?.replace(/\/$/, "");
  if (!base) throw new Error("Customer service is not configured.");
  const response = await fetch(`${base}/${path.replace(/^\//, "")}`, {
    method: options.body === undefined ? "GET" : "POST",
    headers: { "Content-Type": "application/json" },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    signal: options.signal,
  });
  if (!response.ok)
    throw new Error(`Customer service request failed (${response.status}).`);
  return response.json() as Promise<T>;
}
