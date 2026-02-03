
import React, { useRef, useState } from 'react';
import { ServiceTypeItem, StudioInfo, ServiceGroupItem } from '../types';
import { Building2, Globe, Mail, Phone, User, FileJson, Layout, Upload, Image as ImageIcon, X, FileText, CheckCircle2, Loader2, Plus, Trash2, List, Layers } from 'lucide-react';
import { syncData, createServiceType, deleteServiceType, createServiceGroup, deleteServiceGroup } from '../apiService';

interface Props {
  studioInfo: StudioInfo;
  setStudioInfo: React.Dispatch<React.SetStateAction<StudioInfo>>;
  serviceTypes: ServiceTypeItem[];
  setServiceTypes: React.Dispatch<React.SetStateAction<ServiceTypeItem[]>>;
  serviceGroups: ServiceGroupItem[];
  setServiceGroups: React.Dispatch<React.SetStateAction<ServiceGroupItem[]>>;
  isAdmin: boolean;
}

const StudioSettings: React.FC<Props> = ({ studioInfo, setStudioInfo, serviceTypes, setServiceTypes, serviceGroups, setServiceGroups, isAdmin }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // State for Service Types
  const [newServiceType, setNewServiceType] = useState('');
  const [isAddingType, setIsAddingType] = useState(false);

  // State for Service Groups
  const [newServiceGroup, setNewServiceGroup] = useState('');
  const [isAddingGroup, setIsAddingGroup] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setStudioInfo(prev => ({ ...prev, [name]: value }));
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert("Ảnh quá lớn! Vui lòng chọn ảnh dưới 2MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setStudioInfo(prev => ({ ...prev, logoImage: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const removeLogo = () => {
    setStudioInfo(prev => ({ ...prev, logoImage: undefined }));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      // Force ID 'default' để đảm bảo chỉ có 1 bản ghi cấu hình duy nhất (Singleton)
      // Supabase upsert sẽ update nếu ID đã tồn tại
      const payload = { ...studioInfo, id: 'default' };
      await syncData('settings', 'UPDATE', payload);
      alert('Cấu hình đã được lưu thành công vào cơ sở dữ liệu.');
    } catch (e: any) {
      console.error("Save settings error:", e);
      alert(`Lỗi khi lưu cấu hình: ${e.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // --- SERVICE TYPES HANDLERS (CONTRACTS) ---
  const handleAddServiceType = async () => {
    if (!newServiceType.trim()) return;
    setIsAddingType(true);
    try {
      const added = await createServiceType(newServiceType.trim());
      if (added) {
        setServiceTypes(prev => [...prev, added]);
        setNewServiceType('');
      }
    } catch (error: any) {
      alert(error.message);
    } finally {
      setIsAddingType(false);
    }
  };

  const handleDeleteServiceType = async (id: string) => {
    if (window.confirm("Bạn có chắc chắn muốn xóa loại dịch vụ này?")) {
      try {
        await deleteServiceType(id);
        setServiceTypes(prev => prev.filter(t => t.id !== id));
      } catch (error: any) {
        alert(error.message);
      }
    }
  };

  // --- SERVICE GROUPS HANDLERS (SERVICES) ---
  const handleAddServiceGroup = async () => {
    if (!newServiceGroup.trim()) return;
    setIsAddingGroup(true);
    try {
      const added = await createServiceGroup(newServiceGroup.trim());
      if (added) {
        setServiceGroups(prev => [...prev, added]);
        setNewServiceGroup('');
      }
    } catch (error: any) {
      alert(error.message);
    } finally {
      setIsAddingGroup(false);
    }
  };

  const handleDeleteServiceGroup = async (id: string) => {
    if (window.confirm("Bạn có chắc chắn muốn xóa nhóm dịch vụ này?")) {
      try {
        await deleteServiceGroup(id);
        setServiceGroups(prev => prev.filter(g => g.id !== id));
      } catch (error: any) {
        alert(error.message);
      }
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20 relative">
      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-8 mb-20">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Building2 size={28} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Thông tin Studio</h2>
            <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mt-1">Thông tin này sẽ xuất hiện trên Hợp đồng và Hóa đơn</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Logo Upload Section */}
          <div className="md:col-span-2 space-y-3">
             <label className="text-[10px] font-black text-slate-500 uppercase ml-1 tracking-widest flex items-center gap-2">
              <ImageIcon size={12} /> Hình ảnh Logo thương hiệu
            </label>
            <div className="flex items-center gap-6 p-6 bg-slate-50 rounded-[2rem] border border-dashed border-slate-200">
              <div className="relative group">
                <div className="w-24 h-24 bg-white rounded-2xl border-2 border-slate-200 flex items-center justify-center overflow-hidden shadow-sm">
                  {studioInfo.logoImage ? (
                    <img src={studioInfo.logoImage} alt="Logo Preview" className="w-full h-full object-contain p-2" />
                  ) : (
                    <span className="text-2xl font-black text-blue-600">{studioInfo.logoText}</span>
                  )}
                </div>
                {studioInfo.logoImage && (
                  <button 
                    onClick={removeLogo}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center shadow-md hover:bg-red-600 transition-colors"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
              <div className="flex-1 space-y-2">
                <p className="text-[10px] text-slate-400 font-bold uppercase">Tải lên ảnh PNG/JPG không nền (dưới 2MB)</p>
                <input 
                  type="file" 
                  ref={fileInputRef}
                  accept="image/*"
                  className="hidden" 
                  onChange={handleLogoUpload} 
                />
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 bg-white border border-slate-200 px-4 py-2 rounded-xl text-xs font-black uppercase text-slate-700 hover:bg-slate-100 transition-all shadow-sm"
                >
                  <Upload size={14} /> Chọn ảnh mới
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase ml-1 tracking-widest flex items-center gap-2">
              <Building2 size={12} /> Tên Studio
            </label>
            <input 
              name="name" 
              value={studioInfo.name} 
              onChange={handleChange} 
              className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-800"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase ml-1 tracking-widest flex items-center gap-2">
              <Layout size={12} /> Chữ Logo thay thế (Text)
            </label>
            <input 
              name="logoText" 
              value={studioInfo.logoText} 
              onChange={handleChange} 
              maxLength={4}
              className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-black text-blue-600"
            />
          </div>
          <div className="md:col-span-2 space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase ml-1 tracking-widest flex items-center gap-2">
               Địa chỉ trụ sở
            </label>
            <input 
              name="address" 
              value={studioInfo.address} 
              onChange={handleChange} 
              className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-medium"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase ml-1 tracking-widest flex items-center gap-2">
              <Phone size={12} /> Số điện thoại
            </label>
            <input name="phone" value={studioInfo.phone} onChange={handleChange} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none" />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase ml-1 tracking-widest flex items-center gap-2">
              Zalo hỗ trợ
            </label>
            <input name="zalo" value={studioInfo.zalo} onChange={handleChange} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none" />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase ml-1 tracking-widest flex items-center gap-2">
              <Globe size={12} /> Website
            </label>
            <input name="website" value={studioInfo.website} onChange={handleChange} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none" />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase ml-1 tracking-widest flex items-center gap-2">
              <Mail size={12} /> Email
            </label>
            <input name="email" value={studioInfo.email} onChange={handleChange} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none" />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase ml-1 tracking-widest flex items-center gap-2">
              <User size={12} /> Giám đốc / Đại diện
            </label>
            <input name="directorName" value={studioInfo.directorName} onChange={handleChange} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold" />
          </div>

          {/* Service Types Management (FOR CONTRACTS) - Restricted to Admin/Director */}
          {isAdmin && (
            <div className="md:col-span-2 space-y-4 pt-6 mt-6 border-t border-slate-100">
               <div className="flex items-center gap-3">
                 <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                    <List size={20} />
                 </div>
                 <div>
                    <h3 className="text-lg font-black text-slate-900 tracking-tight uppercase">Quản lý Loại Dịch Vụ (Hợp Đồng)</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Phân loại hợp đồng để báo cáo doanh thu</p>
                 </div>
               </div>
               
               <div className="bg-slate-50 rounded-[2rem] p-6 border border-slate-100 space-y-4">
                  <div className="flex gap-2">
                     <input 
                       type="text" 
                       placeholder="Nhập tên loại mới (VD: Quay MV Cưới...)" 
                       className="flex-1 p-4 bg-white border border-slate-200 rounded-2xl outline-none font-bold text-sm"
                       value={newServiceType}
                       onChange={e => setNewServiceType(e.target.value)}
                       onKeyDown={e => e.key === 'Enter' && handleAddServiceType()}
                     />
                     <button 
                       onClick={handleAddServiceType}
                       disabled={isAddingType || !newServiceType.trim()}
                       className="bg-emerald-600 text-white px-6 rounded-2xl hover:bg-emerald-700 transition-all shadow-lg flex items-center justify-center disabled:opacity-50"
                     >
                       {isAddingType ? <Loader2 size={20} className="animate-spin"/> : <Plus size={24}/>}
                     </button>
                  </div>

                  <div className="flex flex-wrap gap-2">
                     {serviceTypes.map(type => (
                       <div key={type.id} className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 group">
                          {type.name}
                          <button onClick={() => handleDeleteServiceType(type.id)} className="text-slate-300 hover:text-red-500 transition-colors p-1">
                             <Trash2 size={14} />
                          </button>
                       </div>
                     ))}
                  </div>
               </div>
            </div>
          )}

          {/* Service Groups Management (FOR SERVICES) - Restricted to Admin/Director */}
          {isAdmin && (
            <div className="md:col-span-2 space-y-4 pt-6 mt-6 border-t border-slate-100">
               <div className="flex items-center gap-3">
                 <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                    <Layers size={20} />
                 </div>
                 <div>
                    <h3 className="text-lg font-black text-slate-900 tracking-tight uppercase">Quản lý Nhóm Dịch Vụ (Sản Phẩm)</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Phân loại sản phẩm để quản lý kho & báo cáo</p>
                 </div>
               </div>
               
               <div className="bg-slate-50 rounded-[2rem] p-6 border border-slate-100 space-y-4">
                  <div className="flex gap-2">
                     <input 
                       type="text" 
                       placeholder="Nhập tên nhóm mới (VD: TRANG ĐIỂM...)" 
                       className="flex-1 p-4 bg-white border border-slate-200 rounded-2xl outline-none font-bold text-sm"
                       value={newServiceGroup}
                       onChange={e => setNewServiceGroup(e.target.value)}
                       onKeyDown={e => e.key === 'Enter' && handleAddServiceGroup()}
                     />
                     <button 
                       onClick={handleAddServiceGroup}
                       disabled={isAddingGroup || !newServiceGroup.trim()}
                       className="bg-indigo-600 text-white px-6 rounded-2xl hover:bg-indigo-700 transition-all shadow-lg flex items-center justify-center disabled:opacity-50"
                     >
                       {isAddingGroup ? <Loader2 size={20} className="animate-spin"/> : <Plus size={24}/>}
                     </button>
                  </div>

                  <div className="flex flex-wrap gap-2">
                     {serviceGroups.map(group => (
                       <div key={group.id} className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 group">
                          {group.groupName}
                          <button onClick={() => handleDeleteServiceGroup(group.id)} className="text-slate-300 hover:text-red-500 transition-colors p-1">
                             <Trash2 size={14} />
                          </button>
                       </div>
                     ))}
                  </div>
               </div>
            </div>
          )}

          {/* New Section: Contract Terms */}
          <div className="md:col-span-2 space-y-4 pt-6 mt-6 border-t border-slate-100">
             <div className="flex items-center gap-3">
               <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center">
                  <FileText size={20} />
               </div>
               <div>
                  <h3 className="text-lg font-black text-slate-900 tracking-tight uppercase">Điều Khoản Hợp Đồng Gốc</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Cấu hình Mục V trên bản in hợp đồng</p>
               </div>
             </div>
             <textarea 
               name="contractTerms" 
               value={studioInfo.contractTerms} 
               onChange={handleChange} 
               className="w-full p-6 bg-slate-50 border border-slate-100 rounded-[2rem] outline-none focus:ring-2 focus:ring-purple-500 text-sm font-serif leading-relaxed min-h-[400px]"
               placeholder="Nhập nội dung điều khoản chung của Studio..."
             />
          </div>

          <div className="md:col-span-2 space-y-2 p-6 bg-blue-50 rounded-[2rem] border border-blue-100">
            <label className="text-[10px] font-black text-blue-600 uppercase ml-1 tracking-widest flex items-center gap-2">
              <FileJson size={14} /> Link Google Docs Mẫu Hợp Đồng
            </label>
            <p className="text-[10px] text-blue-400 mb-2 italic">* Liên kết mẫu hợp đồng của bạn để hệ thống có thể kết nối dữ liệu (tương lai).</p>
            <input 
              name="googleDocsTemplateUrl" 
              placeholder="https://docs.google.com/document/d/..." 
              value={studioInfo.googleDocsTemplateUrl} 
              onChange={handleChange} 
              className="w-full p-4 bg-white border border-blue-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-6 bg-white/80 backdrop-blur-md border-t border-slate-200 flex justify-center z-50 md:pl-72">
         <button 
           onClick={handleSaveSettings}
           disabled={isSaving}
           className="w-full max-w-md py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-600 transition-all shadow-xl shadow-slate-900/10 active:scale-95 flex items-center justify-center gap-2 disabled:bg-slate-400"
         >
            {isSaving ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
            {isSaving ? 'Đang lưu cấu hình...' : 'Lưu thay đổi Cấu hình'}
         </button>
      </div>
    </div>
  );
};

export default StudioSettings;
