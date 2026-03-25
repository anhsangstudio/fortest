
/**
 * THÔNG BÁO: TẬP TIN NÀY ĐÃ NGỪNG HOẠT ĐỘNG
 * Ánh Sáng Studio đã chuyển sang sử dụng Supabase Cloud làm cơ sở dữ liệu chính.
 * Mọi logic đồng bộ qua Google Sheets trong tệp này đã được loại bỏ để tránh xung đột.
 * 
 * Ngày chuyển đổi: 24/05/2024
 */

function doPost(e) {
  return createResponse({ 
    success: false, 
    error: 'Hệ thống đã chuyển sang Supabase. Vui lòng không sử dụng Google Sheets Sync.' 
  });
}

function doGet(e) {
  return createResponse({ 
    success: false, 
    error: 'Hệ thống đã chuyển sang Supabase. Vui lòng không sử dụng Google Sheets Sync.' 
  });
}

function createResponse(payload) {
  const output = JSON.stringify(payload);
  return ContentService.createTextOutput(output)
    .setMimeType(ContentService.MimeType.JSON);
}
