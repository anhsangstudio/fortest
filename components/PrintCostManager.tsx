
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
  PrintCostRow,
  PrintCostSummary,
  PrintVendorOpeningDebt,
  PrintVendorPayment,
  PrintVendorDebtSummaryRow,
} from '../types';
import {
  fetchPrintCatalogs,
  fetchPrintVendorPrices,
  createPrintVendorPrice,
  updatePrintVendorPrice,
  softDeletePrintVendorPrice,
  createPrintVendor,
  updatePrintVendor,
  softDeletePrintVendor,
  createPrintSize,
  updatePrintSize,
  softDeletePrintSize,
  createPrintMaterial,
  updatePrintMaterial,
  softDeletePrintMaterial,
  fetchPrintCostData,
  fetchPrintVendorOpeningDebts,
  createPrintVendorOpeningDebt,
  softDeletePrintVendorOpeningDebt,
  fetchPrintVendorPayments,
  createPrintVendorPayment,
  softDeletePrintVendorPayment,
  fetchPrintVendorDebtSummary,
} from '../apiService';

type PriceFormState = {
  vendorId: string;
  sizeId: string;
  materialId: string;
  printServiceId: string;
  donGia: string;
  ghiChu: string;
};

type CatalogManagerType = 'vendor' | 'size' | 'material';

