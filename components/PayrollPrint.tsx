
import React from 'react';
import { SalarySlip, Staff, StudioInfo, SalaryItem, Task, Contract, Customer } from '../types';

interface Props {
  slip: SalarySlip;
  staff: Staff;
  items: SalaryItem[];
  studioInfo: StudioInfo;
  periodStr: string;
  tasks?: Task[];
  contracts?: Contract[];
  customers?: Customer[];
}

const PayrollPrint: React.FC<Props> = ({ slip, staff, items, studioInfo, periodStr, tasks, contracts, customers }) => {
  const earnings = items.filter(i => i.amount > 0).sort((a,b) => b.amount - a.amount);
  const deductions = items.filter(i => i.amount < 0).sort((a,b) => a.amount - b.amount); // Sort by magnitude (negative)

  const totalEarnings = earnings.reduce((sum, i) => sum + i.amount, 0);
  const totalDeductions = deductions.reduce((sum, i) => sum + Math.abs(i.amount), 0);
  const netPay = totalEarnings - totalDeductions;

  // Helper to get formatted title if it's a task
  const getDisplayTitle = (item: SalaryItem) => {
      if (item.source === 'task' && item.refId && tasks && contracts && customers) {
          const task = tasks.find(t => t.id === item.refId);
          if (task) {
              const contract = contracts.find(c => c.id === task.contractId);
              const customer = customers.find(cust => cust.id === contract?.customerId);
              const dateStr = task.dueDate ? task.dueDate.split('-').reverse().join('/') : '';
              return `${task.name} - ${customer?.name || 'Khách lẻ'} - ${contract?.contractCode || 'N/A'} - ${dateStr}`;
          }
      }
      return item.title;
  };

  return (
    <div className="bg-white text-slate-900 font-sans p-8 max-w-[210mm] mx-auto leading-normal text-sm">
      {/* HEADER */}
      <div className="flex justify-between items-start border-b-2 border-slate-900 pb-6 mb-6">
        <div className="flex gap-4">
           <div className="w-20 h-20 flex items-center justify-center border-2 border-slate-900 font-black text-2xl uppercase">
              {studioInfo.logoImage ? (
                 <img src={studioInfo.logoImage} alt="Logo" className="max-w-full max-h-full object-contain" />
              ) : (
                 studioInfo.logoText || 'LOGO'
              )}
           </div>
           <div>
              <h1 className="text-xl font-black uppercase tracking-tight">{studioInfo.name}</h1>
              <p className="text-xs font-medium text-slate-600 mt-1 max-w-[300px]">{studioInfo.address}</p>
              <p className="text-xs font-medium text-slate-600">Hotline: {studioInfo.phone}</p>
           </div>
        </div>
        <div className="text-right">
           <h2 className="text-2xl font-black uppercase text-slate-900">Phiếu Lương</h2>
           <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mt-1">{periodStr}</p>
           <p className="text-xs text-slate-400 mt-2">Mã phiếu: {slip.id.substring(0, 8).toUpperCase()}</p>
        </div>
      </div>

      {/* STAFF INFO */}
      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-8 grid grid-cols-2 gap-x-8 gap-y-2">
         <div className="flex justify-between border-b border-slate-200 border-dashed pb-1">
            <span className="text-slate-500 font-bold text-xs uppercase">Nhân viên</span>
            <span className="font-bold text-slate-900 uppercase">{staff.name}</span>
         </div>
         <div className="flex justify-between border-b border-slate-200 border-dashed pb-1">
            <span className="text-slate-500 font-bold text-xs uppercase">Mã nhân sự</span>
            <span className="font-bold text-slate-900">{staff.code}</span>
         </div>
         <div className="flex justify-between border-b border-slate-200 border-dashed pb-1">
            <span className="text-slate-500 font-bold text-xs uppercase">Chức vụ</span>
            <span className="font-bold text-slate-900">{staff.role}</span>
         </div>
         <div className="flex justify-between border-b border-slate-200 border-dashed pb-1">
            <span className="text-slate-500 font-bold text-xs uppercase">Lương cơ bản</span>
            <span className="font-bold text-slate-900">{staff.baseSalary.toLocaleString()}đ</span>
         </div>
      </div>

      {/* DETAILS TABLE */}
      <div className="grid grid-cols-2 gap-8 mb-8">
         {/* EARNINGS */}
         <div>
            <h3 className="font-black text-emerald-600 uppercase text-xs tracking-widest border-b-2 border-emerald-600 pb-2 mb-4">Các khoản thu nhập</h3>
            <table className="w-full text-xs">
               <tbody>
                  {earnings.map((item, idx) => (
                     <tr key={idx} className="border-b border-slate-100 last:border-0">
                        <td className="py-2 pr-2 font-medium text-slate-700">
                           {getDisplayTitle(item)}
                           <div className="text-[10px] text-slate-400 font-bold uppercase">{item.type}</div>
                        </td>
                        <td className="py-2 text-right font-bold text-slate-900">{item.amount.toLocaleString()}đ</td>
                     </tr>
                  ))}
                  {earnings.length === 0 && <tr><td colSpan={2} className="py-4 text-center italic text-slate-400">Không có thu nhập</td></tr>}
               </tbody>
               <tfoot className="bg-emerald-50">
                  <tr>
                     <td className="p-2 font-black text-emerald-700 uppercase">Tổng thu nhập</td>
                     <td className="p-2 text-right font-black text-emerald-700">{totalEarnings.toLocaleString()}đ</td>
                  </tr>
               </tfoot>
            </table>
         </div>

         {/* DEDUCTIONS */}
         <div>
            <h3 className="font-black text-red-600 uppercase text-xs tracking-widest border-b-2 border-red-600 pb-2 mb-4">Các khoản khấu trừ</h3>
            <table className="w-full text-xs">
               <tbody>
                  {deductions.map((item, idx) => (
                     <tr key={idx} className="border-b border-slate-100 last:border-0">
                        <td className="py-2 pr-2 font-medium text-slate-700">
                           {getDisplayTitle(item)}
                           <div className="text-[10px] text-slate-400 font-bold uppercase">{item.type}</div>
                        </td>
                        <td className="py-2 text-right font-bold text-red-500">{item.amount.toLocaleString()}đ</td>
                     </tr>
                  ))}
                  {deductions.length === 0 && <tr><td colSpan={2} className="py-4 text-center italic text-slate-400">Không có khấu trừ</td></tr>}
               </tbody>
               <tfoot className="bg-red-50">
                  <tr>
                     <td className="p-2 font-black text-red-700 uppercase">Tổng khấu trừ</td>
                     <td className="p-2 text-right font-black text-red-700">{totalDeductions.toLocaleString()}đ</td>
                  </tr>
               </tfoot>
            </table>
         </div>
      </div>

      {/* NET PAY */}
      <div className="flex justify-end mb-12">
         <div className="w-1/2 bg-slate-900 text-white p-6 rounded-xl flex justify-between items-center shadow-lg print:shadow-none print:bg-slate-900 print:text-white">
            <div className="uppercase font-black text-sm tracking-widest">Thực lĩnh</div>
            <div className="text-3xl font-black">{netPay.toLocaleString()}đ</div>
         </div>
      </div>

      {/* SIGNATURES */}
      <div className="grid grid-cols-2 gap-10 text-center break-inside-avoid">
         <div>
            <p className="font-bold uppercase text-xs mb-16">Người lập phiếu</p>
            <p className="font-bold">{studioInfo.directorName || 'Admin'}</p>
         </div>
         <div>
            <p className="font-bold uppercase text-xs mb-16">Người nhận tiền</p>
            <p className="font-bold">{staff.name}</p>
         </div>
      </div>
   </div>
  );
};

export default PayrollPrint;
