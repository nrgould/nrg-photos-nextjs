import test from "node:test";
import assert from "node:assert/strict";
import { createSelectionFeedback } from "../src/lib/haptics";

test("unsupported environments never call vibration, and supported selection pulses are short and rate-limited", () => {
  let available = false;
  let now = 0;
  const calls: number[] = [];
  const feedback = createSelectionFeedback({
    available: () => available,
    now: () => now,
    vibrate: (duration) => {
      calls.push(duration);
      return true;
    },
  });
  assert.equal(feedback(), false);
  assert.deepEqual(calls, []);
  available = true;
  assert.equal(feedback(), true);
  for (now = 1; now < 100; now++) assert.equal(feedback(), false);
  assert.deepEqual(calls, [8]);
  assert.equal(feedback(), true);
  assert.deepEqual(calls, [8, 8]);
});

test("browser refusal or an exception never breaks the primary action or creates retry loops", () => {
  for (const vibrate of [
    () => false,
    () => {
      throw new Error("disabled");
    },
  ]) {
    let calls = 0;
    const feedback = createSelectionFeedback({
      available: () => true,
      now: () => 0,
      vibrate: () => {
        calls++;
        return vibrate();
      },
    });
    assert.equal(feedback(), false);
    assert.equal(feedback(), false);
    assert.equal(calls, 1);
  }
});
