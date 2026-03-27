
import React, { useEffect, useState, useCallback } from 'react';
import { fetchConsultationListData, supabase } from '../apiService';
import type { ConsultationFilter, ConsultationLog } from '../types';

type MasterDataState = {
  addresses: Array<{ id: string; ten_dia_chi: string }>;
  sources: Array<{ id: string; ten_nguon: string }>;
  statuses: Array<{ id: string; ten_tinh_trang: string }>;
  services: Array<{ id: string; ten_dich_vu: string }>;
  staffOptions: Array<{ id: string; name: string; role?: string | null; status?: string | null }>;
};

const DEFAULT_PAGE_SIZE = 20;

const ConsultationManager: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [data, setData] = useState<ConsultationLog[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(DEFAULT_PAGE_SIZE);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

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
  });

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

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
    nhan_vien_tu_van: '',
    tong_gia_tri_du_kien: '',
    ghi_chu: '',
  });

  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [serviceManageId, setServiceManageId] = useState('');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [result, addressesRes, servicesRes, staffRes] = await Promise.all([
        fetchConsultationListData(page, pageSize, filters),
        supabase
          .from('consultation_addresses')
          .select('id, ten_dia_chi')
          .eq('dang_su_dung', true)
          .order('thu_tu_hien_thi', { ascending: true })
          .order('ten_dia_chi', { ascending: true }),
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
  }, [loadData]);

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
      nhan_vien_tu_van: '',
      tong_gia_tri_du_kien: '',
      ghi_chu: '',
    });
    setSelectedServices([]);
    setServiceManageId('');
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
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleCreate = async () => {
    if (!formData.ten_khach_hang.trim()) {
      alert('Vui lòng nhập tên khách hàng');
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
        nhan_vien_tu_van: formData.nhan_vien_tu_van || null,
        tong_gia_tri_du_kien: formData.tong_gia_tri_du_kien ? Number(formData.tong_gia_tri_du_kien) : 0,
        ghi_chu: formData.ghi_chu.trim() || null,
      };

      const { data: createdLog, error } = await supabase
        .from('consultation_logs')
        .insert([payload])
        .select()
        .single();

      if (error) throw error;

      if (selectedServices.length > 0) {
        const serviceRows = selectedServices.map((serviceId) => ({
          consultation_log_id: createdLog.id,
          service_id: serviceId,
        }));

        const { error: serviceError } = await supabase
          .from('consultation_log_services')
          .insert(serviceRows);

        if (serviceError) throw serviceError;
      }

      setIsCreateModalOpen(false);
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
                    <th className="px-4 py-3 font-semibold">Nhân viên tư vấn</th>
                    <th className="px-4 py-3 font-semibold text-right">Giá trị dự kiến</th>
                  </tr>
                </thead>

                <tbody>
                  {data.map((item) => (
                    <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap">{item.ngay_tu_van || ''}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-800">{item.ten_khach_hang || ''}</div>
                        {item.dia_chi ? (
                          <div className="text-xs text-gray-500 mt-1">{item.dia_chi}</div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">{item.so_dien_thoai || ''}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{item.nguon_khach_hang_ten || ''}</td>
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
                      <td className="px-4 py-3 whitespace-nowrap">{item.tinh_trang_ten || ''}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{item.nhan_vien_tu_van_ten || ''}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-right font-medium">
                        {(item.tong_gia_tri_du_kien || 0).toLocaleString('vi-VN')}
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
              <h2 className="text-xl font-bold text-gray-800">Thêm mới nhật ký tư vấn</h2>
              <button
                type="button"
                onClick={closeCreateModal}
                className="text-gray-500 hover:text-gray-700"
              >
                Đóng
              </button>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[75vh] overflow-y-auto">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ngày tư vấn
                </label>
                <input
                  type="date"
                  value={formData.ngay_tu_van}
                  onChange={(e) => handleFormChange('ngay_tu_van', e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tên khách hàng <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.ten_khach_hang}
                  onChange={(e) => handleFormChange('ten_khach_hang', e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  placeholder="Nhập tên khách hàng"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Địa chỉ
                </label>
                <div className="flex gap-2">
                  <select
                    value={formData.dia_chi}
                    onChange={(e) => handleFormChange('dia_chi', e.target.value)}
                    className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white"
                  >
                    <option value="">Chọn địa chỉ</option>
                    {masterData.addresses.map((item) => (
                      <option key={item.id} value={item.ten_dia_chi}>
                        {item.ten_dia_chi}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={handleAddAddress}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50"
                    title="Thêm địa chỉ"
                  >
                    +
                  </button>
                  <button
                    type="button"
                    onClick={handleEditAddress}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50"
                  >
                    Sửa
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteAddress}
                    className="rounded-lg border border-red-300 text-red-500 px-3 py-2 text-sm hover:bg-red-50"
                  >
                    Xóa
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Số điện thoại
                </label>
                <input
                  type="text"
                  value={formData.so_dien_thoai}
                  onChange={(e) => handleFormChange('so_dien_thoai', e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ngày dự định chụp
                </label>
                <input
                  type="date"
                  value={formData.ngay_du_dinh_chup}
                  onChange={(e) => handleFormChange('ngay_du_dinh_chup', e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ngày ăn hỏi
                </label>
                <input
                  type="date"
                  value={formData.ngay_an_hoi}
                  onChange={(e) => handleFormChange('ngay_an_hoi', e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ngày cưới
                </label>
                <input
                  type="date"
                  value={formData.ngay_cuoi}
                  onChange={(e) => handleFormChange('ngay_cuoi', e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nguồn khách
                </label>
                <div className="flex gap-2">
                  <select
                    value={formData.nguon_khach_hang_id}
                    onChange={(e) => handleFormChange('nguon_khach_hang_id', e.target.value)}
                    className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white"
                  >
                    <option value="">Chọn nguồn khách</option>
                    {masterData.sources.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.ten_nguon}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={handleAddSource}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50"
                    title="Thêm nguồn khách"
                  >
                    +
                  </button>
                  <button
                    type="button"
                    onClick={handleEditSource}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50"
                  >
                    Sửa
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteSource}
                    className="rounded-lg border border-red-300 text-red-500 px-3 py-2 text-sm hover:bg-red-50"
                  >
                    Xóa
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tình trạng
                </label>
                <div className="flex gap-2">
                  <select
                    value={formData.tinh_trang_id}
                    onChange={(e) => handleFormChange('tinh_trang_id', e.target.value)}
                    className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white"
                  >
                    <option value="">Chọn tình trạng</option>
                    {masterData.statuses.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.ten_tinh_trang}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={handleAddStatus}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50"
                    title="Thêm tình trạng"
                  >
                    +
                  </button>
                  <button
                    type="button"
                    onClick={handleEditStatus}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50"
                  >
                    Sửa
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteStatus}
                    className="rounded-lg border border-red-300 text-red-500 px-3 py-2 text-sm hover:bg-red-50"
                  >
                    Xóa
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nhân viên tư vấn
                </label>
                <select
                  value={formData.nhan_vien_tu_van}
                  onChange={(e) => handleFormChange('nhan_vien_tu_van', e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white"
                >
                  <option value="">Chọn nhân viên tư vấn</option>
                  {masterData.staffOptions.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tổng giá trị dự kiến
                </label>
                <input
                  type="number"
                  value={formData.tong_gia_tri_du_kien}
                  onChange={(e) => handleFormChange('tong_gia_tri_du_kien', e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  placeholder="0"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Dịch vụ quan tâm
                </label>

                <div className="flex flex-col gap-3">
                  <div className="flex flex-wrap gap-2">
                    <select
                      value={serviceManageId}
                      onChange={(e) => setServiceManageId(e.target.value)}
                      className="min-w-[240px] rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white"
                    >
                      <option value="">Chọn hạng mục để sửa / xóa</option>
                      {masterData.services.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.ten_dich_vu}
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      onClick={handleAddService}
                      className="rounded-lg border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50"
                      title="Thêm dịch vụ"
                    >
                      +
                    </button>
                    <button
                      type="button"
                      onClick={handleEditService}
                      className="rounded-lg border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50"
                    >
                      Sửa
                    </button>
                    <button
                      type="button"
                      onClick={handleDeleteService}
                      className="rounded-lg border border-red-300 text-red-500 px-3 py-2 text-sm hover:bg-red-50"
                    >
                      Xóa
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {masterData.services.map((service) => {
                      const isSelected = selectedServices.includes(service.id);

                      return (
                        <button
                          key={service.id}
                          type="button"
                          onClick={() => {
                            setSelectedServices((prev) =>
                              isSelected
                                ? prev.filter((id) => id !== service.id)
                                : [...prev, service.id]
                            );
                          }}
                          className={`px-3 py-1.5 rounded-full text-sm border ${
                            isSelected
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-gray-100 text-gray-700 border-gray-300'
                          }`}
                        >
                          {service.ten_dich_vu}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ghi chú
                </label>
                <textarea
                  value={formData.ghi_chu}
                  onChange={(e) => handleFormChange('ghi_chu', e.target.value)}
                  rows={4}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
              <button
                type="button"
                onClick={closeCreateModal}
                disabled={saving}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-white disabled:opacity-50"
              >
                Hủy
              </button>

              <button
                type="button"
                onClick={handleCreate}
                disabled={saving}
                className="rounded-lg bg-blue-600 text-white px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Đang lưu...' : 'Lưu'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConsultationManager;
