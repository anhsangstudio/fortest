import React, { useMemo, useState } from 'react';
import { BarChart3, Filter, RefreshCw, TrendingUp } from 'lucide-react';

type FunnelConversionRow = {
  stage_key: string;
  stage_label: string;
  stage_order: number;
  total_leads: number;
  conversion_from_previous: number;
  conversion_from_start: number;
};

const formatPercent = (value?: number | null) => {
  const safeValue = Number(value || 0);
  return `${safeValue.toFixed(1)}%`;
};

const formatNumber = (value?: number | null) => {
  return Number(value || 0).toLocaleString('vi-VN');
};

const today = new Date().toISOString().slice(0, 10);
const firstDayOfMonth = new Date(
  new Date().getFullYear(),
  new Date().getMonth(),
  1
)
  .toISOString()
  .slice(0, 10);

const ConsultationSalesAnalytics: React.FC = () => {
  const [dateRange, setDateRange] = useState({
    from: firstDayOfMonth,
    to: today,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Bước 1: để rỗng. Bước 2 sẽ bind dữ liệu RPC thật vào đây.
  const [funnelData, setFunnelData] = useState<FunnelConversionRow[]>([]);

  const totalStartLeads = useMemo(() => {
    return funnelData.length > 0 ? funnelData[0].total_leads : 0;
  }, [funnelData]);

  const handleRefresh = async () => {
    try {
      setLoading(true);
      setError(null);

      // BƯỚC 1:
      // Chưa gọi RPC ở đây để giữ thay đổi thật nhỏ và an toàn.
      // BƯỚC 2 sẽ thay phần này bằng supabase.rpc('consultation_sales_funnel_conversion', ...)
      setFunnelData([]);
    } catch (err: any) {
      console.error('Lỗi khi tải module Phân Tích Hiệu Suất Sale Nâng Cao:', err);
      setError(err?.message || 'Không thể tải dữ liệu funnel conversion');
      setFunnelData([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-sm">
              <TrendingUp size={24} />
            </div>

            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Phân Tích Hiệu Suất Sale Nâng Cao
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Module độc lập để phân tích chuyển đổi funnel sale theo từng giai đoạn.
              </p>
            </div>
          </div>

          <div className="rounded-xl bg-blue-50 px-4 py-3 text-sm text-blue-700">
            Giai đoạn hiện tại: Khởi tạo khung module an toàn
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <Filter size={18} className="text-gray-500" />
          <h2 className="text-base font-semibold text-gray-800">Bộ lọc dữ liệu</h2>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Từ ngày
            </label>
            <input
              type="date"
              value={dateRange.from}
              onChange={(e) =>
                setDateRange((prev) => ({
                  ...prev,
                  from: e.target.value,
                }))
              }
              className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Đến ngày
            </label>
            <input
              type="date"
              value={dateRange.to}
              onChange={(e) =>
                setDateRange((prev) => ({
                  ...prev,
                  to: e.target.value,
                }))
              }
              className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div className="flex items-end">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={loading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              {loading ? 'Đang tải...' : 'Tải dữ liệu'}
            </button>
          </div>
        </div>
      </div>

      {/* KPI mini */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="text-sm text-gray-500">Lead đầu funnel</div>
          <div className="mt-2 text-3xl font-bold text-gray-900">
            {formatNumber(totalStartLeads)}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="text-sm text-gray-500">Số stage hiện có</div>
          <div className="mt-2 text-3xl font-bold text-gray-900">
            {formatNumber(funnelData.length)}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="text-sm text-gray-500">Trạng thái dữ liệu</div>
          <div className="mt-2 text-lg font-semibold text-gray-900">
            {loading ? 'Đang tải' : funnelData.length > 0 ? 'Có dữ liệu' : 'Chưa tải'}
          </div>
        </div>
      </div>

      {/* Funnel table placeholder */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <BarChart3 size={18} className="text-gray-500" />
          <h2 className="text-base font-semibold text-gray-800">
            Funnel Conversion Nâng Cao
          </h2>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {!loading && funnelData.length === 0 && (
          <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-6 py-10 text-center">
            <div className="text-base font-medium text-gray-700">
              Module đã sẵn sàng
            </div>
            <div className="mt-2 text-sm text-gray-500">
              Bước tiếp theo là gắn RPC <code>consultation_sales_funnel_conversion</code> để đổ dữ liệu thật.
            </div>
          </div>
        )}

        {funnelData.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-y-2">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Giai đoạn
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Tổng lead
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Tỷ lệ từ bước trước
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Tỷ lệ từ đầu funnel
                  </th>
                </tr>
              </thead>

              <tbody>
                {funnelData.map((item) => (
                  <tr key={item.stage_key} className="rounded-xl bg-gray-50">
                    <td className="rounded-l-xl px-4 py-3 text-sm font-medium text-gray-800">
                      {item.stage_label}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-gray-700">
                      {formatNumber(item.total_leads)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-gray-700">
                      {formatPercent(item.conversion_from_previous)}
                    </td>
                    <td className="rounded-r-xl px-4 py-3 text-right text-sm text-gray-700">
                      {formatPercent(item.conversion_from_start)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConsultationSalesAnalytics;
