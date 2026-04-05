
-- =========================================================
-- MODULE QUẢN LÝ GIAO NHẬN TRÁP - STEP 1
-- Mục tiêu:
-- 1) Tạo bảng nghiệp vụ riêng cho giao nhận tráp
-- 2) Tạo bảng danh mục dropdown
-- 3) Tạo RPC sync dữ liệu từ contracts / contract_items / contract_calendar_flat
-- 4) Tạo RPC lấy danh sách + dashboard theo tháng
-- =========================================================

create extension if not exists pgcrypto;
create extension if not exists unaccent;

-- 1) DANH MỤC TRẠNG THÁI
create table if not exists public.trap_delivery_statuses (
  id uuid primary key default gen_random_uuid(),
  status_name text not null unique,
  sort_order integer not null default 0,
  color_code text,
  is_strikethrough boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.trap_delivery_statuses (status_name, sort_order, color_code, is_strikethrough, is_active)
values
  ('CHƯA LÀM', 1, 'none', false, true),
  ('CHUẨN BỊ', 2, 'yellow', false, true),
  ('ĐANG LÀM', 3, 'purple', false, true),
  ('ĐÃ GIAO TRÁP', 4, 'blue', false, true),
  ('CHƯA TRẢ TRÁP', 5, 'pink', false, true),
  ('TRẢ THIẾU ĐỒ', 6, 'red', false, true),
  ('ĐÃ TRẢ ĐỦ', 7, 'green', true, true)
on conflict (status_name) do update
set
  sort_order = excluded.sort_order,
  color_code = excluded.color_code,
  is_strikethrough = excluded.is_strikethrough,
  is_active = excluded.is_active,
  updated_at = now();

-- 2) DANH MỤC LOẠI ĐẾ TRÁP
create table if not exists public.trap_base_types (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3) DANH MỤC LOẠI TRÁP
create table if not exists public.trap_types (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 4) BẢNG NGHIỆP VỤ GIAO NHẬN TRÁP
create table if not exists public.trap_delivery_orders (
  id uuid primary key default gen_random_uuid(),
  contract_id text not null references public.contracts(id),
  contract_item_id text not null references public.contract_items(id),
  customer_id text references public.customers(id),
  source_date_field text not null check (source_date_field in ('ngay_an_hoi', 'ngay_dam_ngo')),
  customer_name text not null,
  service_name text not null,
  price numeric not null default 0,
  delivery_date date,
  delivery_month text,
  month_group text not null default 'PENDING_DATE',
  so_trap_to integer not null default 0 check (so_trap_to >= 0),
  loai_de_trap_id uuid references public.trap_base_types(id),
  so_trap_nho integer not null default 0 check (so_trap_nho >= 0),
  loai_trap_id uuid references public.trap_types(id),
  khan_trum integer not null default 0 check (khan_trum >= 0),
  tinh_trang text not null default 'CHƯA LÀM',
  nguoi_giao_staff_id text references public.staff(id),
  nguoi_nhan_staff_id text references public.staff(id),
  ghi_chu text,
  is_active boolean not null default true,
  sync_hash text,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint trap_delivery_orders_tinh_trang_check check (
    tinh_trang in (
      'CHƯA LÀM',
      'CHUẨN BỊ',
      'ĐANG LÀM',
      'ĐÃ GIAO TRÁP',
      'CHƯA TRẢ TRÁP',
      'TRẢ THIẾU ĐỒ',
      'ĐÃ TRẢ ĐỦ'
    )
  )
);

create unique index if not exists uq_trap_delivery_orders_source
on public.trap_delivery_orders(contract_item_id, source_date_field);

create index if not exists idx_trap_delivery_orders_contract_id
on public.trap_delivery_orders(contract_id);

create index if not exists idx_trap_delivery_orders_delivery_month
on public.trap_delivery_orders(delivery_month);

create index if not exists idx_trap_delivery_orders_tinh_trang
on public.trap_delivery_orders(tinh_trang);

create index if not exists idx_trap_delivery_orders_is_active
on public.trap_delivery_orders(is_active);

-- 5) updated_at trigger
create or replace function public.trap_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_trap_delivery_statuses_updated_at on public.trap_delivery_statuses;
create trigger trg_trap_delivery_statuses_updated_at
before update on public.trap_delivery_statuses
for each row execute function public.trap_set_updated_at();

drop trigger if exists trg_trap_base_types_updated_at on public.trap_base_types;
create trigger trg_trap_base_types_updated_at
before update on public.trap_base_types
for each row execute function public.trap_set_updated_at();

drop trigger if exists trg_trap_types_updated_at on public.trap_types;
create trigger trg_trap_types_updated_at
before update on public.trap_types
for each row execute function public.trap_set_updated_at();

