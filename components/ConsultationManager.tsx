import React, { useEffect, useState, useCallback } from 'react';
import { fetchConsultationListData, supabase } from '../apiService';
import type { ConsultationFilter, ConsultationLog } from '../types';
import { Settings, Plus, Pencil, Trash2 } from 'lucide-react';

type MasterDataState = {
  addresses: Array<{ id: string; ten_dia_chi: string }>;
  sources: Array<{ id: string; ten_nguon: string }>;
  statuses: Array<{ id: string; ten_tinh_trang: string }>;
  services: Array<{ id: string; ten_dich_vu: string }>;
  rejectionReasons: Array<{ id: string; ten_ly_do: string }>;
  staffOptions: Array<{ id: string; name: string; role?: string | null; status?: string | null }>;
};

const DEFAULT_PAGE_SIZE = 20;

const ConsultationManager: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'danh_sach' | 'bao_cao'>('danh_sach');

  const [data, setData] = useState<ConsultationLog[]>([]);
  const [quickStatusMap, setQuickStatusMap] = useState<Record<string, string>>({});
  const [quickStatusSavingId, setQuickStatusSavingId] = useState<string | null>(null);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(DEFAULT_PAGE_SIZE);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [reportSummary, setReportSummary] = useState({
    total_leads: 0,
    total_rejected: 0,
    total_pipeline_value: 0,
    total_closed: 0,
    by_status: [] as Array<{ label: string; total: number }>,
    funnel: [] as Array<{ label: string; total: number }>,
  });
  
  
  const today = new Date().toISOString().slice(0, 10);
  const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    .toISOString()
    .slice(0, 10);
  
  const [reportDateRange, setReportDateRange] = useState({
    from: firstDayOfMonth,
    to: today,
  });
  
  
  const [filters, setFilters] = useState<Partial<ConsultationFilter>>({
    tu_khoa: '',
    tinh_trang_id: '',
    nguon_khach_hang_id: '',
    nhan_vien_tu_van: '',
  });

  const [masterData, setMasterData] = useState<MasterDataState>({
    addresses: [],
    sources: [],
    statuses: [],
    services: [],
    staffOptions: [],
    rejectionReasons: [],
  });

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingLogId, setEditingLogId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    ngay_tu_van: new Date().toISOString().slice(0, 10),
    ten_khach_hang: '',
    dia_chi: '',
    so_dien_thoai: '',
    ngay_du_dinh_chup: '',
    ngay_an_hoi: '',
    ngay_cuoi: '',
    nguon_khach_hang_id: '',
    tinh_trang_id: '',
    ly_do_tu_choi_id: '',
    nhan_vien_tu_van: '',
    tong_gia_tri_du_kien: '',
    ghi_chu: '',
  });
  
  const [formErrors, setFormErrors] = useState({
    ly_do_tu_choi: false,
  });

  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [serviceManageId, setServiceManageId] = useState('');
  const [showAddressManager, setShowAddressManager] = useState(false);
  const [showSourceManager, setShowSourceManager] = useState(false);
  const [showBusinessManager, setShowBusinessManager] = useState(false);
  const [showRejectReasonManager, setShowRejectReasonManager] = useState(false);
  const [rejectReasonManageId, setRejectReasonManageId] = useState('');

  const loadReportSummary = useCallback(async (fromDate?: string, toDate?: string) => {
    try {
      const finalFromDate = fromDate || reportDateRange.from;
      const finalToDate = toDate || reportDateRange.to;
  
      const { data, error } = await supabase.rpc('consultation_report_summary', {
        p_from: finalFromDate,
        p_to: finalToDate,
      });
  
      if (error) throw error;
  
      setReportSummary({
        total_leads: data?.total_leads || 0,
        total_rejected: data?.total_rejected || 0,
        total_pipeline_value: data?.total_pipeline_value || 0,
        total_closed: data?.total_closed || 0,
        by_status: data?.by_status || [],
        funnel: data?.funnel || [],
      });
    } catch (err: any) {
      console.error('Lỗi khi tải báo cáo tổng quan:', err);
    }
  }, [reportDateRange]);


  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [result, addressesRes, rejectionReasonsRes, servicesRes, staffRes] = await Promise.all([
        fetchConsultationListData(page, pageSize, filters),
        supabase
          .from('consultation_addresses')
          .select('id, ten_dia_chi')
          .eq('dang_su_dung', true)
          .order('thu_tu_hien_thi', { ascending: true })
          .order('ten_dia_chi', { ascending: true }),
        supabase
          .from('consultation_rejection_reasons')
          .select('id, ten_ly_do')
          .eq('dang_su_dung', true)
          .order('thu_tu_hien_thi', { ascending: true })
          .order('ten_ly_do', { ascending: true }),
        supabase
          .from('consultation_services')
          .select('id, ten_dich_vu')
          .eq('dang_su_dung', true)
          .order('thu_tu_hien_thi', { ascending: true })
          .order('ten_dich_vu', { ascending: true }),
        supabase
          .from('staff')
          .select('id, name, role, status')
          .order('name', { ascending: true }),
      ]);

      if (addressesRes.error) throw addressesRes.error;
      if (rejectionReasonsRes.error) throw rejectionReasonsRes.error;
      if (servicesRes.error) throw servicesRes.error;
      if (staffRes.error) throw staffRes.error;

      const staffOptions = (staffRes.data || [])
        .filter((item: any) => {
          const status = String(item.status || '').trim().toLowerCase();
          return status === '' || status === 'active' || status === 'đang làm' || status === 'dang lam' || status === 'working';
        })
        .map((item: any) => ({
          id: item.id,
          name: item.name,
          role: item.role,
          status: item.status,
        }));

      setData(result.data || []);
      setTotal(result.total || 0);
      setTotalPages(result.totalPages || 1);
      setMasterData({
        addresses: (addressesRes.data || []).map((item: any) => ({
          id: item.id,
          ten_dia_chi: item.ten_dia_chi,
        })),
        rejectionReasons: (rejectionReasonsRes.data || []).map((item: any) => ({
          id: item.id,
          ten_ly_do: item.ten_ly_do,
        })),
        sources: result.masterData.sources || [],
        statuses: result.masterData.statuses || [],
        services: (servicesRes.data || []).map((item: any) => ({
          id: item.id,
          ten_dich_vu: item.ten_dich_vu,
        })),
        staffOptions,
      });
    } catch (err: any) {
      console.error('Lỗi khi tải dữ liệu nhật ký tư vấn:', err);
      if (err?.message?.includes('consultation_addresses')) {
        setError('Thiếu bảng consultation_addresses trong DB. Hãy chạy file SQL đi kèm rồi tải lại trang.');
      } else {
        setError(err?.message || 'Không thể tải dữ liệu nhật ký tư vấn');
      }
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, filters]);

  useEffect(() => {
    loadData();
    loadReportSummary();
  }, [loadData, loadReportSummary]);
  
  useEffect(() => {
    const nextMap: Record<string, string> = {};
  
    data.forEach((item) => {
      nextMap[item.id] = item.tinh_trang_id || '';
    });
  
    setQuickStatusMap(nextMap);
  }, [data]);

  const goToPrevPage = () => {
    setPage((prev) => Math.max(1, prev - 1));
  };

  const goToNextPage = () => {
    setPage((prev) => Math.min(totalPages, prev + 1));
  };

  const handleFilterChange = (field: keyof ConsultationFilter, value: string) => {
    setPage(1);
    setFilters((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const resetFilters = () => {
    setPage(1);
    setFilters({
      tu_khoa: '',
      tinh_trang_id: '',
      nguon_khach_hang_id: '',
      nhan_vien_tu_van: '',
    });
  };

  const resetForm = () => {
    setFormData({
      ngay_tu_van: new Date().toISOString().slice(0, 10),
      ten_khach_hang: '',
      dia_chi: '',
      so_dien_thoai: '',
      ngay_du_dinh_chup: '',
      ngay_an_hoi: '',
      ngay_cuoi: '',
      nguon_khach_hang_id: '',
      tinh_trang_id: '',
      ly_do_tu_choi_id: '',
      nhan_vien_tu_van: '',
      tong_gia_tri_du_kien: '',
      ghi_chu: '',
    });
    setSelectedServices([]);
    setServiceManageId('');
    setRejectReasonManageId('');
    setEditingLogId(null);
  };

  const openCreateModal = () => {
    resetForm();
    setIsCreateModalOpen(true);
  };

  const closeCreateModal = () => {
    if (saving) return;
    setIsCreateModalOpen(false);
  };

  const handleFormChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => {
      const next = {
        ...prev,
        [field]: value,
      };

      if (field === 'tinh_trang_id') {
        const nextStatus = masterData.statuses.find((item) => item.id === value);
      
        const normalizedStatusName = nextStatus?.ten_tinh_trang
          ?.trim()
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '');
      
        const isNextRejectStatus = normalizedStatusName === 'khach tu choi';
      
        if (!isNextRejectStatus) {
          next.ly_do_tu_choi_id = '';
        }
      }

      return next;
    });
  };

  const handleCreate = async () => {
    if (!formData.ten_khach_hang.trim()) {
      alert('Vui lòng nhập tên khách hàng');
      return;
    }

    const selectedStatus = masterData.statuses.find(
      (item) => item.id === formData.tinh_trang_id
    );
    
    const normalizedStatusName = selectedStatus?.ten_tinh_trang
      ?.trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    
    const isRejectStatus = normalizedStatusName === 'khach tu choi';
    
    if (isRejectStatus && !formData.ly_do_tu_choi_id) {
      setFormErrors({ ly_do_tu_choi: true });
      alert('Vui lòng chọn lý do từ chối');
      return;
    }

    try {
      setSaving(true);

      const payload = {
        ngay_tu_van: formData.ngay_tu_van || null,
        ten_khach_hang: formData.ten_khach_hang.trim(),
        dia_chi: formData.dia_chi || null,
        so_dien_thoai: formData.so_dien_thoai.trim() || null,
        ngay_du_dinh_chup: formData.ngay_du_dinh_chup || null,
        ngay_an_hoi: formData.ngay_an_hoi || null,
        ngay_cuoi: formData.ngay_cuoi || null,
        nguon_khach_hang_id: formData.nguon_khach_hang_id || null,
        tinh_trang_id: formData.tinh_trang_id || null,
        ly_do_tu_choi_id: formData.ly_do_tu_choi_id || null,
        nhan_vien_tu_van: formData.nhan_vien_tu_van || null,
        tong_gia_tri_du_kien: formData.tong_gia_tri_du_kien ? Number(formData.tong_gia_tri_du_kien) : 0,
        ghi_chu: formData.ghi_chu.trim() || null,
      };

      let savedLogId = editingLogId;

      if (editingLogId) {
        const { error } = await supabase
          .from('consultation_logs')
          .update(payload)
          .eq('id', editingLogId);

        if (error) throw error;
      } else {
        const { data: createdLog, error } = await supabase
          .from('consultation_logs')
          .insert([payload])
          .select()
          .single();

        if (error) throw error;
        savedLogId = createdLog.id;
      }

      if (!savedLogId) {
        throw new Error('Không xác định được bản ghi để lưu dịch vụ quan tâm');
      }

      const { error: deleteOldServicesError } = await supabase
        .from('consultation_log_services')
        .delete()
        .eq('consultation_log_id', savedLogId);

      if (deleteOldServicesError) throw deleteOldServicesError;

      if (selectedServices.length > 0) {
        const serviceRows = selectedServices.map((serviceId) => ({
          consultation_log_id: savedLogId,
          service_id: serviceId,
        }));

        const { error: serviceError } = await supabase
          .from('consultation_log_services')
          .insert(serviceRows);

        if (serviceError) throw serviceError;
      }

      setIsCreateModalOpen(false);
      resetForm();
      await loadData();
    } catch (err: any) {
      console.error('Lỗi khi thêm mới nhật ký tư vấn:', err);
      alert(err?.message || 'Không thể thêm mới nhật ký tư vấn');
    } finally {
      setSaving(false);
    }
  };

  const handleAddAddress = async () => {
    const tenDiaChi = window.prompt('Nhập tên địa chỉ mới:');
    if (!tenDiaChi || !tenDiaChi.trim()) return;

    try {
      const { error } = await supabase.from('consultation_addresses').insert([
        {
          ten_dia_chi: tenDiaChi.trim(),
          thu_tu_hien_thi: masterData.addresses.length + 1,
          dang_su_dung: true,
        },
      ]);

      if (error) throw error;
      await loadData();
    } catch (err: any) {
      console.error('Lỗi khi thêm địa chỉ:', err);
      alert(err?.message || 'Không thể thêm địa chỉ');
    }
  };

  const handleEditAddress = async () => {
    if (!formData.dia_chi) {
      alert('Vui lòng chọn một địa chỉ để sửa');
      return;
    }

    const currentItem = masterData.addresses.find((item) => item.ten_dia_chi === formData.dia_chi);
    if (!currentItem) {
      alert('Địa chỉ hiện tại không thuộc danh mục dropdown');
      return;
    }

    const tenMoi = window.prompt('Sửa tên địa chỉ:', currentItem.ten_dia_chi);
    if (!tenMoi || !tenMoi.trim()) return;

    try {
      const { error } = await supabase
        .from('consultation_addresses')
        .update({ ten_dia_chi: tenMoi.trim() })
        .eq('id', currentItem.id);

      if (error) throw error;
      setFormData((prev) => ({ ...prev, dia_chi: tenMoi.trim() }));
      await loadData();
    } catch (err: any) {
      console.error('Lỗi khi sửa địa chỉ:', err);
      alert(err?.message || 'Không thể sửa địa chỉ');
    }
  };

  const handleDeleteAddress = async () => {
    if (!formData.dia_chi) {
      alert('Vui lòng chọn một địa chỉ để xóa');
      return;
    }

    const currentItem = masterData.addresses.find((item) => item.ten_dia_chi === formData.dia_chi);
    if (!currentItem) {
      alert('Địa chỉ hiện tại không thuộc danh mục dropdown');
      return;
    }

    const confirmed = window.confirm(`Xóa địa chỉ "${currentItem.ten_dia_chi}" khỏi dropdown?`);
    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('consultation_addresses')
        .update({ dang_su_dung: false })
        .eq('id', currentItem.id);

      if (error) throw error;
      setFormData((prev) => ({ ...prev, dia_chi: '' }));
      await loadData();
    } catch (err: any) {
      console.error('Lỗi khi xóa địa chỉ:', err);
      alert(err?.message || 'Không thể xóa địa chỉ');
    }
  };

  const handleAddSource = async () => {
    const tenNguon = window.prompt('Nhập tên nguồn khách mới:');
    if (!tenNguon || !tenNguon.trim()) return;

    try {
      const { error } = await supabase.from('consultation_sources').insert([
        {
          ten_nguon: tenNguon.trim(),
          mau_hien_thi: null,
          thu_tu_hien_thi: masterData.sources.length + 1,
          dang_su_dung: true,
        },
      ]);
      if (error) throw error;
      await loadData();
    } catch (err: any) {
      console.error('Lỗi khi thêm nguồn khách:', err);
      alert(err?.message || 'Không thể thêm nguồn khách');
    }
  };

  const handleEditSource = async () => {
    if (!formData.nguon_khach_hang_id) {
      alert('Vui lòng chọn một nguồn khách để sửa');
      return;
    }

    const currentItem = masterData.sources.find((item) => item.id === formData.nguon_khach_hang_id);
    if (!currentItem) return;

    const tenMoi = window.prompt('Sửa tên nguồn khách:', currentItem.ten_nguon);
    if (!tenMoi || !tenMoi.trim()) return;

    try {
      const { error } = await supabase
        .from('consultation_sources')
        .update({ ten_nguon: tenMoi.trim() })
        .eq('id', currentItem.id);

      if (error) throw error;
      await loadData();
      setFormData((prev) => ({ ...prev, nguon_khach_hang_id: currentItem.id }));
    } catch (err: any) {
      console.error('Lỗi khi sửa nguồn khách:', err);
      alert(err?.message || 'Không thể sửa nguồn khách');
    }
  };

  const handleDeleteSource = async () => {
    if (!formData.nguon_khach_hang_id) {
      alert('Vui lòng chọn một nguồn khách để xóa');
      return;
    }

    const currentItem = masterData.sources.find((item) => item.id === formData.nguon_khach_hang_id);
    if (!currentItem) return;

    const confirmed = window.confirm(`Xóa nguồn khách "${currentItem.ten_nguon}" khỏi dropdown?`);
    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('consultation_sources')
        .update({ dang_su_dung: false })
        .eq('id', currentItem.id);

      if (error) throw error;
      setFormData((prev) => ({ ...prev, nguon_khach_hang_id: '' }));
      await loadData();
    } catch (err: any) {
      console.error('Lỗi khi xóa nguồn khách:', err);
      alert(err?.message || 'Không thể xóa nguồn khách');
    }
  };

  const handleAddStatus = async () => {
    const tenTinhTrang = window.prompt('Nhập tên tình trạng mới:');
    if (!tenTinhTrang || !tenTinhTrang.trim()) return;

    try {
      const { error } = await supabase.from('consultation_statuses').insert([
        {
          ten_tinh_trang: tenTinhTrang.trim(),
          mau_hien_thi: null,
          nhom_trang_thai: 'dang_xu_ly',
          thu_tu_hien_thi: masterData.statuses.length + 1,
          dang_su_dung: true,
          la_trang_thai_chot: false,
          la_trang_thai_tu_choi: false,
          la_trang_thai_dong: false,
        },
      ]);
      if (error) throw error;
      await loadData();
    } catch (err: any) {
      console.error('Lỗi khi thêm tình trạng:', err);
      alert(err?.message || 'Không thể thêm tình trạng');
    }
  };

  const handleEditStatus = async () => {
    if (!formData.tinh_trang_id) {
      alert('Vui lòng chọn một tình trạng để sửa');
      return;
    }

    const currentItem = masterData.statuses.find((item) => item.id === formData.tinh_trang_id);
    if (!currentItem) return;

    const tenMoi = window.prompt('Sửa tên tình trạng:', currentItem.ten_tinh_trang);
    if (!tenMoi || !tenMoi.trim()) return;

    try {
      const { error } = await supabase
        .from('consultation_statuses')
        .update({ ten_tinh_trang: tenMoi.trim() })
        .eq('id', currentItem.id);

      if (error) throw error;
      await loadData();
      setFormData((prev) => ({ ...prev, tinh_trang_id: currentItem.id }));
    } catch (err: any) {
      console.error('Lỗi khi sửa tình trạng:', err);
      alert(err?.message || 'Không thể sửa tình trạng');
    }
  };

  const handleDeleteStatus = async () => {
    if (!formData.tinh_trang_id) {
      alert('Vui lòng chọn một tình trạng để xóa');
      return;
    }

    const currentItem = masterData.statuses.find((item) => item.id === formData.tinh_trang_id);
    if (!currentItem) return;

    const confirmed = window.confirm(`Xóa tình trạng "${currentItem.ten_tinh_trang}" khỏi dropdown?`);
    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('consultation_statuses')
        .update({ dang_su_dung: false })
        .eq('id', currentItem.id);

      if (error) throw error;
      setFormData((prev) => ({ ...prev, tinh_trang_id: '' }));
      await loadData();
    } catch (err: any) {
      console.error('Lỗi khi xóa tình trạng:', err);
      alert(err?.message || 'Không thể xóa tình trạng');
    }
  };

  const handleAddService = async () => {
    const tenDichVu = window.prompt('Nhập tên dịch vụ mới:');
    if (!tenDichVu || !tenDichVu.trim()) return;

    try {
      const { error } = await supabase.from('consultation_services').insert([
        {
          ten_dich_vu: tenDichVu.trim(),
          mau_hien_thi: null,
          thu_tu_hien_thi: masterData.services.length + 1,
          dang_su_dung: true,
        },
      ]);
      if (error) throw error;
      await loadData();
    } catch (err: any) {
      console.error('Lỗi khi thêm dịch vụ:', err);
      alert(err?.message || 'Không thể thêm dịch vụ');
    }
  };

  const handleEditService = async () => {
    if (!serviceManageId) {
      alert('Vui lòng chọn một dịch vụ để sửa');
      return;
    }

    const currentItem = masterData.services.find((item) => item.id === serviceManageId);
    if (!currentItem) return;

    const tenMoi = window.prompt('Sửa tên dịch vụ:', currentItem.ten_dich_vu);
    if (!tenMoi || !tenMoi.trim()) return;

    try {
      const { error } = await supabase
        .from('consultation_services')
        .update({ ten_dich_vu: tenMoi.trim() })
        .eq('id', currentItem.id);

      if (error) throw error;
      await loadData();
    } catch (err: any) {
      console.error('Lỗi khi sửa dịch vụ:', err);
      alert(err?.message || 'Không thể sửa dịch vụ');
    }
  };

  const handleDeleteService = async () => {
    if (!serviceManageId) {
      alert('Vui lòng chọn một dịch vụ để xóa');
      return;
    }

    const currentItem = masterData.services.find((item) => item.id === serviceManageId);
    if (!currentItem) return;

    const confirmed = window.confirm(`Xóa dịch vụ "${currentItem.ten_dich_vu}" khỏi danh sách?`);
    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('consultation_services')
        .update({ dang_su_dung: false })
        .eq('id', currentItem.id);

      if (error) throw error;
      setSelectedServices((prev) => prev.filter((id) => id !== currentItem.id));
      setServiceManageId('');
      await loadData();
    } catch (err: any) {
      console.error('Lỗi khi xóa dịch vụ:', err);
      alert(err?.message || 'Không thể xóa dịch vụ');
    }
  };

  const handleAddRejectReason = async () => {
    const tenLyDo = window.prompt('Nhập lý do từ chối mới:');
    if (!tenLyDo || !tenLyDo.trim()) return;

    try {
      const { error } = await supabase
        .from('consultation_rejection_reasons')
        .insert([
          {
            ten_ly_do: tenLyDo.trim(),
            thu_tu_hien_thi: masterData.rejectionReasons.length + 1,
            dang_su_dung: true,
          },
        ]);

      if (error) throw error;
      await loadData();
    } catch (err: any) {
      console.error('Lỗi khi thêm lý do từ chối:', err);
      alert(err?.message || 'Không thể thêm lý do từ chối');
    }
  };

  const handleEditRejectReason = async () => {
    if (!rejectReasonManageId) {
      alert('Vui lòng chọn một lý do để sửa');
      return;
    }

    const currentItem = masterData.rejectionReasons.find(
      (item) => item.id === rejectReasonManageId
    );
    if (!currentItem) return;

    const tenMoi = window.prompt('Sửa lý do từ chối:', currentItem.ten_ly_do);
    if (!tenMoi || !tenMoi.trim()) return;

    try {
      const { error } = await supabase
        .from('consultation_rejection_reasons')
        .update({ ten_ly_do: tenMoi.trim() })
        .eq('id', currentItem.id);

      if (error) throw error;
      await loadData();
    } catch (err: any) {
      console.error('Lỗi khi sửa lý do từ chối:', err);
      alert(err?.message || 'Không thể sửa lý do từ chối');
    }
  };

  const handleDeleteRejectReason = async () => {
    if (!rejectReasonManageId) {
      alert('Vui lòng chọn một lý do để xóa');
      return;
    }

    const currentItem = masterData.rejectionReasons.find(
      (item) => item.id === rejectReasonManageId
    );
    if (!currentItem) return;

    const confirmed = window.confirm(
      `Xóa lý do "${currentItem.ten_ly_do}" khỏi danh sách?`
    );
    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('consultation_rejection_reasons')
        .update({ dang_su_dung: false })
        .eq('id', currentItem.id);

      if (error) throw error;

      setFormData((prev) => ({ ...prev, ly_do_tu_choi_id: '' }));
      setRejectReasonManageId('');
      await loadData();
    } catch (err: any) {
      console.error('Lỗi khi xóa lý do từ chối:', err);
      alert(err?.message || 'Không thể xóa lý do từ chối');
    }
  };

   const selectedStatus = masterData.statuses.find(
     (item) => item.id === formData.tinh_trang_id
   );
   
   const normalizedStatusName = selectedStatus?.ten_tinh_trang
     ?.trim()
     .toLowerCase()
     .normalize('NFD')
     .replace(/[\u0300-\u036f]/g, '');
   
   const isRejectStatus = normalizedStatusName === 'khach tu choi';



  const handleEdit = async (item: ConsultationLog) => {
    try {
	  setSelectedRowId(item.id);
      setEditingLogId(item.id);

      const { data: logServices, error: logServicesError } = await supabase
        .from('consultation_log_services')
        .select('service_id')
        .eq('consultation_log_id', item.id);

      if (logServicesError) throw logServicesError;

      setFormData({
        ngay_tu_van: item.ngay_tu_van || '',
        ten_khach_hang: item.ten_khach_hang || '',
        dia_chi: item.dia_chi || '',
        so_dien_thoai: item.so_dien_thoai || '',
        ngay_du_dinh_chup: item.ngay_du_dinh_chup || '',
        ngay_an_hoi: item.ngay_an_hoi || '',
        ngay_cuoi: item.ngay_cuoi || '',
        nguon_khach_hang_id: item.nguon_khach_hang_id || '',
        tinh_trang_id: item.tinh_trang_id || '',
        ly_do_tu_choi_id: item.ly_do_tu_choi_id || '',
        nhan_vien_tu_van: item.nhan_vien_tu_van || '',
        tong_gia_tri_du_kien: String(item.tong_gia_tri_du_kien || ''),
        ghi_chu: item.ghi_chu || '',
      });

      setSelectedServices((logServices || []).map((row: any) => row.service_id));
      setIsCreateModalOpen(true);
    } catch (err: any) {
      console.error('Lỗi khi mở dữ liệu để sửa:', err);
      alert(err?.message || 'Không thể mở dữ liệu để chỉnh sửa');
    }
  };

  const handleDelete = async (item: ConsultationLog) => {
    const confirmed = window.confirm(
      `Bạn có chắc muốn xóa khách "${item.ten_khach_hang}" không?`
    );
    if (!confirmed) return;

    try {
      const { error: deleteServicesError } = await supabase
        .from('consultation_log_services')
        .delete()
        .eq('consultation_log_id', item.id);

      if (deleteServicesError) throw deleteServicesError;

      const { error } = await supabase
        .from('consultation_logs')
        .delete()
        .eq('id', item.id);

      if (error) throw error;

      await loadData();
    } catch (err: any) {
      console.error('Lỗi khi xóa nhật ký tư vấn:', err);
      alert(err?.message || 'Không thể xóa dữ liệu');
    }
  };

  const handleQuickStatusChange = async (logId: string, newStatusId: string) => {
    const previousStatusId = quickStatusMap[logId] || '';
  
    try {
	  setSelectedRowId(logId);
      setQuickStatusSavingId(logId);
  
      setQuickStatusMap((prev) => ({
        ...prev,
        [logId]: newStatusId,
      }));
  
      const selectedStatus = masterData.statuses.find(
        (status) => status.id === newStatusId
      );
      
      const normalizedStatusName = selectedStatus?.ten_tinh_trang
        ?.trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
      
      const isRejectStatus = normalizedStatusName === 'khach tu choi';
      
      const updatePayload = {
        tinh_trang_id: newStatusId || null,
        ly_do_tu_choi_id: isRejectStatus ? undefined : null,
      };
      
      const { error } = await supabase
        .from('consultation_logs')
        .update(updatePayload)
        .eq('id', logId);
  
      if (error) throw error;
  
      setData((prev) =>
        prev.map((item) =>
          item.id === logId
            ? {
                ...item,
                tinh_trang_id: newStatusId || null,
                tinh_trang_ten:
                  masterData.statuses.find((status) => status.id === newStatusId)?.ten_tinh_trang || '',
                ly_do_tu_choi_id: isRejectStatus ? item.ly_do_tu_choi_id : null,
                ly_do_tu_choi_ten: isRejectStatus ? item.ly_do_tu_choi_ten : null,
              }
            : item
        )
      );
	  
      if (isRejectStatus) {
        const updatedItem = data.find((item) => item.id === logId);
      
        alert('Bạn đã chuyển sang trạng thái "Khách từ chối". Hệ thống sẽ mở form chỉnh sửa để bạn chọn lý do từ chối.');
      
        if (updatedItem) {
          await handleEdit({
            ...updatedItem,
            tinh_trang_id: newStatusId,
            tinh_trang_ten:
              masterData.statuses.find((status) => status.id === newStatusId)?.ten_tinh_trang || '',
            ly_do_tu_choi_id: updatedItem.ly_do_tu_choi_id || '',
            ly_do_tu_choi_ten: updatedItem.ly_do_tu_choi_ten || '',
          });
        }
      }

    } catch (err: any) {
      console.error('Lỗi khi cập nhật nhanh tình trạng:', err);
  
      setQuickStatusMap((prev) => ({
        ...prev,
        [logId]: previousStatusId,
      }));
  
      alert(err?.message || 'Không thể cập nhật tình trạng');
    } finally {
      setQuickStatusSavingId(null);
    }
  };

  const funnelOrder = [
    'Khách mới',
    'Đã hỏi thăm lần 1',
    'Đã hỏi thăm lần 2',
    'Đã hỏi thăm lần 3',
    'Đã hẹn qua Studio',
    'Đã chốt',
    'Khách từ chối',
    'Studio kín lịch không nhận',
    'Spam không trả lời',
  ];
  
  const normalizedFunnel = funnelOrder.map((stage) => {
    const found = reportSummary.funnel.find((item) => item.label === stage);
  
    return {
      label: stage,
      total: found ? found.total : 0,
    };
  });
  
  const totalLeads = reportSummary.total_leads || 0;
  
  const funnelWithRate = normalizedFunnel.map((item) => ({
    ...item,
    rate: totalLeads > 0 ? (item.total / totalLeads) * 100 : 0,
  }));

  return (
    <div className="p-6 space-y-4">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Nhật Ký Tư Vấn</h1>
            <p className="text-sm text-gray-500 mt-1">
              Quản lý lead tư vấn, theo dõi tình trạng khách hàng và chuẩn bị dữ liệu cho báo cáo insight.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-sm text-gray-600">
              Tổng số dòng: <span className="font-semibold">{total}</span>
            </div>

            <button
              type="button"
              onClick={openCreateModal}
              className="rounded-lg bg-blue-600 text-white px-4 py-2 text-sm font-medium hover:bg-blue-700"
            >
              Thêm mới
            </button>
          </div>
        </div>
      </div>
	  
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('danh_sach')}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              activeTab === 'danh_sach'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Danh sách
          </button>
      
          <button
            type="button"
            onClick={() => setActiveTab('bao_cao')}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              activeTab === 'bao_cao'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Báo Cáo
          </button>
        </div>
      </div>

    {activeTab === 'bao_cao' && (
      <div className="space-y-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Từ ngày
              </label>
              <input
                type="date"
                value={reportDateRange.from}
                onChange={(e) =>
                  setReportDateRange((prev) => ({
                    ...prev,
                    from: e.target.value,
                  }))
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
    
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Đến ngày
              </label>
              <input
                type="date"
                value={reportDateRange.to}
                onChange={(e) =>
                  setReportDateRange((prev) => ({
                    ...prev,
                    to: e.target.value,
                  }))
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
    
            <div className="flex items-end">
              <button
                type="button"
                onClick={() => loadReportSummary()}
                className="w-full rounded-lg bg-blue-600 text-white px-4 py-2 text-sm font-medium hover:bg-blue-700"
              >
                Xem báo cáo
              </button>
            </div>
          </div>
        </div>
    
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <div className="text-sm text-gray-500">Tổng lead</div>
            <div className="text-2xl font-bold text-gray-800 mt-2">
              {reportSummary.total_leads.toLocaleString('vi-VN')}
            </div>
          </div>
    
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <div className="text-sm text-gray-500">Khách từ chối</div>
            <div className="text-2xl font-bold text-red-600 mt-2">
              {reportSummary.total_rejected.toLocaleString('vi-VN')}
            </div>
          </div>
    
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <div className="text-sm text-gray-500">Tổng giá trị dự kiến</div>
            <div className="text-2xl font-bold text-blue-600 mt-2">
              {reportSummary.total_pipeline_value.toLocaleString('vi-VN')}
            </div>
          </div>
    
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <div className="text-sm text-gray-500">Lead đã có tình trạng</div>
            <div className="text-2xl font-bold text-emerald-600 mt-2">
              {reportSummary.total_closed.toLocaleString('vi-VN')}
            </div>
          </div>
        </div>
		
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-gray-800">
              Funnel cơ bản
            </h3>
            <span className="text-sm text-gray-400">
              {reportSummary.funnel.length} bước
            </span>
          </div>
        
          {reportSummary.funnel.length === 0 ? (
            <div className="text-sm text-gray-500">
              Chưa có dữ liệu funnel trong khoảng thời gian này.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {funnelWithRate.map((item) => (
                <div
                  key={item.label}
                  className="rounded-xl border border-gray-100 bg-gray-50 p-4"
                >
                  <div className="text-sm text-gray-500">{item.label}</div>
          
                  <div className="text-2xl font-bold text-gray-800 mt-2">
                    {item.total.toLocaleString('vi-VN')}
                  </div>
          
                  <div className="text-sm text-gray-500 mt-2">
                    {item.rate.toFixed(1)}%
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

		
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-gray-800">
              Breakdown theo tình trạng
            </h3>
            <span className="text-sm text-gray-400">
              {reportSummary.by_status.length} nhóm
            </span>
          </div>
        
          {reportSummary.by_status.length === 0 ? (
            <div className="text-sm text-gray-500">
              Chưa có dữ liệu theo tình trạng trong khoảng thời gian này.
            </div>
          ) : (
            <div className="space-y-3">
              {reportSummary.by_status.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-4 py-3"
                >
                  <div className="text-sm font-medium text-gray-700">
                    {item.label}
                  </div>
                  <div className="text-sm font-bold text-gray-900">
                    {item.total.toLocaleString('vi-VN')}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>		
		
      </div>
    )}

 
	{activeTab === 'danh_sach' && (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Từ khóa
            </label>
            <input
              type="text"
              value={filters.tu_khoa || ''}
              onChange={(e) => handleFilterChange('tu_khoa', e.target.value)}
              placeholder="Tên khách hàng hoặc số điện thoại"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tình trạng
            </label>
            <select
              value={filters.tinh_trang_id || ''}
              onChange={(e) => handleFilterChange('tinh_trang_id', e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Tất cả</option>
              {masterData.statuses.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.ten_tinh_trang}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nguồn khách
            </label>
            <select
              value={filters.nguon_khach_hang_id || ''}
              onChange={(e) => handleFilterChange('nguon_khach_hang_id', e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Tất cả</option>
              {masterData.sources.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.ten_nguon}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nhân viên tư vấn
            </label>
            <select
              value={filters.nhan_vien_tu_van || ''}
              onChange={(e) => handleFilterChange('nhan_vien_tu_van', e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Tất cả</option>
              {masterData.staffOptions.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button
              type="button"
              onClick={resetFilters}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50"
            >
              Xóa bộ lọc
            </button>
          </div>
        </div>
      </div>
    )}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-6 text-gray-600">Đang tải dữ liệu...</div>
        ) : error ? (
          <div className="p-6 text-red-600">{error}</div>
        ) : data.length === 0 ? (
          <div className="p-6 text-gray-500">Chưa có dữ liệu nhật ký tư vấn.</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr className="text-left text-gray-700">
                    <th className="px-4 py-3 font-semibold">Ngày tư vấn</th>
                    <th className="px-4 py-3 font-semibold">Tên khách hàng</th>
                    <th className="px-4 py-3 font-semibold">Số điện thoại</th>
                    <th className="px-4 py-3 font-semibold">Nguồn khách</th>
                    <th className="px-4 py-3 font-semibold">Dịch vụ quan tâm</th>
                    <th className="px-4 py-3 font-semibold">Tình trạng</th>
                    <th className="px-4 py-3 font-semibold">Lý do từ chối</th>
                    <th className="px-4 py-3 font-semibold">Nhân viên tư vấn</th>
                    <th className="px-4 py-3 font-semibold text-right">Giá trị dự kiến</th>
                    <th className="px-4 py-3 font-semibold text-center">Hành động</th>
                  </tr>
                </thead>

                <tbody>
                  {data.map((item) => (
                    <tr
                      key={item.id}
                      onClick={() => setSelectedRowId(item.id)}
                      className={`border-b border-gray-100 transition cursor-pointer ${
                        selectedRowId === item.id ? 'bg-blue-50' : 'hover:bg-gray-50'
                      }`}
                    >
                      <td className="px-4 py-3 whitespace-nowrap">
                        {item.ngay_tu_van || ''}
                      </td>

                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-800">
                          {item.ten_khach_hang || ''}
                        </div>
                        {item.dia_chi ? (
                          <div className="text-xs text-gray-500 mt-1">{item.dia_chi}</div>
                        ) : null}
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        {item.so_dien_thoai || ''}
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        {item.nguon_khach_hang_ten || ''}
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {(item.dich_vu_quan_tam_ten || []).length > 0 ? (
                            item.dich_vu_quan_tam_ten?.map((service) => (
                              <span
                                key={service}
                                className="inline-flex items-center rounded-full bg-blue-50 text-blue-700 px-2 py-1 text-xs font-medium"
                              >
                                {service}
                              </span>
                            ))
                          ) : (
                            <span className="text-gray-400">---</span>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        <select
                          value={quickStatusMap[item.id] || ''}
						  onClick={(e) => e.stopPropagation()}
                          onChange={(e) => handleQuickStatusChange(item.id, e.target.value)}
                          disabled={quickStatusSavingId === item.id}
                          className="min-w-[160px] rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
                        >
                          <option value="">Chọn tình trạng</option>
                          {masterData.statuses.map((status) => (
                            <option key={status.id} value={status.id}>
                              {status.ten_tinh_trang}
                            </option>
                          ))}
                        </select>
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        {item.ly_do_tu_choi_ten ? (
                          <span className="inline-flex items-center rounded-full bg-red-50 text-red-600 px-2 py-1 text-xs font-medium">
                            {item.ly_do_tu_choi_ten}
                          </span>
                        ) : (
                          <span className="text-gray-300">---</span>
                        )}
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        {item.nhan_vien_tu_van_ten || ''}
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap text-right font-medium">
                        {(item.tong_gia_tri_du_kien || 0).toLocaleString('vi-VN')}
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEdit(item);
                            }}
                            className="p-2 rounded-lg hover:bg-blue-50 text-blue-500 hover:text-blue-700"
                            title="Chỉnh sửa"
                          >
                            <Pencil size={16} />
                          </button>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(item);
                            }}
                            className="p-2 rounded-lg hover:bg-red-50 text-red-500 hover:text-red-700"
                            title="Xóa"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between px-4 py-3 bg-gray-50">
              <div className="text-sm text-gray-600">
                Trang <span className="font-semibold">{page}</span> /{' '}
                <span className="font-semibold">{totalPages}</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={goToPrevPage}
                  disabled={page <= 1}
                  className="px-3 py-2 rounded-lg border border-gray-300 text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white"
                >
                  Trang trước
                </button>

                <button
                  onClick={goToNextPage}
                  disabled={page >= totalPages}
                  className="px-3 py-2 rounded-lg border border-gray-300 text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white"
                >
                  Trang sau
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-4xl rounded-2xl bg-white shadow-xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-800">
                {editingLogId ? 'Chỉnh sửa nhật ký tư vấn' : 'Thêm mới nhật ký tư vấn'}
              </h2>
              <button
                type="button"
                onClick={closeCreateModal}
                className="text-gray-500 hover:text-gray-700"
              >
                Đóng
              </button>
            </div>

            <div className="p-6 space-y-8 max-h-[75vh] overflow-y-auto">

              {/* ================= 1. NHÂN VIÊN ================= */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase text-blue-600 tracking-widest flex items-center gap-2">
                  👤 Thông tin nhân viên
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase">
                      Nhân viên tư vấn
                    </label>
                    <select
                      value={formData.nhan_vien_tu_van}
                      onChange={(e) =>
                        handleFormChange('nhan_vien_tu_van', e.target.value)
                      }
                      className="w-full mt-1 p-3 bg-gray-50 border rounded-xl font-bold"
                    >
                      <option value="">Chọn nhân viên</option>
                      {masterData.staffOptions.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase">
                      Ngày tư vấn
                    </label>
                    <input
                      type="date"
                      value={formData.ngay_tu_van}
                      onChange={(e) =>
                        handleFormChange('ngay_tu_van', e.target.value)
                      }
                      className="w-full mt-1 p-3 bg-gray-50 border rounded-xl font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* ================= 2. KHÁCH HÀNG ================= */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase text-slate-600 tracking-widest">
                  🧾 Thông tin khách hàng
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                  <input
                    placeholder="Tên khách hàng"
                    value={formData.ten_khach_hang}
                    onChange={(e) =>
                      handleFormChange('ten_khach_hang', e.target.value)
                    }
                    className="p-3 bg-gray-50 border rounded-xl font-bold"
                  />

                  <input
                    placeholder="Số điện thoại"
                    value={formData.so_dien_thoai}
                    onChange={(e) =>
                      handleFormChange('so_dien_thoai', e.target.value)
                    }
                    className="p-3 bg-gray-50 border rounded-xl font-bold"
                  />

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <label className="text-xs font-bold text-slate-500 uppercase">
                        Địa chỉ
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setShowAddressManager((prev) => !prev);
                          setShowSourceManager(false);
                          setShowBusinessManager(false);
                        }}
                        className="p-1 rounded-lg hover:bg-gray-100 text-slate-400 hover:text-slate-700"
                        title="Tùy chỉnh địa chỉ"
                      >
                        <Settings size={14} />
                      </button>
                    </div>

                    <select
                      value={formData.dia_chi}
                      onChange={(e) => handleFormChange('dia_chi', e.target.value)}
                      className="w-full p-3 bg-gray-50 border border-slate-200 rounded-xl font-bold"
                    >
                      <option value="">Chọn địa chỉ</option>
                      {masterData.addresses.map((a) => (
                        <option key={a.id} value={a.ten_dia_chi}>
                          {a.ten_dia_chi}
                        </option>
                      ))}
                    </select>

                    {showAddressManager && (
                      <div className="flex flex-wrap gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                        <button
                          type="button"
                          onClick={handleAddAddress}
                          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm font-medium hover:bg-slate-100"
                        >
                          <Plus size={14} />
                          Thêm
                        </button>

                        <button
                          type="button"
                          onClick={handleEditAddress}
                          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm font-medium hover:bg-slate-100"
                        >
                          <Pencil size={14} />
                          Sửa
                        </button>

                        <button
                          type="button"
                          onClick={handleDeleteAddress}
                          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-red-300 bg-white text-red-500 text-sm font-medium hover:bg-red-50"
                        >
                          <Trash2 size={14} />
                          Xóa
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <label className="text-xs font-bold text-slate-500 uppercase">
                        Nguồn khách hàng
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setShowSourceManager((prev) => !prev);
                          setShowAddressManager(false);
                          setShowBusinessManager(false);
                        }}
                        className="p-1 rounded-lg hover:bg-gray-100 text-slate-400 hover:text-slate-700"
                        title="Tùy chỉnh nguồn khách"
                      >
                        <Settings size={14} />
                      </button>
                    </div>

                    <select
                      value={formData.nguon_khach_hang_id}
                      onChange={(e) => handleFormChange('nguon_khach_hang_id', e.target.value)}
                      className="w-full p-3 bg-gray-50 border border-slate-200 rounded-xl font-bold"
                    >
                      <option value="">Chọn nguồn khách</option>
                      {masterData.sources.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.ten_nguon}
                        </option>
                      ))}
                    </select>

                    {showSourceManager && (
                      <div className="flex flex-wrap gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                        <button
                          type="button"
                          onClick={handleAddSource}
                          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm font-medium hover:bg-slate-100"
                        >
                          <Plus size={14} />
                          Thêm
                        </button>

                        <button
                          type="button"
                          onClick={handleEditSource}
                          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm font-medium hover:bg-slate-100"
                        >
                          <Pencil size={14} />
                          Sửa
                        </button>

                        <button
                          type="button"
                          onClick={handleDeleteSource}
                          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-red-300 bg-white text-red-500 text-sm font-medium hover:bg-red-50"
                        >
                          <Trash2 size={14} />
                          Xóa
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* ================= 3. LỊCH ================= */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase text-emerald-600 tracking-widest">
                  📅 Lịch trình dự kiến
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">
                      Ngày dự định chụp
                    </label>
                    <input
                      type="date"
                      value={formData.ngay_du_dinh_chup}
                      onChange={(e) => handleFormChange('ngay_du_dinh_chup', e.target.value)}
                      className="w-full p-3 border rounded-xl font-bold bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">
                      Ngày cưới
                    </label>
                    <input
                      type="date"
                      value={formData.ngay_cuoi}
                      onChange={(e) => handleFormChange('ngay_cuoi', e.target.value)}
                      className="w-full p-3 border rounded-xl font-bold bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">
                      Ngày ăn hỏi
                    </label>
                    <input
                      type="date"
                      value={formData.ngay_an_hoi}
                      onChange={(e) => handleFormChange('ngay_an_hoi', e.target.value)}
                      className="w-full p-3 border rounded-xl font-bold bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* ================= 4. KINH DOANH ================= */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold uppercase text-purple-600 tracking-widest">
                    💰 Quan tâm dịch vụ
                  </h3>

                  <button
                    type="button"
                    onClick={() => {
                      setShowBusinessManager((prev) => !prev);
                      setShowAddressManager(false);
                      setShowSourceManager(false);
                    }}
                    className="p-1 rounded-lg hover:bg-gray-100 text-slate-400 hover:text-slate-700"
                    title="Tùy chỉnh dịch vụ quan tâm"
                  >
                    <Settings size={14} />
                  </button>
                </div>

                {showBusinessManager && (
                  <div className="flex flex-wrap gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                    <select
                      value={serviceManageId}
                      onChange={(e) => setServiceManageId(e.target.value)}
                      className="min-w-[240px] rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
                    >
                      <option value="">Chọn dịch vụ để sửa / xóa</option>
                      {masterData.services.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.ten_dich_vu}
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      onClick={handleAddService}
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm font-medium hover:bg-slate-100"
                    >
                      <Plus size={14} />
                      Thêm
                    </button>

                    <button
                      type="button"
                      onClick={handleEditService}
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm font-medium hover:bg-slate-100"
                    >
                      <Pencil size={14} />
                      Sửa
                    </button>

                    <button
                      type="button"
                      onClick={handleDeleteService}
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-red-300 bg-white text-red-500 text-sm font-medium hover:bg-red-50"
                    >
                      <Trash2 size={14} />
                      Xóa
                    </button>
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  {masterData.services.map((s) => {
                    const isSelected = selectedServices.includes(s.id);
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => {
                          setSelectedServices(prev =>
                            isSelected
                              ? prev.filter(i => i !== s.id)
                              : [...prev, s.id]
                          );
                        }}
                        className={`px-3 py-1 rounded-full text-sm ${
                          isSelected
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100'
                        }`}
                      >
                        {s.ten_dich_vu}
                      </button>
                    );
                  })}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    type="number"
                    placeholder="Tổng giá trị"
                    value={formData.tong_gia_tri_du_kien}
                    onChange={(e)=>handleFormChange('tong_gia_tri_du_kien', e.target.value)}
                    className="p-3 border rounded-xl font-bold"
                  />

                  <select
                    value={formData.tinh_trang_id}
                    onChange={(e)=>handleFormChange('tinh_trang_id', e.target.value)}
                    className="p-3 border rounded-xl font-bold"
                  >
                    <option value="">Tình trạng</option>
                    {masterData.statuses.map(s => (
                      <option key={s.id} value={s.id}>{s.ten_tinh_trang}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* ================= 5. LÝ DO TỪ CHỐI ================= */}
              {isRejectStatus && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-bold uppercase text-rose-500 tracking-widest">
                      🚫 Lý do từ chối
                    </h3>

                    <button
                      type="button"
                      onClick={() => {
                        setShowRejectReasonManager((prev) => !prev);
                        setShowBusinessManager(false);
                        setShowAddressManager(false);
                        setShowSourceManager(false);
                      }}
                      className="p-1 rounded-lg hover:bg-gray-100 text-slate-400 hover:text-slate-700"
                      title="Tùy chỉnh lý do từ chối"
                    >
                      <Settings size={14} />
                    </button>
                  </div>

                  {showRejectReasonManager && (
                    <div className="flex flex-wrap gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                      <select
                        value={rejectReasonManageId}
                        onChange={(e) => setRejectReasonManageId(e.target.value)}
                        className="min-w-[240px] rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
                      >
                        <option value="">Chọn lý do để sửa / xóa</option>
                        {masterData.rejectionReasons.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.ten_ly_do}
                          </option>
                        ))}
                      </select>

                      <button
                        type="button"
                        onClick={handleAddRejectReason}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm font-medium hover:bg-slate-100"
                      >
                        <Plus size={14} />
                        Thêm
                      </button>

                      <button
                        type="button"
                        onClick={handleEditRejectReason}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm font-medium hover:bg-slate-100"
                      >
                        <Pencil size={14} />
                        Sửa
                      </button>

                      <button
                        type="button"
                        onClick={handleDeleteRejectReason}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-red-300 bg-white text-red-500 text-sm font-medium hover:bg-red-50"
                      >
                        <Trash2 size={14} />
                        Xóa
                      </button>
                    </div>
                  )}

                  <div
                    className={`flex flex-wrap gap-2 p-2 rounded-xl ${
                      formErrors.ly_do_tu_choi ? 'border border-red-500' : ''
                    }`}
                  >
                    {masterData.rejectionReasons.map((item) => {
                      const isSelected = formData.ly_do_tu_choi_id === item.id;

                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            handleFormChange(
                              'ly_do_tu_choi_id',
                              isSelected ? '' : item.id
                            );
                          
                            setFormErrors(prev => ({
                              ...prev,
                              ly_do_tu_choi: false,
                            }));
                          }}
                          className={`px-3 py-1 rounded-full text-sm ${
                            isSelected
                              ? 'bg-rose-500 text-white'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {item.ten_ly_do}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ================= 6. GHI CHÚ ================= */}
              <div>
                <h3 className="text-xs font-bold uppercase text-gray-500 mb-2">
                  📝 Ghi chú
                </h3>

                <textarea
                  value={formData.ghi_chu}
                  onChange={(e)=>handleFormChange('ghi_chu', e.target.value)}
                  className="w-full p-4 border rounded-xl"
                />
              </div>

            </div>

            <div className="flex items-center justify-center gap-4 px-6 py-5 border-t border-gray-200 bg-gray-50">
              <button
                type="button"
                onClick={closeCreateModal}
                disabled={saving}
                className="min-w-[140px] h-12 rounded-xl bg-red-500 text-white px-6 text-base font-semibold hover:bg-red-600 disabled:opacity-50"
              >
                Hủy
              </button>

              <button
                type="button"
                onClick={handleCreate}
                disabled={saving}
                className="min-w-[140px] h-12 rounded-xl bg-blue-600 text-white px-6 text-base font-semibold hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Đang lưu...' : editingLogId ? 'Cập nhật' : 'Lưu'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConsultationManager;
