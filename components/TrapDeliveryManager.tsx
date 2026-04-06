import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  RefreshCw,
  Loader2,
  Search,
  Save,
  Settings2,
  Plus,
  Trash2,
  X,
  CalendarDays,
  Clock3,
  Printer,
  AlarmClock,
  CalendarClock,
  TriangleAlert,
} from 'lucide-react';
import { trapDeliveryModuleApi, trapDeliveryDispatchApi } from '../apiService';
import type {
  TrapDeliveryDashboard,
  TrapDeliveryDispatchDashboard,
  TrapDeliveryDropdowns,
  TrapDeliveryRow,
  TrapDeliveryStatus,
} from '../types';

const STATUS_ROW_STYLE: Record<TrapDeliveryStatus, string> = {
  'CHƯA LÀM': '',
  'CHUẨN BỊ': 'bg-yellow-50',
  'ĐANG LÀM': 'bg-fuchsia-50',
  'ĐÃ GIAO TRÁP': 'bg-sky-50',
  'CHƯA TRẢ TRÁP': 'bg-pink-50',
  'TRẢ THIẾU ĐỒ': 'bg-red-50',
  'ĐÃ TRẢ ĐỦ': 'bg-emerald-50 line-through',
};

const STATUS_BADGE_STYLE: Record<TrapDeliveryStatus, string> = {
  'CHƯA LÀM': 'bg-slate-100 text-slate-700',
  'CHUẨN BỊ': 'bg-yellow-100 text-yellow-800',
  'ĐANG LÀM': 'bg-fuchsia-100 text-fuchsia-800',
  'ĐÃ GIAO TRÁP': 'bg-sky-100 text-sky-800',
  'CHƯA TRẢ TRÁP': 'bg-pink-100 text-pink-800',
  'TRẢ THIẾU ĐỒ': 'bg-red-100 text-red-800',
  'ĐÃ TRẢ ĐỦ': 'bg-emerald-100 text-emerald-800',
};

const DEFAULT_DASHBOARD: TrapDeliveryDashboard = {
  total_rows: 0,
  status_chua_lam: 0,
  status_chuan_bi: 0,
  status_dang_lam: 0,
  status_da_giao_trap: 0,
  status_chua_tra_trap: 0,
  status_tra_thieu_do: 0,
  status_da_tra_du: 0,
};

const DEFAULT_DISPATCH_DASHBOARD: TrapDeliveryDispatchDashboard = {
  total_today: 0,
  total_tomorrow: 0,
  total_next_3_days: 0,
  total_pending_date: 0,
  total_prepare: 0,
  total_doing: 0,
  total_need_attention: 0,
  total_overdue: 0,
};

const DEFAULT_DROPDOWNS: TrapDeliveryDropdowns = {
  baseTypes: [],
  trapTypes: [],
  statuses: [],
  staff: [],
};

const getCurrentMonthVN = () => {
  const now = new Date();
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
  const hcmMs = utcMs + 7 * 60 * 60 * 1000;
  return new Date(hcmMs).toISOString().slice(0, 7);
};

const formatDateVN = (value?: string | null) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
};

const escapeHtml = (value?: string | number | null) => {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
};

type FilterState = {
  month: string;
  status: string;
  serviceName: string;
  staffId: string;
  search: string;
  specialFilter: string;
};

type EditFormState = {
  id: string;
  customer_name: string;
  service_name: string;
  price: number;
  delivery_date: string;
  so_trap_to: string;
  loai_de_trap_id: string;
  so_trap_nho: string;
  loai_trap_id: string;
  khan_trum: string;
  tinh_trang: TrapDeliveryStatus;
  nguoi_giao_staff_id: string;
  nguoi_nhan_staff_id: string;
  ghi_chu: string;
};

type OptionFormState = {
  id?: string | null;
  name: string;
  sortOrder: string;
};

const EMPTY_OPTION_FORM: OptionFormState = {
  id: null,
  name: '',
  sortOrder: '0',
};

const EMPTY_EDIT_FORM: EditFormState = {
  id: '',
  customer_name: '',
  service_name: '',
  price: 0,
  delivery_date: '',
  so_trap_to: '0',
  loai_de_trap_id: '',
  so_trap_nho: '0',
  loai_trap_id: '',
  khan_trum: '0',
  tinh_trang: 'CHƯA LÀM',
  nguoi_giao_staff_id: '',
  nguoi_nhan_staff_id: '',
  ghi_chu: '',
};

