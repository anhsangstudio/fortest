
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
  transactions?: Transaction[];
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
// ================================
// CONSULTATION MODULE TYPES
// ================================

export interface ConsultationSource {
  id: string;
  ten_nguon: string;
  mau_hien_thi?: string | null;
  thu_tu_hien_thi?: number;
  dang_su_dung?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ConsultationStatus {
  id: string;
  ten_tinh_trang: string;
  mau_hien_thi?: string | null;
  nhom_trang_thai?: string | null;
  thu_tu_hien_thi?: number;
  dang_su_dung?: boolean;
  la_trang_thai_chot?: boolean;
  la_trang_thai_tu_choi?: boolean;
  la_trang_thai_dong?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ConsultationRejectionReason {
  id: string;
  ten_ly_do: string;
  thu_tu_hien_thi?: number;
  dang_su_dung?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ConsultationService {
  id: string;
  ten_dich_vu: string;
  mau_hien_thi?: string | null;
  thu_tu_hien_thi?: number;
  dang_su_dung?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ConsultationLogService {
  id: string;
  consultation_log_id: string;
  service_id: string;
  created_at?: string;
}

export interface ConsultationLog {
  id: string;
  ngay_tu_van: string;
  ten_khach_hang: string;
  nickname?: string | null;
  dia_chi?: string | null;
  so_dien_thoai?: string | null;

  ngay_du_dinh_chup?: string | null;
  ngay_an_hoi?: string | null;
  ngay_cuoi?: string | null;

  nguon_khach_hang_id?: string | null;
  tinh_trang_id?: string | null;
  ly_do_tu_choi_id?: string | null;
  nhan_vien_tu_van?: string | null;

  tong_gia_tri_du_kien?: number;
  ghi_chu?: string | null;

  lead_score?: string | null;
  next_follow_up_date?: string | null;

  created_at?: string;
  updated_at?: string;

  // Virtual fields cho UI / report
  nguon_khach_hang_ten?: string;
  tinh_trang_ten?: string;
  ly_do_tu_choi_ten?: string;
  nhan_vien_tu_van_ten?: string;
  dich_vu_quan_tam_ids?: string[];
  dich_vu_quan_tam_ten?: string[];
}

export interface ConsultationFilter {
  tu_khoa: string;
  tinh_trang_id?: string;
  nguon_khach_hang_id?: string;
  nhan_vien_tu_van?: string;
  tu_ngay?: string;
  den_ngay?: string;
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


// ================================
// PRINT PRODUCTION MODULE TYPES
// ================================

export interface PrintCatalogOption {
  id: string;
  name: string;
  sortOrder?: number;
  isActive?: boolean;
}

export interface PrintOrder {
  id: string;
  contractId?: string | null;
  contractCode: string;
  customerId?: string | null;
  tenKhachHang: string;
  ngayGuiIn: string;
  linkTheTrello: string;
  linkFiles: string;
  imageAttachments?: string[];

  soLuongAnhLon: number;
  kichThuocAnhLonId?: string | null;
  kichThuocAnhLon: string;
  chatLieuAnhLonId?: string | null;
  chatLieuAnhLon: string;

  soLuongAnhNho: number;
  kichThuocAnhNhoId?: string | null;
  kichThuocAnhNho: string;
  chatLieuAnhNhoId?: string | null;
  chatLieuAnhNho: string;

  printServiceId?: string | null;
  tenDichVuIn?: string;
  vendorId?: string | null;
  tenXuongIn: string;
  statusId?: string | null;
  tenTrangThai: string;

  nguoiKiemTraNhanAnh: string;
  ghiChu: string;

  thongBaoDaCoAnh: boolean;
  thongBaoDaGiaoAnh: boolean;
  thongBaoDangInAnh: boolean;
  checkFlag: boolean;

  donGiaIn: number;
  thanhTien: number;
  createdAt: string;
  updatedAt: string;
}


export interface PrintVendorPrice {
  id: string;
  vendorId: string;
  vendorName: string;
  sizeId?: string | null;
  sizeName: string;
  materialId?: string | null;
  materialName: string;
  printServiceId?: string | null;
  printServiceName?: string;
  donGia: number;
  ghiChu?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreatePrintVendorPriceInput {
  vendorId: string;
  sizeId?: string | null;
  materialId?: string | null;
  printServiceId?: string | null;
  donGia: number;
  ghiChu?: string;
}

export interface UpdatePrintVendorPriceInput {
  vendorId?: string;
  sizeId?: string | null;
  materialId?: string | null;
  printServiceId?: string | null;
  donGia?: number;
  ghiChu?: string;
  isActive?: boolean;
}

export interface PrintVendorPriceFilters {
  vendorId?: string;
  sizeId?: string;
  materialId?: string;
  isActive?: boolean;
}

export type PrintCostLineType = 'large' | 'small';
export type PrintPricingStatus = 'matched' | 'missing_price' | 'skipped';

export interface PrintCostRow {
  rowId: string;
  orderId: string;
  lineType: PrintCostLineType;
  ngayGuiIn: string;
  tenKhachHang: string;
  vendorId?: string | null;
  vendorName: string;
  sizeId?: string | null;
  sizeName: string;
  materialId?: string | null;
  materialName: string;
  quantity: number;
  unitPrice?: number | null;
  amount?: number | null;
  pricingStatus: PrintPricingStatus;
  contractId?: string | null;
  contractCode?: string;
}

export interface PrintCostFilters {
  from?: string;
  to?: string;
  vendorId?: string;
}

export interface PrintCostSummaryByVendor {
  vendorId: string;
  vendorName: string;
  totalRows: number;
  totalQuantity: number;
  totalAmount: number;
  missingPriceRows: number;
}

export interface PrintCostSummary {
  totalRows: number;
  totalOrders: number;
  totalQuantity: number;
  totalAmount: number;
  missingPriceRows: number;
  byVendor: PrintCostSummaryByVendor[];
}
