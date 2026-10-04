import { getCommerceHandlers } from "@/lib/server/commerce-runtime";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(
  _request: Request,
  context: { params: Promise<{ presetId: string }> },
) {
  const { presetId } = await context.params;
  return (await getCommerceHandlers()).download(presetId);
}
