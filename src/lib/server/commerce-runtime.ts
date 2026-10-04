import "server-only";
import { presetCatalog } from "../preset-commerce";
import { readAccountConfiguration } from "./account-configuration";
import {
  readCommerceConfiguration,
  type ConfigurationResult,
} from "./commerce/config";
import { createCommerceHandlers } from "./commerce/http";
import { createCommerceService } from "./commerce/service";
import { createStripeGateway } from "./commerce/stripe";
import { createClerkAuthenticator } from "./commerce/clerk";
import type { CommerceStore, PrivateDelivery } from "./commerce/types";

const presetIds = presetCatalog.map(({ id }) => id);

export function getAccountPublicConfiguration() {
  const account = readAccountConfiguration(process.env);
  return account ? { publishableKey: account.publishableKey } : null;
}

export async function composeCommerceRuntime(
  configuration: ConfigurationResult,
  adapters?: { store: CommerceStore; delivery?: PrivateDelivery },
) {
  if (
    configuration.status !== "configured" ||
    adapters?.store.durability !== "durable"
  )
    return createCommerceHandlers({ configuration });

  const [{ default: Stripe }, { auth }] = await Promise.all([
    import("stripe"),
    import("@clerk/nextjs/server"),
  ]);
  const payments = createStripeGateway(
    new Stripe(configuration.configuration.stripeSecretKey, {
      maxNetworkRetries: 2,
      timeout: 10000,
    }),
    configuration.configuration,
  );
  const service = createCommerceService({
    policy: { presetIds },
    store: adapters.store,
    payments,
    delivery: adapters.delivery,
  });
  return createCommerceHandlers({
    configuration,
    store: adapters.store,
    service,
    authenticate: createClerkAuthenticator(auth),
  });
}

export async function getCommerceHandlers() {
  // Deliberately no persistence fallback. Wire an approved durable adapter here before enabling test checkout.
  return composeCommerceRuntime(
    readCommerceConfiguration(process.env, presetIds),
  );
}
