
import React, { useState } from 'react';
import { 
  User, DollarSign, Award, Plus, Edit3, Key, Phone, CheckCircle2, 
  X, Trash2, Shield, Eye, FilePlus, Settings2, Trash, 
  ChevronDown, ChevronRight, CheckSquare, Square, UserCheck, Calendar, Info, Clock, Tag, Mail,
  Loader2
} from 'lucide-react';
import { Staff, Schedule, ModulePermission, STAFF_ROLES } from '../types';
import { syncData } from '../apiService';

interface Props {
  staff: Staff[];
  setStaff: React.Dispatch<React.SetStateAction<Staff[]>>;
  schedules: Schedule[];
}

interface ModuleDef {
  id: string;
  label: string;
  subs: { id: string, label: string }[];
}

const StaffManager: React.FC<Props> = ({ staff, setStaff, schedules }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [expandedModules, setExpandedModules] = useState<string[]>(['finance', 'contracts']);
  
  const moduleDefinitions: ModuleDef[] = [
    { 
      id: 'dashboard', label: 'Tổng quan', 
      subs: [{ id: 'main', label: 'Báo cáo chính' }, { id: 'ai', label: 'Cố vấn AI' }] 
    },
    { 
      id: 'contracts', label: 'Hợp đồng', 
      subs: [{ id: 'list', label: 'Danh sách HĐ' }, { id: 'create', label: 'Tạo mới HĐ' }, { id: 'print', label: 'In ấn HĐ' }] 
    },
    { 
      id: 'schedules', label: 'Lịch làm việc', 
      subs: [{ id: 'main', label: 'Lịch tổng' }, { id: 'assignment', label: 'Phân công thợ' }] 
    },
    { 
      id: 'finance', label: 'Thu & Chi', 
      subs: [{ id: 'income', label: 'Thu Tiền' }, { id: 'expense', label: 'Chi Tiền' }, { id: 'report', label: 'Báo cáo chi' }] 
    },
    { 
      id: 'staff', label: 'Nhân viên', 
      subs: [{ id: 'list', label: 'Danh sách' }, { id: 'salary', label: 'Tính lương' }, { id: 'permission', label: 'Phân quyền' }] 
    },
    { 
      id: 'products', label: 'Sản phẩm', 
      subs: [{ id: 'list', label: 'Dịch vụ' }, { id: 'department', label: 'Bộ phận' }] 
    },
    { 
      id: 'settings', label: 'Cấu hình', 
      subs: [{ id: 'info', label: 'Studio Info' }, { id: 'terms', label: 'Điều khoản' }] 
    }
  ];

  const initialForm: Partial<Staff> = {
    code: '',
    name: '',
    role: STAFF_ROLES[0],
    phone: '',
    email: '',
    baseSalary: 0,
    status: 'Active',
    startDate: new Date().toISOString().split('T')[0],
    notes: '',
    createdAt: new Date().toISOString().split('T')[0],
    username: '',
    password: '123', // Mặc định cho nhân viên mới
    permissions: {}
  };

  const [form, setForm] = useState<Partial<Staff>>(initialForm);

  const handleToggleExpand = (modId: string) => {
    setExpandedModules(prev => 
      prev.includes(modId) ? prev.filter(id => id !== modId) : [...prev, modId]
    );
  };

  const handleOpenAdd = () => {
    setEditingStaffId(null);
    setForm({
      ...initialForm,
      code: `NV${(staff.length + 1).toString().padStart(3, '0')}`,
      createdAt: new Date().toISOString().split('T')[0]
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (s: Staff) => {
    setEditingStaffId(s.id);
    setForm({ ...s });
    setIsModalOpen(true);
  };

  const handleTogglePermission = (modId: string, subId: string, action: keyof ModulePermission) => {
    const permissions = { ...(form.permissions || {}) };
    if (!permissions[modId]) permissions[modId] = {};
    const subPerm = permissions[modId][subId] || { view: false, add: false, edit: false, delete: false, ownOnly: false };
    
    const newVal = !subPerm[action];
    let updatedSubPerm = { ...subPerm, [action]: newVal };

    if ((action !== 'view' && action !== 'ownOnly' && newVal) || (action === 'ownOnly' && newVal)) {
      updatedSubPerm.view = true;
    }
    
    if (action === 'view' && !newVal) {
      updatedSubPerm = { view: false, add: false, edit: false, delete: false, ownOnly: false };
    }

    permissions[modId][subId] = updatedSubPerm;
    setForm({ ...form, permissions });
  };

  const handleToggleAllModule = (modId: string, action: keyof ModulePermission) => {
    const permissions = { ...(form.permissions || {}) };
    const modDef = moduleDefinitions.find(m => m.id === modId);
    if (!modDef) return;

    if (!permissions[modId]) permissions[modId] = {};
    
    const isAllOn = modDef.subs.every(s => permissions[modId][s.id]?.[action]);
    const newVal = !isAllOn;

    modDef.subs.forEach(s => {
        let subPerm = permissions[modId][s.id] || { view: false, add: false, edit: false, delete: false, ownOnly: false };
        subPerm = { ...subPerm, [action]: newVal };
        
        if ((action !== 'view' && action !== 'ownOnly' && newVal) || (action === 'ownOnly' && newVal)) {
          subPerm.view = true;
        }
        if (action === 'view' && !newVal) {
          subPerm = { view: false, add: false, edit: false, delete: false, ownOnly: false };
        }
        
        permissions[modId][s.id] = subPerm;
    });

    setForm({ ...form, permissions });
  };

  const handleSave = async () => {
    if (!form.name || !form.username || !form.code) {
      alert("Vui lòng nhập Mã nhân viên, Họ tên và Tên đăng nhập");
      return;
    }

    setIsSaving(true);
    const updatedStaffData = {
       ...form,
       updatedAt: new Date().toISOString()
    } as Staff;

    try {
      if (editingStaffId) {
        setStaff(prev => prev.map(s => s.id === editingStaffId ? { ...s, ...updatedStaffData } : s));
        await syncData('Staff', 'UPDATE', updatedStaffData);
      } else {
        const newStaff: Staff = {
          ...updatedStaffData,
          id: updatedStaffData.code // Dùng mã nhân viên làm ID thực tế
        };
        setStaff(prev => [...prev, newStaff]);
        await syncData('Staff', 'CREATE', newStaff);
      }
      setIsModalOpen(false);
    } catch (e: any) {
      console.error("Lỗi đồng bộ nhân sự:", e);
      alert(`Gặp lỗi khi đồng bộ dữ liệu với Supabase Cloud: ${e.message || 'Vui lòng thử lại.'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const target = staff.find(s => s.id === id); // staff là state/prop bạn đang render
    if (!target) return;

    const ok = window.confirm(`Xác nhận xóa nhân viên: ${target.name}?`);
    if (!ok) return;
  
    // Optimistic UI
    const prev = staff;
    setStaff(prevList => prevList.filter(s => s.id !== id));
  
    try {
      const res = await syncData('staff', 'DELETE', { id });
      if (!res?.success) {
        // rollback nếu API trả fail
        setStaff(prev);
        alert('Xóa thất bại (API trả về lỗi).');
        return;
      }
    } catch (e: any) {
      // rollback nếu exception
      setStaff(prev);
      alert(`Xóa thất bại: ${e?.message || 'Unknown error'}`);
    }
  };

  const formatDisplayDate = (dateStr?: string) => {
    if (!dateStr) return '---';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight uppercase">Đội ngũ Nhân sự</h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Quản lý nhân sự và đồng bộ Cloud thời gian thực</p>
        </div>
        <button 
          onClick={handleOpenAdd}
          className="flex items-center gap-2 bg-blue-600 text-white px-5 py-3 rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg active:scale-95"
        >
          <Plus size={18} /> Thêm nhân viên
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {staff.map(s => {
          // Safety check: ensure sch and assignments exist
          const assignmentsCount = (schedules || []).filter(sch => sch && sch.assignments && sch.assignments.includes(s.id)).length;
          const permittedModuleCount = Object.keys(s.permissions || {}).filter(modId => 
             (Object.values(s.permissions[modId]) as ModulePermission[]).some(sub => sub.view)
          ).length;
          
          return (
            <div key={s.id} className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm hover:border-blue-300 transition-all group relative">
              <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => handleOpenEdit(s)} className="p-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all"><Edit3 size={16}/></button>
                <button onClick={() => handleDelete(s.id)} className="p-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-600 hover:text-white transition-all"><Trash2 size={16}/></button>
              </div>

              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:text-blue-500 transition-colors">
                  <User size={28} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black bg-blue-50 text-blue-600 px-2 py-0.5 rounded uppercase tracking-widest">{s.code}</span>
                    <h3 className="font-black text-lg text-slate-900 uppercase tracking-tight">{s.name}</h3>
                  </div>
                  <div className="text-blue-600 font-bold text-[10px] uppercase tracking-widest">{s.role}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6 text-center">
                <div className="p-3 bg-slate-50 rounded-2xl">
                  <div className="text-[9px] text-slate-400 font-black uppercase mb-1 tracking-widest">Đầu việc</div>
                  <div className="text-lg font-black text-slate-900">{assignmentsCount}</div>
                </div>
                <div className="p-3 bg-slate-50 rounded-2xl">
                  <div className="text-[9px] text-slate-400 font-black uppercase mb-1 tracking-widest">Phân hệ con</div>
                  <div className="text-lg font-black text-blue-600">{permittedModuleCount}</div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-50 flex justify-between items-center text-xs">
                 <div className="flex flex-col">
                    <span className="text-slate-400 font-black uppercase text-[9px]">@{s.username}</span>
                    <span className="text-[8px] text-slate-300 font-bold">Vào làm: {formatDisplayDate(s.startDate)}</span>
                 </div>
                 <span className={`px-2 py-0.5 rounded-lg font-black text-[9px] uppercase ${s.status === 'Active' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>{s.status === 'Active' ? 'Đang làm' : 'Đã nghỉ'}</span>
              </div>
            </div>
          );
        })}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-[3rem] w-full max-w-5xl p-10 shadow-2xl space-y-8 my-auto animate-in zoom-in-95">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-xl">
                  <Shield size={28} />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">{editingStaffId ? 'Cập nhật tài khoản' : 'Tạo mới nhân viên'}</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Cấu hình hồ sơ và đồng bộ Cloud thời gian thực</p>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="w-10 h-10 flex items-center justify-center hover:bg-slate-100 rounded-full text-slate-300 transition-colors"><X size={24}/></button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
              <div className="space-y-6">
                 <div className="bg-slate-50/50 p-6 rounded-[2rem] border border-slate-100 space-y-4">
                    <div className="flex items-center gap-2 text-slate-700 font-black text-xs uppercase tracking-widest px-2 mb-2">
                       <Info size={16} className="text-blue-500" /> Thông tin cơ bản
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Mã NV *</label>
                          <input type="text" placeholder="NV001" className="w-full p-4 bg-white border border-slate-200 rounded-2xl outline-none font-black text-blue-600" value={form.code} onChange={e => setForm({...form, code: e.target.value})} />
                       </div>
                       <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Trạng thái làm việc</label>
                          <select className="w-full p-4 bg-white border border-slate-200 rounded-2xl outline-none font-bold text-slate-800 appearance-none cursor-pointer" value={form.status} onChange={e => setForm({...form, status: e.target.value as 'Active' | 'Inactive'})}>
                             <option value="Active">Đang làm việc</option>
                             <option value="Inactive">Đã nghỉ việc</option>
                          </select>
                       </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Họ tên *</label>
                          <input type="text" className="w-full p-4 bg-white border border-slate-200 rounded-2xl outline-none font-bold text-slate-800" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
                       </div>
                       <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Vị trí *</label>
                          <select className="w-full p-4 bg-white border border-slate-200 rounded-2xl outline-none font-bold text-blue-600 cursor-pointer appearance-none" value={form.role} onChange={e => setForm({...form, role: e.target.value})}>
                             <option value="">-- Chọn vị trí --</option>
                             {STAFF_ROLES.map(role => <option key={role} value={role}>{role}</option>)}
                          </select>
                       </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Điện thoại</label>
                          <input type="tel" className="w-full p-4 bg-white border border-slate-200 rounded-2xl outline-none font-bold" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
                       </div>
                       <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Email</label>
                          <div className="relative">
                             <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                             <input type="email" placeholder="example@gmail.com" className="w-full p-4 pl-12 bg-white border border-slate-200 rounded-2xl outline-none font-medium" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
                          </div>
                       </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Ngày vào làm</label>
                          <input type="date" className="w-full p-4 bg-white border border-slate-200 rounded-2xl outline-none font-bold" value={form.startDate} onChange={e => setForm({...form, startDate: e.target.value})} />
                       </div>
                       <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Lương cứng</label>
                          <input type="number" className="w-full p-4 bg-white border border-slate-200 rounded-2xl outline-none font-black text-emerald-700" value={form.baseSalary} onChange={e => setForm({...form, baseSalary: Number(e.target.value)})} />
                       </div>
                    </div>

                    <div className="space-y-1.5">
                       <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Ngày tạo bản ghi</label>
                       <div className="w-full p-4 bg-slate-100 border border-slate-200 rounded-2xl font-bold text-slate-400 flex items-center gap-2">
                          <Clock size={16} /> {formatDisplayDate(form.createdAt)}
                       </div>
                    </div>
                 </div>

                 <div className="bg-blue-50/30 p-6 rounded-[2rem] border border-blue-100 space-y-4">
                    <div className="flex items-center gap-2 text-blue-700 font-black text-xs uppercase tracking-widest px-2 mb-2">
                       <Key size={16} /> Tài khoản hệ thống
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Username</label>
                          <input type="text" className="w-full p-4 bg-white border border-blue-100 rounded-2xl outline-none font-bold" value={form.username} onChange={e => setForm({...form, username: e.target.value})} />
                       </div>
                       <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Mật khẩu</label>
                          <input type="password" placeholder="••••••••" className="w-full p-4 bg-white border border-blue-100 rounded-2xl outline-none font-bold" value={form.password} onChange={e => setForm({...form, password: e.target.value})} />
                       </div>
                    </div>
                 </div>

                 <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase ml-1 tracking-widest flex items-center gap-2">
                       <Tag size={12} /> Ghi chú về nhân sự
                    </label>
                    <textarea 
                       className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 text-sm min-h-[100px]" 
                       placeholder="Ví dụ: Kỹ năng tay nghề, thái độ làm việc, ghi chú nghỉ phép..."
                       value={form.notes}
                       onChange={e => setForm({...form, notes: e.target.value})}
                    />
                 </div>
              </div>

              <div className="space-y-4">
                 <div className="flex items-center gap-2 text-slate-700 font-black text-xs uppercase tracking-widest px-2">
                    <Shield size={16} /> Ma trận quyền chi tiết theo tính năng
                 </div>
                 
                 <div className="bg-slate-50 rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm">
                    <div className="grid grid-cols-7 bg-slate-100/80 border-b border-slate-200 text-[9px] font-black uppercase tracking-widest text-slate-400 text-center py-3">
                       <div className="col-span-2 text-left px-6">Phân hệ / Tính năng con</div>
                       <div>Xem</div>
                       <div>Thêm</div>
                       <div>Sửa</div>
                       <div>Xóa</div>
                       <div className="text-blue-600">Riêng</div>
                    </div>

                    <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto scrollbar-hide">
                       {moduleDefinitions.map(mod => {
                          const isExpanded = expandedModules.includes(mod.id);
                          const currentModPerms = form.permissions?.[mod.id] || {};

                          return (
                            <React.Fragment key={mod.id}>
                               <div className="grid grid-cols-7 items-center py-3.5 bg-white border-b border-slate-50 group cursor-pointer hover:bg-slate-50 transition-colors">
                                  <div 
                                    className="col-span-2 px-4 flex items-center gap-2 font-black text-[11px] text-slate-800 uppercase tracking-tighter"
                                    onClick={() => handleToggleExpand(mod.id)}
                                  >
                                     <div className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                        {isExpanded ? <ChevronDown size={14}/> : <ChevronRight size={14}/>}
                                     </div>
                                     {mod.label}
                                  </div>
                                  
                                  <div className="flex justify-center">
                                    <button onClick={() => handleToggleAllModule(mod.id, 'view')} className="p-1 hover:bg-blue-50 rounded-lg text-slate-300 hover:text-blue-500"><CheckSquare size={14}/></button>
                                  </div>
                                  <div className="flex justify-center">
                                    <button onClick={() => handleToggleAllModule(mod.id, 'add')} className="p-1 hover:bg-emerald-50 rounded-lg text-slate-300 hover:text-emerald-500"><CheckSquare size={14}/></button>
                                  </div>
                                  <div className="flex justify-center">
                                    <button onClick={() => handleToggleAllModule(mod.id, 'edit')} className="p-1 hover:bg-amber-50 rounded-lg text-slate-300 hover:text-amber-500"><CheckSquare size={14}/></button>
                                  </div>
                                  <div className="flex justify-center">
                                    <button onClick={() => handleToggleAllModule(mod.id, 'delete')} className="p-1 hover:bg-red-50 rounded-lg text-slate-300 hover:text-red-500"><CheckSquare size={14}/></button>
                                  </div>
                                  <div className="flex justify-center">
                                    <button onClick={() => handleToggleAllModule(mod.id, 'ownOnly')} className="p-1 hover:bg-blue-50 rounded-lg text-slate-300 hover:text-blue-600"><UserCheck size={14}/></button>
                                  </div>
                               </div>

                               {isExpanded && mod.subs.map(sub => {
                                  const perm = currentModPerms[sub.id] || { view: false, add: false, edit: false, delete: false, ownOnly: false };
                                  return (
                                    <div key={sub.id} className="grid grid-cols-7 items-center py-3 bg-slate-50/50 hover:bg-white animate-in slide-in-from-top-1 duration-200">
                                       <div className="col-span-2 pl-12 pr-4 font-bold text-[10px] text-slate-500 border-l-2 border-blue-500/20">{sub.label}</div>
                                       
                                       <div className="flex justify-center">
                                          <button onClick={() => handleTogglePermission(mod.id, sub.id, 'view')} className={`w-5 h-5 rounded-md flex items-center justify-center transition-all ${perm.view ? 'bg-blue-600 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-200'}`}>
                                             <Eye size={10} />
                                          </button>
                                       </div>
                                       <div className="flex justify-center">
                                          <button onClick={() => handleTogglePermission(mod.id, sub.id, 'add')} className={`w-5 h-5 rounded-md flex items-center justify-center transition-all ${perm.add ? 'bg-emerald-500 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-200'}`}>
                                             <FilePlus size={10} />
                                          </button>
                                       </div>
                                       <div className="flex justify-center">
                                          <button onClick={() => handleTogglePermission(mod.id, sub.id, 'edit')} className={`w-5 h-5 rounded-md flex items-center justify-center transition-all ${perm.edit ? 'bg-amber-500 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-200'}`}>
                                             <Settings2 size={10} />
                                          </button>
                                       </div>
                                       <div className="flex justify-center">
                                          <button onClick={() => handleTogglePermission(mod.id, sub.id, 'delete')} className={`w-5 h-5 rounded-md flex items-center justify-center transition-all ${perm.delete ? 'bg-red-500 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-200'}`}>
                                             <Trash size={10} />
                                          </button>
                                       </div>
                                       <div className="flex justify-center">
                                          <button onClick={() => handleTogglePermission(mod.id, sub.id, 'ownOnly')} className={`w-5 h-5 rounded-md flex items-center justify-center transition-all ${perm.ownOnly ? 'bg-blue-500 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-200'}`}>
                                             <UserCheck size={10} />
                                          </button>
                                       </div>
                                    </div>
                                  );
                               })}
                            </React.Fragment>
                          );
                       })}
                    </div>
                 </div>
              </div>
            </div>

            <div className="pt-6 flex gap-4 border-t border-slate-50">
               <button onClick={() => setIsModalOpen(false)} className="flex-1 py-4 text-slate-400 font-black text-xs uppercase tracking-widest hover:text-slate-900 transition-colors">Hủy bỏ</button>
               <button 
                  onClick={handleSave} 
                  disabled={isSaving}
                  className="flex-[2] py-4 bg-blue-600 text-white rounded-[1.5rem] font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-500/20 active:scale-95 flex items-center justify-center gap-2 disabled:bg-slate-300"
               >
                  {isSaving ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />} 
                  {isSaving ? 'Đang đồng bộ Cloud...' : 'Lưu thông tin nhân sự'}
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffManager;
