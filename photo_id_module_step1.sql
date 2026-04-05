-- =========================================================
-- 1) BỔ SUNG CỘT CHO transactions
-- =========================================================

alter table public.transactions
add column if not exists payment_method text,
add column if not exists reference_type text,
add column if not exists reference_id text;

create index if not exists idx_transactions_reference_type_id
on public.transactions(reference_type, reference_id);

create index if not exists idx_transactions_payment_method
on public.transactions(payment_method);


-- =========================================================
-- 2) BẢNG ĐƠN ẢNH THẺ
-- =========================================================

create table if not exists public.photo_id_orders (
  id uuid primary key default gen_random_uuid(),
  order_code text not null unique,
  order_datetime timestamp with time zone not null default now(),

  customer_id text null references public.customers(id),
  customer_name text not null,
  customer_phone text not null,

  print_paper_quantity integer not null default 0 check (print_paper_quantity >= 0),
  amount numeric not null default 0 check (amount >= 0),

  payment_method text,
  drive_file_url text,
  drive_file_id text,
  note text,

  status text not null default 'completed',
  is_reprint boolean not null default false,
  original_order_id uuid null references public.photo_id_orders(id),

  transaction_id text null,
  created_by text null references public.staff(id),
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create index if not exists idx_photo_id_orders_phone
on public.photo_id_orders(customer_phone);

create index if not exists idx_photo_id_orders_datetime
on public.photo_id_orders(order_datetime desc);

create index if not exists idx_photo_id_orders_customer_id
on public.photo_id_orders(customer_id);


-- =========================================================
-- 3) BẢNG KHO GIẤY ẢNH THẺ
-- =========================================================

create table if not exists public.photo_paper_inventory (
  id uuid primary key default gen_random_uuid(),
  paper_name text not null unique,
  unit text not null default 'tờ',
  current_quantity integer not null default 0,
  warning_threshold integer not null default 20,
  average_cost numeric not null default 0,
  is_active boolean not null default true,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);


-- =========================================================
-- 4) BẢNG NHẬT KÝ NHẬP / XUẤT KHO GIẤY
-- =========================================================

create table if not exists public.photo_paper_stock_movements (
  id uuid primary key default gen_random_uuid(),
  paper_inventory_id uuid not null references public.photo_paper_inventory(id),
  movement_type text not null check (movement_type in ('IN','OUT','ADJUST')),

  quantity integer not null check (quantity >= 0),
  unit_cost numeric not null default 0 check (unit_cost >= 0),
  total_cost numeric not null default 0 check (total_cost >= 0),

  related_photo_order_id uuid null references public.photo_id_orders(id),
  note text,
  created_by text null references public.staff(id),
  created_at timestamp with time zone not null default now()
);

create index if not exists idx_photo_paper_stock_movements_inventory
on public.photo_paper_stock_movements(paper_inventory_id, created_at desc);


-- =========================================================
-- 5) VIEW TRA CỨU TỒN KHO + CẢNH BÁO
-- =========================================================

create or replace view public.photo_paper_inventory_view as
select
  i.id,
  i.paper_name,
  i.unit,
  i.current_quantity,
  i.warning_threshold,
  i.average_cost,
  i.is_active,
  case
    when i.current_quantity <= i.warning_threshold then true
    else false
  end as is_low_stock,
  i.created_at,
  i.updated_at
from public.photo_paper_inventory i;


-- =========================================================
-- 6) HÀM TẠO MÃ ĐƠN ẢNH THẺ
-- =========================================================

create table if not exists public.photo_id_order_counters (
  prefix text primary key,
  current_count integer not null default 0
);

create or replace function public.get_next_photo_id_order_code()
returns text
language plpgsql
as $$
declare
  v_prefix text;
  v_next integer;
  v_code text;
begin
  v_prefix := 'AT' || to_char(now(), 'YYMMDD');

  insert into public.photo_id_order_counters(prefix, current_count)
  values (v_prefix, 0)
  on conflict (prefix) do nothing;

  update public.photo_id_order_counters
  set current_count = current_count + 1
  where prefix = v_prefix
  returning current_count into v_next;

  v_code := v_prefix || '-' || lpad(v_next::text, 4, '0');
  return v_code;
end;
$$;


-- =========================================================
-- 7) HÀM CẬP NHẬT updated_at
-- =========================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_photo_id_orders_updated_at on public.photo_id_orders;
create trigger trg_photo_id_orders_updated_at
before update on public.photo_id_orders
for each row execute function public.set_updated_at();

drop trigger if exists trg_photo_paper_inventory_updated_at on public.photo_paper_inventory;
create trigger trg_photo_paper_inventory_updated_at
before update on public.photo_paper_inventory
for each row execute function public.set_updated_at();


insert into public.photo_paper_inventory (paper_name, unit, current_quantity, warning_threshold, average_cost)
values
('Giấy ảnh thẻ mặc định', 'tờ', 0, 20, 0)
on conflict (paper_name) do nothing;


