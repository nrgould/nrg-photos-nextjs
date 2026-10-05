-- Commerce ledger for src/lib/server/commerce/postgres.ts. Contract: docs/commerce-server-foundation.md.
-- RLS on with no policies: the publishable key reads nothing; the server connects as the database owner.
create table commerce_orders (
  id text primary key,
  user_id text not null,
  preset_ids text[] not null,
  subtotal_cents integer not null,
  discount_cents integer not null,
  total_cents integer not null,
  currency text not null,
  created_at bigint not null,
  return_path text not null,
  session_id text unique,
  payment_intent_id text unique,
  status text not null check (status in ('pending', 'paid', 'failed', 'expired', 'revoked'))
);
create index commerce_orders_user on commerce_orders (user_id);
create index commerce_orders_pending_presets on commerce_orders using gin (preset_ids) where status = 'pending';

create table commerce_checkout_requests (
  request_key text primary key,
  order_id text not null references commerce_orders (id)
);
create table commerce_events (id text primary key);
create table commerce_revoked_payments (payment_intent_id text primary key);
create table commerce_entitlements (
  user_id text not null,
  preset_id text not null,
  source_id text not null,
  kind text not null check (kind in ('order', 'reward')),
  revoked boolean not null default false,
  primary key (user_id, preset_id, source_id)
);
create table commerce_reward_claims (
  user_id text not null,
  campaign_id text not null,
  preset_id text not null,
  primary key (user_id, campaign_id)
);

alter table commerce_orders enable row level security;
alter table commerce_checkout_requests enable row level security;
alter table commerce_events enable row level security;
alter table commerce_revoked_payments enable row level security;
alter table commerce_entitlements enable row level security;
alter table commerce_reward_claims enable row level security;
