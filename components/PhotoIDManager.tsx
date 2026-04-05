import React, { useEffect, useMemo, useState } from 'react';
import { Search, Plus, RefreshCw, AlertTriangle, ExternalLink, Download, Package, Save, ImagePlus } from 'lucide-react';
import { Staff } from '../types';
import {
  fetchPhotoIdOrders,
  searchPhotoIdOrdersByPhone,
  fetchPhotoPaperInventory,
  createPhotoPaperStockIn,
  createPhotoIdOrder,
} from '../apiService';

type Props = {
  currentUser: Staff | null;
};

type OrderRow = {
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
};

type InventoryRow = {
  id: string;
  paperName: string;
  unit: string;
  currentQuantity: number;
  warningThreshold: number;
  averageCost: number;
  isLowStock?: boolean;
};

const formatMoney = (value: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(value || 0));

const formatDateTime = (value?: string) => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString('vi-VN');
};

const extractDriveFileId = (url: string) => {
  if (!url) return '';
  const match1 = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (match1?.[1]) return match1[1];
  const match2 = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (match2?.[1]) return match2[1];
  return '';
};

const PhotoIDManager: React.FC<Props> = ({ currentUser }) => {
  const [activeTab, setActiveTab] = useState<'orders' | 'lookup' | 'inventory'>('orders');
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [inventory, setInventory] = useState<InventoryRow[]>([]);
  const [lookupPhone, setLookupPhone] = useState('');
  const [lookupResults, setLookupResults] = useState<OrderRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    orderDatetime: new Date().toISOString().slice(0, 16),
    customerName: '',
    customerPhone: '',
    printPaperQuantity: 1,
    amount: 0,
    paymentMethod: 'Tiền mặt',
    driveFileUrl: '',
    driveFileId: '',
    note: '',
  });

  const [stockInForm, setStockInForm] = useState({
    paperInventoryId: '',
    quantity: 0,
    unitCost: 0,
    note: '',
  });

  const activeInventory = useMemo(
    () => inventory.find(item => item.id === stockInForm.paperInventoryId) || inventory[0] || null,
    [inventory, stockInForm.paperInventoryId]
  );

  const totalOrderRevenue = useMemo(
    () => orders.reduce((sum, item) => sum + Number(item.amount || 0), 0),
    [orders]
  );

  const loadOrders = async () => {
    const rows = await fetchPhotoIdOrders();
    setOrders(rows as unknown as OrderRow[]);
  };

  const loadInventory = async () => {
    const rows = await fetchPhotoPaperInventory();
    const mapped = rows as unknown as InventoryRow[];
    setInventory(mapped);
    if (mapped.length > 0) {
      setStockInForm(prev => ({
        ...prev,
        paperInventoryId: prev.paperInventoryId || mapped[0].id,
      }));
    }
  };

  const loadBootstrap = async () => {
    setIsLoading(true);
    setError('');
    try {
      await Promise.all([loadOrders(), loadInventory()]);
    } catch (e: any) {
      setError(e.message || 'Không tải được dữ liệu module ảnh thẻ');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBootstrap();
  }, []);

  const resetOrderForm = () => {
    setForm({
      orderDatetime: new Date().toISOString().slice(0, 16),
      customerName: '',
      customerPhone: '',
      printPaperQuantity: 1,
      amount: 0,
      paymentMethod: 'Tiền mặt',
      driveFileUrl: '',
      driveFileId: '',
      note: '',
    });
  };

  const handleUploadFile = async (file: File) => {
    if (!file) return;
    if (!form.customerPhone.trim()) {
      setError('Hãy nhập số điện thoại trước khi upload file.');
      return;
    }

    setIsLoading(true);
    setError('');
    setMessage('');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append(
        'metadata',
        JSON.stringify({
          module: 'PHOTO_ID',
          customerPhone: form.customerPhone.trim(),
          timestamp: Date.now(),
          staffName: currentUser?.name || 'Staff',
        })
      );

      const response = await fetch('/api/drive_upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (!response.ok || !data?.success) {
        throw new Error(data?.error || 'Upload file thất bại');
      }

      setForm(prev => ({
        ...prev,
        driveFileUrl: data.url || '',
        driveFileId: data.fileId || extractDriveFileId(data.url || ''),
      }));
      setMessage('Upload file ảnh thành công.');
    } catch (e: any) {
      setError(e.message || 'Upload file thất bại');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!form.customerName.trim()) return setError('Vui lòng nhập tên khách hàng.');
    if (!form.customerPhone.trim()) return setError('Vui lòng nhập số điện thoại.');
    if (Number(form.printPaperQuantity) <= 0) return setError('Số lượng giấy in phải lớn hơn 0.');
    if (Number(form.amount) < 0) return setError('Số tiền không hợp lệ.');

    setIsLoading(true);
    try {
      await createPhotoIdOrder({
        customerName: form.customerName.trim(),
        customerPhone: form.customerPhone.trim(),
        printPaperQuantity: Number(form.printPaperQuantity || 0),
        amount: Number(form.amount || 0),
        paymentMethod: form.paymentMethod,
        driveFileUrl: form.driveFileUrl || '',
        driveFileId: form.driveFileId || extractDriveFileId(form.driveFileUrl || ''),
        note: form.note,
        createdBy: currentUser?.id || null,
        orderDatetime: form.orderDatetime ? new Date(form.orderDatetime).toISOString() : new Date().toISOString(),
      });

      setMessage('Đã tạo đơn ảnh thẻ thành công.');
      resetOrderForm();
      await Promise.all([loadOrders(), loadInventory()]);
    } catch (e: any) {
      setError(e.message || 'Tạo đơn ảnh thẻ thất bại');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLookup = async () => {
    setError('');
    setMessage('');
    if (!lookupPhone.trim()) {
      setLookupResults([]);
      return setError('Vui lòng nhập số điện thoại để tra cứu.');
    }

    setIsLoading(true);
    try {
      const rows = await searchPhotoIdOrdersByPhone(lookupPhone.trim());
      setLookupResults(rows as unknown as OrderRow[]);
      if (!rows.length) setMessage('Không tìm thấy dữ liệu phù hợp.');
    } catch (e: any) {
      setError(e.message || 'Tra cứu thất bại');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStockIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!stockInForm.paperInventoryId) return setError('Vui lòng chọn loại giấy.');
    if (Number(stockInForm.quantity) <= 0) return setError('Số lượng nhập phải lớn hơn 0.');
    if (Number(stockInForm.unitCost) < 0) return setError('Đơn giá không hợp lệ.');

    setIsLoading(true);
    try {
      await createPhotoPaperStockIn({
        paperInventoryId: stockInForm.paperInventoryId,
        quantity: Number(stockInForm.quantity || 0),
        unitCost: Number(stockInForm.unitCost || 0),
        note: stockInForm.note,
        createdBy: currentUser?.id || null,
      });

      setMessage('Đã nhập kho giấy thành công.');
      setStockInForm(prev => ({ ...prev, quantity: 0, unitCost: 0, note: '' }));
      await loadInventory();
    } catch (e: any) {
      setError(e.message || 'Nhập kho thất bại');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Module Ảnh thẻ</h2>
          <p className="mt-1 text-sm text-slate-500">Tạo đơn ảnh thẻ, tra cứu file theo số điện thoại và quản lý kho giấy.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={loadBootstrap}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw size={16} /> Tải lại dữ liệu
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl bg-white p-4 shadow-sm border border-slate-200">
          <p className="text-sm text-slate-500">Tổng đơn ảnh thẻ</p>
          <p className="mt-2 text-2xl font-bold text-slate-800">{orders.length}</p>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-sm border border-slate-200">
          <p className="text-sm text-slate-500">Doanh thu tạm tính</p>
          <p className="mt-2 text-2xl font-bold text-emerald-600">{formatMoney(totalOrderRevenue)}</p>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-sm border border-slate-200">
          <p className="text-sm text-slate-500">Loại giấy đang quản lý</p>
          <p className="mt-2 text-2xl font-bold text-slate-800">{inventory.length}</p>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-sm border border-slate-200">
          <p className="text-sm text-slate-500">Loại giấy sắp hết</p>
          <p className="mt-2 text-2xl font-bold text-amber-600">{inventory.filter(item => item.isLowStock).length}</p>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}
      {message && !error && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div>
      )}

      <div className="flex flex-wrap gap-2">
        {[
          { key: 'orders', label: 'Đơn ảnh thẻ' },
          { key: 'lookup', label: 'Tra cứu ảnh cũ' },
          { key: 'inventory', label: 'Kho giấy' },
        ].map(tab => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key as 'orders' | 'lookup' | 'inventory')}
            className={`rounded-xl px-4 py-2 text-sm font-medium ${
              activeTab === tab.key
                ? 'bg-blue-600 text-white'
                : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'orders' && (
        <div className="grid gap-6 xl:grid-cols-[420px,1fr]">
          <form onSubmit={handleCreateOrder} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-lg font-semibold text-slate-800">
              <Plus size={18} /> Tạo đơn ảnh thẻ
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Dấu thời gian</label>
              <input
                type="datetime-local"
                value={form.orderDatetime}
                onChange={e => setForm(prev => ({ ...prev, orderDatetime: e.target.value }))}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Tên khách hàng</label>
              <input
                value={form.customerName}
                onChange={e => setForm(prev => ({ ...prev, customerName: e.target.value }))}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-blue-500"
                placeholder="Nhập tên khách hàng"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Số điện thoại</label>
              <input
                value={form.customerPhone}
                onChange={e => setForm(prev => ({ ...prev, customerPhone: e.target.value }))}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-blue-500"
                placeholder="Nhập số điện thoại"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Số lượng giấy in</label>
                <input
                  type="number"
                  min={1}
                  value={form.printPaperQuantity}
                  onChange={e => setForm(prev => ({ ...prev, printPaperQuantity: Number(e.target.value || 0) }))}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Số tiền</label>
                <input
                  type="number"
                  min={0}
                  value={form.amount}
                  onChange={e => setForm(prev => ({ ...prev, amount: Number(e.target.value || 0) }))}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Phương thức thanh toán</label>
              <select
                value={form.paymentMethod}
                onChange={e => setForm(prev => ({ ...prev, paymentMethod: e.target.value }))}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-blue-500"
              >
                <option value="Tiền mặt">Tiền mặt</option>
                <option value="Chuyển khoản">Chuyển khoản</option>
              </select>
            </div>

            <div className="rounded-xl border border-dashed border-slate-300 p-3">
              <label className="mb-2 block text-sm font-medium text-slate-700">Upload file ảnh lên Drive</label>
              <input
                type="file"
                accept="image/*"
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) handleUploadFile(file);
                }}
                className="block w-full text-sm"
              />
              {form.driveFileUrl && (
                <div className="mt-3 rounded-lg bg-slate-50 p-3 text-sm">
                  <div className="font-medium text-slate-700">Đã có link file:</div>
                  <a href={form.driveFileUrl} target="_blank" rel="noreferrer" className="mt-1 block break-all text-blue-600 hover:underline">
                    {form.driveFileUrl}
                  </a>
                </div>
              )}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Ghi chú</label>
              <textarea
                rows={3}
                value={form.note}
                onChange={e => setForm(prev => ({ ...prev, note: e.target.value }))}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-blue-500"
                placeholder="Ghi chú thêm nếu có"
              />
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={isLoading}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
              >
                <Save size={16} /> Lưu đơn ảnh thẻ
              </button>
              <button
                type="button"
                onClick={resetOrderForm}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Làm mới form
              </button>
            </div>
          </form>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-800">
              <ImagePlus size={18} /> Danh sách đơn ảnh thẻ
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b bg-slate-50 text-left text-slate-600">
                    <th className="px-3 py-2">Thời gian</th>
                    <th className="px-3 py-2">Mã đơn</th>
                    <th className="px-3 py-2">Khách hàng</th>
                    <th className="px-3 py-2">SĐT</th>
                    <th className="px-3 py-2">SL giấy</th>
                    <th className="px-3 py-2">Số tiền</th>
                    <th className="px-3 py-2">Thanh toán</th>
                    <th className="px-3 py-2">File ảnh</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map(item => (
                    <tr key={item.id} className="border-b last:border-b-0 hover:bg-slate-50">
                      <td className="px-3 py-2">{formatDateTime(item.orderDatetime)}</td>
                      <td className="px-3 py-2 font-medium text-slate-800">{item.orderCode}</td>
                      <td className="px-3 py-2">{item.customerName}</td>
                      <td className="px-3 py-2">{item.customerPhone}</td>
                      <td className="px-3 py-2">{item.printPaperQuantity}</td>
                      <td className="px-3 py-2">{formatMoney(item.amount)}</td>
                      <td className="px-3 py-2">{item.paymentMethod || ''}</td>
                      <td className="px-3 py-2">
                        {item.driveFileUrl ? (
                          <a href={item.driveFileUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                            Mở file
                          </a>
                        ) : (
                          <span className="text-slate-400">Chưa có</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {!orders.length && (
                    <tr>
                      <td colSpan={8} className="px-3 py-6 text-center text-slate-500">
                        Chưa có đơn ảnh thẻ nào.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'lookup' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-end">
            <div className="flex-1">
              <label className="mb-1 block text-sm font-medium text-slate-700">Nhập số điện thoại khách hàng</label>
              <input
                value={lookupPhone}
                onChange={e => setLookupPhone(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-blue-500"
                placeholder="Ví dụ: 0987654321"
              />
            </div>
            <button
              type="button"
              onClick={handleLookup}
              disabled={isLoading}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
            >
              <Search size={16} /> Tra cứu ảnh cũ
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b bg-slate-50 text-left text-slate-600">
                  <th className="px-3 py-2">Thời gian</th>
                  <th className="px-3 py-2">Mã đơn</th>
                  <th className="px-3 py-2">Khách hàng</th>
                  <th className="px-3 py-2">SĐT</th>
                  <th className="px-3 py-2">SL giấy</th>
                  <th className="px-3 py-2">Số tiền</th>
                  <th className="px-3 py-2">Ghi chú</th>
                  <th className="px-3 py-2">Tác vụ</th>
                </tr>
              </thead>
              <tbody>
                {lookupResults.map(item => (
                  <tr key={item.id} className="border-b last:border-b-0 hover:bg-slate-50 align-top">
                    <td className="px-3 py-2">{formatDateTime(item.orderDatetime)}</td>
                    <td className="px-3 py-2 font-medium text-slate-800">{item.orderCode}</td>
                    <td className="px-3 py-2">{item.customerName}</td>
                    <td className="px-3 py-2">{item.customerPhone}</td>
                    <td className="px-3 py-2">{item.printPaperQuantity}</td>
                    <td className="px-3 py-2">{formatMoney(item.amount)}</td>
                    <td className="px-3 py-2">{item.note || ''}</td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-2">
                        {item.driveFileUrl && (
                          <>
                            <a
                              href={item.driveFileUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-2 py-1 hover:bg-slate-50"
                            >
                              <ExternalLink size={14} /> Mở
                            </a>
                            <a
                              href={item.driveFileUrl}
                              target="_blank"
                              rel="noreferrer"
                              download
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-2 py-1 hover:bg-slate-50"
                            >
                              <Download size={14} /> Tải
                            </a>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {!lookupResults.length && (
                  <tr>
                    <td colSpan={8} className="px-3 py-6 text-center text-slate-500">
                      Chưa có kết quả tra cứu.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'inventory' && (
        <div className="grid gap-6 xl:grid-cols-[420px,1fr]">
          <form onSubmit={handleStockIn} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-lg font-semibold text-slate-800">
              <Package size={18} /> Nhập kho giấy ảnh thẻ
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Loại giấy</label>
              <select
                value={stockInForm.paperInventoryId}
                onChange={e => setStockInForm(prev => ({ ...prev, paperInventoryId: e.target.value }))}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-blue-500"
              >
                {inventory.map(item => (
                  <option key={item.id} value={item.id}>{item.paperName}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Số lượng nhập</label>
                <input
                  type="number"
                  min={1}
                  value={stockInForm.quantity}
                  onChange={e => setStockInForm(prev => ({ ...prev, quantity: Number(e.target.value || 0) }))}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Đơn giá</label>
                <input
                  type="number"
                  min={0}
                  value={stockInForm.unitCost}
                  onChange={e => setStockInForm(prev => ({ ...prev, unitCost: Number(e.target.value || 0) }))}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Ghi chú</label>
              <textarea
                rows={3}
                value={stockInForm.note}
                onChange={e => setStockInForm(prev => ({ ...prev, note: e.target.value }))}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-blue-500"
              />
            </div>

            <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
              <div><span className="font-medium">Tồn hiện tại:</span> {activeInventory?.currentQuantity ?? 0} {activeInventory?.unit || 'tờ'}</div>
              <div><span className="font-medium">Giá vốn TB:</span> {formatMoney(activeInventory?.averageCost ?? 0)}</div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
            >
              <Save size={16} /> Lưu nhập kho
            </button>
          </form>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-800">
              <Package size={18} /> Tồn kho giấy ảnh thẻ
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b bg-slate-50 text-left text-slate-600">
                    <th className="px-3 py-2">Loại giấy</th>
                    <th className="px-3 py-2">Đơn vị</th>
                    <th className="px-3 py-2">Tồn kho</th>
                    <th className="px-3 py-2">Ngưỡng cảnh báo</th>
                    <th className="px-3 py-2">Giá vốn TB</th>
                    <th className="px-3 py-2">Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {inventory.map(item => (
                    <tr key={item.id} className="border-b last:border-b-0 hover:bg-slate-50">
                      <td className="px-3 py-2 font-medium text-slate-800">{item.paperName}</td>
                      <td className="px-3 py-2">{item.unit}</td>
                      <td className="px-3 py-2">{item.currentQuantity}</td>
                      <td className="px-3 py-2">{item.warningThreshold}</td>
                      <td className="px-3 py-2">{formatMoney(item.averageCost)}</td>
                      <td className="px-3 py-2">
                        {item.isLowStock ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700">
                            <AlertTriangle size={12} /> Sắp hết
                          </span>
                        ) : (
                          <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">
                            Bình thường
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {!inventory.length && (
                    <tr>
                      <td colSpan={6} className="px-3 py-6 text-center text-slate-500">
                        Chưa có dữ liệu kho giấy.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
          Đang xử lý dữ liệu, vui lòng chờ...
        </div>
      )}
    </div>
  );
};

export default PhotoIDManager;
