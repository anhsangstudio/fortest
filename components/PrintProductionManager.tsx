
import React, { useMemo, useState } from 'react';
import {
  ClipboardList,
  BarChart3,
  Filter,
  Plus,
  Copy,
  Trash2,
  Pencil,
  Printer,
  Image as ImageIcon,
  Link as LinkIcon,
  RefreshCw,
} from 'lucide-react';

type PrintOrderRow = {
  id: string;
  ten_khach_hang: string;
  contract_code: string;
  ngay_gui_in: string;
  so_luong_anh_lon: number;
  kich_thuoc_anh_lon: string;
  chat_lieu_anh_lon: string;
  so_luong_anh_nho: number;
  kich_thuoc_anh_nho: string;
  chat_lieu_anh_nho: string;
  tinh_trang: string;
  xuong_in: string;
  nguoi_kiem_tra_nhan_anh: string;
  ghi_chu: string;
  link_the_trello: string;
  link_files: string;
  thong_bao_da_co_anh: boolean;
  thong_bao_da_giao_anh: boolean;
  check_flag: boolean;
  thong_bao_dang_in_anh: boolean;
  created_at: string;
  updated_at: string;
};

const demoData: PrintOrderRow[] = [
  {
    id: '1',
    ten_khach_hang: 'Trần Phúc - Nguyễn Hương',
    contract_code: 'STT11122',
    ngay_gui_in: '2026-03-22',
    so_luong_anh_lon: 3,
    kich_thuoc_anh_lon: '60 x 90',
    chat_lieu_anh_lon: 'MIKA',
    so_luong_anh_nho: 4,
    kich_thuoc_anh_nho: '30x40',
    chat_lieu_anh_nho: 'MIKA',
    tinh_trang: 'ĐÃ ĐỦ ẢNH',
    xuong_in: 'POLY',
    nguoi_kiem_tra_nhan_anh: 'Dung',
    ghi_chu: '',
    link_the_trello: 'https://trello.com/c/demo-card',
    link_files: 'https://drive.google.com/demo-print-files',
    thong_bao_da_co_anh: false,
    thong_bao_da_giao_anh: false,
    check_flag: false,
    thong_bao_dang_in_anh: true,
    created_at: '2026-03-22 10:00',
    updated_at: '2026-03-22 10:00',
  },
];

const sizeOptions = ['13x18', '15x21', '20x30', '30x40', '60 x 90'];
const materialOptions = ['MIKA', 'LỤA', 'BÓNG', 'MỜ', 'CANVAS'];
const vendorOptions = ['POLY', 'MINH TÂM', 'THIÊN HÀ'];
const statusOptions = ['ĐANG IN ẤN', 'ĐÃ ĐỦ ẢNH', 'ĐÃ GIAO ẢNH', 'TẠM DỪNG'];
const checkerOptions = ['Dung', 'Linh', 'Nam', 'Hà'];

const formatDate = (value?: string) => {
  if (!value) return '--';
  return value.split('-').reverse().join('-');
};

const formatMoney = (value: number) => {
  return value.toLocaleString('vi-VN');
};

