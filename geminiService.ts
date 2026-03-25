
import { GoogleGenAI, Type } from "@google/genai";
import { ExpenseCategory } from "./types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const classifyExpense = async (description: string, amount: number, availableCategories: string[] = [], vendor: string = '') => {
  try {
    const categoriesList = availableCategories.length > 0 ? availableCategories.join(', ') : Object.values(ExpenseCategory).join(', ');
    
    const prompt = `Phân loại chi phí sau cho studio ảnh:
    Nội dung: ${description}
    Số tiền: ${amount}
    Nhà cung cấp: ${vendor}
    
    Hãy chọn 1 trong các nhãn danh mục sau đây: [${categoriesList}]. 
    Nếu không khớp chính xác, hãy chọn nhãn có ý nghĩa gần nhất trong danh sách trên.`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            category: { type: Type.STRING, description: "Tên nhãn phân loại từ danh sách được cung cấp" },
            confidence: { type: Type.NUMBER, description: "Độ tự tin từ 0 đến 1" },
            reason: { type: Type.STRING, description: "Lý do ngắn gọn" }
          },
          required: ["category", "confidence", "reason"],
          propertyOrdering: ["category", "confidence", "reason"]
        }
      }
    });

    return JSON.parse(response.text);
  } catch (error) {
    console.error("AI Classification Error:", error);
    return { category: availableCategories[0] || ExpenseCategory.OTHER, confidence: 0, reason: "Lỗi hệ thống AI" };
  }
};

export const analyzeFinancials = async (data: any) => {
  try {
    const prompt = `Bạn là Giám đốc Tài chính (CFO) của Ánh Sáng Studio. Hãy phân tích báo cáo tài chính sau và đưa ra nhận xét chuyên sâu:
    Dữ liệu: ${JSON.stringify(data)}
    
    Yêu cầu:
    1. Đánh giá tăng trưởng/sụt giảm Doanh số và Thực thu.
    2. Nhận xét về Tỷ lệ nợ tồn đọng (Tiền chưa thu).
    3. Phân tích Hiệu quả loại dịch vụ nào đang mang lại biên lợi nhuận tốt nhất hoặc có AOV cao nhất.
    4. Đưa ra 3 lời khuyên hành động cụ thể để tối ưu dòng tiền tháng tới.
    
    Trả lời bằng tiếng Việt, ngắn gọn, chuyên nghiệp, dùng các bullet point.`;

    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 16384 }
      }
    });

    return response.text;
  } catch (error) {
    console.error("AI Analysis Error:", error);
    return "Không thể phân tích dữ liệu lúc này. Vui lòng kiểm tra lại kết nối hoặc thử lại sau.";
  }
};

export const askStudioAssistant = async (query: string, context: any) => {
  try {
    const prompt = `Bạn là trợ lý ảo của Ánh Sáng Studio. Dưới đây là dữ liệu hiện tại của studio:
    ${JSON.stringify(context)}
    
    Người dùng hỏi: "${query}"
    Hãy trả lời ngắn gọn, chính xác kèm theo số liệu nếu có. Nếu có ID bản ghi, hãy đề cập để người dùng tra cứu.`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });

    return response.text;
  } catch (error) {
    console.error("AI Assistant Error:", error);
    return "Xin lỗi, tôi gặp trục trặc khi truy xuất dữ liệu.";
  }
};
