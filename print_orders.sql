create table if not exists public.print_order_items (
  id uuid primary key default gen_random_uuid(),

  print_order_id uuid not null,
  so_luong integer not null default 0,
  size_id uuid null,
  material_id uuid null,
  vendor_id uuid null,

  don_gia_in numeric(15,2) not null default 0,
  thanh_tien numeric(15,2) generated always as (so_luong * don_gia_in) stored,

  ghi_chu text null,
  thu_tu_hien_thi integer not null default 0,
  dang_su_dung boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint fk_print_order_items_order
    foreign key (print_order_id)
    references public.print_orders(id)
    on delete cascade,

  constraint fk_print_order_items_size
    foreign key (size_id)
    references public.print_sizes(id)
    on delete set null,

  constraint fk_print_order_items_material
    foreign key (material_id)
    references public.print_materials(id)
    on delete set null,

  constraint fk_print_order_items_vendor
    foreign key (vendor_id)
    references public.print_vendors(id)
    on delete set null,

  constraint chk_print_order_items_so_luong
    check (so_luong >= 0),

  constraint chk_print_order_items_don_gia_in
    check (don_gia_in >= 0)
);

create index if not exists idx_print_order_items_order_id
  on public.print_order_items(print_order_id);

create index if not exists idx_print_order_items_vendor_id
  on public.print_order_items(vendor_id);

create index if not exists idx_print_order_items_size_id
  on public.print_order_items(size_id);

create index if not exists idx_print_order_items_material_id
  on public.print_order_items(material_id);

create index if not exists idx_print_order_items_active
  on public.print_order_items(dang_su_dung);

create index if not exists idx_print_order_items_sort
  on public.print_order_items(print_order_id, thu_tu_hien_thi, created_at);




create or replace view public.print_order_items_view as
select
  poi.id,
  poi.print_order_id,

  po.contract_id,
  po.contract_code,
  po.customer_id,
  po.ten_khach_hang,
  po.ngay_gui_in,
  po.link_the_trello,
  po.link_files,
  po.trello_card_id,
  po.trello_board_id,
  po.trello_list_id,

  po.status_id,
  ps.ten_trang_thai,

  po.nguoi_kiem_tra_nhan_anh,
  st.name as ten_nguoi_kiem_tra_nhan_anh,

  poi.so_luong,
  poi.size_id,
  psz.ten_kich_thuoc,
  poi.material_id,
  pmat.ten_chat_lieu,
  poi.vendor_id,
  pv.ten_xuong_in,

  poi.don_gia_in,
  poi.thanh_tien,
  poi.ghi_chu as ghi_chu_item,
  poi.thu_tu_hien_thi,
  poi.dang_su_dung,

  po.thong_bao_da_co_anh,
  po.thong_bao_da_giao_anh,
  po.thong_bao_dang_in_anh,
  po.check_flag,
  po.ghi_chu as ghi_chu_don,

  poi.created_at,
  poi.updated_at
from public.print_order_items poi
join public.print_orders po
  on po.id = poi.print_order_id
left join public.print_sizes psz
  on psz.id = poi.size_id
left join public.print_materials pmat
  on pmat.id = poi.material_id
left join public.print_vendors pv
  on pv.id = poi.vendor_id
left join public.print_statuses ps
  on ps.id = po.status_id
left join public.staff st
  on st.id = po.nguoi_kiem_tra_nhan_anh
where poi.dang_su_dung = true
  and po.dang_su_dung = true;


