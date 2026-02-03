
/**
 * ============================================================
 * SCRIPT ĐỒNG BỘ CHI TIẾT HỢP ĐỒNG (CONTRACT_ITEMS) - TỪNG DÒNG
 * ============================================================
 * 
 * CẤU TRÚC CỘT (Dựa trên ảnh):
 * A: id (UUID) - Tự tạo nếu thiếu
 * B: contract_id (UUID Hợp đồng) - Bắt buộc
 * C: service_id (Mã dịch vụ/UUID)
 * D: quantity (Số lượng)
 * E: unit_price (Đơn giá)
 * F: discount (Giảm giá)
 * G: subtotal (Thành tiền)
 * H: notes (Ghi chú)
 * I: service_name (Tên dịch vụ)
 * J: service_description (Mô tả dịch vụ)
 * K: sale_person_id (Mã nhân viên sale)
 * L: Trạng Thái (Status) - Script sẽ ghi "Synced" vào đây
 */

var CONFIG = {
  SUPABASE_URL: 'https://YOUR_PROJECT_ID.supabase.co', 
  SUPABASE_KEY: 'YOUR_SUPABASE_ANON_KEY', // Điền Key của bạn vào đây
  SHEET_NAME: 'Sheet1' // Tên Tab chứa dữ liệu (Sửa lại cho đúng tên tab của bạn)
};

function syncContractItemsToSupabase() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
  
  if (!sheet) {
    Logger.log("Lỗi: Không tìm thấy sheet tên là '" + CONFIG.SHEET_NAME + "'. Vui lòng sửa lại biến CONFIG.");
    return;
  }

  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return; 

  // Lấy dữ liệu từ cột A đến cột L (12 cột)
  var range = sheet.getRange(2, 1, lastRow - 1, 12); 
  var data = range.getValues();
  
  // --- QUÉT DỮ LIỆU VÀ XỬ LÝ TỪNG DÒNG ---
  for (var i = 0; i < data.length; i++) {
    var row = data[i];
    var status = String(row[11]); // Cột L (index 11) là Trạng Thái
    
    // Nếu đã đồng bộ (Synced) thì bỏ qua
    if (status === 'Synced') continue;

    // 1. Xử lý ID (Cột A)
    var id = String(row[0]).trim();
    var isNewId = false;
    if (!id) {
      id = generateUUID();
      isNewId = true;
    }

    // 2. Kiểm tra Contract ID (Cột B) - Bắt buộc
    var contractId = String(row[1]).trim();
    if (!contractId) {
        Logger.log("Dòng " + (i + 2) + " thiếu Contract ID. Bỏ qua.");
        continue;
    }

    // 3. Xử lý Số liệu
    var quantity = parseNumber(row[3]);
    var unitPrice = parseNumber(row[4]);
    var discount = parseNumber(row[5]);
    var subtotal = parseNumber(row[6]);

    if (subtotal === 0 && unitPrice > 0) {
        subtotal = (unitPrice * quantity) - discount;
    }

    // Mapping dữ liệu
    var record = {
      id: id,
      contract_id: contractId,
      service_id: String(row[2]).trim(),
      quantity: quantity,
      unit_price: unitPrice,
      discount: discount,
      subtotal: subtotal,
      notes: String(row[7]).trim(),
      service_name: String(row[8]).trim(),
      service_description: String(row[9]).trim(),
      sales_person_id: String(row[10]).trim()
    };

    Logger.log(">> Đang xử lý dòng " + (i + 2) + " (HĐ: " + contractId + ")...");

    // --- GỬI NGAY LẬP TỨC ---
    var success = sendToSupabase([record]); 
    
    if (success) {
        // Cập nhật trạng thái
        sheet.getRange(i + 2, 12).setValue("Synced"); 
        if (isNewId) {
           sheet.getRange(i + 2, 1).setValue(id); 
        }
        SpreadsheetApp.flush(); 
        Logger.log("   -> Thành công!");
    } else {
        Logger.log("   -> Thất bại. Bỏ qua dòng này.");
    }
    
    Utilities.sleep(200);
  }
  
  Logger.log("Hoàn tất quy trình.");
}

// --- HÀM GỬI DỮ LIỆU ---
function sendToSupabase(records) {
  var url = CONFIG.SUPABASE_URL + '/rest/v1/contract_items';
  var options = {
    method: 'post', 
    contentType: 'application/json',
    headers: {
      'apikey': CONFIG.SUPABASE_KEY,
      'Authorization': 'Bearer ' + CONFIG.SUPABASE_KEY,
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
      var body = response.getContentText();
      // Bắt lỗi thiếu khóa ngoại (Contract ID không tồn tại)
      if (code === 409 && body.indexOf('contract_items_contract_id_fkey') !== -1) {
         var contractId = records[0].contract_id;
         Logger.log("   [LỖI DỮ LIỆU] Hợp đồng gốc (ID: " + contractId + ") chưa có trên hệ thống. Vui lòng đồng bộ file 'Contracts' trước.");
      } else {
         Logger.log("   [Lỗi Server] Code " + code + ": " + body);
      }
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
  var cleanStr = String(val).replace(/,/g, '').replace(/đ/g, '').replace(/\./g, '').trim();
  var num = parseFloat(cleanStr);
  return isNaN(num) ? 0 : num;
}

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function setupTrigger() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    ScriptApp.deleteTrigger(triggers[i]);
  }
  ScriptApp.newTrigger('syncContractItemsToSupabase')
      .forSpreadsheet(SpreadsheetApp.getActive())
      .onChange() 
      .create();
  
  Browser.msgBox("Đã cài đặt: Tự động đồng bộ Chi tiết Hợp đồng.");
}
