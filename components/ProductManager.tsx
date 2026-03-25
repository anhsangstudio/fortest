
import React, { useState, useMemo, useEffect } from 'react';
import { 
  Package, Plus, X, Trash2, Info, DollarSign, 
  ShieldCheck, AlignLeft, Loader2, CheckCircle2, Percent, AlertTriangle,
  Search, Filter, Edit3, ListTodo, Calendar, GripVertical, ChevronLeft, ChevronRight
} from 'lucide-react';
import { Service, ServiceTaskTemplate, Staff } from '../types'; // Import Staff
import { syncData, checkServiceCodeExists, getNextServiceCode, fetchServicesPaginated } from '../apiService';

interface Props {
  services: Service[];
  setServices: React.Dispatch<React.SetStateAction<Service[]>>;
  departments: string[];
  setDepartments: React.Dispatch<React.SetStateAction<string[]>>;
  serviceTypesList: string[]; // This is now actually Service Groups passed from App.tsx
  currentUser?: Staff | null; // Pass currentUser for permission check
  scheduleTypes?: string[]; // Need schedule types for linking
}

const COST_FIELDS = [
  { key: 'chi_phi_cong_chup', label: 'Công Chụp' },
  { key: 'chi_phi_makeup', label: 'Makeup' },
  { key: 'chi_phi_nv_ho_tro', label: 'NV Hỗ Trợ' },
  { key: 'chi_phi_thu_vay', label: 'Thử Váy' },
  { key: 'chi_phi_photoshop', label: 'Photoshop' },
  { key: 'chi_phi_in_an', label: 'In Ấn' },
  { key: 'chi_phi_ship', label: 'Ship Hàng' },
  { key: 'chi_phi_an_trua', label: 'Ăn Trưa' },
  { key: 'chi_phi_lam_toc', label: 'Làm Tóc' },
  { key: 'chi_phi_bao_bi', label: 'Bao Bì' },
  { key: 'chi_phi_giat_phoi', label: 'Giặt Phơi' },
  { key: 'chi_phi_khau_hao', label: 'Khấu Hao' },
];

