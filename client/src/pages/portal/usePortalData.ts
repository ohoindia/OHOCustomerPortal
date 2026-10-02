import { UI_TEXT } from "../../../../common/content/labels";
import { useEffect, useState } from "react";
import { apiRequest } from "../../services/api";

export type PortalRow = Record<string, unknown>;
export function usePortalData(path: string, body?: Record<string, unknown>) {
  const [state, setState] = useState<{
    key?: string;
    rows: PortalRow[];
    loading: boolean;
    error: string;
  }>({ rows: [], loading: true, error: "" });
  const [attempt, setAttempt] = useState(0);
  const serializedBody = body ? JSON.stringify(body) : undefined;
  const key = `${path}:${serializedBody ?? ""}`;
  useEffect(() => {
    const controller = new AbortController();
    void apiRequest<PortalRow[]>(path, {
      signal: controller.signal,
      body: serializedBody ? JSON.parse(serializedBody) : undefined,
    })
      .then((rows) => {
        if (!Array.isArray(rows))
          throw new Error(UI_TEXT.theServiceReturnedAnUnexpectedResponse);
        if (!controller.signal.aborted)
          setState({ key, rows, loading: false, error: "" });
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted)
          setState({
            key,
            rows: [],
            loading: false,
            error:
              error instanceof Error
                ? error.message
                : UI_TEXT.unableToLoadDetails,
          });
      });
    return () => controller.abort();
  }, [path, serializedBody, attempt, key]);
  return {
    ...(state.key === key ? state : { rows: [], loading: true, error: "" }),
    retry: () => {
      setState({ key, rows: [], loading: true, error: "" });
      setAttempt((value) => value + 1);
    },
  };
}

export function textValue(row: PortalRow | undefined, key: string) {
  const value = row?.[key];
  return typeof value === "string" || typeof value === "number"
    ? String(value)
    : "";
}

export function childRows(
  row: PortalRow | undefined,
  key: string,
): PortalRow[] {
  return Array.isArray(row?.[key]) ? (row[key] as PortalRow[]) : [];
}
