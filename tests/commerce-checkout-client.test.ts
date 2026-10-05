import { test } from "node:test";
import assert from "node:assert/strict";
import {
  attemptPresetIds,
  checkoutAttempt,
  checkoutReturnPath,
  currentOwnership,
  stripeCheckoutUrl,
  claimedReward,
  verifiedOwnership,
} from "../src/lib/commerce-checkout-client";

const createId = () => "fixture-request-00001";
test("checkout retry identity survives sorting, duplicate cart IDs and return query ordering", () => {
  const first = checkoutAttempt(
    "user-A",
    ["eibsee-1", "grainau-1"],
    "/?view=cart&query=travel",
    null,
    createId,
  );
  const retry = checkoutAttempt(
    "user-A",
    ["grainau-1", "eibsee-1", "eibsee-1"],
    "/?query=travel&view=cart&checkout=cancelled",
    JSON.parse(JSON.stringify(first)),
    () => {
      throw new Error("Must reuse retry identity");
    },
  );
  assert.deepEqual(retry, first);
  assert.equal(
    checkoutReturnPath("/?checkout=returned&view=cart#stale"),
    "/?view=cart",
  );
  for (const [user, ids, path] of [
    ["user-B", ["eibsee-1", "grainau-1"], "/?view=cart&query=travel"],
    ["user-A", ["eibsee-1"], "/?view=cart&query=travel"],
    ["user-A", ["eibsee-1", "grainau-1"], "/"],
  ] as const)
    assert.equal(
      checkoutAttempt(user, ids, path, first, () => "fixture-request-00002")
        .requestId,
      "fixture-request-00002",
    );
  for (const ids of [[], ["invented"], ["eibsee-1", "invented"]])
    assert.throws(() => checkoutAttempt("user-A", ids, "/", null, createId));
  assert.throws(() => checkoutAttempt("", ["eibsee-1"], "/", null, createId));
  assert.throws(() =>
    checkoutAttempt("user-A", ["eibsee-1"], "/", null, () => "bad"),
  );
});

test("malformed stored retry identity is replaced and external return URLs never enter the request key", () => {
  const valid = checkoutAttempt("user-A", ["eibsee-1"], "/", null, createId);
  for (const prior of [
    null,
    [],
    "forged",
    { ...valid, requestId: "" },
    { ...valid, requestId: "x".repeat(101) },
  ])
    assert.equal(
      checkoutAttempt("user-A", ["eibsee-1"], "/", prior, createId).requestId,
      createId(),
    );
  assert.equal(checkoutReturnPath("https://evil.example/presets"), "/");
});

test("only verified published ownership is accepted; account switch, sign-out and refresh immediately invalidate snapshots", () => {
  assert.deepEqual(
    verifiedOwnership({
      status: "verified",
      presetIds: ["eibsee-1", "eibsee-1"],
    }),
    ["eibsee-1"],
  );
  assert.deepEqual(
    verifiedOwnership({ status: "verified", presetIds: [] }),
    [],
  );
  for (const value of [
    null,
    { status: "unavailable", presetIds: ["eibsee-1"] },
    { status: "verified", presetIds: ["forged"] },
    { status: "verified", presetIds: "eibsee-1" },
    { checkout: "returned" },
  ])
    assert.equal(verifiedOwnership(value), null);
  const snapshot = {
    sessionKey: "session-A:user-A",
    revision: 2,
    presetIds: ["eibsee-1"],
    rewardPresetId: null,
  };
  assert.equal(claimedReward({ rewardPresetId: "eibsee-1" }), "eibsee-1");
  for (const value of [null, {}, { rewardPresetId: "signature-01" }])
    assert.equal(claimedReward(value), null);
  assert.deepEqual(currentOwnership(snapshot, snapshot.sessionKey, 2, true), [
    "eibsee-1",
  ]);
  for (const [key, revision, available] of [
    [null, 2, true],
    ["session-B:user-A", 2, true],
    ["session-B:user-B", 2, true],
    [snapshot.sessionKey, 3, true],
    [snapshot.sessionKey, 2, false],
  ] as const)
    assert.equal(currentOwnership(snapshot, key, revision, available), null);
});

test("checkout redirects allow only the exact HTTPS Stripe Checkout origin", () => {
  assert.equal(
    stripeCheckoutUrl({
      url: "https://checkout.stripe.com/c/pay/cs_test_fixture",
    }),
    "https://checkout.stripe.com/c/pay/cs_test_fixture",
  );
  for (const url of [
    "javascript:alert(1)",
    "//checkout.stripe.com/x",
    "http://checkout.stripe.com/x",
    "https://checkout.stripe.com.evil.example/x",
    "https://checkout.stripe.com:444/x",
    "https://user:pass@checkout.stripe.com/x",
    "/",
  ])
    assert.equal(stripeCheckoutUrl({ url }), null);
  assert.equal(stripeCheckoutUrl({ status: "paid" }), null);
});

test("a stored attempt names its paid presets only for the user who started it", () => {
  const stored = checkoutAttempt(
    "user-a",
    ["grainau-1", "eibsee-1"],
    "/?view=cart",
    null,
    () => "request-id-0000000001",
  );
  assert.deepEqual(attemptPresetIds(stored, "user-a"), [
    "eibsee-1",
    "grainau-1",
  ]);
  assert.deepEqual(attemptPresetIds(stored, "user-b"), []);
  assert.deepEqual(attemptPresetIds({ key: "not json" }, "user-a"), []);
  assert.deepEqual(attemptPresetIds(null, "user-a"), []);
});
