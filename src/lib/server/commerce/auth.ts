import { CommerceError } from "./types";

/** Inject a verified server session lookup; identity never comes from request JSON. */
export function createSessionAuthenticator(
  auth: () => Promise<{ userId: string | null; emailAccount?: boolean }>,
) {
  /** `requireEmail` admits only a permanent account with a confirmed email, never a guest. */
  return async (requireEmail = false) => {
    const session = await auth();
    if (!session.userId) throw new CommerceError("unauthenticated", 401);
    if (requireEmail && !session.emailAccount)
      throw new CommerceError("email_required", 403);
    return session.userId;
  };
}
