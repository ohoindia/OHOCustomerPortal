type ProductReference = { ProductsId?: unknown };

export type PurchaseStep = "family" | "nominees" | "payment";

export function packageDetailsRoute(productId: string | number) {
  return `/product-details?productId=${encodeURIComponent(String(productId))}&purchase=1`;
}

export function purchaseRoute(orderId: string | number, step: PurchaseStep) {
  return `/purchase/${encodeURIComponent(String(orderId))}/${step}`;
}

export function firstPurchaseStep(product: {
  MaximumMembers?: unknown;
  IsNomineeRequired?: unknown;
  includedProducts: { IsNomineeRequired?: unknown }[];
}): PurchaseStep {
  if (Number(product.MaximumMembers) > 1) return "family";
  return product.includedProducts.some((row) =>
    Boolean(row.IsNomineeRequired),
  ) || Boolean(product.IsNomineeRequired)
    ? "nominees"
    : "payment";
}

export function allNomineesAdded(
  required: ProductReference[],
  nominees: ProductReference[],
) {
  return required.every((product) =>
    nominees.some(
      (nominee) =>
        Number(product.ProductsId) > 0 &&
        Number(product.ProductsId) === Number(nominee.ProductsId),
    ),
  );
}
