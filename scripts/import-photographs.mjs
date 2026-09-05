import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
const manifestPath = "src/lib/photo-manifest.json";
const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));
await fs.mkdir("public/photos", { recursive: true });
for (const item of manifest) {
  let input;
  if (item.origin.startsWith("Repository at ade778d: ")) {
    input = await fs.readFile(
      item.origin.replace("Repository at ade778d: ", ""),
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
  await fs.writeFile(
    path.join("public/photos", path.basename(item.src)),
    output,
  );
  const { width, height } = await sharp(output).metadata();
  item.width = width;
  item.height = height;
}
await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
console.log(`Rebuilt ${manifest.length} original photographs.`);