type CatalogManagerState = {
  open: boolean;
  type: CatalogManagerType;
  editingId: string | null;
  value: string;
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

const EMPTY_COST_SUMMARY: PrintCostSummary = {
  totalRows: 0,
  totalOrders: 0,
  totalQuantity: 0,
  totalAmount: 0,
  missingPriceRows: 0,
  byVendor: [],
};

const PrintCostManager: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'pricing' | 'costs' | 'debts'>('pricing');

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

  const [costRows, setCostRows] = useState<PrintCostRow[]>([]);
  const [costSummary, setCostSummary] = useState<PrintCostSummary>(EMPTY_COST_SUMMARY);
  const [costLoading, setCostLoading] = useState(false);
  const [costFrom, setCostFrom] = useState('');
  const [costTo, setCostTo] = useState('');
  const [costVendorId, setCostVendorId] = useState('');
  const [debtRows, setDebtRows] = useState<PrintVendorDebtSummaryRow[]>([]);
  const [openingDebts, setOpeningDebts] = useState<PrintVendorOpeningDebt[]>([]);
  const [payments, setPayments] = useState<PrintVendorPayment[]>([]);
  const [debtLoading, setDebtLoading] = useState(false);
  const [debtFrom, setDebtFrom] = useState('');
  const [debtTo, setDebtTo] = useState('');
  const [debtVendorId, setDebtVendorId] = useState('');
  const [openingDebtModalOpen, setOpeningDebtModalOpen] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [openingDebtForm, setOpeningDebtForm] = useState({ vendorId: '', soTien: '', ngayApDung: new Date().toISOString().slice(0, 10), ghiChu: '' });
  const [paymentForm, setPaymentForm] = useState({ vendorId: '', soTien: '', ngayThanhToan: new Date().toISOString().slice(0, 10), ghiChu: '' });

  const [modalOpen, setModalOpen] = useState(false);
  const [editingPrice, setEditingPrice] = useState<PrintVendorPrice | null>(null);
  const [form, setForm] = useState<PriceFormState>(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [pageError, setPageError] = useState('');
  const [catalogManager, setCatalogManager] = useState<CatalogManagerState>({
    open: false,
    type: 'vendor',
    editingId: null,
    value: '',
  });

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

  const loadCostData = async () => {
    try {
      setCostLoading(true);
      setPageError('');
      const result = await fetchPrintCostData({
        from: costFrom || undefined,
        to: costTo || undefined,
        vendorId: costVendorId || undefined,
      });
      setCostRows(result.rows || []);
      setCostSummary(result.summary || EMPTY_COST_SUMMARY);
    } catch (error: any) {
      console.error('PrintCostManager.loadCostData error:', error);
      setPageError(error?.message || 'Không tải được dữ liệu chi phí in ấn.');
      setCostRows([]);
      setCostSummary(EMPTY_COST_SUMMARY);
    } finally {
      setCostLoading(false);
    }
  };

  const loadDebtData = async () => {
    try {
      setDebtLoading(true);
      setPageError('');
      const [summaryRows, openingRows, paymentRows] = await Promise.all([
        fetchPrintVendorDebtSummary({
          from: debtFrom || undefined,
          to: debtTo || undefined,
          vendorId: debtVendorId || undefined,
        }),
        fetchPrintVendorOpeningDebts(),
        fetchPrintVendorPayments(),
      ]);
      setDebtRows(summaryRows || []);
      setOpeningDebts(openingRows || []);
      setPayments(paymentRows || []);
    } catch (error: any) {
      console.error('PrintCostManager.loadDebtData error:', error);
      setPageError(error?.message || 'Không tải được dữ liệu công nợ in ấn.');
      setDebtRows([]);
      setOpeningDebts([]);
      setPayments([]);
    } finally {
      setDebtLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    loadCostData();
    loadDebtData();
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

  const getCatalogLabel = (type: CatalogManagerType) => {
    if (type === 'vendor') return 'nhà cung cấp';
    if (type === 'size') return 'kích thước';
    return 'chất liệu';
  };

  const getCatalogItems = (type: CatalogManagerType): PrintCatalogOption[] => {
    if (type === 'vendor') return vendors;
    if (type === 'size') return sizes;
    return materials;
  };

  const openCatalogManager = (type: CatalogManagerType) => {
    setCatalogManager({
      open: true,
      type,
      editingId: null,
      value: '',
    });
  };

  const startEditCatalogItem = (type: CatalogManagerType, item: PrintCatalogOption) => {
    setCatalogManager({
      open: true,
      type,
      editingId: item.id,
      value: item.name,
    });
  };

  const closeCatalogManager = () => {
    setCatalogManager((prev) => ({
      ...prev,
      open: false,
      editingId: null,
      value: '',
    }));
  };

  const handleSaveCatalogItem = async () => {
    const value = catalogManager.value.trim();
    if (!value) {
      alert('Vui lòng nhập thông tin.');
      return;
    }

    try {
      setSubmitting(true);

      if (catalogManager.type === 'vendor') {
        if (catalogManager.editingId) {
          await updatePrintVendor(catalogManager.editingId, { ten_xuong_in: value });
        } else {
          await createPrintVendor({ ten_xuong_in: value });
        }
      } else if (catalogManager.type === 'size') {
        if (catalogManager.editingId) {
          await updatePrintSize(catalogManager.editingId, { ten_kich_thuoc: value });
        } else {
          await createPrintSize({ ten_kich_thuoc: value });
        }
      } else {
        if (catalogManager.editingId) {
          await updatePrintMaterial(catalogManager.editingId, { ten_chat_lieu: value });
        } else {
          await createPrintMaterial({ ten_chat_lieu: value });
        }
      }

      await loadData();
      closeCatalogManager();
    } catch (error: any) {
      console.error('PrintCostManager.handleSaveCatalogItem error:', error);
      setPageError(error?.message || 'Không lưu được dữ liệu danh mục.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCatalogItem = async (type: CatalogManagerType, item: PrintCatalogOption) => {
    const confirmed = window.confirm(`Bạn có chắc muốn ẩn ${getCatalogLabel(type)}: ${item.name}?`);
    if (!confirmed) return;

    try {
      setLoading(true);

      if (type === 'vendor') {
        await softDeletePrintVendor(item.id);
        if (form.vendorId === item.id) {
          setForm((prev) => ({ ...prev, vendorId: '' }));
        }
      } else if (type === 'size') {
        await softDeletePrintSize(item.id);
        if (form.sizeId === item.id) {
          setForm((prev) => ({ ...prev, sizeId: '' }));
        }
      } else {
        await softDeletePrintMaterial(item.id);
        if (form.materialId === item.id) {
          setForm((prev) => ({ ...prev, materialId: '' }));
        }
      }

      await loadData();
    } catch (error: any) {
      console.error('PrintCostManager.handleDeleteCatalogItem error:', error);
      setPageError(error?.message || 'Không xóa được dữ liệu danh mục.');
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

  const totalDebtOpening = useMemo(() => debtRows.reduce((sum, row) => sum + Number(row.congNoDauKy || 0), 0), [debtRows]);
  const totalDebtGenerated = useMemo(() => debtRows.reduce((sum, row) => sum + Number(row.phatSinhTrongKy || 0), 0), [debtRows]);
  const totalDebtPaid = useMemo(() => debtRows.reduce((sum, row) => sum + Number(row.daThanhToanTrongKy || 0), 0), [debtRows]);
  const totalDebtRemaining = useMemo(() => debtRows.reduce((sum, row) => sum + Number(row.conNoCuoiKy || 0), 0), [debtRows]);

  const productSummary = useMemo(() => {
    const map = new Map<string, { quantity: number; amount: number; orders: Set<string> }>();
    costRows.forEach((row) => {
      const key = [row.sizeName || 'Chưa chọn kích thước', row.materialName || 'Chưa chọn chất liệu'].join(' - ');
      const current = map.get(key) || { quantity: 0, amount: 0, orders: new Set<string>() };
      current.quantity += Number(row.quantity || 0);
      current.amount += Number(row.amount || 0);
      current.orders.add(row.orderId);
      map.set(key, current);
    });
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, quantity: value.quantity, amount: value.amount, orderCount: value.orders.size }))
      .sort((a, b) => b.quantity - a.quantity);
  }, [costRows]);


  const handleCreateOpeningDebt = async () => {
    try {
      if (!openingDebtForm.vendorId || !openingDebtForm.soTien || !openingDebtForm.ngayApDung) {
        alert('Vui lòng nhập đủ nhà cung cấp, số tiền và ngày áp dụng.');
        return;
      }
      setSubmitting(true);
      await createPrintVendorOpeningDebt({
        vendorId: openingDebtForm.vendorId,
        soTien: Number(openingDebtForm.soTien || 0),
        ngayApDung: openingDebtForm.ngayApDung,
        ghiChu: openingDebtForm.ghiChu || '',
      });
      setOpeningDebtModalOpen(false);
      setOpeningDebtForm({ vendorId: '', soTien: '', ngayApDung: new Date().toISOString().slice(0, 10), ghiChu: '' });
      await loadDebtData();
    } catch (error: any) {
      console.error('handleCreateOpeningDebt error:', error);
      setPageError(error?.message || 'Không thêm được công nợ đầu kỳ.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreatePayment = async () => {
    try {
      if (!paymentForm.vendorId || !paymentForm.soTien || !paymentForm.ngayThanhToan) {
        alert('Vui lòng nhập đủ nhà cung cấp, số tiền và ngày thanh toán.');
        return;
      }
      setSubmitting(true);
      await createPrintVendorPayment({
        vendorId: paymentForm.vendorId,
        soTien: Number(paymentForm.soTien || 0),
        ngayThanhToan: paymentForm.ngayThanhToan,
        ghiChu: paymentForm.ghiChu || '',
      });
      setPaymentModalOpen(false);
      setPaymentForm({ vendorId: '', soTien: '', ngayThanhToan: new Date().toISOString().slice(0, 10), ghiChu: '' });
      await loadDebtData();
    } catch (error: any) {
      console.error('handleCreatePayment error:', error);
      setPageError(error?.message || 'Không thêm được khoản thanh toán.');
    } finally {
      setSubmitting(false);
    }
  };

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
            onClick={() => { loadData(); loadCostData(); loadDebtData(); }}
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

          {activeTab === 'debts' && (
            <>
              <button
                type="button"
                onClick={() => setOpeningDebtModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                <Plus size={16} />
                Thêm công nợ đầu kỳ
              </button>

              <button
                type="button"
                onClick={() => setPaymentModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                <Plus size={16} />
                Thêm thanh toán
              </button>
            </>
          )}
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

        <button
          type="button"
          onClick={() => setActiveTab('debts')}
          className={`inline-flex items-center gap-2 rounded-t-lg px-4 py-2 text-sm font-medium ${
            activeTab === 'debts'
              ? 'border border-b-white border-slate-200 bg-white text-slate-900'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <BarChart3 size={16} />
          Công nợ in ấn
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
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Từ ngày</label>
              <input
                type="date"
                value={costFrom}
                onChange={(e) => setCostFrom(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Đến ngày</label>
              <input
                type="date"
                value={costTo}
                onChange={(e) => setCostTo(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Xưởng in</label>
              <select
                value={costVendorId}
                onChange={(e) => setCostVendorId(e.target.value)}
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

            <div className="flex items-end gap-2">
              <button
                type="button"
                onClick={loadCostData}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
              >
                <RefreshCw size={16} />
                Tải dữ liệu
              </button>
              <button
                type="button"
                onClick={() => {
                  setCostFrom('');
                  setCostTo('');
                  setCostVendorId('');
                }}
                className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Xóa lọc
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="text-sm text-slate-500">Tổng dòng chi phí</div>
              <div className="mt-1 text-2xl font-bold text-slate-900">{costSummary.totalRows}</div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="text-sm text-slate-500">Tổng đơn in</div>
              <div className="mt-1 text-2xl font-bold text-slate-900">{costSummary.totalOrders}</div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="text-sm text-slate-500">Tổng số lượng</div>
              <div className="mt-1 text-2xl font-bold text-slate-900">{costSummary.totalQuantity.toLocaleString('vi-VN')}</div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="text-sm text-slate-500">Tổng thành tiền</div>
              <div className="mt-1 text-2xl font-bold text-slate-900">{formatCurrency(costSummary.totalAmount)}</div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="text-sm text-slate-500">Dòng thiếu báo giá</div>
              <div className="mt-1 text-2xl font-bold text-amber-600">{costSummary.missingPriceRows}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="mb-3 text-base font-semibold text-slate-800">Tổng hợp theo xưởng in</div>
              <div className="space-y-3">
                {costSummary.byVendor.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
                    Chưa có dữ liệu theo bộ lọc hiện tại.
                  </div>
                ) : (
                  costSummary.byVendor.map((row) => (
                    <div key={`${row.vendorId}-${row.vendorName}`} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <div className="font-semibold text-slate-900">{row.vendorName || 'Chưa chọn xưởng'}</div>
                          <div className="mt-1 text-xs text-slate-500">
                            {row.totalRows} dòng • {row.totalQuantity.toLocaleString('vi-VN')} sản phẩm
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-slate-900">{formatCurrency(row.totalAmount)}</div>
                          <div className="mt-1 text-xs text-amber-600">Thiếu báo giá: {row.missingPriceRows}</div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="mb-3 text-base font-semibold text-slate-800">Tổng hợp theo sản phẩm in</div>
              <div className="space-y-3">
                {productSummary.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
                    Chưa có dữ liệu sản phẩm theo bộ lọc hiện tại.
                  </div>
                ) : (
                  productSummary.map((row) => (
                    <div key={row.name} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <div className="font-semibold text-slate-900">{row.name}</div>
                          <div className="mt-1 text-xs text-slate-500">{row.orderCount} đơn</div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-slate-900">{row.quantity.toLocaleString('vi-VN')}</div>
                          <div className="mt-1 text-xs text-slate-500">{formatCurrency(row.amount)}</div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-4 py-3">
              <div className="text-base font-semibold text-slate-800">Danh sách dòng chi phí in ấn</div>
              <div className="mt-1 text-sm text-slate-500">
                Dữ liệu lấy từ các dòng sản phẩm in đã lưu trong đơn in.
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-left text-slate-600">
                  <tr>
                    <th className="px-4 py-3 font-medium">Ngày gửi in</th>
                    <th className="px-4 py-3 font-medium">Khách hàng</th>
                    <th className="px-4 py-3 font-medium">Mã HĐ</th>
                    <th className="px-4 py-3 font-medium">Xưởng in</th>
                    <th className="px-4 py-3 font-medium">Kích thước</th>
                    <th className="px-4 py-3 font-medium">Chất liệu</th>
                    <th className="px-4 py-3 font-medium text-right">Số lượng</th>
                    <th className="px-4 py-3 font-medium text-right">Đơn giá</th>
                    <th className="px-4 py-3 font-medium text-right">Thành tiền</th>
                    <th className="px-4 py-3 font-medium text-center">Trạng thái giá</th>
                  </tr>
                </thead>
                <tbody>
                  {costLoading ? (
                    <tr>
                      <td colSpan={10} className="px-4 py-10 text-center text-slate-500">
                        <div className="inline-flex items-center gap-2">
                          <Loader2 size={16} className="animate-spin" />
                          Đang tải dữ liệu chi phí in ấn...
                        </div>
                      </td>
                    </tr>
                  ) : costRows.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="px-4 py-10 text-center text-slate-500">
                        Chưa có dòng chi phí in ấn theo bộ lọc hiện tại.
                      </td>
                    </tr>
                  ) : (
                    costRows.map((row) => (
                      <tr key={row.rowId} className="border-t border-slate-100">
                        <td className="px-4 py-3">{row.ngayGuiIn || '-'}</td>
                        <td className="px-4 py-3 font-medium text-slate-800">{row.tenKhachHang || '-'}</td>
                        <td className="px-4 py-3">{row.contractCode || '-'}</td>
                        <td className="px-4 py-3">{row.vendorName || 'Chưa chọn xưởng'}</td>
                        <td className="px-4 py-3">{row.sizeName || '-'}</td>
                        <td className="px-4 py-3">{row.materialName || '-'}</td>
                        <td className="px-4 py-3 text-right">{Number(row.quantity || 0).toLocaleString('vi-VN')}</td>
                        <td className="px-4 py-3 text-right">{formatCurrency(row.unitPrice)}</td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-900">{formatCurrency(row.amount)}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                            row.pricingStatus === 'matched'
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-amber-50 text-amber-700'
                          }`}>
                            {row.pricingStatus === 'matched' ? 'Đã khớp giá' : 'Thiếu báo giá'}
                          </span>
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


      {catalogManager.open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">
                  Quản lý {getCatalogLabel(catalogManager.type)}
                </h3>
                <p className="text-sm text-slate-500">
                  Thêm mới, sửa hoặc ẩn dữ liệu dùng cho dropdown.
                </p>
              </div>
              <button
                type="button"
                onClick={closeCatalogManager}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 px-5 py-5">
              <div className="flex flex-col gap-2 md:flex-row">
                <input
                  value={catalogManager.value}
                  onChange={(e) =>
                    setCatalogManager((prev) => ({
                      ...prev,
                      value: e.target.value,
                    }))
                  }
                  placeholder={`Nhập ${getCatalogLabel(catalogManager.type)}`}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                />
                <button
                  type="button"
                  onClick={handleSaveCatalogItem}
                  disabled={submitting}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
                >
                  {submitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  {catalogManager.editingId ? 'Lưu sửa' : 'Thêm mới'}
                </button>
              </div>

              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-50 text-left text-slate-600">
                      <tr>
                        <th className="px-4 py-3 font-medium">Tên</th>
                        <th className="px-4 py-3 font-medium text-center">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getCatalogItems(catalogManager.type).length === 0 ? (
                        <tr>
                          <td colSpan={2} className="px-4 py-8 text-center text-slate-500">
                            Chưa có dữ liệu.
                          </td>
                        </tr>
                      ) : (
                        getCatalogItems(catalogManager.type).map((item) => (
                          <tr key={item.id} className="border-t border-slate-100">
                            <td className="px-4 py-3 font-medium text-slate-800">{item.name}</td>
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => startEditCatalogItem(catalogManager.type, item)}
                                  className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                                >
                                  <Pencil size={14} />
                                  Sửa
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteCatalogItem(catalogManager.type, item)}
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
            </div>
          </div>
        </div>
      )}


      {activeTab === 'debts' && (
        <>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Từ ngày</label>
              <input value={debtFrom} onChange={(e) => setDebtFrom(e.target.value)} type="date" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Đến ngày</label>
              <input value={debtTo} onChange={(e) => setDebtTo(e.target.value)} type="date" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Xưởng in</label>
              <select value={debtVendorId} onChange={(e) => setDebtVendorId(e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
                <option value="">Tất cả</option>
                {vendors.map((item) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2 flex items-end gap-2">
              <button type="button" onClick={() => loadDebtData()} className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800">
                <RefreshCw size={16} />
                Tải công nợ
              </button>
              <button type="button" onClick={() => { setDebtFrom(''); setDebtTo(''); setDebtVendorId(''); }} className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                Xóa lọc
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="text-sm text-slate-500">Công nợ đầu kỳ</div>
              <div className="mt-1 text-2xl font-bold text-slate-900">{formatCurrency(totalDebtOpening)}</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="text-sm text-slate-500">Phát sinh trong kỳ</div>
              <div className="mt-1 text-2xl font-bold text-slate-900">{formatCurrency(totalDebtGenerated)}</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="text-sm text-slate-500">Đã thanh toán</div>
              <div className="mt-1 text-2xl font-bold text-emerald-700">{formatCurrency(totalDebtPaid)}</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="text-sm text-slate-500">Còn nợ</div>
              <div className="mt-1 text-2xl font-bold text-amber-700">{formatCurrency(totalDebtRemaining)}</div>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-4 py-3">
              <h3 className="font-semibold text-slate-800">Tổng hợp công nợ theo xưởng in</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-left text-slate-600">
                  <tr>
                    <th className="px-4 py-3 font-medium">Xưởng in</th>
                    <th className="px-4 py-3 font-medium text-right">Công nợ đầu kỳ</th>
                    <th className="px-4 py-3 font-medium text-right">Phát sinh trong kỳ</th>
                    <th className="px-4 py-3 font-medium text-right">Đã thanh toán</th>
                    <th className="px-4 py-3 font-medium text-right">Còn nợ</th>
                  </tr>
                </thead>
                <tbody>
                  {debtLoading ? (
                    <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-500"><div className="inline-flex items-center gap-2"><Loader2 size={16} className="animate-spin" />Đang tải công nợ...</div></td></tr>
                  ) : debtRows.length === 0 ? (
                    <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-500">Chưa có dữ liệu công nợ theo bộ lọc hiện tại.</td></tr>
                  ) : (
                    debtRows.map((row) => (
                      <tr key={row.vendorId} className="border-t border-slate-100">
                        <td className="px-4 py-3 font-medium text-slate-800">{row.vendorName}</td>
                        <td className="px-4 py-3 text-right">{formatCurrency(row.congNoDauKy)}</td>
                        <td className="px-4 py-3 text-right">{formatCurrency(row.phatSinhTrongKy)}</td>
                        <td className="px-4 py-3 text-right text-emerald-700 font-semibold">{formatCurrency(row.daThanhToanTrongKy)}</td>
                        <td className="px-4 py-3 text-right text-amber-700 font-semibold">{formatCurrency(row.conNoCuoiKy)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <div className="border-b border-slate-200 px-4 py-3">
                <h3 className="font-semibold text-slate-800">Công nợ đầu kỳ đã nhập</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 text-left text-slate-600">
                    <tr>
                      <th className="px-4 py-3 font-medium">Xưởng in</th>
                      <th className="px-4 py-3 font-medium">Ngày áp dụng</th>
                      <th className="px-4 py-3 font-medium text-right">Số tiền</th>
                      <th className="px-4 py-3 font-medium text-center">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {openingDebts.length === 0 ? (
                      <tr><td colSpan={4} className="px-4 py-10 text-center text-slate-500">Chưa có công nợ đầu kỳ.</td></tr>
                    ) : (
                      openingDebts.map((row) => (
                        <tr key={row.id} className="border-t border-slate-100">
                          <td className="px-4 py-3">{row.vendorName}</td>
                          <td className="px-4 py-3">{row.ngayApDung}</td>
                          <td className="px-4 py-3 text-right font-semibold">{formatCurrency(row.soTien)}</td>
                          <td className="px-4 py-3 text-center">
                            <button type="button" onClick={() => softDeletePrintVendorOpeningDebt(row.id).then(loadDebtData)} className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50">
                              <Trash2 size={14} />
                              Xóa
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <div className="border-b border-slate-200 px-4 py-3">
                <h3 className="font-semibold text-slate-800">Lịch sử thanh toán xưởng in</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 text-left text-slate-600">
                    <tr>
                      <th className="px-4 py-3 font-medium">Xưởng in</th>
                      <th className="px-4 py-3 font-medium">Ngày thanh toán</th>
                      <th className="px-4 py-3 font-medium text-right">Số tiền</th>
                      <th className="px-4 py-3 font-medium text-center">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.length === 0 ? (
                      <tr><td colSpan={4} className="px-4 py-10 text-center text-slate-500">Chưa có khoản thanh toán nào.</td></tr>
                    ) : (
                      payments.map((row) => (
                        <tr key={row.id} className="border-t border-slate-100">
                          <td className="px-4 py-3">{row.vendorName}</td>
                          <td className="px-4 py-3">{row.ngayThanhToan}</td>
                          <td className="px-4 py-3 text-right font-semibold">{formatCurrency(row.soTien)}</td>
                          <td className="px-4 py-3 text-center">
                            <button type="button" onClick={() => softDeletePrintVendorPayment(row.id).then(loadDebtData)} className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50">
                              <Trash2 size={14} />
                              Xóa
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}


      {openingDebtModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <h3 className="text-lg font-semibold text-slate-800">Thêm công nợ đầu kỳ</h3>
              <button type="button" onClick={() => setOpeningDebtModalOpen(false)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X size={18} /></button>
            </div>
            <div className="space-y-4 px-5 py-5">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Xưởng in</label>
                <select value={openingDebtForm.vendorId} onChange={(e) => setOpeningDebtForm((prev) => ({ ...prev, vendorId: e.target.value }))} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
                  <option value="">Chọn xưởng in</option>
                  {vendors.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Số tiền</label>
                <input value={openingDebtForm.soTien} onChange={(e) => setOpeningDebtForm((prev) => ({ ...prev, soTien: e.target.value }))} type="number" min="0" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Ngày áp dụng</label>
                <input value={openingDebtForm.ngayApDung} onChange={(e) => setOpeningDebtForm((prev) => ({ ...prev, ngayApDung: e.target.value }))} type="date" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Ghi chú</label>
                <textarea value={openingDebtForm.ghiChu} onChange={(e) => setOpeningDebtForm((prev) => ({ ...prev, ghiChu: e.target.value }))} rows={3} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4">
              <button type="button" onClick={() => setOpeningDebtModalOpen(false)} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700">Hủy</button>
              <button type="button" onClick={handleCreateOpeningDebt} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white">Lưu công nợ đầu kỳ</button>
            </div>
          </div>
        </div>
      )}

      {paymentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <h3 className="text-lg font-semibold text-slate-800">Thêm khoản thanh toán</h3>
              <button type="button" onClick={() => setPaymentModalOpen(false)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X size={18} /></button>
            </div>
            <div className="space-y-4 px-5 py-5">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Xưởng in</label>
                <select value={paymentForm.vendorId} onChange={(e) => setPaymentForm((prev) => ({ ...prev, vendorId: e.target.value }))} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
                  <option value="">Chọn xưởng in</option>
                  {vendors.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Số tiền đã thanh toán</label>
                <input value={paymentForm.soTien} onChange={(e) => setPaymentForm((prev) => ({ ...prev, soTien: e.target.value }))} type="number" min="0" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Ngày thanh toán</label>
                <input value={paymentForm.ngayThanhToan} onChange={(e) => setPaymentForm((prev) => ({ ...prev, ngayThanhToan: e.target.value }))} type="date" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Ghi chú</label>
                <textarea value={paymentForm.ghiChu} onChange={(e) => setPaymentForm((prev) => ({ ...prev, ghiChu: e.target.value }))} rows={3} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4">
              <button type="button" onClick={() => setPaymentModalOpen(false)} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700">Hủy</button>
              <button type="button" onClick={handleCreatePayment} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white">Lưu thanh toán</button>
            </div>
          </div>
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
                <div className="mb-1 flex items-center justify-between gap-3">
                  <label className="block text-sm font-medium text-slate-700">Nhà cung cấp</label>
                  <button
                    type="button"
                    onClick={() => openCatalogManager('vendor')}
                    className="text-xs font-medium text-blue-600 hover:text-blue-700"
                  >
                    Quản lý
                  </button>
                </div>
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
                <div className="mb-1 flex items-center justify-between gap-3">
                  <label className="block text-sm font-medium text-slate-700">Kích thước</label>
                  <button
                    type="button"
                    onClick={() => openCatalogManager('size')}
                    className="text-xs font-medium text-blue-600 hover:text-blue-700"
                  >
                    Quản lý
                  </button>
                </div>
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
                <div className="mb-1 flex items-center justify-between gap-3">
                  <label className="block text-sm font-medium text-slate-700">Chất liệu</label>
                  <button
                    type="button"
                    onClick={() => openCatalogManager('material')}
                    className="text-xs font-medium text-blue-600 hover:text-blue-700"
                  >
                    Quản lý
                  </button>
                </div>
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
