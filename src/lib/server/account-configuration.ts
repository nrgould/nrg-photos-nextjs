export function readAccountConfiguration(
  env: Readonly<Record<string, string | undefined>>,
) {
  if (
    env.COMMERCE_MODE !== "stripe-test" ||
    !env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.startsWith("sb_publishable_")
  )
    return null;
  try {
    const origin = new URL(env.COMMERCE_ORIGIN ?? "");
    const supabase = new URL(env.NEXT_PUBLIC_SUPABASE_URL ?? "");
    const local =
      origin.hostname === "localhost" || origin.hostname === "127.0.0.1";
    if (
      origin.username ||
      origin.password ||
      origin.search ||
      origin.hash ||
      origin.pathname !== "/" ||
      (origin.protocol !== "https:" &&
        !(local && origin.protocol === "http:")) ||
      supabase.protocol !== "https:" ||
      supabase.pathname !== "/"
    )
      return null;
    return {
      origin: origin.origin,
      supabaseUrl: supabase.origin,
      publishableKey: env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      captchaSiteKey: env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || null,
    };
  } catch {
    return null;
  }
}
