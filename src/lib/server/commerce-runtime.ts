import "server-only";
import { presetCatalog } from "../preset-commerce";
import { readAccountConfiguration } from "./account-configuration";
import {
  legacyPackPresetIds,
  readCommerceConfiguration,
  type ConfigurationResult,
} from "./commerce/config";
import { createCommerceHandlers } from "./commerce/http";
import { createCommerceService } from "./commerce/service";
import { createStripeGateway } from "./commerce/stripe";
import { createSessionAuthenticator } from "./commerce/auth";
import type { CommerceStore, PrivateDelivery } from "./commerce/types";

const presetIds = presetCatalog.map(({ id }) => id);

export function getAccountPublicConfiguration() {
  const account = readAccountConfiguration(process.env);
  return account
    ? {
        supabaseUrl: account.supabaseUrl,
        publishableKey: account.publishableKey,
        captchaSiteKey: account.captchaSiteKey,
      }
    : null;
}

export async function composeCommerceRuntime(
  configuration: ConfigurationResult,
  adapters?: { store: CommerceStore; delivery?: PrivateDelivery },
) {
  if (
    configuration.status !== "configured" ||
    adapters?.store.durability !== "durable" ||
    // Live mode never sells what it cannot deliver.
    (configuration.configuration.mode === "stripe-live" && !adapters.delivery)
  )
    return createCommerceHandlers({ configuration });

  const [
    { default: Stripe },
    { createServerClient },
    { createClient },
    { cookies },
  ] = await Promise.all([
    import("stripe"),
    import("@supabase/ssr"),
    import("@supabase/supabase-js"),
    import("next/headers"),
  ]);
  const payments = createStripeGateway(
    new Stripe(configuration.configuration.stripeSecretKey, {
      maxNetworkRetries: 2,
      timeout: 10000,
    }),
    configuration.configuration,
  );
  const service = createCommerceService({
    policy: {
      presetIds,
      reward: { campaignId: "explore-2026", eligiblePresetIds: presetIds },
      legacyPackPresetIds,
    },
    store: adapters.store,
    payments,
    delivery: adapters.delivery,
  });
  return createCommerceHandlers({
    configuration,
    store: adapters.store,
    service,
    verifyGuest: async (token) => {
      const { data } = await createClient(
        configuration.configuration.supabaseUrl,
        configuration.configuration.supabasePublishableKey,
        { auth: { persistSession: false, autoRefreshToken: false } },
      ).auth.getClaims(token);
      return data?.claims.is_anonymous ? data.claims.sub : null;
    },
    authenticate: createSessionAuthenticator(async () => {
      const cookieStore = await cookies();
      const supabase = createServerClient(
        configuration.configuration.supabaseUrl,
        configuration.configuration.supabasePublishableKey,
        {
          cookies: {
            getAll: () => cookieStore.getAll(),
            setAll: (next) =>
              next.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options),
              ),
          },
        },
      );
      // getClaims verifies the JWT signature; getSession alone would trust the cookie.
      const { data } = await supabase.auth.getClaims();
      // Sign-in is by email code, and an email change applies only once its code is verified.
      return {
        userId: data?.claims.sub ?? null,
        email:
          data?.claims.email && !data.claims.is_anonymous
            ? data.claims.email
            : null,
      };
    }),
  });
}

let store: Promise<CommerceStore> | undefined;
async function durableStore(url: string) {
  store ??= Promise.all([
    import("postgres"),
    import("./commerce/postgres"),
  ]).then(([{ default: postgres }, { createPostgresCommerceStore }]) =>
    // Supabase's transaction pooler does not support prepared statements.
    createPostgresCommerceStore(postgres(url, { prepare: false })),
  );
  return store;
}

let delivery: Promise<PrivateDelivery> | undefined;
async function privateDelivery(supabaseUrl: string, secretKey: string) {
  delivery ??= Promise.all([
    import("@supabase/supabase-js"),
    import("./commerce/supabase-delivery"),
  ]).then(([{ createClient }, { createSupabaseDelivery }]) =>
    createSupabaseDelivery(
      createClient(supabaseUrl, secretKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      }),
      supabaseUrl,
    ),
  );
  return delivery;
}

export async function getCommerceHandlers() {
  // Deliberately no persistence fallback: without DATABASE_URL every operation stays 503.
  const configuration = readCommerceConfiguration(process.env, presetIds);
  const url = process.env.DATABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  return composeCommerceRuntime(
    configuration,
    configuration.status === "configured" && url
      ? {
          store: await durableStore(url),
          delivery: secretKey
            ? await privateDelivery(
                configuration.configuration.supabaseUrl,
                secretKey,
              )
            : undefined,
        }
      : undefined,
  );
}