drop trigger if exists trg_trap_delivery_orders_updated_at on public.trap_delivery_orders;
create trigger trg_trap_delivery_orders_updated_at
before update on public.trap_delivery_orders
for each row execute function public.trap_set_updated_at();

-- 6) VIEW NGUỒN SYNC CHUẨN
create or replace view public.trap_delivery_source_view as
with base as (
  select
    ci.id as contract_item_id,
    ci.contract_id,
    c.customer_id,
    cu.name as customer_name,
    ci.service_name,
    coalesce(ci.subtotal, 0) as price,
    ccf.ngay_an_hoi,
    ccf.ngay_dam_ngo
  from public.contract_items ci
  join public.contracts c
    on c.id = ci.contract_id
  left join public.customers cu
    on cu.id = c.customer_id
  left join public.contract_calendar_flat ccf
    on ccf.contract_id = ci.contract_id
  where ci.service_name in ('LỄ TRÁP ĂN HỎI', 'Lễ Dạm Ngõ')
),
expanded as (
  select
    contract_item_id,
    contract_id,
    customer_id,
    customer_name,
    service_name,
    price,
    'ngay_an_hoi'::text as source_date_field,
    ngay_an_hoi as delivery_date
  from base
  where service_name = 'LỄ TRÁP ĂN HỎI'

  union all

  select
    contract_item_id,
    contract_id,
    customer_id,
    customer_name,
    service_name,
    price,
    'ngay_dam_ngo'::text as source_date_field,
    ngay_dam_ngo as delivery_date
  from base
  where service_name = 'Lễ Dạm Ngõ'
)
select
  e.contract_item_id,
  e.contract_id,
  e.customer_id,
  coalesce(e.customer_name, '') as customer_name,
  e.service_name,
  e.price,
  e.source_date_field,
  e.delivery_date,
  case
    when e.delivery_date is null then null
    else to_char(e.delivery_date, 'YYYY-MM')
  end as delivery_month,
  case
    when e.delivery_date is null then 'PENDING_DATE'
    else to_char(e.delivery_date, 'YYYY-MM')
  end as month_group,
  md5(
    coalesce(e.contract_id, '') || '|' ||
    coalesce(e.contract_item_id, '') || '|' ||
    coalesce(e.customer_id, '') || '|' ||
    coalesce(e.customer_name, '') || '|' ||
    coalesce(e.service_name, '') || '|' ||
    coalesce(e.price::text, '0') || '|' ||
    coalesce(e.source_date_field, '') || '|' ||
    coalesce(e.delivery_date::text, '')
  ) as sync_hash
from expanded e;

-- 7) RPC SYNC TOÀN BỘ
create or replace function public.trap_delivery_sync_all()
returns jsonb
language plpgsql
security definer
as $$
declare
  v_upserted integer := 0;
  v_deactivated integer := 0;
begin
  insert into public.trap_delivery_orders (
    contract_id,
    contract_item_id,
    customer_id,
    source_date_field,
    customer_name,
    service_name,
    price,
    delivery_date,
    delivery_month,
    month_group,
    is_active,
    sync_hash,
    last_synced_at
  )
  select
    s.contract_id,
    s.contract_item_id,
    s.customer_id,
    s.source_date_field,
    s.customer_name,
    s.service_name,
    s.price,
    s.delivery_date,
    s.delivery_month,
    s.month_group,
    true,
    s.sync_hash,
    now()
  from public.trap_delivery_source_view s
  on conflict (contract_item_id, source_date_field)
  do update set
    contract_id = excluded.contract_id,
    customer_id = excluded.customer_id,
    customer_name = excluded.customer_name,
    service_name = excluded.service_name,
    price = excluded.price,
    delivery_date = excluded.delivery_date,
    delivery_month = excluded.delivery_month,
    month_group = excluded.month_group,
    is_active = true,
    sync_hash = excluded.sync_hash,
    last_synced_at = now();

  get diagnostics v_upserted = row_count;

  update public.trap_delivery_orders t
  set
    is_active = false,
    last_synced_at = now()
  where t.is_active = true
    and not exists (
      select 1
      from public.trap_delivery_source_view s
      where s.contract_item_id = t.contract_item_id
        and s.source_date_field = t.source_date_field
    );

  get diagnostics v_deactivated = row_count;

  return jsonb_build_object(
    'success', true,
    'upserted_rows', v_upserted,
    'deactivated_rows', v_deactivated
  );
end;
$$;

