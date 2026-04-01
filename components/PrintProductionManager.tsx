import React, { useEffect, useMemo, useState } from 'react';
import {
  ClipboardList,
  BarChart3,
  Filter,
  Plus,
  Copy,
  Trash2,
  Printer,
  RefreshCw,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Pencil,
  X,
} from 'lucide-react';
import {
  createPrintOrder,
  duplicatePrintOrder,
  fetchPrintCatalogs,
  fetchPrintOrders,
  isConfigured,
  softDeletePrintOrder,
  supabase,
  updatePrintOrder,
} from '../apiService';
import { PrintCatalogOption, PrintOrder, Staff } from '../types';

interface Props {
  currentUser: Staff | null;
}

type SaveState = Record<string, boolean>;
type CatalogState = {
  sizes: PrintCatalogOption[];
  materials: PrintCatalogOption[];
  vendors: PrintCatalogOption[];
  statuses: PrintCatalogOption[];
};
type StaffOption = { id: string; name: string };
type EditFormState = {
  id: string;
  tenKhachHang: string;
  ngayGuiIn: string;
  soLuong: number;
  kichThuocId: string;
  chatLieuId: string;
  statusId: string;
  vendorId: string;
  nguoiKiemTraNhanAnh: string;
  ghiChu: string;
};

const emptyCatalogs: CatalogState = { sizes: [], materials: [], vendors: [], statuses: [] };
const formatNumber = (value: number) => value.toLocaleString('vi-VN');

const toNonNegativeNumber = (value: string | number) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return parsed;
};

const getDisplayQuantity = (row: PrintOrder) =>
  Number(row.soLuongAnhLon || 0) > 0 ? Number(row.soLuongAnhLon || 0) : Number(row.soLuongAnhNho || 0);

const getDisplaySizeId = (row: PrintOrder) => row.kichThuocAnhLonId || row.kichThuocAnhNhoId || '';
const getDisplayMaterialId = (row: PrintOrder) => row.chatLieuAnhLonId || row.chatLieuAnhNhoId || '';
const getDisplaySizeName = (row: PrintOrder) => row.kichThuocAnhLon || row.kichThuocAnhNho || '';
const getDisplayMaterialName = (row: PrintOrder) => row.chatLieuAnhLon || row.chatLieuAnhNho || '';

const createEditFormFromRow = (row: PrintOrder): EditFormState => ({
  id: row.id,
  tenKhachHang: row.tenKhachHang || '',
  ngayGuiIn: row.ngayGuiIn || '',
  soLuong: getDisplayQuantity(row),
  kichThuocId: getDisplaySizeId(row),
  chatLieuId: getDisplayMaterialId(row),
  statusId: row.statusId || '',
  vendorId: row.vendorId || '',
  nguoiKiemTraNhanAnh: row.nguoiKiemTraNhanAnh || '',
  ghiChu: row.ghiChu || '',
});

