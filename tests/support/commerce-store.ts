import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import postgres from "postgres";
import { createPostgresCommerceStore } from "../../src/lib/server/commerce/postgres";
import type { CommerceStore } from "../../src/lib/server/commerce/types";
import { MemoryCommerceStore } from "./commerce-memory-store";

const url = process.env.COMMERCE_TEST_DATABASE_URL;
const migration = [
  "20261004000000_commerce.sql",
  "20261005020000_commerce_legacy_orders.sql",
]
  .map((file) =>
    readFileSync(
      new URL(`../../supabase/migrations/${file}`, import.meta.url),
      "utf8",
    ),
  )
  .join("\n");
const open: { sql: postgres.Sql; schema: string }[] = [];

/** Memory store by default; with COMMERCE_TEST_DATABASE_URL (session pooler) a throwaway Postgres schema. */
export function makeStore(): CommerceStore {
  if (!url) return new MemoryCommerceStore();
  const schema = `commerce_test_${randomUUID().slice(0, 8)}`;
  const sql = postgres(url, {
    prepare: false,
    onnotice: () => {},
    connection: { search_path: schema },
  });
  open.push({ sql, schema });
  const ready = sql
    .unsafe(`create schema ${schema}`)
    .then(() => sql.unsafe(migration).simple());
  const store = createPostgresCommerceStore(sql);
  return {
    durability: store.durability,
    transaction: async (work) => (await ready, store.transaction(work)),
  };
}

export async function dropStores() {
  for (const { sql, schema } of open.splice(0)) {
    await sql.unsafe(`drop schema if exists ${schema} cascade`);
    await sql.end();
  }
}
