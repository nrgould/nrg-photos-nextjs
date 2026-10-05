import { test } from "node:test";
import assert from "node:assert/strict";
import {
  restorePresetCart,
  serializePresetCart,
  formatPresetPrice,
  safePresetReturnPath,
} from "../src/lib/preset-cart-storage";

test("browser cart restoration accepts known paid IDs but never ownership or local reward claims", () => {
  assert.deepEqual(
    restorePresetCart(
      JSON.stringify({
        paidPresetIds: ["eibsee-1", "eibsee-1", "amsterdam-2", "sample", 7],
        rewardPresetId: "seiser-alm-1",
        ownedPresetIds: ["eibsee-1"],
      }),
    ),
    { paidPresetIds: ["eibsee-1", "amsterdam-2"], rewardPresetId: null },
  );
  for (const raw of [null, "{", "null", "42", "[]", '{"paidPresetIds":{}}']) {
    assert.deepEqual(restorePresetCart(raw), {
      paidPresetIds: [],
      rewardPresetId: null,
    });
  }
});

test("storage round trip preserves a custom pack and discards unverified free selections", () => {
  const cart = {
    paidPresetIds: ["grainau-1", "hopfensee-2"],
    rewardPresetId: "eibsee-1",
  };
  assert.deepEqual(restorePresetCart(serializePresetCart(cart)), {
    ...cart,
    rewardPresetId: null,
  });
  assert.equal(formatPresetPrice(1592), "$15.92");
  assert.equal(formatPresetPrice(1751), "$17.51");
});

test("checkout returns retain catalog context only on supported local routes", () => {
  const path =
    "/?view=cart&query=alpine&category=Soft%20Film&preset=eibsee-1#main";
  assert.equal(safePresetReturnPath(path), path);
  assert.equal(
    safePresetReturnPath("/?location=italy&view=cart"),
    "/?location=italy&view=cart",
  );
  for (const input of [
    null,
    "//evil.example/explore",
    "https://evil.example/presets",
    "javascript:alert(1)",
    "/account",
    "/presets/../../evil",
    "/" + "x".repeat(2048),
  ]) {
    assert.equal(safePresetReturnPath(input), "/");
  }
});
