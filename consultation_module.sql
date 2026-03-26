-- MODULE NHAT KY TU VAN
-- Su dung cho web app Quan Ly Anh Sang Studio
-- Database: Supabase PostgreSQL

-- ============================================
-- BANG NHAT KY TU VAN KHACH HANG
-- ============================================

create table if not exists consultation_logs (
    id uuid primary key default gen_random_uuid(),

    ngay_tu_van date not null,
    ten_khach_hang text not null,
    nickname text,
    dia_chi text,
    so_dien_thoai text,

    ngay_du_dinh_chup date,
    ngay_an_hoi date,
    ngay_cuoi date,

    nguon_khach_hang_id uuid,
    tinh_trang_id uuid,
    ly_do_tu_choi_id uuid,

    nhan_vien_tu_van text,

    tong_gia_tri_du_kien numeric(14,2) default 0,
    ghi_chu text,

    lead_score text,
    next_follow_up_date date,

    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- ============================================
-- DANH MUC NGUON KHACH HANG
-- ============================================

create table if not exists consultation_sources (
    id uuid primary key default gen_random_uuid(),
    ten_nguon text not null unique,
    mau_hien_thi text,
    thu_tu_hien_thi integer default 0,
    dang_su_dung boolean default true,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

insert into consultation_sources (ten_nguon, mau_hien_thi, thu_tu_hien_thi)
values
    ('Fanpage', '#fecaca', 1),
    ('FB Anh Sang', '#fde68a', 2),
    ('Zalo chung', '#bbf7d0', 3),
    ('Khach gioi thieu', '#93c5fd', 4),
    ('Khach vang lai', '#86efac', 5)
on conflict (ten_nguon) do nothing;

-- ============================================
-- DANH MUC TINH TRANG TU VAN
-- ============================================

create table if not exists consultation_statuses (
    id uuid primary key default gen_random_uuid(),
    ten_tinh_trang text not null unique,
    mau_hien_thi text,
    nhom_trang_thai text,
    thu_tu_hien_thi integer default 0,
    dang_su_dung boolean default true,
    la_trang_thai_chot boolean default false,
    la_trang_thai_tu_choi boolean default false,
    la_trang_thai_dong boolean default false,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);
insert into consultation_statuses (
    ten_tinh_trang,
    mau_hien_thi,
    nhom_trang_thai,
    thu_tu_hien_thi,
    la_trang_thai_chot,
    la_trang_thai_tu_choi,
    la_trang_thai_dong
)
values
    ('Da hen qua studio', '#93c5fd', 'dang_xu_ly', 1, false, false, false),
    ('Da hoi tham lan 1', '#fdba74', 'dang_xu_ly', 2, false, false, false),
    ('Da hoi tham lan 2', '#fcd34d', 'dang_xu_ly', 3, false, false, false),
    ('Da hoi tham lan 3', '#c4b5fd', 'dang_xu_ly', 4, false, false, false),
    ('Da chot', '#86efac', 'da_chot', 5, true, false, true),
    ('Khach tu choi', '#f87171', 'tu_choi', 6, false, true, true),
    ('Spam khong tra loi', '#dc2626', 'khong_tiem_nang', 7, false, true, true),
    ('Kin lich', '#92400e', 'tu_choi', 8, false, true, true)
on conflict (ten_tinh_trang) do nothing;
-- ============================================
-- DANH MUC LY DO TU CHOI
-- ============================================

create table if not exists consultation_rejection_reasons (
    id uuid primary key default gen_random_uuid(),
    ten_ly_do text not null unique,
    thu_tu_hien_thi integer default 0,
    dang_su_dung boolean default true,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

insert into consultation_rejection_reasons (ten_ly_do, thu_tu_hien_thi)
values
    ('Khong phu hop dich vu', 1),
    ('Gia cao', 2),
    ('Da chon ben khac', 3),
    ('Khong phan hoi', 4),
    ('Khong hop thoi gian', 5),
    ('Kin lich', 6),
    ('Ly do khac', 7)
on conflict (ten_ly_do) do nothing;

-- ============================================
-- DANH MUC DICH VU QUAN TAM
-- ============================================

create table if not exists consultation_services (
    id uuid primary key default gen_random_uuid(),
    ten_dich_vu text not null unique,
    mau_hien_thi text,
    thu_tu_hien_thi integer default 0,
    dang_su_dung boolean default true,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

insert into consultation_services (ten_dich_vu, mau_hien_thi, thu_tu_hien_thi)
values
    ('Anh cuoi', '#fca5a5', 1),
    ('Makeup', '#93c5fd', 2),
    ('Gia dinh', '#fcd34d', 3),
    ('Baby', '#86efac', 4),
    ('Ky yeu', '#c4b5fd', 5),
    ('Thue vay cuoi', '#fdba74', 6),
    ('Phong su cuoi', '#34d399', 7),
    ('Photobook', '#d8b4fe', 8),
    ('Le an hoi', '#f9a8d4', 9),
    ('Hoc makeup', '#67e8f9', 10),
    ('Trap dam ngo', '#bef264', 11)
on conflict (ten_dich_vu) do nothing;

-- ============================================
-- BANG NOI GIUA NHAT KY TU VAN VA DICH VU QUAN TAM
-- ============================================

create table if not exists consultation_log_services (
    id uuid primary key default gen_random_uuid(),
    consultation_log_id uuid not null,
    service_id uuid not null,
    created_at timestamptz default now(),

    constraint fk_consultation_log_services_log
        foreign key (consultation_log_id)
        references consultation_logs (id)
        on delete cascade,

    constraint fk_consultation_log_services_service
        foreign key (service_id)
        references consultation_services (id)
        on delete cascade,

    constraint uq_consultation_log_service
        unique (consultation_log_id, service_id)
);

-- ============================================
-- FOREIGN KEY CHO BANG consultation_logs
-- ============================================

alter table consultation_logs
add constraint fk_consultation_logs_source
foreign key (nguon_khach_hang_id)
references consultation_sources (id)
on delete set null;

alter table consultation_logs
add constraint fk_consultation_logs_status
foreign key (tinh_trang_id)
references consultation_statuses (id)
on delete set null;

alter table consultation_logs
add constraint fk_consultation_logs_rejection_reason
foreign key (ly_do_tu_choi_id)
references consultation_rejection_reasons (id)
on delete set null;

alter table consultation_logs
add constraint fk_consultation_logs_staff
foreign key (nhan_vien_tu_van)
references staff (id)
on delete set null;

-- ============================================
-- FUNCTION CAP NHAT updated_at TU DONG
-- ============================================

create or replace function set_updated_at()
returns trigger
as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

-- ============================================
-- TRIGGER CHO CAC BANG MODULE NHAT KY TU VAN
-- ============================================

drop trigger if exists trg_consultation_logs_updated_at on consultation_logs;
create trigger trg_consultation_logs_updated_at
before update on consultation_logs
for each row
execute function set_updated_at();

drop trigger if exists trg_consultation_sources_updated_at on consultation_sources;
create trigger trg_consultation_sources_updated_at
before update on consultation_sources
for each row
execute function set_updated_at();

drop trigger if exists trg_consultation_statuses_updated_at on consultation_statuses;
create trigger trg_consultation_statuses_updated_at
before update on consultation_statuses
for each row
execute function set_updated_at();

drop trigger if exists trg_consultation_rejection_reasons_updated_at on consultation_rejection_reasons;
create trigger trg_consultation_rejection_reasons_updated_at
before update on consultation_rejection_reasons
for each row
execute function set_updated_at();

drop trigger if exists trg_consultation_services_updated_at on consultation_services;
create trigger trg_consultation_services_updated_at
before update on consultation_services
for each row
execute function set_updated_at();

