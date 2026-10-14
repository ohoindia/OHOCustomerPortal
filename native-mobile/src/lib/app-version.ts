// Compare numeric release components rather than strings (1.10 is newer than 1.9).
export function isNewerVersion(latest: string, installed: string): boolean {
  const parse = (value: string) => {
    const normalized = value.trim();
    if (!/^\d+(\.\d+)*$/.test(normalized)) return null;
    const parts = normalized.split(".").map(Number);
    return parts.every(Number.isSafeInteger) ? parts : null;
  };
  const next = parse(latest);
  const current = parse(installed);
  if (!next || !current) return false;
  for (let index = 0; index < Math.max(next.length, current.length); index++) {
    const difference = (next[index] ?? 0) - (current[index] ?? 0);
    if (difference !== 0) return difference > 0;
  }
  return false;
}

export function appUpdateUrl(value: string): string | null {
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" && !url.username && !url.password
      ? url.href
      : null;
  } catch {
    return null;
  }
}
