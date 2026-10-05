import manifest from "@/lib/photo-manifest.json";
import { curateDatabase } from "@/lib/server/curate";
export const runtime = "nodejs";
const photoSrcs = new Set(manifest.map((entry) => entry.src));
const marks = ["remove", "hero"] as const;

export async function GET() {
  const sql = curateDatabase();
  if (!sql) return new Response(null, { status: 404 });
  const rows = await sql<
    { src: string; mark: (typeof marks)[number] }[]
  >`select src, mark from photo_removals`;
  const live = rows.filter((row) => photoSrcs.has(row.src));
  return Response.json(
    Object.fromEntries(
      marks.map((mark) => [
        mark,
        live.filter((row) => row.mark === mark).map((row) => row.src),
      ]),
    ),
  );
}

export async function POST(request: Request) {
  const sql = curateDatabase();
  if (!sql) return new Response(null, { status: 404 });
  const body = await request.json().catch(() => null);
  if (
    typeof body?.src !== "string" ||
    !photoSrcs.has(body.src) ||
    !marks.includes(body.mark) ||
    typeof body.on !== "boolean"
  )
    return new Response(null, { status: 400 });
  if (body.on)
    await sql`insert into photo_removals (src, mark) values (${body.src}, ${body.mark}) on conflict do nothing`;
  else
    await sql`delete from photo_removals where src = ${body.src} and mark = ${body.mark}`;
  return new Response(null, { status: 204 });
}
