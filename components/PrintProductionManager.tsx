import React, { useEffect, useMemo, useState } from 'react';
import {
  ClipboardList,
  BarChart3,
  Filter,
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
  fetchPrintCatalogs,
  fetchPrintOrderItems,
  isConfigured,
  supabase,
  updatePrintOrder,
} from '../apiService';
import { PrintCatalogOption, PrintOrderItemRow, Staff } from '../types';

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
  printOrderId: string;
  tenKhachHang: string;
  ngayGuiIn: string;
  soLuong: number;
  kichThuocId: string;
  chatLieuId: string;
  statusId: string;
  vendorId: string;
  nguoiKiemTraNhanAnh: string;
  ghiChuItem: string;
  ghiChuDon: string;
  donGiaIn: number;
};

const emptyCatalogs: CatalogState = { sizes: [], materials: [], vendors: [], statuses: [] };
const formatNumber = (value: number) => value.toLocaleString('vi-VN');

const toNonNegativeNumber = (value: string | number) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return parsed;
};

const createEditFormFromRow = (row: PrintOrderItemRow): EditFormState => ({
  id: row.id,
  printOrderId: row.printOrderId,
  tenKhachHang: row.tenKhachHang || '',
  ngayGuiIn: row.ngayGuiIn || '',
  soLuong: Number(row.soLuong || 0),
  kichThuocId: row.sizeId || '',
  chatLieuId: row.materialId || '',
  statusId: row.statusId || '',
  vendorId: row.vendorId || '',
  nguoiKiemTraNhanAnh: row.nguoiKiemTraNhanAnh || '',
  ghiChuItem: row.ghiChuItem || '',
  ghiChuDon: row.ghiChuDon || '',
  donGiaIn: Number(row.donGiaIn || 0),
});