-- 8) RPC SYNC THEO CONTRACT
create or replace function public.trap_delivery_sync_contract(
  p_contract_id text
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_upserted integer := 0;
  v_deactivated integer := 0;
begin
  insert into public.trap_delivery_orders (
    contract_id,
    contract_item_id,
    customer_id,
    source_date_field,
    customer_name,
    service_name,
    price,
    delivery_date,
    delivery_month,
    month_group,
    is_active,
    sync_hash,
    last_synced_at
  )
  select
    s.contract_id,
    s.contract_item_id,
    s.customer_id,
    s.source_date_field,
    s.customer_name,
    s.service_name,
    s.price,
    s.delivery_date,
    s.delivery_month,
    s.month_group,
    true,
    s.sync_hash,
    now()
  from public.trap_delivery_source_view s
  where s.contract_id = p_contract_id
  on conflict (contract_item_id, source_date_field)
  do update set
    contract_id = excluded.contract_id,
    customer_id = excluded.customer_id,
    customer_name = excluded.customer_name,
    service_name = excluded.service_name,
    price = excluded.price,
    delivery_date = excluded.delivery_date,
    delivery_month = excluded.delivery_month,
    month_group = excluded.month_group,
    is_active = true,
    sync_hash = excluded.sync_hash,
    last_synced_at = now();

  get diagnostics v_upserted = row_count;

  update public.trap_delivery_orders t
  set
    is_active = false,
    last_synced_at = now()
  where t.contract_id = p_contract_id
    and t.is_active = true
    and not exists (
      select 1
      from public.trap_delivery_source_view s
      where s.contract_item_id = t.contract_item_id
        and s.source_date_field = t.source_date_field
    );

  get diagnostics v_deactivated = row_count;

  return jsonb_build_object(
    'success', true,
    'contract_id', p_contract_id,
    'upserted_rows', v_upserted,
    'deactivated_rows', v_deactivated
  );
end;
$$;

-- 9) RPC DANH SÁCH BẢNG CHÍNH
create or replace function public.trap_delivery_get_rows(
  p_month text default null,
  p_status text default null,
  p_service_name text default null,
  p_staff_id text default null,
  p_search text default null
)
returns table (
  id uuid,
  contract_id text,
  contract_item_id text,
  customer_id text,
  customer_name text,
  service_name text,
  price numeric,
  delivery_date date,
  delivery_month text,
  month_group text,
  so_trap_to integer,
  loai_de_trap_id uuid,
  loai_de_trap_name text,
  so_trap_nho integer,
  loai_trap_id uuid,
  loai_trap_name text,
  khan_trum integer,
  tinh_trang text,
  nguoi_giao_staff_id text,
  nguoi_giao_name text,
  nguoi_nhan_staff_id text,
  nguoi_nhan_name text,
  ghi_chu text,
  is_active boolean,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
stable
as $$
  with current_month_cte as (
    select to_char((timezone('Asia/Ho_Chi_Minh', now()))::date, 'YYYY-MM') as current_month
  )
  select
    t.id,
    t.contract_id,
    t.contract_item_id,
    t.customer_id,
    t.customer_name,
    t.service_name,
    t.price,
    t.delivery_date,
    t.delivery_month,
    t.month_group,
    t.so_trap_to,
    t.loai_de_trap_id,
    b.name as loai_de_trap_name,
    t.so_trap_nho,
    t.loai_trap_id,
    tp.name as loai_trap_name,
    t.khan_trum,
    t.tinh_trang,
    t.nguoi_giao_staff_id,
    sg.name as nguoi_giao_name,
    t.nguoi_nhan_staff_id,
    sn.name as nguoi_nhan_name,
    t.ghi_chu,
    t.is_active,
    t.created_at,
    t.updated_at
  from public.trap_delivery_orders t
  left join public.trap_base_types b
    on b.id = t.loai_de_trap_id
  left join public.trap_types tp
    on tp.id = t.loai_trap_id
  left join public.staff sg
    on sg.id = t.nguoi_giao_staff_id
  left join public.staff sn
    on sn.id = t.nguoi_nhan_staff_id
  cross join current_month_cte cm
  where t.is_active = true
    and (
      (p_month is null and coalesce(t.month_group, 'PENDING_DATE') = cm.current_month)
      or p_month = 'ALL'
      or (p_month = 'PENDING_DATE' and coalesce(t.month_group, 'PENDING_DATE') = 'PENDING_DATE')
      or (p_month is not null and p_month not in ('ALL', 'PENDING_DATE') and coalesce(t.month_group, 'PENDING_DATE') = p_month)
    )
    and (p_status is null or trim(p_status) = '' or t.tinh_trang = p_status)
    and (p_service_name is null or trim(p_service_name) = '' or t.service_name = p_service_name)
    and (
      p_staff_id is null or trim(p_staff_id) = ''
      or t.nguoi_giao_staff_id = p_staff_id
      or t.nguoi_nhan_staff_id = p_staff_id
    )
    and (
      p_search is null or trim(p_search) = ''
      or unaccent(lower(coalesce(t.customer_name, ''))) like '%' || unaccent(lower(trim(p_search))) || '%'
      or lower(coalesce(t.service_name, '')) like '%' || lower(trim(p_search)) || '%'
      or lower(coalesce(t.ghi_chu, '')) like '%' || lower(trim(p_search)) || '%'
    )
  order by
    case when t.delivery_date is null then 1 else 0 end,
    t.delivery_date asc nulls last,
    t.customer_name asc,
    t.created_at asc;
$$;

-- 10) RPC DASHBOARD
create or replace function public.trap_delivery_get_dashboard(
  p_month text default null
)
returns table (
  total_rows integer,
  status_chua_lam integer,
  status_chuan_bi integer,
  status_dang_lam integer,
  status_da_giao_trap integer,
  status_chua_tra_trap integer,
  status_tra_thieu_do integer,
  status_da_tra_du integer
)
language sql
stable
as $$
  with current_month_cte as (
    select to_char((timezone('Asia/Ho_Chi_Minh', now()))::date, 'YYYY-MM') as current_month
  ),
  filtered as (
    select *
    from public.trap_delivery_orders t
    cross join current_month_cte cm
    where t.is_active = true
      and (
        (p_month is null and coalesce(t.month_group, 'PENDING_DATE') = cm.current_month)
        or p_month = 'ALL'
        or (p_month = 'PENDING_DATE' and coalesce(t.month_group, 'PENDING_DATE') = 'PENDING_DATE')
        or (p_month is not null and p_month not in ('ALL', 'PENDING_DATE') and coalesce(t.month_group, 'PENDING_DATE') = p_month)
      )
  )
  select
    count(*)::integer as total_rows,
    count(*) filter (where tinh_trang = 'CHƯA LÀM')::integer as status_chua_lam,
    count(*) filter (where tinh_trang = 'CHUẨN BỊ')::integer as status_chuan_bi,
    count(*) filter (where tinh_trang = 'ĐANG LÀM')::integer as status_dang_lam,
    count(*) filter (where tinh_trang = 'ĐÃ GIAO TRÁP')::integer as status_da_giao_trap,
    count(*) filter (where tinh_trang = 'CHƯA TRẢ TRÁP')::integer as status_chua_tra_trap,
    count(*) filter (where tinh_trang = 'TRẢ THIẾU ĐỒ')::integer as status_tra_thieu_do,
    count(*) filter (where tinh_trang = 'ĐÃ TRẢ ĐỦ')::integer as status_da_tra_du
  from filtered;