create or replace function public.rpc_get_print_order_items(
  p_date_from date default null,
  p_date_to date default null,
  p_status_id uuid default null,
  p_vendor_id uuid default null
)
returns table (
  id uuid,
  print_order_id uuid,
  contract_id text,
  contract_code text,
  customer_id text,
  ten_khach_hang text,
  ngay_gui_in date,
  link_the_trello text,
  link_files text,
  trello_card_id text,
  trello_board_id text,
  trello_list_id text,
  status_id uuid,
  ten_trang_thai text,
  nguoi_kiem_tra_nhan_anh text,
  ten_nguoi_kiem_tra_nhan_anh text,
  so_luong integer,
  size_id uuid,
  ten_kich_thuoc text,
  material_id uuid,
  ten_chat_lieu text,
  vendor_id uuid,
  ten_xuong_in text,
  don_gia_in numeric,
  thanh_tien numeric,
  ghi_chu_item text,
  thu_tu_hien_thi integer,
  dang_su_dung boolean,
  thong_bao_da_co_anh boolean,
  thong_bao_da_giao_anh boolean,
  thong_bao_dang_in_anh boolean,
  check_flag boolean,
  ghi_chu_don text,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
stable
as $$
  select
    v.id,
    v.print_order_id,
    v.contract_id,
    v.contract_code,
    v.customer_id,
    v.ten_khach_hang,
    v.ngay_gui_in,
    v.link_the_trello,
    v.link_files,
    v.trello_card_id,
    v.trello_board_id,
    v.trello_list_id,
    v.status_id,
    v.ten_trang_thai,
    v.nguoi_kiem_tra_nhan_anh,
    v.ten_nguoi_kiem_tra_nhan_anh,
    v.so_luong,
    v.size_id,
    v.ten_kich_thuoc,
    v.material_id,
    v.ten_chat_lieu,
    v.vendor_id,
    v.ten_xuong_in,
    v.don_gia_in,
    v.thanh_tien,
    v.ghi_chu_item,
    v.thu_tu_hien_thi,
    v.dang_su_dung,
    v.thong_bao_da_co_anh,
    v.thong_bao_da_giao_anh,
    v.thong_bao_dang_in_anh,
    v.check_flag,
    v.ghi_chu_don,
    v.created_at,
    v.updated_at
  from public.print_order_items_view v
  where (p_date_from is null or v.ngay_gui_in >= p_date_from)
    and (p_date_to is null or v.ngay_gui_in <= p_date_to)
    and (p_status_id is null or v.status_id = p_status_id)
    and (p_vendor_id is null or v.vendor_id = p_vendor_id)
  order by v.ngay_gui_in desc nulls last, v.ten_khach_hang, v.thu_tu_hien_thi, v.created_at;
$$;



create unique index if not exists uq_print_orders_trello_card_id
on public.print_orders(trello_card_id)
where trello_card_id is not null;


create or replace function public.rpc_create_print_order_from_trello(
  p_trello_card_id text,
  p_trello_board_id text,
  p_trello_list_id text,
  p_card_name text,
  p_link_the_trello text,
  p_ngay_gui_in date default current_date
)
returns table (
  success boolean,
  action text,
  message text,
  print_order_id uuid,
  contract_id text,
  customer_id text,
  contract_code text,
  ten_khach_hang text
)
language plpgsql
as $$
declare
  v_existing_id uuid;
  v_contract_id text;
  v_customer_id text;
  v_contract_code text;
  v_ten_khach_hang text;
  v_status_id uuid;
  v_parts text[];
  v_new_id uuid;
begin
  -- 1) Validate input tối thiểu
  if coalesce(trim(p_trello_card_id), '') = '' then
    return query
    select
      false,
      'error'::text,
      'Thiếu trello_card_id'::text,
      null::uuid,
      null::text,
      null::text,
      null::text,
      null::text;
    return;
  end if;

  if coalesce(trim(p_card_name), '') = '' then
    return query
    select
      false,
      'error'::text,
      'Thiếu tên card Trello'::text,
      null::uuid,
      null::text,
      null::text,
      null::text,
      null::text;
    return;
  end if;

  -- 2) Check duplicate theo trello_card_id
  select po.id
  into v_existing_id
  from public.print_orders po
  where po.trello_card_id = p_trello_card_id
  limit 1;

  if v_existing_id is not null then
    return query
    select
      true,
      'duplicate'::text,
      'Card Trello đã tồn tại trong print_orders, bỏ qua không tạo trùng.'::text,
      v_existing_id,
      null::text,
      null::text,
      null::text,
      null::text;
    return;
  end if;

  -- 3) Parse card name:
  -- format chuẩn: <ten_khach_hang> | <dia_chi> | <contract_code>
  v_parts := regexp_split_to_array(p_card_name, '\s*\|\s*');

  if array_length(v_parts, 1) is null or array_length(v_parts, 1) < 2 then
    return query
    select
      false,
      'error'::text,
      'Tên card không đúng format mong đợi: <ten_khach_hang> | <dia_chi> | <contract_code> hoặc <ten_khach_hang> | <contract_code>'::text,
      null::uuid,
      null::text,
      null::text,
      null::text,
      null::text;
    return;
  end if;

  v_ten_khach_hang := trim(v_parts[1]);
  v_contract_code := trim(v_parts[array_length(v_parts, 1)]);

  if coalesce(v_ten_khach_hang, '') = '' or coalesce(v_contract_code, '') = '' then
    return query
    select
      false,
      'error'::text,
      'Không parse được ten_khach_hang hoặc contract_code từ tên card.'::text,
      null::uuid,
      null::text,
      null::text,
      null::text,
      null::text;
    return;
  end if;

  -- 4) Tìm contract theo contract_code
  select c.id, c.customer_id
  into v_contract_id, v_customer_id
  from public.contracts c
  where c.contract_code = v_contract_code
  limit 1;

  -- 5) Tìm status_id của "ĐANG IN ẤN"
  select ps.id
  into v_status_id
  from public.print_statuses ps
  where ps.ten_trang_thai = 'ĐANG IN ẤN'
  limit 1;

  if v_status_id is null then
    return query
    select
      false,
      'error'::text,
      'Không tìm thấy trạng thái "ĐANG IN ẤN" trong print_statuses.'::text,
      null::uuid,
      v_contract_id,
      v_customer_id,
      v_contract_code,
      v_ten_khach_hang;
    return;
  end if;

  -- 6) Insert print_orders header
  insert into public.print_orders (
    contract_id,
    contract_code,
    customer_id,
    ten_khach_hang,
    ngay_gui_in,
    link_the_trello,
    trello_card_id,
    trello_board_id,
    trello_list_id,
    status_id,
    thong_bao_da_co_anh,
    thong_bao_da_giao_anh,
    thong_bao_dang_in_anh,
    check_flag,
    dang_su_dung
  )
  values (
    v_contract_id,
    v_contract_code,
    v_customer_id,
    v_ten_khach_hang,
    p_ngay_gui_in,
    p_link_the_trello,
    p_trello_card_id,
    p_trello_board_id,
    p_trello_list_id,
    v_status_id,
    false,
    false,
    true,
    false,
    true
  )
  returning id into v_new_id;

  return query
  select
    true,
    'created'::text,
    case
      when v_contract_id is null then 'Đã tạo print_order nhưng không tìm thấy contract theo contract_code.'
      else 'Đã tạo print_order thành công từ Trello.'
    end::text,
    v_new_id,
    v_contract_id,
    v_customer_id,
    v_contract_code,
    v_ten_khach_hang;
end;
$$;


