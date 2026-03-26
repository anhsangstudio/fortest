import React, { useEffect, useState, useCallback } from 'react';
import { fetchConsultationListData } from '../apiService';
import { supabase } from '../apiClient';
import type { ConsultationFilter, ConsultationLog } from '../types';

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
  
  const [masterData, setMasterData] = useState<{
    sources: Array<{ id: string; ten_nguon: string }>;
    statuses: Array<{ id: string; ten_tinh_trang: string }>;
    rejectionReasons: Array<{ id: string; ten_ly_do: string }>;
    services: Array<{ id: string; ten_dich_vu: string }>;
    staffOptions: Array<{ id: string; name: string }>;
  }>({
    sources: [],
    statuses: [],
    rejectionReasons: [],
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

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await fetchConsultationListData(page, pageSize, filters);

      setData(result.data || []);
      setTotal(result.total || 0);
      setTotalPages(result.totalPages || 1);
      setMasterData(result.masterData);
    } catch (err: any) {
      console.error('Lỗi khi tải dữ liệu nhật ký tư vấn:', err);
      setError(err?.message || 'Không thể tải dữ liệu nhật ký tư vấn');
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

  const handleFilterChange = (
    field: keyof ConsultationFilter,
    value: string
  ) => {
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
  };
  
  const openCreateModal = () => {
    resetForm();
    setIsCreateModalOpen(true);
  };
  
  const closeCreateModal = () => {
    if (saving) return;
    setIsCreateModalOpen(false);
  };
  
  const handleFormChange = (
    field: keyof typeof formData,
    value: string
  ) => {
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
        dia_chi: formData.dia_chi.trim() || null,
        so_dien_thoai: formData.so_dien_thoai.trim() || null,
        ngay_du_dinh_chup: formData.ngay_du_dinh_chup || null,
        ngay_an_hoi: formData.ngay_an_hoi || null,
        ngay_cuoi: formData.ngay_cuoi || null,
        nguon_khach_hang_id: formData.nguon_khach_hang_id || null,
        tinh_trang_id: formData.tinh_trang_id || null,
        nhan_vien_tu_van: formData.nhan_vien_tu_van || null,
        tong_gia_tri_du_kien: formData.tong_gia_tri_du_kien
          ? Number(formData.tong_gia_tri_du_kien)
          : 0,
        ghi_chu: formData.ghi_chu.trim() || null,
      };
  
      const { error } = await supabase
        .from('consultation_logs')
        .insert([payload]);
  
      if (error) throw error;
  
      setIsCreateModalOpen(false);
      await loadData();
    } catch (err: any) {
      console.error('Lỗi khi thêm mới nhật ký tư vấn:', err);
      alert(err?.message || 'Không thể thêm mới nhật ký tư vấn');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 space-y-4">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Nhật Ký Tư Vấn</h1>
            <p className="text-sm text-gray-500 mt-1">
              Đang tải dữ liệu thật từ Supabase. Bước tiếp theo sẽ thêm filter,
              form thêm mới và báo cáo.
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
              onChange={(e) =>
                handleFilterChange('nguon_khach_hang_id', e.target.value)
              }
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
              onChange={(e) =>
                handleFilterChange('nhan_vien_tu_van', e.target.value)
              }
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
                    <tr
                      key={item.id}
                      className="border-b border-gray-100 hover:bg-gray-50"
                    >
                      <td className="px-4 py-3 whitespace-nowrap">
                        {item.ngay_tu_van || ''}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-800">
                          {item.ten_khach_hang || ''}
                        </div>
                        {item.dia_chi ? (
                          <div className="text-xs text-gray-500 mt-1">
                            {item.dia_chi}
                          </div>
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
                        {item.tinh_trang_ten || ''}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {item.nhan_vien_tu_van_ten || ''}
                      </td>
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
    </div>
  );
};

export default ConsultationManager;