const PrintProductionManager: React.FC<Props> = ({ currentUser }) => {
  const [activeTab, setActiveTab] = useState<'list' | 'report'>('list');
  const [rows, setRows] = useState<PrintOrderItemRow[]>([]);
  const [catalogs, setCatalogs] = useState<CatalogState>(emptyCatalogs);
  const [staffOptions, setStaffOptions] = useState<StaffOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [savingMap, setSavingMap] = useState<SaveState>({});
  const [dateRange, setDateRange] = useState({ from: '2026-03-01', to: '2026-03-31' });
  const [editingRow, setEditingRow] = useState<PrintOrderItemRow | null>(null);
  const [editForm, setEditForm] = useState<EditFormState | null>(null);
  const [isSavingModal, setIsSavingModal] = useState(false);

  const isAdminOrDirector = useMemo(() => {
    if (!currentUser) return false;
    return currentUser.username === 'admin' || currentUser.role === 'Giám đốc';
  }, [currentUser]);

  const canDeleteRow = isAdminOrDirector;
  const canEditProtectedFields = isAdminOrDirector;
  const canDuplicateRow = isAdminOrDirector;

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
      const [items, catalogData, staffData] = await Promise.all([
        fetchPrintOrderItems({
          dateFrom: dateRange.from || null,
          dateTo: dateRange.to || null,
        }),
        fetchPrintCatalogs(),
        loadStaffOptions(),
      ]);

      setRows(items);
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

    const channelOrders = supabase
      .channel('print-orders-realtime-v2')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'print_orders' }, () => {
        void loadData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'print_order_items' }, () => {
        void loadData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channelOrders);
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
    () => filteredRows.reduce((sum, row) => sum + Number(row.soLuong || 0), 0),
    [filteredRows]
  );

  const totalOrders = useMemo(
    () => new Set(filteredRows.map((row) => row.printOrderId)).size,
    [filteredRows]
  );

  const totalItems = filteredRows.length;

  const totalAmount = useMemo(
    () => filteredRows.reduce((sum, row) => sum + Number(row.thanhTien || 0), 0),
    [filteredRows]
  );

  const reportByVendor = useMemo(() => {
    const map = new Map<string, { totalQuantity: number; totalAmount: number }>();
    filteredRows.forEach((row) => {
      const key = row.tenXuongIn || 'Chưa chọn xưởng';
      const current = map.get(key) || { totalQuantity: 0, totalAmount: 0 };
      current.totalQuantity += Number(row.soLuong || 0);
      current.totalAmount += Number(row.thanhTien || 0);
      map.set(key, current);
    });
    return Array.from(map.entries()).map(([name, value]) => ({
      name,
      totalQuantity: value.totalQuantity,
      totalAmount: value.totalAmount,
    }));
  }, [filteredRows]);

  const openEditModal = (row: PrintOrderItemRow) => {
    setEditingRow(row);
    setEditForm(createEditFormFromRow(row));
  };

  const closeEditModal = () => {
    setEditingRow(null);
    setEditForm(null);
    setIsSavingModal(false);
  };

  const handleDuplicateRow = async (row: PrintOrderItemRow) => {
    if (!canDuplicateRow || !supabase) return;

    setRowSaving(row.id, true);
    setError(null);

    try {
      const { error: duplicateError } = await supabase.from('print_order_items').insert({
        print_order_id: row.printOrderId,
        so_luong: Number(row.soLuong || 0),
        size_id: row.sizeId || null,
        material_id: row.materialId || null,
        vendor_id: row.vendorId || null,
        don_gia_in: Number(row.donGiaIn || 0),
        ghi_chu: row.ghiChuItem || null,
        thu_tu_hien_thi: Number(row.thuTuHienThi || 0) + 1,
        dang_su_dung: true,
      });

      if (duplicateError) throw duplicateError;

      setSuccessMessage('Đã nhân bản dòng sản phẩm in.');
      await loadData();
    } catch (e: any) {
      console.error('Duplicate print item error:', e);
      setError(e?.message || 'Không nhân bản được dòng sản phẩm in.');
    } finally {
      setRowSaving(row.id, false);
    }
  };

  const handleDeleteRow = async (row: PrintOrderItemRow) => {
    if (!canDeleteRow || !supabase) return;

    const confirmed = window.confirm(`Bạn có chắc muốn ẩn dòng in của "${row.tenKhachHang}" không?`);
    if (!confirmed) return;

    setRowSaving(row.id, true);
    setError(null);

    try {
      const { error: deleteError } = await supabase
        .from('print_order_items')
        .update({ dang_su_dung: false })
        .eq('id', row.id);

      if (deleteError) throw deleteError;

      setSuccessMessage('Đã xóa mềm dòng sản phẩm in.');
      await loadData();
    } catch (e: any) {
      console.error('Delete print item error:', e);
      setError(e?.message || 'Không xóa được dòng sản phẩm in.');
    } finally {
      setRowSaving(row.id, false);
    }
  };

  const handleSaveModal = async () => {
    if (!editingRow || !editForm || !supabase) return;

    setIsSavingModal(true);
    setError(null);

    try {
      const orderPayload: Record<string, any> = {
        status_id: editForm.statusId || null,
        nguoi_kiem_tra_nhan_anh: editForm.nguoiKiemTraNhanAnh || null,
        ghi_chu: editForm.ghiChuDon || null,
      };

      if (canEditProtectedFields) {
        orderPayload.ten_khach_hang = editForm.tenKhachHang;
        orderPayload.ngay_gui_in = editForm.ngayGuiIn || null;
      }

      await updatePrintOrder(editForm.printOrderId, orderPayload);

      const { error: itemUpdateError } = await supabase
        .from('print_order_items')
        .update({
          so_luong: toNonNegativeNumber(editForm.soLuong),
          size_id: editForm.kichThuocId || null,
          material_id: editForm.chatLieuId || null,
          vendor_id: editForm.vendorId || null,
          don_gia_in: toNonNegativeNumber(editForm.donGiaIn),
          ghi_chu: editForm.ghiChuItem || null,
        })
        .eq('id', editForm.id);

      if (itemUpdateError) throw itemUpdateError;

      setSuccessMessage('Đã cập nhật dòng in ấn.');
      closeEditModal();
      await loadData();
    } catch (e: any) {
      console.error('Update print order item error:', e);
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
                Danh sách vận hành đang đọc theo mô hình mới: 1 đơn in tổng + nhiều dòng sản phẩm in.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setActiveTab('list')}
              className={`rounded-xl px-4 py-2 text-sm font-medium ${activeTab === 'list' ? 'bg-blue-600 text-white' : 'border border-gray-300 bg-white text-gray-700'}`}
            >
              Danh sách in ấn
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('report')}
              className={`rounded-xl px-4 py-2 text-sm font-medium ${activeTab === 'report' ? 'bg-blue-600 text-white' : 'border border-gray-300 bg-white text-gray-700'}`}
            >
              Báo cáo in ấn
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <div>{error}</div>
        </div>
      )}

      {successMessage && (
        <div className="flex items-start gap-3 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
          <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
          <div>{successMessage}</div>
        </div>
      )}

      {activeTab === 'list' && (
        <>
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-2">
                <ClipboardList size={18} className="text-gray-500" />
                <h2 className="text-base font-semibold text-gray-800">Danh sách vận hành in ấn theo từng dòng sản phẩm</h2>
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => void loadData()}
                  disabled={isLoading}
                  className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
                  Làm mới
                </button>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
            <table className="min-w-[1450px] w-full">
              <thead className="bg-amber-200">
                <tr className="text-sm font-semibold text-gray-900">
                  <th className="px-3 py-3 text-left">Tên Khách Hàng</th>
                  <th className="px-3 py-3 text-left">Mã HĐ</th>
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
                    <td colSpan={11} className="px-6 py-14">
                      <div className="flex items-center justify-center gap-3 text-sm text-gray-500">
                        <Loader2 size={18} className="animate-spin" />
                        Đang tải dữ liệu item in ấn từ Supabase...
                      </div>
                    </td>
                  </tr>
                )}

                {!isLoading && filteredRows.map((row) => {
                  const isSavingRow = !!savingMap[row.id];
                  const displayNote = row.ghiChuItem || row.ghiChuDon || '';

                  return (
                    <tr key={row.id} className="cursor-pointer border-t border-gray-100 hover:bg-gray-50" onClick={() => openEditModal(row)}>
                      <td className="min-w-[220px] px-3 py-3 text-sm text-gray-900">{row.tenKhachHang}</td>
                      <td className="min-w-[120px] px-3 py-3 text-sm text-gray-700">{row.contractCode || ''}</td>
                      <td className="min-w-[150px] px-3 py-3 text-sm text-gray-700">{row.ngayGuiIn}</td>
                      <td className="min-w-[110px] px-3 py-3 text-sm text-gray-700">{row.soLuong}</td>
                      <td className="min-w-[140px] px-3 py-3 text-sm text-gray-700">{row.tenKichThuoc || ''}</td>
                      <td className="min-w-[140px] px-3 py-3 text-sm text-gray-700">{row.tenChatLieu || ''}</td>
                      <td className="min-w-[150px] px-3 py-3 text-sm text-gray-700">{row.tenTrangThai || ''}</td>
                      <td className="min-w-[150px] px-3 py-3 text-sm text-gray-700">{row.tenXuongIn || ''}</td>
                      <td className="min-w-[180px] px-3 py-3 text-sm text-gray-700">{row.tenNguoiKiemTraNhanAnh || row.nguoiKiemTraNhanAnh || ''}</td>
                      <td className="min-w-[220px] px-3 py-3 text-sm text-gray-700">{displayNote}</td>
                      <td className="min-w-[130px] px-3 py-3" onClick={(event) => event.stopPropagation()}>
                        <div className="flex items-center gap-2">
                          {isSavingRow && <Loader2 size={15} className="animate-spin text-blue-600" />}
                          <button type="button" onClick={() => openEditModal(row)} className="rounded-lg border border-gray-300 p-2 text-gray-700" title="Sửa" disabled={isSavingRow}>
                            <Pencil size={15} />
                          </button>
                          {canDuplicateRow && (
                            <button type="button" onClick={() => void handleDuplicateRow(row)} className="rounded-lg border border-gray-300 p-2 text-gray-700" title="Nhân bản" disabled={isSavingRow}>
                              <Copy size={15} />
                            </button>
                          )}
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
                    <td colSpan={11} className="px-6 py-12 text-center text-sm text-gray-500">
                      Chưa có dữ liệu item in ấn trong Supabase.
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
                <input
                  type="date"
                  value={dateRange.from}
                  onChange={(e) => setDateRange((prev) => ({ ...prev, from: e.target.value }))}
                  className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Đến ngày</label>
                <input
                  type="date"
                  value={dateRange.to}
                  onChange={(e) => setDateRange((prev) => ({ ...prev, to: e.target.value }))}
                  className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm"
                />
              </div>
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={() => void loadData()}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white"
                >
                  <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
                  Tải báo cáo
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="text-sm text-gray-500">Tổng đơn in</div>
              <div className="mt-2 text-3xl font-bold text-gray-900">{totalOrders}</div>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="text-sm text-gray-500">Tổng dòng sản phẩm</div>
              <div className="mt-2 text-3xl font-bold text-gray-900">{totalItems}</div>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="text-sm text-gray-500">Tổng số lượng</div>
              <div className="mt-2 text-3xl font-bold text-gray-900">{formatNumber(totalQuantity)}</div>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="text-sm text-gray-500">Tổng chi phí in</div>
              <div className="mt-2 text-3xl font-bold text-gray-900">{formatNumber(totalAmount)}</div>
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
                  <div className="mt-2 text-2xl font-bold text-gray-900">{formatNumber(item.totalQuantity)}</div>
                  <div className="mt-1 text-sm text-gray-500">tổng số lượng đang vận hành</div>
                  <div className="mt-3 text-sm font-medium text-gray-700">Chi phí: {formatNumber(item.totalAmount)}</div>
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
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white shadow-xl">
            <div className="sticky top-0 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Chỉnh sửa dòng in ấn</h3>
                <p className="text-sm text-gray-500">Đang chỉnh theo mô hình item: header đơn in + dòng sản phẩm in.</p>
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
                <input
                  type="number"
                  min={0}
                  value={editForm.soLuong}
                  onChange={(e) => setEditForm((prev) => (prev ? { ...prev, soLuong: toNonNegativeNumber(e.target.value) } : prev))}
                  className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Kích Thước</label>
                <select
                  value={editForm.kichThuocId}
                  onChange={(e) => setEditForm((prev) => (prev ? { ...prev, kichThuocId: e.target.value } : prev))}
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm"
                >
                  <option value="">Chọn</option>
                  {catalogs.sizes.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Chất Liệu</label>
                <select
                  value={editForm.chatLieuId}
                  onChange={(e) => setEditForm((prev) => (prev ? { ...prev, chatLieuId: e.target.value } : prev))}
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm"
                >
                  <option value="">Chọn</option>
                  {catalogs.materials.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">TÌNH TRẠNG</label>
                <select
                  value={editForm.statusId}
                  onChange={(e) => setEditForm((prev) => (prev ? { ...prev, statusId: e.target.value } : prev))}
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm"
                >
                  <option value="">Chọn</option>
                  {catalogs.statuses.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">XƯỞNG IN</label>
                <select
                  value={editForm.vendorId}
                  onChange={(e) => setEditForm((prev) => (prev ? { ...prev, vendorId: e.target.value } : prev))}
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm"
                >
                  <option value="">Chọn</option>
                  {catalogs.vendors.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">NGƯỜI KIỂM TRA NHẬN ẢNH</label>
                <select
                  value={editForm.nguoiKiemTraNhanAnh}
                  onChange={(e) => setEditForm((prev) => (prev ? { ...prev, nguoiKiemTraNhanAnh: e.target.value } : prev))}
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm"
                >
                  <option value="">Chọn</option>
                  {staffOptions.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Đơn giá in</label>
                <input
                  type="number"
                  min={0}
                  value={editForm.donGiaIn}
                  onChange={(e) => setEditForm((prev) => (prev ? { ...prev, donGiaIn: toNonNegativeNumber(e.target.value) } : prev))}
                  className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm"
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium text-gray-700">GHI CHÚ DÒNG IN</label>
                <textarea
                  value={editForm.ghiChuItem}
                  onChange={(e) => setEditForm((prev) => (prev ? { ...prev, ghiChuItem: e.target.value } : prev))}
                  rows={3}
                  className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm"
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium text-gray-700">GHI CHÚ ĐƠN IN</label>
                <textarea
                  value={editForm.ghiChuDon}
                  onChange={(e) => setEditForm((prev) => (prev ? { ...prev, ghiChuDon: e.target.value } : prev))}
                  rows={3}
                  className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm"
                />
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-gray-200 px-6 py-4">
              <div className="text-xs text-gray-500">
                {!canEditProtectedFields
                  ? 'User thường chỉ được sửa các trường vận hành. Tên khách hàng và ngày gửi in chỉ Admin/Giám đốc được sửa.'
                  : 'Admin/Giám đốc được sửa toàn bộ trường.'}
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
