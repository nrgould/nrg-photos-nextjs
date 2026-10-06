-- The email entered at Stripe Checkout. Signing in with it claims the order on any device.
alter table commerce_orders add column email text;
create index commerce_orders_paid_email on commerce_orders (email) where status = 'paid';
