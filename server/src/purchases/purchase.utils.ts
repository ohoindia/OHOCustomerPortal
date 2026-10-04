import { BadRequestException } from "@nestjs/common";
import type { DbRow } from "../database/database.service";

export function flag(value: unknown) {
  return value === true || value === 1 || value === "1" || value === "true";
}
export function personAge(dob: string) {
  const date = new Date(dob);
  const today = new Date();
  const age =
    today.getUTCFullYear() -
    date.getUTCFullYear() -
    (today.getUTCMonth() < date.getUTCMonth() ||
    (today.getUTCMonth() === date.getUTCMonth() &&
      today.getUTCDate() < date.getUTCDate())
      ? 1
      : 0);
  if (!Number.isFinite(date.getTime()) || date > today || age > 120)
    throw new BadRequestException("Enter a valid date of birth.");
  return age;
}
export function premiums(product: DbRow): DbRow[] {
  if (Array.isArray(product.InsurancePremiums))
    return product.InsurancePremiums;
  if (typeof product.InsurancePremiums !== "string") return [];
  return product.InsurancePremiums.split("|").map((row) => {
    const [
      InsurancePremiumId,
      MaximumAge,
      MinimumAge,
      BasePremium,
      GST,
      ProductsId,
      TotalAmount,
      IsActive,
    ] = row.split(";");
    return {
      InsurancePremiumId,
      MaximumAge,
      MinimumAge,
      BasePremium,
      GST,
      ProductsId,
      TotalAmount,
      IsActive,
    };
  });
}
export function quote(product: DbRow, age: number) {
  const rows = premiums(product);
  const premium = rows.find(
    (row) =>
      (row.IsActive == null || flag(row.IsActive)) &&
      age >= Number(row.MinimumAge) &&
      age <= Number(row.MaximumAge),
  );
  if (rows.length && !premium)
    throw new BadRequestException(
      "Your age is outside this package's eligibility range.",
    );
  const amount = Number(premium?.TotalAmount ?? product.SaleAmount);
  if (!Number.isFinite(amount) || amount <= 0)
    throw new BadRequestException("This package has no valid purchase price.");
  return {
    amount,
    basePremium: Number(premium?.BasePremium ?? amount),
    gst: Number(premium?.GST ?? 0),
  };
}
