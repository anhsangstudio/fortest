
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Filter,
  RefreshCw,
  Target,
  TrendingDown,
  TrendingUp,
  Users,
} from 'lucide-react';
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

type ServiceTrendRow = {
  thang: string;
  nam: number;
  thang_so: number;
  dich_vu_id: string;
  ten_dich_vu: string;
  tong_lead: number;
  lead_da_chot: number;
  ty_le_chot: number;
  ty_trong_trong_thang: number;
  tang_truong_lead_so_voi_thang_truoc: number;
};

type ServiceRejectionReasonRow = {
  dich_vu_id: string;
  ten_dich_vu: string;
  ly_do_tu_choi_id: string;
  ten_ly_do: string;
  so_luong_tu_choi: number;
  ty_trong_tu_choi_trong_dich_vu: number;
  xep_hang_ly_do: number;
};

type ServiceFunnelRow = {
  dich_vu_id: string;
  ten_dich_vu: string;
  stage_key: string;
  stage_label: string;
  stage_order: number;
  total_leads: number;
  conversion_from_previous: number;
  conversion_from_start: number;
};

type ServiceStaffPerformanceRow = {
  dich_vu_id: string;
  ten_dich_vu: string;
  nhan_vien_tu_van: string;
  tong_lead: number;
  lead_da_chot: number;
  lead_tu_choi: number;
  lead_dang_xu_ly: number;
  ty_le_chot: number;
  tong_gia_tri_du_kien: number;
  xep_hang_nhan_vien: number;
};

type StrategicGroupKey =
  | 'nhu_cau_cao_chot_tot'
  | 'nhu_cau_cao_chot_kem'
  | 'nhu_cau_thap_chot_tot'
  | 'nhu_cau_thap_chot_kem';

type StrategicServiceRow = ServicePerformanceRow & {
  lead_chua_dap_ung: number;
  ty_le_chua_dap_ung: number;
  nhom_chien_luoc: StrategicGroupKey;
  nhan_nhom: string;
};

type PriorityRow = StrategicServiceRow & {
  diem_uu_tien: number;
  huong_xu_ly: string;
};

const getToday = () => new Date().toISOString().slice(0, 10);

const getFirstDayOfMonth = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
};

const formatPercent = (value?: number | null) => `${Number(value || 0).toFixed(1)}%`;

const formatNumber = (value?: number | null) => Number(value || 0).toLocaleString('vi-VN');

const clampPercent = (value?: number | null) => {
  const n = Number(value || 0);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, n));
};

const groupStyleMap: Record<StrategicGroupKey, { box: string; title: string; badge: string }> = {
  nhu_cau_cao_chot_tot: {
    box: 'border-emerald-200 bg-emerald-50',
    title: 'text-emerald-800',
    badge: 'text-emerald-700 bg-emerald-100',
  },
  nhu_cau_cao_chot_kem: {
    box: 'border-red-200 bg-red-50',
    title: 'text-red-800',
    badge: 'text-red-700 bg-red-100',
  },
  nhu_cau_thap_chot_tot: {
    box: 'border-blue-200 bg-blue-50',
    title: 'text-blue-800',
    badge: 'text-blue-700 bg-blue-100',
  },
  nhu_cau_thap_chot_kem: {
    box: 'border-slate-200 bg-slate-50',
    title: 'text-slate-800',
    badge: 'text-slate-700 bg-slate-200',
  },
};

