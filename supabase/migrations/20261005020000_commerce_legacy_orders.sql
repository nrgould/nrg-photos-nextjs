-- Lemon Squeezy 2025 pack orders, synced by scripts/import-legacy-orders.mjs. Contract: docs/commerce-server-foundation.md.
-- Email is stored lowercased and trimmed. RLS on with no policies, like every commerce table.
create table commerce_legacy_orders (
  order_id text primary key,
  email text not null
);
create index commerce_legacy_orders_email on commerce_legacy_orders (email);

alter table commerce_legacy_orders enable row level security;
