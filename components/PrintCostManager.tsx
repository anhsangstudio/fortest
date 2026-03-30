
import React, { useEffect, useMemo, useState } from 'react';
import {
  Plus,
  RefreshCw,
  Search,
  Pencil,
  Trash2,
  X,
  Save,
  Loader2,
  Package,
  BarChart3,
} from 'lucide-react';
import type {
  PrintCatalogOption,
  PrintVendorPrice,
  CreatePrintVendorPriceInput,
  UpdatePrintVendorPriceInput,
} from '../types';
import {
  fetchPrintCatalogs,
  fetchPrintVendorPrices,
  createPrintVendorPrice,
  updatePrintVendorPrice,
  softDeletePrintVendorPrice,
} from '../apiService';

type PriceFormState = {
  vendorId: string;
  sizeId: string;
  materialId: string;
  printServiceId: string;
  donGia: string;
  ghiChu: string;
};

const EMPTY_FORM: PriceFormState = {
  vendorId: '',
  sizeId: '',
  materialId: '',
  printServiceId: '',
  donGia: '',
  ghiChu: '',
};

const formatCurrency = (value?: number | null) => {
  const amount = Number(value || 0);
  return `${amount.toLocaleString('vi-VN')} đ`;
};

const toInputNumber = (value?: number | null) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '';
  return String(Number(value));
};

