import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  DollarSign, Plus, Sparkles, AlertCircle, Calendar as CalIcon, 
  Tag, ArrowUpCircle, ArrowDownCircle, Scale, Search, Filter, 
  ChevronRight, CreditCard, Banknote, History, BarChart3, TrendingUp, TrendingDown,
  X, CheckCircle2, MoreVertical, User, Trash2, Settings, Edit3, Calendar, PieChart as PieIcon, LineChart as LineIcon, Camera, Image as ImageIcon, ExternalLink, Loader2, ListPlus, ChevronDown, ChevronUp, FileText, LayoutDashboard, BarChart, Upload,
  Lock, Target, Activity, ShieldCheck, Monitor, Info, ChevronLeft, MinusSquare, PlusSquare
} from 'lucide-react';
import { Transaction, TransactionType, ExpenseCategory, Contract, Customer, Staff, ModulePermission, ExpenseCategoryItem, FixedCost, BreakevenResult, Asset } from '../types';
import { classifyExpense } from '../geminiService';
import { BarChart as ReBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, LineChart, Line, Legend, ComposedChart, Area } from 'recharts';
import { syncData, uploadTransactionImage, createExpenseCategory, deleteExpenseCategory, fetchFixedCostsWithStaff, saveFixedCost, deleteFixedCost, calculateBreakeven, fetchRevenueStreams, fetchAssets, saveAsset, deleteAsset, fetchTransactionsPaginated, fetchTransactionReportData } from '../apiService';

interface Props {
  transactions: Transaction[]; // Legacy Prop used for Report/Dashboard, but list will use pagination
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  contracts: Contract[];
  customers: Customer[];
  staff: Staff[];
  dbCategories: ExpenseCategoryItem[];
  setDbCategories: React.Dispatch<React.SetStateAction<ExpenseCategoryItem[]>>;
  currentUser: Staff;
  isQuickView?: boolean; // New prop for Quick Expense Entry
}

type SubTab = 'income' | 'expense' | 'fixed_costs' | 'assets' | 'breakeven';

interface CategoryHierarchy {
  [main: string]: string[];
}

