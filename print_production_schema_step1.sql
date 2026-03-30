
-- =========================================
-- MODULE: PRINT PRODUCTION / BÁO CÁO IN ẤN
-- STEP 1: SCHEMA NỀN TẢNG - BẢN ĐÃ SỬA
-- Ghi chú:
-- - Khớp với hệ thống hiện tại dùng:
--   contracts.id = text
--   customers.id = text
--   staff.id = text
-- =========================================

create extension if not exists pgcrypto;

-- -----------------------------------------
-- Helper: tự cập nhật updated_at
-- -----------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- -----------------------------------------
-- 1. Danh mục kích thước in
-- -----------------------------------------
create table if not exists public.print_sizes (
  id uuid primary key default gen_random_uuid(),
  ten_kich_thuoc text not null,
  mo_ta text null,
  thu_tu_hien_thi integer not null default 0,
  dang_su_dung boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (ten_kich_thuoc)
);

drop trigger if exists trg_print_sizes_updated_at on public.print_sizes;
create trigger trg_print_sizes_updated_at
before update on public.print_sizes
for each row
execute function public.set_updated_at();

-- -----------------------------------------
-- 2. Danh mục chất liệu in
-- -----------------------------------------
create table if not exists public.print_materials (
  id uuid primary key default gen_random_uuid(),
  ten_chat_lieu text not null,
  mo_ta text null,
  thu_tu_hien_thi integer not null default 0,
  dang_su_dung boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (ten_chat_lieu)
);

drop trigger if exists trg_print_materials_updated_at on public.print_materials;
create trigger trg_print_materials_updated_at
before update on public.print_materials
for each row
execute function public.set_updated_at();

-- -----------------------------------------
-- 3. Danh mục dịch vụ in ấn
-- -----------------------------------------
create table if not exists public.print_services (
  id uuid primary key default gen_random_uuid(),
  ten_dich_vu_in text not null,
  mo_ta text null,
  thu_tu_hien_thi integer not null default 0,
  dang_su_dung boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (ten_dich_vu_in)
);

drop trigger if exists trg_print_services_updated_at on public.print_services;
create trigger trg_print_services_updated_at
before update on public.print_services
for each row
execute function public.set_updated_at();

-- -----------------------------------------
-- 4. Danh mục xưởng in
-- -----------------------------------------
create table if not exists public.print_vendors (
  id uuid primary key default gen_random_uuid(),
  ten_xuong_in text not null,
  nguoi_lien_he text null,
  so_dien_thoai text null,
  dia_chi text null,
  ghi_chu text null,
  thu_tu_hien_thi integer not null default 0,
  dang_su_dung boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (ten_xuong_in)
);

drop trigger if exists trg_print_vendors_updated_at on public.print_vendors;
create trigger trg_print_vendors_updated_at
before update on public.print_vendors
for each row
execute function public.set_updated_at();

