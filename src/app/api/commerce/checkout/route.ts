import { getCommerceHandlers } from "@/lib/server/commerce-runtime";
export const runtime = "nodejs";
export async function POST(request: Request) {
  return (await getCommerceHandlers()).checkout(request);
}
