import React, { useState, useEffect, useMemo } from 'react'; 
import { 
  LayoutDashboard, FileText, Calendar, DollarSign, Users, 
  Package, Settings, LogOut, Menu, CheckSquare, Sparkles, Loader2, Lock, Receipt, BarChart3, Printer
} from 'lucide-react';
import Dashboard from './components/Dashboard';
import ContractManager from './components/ContractManager';
import ExpenseManager from './components/ExpenseManager';
import PayrollManager from './components/PayrollManager';
import ScheduleManager from './components/ScheduleManager';
import StaffManager from './components/StaffManager';
import ProductManager from './components/ProductManager';
import StudioSettings from './components/StudioSettings';
import TaskManager from './components/TaskManager';
import ConsultationManager from './components/ConsultationManager';
import ConsultationSalesAnalytics from './components/ConsultationSalesAnalytics';
import ConsultationServiceAnalytics from './components/ConsultationServiceAnalytics';
import PrintProductionManager from './components/PrintProductionManager';
import PrintCostManager from './components/PrintCostManager';
import { 
  Contract, Customer, Staff, Service, Transaction, Schedule, 
  Task, StudioInfo, ExpenseCategoryItem, ServiceTypeItem, ServiceGroupItem 
} from './types';
import { fetchBootstrapData, login as apiLogin, fetchTasks } from './apiService';
import { mockCustomers, mockContracts, mockServices, mockStaff, mockTransactions } from './mockData';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<Staff | null>(null);
  const [loginUser, setLoginUser] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [authError, setAuthError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [studioInfo, setStudioInfo] = useState<StudioInfo>({
    name: 'Ánh Sáng Studio',
    address: '',
    phone: '',
    directorName: '',
    logoText: 'AS',
    contractTerms: ''
  });
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategoryItem[]>([]);
  const [serviceTypes, setServiceTypes] = useState<ServiceTypeItem[]>([]);
  const [serviceGroups, setServiceGroups] = useState<ServiceGroupItem[]>([]);
  const [scheduleTypes, setScheduleTypes] = useState<string[]>([
    'Tư vấn', 'Chụp Pre-wedding', 'Chụp Phóng sự', 'Trang điểm', 'Thử váy', 'Trả ảnh', 'Quay phim'
  ]);
  const [departments, setDepartments] = useState<string[]>(['Sales', 'Photo', 'Makeup', 'Retouch']);

  const serviceTypesList = useMemo(() => serviceTypes.map(t => t.name), [serviceTypes]);
  const serviceGroupsList = useMemo(() => serviceGroups.map(g => g.groupName), [serviceGroups]);

  const isAdmin = useMemo(() => !!currentUser && currentUser.username === 'admin', [currentUser]);
  const isAdminOrDirector = useMemo(() => !!currentUser && (currentUser.username === 'admin' || currentUser.role === 'Giám đốc'), [currentUser]);

  const canViewDashboard = () => isAdminOrDirector;

  const canAccess = (module: string) => {
    if (!currentUser) return false;
    if (isAdminOrDirector) return true;
    const perms = currentUser.permissions?.[module];
    if (!perms) return false;
    return Object.values(perms).some((p: any) => p.view);
  };

  useEffect(() => {
    if (isAuthenticated && currentUser && !canViewDashboard() && activeTab === 'dashboard') {
      setActiveTab('tasks');
    }
  }, [isAuthenticated, currentUser, activeTab]);

  const refreshTasks = async () => {
    const fetchedTasks = await fetchTasks();
    if (fetchedTasks.length > 0) setTasks(fetchedTasks);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setAuthError('');
    try {
      const result = await apiLogin(loginUser, loginPass);
      if (result.success && result.user) {
        setCurrentUser(result.user);
        setIsAuthenticated(true);
        await loadData();
      } else {
        setAuthError(result.error || 'Đăng nhập thất bại');
      }
    } catch (err: any) {
      setAuthError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await fetchBootstrapData();
      if (data) {
        setContracts(data.contracts);
        setCustomers(data.customers);
        setServices(data.services);
        setStaff(data.staff);
        setTransactions(data.transactions);
        setSchedules(data.schedules);
        setTasks(data.tasks || []);
        if (data.studioInfo) setStudioInfo(data.studioInfo);
        if (data.expenseCategories) setExpenseCategories(data.expenseCategories);
        if (data.serviceTypes) setServiceTypes(data.serviceTypes);
        if (data.serviceGroups) setServiceGroups(data.serviceGroups);
        if (data.scheduleLabels) setScheduleTypes(data.scheduleLabels);
      } else {
        setContracts(mockContracts);
        setCustomers(mockCustomers);
        setServices(mockServices);
        setStaff(mockStaff);
        setTransactions(mockTransactions);
        setTasks([]);
        const uniqueTypes = Array.from(new Set(mockServices.map(s => s.type || 'Khác')));
        setServiceTypes(uniqueTypes.map((t, i) => ({ id: `st-${i}`, name: t })));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentUser(null);
    setLoginUser('');
    setLoginPass('');
  };

  if (!isAuthenticated) return <div />;

  const pendingTasksCount = tasks.filter(t => t.assignedStaffIds.includes(currentUser?.id || '') && t.status !== 'Completed').length;

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 bg-slate-900 text-white transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 flex flex-col`}>
        <div className="p-8">
          <div className="space-y-1">
            <SidebarItem icon={LayoutDashboard} label="Tổng quan" id="dashboard" activeTab={activeTab} setActiveTab={setActiveTab} visible={canViewDashboard()} />
            <SidebarItem icon={Receipt} label="Ghi Phiếu Chi" id="quick_expense" activeTab={activeTab} setActiveTab={setActiveTab} visible={true} />
            <SidebarItem icon={FileText} label="Hợp đồng" id="contracts" activeTab={activeTab} setActiveTab={setActiveTab} visible={canAccess('contracts')} />
            <SidebarItem icon={CheckSquare} label="Công việc" id="tasks" activeTab={activeTab} setActiveTab={setActiveTab} badge={pendingTasksCount > 0 ? pendingTasksCount : undefined} />
            <SidebarItem icon={Calendar} label="Lịch trình" id="schedule" activeTab={activeTab} setActiveTab={setActiveTab} visible={canAccess('schedules')} />
            <SidebarItem icon={Users} label="Nhật ký tư vấn" id="consultation" activeTab={activeTab} setActiveTab={setActiveTab} visible={true} />
            <SidebarItem icon={BarChart3} label="Phân tích sale" id="consultation_sales_analytics" activeTab={activeTab} setActiveTab={setActiveTab} visible={true} />
            <SidebarItem icon={BarChart3} label="Phân tích dịch vụ" id="consultation_service_analytics" activeTab={activeTab} setActiveTab={setActiveTab} visible={true} />
            <SidebarItem icon={DollarSign} label="Thu & Chi" id="finance" activeTab={activeTab} setActiveTab={setActiveTab} visible={canAccess('finance')} />
            <SidebarItem icon={Printer} label="Báo cáo in ấn" id="print_production" activeTab={activeTab} setActiveTab={setActiveTab} visible={canAccess('print_production')} />
            <SidebarItem icon={Printer} label="Chi phí in ấn" id="print_costs" activeTab={activeTab} setActiveTab={setActiveTab} visible={isAdmin} />
          </div>
        </div>
        <div className="mt-auto p-6 border-t border-slate-800">
          <button onClick={handleLogout} className="w-full flex items-center gap-3 p-4 rounded-2xl text-slate-300 hover:bg-slate-800 hover:text-white transition-all">
            <LogOut size={18} /> Đăng xuất
          </button>
        </div>
      </aside>

      <main className="flex-1 lg:ml-72">
        <div className="p-6 md:p-8 flex-1 overflow-x-hidden relative">
          {activeTab === 'print_production' && canAccess('print_production') && (
            <PrintProductionManager currentUser={currentUser} />
          )}
        </div>
      </main>
    </div>
  );
}

const SidebarItem = ({ icon: Icon, label, id, activeTab, setActiveTab, visible = true, badge }: any) => {
  if (!visible) return null;
  const isActive = activeTab === id;
  return (
    <button 
      onClick={() => setActiveTab(id)}
      className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all mb-1 group relative ${
        isActive ? 'bg-white text-slate-900 shadow-lg' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
      }`}
    >
      <div className="flex items-center gap-3">
        <Icon size={18} />
        <span className="font-bold text-sm">{label}</span>
      </div>
      {badge ? <span className="min-w-6 h-6 px-2 rounded-full bg-red-500 text-white text-[10px] font-black flex items-center justify-center">{badge}</span> : null}
    </button>
  );
};
