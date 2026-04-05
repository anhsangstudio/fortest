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
} from 'lucide-react';
import ResponsiveModal from './ResponsiveModal';
import {
  fetchPhotoIdOrders,
  searchPhotoIdOrdersByPhone,
  fetchPhotoPaperInventory,
  createPhotoPaperStockIn,
  createPhotoIdOrder,
} from '../apiService';
import type { Staff } from '../types';

type PhotoIdOrderRow = {
  id: string;
  orderCode: string;
  orderDatetime: string;
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

const EMPTY_ORDER_FORM: OrderFormState = {
  orderDatetime: new Date().toISOString().slice(0, 16),
  customerName: '',
  customerPhone: '',
  printPaperQuantity: '1',
  amount: '',
  paymentMethod: 'Tiền mặt',
  driveFileUrl: '',
  driveFileId: '',
  note: '',
  isReprint: false,
};

const EMPTY_STOCK_IN_FORM: StockInFormState = {
  paperInventoryId: '',
  quantity: '',
  unitCost: '',
  note: '',
};

const formatCurrency = (value?: number | string | null) => {
  const amount = Number(value || 0);
  return `${amount.toLocaleString('vi-VN')} đ`;
};

const formatDateTime = (value?: string | null) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('vi-VN');
};

const normalizePhone = (value: string) => value.replace(/\s+/g, '').trim();