const ProductManager: React.FC<Props> = ({ services, setServices, departments, setDepartments, serviceTypesList, currentUser, scheduleTypes = [] }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<(Partial<Service> & { ma_dv_original?: string }) | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  // Search and Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('ALL');

  // Pagination State
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [totalCount, setTotalCount] = useState(0);
  const [paginatedServices, setPaginatedServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Logic to show/hide Cost Section
  const canManageCosts = useMemo(() => {
    return currentUser?.username === 'admin' || currentUser?.role === 'Giám đốc';
  }, [currentUser]);

  const initialServiceState: Partial<Service> = {
    ma_dv: '',
    ten_dv: '',
    nhom_dv: serviceTypesList[0] || 'DỊCH VỤ KHÁC',
    chi_tiet_dv: '',
    don_gia: 0,
    don_vi_tinh: 'Gói',
    nhan: '-',
    hoa_hong_pct: 0,
    chi_phi_cong_chup: 0,
    chi_phi_makeup: 0,
    chi_phi_nv_ho_tro: 0,
    chi_phi_thu_vay: 0,
    chi_phi_photoshop: 0,
    chi_phi_in_an: 0,
    chi_phi_ship: 0,
    chi_phi_an_trua: 0,
    chi_phi_lam_toc: 0,
    chi_phi_bao_bi: 0,
    chi_phi_giat_phoi: 0,
    chi_phi_khau_hao: 0,
    taskTemplates: []
  };

  useEffect(() => {
    loadServices();
  }, [page, searchTerm, filterType]);

  const loadServices = async () => {
    setIsLoading(true);
    try {
        const { data, count } = await fetchServicesPaginated(page, pageSize, searchTerm, filterType);
        setPaginatedServices(data);
        setTotalCount(count);
    } catch(e) {
        console.error(e);
    } finally {
        setIsLoading(false);
    }
  }

  const profitAnalysis = useMemo(() => {
    if (!editingService) return { hoa_hong_tien: 0, tong_chi_phi: 0, loi_nhuan_gop: 0 };
    const don_gia = Number(editingService.don_gia) || 0;
    const hoa_hong_pct = Number(editingService.hoa_hong_pct) || 0;
    const hoa_hong_tien = Math.round(don_gia * (hoa_hong_pct / 100));
    const chiphi_codinh = 
      (Number(editingService.chi_phi_cong_chup) || 0) +
      (Number(editingService.chi_phi_makeup) || 0) +
      (Number(editingService.chi_phi_nv_ho_tro) || 0) +
      (Number(editingService.chi_phi_thu_vay) || 0) +
      (Number(editingService.chi_phi_photoshop) || 0) +
      (Number(editingService.chi_phi_in_an) || 0) +
      (Number(editingService.chi_phi_ship) || 0) +
      (Number(editingService.chi_phi_an_trua) || 0) +
      (Number(editingService.chi_phi_lam_toc) || 0) +
      (Number(editingService.chi_phi_bao_bi) || 0) +
      (Number(editingService.chi_phi_giat_phoi) || 0) +
      (Number(editingService.chi_phi_khau_hao) || 0);
    const tong_chi_phi = hoa_hong_tien + chiphi_codinh;
    const loi_nhuan_gop = don_gia - tong_chi_phi;
    return { hoa_hong_tien, tong_chi_phi, loi_nhuan_gop };
  }, [editingService]);

  const normalizeCode = (val: string) => {
    return val.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');
  };

  const handleCodeChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    const cleanCode = normalizeCode(rawVal);
    
    setEditingService(prev => prev ? { ...prev, ma_dv: cleanCode } : null);
    
    if (cleanCode.length > 2) {
      setIsValidating(true);
      const exists = await checkServiceCodeExists(cleanCode);
      if (exists) {
        setCodeError("Mã dịch vụ này đã tồn tại trên hệ thống");
      } else {
        setCodeError(null);
      }
      setIsValidating(false);
    } else {
      setCodeError(null);
    }
  };

  const handleOpenAdd = () => {
    setEditingService(initialServiceState);
    setCodeError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (service: Service) => {
    setEditingService({ ...service, ma_dv_original: service.ma_dv, taskTemplates: service.taskTemplates || [] });
    setCodeError(null);
    setIsModalOpen(true);
  };

  const addTaskTemplate = () => {
    if (!editingService) return;
    const newTpl: ServiceTaskTemplate = {
        id: `temp-${Date.now()}`,
        serviceId: editingService.ma_dv || '',
        name: '',
        scheduleTypeLink: '',
        workSalary: 0,
        workSalarySource: ''
    };
    setEditingService({
        ...editingService,
        taskTemplates: [...(editingService.taskTemplates || []), newTpl]
    });
  };

  const updateTaskTemplate = (idx: number, field: keyof ServiceTaskTemplate, value: string | number) => {
    if (!editingService || !editingService.taskTemplates) return;
    const updated = [...editingService.taskTemplates];
    updated[idx] = { ...updated[idx], [field]: value };
    setEditingService({ ...editingService, taskTemplates: updated });
  };

  const removeTaskTemplate = (idx: number) => {
    if (!editingService || !editingService.taskTemplates) return;
    const updated = editingService.taskTemplates.filter((_, i) => i !== idx);
    setEditingService({ ...editingService, taskTemplates: updated });
  };

  const handleSave = async () => {
    if (!editingService?.ten_dv || !editingService?.don_gia) {
      alert("Vui lòng điền đầy đủ Tên dịch vụ và Đơn giá");
      return;
    }

    if (codeError) {
      alert("Mã dịch vụ bị trùng, vui lòng kiểm tra lại");
      return;
    }

    setIsSaving(true);
    try {
      let finalData = { ...editingService };
      
      if (!finalData.ma_dv) {
        const autoCode = await getNextServiceCode();
        finalData.ma_dv = autoCode;
      }

      if (!editingService.ma_dv_original) {
         const stillExists = await checkServiceCodeExists(finalData.ma_dv as string);
         if (stillExists && !editingService.ma_dv) {
            finalData.ma_dv = await getNextServiceCode();
         } else if (stillExists) {
            setCodeError("Mã dịch vụ đã tồn tại");
            setIsSaving(false);
            return;
         }
      }

      const action = editingService.ma_dv_original || services.some(s => s.ma_dv === finalData.ma_dv) ? 'UPDATE' : 'CREATE';
      
      const payload = {
        ma_dv: finalData.ma_dv,
        ten_dv: finalData.ten_dv,
        nhom_dv: finalData.nhom_dv,
        don_vi_tinh: finalData.don_vi_tinh,
        nhan: finalData.nhan,
        chi_tiet_dv: finalData.chi_tiet_dv,
        don_gia: finalData.don_gia,
        // Only include cost fields if allowed, otherwise preserve existing or default to 0
        hoa_hong_pct: canManageCosts ? finalData.hoa_hong_pct : undefined,
        chi_phi_cong_chup: canManageCosts ? finalData.chi_phi_cong_chup : undefined,
        chi_phi_makeup: canManageCosts ? finalData.chi_phi_makeup : undefined,
        chi_phi_nv_ho_tro: canManageCosts ? finalData.chi_phi_nv_ho_tro : undefined,
        chi_phi_thu_vay: canManageCosts ? finalData.chi_phi_thu_vay : undefined,
        chi_phi_photoshop: canManageCosts ? finalData.chi_phi_photoshop : undefined,
        chi_phi_in_an: canManageCosts ? finalData.chi_phi_in_an : undefined,
        chi_phi_ship: canManageCosts ? finalData.chi_phi_ship : undefined,
        chi_phi_an_trua: canManageCosts ? finalData.chi_phi_an_trua : undefined,
        chi_phi_lam_toc: canManageCosts ? finalData.chi_phi_lam_toc : undefined,
        chi_phi_bao_bi: canManageCosts ? finalData.chi_phi_bao_bi : undefined,
        chi_phi_giat_phoi: canManageCosts ? finalData.chi_phi_giat_phoi : undefined,
        chi_phi_khau_hao: canManageCosts ? finalData.chi_phi_khau_hao : undefined,
        // Task templates are handled in syncData logic if passed
        taskTemplates: finalData.taskTemplates
      };

      const result = await syncData('services', action, payload);
      
      if (result.success && result.data) {
        // Also update local list to reflect changes immediately in pagination
        await loadServices();
        
        setIsModalOpen(false);
        setEditingService(null);
      }
    } catch (e: any) {
      alert(`Lỗi đồng bộ: ${e.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (ma_dv: string) => {
    if (window.confirm("Bạn có chắc muốn xóa dịch vụ này không? Hành động này không thể hoàn tác.")) {
      try {
        const result = await syncData('services', 'DELETE', { ma_dv });
        if (result.success) {
          // Refresh list
          await loadServices();
        }
      } catch (e: any) {
        console.error("Delete service error:", e);
        if (e.message && e.message.includes("violates foreign key constraint")) {
           alert("KHÔNG THỂ XÓA: Dịch vụ này đang được sử dụng trong một hoặc nhiều Hợp đồng.");
        } else {
           alert(`Lỗi khi xóa: ${e.message}`);
        }
      }
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Danh mục Dịch vụ</h2>
          <p className="text-slate-500 font-medium">Quản lý Các Dịch Vụ của Studio</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full xl:w-auto">
          {/* Search Bar */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input 
              type="text" 
              placeholder="Tìm dịch vụ..." 
              className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-sm"
              value={searchTerm}
              onChange={e => { setSearchTerm(e.target.value); setPage(1); }}
            />
          </div>

          {/* Type Filter */}
          <div className="relative w-full sm:w-auto">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              <Filter size={16} />
            </div>
            <select 
              className="w-full sm:w-56 pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-sm cursor-pointer appearance-none"
              value={filterType}
              onChange={e => { setFilterType(e.target.value); setPage(1); }}
            >
              <option value="ALL">Tất cả nhóm dịch vụ</option>
              {serviceTypesList.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          <button 
            onClick={handleOpenAdd}
            className="w-full sm:w-auto bg-blue-600 text-white px-6 py-3 rounded-2xl flex items-center justify-center gap-2 font-bold hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20 active:scale-95 shrink-0"
          >
            <Plus size={20} /> <span className="hidden sm:inline">Thêm mới</span>
          </button>
        </div>
      </div>

      {/* Table View */}
      {isLoading ? (
         <div className="p-10 flex justify-center items-center text-slate-400">
            <Loader2 className="animate-spin mr-2" /> Đang tải dịch vụ...
         </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-[2.5rem] overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Mã dịch vụ</th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tên dịch vụ</th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Nhóm dịch vụ</th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Giá niêm yết</th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center w-24">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedServices.map(s => {
                  return (
                    <tr key={s.ma_dv} onClick={() => handleOpenEdit(s)} className="hover:bg-blue-50/30 transition-colors cursor-pointer group">
                      <td className="px-6 py-4">
                        <span className="font-bold text-blue-600 text-sm">{s.ma_dv}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-900 text-sm line-clamp-1">{s.ten_dv}</div>
                        {s.nhan !== '-' && (
                          <div className="mt-1">
                             <span className="text-[9px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded font-bold uppercase tracking-wider">{s.nhan}</span>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide inline-block">
                          {s.nhom_dv}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="font-black text-slate-900">{s.don_gia.toLocaleString()}đ</div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleOpenEdit(s); }}
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                            title="Chỉnh sửa"
                          >
                            <Edit3 size={16}/>
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleDelete(s.ma_dv); }} 
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                            title="Xóa dịch vụ"
                          >
                            <Trash2 size={16}/>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {paginatedServices.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400 italic">
                      Không tìm thấy dịch vụ nào phù hợp
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination Controls */}
      <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
         <button 
            disabled={page === 1 || isLoading}
            onClick={() => setPage(p => Math.max(1, p - 1))}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 text-slate-600 font-bold text-xs uppercase hover:bg-slate-200 disabled:opacity-50 transition-all"
         >
            <ChevronLeft size={16} /> Trang trước
         </button>
         <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">
            Trang {page} / {Math.ceil(totalCount / pageSize) || 1} (Tổng {totalCount})
         </span>
         <button 
            disabled={page * pageSize >= totalCount || isLoading}
            onClick={() => setPage(p => p + 1)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 text-slate-600 font-bold text-xs uppercase hover:bg-slate-200 disabled:opacity-50 transition-all"
         >
            Trang sau <ChevronRight size={16} />
         </button>
      </div>

      {isModalOpen && editingService && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] w-full max-w-5xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-white/20 flex flex-col max-h-[95vh]">
            
            <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-white sticky top-0 z-10">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-blue-600 text-white rounded-[1.25rem] flex items-center justify-center shadow-xl shadow-blue-500/20">
                  <Package size={28} />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-900">{editingService.ma_dv_original ? 'Cập nhật Dịch vụ' : 'Thiết lập Dịch vụ mới'}</h3>
                  <p className="text-sm text-slate-400 font-bold uppercase tracking-widest">Mã dịch vụ là khóa chính duy nhất</p>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="w-12 h-12 flex items-center justify-center hover:bg-slate-100 rounded-full text-slate-300 transition-all">
                <X size={28} />
              </button>
            </div>

            <div className="p-8 overflow-y-auto space-y-10 scrollbar-hide">
              <div className="space-y-6">
                <div className="flex items-center gap-2 text-blue-600">
                  <Info size={18} />
                  <span className="text-[10px] font-black uppercase tracking-widest">1. Thông tin cơ bản</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase ml-1 tracking-widest">Mã dịch vụ (ma_dv) *</label>
                    <div className="relative">
                      <input 
                        type="text" 
                        placeholder="VD: DV-000001"
                        disabled={!!editingService.ma_dv_original || services.some(s => s.ma_dv === editingService.ma_dv && editingService.ma_dv !== '')}
                        className={`w-full p-4 border rounded-2xl outline-none font-black transition-all ${codeError ? 'bg-red-50 border-red-300 text-red-600' : 'bg-slate-50 border-slate-200 text-blue-600 focus:ring-2 focus:ring-blue-500'}`}
                        value={editingService.ma_dv} 
                        onChange={handleCodeChange}
                      />
                      {isValidating && <Loader2 size={16} className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin text-slate-400" />}
                    </div>
                    {codeError ? (
                       <p className="text-[10px] text-red-500 font-bold uppercase ml-1">{codeError}</p>
                    ) : (
                       <p className="text-[9px] text-slate-400 italic ml-1">Bỏ trống để hệ thống tự sinh mã. Không thể sửa sau khi lưu.</p>
                    )}
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase ml-1 tracking-widest">Tên dịch vụ hiển thị *</label>
                    <input type="text" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-black text-lg" value={editingService.ten_dv} onChange={e => setEditingService({...editingService, ten_dv: e.target.value})} />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                   <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase ml-1 tracking-widest">Nhóm dịch vụ</label>
                    <select className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold appearance-none cursor-pointer" value={editingService.nhom_dv} onChange={e => setEditingService({...editingService, nhom_dv: e.target.value})}>
                      {serviceTypesList.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                   <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase ml-1 tracking-widest">Đơn vị tính</label>
                    <input type="text" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold" value={editingService.don_vi_tinh} onChange={e => setEditingService({...editingService, don_vi_tinh: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase ml-1 tracking-widest">Nhãn (Label)</label>
                    <input type="text" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold" value={editingService.nhan} onChange={e => setEditingService({...editingService, nhan: e.target.value})} />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase ml-1 tracking-widest flex items-center gap-1.5">
                    <AlignLeft size={12} /> Chi tiết dịch vụ
                  </label>
                  <textarea 
                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all min-h-[100px] text-sm"
                    value={editingService.chi_tiet_dv}
                    onChange={e => setEditingService({...editingService, chi_tiet_dv: e.target.value})}
                  />
                </div>
              </div>

              {/* Section 2: Cấu trúc chi phí - CONDITIONAL RENDERING */}
              {canManageCosts && (
                <div className="space-y-6">
                  <div className="flex items-center gap-2 text-purple-600 border-b border-slate-100 pb-4">
                    <ShieldCheck size={18} />
                    <span className="text-[10px] font-black uppercase tracking-widest">2. Cấu trúc chi phí chi tiết (VNĐ) - Dành cho Quản lý</span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    <div className="space-y-1 bg-blue-50 p-4 rounded-2xl border border-blue-100">
                      <label className="text-[9px] font-black text-blue-600 uppercase tracking-widest block truncate">Hoa hồng (%)</label>
                      <div className="relative">
                        <input 
                          type="number" 
                          min="0"
                          max="100"
                          className="w-full bg-transparent border-b border-blue-200 outline-none font-black text-blue-700 text-sm py-1 pr-4"
                          value={editingService.hoa_hong_pct || 0}
                          onChange={e => setEditingService({...editingService, hoa_hong_pct: Number(e.target.value)})}
                        />
                        <Percent size={12} className="absolute right-0 top-1/2 -translate-y-1/2 text-blue-400" />
                      </div>
                    </div>

                    {COST_FIELDS.map((field) => (
                      <div key={field.key} className="space-y-1 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block truncate" title={field.label}>{field.label}</label>
                        <input 
                          type="number" 
                          className="w-full bg-transparent border-b border-slate-200 outline-none font-black text-slate-700 text-sm py-1"
                          value={(editingService[field.key as keyof Service] as number) || 0}
                          onChange={e => setEditingService({...editingService, [field.key]: Number(e.target.value)})}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Section 3: Việc Cần Làm (Task Templates) */}
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                   <div className="flex items-center gap-2 text-emerald-600">
                      <ListTodo size={18} />
                      <span className="text-[10px] font-black uppercase tracking-widest">3. Việc Cần Làm (Quy trình mẫu)</span>
                   </div>
                   <button 
                      onClick={addTaskTemplate}
                      className="flex items-center gap-2 text-[10px] font-bold uppercase bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-lg hover:bg-emerald-100 transition-colors"
                   >
                      <Plus size={14} /> Thêm việc
                   </button>
                </div>
                
                <div className="space-y-3">
                   {editingService.taskTemplates && editingService.taskTemplates.length > 0 ? (
                      editingService.taskTemplates.map((task, idx) => (
                         <div key={idx} className="flex gap-4 items-center bg-slate-50 p-3 rounded-xl border border-slate-100 group">
                            <div className="text-slate-300"><GripVertical size={16} /></div>
                            <div className="flex-1">
                               <input 
                                  type="text" 
                                  placeholder="Tên công việc (VD: Makeup ngày chụp)" 
                                  className="w-full bg-transparent outline-none text-sm font-bold text-slate-700 placeholder:text-slate-400"
                                  value={task.name}
                                  onChange={e => updateTaskTemplate(idx, 'name', e.target.value)}
                               />
                            </div>
                            
                            {/* NEW: Work Salary Source Dropdown */}
                            <div className="w-48 bg-white px-3 py-2 rounded-lg border border-slate-200 flex items-center">
                               <span className="text-[9px] text-slate-400 font-bold mr-2 uppercase tracking-tight whitespace-nowrap">Lương công việc:</span>
                               <select
                                   className="w-full bg-transparent outline-none text-[11px] font-bold text-emerald-600 uppercase cursor-pointer text-right"
                                   value={task.workSalarySource || ''}
                                   onChange={e => updateTaskTemplate(idx, 'workSalarySource', e.target.value)}
                               >
                                   <option value="">-- Không chọn --</option>
                                   {COST_FIELDS.map(opt => (
                                       <option key={opt.key} value={opt.key}>{opt.label}</option>
                                   ))}
                               </select>
                            </div>

                            <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-slate-200">
                               <Calendar size={14} className="text-slate-400" />
                               <select 
                                  className="bg-transparent outline-none text-[11px] font-bold text-slate-600 uppercase cursor-pointer w-32"
                                  value={task.scheduleTypeLink || ''}
                                  onChange={e => updateTaskTemplate(idx, 'scheduleTypeLink', e.target.value)}
                               >
                                  <option value="">-- Link Lịch --</option>
                                  {scheduleTypes.map(st => (
                                     <option key={st} value={st}>{st}</option>
                                  ))}
                               </select>
                            </div>
                            <button onClick={() => removeTaskTemplate(idx)} className="text-slate-300 hover:text-red-500 p-2"><Trash2 size={16}/></button>
                         </div>
                      ))
                   ) : (
                      <div className="text-center py-8 text-slate-300 text-xs italic bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                         Chưa có quy trình mẫu nào
                      </div>
                   )}
                </div>
              </div>

              {/* Section 4: Đơn giá */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6">
                <div className="space-y-6">
                   <div className="flex items-center gap-2 text-blue-600">
                    <DollarSign size={18} />
                    <span className="text-[10px] font-black uppercase tracking-widest">4. Đơn giá niêm yết *</span>
                  </div>
                  <div className="flex items-center bg-slate-900 border border-slate-900 rounded-[2rem] overflow-hidden shadow-2xl shadow-slate-900/20">
                    <div className="p-6 bg-white/10 text-white"><DollarSign size={24} /></div>
                    <input 
                      type="number" 
                      className="flex-1 p-6 bg-transparent text-white outline-none font-black text-3xl"
                      value={editingService.don_gia}
                      onChange={e => setEditingService({...editingService, don_gia: Number(e.target.value)})}
                    />
                  </div>
                </div>

                {canManageCosts && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between px-2">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Phân tích biên lợi nhuận (Real-time)</span>
                    </div>
                    <div className={`p-8 rounded-[2.5rem] border space-y-4 shadow-sm transition-colors ${profitAnalysis.loi_nhuan_gop < 0 ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-100'}`}>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-bold text-slate-500">Tiền hoa hồng ({editingService.hoa_hong_pct || 0}%):</span>
                        <span className="text-sm font-bold text-slate-900">{profitAnalysis.hoa_hong_tien.toLocaleString()}đ</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-bold text-slate-500">Tổng chi phí dự tính:</span>
                        <span className="text-lg font-black text-slate-900">{profitAnalysis.tong_chi_phi.toLocaleString()}đ</span>
                      </div>
                      <div className="flex justify-between items-center border-t border-slate-200 pt-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-slate-500">Lợi nhuận gộp:</span>
                          {profitAnalysis.loi_nhuan_gop < 0 && (
                            <span className="text-[10px] text-red-600 font-black flex items-center gap-1 mt-1 animate-pulse">
                              <AlertTriangle size={10} /> CẢNH BÁO LỖ
                            </span>
                          )}
                        </div>
                        <span className={`text-2xl font-black ${profitAnalysis.loi_nhuan_gop < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                          {profitAnalysis.loi_nhuan_gop > 0 ? '+' : ''}{profitAnalysis.loi_nhuan_gop.toLocaleString()}đ
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="p-8 border-t border-slate-50 flex items-center justify-end gap-6 bg-white sticky bottom-0 z-10">
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 font-black text-xs uppercase tracking-widest hover:text-slate-900">Hủy bỏ</button>
              <button 
                onClick={handleSave}
                disabled={isSaving || !!codeError || isValidating}
                className="px-14 py-4 bg-blue-600 text-white font-black uppercase text-xs tracking-widest rounded-[1.25rem] shadow-xl shadow-blue-500/20 active:scale-95 flex items-center justify-center gap-2 disabled:bg-slate-400"
              >
                {isSaving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                {editingService.ma_dv_original ? 'Cập nhật Dịch vụ' : 'Lưu Dịch vụ mới'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductManager;
