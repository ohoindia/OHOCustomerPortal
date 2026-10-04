type ProductReference = { ProductsId?: unknown };

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
