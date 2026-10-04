import { test } from "node:test";
import assert from "node:assert/strict";
import { presetCatalog } from "../src/lib/preset-commerce";
import { travelPlaces } from "../src/lib/places";
import {
  addCartPreset,
  createPresetCart,
  getPresetCartSelection,
  getPrototypeRewardEligibility,
  pricePresetCart,
  removeCartPreset,
  selectRewardPreset,
} from "../src/lib/preset-cart";

const ids = presetCatalog.map((preset) => preset.id);
const fixtureLocations = ["one", "two", "three", "four", "five"];
const eligible = getPrototypeRewardEligibility(
  fixtureLocations,
  fixtureLocations,
);

test("cart sanitizes unknown identities and duplicates without mutating input", () => {
  const input = {
    paidPresetIds: [ids[0], ids[0], "alpine-soft", null, 1, ids[1]],
    rewardPresetId: "unknown",
  };
  const snapshot = structuredClone(input);
  assert.deepEqual(createPresetCart(input), {
    paidPresetIds: ids.slice(0, 2),
    rewardPresetId: null,
  });
  assert.deepEqual(input, snapshot);
  for (const malformed of [
    null,
    undefined,
    "wrong",
    17,
    [],
    { paidPresetIds: "wrong" },
  ])
    assert.deepEqual(createPresetCart(malformed), {
      paidPresetIds: [],
      rewardPresetId: null,
    });
});

test("add and remove are idempotent selections, never ownership", () => {
  const empty = createPresetCart();
  const cart = addCartPreset(addCartPreset(empty, ids[0]), ids[0]);
  assert.deepEqual(cart.paidPresetIds, [ids[0]]);
  assert.deepEqual(empty.paidPresetIds, []);
  assert.deepEqual(addCartPreset(cart, "unknown"), cart);
  assert.deepEqual(getPresetCartSelection(cart, ids[0]), {
    selection: "paid",
    ownership: "unknown",
  });
  assert.deepEqual(getPresetCartSelection(cart, ids[1]), {
    selection: "not-selected",
    ownership: "unknown",
  });
  assert.deepEqual(
    removeCartPreset(removeCartPreset(cart, ids[0]), ids[0]),
    empty,
  );
});

test("ten distinct paid presets unlock twenty percent off the entire subtotal", () => {
  for (const [count, subtotal, discount, total] of [
    [0, 0, 0, 0],
    [1, 199, 0, 199],
    [9, 1791, 0, 1791],
    [10, 1990, 398, 1592],
    [11, 2189, 438, 1751],
    [21, 4179, 836, 3343],
  ]) {
    const quote = pricePresetCart(
      createPresetCart({ paidPresetIds: ids.slice(0, count) }),
    );
    assert.equal(quote.paidCount, count);
    assert.equal(quote.paidSubtotalCents, subtotal);
    assert.equal(quote.discountCents, discount);
    assert.equal(quote.totalCents, total);
    assert.equal(quote.discountPercent, count >= 10 ? 20 : 0);
    assert.equal(quote.currency, "USD");
    assert.equal(quote.checkout, "prototype-only");
    assert.equal(quote.ownership, "unknown");
  }
  const duplicates = createPresetCart({
    paidPresetIds: Array(10).fill(ids[0]),
  });
  assert.equal(pricePresetCart(duplicates).discountCents, 0);
});

test("reward eligibility requires five distinct known visits and remains prototype-only", () => {
  assert.equal(
    getPrototypeRewardEligibility(
      [...fixtureLocations.slice(0, 4), "one", "unknown"],
      fixtureLocations,
    ).eligible,
    false,
  );
  assert.equal(
    getPrototypeRewardEligibility(null, fixtureLocations).visitedCount,
    0,
  );
  assert.equal(eligible.eligible, true);
  assert.equal(eligible.kind, "prototype-only");
  const actualIds = travelPlaces.map((place) => place.id);
  const actual = getPrototypeRewardEligibility(
    [...actualIds, ...actualIds, "invented"],
    actualIds,
  );
  assert.equal(actual.visitedCount, actualIds.length);
  assert.equal(actual.eligible, actualIds.length >= 5);
});

test("one eligible free choice cannot inflate the paid discount threshold", () => {
  const paid = createPresetCart({ paidPresetIds: ids.slice(0, 9) });
  const reward = selectRewardPreset(paid, ids[9], eligible);
  const quote = pricePresetCart(reward, eligible);
  assert.equal(quote.selectedCount, 10);
  assert.equal(quote.paidCount, 9);
  assert.equal(quote.discountCents, 0);
  assert.equal(quote.totalCents, 1791);
  assert.deepEqual(getPresetCartSelection(reward, ids[9], eligible), {
    selection: "prototype-reward",
    ownership: "unknown",
  });
  assert.deepEqual(addCartPreset(reward, ids[9], eligible), reward);
  const tenPaid = addCartPreset(reward, ids[10], eligible);
  assert.equal(pricePresetCart(tenPaid, eligible).totalCents, 1592);
  assert.equal(pricePresetCart(tenPaid, eligible).selectedCount, 11);
});

test("replacing or removing a reward never silently charges for the old free choice", () => {
  const paid = createPresetCart({ paidPresetIds: ids.slice(0, 10) });
  const reward = selectRewardPreset(paid, ids[0], eligible);
  assert.equal(pricePresetCart(reward, eligible).paidCount, 9);
  const replaced = selectRewardPreset(reward, ids[10], eligible);
  assert.deepEqual(replaced.paidPresetIds, ids.slice(1, 10));
  assert.equal(replaced.rewardPresetId, ids[10]);
  assert.equal(
    removeCartPreset(replaced, ids[10], eligible).rewardPresetId,
    null,
  );
  assert.deepEqual(selectRewardPreset(replaced, "unknown", eligible), replaced);
});

test("restored reward selection alone cannot grant free pricing or verified ownership", () => {
  const input = {
    paidPresetIds: [ids[0]],
    rewardPresetId: ids[1],
    ownedPresetIds: ids,
  };
  assert.equal(createPresetCart(input).rewardPresetId, null);
  assert.equal(
    selectRewardPreset(createPresetCart(), ids[0]).rewardPresetId,
    null,
  );
  assert.equal(pricePresetCart(input).selectedCount, 1);
  assert.equal(pricePresetCart(input).ownership, "unknown");
  assert.equal(createPresetCart(input, eligible).rewardPresetId, ids[1]);
  assert.deepEqual(
    createPresetCart(
      { paidPresetIds: [ids[0], ids[1]], rewardPresetId: ids[1] },
      eligible,
    ).paidPresetIds,
    [ids[0]],
  );
});
