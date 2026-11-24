-- Add month label for each customer's opening due balance.
alter table public.customers
  add column if not exists due_month text;

comment on column public.customers.due_month is
  'Billing month for the customer opening due amount, stored as YYYY-MM.';