const normalizeNullable = (value: string) => {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

const PrintCostManager: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'pricing' | 'costs'>('pricing');

  const [vendors, setVendors] = useState<PrintCatalogOption[]>([]);
  const [sizes, setSizes] = useState<PrintCatalogOption[]>([]);
  const [materials, setMaterials] = useState<PrintCatalogOption[]>([]);

  const [prices, setPrices] = useState<PrintVendorPrice[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [filterVendorId, setFilterVendorId] = useState('');
  const [filterSizeId, setFilterSizeId] = useState('');
  const [filterMaterialId, setFilterMaterialId] = useState('');
  const [searchText, setSearchText] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingPrice, setEditingPrice] = useState<PrintVendorPrice | null>(null);
  const [form, setForm] = useState<PriceFormState>(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [pageError, setPageError] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      setPageError('');

      const [catalogs, priceRows] = await Promise.all([
        fetchPrintCatalogs(),
        fetchPrintVendorPrices({ isActive: true }),
      ]);

      setVendors(catalogs.vendors || []);
      setSizes(catalogs.sizes || []);
      setMaterials(catalogs.materials || []);
      setPrices(priceRows || []);
    } catch (error: any) {
      console.error('PrintCostManager.loadData error:', error);
      setPageError(error?.message || 'Không tải được dữ liệu báo giá in ấn.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const resetForm = () => {
    setEditingPrice(null);
    setForm(EMPTY_FORM);
    setFormError('');
  };

  const openCreateModal = () => {
    resetForm();
    setModalOpen(true);
  };

  const openEditModal = (price: PrintVendorPrice) => {
    setEditingPrice(price);
    setForm({
      vendorId: price.vendorId || '',
      sizeId: price.sizeId || '',
      materialId: price.materialId || '',
      printServiceId: price.printServiceId || '',
      donGia: toInputNumber(price.donGia),
      ghiChu: price.ghiChu || '',
    });
    setFormError('');
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    resetForm();
  };

  const validateForm = () => {
    if (!form.vendorId) return 'Vui lòng chọn nhà cung cấp.';
    if (!form.sizeId) return 'Vui lòng chọn kích thước.';
    if (!form.materialId) return 'Vui lòng chọn chất liệu.';
    if (!form.donGia.trim()) return 'Vui lòng nhập đơn giá.';

    const amount = Number(form.donGia);
    if (Number.isNaN(amount) || amount < 0) {
      return 'Đơn giá phải là số hợp lệ và không âm.';
    }

    return '';
  };

  const handleSubmit = async () => {
    const error = validateForm();
    if (error) {
      setFormError(error);
      return;
    }

    try {
      setSubmitting(true);
      setFormError('');

      const payload: CreatePrintVendorPriceInput | UpdatePrintVendorPriceInput = {
        vendorId: form.vendorId,
        sizeId: normalizeNullable(form.sizeId),
        materialId: normalizeNullable(form.materialId),
        printServiceId: normalizeNullable(form.printServiceId),
        donGia: Number(form.donGia),
        ghiChu: form.ghiChu.trim() || '',
      };

      if (editingPrice) {
        await updatePrintVendorPrice(editingPrice.id, {
          ...payload,
          isActive: true,
        });
      } else {
        await createPrintVendorPrice(payload as CreatePrintVendorPriceInput);
      }

      await loadData();
      closeModal();
    } catch (err: any) {
      console.error('PrintCostManager.handleSubmit error:', err);
      setFormError(err?.message || 'Không lưu được báo giá in ấn.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (price: PrintVendorPrice) => {
    const confirmed = window.confirm(
      `Bạn có chắc muốn ẩn báo giá:\n${price.vendorName} - ${price.sizeName} - ${price.materialName}?`
    );
    if (!confirmed) return;

    try {
      setLoading(true);
      await softDeletePrintVendorPrice(price.id);
      await loadData();
    } catch (error: any) {
      console.error('PrintCostManager.handleDelete error:', error);
      setPageError(error?.message || 'Không xóa được báo giá in ấn.');
    } finally {
      setLoading(false);
    }
  };

  const filteredPrices = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();

    return prices.filter((row) => {
      if (filterVendorId && row.vendorId !== filterVendorId) return false;
      if (filterSizeId && row.sizeId !== filterSizeId) return false;
      if (filterMaterialId && row.materialId !== filterMaterialId) return false;

      if (!keyword) return true;

      const haystack = [
        row.vendorName,
        row.sizeName,
        row.materialName,
        row.printServiceName || '',
        row.ghiChu || '',
        String(row.donGia || ''),
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(keyword);
    });
  }, [prices, filterVendorId, filterSizeId, filterMaterialId, searchText]);

  const totalActivePrices = filteredPrices.length;
  const totalAmount = filteredPrices.reduce((sum, row) => sum + Number(row.donGia || 0), 0);

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Chi phí in ấn</h2>
          <p className="text-sm text-slate-500">
            Quản lý báo giá theo xưởng in và chuẩn bị dữ liệu cho tab chi phí in ấn.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={loadData}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw size={16} />
            Tải lại
          </button>

          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            <Plus size={16} />
            Thêm mới sản phẩm in
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-slate-200">
        <button
          type="button"
          onClick={() => setActiveTab('pricing')}
          className={`inline-flex items-center gap-2 rounded-t-lg px-4 py-2 text-sm font-medium ${
            activeTab === 'pricing'
              ? 'border border-b-white border-slate-200 bg-white text-slate-900'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Package size={16} />
          Báo giá in ấn
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('costs')}
          className={`inline-flex items-center gap-2 rounded-t-lg px-4 py-2 text-sm font-medium ${
            activeTab === 'costs'
              ? 'border border-b-white border-slate-200 bg-white text-slate-900'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <BarChart3 size={16} />
          Chi phí in ấn
        </button>
      </div>

      {pageError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {pageError}
        </div>
      ) : null}

      {activeTab === 'pricing' && (
        <>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-medium text-slate-600">Tìm kiếm</label>
              <div className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2">
                <Search size={16} className="text-slate-400" />
                <input
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder="Nhà cung cấp, kích thước, chất liệu, ghi chú..."
                  className="w-full border-none bg-transparent text-sm outline-none"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Nhà cung cấp</label>
              <select
                value={filterVendorId}
                onChange={(e) => setFilterVendorId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                <option value="">Tất cả</option>
                {vendors.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Kích thước</label>
              <select
                value={filterSizeId}
                onChange={(e) => setFilterSizeId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                <option value="">Tất cả</option>
                {sizes.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Chất liệu</label>
              <select
                value={filterMaterialId}
                onChange={(e) => setFilterMaterialId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                <option value="">Tất cả</option>
                {materials.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="text-sm text-slate-500">Số báo giá đang hiển thị</div>
              <div className="mt-1 text-2xl font-bold text-slate-900">{totalActivePrices}</div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="text-sm text-slate-500">Tổng đơn giá cộng dồn</div>
              <div className="mt-1 text-2xl font-bold text-slate-900">{formatCurrency(totalAmount)}</div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="text-sm text-slate-500">Trạng thái dữ liệu</div>
              <div className="mt-1 text-sm font-medium text-slate-700">
                {loading ? 'Đang tải dữ liệu...' : 'Sẵn sàng dùng cho module in ấn'}
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-left text-slate-600">
                  <tr>
                    <th className="px-4 py-3 font-medium">Nhà cung cấp</th>
                    <th className="px-4 py-3 font-medium">Kích thước</th>
                    <th className="px-4 py-3 font-medium">Chất liệu</th>
                    <th className="px-4 py-3 font-medium">Dịch vụ in</th>
                    <th className="px-4 py-3 font-medium text-right">Đơn giá</th>
                    <th className="px-4 py-3 font-medium">Ghi chú</th>
                    <th className="px-4 py-3 font-medium text-center">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-10 text-center text-slate-500">
                        <div className="inline-flex items-center gap-2">
                          <Loader2 size={16} className="animate-spin" />
                          Đang tải dữ liệu...
                        </div>
                      </td>
                    </tr>
                  ) : filteredPrices.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-10 text-center text-slate-500">
                        Chưa có báo giá phù hợp với bộ lọc hiện tại.
                      </td>
                    </tr>
                  ) : (
                    filteredPrices.map((row) => (
                      <tr key={row.id} className="border-t border-slate-100">
                        <td className="px-4 py-3 font-medium text-slate-800">{row.vendorName}</td>
                        <td className="px-4 py-3">{row.sizeName || '-'}</td>
                        <td className="px-4 py-3">{row.materialName || '-'}</td>
                        <td className="px-4 py-3">{row.printServiceName || '-'}</td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-900">
                          {formatCurrency(row.donGia)}
                        </td>
                        <td className="px-4 py-3 text-slate-600">{row.ghiChu || '-'}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => openEditModal(row)}
                              className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                            >
                              <Pencil size={14} />
                              Sửa
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(row)}
                              className="inline-flex items-center gap-1 rounded-md border border-red-300 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                            >
                              <Trash2 size={14} />
                              Xóa
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {activeTab === 'costs' && (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <div className="text-lg font-semibold text-slate-800">Tab Chi phí in ấn</div>
          <p className="mt-2 text-sm text-slate-500">
            Bước này chưa triển khai UI. Ở bước tiếp theo sẽ nối bảng chi phí với RPC:
            rpc_get_print_cost_rows và rpc_get_print_cost_summary_by_vendor.
          </p>
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">
                  {editingPrice ? 'Cập nhật sản phẩm in' : 'Thêm mới sản phẩm in'}
                </h3>
                <p className="text-sm text-slate-500">
                  Khai báo báo giá theo nhà cung cấp, kích thước và chất liệu.
                </p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 px-5 py-5 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Nhà cung cấp</label>
                <select
                  value={form.vendorId}
                  onChange={(e) => setForm((prev) => ({ ...prev, vendorId: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                >
                  <option value="">Chọn nhà cung cấp</option>
                  {vendors.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Kích thước</label>
                <select
                  value={form.sizeId}
                  onChange={(e) => setForm((prev) => ({ ...prev, sizeId: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                >
                  <option value="">Chọn kích thước</option>
                  {sizes.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Chất liệu</label>
                <select
                  value={form.materialId}
                  onChange={(e) => setForm((prev) => ({ ...prev, materialId: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                >
                  <option value="">Chọn chất liệu</option>
                  {materials.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Dịch vụ in</label>
                <input
                  value={form.printServiceId}
                  onChange={(e) => setForm((prev) => ({ ...prev, printServiceId: e.target.value }))}
                  placeholder="Tạm để trống nếu chưa dùng"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Đơn giá</label>
                <input
                  type="number"
                  min="0"
                  value={form.donGia}
                  onChange={(e) => setForm((prev) => ({ ...prev, donGia: e.target.value }))}
                  placeholder="Nhập đơn giá"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium text-slate-700">Ghi chú</label>
                <textarea
                  value={form.ghiChu}
                  onChange={(e) => setForm((prev) => ({ ...prev, ghiChu: e.target.value }))}
                  rows={3}
                  placeholder="Ghi chú thêm nếu cần"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                />
              </div>

              {formError ? (
                <div className="md:col-span-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {formError}
                </div>
              ) : null}
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-4">
              <button
                type="button"
                onClick={closeModal}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
              >
                {submitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {editingPrice ? 'Lưu cập nhật' : 'Tạo mới'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PrintCostManager;