-- -----------------------------------------
-- 5. Bảng giá in theo xưởng
-- -----------------------------------------
create table if not exists public.print_vendor_prices (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.print_vendors(id),
  print_service_id uuid null references public.print_services(id),
  size_id uuid null references public.print_sizes(id),
  material_id uuid null references public.print_materials(id),
  don_gia numeric(14,2) not null default 0,
  ghi_chu text null,
  dang_su_dung boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_print_vendor_prices_vendor on public.print_vendor_prices(vendor_id);
create index if not exists idx_print_vendor_prices_service on public.print_vendor_prices(print_service_id);
create index if not exists idx_print_vendor_prices_size on public.print_vendor_prices(size_id);
create index if not exists idx_print_vendor_prices_material on public.print_vendor_prices(material_id);

drop trigger if exists trg_print_vendor_prices_updated_at on public.print_vendor_prices;
create trigger trg_print_vendor_prices_updated_at
before update on public.print_vendor_prices
for each row
execute function public.set_updated_at();

-- -----------------------------------------
-- 6. Trạng thái in ấn
-- -----------------------------------------
create table if not exists public.print_statuses (
  id uuid primary key default gen_random_uuid(),
  ten_trang_thai text not null,
  ma_mau text null,
  thu_tu_hien_thi integer not null default 0,
  la_hoan_tat boolean not null default false,
  dang_su_dung boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (ten_trang_thai)
);

drop trigger if exists trg_print_statuses_updated_at on public.print_statuses;
create trigger trg_print_statuses_updated_at
before update on public.print_statuses
for each row
execute function public.set_updated_at();

-- -----------------------------------------
-- 7. Bảng chính: print_orders
-- Ghi chú:
-- - contract_id / customer_id / created_by dùng TEXT để khớp schema hiện tại
-- - contract_code: mã hợp đồng
-- - link_files: link file in ấn
-- - image_attachments: danh sách link ảnh đính kèm (mảng text)
-- -----------------------------------------
drop table if exists public.print_orders cascade;

create table public.print_orders (
  id uuid primary key default gen_random_uuid(),

  contract_id text null references public.contracts(id),
  contract_code text null,
  customer_id text null references public.customers(id),

  ten_khach_hang text not null,
  ngay_gui_in date null,
  link_the_trello text null,
  link_files text null,
  image_attachments text[] not null default '{}',

  trello_card_id text null,
  trello_board_id text null,
  trello_list_id text null,

  so_luong_anh_lon integer not null default 0 check (so_luong_anh_lon >= 0),
  kich_thuoc_anh_lon_id uuid null references public.print_sizes(id),
  chat_lieu_anh_lon_id uuid null references public.print_materials(id),

  so_luong_anh_nho integer not null default 0 check (so_luong_anh_nho >= 0),
  kich_thuoc_anh_nho_id uuid null references public.print_sizes(id),
  chat_lieu_anh_nho_id uuid null references public.print_materials(id),

  print_service_id uuid null references public.print_services(id),
  vendor_id uuid null references public.print_vendors(id),
  status_id uuid null references public.print_statuses(id),

  nguoi_kiem_tra_nhan_anh text null,
  thong_bao_da_co_anh boolean not null default false,
  thong_bao_da_giao_anh boolean not null default false,
  thong_bao_dang_in_anh boolean not null default false,
  check_flag boolean not null default false,

  don_gia_in numeric(14,2) not null default 0,
  thanh_tien numeric(14,2) generated always as (
    (
      coalesce(so_luong_anh_lon, 0) + coalesce(so_luong_anh_nho, 0)
    ) * coalesce(don_gia_in, 0)
  ) stored,

  ghi_chu text null,
  dang_su_dung boolean not null default true,

  created_by text null references public.staff(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists uq_print_orders_trello_card_id
  on public.print_orders(trello_card_id)
  where trello_card_id is not null;

create index if not exists idx_print_orders_contract_id on public.print_orders(contract_id);
create index if not exists idx_print_orders_customer_id on public.print_orders(customer_id);
create index if not exists idx_print_orders_vendor_id on public.print_orders(vendor_id);
create index if not exists idx_print_orders_status_id on public.print_orders(status_id);
create index if not exists idx_print_orders_print_service_id on public.print_orders(print_service_id);
create index if not exists idx_print_orders_ngay_gui_in on public.print_orders(ngay_gui_in);
create index if not exists idx_print_orders_dang_su_dung on public.print_orders(dang_su_dung);

drop trigger if exists trg_print_orders_updated_at on public.print_orders;
create trigger trg_print_orders_updated_at
before update on public.print_orders
for each row
execute function public.set_updated_at();

-- -----------------------------------------
-- 8. Seed trạng thái mặc định
-- -----------------------------------------
insert into public.print_statuses (ten_trang_thai, ma_mau, thu_tu_hien_thi, la_hoan_tat)
values
  ('ĐANG IN ẤN', '#f59e0b', 1, false),
  ('ĐÃ ĐỦ ẢNH', '#16a34a', 2, false),
  ('ĐÃ GIAO ẢNH', '#2563eb', 3, true),
  ('TẠM DỪNG', '#6b7280', 4, false)
on conflict (ten_trang_thai) do nothing;

-- -----------------------------------------
-- 9. View thao tác nhanh cho frontend
-- -----------------------------------------
create or replace view public.print_orders_view as
select
  po.id,
  po.contract_id,
  po.contract_code,
  po.customer_id,
  po.ten_khach_hang,
  po.ngay_gui_in,
  po.link_the_trello,
  po.link_files,
  po.image_attachments,
  po.trello_card_id,
  po.trello_board_id,
  po.trello_list_id,

  po.so_luong_anh_lon,
  po.kich_thuoc_anh_lon_id,
  psl.ten_kich_thuoc as kich_thuoc_anh_lon,

  po.chat_lieu_anh_lon_id,
  pml.ten_chat_lieu as chat_lieu_anh_lon,

  po.so_luong_anh_nho,
  po.kich_thuoc_anh_nho_id,
  psn.ten_kich_thuoc as kich_thuoc_anh_nho,

  po.chat_lieu_anh_nho_id,
  pmn.ten_chat_lieu as chat_lieu_anh_nho,

  po.print_service_id,
  psv.ten_dich_vu_in,

  po.vendor_id,
  pv.ten_xuong_in,

  po.status_id,
  pst.ten_trang_thai,

  po.nguoi_kiem_tra_nhan_anh,
  po.thong_bao_da_co_anh,
  po.thong_bao_da_giao_anh,
  po.thong_bao_dang_in_anh,
  po.check_flag,
  po.don_gia_in,
  po.thanh_tien,
  po.ghi_chu,
  po.dang_su_dung,
  po.created_by,
  po.created_at,
  po.updated_at
from public.print_orders po
left join public.print_sizes psl on psl.id = po.kich_thuoc_anh_lon_id
left join public.print_materials pml on pml.id = po.chat_lieu_anh_lon_id
left join public.print_sizes psn on psn.id = po.kich_thuoc_anh_nho_id
left join public.print_materials pmn on pmn.id = po.chat_lieu_anh_nho_id
left join public.print_services psv on psv.id = po.print_service_id
left join public.print_vendors pv on pv.id = po.vendor_id
left join public.print_statuses pst on pst.id = po.status_id
where po.dang_su_dung = true;

-- =========================================
-- Hết Step 1 - Bản đã sửa
-- =========================================
