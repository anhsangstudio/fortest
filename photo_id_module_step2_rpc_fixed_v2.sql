-- =========================================================
-- PHOTO ID MODULE - STEP 2 RPC
-- Mục tiêu:
-- 1) Dashboard kho giấy cho module Ảnh thẻ
-- 2) Phân trang đơn ảnh thẻ
-- 3) Sửa đơn ảnh thẻ (đồng bộ order + transaction + kho)
-- 4) Xóa đơn ảnh thẻ (xóa thật, hoàn kho, xóa transaction)
-- 5) Báo cáo doanh thu ảnh thẻ: summary / theo ngày / theo tháng
--
-- YÊU CẦU TRƯỚC KHI CHẠY:
-- - Đã có các bảng từ step 1:
--   public.photo_id_orders
--   public.photo_paper_inventory
--   public.photo_paper_stock_movements
-- - Bảng public.transactions đã có thêm các cột:
--   payment_method, reference_type, reference_id
-- - Đã có kho giấy mặc định: 'Giấy ảnh thẻ mặc định'
-- =========================================================

begin;

-- =========================================================
-- 0) Index bổ sung để truy vấn nhanh hơn
-- =========================================================
create index if not exists idx_photo_id_orders_order_datetime
on public.photo_id_orders(order_datetime desc);

create index if not exists idx_photo_id_orders_created_at
on public.photo_id_orders(created_at desc);

create index if not exists idx_photo_id_orders_phone_order_datetime
on public.photo_id_orders(customer_phone, order_datetime desc);

create index if not exists idx_photo_paper_stock_movements_order
on public.photo_paper_stock_movements(related_photo_order_id);

create index if not exists idx_transactions_photo_id_ref
on public.transactions(reference_type, reference_id);

-- =========================================================
-- 1) Dashboard kho giấy
-- Rule dashboard:
-- - total_paper_quantity = tổng current_quantity của kho đang active
-- - low_stock_count = số kho có current_quantity < 30
-- =========================================================
drop function if exists public.photo_id_get_dashboard();
create or replace function public.photo_id_get_dashboard()
returns table (
  total_paper_quantity bigint,
  inventory_count bigint,
  low_stock_count bigint
)
language sql
as $$
  select
    coalesce(sum(case when is_active then current_quantity else 0 end), 0)::bigint as total_paper_quantity,
    coalesce(count(*) filter (where is_active), 0)::bigint as inventory_count,
    coalesce(count(*) filter (where is_active and current_quantity < 30), 0)::bigint as low_stock_count
  from public.photo_paper_inventory;
$$;

-- =========================================================
-- 2) Phân trang đơn ảnh thẻ
-- Gọi RPC từ frontend với page = 1, page_size = 20
-- Có thể search theo phone / customer name / order code
-- total_count lặp lại trên mỗi dòng để frontend dễ đọc
-- =========================================================
drop function if exists public.photo_id_get_orders_paged(integer, integer, text);
create or replace function public.photo_id_get_orders_paged(
  p_page integer default 1,
  p_page_size integer default 20,
  p_search text default null
)
returns table (
  id uuid,
  order_code text,
  order_datetime timestamp with time zone,
  customer_id text,
  customer_name text,
  customer_phone text,
  print_paper_quantity integer,
  amount numeric,
  payment_method text,
  drive_file_url text,
  drive_file_id text,
  note text,
  status text,
  is_reprint boolean,
  original_order_id uuid,
  transaction_id text,
  created_by text,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  total_count bigint
)
language plpgsql
as $$
declare
  v_page integer := greatest(coalesce(p_page, 1), 1);
  v_page_size integer := greatest(coalesce(p_page_size, 20), 1);
  v_offset integer := (v_page - 1) * v_page_size;
  v_search text := nullif(btrim(p_search), '');
begin
  return query
  with filtered as (
    select o.*
    from public.photo_id_orders o
    where
      v_search is null
      or o.customer_phone ilike '%' || v_search || '%'
      or o.customer_name ilike '%' || v_search || '%'
      or o.order_code ilike '%' || v_search || '%'
  ), counted as (
    select count(*)::bigint as total_count from filtered
  ), paged as (
    select *
    from filtered
    order by order_datetime desc, created_at desc
    offset v_offset
    limit v_page_size
  )
  select
    p.id,
    p.order_code,
    p.order_datetime,
    p.customer_id,
    p.customer_name,
    p.customer_phone,
    p.print_paper_quantity,
    p.amount,
    p.payment_method,
    p.drive_file_url,
    p.drive_file_id,
    p.note,
    p.status,
    p.is_reprint,
    p.original_order_id,
    p.transaction_id,
    p.created_by,
    p.created_at,
    p.updated_at,
    c.total_count
  from paged p
  cross join counted c;
