
import React, { useState, useEffect } from 'react';
import { Calendar as CalIcon, MapPin, Clock, User, ChevronLeft, ChevronRight, List, Grid, Loader2 } from 'lucide-react';
import { Contract, Staff, ScheduleType, Schedule } from '../types';
import { fetchSchedulesPaginated } from '../apiService';

interface Props {
  contracts: Contract[];
  staff: Staff[];
  scheduleTypes: string[];
  schedules: Schedule[]; // Legacy prop
}

const ScheduleManager: React.FC<Props> = ({ contracts, staff, scheduleTypes, schedules: initialSchedules }) => {
  const [view, setView] = useState<'grid' | 'list'>('list');
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  
  // Pagination State
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [totalCount, setTotalCount] = useState(0);
  const [paginatedSchedules, setPaginatedSchedules] = useState<Schedule[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadSchedules();
  }, [page, activeFilter]);

  const loadSchedules = async () => {
    setIsLoading(true);
    try {
      const { data, count } = await fetchSchedulesPaginated(page, pageSize, activeFilter);
      setPaginatedSchedules(data);
      setTotalCount(count);
    } catch (e) {
      console.error("Error loading schedules:", e);
    } finally {
      setIsLoading(false);
    }
  };

  // Hàm định dạng ngày dd/mm/yyyy
  const formatDisplayDate = (dateStr: string) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    if (!year || !month || !day) return dateStr;
    return `${day}/${month}/${year}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Lịch làm việc</h2>
          <p className="text-sm text-slate-500">Quản lý các buổi chụp và đầu việc sản xuất</p>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-xl">
          <button 
            onClick={() => setView('grid')}
            className={`p-2 rounded-lg transition-all ${view === 'grid' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400'}`}
          ><Grid size={20}/></button>
          <button 
            onClick={() => setView('list')}
            className={`p-2 rounded-lg transition-all ${view === 'list' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400'}`}
          ><List size={20}/></button>
        </div>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
        <button 
          onClick={() => { setActiveFilter(null); setPage(1); }}
          className={`whitespace-nowrap px-4 py-2 rounded-full text-xs font-bold transition-all border ${!activeFilter ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200'}`}
        >
          Tất cả
        </button>
        {scheduleTypes.map(type => (
          <button 
            key={type} 
            onClick={() => { setActiveFilter(type === activeFilter ? null : type); setPage(1); }}
            className={`whitespace-nowrap px-4 py-2 rounded-full text-xs font-bold transition-all border ${activeFilter === type ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:border-blue-400 hover:text-blue-600'}`}
          >
            {type}
          </button>
        ))}
      </div>

      {isLoading ? (
         <div className="p-10 flex justify-center items-center text-slate-400">
            <Loader2 className="animate-spin mr-2" /> Đang tải lịch...
         </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedSchedules.map(item => (
              <div key={item.id} className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 hover:shadow-lg transition-shadow relative overflow-hidden group">
                <div className={`absolute top-0 left-0 w-2 h-full ${
                  item.type?.includes('Studio') ? 'bg-blue-500' : 
                  item.type?.includes('Cưới') ? 'bg-purple-500' : 
                  item.type?.includes('Trang điểm') || item.type?.includes('Makeup') ? 'bg-pink-500' : 'bg-slate-400'
                }`}></div>
                
                <div className="flex justify-between items-start">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{item.contractCode || '---'}</span>
                  <span className="px-2 py-0.5 bg-slate-50 text-[10px] font-bold rounded-full text-slate-500 uppercase">{item.type}</span>
                </div>

                <div className="space-y-3">
                  <h3 className="font-bold text-slate-900 text-lg leading-tight">{item.notes || 'Không có mô tả'}</h3>
                  <div className="flex items-center gap-2 text-slate-500 text-sm">
                    <CalIcon size={16} />
                    <span>{formatDisplayDate(item.date)}</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-50 flex items-center justify-between">
                  <div className="flex -space-x-2">
                    {(item.assignments || []).map(sid => (
                      <div key={sid} className="w-8 h-8 rounded-full border-2 border-white bg-slate-200 flex items-center justify-center text-[10px] font-bold" title={staff.find(s => s.id === sid)?.name}>
                        {staff.find(s => s.id === sid)?.name?.charAt(0) || '?'}
                      </div>
                    ))}
                    {(!item.assignments || item.assignments.length === 0) && <span className="text-xs text-red-400 italic font-medium">Chưa giao việc</span>}
                  </div>
                  <button className="text-blue-600 text-xs font-bold hover:underline">Chi tiết</button>
                </div>
              </div>
            ))}
            {paginatedSchedules.length === 0 && (
              <div className="col-span-full py-20 text-center bg-white rounded-3xl border border-dashed border-slate-200">
                <p className="text-slate-400 font-medium">Không có lịch trình nào phù hợp với bộ lọc</p>
              </div>
            )}
          </div>

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
        </>
      )}
    </div>
  );
};

export default ScheduleManager;
