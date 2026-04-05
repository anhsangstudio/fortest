import React, { useEffect, useMemo, useState } from 'react';
import {
  Search,
  Plus,
  RefreshCw,
  Upload,
  Loader2,
  ExternalLink,
  Download,
  Package,
  AlertTriangle,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  BarChart3,
} from 'lucide-react';
import ResponsiveModal from './ResponsiveModal';
import {
  searchPhotoIdOrdersByPhone,
  fetchPhotoPaperInventory,
  createPhotoPaperStockIn,
  createPhotoIdOrder,
  fetchPhotoIdDashboard,
  fetchPhotoIdOrdersPaged,
  updatePhotoIdOrderRpc,
  deletePhotoIdOrderRpc,
  fetchPhotoIdRevenueReport,
} from '../apiService';
import type { Staff } from '../types';

type PhotoIdOrderRow = {
  id: string;
  orderCode: string;
  orderDatetime: string;
  customerId?: string | null;
  customerName: string;
  customerPhone: string;
  printPaperQuantity: number;
  amount: number;
  paymentMethod?: string;
  driveFileUrl?: string;
  driveFileId?: string;
  note?: string;
  status?: string;
  isReprint?: boolean;
  originalOrderId?: string | null;
  transactionId?: string | null;
  createdBy?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

type PhotoPaperInventoryRow = {
  id: string;
  paperName: string;
  unit: string;
  currentQuantity: number;
  warningThreshold: number;
  averageCost: number;
  isLowStock?: boolean;
};

type DashboardState = {
  totalPaperInStock: number;
  totalInventoryItems: number;
  lowStockItems: number;
};

type ReportSummary = {
  totalOrders: number;
  totalPrintPaper: number;
  totalRevenue: number;
  averageOrderValue: number;
  totalCost: number;
  grossProfit: number;
};

type ReportByDayRow = {
  reportDate: string;
  totalOrders: number;
  totalPrintPaper: number;
  cashRevenue: number;
  bankRevenue: number;
  totalRevenue: number;
  averageOrderValue: number;
};

type ReportByMonthRow = {
  reportMonth: string;
  totalOrders: number;
  totalPrintPaper: number;
  cashRevenue: number;
  bankRevenue: number;
  totalRevenue: number;
  averageOrderValue: number;
};

interface PhotoIDManagerProps {
  currentUser: Staff | null;
}

type OrderFormState = {
  orderDatetime: string;
  customerName: string;
  customerPhone: string;
  printPaperQuantity: string;
  amount: string;
  paymentMethod: string;
  driveFileUrl: string;
  driveFileId: string;
  note: string;
  isReprint: boolean;
};

type StockInFormState = {
  paperInventoryId: string;
  quantity: string;
  unitCost: string;
  note: string;
};

const PAGE_SIZE = 20;
const LOW_STOCK_THRESHOLD = 30;

const formatCurrency = (value?: number | string | null) => {
  const amount = Number(value || 0);
  return `${amount.toLocaleString('vi-VN')} đ`;
};

const formatDateTimeVN = (value?: string | null) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(date);
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

const normalizePhone = (value: string) => value.replace(/\s+/g, '').trim();

const toHoChiMinhInputValue = (value?: string | Date | null) => {
  const date = value ? new Date(value) : new Date();
  const utcMs = date.getTime() + date.getTimezoneOffset() * 60000;
  const hcmMs = utcMs + 7 * 60 * 60 * 1000;
  return new Date(hcmMs).toISOString().slice(0, 16);
};

const fromHoChiMinhInputToIso = (input: string) => {
  if (!input) return new Date().toISOString();

  const [datePart, timePart] = input.split('T');
  if (!datePart || !timePart) return new Date().toISOString();

  const [year, month, day] = datePart.split('-').map(Number);
  const [hour, minute] = timePart.split(':').map(Number);

  const utcMs = Date.UTC(year, month - 1, day, hour, minute) - 7 * 60 * 60 * 1000;
  return new Date(utcMs).toISOString();
};

const getTodayVN = () => {
  const now = new Date();
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
  const hcmMs = utcMs + 7 * 60 * 60 * 1000;
  return new Date(hcmMs).toISOString().slice(0, 10);
};

const getFirstDayOfMonthVN = () => {
  const today = getTodayVN();
  return `${today.slice(0, 8)}01`;
};

const createEmptyOrderForm = (): OrderFormState => ({
  orderDatetime: toHoChiMinhInputValue(),
  customerName: '',
  customerPhone: '',
  printPaperQuantity: '1',
  amount: '',
  paymentMethod: 'Tiền mặt',
  driveFileUrl: '',
  driveFileId: '',
  note: '',
  isReprint: false,
});

const EMPTY_STOCK_IN_FORM: StockInFormState = {
  paperInventoryId: '',
  quantity: '',
  unitCost: '',
  note: '',
};

export default function PhotoIDManager({ currentUser }: PhotoIDManagerProps) {
  const canViewRevenueReport =
    currentUser?.username === 'admin' || currentUser?.role === 'Giám đốc';

  const [activeTab, setActiveTab] = useState<'orders' | 'lookup' | 'inventory' | 'report'>('orders');

  const [dashboard, setDashboard] = useState<DashboardState>({
    totalPaperInStock: 0,
    totalInventoryItems: 0,
    lowStockItems: 0,
  });

  const [orders, setOrders] = useState<PhotoIdOrderRow[]>([]);
  const [inventory, setInventory] = useState<PhotoPaperInventoryRow[]>([]);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalRows, setTotalRows] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [loadingOrders, setLoadingOrders] = useState(false);
  const [loadingInventory, setLoadingInventory] = useState(false);
  const [loadingDashboard, setLoadingDashboard] = useState(false);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [submittingStockIn, setSubmittingStockIn] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [deletingOrderId, setDeletingOrderId] = useState<string | null>(null);

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [stockInModalOpen, setStockInModalOpen] = useState(false);

  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [orderForm, setOrderForm] = useState<OrderFormState>(createEmptyOrderForm());
  const [stockInForm, setStockInForm] = useState<StockInFormState>(EMPTY_STOCK_IN_FORM);

  const [lookupPhone, setLookupPhone] = useState('');
  const [lookupResults, setLookupResults] = useState<PhotoIdOrderRow[]>([]);

  const [reportFromDate, setReportFromDate] = useState(getFirstDayOfMonthVN());
  const [reportToDate, setReportToDate] = useState(getTodayVN());
  const [reportLoading, setReportLoading] = useState(false);
  const [reportSummary, setReportSummary] = useState<ReportSummary>({
    totalOrders: 0,
    totalPrintPaper: 0,
    totalRevenue: 0,
    averageOrderValue: 0,
    totalCost: 0,
    grossProfit: 0,
  });
  const [reportByDay, setReportByDay] = useState<ReportByDayRow[]>([]);
  const [reportByMonth, setReportByMonth] = useState<ReportByMonthRow[]>([]);

  const lowStockItems = useMemo(
    () => inventory.filter((item) => Number(item.currentQuantity || 0) < LOW_STOCK_THRESHOLD),
    [inventory]
  );

  const resetOrderForm = () => {
    setOrderForm(createEmptyOrderForm());
    setEditingOrderId(null);
  };

  const resetStockInForm = () => {
    setStockInForm({
      ...EMPTY_STOCK_IN_FORM,
      paperInventoryId: inventory[0]?.id || '',
    });
  };

  const loadDashboard = async () => {
    try {
      setLoadingDashboard(true);
      const data = await fetchPhotoIdDashboard();
      setDashboard(data);
    } catch (error: any) {
      alert(error.message || 'Không tải được dashboard ảnh thẻ');
    } finally {
      setLoadingDashboard(false);
    }
  };

  const loadOrdersPage = async (page: number = 1) => {
    try {
      setLoadingOrders(true);
      const result = await fetchPhotoIdOrdersPaged(page, PAGE_SIZE, null);
      setOrders((result.rows || []) as PhotoIdOrderRow[]);
      setCurrentPage(Number(result.currentPage || page));
      setTotalRows(Number(result.totalRows || 0));
      setTotalPages(Number(result.totalPages || 1));
    } catch (error: any) {
      alert(error.message || 'Không tải được danh sách đơn ảnh thẻ');
    } finally {
      setLoadingOrders(false);
    }
  };

  const loadInventory = async () => {
    try {
      setLoadingInventory(true);
      const data = await fetchPhotoPaperInventory();
      setInventory((data || []) as PhotoPaperInventoryRow[]);
      setStockInForm((prev) => ({
        ...prev,
        paperInventoryId: prev.paperInventoryId || data?.[0]?.id || '',
      }));
    } catch (error: any) {
      alert(error.message || 'Không tải được kho giấy');
    } finally {
      setLoadingInventory(false);
    }
  };

  const loadReport = async () => {
    if (!canViewRevenueReport) return;

    try {
      setReportLoading(true);
      const data = await fetchPhotoIdRevenueReport(reportFromDate, reportToDate);
      setReportSummary(data.summary);
      setReportByDay(data.byDay || []);
      setReportByMonth(data.byMonth || []);
    } catch (error: any) {
      alert(error.message || 'Không tải được báo cáo doanh thu');
    } finally {
      setReportLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
    loadOrdersPage(1);
    loadInventory();
  }, []);

  useEffect(() => {
    if (activeTab === 'report' && canViewRevenueReport) {
      loadReport();
    }
  }, [activeTab]);

  const handleUploadFile = async (file?: File | null) => {
    if (!file) return;
    if (!orderForm.customerPhone.trim()) {
      alert('Hãy nhập số điện thoại trước khi upload ảnh.');
      return;
    }

    try {
      setUploadingFile(true);

      const formData = new FormData();
      formData.append('file', file);
      formData.append(
        'metadata',
        JSON.stringify({
          category: 'AnhThe',
          timestamp: Date.now(),
          staffName: currentUser?.name || 'Staff',
          customerPhone: normalizePhone(orderForm.customerPhone),
          module: 'PHOTO_ID',
        })
      );

      const response = await fetch('/api/drive_upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok || !result?.success) {
        throw new Error(result?.error || 'Upload file thất bại');
      }

      setOrderForm((prev) => ({
        ...prev,
        driveFileUrl: result.url || '',
        driveFileId: result.fileId || '',
      }));
    } catch (error: any) {
      alert(error.message || 'Upload ảnh thất bại');
    } finally {
      setUploadingFile(false);
    }
  };

  const refreshCoreData = async (page: number = currentPage) => {
    await Promise.all([
      loadDashboard(),
      loadInventory(),
      loadOrdersPage(page),
    ]);

    if (canViewRevenueReport && activeTab === 'report') {
      await loadReport();
    }
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();

    const customerName = orderForm.customerName.trim();
    const customerPhone = normalizePhone(orderForm.customerPhone);
    const printPaperQuantity = Number(orderForm.printPaperQuantity || 0);
    const amount = Number(orderForm.amount || 0);

    if (!customerName) return alert('Vui lòng nhập tên khách hàng.');
    if (!customerPhone) return alert('Vui lòng nhập số điện thoại.');
    if (printPaperQuantity <= 0) return alert('Số lượng giấy in phải lớn hơn 0.');
    if (amount < 0) return alert('Số tiền không hợp lệ.');

    try {
      setSubmittingOrder(true);

      await createPhotoIdOrder({
        customerName,
        customerPhone,
        printPaperQuantity,
        amount,
        paymentMethod: orderForm.paymentMethod,
        driveFileUrl: orderForm.driveFileUrl,
        driveFileId: orderForm.driveFileId,
        note: orderForm.note.trim(),
        createdBy: currentUser?.id || null,
        orderDatetime: fromHoChiMinhInputToIso(orderForm.orderDatetime),
        isReprint: orderForm.isReprint,
      } as any);

      alert('Đã tạo đơn ảnh thẻ thành công.');
      setCreateModalOpen(false);
      resetOrderForm();
      await refreshCoreData(1);
    } catch (error: any) {
      alert(error.message || 'Tạo đơn ảnh thẻ thất bại');
    } finally {
      setSubmittingOrder(false);
    }
  };

  const handleOpenEdit = (item: PhotoIdOrderRow) => {
    setEditingOrderId(item.id);
    setOrderForm({
      orderDatetime: toHoChiMinhInputValue(item.orderDatetime),
      customerName: item.customerName || '',
      customerPhone: item.customerPhone || '',
      printPaperQuantity: String(item.printPaperQuantity || 1),
      amount: String(item.amount || 0),
      paymentMethod: item.paymentMethod || 'Tiền mặt',
      driveFileUrl: item.driveFileUrl || '',
      driveFileId: item.driveFileId || '',
      note: item.note || '',
      isReprint: !!item.isReprint,
    });
    setEditModalOpen(true);
  };

  const handleUpdateOrder = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editingOrderId) return;

    const customerName = orderForm.customerName.trim();
    const customerPhone = normalizePhone(orderForm.customerPhone);
    const printPaperQuantity = Number(orderForm.printPaperQuantity || 0);
    const amount = Number(orderForm.amount || 0);

    if (!customerName) return alert('Vui lòng nhập tên khách hàng.');
    if (!customerPhone) return alert('Vui lòng nhập số điện thoại.');
    if (printPaperQuantity <= 0) return alert('Số lượng giấy in phải lớn hơn 0.');
    if (amount < 0) return alert('Số tiền không hợp lệ.');

    try {
      setSubmittingOrder(true);

      await updatePhotoIdOrderRpc({
        id: editingOrderId,
        orderDatetime: fromHoChiMinhInputToIso(orderForm.orderDatetime),
        customerName,
        customerPhone,
        printPaperQuantity,
        amount,
        paymentMethod: orderForm.paymentMethod,
        driveFileUrl: orderForm.driveFileUrl,
        driveFileId: orderForm.driveFileId,
        note: orderForm.note.trim(),
        updatedBy: currentUser?.id || null,
      });

      alert('Đã cập nhật đơn ảnh thẻ thành công.');
      setEditModalOpen(false);
      resetOrderForm();
      await refreshCoreData(currentPage);
    } catch (error: any) {
      alert(error.message || 'Cập nhật đơn ảnh thẻ thất bại');
    } finally {
      setSubmittingOrder(false);
    }
  };

  const handleDeleteOrder = async (item: PhotoIdOrderRow) => {
    const ok = window.confirm(`Xóa thật đơn ${item.orderCode}? Thao tác này sẽ xóa đơn, giao dịch thu và hoàn lại kho giấy.`);
    if (!ok) return;

    try {
      setDeletingOrderId(item.id);
      await deletePhotoIdOrderRpc(item.id, currentUser?.id || null);
      alert('Đã xóa đơn ảnh thẻ thành công.');
      await refreshCoreData(currentPage);
    } catch (error: any) {
      alert(error.message || 'Xóa đơn ảnh thẻ thất bại');
    } finally {
      setDeletingOrderId(null);
    }
  };

  const handleSearch = async () => {
    const phone = normalizePhone(lookupPhone);
    if (!phone) {
      setLookupResults([]);
      return alert('Hãy nhập số điện thoại để tra cứu.');
    }

    try {
      setLookupLoading(true);
      const data = await searchPhotoIdOrdersByPhone(phone);
      setLookupResults((data || []) as PhotoIdOrderRow[]);
    } catch (error: any) {
      alert(error.message || 'Tra cứu thất bại');
    } finally {
      setLookupLoading(false);
    }
  };

  const handleStockIn = async (e: React.FormEvent) => {
    e.preventDefault();

    const quantity = Number(stockInForm.quantity || 0);
    const unitCost = Number(stockInForm.unitCost || 0);

    if (!stockInForm.paperInventoryId) return alert('Hãy chọn kho giấy.');
    if (quantity <= 0) return alert('Số lượng nhập phải lớn hơn 0.');
    if (unitCost < 0) return alert('Đơn giá không hợp lệ.');

    try {
      setSubmittingStockIn(true);
      await createPhotoPaperStockIn({
        paperInventoryId: stockInForm.paperInventoryId,
        quantity,
        unitCost,
        note: stockInForm.note.trim(),
        createdBy: currentUser?.id || null,
      });

      alert('Đã nhập kho giấy thành công.');
      setStockInModalOpen(false);
      resetStockInForm();
      await Promise.all([loadInventory(), loadDashboard()]);
      if (canViewRevenueReport && activeTab === 'report') {
        await loadReport();
      }
    } catch (error: any) {
      alert(error.message || 'Nhập kho thất bại');
    } finally {
      setSubmittingStockIn(false);
    }
  };

  const openLink = (url?: string) => {
    if (!url) return alert('Đơn này chưa có link ảnh.');
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const downloadLink = (url?: string) => {
    if (!url) return alert('Đơn này chưa có link ảnh.');
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.click();
  };

  const renderOrderForm = (onSubmit: (e: React.FormEvent) => Promise<void> | void, submitLabel: string) => (
    <form onSubmit={onSubmit} className="flex flex-col max-h-[90vh]">
      <div className="px-6 py-5 border-b border-slate-200">
        <div className="text-xl font-black text-slate-900">{submitLabel}</div>
        <div className="text-sm text-slate-500 mt-1">Ngày giờ hiển thị theo GMT+7 Hồ Chí Minh.</div>
      </div>

      <div className="p-6 overflow-y-auto space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Dấu thời gian</label>
            <input
              type="datetime-local"
              value={orderForm.orderDatetime}
              onChange={(e) => setOrderForm((prev) => ({ ...prev, orderDatetime: e.target.value }))}
              className="w-full px-4 py-3 rounded-2xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Phương thức thanh toán</label>
            <select
              value={orderForm.paymentMethod}
              onChange={(e) => setOrderForm((prev) => ({ ...prev, paymentMethod: e.target.value }))}
              className="w-full px-4 py-3 rounded-2xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="Tiền mặt">Tiền mặt</option>
              <option value="Chuyển khoản">Chuyển khoản</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Tên khách hàng</label>
            <input
              value={orderForm.customerName}
              onChange={(e) => setOrderForm((prev) => ({ ...prev, customerName: e.target.value }))}
              className="w-full px-4 py-3 rounded-2xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Nhập tên khách hàng"
            />
          </div>
          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Số điện thoại</label>
            <input
              value={orderForm.customerPhone}
              onChange={(e) => setOrderForm((prev) => ({ ...prev, customerPhone: e.target.value }))}
              className="w-full px-4 py-3 rounded-2xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Nhập số điện thoại"
            />
          </div>
          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Số lượng giấy in</label>
            <input
              type="number"
              min="1"
              value={orderForm.printPaperQuantity}
              onChange={(e) => setOrderForm((prev) => ({ ...prev, printPaperQuantity: e.target.value }))}
              className="w-full px-4 py-3 rounded-2xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Số tiền</label>
            <input
              type="number"
              min="0"
              value={orderForm.amount}
              onChange={(e) => setOrderForm((prev) => ({ ...prev, amount: e.target.value }))}
              className="w-full px-4 py-3 rounded-2xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Nhập số tiền"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Upload file ảnh lên Drive</label>
          <label className="flex items-center justify-center gap-2 px-4 py-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 cursor-pointer text-slate-700 font-bold">
            {uploadingFile ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
            {uploadingFile ? 'Đang upload...' : 'Chọn file ảnh để upload'}
            <input
              type="file"
              className="hidden"
              onChange={(e) => handleUploadFile(e.target.files?.[0] || null)}
            />
          </label>

          {orderForm.driveFileUrl && (
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" onClick={() => openLink(orderForm.driveFileUrl)} className="px-3 py-2 rounded-xl bg-slate-100 text-slate-700 text-sm font-black flex items-center gap-2">
                <ExternalLink size={14} /> Mở link Drive
              </button>
              <button type="button" onClick={() => downloadLink(orderForm.driveFileUrl)} className="px-3 py-2 rounded-xl bg-slate-100 text-slate-700 text-sm font-black flex items-center gap-2">
                <Download size={14} /> Tải ảnh
              </button>
            </div>
          )}
        </div>

        <div>
          <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Ghi chú</label>
          <textarea
            value={orderForm.note}
            onChange={(e) => setOrderForm((prev) => ({ ...prev, note: e.target.value }))}
            rows={4}
            className="w-full px-4 py-3 rounded-2xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Ghi chú nội bộ nếu cần"
          />
        </div>

        <label className="flex items-center gap-3 text-sm font-bold text-slate-700">
          <input
            type="checkbox"
            checked={orderForm.isReprint}
            onChange={(e) => setOrderForm((prev) => ({ ...prev, isReprint: e.target.checked }))}
          />
          Đây là đơn in lại ảnh cũ
        </label>
      </div>

      <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-3">
        <button
          type="button"
          onClick={() => {
            setCreateModalOpen(false);
            setEditModalOpen(false);
          }}
          className="px-4 py-3 rounded-2xl bg-slate-100 text-slate-700 font-black text-sm"
        >
          Đóng
        </button>
        <button type="submit" disabled={submittingOrder || uploadingFile} className="px-4 py-3 rounded-2xl bg-blue-600 text-white font-black text-sm inline-flex items-center gap-2">
          {submittingOrder ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} Lưu
        </button>
      </div>
    </form>
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm">
          <div className="text-xs font-black uppercase tracking-widest text-slate-400">Số giấy còn trong kho</div>
          <div className="mt-2 text-3xl font-black text-slate-900">
            {loadingDashboard ? <span className="text-base">Đang tải...</span> : dashboard.totalPaperInStock}
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm">
          <div className="text-xs font-black uppercase tracking-widest text-slate-400">Giấy sắp hết (dưới 30 tờ)</div>
          <div className="mt-2 text-3xl font-black text-red-600">
            {loadingDashboard ? <span className="text-base text-slate-500">Đang tải...</span> : dashboard.lowStockItems}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl p-3 border border-slate-200 shadow-sm flex flex-wrap gap-2">
        <button
          onClick={() => setActiveTab('orders')}
          className={`px-4 py-3 rounded-2xl text-sm font-black ${activeTab === 'orders' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'}`}
        >
          Đơn ảnh thẻ
        </button>
        <button
          onClick={() => setActiveTab('lookup')}
          className={`px-4 py-3 rounded-2xl text-sm font-black ${activeTab === 'lookup' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'}`}
        >
          Tra cứu ảnh cũ
        </button>
        <button
          onClick={() => setActiveTab('inventory')}
          className={`px-4 py-3 rounded-2xl text-sm font-black ${activeTab === 'inventory' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'}`}
        >
          Kho giấy
        </button>

        {canViewRevenueReport && (
          <button
            onClick={() => setActiveTab('report')}
            className={`px-4 py-3 rounded-2xl text-sm font-black ${activeTab === 'report' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'}`}
          >
            Báo cáo doanh thu
          </button>
        )}
      </div>

      {activeTab === 'orders' && (
        <div className="space-y-4">
          <div className="bg-white rounded-3xl p-4 border border-slate-200 shadow-sm flex flex-wrap gap-3 justify-between items-center">
            <div>
              <div className="text-lg font-black text-slate-900">Danh sách đơn ảnh thẻ</div>
              <div className="text-sm text-slate-500">Phân trang 20 dòng mỗi trang, có sửa và xóa đơn.</div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => refreshCoreData(currentPage)}
                className="px-4 py-3 rounded-2xl bg-slate-100 text-slate-700 font-black text-sm flex items-center gap-2"
              >
                <RefreshCw size={16} /> Tải lại
              </button>
              <button
                onClick={() => {
                  resetOrderForm();
                  setCreateModalOpen(true);
                }}
                className="px-4 py-3 rounded-2xl bg-blue-600 text-white font-black text-sm flex items-center gap-2"
              >
                <Plus size={16} /> Tạo đơn mới
              </button>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50">
                  <tr className="text-left text-slate-500 uppercase text-[11px] tracking-widest font-black">
                    <th className="px-4 py-4">Thời gian</th>
                    <th className="px-4 py-4">Mã đơn</th>
                    <th className="px-4 py-4">Khách hàng</th>
                    <th className="px-4 py-4">SĐT</th>
                    <th className="px-4 py-4">Số giấy</th>
                    <th className="px-4 py-4">Số tiền</th>
                    <th className="px-4 py-4">Thanh toán</th>
                    <th className="px-4 py-4">Ảnh</th>
                    <th className="px-4 py-4">Ghi chú</th>
                    <th className="px-4 py-4">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingOrders ? (
                    <tr>
                      <td colSpan={10} className="px-4 py-10 text-center text-slate-500 font-bold">
                        <span className="inline-flex items-center gap-2"><Loader2 size={16} className="animate-spin" /> Đang tải dữ liệu...</span>
                      </td>
                    </tr>
                  ) : orders.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="px-4 py-10 text-center text-slate-500 font-bold">
                        Chưa có đơn ảnh thẻ nào.
                      </td>
                    </tr>
                  ) : (
                    orders.map((item) => (
                      <tr key={item.id} className="border-t border-slate-100 align-top">
                        <td className="px-4 py-4 whitespace-nowrap">{formatDateTimeVN(item.orderDatetime)}</td>
                        <td className="px-4 py-4 font-black whitespace-nowrap">{item.orderCode}</td>
                        <td className="px-4 py-4">{item.customerName}</td>
                        <td className="px-4 py-4 whitespace-nowrap">{item.customerPhone}</td>
                        <td className="px-4 py-4 whitespace-nowrap">{item.printPaperQuantity}</td>
                        <td className="px-4 py-4 whitespace-nowrap font-bold">{formatCurrency(item.amount)}</td>
                        <td className="px-4 py-4 whitespace-nowrap">{item.paymentMethod || ''}</td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="flex gap-2">
                            <button onClick={() => openLink(item.driveFileUrl)} className="p-2 rounded-xl bg-slate-100 text-slate-700">
                              <ExternalLink size={15} />
                            </button>
                            <button onClick={() => downloadLink(item.driveFileUrl)} className="p-2 rounded-xl bg-slate-100 text-slate-700">
                              <Download size={15} />
                            </button>
                          </div>
                        </td>
                        <td className="px-4 py-4 min-w-[200px]">{item.note || ''}</td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleOpenEdit(item)}
                              className="p-2 rounded-xl bg-amber-100 text-amber-700"
                              title="Sửa đơn"
                            >
                              <Pencil size={15} />
                            </button>
                            <button
                              onClick={() => handleDeleteOrder(item)}
                              disabled={deletingOrderId === item.id}
                              className="p-2 rounded-xl bg-red-100 text-red-700 disabled:opacity-60"
                              title="Xóa đơn"
                            >
                              {deletingOrderId === item.id ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="px-4 py-4 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-3">
              <div className="text-sm text-slate-500 font-bold">
                Tổng {totalRows.toLocaleString('vi-VN')} dòng • Trang {currentPage}/{totalPages}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => loadOrdersPage(currentPage - 1)}
                  disabled={currentPage <= 1 || loadingOrders}
                  className="px-3 py-2 rounded-xl bg-slate-100 text-slate-700 disabled:opacity-50 inline-flex items-center gap-2"
                >
                  <ChevronLeft size={16} /> Trước
                </button>
                <button
                  onClick={() => loadOrdersPage(currentPage + 1)}
                  disabled={currentPage >= totalPages || loadingOrders}
                  className="px-3 py-2 rounded-xl bg-slate-100 text-slate-700 disabled:opacity-50 inline-flex items-center gap-2"
                >
                  Sau <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'lookup' && (
        <div className="space-y-4">
          <div className="bg-white rounded-3xl p-4 border border-slate-200 shadow-sm">
            <div className="text-lg font-black text-slate-900">Tra cứu ảnh cũ theo số điện thoại</div>
            <div className="mt-1 text-sm text-slate-500">Nhập số điện thoại để mở link Drive và tải ảnh về in lại.</div>
            <div className="mt-4 flex flex-col md:flex-row gap-3">
              <input
                value={lookupPhone}
                onChange={(e) => setLookupPhone(e.target.value)}
                placeholder="Nhập số điện thoại khách hàng"
                className="flex-1 px-4 py-3 rounded-2xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleSearch}
                className="px-4 py-3 rounded-2xl bg-blue-600 text-white font-black text-sm flex items-center justify-center gap-2"
              >
                {lookupLoading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />} Tìm kiếm
              </button>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50">
                  <tr className="text-left text-slate-500 uppercase text-[11px] tracking-widest font-black">
                    <th className="px-4 py-4">Thời gian</th>
                    <th className="px-4 py-4">Mã đơn</th>
                    <th className="px-4 py-4">Khách hàng</th>
                    <th className="px-4 py-4">SĐT</th>
                    <th className="px-4 py-4">Số giấy</th>
                    <th className="px-4 py-4">Số tiền</th>
                    <th className="px-4 py-4">Ảnh</th>
                    <th className="px-4 py-4">Ghi chú</th>
                  </tr>
                </thead>
                <tbody>
                  {lookupLoading ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-10 text-center text-slate-500 font-bold">
                        <span className="inline-flex items-center gap-2"><Loader2 size={16} className="animate-spin" /> Đang tra cứu...</span>
                      </td>
                    </tr>
                  ) : lookupResults.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-10 text-center text-slate-500 font-bold">
                        Chưa có kết quả tra cứu.
                      </td>
                    </tr>
                  ) : (
                    lookupResults.map((item) => (
                      <tr key={item.id} className="border-t border-slate-100 align-top">
                        <td className="px-4 py-4 whitespace-nowrap">{formatDateTimeVN(item.orderDatetime)}</td>
                        <td className="px-4 py-4 font-black whitespace-nowrap">{item.orderCode}</td>
                        <td className="px-4 py-4">{item.customerName}</td>
                        <td className="px-4 py-4 whitespace-nowrap">{item.customerPhone}</td>
                        <td className="px-4 py-4 whitespace-nowrap">{item.printPaperQuantity}</td>
                        <td className="px-4 py-4 whitespace-nowrap font-bold">{formatCurrency(item.amount)}</td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="flex gap-2">
                            <button onClick={() => openLink(item.driveFileUrl)} className="p-2 rounded-xl bg-slate-100 text-slate-700">
                              <ExternalLink size={15} />
                            </button>
                            <button onClick={() => downloadLink(item.driveFileUrl)} className="p-2 rounded-xl bg-slate-100 text-slate-700">
                              <Download size={15} />
                            </button>
                          </div>
                        </td>
                        <td className="px-4 py-4 min-w-[220px]">{item.note || ''}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'inventory' && (
        <div className="space-y-4">
          <div className="bg-white rounded-3xl p-4 border border-slate-200 shadow-sm flex flex-wrap gap-3 justify-between items-center">
            <div>
              <div className="text-lg font-black text-slate-900">Kho giấy ảnh thẻ</div>
              <div className="mt-1 text-sm text-slate-500">Theo dõi tồn kho và cảnh báo giấy dưới 30 tờ.</div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => Promise.all([loadInventory(), loadDashboard()])}
                className="px-4 py-3 rounded-2xl bg-slate-100 text-slate-700 font-black text-sm flex items-center gap-2"
              >
                <RefreshCw size={16} /> Tải lại
              </button>
              <button
                onClick={() => {
                  resetStockInForm();
                  setStockInModalOpen(true);
                }}
                className="px-4 py-3 rounded-2xl bg-blue-600 text-white font-black text-sm flex items-center gap-2"
              >
                <Package size={16} /> Nhập kho giấy
              </button>
            </div>
          </div>

          {lowStockItems.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-3xl p-4 flex items-start gap-3">
              <AlertTriangle className="mt-0.5" size={18} />
              <div>
                <div className="font-black">Có giấy đang ở mức cảnh báo dưới 30 tờ.</div>
                <div className="text-sm mt-1">
                  {lowStockItems.map((item) => `${item.paperName} (${item.currentQuantity} ${item.unit})`).join(', ')}
                </div>
              </div>
            </div>
          )}

          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50">
                  <tr className="text-left text-slate-500 uppercase text-[11px] tracking-widest font-black">
                    <th className="px-4 py-4">Tên giấy</th>
                    <th className="px-4 py-4">Tồn hiện tại</th>
                    <th className="px-4 py-4">Đơn vị</th>
                    <th className="px-4 py-4">Ngưỡng cảnh báo hệ thống</th>
                    <th className="px-4 py-4">Giá vốn TB</th>
                    <th className="px-4 py-4">Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingInventory ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-10 text-center text-slate-500 font-bold">
                        <span className="inline-flex items-center gap-2"><Loader2 size={16} className="animate-spin" /> Đang tải tồn kho...</span>
                      </td>
                    </tr>
                  ) : inventory.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-10 text-center text-slate-500 font-bold">
                        Chưa có dữ liệu kho giấy.
                      </td>
                    </tr>
                  ) : (
                    inventory.map((item) => (
                      <tr key={item.id} className="border-t border-slate-100">
                        <td className="px-4 py-4 font-bold">{item.paperName}</td>
                        <td className="px-4 py-4">{item.currentQuantity}</td>
                        <td className="px-4 py-4">{item.unit}</td>
                        <td className="px-4 py-4">{LOW_STOCK_THRESHOLD}</td>
                        <td className="px-4 py-4">{formatCurrency(item.averageCost)}</td>
                        <td className="px-4 py-4">
                          {item.currentQuantity < LOW_STOCK_THRESHOLD ? (
                            <span className="inline-flex px-3 py-1 rounded-full bg-red-100 text-red-700 text-xs font-black">Sắp hết</span>
                          ) : (
                            <span className="inline-flex px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-black">Bình thường</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'report' && canViewRevenueReport && (
        <div className="space-y-4">
          <div className="bg-white rounded-3xl p-4 border border-slate-200 shadow-sm">
            <div className="flex flex-wrap gap-3 items-end justify-between">
              <div>
                <div className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <BarChart3 size={18} /> Báo cáo doanh thu ảnh thẻ
                </div>
                <div className="text-sm text-slate-500 mt-1">
                  Chỉ user admin hoặc role Giám đốc được quyền xem tab này.
                </div>
              </div>

              <div className="flex flex-col md:flex-row gap-3">
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Từ ngày</label>
                  <input
                    type="date"
                    value={reportFromDate}
                    onChange={(e) => setReportFromDate(e.target.value)}
                    className="px-4 py-3 rounded-2xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Đến ngày</label>
                  <input
                    type="date"
                    value={reportToDate}
                    onChange={(e) => setReportToDate(e.target.value)}
                    className="px-4 py-3 rounded-2xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <button
                  onClick={loadReport}
                  className="px-4 py-3 rounded-2xl bg-blue-600 text-white font-black text-sm flex items-center gap-2 h-fit"
                >
                  {reportLoading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />} Tải báo cáo
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-4">
            <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm">
              <div className="text-xs font-black uppercase tracking-widest text-slate-400">Tổng đơn</div>
              <div className="mt-2 text-2xl font-black text-slate-900">{reportSummary.totalOrders}</div>
            </div>
            <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm">
              <div className="text-xs font-black uppercase tracking-widest text-slate-400">Tổng giấy in</div>
              <div className="mt-2 text-2xl font-black text-slate-900">{reportSummary.totalPrintPaper}</div>
            </div>
            <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm">
              <div className="text-xs font-black uppercase tracking-widest text-slate-400">Tổng doanh thu</div>
              <div className="mt-2 text-2xl font-black text-slate-900">{formatCurrency(reportSummary.totalRevenue)}</div>
            </div>
            <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm">
              <div className="text-xs font-black uppercase tracking-widest text-slate-400">Giá trị TB đơn</div>
              <div className="mt-2 text-2xl font-black text-slate-900">{formatCurrency(reportSummary.averageOrderValue)}</div>
            </div>
            <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm">
              <div className="text-xs font-black uppercase tracking-widest text-slate-400">Tổng chi phí</div>
              <div className="mt-2 text-2xl font-black text-slate-900">{formatCurrency(reportSummary.totalCost)}</div>
            </div>
            <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm">
              <div className="text-xs font-black uppercase tracking-widest text-slate-400">Lợi nhuận gộp</div>
              <div className="mt-2 text-2xl font-black text-emerald-700">{formatCurrency(reportSummary.grossProfit)}</div>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-4 py-4 border-b border-slate-100 font-black text-slate-900">Tổng hợp doanh thu theo ngày</div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50">
                  <tr className="text-left text-slate-500 uppercase text-[11px] tracking-widest font-black">
                    <th className="px-4 py-4">Ngày</th>
                    <th className="px-4 py-4">Số đơn</th>
                    <th className="px-4 py-4">Số giấy in</th>
                    <th className="px-4 py-4">Tiền mặt</th>
                    <th className="px-4 py-4">Chuyển khoản</th>
                    <th className="px-4 py-4">Tổng doanh thu</th>
                    <th className="px-4 py-4">Giá trị TB</th>
                  </tr>
                </thead>
                <tbody>
                  {reportLoading ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-10 text-center text-slate-500 font-bold">
                        <span className="inline-flex items-center gap-2"><Loader2 size={16} className="animate-spin" /> Đang tải báo cáo...</span>
                      </td>
                    </tr>
                  ) : reportByDay.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-10 text-center text-slate-500 font-bold">
                        Không có dữ liệu trong khoảng ngày đã chọn.
                      </td>
                    </tr>
                  ) : (
                    reportByDay.map((row) => (
                      <tr key={row.reportDate} className="border-t border-slate-100">
                        <td className="px-4 py-4 whitespace-nowrap">{formatDateVN(row.reportDate)}</td>
                        <td className="px-4 py-4">{row.totalOrders}</td>
                        <td className="px-4 py-4">{row.totalPrintPaper}</td>
                        <td className="px-4 py-4">{formatCurrency(row.cashRevenue)}</td>
                        <td className="px-4 py-4">{formatCurrency(row.bankRevenue)}</td>
                        <td className="px-4 py-4 font-bold">{formatCurrency(row.totalRevenue)}</td>
                        <td className="px-4 py-4">{formatCurrency(row.averageOrderValue)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-4 py-4 border-b border-slate-100 font-black text-slate-900">Tổng hợp doanh thu theo tháng</div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50">
                  <tr className="text-left text-slate-500 uppercase text-[11px] tracking-widest font-black">
                    <th className="px-4 py-4">Tháng</th>
                    <th className="px-4 py-4">Số đơn</th>
                    <th className="px-4 py-4">Số giấy in</th>
                    <th className="px-4 py-4">Tiền mặt</th>
                    <th className="px-4 py-4">Chuyển khoản</th>
                    <th className="px-4 py-4">Tổng doanh thu</th>
                    <th className="px-4 py-4">Giá trị TB</th>
                  </tr>
                </thead>
                <tbody>
                  {reportLoading ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-10 text-center text-slate-500 font-bold">
                        <span className="inline-flex items-center gap-2"><Loader2 size={16} className="animate-spin" /> Đang tải báo cáo...</span>
                      </td>
                    </tr>
                  ) : reportByMonth.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-10 text-center text-slate-500 font-bold">
                        Không có dữ liệu theo tháng.
                      </td>
                    </tr>
                  ) : (
                    reportByMonth.map((row) => (
                      <tr key={row.reportMonth} className="border-t border-slate-100">
                        <td className="px-4 py-4 whitespace-nowrap">{row.reportMonth}</td>
                        <td className="px-4 py-4">{row.totalOrders}</td>
                        <td className="px-4 py-4">{row.totalPrintPaper}</td>
                        <td className="px-4 py-4">{formatCurrency(row.cashRevenue)}</td>
                        <td className="px-4 py-4">{formatCurrency(row.bankRevenue)}</td>
                        <td className="px-4 py-4 font-bold">{formatCurrency(row.totalRevenue)}</td>
                        <td className="px-4 py-4">{formatCurrency(row.averageOrderValue)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <ResponsiveModal open={createModalOpen} onClose={() => setCreateModalOpen(false)} size="lg">
        {renderOrderForm(handleCreateOrder, 'Tạo đơn ảnh thẻ')}
      </ResponsiveModal>

      <ResponsiveModal open={editModalOpen} onClose={() => setEditModalOpen(false)} size="lg">
        {renderOrderForm(handleUpdateOrder, 'Sửa đơn ảnh thẻ')}
      </ResponsiveModal>

      <ResponsiveModal open={stockInModalOpen} onClose={() => setStockInModalOpen(false)} size="md">
        <form onSubmit={handleStockIn} className="flex flex-col">
          <div className="px-6 py-5 border-b border-slate-200">
            <div className="text-xl font-black text-slate-900">Nhập kho giấy</div>
            <div className="text-sm text-slate-500 mt-1">Cộng tồn kho và cập nhật giá vốn trung bình.</div>
          </div>

          <div className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Kho giấy</label>
              <select
                value={stockInForm.paperInventoryId}
                onChange={(e) => setStockInForm((prev) => ({ ...prev, paperInventoryId: e.target.value }))}
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Chọn kho giấy</option>
                {inventory.map((item) => (
                  <option key={item.id} value={item.id}>{item.paperName}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Số lượng nhập</label>
                <input
                  type="number"
                  min="1"
                  value={stockInForm.quantity}
                  onChange={(e) => setStockInForm((prev) => ({ ...prev, quantity: e.target.value }))}
                  className="w-full px-4 py-3 rounded-2xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Đơn giá</label>
                <input
                  type="number"
                  min="0"
                  value={stockInForm.unitCost}
                  onChange={(e) => setStockInForm((prev) => ({ ...prev, unitCost: e.target.value }))}
                  className="w-full px-4 py-3 rounded-2xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Ghi chú</label>
              <textarea
                rows={4}
                value={stockInForm.note}
                onChange={(e) => setStockInForm((prev) => ({ ...prev, note: e.target.value }))}
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ghi chú nếu cần"
              />
            </div>
          </div>

          <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-3">
            <button type="button" onClick={() => setStockInModalOpen(false)} className="px-4 py-3 rounded-2xl bg-slate-100 text-slate-700 font-black text-sm">
              Đóng
            </button>
            <button type="submit" disabled={submittingStockIn} className="px-4 py-3 rounded-2xl bg-blue-600 text-white font-black text-sm inline-flex items-center gap-2">
              {submittingStockIn ? <Loader2 size={16} className="animate-spin" /> : <Package size={16} />} Lưu nhập kho
            </button>
          </div>
        </form>
      </ResponsiveModal>
    </div>
  );
}
