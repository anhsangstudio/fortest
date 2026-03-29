import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { BarChart3, Filter, RefreshCw, TrendingDown, TrendingUp } from 'lucide-react';
import { supabase } from '../apiService';

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

const clampPercent = (value?: number | null) => {
  const n = Number(value || 0);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, n));
};

const getToday = () => new Date().toISOString().slice(0, 10);

const getFirstDayOfMonth = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
};

const ConsultationSalesAnalytics: React.FC = () => {
  const [dateRange, setDateRange] = useState({
    from: getFirstDayOfMonth(),
    to: getToday(),
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [funnelData, setFunnelData] = useState<FunnelConversionRow[]>([]);

  const totalStartLeads = useMemo(() => {
    return funnelData.length > 0 ? Number(funnelData[0]?.total_leads || 0) : 0;
  }, [funnelData]);

  const finalStage = useMemo(() => {
    return funnelData.length > 0 ? funnelData[funnelData.length - 1] : null;
  }, [funnelData]);

  const overallConversion = useMemo(() => {
    return finalStage ? Number(finalStage.conversion_from_start || 0) : 0;
  }, [finalStage]);

  const loadFunnelData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      if (!supabase) {
        throw new Error('Supabase chưa được cấu hình');
      }

      const { data, error: rpcError } = await supabase.rpc(
        'consultation_sales_funnel_conversion',
        {
          p_from: dateRange.from || null,
          p_to: dateRange.to || null,
        }
      );

      if (rpcError) {
        throw rpcError;
      }

      setFunnelData(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('Lỗi khi tải funnel conversion nâng cao:', err);
      setError(err?.message || 'Không thể tải dữ liệu funnel conversion');
      setFunnelData([]);
    } finally {
      setLoading(false);
    }
  }, [dateRange.from, dateRange.to]);

  useEffect(() => {
    loadFunnelData();
  }, [loadFunnelData]);

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-sm">
              <BarChart3 size={24} />
            </div>

            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Phân Tích Hiệu Suất Sale Nâng Cao
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Funnel conversion theo từng giai đoạn tư vấn, tách riêng hoàn toàn khỏi ConsultationManager.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={loadFunnelData}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            {loading ? 'Đang tải...' : 'Tải lại dữ liệu'}
          </button>
        </div>
      </div>

      {/* Filter */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <Filter size={18} className="text-gray-500" />
          <h2 className="text-base font-semibold text-gray-800">Bộ lọc thời gian</h2>
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
              onClick={loadFunnelData}
              disabled={loading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              Áp dụng bộ lọc
            </button>
          </div>
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="text-sm text-gray-500">Lead đầu funnel</div>
          <div className="mt-2 text-3xl font-bold text-gray-900">
            {formatNumber(totalStartLeads)}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="text-sm text-gray-500">Số giai đoạn</div>
          <div className="mt-2 text-3xl font-bold text-gray-900">
            {formatNumber(funnelData.length)}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="text-sm text-gray-500">Tỷ lệ chặng cuối / đầu funnel</div>
          <div className="mt-2 flex items-center gap-2">
            <div className="text-3xl font-bold text-gray-900">
              {formatPercent(overallConversion)}
            </div>
            {overallConversion >= 50 ? (
              <TrendingUp size={20} className="text-green-600" />
            ) : (
              <TrendingDown size={20} className="text-red-600" />
            )}
          </div>
        </div>
      </div>

      {/* Funnel Conversion */}
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

        {loading && (
          <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-6 py-10 text-center text-sm text-gray-500">
            Đang tải dữ liệu funnel conversion...
          </div>
        )}

        {!loading && !error && funnelData.length === 0 && (
          <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-6 py-10 text-center">
            <div className="text-base font-medium text-gray-700">Chưa có dữ liệu</div>
            <div className="mt-2 text-sm text-gray-500">
              Hãy kiểm tra lại dữ liệu consultation hoặc khoảng ngày lọc.
            </div>
          </div>
        )}

        {!loading && funnelData.length > 0 && (
          <div className="space-y-4">
            <div className="overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-y-2">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Giai đoạn
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Lead
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
                    <tr key={item.stage_key} className="bg-gray-50">
                      <td className="rounded-l-xl px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-700">
                            {item.stage_order}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-800">
                              {item.stage_label}
                            </div>
                            <div className="mt-2 h-2 w-48 rounded-full bg-gray-200">
                              <div
                                className="h-2 rounded-full bg-blue-600 transition-all"
                                style={{
                                  width: `${clampPercent(item.conversion_from_start)}%`,
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3 text-right text-sm font-medium text-gray-800">
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

            {/* Visual cards */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {funnelData.map((item) => (
                <div
                  key={`${item.stage_key}-card`}
                  className="rounded-2xl border border-gray-200 bg-white p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-sm font-semibold text-gray-800">
                        {item.stage_order}. {item.stage_label}
                      </div>
                      <div className="mt-1 text-sm text-gray-500">
                        {formatNumber(item.total_leads)} lead
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-sm text-gray-500">Từ đầu funnel</div>
                      <div className="text-lg font-bold text-gray-900">
                        {formatPercent(item.conversion_from_start)}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 h-3 w-full rounded-full bg-gray-200">
                    <div
                      className="h-3 rounded-full bg-blue-600 transition-all"
                      style={{
                        width: `${clampPercent(item.conversion_from_start)}%`,
                      }}
                    />
                  </div>

                  <div className="mt-3 text-sm text-gray-600">
                    Chuyển đổi từ bước trước: <strong>{formatPercent(item.conversion_from_previous)}</strong>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConsultationSalesAnalytics;
