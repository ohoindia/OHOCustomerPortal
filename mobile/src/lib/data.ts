import { useCallback, useEffect, useState } from "react";
import { useFocusEffect } from "expo-router";
import { api } from "./api";
export type Row = Record<string, unknown>;
export const value = (row: Row | undefined, key: string) => {
  const item = row?.[key];
  return typeof item === "string" || typeof item === "number"
    ? String(item)
    : "";
};
export const children = (row: Row, key: string): Row[] =>
  Array.isArray(row[key]) ? (row[key] as Row[]) : [];
export function useData<T>(path: string, body?: Record<string, unknown>) {
  const [attempt, setAttempt] = useState(0);
  useFocusEffect(
    useCallback(() => {
      setAttempt((n) => n + 1);
    }, []),
  );
  const serialized = JSON.stringify(body);
  const key = `${path}:${serialized}:${attempt}`;
  const [state, setState] = useState<{
    key: string;
    data: T | null;
    error: string;
    loading: boolean;
  }>({ key: "", data: null, error: "", loading: true });
  useEffect(() => {
    const controller = new AbortController();
    void api<T>(path, {
      body: serialized ? JSON.parse(serialized) : undefined,
      signal: controller.signal,
    })
      .then((data) => {
        if (!Array.isArray(data))
          throw new Error("The service returned an unexpected response.");
        if (!controller.signal.aborted)
          setState({ key, data, error: "", loading: false });
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted)
          setState({
            key,
            data: null,
            error:
              error instanceof Error
                ? error.message
                : "Unable to load details.",
            loading: false,
          });
      });
    return () => controller.abort();
  }, [path, serialized, key]);
  return {
    ...(state.key === key ? state : { data: null, error: "", loading: true }),
    retry: () => setAttempt((n) => n + 1),
  };
}
