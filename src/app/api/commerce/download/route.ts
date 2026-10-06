import { getCommerceHandlers } from "@/lib/server/commerce-runtime";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
  return (await getCommerceHandlers()).downloadAll();
}
