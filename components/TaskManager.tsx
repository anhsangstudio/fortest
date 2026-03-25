
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  CheckSquare, Calendar as CalendarIcon, List, Search, Settings, 
  ChevronLeft, ChevronRight, Eye, Zap, PaintBucket,
  Plus, X, Trash2, Edit3, Image as ImageIcon, CheckCircle2, Loader2,
  Clock, User, Filter, GripVertical, ExternalLink
} from 'lucide-react';
// @ts-ignore
import { Lunar } from 'lunar-javascript';
import { Task, Staff, Contract, Customer } from '../types';
import { fetchTasksPaginated, syncData, uploadTaskImage, saveTaskAttachment, deleteTaskAttachment } from '../apiService';

interface Props {
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  staff: Staff[];
  contracts: Contract[];
  customers: Customer[];
}

interface ColumnConfig {
  id: string;
  label: string;
  width: number;
}

const DEFAULT_COLUMNS: ColumnConfig[] = [
  { id: 'name', label: 'Công việc', width: 250 },
  { id: 'customer', label: 'Khách hàng / HĐ', width: 220 },
  { id: 'notes', label: 'Lưu ý', width: 200 },
  { id: 'attachments', label: 'Đính kèm', width: 80 },
  { id: 'dueDate', label: 'Deadline', width: 120 },
  { id: 'assignee', label: 'Nhân sự', width: 160 },
  { id: 'status', label: 'Trạng thái', width: 140 },
  { id: 'actions', label: '', width: 60 }
];

