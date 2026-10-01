export type RequestOptions = {
  body?: Record<string, unknown>;
  signal?: AbortSignal;
  configurationError?: string;
  requestError?: string;
  authentication?: boolean;
};
export type ApiRequest = <T>(
  path: string,
  options?: RequestOptions,
) => Promise<T>;
export type ApiConfiguration = {
  apiBaseUrl?: string;
  legacyApiBaseUrl?: string;
  fetch?: typeof globalThis.fetch;
  getAccessToken?: () =>
    string | null | undefined | Promise<string | null | undefined>;
  onUnauthorized?: (rejectedToken?: string | null) => void | Promise<void>;
};
/** Each app supplies its own URLs; the shared layer has no platform storage or environment dependencies. */
export function createApiRequest(configuration: ApiConfiguration): ApiRequest {
  return async <T>(path: string, options: RequestOptions = {}): Promise<T> => {
    const normalizedPath = path.replace(/^\/+/, "");
    const base = (
      normalizedPath.startsWith("lambdaAPI/")
        ? configuration.apiBaseUrl
        : configuration.legacyApiBaseUrl
    )?.replace(/\/+$/, "");
    if (!base)
      throw new Error(
        options.configurationError ?? "Customer service is not configured.",
      );
    const fetchRequest = configuration.fetch ?? globalThis.fetch;
    const token =
      options.authentication === false
        ? null
        : await configuration.getAccessToken?.();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (token) headers.Authorization = `Bearer ${token}`;
    const response = await fetchRequest(`${base}/${normalizedPath}`, {
      method: options.body === undefined ? "GET" : "POST",
      headers,
      body:
        options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: options.signal,
    });
    if (!response.ok) {
      if (response.status === 401 && options.authentication !== false) {
        await configuration.onUnauthorized?.(token);
        throw new Error("Your session has expired. Please log in again.");
      }
      throw new Error(
        options.requestError ??
          `Customer service request failed (${response.status}).`,
      );
    }
    return response.json() as Promise<T>;
  };
}
