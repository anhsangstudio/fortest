
// Enums
export enum ContractStatus {
  PENDING = 'Pending',
  SIGNED = 'Signed',
  COMPLETED = 'Completed',
  CANCELLED = 'Cancelled'
}

export enum TransactionType {
  INCOME = 'income',
  EXPENSE = 'expense'
}

export enum ServiceType {
  WEDDING_PHOTO = 'Chụp ảnh cưới',
  RETAIL_SERVICE = 'Dịch vụ lẻ',
  RENTAL = 'Cho thuê',
  MAKEUP = 'Trang điểm',
  VIDEO = 'Quay phim'
}

export enum ExpenseCategory {
  OTHER = 'Khác',
  MARKETING = 'Marketing',
  SALARY = 'Lương nhân viên',
  OFFICE = 'Văn phòng',
  EQUIPMENT = 'Thiết bị',
  MATERIAL = 'Vật tư',
  UTILITY = 'Điện nước'
}

// Interfaces
export interface Customer {
  id: string;
  name: string;
  phone: string;
  address?: string;
}

export interface StudioInfo {
  name: string;
  address: string;
  phone: string;
  zalo?: string;
  website?: string;
  fanpage?: string;
  email?: string;
  directorName: string;
  googleDocsTemplateUrl?: string;
  logoText: string;
  logoImage?: string;
  contractTerms?: string;
}

export interface ExpenseCategoryItem {
  id: string;
  name: string;
  level: number;
  parentId: string | null;
  sortOrder: number;
}

export interface ServiceTypeItem {
  id: string;
  name: string;
}

export interface ServiceGroupItem {
  id: string;
  groupName: string;
}

export interface TaskAttachment {
  id: string;
  taskId: string;
  fileUrl: string;
  fileId?: string;
  createdAt?: string;
}

export interface Task {
  id: string;
  contractId?: string;
  contractItemId?: string;
  name: string;
  status: string; // 'Pending' | 'In Progress' | 'Completed' | 'Cancelled'
  dueDate: string | null;
  assignedStaffIds: string[];
  notes?: string;
  scheduleTypeLink?: string;
  attachments?: TaskAttachment[];
  createdAt?: string;
  
  // Virtual properties often added for UI
  contractCode?: string;
  customerName?: string;
  customerAddress?: string;
  customerPhone?: string;
}

export interface ServiceTaskTemplate {
  id: string;
  serviceId: string;
  name: string;
  scheduleTypeLink?: string;
  workSalary: number;
  workSalarySource?: string;
}

export interface BreakevenResult {
    period: string;
    totalFixedCosts: number;
    totalRevenue: number;
    totalVariableCosts: number;
    contributionMargin: number;
    contributionMarginRatio: number;
    breakEvenPoint: number;
    safetyMargin: number;
    isProfitable: boolean;
    roi: number;
}

export interface Asset {
  id: string;
  name: string;
  value: number;
  startDate: string;
  durationMonths: number;
  description?: string;
  status: 'Active' | 'Liquidated';
  monthlyDepreciation?: number;
  remainingValue?: number;
}

export interface RevenueStream {
  id: string;
  streamName: string;
  avgVariableCostRate: number;
}

// --- PAYROLL MODULE TYPES ---
export type SalaryItemType = 'HARD' | 'COMMISSION' | 'WORK' | 'REWARD' | 'ALLOWANCE' | 'PENALTY' | 'ADVANCE' | 'ADJUST' | 'KPI';

export interface SalaryPeriod {
  id: string;
  month: number;
  year: number;
  startDate: string;
  endDate: string;
  status: 'open' | 'closed';
}

export interface SalaryItem {
  id: string;
  salarySlipId: string;
  type: SalaryItemType; // DB is TEXT, but frontend treats as Union Type
  title: string;
  amount: number;
  source: 'manual' | 'task' | 'contract' | 'noi_quy' | 'transaction' | 'kpi' | 'allowance';
  refId?: string;
  createdAt?: string;
}

export interface SalarySlip {
  id: string;
  staffId: string;
  salaryPeriodId: string;
  totalEarnings: number;
  totalDeductions: number;
  netPay: number;
  note?: string;
  items?: SalaryItem[];
  staffName?: string; // Virtual for UI
}

export interface SalaryConfig {
  id: string;
  position: string;
  baseSalary: number;
  defaultAllowance: number;
  commissionRate: number;
}

