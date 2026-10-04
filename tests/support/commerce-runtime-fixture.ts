import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { MemoryCommerceStore } from "./commerce-memory-store";
import type { ConfigurationResult } from "../../src/lib/server/commerce/config";

async function main() {
  const hook = registerHooks({
    resolve(specifier, context, next) {
      if (
        specifier === "stripe" ||
        specifier === "postgres" ||
        specifier.startsWith("@supabase/")
      )
        throw new Error(
          `Unconfigured runtime attempted provider import: ${specifier}`,
        );
      return next(specifier, context);
    },
  });
  try {
    const { composeCommerceRuntime } =
      await import("../../src/lib/server/commerce-runtime");
    const configurations: ConfigurationResult[] = [
      { status: "disabled" },
      { status: "invalid" },
      {
        status: "configured",
        configuration: {
          mode: "stripe-test",
          origin: "https://photography.example",
          stripeSecretKey: "sk_test_fixture",
          webhookSecret: "whsec_fixture",
          supabaseUrl: "https://fixture.supabase.co",
          supabasePublishableKey: "sb_publishable_fixture",
          priceIds: { "signature-01": "price_fixture" },
          bulkCouponId: "coupon_fixture",
        },
      },
    ];
    for (const configuration of configurations)
      for (const adapters of [
        undefined,
        { store: new MemoryCommerceStore() },
      ]) {
        const handlers = await composeCommerceRuntime(configuration, adapters);
        assert.deepEqual(await handlers.availability().json(), {
          status: "unavailable",
        });
        for (const response of await Promise.all([
          handlers.checkout(
            new Request("https://photography.example/api/commerce/checkout", {
              method: "POST",
            }),
          ),
          handlers.webhook(
            new Request("https://photography.example/api/commerce/webhook", {
              method: "POST",
            }),
          ),
          handlers.ownership(),
          handlers.download("signature-01"),
          handlers.claimReward(
            new Request(
              "https://photography.example/api/commerce/reward-claim",
              { method: "POST" },
            ),
          ),
        ])) {
          assert.equal(response.status, 503);
          assert.equal(
            response.headers.get("cache-control"),
            "private, no-store",
          );
          assert.deepEqual(await response.json(), {
            error: "commerce_not_configured",
          });
        }
      }
    process.env.COMMERCE_MODE = "disabled";
    const [availability, checkout, ownership, download, reward, webhook] =
      await Promise.all([
        import("../../src/app/api/commerce/availability/route"),
        import("../../src/app/api/commerce/checkout/route"),
        import("../../src/app/api/commerce/ownership/route"),
        import("../../src/app/api/commerce/download/[presetId]/route"),
        import("../../src/app/api/commerce/reward-claim/route"),
        import("../../src/app/api/commerce/webhook/route"),
      ]);
    assert.deepEqual(await (await availability.GET()).json(), {
      status: "unavailable",
    });
    const request = () =>
      new Request("https://photography.example/api/commerce", {
        method: "POST",
      });
    for (const response of await Promise.all([
      checkout.POST(request()),
      ownership.GET(),
      reward.POST(request()),
      webhook.POST(request()),
      download.GET(request(), {
        params: Promise.resolve({ presetId: "signature-01" }),
      }),
    ]))
      assert.equal(response.status, 503);
  } finally {
    hook.deregister();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