const ConsultationServiceAnalytics: React.FC = () => {
  const [dateRange, setDateRange] = useState({
    from: getFirstDayOfMonth(),
    to: getToday(),
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [trendError, setTrendError] = useState<string | null>(null);
  const [rejectionError, setRejectionError] = useState<string | null>(null);
  const [serviceFunnelError, setServiceFunnelError] = useState<string | null>(null);
  const [serviceStaffError, setServiceStaffError] = useState<string | null>(null);

  const [serviceData, setServiceData] = useState<ServicePerformanceRow[]>([]);
  const [trendData, setTrendData] = useState<ServiceTrendRow[]>([]);
  const [rejectionData, setRejectionData] = useState<ServiceRejectionReasonRow[]>([]);
  const [serviceFunnelData, setServiceFunnelData] = useState<ServiceFunnelRow[]>([]);
  const [serviceStaffData, setServiceStaffData] = useState<ServiceStaffPerformanceRow[]>([]);

  const [selectedServiceId, setSelectedServiceId] = useState<string>('');

  const totalLeads = useMemo(
    () => serviceData.reduce((sum, item) => sum + Number(item.tong_lead || 0), 0),
    [serviceData]
  );

  const totalWonLeads = useMemo(
    () => serviceData.reduce((sum, item) => sum + Number(item.lead_da_chot || 0), 0),
    [serviceData]
  );

  const totalUnmetLeads = useMemo(() => Math.max(0, totalLeads - totalWonLeads), [totalLeads, totalWonLeads]);

  const overallResponseRate = useMemo(() => {
    if (!totalLeads) return 0;
    return (totalWonLeads / totalLeads) * 100;
  }, [totalLeads, totalWonLeads]);

  const highDemandThreshold = useMemo(() => {
    if (!serviceData.length) return 0;
    return serviceData.reduce((sum, item) => sum + Number(item.ty_trong_nhu_cau || 0), 0) / serviceData.length;
  }, [serviceData]);

  const goodCloseThreshold = useMemo(() => {
    if (!serviceData.length) return 0;
    return serviceData.reduce((sum, item) => sum + Number(item.ty_le_chot || 0), 0) / serviceData.length;
  }, [serviceData]);

  const strategicData = useMemo<StrategicServiceRow[]>(() => {
    return serviceData.map((item) => {
      const leadChuaDapUng = Math.max(0, Number(item.tong_lead || 0) - Number(item.lead_da_chot || 0));
      const tyLeChuaDapUng = Number(item.tong_lead || 0) === 0 ? 0 : (leadChuaDapUng / Number(item.tong_lead || 0)) * 100;

      const nhuCauCao = Number(item.ty_trong_nhu_cau || 0) >= highDemandThreshold;
      const chotTot = Number(item.ty_le_chot || 0) >= goodCloseThreshold;

      let nhom_chien_luoc: StrategicGroupKey = 'nhu_cau_thap_chot_kem';
      let nhan_nhom = 'Nhu cầu thấp + chốt kém';

      if (nhuCauCao && chotTot) {
        nhom_chien_luoc = 'nhu_cau_cao_chot_tot';
        nhan_nhom = 'Nhu cầu cao + chốt tốt';
      } else if (nhuCauCao && !chotTot) {
        nhom_chien_luoc = 'nhu_cau_cao_chot_kem';
        nhan_nhom = 'Nhu cầu cao + chốt kém';
      } else if (!nhuCauCao && chotTot) {
        nhom_chien_luoc = 'nhu_cau_thap_chot_tot';
        nhan_nhom = 'Nhu cầu thấp + chốt tốt';
      }

      return {
        ...item,
        lead_chua_dap_ung: leadChuaDapUng,
        ty_le_chua_dap_ung: tyLeChuaDapUng,
        nhom_chien_luoc,
        nhan_nhom,
      };
    });
  }, [serviceData, highDemandThreshold, goodCloseThreshold]);

  const mostInterestedService = useMemo(() => {
    return [...serviceData].sort((a, b) => Number(b.tong_lead || 0) - Number(a.tong_lead || 0))[0] || null;
  }, [serviceData]);

  const weakestCloseService = useMemo(() => {
    return [...serviceData]
      .filter((item) => Number(item.tong_lead || 0) > 0)
      .sort((a, b) => Number(a.ty_le_chot || 0) - Number(b.ty_le_chot || 0))[0] || null;
  }, [serviceData]);

  const greatestOpportunityService = useMemo(() => {
    return [...strategicData].sort((a, b) => Number(b.lead_chua_dap_ung || 0) - Number(a.lead_chua_dap_ung || 0))[0] || null;
  }, [strategicData]);

  const strategicSummary = useMemo(() => {
    const highDemandWeak = strategicData.filter((item) => item.nhom_chien_luoc === 'nhu_cau_cao_chot_kem');
    const lowDemandStrong = strategicData.filter((item) => item.nhom_chien_luoc === 'nhu_cau_thap_chot_tot');

    if (highDemandWeak.length > 0) {
      return `Nhóm cần xử lý trước là các dịch vụ có nhu cầu cao nhưng chốt kém. Đây là nơi thị trường đang quan tâm nhưng studio chưa chuyển tốt thành doanh thu.`;
    }

    if (lowDemandStrong.length > 0) {
      return `Có các dịch vụ nhu cầu chưa cao nhưng chốt tốt. Đây là nhóm nên cân nhắc đẩy truyền thông để mở rộng doanh thu.`;
    }

    return `Cơ cấu dịch vụ hiện chưa xuất hiện lệch lớn bất thường. Nên tiếp tục theo dõi đồng thời cả nhu cầu và tỷ lệ chốt để phát hiện sớm dịch vụ có vấn đề.`;
  }, [strategicData]);

  const priorityData = useMemo<PriorityRow[]>(() => {
    return strategicData
      .map((item) => {
        const diemUuTien =
          Number(item.ty_trong_nhu_cau || 0) * 0.4 +
          Number(item.ty_le_chua_dap_ung || 0) * 0.35 +
          Number(item.lead_chua_dap_ung || 0) * 0.25;

        let huongXuLy = 'Tiếp tục theo dõi để xác nhận xu hướng.';
        if (item.nhom_chien_luoc === 'nhu_cau_cao_chot_kem') {
          huongXuLy = 'Ưu tiên xem lại gói dịch vụ, cách báo giá và nội dung tư vấn của dịch vụ này.';
        } else if (item.nhom_chien_luoc === 'nhu_cau_thap_chot_tot') {
          huongXuLy = 'Có thể đẩy marketing đúng tệp vì dịch vụ này đang chốt khá tốt.';
        } else if (item.nhom_chien_luoc === 'nhu_cau_cao_chot_tot') {
          huongXuLy = 'Tiếp tục giữ là dịch vụ chủ lực và bảo vệ chất lượng chốt.';
        } else if (item.nhom_chien_luoc === 'nhu_cau_thap_chot_kem') {
          huongXuLy = 'Cân nhắc giảm ưu tiên hoặc làm mới gói trước khi tăng ngân sách.';
        }

        return {
          ...item,
          diem_uu_tien: diemUuTien,
          huong_xu_ly: huongXuLy,
        };
      })
      .sort((a, b) => Number(b.diem_uu_tien || 0) - Number(a.diem_uu_tien || 0));
  }, [strategicData]);

  const topPriorityServices = useMemo(() => priorityData.slice(0, 2), [priorityData]);

  const topRejectionReasons = useMemo(() => {
    return [...rejectionData]
      .sort((a, b) => Number(b.so_luong_tu_choi || 0) - Number(a.so_luong_tu_choi || 0))
      .slice(0, 6);
  }, [rejectionData]);

  const mostCommonRejectionReason = useMemo(() => topRejectionReasons[0] || null, [topRejectionReasons]);

  const serviceMostNeedReview = useMemo(() => {
    return [...rejectionData]
      .filter((item) => Number(item.xep_hang_ly_do || 0) === 1)
      .sort((a, b) => Number(b.so_luong_tu_choi || 0) - Number(a.so_luong_tu_choi || 0))[0] || null;
  }, [rejectionData]);

  const trendMonths = useMemo(() => {
    return Array.from(new Set(trendData.map((item) => item.thang))).sort((a, b) => {
      const pa = a.split('/').map(Number);
      const pb = b.split('/').map(Number);
      return pa[1] === pb[1] ? pa[0] - pb[0] : pa[1] - pb[1];
    });
  }, [trendData]);

  const latestTrendByService = useMemo(() => {
    const map = new Map<string, ServiceTrendRow>();
    const sorted = [...trendData].sort((a, b) => {
      if (a.nam !== b.nam) return a.nam - b.nam;
      return a.thang_so - b.thang_so;
    });
    sorted.forEach((item) => map.set(item.dich_vu_id, item));
    return Array.from(map.values());
  }, [trendData]);

  const fastestGrowingService = useMemo(() => {
    return [...latestTrendByService]
      .sort(
        (a, b) =>
          Number(b.tang_truong_lead_so_voi_thang_truoc || 0) -
          Number(a.tang_truong_lead_so_voi_thang_truoc || 0)
      )[0] || null;
  }, [latestTrendByService]);

  const fastestDroppingService = useMemo(() => {
    return [...latestTrendByService]
      .sort(
        (a, b) =>
          Number(a.tang_truong_lead_so_voi_thang_truoc || 0) -
          Number(b.tang_truong_lead_so_voi_thang_truoc || 0)
      )[0] || null;
  }, [latestTrendByService]);

  const selectedServiceRows = useMemo(() => {
    if (!selectedServiceId) return [];
    return serviceFunnelData
      .filter((item) => item.dich_vu_id === selectedServiceId)
      .sort((a, b) => Number(a.stage_order || 0) - Number(b.stage_order || 0));
  }, [serviceFunnelData, selectedServiceId]);

  const selectedServiceMeta = useMemo(() => {
    return strategicData.find((item) => item.dich_vu_id === selectedServiceId) || null;
  }, [strategicData, selectedServiceId]);

  const selectedServiceBiggestDrop = useMemo(() => {
    if (selectedServiceRows.length <= 1) return null;
    return selectedServiceRows.slice(1).reduce<ServiceFunnelRow | null>((lowest, current) => {
      if (!lowest) return current;
      return Number(current.conversion_from_previous || 0) < Number(lowest.conversion_from_previous || 0)
        ? current
        : lowest;
    }, null);
  }, [selectedServiceRows]);

  const selectedServiceBiggestDropPercent = useMemo(() => {
    if (!selectedServiceBiggestDrop) return 0;
    return Math.max(0, 100 - Number(selectedServiceBiggestDrop.conversion_from_previous || 0));
  }, [selectedServiceBiggestDrop]);

  const selectedServiceTopReasons = useMemo(() => {
    if (!selectedServiceId) return [];
    return rejectionData
      .filter((item) => item.dich_vu_id === selectedServiceId)
      .sort((a, b) => Number(a.xep_hang_ly_do || 0) - Number(b.xep_hang_ly_do || 0))
      .slice(0, 3);
  }, [rejectionData, selectedServiceId]);


  const selectedServiceStaffRows = useMemo(() => {
    if (!selectedServiceId) return [];
    return serviceStaffData
      .filter((item) => item.dich_vu_id === selectedServiceId)
      .sort((a, b) => {
        const rankA = Number(a.xep_hang_nhan_vien || 0);
        const rankB = Number(b.xep_hang_nhan_vien || 0);
        if (rankA !== rankB) return rankA - rankB;
        return Number(b.ty_le_chot || 0) - Number(a.ty_le_chot || 0);
      });
  }, [serviceStaffData, selectedServiceId]);

  const topStaffForSelectedService = useMemo(() => {
    return selectedServiceStaffRows.length > 0 ? selectedServiceStaffRows[0] : null;
  }, [selectedServiceStaffRows]);

  const weakStaffForSelectedService = useMemo(() => {
    return selectedServiceStaffRows.length > 0
      ? [...selectedServiceStaffRows].sort((a, b) => {
          const closeA = Number(a.ty_le_chot || 0);
          const closeB = Number(b.ty_le_chot || 0);
          if (closeA !== closeB) return closeA - closeB;
          return Number(b.tong_lead || 0) - Number(a.tong_lead || 0);
        })[0]
      : null;
  }, [selectedServiceStaffRows]);

  const selectedServiceStaffInsight = useMemo(() => {
    if (!selectedServiceMeta) {
      return 'Chọn một dịch vụ để xem nhân viên nào đang bán tốt hoặc đang cần hỗ trợ ở dịch vụ đó.';
    }

    if (!selectedServiceStaffRows.length) {
      return `Chưa có dữ liệu so sánh nhân viên cho dịch vụ "${selectedServiceMeta.ten_dich_vu}".`;
    }

    if (selectedServiceStaffRows.length === 1) {
      return `Dịch vụ "${selectedServiceMeta.ten_dich_vu}" hiện mới có dữ liệu của 1 nhân viên tư vấn. Cần thêm dữ liệu để so sánh hiệu quả giữa các nhân viên.`;
    }

    if (topStaffForSelectedService && weakStaffForSelectedService) {
      const gap = Math.max(
        0,
        Number(topStaffForSelectedService.ty_le_chot || 0) - Number(weakStaffForSelectedService.ty_le_chot || 0)
      );

      if (gap >= 25) {
        return `Dịch vụ "${selectedServiceMeta.ten_dich_vu}" đang có chênh lệch hiệu suất rất lớn giữa nhân viên tốt nhất và nhân viên cần hỗ trợ. Nên dùng cách làm của "${topStaffForSelectedService.nhan_vien_tu_van}" để kèm lại cho các bạn còn yếu.`;
      }

      if (gap >= 10) {
        return `Dịch vụ "${selectedServiceMeta.ten_dich_vu}" đã xuất hiện chênh lệch hiệu suất rõ giữa các nhân viên. Nên kiểm tra lại cách tư vấn, xử lý phản đối và theo dõi lại khách của nhóm đang thấp hơn.`;
      }
    }

    return `Nhóm sale đang có hiệu suất khá đồng đều ở dịch vụ "${selectedServiceMeta.ten_dich_vu}". Có thể tiếp tục theo dõi theo tuần và nhân rộng cách làm hiệu quả nhất.`;
  }, [
    selectedServiceMeta,
    selectedServiceStaffRows,
    topStaffForSelectedService,
    weakStaffForSelectedService,
  ]);

  const selectedServiceInsight = useMemo(() => {
    if (!selectedServiceMeta) return 'Chọn một dịch vụ để xem điểm rơi funnel chi tiết.';
    if (!selectedServiceRows.length) {
      return `Chưa có dữ liệu funnel chi tiết cho dịch vụ "${selectedServiceMeta.ten_dich_vu}". Hãy tạo thêm hàm SQL consultation_service_funnel_by_service để xem phần này.`;
    }

    if (selectedServiceBiggestDrop && selectedServiceBiggestDropPercent >= 40) {
      return `Dịch vụ "${selectedServiceMeta.ten_dich_vu}" đang rơi mạnh nhất tại giai đoạn "${selectedServiceBiggestDrop.stage_label}" với mức rơi khoảng ${formatPercent(
        selectedServiceBiggestDropPercent
      )}. Đây là bước cần xem lại đầu tiên.`;
    }

    if (selectedServiceMeta.ty_le_chot < goodCloseThreshold) {
      return `Dịch vụ "${selectedServiceMeta.ten_dich_vu}" hiện có tỷ lệ chốt thấp hơn mặt bằng chung. Nên kiểm tra thêm lý do từ chối và cách tư vấn ở các bước giữa.`;
    }

    return `Funnel của dịch vụ "${selectedServiceMeta.ten_dich_vu}" hiện chưa có điểm rơi quá lớn. Có thể tiếp tục theo dõi theo tuần để xác nhận sự ổn định.`;
  }, [
    selectedServiceMeta,
    selectedServiceRows,
    selectedServiceBiggestDrop,
    selectedServiceBiggestDropPercent,
    goodCloseThreshold,
  ]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setTrendError(null);
      setRejectionError(null);
      setServiceFunnelError(null);
      setServiceStaffError(null);

      if (!supabase) {
        throw new Error('Supabase chưa được cấu hình');
      }

      const { data: performanceData, error: performanceError } = await supabase.rpc(
        'consultation_sales_by_service_performance',
        {
          p_from: dateRange.from || null,
          p_to: dateRange.to || null,
        }
      );

      if (performanceError) throw performanceError;

      const normalizedPerformanceData = Array.isArray(performanceData) ? performanceData : [];
      setServiceData(normalizedPerformanceData);

      if (normalizedPerformanceData.length > 0) {
        setSelectedServiceId((current) => {
          const hasCurrent = normalizedPerformanceData.some((item) => item.dich_vu_id === current);
          return hasCurrent ? current : normalizedPerformanceData[0].dich_vu_id;
        });
      } else {
        setSelectedServiceId('');
      }

      const { data: trendRpcData, error: trendRpcError } = await supabase.rpc(
        'consultation_service_trend_by_month',
        {
          p_from: dateRange.from || null,
          p_to: dateRange.to || null,
        }
      );

      if (trendRpcError) {
        console.warn('RPC consultation_service_trend_by_month chưa sẵn sàng:', trendRpcError);
        setTrendData([]);
        setTrendError(
          'Chưa tải được phần xu hướng theo tháng của dịch vụ. Hãy tạo thêm hàm SQL consultation_service_trend_by_month.'
        );
      } else {
        setTrendData(Array.isArray(trendRpcData) ? trendRpcData : []);
      }

      const { data: rejectionRpcData, error: rejectionRpcError } = await supabase.rpc(
        'consultation_service_rejection_reasons',
        {
          p_from: dateRange.from || null,
          p_to: dateRange.to || null,
        }
      );

      if (rejectionRpcError) {
        console.warn('RPC consultation_service_rejection_reasons chưa sẵn sàng:', rejectionRpcError);
        setRejectionData([]);
        setRejectionError(
          'Chưa tải được phần lý do từ chối theo dịch vụ. Hãy tạo thêm hàm SQL consultation_service_rejection_reasons.'
        );
      } else {
        setRejectionData(Array.isArray(rejectionRpcData) ? rejectionRpcData : []);
      }

      const { data: serviceFunnelRpcData, error: serviceFunnelRpcError } = await supabase.rpc(
        'consultation_service_funnel_by_service',
        {
          p_from: dateRange.from || null,
          p_to: dateRange.to || null,
        }
      );

      if (serviceFunnelRpcError) {
        console.warn('RPC consultation_service_funnel_by_service chưa sẵn sàng:', serviceFunnelRpcError);
        setServiceFunnelData([]);
        setServiceFunnelError(
          'Chưa tải được phần điểm rơi funnel theo dịch vụ. Hãy tạo thêm hàm SQL consultation_service_funnel_by_service.'
        );
      } else {
        setServiceFunnelData(Array.isArray(serviceFunnelRpcData) ? serviceFunnelRpcData : []);
      }
    } catch (err: any) {
      console.error('Lỗi khi tải dữ liệu phân tích dịch vụ:', err);
      setError(err?.message || 'Không thể tải dữ liệu phân tích dịch vụ');
      setServiceData([]);
      setTrendData([]);
      setRejectionData([]);
      setServiceFunnelData([]);
      setServiceStaffData([]);
      setSelectedServiceId('');
    } finally {
      setLoading(false);
    }
  }, [dateRange.from, dateRange.to]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <div className="space-y-6 p-6">
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-sm">
              <Target size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Phân Tích Dịch Vụ</h1>
              <p className="mt-1 text-sm text-gray-500">
                Đo nhu cầu thị trường, tỷ lệ đáp ứng, xu hướng theo tháng và điểm rơi funnel theo từng dịch vụ.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={loadData}
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
            <label className="mb-2 block text-sm font-medium text-gray-700">Từ ngày</label>
            <input
              type="date"
              value={dateRange.from}
              onChange={(e) => setDateRange((prev) => ({ ...prev, from: e.target.value }))}
              className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Đến ngày</label>
            <input
              type="date"
              value={dateRange.to}
              onChange={(e) => setDateRange((prev) => ({ ...prev, to: e.target.value }))}
              className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>
          <div className="flex items-end">
            <button
              type="button"
              onClick={loadData}
              disabled={loading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              Áp dụng bộ lọc
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="text-sm text-gray-500">Tổng lead thị trường</div>
          <div className="mt-2 text-3xl font-bold text-gray-900">{formatNumber(totalLeads)}</div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="text-sm text-gray-500">Lead đã chốt</div>
          <div className="mt-2 text-3xl font-bold text-gray-900">{formatNumber(totalWonLeads)}</div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="text-sm text-gray-500">Tỷ lệ đáp ứng nhu cầu</div>
          <div className="mt-2 text-3xl font-bold text-gray-900">{formatPercent(overallResponseRate)}</div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="text-sm text-gray-500">Dịch vụ được quan tâm nhất</div>
          <div className="mt-2 text-lg font-bold text-gray-900">
            {mostInterestedService?.ten_dich_vu || '--'}
          </div>
          <div className="mt-1 text-sm text-gray-500">
            {formatNumber(mostInterestedService?.tong_lead || 0)} lead
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <BarChart3 size={18} className="text-gray-500" />
          <h2 className="text-base font-semibold text-gray-800">Insight nhanh theo dịch vụ</h2>
        </div>

        {!loading && serviceData.length === 0 && (
          <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-6 py-10 text-center text-sm text-gray-500">
            Chưa có dữ liệu dịch vụ trong khoảng thời gian đang chọn.
          </div>
        )}

        {!loading && serviceData.length > 0 && (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
              <div className="text-sm font-semibold text-blue-800">Dịch vụ được quan tâm nhiều nhất</div>
              <div className="mt-2 text-sm leading-6 text-blue-900">
                <strong>{mostInterestedService?.ten_dich_vu || '--'}</strong> hiện có{' '}
                <strong>{formatNumber(mostInterestedService?.tong_lead || 0)}</strong> lead, chiếm{' '}
                <strong>{formatPercent(mostInterestedService?.ty_trong_nhu_cau || 0)}</strong> tổng nhu cầu hiện có.
              </div>
            </div>

            <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
              <div className="text-sm font-semibold text-amber-800">Dịch vụ chốt yếu nhất</div>
              <div className="mt-2 text-sm leading-6 text-amber-900">
                <strong>{weakestCloseService?.ten_dich_vu || '--'}</strong> đang có tỷ lệ chốt chỉ khoảng{' '}
                <strong>{formatPercent(weakestCloseService?.ty_le_chot || 0)}</strong>.
              </div>
            </div>

            <div className="rounded-2xl border border-red-100 bg-red-50 p-4">
              <div className="text-sm font-semibold text-red-800">Dịch vụ đang mất cơ hội nhiều nhất</div>
              <div className="mt-2 text-sm leading-6 text-red-900">
                <strong>{greatestOpportunityService?.ten_dich_vu || '--'}</strong> hiện còn{' '}
                <strong>{formatNumber(greatestOpportunityService?.lead_chua_dap_ung || 0)}</strong> lead chưa được đáp ứng,
                tương đương <strong>{formatPercent(greatestOpportunityService?.ty_le_chua_dap_ung || 0)}</strong>.
              </div>
            </div>

            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
              <div className="text-sm font-semibold text-emerald-800">Nhận định vận hành</div>
              <div className="mt-2 text-sm leading-6 text-emerald-900">
                Tỷ lệ đáp ứng toàn bộ hiện là <strong>{formatPercent(overallResponseRate)}</strong>. Phần còn lại là nhu cầu chưa được
                chuyển hóa, cần đọc cùng với lý do từ chối và điểm rơi funnel của từng dịch vụ.
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <CheckCircle2 size={18} className="text-gray-500" />
          <h2 className="text-base font-semibold text-gray-800">Bản đồ chiến lược dịch vụ 4 nhóm</h2>
        </div>

        {!loading && strategicData.length > 0 && (
          <>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
              {strategicSummary}
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
              {(['nhu_cau_cao_chot_tot', 'nhu_cau_cao_chot_kem', 'nhu_cau_thap_chot_tot', 'nhu_cau_thap_chot_kem'] as StrategicGroupKey[]).map(
                (groupKey) => {
                  const items = strategicData.filter((item) => item.nhom_chien_luoc === groupKey);
                  const style = groupStyleMap[groupKey];
                  return (
                    <div key={groupKey} className={`rounded-2xl border p-4 ${style.box}`}>
                      <div className={`text-sm font-semibold ${style.title}`}>{items[0]?.nhan_nhom || 'Nhóm chiến lược'}</div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {items.length === 0 && <span className="text-sm text-gray-600">Chưa có dịch vụ trong nhóm này.</span>}
                        {items.map((item) => (
                          <span
                            key={item.dich_vu_id}
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${style.badge}`}
                          >
                            {item.ten_dich_vu}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          </>
        )}
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <AlertTriangle size={18} className="text-gray-500" />
          <h2 className="text-base font-semibold text-gray-800">Ưu tiên xử lý nhu cầu chưa đáp ứng</h2>
        </div>

        {!loading && priorityData.length > 0 && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {topPriorityServices.map((item, index) => (
                <div key={item.dich_vu_id} className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
                  <div className="text-sm font-semibold text-amber-800">Ưu tiên {index + 1}</div>
                  <div className="mt-2 text-xl font-bold text-gray-900">{item.ten_dich_vu}</div>
                  <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <div className="text-gray-500">Điểm ưu tiên</div>
                      <div className="font-semibold text-gray-900">{Number(item.diem_uu_tien || 0).toFixed(1)}</div>
                    </div>
                    <div>
                      <div className="text-gray-500">Lead chưa đáp ứng</div>
                      <div className="font-semibold text-gray-900">{formatNumber(item.lead_chua_dap_ung)}</div>
                    </div>
                    <div>
                      <div className="text-gray-500">Mức quan tâm</div>
                      <div className="font-semibold text-gray-900">{formatPercent(item.ty_trong_nhu_cau)}</div>
                    </div>
                    <div>
                      <div className="text-gray-500">Tỷ lệ chốt</div>
                      <div className="font-semibold text-gray-900">{formatPercent(item.ty_le_chot)}</div>
                    </div>
                  </div>
                  <div className="mt-4 rounded-xl border border-amber-200 bg-white px-4 py-3 text-sm leading-6 text-gray-700">
                    {item.huong_xu_ly}
                  </div>
                </div>
              ))}
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-y-2">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Dịch vụ</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Điểm ưu tiên</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Lead chưa đáp ứng</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">% chưa đáp ứng</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Mức quan tâm</th>
                  </tr>
                </thead>
                <tbody>
                  {priorityData.map((item) => (
                    <tr key={`priority-${item.dich_vu_id}`} className="bg-gray-50">
                      <td className="rounded-l-xl px-4 py-3 text-sm font-medium text-gray-800">{item.ten_dich_vu}</td>
                      <td className="px-4 py-3 text-right text-sm text-gray-700">{Number(item.diem_uu_tien || 0).toFixed(1)}</td>
                      <td className="px-4 py-3 text-right text-sm text-gray-700">{formatNumber(item.lead_chua_dap_ung)}</td>
                      <td className="px-4 py-3 text-right text-sm text-gray-700">{formatPercent(item.ty_le_chua_dap_ung)}</td>
                      <td className="rounded-r-xl px-4 py-3 text-right text-sm text-gray-700">{formatPercent(item.ty_trong_nhu_cau)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <TrendingUp size={18} className="text-gray-500" />
          <h2 className="text-base font-semibold text-gray-800">Xu hướng theo tháng của dịch vụ</h2>
        </div>

        {trendError && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {trendError}
          </div>
        )}

        {!trendError && trendData.length > 0 && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                <div className="text-sm font-semibold text-emerald-800">Tăng nhanh nhất ở tháng gần nhất</div>
                <div className="mt-2 text-sm leading-6 text-emerald-900">
                  <strong>{fastestGrowingService?.ten_dich_vu || '--'}</strong> đang tăng khoảng{' '}
                  <strong>{formatPercent(fastestGrowingService?.tang_truong_lead_so_voi_thang_truoc || 0)}</strong> so với tháng trước.
                </div>
              </div>
              <div className="rounded-2xl border border-red-100 bg-red-50 p-4">
                <div className="text-sm font-semibold text-red-800">Giảm rõ nhất ở tháng gần nhất</div>
                <div className="mt-2 text-sm leading-6 text-red-900">
                  <strong>{fastestDroppingService?.ten_dich_vu || '--'}</strong> đang biến động{' '}
                  <strong>{formatPercent(fastestDroppingService?.tang_truong_lead_so_voi_thang_truoc || 0)}</strong>.
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-y-2">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Dịch vụ</th>
                    {trendMonths.map((month) => (
                      <th
                        key={month}
                        className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500"
                      >
                        {month}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {serviceData.slice(0, 8).map((service) => (
                    <tr key={`trend-${service.dich_vu_id}`} className="bg-gray-50">
                      <td className="rounded-l-xl px-4 py-3 text-sm font-medium text-gray-800">{service.ten_dich_vu}</td>
                      {trendMonths.map((month, index) => {
                        const row = trendData.find(
                          (item) => item.dich_vu_id === service.dich_vu_id && item.thang === month
                        );
                        return (
                          <td
                            key={`${service.dich_vu_id}-${month}-${index}`}
                            className={`${index === trendMonths.length - 1 ? 'rounded-r-xl' : ''} px-4 py-3 text-right text-sm text-gray-700`}
                          >
                            {formatNumber(row?.tong_lead || 0)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <AlertTriangle size={18} className="text-gray-500" />
          <h2 className="text-base font-semibold text-gray-800">Lý do từ chối theo dịch vụ</h2>
        </div>

        {rejectionError && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {rejectionError}
          </div>
        )}

        {!rejectionError && rejectionData.length > 0 && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
                <div className="text-sm font-semibold text-amber-800">Lý do phổ biến nhất toàn bộ</div>
                <div className="mt-2 text-sm leading-6 text-amber-900">
                  <strong>{mostCommonRejectionReason?.ten_ly_do || '--'}</strong> đang xuất hiện{' '}
                  <strong>{formatNumber(mostCommonRejectionReason?.so_luong_tu_choi || 0)}</strong> lần.
                </div>
              </div>
              <div className="rounded-2xl border border-red-100 bg-red-50 p-4">
                <div className="text-sm font-semibold text-red-800">Dịch vụ nên xem lại trước</div>
                <div className="mt-2 text-sm leading-6 text-red-900">
                  <strong>{serviceMostNeedReview?.ten_dich_vu || '--'}</strong> đang có lý do từ chối hàng đầu là{' '}
                  <strong>{serviceMostNeedReview?.ten_ly_do || '--'}</strong>.
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {topRejectionReasons.map((item) => (
                <div key={`${item.dich_vu_id}-${item.ly_do_tu_choi_id}`} className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                  <div className="text-sm font-semibold text-gray-800">{item.ten_dich_vu}</div>
                  <div className="mt-1 text-sm text-gray-600">{item.ten_ly_do}</div>
                  <div className="mt-3 flex items-center justify-between text-sm">
                    <span className="text-gray-500">Số lượng</span>
                    <span className="font-semibold text-gray-900">{formatNumber(item.so_luong_tu_choi)}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <span className="text-gray-500">Tỷ trọng trong dịch vụ</span>
                    <span className="font-semibold text-gray-900">
                      {formatPercent(item.ty_trong_tu_choi_trong_dich_vu)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <BarChart3 size={18} className="text-gray-500" />
          <h2 className="text-base font-semibold text-gray-800">Điểm rơi funnel theo từng dịch vụ</h2>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lg:col-span-1">
            <label className="mb-2 block text-sm font-medium text-gray-700">Chọn dịch vụ cần xem chi tiết</label>
            <select
              value={selectedServiceId}
              onChange={(e) => setSelectedServiceId(e.target.value)}
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              {serviceData.length === 0 && <option value="">Chưa có dữ liệu dịch vụ</option>}
              {serviceData.map((item) => (
                <option key={item.dich_vu_id} value={item.dich_vu_id}>
                  {item.ten_dich_vu}
                </option>
              ))}
            </select>
          </div>

          <div className="lg:col-span-2 rounded-2xl border border-gray-200 bg-gray-50 p-4">
            <div className="text-sm font-semibold text-gray-800">Nhận định nhanh cho dịch vụ đang xem</div>
            <div className="mt-2 text-sm leading-6 text-gray-700">{selectedServiceInsight}</div>
          </div>
        </div>

        {serviceFunnelError && (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {serviceFunnelError}
          </div>
        )}

        {!serviceFunnelError && selectedServiceMeta && (
          <div className="mt-4 space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <div className="text-sm text-gray-500">Dịch vụ đang xem</div>
                <div className="mt-2 text-lg font-bold text-gray-900">{selectedServiceMeta.ten_dich_vu}</div>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <div className="text-sm text-gray-500">Điểm rơi lớn nhất</div>
                <div className="mt-2 text-lg font-bold text-gray-900">
                  {selectedServiceBiggestDrop?.stage_label || '--'}
                </div>
                <div className="mt-1 text-sm text-gray-500">
                  Mức rơi: {formatPercent(selectedServiceBiggestDropPercent)}
                </div>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <div className="text-sm text-gray-500">Tỷ lệ chốt hiện tại</div>
                <div className="mt-2 text-lg font-bold text-gray-900">{formatPercent(selectedServiceMeta.ty_le_chot)}</div>
              </div>
            </div>

            {selectedServiceTopReasons.length > 0 && (
              <div className="rounded-2xl border border-red-100 bg-red-50 p-4">
                <div className="text-sm font-semibold text-red-800">Lý do từ chối hàng đầu của dịch vụ này</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {selectedServiceTopReasons.map((item) => (
                    <span key={`${item.dich_vu_id}-${item.ly_do_tu_choi_id}-selected`} className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-red-700">
                      {item.ten_ly_do} ({formatNumber(item.so_luong_tu_choi)})
                    </span>
                  ))}
                </div>
              </div>
            )}

            {!loading && selectedServiceRows.length === 0 && !serviceFunnelError && (
              <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-6 py-8 text-sm text-gray-500">
                Chưa có dữ liệu funnel chi tiết cho dịch vụ đang chọn.
              </div>
            )}

            {selectedServiceRows.length > 0 && (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-full border-separate border-spacing-y-2">
                    <thead>
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Giai đoạn</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Lead</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Tỷ lệ từ bước trước</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Tỷ lệ từ đầu funnel</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedServiceRows.map((item) => (
                        <tr key={`${item.dich_vu_id}-${item.stage_key}`} className="bg-gray-50">
                          <td className="rounded-l-xl px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-700">
                                {item.stage_order}
                              </div>
                              <div className="text-sm font-medium text-gray-800">{item.stage_label}</div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right text-sm text-gray-700">{formatNumber(item.total_leads)}</td>
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
                  {selectedServiceRows.map((item) => (
                    <div key={`${item.dich_vu_id}-${item.stage_key}-card`} className="rounded-2xl border border-gray-200 bg-white p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="text-sm font-semibold text-gray-800">
                            {item.stage_order}. {item.stage_label}
                          </div>
                          <div className="mt-1 text-sm text-gray-500">{formatNumber(item.total_leads)} lead</div>
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
                          style={{ width: `${clampPercent(item.conversion_from_start)}%` }}
                        />
                      </div>

                      <div className="mt-3 text-sm text-gray-600">
                        Tỷ lệ giữ lại từ bước trước: <strong>{formatPercent(item.conversion_from_previous)}</strong>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <BarChart3 size={18} className="text-gray-500" />
          <h2 className="text-base font-semibold text-gray-800">Hiệu quả theo dịch vụ</h2>
        </div>

        {!loading && serviceData.length === 0 && (
          <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-6 py-10 text-center text-sm text-gray-500">
            Chưa có dữ liệu dịch vụ trong khoảng thời gian đang chọn.
          </div>
        )}

        {!loading && serviceData.length > 0 && (
          <div className="space-y-4">
            <div className="overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-y-2">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Dịch vụ</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Lead</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Đã chốt</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Chưa đáp ứng</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Tỷ lệ chốt</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">% chưa đáp ứng</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Mức quan tâm</th>
                  </tr>
                </thead>
                <tbody>
                  {strategicData.map((item) => (
                    <tr key={item.dich_vu_id} className="bg-gray-50">
                      <td className="rounded-l-xl px-4 py-3">
                        <div className="text-sm font-medium text-gray-800">{item.ten_dich_vu}</div>
                        <div className="mt-1 text-xs text-gray-500">{item.nhan_nhom}</div>
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-gray-700">{formatNumber(item.tong_lead)}</td>
                      <td className="px-4 py-3 text-right text-sm text-gray-700">{formatNumber(item.lead_da_chot)}</td>
                      <td className="px-4 py-3 text-right text-sm text-gray-700">{formatNumber(item.lead_chua_dap_ung)}</td>
                      <td className="px-4 py-3 text-right text-sm text-gray-700">{formatPercent(item.ty_le_chot)}</td>
                      <td className="px-4 py-3 text-right text-sm text-gray-700">{formatPercent(item.ty_le_chua_dap_ung)}</td>
                      <td className="rounded-r-xl px-4 py-3 text-right text-sm text-gray-700">{formatPercent(item.ty_trong_nhu_cau)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {strategicData.map((item) => (
                <div key={`${item.dich_vu_id}-card`} className="rounded-2xl border border-gray-200 bg-white p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-sm font-semibold text-gray-800">{item.ten_dich_vu}</div>
                      <div className="mt-1 text-sm text-gray-500">{item.nhan_nhom}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-500">Tỷ lệ chốt</div>
                      <div className="text-lg font-bold text-gray-900">{formatPercent(item.ty_le_chot)}</div>
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="mb-2 flex items-center justify-between text-sm text-gray-600">
                      <span>Mức quan tâm</span>
                      <span>{formatPercent(item.ty_trong_nhu_cau)}</span>
                    </div>
                    <div className="h-3 w-full rounded-full bg-gray-200">
                      <div
                        className="h-3 rounded-full bg-blue-600 transition-all"
                        style={{ width: `${clampPercent(item.ty_trong_nhu_cau)}%` }}
                      />
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="mb-2 flex items-center justify-between text-sm text-gray-600">
                      <span>Nhu cầu chưa đáp ứng</span>
                      <span>{formatPercent(item.ty_le_chua_dap_ung)}</span>
                    </div>
                    <div className="h-3 w-full rounded-full bg-gray-200">
                      <div
                        className="h-3 rounded-full bg-amber-500 transition-all"
                        style={{ width: `${clampPercent(item.ty_le_chua_dap_ung)}%` }}
                      />
                    </div>
                  </div>

                  <div className="mt-4 text-sm text-gray-600">
                    Lead chưa đáp ứng: <strong>{formatNumber(item.lead_chua_dap_ung)}</strong>
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
