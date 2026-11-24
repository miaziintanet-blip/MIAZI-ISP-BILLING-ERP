-- MIAZI ISP ERP: additive MaXim-style feature migration
-- Safe additive migration: does not drop or overwrite existing customer/payment data.
create extension if not exists pgcrypto;

alter table public.customers
  add column if not exists mac_address text,
  add column if not exists nid text,
  add column if not exists customer_code text,
  add column if not exists connection_date date,
  add column if not exists import_key text,
  add column if not exists customer_type text not null default 'home'
    check (customer_type in ('home','soho','corporate')),
  add column if not exists email text,
  add column if not exists pop_id uuid,
  add column if not exists area_id uuid,
  add column if not exists box_id uuid,
  add column if not exists bill_cycle integer not null default 1
    check (bill_cycle between 1 and 28);

create unique index if not exists customers_import_key_uidx
  on public.customers(import_key) where import_key is not null;
create index if not exists customers_customer_code_idx on public.customers(customer_code);
create index if not exists customers_mac_address_idx on public.customers(mac_address);

create table if not exists public.pops (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  contact_person text,
  phone text,
  notes text,
  created_at timestamptz not null default now()
);
create table if not exists public.areas (
  id uuid primary key default gen_random_uuid(),
  pop_id uuid references public.pops(id) on delete set null,
  name text not null,
  notes text,
  created_at timestamptz not null default now()
);
create table if not exists public.boxes (
  id uuid primary key default gen_random_uuid(),
  pop_id uuid references public.pops(id) on delete set null,
  area_id uuid references public.areas(id) on delete set null,
  name text not null,
  splitter_ratio text,
  capacity integer,
  notes text,
  created_at timestamptz not null default now()
);
do $$ begin
  alter table public.customers add constraint customers_pop_id_fkey
    foreign key (pop_id) references public.pops(id) on delete set null;
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.customers add constraint customers_area_id_fkey
    foreign key (area_id) references public.areas(id) on delete set null;
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.customers add constraint customers_box_id_fkey
    foreign key (box_id) references public.boxes(id) on delete set null;
exception when duplicate_object then null; end $$;

create table if not exists public.tickets (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(id) on delete set null,
  subject text not null,
  description text,
  priority text not null default 'normal'
    check (priority in ('low','normal','high','urgent')),
  status text not null default 'open'
    check (status in ('open','in_progress','resolved','closed')),
  assigned_to text,
  opened_at timestamptz not null default now(),
  closed_at timestamptz
);
create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete restrict,
  invoice_no text not null unique,
  billing_month date not null,
  amount numeric(12,2) not null check (amount >= 0),
  paid_amount numeric(12,2) not null default 0 check (paid_amount >= 0),
  status text not null default 'unpaid'
    check (status in ('unpaid','partial','paid','void')),
  due_date date,
  created_at timestamptz not null default now(),
  unique(customer_id,billing_month)
);
create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  description text,
  amount numeric(12,2) not null check (amount > 0),
  expense_date date not null default current_date,
  payment_method text,
  created_at timestamptz not null default now()
);
create table if not exists public.sms_logs (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(id) on delete set null,
  phone text not null,
  message text not null,
  status text not null default 'queued',
  provider_ref text,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.pops enable row level security;
alter table public.areas enable row level security;
alter table public.boxes enable row level security;
alter table public.tickets enable row level security;
alter table public.invoices enable row level security;
alter table public.expenses enable row level security;
alter table public.sms_logs enable row level security;

do $$ declare t text; begin
  foreach t in array array['pops','areas','boxes','tickets','invoices','expenses','sms_logs'] loop
    execute format('drop policy if exists "auth users manage %s" on public.%I', t, t);
    execute format('create policy "auth users manage %s" on public.%I for all to authenticated using (true) with check (true)', t, t);
  end loop;
end $$;

create index if not exists tickets_status_idx on public.tickets(status);
create index if not exists tickets_customer_idx on public.tickets(customer_id);
create index if not exists invoices_customer_idx on public.invoices(customer_id);
create index if not exists invoices_month_idx on public.invoices(billing_month desc);
create index if not exists expenses_date_idx on public.expenses(expense_date desc);
