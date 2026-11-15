# Chế độ chấm AI qua server (chưa kích hoạt)

Project chưa bật gói Blaze nên Cloud Function `gradeWriting` (`functions/index.js`) chưa deploy được.
Hiện `public/assets/js/gemini-grader.js` vẫn gọi AI trực tiếp bằng khoá đọc từ Firestore `app_config/ai_grader`
(người đã đăng nhập đọc được → khoá có thể bị lộ).

## Khi đã bật Blaze

1. Thu hồi khoá AI cũ, tạo khoá mới, nạp lên Secret Manager (nhiều khoá thì ngăn cách bằng dấu phẩy):
   ```
   firebase functions:secrets:set GROQ_KEYS
   firebase functions:secrets:set GEMINI_KEYS
   firebase functions:secrets:set OPENROUTER_KEY
   ```
2. `firebase deploy --only functions`
3. Chép `server-mode/gemini-grader.js` đè lên `public/assets/js/gemini-grader.js`.
4. Thêm lại rewrite vào `firebase.json` → `hosting`:
   ```json
   "rewrites": [
     { "source": "/api/grade", "function": { "functionId": "gradeWriting", "region": "asia-southeast1" } }
   ]
   ```
5. Trong `firestore.rules`, đổi `app_config` thành `allow read, write: if isAdmin();`
6. `firebase deploy --only hosting,firestore:rules`
7. Xoá document `app_config/ai_grader` trên Firestore.