function CenteredPortalModal({
  open,
  onClose,
  title,
  children,
  maxWidthClass = 'max-w-5xl',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidthClass?: string;
}) {
  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999]">
      <div className="absolute inset-0 bg-slate-900/45" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-3 sm:p-4 md:p-6">
        <div className={`w-full ${maxWidthClass} max-h-[92vh] rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden`}>
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
            <div className="text-lg font-black text-slate-900">{title}</div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-100 text-slate-700"
              type="button"
            >
              <X size={18} />
            </button>
          </div>
          <div className="overflow-y-auto max-h-[calc(92vh-72px)]">
            {children}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default function TrapDeliveryManager() {
  const [rows, setRows] = useState<TrapDeliveryRow[]>([]);
  const [dashboard, setDashboard] = useState<TrapDeliveryDashboard>(DEFAULT_DASHBOARD);
  const [dispatchDashboard, setDispatchDashboard] = useState<TrapDeliveryDispatchDashboard>(DEFAULT_DISPATCH_DASHBOARD);
  const [dropdowns, setDropdowns] = useState<TrapDeliveryDropdowns>(DEFAULT_DROPDOWNS);

  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [savingRow, setSavingRow] = useState(false);
  const [savingOption, setSavingOption] = useState(false);
  const [autoUpdatingStatus, setAutoUpdatingStatus] = useState(false);

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [baseTypeModalOpen, setBaseTypeModalOpen] = useState(false);
  const [trapTypeModalOpen, setTrapTypeModalOpen] = useState(false);

  const [editForm, setEditForm] = useState<EditFormState>(EMPTY_EDIT_FORM);
  const [baseTypeForm, setBaseTypeForm] = useState<OptionFormState>(EMPTY_OPTION_FORM);
  const [trapTypeForm, setTrapTypeForm] = useState<OptionFormState>(EMPTY_OPTION_FORM);

const [filters, setFilters] = useState<FilterState>({
  month: getCurrentMonthVN(),
  status: '',
  serviceName: '',
  staffId: '',
  search: '',
  specialFilter: '',
});

  const serviceOptions = useMemo(() => {
    return Array.from(new Set(rows.map((x) => x.service_name).filter(Boolean))).sort();
  }, [rows]);

  const monthLabel = useMemo(() => {
    if (filters.month === 'ALL') return 'Tất cả dữ liệu';
    if (filters.month === 'PENDING_DATE') return 'Chưa có ngày';
    if (!filters.month) return 'Tháng hiện tại';
    const [year, month] = filters.month.split('-');
    return `Tháng ${month}/${year}`;
  }, [filters.month]);

  const loadAll = async () => {
    try {
      setLoading(true);

      const [rowData, dashboardData, dropdownData, dispatchData] = await Promise.all([
trapDeliveryModuleApi.getRows({
  month: filters.month || null,
  status: filters.status || null,
  serviceName: filters.serviceName || null,
  staffId: filters.staffId || null,
  search: filters.search || null,
  specialFilter: filters.specialFilter || null,
}),
        trapDeliveryModuleApi.getDashboard(filters.month || null),
        trapDeliveryModuleApi.getDropdowns(),
        trapDeliveryDispatchApi.getDispatchDashboard(),
      ]);

      setRows(rowData || []);
      setDashboard(dashboardData || DEFAULT_DASHBOARD);
      setDropdowns(dropdownData || DEFAULT_DROPDOWNS);
      setDispatchDashboard(dispatchData || DEFAULT_DISPATCH_DASHBOARD);
    } catch (error: any) {
      alert(error.message || 'Không tải được dữ liệu giao nhận tráp');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const handleApplyFilters = async () => {
    await loadAll();
  };

const handleDashboardFilterClick = async (specialFilter: string) => {
  setFilters((prev) => ({
    ...prev,
    specialFilter,
  }));
  
  setTimeout(() => {
    loadAll();
  }, 0);
};
  
  const handleAutoUpdateStatuses = async () => {
    try {
      setAutoUpdatingStatus(true);
      await trapDeliveryDispatchApi.autoUpdateStatuses();
      await loadAll();
      alert('Đã tự động cập nhật trạng thái theo ngày nhận tráp.');
    } catch (error: any) {
      alert(error.message || 'Tự động cập nhật trạng thái thất bại');
    } finally {
      setAutoUpdatingStatus(false);
    }
  };

  const handleSyncAll = async () => {
    try {
      setSyncing(true);
      await trapDeliveryModuleApi.syncAll();
      await loadAll();
      alert('Đã sync dữ liệu giao nhận tráp thành công.');
    } catch (error: any) {
      alert(error.message || 'Sync dữ liệu thất bại');
    } finally {
      setSyncing(false);
    }
  };

  const handlePrintExport = () => {
    if (!rows.length) {
      alert('Không có dữ liệu để xuất file in.');
      return;
    }

    const statusFiltersText = filters.status || 'Tất cả';
    const serviceFiltersText = filters.serviceName || 'Tất cả';
    const staffFiltersText =
      dropdowns.staff.find((x) => x.id === filters.staffId)?.name || (filters.staffId ? filters.staffId : 'Tất cả');

    const htmlRows = rows
      .map(
        (row, index) => `
          <tr>
            <td>${index + 1}</td>
            <td>${escapeHtml(row.customer_name)}</td>
            <td>${escapeHtml(row.service_name)}</td>
            <td>${escapeHtml(Number(row.price || 0).toLocaleString('vi-VN'))} đ</td>
            <td>${escapeHtml(formatDateVN(row.delivery_date))}</td>
            <td>${escapeHtml(row.so_trap_to)}</td>
            <td>${escapeHtml(row.loai_de_trap_name || '')}</td>
            <td>${escapeHtml(row.so_trap_nho)}</td>
            <td>${escapeHtml(row.loai_trap_name || '')}</td>
            <td>${escapeHtml(row.khan_trum)}</td>
            <td>${escapeHtml(row.tinh_trang)}</td>
            <td>${escapeHtml(row.nguoi_giao_name || '')}</td>
            <td>${escapeHtml(row.nguoi_nhan_name || '')}</td>
            <td>${escapeHtml(row.ghi_chu || '')}</td>
          </tr>
        `
      )
      .join('');

    const printWindow = window.open('', '_blank', 'width=1400,height=900');
    if (!printWindow) {
      alert('Trình duyệt đang chặn cửa sổ in. Hãy cho phép popup rồi thử lại.');
      return;
    }

    const html = `
      <!doctype html>
      <html lang="vi">
      <head>
        <meta charset="UTF-8" />
        <title>Xuất File In - Giao Nhận Tráp</title>
        <style>
          * { box-sizing: border-box; }
          body {
            font-family: Arial, Helvetica, sans-serif;
            margin: 24px;
            color: #0f172a;
          }
          .header {
            margin-bottom: 18px;
          }
          .title {
            font-size: 24px;
            font-weight: 800;
            margin-bottom: 6px;
          }
          .meta {
            font-size: 13px;
            color: #475569;
            margin: 2px 0;
          }
          .summary {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 12px;
            margin: 18px 0 22px;
          }
          .card {
            border: 1px solid #cbd5e1;
            border-radius: 12px;
            padding: 12px;
          }
          .card-label {
            font-size: 11px;
            text-transform: uppercase;
            color: #64748b;
            font-weight: 700;
            margin-bottom: 6px;
          }
          .card-value {
            font-size: 24px;
            font-weight: 800;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            table-layout: auto;
          }
          th, td {
            border: 1px solid #cbd5e1;
            padding: 8px 10px;
            font-size: 12px;
            vertical-align: top;
          }
          th {
            background: #f8fafc;
            text-align: left;
            font-weight: 800;
          }
          .footer-note {
            margin-top: 14px;
            font-size: 12px;
            color: #64748b;
          }
          @page {
            size: landscape;
            margin: 10mm;
          }
          @media print {
            body { margin: 0; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">PHIẾU IN GIAO NHẬN TRÁP</div>
          <div class="meta">Bộ lọc tháng: ${escapeHtml(monthLabel)}</div>
          <div class="meta">Tình trạng: ${escapeHtml(statusFiltersText)} | Loại dịch vụ: ${escapeHtml(serviceFiltersText)} | Nhân sự: ${escapeHtml(staffFiltersText)}</div>
          <div class="meta">Từ khóa: ${escapeHtml(filters.search || 'Không có')} | Thời điểm in: ${escapeHtml(new Date().toLocaleString('vi-VN'))}</div>
        </div>

        <div class="summary">
          <div class="card">
            <div class="card-label">Tổng đơn</div>
            <div class="card-value">${escapeHtml(dashboard.total_rows)}</div>
          </div>
          <div class="card">
            <div class="card-label">Chưa làm</div>
            <div class="card-value">${escapeHtml(dashboard.status_chua_lam)}</div>
          </div>
          <div class="card">
            <div class="card-label">Trả thiếu đồ</div>
            <div class="card-value">${escapeHtml(dashboard.status_tra_thieu_do)}</div>
          </div>
          <div class="card">
            <div class="card-label">Đã trả đủ</div>
            <div class="card-value">${escapeHtml(dashboard.status_da_tra_du)}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>STT</th>
              <th>Khách hàng</th>
              <th>Loại dịch vụ</th>
              <th>Giá tiền</th>
              <th>Ngày nhận tráp</th>
              <th>Số tráp to</th>
              <th>Loại đế tráp</th>
              <th>Số tráp nhỏ</th>
              <th>Loại tráp</th>
              <th>Khăn trùm</th>
              <th>Tình trạng</th>
              <th>Người giao</th>
              <th>Người nhận</th>
              <th>Ghi chú</th>
            </tr>
          </thead>
          <tbody>
            ${htmlRows}
          </tbody>
        </table>

        <div class="footer-note">
          Tài liệu in từ module Quản Lý Giao Nhận Tráp của Ánh Sáng Studio.
        </div>

        <script>
          window.onload = function () {
            window.print();
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  };

  const openEditModal = (row: TrapDeliveryRow) => {
    setEditForm({
      id: row.id,
      customer_name: row.customer_name,
      service_name: row.service_name,
      price: Number(row.price || 0),
      delivery_date: row.delivery_date || '',
      so_trap_to: String(row.so_trap_to || 0),
      loai_de_trap_id: row.loai_de_trap_id || '',
      so_trap_nho: String(row.so_trap_nho || 0),
      loai_trap_id: row.loai_trap_id || '',
      khan_trum: String(row.khan_trum || 0),
      tinh_trang: row.tinh_trang,
      nguoi_giao_staff_id: row.nguoi_giao_staff_id || '',
      nguoi_nhan_staff_id: row.nguoi_nhan_staff_id || '',
      ghi_chu: row.ghi_chu || '',
    });
    setEditModalOpen(true);
  };

  const handleSaveRow = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setSavingRow(true);

      await trapDeliveryModuleApi.updateRow({
        id: editForm.id,
        soTrapTo: Number(editForm.so_trap_to || 0),
        loaiDeTrapId: editForm.loai_de_trap_id || null,
        soTrapNho: Number(editForm.so_trap_nho || 0),
        loaiTrapId: editForm.loai_trap_id || null,
        khanTrum: Number(editForm.khan_trum || 0),
        tinhTrang: editForm.tinh_trang,
        nguoiGiaoStaffId: editForm.nguoi_giao_staff_id || null,
        nguoiNhanStaffId: editForm.nguoi_nhan_staff_id || null,
        ghiChu: editForm.ghi_chu || null,
      });

      setEditModalOpen(false);
      await loadAll();
      alert('Đã cập nhật dòng giao nhận tráp.');
    } catch (error: any) {
      alert(error.message || 'Cập nhật dòng thất bại');
    } finally {
      setSavingRow(false);
    }
  };

  const handleSaveBaseType = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingOption(true);
      await trapDeliveryModuleApi.upsertBaseType({
        id: baseTypeForm.id || null,
        name: baseTypeForm.name.trim(),
        sortOrder: Number(baseTypeForm.sortOrder || 0),
      });
      setBaseTypeModalOpen(false);
      setBaseTypeForm(EMPTY_OPTION_FORM);
      await loadAll();
      alert('Đã lưu loại đế tráp.');
    } catch (error: any) {
      alert(error.message || 'Lưu loại đế tráp thất bại');
    } finally {
      setSavingOption(false);
    }
  };

  const handleDeleteBaseType = async (id: string) => {
    if (!window.confirm('Xóa mềm loại đế tráp này?')) return;
    try {
      await trapDeliveryModuleApi.deleteBaseType(id);
      await loadAll();
    } catch (error: any) {
      alert(error.message || 'Xóa loại đế tráp thất bại');
    }
  };

  const handleSaveTrapType = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingOption(true);
      await trapDeliveryModuleApi.upsertTrapType({
        id: trapTypeForm.id || null,
        name: trapTypeForm.name.trim(),
        sortOrder: Number(trapTypeForm.sortOrder || 0),
      });
      setTrapTypeModalOpen(false);
      setTrapTypeForm(EMPTY_OPTION_FORM);
      await loadAll();
      alert('Đã lưu loại tráp.');
    } catch (error: any) {
      alert(error.message || 'Lưu loại tráp thất bại');
    } finally {
      setSavingOption(false);
    }
  };

  const handleDeleteTrapType = async (id: string) => {
    if (!window.confirm('Xóa mềm loại tráp này?')) return;
    try {
      await trapDeliveryModuleApi.deleteTrapType(id);
      await loadAll();
    } catch (error: any) {
      alert(error.message || 'Xóa loại tráp thất bại');
    }
  };

  return (
    <div className="w-full min-w-0 max-w-full space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 xl:grid-cols-8 gap-4 w-full">
        <button
          type="button"
          onClick={() => handleDashboardFilterClick('TODAY')}
          className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm min-w-0 text-left hover:border-blue-400 hover:shadow-md transition"
        >
          <div className="text-xs font-black uppercase tracking-widest text-slate-400">Hôm nay</div>
          <div className="mt-2 text-3xl font-black text-slate-900">{dispatchDashboard.total_today}</div>
        </button>
        <button
          type="button"
          onClick={() => handleDashboardFilterClick('TOMORROW')}
          className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm min-w-0 text-left hover:border-blue-400 hover:shadow-md transition"
        >
          <div className="text-xs font-black uppercase tracking-widest text-slate-400">Ngày mai</div>
          <div className="mt-2 text-3xl font-black text-slate-900">{dispatchDashboard.total_tomorrow}</div>
        </button>
        <button
          type="button"
          onClick={() => handleDashboardFilterClick('NEXT_3_DAYS')}
          className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm min-w-0 text-left hover:border-blue-400 hover:shadow-md transition"
        >
          <div className="text-xs font-black uppercase tracking-widest text-slate-400">3 ngày tới</div>
          <div className="mt-2 text-3xl font-black text-blue-700">{dispatchDashboard.total_next_3_days}</div>
        </button>
        <button
          type="button"
          onClick={() => handleDashboardFilterClick('PENDING_DATE')}
          className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm min-w-0 text-left hover:border-amber-400 hover:shadow-md transition"
        >
          <div className="text-xs font-black uppercase tracking-widest text-slate-400">Chưa có ngày</div>
          <div className="mt-2 text-3xl font-black text-amber-700">{dispatchDashboard.total_pending_date}</div>
        </button>
        <button
          type="button"
          onClick={() => handleDashboardFilterClick('PREPARE')}
          className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm min-w-0 text-left hover:border-yellow-400 hover:shadow-md transition"
        >
          <div className="text-xs font-black uppercase tracking-widest text-slate-400">Chuẩn bị</div>
          <div className="mt-2 text-3xl font-black text-yellow-700">{dispatchDashboard.total_prepare}</div>
        </button>
        <button
          type="button"
          onClick={() => handleDashboardFilterClick('DOING')}
          className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm min-w-0 text-left hover:border-fuchsia-400 hover:shadow-md transition"
        >
          <div className="text-xs font-black uppercase tracking-widest text-slate-400">Đang làm</div>
          <div className="mt-2 text-3xl font-black text-fuchsia-700">{dispatchDashboard.total_doing}</div>
        </button>
        <button
          type="button"
          onClick={() => handleDashboardFilterClick('NOT_RETURNED')}
          className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm min-w-0 text-left hover:border-pink-400 hover:shadow-md transition"
        >
          <div className="text-xs font-black uppercase tracking-widest text-slate-400">Chưa trả</div>
          <div className="mt-2 text-3xl font-black text-pink-700">{dispatchDashboard.total_not_returned}</div>
        </button>
        <button
          type="button"
          onClick={() => handleDashboardFilterClick('MISSING_ITEMS')}
          className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm min-w-0 text-left hover:border-red-400 hover:shadow-md transition"
        >
          <div className="text-xs font-black uppercase tracking-widest text-slate-400">Trả thiếu đồ</div>
          <div className="mt-2 text-3xl font-black text-red-600">{dispatchDashboard.total_missing_items}</div>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 w-full">
        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm min-w-0">
          <div className="text-xs font-black uppercase tracking-widest text-slate-400">Tổng đơn tráp</div>
          <div className="mt-2 text-3xl font-black text-slate-900">{dashboard.total_rows}</div>
        </div>
        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm min-w-0">
          <div className="text-xs font-black uppercase tracking-widest text-slate-400">Chưa làm</div>
          <div className="mt-2 text-3xl font-black text-slate-900">{dashboard.status_chua_lam}</div>
        </div>
        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm min-w-0">
          <div className="text-xs font-black uppercase tracking-widest text-slate-400">Trả thiếu đồ</div>
          <div className="mt-2 text-3xl font-black text-red-600">{dashboard.status_tra_thieu_do}</div>
        </div>
        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm min-w-0">
          <div className="text-xs font-black uppercase tracking-widest text-slate-400">Đã trả đủ</div>
          <div className="mt-2 text-3xl font-black text-emerald-600">{dashboard.status_da_tra_du}</div>
        </div>
      </div>

      <div className="bg-white rounded-3xl p-4 border border-slate-200 shadow-sm space-y-4 w-full min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-lg font-black text-slate-900">Quản Lý Giao Nhận Tráp</div>
            <div className="text-sm text-slate-500">Một bảng duy nhất + filter tháng, thay thế Google Sheet hiện tại.</div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleAutoUpdateStatuses}
              disabled={autoUpdatingStatus}
              className="px-4 py-3 rounded-2xl bg-violet-600 text-white font-black text-sm inline-flex items-center gap-2"
            >
              {autoUpdatingStatus ? <Loader2 size={16} className="animate-spin" /> : <AlarmClock size={16} />}
              Tự cập nhật trạng thái
            </button>
            <button
              onClick={handlePrintExport}
              className="px-4 py-3 rounded-2xl bg-emerald-600 text-white font-black text-sm inline-flex items-center gap-2"
            >
              <Printer size={16} /> Xuất File in
            </button>
            <button
              onClick={handleApplyFilters}
              className="px-4 py-3 rounded-2xl bg-slate-100 text-slate-700 font-black text-sm inline-flex items-center gap-2"
            >
              <RefreshCw size={16} /> Tải dữ liệu
            </button>
            <button
              onClick={handleSyncAll}
              disabled={syncing}
              className="px-4 py-3 rounded-2xl bg-blue-600 text-white font-black text-sm inline-flex items-center gap-2"
            >
              {syncing ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
              Sync dữ liệu
            </button>
            <button
              onClick={() => {
                setBaseTypeForm(EMPTY_OPTION_FORM);
                setBaseTypeModalOpen(true);
              }}
              className="px-4 py-3 rounded-2xl bg-slate-900 text-white font-black text-sm inline-flex items-center gap-2"
            >
              <Settings2 size={16} /> Loại đế tráp
            </button>
            <button
              onClick={() => {
                setTrapTypeForm(EMPTY_OPTION_FORM);
                setTrapTypeModalOpen(true);
              }}
              className="px-4 py-3 rounded-2xl bg-slate-900 text-white font-black text-sm inline-flex items-center gap-2"
            >
              <Settings2 size={16} /> Loại tráp
            </button>
          </div>
        </div>

        {(dispatchDashboard.total_overdue > 0 || dispatchDashboard.total_not_returned > 0 || dispatchDashboard.total_missing_items > 0 > 0) && (
          <div className="rounded-3xl border border-red-200 bg-red-50 p-4 text-red-800 flex items-start gap-3">
            <TriangleAlert className="mt-0.5" size={18} />
            <div className="text-sm">
              <div className="font-black">Có việc cần ưu tiên xử lý.</div>
              <div className="mt-1">
                Chưa trả: <strong>{dispatchDashboard.total_not_returned}</strong> dòng,
                Trả thiếu đồ: <strong>{dispatchDashboard.total_missing_items}</strong> dòng.
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setFilters((prev) => ({ ...prev, month: getCurrentMonthVN() }))}
            className="px-3 py-2 rounded-2xl bg-slate-100 text-slate-700 text-sm font-black inline-flex items-center gap-2"
          >
            <CalendarDays size={14} /> Tháng hiện tại
          </button>
          <button
            type="button"
            onClick={() => setFilters((prev) => ({ ...prev, month: 'PENDING_DATE' }))}
            className="px-3 py-2 rounded-2xl bg-amber-100 text-amber-800 text-sm font-black inline-flex items-center gap-2"
          >
            <Clock3 size={14} /> Chưa có ngày
          </button>
          <button
            type="button"
            onClick={() => setFilters((prev) => ({ ...prev, month: 'ALL' }))}
            className="px-3 py-2 rounded-2xl bg-blue-100 text-blue-800 text-sm font-black"
          >
            Tất cả dữ liệu
          </button>
          <button
            type="button"
            onClick={() => setFilters((prev) => ({ ...prev, status: 'CHUẨN BỊ' }))}
            className="px-3 py-2 rounded-2xl bg-yellow-100 text-yellow-800 text-sm font-black"
          >
            Lọc CHUẨN BỊ
          </button>
          <button
            type="button"
            onClick={() => setFilters((prev) => ({ ...prev, status: 'ĐANG LÀM' }))}
            className="px-3 py-2 rounded-2xl bg-fuchsia-100 text-fuchsia-800 text-sm font-black"
          >
            Lọc ĐANG LÀM
          </button>
          <button
            type="button"
            onClick={() => setFilters((prev) => ({ ...prev, status: 'CHƯA TRẢ TRÁP' }))}
            className="px-3 py-2 rounded-2xl bg-pink-100 text-pink-800 text-sm font-black"
          >
            Lọc CHƯA TRẢ
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 w-full">
          <div className="min-w-0">
            <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Tháng</label>
            <input
              type="month"
              value={filters.month === 'PENDING_DATE' || filters.month === 'ALL' ? '' : filters.month}
              onChange={(e) => setFilters((prev) => ({ ...prev, month: e.target.value }))}
              className="w-full px-4 py-3 rounded-2xl border border-slate-200"
            />
          </div>

          <div className="min-w-0">
            <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Tình trạng</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
              className="w-full px-4 py-3 rounded-2xl border border-slate-200"
            >
              <option value="">Tất cả</option>
              {dropdowns.statuses.map((item) => (
                <option key={item.id} value={item.status_name}>{item.status_name}</option>
              ))}
            </select>
          </div>

          <div className="min-w-0">
            <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Loại dịch vụ</label>
            <select
              value={filters.serviceName}
              onChange={(e) => setFilters((prev) => ({ ...prev, serviceName: e.target.value }))}
              className="w-full px-4 py-3 rounded-2xl border border-slate-200"
            >
              <option value="">Tất cả</option>
              {serviceOptions.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>

          <div className="min-w-0">
            <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Nhân sự</label>
            <select
              value={filters.staffId}
              onChange={(e) => setFilters((prev) => ({ ...prev, staffId: e.target.value }))}
              className="w-full px-4 py-3 rounded-2xl border border-slate-200"
            >
              <option value="">Tất cả</option>
              {dropdowns.staff.map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
          </div>

          <div className="min-w-0">
            <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Từ khóa</label>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={filters.search}
                onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
                placeholder="Tên khách / ghi chú..."
                className="w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-200"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden w-full min-w-0">
        <div className="w-full overflow-x-auto">
          <table className="w-full min-w-[1700px] text-sm">
            <thead className="bg-slate-50">
              <tr className="text-left text-slate-500 uppercase text-[11px] tracking-widest font-black">
                <th className="px-4 py-4">Khách hàng</th>
                <th className="px-4 py-4">Loại dịch vụ</th>
                <th className="px-4 py-4">Giá tiền</th>
                <th className="px-4 py-4">Ngày nhận tráp</th>
                <th className="px-4 py-4">Số tráp to</th>
                <th className="px-4 py-4">Loại đế tráp</th>
                <th className="px-4 py-4">Số tráp nhỏ</th>
                <th className="px-4 py-4">Loại tráp</th>
                <th className="px-4 py-4">Khăn trùm</th>
                <th className="px-4 py-4">Tình trạng</th>
                <th className="px-4 py-4">Người giao</th>
                <th className="px-4 py-4">Người nhận</th>
                <th className="px-4 py-4">Ghi chú</th>
                <th className="px-4 py-4">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={14} className="px-4 py-10 text-center text-slate-500 font-bold">
                    <span className="inline-flex items-center gap-2">
                      <Loader2 size={16} className="animate-spin" /> Đang tải dữ liệu...
                    </span>
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={14} className="px-4 py-10 text-center text-slate-500 font-bold">
                    Chưa có dữ liệu giao nhận tráp.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className={`border-t border-slate-100 ${STATUS_ROW_STYLE[row.tinh_trang] || ''}`}>
                    <td className="px-4 py-4 font-bold whitespace-nowrap">{row.customer_name}</td>
                    <td className="px-4 py-4 whitespace-nowrap">{row.service_name}</td>
                    <td className="px-4 py-4 whitespace-nowrap">{Number(row.price || 0).toLocaleString('vi-VN')} đ</td>
                    <td className="px-4 py-4 whitespace-nowrap">{formatDateVN(row.delivery_date)}</td>
                    <td className="px-4 py-4 whitespace-nowrap">{row.so_trap_to}</td>
                    <td className="px-4 py-4 whitespace-nowrap">{row.loai_de_trap_name || ''}</td>
                    <td className="px-4 py-4 whitespace-nowrap">{row.so_trap_nho}</td>
                    <td className="px-4 py-4 whitespace-nowrap">{row.loai_trap_name || ''}</td>
                    <td className="px-4 py-4 whitespace-nowrap">{row.khan_trum}</td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-3 py-1 rounded-full text-xs font-black ${STATUS_BADGE_STYLE[row.tinh_trang]}`}>
                        {row.tinh_trang}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">{row.nguoi_giao_name || ''}</td>
                    <td className="px-4 py-4 whitespace-nowrap">{row.nguoi_nhan_name || ''}</td>
                    <td className="px-4 py-4 min-w-[220px]">{row.ghi_chu || ''}</td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <button
                        onClick={() => openEditModal(row)}
                        className="px-3 py-2 rounded-xl bg-blue-600 text-white text-xs font-black inline-flex items-center gap-2"
                      >
                        <Save size={14} /> Sửa
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <CenteredPortalModal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="Cập nhật dòng giao nhận tráp"
        maxWidthClass="max-w-6xl"
      >
        <form onSubmit={handleSaveRow} className="flex flex-col">
          <div className="p-6 space-y-4">
            <div className="text-sm text-slate-500">Dữ liệu nguồn không sửa, chỉ sửa dữ liệu vận hành.</div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Khách hàng</label>
                <input value={editForm.customer_name} disabled className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50" />
              </div>
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Loại dịch vụ</label>
                <input value={editForm.service_name} disabled className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50" />
              </div>
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Giá tiền</label>
                <input value={`${Number(editForm.price || 0).toLocaleString('vi-VN')} đ`} disabled className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Ngày nhận tráp</label>
                <input value={formatDateVN(editForm.delivery_date)} disabled className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50" />
              </div>
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Số tráp to</label>
                <input type="number" min="0" value={editForm.so_trap_to} onChange={(e) => setEditForm((prev) => ({ ...prev, so_trap_to: e.target.value }))} className="w-full px-4 py-3 rounded-2xl border border-slate-200" />
              </div>
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Số tráp nhỏ</label>
                <input type="number" min="0" value={editForm.so_trap_nho} onChange={(e) => setEditForm((prev) => ({ ...prev, so_trap_nho: e.target.value }))} className="w-full px-4 py-3 rounded-2xl border border-slate-200" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Loại đế tráp</label>
                <select value={editForm.loai_de_trap_id} onChange={(e) => setEditForm((prev) => ({ ...prev, loai_de_trap_id: e.target.value }))} className="w-full px-4 py-3 rounded-2xl border border-slate-200">
                  <option value="">Chọn loại đế tráp</option>
                  {dropdowns.baseTypes.map((item) => (
                    <option key={item.id} value={item.id}>{item.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Loại tráp</label>
                <select value={editForm.loai_trap_id} onChange={(e) => setEditForm((prev) => ({ ...prev, loai_trap_id: e.target.value }))} className="w-full px-4 py-3 rounded-2xl border border-slate-200">
                  <option value="">Chọn loại tráp</option>
                  {dropdowns.trapTypes.map((item) => (
                    <option key={item.id} value={item.id}>{item.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Khăn trùm</label>
                <input type="number" min="0" value={editForm.khan_trum} onChange={(e) => setEditForm((prev) => ({ ...prev, khan_trum: e.target.value }))} className="w-full px-4 py-3 rounded-2xl border border-slate-200" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Tình trạng</label>
                <select value={editForm.tinh_trang} onChange={(e) => setEditForm((prev) => ({ ...prev, tinh_trang: e.target.value as TrapDeliveryStatus }))} className="w-full px-4 py-3 rounded-2xl border border-slate-200">
                  {dropdowns.statuses.map((item) => (
                    <option key={item.id} value={item.status_name}>{item.status_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Người giao</label>
                <select value={editForm.nguoi_giao_staff_id} onChange={(e) => setEditForm((prev) => ({ ...prev, nguoi_giao_staff_id: e.target.value }))} className="w-full px-4 py-3 rounded-2xl border border-slate-200">
                  <option value="">Chọn người giao</option>
                  {dropdowns.staff.map((item) => (
                    <option key={item.id} value={item.id}>{item.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Người nhận</label>
                <select value={editForm.nguoi_nhan_staff_id} onChange={(e) => setEditForm((prev) => ({ ...prev, nguoi_nhan_staff_id: e.target.value }))} className="w-full px-4 py-3 rounded-2xl border border-slate-200">
                  <option value="">Chọn người nhận</option>
                  {dropdowns.staff.map((item) => (
                    <option key={item.id} value={item.id}>{item.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Ghi chú</label>
              <textarea rows={4} value={editForm.ghi_chu} onChange={(e) => setEditForm((prev) => ({ ...prev, ghi_chu: e.target.value }))} className="w-full px-4 py-3 rounded-2xl border border-slate-200" />
            </div>
          </div>

          <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-3">
            <button type="button" onClick={() => setEditModalOpen(false)} className="px-4 py-3 rounded-2xl bg-slate-100 text-slate-700 font-black text-sm">
              Đóng
            </button>
            <button type="submit" disabled={savingRow} className="px-4 py-3 rounded-2xl bg-blue-600 text-white font-black text-sm inline-flex items-center gap-2">
              {savingRow ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Lưu thay đổi
            </button>
          </div>
        </form>
      </CenteredPortalModal>

      <CenteredPortalModal
        open={baseTypeModalOpen}
        onClose={() => setBaseTypeModalOpen(false)}
        title="Quản lý loại đế tráp"
        maxWidthClass="max-w-3xl"
      >
        <div className="p-6 space-y-4">
          <form onSubmit={handleSaveBaseType} className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input
              value={baseTypeForm.name}
              onChange={(e) => setBaseTypeForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Tên loại đế tráp"
              className="px-4 py-3 rounded-2xl border border-slate-200"
            />
            <input
              type="number"
              value={baseTypeForm.sortOrder}
              onChange={(e) => setBaseTypeForm((prev) => ({ ...prev, sortOrder: e.target.value }))}
              placeholder="Thứ tự"
              className="px-4 py-3 rounded-2xl border border-slate-200"
            />
            <button type="submit" disabled={savingOption} className="px-4 py-3 rounded-2xl bg-blue-600 text-white font-black text-sm inline-flex items-center justify-center gap-2">
              {savingOption ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              Lưu
            </button>
          </form>

          <div className="space-y-2">
            {dropdowns.baseTypes.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-3 px-4 py-3 rounded-2xl border border-slate-200">
                <div className="font-bold text-slate-800">{item.name}</div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setBaseTypeForm({ id: item.id, name: item.name, sortOrder: String(item.sort_order || 0) })}
                    className="px-3 py-2 rounded-xl bg-amber-100 text-amber-700 text-xs font-black"
                    type="button"
                  >
                    Sửa
                  </button>
                  <button
                    onClick={() => handleDeleteBaseType(item.id)}
                    className="px-3 py-2 rounded-xl bg-red-100 text-red-700 text-xs font-black inline-flex items-center gap-1"
                    type="button"
                  >
                    <Trash2 size={12} /> Xóa
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CenteredPortalModal>

      <CenteredPortalModal
        open={trapTypeModalOpen}
        onClose={() => setTrapTypeModalOpen(false)}
        title="Quản lý loại tráp"
        maxWidthClass="max-w-3xl"
      >
        <div className="p-6 space-y-4">
          <form onSubmit={handleSaveTrapType} className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input
              value={trapTypeForm.name}
              onChange={(e) => setTrapTypeForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Tên loại tráp"
              className="px-4 py-3 rounded-2xl border border-slate-200"
            />
            <input
              type="number"
              value={trapTypeForm.sortOrder}
              onChange={(e) => setTrapTypeForm((prev) => ({ ...prev, sortOrder: e.target.value }))}
              placeholder="Thứ tự"
              className="px-4 py-3 rounded-2xl border border-slate-200"
            />
            <button type="submit" disabled={savingOption} className="px-4 py-3 rounded-2xl bg-blue-600 text-white font-black text-sm inline-flex items-center justify-center gap-2">
              {savingOption ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              Lưu
            </button>
          </form>

          <div className="space-y-2">
            {dropdowns.trapTypes.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-3 px-4 py-3 rounded-2xl border border-slate-200">
                <div className="font-bold text-slate-800">{item.name}</div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setTrapTypeForm({ id: item.id, name: item.name, sortOrder: String(item.sort_order || 0) })}
                    className="px-3 py-2 rounded-xl bg-amber-100 text-amber-700 text-xs font-black"
                    type="button"
                  >
                    Sửa
                  </button>
                  <button
                    onClick={() => handleDeleteTrapType(item.id)}
                    className="px-3 py-2 rounded-xl bg-red-100 text-red-700 text-xs font-black inline-flex items-center gap-1"
                    type="button"
                  >
                    <Trash2 size={12} /> Xóa
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CenteredPortalModal>
    </div>
  );
}
