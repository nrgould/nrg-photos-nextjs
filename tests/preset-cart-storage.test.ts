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
        paidPresetIds: [
          "signature-01",
          "signature-01",
          "signature-21",
          "sample",
          7,
        ],
        rewardPresetId: "signature-03",
        ownedPresetIds: ["signature-01"],
      }),
    ),
    { paidPresetIds: ["signature-01", "signature-21"], rewardPresetId: null },
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
    paidPresetIds: ["signature-02", "signature-10"],
    rewardPresetId: "signature-01",
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
    "/presets?view=cart&query=alpine&category=Film&preset=signature-01#main";
  assert.equal(safePresetReturnPath(path), path);
  assert.equal(
    safePresetReturnPath("/explore?location=italy&view=cart"),
    "/explore?location=italy&view=cart",
  );
  for (const input of [
    null,
    "//evil.example/explore",
    "https://evil.example/presets",
    "javascript:alert(1)",
    "/account",
    "/presets/../../evil",
    "/presets" + "x".repeat(2048),
  ]) {
    assert.equal(safePresetReturnPath(input), "/presets");
  }
});
