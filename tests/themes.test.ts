import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveTheme, themeBootScript, themes } from "../src/lib/themes";

const boot = (stored: string | null) => {
  const dataset: Record<string, string> = {};
  new Function("localStorage", "document", themeBootScript)(
    { getItem: () => stored },
    { documentElement: { dataset } },
  );
  return dataset;
};

test("a stored theme resolves, anything else follows the system scheme", () => {
  assert.equal(resolveTheme("nord", false).id, "nord");
  assert.equal(resolveTheme("sepia", true).id, "dark");
  assert.equal(resolveTheme(null, false).id, "light");
});

test("the boot script applies every theme's scheme and palette before paint", () => {
  for (const theme of themes)
    assert.deepEqual(boot(theme.id), {
      photoTheme: theme.scheme,
      photoPalette: theme.id,
    });
  assert.deepEqual(boot("sepia"), {});
});

test("every theme has a swatch, and every palette beyond light and dark a token block", () => {
  const css = readFileSync("src/app/globals.css", "utf8");
  for (const { id } of themes) {
    assert.ok(css.includes(`[data-theme-preview="${id}"]`), id);
    if (id !== "light" && id !== "dark")
      assert.ok(css.includes(`html[data-photo-palette="${id}"]`), id);
  }
});
