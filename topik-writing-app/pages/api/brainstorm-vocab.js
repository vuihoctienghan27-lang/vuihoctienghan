import { getJsonModel } from "../../lib/gemini";

const VOCAB_SCHEMA = {
  type: "object",
  properties: {
    vocabularies: {
      type: "array",
      items: {
        type: "object",
        properties: {
          word: { type: "string" },
          meaning_vi: { type: "string" },
          why_chosen_vi: { type: "string" },
          usage_example: { type: "string" },
          register: { type: "string" },
        },
        required: ["word", "meaning_vi", "why_chosen_vi", "usage_example", "register"],
      },
    },
  },
  required: ["vocabularies"],
};

const SYSTEM_INSTRUCTION = `Bạn là giáo viên luyện viết TOPIK II (câu 54) cấp độ cao.
Nhiệm vụ: đề xuất 4–6 từ vựng NÂNG CAO (ưu tiên từ Hán-Hàn 한자어, cấp TOPIK 3–6) phù hợp văn phong trang trọng dạng văn viết cho CHÍNH ĐỀ BÀI này.
Với mỗi từ phải cung cấp đủ:
- "word": từ vựng tiếng Hàn.
- "meaning_vi": nghĩa tiếng Việt ngắn gọn.
- "why_chosen_vi": giải thích VÌ SAO chọn từ này cho đề bài này — liên hệ trực tiếp đến chủ đề hoặc câu hỏi gợi ý, 1–2 câu.
- "usage_example": một câu ví dụ hoàn chỉnh bằng tiếng Hàn, văn phong trang trọng, kết thúc bằng -(는)다/-다.
- "register": ngữ cảnh/mức độ dùng (ví dụ: "Hán-Hàn, trang trọng", "thường dùng trong bài nghị luận").
Chỉ trả về JSON thuần đúng schema, không thêm markdown hay giải thích ngoài JSON.`;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { keywords, prompt, guidingQuestions } = req.body || {};
  const kw = Array.isArray(keywords) ? keywords.map((k) => String(k).trim()).filter(Boolean) : [];

  if (kw.length === 0) {
    return res.status(400).json({ error: "keywords is required (at least one)" });
  }
  if (!prompt || typeof prompt !== "string") {
    return res.status(400).json({ error: "prompt is required" });
  }

  try {
    const model = getJsonModel({
      schema: VOCAB_SCHEMA,
      systemInstruction: SYSTEM_INSTRUCTION,
    });

    const qs = Array.isArray(guidingQuestions)
      ? guidingQuestions.map((q, i) => `${i + 1}. ${q}`).join("\n")
      : "(không có câu hỏi gợi ý)";

    const promptText = `Đề bài:
"""${prompt.trim()}"""

Câu hỏi gợi ý:
${qs}

Từ khóa học sinh đã nhập:
${kw.map((k, i) => `- Câu hỏi ${i + 1}: ${k}`).join("\n")}

Hãy đề xuất từ vựng nâng cao cho bài luận này và trả về JSON theo schema.`;

    const result = await model.generateContent(promptText);
    const text = result.response.text();
    const cleaned = text.replace(/^```json\s*|```\s*$/g, "").trim();
    const parsed = JSON.parse(cleaned);

    return res.status(200).json(parsed);
  } catch (err) {
    console.error("brainstorm-vocab error:", err);
    return res.status(500).json({ error: "AI brainstorm failed", detail: err.message });
  }
}
