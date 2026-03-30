
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.1';
import { Service, 
		Transaction,
		Staff,
		Contract,
		Schedule,
		Customer,
		StudioInfo,
		ExpenseCategoryItem,
		FixedCost,
		RevenueStream,
		BreakevenResult,
		TransactionType,
		Asset,
		ServiceTypeItem,
		Task,
		ServiceTaskTemplate,
		TaskAttachment,
		SalaryPeriod,
		SalarySlip,
		SalaryItem,
		SalaryConfig,
		ContractItem, 
		ServiceGroupItem,
		ConsultationSource,
		ConsultationStatus,
		ConsultationRejectionReason,
		ConsultationService,
		ConsultationLog,
		ConsultationFilter,
		ConsultationLogService,
		PrintOrder,
		PrintCatalogOption,
		PrintVendorPrice,
		CreatePrintVendorPriceInput,
		UpdatePrintVendorPriceInput,
		PrintVendorPriceFilters,
		PrintCostRow,
		PrintCostFilters,
		PrintCostSummary,} from './types';

const SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

export const isConfigured = !!SUPABASE_URL && !!SUPABASE_ANON_KEY;

export const supabase: any = isConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

const asDateOnly = (s?: string) => {
  if (!s) return null;
  return s.length >= 10 ? s.slice(0, 10) : s; // YYYY-MM-DD
};

const safeJson = (v: any, fallback: any) => {
  try {
    if (v === null || v === undefined) return fallback;
    if (typeof v === 'object') return v;
    return JSON.parse(v);
  } catch {
    return fallback;
  }
};

const throwIfError = (res: any, context: string) => {
  if (res?.error) {
    console.error(`[Supabase] ${context}:`, res.error);
    throw new Error(res.error?.message || String(res.error));
  }
};

// --- MAPPERS ---

const staffFromDb = (db: any): Staff => ({
  id: db.id,
  code: db.code || '',
  name: db.name || '',
  role: db.role || '',
  phone: db.phone || '',
  email: db.email || '',
  baseSalary: db.base_salary || 0,
  status: db.status || 'Active',
  startDate: asDateOnly(db.start_date) || '',
  notes: db.notes || '',
  createdAt: db.created_at || '',
  updatedAt: db.updated_at,
  username: db.username || '',
  password: db.password || '',
  permissions: safeJson(db.permissions, {})
});

const staffToDb = (staff: Partial<Staff>) => ({
  id: staff.id,
  code: staff.code,
  name: staff.name,
  role: staff.role,
  phone: staff.phone,
  email: staff.email,
  base_salary: staff.baseSalary,
  status: staff.status,
  start_date: staff.startDate,
  notes: staff.notes,
  username: staff.username,
  password: staff.password,
  permissions: staff.permissions,
  updated_at: staff.updatedAt
});

const customerFromDb = (db: any): Customer => ({
  id: db.id,
  name: db.name || '',
  phone: db.phone || '',
  address: db.address || ''
});

const customerToDb = (c: Partial<Customer>) => ({
  id: c.id,
  name: c.name,
  phone: c.phone,
  address: c.address
});

const serviceFromDb = (db: any): Service => ({
  ma_dv: db.ma_dv,
  ten_dv: db.ten_dv,
  nhom_dv: db.nhom_dv,
  chi_tiet_dv: db.chi_tiet_dv,
  don_gia: db.don_gia,
  don_vi_tinh: db.don_vi_tinh,
  nhan: db.nhan,
  hoa_hong_pct: db.hoa_hong_pct,
  chi_phi_cong_chup: db.chi_phi_cong_chup,
  chi_phi_makeup: db.chi_phi_makeup,
  chi_phi_nv_ho_tro: db.chi_phi_nv_ho_tro,
  chi_phi_thu_vay: db.chi_phi_thu_vay,
  chi_phi_photoshop: db.chi_phi_photoshop,
  chi_phi_in_an: db.chi_phi_in_an,
  chi_phi_ship: db.chi_phi_ship,
  chi_phi_an_trua: db.chi_phi_an_trua,
  chi_phi_lam_toc: db.chi_phi_lam_toc,
  chi_phi_bao_bi: db.chi_phi_bao_bi,
  chi_phi_giat_phoi: db.chi_phi_giat_phoi,
  chi_phi_khau_hao: db.chi_phi_khau_hao,
  
  // Legacy mapping
  id: db.ma_dv,
  code: db.ma_dv,
  name: db.ten_dv,
  price: db.don_gia,
  type: db.nhom_dv,
  description: db.chi_tiet_dv,
  unit: db.don_vi_tinh,
  label: db.nhan
});

const serviceToDb = (s: Partial<Service>) => ({
  ma_dv: s.ma_dv || s.id || s.code,
  ten_dv: s.ten_dv || s.name,
  nhom_dv: s.nhom_dv || s.type,
  chi_tiet_dv: s.chi_tiet_dv || s.description,
  don_gia: s.don_gia || s.price,
  don_vi_tinh: s.don_vi_tinh || s.unit,
  nhan: s.nhan || s.label,
  hoa_hong_pct: s.hoa_hong_pct,
  chi_phi_cong_chup: s.chi_phi_cong_chup,
  chi_phi_makeup: s.chi_phi_makeup,
  chi_phi_nv_ho_tro: s.chi_phi_nv_ho_tro,
  chi_phi_thu_vay: s.chi_phi_thu_vay,
  chi_phi_photoshop: s.chi_phi_photoshop,
  chi_phi_in_an: s.chi_phi_in_an,
  chi_phi_ship: s.chi_phi_ship,
  chi_phi_an_trua: s.chi_phi_an_trua,
  chi_phi_lam_toc: s.chi_phi_lam_toc,
  chi_phi_bao_bi: s.chi_phi_bao_bi,
  chi_phi_giat_phoi: s.chi_phi_giat_phoi,
  chi_phi_khau_hao: s.chi_phi_khau_hao
});

const taskTemplateFromDb = (db: any): ServiceTaskTemplate => ({
  id: db.id,
  serviceId: db.service_id,
  name: db.name,
  scheduleTypeLink: db.schedule_type_link,
  workSalary: db.work_salary || 0,
  workSalarySource: db.work_salary_source
});

const taskTemplateToDb = (tpl: Partial<ServiceTaskTemplate>) => ({
  service_id: tpl.serviceId,
  name: tpl.name,
  schedule_type_link: tpl.scheduleTypeLink,
  work_salary: tpl.workSalary,
  work_salary_source: tpl.workSalarySource
});

const contractItemFromDb = (db: any): ContractItem => ({
  id: db.id,
  contractId: db.contract_id,
  serviceId: db.service_id,
  quantity: db.quantity,
  subtotal: db.subtotal,
  unitPrice: db.unit_price,
  discount: db.discount,
  notes: db.notes || '',
  serviceName: db.service_name || '',
  serviceDescription: db.service_description || '',
  salesPersonId: db.sales_person_id
});

const contractItemToDb = (i: Partial<ContractItem>) => ({
  id: i.id,
  contract_id: i.contractId,
  service_id: i.serviceId,
  quantity: i.quantity,
  subtotal: i.subtotal,
  unit_price: i.unitPrice,
  discount: i.discount,
  notes: i.notes,
  service_name: i.serviceName,
  service_description: i.serviceDescription,
  sales_person_id: i.salesPersonId
});

const scheduleFromDb = (db: any): Schedule => ({
  id: db.id,
  contractId: db.contract_id,
  contractCode: db.contract_code,
  type: db.schedule_type,
  date: asDateOnly(db.schedule_date) || '',
  notes: db.notes || '',
  assignments: safeJson(db.assigned_staff_ids, [])
});

const scheduleToDb = (s: Partial<Schedule>) => ({
  id: s.id,
  contract_id: s.contractId,
  contract_code: s.contractCode,
  schedule_type: s.type,
  schedule_date: s.date,
  notes: s.notes,
  assigned_staff_ids: s.assignments
});

const contractFromDb = (db: any): Contract => ({
  id: db.id,
  customerId: db.customer_id,
  staffInChargeId: db.staff_in_charge_id,
  contractCode: db.contract_code,
  date: asDateOnly(db.contract_date) || '',
  status: db.status,
  totalAmount: db.total_amount,
  paidAmount: db.paid_amount,
  paymentMethod: db.payment_method,
  createdBy: db.created_by,
  serviceType: db.service_type,
  paymentStage: db.payment_stage,
  terms: db.terms,
  source: db.source,
  items: [],
  schedules: [],
  transactions: []
});

const contractToDb = (c: Partial<Contract>) => ({
  id: c.id,
  customer_id: c.customerId,
  staff_in_charge_id: c.staffInChargeId,
  contract_code: c.contractCode,
  contract_date: c.date,
  status: c.status,
  payment_method: c.paymentMethod,
  created_by: c.createdBy,
  service_type: c.serviceType,
  payment_stage: c.paymentStage,
  terms: c.terms,
  source: c.source
});

const transactionFromDb = (db: any): Transaction => ({
  id: db.id,
  type: db.transaction_type,
  mainCategory: db.main_category,
  category: db.category,
  amount: db.amount,
  description: db.description,
  date: asDateOnly(db.transaction_date) || '',
  contractId: db.contract_id,
  vendor: db.vendor,
  staffId: db.staff_id,
  billImageUrl: db.bill_image_url,
  contractCode: db.contract_code,
  staffName: db.staff_name
});

const transactionToDb = (t: Partial<Transaction>) => ({
  id: t.id,
  transaction_type: t.type,
  main_category: t.mainCategory,
  category: t.category,
  amount: t.amount,
  description: t.description,
  transaction_date: t.date,
  contract_id: t.contractId,
  vendor: t.vendor,
  staff_id: t.staffId,
  bill_image_url: t.billImageUrl,
  contract_code: t.contractCode,
  staff_name: t.staffName
});

export const studioInfoFromDb = (db: any): StudioInfo => ({
  name: db.name || '',
  address: db.address || '',
  phone: db.phone || '',
  zalo: db.zalo || '',
  website: db.website || '',
  fanpage: db.fanpage || '',
  email: db.email || '',
  directorName: db.directorName || '',
  googleDocsTemplateUrl: db.googleDocsTemplateUrl || '',
  logoText: db.logoText || 'AS',
  logoImage: db.logoImage || undefined,
  contractTerms: db.contractTerms || ''
});

const studioInfoToDb = (info: Partial<StudioInfo>) => ({
  name: info.name,
  address: info.address,
  phone: info.phone,
  zalo: info.zalo,
  website: info.website,
  fanpage: info.fanpage,
  email: info.email,
  directorName: info.directorName,
  googleDocsTemplateUrl: info.googleDocsTemplateUrl,
  logoText: info.logoText,
  logoImage: info.logoImage,
  contractTerms: info.contractTerms
});

const expenseCategoryFromDb = (db: any): ExpenseCategoryItem => ({
  id: db.id,
  name: db.name,
  level: db.level,
  parentId: db.parent_id,
  sortOrder: db.sort_order || 0
});

const serviceTypeFromDb = (db: any): ServiceTypeItem => ({
  id: db.id,
  name: db.name
});

const serviceGroupFromDb = (db: any): ServiceGroupItem => ({
  id: db.id,
  groupName: db.group_name
});

