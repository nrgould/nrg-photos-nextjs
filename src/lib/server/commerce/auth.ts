import { CommerceError } from "./types";

/**
 * Inject a verified server session lookup; identity never comes from request JSON.
 * `email` is set only for a permanent account with a confirmed email, never a guest.
 */
export function createSessionAuthenticator(
  auth: () => Promise<{ userId: string | null; email?: string | null }>,
) {
  /** `requireEmail` admits only an account with an email. */
  return async (requireEmail = false) => {
    const session = await auth();
    if (!session.userId) throw new CommerceError("unauthenticated", 401);
    if (requireEmail && !session.email)
      throw new CommerceError("email_required", 403);
    return { userId: session.userId, email: session.email ?? null };
  };
}
