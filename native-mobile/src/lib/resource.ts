import { useCallback, useEffect, useState } from "react";
import { useFocusEffect } from "expo-router";
import { api } from "./api";

// Purchase endpoints return objects; portal endpoints return arrays.
export function useResource<T>(path: string) {
  const [attempt, setAttempt] = useState(0);
  useFocusEffect(
    useCallback(() => {
      setAttempt((n) => n + 1);
    }, []),
  );
  const key = `${path}:${attempt}`;
  const [state, setState] = useState<{ key: string; data?: T; error: string }>({
    key: "",
    error: "",
  });
  useEffect(() => {
    const controller = new AbortController();
    void api<T>(path, { signal: controller.signal, serverErrors: true })
      .then((data) => {
        if (!controller.signal.aborted) setState({ key, data, error: "" });
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted)
          setState({
            key,
            error:
              error instanceof Error
                ? error.message
                : "Unable to load details.",
          });
      });
    return () => controller.abort();
  }, [path, key]);
  const current = state.key === key ? state : { data: undefined, error: "" };
  return {
    ...current,
    loading: !current.data && !current.error,
    retry: () => setAttempt((n) => n + 1),
  };
}
