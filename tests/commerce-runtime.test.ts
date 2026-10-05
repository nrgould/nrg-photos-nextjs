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
    NEXT_PUBLIC_SUPABASE_URL: "https://fixture.supabase.co",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_fixture",
  };
  assert.equal(readAccountConfiguration({}), null);
  assert.equal(readAccountConfiguration(env)?.origin, env.COMMERCE_ORIGIN);
  assert.equal(
    readAccountConfiguration({ ...env, COMMERCE_MODE: "stripe-live" })?.origin,
    env.COMMERCE_ORIGIN,
  );
  for (const patch of [
    { COMMERCE_MODE: "live" },
    { COMMERCE_MODE: "disabled" },
    { NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "" },
    { NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "eyJ.legacy-anon" },
    { NEXT_PUBLIC_SUPABASE_URL: "http://fixture.supabase.co" },
    { COMMERCE_ORIGIN: "http://public.example" },
    { COMMERCE_ORIGIN: "https://user:pass@photography.example" },
    { COMMERCE_ORIGIN: "https://photography.example/path" },
  ])
    assert.equal(readAccountConfiguration({ ...env, ...patch }), null);
});
