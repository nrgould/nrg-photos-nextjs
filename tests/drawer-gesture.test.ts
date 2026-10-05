import test from "node:test";
import assert from "node:assert/strict";
import {
  drawerOwnsGesture,
  shouldDismissDrawer,
} from "../src/lib/drawer-gesture";

test("expanded content keeps scrolling until the top boundary, while chrome can always drag", () => {
  for (const distanceY of [-200, 200]) {
    assert.equal(
      drawerOwnsGesture({
        distanceY,
        scrollTop: 200,
        canScroll: true,
        expanded: true,
      }),
      false,
    );
    assert.equal(
      drawerOwnsGesture({
        distanceY,
        scrollTop: 0,
        canScroll: false,
        expanded: true,
      }),
      true,
    );
  }
  assert.equal(
    drawerOwnsGesture({
      distanceY: -200,
      scrollTop: 0,
      canScroll: true,
      expanded: true,
    }),
    false,
  );
  assert.equal(
    drawerOwnsGesture({
      distanceY: 200,
      scrollTop: 0,
      canScroll: true,
      expanded: true,
    }),
    true,
  );
});

test("compact photos stay draggable in both directions", () => {
  for (const distanceY of [-80, 80])
    assert.equal(
      drawerOwnsGesture({
        distanceY,
        scrollTop: 0,
        canScroll: true,
        expanded: false,
      }),
      true,
    );
});

test("a deliberate downward pull can dismiss from each snap without requiring a fast flick", () => {
  for (const height of [180, 211, 633, 844]) {
    assert.equal(shouldDismissDrawer(20, height), false);
    assert.equal(shouldDismissDrawer(-400, height), false);
    assert.equal(shouldDismissDrawer(Math.min(240, height / 2), height), true);
  }
  assert.equal(shouldDismissDrawer(400, 0), false);
});
