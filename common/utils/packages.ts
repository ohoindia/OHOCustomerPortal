type CatalogProduct = Record<string, unknown>;
function enabled(value: unknown) {
  return value === true || value === 1 || value === "1" || value === "true";
}
export function groupPackages(products: CatalogProduct[]) {
  const groups = new Map<
    string,
    { id: string; name: string; packages: CatalogProduct[] }
  >();
  for (const product of products) {
    if (
      !enabled(product.IsCombo) ||
      enabled(product.IsFree) ||
      !enabled(product.IsActive ?? product.ProductsIsActive)
    )
      continue;
    const name = String(product.ProductCategoryName || "Packages");
    const id = String(
      product.ProductCategoryId ?? product.PCId ?? product.ProductPCId ?? name,
    );
    if (!groups.has(id)) groups.set(id, { id, name, packages: [] });
    groups.get(id)!.packages.push(product);
  }
  return [...groups.values()];
}
export function packageAmount(product: CatalogProduct): number | null {
  const premiums = product.InsurancePremiums;
  const first = Array.isArray(premiums)
    ? (premiums[0] as CatalogProduct | undefined)
    : undefined;
  // ProductsDetails serializes premiums as id;maxAge;minAge;base;gst;productId;total[;active].
  const serializedAmount =
    typeof premiums === "string"
      ? premiums.split("|")[0]?.split(";")[6]
      : undefined;
  const value =
    first?.TotalAmount ??
    serializedAmount ??
    product.TotalAmount ??
    product.SaleAmount;
  if (value === null || value === undefined || value === "") return null;
  const amount = Number(value);
  return Number.isFinite(amount) && amount >= 0 ? amount : null;
}
