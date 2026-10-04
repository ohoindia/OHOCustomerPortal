import assert from "node:assert/strict";
import test from "node:test";
import { loadModule } from "./load-common.mjs";
const { groupPackages, packageAmount } = loadModule(
  "../../common/utils/packages.ts",
);
test("catalog shows only active paid combo packages grouped by category", () => {
  const base = {
    IsCombo: true,
    IsFree: false,
    IsActive: true,
    ProductCategoryName: "Family",
    PCId: 4,
  };
  const rows = [
    { ...base, ProductsId: 1 },
    { ...base, ProductsId: 2, IsCombo: false },
    { ...base, ProductsId: 3, IsFree: true },
    { ...base, ProductsId: 4, IsActive: false },
    { ...base, ProductsId: 5, IsCombo: "1", IsFree: "0", IsActive: 1 },
    { ...base, ProductsId: 6, PCId: 5, ProductCategoryName: "Individual" },
  ];
  const groups = groupPackages(rows);
  assert.deepEqual(
    Array.from(groups, (group) =>
      Array.from(group.packages, (row) => row.ProductsId),
    ),
    [[1, 5], [6]],
  );
  assert.equal(groupPackages([]).length, 0);
});
test("price uses the reference premium amount with safe catalog fallback", () => {
  assert.equal(
    packageAmount({
      InsurancePremiums: [{ TotalAmount: "1250" }],
      SaleAmount: 900,
    }),
    1250,
  );
  assert.equal(packageAmount({ SaleAmount: "900" }), 900);
  assert.equal(packageAmount({ SaleAmount: 0 }), 0);
  for (const row of [
    {},
    { InsurancePremiums: [] },
    { SaleAmount: "invalid" },
    { SaleAmount: -1 },
  ])
    assert.equal(packageAmount(row), null);
});

test("live ProductsDetails contract uses ProductsIsActive and serialized premiums", () => {
  const rows = [
    {
      ProductsId: 278,
      ProductCategoryName: "Premium",
      ProductCategoryId: 3,
      ProductsIsActive: 1,
      IsCombo: 1,
      IsFree: 0,
      InsurancePremiums: "266;65;18;2541.53;18;278;2999.00",
      SaleAmount: "2999.00",
    },
    {
      ProductsId: 283,
      ProductCategoryName: "Premium",
      ProductCategoryId: 3,
      ProductsIsActive: 1,
      IsCombo: 1,
      IsFree: 0,
      InsurancePremiums: "271;65;18;3388.98;18;283;3999.00",
      SaleAmount: "0.00",
    },
    {
      ProductsId: 294,
      ProductCategoryName: "Privilege",
      ProductsIsActive: 0,
      IsCombo: 1,
      IsFree: 0,
    },
    { ProductsId: 306, ProductsIsActive: 1, IsCombo: 1, IsFree: 1 },
    { ProductsId: 10, ProductsIsActive: 1, IsCombo: 0, IsFree: 0 },
  ];
  const groups = groupPackages(rows);
  assert.equal(groups.length, 1);
  assert.deepEqual(
    Array.from(groups[0].packages, (row) => row.ProductsId),
    [278, 283],
  );
  assert.equal(packageAmount(rows[1]), 3999);
  assert.equal(
    packageAmount({
      InsurancePremiums: "1;65;18;100;18;1;118.00;1|2;75;66;200;18;1;236.00;1",
    }),
    118,
  );
});
