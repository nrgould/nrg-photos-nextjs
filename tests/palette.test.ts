import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const rawColor = /#[0-9a-f]{3,8}\b|\b(?:rgba?|hsla?|oklch|oklab|lab|lch)\(/i;

test("raw colors live only in the :root token block", () => {
  const css = readFileSync("src/app/globals.css", "utf8");
  const root = css.match(/:root\s*\{[^}]*\}/);
  assert.ok(root, ":root token block missing");
  const outside = css.replace(root[0], "").split("\n");
  const hits = outside.filter((line) => rawColor.test(line));
  assert.deepEqual(hits, [], "use a token from :root instead");
});

test("components use tokens, never raw or default-palette colors", () => {
  const files = (dir: string): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
      e.isDirectory()
        ? files(join(dir, e.name))
        : e.name.endsWith(".tsx")
          ? [join(dir, e.name)]
          : [],
    );
  const palette =
    /\b(?:bg|text|border|fill|stroke|ring|outline|shadow|from|via|to)-(?:white|black|slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)\b/;
  const hits = files("src").flatMap((f) =>
    readFileSync(f, "utf8")
      .split("\n")
      .filter((line) => rawColor.test(line) || palette.test(line))
      .map((line) => `${f}: ${line.trim()}`),
  );
  assert.deepEqual(hits, []);
});
