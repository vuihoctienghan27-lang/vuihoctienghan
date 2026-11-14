import { getJsonModel } from "../../lib/gemini";

const GUIDE_SCHEMA = {
  type: "object",
  properties: {
    overview_vi: { type: "string" },
    tips: { type: "array", items: { type: "string" } },
    model_sentence: { type: "string" },
    common_mistakes: { type: "array", items: { type: "string" } },
  },
  required: ["overview_vi", "tips", "model_sentence", "common_mistakes"],
};

const STEP_NAMES = {
  "mo-bai": "Mở bài",
  "than-bai": "Thân bài",
  "ket-bai": "Kết bài",
};

const SYSTEM_INSTRUCTION = `Bạn là giáo viên luyện viết TOPIK II (câu 54), hướng dẫn học sinh viết TỪNG PHẦN của bài luận.
Nhiệm vụ: đưa hướng dẫn cụ thể, BÁM SÁT đề bài để học sinh hiểu "vì đề như thế nên phần này phải viết như thế".
Trả về đủ:
- "overview_vi": giải thích VÌ SAO phần này (mở bài/thân bài/kết bài) cần viết theo cách đó cho ĐỀ BÀI cụ thể, nêu rõ mối liên hệ với chủ đề, 2–3 câu.
- "tips": 3–5 mẹo viết cụ thể cho phần này, mỗi mẹo một chuỗi tiếng Việt.
- "model_sentence": MỘT câu mẫu hoàn chỉnh tiếng Hàn, văn phong trang trọng, kết thúc bằng -(는)다/-da, học sinh có thể mô phỏng cho phần này.
- "common_mistakes": 2–3 lỗi thường gặp cần tránh khi viết phần này.
Chỉ trả về JSON thuần đúng schema, không thêm markdown hay giải thích ngoài JSON.`;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { step, prompt, guidingQuestions } = req.body || {};
  const stepName = STEP_NAMES[step] || "Thân bài";

  if (!step || !STEP_NAMES[step]) {
    return res.status(400).json({ error: "step must be one of: mo-bai, than-bai, ket-bai" });
  }
  if (!prompt || typeof prompt !== "string") {
    return res.status(400).json({ error: "prompt is required" });
  }

  try {
    const model = getJsonModel({
      schema: GUIDE_SCHEMA,
      systemInstruction: SYSTEM_INSTRUCTION,
    });

    const qs = Array.isArray(guidingQuestions)
      ? guidingQuestions.map((q, i) => `${i + 1}. ${q}`).join("\n")
      : "(không có câu hỏi gợi ý)";

    const promptText = `Bước hiện tại: ${stepName} (${step}).
Đề bài:
"""${prompt.trim()}"""

Câu hỏi gợi ý:
${qs}

Hãy đưa hướng dẫn viết phần ${stepName} cho đề bài này và trả về JSON theo schema.`;

    const result = await model.generateContent(promptText);
    const text = result.response.text();
    const cleaned = text.replace(/^```json\s*|```\s*$/g, "").trim();
    const parsed = JSON.parse(cleaned);

    return res.status(200).json(parsed);
  } catch (err) {
    console.error("writing-guide error:", err);
    return res.status(500).json({ error: "AI guide failed", detail: err.message });
  }
}
