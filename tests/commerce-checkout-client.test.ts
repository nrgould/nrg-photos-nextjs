import { test } from "node:test";
import assert from "node:assert/strict";
import {
  checkoutAttempt,
  checkoutReturnPath,
  currentOwnership,
  stripeCheckoutUrl,
  verifiedOwnership,
} from "../src/lib/commerce-checkout-client";

const createId = () => "fixture-request-00001";
test("checkout retry identity survives sorting, duplicate cart IDs and return query ordering", () => {
  const first = checkoutAttempt(
    "user-A",
    ["signature-01", "signature-02"],
    "/presets?view=cart&query=travel",
    null,
    createId,
  );
  const retry = checkoutAttempt(
    "user-A",
    ["signature-02", "signature-01", "signature-01"],
    "/presets?query=travel&view=cart&checkout=cancelled",
    JSON.parse(JSON.stringify(first)),
    () => {
      throw new Error("Must reuse retry identity");
    },
  );
  assert.deepEqual(retry, first);
  assert.equal(
    checkoutReturnPath("/presets?checkout=returned&view=cart#stale"),
    "/presets?view=cart",
  );
  for (const [user, ids, path] of [
    [
      "user-B",
      ["signature-01", "signature-02"],
      "/presets?view=cart&query=travel",
    ],
    ["user-A", ["signature-01"], "/presets?view=cart&query=travel"],
    ["user-A", ["signature-01", "signature-02"], "/explore"],
  ] as const)
    assert.equal(
      checkoutAttempt(user, ids, path, first, () => "fixture-request-00002")
        .requestId,
      "fixture-request-00002",
    );
  for (const ids of [[], ["invented"], ["signature-01", "invented"]])
    assert.throws(() =>
      checkoutAttempt("user-A", ids, "/presets", null, createId),
    );
  assert.throws(() =>
    checkoutAttempt("", ["signature-01"], "/presets", null, createId),
  );
  assert.throws(() =>
    checkoutAttempt("user-A", ["signature-01"], "/presets", null, () => "bad"),
  );
});

test("malformed stored retry identity is replaced and external return URLs never enter the request key", () => {
  const valid = checkoutAttempt(
    "user-A",
    ["signature-01"],
    "/presets",
    null,
    createId,
  );
  for (const prior of [
    null,
    [],
    "forged",
    { ...valid, requestId: "" },
    { ...valid, requestId: "x".repeat(101) },
  ])
    assert.equal(
      checkoutAttempt("user-A", ["signature-01"], "/presets", prior, createId)
        .requestId,
      createId(),
    );
  assert.equal(checkoutReturnPath("https://evil.example/presets"), "/presets");
});

test("only verified published ownership is accepted; account switch, sign-out and refresh immediately invalidate snapshots", () => {
  assert.deepEqual(
    verifiedOwnership({
      status: "verified",
      presetIds: ["signature-01", "signature-01"],
    }),
    ["signature-01"],
  );
  assert.deepEqual(
    verifiedOwnership({ status: "verified", presetIds: [] }),
    [],
  );
  for (const value of [
    null,
    { status: "unavailable", presetIds: ["signature-01"] },
    { status: "verified", presetIds: ["forged"] },
    { status: "verified", presetIds: "signature-01" },
    { checkout: "returned" },
  ])
    assert.equal(verifiedOwnership(value), null);
  const snapshot = {
    sessionKey: "session-A:user-A",
    revision: 2,
    presetIds: ["signature-01"],
  };
  assert.deepEqual(currentOwnership(snapshot, snapshot.sessionKey, 2, true), [
    "signature-01",
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
    "/presets",
  ])
    assert.equal(stripeCheckoutUrl({ url }), null);
  assert.equal(stripeCheckoutUrl({ status: "paid" }), null);
});
