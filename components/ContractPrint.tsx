
import React from 'react';
import { Contract, Customer, Staff, Transaction, Service, TransactionType, StudioInfo } from '../types';

interface Props {
  contract: Contract;
  customer: Customer | undefined;
  staff: Staff | undefined;
  transactions: Transaction[];
  services: Service[];
  studioInfo: StudioInfo;
}

const ContractPrint: React.FC<Props> = ({ contract, customer, staff, transactions, services, studioInfo }) => {
  const formatCurrency = (amount: number) => amount.toLocaleString() + 'đ';
  
  const formatDateHeader = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return `Hợp đồng được lập ngày ${d.getDate()} tháng ${d.getMonth() + 1} năm ${d.getFullYear()}`;
  };

  const getPaymentHistory = () => {
    return transactions
      .filter(t => t.contractId === contract.id && t.type === TransactionType.INCOME)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };

  const payments = getPaymentHistory();

  return (
    <div className="bg-white text-black font-['Times_New_Roman',_Times,_serif] leading-tight text-[13px] mx-auto print:p-0">
      {/* HEADER */}
      <div className="flex justify-between items-start mb-4 pb-2 border-b-2 border-black">
        <div className="flex gap-4 w-3/4">
          <div className="w-24 h-24 shrink-0 flex items-center justify-center">
             {studioInfo.logoImage ? (
                <img src={studioInfo.logoImage} alt="Logo" className="max-w-full max-h-full object-contain" />
             ) : (
                <div className="text-3xl font-bold border-2 border-black p-2">{studioInfo.logoText}</div>
             )}
          </div>
          <div className="space-y-1 pt-1">
            <h1 className="text-xl font-bold uppercase">{studioInfo.name}</h1>
            <p className="italic text-[12px]">{studioInfo.address}</p>
            <p className="text-[12px]">Điện thoại: <b>{studioInfo.phone}</b> {studioInfo.zalo ? `- Zalo: ${studioInfo.zalo}` : ''}</p>
            <p className="text-[12px]">{studioInfo.website ? `Website: ${studioInfo.website}` : ''} {studioInfo.email ? `- Email: ${studioInfo.email}` : ''}</p>
          </div>
        </div>
        <div className="text-right w-1/4 pt-1">
          <h2 className="text-[14px] font-bold">Mẫu số: 01/HĐ-AS</h2>
          <p className="text-[13px] mt-1">Số: <span className="font-bold text-[15px]">{contract.contractCode}</span></p>
        </div>
      </div>

      {/* TITLE */}
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold uppercase mb-2">HỢP ĐỒNG DỊCH VỤ</h2>
        <p className="italic text-[13px]">{formatDateHeader(contract.date)}</p>
      </div>

      {/* SECTION I: PARTIES */}
      <div className="grid grid-cols-2 gap-10 mb-6">
        {/* PARTY A */}
        <div>
          <h3 className="font-bold uppercase text-[13px] mb-2 border-b border-dotted border-gray-400 pb-1">I. THÔNG TIN KHÁCH HÀNG (BÊN A)</h3>
          <table className="w-full text-[13px]">
            <tbody>
              <tr>
                <td className="font-bold w-24 align-top py-1">Họ và tên:</td>
                <td className="uppercase font-bold py-1 border-b border-dotted border-gray-300">{customer?.name}</td>
              </tr>
              <tr>
                <td className="font-bold align-top py-1">Số điện thoại:</td>
                <td className="py-1 border-b border-dotted border-gray-300">{customer?.phone}</td>
              </tr>
              <tr>
                <td className="font-bold align-top py-1">Địa chỉ:</td>
                <td className="py-1 border-b border-dotted border-gray-300">{customer?.address}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* PARTY B */}
        <div>
          <h3 className="font-bold uppercase text-[13px] mb-2 border-b border-dotted border-gray-400 pb-1">ĐẠI DIỆN STUDIO (BÊN B)</h3>
          <table className="w-full text-[13px]">
            <tbody>
              <tr>
                <td className="font-bold w-24 align-top py-1">Tên nhân viên:</td>
                <td className="uppercase font-bold py-1 border-b border-dotted border-gray-300">{staff?.name || studioInfo.directorName}</td>
              </tr>
              <tr>
                <td className="font-bold align-top py-1">Số điện thoại:</td>
                <td className="py-1 border-b border-dotted border-gray-300">{staff?.phone || studioInfo.phone}</td>
              </tr>
              <tr>
                <td className="font-bold align-top py-1">Chức vụ:</td>
                <td className="italic py-1 border-b border-dotted border-gray-300">{staff?.role || 'Quản lý'}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION II: SCHEDULE */}
      <div className="mb-6">
        <h3 className="font-bold uppercase text-[13px] mb-2">II. LỊCH TRÌNH THỰC HIỆN</h3>
        <table className="w-full border-collapse border border-black text-[12px]">
          <thead>
            <tr className="font-bold text-center">
              <th className="border border-black p-2 w-12">STT</th>
              <th className="border border-black p-2 w-32">Ngày thực hiện</th>
              <th className="border border-black p-2">Nội dung công việc</th>
              <th className="border border-black p-2 w-1/3">Ghi chú</th>
            </tr>
          </thead>
          <tbody>
            {contract.schedules.length > 0 ? contract.schedules.map((sch, idx) => (
              <tr key={sch.id}>
                <td className="border border-black p-2 text-center">{idx + 1}</td>
                <td className="border border-black p-2 text-center font-bold">{sch.date ? sch.date.split('-').reverse().join('/') : ''}</td>
                <td className="border border-black p-2">{sch.type}</td>
                <td className="border border-black p-2 italic">{sch.notes}</td>
              </tr>
            )) : (
              <tr><td colSpan={4} className="border border-black p-4 text-center italic">Chưa xác định lịch cụ thể</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* SECTION III: SERVICES */}
      <div className="mb-6">
        <h3 className="font-bold uppercase text-[13px] mb-2">III. NỘI DUNG DỊCH VỤ & GIÁ TRỊ HỢP ĐỒNG</h3>
        <table className="w-full border-collapse border border-black text-[12px]">
          <thead>
            <tr className="font-bold text-center">
              <th className="border border-black p-2 w-10">STT</th>
              <th className="border border-black p-2">Tên dịch vụ/sản phẩm</th>
              <th className="border border-black p-2 w-1/3">Chi tiết</th>
              <th className="border border-black p-2 w-10">SL</th>
              <th className="border border-black p-2 w-24">Đơn giá</th>
              <th className="border border-black p-2 w-24">Giảm giá</th>
              <th className="border border-black p-2 w-28">Thành tiền</th>
              <th className="border border-black p-2 w-20">Ghi chú</th>
            </tr>
          </thead>
          <tbody>
            {contract.items.map((item, idx) => (
              <tr key={item.id}>
                <td className="border border-black p-2 text-center align-top">{idx + 1}</td>
                <td className="border border-black p-2 font-bold align-top uppercase">{item.serviceName}</td>
                <td className="border border-black p-2 italic text-left align-top whitespace-pre-line">{item.serviceDescription || ''}</td>
                <td className="border border-black p-2 text-center align-top">{item.quantity}</td>
                <td className="border border-black p-2 text-right align-top">{formatCurrency(item.unitPrice)}</td>
                <td className="border border-black p-2 text-right align-top">{item.discount > 0 ? formatCurrency(item.discount) : '-'}</td>
                <td className="border border-black p-2 text-right font-bold align-top">{formatCurrency(item.subtotal)}</td>
                <td className="border border-black p-2 text-center align-top">{item.notes}</td>
              </tr>
            ))}
            {/* TOTALS */}
            <tr>
              <td colSpan={6} className="border border-black p-2 text-right font-bold uppercase">TỔNG GIÁ TRỊ HĐ:</td>
              <td className="border border-black p-2 text-right font-bold text-[14px]">{formatCurrency(contract.totalAmount)}</td>
              <td className="border border-black p-2"></td>
            </tr>
            <tr>
              <td colSpan={6} className="border border-black p-2 text-right font-bold uppercase">SỐ TIỀN ĐÃ ĐÓNG:</td>
              <td className="border border-black p-2 text-right font-bold">{formatCurrency(contract.paidAmount)}</td>
              <td className="border border-black p-2"></td>
            </tr>
            <tr>
              <td colSpan={6} className="border border-black p-2 text-right font-bold uppercase">CÒN LẠI PHẢI THU:</td>
              <td className="border border-black p-2 text-right font-bold text-black">{formatCurrency(contract.totalAmount - contract.paidAmount)}</td>
              <td className="border border-black p-2"></td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* SECTION IV: PAYMENTS */}
      <div className="mb-6">
        <h3 className="font-bold uppercase text-[13px] mb-2">IV. CHI TIẾT CÁC LẦN THANH TOÁN</h3>
        <table className="w-full border-collapse border border-black text-[12px]">
          <thead>
            <tr className="font-bold border-b border-black">
              <th className="border-b border-black p-2 w-16 text-center">Lần</th>
              <th className="border-b border-black p-2 w-32 text-center">Ngày</th>
              <th className="border-b border-black p-2 text-left">Ghi chú thanh toán</th>
              <th className="border-b border-black p-2 w-32 text-right">Số tiền</th>
            </tr>
          </thead>
          <tbody>
            {payments.length > 0 ? payments.map((p, idx) => (
              <tr key={p.id}>
                <td className="p-2 text-center border-b border-gray-300">{idx + 1}</td>
                <td className="p-2 text-center border-b border-gray-300">{p.date.split('-').reverse().join('/')}</td>
                <td className="p-2 border-b border-gray-300 uppercase font-bold text-[12px]">{p.description} {p.vendor ? `(${p.vendor})` : ''}</td>
                <td className="p-2 text-right font-bold border-b border-gray-300">{formatCurrency(p.amount)}</td>
              </tr>
            )) : (
              <tr><td colSpan={4} className="border-b border-black p-2 text-center italic">Chưa có giao dịch thanh toán</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* SECTION V: GENERAL TERMS */}
      <div className="mb-6">
        <h3 className="font-bold uppercase text-[13px] mb-2">V. ĐIỀU KHOẢN HỢP ĐỒNG DỊCH VỤ</h3>
        <div className="text-[12px] italic text-justify whitespace-pre-line leading-relaxed">
          {studioInfo.contractTerms || 'Chưa có điều khoản.'}
        </div>
      </div>

      {/* SECTION VI: SPECIFIC TERMS - NEW */}
      {contract.terms && (
        <div className="mb-6">
          <h3 className="font-bold uppercase text-[13px] mb-2">VI. ĐIỀU KHOẢN PHỤ LỤC DÀNH RIÊNG CHO HỢP ĐỒNG NÀY</h3>
          <div className="border border-black p-3 text-[12px] font-medium text-justify whitespace-pre-line leading-relaxed">
            {contract.terms}
          </div>
        </div>
      )}

      {/* SIGNATURES */}
      <div className="grid grid-cols-2 gap-20 mt-8 break-inside-avoid">
        <div className="text-center">
          <p className="font-bold uppercase text-[12px] mb-1">ĐẠI DIỆN KHÁCH HÀNG (BÊN A)</p>
          <p className="italic text-[11px] mb-20">(Ký, ghi rõ họ tên)</p>
          <p className="font-bold uppercase">{customer?.name}</p>
        </div>
        <div className="text-center">
          <p className="font-bold uppercase text-[12px] mb-1">ĐẠI DIỆN STUDIO (BÊN B)</p>
          <p className="italic text-[11px] mb-20">(Ký, đóng dấu)</p>
          <p className="font-bold uppercase">{staff?.name || studioInfo.directorName}</p>
        </div>
      </div>
    </div>
  );
};

export default ContractPrint;
