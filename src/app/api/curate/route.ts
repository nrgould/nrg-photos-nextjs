import manifest from "@/lib/photo-manifest.json";
import { curateDatabase } from "@/lib/server/curate";
export const runtime = "nodejs";
const photoSrcs = new Set(manifest.map((entry) => entry.src));

export async function GET() {
  const sql = curateDatabase();
  if (!sql) return new Response(null, { status: 404 });
  const rows = await sql<{ src: string }[]>`select src from photo_removals`;
  return Response.json({
    srcs: rows.map((row) => row.src).filter((src) => photoSrcs.has(src)),
  });
}

export async function POST(request: Request) {
  const sql = curateDatabase();
  if (!sql) return new Response(null, { status: 404 });
  const body = await request.json().catch(() => null);
  if (
    typeof body?.src !== "string" ||
    !photoSrcs.has(body.src) ||
    typeof body.removed !== "boolean"
  )
    return new Response(null, { status: 400 });
  if (body.removed)
    await sql`insert into photo_removals (src) values (${body.src}) on conflict do nothing`;
  else await sql`delete from photo_removals where src = ${body.src}`;
  return new Response(null, { status: 204 });
}
