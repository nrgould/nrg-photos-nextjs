import { CommerceError } from "./types";

/** Inject `auth` from @clerk/nextjs/server after configured Clerk proxy setup. */
export function createClerkAuthenticator(
  auth: () => Promise<{ userId: string | null }>,
) {
  return async () => {
    const session = await auth();
    if (!session.userId) throw new CommerceError("unauthenticated", 401);
    return session.userId;
  };
}
