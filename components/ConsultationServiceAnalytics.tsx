import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { BarChart3, Filter, RefreshCw, TrendingDown, TrendingUp } from 'lucide-react';
import { supabase } from '../apiService';

type ServicePerformanceRow = {
  dich_vu_id: string;
  ten_dich_vu: string;
  tong_lead: number;
  lead_da_chot: number;
  lead_tu_choi: number;
  lead_dang_xu_ly: number;
  ty_le_chot: number;
  ty_trong_nhu_cau: number;
  tong_gia_tri_du_kien: number;
};

type RecommendationItem = {
  level: 'critical' | 'warning' | 'positive' | 'neutral';
  title: string;
  message: string;
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

const recommendationStyleMap: Record<
  RecommendationItem['level'],
  { container: string; title: string }
> = {
  critical: {
    container: 'border-red-200 bg-red-50',
    title: 'text-red-800',
  },
  warning: {
    container: 'border-amber-200 bg-amber-50',
    title: 'text-amber-800',
  },
  positive: {
    container: 'border-emerald-200 bg-emerald-50',
    title: 'text-emerald-800',
  },
  neutral: {
    container: 'border-slate-200 bg-slate-50',
    title: 'text-slate-800',
  },
};

const getToday = () => new Date().toISOString().slice(0, 10);

const getFirstDayOfMonth = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
};

