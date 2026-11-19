-- Miazi ISP Billing & ERP — initial Supabase schema
-- Run in Supabase Dashboard > SQL Editor > New query.
-- This starter uses authenticated-user access. Create the first admin user in
-- Authentication > Users (or enable sign-up temporarily), then sign in.
create extension if not exists pgcrypto;

create table if not exists public.packages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  speed text,
  price numeric(12,2) not null default 0 check (price >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null,
  username text,
  address text,
  package_id uuid references public.packages(id) on delete set null,
  monthly_fee numeric(12,2) not null default 0 check (monthly_fee >= 0),
  status text not null default 'active' check (status in ('active','inactive','suspended')),
  due_amount numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete restrict,
  amount numeric(12,2) not null check (amount > 0),
  method text not null default 'Cash',
  note text,
  paid_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.packages enable row level security;
alter table public.customers enable row level security;
alter table public.payments enable row level security;

-- Initial MVP policy: signed-in staff can access ERP data.
-- For production, replace with role-based policies and staff permissions.
drop policy if exists "auth users manage packages" on public.packages;
create policy "auth users manage packages" on public.packages
for all to authenticated using (true) with check (true);

drop policy if exists "auth users manage customers" on public.customers;
create policy "auth users manage customers" on public.customers
for all to authenticated using (true) with check (true);

drop policy if exists "auth users manage payments" on public.payments;
create policy "auth users manage payments" on public.payments
for all to authenticated using (true) with check (true);

create index if not exists customers_phone_idx on public.customers(phone);
create index if not exists customers_status_idx on public.customers(status);
create index if not exists payments_customer_idx on public.payments(customer_id);
create index if not exists payments_paid_at_idx on public.payments(paid_at desc);
