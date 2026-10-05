import { test } from "node:test";
import assert from "node:assert/strict";
import {
  checkoutReturnUrl,
  normalizeCommerceReturnPath,
} from "../src/lib/server/commerce/return-path";
import { CommerceError } from "../src/lib/server/commerce/types";

test("checkout return keeps known catalog state and canonical location in fixed application origin", () => {
  const input =
    "/?view=cart&query=alpine%20light&category=Alpine%20Blue&preset=eibsee-1";
  const normalized = normalizeCommerceReturnPath(input);
  assert.equal(normalizeCommerceReturnPath(normalized), normalized);
  for (const outcome of ["returned", "cancelled"] as const) {
    const url = new URL(
      checkoutReturnUrl("https://photo.example", input, outcome),
    );
    assert.equal(url.origin, "https://photo.example");
    assert.equal(url.pathname, "/");
    assert.equal(
      url.searchParams.get("view"),
      outcome === "returned" ? "library" : "cart",
    );
    assert.equal(url.searchParams.get("query"), "alpine light");
    assert.equal(url.searchParams.get("category"), "Alpine Blue");
    assert.equal(url.searchParams.get("preset"), "eibsee-1");
    assert.equal(url.searchParams.get("checkout"), outcome);
    assert.equal(url.searchParams.size, 5);
  }
  const map = new URL(
    checkoutReturnUrl(
      "https://photo.example",
      "/?location=location%3Aseceda&view=cart&query=alpine&category=Alpine%20Blue&preset=eibsee-1",
      "returned",
    ),
  );
  assert.equal(map.pathname, "/");
  assert.equal(map.searchParams.get("location"), "location:seceda");
  assert.equal(map.searchParams.get("view"), "library");
  assert.equal(map.searchParams.get("query"), "alpine");
  assert.equal(map.searchParams.get("category"), "Alpine Blue");
  assert.equal(map.searchParams.get("preset"), "eibsee-1");
  assert.equal(
    normalizeCommerceReturnPath("/?location=country%3Aitaly"),
    "/?location=country%3Aitaly",
  );
  assert.equal(normalizeCommerceReturnPath(), "/");
});

test("return paths reject redirect tricks, unknown or duplicated state, fragments and oversized queries", () => {
  for (const input of [
    "https://evil.example/presets",
    "https://photography.invalid/presets",
    "//evil.example/presets",
    "/\\evil.example/presets",
    "https://user:pass@photography.invalid/presets",
    "/other/../presets",
    " /",
    "/#main",
    "/#",
    "/?next=https://evil.example",
    "/?checkout=returned",
    "/?view=cart&view=catalog",
    "/?view=photos",
    "/?preset=signature-99",
    "/?preset=alpine-soft",
    "/?category=Other",
    `/?query=${"x".repeat(201)}`,
    `/?query=${"x".repeat(2048)}`,
    "/?query=%00bad",
    "/?query=%0abad",
    "/?location=location%3Anowhere",
    "/?view=photos",
    "/?view=cart&view=catalog",
    "/?query=alpine&next=https://evil.example",
    "/?preset=signature-99",
    "/?location=imaginary",
    "/?location=location%3Aseceda&location=location%3Ab raies",
    null,
    42,
    {},
  ])
    assert.throws(
      () => normalizeCommerceReturnPath(input),
      (error: unknown) =>
        error instanceof CommerceError && error.code === "invalid_return_path",
      String(input),
    );
  assert.doesNotThrow(() =>
    normalizeCommerceReturnPath(`/?query=${"x".repeat(200)}`),
  );
});