const TaskManager: React.FC<Props> = ({ tasks: initialTasks, setTasks: setInitialTasks, staff, contracts, customers }) => {
  const [view, setView] = useState<'list' | 'calendar'>('list');
  const [search, setSearch] = useState('');
  const [assignmentFilter, setAssignmentFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [staffFilter, setStaffFilter] = useState('ALL');
  
  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [totalCount, setTotalCount] = useState(0);
  const [paginatedTasks, setPaginatedTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Calendar State
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showSettings, setShowSettings] = useState(false);
  const [calendarSettings, setCalendarSettings] = useState({
    showLunar: true, // Enable Lunar by default
    highlightWeekend: true,
    showHeatmap: false,
    showHolidays: true
  });
  const [manualHolidays, setManualHolidays] = useState<Record<string, string>>({}); // dateStr -> color ('red' | 'orange')

  // Edit State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Table Column State
  const [columns, setColumns] = useState<ColumnConfig[]>(DEFAULT_COLUMNS);
  const [isResizing, setIsResizing] = useState(false);
  const resizingRef = useRef<{ index: number; startX: number; startWidth: number } | null>(null);

  // Load Columns from LocalStorage
  useEffect(() => {
    const savedCols = localStorage.getItem('task_table_columns_v1');
    if (savedCols) {
      try {
        setColumns(JSON.parse(savedCols));
      } catch (e) {
        console.error("Failed to load columns config", e);
      }
    }
  }, []);

  // Save Columns to LocalStorage
  useEffect(() => {
    localStorage.setItem('task_table_columns_v1', JSON.stringify(columns));
  }, [columns]);

  // Fetch Data
  useEffect(() => {
    loadTasks();
  }, [page, search, assignmentFilter, statusFilter, staffFilter, view]); 

  const loadTasks = async () => {
    setIsLoading(true);
    try {
        const { data, count } = await fetchTasksPaginated(page, view === 'calendar' ? 200 : pageSize, search, statusFilter, staffFilter, assignmentFilter);
        setPaginatedTasks(data);
        setTotalCount(count);
    } catch (e) {
        console.error(e);
    } finally {
        setIsLoading(false);
    }
  };

  const formatDateLocal = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const toggleHoliday = (dateStr: string, color: string | null) => {
      setManualHolidays(prev => {
          const next = { ...prev };
          if (color) next[dateStr] = color;
          else delete next[dateStr];
          return next;
      });
  };

  // Enrich tasks with related data (for display)
  const displayTasks = useMemo(() => {
    const mapped = paginatedTasks.map(t => {
      const contractCode = t.contractCode || contracts.find(c => c.id === t.contractId)?.contractCode || 'N/A';
      const customerName = t.customerName || customers.find(c => c.id === contracts.find(con => con.id === t.contractId)?.customerId)?.name || 'N/A';
      const customerAddress = t.customerAddress || customers.find(c => c.id === contracts.find(con => con.id === t.contractId)?.customerId)?.address || '';
      
      return {
        ...t,
        contractCode,
        customerName,
        customerAddress,
      };
    });

    // Sort by Due Date ASCENDING
    return mapped.sort((a, b) => {
      if (!a.dueDate) return 1; 
      if (!b.dueDate) return -1;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });
  }, [paginatedTasks, contracts, customers]);

  // --- COLUMN RESIZING LOGIC ---
  const startResize = (e: React.MouseEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    resizingRef.current = {
      index,
      startX: e.clientX,
      startWidth: columns[index].width
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!resizingRef.current) return;
    const { index, startX, startWidth } = resizingRef.current;
    const diff = e.clientX - startX;
    const newWidth = Math.max(50, startWidth + diff); // Min width 50px

    setColumns(prev => {
      const next = [...prev];
      next[index] = { ...next[index], width: newWidth };
      return next;
    });
  };

  const handleMouseUp = () => {
    setIsResizing(false);
    resizingRef.current = null;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  // --- COLUMN REORDERING LOGIC ---
  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.setData('colIndex', index.toString());
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // Necessary to allow dropping
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    const sourceIndex = parseInt(e.dataTransfer.getData('colIndex'));
    if (isNaN(sourceIndex) || sourceIndex === targetIndex) return;

    const newColumns = [...columns];
    const [movedColumn] = newColumns.splice(sourceIndex, 1);
    newColumns.splice(targetIndex, 0, movedColumn);
    setColumns(newColumns);
  };

  // --- ACTIONS ---

  const handleUpdateStatus = async (task: Task, newStatus: any) => {
    const updated = { ...task, status: newStatus };
    setPaginatedTasks(prev => prev.map(t => t.id === task.id ? updated : t));
    await syncData('tasks', 'UPDATE', updated);
  };

  const handleReplaceAssignee = async (task: Task, staffId: string) => {
    const newAssignments = staffId ? [staffId] : [];
    const updated = { ...task, assignedStaffIds: newAssignments };
    setPaginatedTasks(prev => prev.map(t => t.id === task.id ? updated : t));
    await syncData('tasks', 'UPDATE', updated);
  };

  const handleDeleteTask = async (id: string) => {
    if (window.confirm("Bạn có chắc chắn muốn xóa công việc này?")) {
      try {
        await syncData('tasks', 'DELETE', { id });
        setPaginatedTasks(prev => prev.filter(t => t.id !== id));
      } catch (e: any) {
        alert("Lỗi khi xóa: " + e.message);
      }
    }
  };

  // --- EDIT MODAL LOGIC ---
  const handleRowClick = (task: Task) => {
    if (isResizing) return; // Prevent open modal when resizing
    setEditingTask({ ...task });
    setIsEditModalOpen(true);
  };

  const handleSaveChanges = async () => {
    if (!editingTask) return;
    setIsSaving(true);
    try {
      const updated = { ...editingTask };
      setPaginatedTasks(prev => prev.map(t => t.id === updated.id ? updated : t));
      await syncData('tasks', 'UPDATE', { 
        id: updated.id, 
        notes: updated.notes,
        status: updated.status,
        dueDate: updated.dueDate 
      });
      setIsEditModalOpen(false);
    } catch (e: any) {
      alert("Lỗi lưu thay đổi: " + e.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingTask) return;
    if (file.size > 10 * 1024 * 1024) return alert("File quá lớn (tối đa 10MB)");

    setIsUploading(true);
    try {
      const uploadRes = await uploadTaskImage(file, { taskName: editingTask.name, timestamp: new Date().toISOString() });
      if (uploadRes.success && uploadRes.url) {
        const newAttachment = await saveTaskAttachment({ taskId: editingTask.id, fileUrl: uploadRes.url, fileId: uploadRes.fileId });
        if (newAttachment) {
          const updatedAttachments = [...(editingTask.attachments || []), newAttachment];
          setEditingTask({ ...editingTask, attachments: updatedAttachments });
          setPaginatedTasks(prev => prev.map(t => t.id === editingTask.id ? { ...t, attachments: updatedAttachments } : t));
        }
      }
    } catch (err: any) {
      alert("Lỗi tải ảnh: " + err.message);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteAttachment = async (attachmentId: string) => {
    if (!editingTask || !window.confirm("Xóa ảnh này?")) return;
    try {
      await deleteTaskAttachment(attachmentId);
      const updatedAttachments = (editingTask.attachments || []).filter(a => a.id !== attachmentId);
      setEditingTask({ ...editingTask, attachments: updatedAttachments });
      setPaginatedTasks(prev => prev.map(t => t.id === editingTask.id ? { ...t, attachments: updatedAttachments } : t));
    } catch (e: any) {
      alert("Lỗi xóa ảnh: " + e.message);
    }
  };

  // --- CALENDAR LOGIC ---
  const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  const today = () => setCurrentMonth(new Date());

  const calendarData = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startOffset = (firstDay.getDay() + 6) % 7; // Monday start
    
    const days = [];
    const prevMonthLastDay = new Date(year, month, 0).getDate();

    // Previous month filler
    for (let i = startOffset - 1; i >= 0; i--) {
      days.push({ date: new Date(year, month - 1, prevMonthLastDay - i), isCurrentMonth: false });
    }

    // Current month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push({ date: new Date(year, month, i), isCurrentMonth: true });
    }

    // Next month filler
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({ date: new Date(year, month + 1, i), isCurrentMonth: false });
    }

    return days.map(d => {
      const dateStr = formatDateLocal(d.date);
      const tasksForDay = displayTasks.filter(t => t.dueDate === dateStr);
      let lunarDate = null;
      
      // Calculate Lunar Date
      if (calendarSettings.showLunar) {
        try {
          // Check if Lunar library is loaded properly
          if (typeof Lunar !== 'undefined' && Lunar.fromDate) {
             const lunar = Lunar.fromDate(d.date);
             const day = lunar.getDay();
             const month = lunar.getMonth();
             lunarDate = day === 1 ? `${day}/${month}` : `${day}`;
          }
        } catch (e) {
           console.warn("Lunar calc error", e);
        }
      }
      
      const isWeekend = d.date.getDay() === 0 || d.date.getDay() === 6;
      const taskCount = tasksForDay.length;
      let bgColor = d.isCurrentMonth ? 'bg-white' : 'bg-slate-50 opacity-50';
      
      // Heatmap Logic
      if (d.isCurrentMonth && calendarSettings.showHeatmap) {
        if (taskCount > 20) bgColor = 'bg-purple-200';
        else if (taskCount > 10) bgColor = 'bg-purple-100';
        else if (taskCount > 0) bgColor = 'bg-slate-50'; // Default with tasks
      }

      // Weekend Logic (Override if heatmap is weak or not active)
      if (d.isCurrentMonth && calendarSettings.highlightWeekend && taskCount <= 10 && isWeekend) {
        bgColor = 'bg-yellow-50';
      }

      // Manual Holiday Logic (Highest Priority)
      const holidayColor = manualHolidays[dateStr];
      if (d.isCurrentMonth && calendarSettings.showHolidays && holidayColor) {
        bgColor = holidayColor === 'red' ? 'bg-red-100' : 'bg-orange-100';
      }

      return { ...d, dateStr, tasks: tasksForDay, lunarDate, bgColor, taskCount, holidayColor };
    });
  }, [currentMonth, displayTasks, calendarSettings, manualHolidays]);

  // Helper to render cell based on column ID
  const renderCellContent = (colId: string, task: any) => {
    switch (colId) {
      case 'name':
        return <div className="font-bold text-slate-800 text-sm truncate" title={task.name}>{task.name}</div>;
      case 'customer':
        return (
          <div className="truncate">
            <div className="text-sm font-bold text-slate-700 truncate" title={task.customerName}>{task.customerName}</div>
            <div className="text-[10px] text-slate-400">{task.contractCode}</div>
          </div>
        );
      case 'notes':
        return <div className="text-xs text-slate-500 italic truncate" title={task.notes || ''}>{task.notes || '-'}</div>;
      case 'attachments':
        return task.attachments && task.attachments.length > 0 ? (
          <div className="flex items-center justify-center gap-1 text-slate-600 bg-slate-100 px-2 py-1 rounded-lg w-fit mx-auto">
            <ImageIcon size={14} /> <span className="text-xs font-bold">{task.attachments.length}</span>
          </div>
        ) : <div className="text-center text-slate-300">-</div>;
      case 'dueDate':
        return <div className="text-sm font-medium text-slate-600 truncate">{task.dueDate ? task.dueDate.split('-').reverse().join('/') : '-'}</div>;
      case 'assignee':
        return (
          <div onClick={(e) => e.stopPropagation()}>
            <select 
              className="w-full bg-slate-50 border border-slate-200 rounded-lg py-1.5 px-2 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer truncate"
              value={task.assignedStaffIds[0] || ''}
              onChange={(e) => handleReplaceAssignee(task, e.target.value)}
            >
              <option value="">-- Chưa giao --</option>
              {staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        );
      case 'status':
        return (
          <div className="text-center" onClick={(e) => e.stopPropagation()}>
            <select 
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border-none outline-none cursor-pointer w-full ${
                task.status === 'Completed' ? 'bg-emerald-100 text-emerald-700' :
                task.status === 'In Progress' ? 'bg-blue-100 text-blue-700' :
                'bg-amber-100 text-amber-700'
              }`}
              value={task.status}
              onChange={(e) => handleUpdateStatus(task, e.target.value)}
            >
              <option value="Pending">Pending</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>
        );
      case 'actions':
        return (
          <div className="text-right" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => handleDeleteTask(task.id)} className="p-2 text-slate-300 hover:text-red-500 rounded-lg hover:bg-red-50 transition-all"><Trash2 size={16}/></button>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
             <CheckSquare className="text-blue-600" /> Quản lý Công việc
          </h2>
          <p className="text-slate-500 font-medium">Lịch sản xuất và danh sách đầu việc</p>
        </div>
        
        <div className="flex items-center gap-4">
           <div className="flex gap-2 bg-slate-100 p-1 rounded-xl">
              <button onClick={() => setView('calendar')} className={`p-2 rounded-lg transition-all flex items-center gap-2 text-xs font-bold uppercase ${view === 'calendar' ? 'bg-white shadow text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}>
                <CalendarIcon size={18}/> <span className="hidden sm:inline">Lịch tháng</span>
              </button>
              <button onClick={() => setView('list')} className={`p-2 rounded-lg transition-all flex items-center gap-2 text-xs font-bold uppercase ${view === 'list' ? 'bg-white shadow text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}>
                <List size={18}/> <span className="hidden sm:inline">Danh sách</span>
              </button>
           </div>
        </div>
      </div>

      {/* FILTER BAR */}
      <div className="bg-white p-4 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center">
         <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input 
               type="text" 
               placeholder="Tìm tên khách, mã HĐ, tên việc..." 
               className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-medium transition-all"
               value={search}
               onChange={e => { setSearch(e.target.value); setPage(1); }}
            />
         </div>
         <div className="flex gap-2 w-full md:w-auto overflow-x-auto scrollbar-hide">
            {view === 'calendar' && (
               <button 
                 onClick={() => setShowSettings(!showSettings)}
                 className={`flex items-center gap-2 px-4 py-3 rounded-xl border font-bold text-sm transition-all ${showSettings ? 'bg-slate-900 text-white border-slate-900' : 'bg-white border-slate-200 text-slate-600'}`}
               >
                 <Settings size={16} /> Cấu hình
               </button>
            )}
            <select 
               className="bg-slate-50 border border-slate-100 px-4 py-3 rounded-xl font-bold text-sm outline-none cursor-pointer"
               value={assignmentFilter}
               onChange={e => { setAssignmentFilter(e.target.value); setPage(1); }}
            >
               <option value="ALL">Tất cả giao việc</option>
               <option value="ASSIGNED">Đã giao việc</option>
               <option value="UNASSIGNED">Chưa giao việc</option>
            </select>

            <select 
               className="bg-slate-50 border border-slate-100 px-4 py-3 rounded-xl font-bold text-sm outline-none cursor-pointer"
               value={statusFilter}
               onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
            >
               <option value="ALL">Tất cả trạng thái</option>
               <option value="Pending">Chờ thực hiện</option>
               <option value="In Progress">Đang làm</option>
               <option value="Completed">Hoàn thành</option>
               <option value="Cancelled">Đã hủy</option>
            </select>
            <select 
               className="bg-slate-50 border border-slate-100 px-4 py-3 rounded-xl font-bold text-sm outline-none cursor-pointer"
               value={staffFilter}
               onChange={e => { setStaffFilter(e.target.value); setPage(1); }}
            >
               <option value="ALL">Tất cả nhân sự</option>
               {staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
         </div>
      </div>

      {/* CALENDAR SETTINGS PANEL */}
      {view === 'calendar' && showSettings && (
        <div className="bg-slate-900 text-white p-6 rounded-[2rem] shadow-xl animate-in slide-in-from-top-4 grid grid-cols-2 md:grid-cols-4 gap-6">
           <div className="flex items-center justify-between p-3 bg-white/10 rounded-xl">
              <div className="flex items-center gap-2"><Eye size={16}/> <span>Âm lịch</span></div>
              <input type="checkbox" checked={calendarSettings.showLunar} onChange={e => setCalendarSettings(p => ({...p, showLunar: e.target.checked}))} className="w-5 h-5 accent-blue-500 cursor-pointer"/>
           </div>
           <div className="flex items-center justify-between p-3 bg-white/10 rounded-xl">
              <div className="flex items-center gap-2"><span className="w-3 h-3 bg-yellow-400 rounded-full"></span> <span>Tô màu T7/CN</span></div>
              <input type="checkbox" checked={calendarSettings.highlightWeekend} onChange={e => setCalendarSettings(p => ({...p, highlightWeekend: e.target.checked}))} className="w-5 h-5 accent-blue-500 cursor-pointer"/>
           </div>
           <div className="flex items-center justify-between p-3 bg-white/10 rounded-xl">
              <div className="flex items-center gap-2"><Zap size={16} className="text-purple-400"/> <span>Heatmap</span></div>
              <input type="checkbox" checked={calendarSettings.showHeatmap} onChange={e => setCalendarSettings(p => ({...p, showHeatmap: e.target.checked}))} className="w-5 h-5 accent-blue-500 cursor-pointer"/>
           </div>
           <div className="flex items-center justify-between p-3 bg-white/10 rounded-xl">
              <div className="flex items-center gap-2"><PaintBucket size={16} className="text-red-400"/> <span>Ngày Lễ/Tết</span></div>
              <input type="checkbox" checked={calendarSettings.showHolidays} onChange={e => setCalendarSettings(p => ({...p, showHolidays: e.target.checked}))} className="w-5 h-5 accent-blue-500 cursor-pointer"/>
           </div>
           <div className="col-span-full text-[10px] text-slate-400 italic text-center">
              * Click chuột phải vào ô ngày để đánh dấu ngày nghỉ Lễ/Tết thủ công (Đỏ/Cam).
           </div>
        </div>
      )}

      {/* VIEW CONTENT */}
      {isLoading ? (
         <div className="p-10 flex justify-center items-center text-slate-400">
            <Loader2 className="animate-spin mr-2" /> Đang tải dữ liệu...
         </div>
      ) : (
         view === 'calendar' ? (
            <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm">
               {/* CALENDAR NAVIGATION */}
               <div className="px-8 py-6 flex justify-between items-center border-b border-slate-100">
                  <div className="flex items-center gap-4">
                     <button onClick={prevMonth} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><ChevronLeft size={24}/></button>
                     <h2 className="text-xl font-black text-slate-900 uppercase">THÁNG {currentMonth.getMonth() + 1}, {currentMonth.getFullYear()}</h2>
                     <button onClick={nextMonth} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><ChevronRight size={24}/></button>
                  </div>
                  <button onClick={today} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold uppercase transition-colors">Hôm nay</button>
               </div>

               {/* CALENDAR GRID */}
               <div className="grid grid-cols-7 border-b border-slate-100">
                  {['T.Hai', 'T.Ba', 'T.Tư', 'T.Năm', 'T.Sáu', 'T.Bảy', 'C.Nhật'].map((d, i) => (
                     <div key={i} className={`py-4 text-center text-[10px] font-black uppercase tracking-widest ${i >= 5 ? 'text-orange-500' : 'text-slate-400'}`}>{d}</div>
                  ))}
               </div>
               
               <div className="grid grid-cols-7 auto-rows-fr">
                  {calendarData.map((day, idx) => (
                     <div 
                        key={idx} 
                        className={`min-h-[140px] p-2 border-r border-b border-slate-100 relative group transition-colors ${day.bgColor}`}
                        onContextMenu={(e) => {
                           e.preventDefault();
                           if (!day.isCurrentMonth) return;
                           const currentColor = manualHolidays[day.dateStr];
                           const nextColor = currentColor === 'red' ? 'orange' : (currentColor === 'orange' ? null : 'red');
                           toggleHoliday(day.dateStr, nextColor);
                        }}
                     >
                        <div className="flex justify-between items-start mb-2">
                           <span className={`text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full ${day.dateStr === formatDateLocal(new Date()) ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-700'}`}>
                              {day.date.getDate()}
                           </span>
                           {day.lunarDate && (
                              <span className="text-[10px] font-bold text-slate-400 opacity-70">{day.lunarDate}</span>
                           )}
                        </div>

                        <div className="space-y-1.5 overflow-y-auto max-h-[90px] scrollbar-hide">
                           {day.tasks.map(t => (
                              <div 
                                 key={t.id} 
                                 onClick={() => handleRowClick(t)}
                                 className={`text-[9px] font-bold px-2 py-1.5 rounded-lg border truncate cursor-pointer shadow-sm active:scale-95 transition-transform ${
                                    t.status === 'Completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                                    t.status === 'In Progress' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                                    'bg-white text-slate-600 border-slate-200'
                                 }`}
                                 title={t.name}
                              >
                                 {t.status === 'Completed' && <CheckCircle2 size={8} className="inline mr-1"/>}
                                 {t.name}
                              </div>
                           ))}
                           {day.taskCount > 3 && (
                              <div className="text-[9px] font-bold text-center text-slate-400 italic">
                                 + {day.taskCount - 3} việc khác
                              </div>
                           )}
                        </div>
                     </div>
                  ))}
               </div>
            </div>
         ) : (
            <div className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden shadow-sm">
               <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse table-fixed" style={{ minWidth: '1000px' }}>
                     <thead className="bg-slate-50 border-b border-slate-100">
                        <tr>
                           {columns.map((col, index) => (
                              <th 
                                 key={col.id} 
                                 style={{ width: `${col.width}px` }}
                                 draggable
                                 onDragStart={(e) => handleDragStart(e, index)}
                                 onDragOver={handleDragOver}
                                 onDrop={(e) => handleDrop(e, index)}
                                 className="relative px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-move hover:bg-slate-100 transition-colors group select-none"
                              >
                                 <div className="flex items-center gap-1">
                                    <GripVertical size={12} className="text-slate-300 opacity-0 group-hover:opacity-100" />
                                    {col.label}
                                 </div>
                                 <div 
                                    className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400 z-10"
                                    onMouseDown={(e) => startResize(e, index)}
                                 />
                              </th>
                           ))}
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-100">
                        {displayTasks.map(task => (
                           <tr key={task.id} onClick={() => handleRowClick(task)} className="hover:bg-slate-50 transition-colors cursor-pointer group">
                              {columns.map(col => (
                                 <td key={col.id} className="px-4 py-4 border-b border-slate-50" style={{ width: `${col.width}px` }}>
                                    {renderCellContent(col.id, task)}
                                 </td>
                              ))}
                           </tr>
                        ))}
                        {displayTasks.length === 0 && (
                           <tr><td colSpan={columns.length} className="p-8 text-center text-slate-400 italic">Không tìm thấy công việc nào</td></tr>
                        )}
                     </tbody>
                  </table>
               </div>
            </div>
         )
      )}

      {/* Pagination Controls */}
      <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-200 shadow-sm mt-4">
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

      {/* EDIT MODAL */}
      {isEditModalOpen && editingTask && (
         <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-[2rem] w-full max-w-lg p-8 shadow-2xl animate-in zoom-in-95 space-y-6">
               <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                     <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center">
                        <Edit3 size={20} />
                     </div>
                     <div>
                        <h3 className="text-xl font-black text-slate-900">Chi tiết công việc</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{editingTask.contractCode}</p>
                     </div>
                  </div>
                  <button onClick={() => setIsEditModalOpen(false)} className="w-8 h-8 flex items-center justify-center hover:bg-slate-100 rounded-full text-slate-300"><X size={20}/></button>
               </div>

               <div className="space-y-4">
                  <div className="space-y-1.5">
                     <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Tên công việc</label>
                     <div className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 text-sm">
                        {editingTask.name} 
                        <span className="text-slate-400 font-normal"> - </span> 
                        <span className="text-blue-600">{editingTask.customerName}</span>
                        <span className="text-slate-400 font-normal"> - </span>
                        <span className="text-slate-500">{editingTask.contractCode}</span>
                     </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Ngày hết hạn</label>
                        <input 
                           type="date" 
                           className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none font-bold text-slate-700"
                           value={editingTask.dueDate || ''}
                           onChange={e => setEditingTask({...editingTask, dueDate: e.target.value})}
                        />
                     </div>
                     <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Trạng thái</label>
                        <select 
                           className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none font-bold text-slate-700 cursor-pointer"
                           value={editingTask.status}
                           onChange={e => setEditingTask({...editingTask, status: e.target.value})}
                        >
                           <option value="Pending">Pending</option>
                           <option value="In Progress">In Progress</option>
                           <option value="Completed">Completed</option>
                           <option value="Cancelled">Cancelled</option>
                        </select>
                     </div>
                  </div>

                  <div className="space-y-1.5">
                     <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Ghi chú</label>
                     <textarea 
                        className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none font-medium text-slate-700 min-h-[80px]"
                        value={editingTask.notes}
                        onChange={e => setEditingTask({...editingTask, notes: e.target.value})}
                        placeholder="Nhập ghi chú công việc..."
                     />
                  </div>

                  <div className="space-y-3 pt-4 border-t border-slate-100">
                     <label className="text-[10px] font-black text-slate-500 uppercase ml-1 flex items-center gap-2">
                        <ImageIcon size={14}/> Hình ảnh đính kèm ({editingTask.attachments?.length || 0})
                     </label>
                     
                     <div className="grid grid-cols-2 gap-4 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                        {editingTask.attachments?.map(att => (
                           <div key={att.id} className="relative aspect-video rounded-xl overflow-hidden group border border-slate-200 bg-slate-100">
                              <img 
                                 src={att.fileUrl} 
                                 className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform duration-500" 
                                 alt="Attachment" 
                                 onClick={() => window.open(att.fileUrl, '_blank')}
                              />
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 pointer-events-none transition-colors" />
                              <button 
                                 onClick={(e) => { e.stopPropagation(); handleDeleteAttachment(att.id); }}
                                 className="absolute top-2 right-2 w-7 h-7 bg-white/90 text-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:bg-white"
                                 title="Xóa ảnh"
                              >
                                 <Trash2 size={14} />
                              </button>
                              <div className="absolute bottom-2 right-2 bg-black/60 text-white text-[9px] px-2 py-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none flex items-center gap-1">
                                 <ExternalLink size={10} /> Xem
                              </div>
                           </div>
                        ))}
                        <div 
                           onClick={() => fileInputRef.current?.click()}
                           className="aspect-video rounded-xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400 cursor-pointer hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600 transition-all group"
                        >
                           {isUploading ? <Loader2 size={24} className="animate-spin text-blue-500" /> : <div className="p-3 bg-slate-100 rounded-full group-hover:bg-blue-100 transition-colors"><Plus size={24} /></div>}
                           <span className="text-[10px] font-black uppercase mt-2">Tải ảnh lên</span>
                        </div>
                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleUploadImage} />
                     </div>
                  </div>
               </div>

               <div className="pt-4 border-t border-slate-100 flex gap-4">
                  <button onClick={() => setIsEditModalOpen(false)} className="flex-1 py-3 bg-slate-100 text-slate-500 font-bold rounded-xl text-xs uppercase tracking-widest hover:bg-slate-200 transition-colors">Hủy</button>
                  <button 
                     onClick={handleSaveChanges} 
                     disabled={isSaving}
                     className="flex-[2] py-3 bg-blue-600 text-white font-bold rounded-xl text-xs uppercase tracking-widest hover:bg-blue-700 transition-colors shadow-lg active:scale-95 flex items-center justify-center gap-2"
                  >
                     {isSaving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />} Lưu thay đổi
                  </button>
               </div>
            </div>
         </div>
      )}
    </div>
  );
};

export default TaskManager;
