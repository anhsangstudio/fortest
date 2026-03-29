import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { BarChart3, Filter, RefreshCw, TrendingDown, TrendingUp, UserRound } from 'lucide-react';
import { supabase } from '../apiService';

type FunnelConversionRow = {
  stage_key: string;
  stage_label: string;
  stage_order: number;
  total_leads: number;
  conversion_from_previous: number;
  conversion_from_start: number;
};

type RecommendationItem = {
  level: 'critical' | 'warning' | 'positive' | 'neutral';
  title: string;
  message: string;
};

type HieuSuatNhanVienRow = {
  nhan_vien_tu_van: string;
  tong_lead: number;
  lead_da_chot: number;
  lead_tu_choi: number;
  lead_dang_xu_ly: number;
  ty_le_chot: number;
  ty_le_tu_choi: number;
  tong_gia_tri_du_kien: number;
};

type DiemRoiTheoNhanVienRow = {
  nhan_vien_tu_van: string;
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

const SO_LEAD_TOI_THIEU_DE_SO_SANH = 5;

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
  const [staffBreakdownError, setStaffBreakdownError] = useState<string | null>(null);

  const [funnelData, setFunnelData] = useState<FunnelConversionRow[]>([]);
  const [hieuSuatNhanVien, setHieuSuatNhanVien] = useState<HieuSuatNhanVienRow[]>([]);
  const [diemRoiTheoNhanVien, setDiemRoiTheoNhanVien] = useState<DiemRoiTheoNhanVienRow[]>([]);
  const [nhanVienDangXem, setNhanVienDangXem] = useState<string>('');

  const totalStartLeads = useMemo(() => {
    return funnelData.length > 0 ? Number(funnelData[0]?.total_leads || 0) : 0;
  }, [funnelData]);

  const finalStage = useMemo(() => {
    return funnelData.length > 0 ? funnelData[funnelData.length - 1] : null;
  }, [funnelData]);

  const overallConversion = useMemo(() => {
    return finalStage ? Number(finalStage.conversion_from_start || 0) : 0;
  }, [finalStage]);

  const firstStage = useMemo(() => {
    return funnelData.length > 0 ? funnelData[0] : null;
  }, [funnelData]);

  const largestDropStage = useMemo(() => {
    if (funnelData.length <= 1) return null;

    const stagesAfterFirst = funnelData.slice(1);

    return stagesAfterFirst.reduce<FunnelConversionRow | null>((lowest, current) => {
      if (!lowest) return current;

      const lowestValue = Number(lowest.conversion_from_previous || 0);
      const currentValue = Number(current.conversion_from_previous || 0);

      return currentValue < lowestValue ? current : lowest;
    }, null);
  }, [funnelData]);

  const largestDropPercent = useMemo(() => {
    if (!largestDropStage) return 0;

    const conversion = Number(largestDropStage.conversion_from_previous || 0);
    const drop = 100 - conversion;

    return drop > 0 ? drop : 0;
  }, [largestDropStage]);

  const recommendations = useMemo<RecommendationItem[]>(() => {
    if (!funnelData.length || !firstStage || !finalStage) {
      return [];
    }

    const items: RecommendationItem[] = [];
    const startLeads = Number(firstStage.total_leads || 0);
    const endLeads = Number(finalStage.total_leads || 0);

    if (overallConversion < 20) {
      items.push({
        level: 'critical',
        title: 'Tỷ lệ chuyển đổi tổng thể đang thấp',
        message: `Tỷ lệ từ đầu đến cuối funnel hiện chỉ đạt ${formatPercent(
          overallConversion
        )}. Cần ưu tiên rà soát chất lượng tư vấn, tốc độ phản hồi và quy trình theo dõi lại khách.`,
      });
    }

    if (largestDropStage && largestDropPercent >= 40) {
      items.push({
        level: 'warning',
        title: `Điểm nghẽn lớn tại giai đoạn "${largestDropStage.stage_label}"`,
        message: `Lead rơi khoảng ${formatPercent(
          largestDropPercent
        )} so với bước trước. Nên kiểm tra lại kịch bản tư vấn, cách xử lý phản đối và chất lượng bàn giao sang bước này.`,
      });
    }

    if (startLeads >= 20 && endLeads <= startLeads * 0.2) {
      items.push({
        level: 'warning',
        title: 'Lead đầu vào có nhưng thất thoát mạnh ở giữa hoặc cuối funnel',
        message: `Đầu funnel có ${formatNumber(
          startLeads
        )} lead nhưng giai đoạn cuối chỉ còn ${formatNumber(
          endLeads
        )}. Nên kiểm tra các bước theo dõi ở giữa thay vì chỉ tăng thêm lead mới.`,
      });
    }

    if (overallConversion >= 50) {
      items.push({
        level: 'positive',
        title: 'Funnel đang giữ lead tương đối tốt',
        message: `Tỷ lệ từ đầu đến cuối đạt ${formatPercent(
          overallConversion
        )}. Có thể xem đây là mốc nền tốt để tiếp tục tối ưu các giai đoạn rơi nhẹ.`,
      });
    }

    if (items.length === 0) {
      items.push({
        level: 'neutral',
        title: 'Chưa có cảnh báo nổi bật',
        message:
          'Funnel hiện chưa xuất hiện tín hiệu bất thường rõ rệt theo các quy tắc cơ bản. Nên tiếp tục theo dõi xu hướng theo tuần và theo tháng.',
      });
    }

    return items;
  }, [funnelData, firstStage, finalStage, overallConversion, largestDropStage, largestDropPercent]);

  const topNhanVien = useMemo(() => {
    return hieuSuatNhanVien.length > 0 ? hieuSuatNhanVien[0] : null;
  }, [hieuSuatNhanVien]);

  const tongLeadTatCaNhanVien = useMemo(() => {
    return hieuSuatNhanVien.reduce((sum, item) => sum + Number(item.tong_lead || 0), 0);
  }, [hieuSuatNhanVien]);

  const tongChotTatCaNhanVien = useMemo(() => {
    return hieuSuatNhanVien.reduce((sum, item) => sum + Number(item.lead_da_chot || 0), 0);
  }, [hieuSuatNhanVien]);

  const danhSachNhanVienDuDieuKienSoSanh = useMemo(() => {
    return hieuSuatNhanVien.filter(
      (item) => Number(item.tong_lead || 0) >= SO_LEAD_TOI_THIEU_DE_SO_SANH
    );
  }, [hieuSuatNhanVien]);

  const nhanVienManhNhat = useMemo(() => {
    if (!danhSachNhanVienDuDieuKienSoSanh.length) return null;

    return [...danhSachNhanVienDuDieuKienSoSanh].sort((a, b) => {
      const tyLeB = Number(b.ty_le_chot || 0);
      const tyLeA = Number(a.ty_le_chot || 0);

      if (tyLeB !== tyLeA) return tyLeB - tyLeA;

      const leadB = Number(b.tong_lead || 0);
      const leadA = Number(a.tong_lead || 0);

      return leadB - leadA;
    })[0];
  }, [danhSachNhanVienDuDieuKienSoSanh]);

  const nhanVienCanHoTroNhat = useMemo(() => {
    if (!danhSachNhanVienDuDieuKienSoSanh.length) return null;

    return [...danhSachNhanVienDuDieuKienSoSanh].sort((a, b) => {
      const tyLeA = Number(a.ty_le_chot || 0);
      const tyLeB = Number(b.ty_le_chot || 0);

      if (tyLeA !== tyLeB) return tyLeA - tyLeB;

      const leadB = Number(b.tong_lead || 0);
      const leadA = Number(a.tong_lead || 0);

      return leadB - leadA;
    })[0];
  }, [danhSachNhanVienDuDieuKienSoSanh]);

  const doLechTyLeChot = useMemo(() => {
    if (!nhanVienManhNhat || !nhanVienCanHoTroNhat) return 0;

    return Math.max(
      0,
      Number(nhanVienManhNhat.ty_le_chot || 0) - Number(nhanVienCanHoTroNhat.ty_le_chot || 0)
    );
  }, [nhanVienManhNhat, nhanVienCanHoTroNhat]);

  const nhanDinhSoSanhNhanVien = useMemo(() => {
    if (!nhanVienManhNhat || !nhanVienCanHoTroNhat) {
      return 'Chưa đủ dữ liệu để so sánh nhân viên. Cần ít nhất vài nhân viên có đủ số lượng khách để đánh giá công bằng.';
    }

    if (doLechTyLeChot >= 30) {
      return 'Chênh lệch hiệu suất đang khá lớn. Nên ưu tiên xem lại cách làm của nhân viên mạnh nhất để chuẩn hóa cho cả nhóm.';
    }

    if (doLechTyLeChot >= 15) {
      return 'Đã có khoảng cách hiệu suất rõ ràng giữa các nhân viên. Nên kèm cặp thêm cho nhóm đang yếu ở các bước giữa và bước chốt.';
    }

    return 'Chênh lệch hiệu suất chưa quá lớn. Nhóm sale đang khá đồng đều, nên tiếp tục theo dõi theo tuần để phát hiện sớm dấu hiệu giảm hiệu quả.';
  }, [nhanVienManhNhat, nhanVienCanHoTroNhat, doLechTyLeChot]);

  const danhSachNhanVien = useMemo(() => {
    return hieuSuatNhanVien.map((item) => item.nhan_vien_tu_van).filter(Boolean);
  }, [hieuSuatNhanVien]);

  const duLieuNhanVienDangXem = useMemo(() => {
    if (!nhanVienDangXem) return [];
    return diemRoiTheoNhanVien
      .filter((item) => item.nhan_vien_tu_van === nhanVienDangXem)
      .sort((a, b) => Number(a.stage_order || 0) - Number(b.stage_order || 0));
  }, [diemRoiTheoNhanVien, nhanVienDangXem]);

  const diemRoiLonNhatTheoNhanVien = useMemo(() => {
    if (duLieuNhanVienDangXem.length <= 1) return null;

    const stagesAfterFirst = duLieuNhanVienDangXem.slice(1);

    return stagesAfterFirst.reduce<DiemRoiTheoNhanVienRow | null>((lowest, current) => {
      if (!lowest) return current;

      const lowestValue = Number(lowest.conversion_from_previous || 0);
      const currentValue = Number(current.conversion_from_previous || 0);

      return currentValue < lowestValue ? current : lowest;
    }, null);
  }, [duLieuNhanVienDangXem]);

  const mucRoiLonNhatTheoNhanVien = useMemo(() => {
    if (!diemRoiLonNhatTheoNhanVien) return 0;

    const conversion = Number(diemRoiLonNhatTheoNhanVien.conversion_from_previous || 0);
    const drop = 100 - conversion;

    return drop > 0 ? drop : 0;
  }, [diemRoiLonNhatTheoNhanVien]);

  const nhanDinhNhanVienDangXem = useMemo(() => {
    if (!duLieuNhanVienDangXem.length) return null;

    const stageDau = duLieuNhanVienDangXem[0] || null;
    const stageCuoi = duLieuNhanVienDangXem[duLieuNhanVienDangXem.length - 1] || null;
    const tyLeTong = stageCuoi ? Number(stageCuoi.conversion_from_start || 0) : 0;

    if (!stageDau || !stageCuoi) return null;

    if (tyLeTong < 20) {
      return {
        mucDo: 'Cần hỗ trợ',
        noiDung: `Nhân viên ${nhanVienDangXem} đang có tỷ lệ đi từ đầu đến cuối chỉ đạt ${formatPercent(
          tyLeTong
        )}. Nên xem lại toàn bộ cách theo dõi khách và xử lý phản đối.`,
      };
    }

    if (diemRoiLonNhatTheoNhanVien && mucRoiLonNhatTheoNhanVien >= 40) {
      return {
        mucDo: 'Có điểm nghẽn rõ',
        noiDung: `Nhân viên ${nhanVienDangXem} đang rơi mạnh nhất ở giai đoạn "${diemRoiLonNhatTheoNhanVien.stage_label}" với mức rơi khoảng ${formatPercent(
          mucRoiLonNhatTheoNhanVien
        )}. Đây là điểm cần kèm lại đầu tiên.`,
      };
    }

    return {
      mucDo: 'Đang ổn định',
      noiDung: `Nhân viên ${nhanVienDangXem} hiện chưa có dấu hiệu bất thường lớn trong chuỗi giai đoạn. Có thể tiếp tục theo dõi thêm theo tuần để xác nhận xu hướng.`,
    };
  }, [
    duLieuNhanVienDangXem,
    nhanVienDangXem,
    diemRoiLonNhatTheoNhanVien,
    mucRoiLonNhatTheoNhanVien,
  ]);

  const loadFunnelData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setStaffBreakdownError(null);

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

      const { data: staffData, error: staffError } = await supabase.rpc(
        'consultation_sales_by_staff',
        {
          p_from: dateRange.from || null,
          p_to: dateRange.to || null,
        }
      );

      if (staffError) {
        throw staffError;
      }

      const normalizedStaffData = Array.isArray(staffData) ? staffData : [];
      setHieuSuatNhanVien(normalizedStaffData);

      if (normalizedStaffData.length > 0) {
        setNhanVienDangXem((current) => {
          const hasCurrent = normalizedStaffData.some(
            (item) => item.nhan_vien_tu_van === current
          );
          return hasCurrent ? current : normalizedStaffData[0].nhan_vien_tu_van;
        });
      } else {
        setNhanVienDangXem('');
      }

      const { data: staffBreakdownData, error: staffBreakdownRpcError } = await supabase.rpc(
        'consultation_sales_staff_stage_breakdown',
        {
          p_from: dateRange.from || null,
          p_to: dateRange.to || null,
        }
      );

      if (staffBreakdownRpcError) {
        console.warn('RPC consultation_sales_staff_stage_breakdown chưa sẵn sàng:', staffBreakdownRpcError);
        setDiemRoiTheoNhanVien([]);
        setStaffBreakdownError(
          'Chưa tải được phần phân tích điểm rơi theo nhân viên. Hãy tạo thêm hàm SQL consultation_sales_staff_stage_breakdown.'
        );
      } else {
        setDiemRoiTheoNhanVien(Array.isArray(staffBreakdownData) ? staffBreakdownData : []);
        setStaffBreakdownError(null);
      }
    } catch (err: any) {
      console.error('Lỗi khi tải dữ liệu phân tích sale:', err);
      setError(err?.message || 'Không thể tải dữ liệu phân tích sale');
      setFunnelData([]);
      setHieuSuatNhanVien([]);
      setDiemRoiTheoNhanVien([]);
      setNhanVienDangXem('');
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
                Funnel chuyển đổi theo từng giai đoạn tư vấn, tách riêng hoàn toàn khỏi ConsultationManager.
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

      {/* Insight nhanh */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <BarChart3 size={18} className="text-gray-500" />
          <h2 className="text-base font-semibold text-gray-800">
            Insight nhanh
          </h2>
        </div>

        {!loading && !error && funnelData.length === 0 && (
          <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-6 py-8 text-sm text-gray-500">
            Chưa có dữ liệu để phân tích insight.
          </div>
        )}

        {!loading && !error && funnelData.length > 0 && (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
              <div className="text-sm font-semibold text-blue-800">
                Tổng quan funnel
              </div>
              <div className="mt-2 text-sm leading-6 text-blue-900">
                Giai đoạn bắt đầu là <strong>{firstStage?.stage_label || '--'}</strong> với{' '}
                <strong>{formatNumber(firstStage?.total_leads || 0)}</strong> lead.
                Giai đoạn cuối hiện tại là <strong>{finalStage?.stage_label || '--'}</strong> với{' '}
                <strong>{formatNumber(finalStage?.total_leads || 0)}</strong> lead,
                tương đương <strong>{formatPercent(overallConversion)}</strong> so với đầu funnel.
              </div>
            </div>

            <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
              <div className="text-sm font-semibold text-amber-800">
                Điểm rơi lớn nhất
              </div>
              <div className="mt-2 text-sm leading-6 text-amber-900">
                Giai đoạn có tỷ lệ giảm mạnh nhất hiện là <strong>{largestDropStage?.stage_label || '--'}</strong>.
                Tỷ lệ giữ lại từ bước trước là <strong>{formatPercent(largestDropStage?.conversion_from_previous || 0)}</strong>,
                tức rơi khoảng <strong>{formatPercent(largestDropPercent)}</strong>.
              </div>
            </div>

            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
              <div className="text-sm font-semibold text-emerald-800">
                Nhận định vận hành
              </div>
              <div className="mt-2 text-sm leading-6 text-emerald-900">
                Nếu tỷ lệ từ đầu funnel đến cuối funnel thấp, cần kiểm tra lại chất lượng theo dõi lại khách,
                tốc độ phản hồi và nội dung tư vấn ở các giai đoạn giữa.
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-sm font-semibold text-slate-800">
                Gợi ý đọc số liệu
              </div>
              <div className="mt-2 text-sm leading-6 text-slate-900">
                Ưu tiên theo dõi <strong>tỷ lệ từ bước trước</strong> để tìm đúng điểm nghẽn từng bước,
                và theo dõi <strong>tỷ lệ từ đầu funnel</strong> để đánh giá hiệu quả toàn bộ funnel.
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Recommendation rule-based */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <BarChart3 size={18} className="text-gray-500" />
          <h2 className="text-base font-semibold text-gray-800">
            Khuyến nghị hành động
          </h2>
        </div>

        {!loading && !error && funnelData.length === 0 && (
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

      {/* So sánh nhanh nhân viên */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <BarChart3 size={18} className="text-gray-500" />
          <h2 className="text-base font-semibold text-gray-800">
            So sánh nhanh nhân viên
          </h2>
        </div>

        {!loading && !error && hieuSuatNhanVien.length === 0 && (
          <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-6 py-8 text-sm text-gray-500">
            Chưa có dữ liệu nhân viên để so sánh.
          </div>
        )}

        {!loading && !error && hieuSuatNhanVien.length > 0 && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-sm text-slate-600">
                Chỉ so sánh các nhân viên có từ <strong>{SO_LEAD_TOI_THIEU_DE_SO_SANH}</strong> khách trở lên để tránh sai lệch do mẫu quá nhỏ.
              </div>
            </div>

            {!nhanVienManhNhat || !nhanVienCanHoTroNhat ? (
              <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-6 py-8 text-sm text-gray-500">
                Chưa đủ dữ liệu để xác định nhân viên mạnh nhất và nhân viên cần hỗ trợ nhất.
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
                    <div className="text-sm font-semibold text-emerald-800">
                      Nhân viên nổi bật nhất
                    </div>
                    <div className="mt-2 text-xl font-bold text-gray-900">
                      {nhanVienManhNhat.nhan_vien_tu_van}
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <div className="text-gray-500">Tổng lead</div>
                        <div className="font-semibold text-gray-900">
                          {formatNumber(nhanVienManhNhat.tong_lead)}
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-500">Đã chốt</div>
                        <div className="font-semibold text-gray-900">
                          {formatNumber(nhanVienManhNhat.lead_da_chot)}
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-500">Tỷ lệ chốt</div>
                        <div className="font-semibold text-gray-900">
                          {formatPercent(nhanVienManhNhat.ty_le_chot)}
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-500">Giá trị dự kiến</div>
                        <div className="font-semibold text-gray-900">
                          {formatNumber(nhanVienManhNhat.tong_gia_tri_du_kien)}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
                    <div className="text-sm font-semibold text-amber-800">
                      Nhân viên cần hỗ trợ nhất
                    </div>
                    <div className="mt-2 text-xl font-bold text-gray-900">
                      {nhanVienCanHoTroNhat.nhan_vien_tu_van}
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <div className="text-gray-500">Tổng lead</div>
                        <div className="font-semibold text-gray-900">
                          {formatNumber(nhanVienCanHoTroNhat.tong_lead)}
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-500">Đã chốt</div>
                        <div className="font-semibold text-gray-900">
                          {formatNumber(nhanVienCanHoTroNhat.lead_da_chot)}
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-500">Tỷ lệ chốt</div>
                        <div className="font-semibold text-gray-900">
                          {formatPercent(nhanVienCanHoTroNhat.ty_le_chot)}
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-500">Giá trị dự kiến</div>
                        <div className="font-semibold text-gray-900">
                          {formatNumber(nhanVienCanHoTroNhat.tong_gia_tri_du_kien)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                    <div className="text-sm text-gray-500">Chênh lệch tỷ lệ chốt</div>
                    <div className="mt-2 text-2xl font-bold text-gray-900">
                      {formatPercent(doLechTyLeChot)}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                    <div className="text-sm text-gray-500">Người mạnh nhất</div>
                    <div className="mt-2 text-lg font-bold text-gray-900">
                      {nhanVienManhNhat.nhan_vien_tu_van}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                    <div className="text-sm text-gray-500">Người cần hỗ trợ</div>
                    <div className="mt-2 text-lg font-bold text-gray-900">
                      {nhanVienCanHoTroNhat.nhan_vien_tu_van}
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
                  <div className="text-sm font-semibold text-blue-800">
                    Nhận định quản lý
                  </div>
                  <div className="mt-2 text-sm leading-6 text-blue-900">
                    {nhanDinhSoSanhNhanVien}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Hiệu suất theo nhân viên */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <BarChart3 size={18} className="text-gray-500" />
          <h2 className="text-base font-semibold text-gray-800">
            Hiệu suất theo nhân viên tư vấn
          </h2>
        </div>

        {!loading && !error && hieuSuatNhanVien.length === 0 && (
          <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-6 py-8 text-sm text-gray-500">
            Chưa có dữ liệu theo nhân viên trong khoảng thời gian đang chọn.
          </div>
        )}

        {!loading && !error && hieuSuatNhanVien.length > 0 && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <div className="text-sm text-gray-500">Tổng lead theo nhân viên</div>
                <div className="mt-2 text-2xl font-bold text-gray-900">
                  {formatNumber(tongLeadTatCaNhanVien)}
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <div className="text-sm text-gray-500">Tổng khách đã chốt</div>
                <div className="mt-2 text-2xl font-bold text-gray-900">
                  {formatNumber(tongChotTatCaNhanVien)}
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <div className="text-sm text-gray-500">Nhân viên nổi bật nhất</div>
                <div className="mt-2 text-lg font-bold text-gray-900">
                  {topNhanVien?.nhan_vien_tu_van || '--'}
                </div>
                <div className="mt-1 text-sm text-gray-500">
                  Tỷ lệ chốt: {formatPercent(topNhanVien?.ty_le_chot || 0)}
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-y-2">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Nhân viên
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Tổng lead
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
                      Giá trị dự kiến
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {hieuSuatNhanVien.map((item) => (
                    <tr key={item.nhan_vien_tu_van} className="bg-gray-50">
                      <td className="rounded-l-xl px-4 py-3">
                        <div className="text-sm font-medium text-gray-800">
                          {item.nhan_vien_tu_van}
                        </div>
                        <div className="mt-2 h-2 w-40 rounded-full bg-gray-200">
                          <div
                            className="h-2 rounded-full bg-blue-600"
                            style={{ width: `${clampPercent(item.ty_le_chot)}%` }}
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

                      <td className="rounded-r-xl px-4 py-3 text-right text-sm text-gray-700">
                        {formatNumber(item.tong_gia_tri_du_kien)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Điểm rơi theo từng nhân viên */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <UserRound size={18} className="text-gray-500" />
          <h2 className="text-base font-semibold text-gray-800">
            Điểm rơi theo từng nhân viên
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lg:col-span-1">
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Chọn nhân viên cần xem chi tiết
            </label>
            <select
              value={nhanVienDangXem}
              onChange={(e) => setNhanVienDangXem(e.target.value)}
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              {danhSachNhanVien.length === 0 && <option value="">Chưa có dữ liệu nhân viên</option>}
              {danhSachNhanVien.map((tenNhanVien) => (
                <option key={tenNhanVien} value={tenNhanVien}>
                  {tenNhanVien}
                </option>
              ))}
            </select>
          </div>

          <div className="lg:col-span-2 rounded-2xl border border-gray-200 bg-gray-50 p-4">
            <div className="text-sm font-semibold text-gray-800">
              Nhận định nhanh cho nhân viên đang xem
            </div>
            <div className="mt-2 text-sm leading-6 text-gray-700">
              {nhanDinhNhanVienDangXem?.noiDung ||
                'Khi có dữ liệu chi tiết theo nhân viên, hệ thống sẽ chỉ ra giai đoạn mà từng người đang làm rơi khách mạnh nhất.'}
            </div>
          </div>
        </div>

        {staffBreakdownError && (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {staffBreakdownError}
          </div>
        )}

        {!loading && !error && !staffBreakdownError && duLieuNhanVienDangXem.length === 0 && (
          <div className="mt-4 rounded-xl border border-dashed border-gray-300 bg-gray-50 px-6 py-8 text-sm text-gray-500">
            Chưa có dữ liệu chi tiết theo giai đoạn cho nhân viên đang chọn.
          </div>
        )}

        {!loading && !error && !staffBreakdownError && duLieuNhanVienDangXem.length > 0 && (
          <div className="mt-4 space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <div className="text-sm text-gray-500">Nhân viên đang xem</div>
                <div className="mt-2 text-lg font-bold text-gray-900">
                  {nhanVienDangXem || '--'}
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <div className="text-sm text-gray-500">Điểm rơi lớn nhất</div>
                <div className="mt-2 text-lg font-bold text-gray-900">
                  {diemRoiLonNhatTheoNhanVien?.stage_label || '--'}
                </div>
                <div className="mt-1 text-sm text-gray-500">
                  Mức rơi: {formatPercent(mucRoiLonNhatTheoNhanVien)}
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <div className="text-sm text-gray-500">Tỷ lệ tới chặng cuối</div>
                <div className="mt-2 text-lg font-bold text-gray-900">
                  {formatPercent(
                    duLieuNhanVienDangXem[duLieuNhanVienDangXem.length - 1]?.conversion_from_start || 0
                  )}
                </div>
              </div>
            </div>

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
                  {duLieuNhanVienDangXem.map((item) => (
                    <tr key={`${item.nhan_vien_tu_van}-${item.stage_key}`} className="bg-gray-50">
                      <td className="rounded-l-xl px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-700">
                            {item.stage_order}
                          </div>
                          <div className="text-sm font-medium text-gray-800">{item.stage_label}</div>
                        </div>
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

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {duLieuNhanVienDangXem.map((item) => (
                <div
                  key={`${item.nhan_vien_tu_van}-${item.stage_key}-card`}
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
                    Tỷ lệ giữ lại từ bước trước: <strong>{formatPercent(item.conversion_from_previous)}</strong>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
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
