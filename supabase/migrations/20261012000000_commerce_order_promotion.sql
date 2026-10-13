-- A Stripe promotion code the buyer entered; the session is rebuilt from the order on retry.
alter table commerce_orders add column promotion_code_id text;
