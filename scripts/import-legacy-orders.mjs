// node --env-file=.env.local --import tsx scripts/import-legacy-orders.mjs <orders.csv>
// Syncs commerce_legacy_orders to a Lemon Squeezy orders export of the 2025 pack: upserts every
// order, deletes and revokes the ones no longer in the file, and grants confirmed email accounts
// that already exist. Re-running with the same file changes nothing. Prints counts, never emails.
import { readFile } from "node:fs/promises";

/** RFC 4180 rows; strips a UTF-8 BOM. */
function parseCsv(text) {
  const rows = [[]];
  let field = "";
  let quoted = false;
  for (let i = text.charCodeAt(0) === 0xfeff ? 1 : 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') field += text[++i];
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === "," || c === "\n") {
      rows.at(-1).push(field);
      field = "";
      if (c === "\n") rows.push([]);
    } else if (c !== "\r") field += c;
  }
  rows.at(-1).push(field);
  return rows.filter((row) => row.some(Boolean));
}

/** Every row is a paid 2025 pack order; key `identifier`, email `user_email`. */
export function parseLegacyOrders(text) {
  const [header, ...rows] = parseCsv(text);
  const id = header?.indexOf("identifier") ?? -1;
  const mail = header?.indexOf("user_email") ?? -1;
  if (id < 0 || mail < 0)
    throw new Error("expected identifier and user_email columns");
  const orders = new Map();
  for (const row of rows) {
    const orderId = row[id]?.trim();
    const email = row[mail]?.trim().toLowerCase();
    if (!orderId || !email?.includes("@"))
      throw new Error(`row ${rows.indexOf(row) + 2} has no order id or email`);
    orders.set(orderId, { orderId, email });
  }
  // An empty file would revoke every legacy grant.
  if (!orders.size) throw new Error("no orders in file");
  return [...orders.values()];
}

// No top-level await: the tests import parseLegacyOrders from a CommonJS build.
async function main() {
  const file = process.argv[2];
  if (!file) throw new Error("usage: import-legacy-orders.mjs <orders.csv>");
  const orders = parseLegacyOrders(await readFile(file, "utf8"));
  const [
    { default: postgres },
    { createPostgresCommerceStore },
    { syncLegacyOrders },
    { legacyPackPresetIds },
  ] = await Promise.all([
    import("postgres"),
    import("../src/lib/server/commerce/postgres.ts"),
    import("../src/lib/server/commerce/service.ts"),
    import("../src/lib/server/commerce/config.ts"),
  ]);
  const sql = postgres(process.env.DATABASE_URL, { prepare: false });
  try {
    const accounts = await sql`
      select id::text as "userId", lower(email) as email from auth.users
      where email_confirmed_at is not null and not is_anonymous
        and lower(email) = any(${sql.array(orders.map((o) => o.email))}::text[])`;
    const result = await syncLegacyOrders(
      createPostgresCommerceStore(sql),
      orders,
      accounts,
      legacyPackPresetIds,
    );
    console.log(
      `orders kept ${result.kept}, removed ${result.removed}, accounts granted ${result.granted}`,
    );
  } finally {
    await sql.end();
  }
}
if (import.meta.main) main();
