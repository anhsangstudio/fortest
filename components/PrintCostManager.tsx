import React, { useEffect, useMemo, useState } from 'react';
import {
  Plus,
  RefreshCw,
  Search,
  Package,
  BarChart3,
  Edit,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import {
  fetchPrintCatalogs,
  fetchPrintVendorPrices,
  fetchPrintCostData,
  createPrintVendorPrice,
  updatePrintVendorPrice,
  softDeletePrintVendorPrice,
} from '../apiService';
import {
  PrintVendorPrice,
  PrintCostRow,
  PrintCostSummary,
} from '../types';

type CatalogOption = {
  id: string;
  name: string;
};

type VendorPriceForm = {
  vendorId: string;
  sizeId: string;
  materialId: string;
  printServiceId: string;
  donGia: number;
  ghiChu: string;
};

const defaultSummary: PrintCostSummary = {
  totalRows: 0,
  totalOrders: 0,
  totalQuantity: 0,
  totalAmount: 0,
  missingPriceRows: 0,
  byVendor: [],
};

export default function PrintCostManager() {
  const [activeTab, setActiveTab] = useState<'pricing' | 'cost'>('pricing');
  const [loading, setLoading] = useState(false);

  const [vendors, setVendors] = useState<CatalogOption[]>([]);
  const [sizes, setSizes] = useState<CatalogOption[]>([]);
  const [materials, setMaterials] = useState<CatalogOption[]>([]);

  const [prices, setPrices] = useState<PrintVendorPrice[]>([]);
  const [costRows, setCostRows] = useState<PrintCostRow[]>([]);
  const [summary, setSummary] = useState<PrintCostSummary>(defaultSummary);

  const [search, setSearch] = useState('');
  const [vendorFilter, setVendorFilter] = useState('');
  const [sizeFilter, setSizeFilter] = useState('');
  const [materialFilter, setMaterialFilter] = useState('');

  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [costVendorFilter, setCostVendorFilter] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<PrintVendorPrice | null>(null);

  const [form, setForm] = useState<VendorPriceForm>({
    vendorId: '',
    sizeId: '',
    materialId: '',
    printServiceId: '',
    donGia: 0,
    ghiChu: '',
  });

  const loadPricingData = async () => {
    setLoading(true);
    try {
      const catalogs = await fetchPrintCatalogs();
      setVendors(
        (catalogs.vendors || []).map((x: any) => ({
          id: x.id,
          name: x.name || x.ten_xuong_in || '',
        }))
      );
      setSizes(
        (catalogs.sizes || []).map((x: any) => ({
          id: x.id,
          name: x.name || x.ten_kich_thuoc || '',
        }))
      );
      setMaterials(
        (catalogs.materials || []).map((x: any) => ({
          id: x.id,
          name: x.name || x.ten_chat_lieu || '',
        }))
      );

      const data = await fetchPrintVendorPrices({ isActive: true });
      setPrices(data);
    } finally {
      setLoading(false);
    }
  };

  const loadCostData = async () => {
    setLoading(true);
    try {
      const result = await fetchPrintCostData({
        from: dateFrom || undefined,
        to: dateTo || undefined,
        vendorId: costVendorFilter || undefined,
      });

      setCostRows(result.rows || []);
      setSummary(result.summary || defaultSummary);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPricingData();
    loadCostData();
  }, []);

  const filteredPrices = useMemo(() => {
    return prices.filter((item) => {
      const matchSearch =
        !search ||
        item.vendorName?.toLowerCase().includes(search.toLowerCase()) ||
        item.sizeName?.toLowerCase().includes(search.toLowerCase()) ||
        item.materialName?.toLowerCase().includes(search.toLowerCase()) ||
        item.ghiChu?.toLowerCase().includes(search.toLowerCase());

      const matchVendor =
        !vendorFilter || item.vendorId === vendorFilter;

      const matchSize =
        !sizeFilter || item.sizeId === sizeFilter;

      const matchMaterial =
        !materialFilter || item.materialId === materialFilter;

      return (
        matchSearch &&
        matchVendor &&
        matchSize &&
        matchMaterial
      );
    });
  }, [
    prices,
    search,
    vendorFilter,
    sizeFilter,
    materialFilter,
  ]);

  const openCreateModal = () => {
    setEditingItem(null);
    setForm({
      vendorId: '',
      sizeId: '',
      materialId: '',
      printServiceId: '',
      donGia: 0,
      ghiChu: '',
    });
    setShowModal(true);
  };

  const openEditModal = (item: PrintVendorPrice) => {
    setEditingItem(item);
    setForm({
      vendorId: item.vendorId,
      sizeId: item.sizeId || '',
      materialId: item.materialId || '',
      printServiceId: item.printServiceId || '',
      donGia: item.donGia,
      ghiChu: item.ghiChu || '',
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.vendorId || !form.sizeId || !form.materialId) {
      alert('Vui lòng nhập đủ thông tin');
      return;
    }

    const payload = {
      vendorId: form.vendorId,
      sizeId: form.sizeId,
      materialId: form.materialId,
      printServiceId: form.printServiceId || null,
      donGia: Number(form.donGia || 0),
      ghiChu: form.ghiChu,
      isActive: true,
    };

    if (editingItem) {
      await updatePrintVendorPrice(editingItem.id, payload);
    } else {
      await createPrintVendorPrice(payload);
    }

    setShowModal(false);
    await loadPricingData();
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Xác nhận xóa báo giá này?')) return;
    await softDeletePrintVendorPrice(id);
    await loadPricingData();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black">Chi phí in ấn</h1>
          <p className="text-slate-500">
            Quản lý báo giá và chi phí in theo dữ liệu thật.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() =>
              activeTab === 'pricing'
                ? loadPricingData()
                : loadCostData()
            }
            className="px-4 py-2 border rounded-xl flex items-center gap-2"
          >
            <RefreshCw size={16} />
            Tải lại
          </button>

          {activeTab === 'pricing' && (
            <button
              onClick={openCreateModal}
              className="px-4 py-2 bg-slate-900 text-white rounded-xl flex items-center gap-2"
            >
              <Plus size={16} />
              Thêm mới sản phẩm in
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-2 border-b">
        <button
          onClick={() => setActiveTab('pricing')}
          className={`px-4 py-2 ${
            activeTab === 'pricing'
              ? 'border-b-2 border-blue-600 font-bold'
              : ''
          }`}
        >
          Báo giá in ấn
        </button>
        <button
          onClick={() => setActiveTab('cost')}
          className={`px-4 py-2 ${
            activeTab === 'cost'
              ? 'border-b-2 border-blue-600 font-bold'
              : ''
          }`}
        >
          Chi phí in ấn
        </button>
      </div>

      {activeTab === 'pricing' && (
        <>
          <div className="grid grid-cols-4 gap-4">
            <input
              className="border rounded-xl px-3 py-2"
              placeholder="Tìm kiếm..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            <select
              className="border rounded-xl px-3 py-2"
              value={vendorFilter}
              onChange={(e) => setVendorFilter(e.target.value)}
            >
              <option value="">Tất cả NCC</option>
              {vendors.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>

            <select
              className="border rounded-xl px-3 py-2"
              value={sizeFilter}
              onChange={(e) => setSizeFilter(e.target.value)}
            >
              <option value="">Tất cả size</option>
              {sizes.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>

            <select
              className="border rounded-xl px-3 py-2"
              value={materialFilter}
              onChange={(e) => setMaterialFilter(e.target.value)}
            >
              <option value="">Tất cả chất liệu</option>
              {materials.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </div>

          <table className="w-full border rounded-xl overflow-hidden">
            <thead className="bg-slate-100">
              <tr>
                <th className="p-3 text-left">Nhà cung cấp</th>
                <th className="p-3 text-left">Kích thước</th>
                <th className="p-3 text-left">Chất liệu</th>
                <th className="p-3 text-left">Đơn giá</th>
                <th className="p-3 text-left">Ghi chú</th>
                <th className="p-3 text-left">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredPrices.map((item) => (
                <tr key={item.id} className="border-t">
                  <td className="p-3">{item.vendorName}</td>
                  <td className="p-3">{item.sizeName}</td>
                  <td className="p-3">{item.materialName}</td>
                  <td className="p-3">
                    {item.donGia.toLocaleString()} đ
                  </td>
                  <td className="p-3">{item.ghiChu}</td>
                  <td className="p-3 flex gap-2">
                    <button
                      onClick={() => openEditModal(item)}
                      className="border rounded-lg px-3 py-1"
                    >
                      Sửa
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="border border-red-500 text-red-500 rounded-lg px-3 py-1"
                    >
                      Xóa
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {activeTab === 'cost' && (
        <>
          <div className="grid grid-cols-3 gap-4">
            <input
              type="date"
              className="border rounded-xl px-3 py-2"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
            <input
              type="date"
              className="border rounded-xl px-3 py-2"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
            <select
              className="border rounded-xl px-3 py-2"
              value={costVendorFilter}
              onChange={(e) =>
                setCostVendorFilter(e.target.value)
              }
            >
              <option value="">Tất cả NCC</option>
              {vendors.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={loadCostData}
            className="px-4 py-2 bg-slate-900 text-white rounded-xl"
          >
            Lọc dữ liệu
          </button>

          <div className="grid grid-cols-5 gap-4">
            <SummaryCard
              title="Tổng dòng"
              value={summary.totalRows}
            />
            <SummaryCard
              title="Tổng đơn"
              value={summary.totalOrders}
            />
            <SummaryCard
              title="Tổng SL"
              value={summary.totalQuantity}
            />
            <SummaryCard
              title="Tổng tiền"
              value={`${summary.totalAmount.toLocaleString()} đ`}
            />
            <SummaryCard
              title="Thiếu báo giá"
              value={summary.missingPriceRows}
            />
          </div>

          <table className="w-full border rounded-xl overflow-hidden">
            <thead className="bg-slate-100">
              <tr>
                <th className="p-3 text-left">Khách hàng</th>
                <th className="p-3 text-left">Loại</th>
                <th className="p-3 text-left">Kích thước</th>
                <th className="p-3 text-left">Chất liệu</th>
                <th className="p-3 text-left">SL</th>
                <th className="p-3 text-left">NCC</th>
                <th className="p-3 text-left">Đơn giá</th>
                <th className="p-3 text-left">Thành tiền</th>
                <th className="p-3 text-left">Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {costRows.map((row) => (
                <tr key={row.rowId} className="border-t">
                  <td className="p-3">{row.tenKhachHang}</td>
                  <td className="p-3">{row.lineType}</td>
                  <td className="p-3">{row.sizeName}</td>
                  <td className="p-3">{row.materialName}</td>
                  <td className="p-3">{row.quantity}</td>
                  <td className="p-3">{row.vendorName}</td>
                  <td className="p-3">
                    {row.unitPrice
                      ? `${row.unitPrice.toLocaleString()} đ`
                      : '-'}
                  </td>
                  <td className="p-3">
                    {row.amount
                      ? `${row.amount.toLocaleString()} đ`
                      : '-'}
                  </td>
                  <td className="p-3">
                    {row.pricingStatus === 'missing_price' ? (
                      <span className="text-red-500 font-bold">
                        Thiếu giá
                      </span>
                    ) : (
                      <span className="text-green-600 font-bold">
                        Khớp giá
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center">
          <div className="bg-white p-6 rounded-2xl w-[500px] space-y-4">
            <h2 className="font-bold text-lg">
              {editingItem
                ? 'Sửa báo giá'
                : 'Thêm mới sản phẩm in'}
            </h2>

            <select
              className="w-full border rounded-xl px-3 py-2"
              value={form.vendorId}
              onChange={(e) =>
                setForm({
                  ...form,
                  vendorId: e.target.value,
                })
              }
            >
              <option value="">Chọn NCC</option>
              {vendors.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>

            <select
              className="w-full border rounded-xl px-3 py-2"
              value={form.sizeId}
              onChange={(e) =>
                setForm({
                  ...form,
                  sizeId: e.target.value,
                })
              }
            >
              <option value="">Chọn size</option>
              {sizes.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>

            <select
              className="w-full border rounded-xl px-3 py-2"
              value={form.materialId}
              onChange={(e) =>
                setForm({
                  ...form,
                  materialId: e.target.value,
                })
              }
            >
              <option value="">Chọn chất liệu</option>
              {materials.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>

            <input
              type="number"
              className="w-full border rounded-xl px-3 py-2"
              placeholder="Đơn giá"
              value={form.donGia}
              onChange={(e) =>
                setForm({
                  ...form,
                  donGia: Number(e.target.value),
                })
              }
            />

            <textarea
              className="w-full border rounded-xl px-3 py-2"
              placeholder="Ghi chú"
              value={form.ghiChu}
              onChange={(e) =>
                setForm({
                  ...form,
                  ghiChu: e.target.value,
                })
              }
            />

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 border rounded-xl"
              >
                Hủy
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl"
              >
                Lưu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({
  title,
  value,
}: {
  title: string;
  value: any;
}) {
  return (
    <div className="border rounded-2xl p-4">
      <div className="text-sm text-slate-500">{title}</div>
      <div className="text-2xl font-black">{value}</div>
    </div>
  );
}
