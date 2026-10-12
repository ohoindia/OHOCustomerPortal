import type { Href } from "expo-router";
// The shared client owns aliases; keep its destinations and query strings intact.
export const destination = (path: string) => path as Href;

export function clientRoute(
  pathname: string,
  segments: readonly string[],
  params: Record<string, string | string[] | undefined>,
) {
  const routeParams = new Set(
    segments
      .filter((segment) => segment.startsWith("[") && segment.endsWith("]"))
      .map((segment) => segment.slice(1, -1).replace(/^\.\.\./, "")),
  );
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (routeParams.has(key) || value === undefined) continue;
    for (const item of Array.isArray(value) ? value : [value])
      search.append(key, item);
  }
  return `${pathname}${search.size ? `?${search}` : ""}`;
}
