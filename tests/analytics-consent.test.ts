import { test } from "node:test";
import assert from "node:assert/strict";
import { consentAction } from "../src/lib/analytics";

test("a choice PostHog already holds is not sent again", () => {
  assert.equal(consentAction("granted", "granted"), null);
  assert.equal(consentAction("denied", "denied"), null);
});

test("no choice leaves PostHog cookieless", () => {
  assert.equal(consentAction("", "pending"), null);
});

test("a choice PostHog lacks is applied", () => {
  assert.equal(consentAction("granted", "pending"), "opt_in");
  assert.equal(consentAction("granted", "denied"), "opt_in");
  assert.equal(consentAction("denied", "pending"), "opt_out");
  assert.equal(consentAction("denied", "granted"), "opt_out");
});