const fixedCostFromDb = (db: any): FixedCost => ({
  id: db.id,
  name: db.name,
  amount: db.amount,
  cycle: db.cycle,
  startDate: asDateOnly(db.start_date) || '',
  endDate: asDateOnly(db.end_date),
  description: db.description,
  isActive: db.is_active,
  isSystemGenerated: db.is_system_generated,
  sourceId: db.source_id
});

const fixedCostToDb = (fc: Partial<FixedCost>) => ({
  name: fc.name,
  amount: fc.amount,
  cycle: fc.cycle,
  start_date: fc.startDate,
  end_date: fc.endDate,
  description: fc.description,
  is_active: fc.isActive,
  is_system_generated: fc.isSystemGenerated,
  source_id: fc.sourceId
});

const assetFromDb = (db: any): Asset => ({
  id: db.id,
  name: db.name,
  value: db.value,
  startDate: asDateOnly(db.start_date) || '',
  durationMonths: db.duration_months,
  description: db.description,
  status: db.status,
  monthlyDepreciation: db.monthly_depreciation,
  remainingValue: db.remaining_value
});

const assetToDb = (a: Partial<Asset>) => ({
  name: a.name,
  value: a.value,
  start_date: a.startDate,
  duration_months: a.durationMonths,
  description: a.description,
  status: a.status
});

const taskFromDb = (db: any): Task => ({
  id: db.id,
  contractId: db.contract_id,
  contractItemId: db.contract_item_id,
  name: db.name,
  status: db.status,
  dueDate: asDateOnly(db.due_date),
  assignedStaffIds: safeJson(db.assigned_staff_ids, []),
  notes: db.notes,
  scheduleTypeLink: db.schedule_type_link,
  attachments: db.task_attachments ? db.task_attachments.map((ta: any) => ({ id: ta.id, taskId: ta.task_id, fileUrl: ta.file_url, fileId: ta.file_id, createdAt: ta.created_at })) : [],
  createdAt: db.created_at,
  // Virtual
  contractCode: db.contracts?.contract_code,
  customerName: db.contracts?.customers?.name,
  customerAddress: db.contracts?.customers?.address,
  customerPhone: db.contracts?.customers?.phone
});

const taskToDb = (t: Partial<Task>) => ({
  contract_id: t.contractId,
  contract_item_id: t.contractItemId,
  name: t.name,
  status: t.status,
  due_date: t.dueDate,
  assigned_staff_ids: t.assignedStaffIds,
  notes: t.notes,
  schedule_type_link: t.scheduleTypeLink
});

// Payroll Mappers
const salaryPeriodFromDb = (db: any): SalaryPeriod => ({
  id: db.id, month: db.month, year: db.year, startDate: db.start_date, endDate: db.end_date, status: db.status
});

const salarySlipFromDb = (db: any): SalarySlip => ({
  id: db.id, staffId: db.staff_id, salaryPeriodId: db.salary_period_id, totalEarnings: db.total_earnings, totalDeductions: db.total_deductions, netPay: db.net_pay, note: db.note
});

const salaryItemFromDb = (db: any): SalaryItem => ({
  id: db.id, salarySlipId: db.salary_slip_id, type: db.type, title: db.title, amount: db.amount, source: db.source, refId: db.ref_id, createdAt: db.created_at
});

// ================================
// CONSULTATION MODULE MAPPERS
// ================================

const consultationSourceFromDb = (row: any): ConsultationSource => ({
  id: row.id,
  ten_nguon: row.ten_nguon,
  mau_hien_thi: row.mau_hien_thi,
  thu_tu_hien_thi: row.thu_tu_hien_thi ?? 0,
  dang_su_dung: row.dang_su_dung ?? true,
  created_at: row.created_at,
  updated_at: row.updated_at,
});

const consultationStatusFromDb = (row: any): ConsultationStatus => ({
  id: row.id,
  ten_tinh_trang: row.ten_tinh_trang,
  mau_hien_thi: row.mau_hien_thi,
  nhom_trang_thai: row.nhom_trang_thai,
  thu_tu_hien_thi: row.thu_tu_hien_thi ?? 0,
  dang_su_dung: row.dang_su_dung ?? true,
  la_trang_thai_chot: row.la_trang_thai_chot ?? false,
  la_trang_thai_tu_choi: row.la_trang_thai_tu_choi ?? false,
  la_trang_thai_dong: row.la_trang_thai_dong ?? false,
  created_at: row.created_at,
  updated_at: row.updated_at,
});

const consultationRejectionReasonFromDb = (row: any): ConsultationRejectionReason => ({
  id: row.id,
  ten_ly_do: row.ten_ly_do,
  thu_tu_hien_thi: row.thu_tu_hien_thi ?? 0,
  dang_su_dung: row.dang_su_dung ?? true,
  created_at: row.created_at,
  updated_at: row.updated_at,
});

const consultationServiceFromDb = (row: any): ConsultationService => ({
  id: row.id,
  ten_dich_vu: row.ten_dich_vu,
  mau_hien_thi: row.mau_hien_thi,
  thu_tu_hien_thi: row.thu_tu_hien_thi ?? 0,
  dang_su_dung: row.dang_su_dung ?? true,
  created_at: row.created_at,
  updated_at: row.updated_at,
});

const consultationLogFromDb = (row: any): ConsultationLog => ({
  id: row.id,
  ngay_tu_van: row.ngay_tu_van,
  ten_khach_hang: row.ten_khach_hang,
  nickname: row.nickname,
  dia_chi: row.dia_chi,
  so_dien_thoai: row.so_dien_thoai,

  ngay_du_dinh_chup: row.ngay_du_dinh_chup,
  ngay_an_hoi: row.ngay_an_hoi,
  ngay_cuoi: row.ngay_cuoi,

  nguon_khach_hang_id: row.nguon_khach_hang_id,
  tinh_trang_id: row.tinh_trang_id,
  ly_do_tu_choi_id: row.ly_do_tu_choi_id,
  nhan_vien_tu_van: row.nhan_vien_tu_van,

  tong_gia_tri_du_kien: Number(row.tong_gia_tri_du_kien ?? 0),
  ghi_chu: row.ghi_chu,

  lead_score: row.lead_score,
  next_follow_up_date: row.next_follow_up_date,

  created_at: row.created_at,
  updated_at: row.updated_at,

  nguon_khach_hang_ten: row.nguon_khach_hang_ten,
  tinh_trang_ten: row.tinh_trang_ten,
  ly_do_tu_choi_ten: row.ly_do_tu_choi_ten,
  nhan_vien_tu_van_ten: row.nhan_vien_tu_van_ten,
  dich_vu_quan_tam_ids: row.dich_vu_quan_tam_ids ?? [],
  dich_vu_quan_tam_ten: row.dich_vu_quan_tam_ten ?? [],
});

const consultationSourceToDb = (item: Partial<ConsultationSource>) => ({
  ten_nguon: item.ten_nguon,
  mau_hien_thi: item.mau_hien_thi ?? null,
  thu_tu_hien_thi: item.thu_tu_hien_thi ?? 0,
  dang_su_dung: item.dang_su_dung ?? true,
});

const consultationStatusToDb = (item: Partial<ConsultationStatus>) => ({
  ten_tinh_trang: item.ten_tinh_trang,
  mau_hien_thi: item.mau_hien_thi ?? null,
  nhom_trang_thai: item.nhom_trang_thai ?? null,
  thu_tu_hien_thi: item.thu_tu_hien_thi ?? 0,
  dang_su_dung: item.dang_su_dung ?? true,
  la_trang_thai_chot: item.la_trang_thai_chot ?? false,
  la_trang_thai_tu_choi: item.la_trang_thai_tu_choi ?? false,
  la_trang_thai_dong: item.la_trang_thai_dong ?? false,
});

const consultationRejectionReasonToDb = (item: Partial<ConsultationRejectionReason>) => ({
  ten_ly_do: item.ten_ly_do,
  thu_tu_hien_thi: item.thu_tu_hien_thi ?? 0,
  dang_su_dung: item.dang_su_dung ?? true,
});

const consultationServiceToDb = (item: Partial<ConsultationService>) => ({
  ten_dich_vu: item.ten_dich_vu,
  mau_hien_thi: item.mau_hien_thi ?? null,
  thu_tu_hien_thi: item.thu_tu_hien_thi ?? 0,
  dang_su_dung: item.dang_su_dung ?? true,
});

const consultationLogToDb = (item: Partial<ConsultationLog>) => ({
  ngay_tu_van: item.ngay_tu_van,
  ten_khach_hang: item.ten_khach_hang,
  nickname: item.nickname ?? null,
  dia_chi: item.dia_chi ?? null,
  so_dien_thoai: item.so_dien_thoai ?? null,

  ngay_du_dinh_chup: item.ngay_du_dinh_chup ?? null,
  ngay_an_hoi: item.ngay_an_hoi ?? null,
  ngay_cuoi: item.ngay_cuoi ?? null,

  nguon_khach_hang_id: item.nguon_khach_hang_id ?? null,
  tinh_trang_id: item.tinh_trang_id ?? null,
  ly_do_tu_choi_id: item.ly_do_tu_choi_id ?? null,
  nhan_vien_tu_van: item.nhan_vien_tu_van ?? null,

  tong_gia_tri_du_kien: item.tong_gia_tri_du_kien ?? 0,
  ghi_chu: item.ghi_chu ?? null,

  lead_score: item.lead_score ?? null,
  next_follow_up_date: item.next_follow_up_date ?? null,
});

const fetchTransactionsByContractIds = async (contractIds: string[]): Promise<Map<string, Transaction[]>> => {
  const txMap = new Map<string, Transaction[]>();
  const ids = Array.from(new Set((contractIds || []).filter(Boolean)));
  if (!supabase || ids.length === 0) return txMap;

  const CHUNK_SIZE = 50;
  for (let i = 0; i < ids.length; i += CHUNK_SIZE) {
    const chunk = ids.slice(i, i + CHUNK_SIZE);
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .in('contract_id', chunk)
      .eq('transaction_type', 'income')
      .order('transaction_date', { ascending: true })
      .order('created_at', { ascending: true });

    throwIfError({ data, error }, 'fetchTransactionsByContractIds');

    for (const row of data || []) {
      const tx = transactionFromDb(row);
      const list = txMap.get(tx.contractId || '') || [];
      list.push(tx);
      txMap.set(tx.contractId || '', list);
    }
  }

  return txMap;
};

// --- API CALLS ---

export const copyPreviousAllowances = async (currentPeriodId: string, currentMonth: number, currentYear: number): Promise<{success: boolean, count: number}> => {
  if (!supabase) return { success: false, count: 0 };
  let prevMonth = currentMonth - 1;
  let prevYear = currentYear;
  if (prevMonth === 0) { prevMonth = 12; prevYear = currentYear - 1; }
  const { data: prevPeriod } = await supabase.from('salary_periods').select('id').eq('month', prevMonth).eq('year', prevYear).maybeSingle();
  if (!prevPeriod) throw new Error("Không tìm thấy kỳ lương trước đó.");
  const { data: prevItems } = await supabase.from('salary_items').select('*, salary_slips!inner(staff_id)').eq('salary_slips.salary_period_id', prevPeriod.id).eq('type', 'ALLOWANCE');
  if (!prevItems || prevItems.length === 0) return { success: true, count: 0 };
  let count = 0;
  for (const item of prevItems) {
     const { data: currentSlip } = await supabase.from('salary_slips').select('id').eq('salary_period_id', currentPeriodId).eq('staff_id', item.salary_slips.staff_id).maybeSingle();
     if (currentSlip) {
        await supabase.from('salary_items').insert({ salary_slip_id: currentSlip.id, type: 'ALLOWANCE', title: item.title, amount: item.amount, source: 'allowance_copy', ref_id: null });
        count++;
     }
  }
  return { success: true, count };
};

