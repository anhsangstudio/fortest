
# HƯỚNG DẪN TÍCH HỢP TỰ ĐỘNG SACOMBANK -> APP

Vì lý do bảo mật và kỹ thuật, App không thể tự ý truy cập vào Google Sheet cá nhân của bạn. Bạn cần thiết lập một **Script (Kịch bản)** nhỏ ngay trên Google Sheet đó để nó tự động "bắn" dữ liệu sang App.

Quy trình này chỉ cần làm 1 lần duy nhất.

### BƯỚC 1: LẤY THÔNG TIN KẾT NỐI
Bạn cần 2 thông tin từ App (File `.env` hoặc hỏi Developer):
1. **SUPABASE_URL**: (Dạng `https://xyz.supabase.co`)
2. **SUPABASE_KEY**: (Dạng chuỗi ký tự dài `eyJ...`)

### BƯỚC 2: MỞ GOOGLE SHEET
1. Mở file Google Sheet đang nhận email từ ngân hàng Sacombank.
2. Trên thanh menu, chọn **Tiện ích mở rộng (Extensions)** > **Apps Script**.
3. Một tab mới sẽ mở ra (Trình chỉnh sửa code).

### BƯỚC 3: DÁN MÃ LỆNH
1. Xóa toàn bộ nội dung code mặc định (nếu có).
2. Mở file `backend_google_sheet_script.js` trong dự án này, copy toàn bộ nội dung.
3. Dán vào trình chỉnh sửa Apps Script trên trình duyệt.
4. **QUAN TRỌNG:** Sửa lại phần `CONFIG` ở đầu file:
   - Điền `SUPABASE_URL` và `SUPABASE_KEY` của bạn.
   - Kiểm tra `SHEET_NAME` có đúng là tên tab (VD: 'Trang tính1' hay 'Sheet1') không.

### BƯỚC 4: LƯU VÀ CẤP QUYỀN
1. Nhấn nút Đĩa mềm (Save) 💾 để lưu. Đặt tên project là "Sync to Studio".
2. Chọn hàm `syncExpensesToSupabase` trên thanh công cụ, nhấn **Chạy (Run)** thử 1 lần.
3. Google sẽ hỏi quyền truy cập (Review Permissions).
   - Chọn tài khoản Google của bạn.
   - Nếu hiện cảnh báo "Google hasn’t verified this app" -> Chọn **Advanced (Nâng cao)** -> **Go to Sync to Studio (unsafe)**.
   - Nhấn **Allow (Cho phép)**.

### BƯỚC 5: CÀI ĐẶT TỰ ĐỘNG (TRIGGER)
Để script tự chạy mỗi khi có email mới (hoặc định kỳ):
1. Trong file Script vừa dán, chọn hàm `setupTrigger`.
2. Nhấn nút **Chạy (Run)**.
3. Một thông báo "Đã cài đặt tự động..." sẽ hiện ra.

### HOÀN TẤT!
Từ giờ:
1. Email Sacombank về -> Google Sheet thêm dòng mới.
2. Trong vòng 5 phút, Script sẽ tự động phát hiện dòng có loại là "Chi".
3. Script gửi dữ liệu sang App Ánh Sáng Studio.
4. Script ghi chữ "Synced" vào cột G của dòng đó để đánh dấu đã xong.
