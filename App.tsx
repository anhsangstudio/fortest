import React, { useState, useEffect, useMemo } from 'react'; 
import { 
  LayoutDashboard, FileText, Calendar, DollarSign, Users, 
  Package, Settings, LogOut, Menu, CheckSquare, Sparkles, Loader2, Lock, Receipt
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
import { 
  Contract, Customer, Staff, Service, Transaction, Schedule, 
  Task, StudioInfo, ExpenseCategoryItem, ServiceTypeItem, ServiceGroupItem 
} from './types';
import { fetchBootstrapData, login as apiLogin, fetchTasks } from './apiService';
import { mockCustomers, mockContracts, mockServices, mockStaff, mockTransactions } from './mockData';

export default function App() {
  // Auth State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<Staff | null>(null);
  const [loginUser, setLoginUser] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [authError, setAuthError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // App State
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setSidebarOpen] = useState(true);

  // Data State
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

  const isAdminOrDirector = useMemo(() => {
    if (!currentUser) return false;
    return currentUser.username === 'admin' || currentUser.role === 'Giám đốc';
  }, [currentUser]);

  const canViewDashboard = () => isAdminOrDirector;

  const canAccess = (module: string) => {
    if (!currentUser) return false;
    if (isAdminOrDirector) return true;
    const perms = currentUser.permissions?.[module];
    if (!perms) return false;
    return Object.values(perms).some((p: any) => p.view);
  };

  // Ensure non-admin doesn't get stuck on dashboard tab
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

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-blue-600 rounded-2xl mx-auto flex items-center justify-center text-white mb-4 shadow-lg shadow-blue-500/30">
              <Sparkles size={32} />
            </div>
            <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Ánh Sáng Studio</h1>
            <p className="text-slate-500 font-bold text-xs uppercase tracking-widest mt-2">Hệ thống quản trị tập trung</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Tên đăng nhập</label>
               <input 
                  type="text" 
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-900"
                  value={loginUser}
                  onChange={e => setLoginUser(e.target.value)}
                  placeholder="admin"
               />
            </div>
            <div>
               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Mật khẩu</label>
               <input 
                  type="password" 
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-900"
                  value={loginPass}
                  onChange={e => setLoginPass(e.target.value)}
                  placeholder="••••••"
               />
            </div>

            {authError && (
              <div className="p-3 bg-red-50 text-red-600 rounded-xl text-xs font-bold flex items-center gap-2">
                 <Lock size={14} /> {authError}
              </div>
            )}

            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20 active:scale-95 flex items-center justify-center gap-2"
            >
               {isLoading ? <Loader2 className="animate-spin" size={18} /> : 'Đăng nhập hệ thống'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const pendingTasksCount = tasks.filter(t => t.assignedStaffIds.includes(currentUser?.id || '') && t.status !== 'Completed').length;

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 bg-slate-900 text-white transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 flex flex-col`}>
         <div className="p-8">
            <div className="flex items-center gap-3 mb-8">
               <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-black shadow-lg shadow-blue-500/30">
                 {studioInfo.logoImage ? <img src={studioInfo.logoImage} className="w-8 h-8 object-contain" /> : studioInfo.logoText}
               </div>
               <div>
                  <h1 className="font-black text-lg tracking-tight uppercase">Ánh Sáng</h1>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Studio Manager</p>
               </div>
            </div>

            <div className="space-y-1">
               <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 pl-4">Menu chính</div>

               <SidebarItem 
                  icon={LayoutDashboard} label="Tổng quan" id="dashboard" activeTab={activeTab} setActiveTab={setActiveTab} 
                  visible={canViewDashboard()}
               />

               <SidebarItem 
                  icon={Receipt} label="Ghi Phiếu Chi" id="quick_expense" activeTab={activeTab} setActiveTab={setActiveTab}
                  visible={true}
               />
               <SidebarItem 
                  icon={FileText} label="Hợp đồng" id="contracts" activeTab={activeTab} setActiveTab={setActiveTab} 
                  visible={canAccess('contracts')}
               />
               <SidebarItem 
                  icon={CheckSquare} label="Công việc" id="tasks" activeTab={activeTab} setActiveTab={setActiveTab}
                  badge={pendingTasksCount > 0 ? pendingTasksCount : undefined}
               />
               <SidebarItem 
                  icon={Calendar} label="Lịch trình" id="schedule" activeTab={activeTab} setActiveTab={setActiveTab} 
                  visible={canAccess('schedules')}
               />
               <SidebarItem 
                  icon={DollarSign} label="Thu & Chi" id="finance" activeTab={activeTab} setActiveTab={setActiveTab} 
                  visible={canAccess('finance')}
               />
               <SidebarItem 
                  icon={DollarSign} label="Bảng lương" id="payroll" activeTab={activeTab} setActiveTab={setActiveTab} 
                  visible={canAccess('staff')}
               />
               <SidebarItem 
                  icon={Users} label="Nhân sự" id="staff" activeTab={activeTab} setActiveTab={setActiveTab} 
                  visible={canAccess('staff')}
               />
               <SidebarItem 
                  icon={Package} label="Dịch vụ" id="products" activeTab={activeTab} setActiveTab={setActiveTab} 
                  visible={canAccess('products')}
               />
               <SidebarItem 
                  icon={Settings} label="Cấu hình" id="settings" activeTab={activeTab} setActiveTab={setActiveTab} 
                  visible={canAccess('settings')}
               />
            </div>
         </div>

         <div className="mt-auto p-6 border-t border-slate-800">
            <div className="flex items-center gap-3 mb-4 p-3 bg-slate-800/50 rounded-2xl">
               <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center font-bold text-sm">
                  {currentUser?.name.charAt(0)}
               </div>
               <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm truncate">{currentUser?.name}</div>
                  <div className="text-[10px] text-slate-400 uppercase font-black tracking-wider truncate">{currentUser?.role}</div>
               </div>
            </div>
            <button onClick={handleLogout} className="flex items-center gap-2 text-xs font-bold text-red-400 hover:text-red-300 transition-colors w-full p-2">
               <LogOut size={16} /> Đăng xuất
            </button>
         </div>
      </aside>

      {/* Main Content */}
      <main className={`flex-1 transition-all duration-300 ${isSidebarOpen ? 'lg:ml-72' : ''} min-h-screen flex flex-col`}>
         <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 py-4 flex justify-between items-center">
            <div className="flex items-center gap-4">
               <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="lg:hidden p-2 text-slate-600">
                  <Menu size={24} />
               </button>
               <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">
                  {activeTab === 'dashboard' && 'Dashboard'}
                  {activeTab === 'quick_expense' && 'Ghi Phiếu Chi Nhanh'}
                  {activeTab === 'contracts' && 'Quản lý Hợp đồng'}
                  {activeTab === 'tasks' && 'Quản lý Công việc'}
                  {activeTab === 'schedule' && 'Lịch làm việc'}
                  {activeTab === 'finance' && 'Quản lý Tài chính'}
                  {activeTab === 'payroll' && 'Bảng lương nhân sự'}
                  {activeTab === 'staff' && 'Danh sách nhân viên'}
                  {activeTab === 'products' && 'Danh mục Dịch vụ'}
                  {activeTab === 'settings' && 'Cấu hình hệ thống'}
               </h2>
            </div>
         </header>

         <div className="p-6 md:p-8 flex-1 overflow-x-hidden relative">
            {activeTab === 'dashboard' && canViewDashboard() && (
              <Dashboard 
                contracts={contracts} 
                transactions={transactions} 
                staff={staff} 
                services={services}
                serviceTypesList={serviceTypesList}
              />
            )}
            {activeTab === 'contracts' && canAccess('contracts') && (
              <ContractManager 
                contracts={contracts} setContracts={setContracts}
                customers={customers} setCustomers={setCustomers}
                transactions={transactions} setTransactions={setTransactions}
                services={services}
                staff={staff}
                scheduleTypes={scheduleTypes} setScheduleTypes={setScheduleTypes}
                studioInfo={studioInfo}
                currentUser={currentUser}
                serviceTypesList={serviceTypesList}
                refreshTasks={refreshTasks}
              />
            )}
            {activeTab === 'tasks' && (
              <TaskManager 
                tasks={tasks} setTasks={setTasks}
                staff={staff}
                contracts={contracts}
                customers={customers}
              />
            )}
            {((activeTab === 'finance' && canAccess('finance')) || activeTab === 'quick_expense') && (
              <ExpenseManager 
                transactions={transactions} setTransactions={setTransactions}
                contracts={contracts}
                customers={customers}
                staff={staff}
                dbCategories={expenseCategories}
                setDbCategories={setExpenseCategories}
                currentUser={currentUser!}
                isQuickView={activeTab === 'quick_expense'}
              />
            )}
            {activeTab === 'payroll' && canAccess('staff') && (
              <PayrollManager 
                staff={staff}
                currentUser={currentUser!}
                tasks={tasks}
                contracts={contracts}
                transactions={transactions}
                setTransactions={setTransactions}
                services={services}
                customers={customers}
                studioInfo={studioInfo}
              />
            )}
            {activeTab === 'schedule' && canAccess('schedules') && (
              <ScheduleManager 
                contracts={contracts}
                staff={staff}
                scheduleTypes={scheduleTypes}
                schedules={schedules}
              />
            )}
            {activeTab === 'staff' && canAccess('staff') && (
              <StaffManager 
                staff={staff} setStaff={setStaff}
                schedules={schedules}
              />
            )}
            {activeTab === 'products' && canAccess('products') && (
               <ProductManager 
                  services={services} setServices={setServices}
                  departments={departments} setDepartments={setDepartments}
                  serviceTypesList={serviceGroupsList}
                  currentUser={currentUser}
                  scheduleTypes={scheduleTypes}
               />
            )}
            {activeTab === 'settings' && canAccess('settings') && (
               <StudioSettings 
                  studioInfo={studioInfo} setStudioInfo={setStudioInfo}
                  serviceTypes={serviceTypes} setServiceTypes={setServiceTypes}
                  serviceGroups={serviceGroups} setServiceGroups={setServiceGroups}
                  isAdmin={isAdminOrDirector}
               />
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
            isActive ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
         }`}
      >
         <div className="flex items-center gap-3">
            <Icon size={20} className={isActive ? 'text-white' : 'text-slate-500 group-hover:text-white'} />
            <span className="font-bold text-xs uppercase tracking-wider">{label}</span>
         </div>
         {badge > 0 && (
            <span className="bg-red-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow-sm">
               {badge}
            </span>
         )}
         {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-r-full" />}
      </button>
   );
};