export const runPayrollMagicSync = async (periodId: string, staffId?: string): Promise<{ success: boolean; slips_updated?: number; error?: string }> => {
  if (!supabase) return { success: false, error: 'Chế độ Offline không hỗ trợ Magic Sync Backend.' };
  const { data, error } = await supabase.rpc('payroll_magic_sync', { p_period_id: periodId, p_staff_id: staffId || null });
  if (error) { console.error("RPC payroll_magic_sync error:", error); return { success: false, error: error.message }; }
  return data || { success: true };
};

export const login = async (username: string, password: string): Promise<{ success: boolean; user?: Staff; error?: string }> => {
  if (!isConfigured || !supabase) {
    const { mockStaff } = await import('./mockData');
    const user = mockStaff.find((s: any) => s.username === username && s.password === password);
    return user ? { success: true, user: user as Staff } : { success: false, error: 'Chế độ Offline: Sai thông tin đăng nhập.' };
  }
  const res = await supabase.from('staff').select('*').eq('username', username).eq('password', password).maybeSingle();
  if (res.error) return { success: false, error: res.error.message };
  if (!res.data) return { success: false, error: 'Tên đăng nhập hoặc mật khẩu không chính xác.' };
  return { success: true, user: staffFromDb(res.data) };
};

export const fetchBootstrapData = async () => {
  if (!isConfigured || !supabase) { console.warn('Supabase not configured. App will run with mock data.'); return null; }
  const safeFetch = async (query: any, fallback: any = []) => { try { const { data, error } = await query; if (error) { console.warn(`Fetch warning:`, error.message); return fallback; } return data || fallback; } catch (e) { console.warn(`Fetch exception:`, e); return fallback; } };
  const [servicesData, staffData, customersData, contractsData, transactionsData, settingsData, expenseCatsData, serviceTypesData, taskTemplatesData, scheduleLabelsData, serviceGroupsData] = await Promise.all([
    safeFetch(supabase.from('services').select('*').order('created_at', { ascending: false })),
    safeFetch(supabase.from('staff').select('*')),
    safeFetch(supabase.from('customers').select('*').limit(200)), 
    safeFetch(supabase.from('contracts').select('*').order('created_at', { ascending: false }).limit(50)), 
    safeFetch(supabase.from('transactions').select('*').order('transaction_date', { ascending: false }).limit(50)), 
    safeFetch(supabase.from('settings').select('*').limit(1), []),
    safeFetch(supabase.from('expense_categories').select('*').order('sort_order', { ascending: true })),
    safeFetch(supabase.from('service_types').select('*').order('name', { ascending: true })),
    safeFetch(supabase.from('service_task_templates').select('*')),
    safeFetch(supabase.from('schedule_labels').select('label').order('label', { ascending: true })),
    safeFetch(supabase.from('service_groups').select('*').order('group_name', { ascending: true })),
  ]);
  const serviceTemplates = taskTemplatesData.map(taskTemplateFromDb);
  const services = servicesData.map(serviceFromDb).map((s: Service) => ({ ...s, taskTemplates: serviceTemplates.filter((t: ServiceTaskTemplate) => t.serviceId === s.ma_dv) }));
  const staff = staffData.map(staffFromDb);
  const customers = customersData.map(customerFromDb);
  const transactions = transactionsData.map(transactionFromDb);
  const scheduleLabels = scheduleLabelsData.map((d: any) => d.label);
  const studioInfo = settingsData.length > 0 ? studioInfoFromDb(settingsData[0]) : null;
  const expenseCategories = expenseCatsData.map(expenseCategoryFromDb);
  const serviceTypes = serviceTypesData.map(serviceTypeFromDb);
  const serviceGroups = serviceGroupsData.map(serviceGroupFromDb);
  const contractMap = new Map<string, Contract>();
  for (const r of contractsData) contractMap.set(r.id, contractFromDb(r));

  const bootstrapContractIds = contractsData.map((r: any) => r.id).filter(Boolean);
  const bootstrapTxMap = await fetchTransactionsByContractIds(bootstrapContractIds);
  for (const [contractId, contract] of contractMap.entries()) {
    (contract as any).transactions = bootstrapTxMap.get(contractId) || [];
  }

  return { services, staff, customers, contracts: Array.from(contractMap.values()), transactions, schedules: [], studioInfo, expenseCategories, serviceTypes, tasks: [], scheduleLabels, serviceGroups };
};

export const fetchConsultationMasterData = async () => {
  const [
    sourcesRes,
    statusesRes,
    rejectionReasonsRes,
    servicesRes,
    staffRes,
  ] = await Promise.all([
    supabase
      .from('consultation_sources')
      .select('*')
      .eq('dang_su_dung', true)
      .order('thu_tu_hien_thi', { ascending: true })
      .order('ten_nguon', { ascending: true }),

    supabase
      .from('consultation_statuses')
      .select('*')
      .eq('dang_su_dung', true)
      .order('thu_tu_hien_thi', { ascending: true })
      .order('ten_tinh_trang', { ascending: true }),

    supabase
      .from('consultation_rejection_reasons')
      .select('*')
      .eq('dang_su_dung', true)
      .order('thu_tu_hien_thi', { ascending: true })
      .order('ten_ly_do', { ascending: true }),

    supabase
      .from('consultation_services')
      .select('*')
      .eq('dang_su_dung', true)
      .order('thu_tu_hien_thi', { ascending: true })
      .order('ten_dich_vu', { ascending: true }),

    supabase
      .from('staff')
      .select('id, name, role, status')
      .eq('status', 'active')
      .order('name', { ascending: true }),
  ]);

  if (sourcesRes.error) throw sourcesRes.error;
  if (statusesRes.error) throw statusesRes.error;
  if (rejectionReasonsRes.error) throw rejectionReasonsRes.error;
  if (servicesRes.error) throw servicesRes.error;
  if (staffRes.error) throw staffRes.error;

  return {
    sources: (sourcesRes.data || []).map(consultationSourceFromDb),
    statuses: (statusesRes.data || []).map(consultationStatusFromDb),
    rejectionReasons: (rejectionReasonsRes.data || []).map(consultationRejectionReasonFromDb),
    services: (servicesRes.data || []).map(consultationServiceFromDb),
    staffOptions: (staffRes.data || []).map((row: any) => ({
      id: row.id,
      name: row.name,
      role: row.role,
      status: row.status,
    })),
  };
};

export const fetchConsultationLogsPaginated = async (
  page: number = 1,
  pageSize: number = 20,
  filters?: Partial<ConsultationFilter>
) => {
  const safePage = Math.max(1, page);
  const safePageSize = Math.max(1, Math.min(pageSize, 100));
  const from = (safePage - 1) * safePageSize;
  const to = from + safePageSize - 1;

  let query = supabase
    .from('consultation_logs')
    .select('*', { count: 'exact' });

  if (filters?.tinh_trang_id) {
    query = query.eq('tinh_trang_id', filters.tinh_trang_id);
  }

  if (filters?.nguon_khach_hang_id) {
    query = query.eq('nguon_khach_hang_id', filters.nguon_khach_hang_id);
  }

  if (filters?.nhan_vien_tu_van) {
    query = query.eq('nhan_vien_tu_van', filters.nhan_vien_tu_van);
  }

  if (filters?.tu_ngay) {
    query = query.gte('ngay_tu_van', filters.tu_ngay);
  }

  if (filters?.den_ngay) {
    query = query.lte('ngay_tu_van', filters.den_ngay);
  }

  const tuKhoa = filters?.tu_khoa?.trim();
  if (tuKhoa) {
    query = query.or(
      `ten_khach_hang.ilike.%${tuKhoa}%,so_dien_thoai.ilike.%${tuKhoa}%`
    );
  }

  const { data, error, count } = await query
    .order('ngay_tu_van', { ascending: false })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) throw error;

  return {
    data: (data || []).map(consultationLogFromDb),
    total: count || 0,
    page: safePage,
    pageSize: safePageSize,
    totalPages: Math.ceil((count || 0) / safePageSize),
  };
};