const ExpenseManager: React.FC<Props> = ({ 
  transactions: globalTransactions, setTransactions: setGlobalTransactions, contracts, customers, staff, 
  dbCategories, setDbCategories, currentUser, isQuickView = false
}) => {
  const [activeSubTab, setActiveSubTab] = useState<SubTab>(isQuickView ? 'expense' : 'income');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false);
  const [isFixedCostModalOpen, setIsFixedCostModalOpen] = useState(false);
  
  // Pagination State for Transactions List
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [totalCount, setTotalCount] = useState(0);
  const [paginatedTransactions, setPaginatedTransactions] = useState<Transaction[]>([]);
  const [isLoadingTx, setIsLoadingTx] = useState(false);

  const [editingTxId, setEditingTxId] = useState<string | null>(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const [filterText, setFilterText] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const billInputRef = useRef<HTMLInputElement>(null);
  const [billFile, setBillFile] = useState<File | null>(null);

  // New States for Fixed Cost & Breakeven & Assets
  const [fixedCosts, setFixedCosts] = useState<FixedCost[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [editingFixedCost, setEditingFixedCost] = useState<Partial<FixedCost> | null>(null);
  const [editingAsset, setEditingAsset] = useState<Partial<Asset> | null>(null);
  const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);
  
  const [breakevenPeriod, setBreakevenPeriod] = useState<'month' | 'quarter' | 'year'>('month');
  const [breakevenResult, setBreakevenResult] = useState<BreakevenResult | null>(null);
  const [isLoadingFixed, setIsLoadingFixed] = useState(false);

  const canManageCategories = currentUser.username === 'admin' || currentUser.role === 'Giám đốc';
  const isAdmin = currentUser.username === 'admin' || currentUser.role === 'Giám đốc';

  const currentModulePerm = useMemo(() => {
    const financePerms = currentUser.permissions['finance'] || {};
    if (activeSubTab === 'income') return financePerms['income'] || { view: true, add: true, edit: true, delete: true, ownOnly: false };
    if (activeSubTab === 'expense') return financePerms['expense'] || { view: true, add: true, edit: true, delete: true, ownOnly: false };
    return { view: true, add: true, edit: true, delete: true, ownOnly: false }; // Default for other tabs
  }, [currentUser, activeSubTab]);

  // Load Fixed Costs and Assets when relevant tabs change
  useEffect(() => {
    if (['fixed_costs', 'breakeven', 'assets'].includes(activeSubTab)) {
      setIsLoadingFixed(true);
      Promise.all([
        fetchFixedCostsWithStaff(),
        fetchAssets()
      ]).then(([fcData, assetsData]) => {
        setFixedCosts(fcData);
        setAssets(assetsData);
        setIsLoadingFixed(false);
      });
    }
  }, [activeSubTab]);

  // Load Paginated Transactions when list tabs change or page/filter changes
  useEffect(() => {
    if ((activeSubTab === 'income' || activeSubTab === 'expense') && !isQuickView) {
      loadTransactions();
    }
  }, [activeSubTab, page, filterText, isQuickView]);

  const loadTransactions = async () => {
    setIsLoadingTx(true);
    const type = activeSubTab === 'income' ? TransactionType.INCOME : TransactionType.EXPENSE;
    try {
      const { data, count } = await fetchTransactionsPaginated(page, pageSize, type, filterText);
      setPaginatedTransactions(data);
      setTotalCount(count);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingTx(false);
    }
  };

  // Calculate Breakeven when data ready
  useEffect(() => {
    if (activeSubTab === 'breakeven' && fixedCosts.length > 0) {
      const now = new Date();
      let start, end;
      if (breakevenPeriod === 'month') {
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      } else if (breakevenPeriod === 'quarter') {
        const q = Math.floor(now.getMonth() / 3);
        start = new Date(now.getFullYear(), q * 3, 1);
        end = new Date(now.getFullYear(), q * 3 + 3, 0);
      } else {
        start = new Date(now.getFullYear(), 0, 1);
        end = new Date(now.getFullYear(), 11, 31);
      }
      
      fetchRevenueStreams().then(streams => {
        calculateBreakeven(start, end, fixedCosts, globalTransactions, streams).then(res => {
          setBreakevenResult(res);
        });
      });
    }
  }, [activeSubTab, breakevenPeriod, fixedCosts, globalTransactions, assets]); 

  const categories = useMemo(() => {
    const hierarchy: CategoryHierarchy = {};
    const mains = dbCategories.filter(c => c.level === 1).sort((a, b) => a.sortOrder - b.sortOrder);
    mains.forEach(main => {
      hierarchy[main.name] = dbCategories
        .filter(c => c.level === 2 && c.parentId === main.id)
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map(c => c.name);
    });
    if (Object.keys(hierarchy).length === 0) return { 'Chưa có danh mục': [] };
    return hierarchy;
  }, [dbCategories]);

  const findCatId = (name: string, level: number, parentName?: string) => {
    if (level === 1) {
      return dbCategories.find(c => c.level === 1 && c.name === name)?.id;
    }
    const parent = dbCategories.find(c => c.level === 1 && c.name === parentName);
    if (!parent) return undefined;
    return dbCategories.find(c => c.level === 2 && c.parentId === parent.id && c.name === name)?.id;
  };

  const [newMainCat, setNewMainCat] = useState('');
  const [activeMainCat, setActiveMainCat] = useState<string | null>(null);
  const [newSubCat, setNewSubCat] = useState('');

  const initialForm: Partial<Transaction> = {
    type: TransactionType.INCOME,
    date: new Date().toISOString().split('T')[0],
    amount: 0,
    description: '',
    mainCategory: 'Hợp đồng',
    category: 'Thu đợt 1',
    vendor: 'Chuyển khoản',
    staffId: currentUser.id,
    billImageUrl: ''
  };

  const [formData, setFormData] = useState<Partial<Transaction>>(initialForm);

  // Handlers
  const handleOpenAdd = (type: TransactionType) => {
    // If isQuickView is active, allow "All Staff" to add expenses
    if (!isQuickView) {
        const financePerms = currentUser.permissions['finance'] || {};
        const relevantPerm = type === TransactionType.INCOME 
          ? (financePerms['income'] || { view: true, add: true, edit: true, delete: true, ownOnly: false })
          : (financePerms['expense'] || { view: true, add: true, edit: true, delete: true, ownOnly: false });

        if (!relevantPerm.add) {
          alert(`Bạn không có quyền thêm giao dịch.`);
          return;
        }
    }

    setEditingTxId(null);
    setBillFile(null); 
    const firstMain = type === TransactionType.INCOME ? 'Hợp đồng' : Object.keys(categories)[0];
    const firstSub = type === TransactionType.INCOME ? 'Thu đợt 1' : categories[firstMain]?.[0] || 'Khác';
    setFormData({ ...initialForm, type, mainCategory: firstMain, category: firstSub, billImageUrl: '' });
    setIsModalOpen(true);
  };

  // --- AUTO OPEN MODAL IN QUICK VIEW ---
  useEffect(() => {
    if (isQuickView) {
      // Auto open Add Expense Modal when entering Quick View
      handleOpenAdd(TransactionType.EXPENSE);
    }
  }, [isQuickView]);

  const handleOpenEdit = (tx: Transaction) => {
    // In QuickView mode, staff can only edit their own, or apply standard permissions
    if (isQuickView) {
        // Simple logic: allow if staff matches, otherwise view only?
        // Let's rely on standard check for edits even in QuickView for safety
        if (tx.staffId !== currentUser.id && !isAdmin) {
            alert("Bạn chỉ có thể sửa phiếu chi của chính mình.");
            return;
        }
    } else {
        if (currentModulePerm.ownOnly && tx.staffId !== currentUser.id) {
           alert("Chỉ xem/sửa dữ liệu cá nhân.");
           return;
        }
        if (!currentModulePerm.edit) {
          alert("Không có quyền chỉnh sửa.");
          return;
        }
    }
    
    setEditingTxId(tx.id);
    setBillFile(null);
    setFormData({ ...tx });
    setIsModalOpen(true);
  };

  const handleBillUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) return alert("Ảnh quá lớn (max 5MB)");
      setBillFile(file);
      setIsUploading(true);
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, billImageUrl: reader.result as string }));
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!formData.description || !formData.amount) return alert("Thiếu thông tin");
    setIsSaving(true);
    let finalBillUrl = formData.billImageUrl;
    try {
      if (billFile) {
        setIsUploading(true);
        const staffName = staff.find(s => s.id === (formData.staffId || currentUser.id))?.name || 'Unknown';
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        try {
          const uploadRes = await uploadTransactionImage(billFile, {
             category: formData.mainCategory || 'Expense', timestamp, staffName
          });
          if (uploadRes.success && uploadRes.url) finalBillUrl = uploadRes.url;
        } catch (uploadErr) { console.error(uploadErr); } 
        finally { setIsUploading(false); }
      }
      const transactionPayload = { ...formData, billImageUrl: finalBillUrl } as Transaction;
      if (editingTxId) {
        const updatedTx = { ...transactionPayload, id: editingTxId };
        // Update both local pagination list and global list (optimistic)
        setPaginatedTransactions(prev => prev.map(t => t.id === editingTxId ? updatedTx : t));
        setGlobalTransactions(prev => prev.map(t => t.id === editingTxId ? updatedTx : t));
        await syncData('Transactions', 'UPDATE', updatedTx);
      } else {
        const newTx: Transaction = { id: Math.random().toString(36).substr(2, 9), ...transactionPayload };
        setPaginatedTransactions(prev => [newTx, ...prev]);
        setGlobalTransactions(prev => [newTx, ...prev]);
        await syncData('Transactions', 'CREATE', newTx);
      }
      setIsModalOpen(false);
      if(!isQuickView) loadTransactions(); // Refresh to be sure
    } catch (e: any) { alert(`Lỗi: ${e.message}`); } 
    finally { setIsSaving(false); }
  };

  const handleDelete = async () => {
    if (!editingTxId) return;
    // In QuickView, allow delete own items
    if (isQuickView) {
        const tx = paginatedTransactions.find(t => t.id === editingTxId);
        if (tx && tx.staffId !== currentUser.id && !isAdmin) {
            alert("Bạn chỉ có thể xóa phiếu chi của chính mình.");
            return;
        }
    } else if (!currentModulePerm.delete) {
        return alert("Không có quyền xóa.");
    }

    if (window.confirm("Xóa giao dịch này?")) {
      setIsSaving(true);
      try {
        setPaginatedTransactions(prev => prev.filter(t => t.id !== editingTxId));
        setGlobalTransactions(prev => prev.filter(t => t.id !== editingTxId));
        await syncData('Transactions', 'DELETE', { id: editingTxId });
        setIsModalOpen(false);
        loadTransactions();
      } catch (e: any) { alert(`Lỗi: ${e.message}`); } 
      finally { setIsSaving(false); }
    }
  };

  // Fixed Cost Handlers
  const handleSaveFixedCost = async () => {
    if (!editingFixedCost?.name || !editingFixedCost?.amount) return alert("Vui lòng nhập tên và số tiền");
    setIsSaving(true);
    try {
      const action = editingFixedCost.id ? 'UPDATE' : 'CREATE';
      const saved = await saveFixedCost(editingFixedCost, action);
      if (saved) {
        if (action === 'CREATE') setFixedCosts([...fixedCosts, saved]);
        else setFixedCosts(fixedCosts.map(fc => fc.id === saved.id ? saved : fc));
        setIsFixedCostModalOpen(false);
      }
    } catch (e: any) { alert(`Lỗi: ${e.message}`); }
    finally { setIsSaving(false); }
  };

  const handleDeleteFixedCost = async (id: string) => {
    if (window.confirm("Xóa chi phí cố định này?")) {
      await deleteFixedCost(id);
      setFixedCosts(prev => prev.filter(fc => fc.id !== id));
    }
  };

  // Asset Handlers
  const handleSaveAsset = async () => {
    if (!editingAsset?.name || !editingAsset?.value) return alert("Vui lòng nhập tên và giá trị tài sản");
    setIsSaving(true);
    try {
      const action = editingAsset.id ? 'UPDATE' : 'CREATE';
      const saved = await saveAsset(editingAsset, action);
      if (saved) {
        if (action === 'CREATE') setAssets([...assets, saved]);
        else setAssets(assets.map(a => a.id === saved.id ? saved : a));
        setIsAssetModalOpen(false);
      }
    } catch (e: any) { alert(`Lỗi: ${e.message}`); }
    finally { setIsSaving(false); }
  };

  const handleDeleteAsset = async (id: string) => {
    if (window.confirm("Xóa tài sản này? Dữ liệu khấu hao cũ sẽ bị ảnh hưởng.")) {
      await deleteAsset(id);
      setAssets(prev => prev.filter(a => a.id !== id));
    }
  };

  // Category CRUD
  const addMainCat = async () => {
    const name = newMainCat.trim();
    if (name && !categories[name]) {
      const newCat = await createExpenseCategory(name, 1, null);
      if (newCat) { setDbCategories(prev => [...prev, newCat]); setNewMainCat(''); }
    }
  };
  const addSubCat = async (mainName: string) => {
    const subName = newSubCat.trim();
    const parentId = findCatId(mainName, 1);
    if (subName && parentId) {
      const newCat = await createExpenseCategory(subName, 2, parentId);
      if (newCat) { setDbCategories(prev => [...prev, newCat]); setNewSubCat(''); }
    }
  };
  const deleteMainCat = async (mainName: string) => {
    const id = findCatId(mainName, 1);
    if (id && window.confirm(`Xóa ${mainName}?`)) {
      await deleteExpenseCategory(id);
      setDbCategories(prev => prev.filter(c => c.id !== id && c.parentId !== id));
    }
  };
  const deleteSubCat = async (mainName: string, subName: string) => {
    const id = findCatId(subName, 2, mainName);
    if (id) {
      await deleteExpenseCategory(id);
      setDbCategories(prev => prev.filter(c => c.id !== id));
    }
  };

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4'];

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
             <BarChart3 className="text-blue-600" /> {isQuickView ? 'Ghi Phiếu Chi' : 'Tài chính Studio'}
          </h2>
          <p className="text-slate-500 font-bold text-xs uppercase tracking-widest mt-1">
             {isQuickView ? 'Nhập liệu nhanh các khoản chi phí' : (currentModulePerm.ownOnly ? 'Chế độ dữ liệu cá nhân' : 'Hệ thống quản lý dòng tiền')}
          </p>
        </div>
        
        <div className="flex gap-4 w-full md:w-auto">
          {!isQuickView && isAdmin && (
             <div className="flex bg-slate-100 p-1 rounded-xl mr-2">
                <button onClick={() => { setActiveSubTab('income'); setPage(1); }} className={`px-3 py-2 rounded-lg text-xs font-bold transition-all ${activeSubTab === 'income' || activeSubTab === 'expense' ? 'bg-white shadow text-slate-900' : 'text-slate-400'}`}>Giao dịch</button>
                <button onClick={() => setActiveSubTab('fixed_costs')} className={`px-3 py-2 rounded-lg text-xs font-bold transition-all ${activeSubTab === 'fixed_costs' ? 'bg-white shadow text-slate-900' : 'text-slate-400'}`}>Định phí</button>
                <button onClick={() => setActiveSubTab('assets')} className={`px-3 py-2 rounded-lg text-xs font-bold transition-all ${activeSubTab === 'assets' ? 'bg-white shadow text-slate-900' : 'text-slate-400'}`}>Tài sản</button>
                <button onClick={() => setActiveSubTab('breakeven')} className={`px-3 py-2 rounded-lg text-xs font-bold transition-all ${activeSubTab === 'breakeven' ? 'bg-white shadow text-blue-600' : 'text-slate-400'}`}>Hòa vốn</button>
             </div>
          )}
          
          {!isQuickView && (
             <button onClick={() => handleOpenAdd(TransactionType.INCOME)} className="bg-emerald-600 text-white px-4 py-3 rounded-xl font-bold text-xs uppercase hover:bg-emerald-700 transition-all shadow-lg active:scale-95"><ArrowUpCircle size={18} className="inline mr-2"/>Ghi Thu</button>
          )}
          <button onClick={() => handleOpenAdd(TransactionType.EXPENSE)} className="bg-slate-900 text-white px-4 py-3 rounded-xl font-bold text-xs uppercase hover:bg-slate-800 transition-all shadow-lg active:scale-95"><ArrowDownCircle size={18} className="inline mr-2"/>Ghi Chi</button>
        </div>
      </div>

      {!isQuickView && ['income', 'expense'].includes(activeSubTab) && (
        <div className="flex bg-slate-200/50 p-1.5 rounded-3xl w-full max-w-2xl mx-auto shadow-inner border border-slate-200">
          <button onClick={() => { setActiveSubTab('income'); setPage(1); }} className={`flex-1 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeSubTab === 'income' ? 'bg-white text-emerald-600 shadow-xl' : 'text-slate-500'}`}>Danh sách Thu</button>
          <button onClick={() => { setActiveSubTab('expense'); setPage(1); }} className={`flex-1 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeSubTab === 'expense' ? 'bg-white text-red-600 shadow-xl' : 'text-slate-500'}`}>Danh sách Chi</button>
        </div>
      )}

      <div className="space-y-6">
        
        {/* ASSETS, FIXED COSTS, BREAKEVEN TABS */}
        
        {activeSubTab === 'assets' && isAdmin && !isQuickView && (
           <div className="space-y-6 animate-in fade-in">
             <div className="flex justify-between items-center">
                <div>
                   <h3 className="text-xl font-black text-slate-900">Quản lý Tài sản & Khấu hao</h3>
                   <p className="text-slate-400 text-xs">Các khoản đầu tư lớn sẽ được chia nhỏ vào chi phí hàng tháng</p>
                </div>
                <button 
                  onClick={() => { setEditingAsset({ status: 'Active', startDate: new Date().toISOString().split('T')[0], durationMonths: 12 }); setIsAssetModalOpen(true); }}
                  className="bg-purple-600 text-white px-5 py-2.5 rounded-xl font-bold text-xs uppercase hover:bg-purple-700 shadow-lg flex items-center gap-2"
                >
                  <Plus size={16} /> Thêm tài sản
                </button>
             </div>
             <div className="bg-white border border-slate-200 rounded-[2rem] overflow-hidden shadow-sm">
                <table className="w-full text-left">
                   <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400">
                      <tr>
                         <th className="px-6 py-4">Tên tài sản</th>
                         <th className="px-6 py-4 text-right">Giá trị gốc</th>
                         <th className="px-6 py-4 text-center">Thời gian KH</th>
                         <th className="px-6 py-4 text-center">Khấu hao/tháng</th>
                         <th className="px-6 py-4 text-center">Trạng thái</th>
                         <th className="px-6 py-4"></th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-50 text-sm">
                      {assets.map(asset => (
                         <tr key={asset.id} className="hover:bg-slate-50">
                            <td className="px-6 py-4">
                               <div className="font-bold text-slate-700">{asset.name}</div>
                               <div className="text-[10px] text-slate-400">Mua ngày: {asset.startDate}</div>
                            </td>
                            <td className="px-6 py-4 text-right font-black text-slate-900">{asset.value.toLocaleString()}đ</td>
                            <td className="px-6 py-4 text-center">
                               <span className="bg-blue-50 text-blue-600 px-2 py-1 rounded text-[10px] font-bold uppercase">{asset.durationMonths} tháng</span>
                            </td>
                            <td className="px-6 py-4 text-center text-purple-600 font-bold">
                               {(asset.monthlyDepreciation || 0).toLocaleString()}đ
                            </td>
                            <td className="px-6 py-4 text-center">
                               {asset.status === 'Active' ? <span className="text-emerald-500 font-bold text-[10px]">ĐANG SỬ DỤNG</span> : <span className="text-slate-400 font-bold text-[10px]">THANH LÝ</span>}
                            </td>
                            <td className="px-6 py-4 text-right">
                               <button onClick={() => handleDeleteAsset(asset.id)} className="text-red-400 hover:text-red-600 p-2"><Trash2 size={16}/></button>
                            </td>
                         </tr>
                      ))}
                      {assets.length === 0 && (
                         <tr><td colSpan={6} className="py-10 text-center text-slate-300 italic">Chưa có tài sản nào</td></tr>
                      )}
                   </tbody>
                </table>
             </div>
          </div>
        )}

        {activeSubTab === 'fixed_costs' && isAdmin && !isQuickView && (
           <div className="space-y-6 animate-in fade-in">
             <div className="flex justify-between items-center">
                <div>
                   <h3 className="text-xl font-black text-slate-900">Chi phí cố định (Định phí)</h3>
                   <p className="text-slate-400 text-xs">Các khoản chi bắt buộc hàng tháng/năm</p>
                </div>
                <button 
                  onClick={() => { setEditingFixedCost({ isActive: true, cycle: 'monthly', startDate: new Date().toISOString().split('T')[0] }); setIsFixedCostModalOpen(true); }}
                  className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold text-xs uppercase hover:bg-blue-700 shadow-lg flex items-center gap-2"
                >
                  <Plus size={16} /> Thêm định phí
                </button>
             </div>
             <div className="bg-white border border-slate-200 rounded-[2rem] overflow-hidden shadow-sm">
                <table className="w-full text-left">
                   <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400">
                      <tr>
                         <th className="px-6 py-4">Tên chi phí</th>
                         <th className="px-6 py-4 text-right">Số tiền</th>
                         <th className="px-6 py-4 text-center">Chu kỳ</th>
                         <th className="px-6 py-4 text-center">Nguồn</th>
                         <th className="px-6 py-4 text-center">Trạng thái</th>
                         <th className="px-6 py-4"></th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-50 text-sm">
                      {fixedCosts.map(fc => (
                         <tr key={fc.id} className="hover:bg-slate-50">
                            <td className="px-6 py-4 font-bold text-slate-700">{fc.name}</td>
                            <td className="px-6 py-4 text-right font-black text-slate-900">{fc.amount.toLocaleString()}đ</td>
                            <td className="px-6 py-4 text-center">
                               <span className="bg-blue-50 text-blue-600 px-2 py-1 rounded text-[10px] font-bold uppercase">{fc.cycle === 'monthly' ? 'Hàng tháng' : 'Hàng năm'}</span>
                            </td>
                            <td className="px-6 py-4 text-center">
                               {fc.isSystemGenerated ? (
                                  <span className="flex items-center justify-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded"><User size={12}/> Nhân sự</span>
                               ) : (
                                  <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded">Thủ công</span>
                               )}
                            </td>
                            <td className="px-6 py-4 text-center">
                               {fc.isActive ? <CheckCircle2 size={16} className="text-emerald-500 mx-auto"/> : <X size={16} className="text-slate-300 mx-auto"/>}
                            </td>
                            <td className="px-6 py-4 text-right">
                               {!fc.isSystemGenerated && (
                                  <button onClick={() => handleDeleteFixedCost(fc.id)} className="text-red-400 hover:text-red-600 p-2"><Trash2 size={16}/></button>
                               )}
                               {fc.isSystemGenerated && <span title="Đồng bộ từ Nhân sự"><Lock size={16} className="text-slate-300 inline-block p-0.5" /></span>}
                            </td>
                         </tr>
                      ))}
                   </tbody>
                </table>
             </div>
          </div>
        )}

        {activeSubTab === 'breakeven' && isAdmin && breakevenResult && !isQuickView && (
           <div className="space-y-8 animate-in fade-in">
              <div className="flex justify-between items-center bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200">
                 <div>
                    <h3 className="text-xl font-black text-slate-900 uppercase">Phân tích Hòa Vốn</h3>
                    <p className="text-slate-400 text-xs mt-1">Kỳ báo cáo: {breakevenPeriod === 'month' ? 'Tháng này' : breakevenPeriod === 'quarter' ? 'Quý này' : 'Năm nay'}</p>
                 </div>
                 <div className="flex bg-slate-100 p-1 rounded-xl">
                    <button onClick={() => setBreakevenPeriod('month')} className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase transition-all ${breakevenPeriod === 'month' ? 'bg-white shadow text-blue-600' : 'text-slate-400'}`}>Tháng</button>
                    <button onClick={() => setBreakevenPeriod('quarter')} className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase transition-all ${breakevenPeriod === 'quarter' ? 'bg-white shadow text-blue-600' : 'text-slate-400'}`}>Quý</button>
                    <button onClick={() => setBreakevenPeriod('year')} className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase transition-all ${breakevenPeriod === 'year' ? 'bg-white shadow text-blue-600' : 'text-slate-400'}`}>Năm</button>
                 </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                 <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200">
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Doanh thu thực</div>
                    <div className="text-2xl font-black text-emerald-600">{breakevenResult.totalRevenue.toLocaleString()}đ</div>
                 </div>
                 <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200">
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Định phí (Fixed + Khấu hao)</div>
                    <div className="text-2xl font-black text-slate-700">{breakevenResult.totalFixedCosts.toLocaleString()}đ</div>
                 </div>
                 <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200">
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Biến phí (Lương + MKT...)</div>
                    <div className="text-2xl font-black text-slate-700">{breakevenResult.totalVariableCosts.toLocaleString()}đ</div>
                 </div>
                 <div className={`p-6 rounded-[2rem] shadow-sm border ${breakevenResult.isProfitable ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                    <div className={`text-[10px] font-black uppercase tracking-widest mb-2 ${breakevenResult.isProfitable ? 'text-emerald-600' : 'text-red-600'}`}>Điểm hòa vốn</div>
                    <div className={`text-2xl font-black ${breakevenResult.isProfitable ? 'text-emerald-700' : 'text-red-700'}`}>{Math.round(breakevenResult.breakEvenPoint).toLocaleString()}đ</div>
                    <div className="text-[10px] font-bold mt-1 opacity-70">
                       {breakevenResult.isProfitable ? `Vượt ${breakevenResult.safetyMargin.toLocaleString()}đ` : `Thiếu ${Math.abs(breakevenResult.safetyMargin).toLocaleString()}đ`}
                    </div>
                 </div>
              </div>

              <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-200">
                 <h4 className="text-sm font-black text-slate-900 uppercase mb-6">Biểu đồ Lợi nhuận & Điểm hòa vốn</h4>
                 <div className="h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                       <ComposedChart data={[
                          { name: 'Chi phí Cố định', value: breakevenResult.totalFixedCosts },
                          { name: 'Điểm Hòa Vốn', value: breakevenResult.breakEvenPoint },
                          { name: 'Doanh Thu Hiện Tại', value: breakevenResult.totalRevenue }
                       ]}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="name" tick={{fontSize: 10}} />
                          <YAxis />
                          <Tooltip formatter={(value: number) => value.toLocaleString() + 'đ'} />
                          <Bar dataKey="value" barSize={60}>
                             {
                                [0, 1, 2].map((entry, index) => (
                                   <Cell key={`cell-${index}`} fill={index === 0 ? '#94a3b8' : index === 1 ? '#f59e0b' : breakevenResult.isProfitable ? '#10b981' : '#ef4444'} />
                                ))
                             }
                          </Bar>
                       </ComposedChart>
                    </ResponsiveContainer>
                 </div>
              </div>
           </div>
        )}

        {/* LIST TRANSACTIONS */}
        {!isQuickView && activeSubTab !== 'fixed_costs' && activeSubTab !== 'breakeven' && activeSubTab !== 'assets' && (
          <>
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input 
                  type="text" 
                  placeholder="Tìm giao dịch, hạng mục..." 
                  className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-sm"
                  value={filterText}
                  onChange={e => { setFilterText(e.target.value); setPage(1); }}
                />
              </div>
              {canManageCategories && (
                <button 
                  onClick={() => setIsCategoryManagerOpen(true)}
                  className="flex items-center gap-2 text-[10px] font-black uppercase bg-white text-slate-600 px-5 py-3 rounded-2xl border border-slate-200 hover:bg-slate-50 transition-all shadow-sm"
                >
                  <Settings size={16} /> Quản lý danh mục
                </button>
              )}
            </div>

            {isLoadingTx ? (
               <div className="p-10 flex justify-center items-center text-slate-400">
                  <Loader2 className="animate-spin mr-2" /> Đang tải giao dịch...
               </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-[2.5rem] overflow-hidden shadow-sm overflow-x-auto">
                <table className="w-full text-left min-w-[900px]">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Nội dung</th>
                      <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Danh mục Lớn</th>
                      <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Hạng mục con</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">P.Thức / N.Viên</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Hình ảnh</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Số tiền</th>
                      <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Ngày</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedTransactions.map(tx => (
                      <tr key={tx.id} onClick={() => handleOpenEdit(tx)} className="hover:bg-blue-50/30 transition-colors group cursor-pointer">
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-3">
                             <div className="font-black text-slate-800 text-sm">{tx.description}</div>
                          </div>
                          {tx.contractId && (
                             <div className="text-[10px] text-blue-500 font-bold uppercase mt-1">HĐ: {contracts.find(c => c.id === tx.contractId)?.contractCode || 'Lẻ'}</div>
                          )}
                        </td>
                        <td className="px-6 py-6">
                          <span className="bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase">{tx.mainCategory}</span>
                        </td>
                        <td className="px-6 py-6">
                           <span className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase ${tx.type === TransactionType.INCOME ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                             {tx.category}
                           </span>
                        </td>
                        <td className="px-6 py-6">
                           <div className="text-xs font-bold text-slate-600">{tx.vendor}</div>
                           <div className="text-[10px] text-slate-400">{staff.find(s => s.id === tx.staffId)?.name || '-'}</div>
                        </td>
                        <td className="px-6 py-6 text-center">
                          {tx.billImageUrl ? (
                            <button 
                              onClick={(e) => { 
                                e.stopPropagation(); 
                                window.open(tx.billImageUrl, '_blank'); 
                              }}
                              className="p-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                              title="Xem hình ảnh chứng từ"
                            >
                              <ImageIcon size={16} />
                            </button>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>
                        <td className="px-6 py-6 text-right">
                          <div className={`text-lg font-black ${tx.type === TransactionType.INCOME ? 'text-emerald-600' : 'text-slate-900'}`}>
                            {tx.type === TransactionType.INCOME ? '+' : '-'}{tx.amount.toLocaleString()}đ
                          </div>
                        </td>
                        <td className="px-8 py-6 text-right text-slate-400 text-sm font-bold">
                          {tx.date.split('-').reverse().join('/')}
                        </td>
                      </tr>
                    ))}
                    {paginatedTransactions.length === 0 && (
                      <tr><td colSpan={7} className="py-20 text-center text-slate-300 font-bold italic">Không tìm thấy giao dịch nào</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Controls */}
            <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
               <button 
                  disabled={page === 1 || isLoadingTx}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 text-slate-600 font-bold text-xs uppercase hover:bg-slate-200 disabled:opacity-50 transition-all"
               >
                  <ChevronLeft size={16} /> Trang trước
               </button>
               <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                  Trang {page} / {Math.ceil(totalCount / pageSize) || 1} (Tổng {totalCount})
               </span>
               <button 
                  disabled={page * pageSize >= totalCount || isLoadingTx}
                  onClick={() => setPage(p => p + 1)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 text-slate-600 font-bold text-xs uppercase hover:bg-slate-200 disabled:opacity-50 transition-all"
               >
                  Trang sau <ChevronRight size={16} />
               </button>
            </div>
          </>
        )}

        {/* Placeholder for QuickView when modal is closed */}
        {isQuickView && !isModalOpen && (
            <div className="flex flex-col items-center justify-center h-[50vh] text-slate-400 space-y-4">
                <p className="font-bold text-sm uppercase tracking-widest">Chế độ ghi nhanh</p>
                <button onClick={() => handleOpenAdd(TransactionType.EXPENSE)} className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-bold uppercase shadow-lg hover:bg-slate-700 transition-all">
                    + Tạo phiếu chi mới
                </button>
            </div>
        )}
      </div>

      {/* Asset Modal */}
      {isAssetModalOpen && editingAsset && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[110] flex items-center justify-center p-4">
           {/* ... (Existing Modal content) ... */}
           {/* Re-rendering Asset Modal to ensure context remains */}
           <div className="bg-white rounded-[3.5rem] w-full max-w-lg p-10 shadow-2xl space-y-8 animate-in zoom-in-95 duration-200">
              <div className="flex justify-between items-center">
                 <h3 className="text-2xl font-black text-slate-900">Thiết lập Tài sản</h3>
                 <button onClick={() => setIsAssetModalOpen(false)} className="w-10 h-10 flex items-center justify-center hover:bg-slate-100 rounded-full text-slate-300"><X size={24}/></button>
              </div>
              <div className="space-y-4">
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Tên tài sản</label>
                    <input className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold" placeholder="VD: Máy ảnh Sony A7R5..." value={editingAsset.name || ''} onChange={e => setEditingAsset({...editingAsset, name: e.target.value})} />
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Giá trị mua (VNĐ)</label>
                    <input type="number" className="w-full p-4 bg-white border-2 border-slate-900 rounded-2xl outline-none font-black text-xl" value={editingAsset.value || 0} onChange={e => setEditingAsset({...editingAsset, value: Number(e.target.value)})} />
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Thời gian khấu hao (Tháng)</label>
                        <input type="number" min="1" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-center" value={editingAsset.durationMonths || 12} onChange={e => setEditingAsset({...editingAsset, durationMonths: Number(e.target.value)})} />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Ngày mua</label>
                        <input type="date" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold" value={editingAsset.startDate} onChange={e => setEditingAsset({...editingAsset, startDate: e.target.value})} />
                    </div>
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Trạng thái</label>
                    <select className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold" value={editingAsset.status} onChange={e => setEditingAsset({...editingAsset, status: e.target.value as any})}>
                       <option value="Active">Đang sử dụng</option>
                       <option value="Liquidated">Đã thanh lý</option>
                    </select>
                 </div>
                 {editingAsset.value && editingAsset.durationMonths && (
                    <div className="bg-purple-50 p-4 rounded-2xl flex justify-between items-center text-purple-700">
                        <span className="text-xs font-bold uppercase">Mức khấu hao hàng tháng:</span>
                        <span className="font-black text-lg">{Math.round(editingAsset.value / editingAsset.durationMonths).toLocaleString()}đ</span>
                    </div>
                 )}
              </div>
              <button onClick={handleSaveAsset} disabled={isSaving} className="w-full py-4 bg-purple-600 text-white rounded-3xl font-black text-xs uppercase tracking-widest shadow-xl flex items-center justify-center gap-2">
                 {isSaving ? <Loader2 size={18} className="animate-spin"/> : <CheckCircle2 size={18}/>} Lưu tài sản
              </button>
           </div>
        </div>
      )}

      {/* Transaction & Category Modals (Already Existing in code block above) */}
      {/* Fixed Cost Modal (Already Existing in code block above) */}
      {isFixedCostModalOpen && editingFixedCost && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[110] flex items-center justify-center p-4">
           {/* ... (Existing Fixed Cost Modal content) ... */}
           <div className="bg-white rounded-[3.5rem] w-full max-w-lg p-10 shadow-2xl space-y-8 animate-in zoom-in-95 duration-200">
              <div className="flex justify-between items-center">
                 <h3 className="text-2xl font-black text-slate-900">Thiết lập Định phí</h3>
                 <button onClick={() => setIsFixedCostModalOpen(false)} className="w-10 h-10 flex items-center justify-center hover:bg-slate-100 rounded-full text-slate-300"><X size={24}/></button>
              </div>
              <div className="space-y-4">
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Tên chi phí</label>
                    <input className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold" placeholder="VD: Thuê mặt bằng, Internet..." value={editingFixedCost.name || ''} onChange={e => setEditingFixedCost({...editingFixedCost, name: e.target.value})} />
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Số tiền định kỳ</label>
                    <input type="number" className="w-full p-4 bg-white border-2 border-slate-900 rounded-2xl outline-none font-black text-xl" value={editingFixedCost.amount || 0} onChange={e => setEditingFixedCost({...editingFixedCost, amount: Number(e.target.value)})} />
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Chu kỳ lặp lại</label>
                    <select className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold" value={editingFixedCost.cycle} onChange={e => setEditingFixedCost({...editingFixedCost, cycle: e.target.value as any})}>
                       <option value="monthly">Hàng tháng</option>
                       <option value="quarterly">Hàng quý</option>
                       <option value="yearly">Hàng năm</option>
                    </select>
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Ngày bắt đầu tính</label>
                    <input type="date" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold" value={editingFixedCost.startDate} onChange={e => setEditingFixedCost({...editingFixedCost, startDate: e.target.value})} />
                 </div>
              </div>
              <button onClick={handleSaveFixedCost} disabled={isSaving} className="w-full py-4 bg-blue-600 text-white rounded-3xl font-black text-xs uppercase tracking-widest shadow-xl flex items-center justify-center gap-2">
                 {isSaving ? <Loader2 size={18} className="animate-spin"/> : <CheckCircle2 size={18}/>} Lưu định phí
              </button>
           </div>
        </div>
      )}
      
      {/* Category Manager Modal */}
      {isCategoryManagerOpen && canManageCategories && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[110] flex items-center justify-center p-4">
          {/* ... (Existing Category Manager Modal content) ... */}
          <div className="bg-white rounded-[3rem] w-full max-w-2xl p-10 shadow-2xl animate-in zoom-in-95 duration-200 border border-slate-100 flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center mb-8 bg-white shrink-0">
              <div className="flex items-center gap-3">
                 <div className="p-4 bg-slate-100 text-slate-600 rounded-2xl shadow-inner"><Settings size={24} /></div>
                 <div>
                   <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Cấu hình Danh mục chi</h3>
                   <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Quản lý phân cấp hạng mục Lớn - Con</p>
                 </div>
              </div>
              <button onClick={() => setIsCategoryManagerOpen(false)} className="w-12 h-12 flex items-center justify-center hover:bg-slate-100 rounded-full text-slate-400"><X size={28} /></button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-8 pr-2 scrollbar-hide">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-blue-600 uppercase ml-1 tracking-widest">Thêm hạng mục lớn mới</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="Tên hạng mục chính..." 
                    className="flex-1 p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-blue-600"
                    value={newMainCat}
                    onChange={e => setNewMainCat(e.target.value)}
                  />
                  <button onClick={addMainCat} className="bg-blue-600 text-white px-6 rounded-2xl hover:bg-blue-700 transition-all shadow-lg active:scale-95"><Plus size={24}/></button>
                </div>
              </div>

              <div className="space-y-4">
                {Object.keys(categories).map(main => (
                  <div key={main} className="bg-slate-50 rounded-3xl border border-slate-100 overflow-hidden group">
                     <div className="p-5 flex justify-between items-center bg-white border-b border-slate-100">
                        <div className="flex items-center gap-3">
                           <div className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center text-xs font-black">{main.charAt(0)}</div>
                           <h4 className="font-black text-slate-900 uppercase text-xs tracking-tight">{main}</h4>
                        </div>
                        <div className="flex items-center gap-2">
                           <button onClick={() => deleteMainCat(main)} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"><Trash2 size={16}/></button>
                        </div>
                     </div>
                     <div className="p-6 space-y-4 bg-slate-50/50">
                        <div className="flex flex-wrap gap-2">
                           {categories[main].map(sub => (
                             <div key={sub} className="flex items-center bg-white border border-slate-200 px-3 py-2 rounded-xl text-[10px] font-bold text-slate-600 group/sub">
                                {sub}
                                <button onClick={() => deleteSubCat(main, sub)} className="ml-2 text-slate-300 hover:text-red-500 opacity-0 group-hover/sub:opacity-100 transition-all"><X size={12}/></button>
                             </div>
                           ))}
                        </div>
                        <div className="flex gap-2 pt-2 border-t border-slate-100 border-dashed">
                           <input 
                            type="text" 
                            placeholder={`Thêm con cho ${main}...`} 
                            className="flex-1 bg-white p-2.5 rounded-xl text-xs outline-none border border-slate-200 focus:border-blue-500"
                            value={activeMainCat === main ? newSubCat : ''}
                            onFocus={() => setActiveMainCat(main)}
                            onChange={e => setNewSubCat(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && addSubCat(main)}
                           />
                           <button onClick={() => addSubCat(main)} className="bg-slate-900 text-white px-3 rounded-xl hover:bg-blue-600 transition-all"><Plus size={16}/></button>
                        </div>
                     </div>
                  </div>
                ))}
              </div>
            </div>
            <button onClick={() => setIsCategoryManagerOpen(false)} className="w-full mt-8 py-5 bg-blue-600 text-white rounded-3xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-500/20 active:scale-95 shrink-0">Hoàn tất</button>
          </div>
        </div>
      )}

      {/* Transaction Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
           {/* ... (Existing transaction modal content) ... */}
           <div className="bg-white rounded-[3.5rem] w-full max-w-xl p-10 shadow-2xl space-y-8 animate-in zoom-in-95 duration-200 border border-white/20">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 ${formData.type === TransactionType.INCOME ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'} rounded-2xl flex items-center justify-center shadow-inner`}>
                    {formData.type === TransactionType.INCOME ? <ArrowUpCircle size={30} /> : <ArrowDownCircle size={30} />}
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-900">{editingTxId ? 'Cập nhật giao dịch' : (formData.type === TransactionType.INCOME ? 'Thu tiền Studio' : 'Chi phí Studio')}</h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ghi nhận vào sổ quỹ hệ thống</p>
                  </div>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="w-12 h-12 flex items-center justify-center hover:bg-slate-100 rounded-full text-slate-300 transition-colors"><X size={28}/></button>
              </div>

              <div className="space-y-6 max-h-[60vh] overflow-y-auto scrollbar-hide pr-2">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase ml-1 tracking-widest">Nội dung diễn giải *</label>
                  <input 
                    type="text" 
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                    placeholder="Váy cưới cô dâu An, Tiền điện tháng 5..."
                    value={formData.description}
                    onChange={e => setFormData({...formData, description: e.target.value})}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase ml-1 tracking-widest">Số tiền (VNĐ) *</label>
                    <input 
                      type="number" 
                      className="w-full p-4 bg-white border-2 border-slate-900 rounded-2xl outline-none font-black text-xl"
                      value={formData.amount}
                      onChange={e => setFormData({...formData, amount: Number(e.target.value)})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase ml-1 tracking-widest">Ngày thực hiện</label>
                    <input 
                      type="date" 
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold cursor-pointer"
                      value={formData.date}
                      onChange={e => setFormData({...formData, date: e.target.value})}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase ml-1 tracking-widest">Hạng mục lớn</label>
                    <select 
                      className="w-full p-4 bg-slate-100 border border-slate-200 rounded-2xl outline-none font-black text-xs uppercase cursor-pointer"
                      value={formData.mainCategory}
                      onChange={e => {
                        const val = e.target.value;
                        setFormData({
                          ...formData, 
                          mainCategory: val, 
                          category: formData.type === TransactionType.INCOME ? 'Thu đợt 1' : (val === 'Lương nhân viên' ? 'Tạm ứng' : (categories[val]?.[0] || 'Khác'))
                        });
                      }}
                    >
                      {formData.type === TransactionType.INCOME ? (
                        <>
                          <option value="Hợp đồng">Hợp đồng</option>
                          <option value="Dịch vụ lẻ">Dịch vụ lẻ</option>
                          <option value="Khác">Thu nhập khác</option>
                        </>
                      ) : (
                        <>
                           <option value="Lương nhân viên">Lương nhân viên</option>
                           {Object.keys(categories).filter(c => c !== 'Lương nhân viên').map(c => <option key={c} value={c}>{c}</option>)}
                        </>
                      )}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase ml-1 tracking-widest">Hạng mục nhỏ</label>
                    <select 
                      className="w-full p-4 bg-white border border-slate-200 rounded-2xl outline-none font-bold text-xs cursor-pointer"
                      value={formData.category}
                      onChange={e => setFormData({...formData, category: e.target.value})}
                    >
                      {formData.type === TransactionType.INCOME ? (
                        <>
                          <option value="Thu đợt 1">Thu đợt 1</option>
                          <option value="Thu đợt 2">Thu đợt 2</option>
                          <option value="Thu đợt 3">Thu đợt 3</option>
                          <option value="Tất toán">Tất toán</option>
                        </>
                      ) : (
                        formData.mainCategory === 'Lương nhân viên' ? (
                           <>
                              <option value="Tạm ứng">Tạm ứng</option>
                              <option value="Thanh toán lương">Thanh toán lương</option>
                              <option value="Thưởng nóng">Thưởng nóng</option>
                           </>
                        ) : (
                           (categories[formData.mainCategory!] || ['Khác']).map(sub => (
                              <option key={sub} value={sub}>{sub}</option>
                           ))
                        )
                      )}
                    </select>
                  </div>
                </div>

                {formData.category === 'Tạm ứng' && formData.mainCategory === 'Lương nhân viên' && (
                    <div className="col-span-2 bg-blue-50 p-3 rounded-xl border border-blue-100 flex items-start gap-2">
                        <Info size={16} className="text-blue-600 mt-0.5 shrink-0" />
                        <div>
                            <p className="text-[10px] font-bold text-blue-700 uppercase">Liên kết tự động lương</p>
                            <p className="text-xs text-blue-600">Khoản này sẽ được tự động đưa vào mục <span className="font-bold">Khấu trừ Tạm ứng</span> khi bạn bấm "Magic Sync" bên module Lương.</p>
                        </div>
                    </div>
                )}

                {formData.type === TransactionType.EXPENSE && (
                  <div className="space-y-3 pt-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase ml-1 tracking-widest flex items-center gap-2">
                      <ImageIcon size={14} /> Ảnh hóa đơn / Chứng từ chi
                    </label>
                    <div className="flex items-center gap-6 p-6 bg-slate-50 rounded-[2rem] border border-dashed border-slate-200 group">
                      {formData.billImageUrl ? (
                        <div className="relative">
                          <img src={formData.billImageUrl} className="w-24 h-24 object-cover rounded-2xl shadow-md border-2 border-white" alt="Bill" />
                          <button 
                            onClick={() => {
                                setFormData({...formData, billImageUrl: ''});
                                setBillFile(null); // Clear selected file
                            }}
                            className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-red-600 transition-colors"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ) : (
                        <div 
                          onClick={() => billInputRef.current?.click()}
                          className="w-24 h-24 bg-white rounded-2xl border-2 border-slate-100 flex flex-col items-center justify-center text-slate-300 cursor-pointer hover:bg-blue-50 hover:text-blue-400 hover:border-blue-100 transition-all shadow-sm"
                        >
                          {isUploading ? <Loader2 size={24} className="animate-spin" /> : <Camera size={24} />}
                          <span className="text-[8px] font-black mt-1 uppercase">Tải ảnh</span>
                        </div>
                      )}
                      <div className="flex-1 space-y-1">
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Lưu trữ minh chứng chi tiền</p>
                        <input 
                          type="file" 
                          ref={billInputRef}
                          className="hidden" 
                          accept="image/*"
                          onChange={handleBillUpload}
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase ml-1 tracking-widest">Phương thức</label>
                    <select className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold" value={formData.vendor} onChange={e => setFormData({...formData, vendor: e.target.value})}>
                       <option value="Chuyển khoản">Chuyển khoản</option>
                       <option value="Tiền mặt">Tiền mặt</option>
                       <option value="Quẹt thẻ">Quẹt thẻ</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase ml-1 tracking-widest">
                      {formData.mainCategory === 'Lương nhân viên' ? 'Người nhận tiền' : 'Người thực hiện'}
                    </label>
                    <select className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold" value={formData.staffId} disabled={currentModulePerm.ownOnly} onChange={e => setFormData({...formData, staffId: e.target.value})}>
                       <option value="">-- Chọn nhân viên --</option>
                       {staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <div className="pt-6 flex gap-4 border-t border-slate-100">
                <button onClick={() => setIsModalOpen(false)} className="flex-1 py-4 text-slate-400 font-black text-xs uppercase tracking-widest">Hủy</button>
                <button 
                  onClick={handleSave}
                  disabled={isSaving || isUploading}
                  className="flex-[2] py-4 bg-slate-900 text-white font-black rounded-3xl text-xs uppercase tracking-widest shadow-xl active:scale-95 flex items-center justify-center gap-2 disabled:bg-slate-400"
                >
                  {isSaving || isUploading ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />} 
                  {editingTxId ? 'Lưu cập nhật' : 'Xác nhận ghi sổ'}
                </button>
              </div>
              {editingTxId && (
                <button onClick={handleDelete} disabled={isSaving} className="w-full text-red-500 font-bold text-[10px] uppercase tracking-widest hover:bg-red-50 py-3 rounded-2xl transition-all">
                  {isSaving ? <Loader2 size={14} className="inline mr-1 animate-spin" /> : <Trash2 size={14} className="inline mr-1" />}
                  Xóa giao dịch này
                </button>
              )}
           </div>
        </div>
      )}
    </div>
  );
};

export default ExpenseManager;