export default function PhotoIDManager({ currentUser }: PhotoIDManagerProps) {
  const [activeTab, setActiveTab] = useState<'orders' | 'lookup' | 'inventory'>('orders');

  const [orders, setOrders] = useState<PhotoIdOrderRow[]>([]);
  const [inventory, setInventory] = useState<PhotoPaperInventoryRow[]>([]);

  const [loadingOrders, setLoadingOrders] = useState(false);
  const [loadingInventory, setLoadingInventory] = useState(false);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [submittingStockIn, setSubmittingStockIn] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [stockInModalOpen, setStockInModalOpen] = useState(false);

  const [orderForm, setOrderForm] = useState<OrderFormState>(EMPTY_ORDER_FORM);
  const [stockInForm, setStockInForm] = useState<StockInFormState>(EMPTY_STOCK_IN_FORM);

  const [lookupPhone, setLookupPhone] = useState('');
  const [lookupResults, setLookupResults] = useState<PhotoIdOrderRow[]>([]);

  const lowStockItems = useMemo(
    () => inventory.filter((item) => item.currentQuantity <= item.warningThreshold),
    [inventory]
  );

  const resetOrderForm = () => {
    setOrderForm({
      ...EMPTY_ORDER_FORM,
      orderDatetime: new Date().toISOString().slice(0, 16),
    });
  };

  const resetStockInForm = () => {
    setStockInForm({
      ...EMPTY_STOCK_IN_FORM,
      paperInventoryId: inventory[0]?.id || '',
    });
  };

  const loadOrders = async () => {
    try {
      setLoadingOrders(true);
      const data = await fetchPhotoIdOrders();
      setOrders((data || []) as PhotoIdOrderRow[]);
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

  useEffect(() => {
    loadOrders();
    loadInventory();
  }, []);

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
        orderDatetime: new Date(orderForm.orderDatetime).toISOString(),
        isReprint: orderForm.isReprint,
      } as any);

      alert('Đã tạo đơn ảnh thẻ thành công.');
      setCreateModalOpen(false);
      resetOrderForm();
      await Promise.all([loadOrders(), loadInventory()]);
    } catch (error: any) {
      alert(error.message || 'Tạo đơn ảnh thẻ thất bại');
    } finally {
      setSubmittingOrder(false);
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
      await loadInventory();
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

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm">
          <div className="text-xs font-black uppercase tracking-widest text-slate-400">Tổng đơn ảnh thẻ</div>
          <div className="mt-2 text-3xl font-black text-slate-900">{orders.length}</div>
        </div>
        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm">
          <div className="text-xs font-black uppercase tracking-widest text-slate-400">Doanh thu đơn đã lưu</div>
          <div className="mt-2 text-3xl font-black text-slate-900">
            {formatCurrency(orders.reduce((sum, item) => sum + Number(item.amount || 0), 0))}
          </div>
        </div>
        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm">
          <div className="text-xs font-black uppercase tracking-widest text-slate-400">Mã kho giấy</div>
          <div className="mt-2 text-3xl font-black text-slate-900">{inventory.length}</div>
        </div>
        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm">
          <div className="text-xs font-black uppercase tracking-widest text-slate-400">Giấy sắp hết</div>
          <div className="mt-2 text-3xl font-black text-red-600">{lowStockItems.length}</div>
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
      </div>

      {activeTab === 'orders' && (
        <div className="space-y-4">
          <div className="bg-white rounded-3xl p-4 border border-slate-200 shadow-sm flex flex-wrap gap-3 justify-between items-center">
            <div>
              <div className="text-lg font-black text-slate-900">Danh sách đơn ảnh thẻ</div>
              <div className="text-sm text-slate-500">Tạo đơn mới, lưu link ảnh và đồng bộ doanh thu.</div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={loadOrders}
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
                  </tr>
                </thead>
                <tbody>
                  {loadingOrders ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-10 text-center text-slate-500 font-bold">
                        <span className="inline-flex items-center gap-2"><Loader2 size={16} className="animate-spin" /> Đang tải dữ liệu...</span>
                      </td>
                    </tr>
                  ) : orders.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-10 text-center text-slate-500 font-bold">
                        Chưa có đơn ảnh thẻ nào.
                      </td>
                    </tr>
                  ) : (
                    orders.map((item) => (
                      <tr key={item.id} className="border-t border-slate-100 align-top">
                        <td className="px-4 py-4 whitespace-nowrap">{formatDateTime(item.orderDatetime)}</td>
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
                        <td className="px-4 py-4 min-w-[240px]">{item.note || ''}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
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
                    <th className="px-4 py-4">Số giấy</th>
                    <th className="px-4 py-4">Số tiền</th>
                    <th className="px-4 py-4">Ảnh</th>
                    <th className="px-4 py-4">Ghi chú</th>
                  </tr>
                </thead>
                <tbody>
                  {lookupLoading ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-10 text-center text-slate-500 font-bold">
                        <span className="inline-flex items-center gap-2"><Loader2 size={16} className="animate-spin" /> Đang tra cứu...</span>
                      </td>
                    </tr>
                  ) : lookupResults.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-10 text-center text-slate-500 font-bold">
                        Chưa có kết quả tra cứu.
                      </td>
                    </tr>
                  ) : (
                    lookupResults.map((item) => (
                      <tr key={item.id} className="border-t border-slate-100 align-top">
                        <td className="px-4 py-4 whitespace-nowrap">{formatDateTime(item.orderDatetime)}</td>
                        <td className="px-4 py-4 font-black whitespace-nowrap">{item.orderCode}</td>
                        <td className="px-4 py-4">{item.customerName}</td>
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
                        <td className="px-4 py-4 min-w-[240px]">{item.note || ''}</td>
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
              <div className="mt-1 text-sm text-slate-500">Theo dõi tồn kho, ngưỡng cảnh báo và giá vốn trung bình.</div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={loadInventory}
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
                <div className="font-black">Có giấy đang ở mức cảnh báo.</div>
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
                    <th className="px-4 py-4">Ngưỡng cảnh báo</th>
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
                        <td className="px-4 py-4">{item.warningThreshold}</td>
                        <td className="px-4 py-4">{formatCurrency(item.averageCost)}</td>
                        <td className="px-4 py-4">
                          {item.currentQuantity <= item.warningThreshold ? (
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

      <ResponsiveModal open={createModalOpen} onClose={() => setCreateModalOpen(false)} size="lg">
        <form onSubmit={handleCreateOrder} className="flex flex-col max-h-[90vh]">
          <div className="px-6 py-5 border-b border-slate-200">
            <div className="text-xl font-black text-slate-900">Tạo đơn ảnh thẻ</div>
            <div className="text-sm text-slate-500 mt-1">Lưu đơn, đồng bộ khoản thu và trừ giấy trong kho.</div>
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
            <button type="button" onClick={() => setCreateModalOpen(false)} className="px-4 py-3 rounded-2xl bg-slate-100 text-slate-700 font-black text-sm">
              Đóng
            </button>
            <button type="submit" disabled={submittingOrder || uploadingFile} className="px-4 py-3 rounded-2xl bg-blue-600 text-white font-black text-sm inline-flex items-center gap-2">
              {submittingOrder ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} Lưu đơn
            </button>
          </div>
        </form>
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
                <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Đơn giá / tờ</label>
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
                rows={3}
                value={stockInForm.note}
                onChange={(e) => setStockInForm((prev) => ({ ...prev, note: e.target.value }))}
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ví dụ: nhập thêm 2 ram giấy"
              />
            </div>
          </div>

          <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-3">
            <button type="button" onClick={() => setStockInModalOpen(false)} className="px-4 py-3 rounded-2xl bg-slate-100 text-slate-700 font-black text-sm">
              Đóng
            </button>
            <button type="submit" disabled={submittingStockIn} className="px-4 py-3 rounded-2xl bg-blue-600 text-white font-black text-sm inline-flex items-center gap-2">
              {submittingStockIn ? <Loader2 size={16} className="animate-spin" /> : <Package size={16} />} Xác nhận nhập kho
            </button>
          </div>
        </form>
      </ResponsiveModal>
    </div>
  );
}