end;
$$;

-- =========================================================
-- 3) Sửa đơn ảnh thẻ
-- Đồng bộ:
-- - photo_id_orders
-- - customers (theo customer_id nếu có, hoặc theo phone nếu tìm thấy)
-- - transactions (transaction thu tương ứng)
-- - photo_paper_stock_movements OUT
-- - photo_paper_inventory.current_quantity
--
-- Logic kho:
--   tồn_mới = tồn_hiện_tại + số_giấy_cũ - số_giấy_mới
-- =========================================================
drop function if exists public.photo_id_update_order(
  uuid,
  timestamp with time zone,
  text,
  text,
  integer,
  numeric,
  text,
  text,
  text,
  text,
  boolean,
  uuid,
  text
);
create or replace function public.photo_id_update_order(
  p_order_id uuid,
  p_order_datetime timestamp with time zone,
  p_customer_name text,
  p_customer_phone text,
  p_print_paper_quantity integer,
  p_amount numeric,
  p_payment_method text,
  p_drive_file_url text,
  p_drive_file_id text,
  p_note text,
  p_is_reprint boolean,
  p_original_order_id uuid,
  p_updated_by text default null
)
returns table (
  success boolean,
  message text,
  order_id uuid,
  transaction_id text
)
language plpgsql
as $$
declare
  v_order public.photo_id_orders%rowtype;
  v_inventory public.photo_paper_inventory%rowtype;
  v_new_quantity integer := coalesce(p_print_paper_quantity, 0);
  v_new_amount numeric := coalesce(p_amount, 0);
  v_new_phone text := btrim(coalesce(p_customer_phone, ''));
  v_new_name text := btrim(coalesce(p_customer_name, ''));
  v_new_payment_method text := nullif(btrim(coalesce(p_payment_method, '')), '');
  v_qty_diff integer;
  v_new_inventory_qty integer;
  v_customer_id text;
  v_tx_id text;
begin
  if p_order_id is null then
    raise exception 'Thiếu p_order_id';
  end if;

  if v_new_name = '' then
    raise exception 'Tên khách hàng không được để trống';
  end if;

  if v_new_phone = '' then
    raise exception 'Số điện thoại không được để trống';
  end if;

  if v_new_quantity <= 0 then
    raise exception 'Số lượng giấy in phải lớn hơn 0';
  end if;

  if v_new_amount < 0 then
    raise exception 'Số tiền không hợp lệ';
  end if;

  select *
  into v_order
  from public.photo_id_orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'Không tìm thấy đơn ảnh thẻ';
  end if;

  select *
  into v_inventory
  from public.photo_paper_inventory
  where paper_name = 'Giấy ảnh thẻ mặc định'
    and is_active = true
  limit 1
  for update;

  if not found then
    raise exception 'Không tìm thấy kho giấy mặc định';
  end if;

  v_qty_diff := v_new_quantity - coalesce(v_order.print_paper_quantity, 0);
  v_new_inventory_qty := coalesce(v_inventory.current_quantity, 0) - v_qty_diff;

  if v_new_inventory_qty < 0 then
    raise exception 'Số lượng giấy trong kho không đủ để cập nhật đơn';
  end if;

  -- Cập nhật / gán customer
  v_customer_id := v_order.customer_id;

  if v_customer_id is not null then
    update public.customers
    set name = v_new_name,
        phone = v_new_phone,
        updated_at = now()
    where id = v_customer_id;
  else
    select c.id
    into v_customer_id
    from public.customers c
    where c.phone = v_new_phone
    limit 1;

    if v_customer_id is not null then
      update public.customers
      set name = v_new_name,
          phone = v_new_phone,
          updated_at = now()
      where id = v_customer_id;
    end if;
  end if;

  update public.photo_id_orders
  set order_datetime = coalesce(p_order_datetime, v_order.order_datetime),
      customer_id = v_customer_id,
      customer_name = v_new_name,
      customer_phone = v_new_phone,
      print_paper_quantity = v_new_quantity,
      amount = v_new_amount,
      payment_method = v_new_payment_method,
      drive_file_url = p_drive_file_url,
      drive_file_id = p_drive_file_id,
      note = p_note,
      is_reprint = coalesce(p_is_reprint, false),
      original_order_id = p_original_order_id,
      updated_at = now()
  where id = p_order_id;

  v_tx_id := v_order.transaction_id;

  if v_tx_id is not null then
    update public.transactions
    set amount = v_new_amount,
        description = format('Thu tiền đơn ảnh thẻ %s - %s', v_order.order_code, v_new_name),
        transaction_date = timezone('Asia/Ho_Chi_Minh', coalesce(p_order_datetime, v_order.order_datetime))::date,
        payment_method = v_new_payment_method,
        staff_id = coalesce(p_updated_by, staff_id),
        updated_at = now()
    where id = v_tx_id;
  else
    update public.transactions
    set amount = v_new_amount,
        description = format('Thu tiền đơn ảnh thẻ %s - %s', v_order.order_code, v_new_name),
        transaction_date = timezone('Asia/Ho_Chi_Minh', coalesce(p_order_datetime, v_order.order_datetime))::date,
        payment_method = v_new_payment_method,
        staff_id = coalesce(p_updated_by, staff_id),
        updated_at = now()
    where reference_type = 'photo_id_order'
      and reference_id = p_order_id::text
    returning id into v_tx_id;

    if v_tx_id is not null then
      update public.photo_id_orders
      set transaction_id = v_tx_id
      where id = p_order_id;
    end if;
  end if;

  update public.photo_paper_stock_movements
  set quantity = v_new_quantity,
      unit_cost = coalesce(v_inventory.average_cost, 0),
      total_cost = v_new_quantity * coalesce(v_inventory.average_cost, 0),
      note = format('Xuất kho cho đơn %s (cập nhật)', v_order.order_code),
      created_by = coalesce(p_updated_by, created_by)
  where related_photo_order_id = p_order_id
    and movement_type = 'OUT';

  update public.photo_paper_inventory
  set current_quantity = v_new_inventory_qty,
      updated_at = now()
  where id = v_inventory.id;

  return query
  select true, 'Cập nhật đơn ảnh thẻ thành công', p_order_id, v_tx_id;
