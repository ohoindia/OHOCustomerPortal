import assert from "node:assert/strict";
import test from "node:test";
import { loadModule } from "./load-common.mjs";
const { allNomineesAdded } = loadModule("../../common/utils/purchase.ts");
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