$$;

-- 11) RPC LẤY DANH MỤC DROPDOWN
create or replace function public.trap_delivery_get_dropdowns()
returns jsonb
language plpgsql
stable
as $$
declare
  v_base_types jsonb;
  v_trap_types jsonb;
  v_statuses jsonb;
  v_staff jsonb;
begin
  select coalesce(
    jsonb_agg(jsonb_build_object('id', id, 'name', name, 'sort_order', sort_order) order by sort_order, name),
    '[]'::jsonb
  )
  into v_base_types
  from public.trap_base_types
  where is_active = true;

  select coalesce(
    jsonb_agg(jsonb_build_object('id', id, 'name', name, 'sort_order', sort_order) order by sort_order, name),
    '[]'::jsonb
  )
  into v_trap_types
  from public.trap_types
  where is_active = true;

  select coalesce(
    jsonb_agg(jsonb_build_object(
      'id', id,
      'status_name', status_name,
      'sort_order', sort_order,
      'color_code', color_code,
      'is_strikethrough', is_strikethrough
    ) order by sort_order),
    '[]'::jsonb
  )
  into v_statuses
  from public.trap_delivery_statuses
  where is_active = true;

  select coalesce(
    jsonb_agg(jsonb_build_object('id', id, 'name', name, 'role', role) order by name),
    '[]'::jsonb
  )
  into v_staff
  from public.staff
  where status = 'Active';

  return jsonb_build_object(
    'baseTypes', v_base_types,
    'trapTypes', v_trap_types,
    'statuses', v_statuses,
    'staff', v_staff
  );
end;
$$;

-- 12) SYNC LẦN ĐẦU
select public.trap_delivery_sync_all();

-- TEST:
-- select public.trap_delivery_sync_all();
-- select * from public.trap_delivery_get_rows(null, null, null, null, null);
-- select * from public.trap_delivery_get_dashboard(null);
-- select public.trap_delivery_get_dropdowns();
