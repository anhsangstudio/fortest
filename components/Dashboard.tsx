import React, { useState, useMemo, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend, AreaChart, Area, LabelList 
} from 'recharts';
import { 
  FileText, TrendingUp, AlertCircle, Calendar, 
  ArrowRightLeft, Target, Wallet, ArrowUpCircle, ArrowDownCircle, History, 
  ChevronUp, ChevronDown, Package, List, Layers, X, Eye,
  MinusSquare, PlusSquare, PieChart as PieIcon, BarChart3, TrendingDown
} from 'lucide-react';
import { Contract, Transaction, Staff, Service, TransactionType } from '../types';
import { fetchDashboardRangeData } from '../apiService';

interface DashboardProps {
  contracts: Contract[]; 
  transactions: Transaction[]; 
  staff: Staff[];
  services: Service[];
  serviceTypesList: string[];
}

type FilterPeriod = 
  | 'today' | 'this_week' | 'last_week' 
  | 'this_month' | 'select_month' | 'select_year' 
  | 'compare_years' | 'compare_months' | 'compare_weeks';

type RankingMode = 'type' | 'product' | 'group';
type MetricType = 'revenue' | 'income' | 'expense' | 'profit' | 'debt' | null;

const Dashboard: React.FC<DashboardProps> = ({ contracts: initialContracts, transactions: initialTransactions, staff, services, serviceTypesList }) => {
  const [activeFilter, setActiveFilter] = useState<FilterPeriod>('this_month');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [compareYearA, setCompareYearA] = useState(new Date().getFullYear());
  const [compareYearB, setCompareYearB] = useState(new Date().getFullYear() - 1);
  const [compareMonth, setCompareMonth] = useState(new Date().getMonth() + 1);
  
  // Data State
  const [localContracts, setLocalContracts] = useState<Contract[]>(initialContracts);
  const [localTransactions, setLocalTransactions] = useState<Transaction[]>(initialTransactions);
  const [isLoadingData, setIsLoadingData] = useState(false);

  // Merge helper: keeps fetched data, but also accepts realtime/optimistic updates from props.
  const mergeById = <T extends { id: string }>(base: T[], incoming: T[]) => {
    const map = new Map<string, T>();
    base.forEach(i => map.set(i.id, i));
    incoming.forEach(i => map.set(i.id, i));
    return Array.from(map.values());
  };

  // UI States
  const [selectedMetric, setSelectedMetric] = useState<MetricType>(null);
  const [rankingMode, setRankingMode] = useState<RankingMode>('type');
  const [rankingPeriod, setRankingPeriod] = useState<string>('global'); 
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' }>({ key: 'revenue', direction: 'desc' });
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#6366f1', '#14b8a6'];
  const YEARS = [2023, 2024, 2025, 2026];

  // --- DATE HELPERS (avoid timezone drift with DB `date` columns) ---
  // Build a Date at UTC midnight for safe `.toISOString()` usage (Supabase date comparisons).
  const utcDate = (year: number, monthIndex: number, day: number) =>
    new Date(Date.UTC(year, monthIndex, day, 0, 0, 0, 0));

  // Parse DB "YYYY-MM-DD" safely as local date (midnight local) for client-side filtering.
  const parseDateOnlyLocal = (dateStr?: string) => {
    if (!dateStr) return null;
    // Ensure no UTC parsing drift
    return new Date(`${dateStr}T00:00:00`);
  };

  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
  const endOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

  const isInRange = (dateStr: string | undefined, rangeStart: Date, rangeEnd: Date) => {
    const d = parseDateOnlyLocal(dateStr);
    if (!d) return false;
    const t = d.getTime();
    return t >= rangeStart.getTime() && t <= rangeEnd.getTime();
  };

  // --- DATA FETCHING & CALCULATION LOGIC ---
  const getFetchRange = () => {
    const now = new Date();
    let start = new Date();
    let end = new Date();

    if (activeFilter.startsWith('compare')) {
       const minYear = Math.min(compareYearA, compareYearB);
       const maxYear = Math.max(compareYearA, compareYearB);
       start = utcDate(minYear, 0, 1);
       end = utcDate(maxYear, 11, 31);
    } else {
        switch (activeFilter) {
            case 'today':
            case 'this_week':
            case 'last_week':
            case 'this_month':
                // Fetch whole year to allow local previous period calculation if needed
                start = utcDate(now.getFullYear(), 0, 1);
       end = utcDate(now.getFullYear(), 11, 31);
                break;
            case 'select_month':
                start = new Date(selectedYear, 0, 1); // Fetch whole year for context
                end = new Date(selectedYear, 11, 31);
                break;
            case 'select_year':
                start = utcDate(selectedYear, 0, 1);
       end = utcDate(selectedYear, 11, 31);
                break;
        }
    }
    return { start, end };
  };

  // Keep local data in sync with latest global props (new transactions/contracts).
  useEffect(() => {
    setLocalContracts(prev => mergeById(prev, initialContracts));
    setLocalTransactions(prev => mergeById(prev, initialTransactions));
  }, [initialContracts, initialTransactions]);

  useEffect(() => {
    const loadDashboardData = async () => {
        setIsLoadingData(true);
        const { start, end } = getFetchRange();
        try {
            const { contracts, transactions } = await fetchDashboardRangeData(start, end);
            setLocalContracts(contracts);
            setLocalTransactions(transactions);
        } catch (e) {
            console.error("Dashboard fetch error:", e);
        } finally {
            setIsLoadingData(false);
        }
    };
    loadDashboardData();
  }, [activeFilter, selectedYear, selectedMonth, compareYearA, compareYearB, compareMonth]);

  const getPeriodRange = (period: string, year: number, month?: number) => {
    const now = new Date();
    let start = new Date();
    let end = new Date();

    switch (period) {
      case 'today':
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        break;
      case 'this_week':
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1);
        start = new Date(now.setDate(diff));
        start.setHours(0, 0, 0, 0);
        end = new Date();
        break;
      case 'last_week':
        const lDay = now.getDay();
        const lDiff = now.getDate() - lDay - 6;
        start = new Date(now.setDate(lDiff));
        start.setHours(0, 0, 0, 0);
        end = new Date(start);
        end.setDate(start.getDate() + 6);
        end.setHours(23, 59, 59, 999);
        break;
      case 'this_month':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      case 'select_month':
        start = new Date(year, month! - 1, 1);
        end = new Date(year, month!, 0);
        break;
      case 'select_year':
        start = utcDate(year, 0, 1);
       end = utcDate(year, 11, 31);
        break;
    }
    return { start, end };
  };

  // Helper to get the previous period range based on the current active filter
  const getPreviousPeriodRange = (currentStart: Date, currentEnd: Date): { start: Date, end: Date } => {
      const prevStart = new Date(currentStart);
      const prevEnd = new Date(currentEnd);

      if (activeFilter === 'this_month' || activeFilter === 'select_month') {
          prevStart.setMonth(prevStart.getMonth() - 1);
          prevEnd.setMonth(prevEnd.getMonth() - 1);
          // Handle end of month overflow
          const daysInPrevMonth = new Date(prevStart.getFullYear(), prevStart.getMonth() + 1, 0).getDate();
          prevEnd.setDate(Math.min(currentEnd.getDate(), daysInPrevMonth));
          if (activeFilter === 'select_month') {
             // For full month selection, ensure we get full previous month
             prevEnd.setDate(daysInPrevMonth);
          }
      } else if (activeFilter === 'this_week' || activeFilter === 'last_week') {
          prevStart.setDate(prevStart.getDate() - 7);
          prevEnd.setDate(prevEnd.getDate() - 7);
      } else if (activeFilter === 'select_year') {
          prevStart.setFullYear(prevStart.getFullYear() - 1);
          prevEnd.setFullYear(prevEnd.getFullYear() - 1);
      } else {
          // Default: 1 day back
          prevStart.setDate(prevStart.getDate() - 1);
          prevEnd.setDate(prevEnd.getDate() - 1);
      }
      return { start: prevStart, end: prevEnd };
  };

  const calculateForRange = (rangeStart: Date, rangeEnd: Date) => {
    const rs = startOfDay(rangeStart);
    const re = endOfDay(rangeEnd);

    const filteredContracts = localContracts.filter(c => isInRange(c.date, rs, re));

    const filteredTxs = localTransactions.filter(t => isInRange(t.date, rs, re));

    const income = filteredTxs.filter(t => t.type === TransactionType.INCOME).reduce((s, t) => s + (t.amount || 0), 0);
    const expense = filteredTxs.filter(t => t.type === TransactionType.EXPENSE).reduce((s, t) => s + (t.amount || 0), 0);
    const contractRevenue = filteredContracts.reduce((s, c) => s + c.totalAmount, 0);
    const paidByContract: Record<string, number> = {};
    // Sum all income payments up to end of range for selected contracts
    localTransactions
      .filter(t => t.type === TransactionType.INCOME && t.contractId)
      .forEach(t => {
        const td = parseDateOnlyLocal(t.date);
        if (!td) return;
        if (td.getTime() > re.getTime()) return;
        paidByContract[t.contractId!] = (paidByContract[t.contractId!] || 0) + (t.amount || 0);
      });

    const remainingAmount = filteredContracts.reduce((s, c) => {
      const paid = paidByContract[c.id] || 0;
      return s + Math.max(0, (c.totalAmount || 0) - paid);
    }, 0);

    const breakdown = serviceTypesList.map(type => {
      const typeContracts = filteredContracts.filter(c => c.serviceType === type);
      const typeRevenue = typeContracts.reduce((s, c) => s + c.totalAmount, 0);
      const typeCount = typeContracts.length;
      const typePaid = localTransactions
        .filter(t =>
          t.type === TransactionType.INCOME &&
          t.contractId &&
          typeContracts.some(tc => tc.id === t.contractId) &&
          isInRange(t.date, rs, re)
        )
        .reduce((s, t) => s + (t.amount || 0), 0);

      return {
        name: type,
        count: typeCount,
        revenue: typeRevenue,
        actualPaid: typePaid,
        remaining: typeRevenue - typePaid,
        aov: typeCount > 0 ? Math.round(typeRevenue / typeCount) : 0,
        health: typeRevenue > 0 ? Math.round((typePaid / typeRevenue) * 100) : 0
      };
    }).filter(b => b.revenue > 0 || b.count > 0);

    return { income, expense, contractRevenue, remainingAmount, breakdown, count: filteredContracts.length, filteredContracts, filteredTxs };
  };

  const summaryData = useMemo(() => {
    if (activeFilter.startsWith('compare')) {
      let dataA, dataB;
      if (activeFilter === 'compare_years') {
        dataA = calculateForRange(new Date(compareYearA, 0, 1), new Date(compareYearA, 11, 31));
        dataB = calculateForRange(new Date(compareYearB, 0, 1), new Date(compareYearB, 11, 31));
      } else if (activeFilter === 'compare_months') {
        dataA = calculateForRange(new Date(compareYearA, compareMonth - 1, 1), new Date(compareYearA, compareMonth, 0));
        dataB = calculateForRange(new Date(compareYearB, compareMonth - 1, 1), new Date(compareYearB, compareMonth, 0));
      } else {
        const now = new Date();
        dataA = calculateForRange(new Date(compareYearA, now.getMonth(), now.getDate() - 7), new Date(compareYearA, now.getMonth(), now.getDate()));
        dataB = calculateForRange(new Date(compareYearB, now.getMonth(), now.getDate() - 7), new Date(compareYearB, now.getMonth(), now.getDate()));
      }
      return { dataA, dataB, isCompare: true };
    } else {
      const range = getPeriodRange(activeFilter, selectedYear, selectedMonth);
      const data = calculateForRange(range.start, range.end);
      return { data, isCompare: false };
    }
  }, [localContracts, localTransactions, activeFilter, selectedYear, selectedMonth, compareYearA, compareYearB, compareMonth, serviceTypesList]);

  const stats = summaryData.isCompare ? summaryData.dataA! : summaryData.data!;

  // --- GROWTH CHART LOGIC (REVENUE BY GROUP WITH % COMPARISON) ---
  const growthChartData = useMemo(() => {
      let currentStart, currentEnd, prevStart, prevEnd;

      if (activeFilter.startsWith('compare')) {
          // Manual compare is handled differently, simplified to show A vs B roughly or just A
          // For the requested "Vertical Bar with Growth", it's best for Time-based filters.
          // Fallback to Current stats breakdown if compare mode.
          return stats.breakdown.map(b => ({ name: b.name, revenue: b.revenue, growth: 0 }));
      } else {
          const range = getPeriodRange(activeFilter, selectedYear, selectedMonth);
          currentStart = range.start;
          currentEnd = range.end;
          const prevRange = getPreviousPeriodRange(currentStart, currentEnd);
          prevStart = prevRange.start;
          prevEnd = prevRange.end;
      }

      // Calculate Revenue by Group for Current Period
      const groupRevenueCurrent: Record<string, number> = {};
      const currentContracts = localContracts.filter(c => {
          const d = new Date(c.date);
          return d >= currentStart && d <= currentEnd;
      });
      
      currentContracts.forEach(c => {
          (c.items || []).forEach(item => {
              const service = services.find(s => s.ma_dv === item.serviceId);
              const groupName = service?.nhom_dv || 'DỊCH VỤ KHÁC';
              groupRevenueCurrent[groupName] = (groupRevenueCurrent[groupName] || 0) + item.subtotal;
          });
      });

      // Calculate Revenue by Group for Previous Period
      const groupRevenuePrev: Record<string, number> = {};
      const prevContracts = localContracts.filter(c => {
          const d = new Date(c.date);
          return d >= prevStart && d <= prevEnd;
      });

      prevContracts.forEach(c => {
          (c.items || []).forEach(item => {
              const service = services.find(s => s.ma_dv === item.serviceId);
              const groupName = service?.nhom_dv || 'DỊCH VỤ KHÁC';
              groupRevenuePrev[groupName] = (groupRevenuePrev[groupName] || 0) + item.subtotal;
          });
      });

      // Merge and Format
      const allGroups = Array.from(new Set([...Object.keys(groupRevenueCurrent), ...Object.keys(groupRevenuePrev)]));
      
      return allGroups.map(group => {
          const current = groupRevenueCurrent[group] || 0;
          const prev = groupRevenuePrev[group] || 0;
          let growth = 0;
          if (prev > 0) {
              growth = ((current - prev) / prev) * 100;
          } else if (current > 0) {
              growth = 100; // New growth
          }
          
          return {
              name: group,
              revenue: current,
              growth: Math.round(growth),
              hasPrev: prev > 0
          };
      }).sort((a,b) => b.revenue - a.revenue);

  }, [activeFilter, selectedYear, selectedMonth, localContracts, services]);

  // --- RANKING LOGIC ---
  const rankingData = useMemo(() => {
    let rangeStart, rangeEnd;
    const now = new Date();
    
    if (rankingPeriod === 'global') {
      const range = activeFilter.startsWith('compare') 
        ? { start: new Date(compareYearA, 0, 1), end: new Date(compareYearA, 11, 31) }
        : getPeriodRange(activeFilter, selectedYear, selectedMonth);
      rangeStart = range.start;
      rangeEnd = range.end;
    } else if (rankingPeriod === 'this_month') {
      rangeStart = new Date(now.getFullYear(), now.getMonth(), 1);
      rangeEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    } else { 
      rangeStart = new Date(now.getFullYear(), 0, 1);
      rangeEnd = new Date(now.getFullYear(), 11, 31);
    }

    const rStart = startOfDay(rangeStart);
    const rEnd = endOfDay(rangeEnd);

    const filteredContracts = localContracts.filter(c => {
      return isInRange(c.date, rStart, rEnd);
    });

    if (rankingMode === 'type') {
      return serviceTypesList.map(type => {
        const typeContracts = filteredContracts.filter(c => c.serviceType === type);
        const revenue = typeContracts.reduce((s, c) => s + c.totalAmount, 0);
        const count = typeContracts.length;
        const paid = localTransactions
          .filter(t =>
            t.type === TransactionType.INCOME &&
            t.contractId &&
            typeContracts.some(tc => tc.id === t.contractId) &&
            isInRange(t.date, rStart, rEnd)
          )
          .reduce((s, t) => s + (t.amount || 0), 0);
        return {
          name: type,
          count,
          revenue,
          actualPaid: paid,
          remaining: revenue - paid,
          health: revenue > 0 ? Math.round((paid / revenue) * 100) : 0
        };
      }).filter(i => i.count > 0 || i.revenue > 0);
    } else if (rankingMode === 'product') {
      const productMap: Record<string, any> = {};
      filteredContracts.forEach(c => {
        (c.items || []).forEach(item => {
          const name = item.serviceName;
          if (!productMap[name]) productMap[name] = { name, count: 0, revenue: 0, actualPaid: 0, remaining: 0, health: 0 };
          productMap[name].count += item.quantity;
          productMap[name].revenue += item.subtotal;
          
          const payRatio = c.totalAmount > 0 ? c.paidAmount / c.totalAmount : 0;
          productMap[name].actualPaid += Math.round(item.subtotal * payRatio);
          productMap[name].remaining = productMap[name].revenue - productMap[name].actualPaid;
          productMap[name].health = productMap[name].revenue > 0 ? Math.round((productMap[name].actualPaid / productMap[name].revenue) * 100) : 0;
        });
      });
      return Object.values(productMap);
    } else {
      const groupMap: Record<string, any> = {};
      filteredContracts.forEach(c => {
        (c.items || []).forEach(item => {
          const service = services.find(s => s.ma_dv === item.serviceId);
          const groupName = service?.nhom_dv || 'DỊCH VỤ KHÁC';
          if (!groupMap[groupName]) groupMap[groupName] = { name: groupName, count: 0, revenue: 0, actualPaid: 0, remaining: 0, health: 0 };
          groupMap[groupName].count += item.quantity;
          groupMap[groupName].revenue += item.subtotal;
          
          const payRatio = c.totalAmount > 0 ? c.paidAmount / c.totalAmount : 0;
          groupMap[groupName].actualPaid += Math.round(item.subtotal * payRatio);
          groupMap[groupName].remaining = groupMap[groupName].revenue - groupMap[groupName].actualPaid;
          groupMap[groupName].health = groupMap[groupName].revenue > 0 ? Math.round((groupMap[groupName].actualPaid / groupMap[groupName].revenue) * 100) : 0;
        });
      });
      return Object.values(groupMap);
    }
  }, [localContracts, localTransactions, rankingMode, rankingPeriod, activeFilter, selectedYear, selectedMonth, compareYearA, serviceTypesList, services]);

  const sortedRankingData = useMemo(() => {
    return [...rankingData].sort((a: any, b: any) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];
      if (sortConfig.direction === 'asc') return aVal > bVal ? 1 : -1;
      return aVal < bVal ? 1 : -1;
    });
  }, [rankingData, sortConfig]);

  const handleSort = (key: string) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  const compareChartData = useMemo(() => {
    if (!summaryData.isCompare) return [];
    return [
      { name: 'Doanh số HĐ', PerA: summaryData.dataA!.contractRevenue, PerB: summaryData.dataB!.contractRevenue },
      { name: 'Tiền đã thu', PerA: summaryData.dataA!.income, PerB: summaryData.dataB!.income },
      { name: 'Tiền chưa thu', PerA: summaryData.dataA!.remainingAmount, PerB: summaryData.dataB!.remainingAmount },
      { name: 'Chi phí', PerA: summaryData.dataA!.expense, PerB: summaryData.dataB!.expense },
    ];
  }, [summaryData]);

  const toggleCategory = (cat: string) => {
    setExpandedCategories(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]);
  };

  // --- DETAIL DATA GETTERS ---
  const getDetailData = () => {
    if (!selectedMetric) return [];
    if (selectedMetric === 'revenue') return stats.filteredContracts || [];
    if (selectedMetric === 'debt') return (stats.filteredContracts || []).filter(c => c.totalAmount > c.paidAmount);
    if (selectedMetric === 'income') return (stats.filteredTxs || []).filter(t => t.type === TransactionType.INCOME);
    if (selectedMetric === 'expense') return (stats.filteredTxs || []).filter(t => t.type === TransactionType.EXPENSE);
    return [];
  };

  const renderDetailTable = () => {
    if (selectedMetric === 'revenue') {
        const currentContracts = stats.filteredContracts || [];
        const byType: Record<string, number> = {};
        const byGroup: Record<string, number> = {};

        currentContracts.forEach(c => {
            // Aggregate by Type (Service Type on Contract)
            const type = c.serviceType || 'Khác';
            byType[type] = (byType[type] || 0) + c.totalAmount;

            // Aggregate by Group (Services items)
            c.items.forEach(item => {
                const service = services.find(s => s.ma_dv === item.serviceId);
                const group = service?.nhom_dv || 'Khác';
                byGroup[group] = (byGroup[group] || 0) + item.subtotal;
            });
        });

        // Prepare comparison data if available
        const prevContracts = summaryData.isCompare ? (summaryData.dataB?.filteredContracts || []) : [];
        const prevByType: Record<string, number> = {};
        const prevByGroup: Record<string, number> = {};

        if (summaryData.isCompare) {
            prevContracts.forEach(c => {
                const type = c.serviceType || 'Khác';
                prevByType[type] = (prevByType[type] || 0) + c.totalAmount;
                c.items.forEach(item => {
                    const service = services.find(s => s.ma_dv === item.serviceId);
                    const group = service?.nhom_dv || 'Khác';
                    prevByGroup[group] = (prevByGroup[group] || 0) + item.subtotal;
                });
            });
        }

        const formatChartData = (currentObj: any, prevObj: any) => {
            return Object.entries(currentObj).map(([name, value]) => {
                const currentVal = value as number;
                const prevVal = (prevObj[name] as number) || 0;
                const growth = prevVal === 0 ? 100 : ((currentVal - prevVal) / prevVal) * 100;
                return {
                    name,
                    value: currentVal,
                    growth: summaryData.isCompare ? growth : 0,
                    hasPrev: summaryData.isCompare && prevVal > 0
                };
            }).sort((a,b) => b.value - a.value);
        };

        const typeData = formatChartData(byType, prevByType);
        const groupData = formatChartData(byGroup, prevByGroup);
        const totalRevenue = stats.contractRevenue || 1;

        const renderBarChart = (data: any[], title: string) => (
            <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm h-full">
                <h4 className="font-black text-slate-900 uppercase text-sm tracking-widest flex items-center gap-2 mb-6">
                    <PieIcon size={16} className="text-blue-600"/> {title}
                </h4>
                <div className="space-y-4">
                    {data.map((item, idx) => {
                        const percent = (item.value / totalRevenue) * 100;
                        return (
                            <div key={idx} className="group">
                                <div className="flex justify-between items-end mb-1">
                                    <span className="text-xs font-bold text-slate-700 uppercase">{item.name}</span>
                                    <div className="flex items-center gap-2">
                                        {summaryData.isCompare && (
                                            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${item.growth >= 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                                                {item.growth > 0 ? '+' : ''}{Math.round(item.growth)}%
                                            </span>
                                        )}
                                        <span className="text-xs font-black text-slate-900">{item.value.toLocaleString()}đ</span>
                                    </div>
                                </div>
                                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                                    <div 
                                        className="h-full bg-blue-500 rounded-full group-hover:bg-blue-600 transition-all duration-500" 
                                        style={{ width: `${percent}%` }}
                                    ></div>
                                </div>
                            </div>
                        )
                    })}
                    {data.length === 0 && <div className="text-center text-slate-400 italic py-10">Chưa có dữ liệu</div>}
                </div>
            </div>
        );

        return (
            <div className="p-8 bg-slate-50/50">
               <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {renderBarChart(typeData, "Cơ cấu theo Loại Dịch Vụ")}
                  {renderBarChart(groupData, "Cơ cấu theo Nhóm Dịch Vụ")}
               </div>
            </div>
        );
    }

    if (selectedMetric === 'expense') {
        const expenseTxs = (stats.filteredTxs || []).filter(t => t.type === TransactionType.EXPENSE);
        const incomeTxs = (stats.filteredTxs || []).filter(t => t.type === TransactionType.INCOME);
        const totalExpense = expenseTxs.reduce((sum, t) => sum + t.amount, 0);
        
        // Data for Breakdown List
        const breakdown: Record<string, { total: number, subs: Record<string, number> }> = {};
        expenseTxs.forEach(t => {
           const main = t.mainCategory || 'Khác';
           const sub = t.category || 'Khác';
           if (!breakdown[main]) breakdown[main] = { total: 0, subs: {} };
           breakdown[main].total += t.amount;
           breakdown[main].subs[sub] = (breakdown[main].subs[sub] || 0) + t.amount;
        });
        const sortedCats = Object.entries(breakdown).sort((a, b) => b[1].total - a[1].total);
        
        // Data for Pie Chart
        const pieData = sortedCats.map(([name, data]) => ({ name, value: data.total }));

        // Data for Trend Bar Chart
        const trendMap: Record<string, { income: number, expense: number, date: Date }> = {};
        [...expenseTxs, ...incomeTxs].forEach(t => {
            const d = new Date(t.date);
            let key = '';
            let sortDate = d;
            
            // Simple grouping logic based on filter
            if (activeFilter.includes('year')) {
                 key = `T${d.getMonth() + 1}`;
                 sortDate = new Date(d.getFullYear(), d.getMonth(), 1);
            } else {
                 key = `${d.getDate()}/${d.getMonth() + 1}`;
                 sortDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
            }
            
            if (!trendMap[key]) trendMap[key] = { income: 0, expense: 0, date: sortDate };
            if (t.type === TransactionType.INCOME) trendMap[key].income += t.amount;
            else trendMap[key].expense += t.amount;
        });
        
        const trendData = Object.entries(trendMap)
            .sort((a, b) => a[1].date.getTime() - b[1].date.getTime())
            .map(([name, val]) => ({ name, income: val.income, expense: val.expense }));

        return (
            <div className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* LEFT COLUMN: Breakdown List */}
                    <div className="space-y-4">
                        <div className="flex justify-between items-center mb-4">
                             <h4 className="font-black text-slate-900 uppercase text-xs tracking-widest flex items-center gap-2"><List size={16} className="text-blue-600"/> Chi tiết hạng mục (Chi phí)</h4>
                             <span className="text-slate-500 font-bold text-xs">Tổng chi: <span className="text-red-600 font-black text-lg ml-1">{totalExpense.toLocaleString()}đ</span></span>
                        </div>
                        <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 scrollbar-hide">
                            {sortedCats.map(([catName, data]) => {
                                const percent = totalExpense ? (data.total / totalExpense) * 100 : 0;
                                const isExpanded = expandedCategories.includes(catName);
                                return (
                                    <div key={catName} className="group">
                                        <div 
                                            onClick={() => toggleCategory(catName)}
                                            className="flex items-center justify-between p-3 bg-slate-50 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="text-slate-400 group-hover:text-blue-600 transition-colors">
                                                    {isExpanded ? <MinusSquare size={16}/> : <PlusSquare size={16}/>}
                                                </div>
                                                <div className="flex-1">
                                                    <div className="font-bold text-slate-800 text-sm uppercase">{catName}</div>
                                                    <div className="w-24 h-1 bg-slate-200 rounded-full mt-1 overflow-hidden">
                                                        <div className="h-full bg-red-500" style={{ width: `${percent}%` }}/>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="font-black text-slate-900 text-sm">{data.total.toLocaleString()}đ</div>
                                                <div className="text-[10px] text-slate-500 font-bold">{percent.toFixed(1)}%</div>
                                            </div>
                                        </div>
                                        {isExpanded && (
                                            <div className="pl-12 pr-4 py-2 space-y-2 border-l-2 border-slate-100 ml-4 animate-in slide-in-from-top-2">
                                                {Object.entries(data.subs).sort((a,b) => b[1]-a[1]).map(([sub, val]) => (
                                                    <div key={sub} className="flex justify-between text-xs hover:bg-slate-50 p-1 rounded transition-colors">
                                                        <span className="text-slate-600 font-bold uppercase text-[10px] tracking-wide">{sub}</span>
                                                        <span className="font-bold text-slate-800">{val.toLocaleString()}đ</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                            {sortedCats.length === 0 && <div className="text-center text-slate-400 italic py-8">Chưa có dữ liệu chi phí trong kỳ này</div>}
                        </div>
                    </div>

                    {/* RIGHT COLUMN: Charts */}
                    <div className="space-y-8">
                        {/* Pie Chart */}
                        <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
                            <h4 className="font-black text-slate-900 uppercase text-xs tracking-widest mb-4 flex items-center gap-2"><PieIcon size={14} className="text-blue-500"/> Cơ cấu chi phí</h4>
                            <div className="h-48 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={5}>
                                            {pieData.map((_, idx) => <Cell key={idx} fill={COLORS[idx % COLORS.length]} strokeWidth={0} />)}
                                        </Pie>
                                        <Tooltip formatter={(val: number) => val.toLocaleString() + 'đ'} contentStyle={{borderRadius:'12px', border:'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}} />
                                        <Legend iconType="circle" layout="vertical" align="right" verticalAlign="middle" wrapperStyle={{fontSize: '10px', fontWeight: 'bold', color: '#64748b'}} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Bar Chart */}
                        <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
                            <h4 className="font-black text-slate-900 uppercase text-xs tracking-widest mb-4 flex items-center gap-2"><BarChart3 size={14} className="text-purple-500"/> Biến động Thu/Chi</h4>
                            <div className="h-48 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={trendData}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                        <XAxis dataKey="name" tick={{fontSize: 9, fontWeight: 'bold', fill: '#94a3b8'}} axisLine={false} tickLine={false} />
                                        <Tooltip formatter={(val: number) => val.toLocaleString() + 'đ'} contentStyle={{borderRadius:'12px', border:'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}} cursor={{fill: '#f1f5f9'}} />
                                        <Legend wrapperStyle={{fontSize: '10px', fontWeight: 'bold'}} />
                                        <Bar dataKey="income" name="Thu" fill="#10B981" radius={[4,4,0,0]} barSize={20} />
                                        <Bar dataKey="expense" name="Chi" fill="#EF4444" radius={[4,4,0,0]} barSize={20} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const data = getDetailData();
    if (data.length === 0) return <div className="p-8 text-center text-slate-400 italic">Không có dữ liệu chi tiết cho kỳ này.</div>;

    if (selectedMetric === 'debt') {
        const contracts = data as Contract[];
        return (
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 text-[10px] uppercase font-black text-slate-500">
                        <tr>
                            <th className="p-4">Mã HĐ</th>
                            <th className="p-4">Khách hàng</th>
                            <th className="p-4">Ngày ký</th>
                            <th className="p-4 text-right">Tổng giá trị</th>
                            <th className="p-4 text-right">Đã thanh toán</th>
                            <th className="p-4 text-right text-red-500">Còn nợ</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 text-xs font-medium">
                        {contracts.map(c => (
                            <tr key={c.id} className="hover:bg-slate-50">
                                <td className="p-4 font-bold text-blue-600">{c.contractCode}</td>
                                <td className="p-4">{c.customer?.name || '---'}</td>
                                <td className="p-4">{c.date ? c.date.split('-').reverse().join('/') : ''}</td>
                                <td className="p-4 text-right font-bold">{c.totalAmount.toLocaleString()}đ</td>
                                <td className="p-4 text-right text-emerald-600">{c.paidAmount.toLocaleString()}đ</td>
                                <td className="p-4 text-right text-red-500 font-bold">{(c.totalAmount - c.paidAmount).toLocaleString()}đ</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    }

    if (selectedMetric === 'income') {
        const txs = data as Transaction[];
        return (
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 text-[10px] uppercase font-black text-slate-500">
                        <tr>
                            <th className="p-4">Ngày</th>
                            <th className="p-4">Nội dung</th>
                            <th className="p-4">Danh mục</th>
                            <th className="p-4 text-right">Số tiền</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 text-xs font-medium">
                        {txs.map(t => (
                            <tr key={t.id} className="hover:bg-slate-50">
                                <td className="p-4 text-slate-500">{t.date.split('-').reverse().join('/')}</td>
                                <td className="p-4 font-bold">{t.description}</td>
                                <td className="p-4"><span className="bg-slate-100 px-2 py-1 rounded">{t.category}</span></td>
                                <td className="p-4 text-right font-bold text-emerald-600">
                                    {t.amount.toLocaleString()}đ
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    }
    return null;
  };

  const CustomBarLabel = (props: any) => {
    const { x, y, width, value, index } = props;
    const item = growthChartData[index];
    if (!item || item.growth === 0) return null;
    
    const isPositive = item.growth > 0;
    const color = isPositive ? '#10B981' : '#EF4444'; // Emerald or Red
    
    return (
      <text 
        x={x + width / 2} 
        y={y - 10} 
        fill={color} 
        textAnchor="middle" 
        fontSize={10} 
        fontWeight="bold"
      >
        {isPositive ? '+' : ''}{item.growth}%
      </text>
    );
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      {/* 1. REFACTORED HEADER */}
      <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="w-14 h-14 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20 shrink-0">
              <Target size={28} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Phân tích chuyên sâu</h2>
              <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mt-1">
                {summaryData.isCompare ? 'Chế độ so sánh đối soát' : 'Giám sát sức khỏe tài chính'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3 w-full md:w-auto">
             {/* Main Period Selector */}
             <div className="flex items-center gap-2 bg-white border border-blue-200 px-2 py-1 rounded-2xl shadow-sm">
                <Calendar className="text-blue-500 ml-2" size={18} />
                <select 
                  value={activeFilter}
                  onChange={(e) => setActiveFilter(e.target.value as FilterPeriod)}
                  className="bg-transparent text-xs font-black uppercase text-slate-700 py-2.5 outline-none cursor-pointer min-w-[140px]"
                >
                  <option value="today">Hôm nay</option>
                  <option value="this_week">Tuần này</option>
                  <option value="last_week">Tuần trước</option>
                  <option value="this_month">Tháng này</option>
                  <option value="select_month">Chọn Tháng</option>
                  <option value="select_year">Chọn Năm</option>
                  <option value="compare_years">So sánh Năm</option>
                  <option value="compare_months">So sánh Tháng</option>
                </select>
                <ChevronDown className="text-slate-400 mr-2" size={14} />
             </div>

             {/* Dynamic Sub-Selectors */}
             {(activeFilter === 'select_month' || activeFilter === 'select_year') && (
                <div className="flex gap-2 animate-in slide-in-from-left-2">
                   <select 
                      className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold outline-none cursor-pointer"
                      value={selectedYear} 
                      onChange={e => setSelectedYear(Number(e.target.value))}
                   >
                      {YEARS.map(y => <option key={y} value={y}>Năm {y}</option>)}
                   </select>
                   {activeFilter === 'select_month' && (
                      <select 
                        className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold outline-none cursor-pointer"
                        value={selectedMonth} 
                        onChange={e => setSelectedMonth(Number(e.target.value))}
                      >
                        {Array.from({ length: 12 }, (_, i) => <option key={i+1} value={i+1}>Tháng {i+1}</option>)}
                      </select>
                   )}
                </div>
             )}

             {activeFilter.startsWith('compare') && (
                <div className="flex items-center gap-2 animate-in slide-in-from-left-2">
                   <div className="flex items-center bg-blue-50 px-3 py-2 rounded-xl border border-blue-100">
                      <span className="text-[10px] font-black text-blue-600 uppercase mr-2">Kỳ A</span>
                      <select className="bg-transparent text-xs font-bold outline-none" value={compareYearA} onChange={e => setCompareYearA(Number(e.target.value))}>
                         {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                      </select>
                   </div>
                   <ArrowRightLeft size={14} className="text-slate-300" />
                   <div className="flex items-center bg-slate-50 px-3 py-2 rounded-xl border border-slate-200">
                      <span className="text-[10px] font-black text-slate-500 uppercase mr-2">Kỳ B</span>
                      <select className="bg-transparent text-xs font-bold outline-none" value={compareYearB} onChange={e => setCompareYearB(Number(e.target.value))}>
                         {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                      </select>
                   </div>
                   {activeFilter === 'compare_months' && (
                      <select className="bg-purple-50 border border-purple-100 text-purple-700 rounded-xl px-3 py-2 text-xs font-bold outline-none" value={compareMonth} onChange={e => setCompareMonth(Number(e.target.value))}>
                         {Array.from({length: 12}, (_, i) => <option key={i+1} value={i+1}>T{i+1}</option>)}
                      </select>
                   )}
                </div>
             )}
          </div>
      </div>

      {isLoadingData ? (
         <div className="p-20 flex justify-center items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
         </div>
      ) : (
        <>
          {/* 2. KPI GRID (5 ITEMS) */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <KPICard 
              id="revenue"
              title="Doanh số chi tiết" 
              value={stats.contractRevenue} 
              icon={FileText} color="blue" 
              active={selectedMetric === 'revenue'}
              onClick={() => setSelectedMetric(selectedMetric === 'revenue' ? null : 'revenue')}
              subtitle={<>Số HĐ: <span className="font-bold text-slate-900">{stats.count}</span> • TB: <span className="font-bold text-slate-900">{stats.count > 0 ? Math.round(stats.contractRevenue/stats.count).toLocaleString() : 0}đ</span></>}
            />
            <KPICard 
              id="income"
              title="Thực thu" 
              value={stats.income} 
              icon={Wallet} color="emerald" 
              active={selectedMetric === 'income'}
              onClick={() => setSelectedMetric(selectedMetric === 'income' ? null : 'income')}
              subtitle="Dòng tiền thực tế"
            />
            <KPICard 
              id="expense"
              title="Chi phí" 
              value={stats.expense} 
              icon={AlertCircle} color="red" 
              active={selectedMetric === 'expense'}
              onClick={() => setSelectedMetric(selectedMetric === 'expense' ? null : 'expense')}
              subtitle="Tổng chi vận hành"
            />
            <KPICard 
              id="profit"
              title="Lợi nhuận ròng" 
              value={stats.income - stats.expense} 
              icon={TrendingUp} color="amber" 
              active={selectedMetric === 'profit'}
              onClick={() => setSelectedMetric(selectedMetric === 'profit' ? null : 'profit')}
              subtitle="Thực thu - Chi phí"
            />
            <KPICard 
              id="debt"
              title="Công nợ chưa thu" 
              value={stats.remainingAmount} 
              icon={ArrowDownCircle} color="purple" 
              active={selectedMetric === 'debt'}
              onClick={() => setSelectedMetric(selectedMetric === 'debt' ? null : 'debt')}
              subtitle="Tiền khách còn nợ"
            />
          </div>

          {/* 3. DETAIL SECTION (COLLAPSIBLE) */}
          {selectedMetric && (
             <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl overflow-hidden animate-in slide-in-from-top-4">
                <div className="p-6 bg-slate-50/50 border-b border-slate-100 flex justify-between items-center">
                   <h3 className="text-lg font-black text-slate-800 uppercase flex items-center gap-2">
                      <List size={20} className="text-blue-600" /> 
                      Chi tiết: {
                         selectedMetric === 'revenue' ? 'Phân tích Doanh Thu' :
                         selectedMetric === 'income' ? 'Lịch sử Thu tiền' :
                         selectedMetric === 'expense' ? 'Phân tích Chi phí' :
                         selectedMetric === 'debt' ? 'Danh sách Công nợ' : 'Phân tích Lợi nhuận'
                      }
                   </h3>
                   <button onClick={() => setSelectedMetric(null)} className="p-2 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-600"><X size={20}/></button>
                </div>
                {renderDetailTable()}
             </div>
          )}

          {/* 4. CHARTS & RANKING */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* FULL WIDTH CHART - REPLACED EFFICIENCY CARD */}
            <div className="lg:col-span-3 bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm space-y-8">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-black text-slate-900 tracking-tight">Đối soát & So sánh Tăng trưởng</h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Phân tích doanh thu theo Nhóm Dịch Vụ</p>
                </div>
                {!activeFilter.startsWith('compare') && (
                   <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-3 py-1 rounded-full uppercase">So với kỳ trước</span>
                )}
              </div>
              
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  {/* GROWTH CHART: Vertical Bars with % Labels */}
                  <BarChart data={growthChartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 'bold'}} />
                      <YAxis hide />
                      <Tooltip 
                        cursor={{fill: '#f8fafc'}} 
                        contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.15)', padding: '20px' }}
                        formatter={(val: number) => val.toLocaleString() + 'đ'}
                      />
                      <Bar dataKey="revenue" name="Doanh thu" fill="#3B82F6" radius={[8, 8, 8, 8]} barSize={50}>
                         <LabelList dataKey="revenue" content={<CustomBarLabel />} />
                      </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Ranking Table */}
          <div className="bg-white rounded-[3rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="p-8 border-b border-slate-50 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-white shrink-0">
              <div className="space-y-1">
                <h3 className="text-xl font-black text-slate-900 tracking-tight">Xếp hạng Dịch vụ & Dòng tiền</h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Phân tích hiệu suất theo từng phân loại</p>
              </div>
              
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex bg-slate-100 p-1 rounded-xl">
                  <button onClick={() => setRankingMode('type')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${rankingMode === 'type' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}>
                    <List size={14} /> Theo Loại
                  </button>
                  <button onClick={() => setRankingMode('group')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${rankingMode === 'group' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}>
                    <Layers size={14} /> Theo Nhóm
                  </button>
                  <button onClick={() => setRankingMode('product')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${rankingMode === 'product' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}>
                    <Package size={14} /> Theo Sản phẩm
                  </button>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50/50">
                  <tr>
                    <th className="px-8 py-5 border-b border-slate-100">
                      <button onClick={() => handleSort('name')} className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-blue-600 transition-colors">
                        Mảng dịch vụ / Sản phẩm {sortConfig.key === 'name' && (sortConfig.direction === 'desc' ? <ChevronDown size={14}/> : <ChevronUp size={14}/>)}
                      </button>
                    </th>
                    <th className="px-6 py-5 border-b border-slate-100 text-center">
                      <button onClick={() => handleSort('count')} className="flex items-center justify-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest w-full hover:text-blue-600 transition-colors">
                        SL {sortConfig.key === 'count' && (sortConfig.direction === 'desc' ? <ChevronDown size={14}/> : <ChevronUp size={14}/>)}
                      </button>
                    </th>
                    <th className="px-6 py-5 border-b border-slate-100 text-right">
                      <button onClick={() => handleSort('revenue')} className="flex items-center justify-end gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest w-full hover:text-blue-600 transition-colors">
                        Doanh số (Gross) {sortConfig.key === 'revenue' && (sortConfig.direction === 'desc' ? <ChevronDown size={14}/> : <ChevronUp size={14}/>)}
                      </button>
                    </th>
                    <th className="px-6 py-5 border-b border-slate-100 text-right">
                      <button onClick={() => handleSort('actualPaid')} className="flex items-center justify-end gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest w-full hover:text-blue-600 transition-colors">
                        Thực thu (Net) {sortConfig.key === 'actualPaid' && (sortConfig.direction === 'desc' ? <ChevronDown size={14}/> : <ChevronUp size={14}/>)}
                      </button>
                    </th>
                    <th className="px-6 py-5 border-b border-slate-100 text-right">
                      <button onClick={() => handleSort('remaining')} className="flex items-center justify-end gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest w-full hover:text-blue-600 transition-colors">
                        Còn nợ {sortConfig.key === 'remaining' && (sortConfig.direction === 'desc' ? <ChevronDown size={14}/> : <ChevronUp size={14}/>)}
                      </button>
                    </th>
                    <th className="px-8 py-5 border-b border-slate-100 text-right">
                      <button onClick={() => handleSort('health')} className="flex items-center justify-end gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest w-full hover:text-blue-600 transition-colors">
                        Sức khỏe nợ {sortConfig.key === 'health' && (sortConfig.direction === 'desc' ? <ChevronDown size={14}/> : <ChevronUp size={14}/>)}
                      </button>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {sortedRankingData.map((item: any, idx) => (
                    <tr key={item.name} className="hover:bg-slate-50/80 transition-all group">
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-2xl flex items-center justify-center font-black text-xs" style={{backgroundColor: `${COLORS[idx % COLORS.length]}15`, color: COLORS[idx % COLORS.length]}}>
                            {item.name.charAt(0)}
                          </div>
                          <div className="font-black text-slate-800 text-sm line-clamp-1 max-w-[200px]">{item.name}</div>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-center font-bold text-slate-600">{item.count}</td>
                      <td className="px-6 py-5 text-right font-bold text-slate-900">{item.revenue.toLocaleString()}đ</td>
                      <td className="px-6 py-5 text-right font-black text-emerald-600">{item.actualPaid.toLocaleString()}đ</td>
                      <td className="px-6 py-5 text-right font-bold text-red-500">{item.remaining.toLocaleString()}đ</td>
                      <td className="px-8 py-5 text-right">
                        <div className="flex flex-col items-end">
                          <div className="text-xs font-black text-slate-900">{item.health}%</div>
                          <div className="w-32 h-1.5 bg-slate-100 rounded-full mt-2 overflow-hidden border border-slate-50">
                            <div 
                              className={`h-full rounded-full transition-all duration-1000 ${item.health > 80 ? 'bg-emerald-500' : item.health > 40 ? 'bg-blue-500' : 'bg-red-500'}`} 
                              style={{width: `${Math.min(100, item.health)}%`}}
                            ></div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

const KPICard = ({ id, title, value, icon: Icon, color, active, onClick, subtitle }: any) => {
  const colorMap: any = {
    blue: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200', activeBg: 'bg-blue-600', activeText: 'text-white' },
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200', activeBg: 'bg-emerald-600', activeText: 'text-white' },
    red: { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-200', activeBg: 'bg-red-600', activeText: 'text-white' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200', activeBg: 'bg-amber-500', activeText: 'text-white' },
    purple: { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-200', activeBg: 'bg-purple-600', activeText: 'text-white' }
  };

  const theme = colorMap[color];

  return (
    <div 
      onClick={onClick}
      className={`relative p-6 rounded-[2.5rem] border transition-all cursor-pointer shadow-sm hover:shadow-lg group ${
        active ? `${theme.activeBg} border-transparent scale-105 z-10` : 'bg-white border-slate-100 hover:border-slate-300'
      }`}
    >
      <div className="flex justify-between items-start mb-4">
        <div className={`p-3 rounded-2xl transition-colors ${active ? 'bg-white/20 text-white' : `${theme.bg} ${theme.text}`}`}>
          <Icon size={24} />
        </div>
        {active && <Eye size={16} className="text-white/60" />}
      </div>
      <div className="space-y-1">
        <h4 className={`text-[10px] font-black uppercase tracking-widest ${active ? 'text-white/80' : 'text-slate-400'}`}>{title}</h4>
        <div className={`text-xl font-black tracking-tight truncate ${active ? 'text-white' : 'text-slate-900'}`}>
           {value.toLocaleString()}đ
        </div>
        <p className={`text-[9px] font-bold uppercase tracking-wider ${active ? 'text-white/60' : 'text-slate-300'}`}>
          {subtitle}
        </p>
      </div>
    </div>
  );
};

export default Dashboard;
