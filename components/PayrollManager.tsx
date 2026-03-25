
import React, { useState, useEffect, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { 
  Banknote, Calendar, Users, ChevronRight, Filter, Search, 
  Plus, ArrowUpCircle, ArrowDownCircle, History, Sparkles,
  CheckCircle2, X, Loader2, Save, Trash2, Edit3, Lock,
  ChevronLeft, LayoutDashboard, Target, Briefcase, Info, AlertCircle, RefreshCw, Award, Heart, Copy, FileCheck, Printer, Calculator
} from 'lucide-react';
import { SalaryPeriod, SalarySlip, SalaryItem, Staff, Task, Contract, Transaction, Service, SalaryItemType, TransactionType, Customer, StudioInfo } from '../types';
import { fetchSalaryPeriods, openSalaryPeriod, fetchSalarySlips, fetchSalarySlipItems, saveSalaryItem, deleteSalaryItem, initializeSalarySlip, fetchSalaryItemsByPeriod, supabase, syncData, studioInfoFromDb, runPayrollMagicSync, copyPreviousAllowances } from '../apiService';
import PayrollPrint from './PayrollPrint';

interface Props {
  staff: Staff[];
  currentUser: Staff;
  tasks: Task[];
  contracts: Contract[];
  transactions: Transaction[];
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  services: Service[];
  customers: Customer[];
  studioInfo: StudioInfo;
}

const ALLOWANCE_TYPES = [
  "Phụ Cấp Bảo Hiểm Xã Hội",
  "Phụ Cấp Bảo Hiểm Y Tế",
  "Phụ Cấp Điện Thoại",
  "Phụ Cấp Làm Tráp",
  "Phụ Cấp Ăn Trưa",
  "Phụ Cấp Xăng Xe",
  "Phụ Cấp Trách Nhiệm",
  "Phụ Cấp Khác"
];

const KPI_MODES = [
  { id: 'MANUAL', label: 'Thêm thủ công' },
  { id: 'REVENUE', label: 'Thưởng Doanh số (Tự động)' }
];

const REWARD_TYPES = [
  { id: 'FIXED', label: 'VNĐ' },
  { id: 'PERCENT', label: '% Doanh thu' }
];

const PayrollManager: React.FC<Props> = ({ staff, currentUser, tasks, contracts, transactions, setTransactions, services, customers, studioInfo }) => {
  const [periods, setPeriods] = useState<SalaryPeriod[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<SalaryPeriod | null>(null);
  const [slips, setSlips] = useState<SalarySlip[]>([]);
  const [allPeriodItems, setAllPeriodItems] = useState<SalaryItem[]>([]); 
  const [activeSlip, setActiveSlip] = useState<SalarySlip | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState<string | 'all' | null>(null);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [studioSettings, setStudioSettings] = useState<any>(null);

  // Modal Input States
  const [kpiMode, setKpiMode] = useState('MANUAL');
  const [newKPITitle, setNewKPITitle] = useState('');
  const [newKPIAmount, setNewKPIAmount] = useState<string>('');
  const [kpiTarget, setKpiTarget] = useState<string>('');
  const [kpiReward, setKpiReward] = useState<string>('');
  const [kpiRewardType, setKpiRewardType] = useState<'FIXED' | 'PERCENT'>('FIXED');
  const [kpiStatusMsg, setKpiStatusMsg] = useState<{type: 'success' | 'warning' | 'error', msg: string} | null>(null);
  const [newAllowanceTitle, setNewAllowanceTitle] = useState(ALLOWANCE_TYPES[0]);
  const [newAllowanceAmount, setNewAllowanceAmount] = useState<string>('');
  const [isAddingKPI, setIsAddingKPI] = useState(false);
  const [isAddingAllowance, setIsAddingAllowance] = useState(false);

  const isAdmin = currentUser.role === 'Giám đốc' || currentUser.username === 'admin';
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadPeriods();
    loadStudioInfo();
  }, []);

  useEffect(() => {
    setKpiStatusMsg(null);
  }, [kpiTarget, kpiReward, kpiRewardType, kpiMode]);

  const loadStudioInfo = async () => {
     if(supabase) {
        const { data } = await supabase.from('settings').select('*').limit(1);
        if(data && data.length > 0) {
           setStudioSettings(studioInfoFromDb(data[0]));
        }
     }
  };

  const loadPeriods = async () => {
    setIsLoading(true);
    const data = await fetchSalaryPeriods();
    setPeriods(data);
    if (data.length > 0) {
        setSelectedPeriod(data[0]);
        loadSlips(data[0].id);
    }
    setIsLoading(false);
  };

  const loadSlips = async (periodId: string) => {
    setIsLoading(true);
    const [slipsData, itemsData] = await Promise.all([
        fetchSalarySlips(periodId),
        fetchSalaryItemsByPeriod(periodId)
    ]);
    setSlips(slipsData);
    setAllPeriodItems(itemsData);
    setIsLoading(false);
  };

  const activeSlipTotals = useMemo(() => {
    if (!activeSlip || !activeSlip.items) return { earnings: 0, deductions: 0, net: 0 };
    const earnings = activeSlip.items.filter(i => i.amount > 0).reduce((sum, i) => sum + i.amount, 0);
    const deductions = activeSlip.items.filter(i => i.amount < 0).reduce((sum, i) => sum + Math.abs(i.amount), 0);
    return { earnings, deductions, net: earnings - deductions };
  }, [activeSlip]);

  const displayStaffData = useMemo(() => {
    const list = staff.filter(s => s.status === 'Active');
    const mapped = list.map(s => {
        const slip = slips.find(sl => sl.staffId === s.id);
        let totalEarnings = 0;
        let totalDeductions = 0;
        let netPay = 0;
        if (slip) {
            const slipItems = allPeriodItems.filter(item => item.salarySlipId === slip.id);
            totalEarnings = slipItems.filter(i => i.amount > 0).reduce((sum, i) => sum + i.amount, 0);
            totalDeductions = slipItems.filter(i => i.amount < 0).reduce((sum, i) => sum + Math.abs(i.amount), 0);
            netPay = totalEarnings - totalDeductions;
        }
        return { staff: s, slip: slip ? { ...slip, totalEarnings, totalDeductions, netPay } : null, isCreated: !!slip };
    });
    if (!isAdmin) return mapped.filter(m => m.staff.id === currentUser.id);
    return mapped.filter(m => m.staff.name.toLowerCase().includes(searchTerm.toLowerCase()) || m.staff.code.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [staff, slips, allPeriodItems, searchTerm, isAdmin, currentUser.id]);

  const handleMagicSync = async (staffId: string) => {
    if (!selectedPeriod) return;
    setIsSyncing(staffId);
    try {
        const result = await runPayrollMagicSync(selectedPeriod.id, staffId);
        if (result.success) {
            await loadSlips(selectedPeriod.id);
            if (activeSlip && activeSlip.staffId === staffId) {
                const updatedSlip = slips.find(s => s.staffId === staffId);
                if (updatedSlip) {
                    const items = await fetchSalarySlipItems(updatedSlip.id);
                    setActiveSlip({ ...updatedSlip, items, staffName: activeSlip.staffName });
                }
            }
        } else {
            alert("Lỗi đồng bộ: " + result.error);
        }
    } catch (e: any) { 
        alert("Lỗi kết nối Server: " + e.message); 
    } finally { 
        setIsSyncing(null); 
    }
  };

  const handleMagicSyncAll = async () => {
    if (!selectedPeriod || !isAdmin) return;
    if (!window.confirm("Hệ thống sẽ thực hiện tính toán lương tự động trên Server cho toàn bộ nhân viên. Bạn có chắc chắn?")) return;
    setIsSyncing('all');
    try {
        const result = await runPayrollMagicSync(selectedPeriod.id);
        if (result.success) {
            await loadSlips(selectedPeriod.id);
            alert("Đã hoàn tất đồng bộ lương toàn studio (Server-side)!");
        } else {
            alert("Lỗi Server: " + result.error);
        }
    } catch (e: any) { 
        alert("Lỗi hệ thống: " + e.message); 
    } finally { 
        setIsSyncing(null); 
    }
  };

  const handleOpenPeriod = async () => {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    setIsLoading(true);
    try {
        const period = await openSalaryPeriod(month, year);
        if (period) {
            setPeriods(prev => {
                const filtered = prev.filter(p => p.id !== period.id);
                return [period, ...filtered];
            });
            setSelectedPeriod(period);
            loadSlips(period.id);
        }
    } catch (e: any) { alert(e.message); }
    finally { setIsLoading(false); }
  };

  const handleOpenSlipDetail = async (slip: SalarySlip, staffName: string) => {
    setIsLoading(true);
    const items = await fetchSalarySlipItems(slip.id);
    setActiveSlip({ ...slip, items, staffName });
    setIsLoading(false);
  };

  const handleRowClick = async (staffObj: Staff, slip: SalarySlip | null) => {
    if (!selectedPeriod) return;
    if (!isAdmin && staffObj.id !== currentUser.id) return alert("Bạn không có quyền.");
    if (slip) {
      handleOpenSlipDetail(slip, staffObj.name);
    } else if (isAdmin) {
      if(window.confirm(`Tạo phiếu lương mới cho ${staffObj.name}?`)) {
        setIsLoading(true);
        const newSlip = await initializeSalarySlip(selectedPeriod.id, staffObj.id);
        if (newSlip) {
           await loadSlips(selectedPeriod.id);
           handleOpenSlipDetail(newSlip, staffObj.name);
        }
        setIsLoading(false);
      }
    }
  };

  const handleAddKPI = async () => {
    if (!activeSlip) return;
    
    let title = '';
    let amount = 0;
    let refId = undefined;

    if (kpiMode === 'MANUAL') {
        if (!newKPITitle || !newKPIAmount) return alert("Thiếu thông tin");
        title = `KPI: ${newKPITitle}`;
        amount = parseInt(newKPIAmount.replace(/\D/g, '')) || 0;
    } else {
        // AUTO MODE
        const target = parseInt(kpiTarget.replace(/\D/g, '')) || 0;
        const reward = parseInt(kpiReward.replace(/\D/g, '')) || 0;
        if (target <= 0 || reward <= 0) return alert("Mục tiêu và mức thưởng phải > 0");
        
        // ref_id format: KPI_AUTO_{TARGET}_{REWARD}_{TYPE}
        refId = `KPI_AUTO_${target}_${reward}_${kpiRewardType}`;
        title = `Thưởng DS > ${target.toLocaleString()}đ [Đang tính...]`;
        amount = 0; // Will be calculated by magic sync
    }

    setIsAddingKPI(true);
    try {
      await saveSalaryItem({ salarySlipId: activeSlip.id, type: 'KPI', title, amount, source: 'kpi', refId });
      const items = await fetchSalarySlipItems(activeSlip.id);
      setActiveSlip({ ...activeSlip, items });
      setKpiStatusMsg({type: 'success', msg: "Đã thêm KPI. Bấm Magic Sync để tính toán (nếu là tự động)."});
      setNewKPITitle(''); setNewKPIAmount(''); setKpiTarget(''); setKpiReward('');
    } catch (e: any) { alert(e.message); }
    finally { setIsAddingKPI(false); }
  };

  const handleAddAllowance = async () => {
    if (!activeSlip || !newAllowanceAmount) return;
    const amount = parseInt(newAllowanceAmount.replace(/\D/g, '')) || 0;
    setIsAddingAllowance(true);
    try {
      await saveSalaryItem({ salarySlipId: activeSlip.id, type: 'ALLOWANCE', title: newAllowanceTitle, amount, source: 'allowance' });
      const items = await fetchSalarySlipItems(activeSlip.id);
      setActiveSlip({ ...activeSlip, items });
      setNewAllowanceAmount('');
    } catch (e: any) { alert(e.message); }
    finally { setIsAddingAllowance(false); }
  };

  const handleCopyAllowances = async () => {
    if (!selectedPeriod) return;
    if (!window.confirm("Sao chép tất cả phụ cấp từ tháng trước cho toàn bộ nhân viên?")) return;
    setIsAddingAllowance(true);
    try {
       const res = await copyPreviousAllowances(selectedPeriod.id, selectedPeriod.month, selectedPeriod.year);
       if (res.success) {
          alert(`Đã sao chép ${res.count} khoản phụ cấp.`);
          // Refresh
          await loadSlips(selectedPeriod.id);
          if (activeSlip) {
             const items = await fetchSalarySlipItems(activeSlip.id);
             setActiveSlip({ ...activeSlip, items });
          }
       }
    } catch (e: any) {
       alert("Lỗi: " + e.message);
    } finally {
       setIsAddingAllowance(false);
    }
  };

  const handleRemoveItem = async (itemId: string) => {
      if (!window.confirm("Xóa khoản lương này?")) return;
      await deleteSalaryItem(itemId);
      const items = await fetchSalarySlipItems(activeSlip!.id);
      setActiveSlip({ ...activeSlip!, items });
  };

  const handlePrint = () => {
    if (!activeSlip || !selectedPeriod) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return alert("Bị chặn Popup.");
    printWindow.document.write('<html><head><title>Phiếu Lương</title><script src="https://cdn.tailwindcss.com"></script></head><body><div id="print-root"></div></body></html>');
    printWindow.document.close();
    const staffObj = staff.find(s => s.id === activeSlip.staffId);
    if(!staffObj) return;
    const rootElement = printWindow.document.getElementById('print-root');
    if (rootElement) {
        const root = createRoot(rootElement);
        root.render(<PayrollPrint slip={activeSlip} staff={staffObj} items={activeSlip.items || []} studioInfo={studioSettings || studioInfo} periodStr={`THÁNG ${selectedPeriod.month}/${selectedPeriod.year}`} tasks={tasks} contracts={contracts} customers={customers} />);
        setTimeout(() => { printWindow.print(); }, 1000);
    }
  };

  const handleFinalizeSlip = async () => {
    if (!activeSlip || activeSlipTotals.net <= 0) return alert("Thực lĩnh <= 0");
    if (!window.confirm(`Chốt lương và tạo phiếu chi cho ${activeSlip.staffName}?`)) return;
    setIsFinalizing(true);
    try {
        const txId = `pay-${activeSlip.id}-${Date.now()}`;
        const txPayload: Transaction = {
            id: txId, type: TransactionType.EXPENSE, mainCategory: 'Lương nhân viên', category: 'Thanh toán lương',
            amount: activeSlipTotals.net, description: `Thanh toán lương T${selectedPeriod?.month}/${selectedPeriod?.year} - ${activeSlip.staffName}`,
            date: new Date().toISOString().split('T')[0], staffId: activeSlip.staffId, vendor: 'Chuyển khoản'
        };
        await syncData('transactions', 'CREATE', { ...txPayload, staffName: activeSlip.staffName });
        setTransactions(prev => [txPayload, ...prev]);
        await saveSalaryItem({ salarySlipId: activeSlip.id, type: 'ADVANCE', title: `Đã thanh toán (Auto)`, amount: -activeSlipTotals.net, source: 'transaction', refId: txId });
        const items = await fetchSalarySlipItems(activeSlip.id);
        setActiveSlip({ ...activeSlip, items });
        alert("Đã chốt lương thành công.");
        handlePrint();
    } catch (e: any) { alert(e.message); } finally { setIsFinalizing(false); }
  };

  const generalItems = activeSlip?.items?.filter(i => i.type !== 'KPI' && i.type !== 'ALLOWANCE') || [];
  const kpiItems = activeSlip?.items?.filter(i => i.type === 'KPI') || [];
  const allowanceItems = activeSlip?.items?.filter(i => i.type === 'ALLOWANCE') || [];

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
             <Banknote className="text-blue-600" /> Quản lý Lương
          </h2>
          <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mt-1">Sử dụng Server Magic Sync để tính toán chính xác</p>
        </div>

        <div className="flex items-center gap-4">
           <div className="flex bg-slate-100 p-1.5 rounded-2xl items-center gap-2">
              <Calendar size={18} className="text-slate-400 ml-2" />
              <select className="bg-transparent text-xs font-black uppercase outline-none text-slate-700 cursor-pointer pr-4" value={selectedPeriod?.id || ''} onChange={e => { const p = periods.find(p => p.id === e.target.value); if (p) { setSelectedPeriod(p); loadSlips(p.id); } }}>
                {periods.map(p => <option key={p.id} value={p.id}>THÁNG {p.month}/{p.year}</option>)}
              </select>
           </div>
           {isAdmin && (
             <div className="flex gap-2">
                <button onClick={handleMagicSyncAll} disabled={isSyncing === 'all' || !selectedPeriod} className="bg-slate-900 text-white px-5 py-3 rounded-2xl font-bold text-xs uppercase hover:bg-blue-600 transition-all shadow-lg active:scale-95 flex items-center gap-2">
                    {isSyncing === 'all' ? <Loader2 className="animate-spin" size={16}/> : <Sparkles className="text-blue-400" size={16}/>} Server Magic Sync All
                </button>
                <button onClick={handleOpenPeriod} className="bg-blue-600 text-white px-5 py-3 rounded-2xl font-bold text-xs uppercase hover:bg-blue-700 transition-all shadow-lg active:scale-95">Mở kỳ mới</button>
             </div>
           )}
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-[2.5rem] overflow-hidden shadow-sm flex flex-col">
        <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-white sticky top-0 z-10">
          <div className="flex items-center gap-4"><div className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center font-black"><Users size={20} /></div><h3 className="text-xl font-black text-slate-900 uppercase">Danh sách nhân sự</h3></div>
          <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" /><input type="text" placeholder="Tìm kiếm..." className="pl-10 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none w-64" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /></div>
        </div>
        <div className="overflow-x-auto">
           <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-100">
                 <tr>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Họ tên nhân viên</th>
                    <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Tổng thu nhập</th>
                    <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Thực lĩnh</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center w-48">Magic Sync</th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                 {displayStaffData.map(({ staff: s, slip, isCreated }) => (
                    <tr key={s.id} onClick={() => handleRowClick(s, slip)} className="hover:bg-blue-50/30 transition-colors group cursor-pointer">
                       <td className="px-8 py-6"><div className="flex items-center gap-4"><div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center font-bold text-slate-500">{s.name.charAt(0)}</div><div><div className="font-black text-slate-800 text-sm uppercase">{s.name}</div><div className="text-[10px] text-slate-400 font-bold uppercase">{s.code} • {s.role}</div></div></div></td>
                       <td className="px-6 py-6 text-right font-bold text-slate-700">{isCreated ? `+${slip!.totalEarnings.toLocaleString()}đ` : '--'}</td>
                       <td className="px-6 py-6 text-right font-black text-blue-600">{isCreated ? `${slip!.netPay.toLocaleString()}đ` : 'Chưa tạo'}</td>
                       <td className="px-8 py-6 text-center" onClick={e => e.stopPropagation()}>
                          {isAdmin && (
                             <button onClick={() => handleMagicSync(s.id)} disabled={isSyncing === s.id || isSyncing === 'all'} className={`p-2 rounded-xl transition-all shadow-sm ${isCreated ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
                                {isSyncing === s.id ? <Loader2 className="animate-spin" size={18}/> : <Sparkles size={18}/>}
                             </button>
                          )}
                       </td>
                    </tr>
                 ))}
              </tbody>
           </table>
        </div>
      </div>

      {activeSlip && (
         <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-[3rem] w-full max-w-4xl shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95">
               <div className="p-8 border-b border-slate-100 flex justify-between items-center">
                  <div className="flex items-center gap-4"><div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shadow-inner"><Banknote size={28} /></div><div><h3 className="text-2xl font-black text-slate-900 uppercase">Phiếu lương chi tiết</h3><p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{activeSlip.staffName} • {selectedPeriod?.month}/{selectedPeriod?.year}</p></div></div>
                  <div className="flex gap-2"><button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs uppercase"><Printer size={16}/> In</button><button onClick={() => setActiveSlip(null)} className="w-12 h-12 flex items-center justify-center hover:bg-slate-100 rounded-full text-slate-300"><X size={28}/></button></div>
               </div>
               
               <div className="flex-1 overflow-y-auto p-8 space-y-8 scrollbar-hide">
                  <div className="grid grid-cols-3 gap-6">
                     <div className="p-5 bg-emerald-50 rounded-[2rem] border border-emerald-100"><div className="text-[9px] font-black text-emerald-600 uppercase mb-1">Thu nhập</div><div className="text-xl font-black text-emerald-700">{activeSlipTotals.earnings.toLocaleString()}đ</div></div>
                     <div className="p-5 bg-red-50 rounded-[2rem] border border-red-100"><div className="text-[9px] font-black text-red-600 uppercase mb-1">Khấu trừ</div><div className="text-xl font-black text-red-700">{activeSlipTotals.deductions.toLocaleString()}đ</div></div>
                     <div className="p-5 bg-blue-600 rounded-[2rem] shadow-xl text-white"><div className="text-[9px] font-black text-blue-100 uppercase mb-1">Thực lĩnh</div><div className="text-xl font-black">{activeSlipTotals.net.toLocaleString()}đ</div></div>
                  </div>

                  <div className="space-y-6">
                     <div className="flex justify-between items-center"><h4 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2"><LayoutDashboard size={16} className="text-blue-500" /> 1. Chi tiết lương & Hoa hồng</h4><button onClick={() => handleMagicSync(activeSlip.staffId)} disabled={!!isSyncing} className="px-4 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 flex items-center gap-2">{isSyncing ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12}/>} Magic Sync</button></div>
                     <div className="bg-slate-50 rounded-[2.5rem] border border-slate-100 overflow-hidden"><table className="w-full text-left"><thead className="bg-white/50 border-b border-slate-100"><tr><th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Khoản mục</th><th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Số tiền</th>{isAdmin && <th className="px-6 py-4 w-16"></th>}</tr></thead><tbody className="divide-y divide-white">{generalItems.map(item => (<tr key={item.id} className="hover:bg-white/80"><td className="px-6 py-4"><div className="font-bold text-slate-700 text-sm">{item.title}</div><div className="text-[9px] text-slate-400 font-bold uppercase">{item.type} • {item.source}</div></td><td className="px-6 py-4 text-right font-black text-sm text-slate-700">{item.amount.toLocaleString()}đ</td>{isAdmin && <td className="px-6 py-4 text-center"><button onClick={() => handleRemoveItem(item.id)} className="text-slate-300 hover:text-red-500 p-1"><Trash2 size={14}/></button></td>}</tr>))}</tbody></table></div>
                  </div>

                  {/* 2. KPI Section */}
                  <div className="space-y-6">
                     <div className="flex justify-between items-center">
                        <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2"><Target size={16} className="text-purple-500" /> 2. KPI & Thưởng</h4>
                     </div>
                     <div className="bg-purple-50 rounded-[2.5rem] border border-purple-100 p-6 space-y-4">
                        {kpiItems.map(item => (
                           <div key={item.id} className="bg-white p-4 rounded-2xl flex justify-between items-center shadow-sm">
                              <div>
                                 <div className="font-bold text-slate-800 text-sm">{item.title}</div>
                                 <div className="text-[9px] text-purple-500 font-bold uppercase">KPI • {item.refId ? 'Tự động' : 'Thủ công'}</div>
                              </div>
                              <div className="flex items-center gap-4">
                                 <div className="font-black text-slate-900">{item.amount.toLocaleString()}đ</div>
                                 {isAdmin && <button onClick={() => handleRemoveItem(item.id)} className="text-slate-300 hover:text-red-500"><Trash2 size={16}/></button>}
                              </div>
                           </div>
                        ))}
                        {isAdmin && (
                           <div className="bg-white/50 p-4 rounded-2xl border border-dashed border-purple-200">
                              <div className="flex gap-2 mb-3">
                                 {KPI_MODES.map(m => (
                                    <button key={m.id} onClick={() => setKpiMode(m.id)} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase ${kpiMode === m.id ? 'bg-purple-600 text-white' : 'bg-white text-slate-500'}`}>{m.label}</button>
                                 ))}
                              </div>
                              {kpiMode === 'MANUAL' ? (
                                 <div className="flex gap-2">
                                    <input placeholder="Tên khoản thưởng KPI..." className="flex-[2] p-3 rounded-xl border border-purple-100 text-sm font-bold outline-none" value={newKPITitle} onChange={e => setNewKPITitle(e.target.value)} />
                                    <input type="number" placeholder="Số tiền..." className="flex-1 p-3 rounded-xl border border-purple-100 text-sm font-bold outline-none" value={newKPIAmount} onChange={e => setNewKPIAmount(e.target.value)} />
                                    <button onClick={handleAddKPI} className="bg-purple-600 text-white px-4 rounded-xl font-bold"><Plus/></button>
                                 </div>
                              ) : (
                                 <div className="space-y-3">
                                    <div className="flex items-center gap-2 text-xs text-purple-700 font-medium bg-purple-100 px-3 py-2 rounded-xl">
                                       <Info size={14} /> Hệ thống sẽ tự động tính tổng doanh số bán hàng của nhân viên này trong kỳ.
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                       <div>
                                          <label className="text-[9px] font-bold text-slate-400 uppercase">Mục tiêu doanh số (VNĐ)</label>
                                          <input type="number" className="w-full p-3 rounded-xl border border-purple-100 font-bold outline-none" placeholder="VD: 50000000" value={kpiTarget} onChange={e => setKpiTarget(e.target.value)} />
                                       </div>
                                       <div>
                                          <label className="text-[9px] font-bold text-slate-400 uppercase">Mức thưởng</label>
                                          <div className="flex gap-2">
                                             <input type="number" className="w-full p-3 rounded-xl border border-purple-100 font-bold outline-none" placeholder="VD: 2" value={kpiReward} onChange={e => setKpiReward(e.target.value)} />
                                             <select className="bg-white border border-purple-100 rounded-xl px-2 font-bold text-xs outline-none" value={kpiRewardType} onChange={e => setKpiRewardType(e.target.value as any)}>
                                                {REWARD_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                                             </select>
                                          </div>
                                       </div>
                                    </div>
                                    <button onClick={handleAddKPI} className="w-full py-3 bg-purple-600 text-white rounded-xl font-bold text-xs uppercase">Lưu cấu hình KPI</button>
                                 </div>
                              )}
                              {kpiStatusMsg && <div className={`mt-2 text-xs font-bold ${kpiStatusMsg.type === 'success' ? 'text-emerald-600' : 'text-red-500'}`}>{kpiStatusMsg.msg}</div>}
                           </div>
                        )}
                     </div>
                  </div>

                  {/* 3. Allowance Section */}
                  <div className="space-y-6">
                     <div className="flex justify-between items-center">
                        <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2"><Award size={16} className="text-amber-500" /> 3. Phụ cấp</h4>
                        {isAdmin && <button onClick={handleCopyAllowances} disabled={isAddingAllowance} className="text-[9px] font-bold bg-amber-50 text-amber-600 px-3 py-1.5 rounded-lg border border-amber-200 hover:bg-amber-100 transition-colors flex items-center gap-1"><Copy size={12}/> Sao chép kỳ trước</button>}
                     </div>
                     <div className="bg-amber-50 rounded-[2.5rem] border border-amber-100 p-6 space-y-4">
                        {allowanceItems.map(item => (
                           <div key={item.id} className="bg-white p-4 rounded-2xl flex justify-between items-center shadow-sm">
                              <div>
                                 <div className="font-bold text-slate-800 text-sm">{item.title}</div>
                                 <div className="text-[9px] text-amber-500 font-bold uppercase">Phụ cấp</div>
                              </div>
                              <div className="flex items-center gap-4">
                                 <div className="font-black text-slate-900">{item.amount.toLocaleString()}đ</div>
                                 {isAdmin && <button onClick={() => handleRemoveItem(item.id)} className="text-slate-300 hover:text-red-500"><Trash2 size={16}/></button>}
                              </div>
                           </div>
                        ))}
                        {isAdmin && (
                           <div className="flex gap-2">
                              <select className="flex-[2] p-3 rounded-xl border border-amber-200 text-sm font-bold outline-none cursor-pointer bg-white" value={newAllowanceTitle} onChange={e => setNewAllowanceTitle(e.target.value)}>
                                 {ALLOWANCE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                              </select>
                              <input type="number" placeholder="Số tiền..." className="flex-1 p-3 rounded-xl border border-amber-200 text-sm font-bold outline-none" value={newAllowanceAmount} onChange={e => setNewAllowanceAmount(e.target.value)} />
                              <button onClick={handleAddAllowance} className="bg-amber-500 text-white px-4 rounded-xl font-bold"><Plus/></button>
                           </div>
                        )}
                     </div>
                  </div>

               </div>
               <div className="p-8 border-t border-slate-50 flex gap-4 bg-slate-50/50"><button onClick={() => setActiveSlip(null)} className="flex-1 py-4 bg-white border border-slate-200 text-slate-500 font-bold text-xs uppercase tracking-widest rounded-2xl hover:bg-slate-50">Đóng</button>{isAdmin && (<button onClick={handleFinalizeSlip} disabled={isFinalizing || activeSlipTotals.net <= 0} className="flex-[2] py-4 bg-slate-900 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl active:scale-95 flex items-center justify-center gap-2">{isFinalizing ? <Loader2 className="animate-spin" size={18}/> : <FileCheck size={18} />} Chốt phiếu & Chi lương</button>)}</div>
            </div>
         </div>
      )}
    </div>
  );
};

export default PayrollManager;