const PrintProductionManager: React.FC<Props> = ({ currentUser }) => {
  const [activeTab, setActiveTab] = useState<'list' | 'report'>('list');
  const [rows, setRows] = useState<PrintOrder[]>([]);
  const [catalogs, setCatalogs] = useState<CatalogState>(emptyCatalogs);
  const [staffOptions, setStaffOptions] = useState<StaffOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [savingMap, setSavingMap] = useState<SaveState>({});
  const [dateRange, setDateRange] = useState({ from: '2026-03-01', to: '2026-03-31' });
  const [editingRow, setEditingRow] = useState<PrintOrder | null>(null);
  const [editForm, setEditForm] = useState<EditFormState | null>(null);
  const [isSavingModal, setIsSavingModal] = useState(false);

  const isAdminOrDirector = useMemo(() => {
    if (!currentUser) return false;
    return currentUser.username === 'admin' || currentUser.role === 'Giám đốc';
  }, [currentUser]);

  const canDeleteRow = isAdminOrDirector;
  const canEditProtectedFields = isAdminOrDirector;

  const setRowSaving = (rowId: string, value: boolean) => {
    setSavingMap((prev) => ({ ...prev, [rowId]: value }));
  };

  const loadStaffOptions = async () => {
    if (!supabase) return [];
    const { data, error: staffError } = await supabase
      .from('staff')
      .select('id, name, status')
      .order('name', { ascending: true });

    if (staffError) {
      console.error('Load staff error:', staffError);
      return [];
    }

    return (data || [])
      .filter((item: any) => !item.status || item.status === 'Active')
      .map((item: any) => ({ id: item.id, name: item.name || item.id }));
  };

  const loadData = async () => {
    if (!isConfigured) {
      setError('Chưa cấu hình Supabase. Vui lòng kiểm tra VITE_SUPABASE_URL và VITE_SUPABASE_ANON_KEY.');
      setRows([]);
      setCatalogs(emptyCatalogs);
      setStaffOptions([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const [orders, catalogData, staffData] = await Promise.all([
        fetchPrintOrders(),
        fetchPrintCatalogs(),
        loadStaffOptions(),
      ]);

      setRows(orders);
      setCatalogs(catalogData);
      setStaffOptions(staffData);
    } catch (e: any) {
      console.error('Load print production data error:', e);
      setError(e?.message || 'Không tải được dữ liệu in ấn.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  useEffect(() => {
    if (!isConfigured || !supabase) return;

    const channel = supabase
      .channel('print-orders-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'print_orders' }, () => {
        void loadData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (!successMessage) return;
    const timer = window.setTimeout(() => setSuccessMessage(null), 2500);
    return () => window.clearTimeout(timer);
  }, [successMessage]);

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      if (dateRange.from && row.ngayGuiIn < dateRange.from) return false;
      if (dateRange.to && row.ngayGuiIn > dateRange.to) return false;
      return true;
    });
  }, [rows, dateRange]);

  const totalQuantity = useMemo(
    () => filteredRows.reduce((sum, row) => sum + getDisplayQuantity(row), 0),
    [filteredRows]
  );

  const totalOrders = filteredRows.length;

  const reportByVendor = useMemo(() => {
    const map = new Map<string, number>();
    filteredRows.forEach((row) => {
      const key = row.tenXuongIn || 'Chưa chọn xưởng';
      map.set(key, (map.get(key) || 0) + getDisplayQuantity(row));
    });
    return Array.from(map.entries()).map(([name, total]) => ({ name, total }));
  }, [filteredRows]);

  const openEditModal = (row: PrintOrder) => {
    setEditingRow(row);
    setEditForm(createEditFormFromRow(row));
  };

  const closeEditModal = () => {
    setEditingRow(null);
    setEditForm(null);
    setIsSavingModal(false);
  };

  const addNewRow = async () => {
    setIsAdding(true);
    setError(null);
    try {
      const defaultStatusId = catalogs.statuses.find((item) => item.name === 'ĐANG IN ẤN')?.id || null;
      await createPrintOrder({
        tenKhachHang: 'Khách mới',
        ngayGuiIn: new Date().toISOString().slice(0, 10),
        statusId: defaultStatusId,
      });
      setSuccessMessage('Đã tạo dòng in ấn mới.');
      await loadData();
    } catch (e: any) {
      console.error('Create print order error:', e);
      setError(e?.message || 'Không tạo được dòng in ấn mới.');
    } finally {
      setIsAdding(false);
    }
  };

  const handleDuplicateRow = async (row: PrintOrder) => {
    setRowSaving(row.id, true);
    setError(null);
    try {
      await duplicatePrintOrder(row);
      setSuccessMessage('Đã nhân bản dòng in ấn.');
      await loadData();
    } catch (e: any) {
      console.error('Duplicate print order error:', e);
      setError(e?.message || 'Không nhân bản được dòng in ấn.');
    } finally {
      setRowSaving(row.id, false);
    }
  };

  const handleDeleteRow = async (row: PrintOrder) => {
    if (!canDeleteRow) return;
    const confirmed = window.confirm(`Bạn có chắc muốn ẩn đơn in của "${row.tenKhachHang}"?`);
    if (!confirmed) return;
    setRowSaving(row.id, true);
    setError(null);
    try {
      await softDeletePrintOrder(row.id);
      setSuccessMessage('Đã xóa mềm dòng in ấn.');
      await loadData();
    } catch (e: any) {
      console.error('Delete print order error:', e);
      setError(e?.message || 'Không xóa được dòng in ấn.');
    } finally {
      setRowSaving(row.id, false);
    }
  };

  const handleSaveModal = async () => {
    if (!editingRow || !editForm) return;
    setIsSavingModal(true);
    setError(null);

    try {
      const payload: Record<string, any> = {
        so_luong_anh_lon: toNonNegativeNumber(editForm.soLuong),
        so_luong_anh_nho: 0,
        kich_thuoc_anh_lon_id: editForm.kichThuocId || null,
        chat_lieu_anh_lon_id: editForm.chatLieuId || null,
        kich_thuoc_anh_nho_id: null,
        chat_lieu_anh_nho_id: null,
        status_id: editForm.statusId || null,
        vendor_id: editForm.vendorId || null,
        nguoi_kiem_tra_nhan_anh: editForm.nguoiKiemTraNhanAnh || null,
        ghi_chu: editForm.ghiChu || null,
      };

      if (canEditProtectedFields) {
        payload.ten_khach_hang = editForm.tenKhachHang;
        payload.ngay_gui_in = editForm.ngayGuiIn || null;
      }

      await updatePrintOrder(editingRow.id, payload);
      setSuccessMessage('Đã cập nhật dòng in ấn.');
      closeEditModal();
      await loadData();
    } catch (e: any) {
      console.error('Update print order error:', e);
      setError(e?.message || 'Không cập nhật được dòng in ấn.');
    } finally {
      setIsSavingModal(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-sm">
              <Printer size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Module Báo Cáo In Ấn</h1>
              <p className="mt-1 text-sm text-gray-500">
                Danh sách vận hành chỉ hiển thị các cột cần thiết. Chỉnh sửa dữ liệu bằng modal để tránh lỗi mất giá trị dropdown.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={() => setActiveTab('list')} className={`rounded-xl px-4 py-2 text-sm font-medium ${activeTab === 'list' ? 'bg-blue-600 text-white' : 'border border-gray-300 bg-white text-gray-700'}`}>
              Danh sách in ấn
            </button>
            <button type="button" onClick={() => setActiveTab('report')} className={`rounded-xl px-4 py-2 text-sm font-medium ${activeTab === 'report' ? 'bg-blue-600 text-white' : 'border border-gray-300 bg-white text-gray-700'}`}>
              Báo cáo in ấn
            </button>
          </div>
        </div>
      </div>

      {error && <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"><AlertCircle size={18} className="mt-0.5 shrink-0" /><div>{error}</div></div>}
      {successMessage && <div className="flex items-start gap-3 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-700"><CheckCircle2 size={18} className="mt-0.5 shrink-0" /><div>{successMessage}</div></div>}

      {activeTab === 'list' && (
        <>
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-2">
                <ClipboardList size={18} className="text-gray-500" />
                <h2 className="text-base font-semibold text-gray-800">Danh sách vận hành in ấn</h2>
              </div>
              <div className="flex flex-wrap gap-3">
                <button type="button" onClick={() => void addNewRow()} disabled={isAdding || isLoading || !isConfigured} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60">
                  {isAdding ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                  Thêm dòng mới
                </button>
                <button type="button" onClick={() => void loadData()} disabled={isLoading} className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 disabled:cursor-not-allowed disabled:opacity-60">
                  <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
                  Làm mới
                </button>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
            <table className="min-w-[1250px] w-full">
              <thead className="bg-amber-200">
                <tr className="text-sm font-semibold text-gray-900">
                  <th className="px-3 py-3 text-left">Tên Khách Hàng</th>
                  <th className="px-3 py-3 text-left">Ngày gửi in</th>
                  <th className="px-3 py-3 text-left">Số Lượng</th>
                  <th className="px-3 py-3 text-left">Kích Thước</th>
                  <th className="px-3 py-3 text-left">Chất Liệu</th>
                  <th className="px-3 py-3 text-left">TÌNH TRẠNG</th>
                  <th className="px-3 py-3 text-left">XƯỞNG IN</th>
                  <th className="px-3 py-3 text-left">NGƯỜI KIỂM TRA NHẬN ẢNH</th>
                  <th className="px-3 py-3 text-left">GHI CHÚ</th>
                  <th className="px-3 py-3 text-left">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {isLoading && (
                  <tr>
                    <td colSpan={10} className="px-6 py-14">
                      <div className="flex items-center justify-center gap-3 text-sm text-gray-500">
                        <Loader2 size={18} className="animate-spin" />
                        Đang tải dữ liệu từ Supabase...
                      </div>
                    </td>
                  </tr>
                )}

                {!isLoading && filteredRows.map((row) => {
                  const isSavingRow = !!savingMap[row.id];
                  return (
                    <tr key={row.id} className="cursor-pointer border-t border-gray-100 hover:bg-gray-50" onClick={() => openEditModal(row)}>
                      <td className="min-w-[220px] px-3 py-3 text-sm text-gray-900">{row.tenKhachHang}</td>
                      <td className="min-w-[150px] px-3 py-3 text-sm text-gray-700">{row.ngayGuiIn}</td>
                      <td className="min-w-[110px] px-3 py-3 text-sm text-gray-700">{getDisplayQuantity(row)}</td>
                      <td className="min-w-[140px] px-3 py-3 text-sm text-gray-700">{getDisplaySizeName(row)}</td>
                      <td className="min-w-[140px] px-3 py-3 text-sm text-gray-700">{getDisplayMaterialName(row)}</td>
                      <td className="min-w-[150px] px-3 py-3 text-sm text-gray-700">{row.tenTrangThai || ''}</td>
                      <td className="min-w-[150px] px-3 py-3 text-sm text-gray-700">{row.tenXuongIn || ''}</td>
                      <td className="min-w-[180px] px-3 py-3 text-sm text-gray-700">{row.nguoiKiemTraNhanAnh || ''}</td>
                      <td className="min-w-[220px] px-3 py-3 text-sm text-gray-700">{row.ghiChu || ''}</td>
                      <td className="min-w-[130px] px-3 py-3" onClick={(event) => event.stopPropagation()}>
                        <div className="flex items-center gap-2">
                          {isSavingRow && <Loader2 size={15} className="animate-spin text-blue-600" />}
                          <button type="button" onClick={() => openEditModal(row)} className="rounded-lg border border-gray-300 p-2 text-gray-700" title="Sửa" disabled={isSavingRow}>
                            <Pencil size={15} />
                          </button>
                          <button type="button" onClick={() => void handleDuplicateRow(row)} className="rounded-lg border border-gray-300 p-2 text-gray-700" title="Nhân bản" disabled={isSavingRow}>
                            <Copy size={15} />
                          </button>
                          {canDeleteRow && (
                            <button type="button" onClick={() => void handleDeleteRow(row)} className="rounded-lg border border-red-200 p-2 text-red-600" title="Xóa" disabled={isSavingRow}>
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {!isLoading && filteredRows.length === 0 && (
                  <tr>
                    <td colSpan={10} className="px-6 py-12 text-center text-sm text-gray-500">
                      Chưa có dữ liệu in ấn trong Supabase.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {activeTab === 'report' && (
        <>
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <Filter size={18} className="text-gray-500" />
              <h2 className="text-base font-semibold text-gray-800">Bộ lọc báo cáo</h2>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Từ ngày</label>
                <input type="date" value={dateRange.from} onChange={(e) => setDateRange((prev) => ({ ...prev, from: e.target.value }))} className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm" />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Đến ngày</label>
                <input type="date" value={dateRange.to} onChange={(e) => setDateRange((prev) => ({ ...prev, to: e.target.value }))} className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm" />
              </div>
              <div className="flex items-end">
                <button type="button" onClick={() => void loadData()} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white">
                  <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
                  Tải báo cáo
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="text-sm text-gray-500">Tổng đơn in</div>
              <div className="mt-2 text-3xl font-bold text-gray-900">{totalOrders}</div>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="text-sm text-gray-500">Tổng số lượng</div>
              <div className="mt-2 text-3xl font-bold text-gray-900">{formatNumber(totalQuantity)}</div>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="text-sm text-gray-500">Tổng xưởng in</div>
              <div className="mt-2 text-3xl font-bold text-gray-900">{reportByVendor.length}</div>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <BarChart3 size={18} className="text-gray-500" />
              <h2 className="text-base font-semibold text-gray-800">Tổng hợp theo xưởng in</h2>
            </div>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              {reportByVendor.map((item) => (
                <div key={item.name} className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                  <div className="text-sm font-semibold text-gray-800">{item.name}</div>
                  <div className="mt-2 text-2xl font-bold text-gray-900">{formatNumber(item.total)}</div>
                  <div className="mt-1 text-sm text-gray-500">tổng số lượng đang vận hành</div>
                </div>
              ))}
              {reportByVendor.length === 0 && (
                <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-500">
                  Chưa có dữ liệu theo khoảng ngày đã chọn.
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {editingRow && editForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-xl">
            <div className="sticky top-0 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Chỉnh sửa dòng in ấn</h3>
                <p className="text-sm text-gray-500">Sửa dữ liệu trong modal để tránh lỗi mất giá trị dropdown.</p>
              </div>
              <button type="button" onClick={closeEditModal} className="rounded-lg border border-gray-300 p-2 text-gray-600">
                <X size={16} />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 px-6 py-6 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Tên Khách Hàng</label>
                <input
                  value={editForm.tenKhachHang}
                  onChange={(e) => setEditForm((prev) => (prev ? { ...prev, tenKhachHang: e.target.value } : prev))}
                  className={`w-full rounded-xl border px-4 py-2.5 text-sm ${canEditProtectedFields ? 'border-gray-300' : 'border-gray-200 bg-gray-100 text-gray-500'}`}
                  disabled={!canEditProtectedFields}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Ngày gửi in</label>
                <input
                  type="date"
                  value={editForm.ngayGuiIn}
                  onChange={(e) => setEditForm((prev) => (prev ? { ...prev, ngayGuiIn: e.target.value } : prev))}
                  className={`w-full rounded-xl border px-4 py-2.5 text-sm ${canEditProtectedFields ? 'border-gray-300' : 'border-gray-200 bg-gray-100 text-gray-500'}`}
                  disabled={!canEditProtectedFields}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Số Lượng</label>
                <input type="number" min={0} value={editForm.soLuong} onChange={(e) => setEditForm((prev) => (prev ? { ...prev, soLuong: toNonNegativeNumber(e.target.value) } : prev))} className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm" />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Kích Thước</label>
                <select value={editForm.kichThuocId} onChange={(e) => setEditForm((prev) => (prev ? { ...prev, kichThuocId: e.target.value } : prev))} className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm">
                  <option value="">Chọn</option>
                  {catalogs.sizes.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Chất Liệu</label>
                <select value={editForm.chatLieuId} onChange={(e) => setEditForm((prev) => (prev ? { ...prev, chatLieuId: e.target.value } : prev))} className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm">
                  <option value="">Chọn</option>
                  {catalogs.materials.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">TÌNH TRẠNG</label>
                <select value={editForm.statusId} onChange={(e) => setEditForm((prev) => (prev ? { ...prev, statusId: e.target.value } : prev))} className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm">
                  <option value="">Chọn</option>
                  {catalogs.statuses.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">XƯỞNG IN</label>
                <select value={editForm.vendorId} onChange={(e) => setEditForm((prev) => (prev ? { ...prev, vendorId: e.target.value } : prev))} className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm">
                  <option value="">Chọn</option>
                  {catalogs.vendors.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">NGƯỜI KIỂM TRA NHẬN ẢNH</label>
                <select value={editForm.nguoiKiemTraNhanAnh} onChange={(e) => setEditForm((prev) => (prev ? { ...prev, nguoiKiemTraNhanAnh: e.target.value } : prev))} className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm">
                  <option value="">Chọn</option>
                  {staffOptions.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium text-gray-700">GHI CHÚ</label>
                <textarea value={editForm.ghiChu} onChange={(e) => setEditForm((prev) => (prev ? { ...prev, ghiChu: e.target.value } : prev))} rows={4} className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm" />
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-gray-200 px-6 py-4">
              <div className="text-xs text-gray-500">
                {!canEditProtectedFields ? 'User thường chỉ được sửa các trường vận hành. Tên khách hàng và ngày gửi in chỉ Admin/Giám đốc được sửa.' : 'Admin/Giám đốc được sửa toàn bộ trường.'}
              </div>
              <div className="flex items-center gap-3">
                <button type="button" onClick={closeEditModal} className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700" disabled={isSavingModal}>
                  Hủy
                </button>
                <button type="button" onClick={() => void handleSaveModal()} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60" disabled={isSavingModal}>
                  {isSavingModal && <Loader2 size={16} className="animate-spin" />}
                  Lưu thay đổi
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PrintProductionManager;
