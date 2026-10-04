import {
  NextResponse,
  type NextFetchEvent,
  type NextRequest,
} from "next/server";
import { readAccountConfiguration } from "./lib/server/account-configuration";

export default async function proxy(
  request: NextRequest,
  event: NextFetchEvent,
) {
  const configuration = readAccountConfiguration(process.env);
  if (
    !configuration ||
    [
      "/api/contact",
      "/api/commerce/availability",
      "/api/commerce/webhook",
    ].includes(request.nextUrl.pathname)
  )
    return NextResponse.next();
  const { clerkMiddleware } = await import("@clerk/nextjs/server");
  return clerkMiddleware({
    secretKey: configuration.secretKey,
    publishableKey: configuration.publishableKey,
    authorizedParties: [configuration.origin],
  })(request, event);
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/(.*)",
  ],
};
