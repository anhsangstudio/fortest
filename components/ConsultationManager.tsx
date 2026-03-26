import React from 'react';

const ConsultationManager: React.FC = () => {
  return (
    <div className="p-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">
          Nhật Ký Tư Vấn
        </h1>
        <p className="text-gray-600">
          Module Nhật Ký Tư Vấn đã được gắn vào app. Ở bước tiếp theo, chúng ta sẽ
          bắt đầu đổ dữ liệu thật từ Supabase lên màn hình này.
        </p>
      </div>
    </div>
  );
};

export default ConsultationManager;
