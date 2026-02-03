
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.1';
import { Service, Transaction, Staff, Contract, Schedule, Customer, StudioInfo, ExpenseCategoryItem, FixedCost, RevenueStream, BreakevenResult, TransactionType, Asset, ServiceTypeItem, Task, ServiceTaskTemplate, TaskAttachment, SalaryPeriod, SalarySlip, SalaryItem, SalaryConfig, ContractItem, ServiceGroupItem } from './types';

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
  schedules: []
});

const contractToDb = (c: Partial<Contract>) => ({
  id: c.id,
  customer_id: c.customerId,
  staff_in_charge_id: c.staffInChargeId,
  contract_code: c.contractCode,
  contract_date: c.date,
  status: c.status,
  total_amount: c.totalAmount,
  paid_amount: c.paidAmount,
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
  studio_name: info.name,
  address: info.address,
  phone: info.phone,
  zalo: info.zalo,
  website: info.website,
  fanpage: info.fanpage,
  email: info.email,
  director_name: info.directorName,
  google_docs_template_url: info.googleDocsTemplateUrl,
  logo_text: info.logoText,
  logo_image: info.logoImage,
  contract_terms: info.contractTerms
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
    safeFetch(supabase.from('contracts').select('*').order('contract_date', { ascending: false }).limit(50)), 
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
  return { services, staff, customers, contracts: Array.from(contractMap.values()), transactions, schedules: [], studioInfo, expenseCategories, serviceTypes, tasks: [], scheduleLabels, serviceGroups };
};

export const fetchContractsPaginated = async (page: number, pageSize: number, searchCode: string = '', searchName: string = '') => {
  if (!supabase) return { data: [], count: 0 };
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  let query = supabase.from('contracts').select('*, customers!inner(*), contract_items(*), schedules(*)', { count: 'exact' }).order('contract_date', { ascending: false }).range(from, to);
  if (searchCode) query = query.ilike('contract_code', `%${searchCode}%`);
  if (searchName) query = query.ilike('customers.name', `%${searchName}%`);
  const { data, count, error } = await query;
  if (error) { console.error("Pagination fetch error:", error); return { data: [], count: 0 }; }
  const contracts: Contract[] = data.map((r: any) => {
    const c = contractFromDb(r);
    if (r.customers) c.customer = customerFromDb(r.customers);
    if (r.contract_items && Array.isArray(r.contract_items)) c.items = r.contract_items.map(contractItemFromDb);
    if (r.schedules && Array.isArray(r.schedules)) c.schedules = r.schedules.map(scheduleFromDb);
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
    const out = contractFromDb(savedContract); out.items = items; out.schedules = schedules; return { success: true, data: out };
  }

  if (tableName === 'settings') { const payload = studioInfoToDb(rawData); const data = await upsertOne('settings', payload); return { success: true, data: studioInfoFromDb(data) }; }
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
