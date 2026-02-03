
import React, { useState, useEffect, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { Plus, Search, X, Trash2, Calendar as CalIcon, User, CreditCard, Package, Settings, AlignLeft, MapPin, CalendarDays, AlertCircle, Loader2, CheckCircle2, History, Banknote, ArrowRight, CloudOff, Printer, ExternalLink, FileText, Briefcase, Wallet, Info, Tag, Edit3, UserPlus, Clock, Check, MessageSquare, FileCheck, Share2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Contract, ContractStatus, Service, Customer, Staff, ContractItem, Transaction, TransactionType, StudioInfo, Schedule } from '../types';
import { syncData, isConfigured, generateContractCode, createScheduleLabel, updateScheduleLabel, deleteScheduleLabel, fetchContractsPaginated } from '../apiService';
import ContractPrint from './ContractPrint';

interface Props {
  contracts: Contract[];
  setContracts: React.Dispatch<React.SetStateAction<Contract[]>>;
  customers: Customer[];
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
  transactions: Transaction[];
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  services: Service[];
  staff: Staff[];
  scheduleTypes: string[];
  setScheduleTypes: React.Dispatch<React.SetStateAction<string[]>>;
  studioInfo: StudioInfo;
  currentUser: Staff | null;
  serviceTypesList: string[];
  refreshTasks: () => Promise<void>; 
}

const ContractManager: React.FC<Props> = ({ 
  contracts, setContracts, customers, setCustomers, 
  transactions, setTransactions, services, staff, scheduleTypes, setScheduleTypes,
  studioInfo, currentUser, serviceTypesList, refreshTasks
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filterCode, setFilterCode] = useState('');
  const [filterName, setFilterName] = useState('');
  const [serviceSearch, setServiceSearch] = useState('');
  const [showServiceDropdown, setShowServiceDropdown] = useState(false);
  const [editingContractId, setEditingContractId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isManagingTypes, setIsManagingTypes] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');
  const [editingTypeIndex, setEditingTypeIndex] = useState<number | null>(null);
  const [editingTypeValue, setEditingTypeValue] = useState('');
  const [isItemEditModalOpen, setIsItemEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Partial<ContractItem> | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [editingTxInHistoryId, setEditingTxInHistoryId] = useState<string | null>(null);

  // Pagination State
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [totalCount, setTotalCount] = useState(0);
  const [paginatedContracts, setPaginatedContracts] = useState<Contract[]>([]);
  const [isLoadingContracts, setIsLoadingContracts] = useState(false);

  const paymentStages = ["Đặt cọc", "Đợt 1", "Đợt 2", "Đợt 3", "Đợt 4", "Đợt 5", "Thanh toán hết"];

  const initialForm = {
    contractCode: '',
    customerName: '',
    customerPhone: '',
    customerAddress: '',
    staffInChargeId: '',
    date: new Date().toISOString().split('T')[0],
    status: ContractStatus.SIGNED,
    serviceType: serviceTypesList[0] || 'DỊCH VỤ KHÁC',
    items: [] as ContractItem[],
    schedules: [] as Schedule[],
    paidAmount: 0,
    paymentMethod: 'Chuyển khoản',
    paymentStage: 'Đặt cọc',
    totalAmount: 0,
    terms: '',
    source: '' // New Field
  };

  const [form, setForm] = useState(initialForm);
  const [newPayment, setNewPayment] = useState({
    amount: 0,
    method: 'Chuyển khoản',
    stage: 'Đặt cọc',
    date: new Date().toISOString().split('T')[0],
    staffId: '' 
  });

  // Load contracts via pagination on mount or when page/filter changes
  useEffect(() => {
    loadContracts();
  }, [page, filterCode, filterName]);

  const loadContracts = async () => {
    setIsLoadingContracts(true);
    try {
      const { data, count } = await fetchContractsPaginated(page, pageSize, filterCode, filterName);
      setPaginatedContracts(data);
      setTotalCount(count);
    } catch (e) {
      console.error("Error loading contracts:", e);
    } finally {
      setIsLoadingContracts(false);
    }
  };

  const contractPayments = useMemo(() => {
    if (!editingContractId) return [];
    return transactions
      .filter(t => t.contractId === editingContractId && t.type === TransactionType.INCOME)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, editingContractId]);

  useEffect(() => {
    if (isModalOpen && !editingContractId) {
      const initNewContract = async () => {
        const nextCode = await generateContractCode();
        setForm(prev => ({ ...prev, contractCode: nextCode, staffInChargeId: currentUser?.id || '' }));
        setNewPayment(p => ({ ...p, amount: 0, date: new Date().toISOString().split('T')[0], staffId: currentUser?.id || '' }));
      };
      initNewContract();
    }
  }, [isModalOpen, editingContractId, currentUser]);

  const handleOpenEdit = (contract: Contract) => {
    // Priority: Nested customer data (from join) > Lookup in customers array (fallback)
    const customer = contract.customer || customers.find(c => c.id === contract.customerId);
    const payments = transactions.filter(t => t.contractId === contract.id && t.type === TransactionType.INCOME);
    setEditingContractId(contract.id);
    setForm({
      ...contract,
      customerName: customer?.name || '',
      customerPhone: customer?.phone || '',
      customerAddress: customer?.address || '',
      staffInChargeId: contract.staffInChargeId || '',
      items: contract.items || [],
      schedules: contract.schedules || [],
      paymentStage: contract.paymentStage || 'Đặt cọc',
      terms: contract.terms || '',
      source: contract.source || ''
    });
    const nextStage = payments.length === 0 ? "Đặt cọc" : payments.length >= 6 ? "Thanh toán hết" : `Đợt ${payments.length}`;
    setNewPayment({ amount: 0, method: contract.paymentMethod || 'Chuyển khoản', stage: nextStage, date: new Date().toISOString().split('T')[0], staffId: currentUser?.id || '' });
    setIsModalOpen(true);
  };

  const handleSaveContract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.customerName.trim() || form.items.length === 0) {
      setFormError("Vui lòng nhập Tên khách hàng và chọn ít nhất 1 dịch vụ.");
      return;
    }
    setIsSaving(true);
    setFormError(null);

    let effectivePaidAmount = form.paidAmount;
    let effectivePaymentMethod = form.paymentMethod;
    let effectivePaymentStage = form.paymentStage;
    let effectiveStaffId = form.staffInChargeId;

    if (!editingContractId && form.paidAmount === 0 && newPayment.amount > 0) {
       effectivePaidAmount = newPayment.amount;
       effectivePaymentMethod = newPayment.method;
       effectivePaymentStage = newPayment.stage;
       effectiveStaffId = newPayment.staffId || form.staffInChargeId;
       
       setForm(prev => ({
          ...prev,
          paidAmount: effectivePaidAmount,
          paymentMethod: effectivePaymentMethod,
          paymentStage: effectivePaymentStage,
          staffInChargeId: effectiveStaffId
       }));
    }

    try {
      let customerId = '';
      const existingCust = customers.find(c => c.phone === form.customerPhone);
      const customerObj = { id: existingCust ? existingCust.id : 'cust-' + Math.random().toString(36).substr(2, 9), name: form.customerName, phone: form.customerPhone, address: form.customerAddress };
      
      const custRes = await syncData('customers', existingCust ? 'UPDATE' : 'CREATE', customerObj);
      const savedCustomer = custRes.data || customerObj;
      
      if (existingCust) {
        setCustomers(prev => prev.map(c => c.id === savedCustomer.id ? savedCustomer : c));
      } else {
        setCustomers(prev => [...prev, savedCustomer]);
      }
      
      customerId = savedCustomer.id;

      const contractId = editingContractId || 'con-' + Math.random().toString(36).substr(2, 9);
      const creatorId = currentUser?.id || (staff.length > 0 ? staff[0].id : undefined);

      let finalContractCode = form.contractCode;
      
      if (!editingContractId) {
         finalContractCode = await generateContractCode();
         setForm(prev => ({ ...prev, contractCode: finalContractCode }));
      }

      const contractPayload = { 
        ...form, 
        id: contractId,
        contractCode: finalContractCode,
        customerId, 
        createdBy: creatorId,
        paidAmount: effectivePaidAmount,
        paymentMethod: effectivePaymentMethod,
        paymentStage: effectivePaymentStage,
        staffInChargeId: effectiveStaffId 
      };
      
      const res = await syncData('contracts', editingContractId ? 'UPDATE' : 'CREATE', contractPayload);
      const savedData = res.data; 
      
      if (!editingContractId && effectivePaidAmount > 0) {
           const txObj: Transaction = {
             id: 'tx-' + Math.random().toString(36).substr(2, 9),
             type: TransactionType.INCOME,
             mainCategory: 'Hợp đồng',
             category: effectivePaymentStage || 'Thu đợt 1',
             amount: effectivePaidAmount,
             description: `Thanh toán ${effectivePaymentStage} HĐ ${finalContractCode}`,
             date: form.date,
             contractId: savedData.id, 
             vendor: effectivePaymentMethod,
             staffId: effectiveStaffId || creatorId
           };
           const collector = staff.find(s => s.id === txObj.staffId);
           setTransactions(prev => [txObj, ...prev]);

           await syncData('transactions', 'CREATE', { 
             ...txObj, 
             contractCode: finalContractCode, 
             staffName: collector?.name || 'Admin' 
           });
      }

      await refreshTasks(); 
      await loadContracts(); 

      setIsModalOpen(false);
    } catch (err: any) {
      setFormError(err.message || "Lỗi lưu dữ liệu Cloud");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteContract = async () => {
    if (!editingContractId) return;
    if (window.confirm("Bạn có chắc chắn muốn xóa hợp đồng này?")) {
      setIsSaving(true);
      try {
        await syncData('contracts', 'DELETE', { id: editingContractId });
        setContracts(prev => prev.filter(c => c.id !== editingContractId)); 
        await loadContracts(); 
        await refreshTasks();
        setIsModalOpen(false);
      } catch (e: any) { alert("Lỗi khi xóa"); } finally { setIsSaving(false); }
    }
  };

  const handleSelectService = (service: Service) => {
    const newItem: ContractItem = {
      id: 'it-' + Math.random().toString(36).substr(2, 9),
      contractId: editingContractId || '',
      serviceId: service.ma_dv,
      serviceName: service.ten_dv,
      serviceDescription: service.chi_tiet_dv || '', 
      unitPrice: service.don_gia,
      quantity: 1,
      discount: 0,
      subtotal: service.don_gia,
      notes: '',
      salesPersonId: form.staffInChargeId || currentUser?.id || '' 
    };
    
    setEditingItem(newItem);
    setIsItemEditModalOpen(true);
    setShowServiceDropdown(false);
    setServiceSearch('');
  };

  const handleUpdateSchedule = (id: string, updates: Partial<Schedule>) => {
    setForm({
      ...form,
      schedules: form.schedules.map(s => s.id === id ? { ...s, ...updates } : s)
    });
  };

  const handleRemoveSchedule = (id: string) => {
    setForm({
      ...form,
      schedules: form.schedules.filter(s => s.id !== id)
    });
  };

  const handleAddScheduleType = async () => {
    const trimmed = newTypeName.trim();
    if (trimmed && !scheduleTypes.includes(trimmed)) {
      try {
        await createScheduleLabel(trimmed);
        setScheduleTypes(prev => [...prev, trimmed]);
        setNewTypeName('');
      } catch (e: any) {
        alert("Lỗi khi lưu nhãn mới: " + e.message);
      }
    }
  };

  const handleUpdateScheduleType = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (editingTypeIndex !== null && editingTypeValue.trim()) {
      const oldVal = scheduleTypes[editingTypeIndex];
      const newVal = editingTypeValue.trim();
      
      try {
        await updateScheduleLabel(oldVal, newVal);
        
        setScheduleTypes(prev => {
          const newList = [...prev];
          newList[editingTypeIndex] = newVal;
          return newList;
        });
        
        setForm(prev => ({
          ...prev,
          schedules: prev.schedules.map(s => s.type === oldVal ? { ...s, type: newVal } : s)
        }));
        
        setEditingTypeIndex(null);
      } catch (e: any) {
        alert("Lỗi khi cập nhật nhãn: " + e.message);
      }
    }
  };

  const handleDeleteScheduleType = async (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    const typeToDelete = scheduleTypes[index];
    if (window.confirm(`Xóa loại lịch "${typeToDelete}"? Các lịch trình đang dùng loại này sẽ cần được gán lại.`)) {
      try {
        await deleteScheduleLabel(typeToDelete);
        setScheduleTypes(prev => prev.filter((_, i) => i !== index));
      } catch (e: any) {
        alert("Lỗi khi xóa nhãn: " + e.message);
      }
    }
  };

  const handleEditItem = (item: ContractItem) => {
    setEditingItem({ ...item });
    setIsItemEditModalOpen(true);
  };

  const handlePreviewPDF = () => {
    const formData = form as any;
    
    const contractData = { 
        ...form, 
        id: editingContractId || 'temp-id',
        customerId: formData.customerId || 'temp-cust-id',
        createdBy: formData.createdBy || currentUser?.id || 'system'
    } as unknown as Contract;

    const customerData = customers.find((c) => c.phone === form.customerPhone) || { id: 'temp-cust', name: form.customerName, phone: form.customerPhone, address: form.customerAddress } as Customer;
    
    const staffData = staff.find(s => s.id === form.staffInChargeId);
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        alert("Trình duyệt đã chặn cửa sổ pop-up. Vui lòng cho phép để in.");
        return;
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>In Hợp Đồng - ${contractData.contractCode}</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Times+New+Roman:wght@400;700&display=swap');
            body { font-family: 'Times New Roman', serif; background: #525659; margin: 0; padding: 20px; min-height: 100vh; display: flex; justify-content: center; padding-top: 80px; }
            .print-container { background: white; padding: 15mm 20mm; width: 210mm; min-height: 297mm; box-shadow: 0 0 10px rgba(0,0,0,0.5); }
            .control-bar { position: fixed; top: 0; left: 0; right: 0; background: #323639; padding: 15px; display: flex; justify-content: center; gap: 15px; z-index: 1000; box-shadow: 0 2px 10px rgba(0,0,0,0.3); }
            .btn { padding: 10px 20px; font-weight: bold; border-radius: 8px; cursor: pointer; text-transform: uppercase; font-size: 12px; border: none; transition: background 0.2s; }
            .btn-close { background: #4b5563; color: white; }
            .btn-close:hover { background: #374151; }
            .btn-print { background: #2563eb; color: white; }
            .btn-print:hover { background: #1d4ed8; }
            
            @media print {
              body { background: white; padding: 0; display: block; padding-top: 0; }
              .print-container { width: 100%; box-shadow: none; padding: 0; margin: 0; }
              .control-bar { display: none !important; }
              @page { margin: 1cm; size: A4; }
            }
          </style>
        </head>
        <body>
          <div class="control-bar">
             <button class="btn btn-close" onclick="window.close()">Đóng</button>
             <button class="btn btn-print" onclick="window.print()">Xác nhận Lưu & In</button>
          </div>
          <div id="print-root" class="print-container"></div>
        </body>
      </html>
    `);
    printWindow.document.close();

    const printRoot = printWindow.document.getElementById('print-root');
    if (printRoot) {
        const root = createRoot(printRoot);
        root.render(
            <ContractPrint 
                contract={contractData}
                customer={customerData}
                staff={staffData}
                transactions={contractPayments}
                services={services}
                studioInfo={studioInfo}
            />
        );
    }
  };

  const handleAddSchedule = () => {
    const newSch: Schedule = {
      id: 'sch-' + Math.random().toString(36).substr(2, 9),
      contractId: editingContractId || '',
      type: scheduleTypes[0] || 'Tư vấn',
      date: new Date().toISOString().split('T')[0],
      notes: '',
      assignments: []
    };
    setForm({ ...form, schedules: [...form.schedules, newSch] });
  };

  const formatDisplayDate = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  };

  const handleAddExtraPayment = async () => {
    if (!editingContractId || newPayment.amount <= 0) return;
    setIsSaving(true);
    try {
      const txObj: Transaction = {
        id: 'tx-' + Math.random().toString(36).substr(2, 9),
        type: TransactionType.INCOME,
        mainCategory: 'Hợp đồng',
        category: newPayment.stage,
        amount: newPayment.amount,
        description: `Thanh toán ${newPayment.stage} HĐ ${form.contractCode}`,
        date: newPayment.date,
        contractId: editingContractId,
        vendor: newPayment.method,
        staffId: newPayment.staffId || currentUser?.id
      };

      const res = await syncData('transactions', 'CREATE', { 
        ...txObj, 
        contractCode: form.contractCode,
        staffName: staff.find(s => s.id === txObj.staffId)?.name || 'N/A'
      });
      
      if (res.success) {
        setTransactions(prev => [txObj, ...prev]);
        setContracts(prev => prev.map(c => c.id === editingContractId ? { ...c, paidAmount: c.paidAmount + txObj.amount } : c));
        setForm(prev => ({ ...prev, paidAmount: prev.paidAmount + txObj.amount }));
        setNewPayment({
          ...newPayment,
          amount: 0,
          date: new Date().toISOString().split('T')[0],
          staffId: currentUser?.id || ''
        });
        await loadContracts(); 
        alert("Đã thêm thanh toán thành công");
      }
    } catch (e: any) {
      alert("Lỗi khi thêm thanh toán: " + e.message);
    } finally {
      setIsSaving(false);
    }
  };

  const filteredServices = services.filter(s => 
    s.name.toLowerCase().includes(serviceSearch.toLowerCase()) ||
    (s.type && s.type.toLowerCase().includes(serviceSearch.toLowerCase())) ||
    (s.ma_dv && s.ma_dv.toLowerCase().includes(serviceSearch.toLowerCase())) || 
    (s.code && s.code.toLowerCase().includes(serviceSearch.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-wrap gap-3">
          {/* SEARCH BY CODE */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input 
              type="text" 
              placeholder="Mã hợp đồng..." 
              className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm w-48 focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm" 
              value={filterCode} 
              onChange={e => {
                setFilterCode(e.target.value);
                setPage(1); 
              }} 
            />
          </div>
          {/* SEARCH BY NAME */}
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input 
              type="text" 
              placeholder="Tên khách hàng..." 
              className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm w-48 focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm" 
              value={filterName} 
              onChange={e => {
                setFilterName(e.target.value);
                setPage(1); 
              }} 
            />
          </div>
        </div>
        <button onClick={() => { setEditingContractId(null); setForm(initialForm); setIsModalOpen(true); }} className="flex items-center justify-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-blue-700 shadow-lg active:scale-95 transition-all"><Plus size={18} /> Tạo hợp đồng mới</button>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        {isLoadingContracts ? (
          <div className="p-10 flex justify-center items-center text-slate-400">
             <Loader2 className="animate-spin mr-2" /> Đang tải dữ liệu...
          </div>
        ) : (
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Mã HĐ</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Khách hàng</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-right">Tổng tiền</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-right">Còn nợ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedContracts.map(contract => {
                const custName = contract.customer?.name 
                  || customers.find(c => c.id === contract.customerId)?.name 
                  || '---';
                
                return (
                  <tr key={contract.id} onClick={() => handleOpenEdit(contract)} className="hover:bg-blue-50/30 transition-colors cursor-pointer group">
                    <td className="px-6 py-4 font-bold text-blue-600">{contract.contractCode}</td>
                    <td className="px-6 py-4 font-bold text-slate-700">{custName}</td>
                    <td className="px-6 py-4 text-right font-bold text-slate-900">{contract.totalAmount.toLocaleString()}đ</td>
                    <td className="px-6 py-4 text-right font-bold text-red-500">{(contract.totalAmount - contract.paidAmount).toLocaleString()}đ</td>
                  </tr>
                );
              })}
              {paginatedContracts.length === 0 && (
                <tr><td colSpan={4} className="p-8 text-center text-slate-400 italic">Không tìm thấy hợp đồng nào</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
         <button 
            disabled={page === 1 || isLoadingContracts}
            onClick={() => setPage(p => Math.max(1, p - 1))}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 text-slate-600 font-bold text-xs uppercase hover:bg-slate-200 disabled:opacity-50 transition-all"
         >
            <ChevronLeft size={16} /> Trang trước
         </button>
         <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">
            Trang {page} / {Math.ceil(totalCount / pageSize) || 1} (Tổng {totalCount})
         </span>
         <button 
            disabled={page * pageSize >= totalCount || isLoadingContracts}
            onClick={() => setPage(p => p + 1)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 text-slate-600 font-bold text-xs uppercase hover:bg-slate-200 disabled:opacity-50 transition-all"
         >
            Trang sau <ChevronRight size={16} />
         </button>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] w-full max-w-5xl overflow-hidden flex flex-col max-h-[95vh] shadow-2xl">
            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between shrink-0">
               <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white">
                  <CalIcon size={20} />
                </div>
                <div className="flex flex-col">
                  <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">
                    {editingContractId ? `Sửa HĐ ${form.contractCode}` : 'Tạo Hợp đồng mới'}
                  </h2>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                     Mã HĐ: {form.contractCode}
                  </span>
                </div>
               </div>
               <div className="flex gap-2">
                 <button 
                    onClick={handlePreviewPDF} 
                    className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-xl hover:bg-slate-900 text-xs font-bold uppercase transition-all shadow-lg active:scale-95"
                 >
                    <FileCheck size={16}/> Kiểm tra và xuất PDF
                 </button>
                 <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full"><X size={24} /></button>
               </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-8 scrollbar-hide">
               <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 <div className="space-y-1">
                   <label className="text-[10px] font-bold text-slate-400 uppercase">Mã hợp đồng (Tự động)</label>
                   <input 
                      className="w-full p-3 bg-slate-100 border border-slate-200 rounded-xl font-black text-blue-600 cursor-not-allowed" 
                      value={form.contractCode} 
                      disabled={true} 
                      title="Mã hợp đồng được sinh tự động theo quy tắc STTyymmxx"
                   />
                 </div>
                 <div className="space-y-1">
                   <label className="text-[10px] font-bold text-slate-400 uppercase">Tên khách hàng</label>
                   <input className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold" value={form.customerName} onChange={e => setForm({...form, customerName: e.target.value})} />
                 </div>
                 <div className="space-y-1">
                   <label className="text-[10px] font-bold text-slate-400 uppercase">Số điện thoại</label>
                   <input className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold" value={form.customerPhone} onChange={e => setForm({...form, customerPhone: e.target.value})} />
                 </div>
                 <div className="space-y-1">
                   <label className="text-[10px] font-bold text-slate-400 uppercase">Ngày ký</label>
                   <input type="date" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold" value={form.date} onChange={e => setForm({...form, date: e.target.value})} />
                 </div>
                 <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Địa chỉ</label>
                    <input className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold" value={form.customerAddress} onChange={e => setForm({...form, customerAddress: e.target.value})} />
                 </div>
                 <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Nguồn khách hàng</label>
                    <input 
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold placeholder-slate-300" 
                        placeholder="VD: Facebook, Người quen..."
                        value={form.source} 
                        onChange={e => setForm({...form, source: e.target.value})} 
                    />
                 </div>
                 <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Nhân viên phụ trách</label>
                    <select className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold cursor-pointer" value={form.staffInChargeId} onChange={e => setForm({...form, staffInChargeId: e.target.value})}>
                       <option value="">-- Chọn nhân viên --</option>
                       {staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                 </div>
                 <div className="space-y-1 md:col-span-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Loại dịch vụ chính</label>
                    <select className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold cursor-pointer" value={form.serviceType} onChange={e => setForm({...form, serviceType: e.target.value})}>
                       {serviceTypesList.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                 </div>
               </div>

               <div className="space-y-4">
                 <div className="flex justify-between items-center">
                   <h3 className="font-bold text-blue-600 text-xs uppercase tracking-widest flex items-center gap-2"><Package size={16}/> 1. Danh sách dịch vụ</h3>
                   <div className="relative">
                     <button onClick={() => setShowServiceDropdown(!showServiceDropdown)} className="text-[10px] font-bold bg-blue-600 text-white px-4 py-2 rounded-xl">+ Thêm dịch vụ</button>
                     {showServiceDropdown && (
                       <div className="absolute right-0 mt-2 w-72 bg-white border rounded-xl shadow-xl z-50 max-h-60 overflow-y-auto flex flex-col">
                         <div className="sticky top-0 bg-white border-b p-2 z-10">
                            <input 
                              autoFocus
                              placeholder="Tìm tên hoặc mã dịch vụ..." 
                              className="w-full p-2 text-xs border rounded-lg outline-none bg-slate-50 focus:bg-white focus:border-blue-500"
                              value={serviceSearch}
                              onChange={e => setServiceSearch(e.target.value)}
                            />
                         </div>
                         {filteredServices.length > 0 ? filteredServices.map(s => (
                           <button key={s.ma_dv} onClick={() => handleSelectService(s)} className="w-full text-left p-3 hover:bg-blue-50 text-xs font-bold border-b last:border-0 flex justify-between items-center group">
                              <span>{s.ten_dv}</span>
                              <span className="text-[10px] text-slate-400 group-hover:text-blue-500">{s.ma_dv}</span>
                           </button>
                         )) : (
                           <div className="p-3 text-xs text-slate-400 text-center italic">Không tìm thấy dịch vụ</div>
                         )}
                       </div>
                     )}
                   </div>
                 </div>
                 <div className="border rounded-2xl overflow-hidden">
                   <table className="w-full text-sm">
                     <thead className="bg-slate-50"><tr><th className="p-3 text-left">Dịch vụ</th><th className="p-3 text-right">Giá</th><th className="p-3 text-center">SL</th><th className="p-3 text-right">Giảm</th><th className="p-3 text-right">Thành tiền</th><th className="w-10"></th></tr></thead>
                     <tbody>
                       {form.items.map(item => (
                         <tr key={item.id} className="border-t cursor-pointer hover:bg-slate-50" onClick={() => handleEditItem(item)}>
                           <td className="p-3 font-medium">
                              <div>{item.serviceName}</div>
                              {item.serviceDescription && <div className="text-[10px] text-slate-400 truncate max-w-[200px]">{item.serviceDescription}</div>}
                              {item.salesPersonId && <div className="text-[9px] text-blue-500 font-bold uppercase mt-1">Sale: {staff.find(s => s.id === item.salesPersonId)?.name}</div>}
                           </td>
                           <td className="p-3 text-right">{item.unitPrice.toLocaleString()}</td>
                           <td className="p-3 text-center">{item.quantity}</td>
                           <td className="p-3 text-right text-red-500">{item.discount > 0 ? `-${item.discount.toLocaleString()}` : '-'}</td>
                           <td className="p-3 text-right font-bold">{item.subtotal.toLocaleString()}đ</td>
                           <td className="p-3 text-center">
                              <button onClick={(e) => { e.stopPropagation(); setForm({...form, items: form.items.filter(i => i.id !== item.id), totalAmount: form.totalAmount - item.subtotal}); }} className="text-slate-300 hover:text-red-500"><Trash2 size={14}/></button>
                           </td>
                         </tr>
                       ))}
                     </tbody>
                     <tfoot className="bg-slate-50 font-bold">
                        <tr>
                           <td colSpan={4} className="p-3 text-right uppercase text-xs">Tổng cộng:</td>
                           <td className="p-3 text-right text-lg">{form.totalAmount.toLocaleString()}đ</td>
                           <td></td>
                        </tr>
                     </tfoot>
                   </table>
                 </div>
               </div>

               <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                       <h3 className="font-bold text-emerald-600 text-xs uppercase tracking-widest flex items-center gap-2"><CalIcon size={16}/> 2. Lịch trình công việc</h3>
                       <button onClick={() => setIsManagingTypes(!isManagingTypes)} className="text-slate-400 hover:text-blue-500 p-1"><Settings size={14}/></button>
                    </div>
                    <button onClick={handleAddSchedule} className="text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-200 px-4 py-2 rounded-xl">+ Thêm mốc thời gian</button>
                  </div>
                  
                  {isManagingTypes && (
                     <div className="p-4 bg-slate-50 border border-dashed rounded-2xl mb-4">
                        <div className="flex gap-2 mb-2">
                           <input className="flex-1 p-2 border rounded-lg text-xs" placeholder="Nhập tên lịch mới..." value={newTypeName} onChange={e => setNewTypeName(e.target.value)} />
                           <button onClick={handleAddScheduleType} className="px-3 bg-blue-600 text-white rounded-lg text-xs font-bold">Thêm</button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                           {scheduleTypes.map((t, idx) => (
                              <span key={idx} className="bg-white border px-2 py-1 rounded text-xs flex items-center gap-1">
                                 {t} <button onClick={(e) => handleDeleteScheduleType(e, idx)} className="text-red-400 hover:text-red-600"><X size={10}/></button>
                              </span>
                           ))}
                        </div>
                     </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {form.schedules.map(sch => (
                      <div key={sch.id} className="p-4 bg-slate-50 border rounded-2xl space-y-3 relative group">
                         <button onClick={() => handleRemoveSchedule(sch.id)} className="absolute top-2 right-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={14}/></button>
                         <div className="flex justify-between">
                           <select className="bg-white border rounded-lg p-1 text-xs font-bold w-1/2" value={sch.type} onChange={e => handleUpdateSchedule(sch.id, { type: e.target.value })}>
                             {scheduleTypes.map(t => <option key={t} value={t}>{t}</option>)}
                           </select>
                           <input type="date" className="bg-white border rounded-lg p-1 text-xs font-bold" value={sch.date} onChange={e => handleUpdateSchedule(sch.id, { date: e.target.value })} />
                         </div>
                         <textarea className="w-full p-2 bg-white border rounded-xl text-xs" placeholder="Ghi chú..." value={sch.notes} onChange={e => handleUpdateSchedule(sch.id, { notes: e.target.value })} />
                      </div>
                    ))}
                  </div>
               </div>

               <div className="space-y-4 pt-4 border-t border-slate-100">
                  <h3 className="font-bold text-purple-600 text-xs uppercase tracking-widest flex items-center gap-2"><Wallet size={16}/> 3. Thanh toán</h3>
                  
                  {editingContractId && (
                     <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 mb-4">
                        <table className="w-full text-xs text-left">
                           <thead><tr><th className="p-2">Ngày</th><th className="p-2">Nội dung</th><th className="p-2 text-right">Số tiền</th></tr></thead>
                           <tbody>
                              {contractPayments.map(p => (
                                 <tr key={p.id} className="border-t border-slate-200">
                                    <td className="p-2">{formatDisplayDate(p.date)}</td>
                                    <td className="p-2">{p.description}</td>
                                    <td className="p-2 text-right font-bold text-emerald-600">+{p.amount.toLocaleString()}đ</td>
                                 </tr>
                              ))}
                           </tbody>
                        </table>
                     </div>
                  )}

                  <div className="bg-purple-50 p-4 rounded-2xl border border-purple-100 space-y-3">
                     <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-purple-800 uppercase">{editingContractId ? 'Thêm thanh toán mới' : 'Thanh toán đợt đầu'}</span>
                     </div>
                     <div className="grid grid-cols-2 gap-3">
                        <div>
                           <label className="text-[9px] font-bold text-slate-500 uppercase">Số tiền</label>
                           <div className="relative">
                              <input type="number" className="w-full p-2 rounded-lg border border-purple-200 font-bold text-purple-700" value={newPayment.amount} onChange={e => setNewPayment({...newPayment, amount: Number(e.target.value)})} />
                              <button onClick={() => {
                                 const remaining = editingContractId ? (form.totalAmount - form.paidAmount) : form.totalAmount;
                                 setNewPayment({...newPayment, amount: remaining});
                              }} className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-bold text-blue-600">ALL</button>
                           </div>
                        </div>
                        <div>
                           <label className="text-[9px] font-bold text-slate-500 uppercase">Ngày thu</label>
                           <input type="date" className="w-full p-2 rounded-lg border border-purple-200 font-bold" value={newPayment.date} onChange={e => setNewPayment({...newPayment, date: e.target.value})} />
                        </div>
                        <div>
                           <label className="text-[9px] font-bold text-slate-500 uppercase">Hình thức</label>
                           <select className="w-full p-2 rounded-lg border border-purple-200 text-xs" value={newPayment.method} onChange={e => setNewPayment({...newPayment, method: e.target.value})}>
                              <option value="Chuyển khoản">Chuyển khoản</option>
                              <option value="Tiền mặt">Tiền mặt</option>
                              <option value="Quẹt thẻ">Quẹt thẻ</option>
                           </select>
                        </div>
                        <div>
                           <label className="text-[9px] font-bold text-slate-500 uppercase">Giai đoạn</label>
                           <select className="w-full p-2 rounded-lg border border-purple-200 text-xs" value={newPayment.stage} onChange={e => setNewPayment({...newPayment, stage: e.target.value})}>
                              {paymentStages.map(s => <option key={s} value={s}>{s}</option>)}
                           </select>
                        </div>
                        <div className="col-span-2">
                           <label className="text-[9px] font-bold text-slate-500 uppercase">Người thu</label>
                           <select className="w-full p-2 rounded-lg border border-purple-200 text-xs" value={newPayment.staffId} onChange={e => setNewPayment({...newPayment, staffId: e.target.value})}>
                              <option value="">-- Chọn nhân viên --</option>
                              {staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                           </select>
                        </div>
                     </div>
                     {editingContractId && (
                        <button onClick={handleAddExtraPayment} disabled={isSaving || newPayment.amount <= 0} className="w-full py-2 bg-purple-600 text-white rounded-lg text-xs font-bold uppercase shadow-lg disabled:opacity-50">
                           {isSaving ? 'Đang xử lý...' : 'Xác nhận thu thêm'}
                        </button>
                     )}
                  </div>
               </div>

               <div className="space-y-4 pt-4 border-t border-slate-100">
                  <h3 className="font-bold text-slate-600 text-xs uppercase tracking-widest flex items-center gap-2"><FileText size={16}/> 4. Điều khoản phụ lục dành riêng cho hợp đồng này</h3>
                  <textarea 
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm min-h-[120px] focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Nhập các điều khoản bổ sung, ghi chú quan trọng hoặc thay đổi quy định riêng cho khách hàng này..."
                    value={form.terms}
                    onChange={e => setForm({...form, terms: e.target.value})}
                  />
               </div>

               <div className="pt-6 border-t flex flex-col gap-4">
                 {formError && <div className="p-3 bg-red-50 text-red-600 text-xs font-bold rounded-xl">{formError}</div>}
                 <div className="flex gap-4">
                    {editingContractId && <button onClick={handleDeleteContract} disabled={isSaving} className="flex-1 py-4 bg-red-50 text-red-600 font-bold rounded-2xl">Xóa HĐ</button>}
                    <button onClick={handleSaveContract} disabled={isSaving} className="flex-[3] py-4 bg-blue-600 text-white font-black rounded-2xl shadow-xl shadow-blue-500/20 active:scale-95 flex items-center justify-center gap-2">
                      {isSaving ? <Loader2 className="animate-spin" /> : <CheckCircle2 />} {editingContractId ? 'Lưu thay đổi' : 'Tạo hợp đồng'}
                    </button>
                 </div>
               </div>
            </div>
          </div>
        </div>
      )}

      {isItemEditModalOpen && editingItem && (
         <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl w-full max-w-lg p-6 shadow-2xl space-y-4">
               <h3 className="font-black text-lg">Chi tiết dịch vụ</h3>
               <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500">Tên dịch vụ</label>
                  <input className="w-full p-2 border rounded-lg font-bold" value={editingItem.serviceName} disabled />
               </div>
               <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500">Chi tiết dịch vụ</label>
                  <textarea className="w-full p-2 border rounded-lg text-sm min-h-[80px]" value={editingItem.serviceDescription || ''} onChange={e => setEditingItem({...editingItem, serviceDescription: e.target.value})} placeholder="Nhập chi tiết nội dung dịch vụ (hiển thị trên hợp đồng)..." />
               </div>
               <div className="grid grid-cols-2 gap-4">
                  <div>
                     <label className="text-xs font-bold text-slate-500">Đơn giá</label>
                     <input type="number" className="w-full p-2 border rounded-lg font-bold" value={editingItem.unitPrice} onChange={e => setEditingItem({...editingItem, unitPrice: Number(e.target.value)})} />
                  </div>
                  <div>
                     <label className="text-xs font-bold text-slate-500">Số lượng</label>
                     <input type="number" className="w-full p-2 border rounded-lg font-bold" value={editingItem.quantity} onChange={e => setEditingItem({...editingItem, quantity: Number(e.target.value)})} />
                  </div>
                  <div>
                     <label className="text-xs font-bold text-slate-500">Giảm giá</label>
                     <input type="number" className="w-full p-2 border rounded-lg font-bold text-red-500" value={editingItem.discount} onChange={e => setEditingItem({...editingItem, discount: Number(e.target.value)})} />
                  </div>
                  <div>
                     <label className="text-xs font-bold text-slate-500">Thành tiền</label>
                     <div className="w-full p-2 bg-slate-100 rounded-lg font-black text-blue-600">
                        {((editingItem.unitPrice || 0) * (editingItem.quantity || 1) - (editingItem.discount || 0)).toLocaleString()}đ
                     </div>
                  </div>
               </div>
               <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Người Chốt Sale</label>
                  <select 
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-blue-600 appearance-none cursor-pointer" 
                    value={editingItem.salesPersonId || ''} 
                    onChange={e => setEditingItem({...editingItem, salesPersonId: e.target.value})}
                  >
                     <option value="">-- Chọn NV chốt sale --</option>
                     {staff.map(s => <option key={s.id} value={s.id}>{s.name} ({s.role})</option>)}
                  </select>
               </div>
               <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500">Ghi chú</label>
                  <input className="w-full p-2 border rounded-lg" value={editingItem.notes || ''} onChange={e => setEditingItem({...editingItem, notes: e.target.value})} />
               </div>
               <div className="flex gap-2 pt-4">
                  <button onClick={() => setIsItemEditModalOpen(false)} className="flex-1 py-3 bg-slate-100 font-bold rounded-xl">Hủy</button>
                  <button onClick={() => {
                     const sub = (editingItem.unitPrice || 0) * (editingItem.quantity || 1) - (editingItem.discount || 0);
                     const finalItem = { ...editingItem, subtotal: sub } as ContractItem;
                     if (form.items.some(i => i.id === finalItem.id)) {
                        setForm(prev => ({ ...prev, items: prev.items.map(i => i.id === finalItem.id ? finalItem : i), totalAmount: prev.totalAmount - (prev.items.find(i => i.id === finalItem.id)?.subtotal || 0) + sub }));
                     } else {
                        setForm({...form, items: [...form.items, finalItem], totalAmount: form.totalAmount + sub});
                     }
                     setIsItemEditModalOpen(false);
                  }} className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl">Xác nhận</button>
               </div>
            </div>
         </div>
      )}
    </div>
  );
};

export default ContractManager;
