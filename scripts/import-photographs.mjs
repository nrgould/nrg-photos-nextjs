import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { createClient } from "@supabase/supabase-js";
// Run with: node --env-file=.env.local scripts/import-photographs.mjs
const bucket = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY,
  { auth: { persistSession: false } },
).storage.from("photos");
const manifestPath = "src/lib/photo-manifest.json";
const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));
for (const item of manifest) {
  let input;
  if (item.origin.startsWith("Repository at ade778d: ")) {
    input = await fs.readFile(
      item.origin.replace("Repository at ade778d: ", ""),
    );
  } else if (item.origin.startsWith("Stills: ")) {
    if (!process.env.STILLS_DIR)
      throw new Error("Set STILLS_DIR to the Stills archive folder");
    input = await fs.readFile(
      path.join(process.env.STILLS_DIR, item.origin.replace("Stills: ", "")),
    );
  } else {
    const url = new URL(item.origin);
    if (url.origin !== "https://nicholasgouldphoto.com")
      throw new Error("Unexpected image origin");
    const response = await fetch(url);
    if (!response.ok)
      throw new Error(`Image download failed: ${response.status} ${url}`);
    input = Buffer.from(await response.arrayBuffer());
  }
  const output = await sharp(input)
    .rotate()
    .resize({
      width: 2400,
      height: 2400,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: 88 })
    .toBuffer();
  const { error } = await bucket.upload(path.basename(item.src), output, {
    contentType: "image/webp",
    upsert: true,
  });
  if (error) throw new Error(`Upload failed: ${item.src}: ${error.message}`);
  const { width, height } = await sharp(output).metadata();
  item.width = width;
  item.height = height;
}
await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
console.log(`Rebuilt ${manifest.length} original photographs.`);
