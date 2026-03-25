
/**
 * ============================================================
 * SCRIPT ĐỒNG BỘ DANH MỤC DỊCH VỤ (SERVICES)
 * ============================================================
 * 
 * CẤU TRÚC CỘT (Dựa trên ảnh):
 * A: ma_dv (Mã dịch vụ) - Bắt buộc, dùng làm Khóa chính
 * B: ten_dv (Tên gói/dịch vụ)
 * C: nhom_dv (Nhóm dịch vụ: Chụp ảnh cưới, Makeup...)
 * D: chi_tiet_dv (Chi tiết dịch vụ - Gồm cả xuống dòng)
 * E: don_gia (Đơn giá niêm yết)
 * F: Trạng thái (Status) - Script sẽ ghi "Synced" vào đây
 */

var CONFIG = {
  SUPABASE_URL: 'https://YOUR_PROJECT_ID.supabase.co', 
  SUPABASE_KEY: 'YOUR_SUPABASE_ANON_KEY', // Điền Key của bạn vào đây
  SHEET_NAME: 'Sheet1' // Tên Tab chứa dữ liệu dịch vụ
};

function syncServicesToSupabase() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
  
  if (!sheet) {
    Logger.log("Lỗi: Không tìm thấy sheet tên là '" + CONFIG.SHEET_NAME + "'");
    return;
  }

  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return; 

  // Lấy dữ liệu từ cột A đến cột F (6 cột)
  var range = sheet.getRange(2, 1, lastRow - 1, 6); 
  var data = range.getValues();
  
  for (var i = 0; i < data.length; i++) {
    var row = data[i];
    var status = String(row[5]); // Cột F (index 5)
    
    // Nếu đã đồng bộ rồi thì bỏ qua
    if (status === 'Synced') continue;

    // 1. Kiểm tra Mã dịch vụ (Cột A)
    var ma_dv = String(row[0]).trim();
    if (!ma_dv) {
        Logger.log("Dòng " + (i + 2) + " thiếu Mã dịch vụ. Bỏ qua.");
        continue;
    }

    // 2. Xử lý giá tiền (Cột E)
    var don_gia = parseNumber(row[4]);

    // Mapping dữ liệu chuẩn Database
    var record = {
      ma_dv: ma_dv,
      ten_dv: String(row[1]).trim(),
      nhom_dv: String(row[2]).trim(),
      chi_tiet_dv: String(row[3]).trim(),
      don_gia: don_gia,
      don_vi_tinh: 'Gói', // Mặc định nếu sheet không có
      nhan: '-'
    };

    Logger.log(">> Đang đồng bộ Dịch vụ: " + ma_dv + "...");

    // 3. Gửi dữ liệu (Ghi từng dòng 1)
    var success = sendToSupabase([record]);
    
    if (success) {
        // Cập nhật trạng thái "Synced" vào cột F
        sheet.getRange(i + 2, 6).setValue("Synced");
        SpreadsheetApp.flush(); 
        Logger.log("   -> Thành công!");
    } else {
        Logger.log("   -> Thất bại.");
    }
    
    // Nghỉ nhẹ 200ms
    Utilities.sleep(200);
  }
  
  Logger.log("Hoàn tất.");
}

// --- HÀM GỬI DỮ LIỆU SỬ DỤNG UPSERT (POST) ---
function sendToSupabase(records) {
  // Table: services
  var url = CONFIG.SUPABASE_URL + '/rest/v1/services';
  var options = {
    method: 'post', 
    contentType: 'application/json',
    headers: {
      'apikey': CONFIG.SUPABASE_KEY,
      'Authorization': 'Bearer ' + CONFIG.SUPABASE_KEY,
      // 'resolution=merge-duplicates' cho phép update nếu trùng ma_dv
      'Prefer': 'resolution=merge-duplicates' 
    },
    payload: JSON.stringify(records),
    muteHttpExceptions: true
  };

  try {
    var response = UrlFetchApp.fetch(url, options);
    var code = response.getResponseCode();
    if (code >= 200 && code < 300) {
      return true;
    } else {
      Logger.log("   [Lỗi Server] Code " + code + ": " + response.getContentText());
      return false;
    }
  } catch (e) {
    Logger.log("   [Lỗi Mạng] " + e.message);
    return false;
  }
}

// --- TIỆN ÍCH ---

function parseNumber(val) {
  if (!val) return 0;
  if (typeof val === 'number') return val;
  // Xử lý các ký tự tiền tệ nếu có
  var cleanStr = String(val).replace(/,/g, '').replace(/đ/g, '').replace(/\./g, '').trim();
  var num = parseFloat(cleanStr);
  return isNaN(num) ? 0 : num;
}

function setupTrigger() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    ScriptApp.deleteTrigger(triggers[i]);
  }
  ScriptApp.newTrigger('syncServicesToSupabase')
      .forSpreadsheet(SpreadsheetApp.getActive())
      .onChange() 
      .create();
  
  Browser.msgBox("Đã cài đặt: Tự động đồng bộ Danh mục dịch vụ khi có thay đổi.");
}
