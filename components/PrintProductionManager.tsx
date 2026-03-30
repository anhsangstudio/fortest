
import React, { useEffect, useMemo, useState } from 'react';
import {
  ClipboardList,
  BarChart3,
  Filter,
  Plus,
  Copy,
  Trash2,
  Printer,
  Image as ImageIcon,
  Link as LinkIcon,
  RefreshCw,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import {
  createPrintOrder,
  duplicatePrintOrder,
  fetchPrintCatalogs,
  fetchPrintOrders,
  isConfigured,
  softDeletePrintOrder,
  updatePrintOrder,
} from '../apiService';
import { PrintCatalogOption, PrintOrder } from '../types';

type SaveState = Record<string, boolean>;

type CatalogState = {
  sizes: PrintCatalogOption[];
  materials: PrintCatalogOption[];
  vendors: PrintCatalogOption[];
  statuses: PrintCatalogOption[];
};

const emptyCatalogs: CatalogState = {
  sizes: [],
  materials: [],
  vendors: [],
  statuses: [],
};

const formatDate = (value?: string) => {
  if (!value) return '--';
  const parts = value.split('-');
  if (parts.length !== 3) return value;
  return `${parts[2]}-${parts[1]}-${parts[0]}`;
};

const formatNumber = (value: number) => {
  return value.toLocaleString('vi-VN');
};

const formatMoney = (value: number) => {
  return value.toLocaleString('vi-VN');
};

const toNonNegativeNumber = (value: string | number) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return parsed;
};

const updateRowInList = (rows: PrintOrder[], nextRow: PrintOrder) => {
  return rows.map((row) => (row.id === nextRow.id ? nextRow : row));
};

