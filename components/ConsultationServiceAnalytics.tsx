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

const NGUONG_NHU_CAU_CAO = 15;
const NGUONG_TY_LE_CHOT_TOT = 25;
const NGUONG_DIEM_UU_TIEN_CAO = 70;
const NGUONG_DIEM_UU_TIEN_TRUNG_BINH = 45;

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
  const [trendError, setTrendError] = useState<string | null>(null);

  const [serviceData, setServiceData] = useState<ServicePerformanceRow[]>([]);
  const [serviceTrendData, setServiceTrendData] = useState<ServiceTrendRow[]>([]);

  const totalLeadThiTruong = useMemo(() => {
    return serviceData.reduce((sum, item) => sum + Number(item.tong_lead || 0), 0);
  }, [serviceData]);

  const totalLeadDaChot = useMemo(() => {
    return serviceData.reduce((sum, item) => sum + Number(item.lead_da_chot || 0), 0);
  }, [serviceData]);

  const tyLeDapUngToanBo = useMemo(() => {
    if (totalLeadThiTruong <= 0) return 0;
    return (totalLeadDaChot / totalLeadThiTruong) * 100;
  }, [totalLeadThiTruong, totalLeadDaChot]);

  const dichVuQuanTamNhieuNhat = useMemo(() => {
    return serviceData.length > 0 ? serviceData[0] : null;
  }, [serviceData]);

  const dichVuTyLeChotThapNhat = useMemo(() => {
    if (!serviceData.length) return null;

    return (
      [...serviceData]
        .filter((item) => Number(item.tong_lead || 0) > 0)
        .sort((a, b) => {
          const tyLeA = Number(a.ty_le_chot || 0);
          const tyLeB = Number(b.ty_le_chot || 0);

          if (tyLeA !== tyLeB) return tyLeA - tyLeB;

          const leadB = Number(b.tong_lead || 0);
          const leadA = Number(a.tong_lead || 0);

          return leadB - leadA;
        })[0] || null
    );
  }, [serviceData]);

  const dichVuCoCoHoiTangTruong = useMemo(() => {
    if (!serviceData.length) return null;

    return (
      [...serviceData]
        .filter(
          (item) =>
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
        })[0] || null
    );
  }, [serviceData]);

  const serviceDataWithGap = useMemo(() => {
    return serviceData.map((item) => {
      const tongLead = Number(item.tong_lead || 0);
      const leadDaChot = Number(item.lead_da_chot || 0);
      const leadChuaDapUng = Math.max(0, tongLead - leadDaChot);
      const tyLeChuaDapUng = tongLead > 0 ? (leadChuaDapUng / tongLead) * 100 : 0;

      return {
        ...item,
        lead_chua_dap_ung: leadChuaDapUng,
        ty_le_chua_dap_ung: tyLeChuaDapUng,
      };
    });
  }, [serviceData]);

  const dichVuNhuCauCaoChotTot = useMemo(() => {
    return serviceDataWithGap.filter(
      (item) =>
        Number(item.ty_trong_nhu_cau || 0) >= NGUONG_NHU_CAU_CAO &&
        Number(item.ty_le_chot || 0) >= NGUONG_TY_LE_CHOT_TOT
    );
  }, [serviceDataWithGap]);

  const dichVuNhuCauCaoChotKem = useMemo(() => {
    return serviceDataWithGap.filter(
      (item) =>
        Number(item.ty_trong_nhu_cau || 0) >= NGUONG_NHU_CAU_CAO &&
        Number(item.ty_le_chot || 0) < NGUONG_TY_LE_CHOT_TOT
    );
  }, [serviceDataWithGap]);

  const dichVuNhuCauThapChotTot = useMemo(() => {
    return serviceDataWithGap.filter(
      (item) =>
        Number(item.ty_trong_nhu_cau || 0) < NGUONG_NHU_CAU_CAO &&
        Number(item.ty_le_chot || 0) >= NGUONG_TY_LE_CHOT_TOT
    );
  }, [serviceDataWithGap]);

  const dichVuNhuCauThapChotKem = useMemo(() => {
    return serviceDataWithGap.filter(
      (item) =>
        Number(item.ty_trong_nhu_cau || 0) < NGUONG_NHU_CAU_CAO &&
        Number(item.ty_le_chot || 0) < NGUONG_TY_LE_CHOT_TOT
    );
  }, [serviceDataWithGap]);

  const dichVuMatCoHoiNhieuNhat = useMemo(() => {
    if (!serviceDataWithGap.length) return null;

    return (
      [...serviceDataWithGap]
        .filter((item) => Number(item.tong_lead || 0) > 0)
        .sort((a, b) => {
          const matB = Number(b.lead_chua_dap_ung || 0);
          const matA = Number(a.lead_chua_dap_ung || 0);

          if (matB !== matA) return matB - matA;

          const nhuCauB = Number(b.ty_trong_nhu_cau || 0);
          const nhuCauA = Number(a.ty_trong_nhu_cau || 0);

          return nhuCauB - nhuCauA;
        })[0] || null
    );
  }, [serviceDataWithGap]);

  const nhanDinhBanDoChienLuoc = useMemo(() => {
    if (!serviceData.length) {
      return 'Chưa có dữ liệu để lập bản đồ chiến lược dịch vụ.';
    }

    if (dichVuNhuCauCaoChotKem.length > 0) {
      return `Ưu tiên lớn nhất hiện tại là nhóm dịch vụ có nhu cầu cao nhưng chốt kém. Nhóm này đang có ${formatNumber(
        dichVuNhuCauCaoChotKem.length
      )} dịch vụ và là nơi studio dễ mất cơ hội kinh doanh nhất.`;
    }

    if (dichVuNhuCauCaoChotTot.length > 0 && dichVuNhuCauThapChotTot.length > 0) {
      return 'Studio đang có cả dịch vụ chủ lực lẫn dịch vụ ngách bán tốt. Đây là thời điểm phù hợp để vừa giữ dịch vụ mạnh, vừa mở rộng quảng bá cho nhóm ngách có tỷ lệ chốt cao.';
    }

    if (dichVuNhuCauThapChotKem.length > 0) {
      return 'Có một số dịch vụ vừa nhu cầu thấp vừa chốt kém. Nên rà soát lại gói sản phẩm, cách trình bày hoặc mức độ ưu tiên đầu tư cho nhóm này.';
    }

    return 'Bản đồ chiến lược hiện chưa cho thấy điểm nghẽn quá lớn. Nên tiếp tục theo dõi sự dịch chuyển nhu cầu giữa các dịch vụ theo tháng.';
  }, [
    serviceData,
    dichVuNhuCauCaoChotKem,
    dichVuNhuCauCaoChotTot,
    dichVuNhuCauThapChotTot,
    dichVuNhuCauThapChotKem,
  ]);


  const xepHangUuTienXuLy = useMemo(() => {
    return [...serviceDataWithGap]
      .filter((item) => Number(item.tong_lead || 0) > 0)
      .map((item) => {
        const tyTrongNhuCau = Number(item.ty_trong_nhu_cau || 0);
        const tyLeChot = Number(item.ty_le_chot || 0);
        const leadChuaDapUng = Number(item.lead_chua_dap_ung || 0);
        const tyLeChuaDapUng = Number(item.ty_le_chua_dap_ung || 0);

        const diemTheoNhuCau = Math.min(40, tyTrongNhuCau * 2);
        const diemTheoTiLeChuaDapUng = Math.min(35, tyLeChuaDapUng * 0.35);
        const diemTheoSoLeadMatDi = Math.min(25, leadChuaDapUng * 2.5);
        const diemUuTien = Math.round(
          diemTheoNhuCau + diemTheoTiLeChuaDapUng + diemTheoSoLeadMatDi
        );

        let mucDoUuTien: 'Ưu tiên ngay' | 'Nên xử lý sớm' | 'Theo dõi';
        if (diemUuTien >= NGUONG_DIEM_UU_TIEN_CAO) {
          mucDoUuTien = 'Ưu tiên ngay';
        } else if (diemUuTien >= NGUONG_DIEM_UU_TIEN_TRUNG_BINH) {
          mucDoUuTien = 'Nên xử lý sớm';
        } else {
          mucDoUuTien = 'Theo dõi';
        }

        let huongXuLy = 'Tiếp tục theo dõi thêm và giữ nhịp tối ưu ổn định.';
        if (
          tyTrongNhuCau >= NGUONG_NHU_CAU_CAO &&
          tyLeChot < NGUONG_TY_LE_CHOT_TOT
        ) {
          huongXuLy =
            'Ưu tiên rà soát gói dịch vụ, giá bán, nội dung tư vấn và cách theo dõi lại khách.';
        } else if (
          tyTrongNhuCau < NGUONG_NHU_CAU_CAO &&
          tyLeChot >= NGUONG_TY_LE_CHOT_TOT
        ) {
          huongXuLy =
            'Dịch vụ bán tốt nhưng chưa có nhiều lead. Nên tăng quảng bá đúng tệp khách hàng.';
        } else if (
          tyTrongNhuCau < NGUONG_NHU_CAU_CAO &&
          tyLeChot < NGUONG_TY_LE_CHOT_TOT
        ) {
          huongXuLy =
            'Cần xem lại mức độ ưu tiên đầu tư, cấu trúc gói và thông điệp truyền thông của dịch vụ này.';
        }

        return {
          ...item,
          diem_uu_tien: diemUuTien,
          muc_do_uu_tien: mucDoUuTien,
          huong_xu_ly: huongXuLy,
        };
      })
      .sort((a, b) => {
        const diemB = Number(b.diem_uu_tien || 0);
        const diemA = Number(a.diem_uu_tien || 0);
        if (diemB !== diemA) return diemB - diemA;

        const matB = Number(b.lead_chua_dap_ung || 0);
        const matA = Number(a.lead_chua_dap_ung || 0);
        if (matB !== matA) return matB - matA;

        return Number(b.ty_trong_nhu_cau || 0) - Number(a.ty_trong_nhu_cau || 0);
      });
  }, [serviceDataWithGap]);

  const dichVuUuTienSo1 = useMemo(() => {
    return xepHangUuTienXuLy.length > 0 ? xepHangUuTienXuLy[0] : null;
  }, [xepHangUuTienXuLy]);

  const dichVuUuTienSo2 = useMemo(() => {
    return xepHangUuTienXuLy.length > 1 ? xepHangUuTienXuLy[1] : null;
  }, [xepHangUuTienXuLy]);

  const tongLeadChuaDapUng = useMemo(() => {
    return serviceDataWithGap.reduce(
      (sum, item) => sum + Number(item.lead_chua_dap_ung || 0),
      0
    );
  }, [serviceDataWithGap]);

  const tongTyTrongNhuCauCanXuLyGap = useMemo(() => {
    return xepHangUuTienXuLy
      .filter((item) => item.muc_do_uu_tien === 'Ưu tiên ngay')
      .reduce((sum, item) => sum + Number(item.ty_trong_nhu_cau || 0), 0);
  }, [xepHangUuTienXuLy]);

  const nhanDinhUuTienXuLy = useMemo(() => {
    if (!xepHangUuTienXuLy.length) {
      return 'Chưa có dữ liệu để xếp hạng mức độ ưu tiên xử lý theo dịch vụ.';
    }

    if (dichVuUuTienSo1 && dichVuUuTienSo2) {
      return `Nếu chỉ có nguồn lực cải thiện ngắn hạn, nên ưu tiên xử lý trước ${dichVuUuTienSo1.ten_dich_vu} và ${dichVuUuTienSo2.ten_dich_vu}. Đây là 2 dịch vụ đang có mức độ mất cơ hội lớn nhất theo nhu cầu thị trường và phần chưa đáp ứng.`;
    }

    if (dichVuUuTienSo1) {
      return `Nếu chỉ chọn một dịch vụ để xử lý trước, nên bắt đầu từ ${dichVuUuTienSo1.ten_dich_vu}. Dịch vụ này đang đứng đầu về mức độ ưu tiên cải thiện.`;
    }

    return 'Danh sách ưu tiên hiện chưa đủ rõ để đưa ra kết luận mạnh.';
  }, [xepHangUuTienXuLy, dichVuUuTienSo1, dichVuUuTienSo2]);

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

    if (dichVuMatCoHoiNhieuNhat && Number(dichVuMatCoHoiNhieuNhat.lead_chua_dap_ung || 0) >= 5) {
      items.push({
        level: 'warning',
        title: `Dịch vụ "${dichVuMatCoHoiNhieuNhat.ten_dich_vu}" đang làm mất cơ hội nhiều nhất`,
        message: `Hiện còn khoảng ${formatNumber(
          dichVuMatCoHoiNhieuNhat.lead_chua_dap_ung
        )} lead chưa chuyển thành chốt ở dịch vụ này. Đây là khu vực cần ưu tiên xử lý để tăng khả năng đáp ứng nhu cầu thị trường.`,
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
  }, [serviceData, tyLeDapUngToanBo, dichVuCoCoHoiTangTruong, dichVuQuanTamNhieuNhat, dichVuMatCoHoiNhieuNhat]);

  const danhSachThang = useMemo(() => {
    return [...new Set(serviceTrendData.map((item) => item.thang))];
  }, [serviceTrendData]);

  const topDichVuTheoXuHuong = useMemo(() => {
    const serviceMap = new Map<string, { ten_dich_vu: string; tong_lead: number }>();

    serviceTrendData.forEach((item) => {
      const current = serviceMap.get(item.ten_dich_vu) || {
        ten_dich_vu: item.ten_dich_vu,
        tong_lead: 0,
      };

      current.tong_lead += Number(item.tong_lead || 0);
      serviceMap.set(item.ten_dich_vu, current);
    });

    return [...serviceMap.values()]
      .sort((a, b) => b.tong_lead - a.tong_lead)
      .slice(0, 5)
      .map((item) => item.ten_dich_vu);
  }, [serviceTrendData]);

  const xuHuongTheoDichVu = useMemo(() => {
    return topDichVuTheoXuHuong.map((tenDichVu) => {
      const rows = serviceTrendData
        .filter((item) => item.ten_dich_vu === tenDichVu)
        .sort((a, b) => {
          if (Number(a.nam || 0) !== Number(b.nam || 0)) {
            return Number(a.nam || 0) - Number(b.nam || 0);
          }
          return Number(a.thang_so || 0) - Number(b.thang_so || 0);
        });

      const thangCuoi = rows.length > 0 ? rows[rows.length - 1] : null;
      const thangTruoc = rows.length > 1 ? rows[rows.length - 2] : null;
      const chenhLechLead =
        Number(thangCuoi?.tong_lead || 0) - Number(thangTruoc?.tong_lead || 0);
      const tangTruongGanNhat = Number(
        thangCuoi?.tang_truong_lead_so_voi_thang_truoc || 0
      );

      return {
        ten_dich_vu: tenDichVu,
        rows,
        thangCuoi,
        thangTruoc,
        chenhLechLead,
        tangTruongGanNhat,
      };
    });
  }, [serviceTrendData, topDichVuTheoXuHuong]);

  const dichVuTangNhanhNhat = useMemo(() => {
    if (!xuHuongTheoDichVu.length) return null;

    return (
      [...xuHuongTheoDichVu]
        .filter((item) => item.chenhLechLead > 0)
        .sort((a, b) => b.chenhLechLead - a.chenhLechLead)[0] || null
    );
  }, [xuHuongTheoDichVu]);

  const dichVuGiamNhieuNhat = useMemo(() => {
    if (!xuHuongTheoDichVu.length) return null;

    return (
      [...xuHuongTheoDichVu]
        .filter((item) => item.chenhLechLead < 0)
        .sort((a, b) => a.chenhLechLead - b.chenhLechLead)[0] || null
    );
  }, [xuHuongTheoDichVu]);

  const nhanDinhXuHuong = useMemo(() => {
    if (!serviceTrendData.length) {
      return 'Chưa có dữ liệu xu hướng theo tháng để đưa ra nhận định.';
    }

    if (dichVuTangNhanhNhat && Number(dichVuTangNhanhNhat.chenhLechLead || 0) >= 3) {
      return `Dịch vụ "${dichVuTangNhanhNhat.ten_dich_vu}" đang tăng nhanh nhất ở giai đoạn gần đây. Nên kiểm tra lại nội dung quảng bá, giá bán và khả năng phục vụ để đón nhu cầu tăng.`;
    }

    if (dichVuGiamNhieuNhat && Math.abs(Number(dichVuGiamNhieuNhat.chenhLechLead || 0)) >= 3) {
      return `Dịch vụ "${dichVuGiamNhieuNhat.ten_dich_vu}" đang giảm mức quan tâm rõ rệt so với kỳ trước. Nên xem lại gói sản phẩm, hình ảnh truyền thông và lý do khách không còn ưu tiên dịch vụ này.`;
    }

    return 'Xu hướng giữa các dịch vụ hiện chưa biến động quá mạnh. Nên tiếp tục theo dõi thêm theo tháng để xác nhận dịch vụ nào đang thật sự tăng hoặc giảm.';
  }, [serviceTrendData, dichVuTangNhanhNhat, dichVuGiamNhieuNhat]);

  const loadServiceData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setTrendError(null);

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

      const { data: trendData, error: trendRpcError } = await supabase.rpc(
        'consultation_service_trend_by_month',
        {
          p_from: dateRange.from || null,
          p_to: dateRange.to || null,
        }
      );

      if (trendRpcError) {
        console.warn('RPC consultation_service_trend_by_month chưa sẵn sàng:', trendRpcError);
        setServiceTrendData([]);
        setTrendError(
          'Chưa tải được phần xu hướng theo tháng. Hãy tạo thêm hàm SQL consultation_service_trend_by_month.'
        );
      } else {
        setServiceTrendData(Array.isArray(trendData) ? trendData : []);
        setTrendError(null);
      }
    } catch (err: any) {
      console.error('Lỗi khi tải dữ liệu phân tích theo dịch vụ:', err);
      setError(err?.message || 'Không thể tải dữ liệu phân tích theo dịch vụ');
      setServiceData([]);
      setServiceTrendData([]);
      setTrendError(null);
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
                Giúp nhìn rõ khách đang quan tâm nhiều đến dịch vụ nào, xu hướng đang tăng ở đâu và studio đang đáp ứng được bao nhiêu phần trăm nhu cầu đó.
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
            <label className="mb-2 block text-sm font-medium text-gray-700">Từ ngày</label>
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
            <label className="mb-2 block text-sm font-medium text-gray-700">Đến ngày</label>
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
          <div className="mt-2 text-3xl font-bold text-gray-900">{formatNumber(totalLeadThiTruong)}</div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="text-sm text-gray-500">Tổng lead đã chốt</div>
          <div className="mt-2 text-3xl font-bold text-gray-900">{formatNumber(totalLeadDaChot)}</div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="text-sm text-gray-500">Tỷ lệ đáp ứng nhu cầu</div>
          <div className="mt-2 flex items-center gap-2">
            <div className="text-3xl font-bold text-gray-900">{formatPercent(tyLeDapUngToanBo)}</div>
            {tyLeDapUngToanBo >= 30 ? (
              <TrendingUp size={18} className="text-green-600" />
            ) : (
              <TrendingDown size={18} className="text-red-600" />
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="text-sm text-gray-500">Dịch vụ được quan tâm nhất</div>
          <div className="mt-2 text-xl font-bold text-gray-900">
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
          <h2 className="text-base font-semibold text-gray-800">Insight nhanh theo dịch vụ</h2>
        </div>

        {!loading && !error && serviceData.length === 0 && (
          <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-6 py-8 text-sm text-gray-500">
            Chưa có dữ liệu để phân tích insight.
          </div>
        )}

        {!loading && !error && serviceData.length > 0 && (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
              <div className="text-sm font-semibold text-blue-800">Dịch vụ được quan tâm nhiều nhất</div>
              <div className="mt-2 text-sm leading-6 text-blue-900">
                <strong>{dichVuQuanTamNhieuNhat?.ten_dich_vu || '--'}</strong> đang dẫn đầu với{' '}
                <strong>{formatNumber(dichVuQuanTamNhieuNhat?.tong_lead || 0)}</strong> lead, chiếm khoảng{' '}
                <strong>{formatPercent(dichVuQuanTamNhieuNhat?.ty_trong_nhu_cau || 0)}</strong> nhu cầu hiện tại.
              </div>
            </div>

            <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
              <div className="text-sm font-semibold text-amber-800">Dịch vụ cần xem lại nhất</div>
              <div className="mt-2 text-sm leading-6 text-amber-900">
                <strong>{dichVuTyLeChotThapNhat?.ten_dich_vu || '--'}</strong> đang có tỷ lệ chốt khoảng{' '}
                <strong>{formatPercent(dichVuTyLeChotThapNhat?.ty_le_chot || 0)}</strong>. Nếu dịch vụ này vẫn còn nhiều lead thì đây là khu vực đang mất cơ hội kinh doanh.
              </div>
            </div>

            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
              <div className="text-sm font-semibold text-emerald-800">Cơ hội tăng trưởng</div>
              <div className="mt-2 text-sm leading-6 text-emerald-900">
                <strong>{dichVuCoCoHoiTangTruong?.ten_dich_vu || '--'}</strong> đang có nhu cầu{' '}
                <strong>{formatPercent(dichVuCoCoHoiTangTruong?.ty_trong_nhu_cau || 0)}</strong> nhưng tỷ lệ chốt mới đạt{' '}
                <strong>{formatPercent(dichVuCoCoHoiTangTruong?.ty_le_chot || 0)}</strong>. Đây là dịch vụ nên ưu tiên cải thiện gói sản phẩm và cách tư vấn.
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <BarChart3 size={18} className="text-gray-500" />
          <h2 className="text-base font-semibold text-gray-800">Khuyến nghị hành động</h2>
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
                  <div className={`text-sm font-semibold ${style.title}`}>{item.title}</div>
                  <div className="mt-2 text-sm leading-6 text-gray-700">{item.message}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>


      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <BarChart3 size={18} className="text-gray-500" />
          <h2 className="text-base font-semibold text-gray-800">Bản đồ chiến lược dịch vụ</h2>
        </div>

        {!loading && !error && serviceData.length === 0 && (
          <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-6 py-8 text-sm text-gray-500">
            Chưa có dữ liệu để phân nhóm chiến lược dịch vụ.
          </div>
        )}

        {!loading && !error && serviceData.length > 0 && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
              <div className="text-sm font-semibold text-blue-800">Nhận định chiến lược</div>
              <div className="mt-2 text-sm leading-6 text-blue-900">{nhanDinhBanDoChienLuoc}</div>
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="text-sm font-semibold text-emerald-800">Nhu cầu cao + chốt tốt</div>
                  <div className="text-sm font-bold text-emerald-900">
                    {formatNumber(dichVuNhuCauCaoChotTot.length)} dịch vụ
                  </div>
                </div>
                <div className="mt-2 text-sm leading-6 text-emerald-900">
                  Nhóm dịch vụ chủ lực. Nên giữ chất lượng, bảo vệ tỷ lệ chốt và cân nhắc tăng đầu tư truyền thông.
                </div>
                <div className="mt-4 space-y-3">
                  {dichVuNhuCauCaoChotTot.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-emerald-200 bg-white/70 px-4 py-3 text-sm text-emerald-800">
                      Chưa có dịch vụ nào rơi vào nhóm này.
                    </div>
                  ) : (
                    dichVuNhuCauCaoChotTot.map((item) => (
                      <div key={`cao-tot-${item.dich_vu_id}`} className="rounded-xl border border-emerald-200 bg-white/80 p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="text-sm font-semibold text-gray-900">{item.ten_dich_vu}</div>
                            <div className="mt-1 text-sm text-gray-600">
                              Nhu cầu {formatPercent(item.ty_trong_nhu_cau)} • Tỷ lệ chốt {formatPercent(item.ty_le_chot)}
                            </div>
                          </div>
                          <div className="text-right text-sm text-gray-600">
                            <div>{formatNumber(item.tong_lead)} lead</div>
                            <div>{formatNumber(item.lead_chua_dap_ung)} chưa đáp ứng</div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="text-sm font-semibold text-red-800">Nhu cầu cao + chốt kém</div>
                  <div className="text-sm font-bold text-red-900">
                    {formatNumber(dichVuNhuCauCaoChotKem.length)} dịch vụ
                  </div>
                </div>
                <div className="mt-2 text-sm leading-6 text-red-900">
                  Đây là vùng mất cơ hội lớn nhất. Nên ưu tiên xem lại gói dịch vụ, giá bán, cách tư vấn và quy trình theo dõi lại khách.
                </div>
                <div className="mt-4 space-y-3">
                  {dichVuNhuCauCaoChotKem.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-red-200 bg-white/70 px-4 py-3 text-sm text-red-800">
                      Hiện chưa có dịch vụ nào rơi vào nhóm rủi ro cao này.
                    </div>
                  ) : (
                    dichVuNhuCauCaoChotKem.map((item) => (
                      <div key={`cao-kem-${item.dich_vu_id}`} className="rounded-xl border border-red-200 bg-white/80 p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="text-sm font-semibold text-gray-900">{item.ten_dich_vu}</div>
                            <div className="mt-1 text-sm text-gray-600">
                              Nhu cầu {formatPercent(item.ty_trong_nhu_cau)} • Tỷ lệ chốt {formatPercent(item.ty_le_chot)}
                            </div>
                          </div>
                          <div className="text-right text-sm text-gray-600">
                            <div>{formatNumber(item.tong_lead)} lead</div>
                            <div>{formatNumber(item.lead_chua_dap_ung)} chưa đáp ứng</div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="text-sm font-semibold text-blue-800">Nhu cầu thấp + chốt tốt</div>
                  <div className="text-sm font-bold text-blue-900">
                    {formatNumber(dichVuNhuCauThapChotTot.length)} dịch vụ
                  </div>
                </div>
                <div className="mt-2 text-sm leading-6 text-blue-900">
                  Đây là nhóm ngách tiềm năng. Nên cân nhắc đẩy truyền thông đúng tệp để mở rộng số lead.
                </div>
                <div className="mt-4 space-y-3">
                  {dichVuNhuCauThapChotTot.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-blue-200 bg-white/70 px-4 py-3 text-sm text-blue-800">
                      Chưa có dịch vụ ngách nào đang bán tốt rõ ràng.
                    </div>
                  ) : (
                    dichVuNhuCauThapChotTot.map((item) => (
                      <div key={`thap-tot-${item.dich_vu_id}`} className="rounded-xl border border-blue-200 bg-white/80 p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="text-sm font-semibold text-gray-900">{item.ten_dich_vu}</div>
                            <div className="mt-1 text-sm text-gray-600">
                              Nhu cầu {formatPercent(item.ty_trong_nhu_cau)} • Tỷ lệ chốt {formatPercent(item.ty_le_chot)}
                            </div>
                          </div>
                          <div className="text-right text-sm text-gray-600">
                            <div>{formatNumber(item.tong_lead)} lead</div>
                            <div>{formatNumber(item.lead_chua_dap_ung)} chưa đáp ứng</div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="text-sm font-semibold text-slate-800">Nhu cầu thấp + chốt kém</div>
                  <div className="text-sm font-bold text-slate-900">
                    {formatNumber(dichVuNhuCauThapChotKem.length)} dịch vụ
                  </div>
                </div>
                <div className="mt-2 text-sm leading-6 text-slate-900">
                  Nhóm này nên được rà soát lại mức ưu tiên đầu tư, thông điệp truyền thông và cấu trúc gói sản phẩm.
                </div>
                <div className="mt-4 space-y-3">
                  {dichVuNhuCauThapChotKem.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-200 bg-white/70 px-4 py-3 text-sm text-slate-700">
                      Hiện chưa có dịch vụ nào nằm trong nhóm hiệu quả thấp toàn diện.
                    </div>
                  ) : (
                    dichVuNhuCauThapChotKem.map((item) => (
                      <div key={`thap-kem-${item.dich_vu_id}`} className="rounded-xl border border-slate-200 bg-white/80 p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="text-sm font-semibold text-gray-900">{item.ten_dich_vu}</div>
                            <div className="mt-1 text-sm text-gray-600">
                              Nhu cầu {formatPercent(item.ty_trong_nhu_cau)} • Tỷ lệ chốt {formatPercent(item.ty_le_chot)}
                            </div>
                          </div>
                          <div className="text-right text-sm text-gray-600">
                            <div>{formatNumber(item.tong_lead)} lead</div>
                            <div>{formatNumber(item.lead_chua_dap_ung)} chưa đáp ứng</div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <div className="text-sm font-semibold text-amber-800">Dịch vụ đang làm mất cơ hội nhiều nhất</div>
              <div className="mt-2 text-sm leading-6 text-amber-900">
                {dichVuMatCoHoiNhieuNhat ? (
                  <>
                    <strong>{dichVuMatCoHoiNhieuNhat.ten_dich_vu}</strong> hiện còn khoảng{' '}
                    <strong>{formatNumber(dichVuMatCoHoiNhieuNhat.lead_chua_dap_ung)}</strong> lead chưa chuyển thành chốt,
                    tương đương <strong>{formatPercent(dichVuMatCoHoiNhieuNhat.ty_le_chua_dap_ung)}</strong> nhu cầu của riêng dịch vụ này.
                  </>
                ) : (
                  'Chưa có đủ dữ liệu để xác định dịch vụ mất cơ hội nhiều nhất.'
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <BarChart3 size={18} className="text-gray-500" />
          <h2 className="text-base font-semibold text-gray-800">Ưu tiên xử lý nhu cầu chưa đáp ứng</h2>
        </div>

        {!loading && !error && serviceDataWithGap.length === 0 && (
          <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-6 py-8 text-sm text-gray-500">
            Chưa có dữ liệu để xếp hạng dịch vụ cần ưu tiên xử lý.
          </div>
        )}

        {!loading && !error && serviceDataWithGap.length > 0 && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
              <div className="text-sm font-semibold text-blue-800">Nguyên tắc xếp hạng</div>
              <div className="mt-2 text-sm leading-6 text-blue-900">
                Mức độ ưu tiên được tính dựa trên 3 yếu tố: mức quan tâm của thị trường, tỷ lệ nhu cầu chưa được đáp ứng và số lead đang bị mất đi. Mục tiêu là giúp bạn biết nếu chỉ có nguồn lực cải thiện 1 đến 2 dịch vụ thì nên bắt đầu từ đâu.
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <div className="text-sm text-gray-500">Lead chưa đáp ứng toàn bộ</div>
                <div className="mt-2 text-2xl font-bold text-gray-900">
                  {formatNumber(tongLeadChuaDapUng)}
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <div className="text-sm text-gray-500">Dịch vụ cần ưu tiên ngay</div>
                <div className="mt-2 text-2xl font-bold text-gray-900">
                  {formatNumber(
                    xepHangUuTienXuLy.filter((item) => item.muc_do_uu_tien === 'Ưu tiên ngay').length
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <div className="text-sm text-gray-500">Nhu cầu nằm trong nhóm cần xử lý gấp</div>
                <div className="mt-2 text-2xl font-bold text-gray-900">
                  {formatPercent(tongTyTrongNhuCauCanXuLyGap)}
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <div className="text-sm text-gray-500">Dịch vụ nên xử lý đầu tiên</div>
                <div className="mt-2 text-lg font-bold text-gray-900">
                  {dichVuUuTienSo1?.ten_dich_vu || '--'}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <div className="text-sm font-semibold text-amber-800">Nhận định ưu tiên</div>
              <div className="mt-2 text-sm leading-6 text-amber-900">{nhanDinhUuTienXuLy}</div>
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              {[dichVuUuTienSo1, dichVuUuTienSo2].map((item, index) => (
                <div
                  key={item?.dich_vu_id || `empty-priority-${index}`}
                  className="rounded-2xl border border-red-200 bg-red-50 p-5"
                >
                  {!item ? (
                    <div className="text-sm text-red-800">
                      Chưa đủ dữ liệu để xác định dịch vụ ưu tiên tiếp theo.
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="text-sm font-semibold text-red-800">
                            Ưu tiên {index + 1}
                          </div>
                          <div className="mt-2 text-xl font-bold text-gray-900">
                            {item.ten_dich_vu}
                          </div>
                        </div>
                        <div className="rounded-xl bg-white px-3 py-2 text-right shadow-sm">
                          <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                            Điểm ưu tiên
                          </div>
                          <div className="text-xl font-bold text-gray-900">
                            {formatNumber(item.diem_uu_tien)}
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <div className="text-gray-500">Mức quan tâm</div>
                          <div className="font-semibold text-gray-900">
                            {formatPercent(item.ty_trong_nhu_cau)}
                          </div>
                        </div>
                        <div>
                          <div className="text-gray-500">Tỷ lệ chốt</div>
                          <div className="font-semibold text-gray-900">
                            {formatPercent(item.ty_le_chot)}
                          </div>
                        </div>
                        <div>
                          <div className="text-gray-500">Lead chưa đáp ứng</div>
                          <div className="font-semibold text-gray-900">
                            {formatNumber(item.lead_chua_dap_ung)}
                          </div>
                        </div>
                        <div>
                          <div className="text-gray-500">% chưa đáp ứng</div>
                          <div className="font-semibold text-gray-900">
                            {formatPercent(item.ty_le_chua_dap_ung)}
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 rounded-xl border border-red-200 bg-white/80 p-4">
                        <div className="text-sm font-semibold text-red-800">
                          Hướng xử lý đề xuất
                        </div>
                        <div className="mt-2 text-sm leading-6 text-gray-700">
                          {item.huong_xu_ly}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-y-2">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Xếp hạng
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Dịch vụ
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Điểm ưu tiên
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Nhu cầu
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Chưa đáp ứng
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Tỷ lệ chốt
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Mức ưu tiên
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {xepHangUuTienXuLy.map((item, index) => (
                    <tr key={`priority-${item.dich_vu_id}`} className="bg-gray-50">
                      <td className="rounded-l-xl px-4 py-3 text-sm font-semibold text-gray-900">
                        {index + 1}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-gray-900">{item.ten_dich_vu}</div>
                        <div className="mt-1 text-sm text-gray-500">{item.huong_xu_ly}</div>
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900">
                        {formatNumber(item.diem_uu_tien)}
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-gray-700">
                        {formatPercent(item.ty_trong_nhu_cau)}
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-gray-700">
                        {formatNumber(item.lead_chua_dap_ung)} ({formatPercent(item.ty_le_chua_dap_ung)})
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-gray-700">
                        {formatPercent(item.ty_le_chot)}
                      </td>
                      <td className="rounded-r-xl px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                            item.muc_do_uu_tien === 'Ưu tiên ngay'
                              ? 'bg-red-100 text-red-800'
                              : item.muc_do_uu_tien === 'Nên xử lý sớm'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-200 text-slate-800'
                          }`}
                        >
                          {item.muc_do_uu_tien}
                        </span>
                      </td>
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
          <BarChart3 size={18} className="text-gray-500" />
          <h2 className="text-base font-semibold text-gray-800">Xu hướng theo tháng của dịch vụ</h2>
        </div>

        {trendError && (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {trendError}
          </div>
        )}

        {!loading && !error && !trendError && serviceTrendData.length === 0 && (
          <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-6 py-8 text-sm text-gray-500">
            Chưa có dữ liệu xu hướng theo tháng trong khoảng thời gian đã chọn.
          </div>
        )}

        {!loading && !error && !trendError && serviceTrendData.length > 0 && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
              <div className="text-sm font-semibold text-blue-800">Nhận định xu hướng</div>
              <div className="mt-2 text-sm leading-6 text-blue-900">{nhanDinhXuHuong}</div>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                <div className="text-sm font-semibold text-emerald-800">Dịch vụ tăng nhanh nhất</div>
                <div className="mt-2 text-lg font-bold text-gray-900">
                  {dichVuTangNhanhNhat?.ten_dich_vu || '--'}
                </div>
                <div className="mt-1 text-sm text-gray-600">
                  Chênh lệch lead gần nhất: {formatNumber(dichVuTangNhanhNhat?.chenhLechLead || 0)}
                </div>
                <div className="mt-1 text-sm text-gray-600">
                  Tăng trưởng gần nhất: {formatPercent(dichVuTangNhanhNhat?.tangTruongGanNhat || 0)}
                </div>
              </div>

              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <div className="text-sm font-semibold text-amber-800">Dịch vụ giảm rõ nhất</div>
                <div className="mt-2 text-lg font-bold text-gray-900">
                  {dichVuGiamNhieuNhat?.ten_dich_vu || '--'}
                </div>
                <div className="mt-1 text-sm text-gray-600">
                  Chênh lệch lead gần nhất: {formatNumber(dichVuGiamNhieuNhat?.chenhLechLead || 0)}
                </div>
                <div className="mt-1 text-sm text-gray-600">
                  Tăng trưởng gần nhất: {formatPercent(dichVuGiamNhieuNhat?.tangTruongGanNhat || 0)}
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-y-2">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Dịch vụ
                    </th>
                    {danhSachThang.map((thang) => (
                      <th
                        key={thang}
                        className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500"
                      >
                        {thang}
                      </th>
                    ))}
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Tăng trưởng gần nhất
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {xuHuongTheoDichVu.map((item) => (
                    <tr key={item.ten_dich_vu} className="bg-gray-50">
                      <td className="rounded-l-xl px-4 py-3 text-sm font-medium text-gray-800">
                        {item.ten_dich_vu}
                      </td>

                      {danhSachThang.map((thang) => {
                        const row = item.rows.find((x) => x.thang === thang);

                        return (
                          <td
                            key={`${item.ten_dich_vu}-${thang}`}
                            className="px-4 py-3 text-right text-sm text-gray-700"
                          >
                            {formatNumber(row?.tong_lead || 0)}
                          </td>
                        );
                      })}

                      <td className="rounded-r-xl px-4 py-3 text-right text-sm font-semibold text-gray-900">
                        {formatPercent(item.tangTruongGanNhat)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {xuHuongTheoDichVu.map((item) => (
                <div
                  key={`${item.ten_dich_vu}-trend-card`}
                  className="rounded-2xl border border-gray-200 bg-white p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-sm font-semibold text-gray-800">{item.ten_dich_vu}</div>
                      <div className="mt-1 text-sm text-gray-500">
                        Kỳ gần nhất: {item.thangCuoi?.thang || '--'}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-sm text-gray-500">Lead kỳ gần nhất</div>
                      <div className="text-lg font-bold text-gray-900">
                        {formatNumber(item.thangCuoi?.tong_lead || 0)}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 h-3 w-full rounded-full bg-gray-200">
                    <div
                      className="h-3 rounded-full bg-blue-600 transition-all"
                      style={{
                        width: `${clampPercent(item.thangCuoi?.ty_trong_trong_thang || 0)}%`,
                      }}
                    />
                  </div>

                  <div className="mt-3 text-sm text-gray-600">
                    Tỷ trọng trong tháng gần nhất:{' '}
                    <strong>{formatPercent(item.thangCuoi?.ty_trong_trong_thang || 0)}</strong>
                  </div>

                  <div className="mt-1 text-sm text-gray-600">
                    Tăng trưởng so với tháng trước:{' '}
                    <strong>{formatPercent(item.tangTruongGanNhat)}</strong>
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
          <h2 className="text-base font-semibold text-gray-800">Bảng hiệu quả theo dịch vụ</h2>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading && (
          <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-6 py-10 text-center text-sm text-gray-500">
            Đang tải dữ liệu phân tích dịch vụ...
          </div>
        )}

        {!loading && !error && serviceData.length === 0 && (
          <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-6 py-10 text-center">
            <div className="text-base font-medium text-gray-700">Chưa có dữ liệu</div>
            <div className="mt-2 text-sm text-gray-500">
              Hãy kiểm tra lại dữ liệu tư vấn, dịch vụ liên kết hoặc khoảng ngày lọc.
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
                      Chưa đáp ứng
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                      % chưa đáp ứng
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
                        <div className="text-sm font-medium text-gray-800">{item.ten_dich_vu}</div>
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
                        {formatNumber(Math.max(0, Number(item.tong_lead || 0) - Number(item.lead_da_chot || 0)))}
                      </td>

                      <td className="px-4 py-3 text-right text-sm text-gray-700">
                        {formatPercent(
                          Number(item.tong_lead || 0) > 0
                            ? ((Number(item.tong_lead || 0) - Number(item.lead_da_chot || 0)) / Number(item.tong_lead || 0)) * 100
                            : 0
                        )}
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
                      <div className="text-sm font-semibold text-gray-800">{item.ten_dich_vu}</div>
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
                        width: `${clampPercent(item.ty_trong_nhu_cau)}%`,
                      }}
                    />
                  </div>

                  <div className="mt-3 text-sm text-gray-600">
                    Dịch vụ này đang chiếm <strong>{formatPercent(item.ty_trong_nhu_cau)}</strong> mức quan tâm của thị trường, với{' '}
                    <strong>{formatNumber(item.lead_da_chot)}</strong> lead đã chốt.
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