export const fetchConsultationLogServicesByLogIds = async (
  logIds: string[]
): Promise<ConsultationLogService[]> => {
  if (!logIds || logIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from('consultation_log_services')
    .select('id, consultation_log_id, service_id, created_at')
    .in('consultation_log_id', logIds);

  if (error) throw error;

  return (data || []).map((row: any) => ({
    id: row.id,
    consultation_log_id: row.consultation_log_id,
    service_id: row.service_id,
    created_at: row.created_at,
  }));
};

type ConsultationMasterDataBundle = {
  sources: ConsultationSource[];
  statuses: ConsultationStatus[];
  rejectionReasons: ConsultationRejectionReason[];
  services: ConsultationService[];
  staffOptions: Array<{
    id: string;
    name: string;
    role?: string;
    status?: string;
  }>;
};

export const enrichConsultationLogs = (
  logs: ConsultationLog[],
  masterData: ConsultationMasterDataBundle,
  logServices: ConsultationLogService[] = []
): ConsultationLog[] => {
  const sourceMap = new Map(
    masterData.sources.map((item) => [item.id, item.ten_nguon])
  );

  const statusMap = new Map(
    masterData.statuses.map((item) => [item.id, item.ten_tinh_trang])
  );

  const rejectionReasonMap = new Map(
    masterData.rejectionReasons.map((item) => [item.id, item.ten_ly_do])
  );

  const serviceMap = new Map(
    masterData.services.map((item) => [item.id, item.ten_dich_vu])
  );

  const staffMap = new Map(
    masterData.staffOptions.map((item) => [item.id, item.name])
  );

  const serviceIdsByLogId = new Map<string, string[]>();

  for (const row of logServices) {
    const current = serviceIdsByLogId.get(row.consultation_log_id) || [];
    current.push(row.service_id);
    serviceIdsByLogId.set(row.consultation_log_id, current);
  }

  return logs.map((log) => {
    const serviceIds = serviceIdsByLogId.get(log.id) || [];
    const serviceNames = serviceIds
      .map((id) => serviceMap.get(id))
      .filter(Boolean) as string[];

    return {
      ...log,
      nguon_khach_hang_ten: log.nguon_khach_hang_id
        ? sourceMap.get(log.nguon_khach_hang_id) || ''
        : '',
      tinh_trang_ten: log.tinh_trang_id
        ? statusMap.get(log.tinh_trang_id) || ''
        : '',
      ly_do_tu_choi_ten: log.ly_do_tu_choi_id
        ? rejectionReasonMap.get(log.ly_do_tu_choi_id) || ''
        : '',
      nhan_vien_tu_van_ten: log.nhan_vien_tu_van
        ? staffMap.get(log.nhan_vien_tu_van) || ''
        : '',
      dich_vu_quan_tam_ids: serviceIds,
      dich_vu_quan_tam_ten: serviceNames,
    };
  });
};

export const fetchConsultationListData = async (
  page: number = 1,
  pageSize: number = 20,
  filters?: Partial<ConsultationFilter>
) => {
  const [masterData, paginatedLogs] = await Promise.all([
    fetchConsultationMasterData(),
    fetchConsultationLogsPaginated(page, pageSize, filters),
  ]);

  const logIds = paginatedLogs.data.map((item) => item.id);

  const logServices = await fetchConsultationLogServicesByLogIds(logIds);

  const enrichedData = enrichConsultationLogs(
    paginatedLogs.data,
    masterData,
    logServices
  );

  return {
    ...paginatedLogs,
    data: enrichedData,
    masterData,
    logServices,
  };
};

export const fetchContractsPaginated = async (page: number, pageSize: number, searchCode: string = '', searchName: string = '') => {
  if (!supabase) return { data: [], count: 0 };
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  let query = supabase.from('contracts').select('*, customers!inner(*), contract_items(*), schedules(*)', { count: 'exact' }).order('created_at', { ascending: false }).range(from, to);
  if (searchCode) query = query.ilike('contract_code', `%${searchCode}%`);
  if (searchName) query = query.ilike('customers.name', `%${searchName}%`);
  const { data, count, error } = await query;
  if (error) { console.error("Pagination fetch error:", error); return { data: [], count: 0 }; }

  const txMap = await fetchTransactionsByContractIds((data || []).map((r: any) => r.id));

  const contracts: Contract[] = data.map((r: any) => {
    const c = contractFromDb(r);
    if (r.customers) c.customer = customerFromDb(r.customers);
    if (r.contract_items && Array.isArray(r.contract_items)) c.items = r.contract_items.map(contractItemFromDb);
    if (r.schedules && Array.isArray(r.schedules)) c.schedules = r.schedules.map(scheduleFromDb);
    (c as any).transactions = txMap.get(c.id) || [];
    return c;
  });
  return { data: contracts, count: count || 0 };
};

export const fetchServicesPaginated = async (page: number, pageSize: number, search: string = '', type: string = 'ALL') => {
  if (!supabase) return { data: [], count: 0 };
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  let query = supabase.from('services').select('*, service_task_templates(*)', { count: 'exact' }).order('created_at', { ascending: false }).range(from, to);
  if (search) query = query.or(`ten_dv.ilike.%${search}%,ma_dv.ilike.%${search}%`);
  if (type !== 'ALL') query = query.eq('nhom_dv', type);
  const { data, count, error } = await query;
  if (error) { console.error("Services pagination error:", error); return { data: [], count: 0 }; }
  const services = data.map((r: any) => {
      const s = serviceFromDb(r);
      if (r.service_task_templates && Array.isArray(r.service_task_templates)) {
          s.taskTemplates = r.service_task_templates.map(taskTemplateFromDb);
      }
      return s;
  });
  return { data: services, count: count || 0 };
};

export const fetchDashboardRangeData = async (start: Date, end: Date) => {
  if (!supabase) return { contracts: [], transactions: [] };

  // IMPORTANT:
  // - contract_date & transaction_date are Postgres DATE (yyyy-mm-dd).
  // - Using toISOString() introduces timezone shifts and can exclude the last day of the range.
  // => Always send DATE strings (yyyy-mm-dd) generated from LOCAL date parts.
  const formatDateLocal = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const startStr = formatDateLocal(start);
  const endStr = formatDateLocal(end);

  // PostgREST/Supabase may return limited rows (often 1000) unless you paginate.
  // Dashboard totals must be 100% accurate => fetch all pages.
  const PAGE_SIZE = 1000;

  const fetchAll = async <T,>(
    queryFactory: (from: number, to: number) => Promise<{ data: T[] | null; error: any }>
  ): Promise<T[]> => {
    const all: T[] = [];
    let from = 0;
    while (true) {
      const to = from + PAGE_SIZE - 1;
      const { data, error } = await queryFactory(from, to);
      if (error) throw error;
      const chunk = data || [];
      all.push(...chunk);
      if (chunk.length < PAGE_SIZE) break;
      from += PAGE_SIZE;
    }
    return all;
  };

  const [contractsRaw, transactionsRaw] = await Promise.all([
    fetchAll<any>((from, to) =>
      supabase
        .from('contracts')
        .select('*, contract_items(*), customers(*)')
        .gte('contract_date', startStr)
        .lte('contract_date', endStr)
        .range(from, to)
    ),
    fetchAll<any>((from, to) =>
      supabase
        .from('transactions')
        .select('*')
        .gte('transaction_date', startStr)
        .lte('transaction_date', endStr)
        .range(from, to)
    )
  ]);

  const contracts: Contract[] = (contractsRaw || []).map((r: any) => {
    const c = contractFromDb(r);
    if (r.contract_items && Array.isArray(r.contract_items)) c.items = r.contract_items.map(contractItemFromDb);
    if (r.customers) c.customer = customerFromDb(r.customers);
    return c;
  });

  const transactions: Transaction[] = (transactionsRaw || []).map(transactionFromDb);

  return { contracts, transactions };
};

export const fetchTransactionReportData = async (year: number, month?: number | 'ALL') => {
  if (!supabase) return [];
  let query = supabase.from('transactions').select('*');
  let startStr, endStr;
  if (month && month !== 'ALL') {
     const m = Number(month);
     startStr = new Date(year, m - 1, 1).toISOString();
     endStr = new Date(year, m, 0, 23, 59, 59).toISOString();
  } else {
     startStr = new Date(year, 0, 1).toISOString();
     endStr = new Date(year, 11, 31, 23, 59, 59).toISOString();
  }
  query = query.gte('transaction_date', startStr).lte('transaction_date', endStr);
  const { data, error } = await query.limit(2000); 
  if (error) return [];
  return (data || []).map(transactionFromDb);
};

  export const fetchTasksPaginated = async (
  page: number,
  pageSize: number,
  search: string = '',
  status: string = 'ALL',
  staffId: string = 'ALL',
  assignment: string = 'ALL',
  staffCode: string = ''
) => {
  if (!supabase) return { data: [], count: 0 };
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
    
  const baseQuery = () =>
    supabase
      .from('tasks')
      .select('*, task_attachments(*), contracts(contract_code, customers(name, address, phone))', { count: 'exact' })
      .order('due_date', { ascending: false })
      .range(from, to);

  const applyFilters = (query: any, staffFilterMode: 'contains' | 'ilike') => {
    let next = query;
    if (search) next = next.ilike('name', `%${search}%`);
    if (status !== 'ALL') next = next.eq('status', status);
    if (staffId !== 'ALL') {
      if (staffFilterMode === 'contains') {
        const values = [staffId, staffCode].filter(Boolean);
        const numericId = Number(staffId);
        if (!Number.isNaN(numericId) && String(numericId) === staffId) {
          values.push(numericId.toString());
        }
        const orFilters = values
          .map(value => `assigned_staff_ids.cs.${JSON.stringify([value])}`)
          .join(',');
        next = orFilters ? next.or(orFilters) : next.contains('assigned_staff_ids', [staffId]);
      } else {
        const values = [staffId, staffCode].filter(Boolean);
        const orFilters = values.map(value => `assigned_staff_ids.ilike.%${value}%`).join(',');
        next = orFilters ? next.or(orFilters) : next.ilike('assigned_staff_ids', `%${staffId}%`);
      }
    } else if (assignment === 'ASSIGNED') {
      next = next.neq('assigned_staff_ids', '[]');
    } else if (assignment === 'UNASSIGNED') {
      next = next.or('assigned_staff_ids.is.null,assigned_staff_ids.eq.[]');
    }
    return next;
  };

  const { data, count, error } = await applyFilters(baseQuery(), 'contains');
  if (error && staffId !== 'ALL') {
    console.warn('[Supabase] staff filter contains failed, retrying with text match.', error);
    const fallback = await applyFilters(baseQuery(), 'ilike');
    if (fallback.error) return { data: [], count: 0 };
    return { data: fallback.data.map(taskFromDb), count: fallback.count || 0 };
  }
  if (error) return { data: [], count: 0 };
    return { data: data.map(taskFromDb), count: count || 0 };
};

export const fetchTransactionsPaginated = async (page: number, pageSize: number, type: 'income' | 'expense' | null, search: string = '') => {
  if (!supabase) return { data: [], count: 0 };
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  let query = supabase.from('transactions').select('*', { count: 'exact' }).order('transaction_date', { ascending: false }).range(from, to);
  if (type) query = query.eq('transaction_type', type);
  if (search) query = query.or(`description.ilike.%${search}%,category.ilike.%${search}%,main_category.ilike.%${search}%`);
  const { data, count, error } = await query;
  if (error) return { data: [], count: 0 };
  const transactions = data.map(transactionFromDb);
  return { data: transactions, count: count || 0 };
};

export const fetchSchedulesPaginated = async (page: number, pageSize: number, type: string | null) => {
  if (!supabase) return { data: [], count: 0 };
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  let query = supabase.from('schedules').select('*', { count: 'exact' }).order('schedule_date', { ascending: false }).range(from, to);
  if (type) query = query.eq('schedule_type', type);
  const { data, count, error } = await query;
  if (error) return { data: [], count: 0 };
  const schedules = data.map(scheduleFromDb);
  return { data: schedules, count: count || 0 };
};

export const fetchTasks = async (): Promise<Task[]> => { return []; };

export const saveTaskAttachment = async (attachment: Partial<TaskAttachment>) => {
  if (!supabase) return null;
  const payload = { task_id: attachment.taskId, file_id: attachment.fileId, file_url: attachment.fileUrl };
  const { data, error } = await supabase.from('task_attachments').insert(payload).select().single();
  if (error) throw error;
  return { id: data.id, taskId: data.task_id, fileUrl: data.file_url, fileId: data.file_id, createdAt: data.created_at };
};

export const deleteTaskAttachment = async (id: string) => {
  if (!supabase) return false;
  const { error } = await supabase.from('task_attachments').delete().eq('id', id);
  if (error) throw error;
  return true;
};

// Payroll API
export const fetchSalaryPeriods = async (): Promise<SalaryPeriod[]> => {
  if (!supabase) return [];
  const { data, error } = await supabase.from('salary_periods').select('*').order('year', { ascending: false }).order('month', { ascending: false });
  if (error) return [];
  return data.map(salaryPeriodFromDb);
};

export const openSalaryPeriod = async (month: number, year: number) => {
  // Check existing
  const { data: existing } = await supabase.from('salary_periods').select('*').eq('month', month).eq('year', year).maybeSingle();
  if (existing) return salaryPeriodFromDb(existing);
  
  const lastDay = new Date(year, month, 0).getDate();
  const mm = String(month).padStart(2, '0');
  const dd = String(lastDay).padStart(2, '0');
  const startDate = `${year}-${mm}-01`;
  const endDate = `${year}-${mm}-${dd}`;
  
  const { data, error } = await supabase.from('salary_periods').insert({ 
    month, year, start_date: startDate, end_date: endDate, status: 'open' 
  }).select().single();
  
  if (error) throw error;
  return salaryPeriodFromDb(data);
};

export const fetchSalarySlips = async (periodId: string) => {
  if (!supabase) return [];
  const { data } = await supabase.from('salary_slips').select('*, staff!inner(name, code)').eq('salary_period_id', periodId);
  return (data || []).map((s: any) => ({ ...salarySlipFromDb(s), staffName: s.staff?.name }));
};

export const fetchSalaryItemsByPeriod = async (periodId: string) => {
  if (!supabase) return [];
  const { data } = await supabase.from('salary_items').select('*, salary_slips!inner(salary_period_id)').eq('salary_slips.salary_period_id', periodId);
  return (data || []).map(salaryItemFromDb);
};

export const fetchSalarySlipItems = async (slipId: string) => {
  if (!supabase) return [];
  const { data } = await supabase.from('salary_items').select('*').eq('salary_slip_id', slipId);
  return (data || []).map(salaryItemFromDb);
};

export const saveSalaryItem = async (item: Partial<SalaryItem>) => {
  if (!supabase) return;
  const payload = { salary_slip_id: item.salarySlipId, type: item.type, title: item.title, amount: item.amount, source: item.source, ref_id: item.refId };
  await supabase.from('salary_items').insert(payload);
};

export const deleteSalaryItem = async (id: string) => {
  if (!supabase) return;
  await supabase.from('salary_items').delete().eq('id', id);
};

export const initializeSalarySlip = async (periodId: string, staffId: string) => {
  if (!supabase) return null;
  const { data } = await supabase.from('salary_slips').insert({ salary_period_id: periodId, staff_id: staffId, total_earnings: 0, total_deductions: 0, net_pay: 0 }).select().single();
  return salarySlipFromDb(data);
};

// ... Sync Data ...
const upsertOne = async (table: string, payload: any) => {
  const res = await supabase.from(table).upsert(payload).select().single();
  throwIfError(res, `upsert ${table}`);
  return res.data;
};

const deleteBy = async (table: string, key: string, value: any) => {
  const res = await supabase.from(table).delete().eq(key, value);
  throwIfError(res, `delete ${table} where ${key}=${value}`);
  return true;
};

export const syncData = async (table: string, action: 'CREATE' | 'UPDATE' | 'DELETE', rawData: any) => {
  if (!isConfigured || !supabase) return { success: true, simulated: true, data: rawData };
  let tableName = table.toLowerCase();
  if (tableName === 'products' || tableName === 'sanpham') tableName = 'services';
  if (tableName === 'nhanvien') tableName = 'staff';
  if (tableName === 'hopdong') tableName = 'contracts';
  if (tableName === 'thuchi') tableName = 'transactions';
  if (tableName === 'khachhang') tableName = 'customers';
  if (tableName === 'lichlamviec') tableName = 'schedules';
  if (tableName === 'tasks') tableName = 'tasks';

  if (action === 'DELETE') {
    if (tableName === 'services') { await deleteBy('services', 'ma_dv', rawData.ma_dv ?? rawData.id ?? rawData.code); return { success: true }; }
    await deleteBy(tableName, 'id', rawData.id); return { success: true };
  	if (tableName === 'staff') {
		  if (!rawData?.id) {
	  	throw new Error('Missing staff.id for DELETE');
	  	}

  		// Thử xóa cứng trước
	  	const { error } = await supabase
  		.from('staff')
  		.delete()
		  .eq('id', rawData.id);
	
		// Nếu bị FK chặn → soft delete
	  	if (error) {
		  console.warn('Hard delete staff failed, fallback to Inactive:', error.message);
	
	  	const { error: softError } = await supabase
	  		.from('staff')
  			.update({ status: 'Inactive' })
  			.eq('id', rawData.id);
	
  		if (softError) throw softError;
	
  		return { success: true, softDeleted: true };
		  }
	
		  return { success: true };
	  }
  }

  if (tableName === 'services') {
    const data = await upsertOne('services', serviceToDb(rawData));
    if (rawData.taskTemplates) {
       const { data: existing } = await supabase.from('service_task_templates').select('id').eq('service_id', data.ma_dv);
       const existingIds = existing?.map((x:any) => x.id) || [];
       const currentIds = rawData.taskTemplates.map((x:any) => x.id).filter((x:string) => x);
       const toDelete = existingIds.filter((id: string) => !currentIds.includes(id));
       if (toDelete.length > 0) await supabase.from('service_task_templates').delete().in('id', toDelete);
       for (const tpl of rawData.taskTemplates) {
          const payload = taskTemplateToDb({ ...tpl, serviceId: data.ma_dv });
          if (tpl.id && !tpl.id.startsWith('temp-')) { await supabase.from('service_task_templates').update(payload).eq('id', tpl.id); } 
          else { await supabase.from('service_task_templates').insert(payload); }
       }
    }
    return { success: true, data: serviceFromDb(data) };
  }

  if (tableName === 'tasks') {
    const payload = taskToDb(rawData);
    if (action === 'UPDATE') {
      const { data, error } = await supabase.from('tasks').update(payload).eq('id', rawData.id).select().single();
      throwIfError({ data, error }, 'updateTask');
      return { success: true, data: taskFromDb(data) };
    } else { const data = await upsertOne('tasks', payload); return { success: true, data: taskFromDb(data) }; }
  }

  if (tableName === 'contracts') {
    const savedContract = await upsertOne('contracts', contractToDb(rawData));
    const { data: existingItems } = await supabase.from('contract_items').select('id').eq('contract_id', savedContract.id);
    const existingIds: string[] = existingItems?.map((x: any) => x.id) || [];
    const items = Array.isArray(rawData.items) ? rawData.items : [];
    const payloadIds = items.map((i: any) => i.id);
    const idsToDelete = existingIds.filter((id) => !payloadIds.includes(id));
    if (idsToDelete.length > 0) {
       await supabase.from('tasks').delete().in('contract_item_id', idsToDelete);
       await supabase.from('contract_items').delete().in('id', idsToDelete);
    }
    for (const it of items) {
      const savedItemRes = await upsertOne('contract_items', contractItemToDb({ ...it, contractId: savedContract.id }));
      const { data: existingTasks } = await supabase.from('tasks').select('id').eq('contract_item_id', savedItemRes.id);
      if (!existingTasks || existingTasks.length === 0) {
         const { data: templates } = await supabase.from('service_task_templates').select('*').eq('service_id', it.serviceId);
         if (templates && templates.length > 0) {
            const tasksToCreate = templates.map((tpl: any) => ({
               contract_id: savedContract.id, contract_item_id: savedItemRes.id, name: tpl.name, status: 'Pending', due_date: null, assigned_staff_ids: [], notes: '', schedule_type_link: tpl.schedule_type_link
            }));
            await supabase.from('tasks').insert(tasksToCreate);
         }
      }
    }
	    // =======================
    // SYNC & DELETE SCHEDULES
    // =======================
    const schedules = Array.isArray(rawData.schedules) ? rawData.schedules : [];
    // --- Sync delete schedules removed from UI ---
    // schedules table is separate from contracts; we need to delete schedules that no longer exist in payload.
    try {
      const { data: existingSchedules, error: existingSchedulesErr } = await supabase
        .from('schedules')
        .select('id')
        .eq('contract_id', savedContract.id);
      if (existingSchedulesErr) throw existingSchedulesErr;
      const existingScheduleIds: string[] = (existingSchedules || []).map((s: any) => s.id);
      const schedulePayloadIds: string[] = schedules
        .map((s: any) => s.id)
        .filter((id: string) => !!id && !String(id).startsWith('temp-'));
      const scheduleIdsToDelete = existingScheduleIds.filter((id) => !schedulePayloadIds.includes(id));
      if (scheduleIdsToDelete.length > 0) {
        await supabase.from('schedules').delete().in('id', scheduleIdsToDelete);
      }
    } catch (e) {
      console.error('syncData/contracts: delete schedules failed', e);
    }


    for (const sc of schedules) {
      await upsertOne('schedules', scheduleToDb({ ...sc, contractId: savedContract.id, contractCode: sc.contractCode ?? rawData.contractCode }));
      if (sc.type && sc.date) {
         await supabase.from('tasks').update({ due_date: sc.date }).eq('contract_id', savedContract.id).eq('schedule_type_link', sc.type).is('due_date', null);
         await supabase.from('tasks').update({ due_date: sc.date }).eq('contract_id', savedContract.id).eq('schedule_type_link', sc.type);
      }
    }
    const out = contractFromDb(savedContract);
    out.items = items;
    out.schedules = schedules;
    (out as any).transactions = (await fetchTransactionsByContractIds([savedContract.id])).get(savedContract.id) || [];
    return { success: true, data: out };
  }

  if (tableName === 'settings') { const payload = studioInfoToDb(rawData); const data = await upsertOne('settings', payload); return { success: true, data: studioInfoFromDb(data) }; }
  if (tableName === 'staff') { const data = await upsertOne('staff', staffToDb(rawData)); return { success: true, data: staffFromDb(data) }; }
  if (tableName === 'customers') { const data = await upsertOne('customers', customerToDb(rawData)); return { success: true, data: customerFromDb(data) }; }
  if (tableName === 'transactions') { const data = await upsertOne('transactions', transactionToDb(rawData)); return { success: true, data: transactionFromDb(data) }; }
  if (tableName === 'schedules') { const data = await upsertOne('schedules', scheduleToDb(rawData)); return { success: true, data: scheduleFromDb(data) }; }

  const data = await upsertOne(tableName, rawData);
  return { success: true, data };
};

export const generateContractCode = async (): Promise<string> => {
  const date = new Date();
  const year = date.getFullYear();
  const yy = year.toString().slice(-2);
  const mm = (date.getMonth() + 1).toString().padStart(2, '0');
  const prefix = `STT${yy}${mm}`;
  if (!supabase) return `${prefix}01`;
  const { data, error } = await supabase.from('contracts').select('contract_code').ilike('contract_code', `${prefix}%`).order('contract_code', { ascending: false }).limit(1);
  if (error || !data || data.length === 0) return `${prefix}01`;
  const lastCode = data[0].contract_code;
  const suffix = lastCode.replace(prefix, '');
  const lastNum = parseInt(suffix, 10);
  if (isNaN(lastNum)) return `${prefix}01`;
  const nextNum = lastNum + 1;
  return `${prefix}${String(nextNum).padStart(2, '0')}`;
};

export const createScheduleLabel = async (label: string) => { if (!supabase) return; const { error } = await supabase.from('schedule_labels').insert({ label }); throwIfError({ error }, 'createScheduleLabel'); };
export const updateScheduleLabel = async (oldLabel: string, newLabel: string) => { if (!supabase) return; const { error } = await supabase.from('schedule_labels').update({ label: newLabel }).eq('label', oldLabel); throwIfError({ error }, 'updateScheduleLabel'); };
export const deleteScheduleLabel = async (label: string) => { if (!supabase) return; const { error } = await supabase.from('schedule_labels').delete().eq('label', label); throwIfError({ error }, 'deleteScheduleLabel'); };
export const createServiceType = async (name: string): Promise<ServiceTypeItem | null> => { if (!supabase) return null; const { data, error } = await supabase.from('service_types').insert({ name }).select().single(); throwIfError({ error }, 'createServiceType'); return serviceTypeFromDb(data); };
export const deleteServiceType = async (id: string) => { if (!supabase) return; const { error } = await supabase.from('service_types').delete().eq('id', id); throwIfError({ error }, 'deleteServiceType'); };
export const createServiceGroup = async (groupName: string): Promise<ServiceGroupItem | null> => { if (!supabase) return null; const { data, error } = await supabase.from('service_groups').insert({ group_name: groupName }).select().single(); throwIfError({ error }, 'createServiceGroup'); return serviceGroupFromDb(data); };
export const deleteServiceGroup = async (id: string) => { if (!supabase) return; const { error } = await supabase.from('service_groups').delete().eq('id', id); throwIfError({ error }, 'deleteServiceGroup'); };
export const uploadTransactionImage = async (file: File, metadata: any) => { const formData = new FormData(); formData.append('file', file); formData.append('metadata', JSON.stringify(metadata)); const res = await fetch('/api/drive_upload', { method: 'POST', body: formData }); return res.json(); };
export const uploadTaskImage = async (file: File, metadata: any) => { return uploadTransactionImage(file, metadata); };
export const createExpenseCategory = async (name: string, level: number, parentId: string | null): Promise<ExpenseCategoryItem | null> => { if (!supabase) return null; const { data, error } = await supabase.from('expense_categories').insert({ name, level, parent_id: parentId }).select().single(); throwIfError({ error }, 'createExpenseCategory'); return expenseCategoryFromDb(data); };
export const deleteExpenseCategory = async (id: string) => { if (!supabase) return; const { error } = await supabase.from('expense_categories').delete().eq('id', id); throwIfError({ error }, 'deleteExpenseCategory'); };
export const fetchFixedCostsWithStaff = async (): Promise<FixedCost[]> => { if (!supabase) return []; const { data } = await supabase.from('fixed_costs').select('*'); const fc = (data || []).map(fixedCostFromDb); const staffRes = await supabase.from('staff').select('*').eq('status', 'Active'); const staffFixed = (staffRes.data || []).map((s: any) => ({ id: `staff-sal-${s.id}`, name: `Lương: ${s.name}`, amount: Number(s.base_salary || 0), cycle: 'monthly' as const, startDate: s.start_date || new Date().toISOString().split('T')[0], isActive: true, isSystemGenerated: true, sourceId: s.id })); return [...fc, ...staffFixed]; };
export const saveFixedCost = async (fc: Partial<FixedCost>, action: 'CREATE' | 'UPDATE'): Promise<FixedCost | null> => { if (!supabase) return null; const payload = fixedCostToDb(fc); const { data, error } = await supabase.from('fixed_costs').upsert(payload).select().single(); throwIfError({ error }, 'saveFixedCost'); return fixedCostFromDb(data); };
export const deleteFixedCost = async (id: string) => { if (!supabase) return; const { error } = await supabase.from('fixed_costs').delete().eq('id', id); throwIfError({ error }, 'deleteFixedCost'); };
export const fetchRevenueStreams = async (): Promise<RevenueStream[]> => { if (!supabase) return []; const { data } = await supabase.from('service_types').select('*'); return (data || []).map((t: any) => ({ id: t.id, streamName: t.name, avgVariableCostRate: 0.4 })); };
export const calculateBreakeven = async (start: Date, end: Date, fixedCosts: FixedCost[], transactions: Transaction[], streams: RevenueStream[]): Promise<BreakevenResult> => { const totalFixed = fixedCosts.filter(fc => fc.isActive).reduce((sum, fc) => sum + fc.amount, 0); const incomeTxs = transactions.filter(t => t.type === TransactionType.INCOME && new Date(t.date) >= start && new Date(t.date) <= end); const totalRevenue = incomeTxs.reduce((sum, t) => sum + t.amount, 0); const totalVariable = transactions.filter(t => t.type === TransactionType.EXPENSE && t.mainCategory !== 'Định phí' && new Date(t.date) >= start && new Date(t.date) <= end).reduce((sum, t) => sum + t.amount, 0); const contributionMargin = totalRevenue - totalVariable; const contributionMarginRatio = totalRevenue > 0 ? contributionMargin / totalRevenue : 0; const breakEvenPoint = contributionMarginRatio > 0 ? totalFixed / contributionMarginRatio : 0; return { period: start.toISOString(), totalFixedCosts: totalFixed, totalRevenue, totalVariableCosts: totalVariable, contributionMargin, contributionMarginRatio, breakEvenPoint, safetyMargin: totalRevenue - breakEvenPoint, isProfitable: totalRevenue > breakEvenPoint, roi: totalFixed > 0 ? (totalRevenue - totalVariable - totalFixed) / totalFixed : 0 }; };
export const fetchAssets = async (): Promise<Asset[]> => { if (!supabase) return []; const { data } = await supabase.from('assets').select('*'); return (data || []).map(assetFromDb); };
export const saveAsset = async (asset: Partial<Asset>, action: 'CREATE' | 'UPDATE'): Promise<Asset | null> => { if (!supabase) return null; const payload = assetToDb(asset); const { data, error } = await supabase.from('assets').upsert(payload).select().single(); throwIfError({ error }, 'saveAsset'); return assetFromDb(data); };
export const deleteAsset = async (id: string) => { if (!supabase) return; const { error } = await supabase.from('assets').delete().eq('id', id); throwIfError({ error }, 'deleteAsset'); };
export const checkServiceCodeExists = async (code: string): Promise<boolean> => { if (!supabase) return false; const { data } = await supabase.from('services').select('ma_dv').eq('ma_dv', code).maybeSingle(); return !!data; };
export const getNextServiceCode = async (): Promise<string> => { if (!supabase) return `DV-${String(Math.floor(Math.random() * 1000000)).padStart(6, '0')}`; const { data } = await supabase.from('services').select('ma_dv').order('ma_dv', { ascending: false }).limit(1); if (!data || data.length === 0) return 'DV-000001'; const lastCode = data[0].ma_dv; const num = parseInt(lastCode.replace(/\D/g, '')) || 0; return `DV-${String(num + 1).padStart(6, '0')}`; };
export const fetchTransactionsByContractId = async (contractId: string): Promise<Transaction[]> => {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('contract_id', contractId)
    .eq('transaction_type', 'income')
    .order('transaction_date', { ascending: true });

  if (error) {
    console.error('fetchTransactionsByContractId error:', error);
    return [];
  }

  return (data || []).map(transactionFromDb);
};


// ================================
// PRINT PRODUCTION MODULE
// STEP 2.1 - Fetch from print_orders_view + inline CRUD
// ================================

const printOrderFromDb = (db: any): PrintOrder => ({
  id: db.id,
  contractId: db.contract_id ?? null,
  contractCode: db.contract_code || '',
  customerId: db.customer_id ?? null,
  tenKhachHang: db.ten_khach_hang || '',
  ngayGuiIn: asDateOnly(db.ngay_gui_in) || '',
  linkTheTrello: db.link_the_trello || '',
  linkFiles: db.link_files || '',
  imageAttachments: Array.isArray(db.image_attachments) ? db.image_attachments : [],
  soLuongAnhLon: Number(db.so_luong_anh_lon || 0),
  kichThuocAnhLonId: db.kich_thuoc_anh_lon_id ?? null,
  kichThuocAnhLon: db.kich_thuoc_anh_lon || '',
  chatLieuAnhLonId: db.chat_lieu_anh_lon_id ?? null,
  chatLieuAnhLon: db.chat_lieu_anh_lon || '',
  soLuongAnhNho: Number(db.so_luong_anh_nho || 0),
  kichThuocAnhNhoId: db.kich_thuoc_anh_nho_id ?? null,
  kichThuocAnhNho: db.kich_thuoc_anh_nho || '',
  chatLieuAnhNhoId: db.chat_lieu_anh_nho_id ?? null,
  chatLieuAnhNho: db.chat_lieu_anh_nho || '',
  printServiceId: db.print_service_id ?? null,
  tenDichVuIn: db.ten_dich_vu_in || '',
  vendorId: db.vendor_id ?? null,
  tenXuongIn: db.ten_xuong_in || '',
  statusId: db.status_id ?? null,
  tenTrangThai: db.ten_trang_thai || '',
  nguoiKiemTraNhanAnh: db.nguoi_kiem_tra_nhan_anh || '',
  ghiChu: db.ghi_chu || '',
  thongBaoDaCoAnh: !!db.thong_bao_da_co_anh,
  thongBaoDaGiaoAnh: !!db.thong_bao_da_giao_anh,
  thongBaoDangInAnh: !!db.thong_bao_dang_in_anh,
  checkFlag: !!db.check_flag,
  donGiaIn: Number(db.don_gia_in || 0),
  thanhTien: Number(db.thanh_tien || 0),
  createdAt: db.created_at || '',
  updatedAt: db.updated_at || '',
});

const printCatalogOptionFromDb = (
  db: any,
  nameField: 'ten_kich_thuoc' | 'ten_chat_lieu' | 'ten_xuong_in' | 'ten_trang_thai'
): PrintCatalogOption => ({
  id: db.id,
  name: db[nameField] || '',
  sortOrder: Number(db.thu_tu_hien_thi || 0),
  isActive: db.dang_su_dung !== false,
});

const getPrintOrderById = async (id: string): Promise<PrintOrder | null> => {
  if (!supabase) return null;
  const res = await supabase
    .from('print_orders_view')
    .select('*')
    .eq('id', id)
    .single();
  throwIfError(res, 'getPrintOrderById');
  return res.data ? printOrderFromDb(res.data) : null;
};

export const fetchPrintOrders = async (): Promise<PrintOrder[]> => {
  if (!supabase) return [];
  const res = await supabase
    .from('print_orders_view')
    .select('*')
    .order('ngay_gui_in', { ascending: false })
    .order('created_at', { ascending: false });

  throwIfError(res, 'fetchPrintOrders');
  return (res.data || []).map(printOrderFromDb);
};

export const fetchPrintCatalogs = async (): Promise<{
  sizes: PrintCatalogOption[];
  materials: PrintCatalogOption[];
  vendors: PrintCatalogOption[];
  statuses: PrintCatalogOption[];
}> => {
  if (!supabase) {
    return { sizes: [], materials: [], vendors: [], statuses: [] };
  }

  const [sizesRes, materialsRes, vendorsRes, statusesRes] = await Promise.all([
    supabase.from('print_sizes').select('id, ten_kich_thuoc, thu_tu_hien_thi, dang_su_dung').eq('dang_su_dung', true).order('thu_tu_hien_thi', { ascending: true }).order('ten_kich_thuoc', { ascending: true }),
    supabase.from('print_materials').select('id, ten_chat_lieu, thu_tu_hien_thi, dang_su_dung').eq('dang_su_dung', true).order('thu_tu_hien_thi', { ascending: true }).order('ten_chat_lieu', { ascending: true }),
    supabase.from('print_vendors').select('id, ten_xuong_in, thu_tu_hien_thi, dang_su_dung').eq('dang_su_dung', true).order('thu_tu_hien_thi', { ascending: true }).order('ten_xuong_in', { ascending: true }),
    supabase.from('print_statuses').select('id, ten_trang_thai, thu_tu_hien_thi, dang_su_dung').eq('dang_su_dung', true).order('thu_tu_hien_thi', { ascending: true }).order('ten_trang_thai', { ascending: true }),
  ]);

  throwIfError(sizesRes, 'fetchPrintCatalogs.sizes');
  throwIfError(materialsRes, 'fetchPrintCatalogs.materials');
  throwIfError(vendorsRes, 'fetchPrintCatalogs.vendors');
  throwIfError(statusesRes, 'fetchPrintCatalogs.statuses');

  return {
    sizes: (sizesRes.data || []).map((item: any) => printCatalogOptionFromDb(item, 'ten_kich_thuoc')),
    materials: (materialsRes.data || []).map((item: any) => printCatalogOptionFromDb(item, 'ten_chat_lieu')),
    vendors: (vendorsRes.data || []).map((item: any) => printCatalogOptionFromDb(item, 'ten_xuong_in')),
    statuses: (statusesRes.data || []).map((item: any) => printCatalogOptionFromDb(item, 'ten_trang_thai')),
  };
};

export const createPrintOrder = async (payload?: Partial<PrintOrder>): Promise<PrintOrder> => {
  if (!supabase) {
    throw new Error('Supabase chưa được cấu hình.');
  }

  const insertData = {
    contract_id: payload?.contractId ?? null,
    contract_code: payload?.contractCode || '',
    customer_id: payload?.customerId ?? null,
    ten_khach_hang: payload?.tenKhachHang || 'Khách mới',
    ngay_gui_in: payload?.ngayGuiIn || new Date().toISOString().slice(0, 10),
    so_luong_anh_lon: Number(payload?.soLuongAnhLon || 0),
    kich_thuoc_anh_lon_id: payload?.kichThuocAnhLonId ?? null,
    chat_lieu_anh_lon_id: payload?.chatLieuAnhLonId ?? null,
    so_luong_anh_nho: Number(payload?.soLuongAnhNho || 0),
    kich_thuoc_anh_nho_id: payload?.kichThuocAnhNhoId ?? null,
    chat_lieu_anh_nho_id: payload?.chatLieuAnhNhoId ?? null,
    vendor_id: payload?.vendorId ?? null,
    status_id: payload?.statusId ?? null,
    nguoi_kiem_tra_nhan_anh: payload?.nguoiKiemTraNhanAnh || '',
    ghi_chu: payload?.ghiChu || '',
    link_the_trello: payload?.linkTheTrello || '',
    link_files: payload?.linkFiles || '',
    thong_bao_da_co_anh: !!payload?.thongBaoDaCoAnh,
    thong_bao_da_giao_anh: !!payload?.thongBaoDaGiaoAnh,
    thong_bao_dang_in_anh: !!payload?.thongBaoDangInAnh,
    check_flag: !!payload?.checkFlag,
    don_gia_in: Number(payload?.donGiaIn || 0),
  };

  const insertRes = await supabase.from('print_orders').insert(insertData).select('id').single();
  throwIfError(insertRes, 'createPrintOrder');

  const created = await getPrintOrderById(insertRes.data.id);
  if (!created) throw new Error('Không đọc được dòng in ấn vừa tạo.');
  return created;
};

export const updatePrintOrder = async (
  id: string,
  patch: Record<string, any>
): Promise<PrintOrder> => {
  if (!supabase) {
    throw new Error('Supabase chưa được cấu hình.');
  }

  const res = await supabase
    .from('print_orders')
    .update(patch)
    .eq('id', id)
    .select('id')
    .single();

  throwIfError(res, 'updatePrintOrder');

  const updated = await getPrintOrderById(id);
  if (!updated) throw new Error('Không đọc được dòng in ấn sau khi cập nhật.');
  return updated;
};

export const duplicatePrintOrder = async (source: PrintOrder): Promise<PrintOrder> => {
  return createPrintOrder({
    contractId: source.contractId,
    contractCode: source.contractCode,
    customerId: source.customerId,
    tenKhachHang: source.tenKhachHang ? `${source.tenKhachHang} (Bản sao)` : 'Khách mới (Bản sao)',
    ngayGuiIn: source.ngayGuiIn,
    linkTheTrello: source.linkTheTrello,
    linkFiles: source.linkFiles,
    soLuongAnhLon: source.soLuongAnhLon,
    kichThuocAnhLonId: source.kichThuocAnhLonId,
    chatLieuAnhLonId: source.chatLieuAnhLonId,
    soLuongAnhNho: source.soLuongAnhNho,
    kichThuocAnhNhoId: source.kichThuocAnhNhoId,
    chatLieuAnhNhoId: source.chatLieuAnhNhoId,
    vendorId: source.vendorId,
    statusId: source.statusId,
    nguoiKiemTraNhanAnh: source.nguoiKiemTraNhanAnh,
    ghiChu: source.ghiChu,
    thongBaoDaCoAnh: source.thongBaoDaCoAnh,
    thongBaoDaGiaoAnh: source.thongBaoDaGiaoAnh,
    thongBaoDangInAnh: source.thongBaoDangInAnh,
    checkFlag: source.checkFlag,
    donGiaIn: source.donGiaIn,
  });
};

export const softDeletePrintOrder = async (id: string): Promise<void> => {
  if (!supabase) {
    throw new Error('Supabase chưa được cấu hình.');
  }

  const res = await supabase
    .from('print_orders')
    .update({ dang_su_dung: false })
    .eq('id', id);

  throwIfError(res, 'softDeletePrintOrder');
};


const printVendorPriceFromDb = (db: any): PrintVendorPrice => ({
  id: db.id,
  vendorId: db.vendor_id,
  vendorName: db.print_vendors?.ten_xuong_in || db.ten_xuong_in || '',
  sizeId: db.size_id ?? null,
  sizeName: db.print_sizes?.ten_kich_thuoc || db.ten_kich_thuoc || '',
  materialId: db.material_id ?? null,
  materialName: db.print_materials?.ten_chat_lieu || db.ten_chat_lieu || '',
  printServiceId: db.print_service_id ?? null,
  printServiceName: db.print_services?.ten_dich_vu_in || db.ten_dich_vu_in || '',
  donGia: Number(db.don_gia || 0),
  ghiChu: db.ghi_chu || '',
  isActive: db.dang_su_dung !== false,
  createdAt: db.created_at || '',
  updatedAt: db.updated_at || '',
});

const printVendorPriceFromViewRow = (row: any): PrintVendorPrice => ({
  id: row.id,
  vendorId: row.vendor_id,
  vendorName: row.ten_xuong_in || '',
  sizeId: row.size_id ?? null,
  sizeName: row.ten_kich_thuoc || '',
  materialId: row.material_id ?? null,
  materialName: row.ten_chat_lieu || '',
  printServiceId: row.print_service_id ?? null,
  printServiceName: row.ten_dich_vu_in || '',
  donGia: Number(row.don_gia || 0),
  ghiChu: row.ghi_chu || '',
  isActive: row.dang_su_dung !== false,
  createdAt: row.created_at || '',
  updatedAt: row.updated_at || '',
});

const printCostRowFromRpc = (row: any): PrintCostRow => ({
  rowId: `${row.print_order_id}-${row.line_type}`,
  orderId: row.print_order_id,
  lineType: row.line_type,
  ngayGuiIn: row.ngay_gui_in || '',
  tenKhachHang: row.ten_khach_hang || '',
  vendorId: row.vendor_id ?? null,
  vendorName: row.ten_xuong_in || '',
  sizeId: row.size_id ?? null,
  sizeName: row.ten_kich_thuoc || '',
  materialId: row.material_id ?? null,
  materialName: row.ten_chat_lieu || '',
  quantity: Number(row.so_luong || 0),
  unitPrice: row.don_gia !== null && row.don_gia !== undefined ? Number(row.don_gia) : null,
  amount: row.thanh_tien !== null && row.thanh_tien !== undefined ? Number(row.thanh_tien) : null,
  pricingStatus: row.pricing_status || 'missing_price',
  contractId: row.contract_id ?? null,
  contractCode: row.contract_code || '',
});

const emptyPrintCostSummary = (): PrintCostSummary => ({
  totalRows: 0,
  totalOrders: 0,
  totalQuantity: 0,
  totalAmount: 0,
  missingPriceRows: 0,
  byVendor: [],
});

const buildPrintCostSummaryFromRpc = (
  rows: PrintCostRow[],
  summaryRows: any[]
): PrintCostSummary => ({
  totalRows: rows.length,
  totalOrders: new Set(rows.map((row) => row.orderId)).size,
  totalQuantity: rows.reduce((sum, row) => sum + Number(row.quantity || 0), 0),
  totalAmount: rows.reduce((sum, row) => sum + Number(row.amount || 0), 0),
  missingPriceRows: rows.filter((row) => row.pricingStatus === 'missing_price').length,
  byVendor: (summaryRows || []).map((row: any) => ({
    vendorId: row.vendor_id || '',
    vendorName: row.ten_xuong_in || '',
    totalRows: Number(row.tong_so_dong || 0),
    totalQuantity: Number(row.tong_so_luong || 0),
    totalAmount: Number(row.tong_thanh_tien || 0),
    missingPriceRows: Number(row.tong_dong_thieu_bao_gia || 0),
  })),
});

const applyPrintVendorPriceFilters = (query: any, filters?: PrintVendorPriceFilters) => {
  let nextQuery = query;
  if (filters?.vendorId) nextQuery = nextQuery.eq('vendor_id', filters.vendorId);
  if (filters?.sizeId) nextQuery = nextQuery.eq('size_id', filters.sizeId);
  if (filters?.materialId) nextQuery = nextQuery.eq('material_id', filters.materialId);
  if (typeof filters?.isActive === 'boolean') nextQuery = nextQuery.eq('dang_su_dung', filters.isActive);
  return nextQuery;
};

const assertPrintVendorPriceInput = (
  input: CreatePrintVendorPriceInput | UpdatePrintVendorPriceInput,
  context: 'create' | 'update'
) => {
  if (context === 'create' && !input.vendorId) {
    throw new Error('Nhà cung cấp là bắt buộc.');
  }
  if ('donGia' in input && input.donGia !== undefined) {
    const donGia = Number(input.donGia);
    if (!Number.isFinite(donGia) || donGia < 0) {
      throw new Error('Đơn giá phải là số không âm.');
    }
  }
};

const ensureNoDuplicatePrintVendorPrice = async (
  input: {
    vendorId: string;
    sizeId?: string | null;
    materialId?: string | null;
    printServiceId?: string | null;
  },
  excludeId?: string
) => {
  if (!supabase) return;

  let query = supabase
    .from('print_vendor_prices')
    .select('id')
    .eq('vendor_id', input.vendorId)
    .eq('dang_su_dung', true);

  if (input.sizeId) query = query.eq('size_id', input.sizeId);
  else query = query.is('size_id', null);

  if (input.materialId) query = query.eq('material_id', input.materialId);
  else query = query.is('material_id', null);

  if (input.printServiceId) query = query.eq('print_service_id', input.printServiceId);
  else query = query.is('print_service_id', null);

  if (excludeId) query = query.neq('id', excludeId);

  const res = await query.limit(1);
  throwIfError(res, 'ensureNoDuplicatePrintVendorPrice');

  if ((res.data || []).length > 0) {
    throw new Error('Đã tồn tại báo giá đang hoạt động cho tổ hợp nhà cung cấp / kích thước / chất liệu này.');
  }
};

export const fetchPrintVendorPrices = async (
  filters?: PrintVendorPriceFilters
): Promise<PrintVendorPrice[]> => {
  if (!supabase) return [];

  const baseQuery = supabase
    .from('print_vendor_prices_view')
    .select('*')
    .order('updated_at', { ascending: false });

  const res = await applyPrintVendorPriceFilters(baseQuery, filters);
  throwIfError(res, 'fetchPrintVendorPrices');
  return (res.data || []).map(printVendorPriceFromViewRow);
};

export const createPrintVendorPrice = async (
  input: CreatePrintVendorPriceInput
): Promise<PrintVendorPrice> => {
  if (!supabase) {
    throw new Error('Supabase chưa được cấu hình.');
  }

  assertPrintVendorPriceInput(input, 'create');
  await ensureNoDuplicatePrintVendorPrice(input);

  const insertData = {
    vendor_id: input.vendorId,
    size_id: input.sizeId ?? null,
    material_id: input.materialId ?? null,
    print_service_id: input.printServiceId ?? null,
    don_gia: Number(input.donGia || 0),
    ghi_chu: input.ghiChu || '',
    dang_su_dung: true,
  };

  const res = await supabase
    .from('print_vendor_prices')
    .insert(insertData)
    .select(`
      id,
      vendor_id,
      size_id,
      material_id,
      print_service_id,
      don_gia,
      ghi_chu,
      dang_su_dung,
      created_at,
      updated_at,
      print_vendors (
        ten_xuong_in
      ),
      print_sizes (
        ten_kich_thuoc
      ),
      print_materials (
        ten_chat_lieu
      ),
      print_services (
        ten_dich_vu_in
      )
    `)
    .single();

  throwIfError(res, 'createPrintVendorPrice');
  return printVendorPriceFromDb(res.data);
};

export const updatePrintVendorPrice = async (
  id: string,
  input: UpdatePrintVendorPriceInput
): Promise<PrintVendorPrice> => {
  if (!supabase) {
    throw new Error('Supabase chưa được cấu hình.');
  }

  assertPrintVendorPriceInput(input, 'update');

  const currentRes = await supabase
    .from('print_vendor_prices')
    .select('id, vendor_id, size_id, material_id, print_service_id')
    .eq('id', id)
    .single();
  throwIfError(currentRes, 'updatePrintVendorPrice.current');

  const nextUniqueKey = {
    vendorId: input.vendorId ?? currentRes.data.vendor_id,
    sizeId: input.sizeId === undefined ? currentRes.data.size_id : input.sizeId,
    materialId: input.materialId === undefined ? currentRes.data.material_id : input.materialId,
    printServiceId: input.printServiceId === undefined ? currentRes.data.print_service_id : input.printServiceId,
  };

  if ((input.isActive ?? true) !== false) {
    await ensureNoDuplicatePrintVendorPrice(nextUniqueKey, id);
  }

  const patch: Record<string, any> = {};
  if (input.vendorId !== undefined) patch.vendor_id = input.vendorId;
  if (input.sizeId !== undefined) patch.size_id = input.sizeId ?? null;
  if (input.materialId !== undefined) patch.material_id = input.materialId ?? null;
  if (input.printServiceId !== undefined) patch.print_service_id = input.printServiceId ?? null;
  if (input.donGia !== undefined) patch.don_gia = Number(input.donGia || 0);
  if (input.ghiChu !== undefined) patch.ghi_chu = input.ghiChu || '';
  if (input.isActive !== undefined) patch.dang_su_dung = input.isActive;

  const res = await supabase
    .from('print_vendor_prices')
    .update(patch)
    .eq('id', id)
    .select(`
      id,
      vendor_id,
      size_id,
      material_id,
      print_service_id,
      don_gia,
      ghi_chu,
      dang_su_dung,
      created_at,
      updated_at,
      print_vendors (
        ten_xuong_in
      ),
      print_sizes (
        ten_kich_thuoc
      ),
      print_materials (
        ten_chat_lieu
      ),
      print_services (
        ten_dich_vu_in
      )
    `)
    .single();

  throwIfError(res, 'updatePrintVendorPrice');
  return printVendorPriceFromDb(res.data);
};

export const softDeletePrintVendorPrice = async (id: string): Promise<void> => {
  if (!supabase) {
    throw new Error('Supabase chưa được cấu hình.');
  }

  const res = await supabase
    .from('print_vendor_prices')
    .update({ dang_su_dung: false })
    .eq('id', id);

  throwIfError(res, 'softDeletePrintVendorPrice');
};

const isWithinDateRange = (value: string, from?: string, to?: string) => {
  if (!value) return false;
  if (from && value < from) return false;
  if (to && value > to) return false;
  return true;
};

const findMatchingPrintVendorPrice = (
  prices: PrintVendorPrice[],
  vendorId?: string | null,
  sizeId?: string | null,
  materialId?: string | null
): PrintVendorPrice | null => {
  if (!vendorId || !sizeId || !materialId) return null;
  return (
    prices.find((price) =>
      price.isActive &&
      price.vendorId === vendorId &&
      price.sizeId === sizeId &&
      price.materialId === materialId
    ) || null
  );
};

const createPrintCostRowFromOrder = (
  order: PrintOrder,
  lineType: 'large' | 'small',
  prices: PrintVendorPrice[]
): PrintCostRow | null => {
  const isLarge = lineType === 'large';
  const quantity = isLarge ? order.soLuongAnhLon : order.soLuongAnhNho;
  const sizeId = isLarge ? order.kichThuocAnhLonId : order.kichThuocAnhNhoId;
  const sizeName = isLarge ? order.kichThuocAnhLon : order.kichThuocAnhNho;
  const materialId = isLarge ? order.chatLieuAnhLonId : order.chatLieuAnhNhoId;
  const materialName = isLarge ? order.chatLieuAnhLon : order.chatLieuAnhNho;

  if (!quantity || quantity <= 0) return null;

  const matchedPrice = findMatchingPrintVendorPrice(prices, order.vendorId, sizeId, materialId);

  return {
    rowId: `${order.id}-${lineType}`,
    orderId: order.id,
    lineType,
    ngayGuiIn: order.ngayGuiIn,
    tenKhachHang: order.tenKhachHang,
    vendorId: order.vendorId ?? null,
    vendorName: order.tenXuongIn || '',
    sizeId: sizeId ?? null,
    sizeName: sizeName || '',
    materialId: materialId ?? null,
    materialName: materialName || '',
    quantity,
    unitPrice: matchedPrice ? matchedPrice.donGia : null,
    amount: matchedPrice ? quantity * matchedPrice.donGia : null,
    pricingStatus: matchedPrice ? 'matched' : 'missing_price',
    contractId: order.contractId ?? null,
    contractCode: order.contractCode || '',
  };
};

export const buildPrintCostRows = (
  orders: PrintOrder[],
  prices: PrintVendorPrice[],
  filters?: PrintCostFilters
): { rows: PrintCostRow[]; summary: PrintCostSummary } => {
  const filteredOrders = orders.filter((order) => {
    if (!isWithinDateRange(order.ngayGuiIn, filters?.from, filters?.to)) return false;
    if (filters?.vendorId && order.vendorId !== filters.vendorId) return false;
    return true;
  });

  const rows = filteredOrders
    .flatMap((order) => [
      createPrintCostRowFromOrder(order, 'large', prices),
      createPrintCostRowFromOrder(order, 'small', prices),
    ])
    .filter(Boolean) as PrintCostRow[];

  const byVendorMap = new Map<string, PrintCostSummary['byVendor'][number]>();

  rows.forEach((row) => {
    const key = row.vendorId || 'unknown';
    const current = byVendorMap.get(key) || {
      vendorId: row.vendorId || '',
      vendorName: row.vendorName || 'Chưa chọn xưởng in',
      totalRows: 0,
      totalQuantity: 0,
      totalAmount: 0,
      missingPriceRows: 0,
    };

    current.totalRows += 1;
    current.totalQuantity += row.quantity;
    current.totalAmount += Number(row.amount || 0);
    if (row.pricingStatus === 'missing_price') current.missingPriceRows += 1;

    byVendorMap.set(key, current);
  });

  const summary: PrintCostSummary = {
    totalRows: rows.length,
    totalOrders: new Set(rows.map((row) => row.orderId)).size,
    totalQuantity: rows.reduce((sum, row) => sum + row.quantity, 0),
    totalAmount: rows.reduce((sum, row) => sum + Number(row.amount || 0), 0),
    missingPriceRows: rows.filter((row) => row.pricingStatus === 'missing_price').length,
    byVendor: Array.from(byVendorMap.values()).sort((a, b) => b.totalAmount - a.totalAmount),
  };

  return { rows, summary };
};

export const fetchPrintCostRowsFromRpc = async (
  filters?: PrintCostFilters
): Promise<PrintCostRow[]> => {
  if (!supabase) return [];

  const res = await supabase.rpc('rpc_get_print_cost_rows', {
    p_date_from: filters?.from || null,
    p_date_to: filters?.to || null,
    p_vendor_id: filters?.vendorId || null,
  });

  throwIfError(res, 'fetchPrintCostRowsFromRpc');
  return (res.data || []).map(printCostRowFromRpc);
};

export const fetchPrintCostSummaryFromRpc = async (
  filters?: PrintCostFilters
): Promise<PrintCostSummary> => {
  if (!supabase) {
    return emptyPrintCostSummary();
  }

  const [rowsRes, summaryRes] = await Promise.all([
    supabase.rpc('rpc_get_print_cost_rows', {
      p_date_from: filters?.from || null,
      p_date_to: filters?.to || null,
      p_vendor_id: filters?.vendorId || null,
    }),
    supabase.rpc('rpc_get_print_cost_summary_by_vendor', {
      p_date_from: filters?.from || null,
      p_date_to: filters?.to || null,
      p_vendor_id: filters?.vendorId || null,
    }),
  ]);

  throwIfError(rowsRes, 'fetchPrintCostSummaryFromRpc.rows');
  throwIfError(summaryRes, 'fetchPrintCostSummaryFromRpc.summary');

  const rows = (rowsRes.data || []).map(printCostRowFromRpc);
  return buildPrintCostSummaryFromRpc(rows, summaryRes.data || []);
};

export const fetchPrintCostData = async (
  filters?: PrintCostFilters
): Promise<{ rows: PrintCostRow[]; summary: PrintCostSummary }> => {
  if (!supabase) {
    return {
      rows: [],
      summary: emptyPrintCostSummary(),
    };
  }

  const [rowsRes, summaryRes] = await Promise.all([
    supabase.rpc('rpc_get_print_cost_rows', {
      p_date_from: filters?.from || null,
      p_date_to: filters?.to || null,
      p_vendor_id: filters?.vendorId || null,
    }),
    supabase.rpc('rpc_get_print_cost_summary_by_vendor', {
      p_date_from: filters?.from || null,
      p_date_to: filters?.to || null,
      p_vendor_id: filters?.vendorId || null,
    }),
  ]);

  throwIfError(rowsRes, 'fetchPrintCostData.rows');
  throwIfError(summaryRes, 'fetchPrintCostData.summary');

  const rows = (rowsRes.data || []).map(printCostRowFromRpc);
  const summary = buildPrintCostSummaryFromRpc(rows, summaryRes.data || []);

  return { rows, summary };
};