end;
$$;

-- =========================================================
-- 4) Xóa thật đơn ảnh thẻ
-- Đồng bộ:
-- - hoàn lại giấy vào kho
-- - xóa movement OUT liên kết
-- - xóa transaction liên kết
-- - xóa order
-- =========================================================
drop function if exists public.photo_id_delete_order(uuid);
create or replace function public.photo_id_delete_order(
  p_order_id uuid
)
returns table (
  success boolean,
  message text,
  deleted_order_id uuid
)
language plpgsql
as $$
declare
  v_order public.photo_id_orders%rowtype;
  v_inventory public.photo_paper_inventory%rowtype;
  v_out_qty integer := 0;
  v_tx_id text;
begin
  if p_order_id is null then
    raise exception 'Thiếu p_order_id';
  end if;

  select *
  into v_order
  from public.photo_id_orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'Không tìm thấy đơn ảnh thẻ';
  end if;

  select *
  into v_inventory
  from public.photo_paper_inventory
  where paper_name = 'Giấy ảnh thẻ mặc định'
    and is_active = true
  limit 1
  for update;

  if not found then
    raise exception 'Không tìm thấy kho giấy mặc định';
  end if;

  select coalesce(sum(quantity), 0)
  into v_out_qty
  from public.photo_paper_stock_movements
  where related_photo_order_id = p_order_id
    and movement_type = 'OUT';

  update public.photo_paper_inventory
  set current_quantity = coalesce(current_quantity, 0) + coalesce(v_out_qty, 0),
      updated_at = now()
  where id = v_inventory.id;

  delete from public.photo_paper_stock_movements
  where related_photo_order_id = p_order_id;

  v_tx_id := v_order.transaction_id;

  if v_tx_id is not null then
    delete from public.transactions where id = v_tx_id;
  else
    delete from public.transactions
    where reference_type = 'photo_id_order'
      and reference_id = p_order_id::text;
  end if;

  delete from public.photo_id_orders
  where id = p_order_id;

  return query
  select true, 'Đã xóa đơn ảnh thẻ thành công', p_order_id;
end;
$$;