const ConsultationServiceAnalytics: React.FC = () => {
  const [dateRange, setDateRange] = useState({
    from: getFirstDayOfMonth(),
    to: getToday(),
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [serviceData, setServiceData] = useState<ServicePerformanceRow[]>([]);

  const totalLeadThiTruong = useMemo(() => {
    return serviceData.reduce((sum, item) => sum + Number(item.tong_lead || 0), 0);
  }, [serviceData]);

  const totalLeadDaChot = useMemo(() => {
    return serviceData.reduce((sum, item) => sum + Number(item.lead_da_chot || 0), 0);
  }, [serviceData]);

  const tyLeDapUngToanBo = useMemo(() => {
    if (totalLeadThiTruong === 0) return 0;
    return (totalLeadDaChot / totalLeadThiTruong) * 100;
  }, [totalLeadDaChot, totalLeadThiTruong]);

  const dichVuQuanTamNhieuNhat = useMemo(() => {
    return serviceData.length > 0 ? serviceData[0] : null;
  }, [serviceData]);

  const dichVuTyLeChotThapNhat = useMemo(() => {
    if (!serviceData.length) return null;

    return [...serviceData]
      .filter((item) => Number(item.tong_lead || 0) > 0)
      .sort((a, b) => {
        const tyLeA = Number(a.ty_le_chot || 0);
        const tyLeB = Number(b.ty_le_chot || 0);

        if (tyLeA !== tyLeB) return tyLeA - tyLeB;

        const leadB = Number(b.tong_lead || 0);
        const leadA = Number(a.tong_lead || 0);
        return leadB - leadA;
      })[0] || null;
  }, [serviceData]);

  const dichVuCoCoHoiTangTruong = useMemo(() => {
    if (!serviceData.length) return null;

    return [...serviceData]
      .filter(
        (item) =>
          Number(item.tong_lead || 0) > 0 &&
          Number(item.ty_trong_nhu_cau || 0) >= 10 &&
          Number(item.ty_le_chot || 0) < 25
      )
      .sort((a, b) => {
        const nhuCauB = Number(b.ty_trong_nhu_cau || 0);
        const nhuCauA = Number(a.ty_trong_nhu_cau || 0);

        if (nhuCauB !== nhuCauA) return nhuCauB - nhuCauA;

        const tyLeA = Number(a.ty_le_chot || 0);
        const tyLeB = Number(b.ty_le_chot || 0);
        return tyLeA - tyLeB;
      })[0] || null;
  }, [serviceData]);

  const recommendations = useMemo<RecommendationItem[]>(() => {
    if (!serviceData.length) return [];

    const items: RecommendationItem[] = [];

    if (tyLeDapUngToanBo < 20) {
      items.push({
        level: 'critical',
        title: 'Khả năng đáp ứng nhu cầu thị trường đang thấp',
        message: `Hiện tại toàn bộ hệ thống mới chuyển đổi được ${formatPercent(
          tyLeDapUngToanBo
        )} trên tổng số lead quan tâm. Cần ưu tiên kiểm tra lại gói dịch vụ, cách tư vấn và quy trình theo dõi lại khách.`,
      });
    }

    if (
      dichVuCoCoHoiTangTruong &&
      Number(dichVuCoCoHoiTangTruong.ty_trong_nhu_cau || 0) >= 15 &&
      Number(dichVuCoCoHoiTangTruong.ty_le_chot || 0) < 20
    ) {
      items.push({
        level: 'warning',
        title: `Dịch vụ "${dichVuCoCoHoiTangTruong.ten_dich_vu}" đang có nhu cầu cao nhưng chốt kém`,
        message: `Dịch vụ này đang chiếm ${formatPercent(
          dichVuCoCoHoiTangTruong.ty_trong_nhu_cau
        )} mức quan tâm của thị trường, nhưng tỷ lệ chốt chỉ đạt ${formatPercent(
          dichVuCoCoHoiTangTruong.ty_le_chot
        )}. Đây là khu vực nên ưu tiên cải thiện đầu tiên.`,
      });
    }

    if (
      dichVuQuanTamNhieuNhat &&
      Number(dichVuQuanTamNhieuNhat.ty_le_chot || 0) >= 30
    ) {
      items.push({
        level: 'positive',
        title: `Dịch vụ chủ lực "${dichVuQuanTamNhieuNhat.ten_dich_vu}" đang hoạt động tốt`,
        message: `Đây là dịch vụ được quan tâm nhiều nhất với ${formatPercent(
          dichVuQuanTamNhieuNhat.ty_trong_nhu_cau
        )} nhu cầu và tỷ lệ chốt ${formatPercent(
          dichVuQuanTamNhieuNhat.ty_le_chot
        )}. Nên tiếp tục giữ vững chất lượng và khai thác sâu hơn nhóm khách này.`,
      });
    }

    if (!items.length) {
      items.push({
        level: 'neutral',
        title: 'Chưa có cảnh báo quá rõ theo dịch vụ',
        message:
          'Dữ liệu hiện tại chưa cho thấy một dịch vụ nào vừa có nhu cầu rất cao vừa có tỷ lệ chốt quá thấp. Nên tiếp tục theo dõi thêm theo tuần và theo tháng.',
      });
    }

    return items;
  }, [serviceData, tyLeDapUngToanBo, dichVuCoCoHoiTangTruong, dichVuQuanTamNhieuNhat]);

  const loadServiceData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      if (!supabase) {
        throw new Error('Supabase chưa được cấu hình');
      }

      const { data, error: rpcError } = await supabase.rpc(
        'consultation_sales_by_service_performance',
        {
          p_from: dateRange.from || null,
          p_to: dateRange.to || null,
        }
      );

      if (rpcError) {
        throw rpcError;
      }

      setServiceData(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('Lỗi khi tải dữ liệu phân tích theo dịch vụ:', err);
      setError(err?.message || 'Không thể tải dữ liệu phân tích theo dịch vụ');
      setServiceData([]);
    } finally {
      setLoading(false);
    }
  }, [dateRange.from, dateRange.to]);

  useEffect(() => {
    loadServiceData();
  }, [loadServiceData]);

  return (
    <div className="space-y-6 p-6">
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-sm">
              <BarChart3 size={24} />
            </div>

            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Phân Tích Nhu Cầu Và Hiệu Quả Theo Dịch Vụ
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Giúp nhìn rõ khách đang quan tâm nhiều đến dịch vụ nào và studio đang đáp ứng được bao nhiêu phần trăm nhu cầu đó.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={loadServiceData}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            {loading ? 'Đang tải...' : 'Tải lại dữ liệu'}
          </button>
        </div>
      </div>

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
              onClick={loadServiceData}
              disabled={loading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              Áp dụng bộ lọc
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="text-sm text-gray-500">Tổng lead thị trường</div>
          <div className="mt-2 text-3xl font-bold text-gray-900">
            {formatNumber(totalLeadThiTruong)}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="text-sm text-gray-500">Tổng lead đã chốt</div>
          <div className="mt-2 text-3xl font-bold text-gray-900">
            {formatNumber(totalLeadDaChot)}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="text-sm text-gray-500">Tỷ lệ đáp ứng nhu cầu</div>
          <div className="mt-2 flex items-center gap-2">
            <div className="text-3xl font-bold text-gray-900">
              {formatPercent(tyLeDapUngToanBo)}
            </div>
            {tyLeDapUngToanBo >= 30 ? (
              <TrendingUp size={20} className="text-green-600" />
            ) : (
              <TrendingDown size={20} className="text-red-600" />
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="text-sm text-gray-500">Dịch vụ được quan tâm nhất</div>
          <div className="mt-2 text-lg font-bold text-gray-900">
            {dichVuQuanTamNhieuNhat?.ten_dich_vu || '--'}
          </div>
          <div className="mt-1 text-sm text-gray-500">
            Tỷ trọng nhu cầu: {formatPercent(dichVuQuanTamNhieuNhat?.ty_trong_nhu_cau || 0)}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <BarChart3 size={18} className="text-gray-500" />
          <h2 className="text-base font-semibold text-gray-800">
            Insight nhanh theo dịch vụ
          </h2>
        </div>

        {!loading && !error && serviceData.length === 0 && (
          <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-6 py-8 text-sm text-gray-500">
            Chưa có dữ liệu để phân tích insight theo dịch vụ.
          </div>
        )}

        {!loading && !error && serviceData.length > 0 && (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
              <div className="text-sm font-semibold text-blue-800">
                Dịch vụ được quan tâm nhiều nhất
              </div>
              <div className="mt-2 text-sm leading-6 text-blue-900">
                <strong>{dichVuQuanTamNhieuNhat?.ten_dich_vu || '--'}</strong> đang dẫn đầu với{' '}
                <strong>{formatNumber(dichVuQuanTamNhieuNhat?.tong_lead || 0)}</strong> lead,
                chiếm khoảng <strong>{formatPercent(dichVuQuanTamNhieuNhat?.ty_trong_nhu_cau || 0)}</strong> nhu cầu hiện tại.
              </div>
            </div>

            <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
              <div className="text-sm font-semibold text-amber-800">
                Dịch vụ cần xem lại nhất
              </div>
              <div className="mt-2 text-sm leading-6 text-amber-900">
                <strong>{dichVuTyLeChotThapNhat?.ten_dich_vu || '--'}</strong> đang có tỷ lệ chốt khoảng{' '}
                <strong>{formatPercent(dichVuTyLeChotThapNhat?.ty_le_chot || 0)}</strong>.
                Nếu dịch vụ này vẫn có nhiều lead thì đây là khu vực đang mất cơ hội kinh doanh.
              </div>
            </div>

            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
              <div className="text-sm font-semibold text-emerald-800">
                Cơ hội tăng trưởng
              </div>
              <div className="mt-2 text-sm leading-6 text-emerald-900">
                {dichVuCoCoHoiTangTruong ? (
                  <>
                    <strong>{dichVuCoCoHoiTangTruong.ten_dich_vu}</strong> đang có nhu cầu{' '}
                    <strong>{formatPercent(dichVuCoCoHoiTangTruong.ty_trong_nhu_cau)}</strong> nhưng tỷ lệ chốt mới đạt{' '}
                    <strong>{formatPercent(dichVuCoCoHoiTangTruong.ty_le_chot)}</strong>.
                    Đây là dịch vụ nên ưu tiên cải thiện gói sản phẩm và cách tư vấn.
                  </>
                ) : (
                  <>Hiện chưa thấy một dịch vụ nào vừa có nhu cầu cao vừa có tỷ lệ chốt thấp rõ rệt.</>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <BarChart3 size={18} className="text-gray-500" />
          <h2 className="text-base font-semibold text-gray-800">
            Khuyến nghị hành động
          </h2>
        </div>

        {!loading && !error && serviceData.length === 0 && (
          <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-6 py-8 text-sm text-gray-500">
            Chưa có dữ liệu để đưa ra khuyến nghị.
          </div>
        )}

        {!loading && !error && recommendations.length > 0 && (
          <div className="space-y-4">
            {recommendations.map((item, index) => {
              const style = recommendationStyleMap[item.level];

              return (
                <div
                  key={`${item.title}-${index}`}
                  className={`rounded-2xl border p-4 ${style.container}`}
                >
                  <div className={`text-sm font-semibold ${style.title}`}>
                    {item.title}
                  </div>
                  <div className="mt-2 text-sm leading-6 text-gray-700">
                    {item.message}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <BarChart3 size={18} className="text-gray-500" />
          <h2 className="text-base font-semibold text-gray-800">
            Bảng hiệu quả theo dịch vụ
          </h2>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading && (
          <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-6 py-10 text-center text-sm text-gray-500">
            Đang tải dữ liệu theo dịch vụ...
          </div>
        )}

        {!loading && !error && serviceData.length === 0 && (
          <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-6 py-10 text-center">
            <div className="text-base font-medium text-gray-700">Chưa có dữ liệu</div>
            <div className="mt-2 text-sm text-gray-500">
              Hãy kiểm tra lại dữ liệu dịch vụ đã gắn cho nhật ký tư vấn hoặc khoảng ngày lọc.
            </div>
          </div>
        )}

        {!loading && serviceData.length > 0 && (
          <div className="space-y-4">
            <div className="overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-y-2">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Dịch vụ
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Lead
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Đã chốt
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Từ chối
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Đang xử lý
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Tỷ lệ chốt
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Tỷ trọng nhu cầu
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Giá trị dự kiến
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {serviceData.map((item) => (
                    <tr key={item.dich_vu_id} className="bg-gray-50">
                      <td className="rounded-l-xl px-4 py-3">
                        <div className="text-sm font-medium text-gray-800">
                          {item.ten_dich_vu}
                        </div>
                        <div className="mt-2 h-2 w-40 rounded-full bg-gray-200">
                          <div
                            className="h-2 rounded-full bg-blue-600"
                            style={{ width: `${clampPercent(item.ty_trong_nhu_cau)}%` }}
                          />
                        </div>
                      </td>

                      <td className="px-4 py-3 text-right text-sm text-gray-700">
                        {formatNumber(item.tong_lead)}
                      </td>

                      <td className="px-4 py-3 text-right text-sm text-gray-700">
                        {formatNumber(item.lead_da_chot)}
                      </td>

                      <td className="px-4 py-3 text-right text-sm text-gray-700">
                        {formatNumber(item.lead_tu_choi)}
                      </td>

                      <td className="px-4 py-3 text-right text-sm text-gray-700">
                        {formatNumber(item.lead_dang_xu_ly)}
                      </td>

                      <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900">
                        {formatPercent(item.ty_le_chot)}
                      </td>

                      <td className="px-4 py-3 text-right text-sm text-gray-700">
                        {formatPercent(item.ty_trong_nhu_cau)}
                      </td>

                      <td className="rounded-r-xl px-4 py-3 text-right text-sm text-gray-700">
                        {formatNumber(item.tong_gia_tri_du_kien)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {serviceData.map((item) => (
                <div
                  key={`${item.dich_vu_id}-card`}
                  className="rounded-2xl border border-gray-200 bg-white p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-sm font-semibold text-gray-800">
                        {item.ten_dich_vu}
                      </div>
                      <div className="mt-1 text-sm text-gray-500">
                        {formatNumber(item.tong_lead)} lead quan tâm
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-sm text-gray-500">Tỷ lệ chốt</div>
                      <div className="text-lg font-bold text-gray-900">
                        {formatPercent(item.ty_le_chot)}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 h-3 w-full rounded-full bg-gray-200">
                    <div
                      className="h-3 rounded-full bg-blue-600 transition-all"
                      style={{
                        width: `${clampPercent(item.ty_le_chot)}%`,
                      }}
                    />
                  </div>

                  <div className="mt-3 text-sm leading-6 text-gray-600">
                    Dịch vụ này đang chiếm <strong>{formatPercent(item.ty_trong_nhu_cau)}</strong> mức quan tâm của thị trường,
                    với <strong>{formatNumber(item.lead_da_chot)}</strong> lead đã chốt.
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

export default ConsultationServiceAnalytics;
