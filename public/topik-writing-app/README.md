# TOPIK II · Wizard viết bài 54

Next.js (Pages Router) + Tailwind + Gemini structured output.

## Chạy thử

```bash
npm install
cp .env.example .env.local   # điền GEMINI_API_KEY
npm run dev
```

## Cấu trúc thư mục

```
pages/
  _app.js              # import CSS toàn cục
  index.js             # ghép SplitScreenLayout + WizardStepper, giữ state essayParts
  api/
    check-sentence.js  # route mẫu gọi Gemini (responseMimeType: application/json) cho Bước 2/3/4
components/
  SplitScreenLayout.jsx  # màn hình trái: đề bài, câu hỏi gợi ý, bài viết tổng thể (nền giấy ô ly 원고지)
  WizardStepper.jsx       # màn hình phải: progress bar 5 bước + nội dung từng bước
lib/
  gemini.js            # client Gemini dùng chung, cấu hình JSON schema output
styles/
  globals.css          # font Pretendard/Noto Serif KR + nền lưới 원고지
```

## Điểm đã nối API thật

- `pages/api/check-sentence.js` là **bản mẫu** theo đúng yêu cầu: nhận `{ step, studentText }`,
  gọi Gemini với `responseSchema` khớp JSON ở đề bài, trả về `{ original_text, corrected_text,
  errors[], is_pass }`. `components/WizardStepper.jsx` (phần `DraftingStep`) gọi route này cho
  cả 3 bước Mở bài / Thân bài / Kết bài, bôi đỏ trực tiếp `wrong_word` trong đoạn học sinh viết.

## Còn là TODO (chưa nối API, có UI/mock sẵn)

- **Bước 1 (Brainstorm):** `BrainstormStep` đang trả về 2 từ vựng mẫu tĩnh. Tạo thêm
  `pages/api/brainstorm-vocab.js` theo đúng khuôn `check-sentence.js` (đổi schema thành
  `{ vocabularies: [{ word, meaning }] }`) rồi thay đoạn `setTimeout` giả lập bằng `fetch`.
- **Bước 5 (Chấm điểm):** `GradingStep` đang vẽ radar chart từ `MOCK_GRADE`. Tạo
  `pages/api/grade-essay.js` nhận toàn bộ `essayParts.join("\n\n")` và trả về đúng shape
  `{ scores, max_scores, overall_feedback }` ở đề bài, rồi gọi route đó khi vào bước 5
  thay vì dùng dữ liệu mẫu.

## Lựa chọn thiết kế

Màn hình trái mô phỏng giấy ô ly viết luận tiếng Hàn (원고지) để bài viết tổng thể có cảm giác
"bài thi" thật, dùng font Noto Serif KR cho phần tiếng Hàn/bài luận và Pretendard cho phần UI/
tiếng Việt. Bảng màu tránh các mặc định "AI-generated" (kem + cam đất): nền giấy trung tính
`#F5F4EF`, mực chính `#2F5D62` (xanh mực bút lông), điểm nhấn từ vựng `#A9752B` (ochre), đỏ lỗi
sai `#B3261E` giữ nguyên ý nghĩa cảnh báo quen thuộc.
