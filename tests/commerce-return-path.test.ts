import { test } from "node:test";
import assert from "node:assert/strict";
import {
  checkoutReturnUrl,
  normalizeCommerceReturnPath,
} from "../src/lib/server/commerce/return-path";
import { CommerceError } from "../src/lib/server/commerce/types";

test("checkout return keeps known catalog state and canonical location in fixed application origin", () => {
  const input =
    "/presets?view=cart&query=alpine%20light&category=Landscape%20%26%20travel&preset=signature-01";
  const normalized = normalizeCommerceReturnPath(input);
  assert.equal(normalizeCommerceReturnPath(normalized), normalized);
  for (const outcome of ["returned", "cancelled"] as const) {
    const url = new URL(
      checkoutReturnUrl("https://photo.example", input, outcome),
    );
    assert.equal(url.origin, "https://photo.example");
    assert.equal(url.pathname, "/presets");
    assert.equal(url.searchParams.get("view"), "cart");
    assert.equal(url.searchParams.get("query"), "alpine light");
    assert.equal(url.searchParams.get("category"), "Landscape & travel");
    assert.equal(url.searchParams.get("preset"), "signature-01");
    assert.equal(url.searchParams.get("checkout"), outcome);
    assert.equal(url.searchParams.size, 5);
  }
  const map = new URL(
    checkoutReturnUrl(
      "https://photo.example",
      "/explore?location=location%3Aseceda&view=cart&query=alpine&category=Landscape%20%26%20travel&preset=signature-01",
      "returned",
    ),
  );
  assert.equal(map.pathname, "/explore");
  assert.equal(map.searchParams.get("location"), "location:seceda");
  assert.equal(map.searchParams.get("view"), "cart");
  assert.equal(map.searchParams.get("query"), "alpine");
  assert.equal(map.searchParams.get("category"), "Landscape & travel");
  assert.equal(map.searchParams.get("preset"), "signature-01");
  assert.equal(
    normalizeCommerceReturnPath("/explore?location=country%3Aitaly"),
    "/explore?location=country%3Aitaly",
  );
  assert.equal(normalizeCommerceReturnPath(), "/presets");
});

test("return paths reject redirect tricks, unknown or duplicated state, fragments and oversized queries", () => {
  for (const input of [
    "https://evil.example/presets",
    "https://photography.invalid/presets",
    "//evil.example/presets",
    "/\\evil.example/presets",
    "https://user:pass@photography.invalid/presets",
    "/other/../presets",
    " /presets",
    "/presets#main",
    "/presets#",
    "/presets?next=https://evil.example",
    "/presets?checkout=returned",
    "/presets?view=cart&view=catalog",
    "/presets?view=photos",
    "/presets?preset=signature-99",
    "/presets?preset=alpine-soft",
    "/presets?category=Other",
    `/presets?query=${"x".repeat(201)}`,
    `/presets?query=${"x".repeat(2048)}`,
    "/presets?query=%00bad",
    "/presets?query=%0abad",
    "/presets?location=location%3Aseceda",
    "/explore?view=photos",
    "/explore?view=cart&view=catalog",
    "/explore?query=alpine&next=https://evil.example",
    "/explore?preset=signature-99",
    "/explore?location=imaginary",
    "/explore?location=location%3Aseceda&location=location%3Ab raies",
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
    normalizeCommerceReturnPath(`/presets?query=${"x".repeat(200)}`),
  );
});
