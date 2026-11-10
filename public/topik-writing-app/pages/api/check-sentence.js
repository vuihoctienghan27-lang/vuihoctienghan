import { getJsonModel } from "../../lib/gemini";

// Structured-output schema mirroring the JSON shape from the spec.
const CHECK_SCHEMA = {
  type: "object",
  properties: {
    original_text: { type: "string" },
    corrected_text: { type: "string" },
    errors: {
      type: "array",
      items: {
        type: "object",
        properties: {
          type: { type: "string" },
          wrong_word: { type: "string" },
          correction: { type: "string" },
          explanation_vi: { type: "string" },
        },
        required: ["type", "wrong_word", "correction", "explanation_vi"],
      },
    },
    is_pass: { type: "boolean" },
  },
  required: ["original_text", "corrected_text", "errors", "is_pass"],
};

const SYSTEM_INSTRUCTION = `Bạn là giám khảo chấm thi TOPIK II cấp độ 6.
Nhiệm vụ: kiểm tra MỘT đoạn học sinh vừa viết cho bài luận số 54.
Quy tắc:
- Bắt lỗi giãn cách từ (띄어쓰기) và lỗi ngữ pháp.
- Bắt buộc văn phong trang trọng dạng văn viết, kết thúc câu bằng đuôi -(는)다/-다, không dùng văn nói (-어요/-아요).
- TUYỆT ĐỐI KHÔNG viết lại toàn bộ đoạn văn thay học sinh; "corrected_text" chỉ sửa các lỗi đã liệt kê trong "errors", giữ nguyên ý và cấu trúc câu của học sinh.
- "is_pass" là true chỉ khi không còn lỗi ngữ pháp/văn phong/giãn cách nào đáng kể.
- Luôn trả lời bằng JSON thuần, đúng schema đã cho, không thêm markdown hay giải thích ngoài JSON.`;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { step, studentText } = req.body || {};

  if (!studentText || typeof studentText !== "string" || !studentText.trim()) {
    return res.status(400).json({ error: "studentText is required" });
  }

  try {
    const model = getJsonModel({
      schema: CHECK_SCHEMA,
      systemInstruction: SYSTEM_INSTRUCTION,
    });

    const prompt = `Bước hiện tại: ${step || "than-bai"}.
Đoạn văn học sinh vừa viết:
"""${studentText.trim()}"""

Hãy chấm theo đúng quy tắc trong system instruction và trả về JSON theo schema.`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    // Structured output should already be pure JSON, but guard against
    // an occasional markdown-fenced response.
    const cleaned = text.replace(/^```json\s*|```\s*$/g, "").trim();
    const parsed = JSON.parse(cleaned);

    return res.status(200).json(parsed);
  } catch (err) {
    console.error("check-sentence error:", err);
    return res.status(500).json({ error: "AI check failed", detail: err.message });
  }
}
