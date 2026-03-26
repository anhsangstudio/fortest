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
