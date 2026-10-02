export type HospitalRow = Record<string, unknown>;
export type Coordinates = { latitude: number; longitude: number };
export type HospitalProximity = "all" | "nearest" | "nearby";

function numberCoordinate(value: unknown) {
  if (
    (typeof value !== "number" && typeof value !== "string") ||
    String(value).trim() === ""
  )
    return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}
export function hospitalCoordinates(row: HospitalRow): Coordinates | null {
  const latitude = numberCoordinate(row.Latitude);
  const longitude = numberCoordinate(row.Longitude);
  return latitude !== null &&
    longitude !== null &&
    Math.abs(latitude) <= 90 &&
    Math.abs(longitude) <= 180
    ? { latitude, longitude }
    : null;
}
export function distanceInKm(a: Coordinates, b: Coordinates) {
  const radians = (value: number) => (value * Math.PI) / 180;
  const lat = radians(b.latitude - a.latitude);
  const lng = radians(b.longitude - a.longitude);
  const haversine =
    Math.sin(lat / 2) ** 2 +
    Math.cos(radians(a.latitude)) *
      Math.cos(radians(b.latitude)) *
      Math.sin(lng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(Math.min(1, Math.max(0, haversine))));
}
export function selectHospitals(
  rows: HospitalRow[],
  options: {
    search: string;
    speciality: string;
    proximity: HospitalProximity;
    position: Coordinates | null;
  },
) {
  const search = options.search.trim().toLowerCase();
  const filtered = rows.filter(
    (row) =>
      (options.speciality === "all" ||
        row.Specialization === options.speciality) &&
      [
        "HospitalName",
        "Specialization",
        "City",
        "AddressLine1",
        "AddressLine2",
        "HospitalCode",
      ].some((key) =>
        String(row[key] ?? "")
          .toLowerCase()
          .includes(search),
      ),
  );
  if (!options.position) return filtered;
  const position = options.position;
  const distance = (row: HospitalRow) => {
    const coords = hospitalCoordinates(row);
    return coords ? distanceInKm(position, coords) : Infinity;
  };
  const sorted = [...filtered].sort(
    (a, b) =>
      distance(a) - distance(b) ||
      String(a.HospitalName ?? "").localeCompare(String(b.HospitalName ?? "")),
  );
  if (options.proximity === "nearby")
    return sorted.filter((row) => distance(row) <= 10);
  if (options.proximity === "nearest")
    return sorted.filter((row) => hospitalCoordinates(row)).slice(0, 2);
  return sorted;
}
export function hospitalDirectionsUrl(row: HospitalRow) {
  const coords = hospitalCoordinates(row);
  const destination = coords
    ? `${coords.latitude},${coords.longitude}`
    : [row.HospitalName, row.AddressLine1, row.City].filter(Boolean).join(", ");
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
}
