export function capitalizeName(name: string): string {
  return name.replace(/^(\s*)(\S)/u, (_, whitespace: string, first: string) =>
    whitespace + first.toUpperCase(),
  );
}