-- =========================================================
-- 5) Báo cáo summary theo khoảng ngày
-- Chỉ tính đơn còn hiệu lực (vì đơn đã xóa thật sẽ không còn trong bảng)
-- Chi phí = tổng total_cost của movement OUT còn liên kết với order còn tồn tại
-- =========================================================
drop function if exists public.photo_id_get_report_summary(date, date);
create or replace function public.photo_id_get_report_summary(
  p_from_date date,
  p_to_date date
)
returns table (
  total_orders bigint,
  total_print_paper bigint,
  total_revenue numeric,
  average_order_value numeric,
  total_cost numeric,
  gross_profit numeric
)
language sql
as $$
  with base_orders as (
    select *
    from public.photo_id_orders o
    where timezone('Asia/Ho_Chi_Minh', o.order_datetime)::date between p_from_date and p_to_date
  ), base_cost as (
    select coalesce(sum(m.total_cost), 0) as total_cost
    from public.photo_paper_stock_movements m
    join public.photo_id_orders o on o.id = m.related_photo_order_id
    where m.movement_type = 'OUT'
      and timezone('Asia/Ho_Chi_Minh', o.order_datetime)::date between p_from_date and p_to_date
  )
  select
    count(*)::bigint as total_orders,
    coalesce(sum(o.print_paper_quantity), 0)::bigint as total_print_paper,
    coalesce(sum(o.amount), 0)::numeric as total_revenue,
    round((case when count(*) > 0 then coalesce(sum(o.amount), 0) / count(*) else 0 end)::numeric, 0) as average_order_value,
    coalesce(max(c.total_cost), 0)::numeric as total_cost,
    (coalesce(sum(o.amount), 0) - coalesce(max(c.total_cost), 0))::numeric as gross_profit
  from base_orders o
  cross join base_cost c;
$$;

-- =========================================================
-- 6) Báo cáo theo ngày
-- =========================================================
drop function if exists public.photo_id_get_report_by_day(date, date);
create or replace function public.photo_id_get_report_by_day(
  p_from_date date,
  p_to_date date
)
returns table (
  report_date date,
  total_orders bigint,
  total_print_paper bigint,
  cash_revenue numeric,
  bank_revenue numeric,
  total_revenue numeric,
  average_order_value numeric
)
language sql
as $$
  select
    timezone('Asia/Ho_Chi_Minh', o.order_datetime)::date as report_date,
    count(*)::bigint as total_orders,
    coalesce(sum(o.print_paper_quantity), 0)::bigint as total_print_paper,
    coalesce(sum(
      case
        when lower(trim(coalesce(o.payment_method, ''))) = 'tiền mặt' then o.amount
        else 0
      end
    ), 0)::numeric as cash_revenue,
    coalesce(sum(
      case
        when lower(trim(coalesce(o.payment_method, ''))) = 'chuyển khoản' then o.amount
        else 0
      end
    ), 0)::numeric as bank_revenue,
    coalesce(sum(o.amount), 0)::numeric as total_revenue,
    round((case when count(*) > 0 then coalesce(sum(o.amount), 0) / count(*) else 0 end)::numeric, 0) as average_order_value
  from public.photo_id_orders o
  where timezone('Asia/Ho_Chi_Minh', o.order_datetime)::date between p_from_date and p_to_date
  group by timezone('Asia/Ho_Chi_Minh', o.order_datetime)::date
  order by report_date desc;
$$;

-- =========================================================
-- 7) Báo cáo theo tháng
-- =========================================================
drop function if exists public.photo_id_get_report_by_month(date, date);
create or replace function public.photo_id_get_report_by_month(
  p_from_date date,
  p_to_date date
)
returns table (
  report_month text,
  total_orders bigint,
  total_print_paper bigint,
  cash_revenue numeric,
  bank_revenue numeric,
  total_revenue numeric,
  average_order_value numeric
)
language sql
as $$
  select
    to_char(timezone('Asia/Ho_Chi_Minh', o.order_datetime)::date, 'MM/YYYY') as report_month,
    count(*)::bigint as total_orders,
    coalesce(sum(o.print_paper_quantity), 0)::bigint as total_print_paper,
    coalesce(sum(
      case
        when lower(trim(coalesce(o.payment_method, ''))) = 'tiền mặt' then o.amount
        else 0
      end
    ), 0)::numeric as cash_revenue,
    coalesce(sum(
      case
        when lower(trim(coalesce(o.payment_method, ''))) = 'chuyển khoản' then o.amount
        else 0
      end
    ), 0)::numeric as bank_revenue,
    coalesce(sum(o.amount), 0)::numeric as total_revenue,
    round((case when count(*) > 0 then coalesce(sum(o.amount), 0) / count(*) else 0 end)::numeric, 0) as average_order_value
  from public.photo_id_orders o
  where timezone('Asia/Ho_Chi_Minh', o.order_datetime)::date between p_from_date and p_to_date
  group by to_char(timezone('Asia/Ho_Chi_Minh', o.order_datetime)::date, 'MM/YYYY'), date_trunc('month', timezone('Asia/Ho_Chi_Minh', o.order_datetime)::date)
  order by date_trunc('month', timezone('Asia/Ho_Chi_Minh', o.order_datetime)::date) desc;
$$;

commit;
