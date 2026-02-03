
import { 
  Customer, Staff, Service, ServiceType, Contract, ContractStatus, 
  Transaction, TransactionType, ExpenseCategory, ModulePermission 
} from './types';

// Định nghĩa quyền Full cho Admin
const crudFull: ModulePermission = { view: true, add: true, edit: true, delete: true, ownOnly: false };
const adminPermissions: Record<string, Record<string, ModulePermission>> = {
  dashboard: { main: crudFull, ai: crudFull },
  contracts: { list: crudFull, create: crudFull, print: crudFull },
  schedules: { main: crudFull, assignment: crudFull },
  finance: { income: crudFull, expense: crudFull, balance: crudFull },
  staff: { list: crudFull, salary: crudFull, permission: crudFull },
  products: { list: crudFull, department: crudFull },
  settings: { info: crudFull, terms: crudFull }
};

export const mockCustomers: Customer[] = [
  { id: 'c1', name: 'Nguyễn Văn An', phone: '0987654321', address: '123 Phố Huế, Hà Nội' },
  { id: 'c2', name: 'Trần Thị Bình', phone: '0912345678', address: '456 Lê Duẩn, Đà Nẵng' }
];

export const mockStaff: Staff[] = [
  { 
    id: 's1', 
    code: 'NV001',
    name: 'Admin Ánh Sáng', 
    role: 'Giám đốc', 
    phone: '0978994568', 
    // Fix: Added missing email property required by Staff interface
    email: 'admin@anhsangstudio.vn',
    baseSalary: 15000000, 
    status: 'Active',
    startDate: '2023-01-01',
    notes: 'Quản trị viên hệ thống',
    createdAt: '2023-01-01',
    username: 'admin',
    password: '123',
    permissions: adminPermissions
  },
  { 
    id: 's2', 
    code: 'NV002',
    name: 'Nguyễn Thợ Chụp', 
    role: 'Nhiếp ảnh gia', 
    phone: '0911111111', 
    // Fix: Added missing email property required by Staff interface
    email: 'photo1@anhsangstudio.vn',
    baseSalary: 8000000, 
    status: 'Active',
    startDate: '2024-02-15',
    notes: '',
    createdAt: '2024-02-15',
    username: 'photo1',
    password: '123',
    permissions: {
      dashboard: { main: { view: true, add: false, edit: false, delete: false, ownOnly: true } },
      contracts: { list: { view: true, add: false, edit: false, delete: false, ownOnly: true } },
      schedules: { 
        main: { view: true, add: true, edit: true, delete: false, ownOnly: false },
        assignment: { view: true, add: false, edit: false, delete: false, ownOnly: false }
      }
    }
  }
];

export const mockServices: Service[] = [
  { 
    // Required fields from Service interface
    ma_dv: 'v1', 
    ten_dv: 'Gói Chụp Cưới Phim Trường', 
    nhom_dv: ServiceType.WEDDING_PHOTO, 
    chi_tiet_dv: 'Chụp 1 ngày, bao gồm album 30x30', 
    don_gia: 15000000, 
    don_vi_tinh: 'Gói',
    nhan: 'VIP',
    
    // Chi phí fields (Supabase storage mapping)
    hoa_hong_pct: 0,
    chi_phi_cong_chup: 2000000,
    chi_phi_makeup: 1000000,
    chi_phi_nv_ho_tro: 0,
    chi_phi_thu_vay: 0,
    chi_phi_photoshop: 500000,
    chi_phi_in_an: 1000000,
    chi_phi_ship: 0,
    chi_phi_an_trua: 0,
    chi_phi_lam_toc: 0,
    chi_phi_bao_bi: 0,
    chi_phi_giat_phoi: 0,
    chi_phi_khau_hao: 0,

    // Legacy fields kept for compatibility
    id: 'v1', 
    code: 'DV-CUOI-01',
    name: 'Gói Chụp Cưới Phim Trường', 
    price: 15000000, 
    type: ServiceType.WEDDING_PHOTO, 
    description: 'Chụp 1 ngày, bao gồm album 30x30', 
    unit: 'Gói',
    label: 'VIP'
  },
  { 
    // Required fields from Service interface
    ma_dv: 'v2', 
    ten_dv: 'Tráp Lễ 7 Quả', 
    nhom_dv: ServiceType.RETAIL_SERVICE, 
    chi_tiet_dv: 'Tráp rồng phượng thủ công', 
    don_gia: 4500000, 
    don_vi_tinh: 'Bộ',
    nhan: '-',

    // Chi phí fields (Supabase storage mapping)
    hoa_hong_pct: 0,
    chi_phi_cong_chup: 0,
    chi_phi_makeup: 0,
    chi_phi_nv_ho_tro: 0,
    chi_phi_thu_vay: 0,
    chi_phi_photoshop: 0,
    chi_phi_in_an: 0,
    chi_phi_ship: 0,
    chi_phi_an_trua: 0,
    chi_phi_lam_toc: 0,
    chi_phi_bao_bi: 0,
    chi_phi_giat_phoi: 0,
    chi_phi_khau_hao: 0,

    // Legacy fields kept for compatibility
    id: 'v2', 
    code: 'SP-TRAP-07',
    name: 'Tráp Lễ 7 Quả', 
    price: 4500000, 
    type: ServiceType.RETAIL_SERVICE, 
    description: 'Tráp rồng phượng thủ công', 
    unit: 'Bộ',
    label: '-'
  }
];

export const mockContracts: Contract[] = [
  {
    id: 'h1',
    customerId: 'c1',
    contractCode: 'AS-2024-001',
    date: '2024-05-10',
    status: ContractStatus.SIGNED,
    serviceType: ServiceType.WEDDING_PHOTO,
    totalAmount: 15000000,
    paidAmount: 5000000,
    paymentMethod: 'Chuyển khoản',
    createdBy: 's1',
    items: [{ 
      id: 'i1', 
      contractId: 'h1', 
      serviceId: 'v1', 
      quantity: 1, 
      subtotal: 15000000,
      unitPrice: 15000000,
      discount: 0,
      notes: '',
      serviceName: 'Gói Chụp Cưới Phim Trường'
    }],
    schedules: [
      { id: 'l1', contractId: 'h1', type: 'Chụp tại Studio', date: '2024-06-15', notes: 'Chụp tại studio 2', assignments: ['s2'] },
      { id: 'l2', contractId: 'h1', type: 'Trang điểm', date: '2024-06-15', notes: 'Cô dâu cần make sớm', assignments: ['s3'] }
    ]
  }
];

export const mockTransactions: Transaction[] = [
  { id: 't1', type: TransactionType.INCOME, mainCategory: 'Hợp đồng', category: 'Thu đợt 1', amount: 5000000, description: 'Cọc Hợp đồng AS-2024-001', date: '2024-05-10', contractId: 'h1', staffId: 's1' },
  { id: 't2', type: TransactionType.EXPENSE, mainCategory: 'Marketing', category: 'Facebook Ads', amount: 2000000, description: 'Chạy Ads Facebook tháng 5', date: '2024-05-12', staffId: 's1' },
  { id: 't3', type: TransactionType.EXPENSE, mainCategory: 'Sản xuất', category: 'In ấn', amount: 1500000, description: 'In album gói Cưới An', date: '2024-05-20', staffId: 's1' }
];
