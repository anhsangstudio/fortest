
# Phân tích & Kiến trúc Hệ thống Ánh Sáng Studio

## 1. Phân tích bối cảnh Studio & Pain Points
Studio Ánh Sáng đang đối mặt với các thách thức:
- **Dữ liệu phân mảnh:** Thông tin khách hàng, lịch chụp và thanh toán nằm rải rác.
- **Tính lương thủ công:** Việc tính lương dựa trên đầu việc và hoa hồng dễ sai sót.
- **Theo dõi chi phí:** Khó phân loại và đánh giá hiệu quả kinh doanh thực tế.
- **Quản lý tiến độ:** Không có cái nhìn tổng thể về pipeline hợp đồng.

## 2. Kiến trúc tổng thể
- **Frontend Layer:** React 18 (TypeScript) + Tailwind CSS + Lucide Icons.
- **Data Layer:** Quan hệ (Relational) với PK/FK để đảm bảo tính toàn vẹn.
- **AI Layer:** Tích hợp Gemini 3 Flash cho Classification (JSON mode) và Assistant (RAG-like).
- **Security:** RBAC (Admin/Manager/Staff) kiểm soát truy cập module.

## 3. Data Model (Thiết kế thực thể)
- **Customers (KHACH_HANG):** Lưu thông tin gốc của khách.
- **Contracts (HOP_DONG):** Thông tin chính, mã duy nhất, tổng tiền.
- **ContractItems (CHI_TIET_HOP_DONG):** Bảng trung gian giải quyết quan hệ n-n giữa Hợp đồng và Dịch vụ.
- **Schedules (LICH_LAM_VIEC):** Các mốc thời gian (Chụp, Makeup, Bàn giao).
- **Assignments (PHAN_CONG):** Nối Nhân viên vào Lịch làm việc để tính lương.
- **Staff (NHAN_VIEN):** Hồ sơ và cấu hình lương cơ bản/hoa hồng.
- **Transactions (THU_CHI):** Theo dõi dòng tiền thực tế.

**Tại sao tách bảng?**
- Tránh trùng lặp (Normalization).
- Một hợp đồng có thể có nhiều dịch vụ (Chi tiết hợp đồng).
- Một dịch vụ có thể cần nhiều lịch làm việc khác nhau.
- Đảm bảo báo cáo doanh thu theo dịch vụ chính xác (không bị double counting).

## 4. Logic & Automation
- **Pipeline:** Tự động ghi log khi chuyển trạng thái (Lead -> Booked -> Production...).
- **Payroll Auto-Calc:** Lương = Lương cứng + (Số đầu việc * Đơn giá việc) + (% Doanh số hợp đồng).
- **AI Classifier:** Nhận diện keyword "Váy cưới", "Quảng cáo FB" để gán nhãn "Sản xuất" hoặc "Marketing".

## 5. Lộ trình triển khai
- **Giai đoạn 1:** Xây dựng Core (Hợp đồng & Dịch vụ).
- **Giai đoạn 2:** Module Lịch & Nhân sự.
- **Giai đoạn 3:** Tài chính & AI Integration.
- **Giai đoạn 4:** Dashboard & Optimization.
