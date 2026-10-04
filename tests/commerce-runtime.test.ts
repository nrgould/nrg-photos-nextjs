import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readAccountConfiguration } from "../src/lib/server/account-configuration";

test("runtime refuses absent/non-durable persistence before either provider SDK can load", () => {
  execFileSync(
    process.execPath,
    [
      "--conditions=react-server",
      "--import",
      "tsx",
      "tests/support/commerce-runtime-fixture.ts",
    ],
    { cwd: process.cwd(), stdio: "pipe" },
  );
});

test("account UI configuration stays absent for disabled, partial, live or unsafe settings", () => {
  const env = {
    COMMERCE_MODE: "stripe-test",
    COMMERCE_ORIGIN: "https://photography.example",
    CLERK_SECRET_KEY: "sk_test_fixture",
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_fixture",
  };
  assert.equal(readAccountConfiguration({}), null);
  assert.equal(readAccountConfiguration(env)?.origin, env.COMMERCE_ORIGIN);
  for (const patch of [
    { COMMERCE_MODE: "live" },
    { COMMERCE_MODE: "disabled" },
    { CLERK_SECRET_KEY: "" },
    { CLERK_SECRET_KEY: "sk_live_fixture" },
    { NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_live_fixture" },
    { COMMERCE_ORIGIN: "http://public.example" },
    { COMMERCE_ORIGIN: "https://user:pass@photography.example" },
    { COMMERCE_ORIGIN: "https://photography.example/path" },
  ])
    assert.equal(readAccountConfiguration({ ...env, ...patch }), null);
});