const PrintProductionManager: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'list' | 'report'>('list');
  const [rows, setRows] = useState<PrintOrderRow[]>(demoData);
  const [dateRange, setDateRange] = useState({
    from: '2026-03-01',
    to: '2026-03-31',
  });

  const totalLargePhotos = useMemo(
    () => rows.reduce((sum, row) => sum + Number(row.so_luong_anh_lon || 0), 0),
    [rows]
  );

  const totalSmallPhotos = useMemo(
    () => rows.reduce((sum, row) => sum + Number(row.so_luong_anh_nho || 0), 0),
    [rows]
  );

  const totalOrders = rows.length;

  const reportByVendor = useMemo(() => {
    const map = new Map<string, number>();
    rows.forEach((row) => {
      const current = map.get(row.xuong_in) || 0;
      map.set(row.xuong_in, current + row.so_luong_anh_lon + row.so_luong_anh_nho);
    });
    return Array.from(map.entries()).map(([name, total]) => ({ name, total }));
  }, [rows]);

  const updateRow = (id: string, field: keyof PrintOrderRow, value: string | number | boolean) => {
    setRows((prev) =>
      prev.map((row) =>
        row.id === id
          ? {
              ...row,
              [field]: value,
              updated_at: new Date().toISOString().slice(0, 16).replace('T', ' '),
            }
          : row
      )
    );
  };

  const duplicateRow = (id: string) => {
    setRows((prev) => {
      const target = prev.find((row) => row.id === id);
      if (!target) return prev;
      const clone: PrintOrderRow = {
        ...target,
        id: `${Date.now()}`,
        ten_khach_hang: `${target.ten_khach_hang} (Bản sao)`,
        created_at: new Date().toISOString().slice(0, 16).replace('T', ' '),
        updated_at: new Date().toISOString().slice(0, 16).replace('T', ' '),
      };
      return [clone, ...prev];
    });
  };

  const softDeleteRow = (id: string) => {
    setRows((prev) => prev.filter((row) => row.id !== id));
  };

  const addNewRow = () => {
    const now = new Date().toISOString().slice(0, 16).replace('T', ' ');
    setRows((prev) => [
      {
        id: `${Date.now()}`,
        ten_khach_hang: 'Khách mới',
        contract_code: '',
        ngay_gui_in: new Date().toISOString().slice(0, 10),
        so_luong_anh_lon: 0,
        kich_thuoc_anh_lon: '',
        chat_lieu_anh_lon: '',
        so_luong_anh_nho: 0,
        kich_thuoc_anh_nho: '',
        chat_lieu_anh_nho: '',
        tinh_trang: 'ĐANG IN ẤN',
        xuong_in: '',
        nguoi_kiem_tra_nhan_anh: '',
        ghi_chu: '',
        link_the_trello: '',
        link_files: '',
        thong_bao_da_co_anh: false,
        thong_bao_da_giao_anh: false,
        check_flag: false,
        thong_bao_dang_in_anh: false,
        created_at: now,
        updated_at: now,
      },
      ...prev,
    ]);
  };

  const renderSelect = (
    row: PrintOrderRow,
    field: keyof PrintOrderRow,
    options: string[],
    className = 'w-full rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm'
  ) => (
    <select
      value={String(row[field] || '')}
      onChange={(e) => updateRow(row.id, field, e.target.value)}
      className={className}
    >
      <option value="">Chọn</option>
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
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
                Quản lý danh sách in ấn và chuẩn bị nền cho tự động hóa Trello.
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
                  onClick={addNewRow}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white"
                >
                  <Plus size={16} />
                  Thêm dòng mới
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700"
                >
                  <RefreshCw size={16} />
                  Làm mới
                </button>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
            <table className="min-w-[1900px] w-full">
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
                  <th className="px-3 py-3 text-left">Created</th>
                  <th className="px-3 py-3 text-left">Updated</th>
                  <th className="px-3 py-3 text-left">Thao tác</th>
                </tr>
              </thead>

              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-t border-gray-100 align-top">
                    <td className="px-3 py-3">
                      <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gray-100 text-gray-500">
                        <ImageIcon size={18} />
                      </div>
                    </td>

                    <td className="px-3 py-3 min-w-[200px]">
                      <input
                        value={row.ten_khach_hang}
                        onChange={(e) => updateRow(row.id, 'ten_khach_hang', e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      />
                    </td>

                    <td className="px-3 py-3 min-w-[130px]">
                      <input
                        value={row.contract_code}
                        onChange={(e) => updateRow(row.id, 'contract_code', e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      />
                    </td>

                    <td className="px-3 py-3 min-w-[140px]">
                      <input
                        type="date"
                        value={row.ngay_gui_in}
                        onChange={(e) => updateRow(row.id, 'ngay_gui_in', e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      />
                    </td>

                    <td className="px-3 py-3 min-w-[120px]">
                      <input
                        type="number"
                        min={0}
                        value={row.so_luong_anh_lon}
                        onChange={(e) => updateRow(row.id, 'so_luong_anh_lon', Number(e.target.value))}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      />
                    </td>

                    <td className="px-3 py-3 min-w-[120px]">
                      {renderSelect(row, 'kich_thuoc_anh_lon', sizeOptions)}
                    </td>

                    <td className="px-3 py-3 min-w-[120px]">
                      {renderSelect(row, 'chat_lieu_anh_lon', materialOptions)}
                    </td>

                    <td className="px-3 py-3 min-w-[120px]">
                      <input
                        type="number"
                        min={0}
                        value={row.so_luong_anh_nho}
                        onChange={(e) => updateRow(row.id, 'so_luong_anh_nho', Number(e.target.value))}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      />
                    </td>

                    <td className="px-3 py-3 min-w-[120px]">
                      {renderSelect(row, 'kich_thuoc_anh_nho', sizeOptions)}
                    </td>

                    <td className="px-3 py-3 min-w-[120px]">
                      {renderSelect(row, 'chat_lieu_anh_nho', materialOptions)}
                    </td>

                    <td className="px-3 py-3 min-w-[130px]">
                      {renderSelect(row, 'tinh_trang', statusOptions)}
                    </td>

                    <td className="px-3 py-3 min-w-[130px]">
                      {renderSelect(row, 'xuong_in', vendorOptions)}
                    </td>

                    <td className="px-3 py-3 min-w-[160px]">
                      {renderSelect(row, 'nguoi_kiem_tra_nhan_anh', checkerOptions)}
                    </td>

                    <td className="px-3 py-3 min-w-[200px]">
                      <input
                        value={row.ghi_chu}
                        onChange={(e) => updateRow(row.id, 'ghi_chu', e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      />
                    </td>

                    <td className="px-3 py-3 min-w-[220px]">
                      <div className="flex items-center gap-2">
                        <LinkIcon size={14} className="text-gray-400" />
                        <input
                          value={row.link_the_trello}
                          onChange={(e) => updateRow(row.id, 'link_the_trello', e.target.value)}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                        />
                      </div>
                    </td>

                    <td className="px-3 py-3 min-w-[220px]">
                      <input
                        value={row.link_files}
                        onChange={(e) => updateRow(row.id, 'link_files', e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      />
                    </td>

                    {(['thong_bao_da_co_anh', 'thong_bao_da_giao_anh', 'check_flag', 'thong_bao_dang_in_anh'] as const).map((field) => (
                      <td key={field} className="px-3 py-3 min-w-[110px]">
                        <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                          <input
                            type="checkbox"
                            checked={row[field]}
                            onChange={(e) => updateRow(row.id, field, e.target.checked)}
                          />
                          Có
                        </label>
                      </td>
                    ))}

                    <td className="px-3 py-3 min-w-[130px] text-sm text-gray-600">
                      {row.created_at}
                    </td>

                    <td className="px-3 py-3 min-w-[130px] text-sm text-gray-600">
                      {row.updated_at}
                    </td>

                    <td className="px-3 py-3 min-w-[160px]">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          className="rounded-lg border border-gray-300 p-2 text-gray-700"
                          title="Sửa trực tiếp"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => duplicateRow(row.id)}
                          className="rounded-lg border border-gray-300 p-2 text-gray-700"
                          title="Nhân bản"
                        >
                          <Copy size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => softDeleteRow(row.id)}
                          className="rounded-lg border border-red-200 p-2 text-red-600"
                          title="Xóa"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {rows.length === 0 && (
                  <tr>
                    <td colSpan={23} className="px-6 py-12 text-center text-sm text-gray-500">
                      Chưa có dữ liệu in ấn.
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
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white"
                >
                  <RefreshCw size={16} />
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
                  <div className="text-sm font-semibold text-gray-800">{item.name || 'Chưa chọn xưởng'}</div>
                  <div className="mt-2 text-2xl font-bold text-gray-900">{formatMoney(item.total)}</div>
                  <div className="mt-1 text-sm text-gray-500">tổng số ảnh dự kiến in</div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-6 text-sm text-gray-500 shadow-sm">
            Bước 1 mới dựng khung báo cáo. Các bước tiếp theo sẽ nối dữ liệu thật từ database, tính chi phí theo bảng giá xưởng in, và khóa quyền chỉ admin được xem.
          </div>
        </>
      )}
    </div>
  );
};

export default PrintProductionManager;