const PrintProductionManager: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'list' | 'report'>('list');
  const [rows, setRows] = useState<PrintOrder[]>([]);
  const [catalogs, setCatalogs] = useState<CatalogState>(emptyCatalogs);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [savingMap, setSavingMap] = useState<SaveState>({});
  const [dateRange, setDateRange] = useState({
    from: '2026-03-01',
    to: '2026-03-31',
  });

  const setRowSaving = (rowId: string, value: boolean) => {
    setSavingMap((prev) => ({ ...prev, [rowId]: value }));
  };

  const loadData = async () => {
    if (!isConfigured) {
      setError('Chưa cấu hình Supabase. Vui lòng kiểm tra VITE_SUPABASE_URL và VITE_SUPABASE_ANON_KEY.');
      setRows([]);
      setCatalogs(emptyCatalogs);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const [orders, catalogData] = await Promise.all([
        fetchPrintOrders(),
        fetchPrintCatalogs(),
      ]);

      setRows(orders);
      setCatalogs(catalogData);
    } catch (e: any) {
      console.error('Load print production data error:', e);
      setError(e?.message || 'Không tải được dữ liệu in ấn.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
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

  const totalLargePhotos = useMemo(
    () => filteredRows.reduce((sum, row) => sum + Number(row.soLuongAnhLon || 0), 0),
    [filteredRows]
  );

  const totalSmallPhotos = useMemo(
    () => filteredRows.reduce((sum, row) => sum + Number(row.soLuongAnhNho || 0), 0),
    [filteredRows]
  );

  const totalOrders = filteredRows.length;

  const reportByVendor = useMemo(() => {
    const map = new Map<string, number>();

    filteredRows.forEach((row) => {
      const key = row.tenXuongIn || 'Chưa chọn xưởng';
      const current = map.get(key) || 0;
      map.set(key, current + row.soLuongAnhLon + row.soLuongAnhNho);
    });

    return Array.from(map.entries()).map(([name, total]) => ({ name, total }));
  }, [filteredRows]);

  const persistRowPatch = async (rowId: string, patch: Record<string, any>) => {
    setRowSaving(rowId, true);
    setError(null);

    try {
      const updated = await updatePrintOrder(rowId, patch);
      setRows((prev) => updateRowInList(prev, updated));
    } catch (e: any) {
      console.error('Update print order error:', e);
      setError(e?.message || 'Cập nhật dòng in ấn thất bại.');
      await loadData();
    } finally {
      setRowSaving(rowId, false);
    }
  };

  const handleTextBlur = async (
    row: PrintOrder,
    field: keyof PrintOrder,
    value: string
  ) => {
    if (row[field] === value) return;

    setRows((prev) =>
      prev.map((item) =>
        item.id === row.id
          ? {
              ...item,
              [field]: value,
            }
          : item
      )
    );

    const dbFieldMap: Partial<Record<keyof PrintOrder, string>> = {
      tenKhachHang: 'ten_khach_hang',
      contractCode: 'contract_code',
      ngayGuiIn: 'ngay_gui_in',
      ghiChu: 'ghi_chu',
      linkTheTrello: 'link_the_trello',
      linkFiles: 'link_files',
      nguoiKiemTraNhanAnh: 'nguoi_kiem_tra_nhan_anh',
    };

    const dbField = dbFieldMap[field];
    if (!dbField) return;

    await persistRowPatch(row.id, {
      [dbField]: value,
    });
  };

  const handleNumberBlur = async (
    row: PrintOrder,
    field: 'soLuongAnhLon' | 'soLuongAnhNho',
    value: string
  ) => {
    const normalized = toNonNegativeNumber(value);
    if (row[field] === normalized) return;

    setRows((prev) =>
      prev.map((item) =>
        item.id === row.id
          ? {
              ...item,
              [field]: normalized,
            }
          : item
      )
    );

    const dbField = field === 'soLuongAnhLon' ? 'so_luong_anh_lon' : 'so_luong_anh_nho';
    await persistRowPatch(row.id, {
      [dbField]: normalized,
    });
  };

  const handleCheckboxChange = async (
    row: PrintOrder,
    field: 'thongBaoDaCoAnh' | 'thongBaoDaGiaoAnh' | 'checkFlag' | 'thongBaoDangInAnh',
    checked: boolean
  ) => {
    setRows((prev) =>
      prev.map((item) =>
        item.id === row.id
          ? {
              ...item,
              [field]: checked,
            }
          : item
      )
    );

    const dbFieldMap = {
      thongBaoDaCoAnh: 'thong_bao_da_co_anh',
      thongBaoDaGiaoAnh: 'thong_bao_da_giao_anh',
      checkFlag: 'check_flag',
      thongBaoDangInAnh: 'thong_bao_dang_in_anh',
    };

    await persistRowPatch(row.id, {
      [dbFieldMap[field]]: checked,
    });
  };

  const handleSelectChange = async (
    row: PrintOrder,
    type: 'kich_thuoc_anh_lon' | 'chat_lieu_anh_lon' | 'kich_thuoc_anh_nho' | 'chat_lieu_anh_nho' | 'vendor' | 'status',
    optionId: string
  ) => {
    let patch: Record<string, any> = {};
    let nextRows = rows;

    if (type === 'kich_thuoc_anh_lon') {
      const option = catalogs.sizes.find((item) => item.id === optionId);
      patch = { kich_thuoc_anh_lon_id: optionId || null };
      nextRows = rows.map((item) =>
        item.id === row.id
          ? { ...item, kichThuocAnhLonId: optionId || null, kichThuocAnhLon: option?.name || '' }
          : item
      );
    }

    if (type === 'chat_lieu_anh_lon') {
      const option = catalogs.materials.find((item) => item.id === optionId);
      patch = { chat_lieu_anh_lon_id: optionId || null };
      nextRows = rows.map((item) =>
        item.id === row.id
          ? { ...item, chatLieuAnhLonId: optionId || null, chatLieuAnhLon: option?.name || '' }
          : item
      );
    }

    if (type === 'kich_thuoc_anh_nho') {
      const option = catalogs.sizes.find((item) => item.id === optionId);
      patch = { kich_thuoc_anh_nho_id: optionId || null };
      nextRows = rows.map((item) =>
        item.id === row.id
          ? { ...item, kichThuocAnhNhoId: optionId || null, kichThuocAnhNho: option?.name || '' }
          : item
      );
    }

    if (type === 'chat_lieu_anh_nho') {
      const option = catalogs.materials.find((item) => item.id === optionId);
      patch = { chat_lieu_anh_nho_id: optionId || null };
      nextRows = rows.map((item) =>
        item.id === row.id
          ? { ...item, chatLieuAnhNhoId: optionId || null, chatLieuAnhNho: option?.name || '' }
          : item
      );
    }

    if (type === 'vendor') {
      const option = catalogs.vendors.find((item) => item.id === optionId);
      patch = { vendor_id: optionId || null };
      nextRows = rows.map((item) =>
        item.id === row.id
          ? { ...item, vendorId: optionId || null, tenXuongIn: option?.name || '' }
          : item
      );
    }

    if (type === 'status') {
      const option = catalogs.statuses.find((item) => item.id === optionId);
      patch = { status_id: optionId || null };
      nextRows = rows.map((item) =>
        item.id === row.id
          ? { ...item, statusId: optionId || null, tenTrangThai: option?.name || '' }
          : item
      );
    }

    setRows(nextRows);
    await persistRowPatch(row.id, patch);
  };

  const addNewRow = async () => {
    setIsAdding(true);
    setError(null);

    try {
      const defaultStatusId = catalogs.statuses.find((item) => item.name === 'ĐANG IN ẤN')?.id || null;

      const created = await createPrintOrder({
        tenKhachHang: 'Khách mới',
        ngayGuiIn: new Date().toISOString().slice(0, 10),
        statusId: defaultStatusId,
      });

      setRows((prev) => [created, ...prev]);
      setSuccessMessage('Đã tạo dòng in ấn mới.');
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
      const created = await duplicatePrintOrder(row);
      setRows((prev) => [created, ...prev]);
      setSuccessMessage('Đã nhân bản dòng in ấn.');
    } catch (e: any) {
      console.error('Duplicate print order error:', e);
      setError(e?.message || 'Không nhân bản được dòng in ấn.');
    } finally {
      setRowSaving(row.id, false);
    }
  };

  const handleDeleteRow = async (row: PrintOrder) => {
    const confirmed = window.confirm(`Bạn có chắc muốn ẩn đơn in của "${row.tenKhachHang}"?`);
    if (!confirmed) return;

    setRowSaving(row.id, true);
    setError(null);

    try {
      await softDeletePrintOrder(row.id);
      setRows((prev) => prev.filter((item) => item.id !== row.id));
      setSuccessMessage('Đã xóa mềm dòng in ấn.');
    } catch (e: any) {
      console.error('Delete print order error:', e);
      setError(e?.message || 'Không xóa được dòng in ấn.');
    } finally {
      setRowSaving(row.id, false);
    }
  };

  const renderSelect = (
    row: PrintOrder,
    value: string | null | undefined,
    options: PrintCatalogOption[],
    onChange: (value: string) => Promise<void>,
    className = 'w-full rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm'
  ) => (
    <select
      value={value || ''}
      onChange={(e) => void onChange(e.target.value)}
      className={className}
      disabled={!!savingMap[row.id]}
    >
      <option value="">Chọn</option>
      {options.map((option) => (
        <option key={option.id} value={option.id}>
          {option.name}
        </option>
      ))}
    </select>
  );

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
                Step 2.1 đã nối dữ liệu thật từ Supabase qua view print_orders_view và cho phép CRUD inline an toàn.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setActiveTab('list')}
              className={`rounded-xl px-4 py-2 text-sm font-medium ${
                activeTab === 'list'
                  ? 'bg-blue-600 text-white'
                  : 'border border-gray-300 bg-white text-gray-700'
              }`}
            >
              Danh sách in ấn
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('report')}
              className={`rounded-xl px-4 py-2 text-sm font-medium ${
                activeTab === 'report'
                  ? 'bg-blue-600 text-white'
                  : 'border border-gray-300 bg-white text-gray-700'
              }`}
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
                <h2 className="text-base font-semibold text-gray-800">Danh sách vận hành in ấn</h2>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => void addNewRow()}
                  disabled={isAdding || isLoading || !isConfigured}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isAdding ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                  Thêm dòng mới
                </button>
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
            <table className="min-w-[2050px] w-full">
              <thead className="bg-amber-200">
                <tr className="text-sm font-semibold text-gray-900">
                  <th className="px-3 py-3 text-left">Ảnh</th>
                  <th className="px-3 py-3 text-left">Tên khách hàng</th>
                  <th className="px-3 py-3 text-left">Mã hợp đồng</th>
                  <th className="px-3 py-3 text-left">Ngày gửi in</th>
                  <th className="px-3 py-3 text-left">Số lượng ảnh lớn</th>
                  <th className="px-3 py-3 text-left">Kích thước</th>
                  <th className="px-3 py-3 text-left">Chất liệu</th>
                  <th className="px-3 py-3 text-left">Số lượng ảnh nhỏ</th>
                  <th className="px-3 py-3 text-left">Kích thước</th>
                  <th className="px-3 py-3 text-left">Chất liệu</th>
                  <th className="px-3 py-3 text-left">Tình trạng</th>
                  <th className="px-3 py-3 text-left">Xưởng in</th>
                  <th className="px-3 py-3 text-left">Người kiểm tra nhận ảnh</th>
                  <th className="px-3 py-3 text-left">Ghi chú</th>
                  <th className="px-3 py-3 text-left">Link thẻ</th>
                  <th className="px-3 py-3 text-left">Link file in</th>
                  <th className="px-3 py-3 text-left">Đã có ảnh</th>
                  <th className="px-3 py-3 text-left">Đã giao ảnh</th>
                  <th className="px-3 py-3 text-left">Check</th>
                  <th className="px-3 py-3 text-left">Đang in ảnh</th>
                  <th className="px-3 py-3 text-left">Đơn giá</th>
                  <th className="px-3 py-3 text-left">Thành tiền</th>
                  <th className="px-3 py-3 text-left">Created</th>
                  <th className="px-3 py-3 text-left">Updated</th>
                  <th className="px-3 py-3 text-left">Thao tác</th>
                </tr>
              </thead>

              <tbody>
                {isLoading && (
                  <tr>
                    <td colSpan={25} className="px-6 py-14">
                      <div className="flex items-center justify-center gap-3 text-sm text-gray-500">
                        <Loader2 size={18} className="animate-spin" />
                        Đang tải dữ liệu từ Supabase...
                      </div>
                    </td>
                  </tr>
                )}

                {!isLoading &&
                  rows.map((row) => {
                    const isSavingRow = !!savingMap[row.id];

                    return (
                      <tr key={row.id} className="border-t border-gray-100 align-top">
                        <td className="px-3 py-3">
                          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gray-100 text-gray-500">
                            <ImageIcon size={18} />
                          </div>
                        </td>

                        <td className="min-w-[220px] px-3 py-3">
                          <input
                            defaultValue={row.tenKhachHang}
                            onBlur={(e) => void handleTextBlur(row, 'tenKhachHang', e.target.value)}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                            disabled={isSavingRow}
                          />
                        </td>

                        <td className="min-w-[140px] px-3 py-3">
                          <input
                            defaultValue={row.contractCode}
                            onBlur={(e) => void handleTextBlur(row, 'contractCode', e.target.value)}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                            disabled={isSavingRow}
                          />
                        </td>

                        <td className="min-w-[150px] px-3 py-3">
                          <input
                            type="date"
                            defaultValue={row.ngayGuiIn}
                            onBlur={(e) => void handleTextBlur(row, 'ngayGuiIn', e.target.value)}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                            disabled={isSavingRow}
                          />
                        </td>

                        <td className="min-w-[130px] px-3 py-3">
                          <input
                            type="number"
                            min={0}
                            defaultValue={row.soLuongAnhLon}
                            onBlur={(e) => void handleNumberBlur(row, 'soLuongAnhLon', e.target.value)}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                            disabled={isSavingRow}
                          />
                        </td>

                        <td className="min-w-[140px] px-3 py-3">
                          {renderSelect(
                            row,
                            row.kichThuocAnhLonId,
                            catalogs.sizes,
                            async (value) => handleSelectChange(row, 'kich_thuoc_anh_lon', value)
                          )}
                        </td>

                        <td className="min-w-[140px] px-3 py-3">
                          {renderSelect(
                            row,
                            row.chatLieuAnhLonId,
                            catalogs.materials,
                            async (value) => handleSelectChange(row, 'chat_lieu_anh_lon', value)
                          )}
                        </td>

                        <td className="min-w-[130px] px-3 py-3">
                          <input
                            type="number"
                            min={0}
                            defaultValue={row.soLuongAnhNho}
                            onBlur={(e) => void handleNumberBlur(row, 'soLuongAnhNho', e.target.value)}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                            disabled={isSavingRow}
                          />
                        </td>

                        <td className="min-w-[140px] px-3 py-3">
                          {renderSelect(
                            row,
                            row.kichThuocAnhNhoId,
                            catalogs.sizes,
                            async (value) => handleSelectChange(row, 'kich_thuoc_anh_nho', value)
                          )}
                        </td>

                        <td className="min-w-[140px] px-3 py-3">
                          {renderSelect(
                            row,
                            row.chatLieuAnhNhoId,
                            catalogs.materials,
                            async (value) => handleSelectChange(row, 'chat_lieu_anh_nho', value)
                          )}
                        </td>

                        <td className="min-w-[150px] px-3 py-3">
                          {renderSelect(
                            row,
                            row.statusId,
                            catalogs.statuses,
                            async (value) => handleSelectChange(row, 'status', value)
                          )}
                        </td>

                        <td className="min-w-[150px] px-3 py-3">
                          {renderSelect(
                            row,
                            row.vendorId,
                            catalogs.vendors,
                            async (value) => handleSelectChange(row, 'vendor', value)
                          )}
                        </td>

                        <td className="min-w-[180px] px-3 py-3">
                          <input
                            defaultValue={row.nguoiKiemTraNhanAnh}
                            onBlur={(e) => void handleTextBlur(row, 'nguoiKiemTraNhanAnh', e.target.value)}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                            disabled={isSavingRow}
                            placeholder="Nhập tên nhân sự"
                          />
                        </td>

                        <td className="min-w-[220px] px-3 py-3">
                          <input
                            defaultValue={row.ghiChu}
                            onBlur={(e) => void handleTextBlur(row, 'ghiChu', e.target.value)}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                            disabled={isSavingRow}
                          />
                        </td>

                        <td className="min-w-[240px] px-3 py-3">
                          <div className="flex items-center gap-2">
                            <LinkIcon size={14} className="text-gray-400" />
                            <input
                              defaultValue={row.linkTheTrello}
                              onBlur={(e) => void handleTextBlur(row, 'linkTheTrello', e.target.value)}
                              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                              disabled={isSavingRow}
                            />
                          </div>
                        </td>

                        <td className="min-w-[240px] px-3 py-3">
                          <input
                            defaultValue={row.linkFiles}
                            onBlur={(e) => void handleTextBlur(row, 'linkFiles', e.target.value)}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                            disabled={isSavingRow}
                          />
                        </td>

                        {([
                          ['thongBaoDaCoAnh', row.thongBaoDaCoAnh],
                          ['thongBaoDaGiaoAnh', row.thongBaoDaGiaoAnh],
                          ['checkFlag', row.checkFlag],
                          ['thongBaoDangInAnh', row.thongBaoDangInAnh],
                        ] as const).map(([field, checked]) => (
                          <td key={field} className="min-w-[110px] px-3 py-3">
                            <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(e) =>
                                  void handleCheckboxChange(
                                    row,
                                    field,
                                    e.target.checked
                                  )
                                }
                                disabled={isSavingRow}
                              />
                              Có
                            </label>
                          </td>
                        ))}

                        <td className="min-w-[120px] px-3 py-3 text-sm text-gray-700">
                          {formatMoney(row.donGiaIn)}
                        </td>

                        <td className="min-w-[140px] px-3 py-3 text-sm font-semibold text-gray-900">
                          {formatMoney(row.thanhTien)}
                        </td>

                        <td className="min-w-[130px] px-3 py-3 text-sm text-gray-600">
                          {formatDate(row.createdAt?.slice(0, 10))}
                        </td>

                        <td className="min-w-[130px] px-3 py-3 text-sm text-gray-600">
                          {formatDate(row.updatedAt?.slice(0, 10))}
                        </td>

                        <td className="min-w-[180px] px-3 py-3">
                          <div className="flex items-center gap-2">
                            {isSavingRow && <Loader2 size={15} className="animate-spin text-blue-600" />}
                            <button
                              type="button"
                              onClick={() => void handleDuplicateRow(row)}
                              className="rounded-lg border border-gray-300 p-2 text-gray-700"
                              title="Nhân bản"
                              disabled={isSavingRow}
                            >
                              <Copy size={15} />
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleDeleteRow(row)}
                              className="rounded-lg border border-red-200 p-2 text-red-600"
                              title="Xóa"
                              disabled={isSavingRow}
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                {!isLoading && rows.length === 0 && (
                  <tr>
                    <td colSpan={25} className="px-6 py-12 text-center text-sm text-gray-500">
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
              <div className="text-sm text-gray-500">Tổng ảnh lớn</div>
              <div className="mt-2 text-3xl font-bold text-gray-900">{formatNumber(totalLargePhotos)}</div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="text-sm text-gray-500">Tổng ảnh nhỏ</div>
              <div className="mt-2 text-3xl font-bold text-gray-900">{formatNumber(totalSmallPhotos)}</div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="text-sm text-gray-500">Tổng số ảnh</div>
              <div className="mt-2 text-3xl font-bold text-gray-900">
                {formatNumber(totalLargePhotos + totalSmallPhotos)}
              </div>
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
                  <div className="mt-2 text-2xl font-bold text-gray-900">{formatMoney(item.total)}</div>
                  <div className="mt-1 text-sm text-gray-500">tổng số ảnh dự kiến in</div>
                </div>
              ))}

              {reportByVendor.length === 0 && (
                <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-500">
                  Chưa có dữ liệu theo khoảng ngày đã chọn.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-6 text-sm text-gray-500 shadow-sm">
            Step 2.1 đang dùng dữ liệu thật. Ở bước tiếp theo, nên làm Step 2.2: fetch bảng giá xưởng in và tự tính don_gia_in theo vendor + size + material.
          </div>
        </>
      )}
    </div>
  );
};

export default PrintProductionManager;
