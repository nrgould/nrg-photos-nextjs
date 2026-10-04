export function readAccountConfiguration(
  env: Readonly<Record<string, string | undefined>>,
) {
  if (
    env.COMMERCE_MODE !== "stripe-test" ||
    !env.CLERK_SECRET_KEY?.startsWith("sk_test_") ||
    !env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.startsWith("pk_test_")
  )
    return null;
  try {
    const origin = new URL(env.COMMERCE_ORIGIN ?? "");
    const local =
      origin.hostname === "localhost" || origin.hostname === "127.0.0.1";
    if (
      origin.username ||
      origin.password ||
      origin.search ||
      origin.hash ||
      origin.pathname !== "/" ||
      (origin.protocol !== "https:" && !(local && origin.protocol === "http:"))
    )
      return null;
    return {
      origin: origin.origin,
      secretKey: env.CLERK_SECRET_KEY,
      publishableKey: env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
    };
  } catch {
    return null;
  }
}
