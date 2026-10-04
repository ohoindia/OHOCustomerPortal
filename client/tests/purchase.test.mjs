import assert from "node:assert/strict";
import test from "node:test";
import { loadModule } from "./load-common.mjs";
const { allNomineesAdded } = loadModule("../../common/utils/purchase.ts");

test("shared purchase destinations and initial steps cover family, nominee and direct payment flows", () => {
  const { packageDetailsRoute, purchaseRoute, firstPurchaseStep } = loadModule(
    "../../common/utils/purchase.ts",
  );
  assert.equal(
    packageDetailsRoute(278),
    "/product-details?productId=278&purchase=1",
  );
  assert.equal(
    packageDetailsRoute("a&b"),
    "/product-details?productId=a%26b&purchase=1",
  );
  assert.equal(purchaseRoute(42, "family"), "/purchase/42/family");
  assert.equal(
    firstPurchaseStep({ MaximumMembers: 2, includedProducts: [] }),
    "family",
  );
  assert.equal(
    firstPurchaseStep({
      MaximumMembers: 1,
      includedProducts: [{ IsNomineeRequired: true }],
    }),
    "nominees",
  );
  assert.equal(
    firstPurchaseStep({
      MaximumMembers: 1,
      IsNomineeRequired: true,
      includedProducts: [],
    }),
    "nominees",
  );
  assert.equal(
    firstPurchaseStep({ MaximumMembers: 1, includedProducts: [] }),
    "payment",
  );
});
test("skip nominee collection when every required product already has a nominee", () => {
  assert.equal(
    allNomineesAdded([{ ProductsId: 278 }], [{ ProductsId: "278" }]),
    true,
  );
  assert.equal(allNomineesAdded([], []), true);
  assert.equal(
    allNomineesAdded(
      [{ ProductsId: 278 }, { ProductsId: 283 }],
      [{ ProductsId: 278 }],
    ),
    false,
  );
  assert.equal(
    allNomineesAdded([{ ProductsId: 278 }], [{ ProductsId: 999 }]),
    false,
  );
  assert.equal(allNomineesAdded([{}], [{}]), false);
});