export interface FixedCost {
  id: string;
  name: string;
  amount: number;
  cycle: 'monthly' | 'yearly' | 'quarterly';
  startDate: string;
  endDate?: string | null;
  description?: string;
  isActive: boolean;
  isSystemGenerated?: boolean; 
  sourceId?: string; // ID nhân viên nếu là lương
}

export interface Service {
  ma_dv: string;             // Primary Key (Supabase UUID)
  ten_dv: string;
  nhom_dv: string;           // Changed from ServiceType enum to string to support dynamic types
  chi_tiet_dv: string;
  don_gia: number;
  don_vi_tinh: string;
  nhan: string;
  
  // Chi phí (Stored in Supabase)
  hoa_hong_pct: number;      // Phần trăm hoa hồng
  chi_phi_cong_chup: number;
  chi_phi_makeup: number;
  chi_phi_nv_ho_tro: number;
  chi_phi_thu_vay: number;
  chi_phi_photoshop: number;
  chi_phi_in_an: number;
  chi_phi_ship: number;
  chi_phi_an_trua: number;
  chi_phi_lam_toc: number;
  chi_phi_bao_bi: number;
  chi_phi_giat_phoi: number;
  chi_phi_khau_hao: number;

  // New: Task Templates
  taskTemplates?: ServiceTaskTemplate[];

  // Legacy fields (kept for compatibility with Contract module if needed, mapped from above)
  id?: string;               // maps to ma_dv
  code?: string;             // maps to ma_dv
  name?: string;             // maps to ten_dv
  price?: number;            // maps to don_gia
  type?: string;             // maps to nhom_dv (Updated to string)
  description?: string;      // maps to chi_tiet_dv
  unit?: string;             // maps to don_vi_tinh
  label?: string;            // maps to nhan
}

export type ScheduleType = string;

export interface Contract {
  id: string;
  customerId: string;
  staffInChargeId?: string;
  contractCode: string;
  date: string;
  status: ContractStatus;
  totalAmount: number;
  paidAmount: number;
  paymentMethod: string;
  createdBy: string;
  items: ContractItem[];
  schedules: Schedule[];
  serviceType: string; 
  paymentStage?: string;
  terms?: string;
  source?: string; // New field: Nguồn khách hàng
  customer?: Customer; // New field: Joined data
}

export interface ContractItem {
  id: string;
  contractId: string;
  serviceId: string;
  quantity: number;
  subtotal: number;
  unitPrice: number;
  discount: number;
  notes: string;
  serviceName: string;
  serviceDescription?: string;
  salesPersonId?: string; // NEW FIELD
}

export interface Schedule {
  id: string;
  contractId: string;
  contractCode?: string;
  type: ScheduleType;
  date: string;
  notes: string;
  assignments: string[];
}

export interface ModulePermission {
  view: boolean;
  add: boolean;
  edit: boolean;
  delete: boolean;
  ownOnly: boolean;
}

export interface Staff {
  id: string;
  code: string;
  name: string;
  role: string;
  phone: string;
  email: string;
  baseSalary: number;
  status: 'Active' | 'Inactive';
  startDate: string;
  notes: string;
  createdAt: string;
  updatedAt?: string;
  username: string;
  password?: string;
  permissions: Record<string, Record<string, ModulePermission>>;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  mainCategory: string;
  category: string;
  amount: number;
  description: string;
  date: string;
  contractId?: string;
  vendor?: string;
  staffId?: string;
  billImageUrl?: string; 
  contractCode?: string; // Virtual
  staffName?: string; // Virtual
}

export interface AIRule {
  id: string;
  keyword: string;
  vendor?: string;
  category: ExpenseCategory;
}

// Constants
export const DEFAULT_SCHEDULE_TYPES = [
  'Tư vấn', 'Chụp Pre-wedding', 'Chụp Phóng sự', 
  'Trang điểm', 'Thử váy', 'Trả ảnh', 'Quay phim'
];

export const DEFAULT_DEPARTMENTS = [
  'Sales', 'Marketing', 'Photo', 'Makeup', 'Post-Production', 'Wardrobe'
];

export const STAFF_ROLES = [
  'Giám đốc', 'Quản lý', 'Nhiếp ảnh gia', 'Makeup Artist', 
  'Sale & CSKH', 'Hậu kỳ / Editor', 'Trợ lý'
];
