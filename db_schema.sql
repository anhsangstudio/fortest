
-- ==============================================================================
-- [PAYROLL MAGIC SYNC] SERVER-SIDE CALCULATION (FIXED TEXT ID SUPPORT)
-- Hàm này thực hiện toàn bộ logic tính lương trên Database.
-- 1. FIX: Staff ID được xử lý là TEXT (hỗ trợ mã như 'NV001') thay vì UUID.
-- 2. Logic: Lương cứng, Công việc (theo Task Template), Hoa hồng (theo % Service), KPI (Auto).
-- ==============================================================================

-- Drop old functions to avoid conflict
DROP FUNCTION IF EXISTS payroll_magic_sync(uuid, text);
DROP FUNCTION IF EXISTS payroll_magic_sync(text, text);

CREATE OR REPLACE FUNCTION payroll_magic_sync(p_period_id text, p_staff_id text DEFAULT NULL)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_period record;
    v_count_slips int := 0;
    v_staff_id text; -- Sử dụng TEXT thay vì UUID để hỗ trợ mã NV001, NV002...
    v_period_uuid uuid;
BEGIN
    -- Cast period_id safely (assuming period is UUID)
    BEGIN
        v_period_uuid := p_period_id::uuid;
    EXCEPTION WHEN OTHERS THEN
        RAISE EXCEPTION 'Invalid Salary Period ID (UUID expected): %', p_period_id;
    END;

    -- Staff ID giữ nguyên text
    v_staff_id := p_staff_id;

    -- 1. Lấy thông tin kỳ lương
    SELECT * INTO v_period FROM salary_periods WHERE id = v_period_uuid;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Không tìm thấy kỳ lương';
    END IF;

    -- 2. Khởi tạo Slip cho nhân viên (nếu chưa có)
    INSERT INTO salary_slips (staff_id, salary_period_id, total_earnings, total_deductions, net_pay)
    SELECT id, v_period.id, 0, 0, 0
    FROM staff
    WHERE status = 'Active' 
      AND (v_staff_id IS NULL OR id = v_staff_id)
    ON CONFLICT (staff_id, salary_period_id) DO NOTHING;

    GET DIAGNOSTICS v_count_slips = ROW_COUNT;

    -- 3. Đồng bộ Lương cứng (HARD)
    INSERT INTO salary_items (salary_slip_id, type, title, amount, source, ref_id)
    SELECT 
        sl.id, 'HARD', 'Lương cứng ' || v_period.month || '/' || v_period.year,
        st.base_salary, 'manual', 'hard-' || v_period.month || '-' || v_period.year
    FROM salary_slips sl
    JOIN staff st ON sl.staff_id = st.id
    WHERE sl.salary_period_id = v_period.id
      AND (v_staff_id IS NULL OR st.id = v_staff_id)
    ON CONFLICT (salary_slip_id, type, ref_id) 
    DO UPDATE SET amount = EXCLUDED.amount;

    -- 4. Đồng bộ Công việc (WORK) - Task Salary
    INSERT INTO salary_items (salary_slip_id, type, title, amount, source, ref_id)
    SELECT 
        sl.id, 'WORK', t.name || ' - ' || c.contract_code,
        CASE 
            WHEN tpl.work_salary_source = 'chi_phi_cong_chup' THEN s.chi_phi_cong_chup
            WHEN tpl.work_salary_source = 'chi_phi_makeup' THEN s.chi_phi_makeup
            WHEN tpl.work_salary_source = 'chi_phi_nv_ho_tro' THEN s.chi_phi_nv_ho_tro
            WHEN tpl.work_salary_source = 'chi_phi_thu_vay' THEN s.chi_phi_thu_vay
            WHEN tpl.work_salary_source = 'chi_phi_photoshop' THEN s.chi_phi_photoshop
            WHEN tpl.work_salary_source = 'chi_phi_in_an' THEN s.chi_phi_in_an
            WHEN tpl.work_salary_source = 'chi_phi_ship' THEN s.chi_phi_ship
            WHEN tpl.work_salary_source = 'chi_phi_an_trua' THEN s.chi_phi_an_trua
            WHEN tpl.work_salary_source = 'chi_phi_lam_toc' THEN s.chi_phi_lam_toc
            WHEN tpl.work_salary_source = 'chi_phi_bao_bi' THEN s.chi_phi_bao_bi
            WHEN tpl.work_salary_source = 'chi_phi_giat_phoi' THEN s.chi_phi_giat_phoi
            WHEN tpl.work_salary_source = 'chi_phi_khau_hao' THEN s.chi_phi_khau_hao
            ELSE tpl.work_salary
        END,
        'task', 'task-' || t.id
    FROM salary_slips sl
    JOIN staff st ON sl.staff_id = st.id
    JOIN tasks t ON t.assigned_staff_ids @> jsonb_build_array(st.id::text)
    JOIN contract_items ci ON t.contract_item_id = ci.id
    JOIN contracts c ON ci.contract_id = c.id
    JOIN services s ON ci.service_id = s.ma_dv
    JOIN service_task_templates tpl ON t.schedule_type_link = tpl.schedule_type_link AND tpl.service_id = s.ma_dv
    WHERE sl.salary_period_id = v_period.id
      AND t.status = 'Completed'
      AND (t.due_date BETWEEN v_period.start_date AND v_period.end_date)
      AND (v_staff_id IS NULL OR st.id = v_staff_id)
    ON CONFLICT (salary_slip_id, type, ref_id) 
    DO UPDATE SET amount = EXCLUDED.amount;

    -- 5. Đồng bộ Hoa hồng (COMMISSION)
    INSERT INTO salary_items (salary_slip_id, type, title, amount, source, ref_id)
    SELECT 
        sl.id, 'COMMISSION', 'Hoa hồng: ' || ci.service_name || ' (' || s.hoa_hong_pct || '%)',
        ROUND(ci.subtotal * s.hoa_hong_pct / 100),
        'contract', 'sale-' || ci.id
    FROM salary_slips sl
    JOIN contract_items ci ON sl.staff_id = ci.sales_person_id
    JOIN contracts c ON ci.contract_id = c.id
    JOIN services s ON ci.service_id = s.ma_dv
    WHERE sl.salary_period_id = v_period.id
      AND c.contract_date BETWEEN v_period.start_date AND v_period.end_date
      AND s.hoa_hong_pct > 0
      AND (v_staff_id IS NULL OR sl.staff_id = v_staff_id)
    ON CONFLICT (salary_slip_id, type, ref_id) 
    DO UPDATE SET amount = EXCLUDED.amount;

    -- 6. Đồng bộ KPI Tự động (KPI)
    CREATE TEMPORARY TABLE temp_sales_perf ON COMMIT DROP AS
    SELECT 
        ci.sales_person_id as staff_id,
        COALESCE(SUM(ci.subtotal), 0) as total_sales
    FROM contract_items ci
    JOIN contracts c ON ci.contract_id = c.id
    WHERE c.contract_date BETWEEN v_period.start_date AND v_period.end_date
    GROUP BY ci.sales_person_id;

    UPDATE salary_items si
    SET amount = 
        CASE 
            WHEN perf.total_sales >= CAST(SPLIT_PART(si.ref_id, '_', 3) AS NUMERIC) THEN
                CASE 
                    WHEN SPLIT_PART(si.ref_id, '_', 5) = 'PERCENT' THEN 
                        ROUND(perf.total_sales * CAST(SPLIT_PART(si.ref_id, '_', 4) AS NUMERIC) / 100)
                    ELSE 
                        CAST(SPLIT_PART(si.ref_id, '_', 4) AS NUMERIC)
                END
            ELSE 0
        END,
        title = 
        CASE 
            WHEN perf.total_sales >= CAST(SPLIT_PART(si.ref_id, '_', 3) AS NUMERIC) THEN
               SPLIT_PART(si.title, ' [', 1) || ' [ĐẠT - DS: ' || to_char(perf.total_sales, 'FM999,999,999') || ']'
            ELSE 
               SPLIT_PART(si.title, ' [', 1) || ' [CHƯA ĐẠT - DS: ' || to_char(perf.total_sales, 'FM999,999,999') || ']'
        END
    FROM salary_slips sl
    LEFT JOIN temp_sales_perf perf ON sl.staff_id = perf.staff_id
    WHERE si.salary_slip_id = sl.id
      AND sl.salary_period_id = v_period.id
      AND si.type = 'KPI'
      AND si.ref_id LIKE 'KPI_AUTO_%'
      AND (v_staff_id IS NULL OR sl.staff_id = v_staff_id);

    -- 7. Tính toán lại tổng tiền
    WITH item_sums AS (
        SELECT 
            salary_slip_id,
            SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END) as earnings,
            SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END) as deductions
        FROM salary_items
        GROUP BY salary_slip_id
    )
    UPDATE salary_slips
    SET 
        total_earnings = COALESCE(isum.earnings, 0),
        total_deductions = COALESCE(isum.deductions, 0),
        net_pay = COALESCE(isum.earnings, 0) - COALESCE(isum.deductions, 0)
    FROM item_sums isum
    WHERE salary_slips.id = isum.salary_slip_id
      AND salary_slips.salary_period_id = v_period.id
      AND (v_staff_id IS NULL OR salary_slips.staff_id = v_staff_id);

    RETURN json_build_object(
        'success', true,
        'slips_updated', v_count_slips,
        'message', 'Đồng bộ Magic Sync hoàn tất'
    );
END;
$$;

-- ==============================================================================
-- HƯỚNG DẪN XỬ LÝ LỖI "cannot alter type of a column used in a policy definition"
-- ==============================================================================
-- Nếu bạn muốn đổi ID nhân viên sang UUID (Không khuyến khích nếu đang dùng mã 'NV001'), 
-- hãy chạy lần lượt các lệnh sau trong SQL Editor:
-- 
-- 1. DROP POLICY "Users can view their permitted contracts" ON contracts;
-- 2. ALTER TABLE staff ALTER COLUMN id TYPE uuid USING id::uuid; -- (Cần xóa data 'NV...' trước)
-- 3. CREATE POLICY "Users can view their permitted contracts" ON contracts FOR SELECT USING (auth.uid()::text = staff_in_charge_id);
