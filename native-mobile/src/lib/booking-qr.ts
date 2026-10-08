export function bookingQrSource(value: string) {
  const qr = value.trim();
  if (!qr) return null;
  if (/^https?:\/\//i.test(qr)) return { kind: "url" as const, value: qr };
  return {
    kind: "image" as const,
    value: /^data:image\//i.test(qr) ? qr : `data:image/png;base64,${qr}`,
  };
}
