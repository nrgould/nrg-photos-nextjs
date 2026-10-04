import { CommerceError } from "./types";

/** Inject a verified server session lookup; identity never comes from request JSON. */
export function createSessionAuthenticator(
  auth: () => Promise<{ userId: string | null }>,
) {
  return async () => {
    const session = await auth();
    if (!session.userId) throw new CommerceError("unauthenticated", 401);
    return session.userId;
  };
}
