import postgres from "postgres";

/** Preview deployments (behind Vercel protection) and local dev may mark photos for removal. */
export const curating = () =>
  process.env.VERCEL_ENV === "preview" ||
  process.env.NODE_ENV === "development";

let sql: postgres.Sql | undefined;
export function curateDatabase() {
  const url = process.env.DATABASE_URL;
  if (!curating() || !url) return null;
  // Supabase's transaction pooler does not support prepared statements.
  return (sql ??= postgres(url, { prepare: false }));
}
