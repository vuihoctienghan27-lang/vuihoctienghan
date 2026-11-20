# TOPIK ED — UI/CSS BUNDLE

Tài liệu này gộp toàn bộ file quy định giao diện (CSS + JS bơm layout) và HTML landing của dự án.
Mục đích: giữ nguyên giao diện/CSS hiện tại khi nhờ AI chỉnh sửa.

Quy ước:
- Mỗi file bắt đầu bằng dòng `===== FILE: <đường dẫn> =====`.
- Đường dẫn tương đối gốc là thư mục `public/`.
- Các trang con link CSS/JS bằng `../../assets/...`; `navbar.js` tự tính `rootPath` theo độ sâu.

## Danh sách file trong bundle
- public/assets/css/base.css
- public/assets/css/style.css
- public/assets/css/exam-layout.css
- public/assets/css/exam-controls.css
- public/assets/css/writing.css
- public/assets/css/audio.css
- public/assets/css/forum.css
- public/assets/css/games.css
- public/assets/css/lesson-giaoan.css
- public/assets/css/video.css
- public/assets/css/vocab-tooltip.css
- public/assets/js/navbar.js
- public/assets/js/theme-picker.js
- public/assets/js/theme.js
- public/assets/js/menu.js
- public/assets/js/script.js
- public/index.html

---

===== FILE: public/assets/css/base.css =====
/* ==========================================================================
   BASE.CSS — Biến màu sắc, Body, Dark Mode, Typography
   ========================================================================== */

/* BIẾN MÀU SẮC (SÁNG / TỐI TOÀN CỤC) */
:root {
    --primary-text: #2d3748; --bg-body: #f8fafc; --bg-card: #ffffff;
    --border-color: #e2e8f0; --btn-hover: #f1f5f9;
    --text-main: #111827; --text-sub: #6b7280;
    --vocab-highlight: #2563eb;
    --correct-bg: #f0fff4; --correct-border: #48bb78; --correct-text: #276749;
    --wrong-bg: #fff5f5; --wrong-border: #e53e3e; --wrong-text: #c53030;
    --selected-bg: #ebf8ff; --selected-border: #3182ce; --selected-text: #2b6cb0;
}

body.dark-mode {
    --primary-text: #f8fafc; --bg-body: #0f172a; --bg-card: #1e293b;
    --border-color: #334155; --btn-hover: #1e293b;
    --text-main: #f9fafb; --text-sub: #9ca3af;
    --vocab-highlight: #60a5fa;
    --correct-bg: #064e3b; --correct-border: #10b981; --correct-text: #a7f3d0;
    --wrong-bg: #7f1d1d; --wrong-border: #ef4444; --wrong-text: #fca5a5;
    --selected-bg: #1e3a8a; --selected-border: #3b82f6; --selected-text: #bfdbfe;
    /* Dark mode: dùng màu nền đặc, không dùng gradient sặc sỡ */
    background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%) !important;
    background-attachment: fixed !important;
}

body { 
    font-family: 'Pretendard', sans-serif; 
    /* Gradient được set bởi theme-picker.js qua inline style */
    /* CSS var là fallback khi JS chưa chạy */
    background: var(--random-bg-gradient, linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%));
    background-attachment: fixed;
    min-height: 100vh;
    color: var(--primary-text); 
    transition: color 0.3s; 
    
    /* Chống copy/highlight text trên desktop và mobile */
    -webkit-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    user-select: none;
    -webkit-touch-callout: none;
}

/* Cho phép bôi đen, copy ở các ô nhập liệu vì người dùng cần gõ chữ */
input, textarea {
    -webkit-user-select: auto;
    -moz-user-select: auto;
    -ms-user-select: auto;
    user-select: auto;
}
.container { 
    background-color: var(--bg-card); 
    border-color: var(--border-color); 
    max-width: 900px; 
    margin: 0 auto 120px auto; 
    padding: 15px 20px 100px 20px; 
    box-sizing: border-box; 
    border-radius: 24px;
    box-shadow: 0 15px 35px rgba(0, 0, 0, 0.05);
    width: 100%;
}

@media (max-width: 768px) {
    .container {
        margin: 0 15px 120px 15px; 
        padding: 10px 8px 100px 8px;
        border-radius: 16px;
        width: auto;
    }
}
.modal-content { background-color: var(--bg-card); color: var(--primary-text); }

/* ========== GLOBAL TYPOGRAPHY ========== */
body, .shared-text, .question-text, .option, .trans-content { word-break: keep-all !important; overflow-wrap: break-word !important; line-height: 1.85 !important; }


/* ==========================================================================
   FOOTER - CHÂN TRANG DÙNG CHUNG
   ========================================================================== */
.global-footer {
    margin-top: 60px;
    padding: 35px 20px;
    background: rgba(255, 255, 255, 0.85);
    backdrop-filter: blur(12px);
    border-top: 1px solid var(--border);
    text-align: center;
}

body.dark-mode .global-footer {
    background: rgba(15, 23, 42, 0.85);
    border-color: #334155;
}

.footer-content {
    max-width: 1100px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
}

.footer-logo {
    font-size: 1.3em;
    font-weight: 800;
    color: var(--text-main);
    display: flex;
    align-items: center;
    gap: 6px;
    text-decoration: none;
}

body.dark-mode .footer-logo {
    color: #f9fafb;
}

.footer-slogan {
    margin: 0;
    color: var(--text-sub);
    font-weight: 500;
    font-size: 0.95em;
}

.footer-contact {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-top: 8px;
    font-weight: 600;
    color: var(--text-main);
    font-size: 0.95em;
}

body.dark-mode .footer-contact {
    color: #f9fafb;
}

.social-icon {
    color: #1877f2;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform 0.2s ease, opacity 0.2s;
    text-decoration: none;
}

.social-icon:hover {
    transform: translateY(-3px) scale(1.05);
    opacity: 0.9;
}

===== END FILE: public/assets/css/base.css =====

===== FILE: public/assets/css/style.css =====
/* ==========================================================================
   TOPIK EDTECH - MINIMALIST FLAT DESIGN (BẢN SỬA LỖI GIAO DIỆN)
   ========================================================================== */

/* BIẾN MÀU SẮC (SÁNG / TỐI TOÀN CỤC) */
:root {
    --primary-text: #2d3748; --bg-body: #f8fafc; --bg-card: #ffffff;
    --border-color: #e2e8f0; --btn-hover: #f1f5f9;
    --text-main: #111827; --text-sub: #6b7280;
    --vocab-highlight: #2563eb;
    --correct-bg: #f0fff4; --correct-border: #48bb78; --correct-text: #276749;
    --wrong-bg: #fff5f5; --wrong-border: #e53e3e; --wrong-text: #c53030;
    --selected-bg: #ebf8ff; --selected-border: #3182ce; --selected-text: #2b6cb0;
}

body.dark-mode {
    --primary-text: #f8fafc; --bg-body: #0f172a; --bg-card: #1e293b;
    --border-color: #334155; --btn-hover: #1e293b;
    --text-main: #f9fafb; --text-sub: #9ca3af;
    --vocab-highlight: #60a5fa;
    --correct-bg: #064e3b; --correct-border: #10b981; --correct-text: #a7f3d0;
    --wrong-bg: #7f1d1d; --wrong-border: #ef4444; --wrong-text: #fca5a5;
    --selected-bg: #1e3a8a; --selected-border: #3b82f6; --selected-text: #bfdbfe;
}

body { font-family: 'Pretendard', sans-serif; background-color: var(--bg-body); color: var(--primary-text); transition: background-color 0.3s, color 0.3s; }
.container { background-color: var(--bg-card); border-color: var(--border-color); max-width: 900px; margin: 0 auto; padding: 15px 20px; box-sizing: border-box; width: 100%; border-radius: 24px; box-shadow: 0 15px 35px rgba(0, 0, 0, 0.05); }
.option { background-color: var(--bg-card); border-color: var(--border-color); color: var(--primary-text); }
.modal-content { background-color: var(--bg-card); color: var(--primary-text); }
.shared-text, .opt-trans { background-color: var(--btn-hover); border-color: var(--border-color); color: var(--primary-text); }
.explanation-content { background-color: var(--bg-card); border-color: var(--border-color); }

/* ==========================================================================
   TỪ VỰNG TÀNG HÌNH & SMART TOOLTIP (SỬA LỖI CO KÉO CHỮ)
  /* ========== GLOBAL TYPOGRAPHY ========== */
body, .shared-text, .question-text, .option, .trans-content { word-break: keep-all !important; overflow-wrap: break-word !important; line-height: 1.85 !important; }

/* Giao diện Từ Vựng tĩnh (Không thay đổi độ rộng hay border để tránh giật khung) */
.vocab-word { 
    display: inline; position: relative; cursor: help; text-decoration: none !important; 
    transition: color 0.2s ease, background 0.2s ease;
    padding: 0 2px; margin: 0 -2px; border-radius: 4px;
}
body:not(.vocab-disabled) .vocab-word { color: var(--vocab-highlight); }
body:not(.vocab-disabled) .vocab-word:hover { background-color: #fee2e2; }
body.vocab-disabled .vocab-word { color: inherit !important; cursor: auto !important; pointer-events: none !important; background: transparent !important; }

/* ==========================================================================
   OPTIONS & THÀNH PHẦN PHỤ
   ========================================================================== */
.options { display: flex; flex-direction: column; gap: 10px; margin-bottom: 20px; }
.options-grid { display: grid; grid-template-columns: 1fr; }
@media (min-width: 700px) { .options-grid { grid-template-columns: 1fr 1fr; } }
.option { position: relative; display: block; padding: 13px 16px 13px 45px; border: 1px solid #cbd5e0; border-radius: 8px; background: #fff; cursor: pointer; transition: all 0.2s; line-height: 1.7; font-size: 1.02em; }
.option:not(.correct):not(.wrong):hover { background-color: var(--btn-hover); border-color: #a0aec0; }
.option .num { position: absolute; left: 12px; top: 12px; display: inline-block; width: 24px; height: 24px; line-height: 22px; text-align: center; border: 1px solid #a0aec0; color: #4a5568; font-weight: bold; border-radius: 50%; font-size: 0.85em; }
.option.selected { background-color: var(--selected-bg); border-color: var(--selected-border); color: var(--selected-text); }
.option.selected .num { background-color: #3182ce; border-color: #3182ce; color: white; }
.option.correct { background-color: var(--correct-bg); border-color: var(--correct-border); color: var(--correct-text); cursor: default; }
.option.correct .num { background-color: #38a169; border-color: #38a169; color: white; }
.option.wrong { background-color: var(--wrong-bg); border-color: var(--wrong-border); color: var(--wrong-text); opacity: 0.8; cursor: default; }
.option.wrong .num { background-color: #e53e3e; border-color: #e53e3e; color: white; }

.action-area { display: none; margin-top: 15px; }
.btn-explain { background-color: #f8fafc; color: #2b6cb0; border: 1px solid #cbd5e0; padding: 12px 20px; border-radius: 8px; cursor: pointer; font-size: 1em; font-weight: bold; width: 100%; text-align: left; transition: all 0.2s; box-shadow: none; }
.btn-explain:hover { background-color: #edf2f7; border-color: #a0aec0; }
.explanation-content { display: none; margin-top: 10px; background-color: #fff; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0; border-left: 4px solid #3182ce;}
.trans-box { margin-bottom: 20px; color: #2d3748; }
.trans-title { font-weight: bold; color: #2b6cb0; margin-bottom: 5px; display: block; }
.trans-content { font-style: italic; color: #4a5568; padding-bottom: 10px; }
.opt-trans { display: block; font-size: 0.95em; color: #4a5568; margin-top: 10px; margin-bottom: 15px; background: #f8fafc; padding: 12px; border-radius: 6px; border-left: 3px solid #cbd5e0;}
.opt-trans ul { margin: 0; padding-left: 20px; }
.explain-box h4 { margin-top: 15px; color: #e53e3e; border-bottom: 1px solid #edf2f7; padding-bottom: 8px;}
.wrong-reason { color: #c53030; font-size: 0.95em; display: block; margin-top: 5px; padding-left: 15px; border-left: 2px solid #fed7d7; margin-bottom: 10px;}

.hide-on-scroll { transform: translateY(-100px); opacity: 0; pointer-events: none; }
.icon-home { position: fixed; top: 15px; right: 15px; width: 42px; height: 42px; color: #4a5568; z-index: 99999; cursor: pointer; transition: all 0.3s ease; background: #fff; border: 1px solid #cbd5e0; border-radius: 8px; padding: 8px; box-sizing: border-box;}
.icon-home svg { width: 100%; height: 100%; fill: currentColor; }
.vocab-toggle-container { position: fixed; top: 15px; left: 15px; z-index: 99999; background: #fff; padding: 8px 12px; border-radius: 8px; border: 1px solid #cbd5e0; font-weight: bold; color: #4a5568; font-size: 0.85em; display: flex; align-items: center; gap: 8px; transition: all 0.3s ease; }
.switch { position: relative; display: inline-block; width: 36px; height: 20px; flex-shrink: 0;}
.switch input { opacity: 0; width: 0; height: 0; }
.slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #cbd5e0; transition: .3s; border-radius: 20px; }
.slider:before { position: absolute; content: ""; height: 14px; width: 14px; left: 3px; bottom: 3px; background-color: white; transition: .3s; border-radius: 50%; }
input:checked + .slider { background-color: #48bb78; }
input:checked + .slider:before { transform: translateX(16px); }

#examControls { display: none; position: fixed; bottom: 20px; left: 8px; background: rgba(255, 255, 255, 0.95); padding: 9px 11px; border-radius: 12px; border: 1px solid #cbd5e0; z-index: 999; text-align: center; box-shadow: 0 4px 15px rgba(0,0,0,0.1); backdrop-filter: blur(5px);}
.timer-display { font-size: 1.5em; font-weight: bold; color: #e53e3e; font-family: monospace; margin-bottom: 8px; line-height: 1;}
.btn-submit { background: #e53e3e; color: white; border: none; padding: 7px 12px; font-size: 0.8em; font-weight: bold; border-radius: 6px; cursor: pointer; transition: 0.2s; white-space: nowrap;}

.modal-overlay { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(15, 23, 42, 0.85); z-index: 9999; justify-content: center; align-items: center; }
.modal-content { background: #fff; width: 95%; max-width: 800px; border-radius: 16px; padding: 35px; position: relative; display: flex; flex-direction: column; overflow-y: auto; max-height: 90vh; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);}
.close-btn { position: absolute; top: 15px; right: 20px; font-size: 2em; cursor: pointer; color: #a0aec0; z-index: 100; transition: color 0.2s;}
.close-btn:hover { color: #4a5568; }

#questionStatusGrid { display: grid; grid-template-columns: repeat(10, 1fr); gap: 8px; margin-bottom: 25px; }
.q-status-item { padding: 8px 0; text-align: center; border-radius: 6px; font-weight: bold; color: white; font-size: 0.9em; }
.q-status-item.q-correct { background-color: #48bb78; } .q-status-item.q-wrong { background-color: #e53e3e; } .q-status-item.q-skipped { background-color: #94a3b8; }

/* ==========================================================================
   FLASHCARD & MATCH GAME STYLES (CÂN CHỈNH LẠI TỶ LỆ CHUẨN UI/UX)
   ========================================================================== */
#flashcardView { flex-grow: 1; display: flex; flex-direction: column; justify-content: center; padding-top: 10px;}
.card-counter { text-align: center; font-size: 1.1em; font-weight: bold; color: #718096; margin-bottom: 15px; letter-spacing: 1px;}
.flashcard-nav-container { display: flex; align-items: center; justify-content: center; gap: 30px; margin-bottom: 30px; }

/* Nút lật thẻ làm dạng tròn mềm mại */
.nav-btn { background: #fff; border: 2px solid #e2e8f0; border-radius: 50%; width: 50px; height: 50px; font-size: 1.4em; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #4a5568; transition: all 0.2s ease; box-shadow: 0 4px 6px rgba(0,0,0,0.05);}
.nav-btn:hover { background: #f8fafc; border-color: #cbd5e0; transform: scale(1.05); color: #2b6cb0; }

/* Thẻ Flashcard - Cân đối, to rõ, chữ đẹp */
.flashcard { perspective: 1000px; width: 350px; height: 220px; cursor: pointer; margin: 0 auto; }
.flashcard-inner { position: relative; width: 100%; height: 100%; text-align: center; transition: transform 0.6s cubic-bezier(0.4, 0.2, 0.2, 1); transform-style: preserve-3d; border-radius: 16px; border: 1px solid #e2e8f0; background: #fff; box-shadow: 0 10px 20px rgba(0,0,0,0.08);}
.flashcard.flipped .flashcard-inner { transform: rotateY(180deg); }
.flashcard-front, .flashcard-back { position: absolute; width: 100%; height: 100%; backface-visibility: hidden; display: flex; flex-direction: column; justify-content: center; align-items: center; padding: 30px; border-radius: 16px; box-sizing: border-box; }
.flashcard-front { background: linear-gradient(135deg, #ebf4ff 0%, #ffffff 100%); color: #2b6cb0; }
.flashcard-back { background: linear-gradient(135deg, #fff5f5 0%, #ffffff 100%); color: #c53030; transform: rotateY(180deg); }

#fcFrontText { font-size: 2.2em; font-weight: 800; margin-bottom: 5px; }
#fcBackText { font-size: 1.6em; font-weight: bold; line-height: 1.4; }
.audio-icon { font-size: 0.85em; color: #718096; font-weight: normal; margin-top: 15px; display: inline-flex; align-items: center; gap: 6px; opacity: 0.9; background: rgba(255,255,255,0.7); padding: 6px 14px; border-radius: 20px; border: 1px solid #e2e8f0;}

.controls-row { display: flex; justify-content: center; align-items: center; gap: 15px; margin-bottom: 25px; color: #4a5568; font-weight: 500;}

/* Nút lớn, cân đối ở dưới */
.start-game-btn { background: #3182ce; color: white; border: none; padding: 14px 24px; border-radius: 10px; font-weight: bold; cursor: pointer; transition: 0.2s; font-size: 1.05em; display: inline-block; width: 100%; max-width: 350px; margin: 0 auto; box-shadow: 0 4px 6px rgba(49, 130, 206, 0.2);}
.start-game-btn:hover { background: #2b6cb0; transform: translateY(-2px); box-shadow: 0 6px 12px rgba(49, 130, 206, 0.3);}

/* Giao diện Match Game */
#matchView { flex-grow: 1; display: none; flex-direction: column; position: relative;}
.match-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(110px, 1fr)); gap: 12px; margin-bottom: 20px;}
.match-card { padding: 10px; text-align: center; border-radius: 8px; font-weight: bold; cursor: pointer; display: flex; justify-content: center; align-items: center; min-height: 65px; border: 2px solid #e2e8f0; background: #f8fafc; font-size: 1em; transition: 0.15s;}
.match-card:hover { border-color: #cbd5e0; transform: translateY(-2px);}
.match-card:active { transform: scale(0.95); }
.match-card.kr { color: #2b6cb0; } .match-card.vn { color: #2f855a; }
.match-card.selected { border-color: #3182ce; background: #ebf8ff; box-shadow: inset 0 0 0 1px #3182ce;}
.match-card.error { border-color: #fc8181 !important; background: #fff5f5 !important; color: #c53030 !important; animation: shake 0.4s; }
.match-card.hidden { opacity: 0; pointer-events: none; visibility: hidden; }

.result-overlay { display: none; position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: rgba(255, 255, 255, 0.98); z-index: 100; flex-direction: column; justify-content: center; align-items: center; border-radius: 12px;}
.result-box { background: #fff; padding: 40px 30px; border-radius: 16px; text-align: center; border: 2px solid #48bb78; width: 85%; max-width: 320px; animation: popIn 0.3s; box-shadow: 0 10px 25px rgba(0,0,0,0.1);}

@keyframes shake { 0%, 100% {transform: translateX(0);} 25%, 75% {transform: translateX(-4px);} 50% {transform: translateX(4px);} }
@keyframes popIn { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }


/* =======================================
   NÚT ÔN TẬP TỪ VỰNG (TRONG PHẦN GIẢI THÍCH)
   ======================================= */
.review-link {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    margin-top: 25px;
    background: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%); /* Dải màu tím hiện đại */
    color: #ffffff !important; 
    font-weight: bold;
    font-size: 1.05em;
    text-decoration: none;
    border: none;
    padding: 14px 20px;
    border-radius: 10px;
    width: 100%;
    box-sizing: border-box;
    cursor: pointer;
    transition: all 0.3s ease;
    box-shadow: 0 4px 10px rgba(109, 40, 217, 0.25);
}

.review-link:hover {
    transform: translateY(-3px);
    box-shadow: 0 8px 20px rgba(109, 40, 217, 0.4);
    background: linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%);
}

.review-link:active {
    transform: translateY(0);
}

/* Tự động thêm Icon Flashcard vào trước chữ */
.review-link::before {
    content: '📇';
    font-size: 1.2em;
}

/* ==========================================================
/* ==========================================================
   GIAO DIỆN BẢNG ĐIỂM PHẲNG (MÀU CHUẨN XANH - ĐỎ ĐỒNG BỘ)
   ========================================================== */

.score-circle {
    position: relative !important;
    width: 150px !important;
    height: 150px !important;
    border-radius: 50% !important;
    
    /* MÀU CHUẨN: Xanh lá (#48bb78) đúng, Đỏ (#e53e3e) sai giống y hệt các nút bên dưới */
    background: conic-gradient(#48bb78 var(--progress, 0%), #e53e3e 0deg) !important;
    
    display: flex !important; 
    flex-direction: column !important; 
    justify-content: center !important; 
    align-items: center !important;
    margin: 0 auto 30px !important;
    border: none !important; 
    box-shadow: none !important; /* Giao diện phẳng */
    flex-shrink: 0 !important; 
}

/* Lõi trắng bên trong */
.score-circle::before {
    content: '' !important;
    position: absolute !important;
    inset: 14px !important; /* Độ dày của vòng tròn */
    background: #ffffff !important;
    border-radius: 50% !important;
    z-index: 0 !important;
    box-shadow: none !important; 
}

/* Lớp bảo vệ chữ số */
.score-circle-content {
    position: relative !important;
    z-index: 10 !important; 
    display: flex !important;
    flex-direction: column !important;
    align-items: center !important;
}

/* Chữ số điểm mạnh mẽ, rõ ràng */
.score-text {
    font-size: 3.5em !important;
    color: #2d3748 !important; /* Xám đen đậm cho dễ nhìn */
    font-weight: 900 !important;
    line-height: 1 !important;
}

.score-sub {
    font-size: 1.1em !important;
    color: #718096 !important; 
    font-weight: bold !important;
    margin-top: 5px !important;
}

/* 2. Khung Ghép thẻ Từ vựng (Cho phép trượt lưới thẻ nhưng cố định popup) */
#matchView {
    flex-grow: 1; 
    display: none; 
    flex-direction: column; 
    position: relative;
    min-height: 350px; /* Đảm bảo đủ độ cao cho bảng kết quả */
}

/* Lưới thẻ sẽ tự sinh thanh trượt nếu quá nhiều từ */
.match-grid { 
    display: grid; 
    grid-template-columns: repeat(auto-fill, minmax(110px, 1fr)); 
    gap: 12px; 
    margin-bottom: 20px;
    max-height: 45vh; /* Giới hạn chiều cao để bật thanh trượt */
    overflow-y: auto; /* Trượt dọc */
    padding-right: 5px;
    align-content: start;
}

/* Trang trí thanh trượt cho đẹp mắt */
.match-grid::-webkit-scrollbar { width: 6px; }
.match-grid::-webkit-scrollbar-thumb { background: #cbd5e0; border-radius: 4px; }

/* Bảng kết quả phủ lên đúng khu vực ghép thẻ, chừa lại tiêu đề */
.result-overlay { 
    display: none; 
    position: absolute; 
    top: 0; left: 0; right: 0; bottom: 0; 
    background: rgba(255, 255, 255, 0.95); 
    z-index: 100; 
    flex-direction: column; 
    justify-content: center; 
    align-items: center; 
    border-radius: 12px;
}


/* ==========================================================
   GIAO DIỆN PHẲNG & SỔ TỪ VỰNG (FLAT DESIGN & STATS)
   ========================================================== */

/* Nút SVG Phẳng, bỏ viền rườm rà */
.flat-icon-btn {
    background: transparent; border: none; cursor: pointer; padding: 6px; 
    border-radius: 6px; color: #64748b; display: inline-flex; align-items: center; justify-content: center; transition: 0.2s;
}
.flat-icon-btn:hover { background: #f1f5f9; color: #0f172a; }
.flat-icon-btn.saved { color: #3b82f6; } /* Màu xanh dương khi đã lưu */

/* Bảng Thống kê ghi nhớ (Memory Stats) */
.memory-stats-card {
    background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 25px; margin-bottom: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.02);
}
.memory-stats-title { font-size: 1.1em; font-weight: 800; color: #475569; margin-bottom: 20px; }

/* Thanh tiến trình Pastel */
.progress-bar-container {
    display: flex; height: 16px; width: 100%; border-radius: 99px; overflow: hidden; background: #f1f5f9; margin-bottom: 25px;
}
.progress-segment { height: 100%; transition: width 0.5s ease; }
.bg-moi { background-color: #cbd5e1; }        /* Xám Pastel */
.bg-dang-hoc { background-color: #f472b6; }   /* Hồng Pastel */
.bg-dang-on { background-color: #60a5fa; }    /* Xanh dương Pastel */
.bg-thanh-thao { background-color: #34d399; } /* Xanh lá Pastel */

/* Chú thích màu sắc */
.stats-legend { display: flex; justify-content: space-between; flex-wrap: wrap; gap: 10px; }
.legend-item { display: flex; flex-direction: column; align-items: flex-start; }
.legend-dot-wrapper { display: flex; align-items: center; gap: 8px; font-weight: bold; font-size: 1.2em; color: #334155; }
.legend-dot { width: 12px; height: 12px; border-radius: 50%; }
.legend-label { font-size: 0.85em; color: #94a3b8; margin-top: 4px; font-weight: 500; }

/* Danh sách từ vựng */
.vocab-list-container { display: flex; flex-direction: column; gap: 12px; max-height: 400px; overflow-y: auto; padding-right: 5px; }
.vocab-list-container::-webkit-scrollbar { width: 6px; }
.vocab-list-container::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
.vocab-item {
    display: flex; justify-content: space-between; align-items: center; padding: 15px; border: 1px solid #e2e8f0; border-radius: 8px; background: #fff; transition: 0.2s;
}
.vocab-item:hover { border-color: #cbd5e1; box-shadow: 0 4px 6px rgba(0,0,0,0.02); }
.vocab-info { display: flex; flex-direction: column; gap: 4px; }
.vocab-word-text { font-size: 1.1em; font-weight: bold; color: #0f172a; }
.vocab-mean-text { font-size: 0.95em; color: #64748b; }
.vocab-actions { display: flex; gap: 5px; }
.status-badge { font-size: 0.75em; padding: 4px 8px; border-radius: 4px; font-weight: bold; color: white; }

/* Nút đánh giá Flashcard */
.flashcard-assess-group { display: flex; gap: 10px; justify-content: center; margin-top: 20px; width: 100%; }
.btn-assess { flex: 1; border: none; padding: 12px; border-radius: 8px; font-weight: bold; color: white; cursor: pointer; transition: 0.2s; font-size: 0.95em; }
.btn-assess:hover { filter: brightness(0.9); transform: translateY(-2px); }


/* ==========================================================================
   TỐI ƯU HÓA FLAT DESIGN (APPLE/NOTION) & GIAO DIỆN MYPAGE / GAME
   ========================================================================== */

/* 1. TABS 2x2 VÀ NÚT PHẲNG */
.tabs-2x2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 25px; }
.tab-btn-flat { background: var(--bg-body); color: var(--text-sub); border: 1px solid var(--border-color); padding: 15px; border-radius: 12px; font-weight: 600; font-size: 0.95em; cursor: pointer; transition: 0.2s; text-align: center; }
.tab-btn-flat:hover { border-color: var(--text-main); color: var(--text-main); }
.tab-btn-flat.active { background: var(--text-main); color: var(--bg-card); border-color: var(--text-main); }

.btn-flat-primary { background: #111827; color: #ffffff; border: none; padding: 12px 20px; border-radius: 8px; font-weight: 600; cursor: pointer; transition: 0.2s; width: 100%; font-size: 0.95em; }
.btn-flat-primary:hover { opacity: 0.8; }
.btn-flat-outline { background: transparent; color: #111827; border: 1px solid #e5e7eb; padding: 12px 20px; border-radius: 8px; font-weight: 600; cursor: pointer; transition: 0.2s; width: 100%; font-size: 0.95em; }

body.dark-mode .btn-flat-primary { background: #ffffff; color: #111827; }
body.dark-mode .btn-flat-outline { border-color: #374151; color: #f9fafb; }

/* 2. BIỂU ĐỒ 30 NGÀY TRƯỢT NGANG */
.chart-scroll-container { width: 100%; overflow-x: auto; overflow-y: hidden; border: 1px solid var(--border-color); border-radius: 12px; padding: 15px; background: var(--bg-card); }
.chart-scroll-container::-webkit-scrollbar { height: 6px; }
.chart-scroll-container::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
.chart-inner { height: 300px; width: 100%; /* Chiều rộng sẽ được JS điều chỉnh */ }

/* 3. DANH SÁCH TỪ VỰNG 2 CỘT & DẤU CHẤM TRẠNG THÁI */
.vocab-grid-2col { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; max-height: 400px; overflow-y: auto; padding-right: 5px; }
@media (max-width: 600px) { .vocab-grid-2col { grid-template-columns: 1fr; } }
.vocab-grid-2col::-webkit-scrollbar { width: 4px; }
.vocab-grid-2col::-webkit-scrollbar-thumb { background: var(--border-color); border-radius: 4px; }

.v-card-flat { position: relative; border: 1px solid var(--border-color); border-radius: 10px; padding: 15px 15px 15px 25px; background: var(--bg-card); display: flex; flex-direction: column; gap: 4px; transition: 0.2s; }
.v-card-flat:hover { border-color: #94a3b8; }
.v-dot { position: absolute; top: 18px; left: 10px; width: 8px; height: 8px; border-radius: 50%; }
.v-dot.bg-moi { background-color: #cbd5e1; }
.v-dot.bg-hoc { background-color: #f472b6; }
.v-dot.bg-on { background-color: #60a5fa; }
.v-dot.bg-thanh { background-color: #34d399; }

/* 4. BẢNG XẾP HẠNG (LEADERBOARD) */
.lb-item { display: flex; justify-content: space-between; align-items: center; padding: 15px; border-bottom: 1px solid var(--border-color); }
.lb-item:last-child { border-bottom: none; }
.lb-rank { font-size: 1.2em; font-weight: bold; width: 40px; }
.lb-name { font-weight: 600; flex: 1; }
.lb-stats { font-size: 0.9em; color: var(--text-sub); text-align: right; }

/* 5. GIAO DIỆN GAME (GHÉP THẺ TRƯỢT & NHẬP TỪ) */
#matchArea { position: relative; min-height: 400px; display: flex; flex-direction: column; }
.match-grid-scroll { flex: 1; overflow-y: auto; display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 10px; padding: 5px; max-height: 350px; align-content: start; }
.match-grid-scroll::-webkit-scrollbar { width: 6px; } .match-grid-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
.match-overlay-fixed { position: absolute; inset: 0; background: rgba(255,255,255,0.95); z-index: 10; display: none; flex-direction: column; justify-content: center; align-items: center; border-radius: 12px; }
body.dark-mode .match-overlay-fixed { background: rgba(31,41,55,0.95); }

.type-game-container { text-align: center; padding: 20px 0; }
.type-word-display { font-size: 2.5em; font-weight: 800; margin-bottom: 20px; color: var(--text-main); }
.type-input { width: 100%; max-width: 300px; padding: 15px; font-size: 1.2em; border: 2px solid var(--border-color); border-radius: 8px; text-align: center; outline: none; background: var(--bg-body); color: var(--text-main); margin-bottom: 15px; transition: 0.2s;}
.type-input:focus { border-color: var(--text-main); }
.type-result { height: 24px; font-weight: bold; margin-bottom: 15px; }

/* 6. NÚT SAO TRONG FLASHCARD */
.fc-star-btn { position: absolute; top: 15px; right: 15px; background: transparent; border: none; font-size: 1.5em; cursor: pointer; color: #cbd5e1; transition: 0.2s; z-index: 5; }
.fc-star-btn:hover { transform: scale(1.2); }
.fc-star-btn.saved { color: #fbbf24; }

/* Nút hành động sau giải thích đáp án */
.post-explain-actions { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin-top: 20px; }

/* TAB CONTENT */
.tab-content { display: none; }
.tab-content.active { display: block; }

/* FORM CONTROLS */
.form-group { margin-bottom: 14px; }
.form-label { font-size: 0.85em; font-weight: 700; color: var(--text-sub); display: block; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.4px; }
.form-control { width: 100%; padding: 10px 12px; border: 1.5px solid var(--border-color); border-radius: 8px; background: var(--bg-body); color: var(--text-main); box-sizing: border-box; font-size: 1em; outline: none; transition: border-color 0.2s; }
.form-control:focus { border-color: var(--text-main); }

/* DARK MODE SCORE CIRCLE FIX */
body.dark-mode .score-circle::before { background: var(--bg-card) !important; }
body.dark-mode .score-text { color: var(--text-main) !important; }

/* ========================================================
   EXAM PAGE LAYOUT: HEADER & QUESTION SEPARATORS
   ======================================================== */
.header-wrapper { text-align: center; padding: 30px 20px 24px; border-bottom: 2px solid var(--border-color); margin-bottom: 24px; }
.header { font-size: 2em; font-weight: 900; color: var(--primary-text); letter-spacing: -0.5px; line-height: 1.2; display: inline-block; }
body.dark-mode .header { color: var(--primary-text); }

.question-block { padding: 22px 0; border-bottom: 2px dashed var(--border-color); margin-bottom: 8px; }
.question-block:last-child { border-bottom: none; }

.instruction { font-weight: 700; color: var(--primary-text); padding: 14px 0 10px; margin-bottom: 10px; font-size: 1.02em; border-bottom: 1.5px solid var(--border-color); }

.question-text { font-size: 1.08em; line-height: 1.9 !important; margin-bottom: 16px; display: flex; gap: 10px; align-items: flex-start; }
.q-number { font-weight: 800; color: #2563eb; flex-shrink: 0; font-size: 1em; }
body.dark-mode .q-number { color: #60a5fa; }
.shared-text { padding: 16px 18px; border-radius: 8px; border: 1px solid var(--border-color); margin-bottom: 16px; line-height: 1.95 !important; font-size: 1.02em; background: var(--btn-hover); }

/* ========================================================
   EXAM PAGE LAYOUT: HEADER & QUESTION SEPARATORS
   ======================================================== */
/* ==========================================================
   TỐI ƯU HÓA ĐỀ THI TOPIK (ĐÃ SỬA LỖI ĐÈ CHỮ & IN ĐẬM)
   ========================================================== */

/* 1. Tiêu đề yêu cầu ở mỗi cụm câu (To, in đậm và nổi bật) */
.instruction { 
    font-size: 1.35em !important; 
    font-weight: 800 !important; 
    color: var(--primary-text) !important; 
    padding: 15px 0 12px !important; 
    margin-bottom: 20px !important; 
    border-bottom: 2px solid var(--border-color) !important; 
    line-height: 1.5 !important;
}

/* 2. Nội dung Đề bài (To hơn đáp án nhưng KHÔNG in đậm) */
.question-text { 
    font-size: 1.25em !important; 
    font-weight: 400 !important; /* Đã trả về nét chữ mỏng bình thường */
    color: var(--text-main) !important; 
    line-height: 1.6 !important; 
    margin-bottom: 20px !important;
}

/* Số thứ tự câu hỏi (Vẫn giữ in đậm cho dễ nhìn) */
.q-number {
    font-size: 1.15em !important;
    font-weight: 900 !important;
    color: #2563eb !important;
}

/* 3. Các đáp án (Đã trả lại khoảng trống 45px bên trái để chữ không đè lên số) */
.option {
    font-size: 1.05em !important;
    padding: 14px 18px 14px 45px !important; /* Quan trọng: 45px bên trái */
}

/* 4. Phóng to các đoạn văn bản đọc hiểu dùng chung (KHÔNG in đậm) */
.shared-text {
    font-size: 1.18em !important;
    font-weight: 400 !important;
    line-height: 1.7 !important;
    padding: 20px !important;
}

===== END FILE: public/assets/css/style.css =====

===== FILE: public/assets/css/exam-layout.css =====
/* ==========================================================================
   EXAM-LAYOUT.CSS — Layout đề thi: Header, Question Block, Options, Explanation
   ========================================================================== */

/* Ẩn nội dung thi trước khi chọn chế độ thi (Fix lỗi FOUC) */
body:not(.app-started) .container {
    display: none !important;
}

/* ========== HEADER ========== */
.header-wrapper { text-align: center; padding: 30px 20px 24px; border-bottom: 2px solid var(--border-color); margin-bottom: 24px; }
.header { font-size: 2em; font-weight: 900; color: var(--primary-text); letter-spacing: -0.5px; line-height: 1.2; display: inline-block; }
body.dark-mode .header { color: var(--primary-text); }

/* ========== INSTRUCTION ========== */
.instruction {
    font-size: 1.35em !important;
    font-weight: 800 !important;
    color: var(--primary-text) !important;
    padding: 15px 0 12px !important;
    margin-bottom: 20px !important;
    border-bottom: 2px solid var(--border-color) !important;
    line-height: 1.5 !important;
}

/* ========== QUESTION BLOCK ========== */
.question-block { padding: 22px 0; border-bottom: 2px dashed var(--border-color); margin-bottom: 8px; }
.question-block:last-child { border-bottom: none; }

.question-text {
    font-size: 1.25em !important;
    font-weight: 400 !important;
    color: var(--text-main) !important;
    line-height: 1.6 !important;
    margin-bottom: 20px !important;
    text-align: left !important;
}

.q-number {
    font-weight: 800; color: #2563eb; flex-shrink: 0;
    font-size: 1.15em !important;
    font-weight: 900 !important;
    color: #2563eb !important;
}
body.dark-mode .q-number { color: #60a5fa !important; }

.shared-text {
    padding: 16px 18px; border-radius: 8px; border: 1px solid var(--border-color);
    margin-bottom: 16px; background: var(--btn-hover);
    font-size: 1.18em !important;
    font-weight: 400 !important;
    line-height: 1.7 !important;
    padding: 20px !important;
}

/* ========== OPTIONS ========== */
.options { display: flex; flex-direction: column; gap: 10px; margin-bottom: 20px; }
.options-grid { display: grid; grid-template-columns: 1fr; }
@media (min-width: 700px) { .options-grid { grid-template-columns: 1fr 1fr; } }

.option {
    position: relative; display: block;
    padding: 14px 18px 14px 45px !important;
    border: 1px solid var(--border-color);
    border-radius: 8px;
    background: var(--bg-card);    /* Dùng CSS var, không hardcode #fff */
    color: var(--primary-text);
    cursor: pointer; transition: all 0.2s; line-height: 1.7;
    font-size: 1.05em !important;
    text-align: left !important;
}
.option:not(.correct):not(.wrong):hover { background-color: var(--btn-hover); border-color: #a0aec0; }
.option .num { position: absolute; left: 12px; top: 12px; display: inline-block; width: 24px; height: 24px; line-height: 22px; text-align: center; border: 1px solid #a0aec0; color: #4a5568; font-weight: bold; border-radius: 50%; font-size: 0.85em; }
/* Dark mode: num border cũng cần sáng hơn */
body.dark-mode .option .num { border-color: #64748b; color: #94a3b8; }
body.dark-mode .option:not(.correct):not(.wrong):hover { background-color: #1e293b; }
.option.selected { background-color: var(--selected-bg); border-color: var(--selected-border); color: var(--selected-text); }
.option.selected .num { background-color: #3182ce; border-color: #3182ce; color: white; }
.option.correct { background-color: var(--correct-bg); border-color: var(--correct-border); color: var(--correct-text); cursor: default; }
.option.correct .num { background-color: #38a169; border-color: #38a169; color: white; }
.option.wrong { background-color: var(--wrong-bg); border-color: var(--wrong-border); color: var(--wrong-text); opacity: 0.8; cursor: default; }
.option.wrong .num { background-color: #e53e3e; border-color: #e53e3e; color: white; }

/* ========== ACTION AREA & EXPLANATION ========== */
.action-area { display: none; margin-top: 15px; }
.btn-explain { background-color: var(--btn-hover); color: #2b6cb0; border: 1px solid var(--border-color); padding: 12px 20px; border-radius: 8px; cursor: pointer; font-size: 1em; font-weight: bold; width: 100%; text-align: left; transition: all 0.2s; box-shadow: none; }
body.dark-mode .btn-explain { color: #60a5fa; }
.btn-explain:hover { background-color: var(--border-color); border-color: var(--border-color); }
.explanation-content { display: none; margin-top: 10px; padding: 20px; border-radius: 8px; border: 1px solid var(--border-color); border-left: 4px solid #3182ce; background-color: var(--bg-card); }
body.dark-mode .explanation-content { border-left-color: #3b82f6; }

.trans-box { margin-bottom: 20px; color: var(--primary-text); }
.trans-title { font-weight: bold; color: #2b6cb0; margin-bottom: 5px; display: block; }
body.dark-mode .trans-title { color: #60a5fa; }
.trans-content { font-style: italic; color: var(--text-sub); padding-bottom: 10px; }
.opt-trans { display: block; font-size: 0.95em; margin-top: 10px; margin-bottom: 15px; background: var(--btn-hover); border-color: var(--border-color); color: var(--text-sub); padding: 12px; border-radius: 6px; border-left: 3px solid var(--border-color); }
.opt-trans ul { margin: 0; padding-left: 20px; }
.explain-box h4 { margin-top: 15px; color: var(--wrong-text); border-bottom: 1px solid var(--border-color); padding-bottom: 8px; }
.wrong-reason { color: var(--wrong-text); font-size: 0.95em; display: block; margin-top: 5px; padding-left: 15px; border-left: 2px solid var(--wrong-border); margin-bottom: 10px; }

/* ========== NÚT ÔN TẬP TỪ VỰNG ========== */
.review-link {
    display: flex; align-items: center; justify-content: center; gap: 10px;
    margin-top: 25px;
    background: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%);
    color: #ffffff !important; font-weight: bold; font-size: 1.05em;
    text-decoration: none; border: none; padding: 14px 20px;
    border-radius: 10px; width: 100%; box-sizing: border-box;
    cursor: pointer; transition: all 0.3s ease;
    box-shadow: 0 4px 10px rgba(109, 40, 217, 0.25);
}
.review-link:hover { transform: translateY(-3px); box-shadow: 0 8px 20px rgba(109, 40, 217, 0.4); background: linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%); }
.review-link:active { transform: translateY(0); }
.review-link::before { content: '📇'; font-size: 1.2em; }

/* ========== POST EXPLAIN ACTIONS ========== */
.post-explain-actions { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin-top: 20px; }

===== END FILE: public/assets/css/exam-layout.css =====

===== FILE: public/assets/css/exam-controls.css =====
/* ==========================================================================
   EXAM-CONTROLS.CSS — Navbar inject, Start Screen, Timer, Result Modal, Score Circle
   ========================================================================== */

/* ========== ICON HOME & SCROLL ========== */
.hide-on-scroll { transform: translateY(-100px); opacity: 0; pointer-events: none; }
.icon-home { position: fixed; top: 15px; right: 15px; width: 42px; height: 42px; color: #4a5568; z-index: 99999; cursor: pointer; transition: all 0.3s ease; background: #fff; border: 1px solid #cbd5e0; border-radius: 8px; padding: 8px; box-sizing: border-box; }
.icon-home svg { width: 100%; height: 100%; fill: currentColor; }

/* ========== EXAM TIMER & SUBMIT ========== */
#examControls { display: none; position: fixed; bottom: 20px; left: 8px; background: rgba(255, 255, 255, 0.95); padding: 9px 11px; border-radius: 12px; border: 1px solid #cbd5e0; z-index: 999; text-align: center; box-shadow: 0 4px 15px rgba(0,0,0,0.1); backdrop-filter: blur(5px); }
.timer-display { font-size: 1.5em; font-weight: bold; color: #e53e3e; font-family: monospace; margin-bottom: 8px; line-height: 1; }
.btn-submit { background: #e53e3e; color: white; border: none; padding: 7px 12px; font-size: 0.8em; font-weight: bold; border-radius: 6px; cursor: pointer; transition: 0.2s; white-space: nowrap; }

/* ========== RESULT MODAL & SCORE CIRCLE ========== */
.modal-overlay { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(15, 23, 42, 0.85); z-index: 9999; justify-content: center; align-items: center; }
.modal-content { background: #fff; width: 95%; max-width: 800px; border-radius: 16px; padding: 35px; position: relative; display: flex; flex-direction: column; overflow-y: auto; max-height: 90vh; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1); }
.close-btn { position: absolute; top: 15px; right: 20px; font-size: 2em; cursor: pointer; color: #a0aec0; z-index: 100; transition: color 0.2s; }
.close-btn:hover { color: #4a5568; }

#questionStatusGrid { display: grid; grid-template-columns: repeat(10, 1fr); gap: 8px; margin-bottom: 25px; }
.q-status-item { padding: 8px 0; text-align: center; border-radius: 6px; font-weight: bold; color: white; font-size: 0.9em; }
.q-status-item.q-correct { background-color: #48bb78; }
.q-status-item.q-wrong { background-color: #e53e3e; }
.q-status-item.q-skipped { background-color: #94a3b8; }

/* Score Circle */
.score-circle {
    position: relative !important; width: 150px !important; height: 150px !important;
    border-radius: 50% !important;
    background: conic-gradient(#48bb78 var(--progress, 0%), #e53e3e 0deg) !important;
    display: flex !important; flex-direction: column !important;
    justify-content: center !important; align-items: center !important;
    margin: 0 auto 30px !important;
    border: none !important; box-shadow: none !important; flex-shrink: 0 !important;
}
.score-circle::before {
    content: '' !important; position: absolute !important; inset: 14px !important;
    background: #ffffff !important; border-radius: 50% !important;
    z-index: 0 !important; box-shadow: none !important;
}
.score-circle-content { position: relative !important; z-index: 10 !important; display: flex !important; flex-direction: column !important; align-items: center !important; }
.score-text { font-size: 3.5em !important; color: #2d3748 !important; font-weight: 900 !important; line-height: 1 !important; }
.score-sub { font-size: 1.1em !important; color: #718096 !important; font-weight: bold !important; margin-top: 5px !important; }

/* Dark mode fixes */
body.dark-mode .score-circle::before { background: var(--bg-card) !important; }
body.dark-mode .score-text { color: var(--text-main) !important; }

/* ==========================================================================
   QUESTION NAVIGATOR — position: fixed, khong cuon theo trang
   ========================================================================== */

/* Nut toggle */
.nav-toggle-btn {
    position: fixed;
    bottom: 22px;
    right: 22px;
    display: none;
    align-items: center;
    gap: 7px;
    background: #2563eb;
    color: #fff;
    border: none;
    border-radius: 14px;
    padding: 11px 16px;
    font-size: 0.87em;
    font-weight: 700;
    cursor: pointer;
    z-index: 9000;
    box-shadow: 0 4px 18px rgba(37,99,235,0.4);
    transition: background 0.2s, transform 0.15s, box-shadow 0.2s;
    white-space: nowrap;
}
.nav-toggle-btn:hover  { background: #1d4ed8; transform: translateY(-2px); box-shadow: 0 6px 22px rgba(37,99,235,0.5); }
.nav-toggle-btn.active { background: #1e3a8a; right: 12px; padding: 12px; border-radius: 12px; }
.nav-toggle-btn.active .nav-toggle-label { display: none; }
.nav-toggle-btn svg    { flex-shrink: 0; }
.nav-toggle-label      { letter-spacing: 0.3px; overflow: hidden; transition: width 0.2s; }

/* Panel — Desktop: fixed sidebar phai man hinh */
.question-nav-panel {
    position: fixed;
    top: 0;
    right: 0;
    width: 260px;
    height: 100vh;
    z-index: 8999;
    display: flex;
    flex-direction: column;
    background: rgba(255,255,255,0.97);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border-left: 1px solid #e2e8f0;
    box-shadow: -4px 0 24px rgba(0,0,0,0.12);
    transform: translateX(100%);
    transition: transform 0.28s cubic-bezier(0.4, 0, 0.2, 1);
    overflow: hidden;
}
.question-nav-panel.open { transform: translateX(0); }

/* Header */
.nav-panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 16px;
    border-bottom: 1px solid #e2e8f0;
    background: #f8fafc;
    flex-shrink: 0;
}
.nav-panel-title { font-weight: 800; font-size: 0.9em; color: #1e293b; }
.nav-panel-close {
    background: none; border: none; color: #94a3b8; font-size: 1.05em;
    cursor: pointer; padding: 4px 7px; border-radius: 6px;
    transition: color 0.2s, background 0.2s; line-height: 1;
}
.nav-panel-close:hover { color: #ef4444; background: #fee2e2; }

/* Luoi cau hoi */
.nav-grid {
    display: grid;
    gap: 6px;
    padding: 14px;
    overflow-y: auto;
    flex: 1;
    align-content: start;
}

/* Nut tung cau */
.nav-q-btn {
    aspect-ratio: 1 / 1;
    border: 2px solid #cbd5e0;
    border-radius: 8px;
    background: #f8fafc;
    color: #4a5568;
    font-size: 0.8em;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.15s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    line-height: 1;
}
.nav-q-btn:hover          { background: #e2e8f0; border-color: #94a3b8; transform: scale(1.06); }
.nav-q-btn.nav-q-answered { background: #ebf8ff; border-color: #3182ce; color: #2b6cb0; }
.nav-q-btn.nav-q-correct  { background: #f0fff4; border-color: #38a169; color: #276749; }
.nav-q-btn.nav-q-wrong    { background: #fff5f5; border-color: #e53e3e; color: #c53030; }
.nav-q-btn.nav-q-skipped  { background: #f1f5f9; border-color: #94a3b8; color: #64748b; }

/* Dark mode */
body.dark-mode .question-nav-panel       { background: rgba(15,23,42,0.97); border-color: #334155; box-shadow: -4px 0 24px rgba(0,0,0,0.5); }
body.dark-mode .nav-panel-header         { background: #0f172a; border-color: #334155; }
body.dark-mode .nav-panel-title          { color: #e2e8f0; }
body.dark-mode .nav-q-btn                { background: #1e293b; border-color: #475569; color: #94a3b8; }
body.dark-mode .nav-q-btn:hover          { background: #334155; border-color: #64748b; }
body.dark-mode .nav-q-btn.nav-q-answered { background: #1e3a5f; border-color: #3b82f6; color: #93c5fd; }
body.dark-mode .nav-q-btn.nav-q-correct  { background: #14532d; border-color: #22c55e; color: #86efac; }
body.dark-mode .nav-q-btn.nav-q-wrong    { background: #450a0a; border-color: #ef4444; color: #fca5a5; }
body.dark-mode .nav-q-btn.nav-q-skipped  { background: #1e293b; border-color: #475569; color: #64748b; }
body.dark-mode .nav-toggle-btn           { background: #3b82f6; box-shadow: 0 4px 16px rgba(59,130,246,0.4); }
body.dark-mode .nav-toggle-btn:hover     { background: #2563eb; }
.type-nav-content { overflow-y: hidden; }
.nav-type-row { padding: 8px 0; }

/* Mobile < 768px: full-screen overlay — KHÔNG scroll bên trong */
@media (max-width: 767px) {
    .question-nav-panel {
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        width: 100%;
        height: 100%;
        border-left: none;
        border-radius: 0;
        box-shadow: none;
        transform: translateY(100%);
        overflow: hidden; /* Panel không scroll */
    }
    .question-nav-panel.open { transform: translateY(0); }

    .nav-panel-header {
        padding: 14px 18px;
        flex-shrink: 0;
    }

    /* Grid chiếm toàn bộ phần còn lại — KHÔNG scroll */
    .nav-grid {
        flex: 1;           /* Chiếm hết chiều cao còn lại sau header */
        overflow: hidden;  /* KHÔNG scroll */
        padding: 12px 16px 16px;
        gap: 8px;
        /* Các hàng tự co giãn đều nhau để lấp đầy chiều cao */
        grid-auto-rows: 1fr;
    }

    .nav-q-btn {
        /* Bỏ aspect-ratio để nút stretch theo chiều dọc của hàng */
        aspect-ratio: unset;
        width: 100%;
        height: 100%;
        font-size: 0.88em;
        border-radius: 10px;
    }

    .nav-toggle-btn { bottom: 16px; right: 12px; padding: 12px; border-radius: 12px; }
    .nav-toggle-btn.active { right: 12px; padding: 12px; }
    .nav-toggle-label { display: none; }

    .nav-type-qlist .nav-q-btn { width: auto; min-width: 44px; height: 44px; aspect-ratio: 1/1; }
    .type-nav-content { overflow-y: auto; }
    .nav-type-row { padding: 16px 0; }
}

===== END FILE: public/assets/css/exam-controls.css =====

===== FILE: public/assets/css/writing.css =====
/* ===== MÀU SẮC & FONT CHUNG ===== */
:root { --text-main: #1f2937; --text-sub: #4b5563; --primary: #2563eb; --primary-hover: #1d4ed8; }
body { font-family: 'Pretendard', 'Inter', sans-serif; font-size: 16px; background: linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%); background-attachment: fixed; color: var(--text-main); margin: 0; padding: 0px 15px 80px 15px; line-height: 1.7; }
* { box-sizing: border-box; }
button, input, textarea { font-family: 'Pretendard', 'Inter', sans-serif !important; font-size: 1rem; }

/* ===== WRAPPER KÍNH MỜ (GLASSMORPHISM) ===== */
.wrapper { max-width: 900px; margin: 0 auto 35px auto; background: rgba(255, 255, 255, 0.45); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); border: 1px solid rgba(255, 255, 255, 0.6); border-radius: 24px; padding: 35px 45px; box-shadow: 0 20px 40px rgba(31, 38, 135, 0.07); }
.section-title { color: #1e40af; font-weight: 800; font-size: 1.5rem; border-bottom: 2px solid rgba(255, 255, 255, 0.5); padding-bottom: 15px; margin-top: 0; margin-bottom: 25px; display: flex; justify-content: space-between; align-items: center; }
.badge { background: rgba(37, 99, 235, 0.15); color: #1e40af; font-size: 0.8rem; padding: 6px 14px; border-radius: 99px; font-weight: 700; border: 1px solid rgba(37, 99, 235, 0.2); }

.writing-box { background: rgba(255, 255, 255, 0.6); border-radius: 16px; padding: 25px; border: 1px solid rgba(255, 255, 255, 0.8); font-size: 1.05rem; margin-bottom: 25px; box-shadow: 0 4px 15px rgba(0,0,0,0.03); }
.exam-instruction { font-weight: 700; color: #0f172a; margin-bottom: 15px; font-size: 0.95rem; padding-bottom: 12px; border-bottom: 1px dashed rgba(0,0,0,0.1);}

.answer-area { border-top: 2px dashed rgba(255,255,255,0.6); padding-top: 25px; margin-top: 20px; }
.ans-block { margin-bottom: 25px; background: rgba(255,255,255,0.75); padding: 20px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.9); box-shadow: 0 8px 20px rgba(0,0,0,0.04);}
.ans-block-title { font-weight: 800; color: #1e40af; margin-bottom: 12px; font-size: 1.1rem; }

/* ===== FORM INPUTS & NÚT BẤM ===== */
.writing-input { width: 100%; border: 2px solid rgba(255,255,255,0.8); background: rgba(255,255,255,0.5); padding: 15px 18px; border-radius: 12px; font-size: 1rem; color: #1e40af; font-weight: 600; margin-top: 5px; outline: none; transition: 0.3s; resize: vertical; box-shadow: inset 0 2px 4px rgba(0,0,0,0.02); }
.writing-input:focus { border-color: var(--primary); background: rgba(255,255,255,0.9); box-shadow: 0 0 0 4px rgba(37,99,235,0.15); }

.btn-action { background: linear-gradient(135deg, var(--primary) 0%, #3b82f6 100%); color: white; border: none; padding: 12px 24px; border-radius: 12px; font-weight: 700; cursor: pointer; transition: 0.3s; font-size: 1rem; box-shadow: 0 4px 15px rgba(37,99,235,0.3); }
.btn-action:hover { transform: translateY(-3px); box-shadow: 0 8px 20px rgba(37,99,235,0.4); }
.btn-outline { background: rgba(255,255,255,0.8); color: var(--primary); border: 2px solid var(--primary); box-shadow: none; font-weight: 600; padding: 10px 20px; border-radius: 10px; cursor: pointer; transition: 0.3s;}
.btn-outline:hover { background: var(--primary); color: white; }

.explanation-box { background: rgba(240, 253, 244, 0.8); border: 1px solid #bbf7d0; padding: 20px; border-radius: 12px; margin-top: 15px; display: none; font-size: 0.95rem; color: #1f2937; }
.score-display { font-weight: 800; color: #dc2626; font-size: 1.15rem; margin-bottom: 8px; }

/* ===== BIỂU ĐỒ 53 (ĐÃ XÓA VIỀN BORDER ĐỂ KHÔNG LEM MÀU) ===== */
.chart-container { display: flex; justify-content: space-around; flex-wrap: wrap; gap: 40px; margin-bottom: 30px; }
.donut-wrapper { position: relative; width: 200px; height: 200px; }
.donut-chart { width: 100%; height: 100%; border-radius: 50%; box-shadow: 0 10px 25px rgba(0,0,0,0.1); border: none; } /* <-- Đã xóa border */
.donut-inner { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 100px; height: 100px; background: rgba(255,255,255,0.95); border-radius: 50%; display: flex; justify-content: center; align-items: center; font-weight: 800; font-size: 1.2rem; color: #1e40af; box-shadow: inset 0 2px 5px rgba(0,0,0,0.05); }
.chart-label { position: absolute; font-weight: 800; color: #1e293b; font-size: 0.85rem; background: rgba(255,255,255,0.85); backdrop-filter: blur(4px); padding: 4px 8px; border-radius: 12px; box-shadow: 0 4px 10px rgba(0,0,0,0.15); transform: translate(-50%, -50%); z-index: 5; border: 1px solid rgba(255,255,255,1); }
.chart-legend { display: flex; gap: 20px; justify-content: center; font-size: 0.95rem; font-weight: 600; flex-wrap: wrap; margin-top: 10px; }
.legend-item { display: flex; align-items: center; gap: 8px; }
.dot { width: 14px; height: 14px; border-radius: 50%; box-shadow: 0 2px 4px rgba(0,0,0,0.1);}

/* ===== TABS NỔI BẬT ===== */
.tab-container { display: flex; gap: 12px; margin-bottom: 25px; flex-wrap: wrap; }
.tab-btn { flex: 1; min-width: 140px; text-align: center; background: rgba(255,255,255,0.4); backdrop-filter: blur(8px); border: 1px solid rgba(255,255,255,0.6); padding: 14px 20px; font-size: 1.05rem; font-weight: 600; color: #4b5563; cursor: pointer; border-radius: 14px; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
.tab-btn:hover { background: rgba(255,255,255,0.7); color: #1e40af; transform: translateY(-2px); }
.tab-btn.active { background: rgba(255,255,255,0.95); color: var(--primary); font-weight: 800; box-shadow: 0 10px 20px rgba(37, 99, 235, 0.1); border-bottom: 4px solid var(--primary); transform: translateY(-4px); }
.tab-content { display: none; animation: fadeIn 0.4s ease; }
.tab-content.active { display: block; }
.guide-box { background: rgba(255,255,255,0.6); padding: 20px 25px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.8); margin-bottom: 20px; font-size: 1rem; }

/* ===== BẢNG SONG NGỮ & ACCORDION ===== */
.bilingual-table { width: 100%; border-collapse: separate; border-spacing: 0; margin-top: 15px; font-size: 1rem; border-radius: 16px; overflow: hidden; border: 1px solid rgba(255,255,255,0.8); box-shadow: 0 4px 15px rgba(0,0,0,0.03); }
.bilingual-table td { padding: 18px 20px; border-bottom: 1px solid rgba(255,255,255,0.5); vertical-align: top; background: rgba(255,255,255,0.4); }
.bilingual-table tr:last-child td { border-bottom: none; }
.bilingual-table tr { transition: 0.2s; }
.bilingual-table tr:hover { background: rgba(255,255,255,0.7); }
.bilingual-table td:first-child { width: 50%; font-weight: 600; color: #1e40af; border-right: 1px solid rgba(255,255,255,0.5); }
.bilingual-table td:last-child { color: var(--text-main); }

details { background: rgba(255,255,255,0.6); border: 1px solid rgba(255,255,255,0.8); border-radius: 12px; margin-bottom: 12px; transition: 0.3s; }
details[open] { background: rgba(255,255,255,0.9); box-shadow: 0 4px 15px rgba(0,0,0,0.05); }
summary { padding: 18px 20px; font-weight: 700; color: #1e40af; cursor: pointer; list-style: none; user-select: none; font-size: 1.05rem; }
summary::-webkit-details-marker { display: none; }
.details-content { padding: 0 20px 20px 20px; color: #374151; border-top: 1px dashed rgba(0,0,0,0.1); margin-top: 5px; padding-top: 15px; font-size: 1rem; line-height: 1.8;}

/* ===== SÁCH LUYỆN TẬP ===== */
.book-container { display: flex; border: 1px solid rgba(255,255,255,0.8); border-radius: 16px; background: rgba(255,255,255,0.6); margin-top: 20px; min-height: 250px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.05);}
.book-page { flex: 1; padding: 30px; width: 50%; position: relative; }
.page-left { background: rgba(248, 250, 252, 0.5); border-right: 2px dashed rgba(203, 213, 225, 0.5); }
.book-title { font-size: 0.85rem; font-weight: 800; color: #64748b; text-transform: uppercase; margin-bottom: 15px; letter-spacing: 1px; }

/* ===== CSS GRID CHUẨN CHO THANH ĐIỀU HƯỚNG SÁCH ===== */
.book-nav-wrapper { 
    display: grid !important;
    grid-template-columns: 1fr auto 1fr;
    grid-template-areas: 
        "prev indicator next"
        "action action action";
    row-gap: 15px;
    align-items: center;
    background: rgba(255,255,255,0.7); 
    border: 1px solid rgba(255,255,255,0.9); 
    border-radius: 16px; 
    padding: 15px 25px; 
    margin-top: 15px; 
    box-shadow: 0 4px 15px rgba(0,0,0,0.03); 
}
.btn-prev { grid-area: prev; justify-self: start; margin: 0; }
.btn-next { grid-area: next; justify-self: end; margin: 0; }
.page-indicator { grid-area: indicator; justify-self: center; font-size: 1.05rem; font-weight: 800; color: #64748b; margin: 0; }

/* Ép buộc thu ngắn lại và căn giữa */
.action-btn { 
    grid-area: action; 
    justify-self: center; 
    width: fit-content !important; 
    min-width: 140px;   
    border-radius: 99px; /* Bo tròn 2 đầu dạng viên thuốc */
    padding: 10px 25px;
    margin: 0;
}

/* Đảm bảo trên điện thoại Grid vẫn giữ nguyên 2 hàng */
@media (max-width: 768px) {
    .book-nav-wrapper { 
        grid-template-columns: auto 1fr auto !important; 
        padding: 15px !important; 
    }
    .btn-prev, .btn-next { padding: 8px 12px; font-size: 0.85rem; }
}

/* Thuật toán Diff */
.diff-correct { color: #059669; font-weight: 700; background: #d1fae5; padding: 2px 6px; border-radius: 6px;}
.diff-added { color: #dc2626; text-decoration: line-through; background: #fee2e2; padding: 2px 6px; border-radius: 6px; margin: 0 3px;}
.diff-missing { color: #2563eb; font-weight: 700; border-bottom: 2px dashed #2563eb; margin: 0 3px; padding-bottom: 2px;}

/* Ẩn nút rác */
.btn-study, .study-btn-wrapper { display: none !important; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

/* ===== RESPONSIVE ===== */
@media (max-width: 768px) {
    .wrapper { padding: 25px 20px; border-radius: 20px; margin-left: auto; margin-right: auto; }
    .tab-container { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .tab-btn { min-width: auto; padding: 12px 10px; font-size: 0.95rem; }
    .book-container { flex-direction: column; }
    .page-left { border-right: none; border-bottom: 2px dashed rgba(203, 213, 225, 0.5); width: 100%; }
    .book-page { width: 100%; }
    .bilingual-table td { display: block; width: 100% !important; border: none; border-bottom: 1px solid rgba(255,255,255,0.5); }
    
    /* Giao diện nút sách trên Điện thoại */
    .book-nav-wrapper {
        grid-template-columns: auto 1fr auto;
        grid-template-areas: 
            "prev indicator next"
            "action action action";
        row-gap: 15px;
        padding: 15px;
    }
    .action-btn { width: 100%; } /* Nút luyện tập kéo full chiều ngang */
    .btn-prev, .btn-next { padding: 8px 12px; font-size: 0.85rem; }
}

===== END FILE: public/assets/css/writing.css =====

===== FILE: public/assets/css/audio.css =====
/* Khung trình phát ghim cố định */
#sticky-audio-player {
    position: sticky;
    top: 85px; /* Nằm ngay dưới navbar (navbar top: 20 + height: 50 + shadow) */
    z-index: 990; 
    background: rgba(255, 255, 255, 0.7);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border: 1px solid rgba(255, 255, 255, 0.6);
    border-radius: 16px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
    padding: 10px 20px;
    max-width: 900px;
    width: 100%;
    margin: -15px auto 30px auto; 
    box-sizing: border-box;
    font-family: 'Pretendard', 'Inter', sans-serif;
    transition: top 0.3s ease;
}

@media (max-width: 768px) {
    #sticky-audio-player {
        top: 75px;
        margin: -10px auto 20px auto;
        border-radius: 16px;
        width: calc(100% - 30px);
    }
}

@media (max-width: 600px) {
    #sticky-audio-player {
        top: 51px;
        margin: 0;
        width: 100%;
        border-radius: 0 0 16px 16px;
        padding: 4px 8px;
        border-top: none;
        border-left: none;
        border-right: none;
    }
}

/* Container chứa các nút bấm nằm giữa màn hình */
.player-inner {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    width: 100%;
}

/* Nút điều khiển (Rewind/Forward) */
.btn-ctrl {
    background: none;
    border: none;
    color: #64748b;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 8px;
    border-radius: 50%;
    transition: all 0.2s ease;
    flex-shrink: 0;
}
.btn-ctrl:hover {
    background: #f1f5f9;
    color: #2563eb;
    transform: scale(1.1);
}

/* Nút Play/Pause mỏng, phẳng */
#btn-play-pause {
    background: #eff6ff;
    color: #2563eb;
    width: 40px;
    height: 40px;
    box-shadow: 0 2px 8px rgba(37, 99, 235, 0.15);
}
#btn-play-pause:hover {
    background: #dbeafe;
    color: #1d4ed8;
    box-shadow: 0 4px 12px rgba(37, 99, 235, 0.2);
}

/* Hiển thị thời gian MM:SS */
.time-display {
    font-size: 0.85em;
    color: #64748b;
    font-weight: 600;
    min-width: 42px;
    text-align: center;
    user-select: none;
}

/* ========== CUSTOM THANH TUA (PROGRESS BAR) FLAT DESIGN ========== */
#progress-bar {
    flex-grow: 1;
    -webkit-appearance: none;
    appearance: none;
    height: 6px; 
    background: #e2e8f0;
    border-radius: 3px;
    outline: none;
    cursor: pointer;
    transition: height 0.1s;
    margin: 0 8px;
}

#progress-bar:hover {
    height: 8px; 
}

/* Cục tròn để cầm kéo (Thumb) */
#progress-bar::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: #3b82f6;
    cursor: pointer;
    transition: transform 0.1s, box-shadow 0.1s;
    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
}

#progress-bar::-webkit-slider-thumb:hover {
    transform: scale(1.3);
    box-shadow: 0 3px 6px rgba(0,0,0,0.3);
}

/* Ẩn hoàn toàn video YouTube */
#youtube-player-hidden {
    position: absolute;
    width: 0;
        border-right: none;
    }
}

/* Container chứa các nút bấm nằm giữa màn hình */
.player-inner {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    width: 100%;
}

/* Nút điều khiển (Rewind/Forward) */
.btn-ctrl {
    background: none;
    border: none;
    color: #64748b;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 8px;
    border-radius: 50%;
    transition: all 0.2s ease;
    flex-shrink: 0;
}
.btn-ctrl:hover {
    background: #f1f5f9;
    color: #2563eb;
    transform: scale(1.1);
}

/* Nút Play/Pause mỏng, phẳng */
#btn-play-pause {
    background: #eff6ff;
    color: #2563eb;
    width: 40px;
    height: 40px;
    box-shadow: 0 2px 8px rgba(37, 99, 235, 0.15);
}
#btn-play-pause:hover {
    background: #dbeafe;
    color: #1d4ed8;
    box-shadow: 0 4px 12px rgba(37, 99, 235, 0.2);
}

/* Hiển thị thời gian MM:SS */
.time-display {
    font-size: 0.85em;
    color: #64748b;
    font-weight: 600;
    min-width: 42px;
    text-align: center;
    user-select: none;
}

/* ========== CUSTOM THANH TUA (PROGRESS BAR) FLAT DESIGN ========== */
#progress-bar {
    flex-grow: 1;
    -webkit-appearance: none;
    appearance: none;
    height: 6px; 
    background: #e2e8f0;
    border-radius: 3px;
    outline: none;
    cursor: pointer;
    transition: height 0.1s;
    margin: 0 8px;
}

#progress-bar:hover {
    height: 8px; 
}

/* Cục tròn để cầm kéo (Thumb) */
#progress-bar::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: #3b82f6;
    cursor: pointer;
    transition: transform 0.1s, box-shadow 0.1s;
    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
}

#progress-bar::-webkit-slider-thumb:hover {
    transform: scale(1.3);
    box-shadow: 0 3px 6px rgba(0,0,0,0.3);
}

/* Ẩn hoàn toàn video YouTube */
#youtube-player-hidden {
    position: absolute;
    width: 0;
    height: 0;
    opacity: 0;
    pointer-events: none;
}

/* Icon cái loa cạnh câu hỏi */
.speaker-icon {
    cursor: pointer;
    font-size: 1.2em;
    margin-left: 3px;
    padding: 8px;
    color: #3b82f6;
    transition: transform 0.2s, color 0.2s;
    display: inline-block;
    touch-action: manipulation;
    -webkit-tap-highlight-color: transparent;
}
.speaker-icon:hover {
    color: #ef4444;
    transform: scale(1.2);
}
/* Nut Loop — sang len khi dang bat */
#btn-loop.active {
    background: #eff6ff;
    color: #2563eb;
    box-shadow: 0 0 0 2px rgba(37,99,235,0.3);
}
#btn-loop.active:hover {
    background: #dbeafe;
    color: #1d4ed8;
}

/* Thu nho gap thanh player tren mobile */
@media (max-width: 600px) {
    .player-inner { 
        display: grid;
        grid-template-columns: repeat(6, 1fr);
        gap: 6px 0px; 
        width: 100%;
        align-items: center;
        justify-items: center;
    }
    
    .btn-ctrl { grid-column: span 1; padding: 4px; border-radius: 50%; display: flex; justify-content: center; align-items: center; }
    .btn-ctrl svg { width: 18px; height: 18px; }
    
    /* Thu nhỏ nút play/pause, bo cứng tròn 32x32 */
    #btn-play-pause { 
        width: 32px !important; 
        height: 32px !important; 
        min-height: 32px; 
        padding: 0;
        border-radius: 50%;
        box-shadow: none; 
        border: 1px solid rgba(0,0,0,0.05); 
    }
    #btn-play-pause svg { width: 14px; height: 14px; }

    .time-display { min-width: unset; font-size: 0.8em; margin-top: 0px; line-height: normal; }
    
    /* Ép cưỡng bức rớt nguyên vẹn xuống hàng 2 */
    #time-current { grid-column: span 1; width: 100%; text-align: left; margin: 0; }
    #progress-bar { grid-column: span 4; width: 100%; margin: 0; justify-self: stretch; }
    #time-total   { grid-column: span 1; width: 100%; text-align: right; margin: 0; }
}

/* ========== INTEGRATED PLAYER ========== */
#sticky-audio-player.integrated-player {
    position: static !important;
    top: auto !important;
    margin: 0 auto !important;
    max-width: 100% !important;
    width: 100% !important;
    background: transparent !important;
    backdrop-filter: none !important;
    -webkit-backdrop-filter: none !important;
    box-shadow: none !important;
    border: none !important;
    border-top: 1px solid #e2e8f0 !important;
    border-radius: 0 !important;
    padding: 8px 15px !important;
    z-index: auto !important;
}

body.dark-mode #sticky-audio-player.integrated-player {
    border-top: 1px solid #334155 !important;
}

@media (max-width: 600px) {
    #sticky-audio-player.integrated-player {
        padding: 5px 8px !important;
    }
}

===== END FILE: public/assets/css/audio.css =====

===== FILE: public/assets/css/forum.css =====
/* forum.css */

/* --- Tái sử dụng Variables --- */
:root {
    --f-primary: #2563eb;
    --f-primary-hover: #1d4ed8;
    --f-border: #e5e7eb;
    --f-bg-light: #f9fafb;
    --f-text-main: #1f2937;
    --f-text-sub: #6b7280;
    --f-red: #ef4444;
}

/* --- Common Buttons & Elements --- */
.btn-primary {
    background: var(--f-primary);
    color: white;
    border: none;
    padding: 10px 20px;
    border-radius: 8px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.2s;
}
.btn-primary:hover {
    background: var(--f-primary-hover);
}

.btn-outline {
    background: white;
    color: var(--f-text-main);
    border: 1px solid var(--f-border);
    padding: 8px 15px;
    border-radius: 8px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
}
.btn-outline:hover {
    background: var(--f-bg-light);
    border-color: #d1d5db;
}

.btn-icon {
    background: none;
    border: none;
    cursor: pointer;
    font-size: 1.1em;
    padding: 5px;
    opacity: 0.7;
    transition: opacity 0.2s;
}
.btn-icon:hover {
    opacity: 1;
}

.badge {
    background: var(--f-red);
    color: white;
    font-size: 0.75em;
    padding: 2px 6px;
    border-radius: 10px;
    margin-left: 5px;
    font-weight: bold;
}

/* --- TAB: Chat Công Khai --- */
.chat-container {
    display: flex;
    flex-direction: column;
    height: 500px;
    border: 1px solid var(--f-border);
    border-radius: 12px;
    overflow: hidden;
    background: var(--f-bg-light);
}

.chat-messages {
    flex: 1;
    padding: 15px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.chat-msg {
    display: flex;
    flex-direction: column;
    max-width: 80%;
}
.chat-msg.mine {
    align-self: flex-end;
}
.chat-msg.others {
    align-self: flex-start;
}

.msg-info {
    font-size: 0.75em;
    color: var(--f-text-sub);
    margin-bottom: 3px;
    display: flex;
    gap: 5px;
}
.chat-msg.mine .msg-info {
    justify-content: flex-end;
}

.msg-bubble {
    padding: 10px 15px;
    border-radius: 15px;
    font-size: 0.95em;
    line-height: 1.4;
    word-break: break-word;
}
.chat-msg.mine .msg-bubble {
    background: var(--f-primary);
    color: white;
    border-bottom-right-radius: 3px;
}
.chat-msg.others .msg-bubble {
    background: white;
    color: var(--f-text-main);
    border: 1px solid var(--f-border);
    border-bottom-left-radius: 3px;
}

.chat-input-area {
    display: flex;
    padding: 15px;
    background: white;
    border-top: 1px solid var(--f-border);
    gap: 10px;
}

.chat-input-area input {
    flex: 1;
    padding: 12px 15px;
    border: 1px solid var(--f-border);
    border-radius: 20px;
    outline: none;
    font-size: 0.95em;
}
.chat-input-area input:focus {
    border-color: var(--f-primary);
}

.chat-input-area button {
    background: var(--f-primary);
    color: white;
    border: none;
    padding: 0 20px;
    border-radius: 20px;
    font-weight: bold;
    cursor: pointer;
    transition: 0.2s;
}
.chat-input-area button:hover {
    background: var(--f-primary-hover);
}

/* --- TAB: Hỏi Đáp --- */
.qa-header {
    display: flex;
    justify-content: space-between;
    margin-bottom: 20px;
    gap: 15px;
    flex-wrap: wrap;
}

.qa-search {
    flex: 1;
    min-width: 200px;
}
.qa-search input {
    width: 100%;
    padding: 10px 15px;
    border: 1px solid var(--f-border);
    border-radius: 8px;
    outline: none;
    box-sizing: border-box;
}

.qa-list {
    display: flex;
    flex-direction: column;
    gap: 15px;
}

.qa-post-card {
    border: 1px solid var(--f-border);
    border-radius: 10px;
    padding: 15px;
    cursor: pointer;
    transition: box-shadow 0.2s, transform 0.2s;
    background: white;
}
.qa-post-card:hover {
    box-shadow: 0 4px 12px rgba(0,0,0,0.05);
    transform: translateY(-2px);
    border-color: #d1d5db;
}

.qa-post-title {
    font-size: 1.1em;
    font-weight: 700;
    margin: 0 0 8px 0;
    color: var(--f-text-main);
}

.qa-post-preview {
    color: var(--f-text-sub);
    font-size: 0.95em;
    margin: 0 0 10px 0;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
}

.qa-post-meta {
    display: flex;
    justify-content: space-between;
    font-size: 0.8em;
    color: #9ca3af;
}
.qa-post-meta .author {
    font-weight: 600;
    color: var(--f-text-main);
}

/* Post Detail View (Rendered via SweetAlert or dynamically inside the tab) */
.post-detail-container {
    text-align: left;
}
.post-detail-title {
    font-size: 1.5em;
    font-weight: bold;
    margin-bottom: 10px;
}
.post-detail-meta {
    font-size: 0.85em;
    color: var(--f-text-sub);
    margin-bottom: 20px;
    padding-bottom: 15px;
    border-bottom: 1px solid var(--f-border);
}
.post-detail-content {
    font-size: 1em;
    line-height: 1.6;
    margin-bottom: 30px;
    white-space: pre-wrap;
}
.replies-section {
    margin-top: 20px;
    border-top: 2px dashed var(--f-border);
    padding-top: 20px;
}
.reply-item {
    background: var(--f-bg-light);
    padding: 12px;
    border-radius: 8px;
    margin-bottom: 10px;
}
.reply-meta {
    font-size: 0.8em;
    color: var(--f-text-sub);
    margin-bottom: 5px;
}
.reply-meta strong {
    color: var(--f-text-main);
}
.reply-text {
    font-size: 0.95em;
}


/* --- TAB: Bạn Bè & Nhắn Tin --- */
.friends-layout {
    display: flex;
    gap: 20px;
    height: 600px;
}

.friends-sidebar {
    width: 280px;
    border: 1px solid var(--f-border);
    border-radius: 12px;
    display: flex;
    flex-direction: column;
    background: white;
}

.friends-actions {
    padding: 15px;
    border-bottom: 1px solid var(--f-border);
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
}
.friends-actions button {
    flex: 1;
    font-size: 0.85em;
}

.sidebar-title {
    font-size: 0.9em;
    font-weight: 700;
    color: var(--f-text-sub);
    text-transform: uppercase;
    margin: 15px 15px 10px 15px;
}

.friends-list {
    flex: 1;
    overflow-y: auto;
    padding: 0 10px 10px 10px;
}

.friend-item {
    display: flex;
    align-items: center;
    padding: 10px;
    border-radius: 8px;
    cursor: pointer;
    transition: 0.2s;
    margin-bottom: 5px;
}
.friend-item:hover, .friend-item.active {
    background: var(--f-bg-light);
}
.friend-avatar {
    width: 40px;
    height: 40px;
    background: #e0e7ff;
    color: var(--f-primary);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: bold;
    font-size: 1.2em;
    margin-right: 12px;
}
.friend-info {
    flex: 1;
    overflow: hidden;
}
.friend-name {
    font-weight: 600;
    font-size: 0.95em;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}
.friend-status {
    font-size: 0.75em;
    color: #10b981; /* Default online color or just text */
}

.friends-main {
    flex: 1;
    border: 1px solid var(--f-border);
    border-radius: 12px;
    display: flex;
    flex-direction: column;
    background: white;
}
.friends-main.placeholder-view {
    justify-content: center;
    align-items: center;
    background: var(--f-bg-light);
}

.dm-header {
    padding: 15px 20px;
    border-bottom: 1px solid var(--f-border);
    display: flex;
    justify-content: space-between;
    align-items: center;
}
.dm-header h3 {
    margin: 0;
    font-size: 1.1em;
}

.dm-messages {
    flex: 1;
    padding: 15px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 10px;
    background: var(--f-bg-light);
}

@media (max-width: 768px) {
    .friends-layout {
        flex-direction: column;
        height: 700px;
    }
    .friends-sidebar {
        width: 100%;
        height: 300px;
    }
    .friends-main {
        height: 400px;
    }
}

===== END FILE: public/assets/css/forum.css =====

===== FILE: public/assets/css/games.css =====
/* ==========================================================================
   GAMES.CSS — Flashcard, Match Game, Type Game, Progress Bar, Vocab List, Tab, Form
   ========================================================================== */

/* ========== FLASHCARD ========== */
#flashcardView { flex-grow: 1; display: flex; flex-direction: column; justify-content: center; padding-top: 10px; }
.card-counter { text-align: center; font-size: 1.1em; font-weight: bold; color: #718096; margin-bottom: 15px; letter-spacing: 1px; }
.flashcard-nav-container { display: flex; align-items: center; justify-content: center; gap: 30px; margin-bottom: 30px; }

.nav-btn { background: #fff; border: 2px solid #e2e8f0; border-radius: 50%; width: 50px; height: 50px; font-size: 1.4em; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #4a5568; transition: all 0.2s ease; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
.nav-btn:hover { background: #f8fafc; border-color: #cbd5e0; transform: scale(1.05); color: #2b6cb0; }

.flashcard { perspective: 1000px; width: 350px; height: 220px; cursor: pointer; margin: 0 auto; }
.flashcard-inner { position: relative; width: 100%; height: 100%; text-align: center; transition: transform 0.6s cubic-bezier(0.4, 0.2, 0.2, 1); transform-style: preserve-3d; border-radius: 16px; border: 1px solid #e2e8f0; background: #fff; box-shadow: 0 10px 20px rgba(0,0,0,0.08); }
.flashcard.flipped .flashcard-inner { transform: rotateY(180deg); }
.flashcard-front, .flashcard-back { position: absolute; width: 100%; height: 100%; backface-visibility: hidden; display: flex; flex-direction: column; justify-content: center; align-items: center; padding: 30px; border-radius: 16px; box-sizing: border-box; }
.flashcard-front { background: linear-gradient(135deg, #ebf4ff 0%, #ffffff 100%); color: #2b6cb0; }
.flashcard-back { background: linear-gradient(135deg, #fff5f5 0%, #ffffff 100%); color: #c53030; transform: rotateY(180deg); }

#fcFrontText { font-size: 2.2em; font-weight: 800; margin-bottom: 5px; }
#fcBackText { font-size: 1.6em; font-weight: bold; line-height: 1.4; }
.audio-icon { font-size: 0.85em; color: #718096; font-weight: normal; margin-top: 15px; display: inline-flex; align-items: center; gap: 6px; opacity: 0.9; background: rgba(255,255,255,0.7); padding: 6px 14px; border-radius: 20px; border: 1px solid #e2e8f0; }

.controls-row { display: flex; justify-content: center; align-items: center; gap: 15px; margin-bottom: 25px; color: #4a5568; font-weight: 500; }
.start-game-btn { background: #3182ce; color: white; border: none; padding: 14px 24px; border-radius: 10px; font-weight: bold; cursor: pointer; transition: 0.2s; font-size: 1.05em; display: inline-block; width: 100%; max-width: 350px; margin: 0 auto; box-shadow: 0 4px 6px rgba(49, 130, 206, 0.2); }
.start-game-btn:hover { background: #2b6cb0; transform: translateY(-2px); box-shadow: 0 6px 12px rgba(49, 130, 206, 0.3); }

/* Nút đánh giá Flashcard */
.flashcard-assess-group { display: flex; gap: 10px; justify-content: center; margin-top: 20px; width: 100%; }
.btn-assess { flex: 1; border: none; padding: 12px; border-radius: 8px; font-weight: bold; color: white; cursor: pointer; transition: 0.2s; font-size: 0.95em; }
.btn-assess:hover { filter: brightness(0.9); transform: translateY(-2px); }

/* Nút sao trong flashcard */
.fc-star-btn { position: absolute; top: 15px; right: 15px; background: transparent; border: none; font-size: 1.5em; cursor: pointer; color: #cbd5e1; transition: 0.2s; z-index: 5; }
.fc-star-btn:hover { transform: scale(1.2); }
.fc-star-btn.saved { color: #fbbf24; }

/* ========== MATCH GAME ========== */
#matchView { flex-grow: 1; display: none; flex-direction: column; position: relative; min-height: 350px; }
.match-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(110px, 1fr)); gap: 12px; margin-bottom: 20px; max-height: 45vh; overflow-y: auto; padding-right: 5px; align-content: start; }
.match-grid::-webkit-scrollbar { width: 6px; }
.match-grid::-webkit-scrollbar-thumb { background: #cbd5e0; border-radius: 4px; }

.match-card { padding: 10px; text-align: center; border-radius: 8px; font-weight: bold; cursor: pointer; display: flex; justify-content: center; align-items: center; min-height: 65px; border: 2px solid #e2e8f0; background: #f8fafc; font-size: 1em; transition: 0.15s; }
.match-card:hover { border-color: #cbd5e0; transform: translateY(-2px); }
.match-card:active { transform: scale(0.95); }
.match-card.kr { color: #2b6cb0; } .match-card.vn { color: #2f855a; }
.match-card.selected { border-color: #3182ce; background: #ebf8ff; box-shadow: inset 0 0 0 1px #3182ce; }
.match-card.error { border-color: #fc8181 !important; background: #fff5f5 !important; color: #c53030 !important; animation: shake 0.4s; }
.match-card.hidden { opacity: 0; pointer-events: none; visibility: hidden; }

.result-overlay { display: none; position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: rgba(255, 255, 255, 0.95); z-index: 100; flex-direction: column; justify-content: center; align-items: center; border-radius: 12px; }
.result-box { background: #fff; padding: 40px 30px; border-radius: 16px; text-align: center; border: 2px solid #48bb78; width: 85%; max-width: 320px; animation: popIn 0.3s; box-shadow: 0 10px 25px rgba(0,0,0,0.1); }

/* ========== MYPAGE GAME & SCROLL AREA ========== */
#matchArea { position: relative; min-height: 400px; display: flex; flex-direction: column; }
.match-grid-scroll { flex: 1; overflow-y: auto; display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 10px; padding: 5px; max-height: 350px; align-content: start; }
.match-grid-scroll::-webkit-scrollbar { width: 6px; }
.match-grid-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
.match-overlay-fixed { position: absolute; inset: 0; background: rgba(255,255,255,0.95); z-index: 10; display: none; flex-direction: column; justify-content: center; align-items: center; border-radius: 12px; }
body.dark-mode .match-overlay-fixed { background: rgba(31,41,55,0.95); }

/* ========== TYPE GAME ========== */
.type-game-container { text-align: center; padding: 20px 0; }
.type-word-display { font-size: 2.5em; font-weight: 800; margin-bottom: 20px; color: var(--text-main); }
.type-input { width: 100%; max-width: 300px; padding: 15px; font-size: 1.2em; border: 2px solid var(--border-color); border-radius: 8px; text-align: center; outline: none; background: var(--bg-body); color: var(--text-main); margin-bottom: 15px; transition: 0.2s; }
.type-input:focus { border-color: var(--text-main); }
.type-result { height: 24px; font-weight: bold; margin-bottom: 15px; }

/* ========== PROGRESS BAR & MEMORY STATS ========== */
.memory-stats-card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 25px; margin-bottom: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.02); }
.memory-stats-title { font-size: 1.1em; font-weight: 800; color: #475569; margin-bottom: 20px; }
.progress-bar-container { display: flex; height: 16px; width: 100%; border-radius: 99px; overflow: hidden; background: #f1f5f9; margin-bottom: 25px; }
.progress-segment { height: 100%; transition: width 0.5s ease; }
.bg-moi { background-color: #cbd5e1; }
.bg-dang-hoc { background-color: #f472b6; }
.bg-dang-on { background-color: #60a5fa; }
.bg-thanh-thao { background-color: #34d399; }

.stats-legend { display: flex; justify-content: space-between; flex-wrap: wrap; gap: 10px; }
.legend-item { display: flex; flex-direction: column; align-items: flex-start; }
.legend-dot-wrapper { display: flex; align-items: center; gap: 8px; font-weight: bold; font-size: 1.2em; color: #334155; }
.legend-dot { width: 12px; height: 12px; border-radius: 50%; }
.legend-label { font-size: 0.85em; color: #94a3b8; margin-top: 4px; font-weight: 500; }

/* ========== VOCAB LIST ========== */
.vocab-list-container { display: flex; flex-direction: column; gap: 12px; max-height: 400px; overflow-y: auto; padding-right: 5px; }
.vocab-list-container::-webkit-scrollbar { width: 6px; }
.vocab-list-container::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
.vocab-item { display: flex; justify-content: space-between; align-items: center; padding: 15px; border: 1px solid #e2e8f0; border-radius: 8px; background: #fff; transition: 0.2s; }
.vocab-item:hover { border-color: #cbd5e1; box-shadow: 0 4px 6px rgba(0,0,0,0.02); }
.vocab-info { display: flex; flex-direction: column; gap: 4px; }
.vocab-word-text { font-size: 1.1em; font-weight: bold; color: #0f172a; }
.vocab-mean-text { font-size: 0.95em; color: #64748b; }
.vocab-actions { display: flex; gap: 5px; }
.status-badge { font-size: 0.75em; padding: 4px 8px; border-radius: 4px; font-weight: bold; color: white; }

/* ========== 2-COLUMN VOCAB GRID ========== */
.vocab-grid-2col { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; max-height: 400px; overflow-y: auto; padding-right: 5px; }
@media (max-width: 600px) { .vocab-grid-2col { grid-template-columns: 1fr; } }
.vocab-grid-2col::-webkit-scrollbar { width: 4px; }
.vocab-grid-2col::-webkit-scrollbar-thumb { background: var(--border-color); border-radius: 4px; }
.v-card-flat { position: relative; border: 1px solid var(--border-color); border-radius: 10px; padding: 15px 15px 15px 25px; background: var(--bg-card); display: flex; flex-direction: column; gap: 4px; transition: 0.2s; }
.v-card-flat:hover { border-color: #94a3b8; }
.v-dot { position: absolute; top: 18px; left: 10px; width: 8px; height: 8px; border-radius: 50%; }
.v-dot.bg-moi { background-color: #cbd5e1; }
.v-dot.bg-hoc { background-color: #f472b6; }
.v-dot.bg-on { background-color: #60a5fa; }
.v-dot.bg-thanh { background-color: #34d399; }

/* ========== TABS & FORM CONTROLS ========== */
.tabs-2x2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 25px; }
.tab-btn-flat { background: var(--bg-body); color: var(--text-sub); border: 1px solid var(--border-color); padding: 15px; border-radius: 12px; font-weight: 600; font-size: 0.95em; cursor: pointer; transition: 0.2s; text-align: center; }
.tab-btn-flat:hover { border-color: var(--text-main); color: var(--text-main); }
.tab-btn-flat.active { background: var(--text-main); color: var(--bg-card); border-color: var(--text-main); }
.tab-content { display: none; }
.tab-content.active { display: block; }

.btn-flat-primary { background: #111827; color: #ffffff; border: none; padding: 12px 20px; border-radius: 8px; font-weight: 600; cursor: pointer; transition: 0.2s; width: 100%; font-size: 0.95em; }
.btn-flat-primary:hover { opacity: 0.8; }
.btn-flat-outline { background: transparent; color: #111827; border: 1px solid #e5e7eb; padding: 12px 20px; border-radius: 8px; font-weight: 600; cursor: pointer; transition: 0.2s; width: 100%; font-size: 0.95em; }
body.dark-mode .btn-flat-primary { background: #ffffff; color: #111827; }
body.dark-mode .btn-flat-outline { border-color: #374151; color: #f9fafb; }

.form-group { margin-bottom: 14px; }
.form-label { font-size: 0.85em; font-weight: 700; color: var(--text-sub); display: block; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.4px; }
.form-control { width: 100%; padding: 10px 12px; border: 1.5px solid var(--border-color); border-radius: 8px; background: var(--bg-body); color: var(--text-main); box-sizing: border-box; font-size: 1em; outline: none; transition: border-color 0.2s; }
.form-control:focus { border-color: var(--text-main); }

/* ========== LEADERBOARD ========== */
.lb-item { display: flex; justify-content: space-between; align-items: center; padding: 15px; border-bottom: 1px solid var(--border-color); }
.lb-item:last-child { border-bottom: none; }
.lb-rank { font-size: 1.2em; font-weight: bold; width: 40px; }
.lb-name { font-weight: 600; flex: 1; }
.lb-stats { font-size: 0.9em; color: var(--text-sub); text-align: right; }

/* ========== CHART SCROLL ========== */
.chart-scroll-container { width: 100%; overflow-x: auto; overflow-y: hidden; border: 1px solid var(--border-color); border-radius: 12px; padding: 15px; background: var(--bg-card); }
.chart-scroll-container::-webkit-scrollbar { height: 6px; }
.chart-scroll-container::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
.chart-inner { height: 300px; width: 100%; }

/* ========== ANIMATIONS ========== */
@keyframes shake { 0%, 100% { transform: translateX(0); } 25%, 75% { transform: translateX(-4px); } 50% { transform: translateX(4px); } }
@keyframes popIn { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }

===== END FILE: public/assets/css/games.css =====

===== FILE: public/assets/css/lesson-giaoan.css =====
:root{
    --paper:#FAF6EE; --paper-card:#FFFFFF; --ink:#1D2B45; --ink-soft:#4B5A78;
    --stamp:#D8482B; --stamp-dark:#A83A22; --jade:#2E7A5B; --gold:#C79A2E;
    --line:#E3DBC7; --line-strong:#CFC4A5;
  }
  *{box-sizing:border-box;}
  html{scroll-behavior:smooth;}
  body{
    margin:0; 
    background: linear-gradient(120deg, #e0c3fc 0%, #8ec5fc 100%);
    background-attachment: fixed;
    color:var(--ink); font-family:'Pretendard', 'Inter', 'Be Vietnam Pro', sans-serif;
    line-height:1.6; padding-bottom:6rem;
  }
  .kr{font-family:'Noto Serif KR','Be Vietnam Pro',serif;}
  .mono{font-family:'JetBrains Mono', monospace;}
  a{color:inherit;}

  /* ---------- Floating TOC (Taskbar) ---------- */
  .toc-fab {
    position:fixed; bottom:95px; right:24px; z-index:9000;
    width:52px; height:52px; border-radius:50%;
    background:var(--paper-card); color:var(--ink); border:1px solid var(--line-strong);
    display:flex; align-items:center; justify-content:center; font-size:22px; cursor:pointer;
    box-shadow:0 4px 15px rgba(0,0,0,0.1); transition:transform .2s, box-shadow .2s;
  }
  .toc-fab:hover { transform:scale(1.05); box-shadow:0 6px 20px rgba(0,0,0,0.15); }
  
  .toc-drawer {
    position:fixed; top:0; right:-280px; width:280px; height:100vh;
    background:rgba(250,246,238,0.95); backdrop-filter:blur(10px);
    border-left:1px solid var(--line-strong); box-shadow:-5px 0 25px rgba(0,0,0,0.05);
    z-index:9999; padding:20px; transition:all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
    display:flex; flex-direction:column; overflow-y:auto;
  }
  body.toc-open .toc-drawer { right:0; }
  
  @media (min-width: 768px) {
    body { transition:margin 0.35s cubic-bezier(0.4, 0, 0.2, 1); }
    body.toc-open { margin-left:-120px; margin-right:120px; }
  }

  .toc-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem; padding-bottom:0.75rem; border-bottom:1px solid var(--line); }
  .toc-title { font-family:'JetBrains Mono', monospace; font-size:13px; font-weight:700; color:var(--ink); letter-spacing:0.05em; }
  .toc-close { background:transparent; border:none; font-size:20px; color:var(--ink-soft); cursor:pointer; line-height:1; }
  .toc-close:hover { color:var(--stamp); }

  .nav-pill{display:flex; align-items:center; gap:10px; font-size:14px; font-weight:600; padding:10px 14px; border-radius:12px; border:1px solid transparent; background:transparent; color:var(--ink-soft); cursor:pointer; transition:all .2s ease; text-align:left; width:100%; margin-bottom:6px;}
  .nav-pill:hover{background:var(--line); color:var(--ink);}
  .nav-pill .dot{width:8px; height:8px; border-radius:50%; background:var(--line-strong); transition:all .2s ease; flex-shrink:0;}
  .nav-pill.active{background:var(--ink); color:var(--paper); border-color:var(--ink);}
  .nav-pill.active .dot{background:var(--stamp);}
  .nav-pill.done .dot{background:var(--jade);}

  /* ---------- Floating admin pencil FAB ---------- */
  #adminFab{
    display:none; position:fixed; bottom:28px; right:24px; z-index:9999;
    width:52px; height:52px; border-radius:50%;
    background:linear-gradient(135deg,#1D2B45,#D8482B);
    color:#fff; border:none; cursor:pointer;
    align-items:center; justify-content:center; font-size:22px;
    box-shadow:0 4px 20px rgba(0,0,0,.28);
    transition:transform .2s, box-shadow .2s;
  }
  #adminFab.visible{display:flex;}
  #adminFab:hover{transform:scale(1.1); box-shadow:0 6px 28px rgba(0,0,0,.38);}
  #adminFab.admin-active{background:linear-gradient(135deg,#2E7A5B,#1D2B45); box-shadow:0 4px 20px rgba(46,122,91,.5);}
  #adminFab .fab-tooltip{
    display:none; position:absolute; right:60px; bottom:50%; transform:translateY(50%);
    background:rgba(29,43,69,.92); color:#fff; border-radius:8px;
    padding:6px 12px; font-size:12px; white-space:nowrap; font-family:'Be Vietnam Pro',sans-serif;
  }
  #adminFab:hover .fab-tooltip{display:block;}
  body.admin-on #adminFab{background:linear-gradient(135deg,#2E7A5B,#142657);}

  /* ---------- Hero ---------- */
  .hero{max-width:950px; margin:0 auto; padding:2.5rem 1.25rem 1.5rem;}
  .passport{background:var(--paper-card); border:1px solid var(--line); border-radius:18px; padding:2rem; position:relative; overflow:hidden;}
  .passport::before{content:""; position:absolute; inset:8px; border:1px dashed var(--line-strong); border-radius:12px; pointer-events:none;}
  .eyebrow{display:flex; align-items:center; gap:8px; font-family:'JetBrains Mono', monospace; font-size:11.5px; letter-spacing:0.12em; text-transform:uppercase; color:var(--stamp); margin-bottom:0.75rem;}
  .eyebrow::before{content:"●"; font-size:8px;}
  .hero h1{margin:0 0 0.35rem; font-size:clamp(2.2rem, 6vw, 3.2rem); font-weight:700;}
  .hero h1 .kr-big{font-family:'Noto Serif KR',serif; color:var(--ink);}
  .hero .sub{font-size:1.05rem; color:var(--ink-soft); margin:0 0 1.5rem; max-width:40ch;}
  .obj-grid{display:grid; grid-template-columns:repeat(auto-fit,minmax(200px,1fr)); gap:0.9rem; border-top:1px solid var(--line); padding-top:1.25rem;}
  .obj-item .obj-label{font-family:'JetBrains Mono',monospace; font-size:10.5px; letter-spacing:0.08em; text-transform:uppercase; color:var(--gold); margin-bottom:3px;}
  .obj-item .obj-val{font-size:14.5px; font-weight:500;}
  .hero-photo-row{display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-top:1.25rem; padding-top:1.25rem; border-top:1px solid var(--line);}
  @media(max-width:520px){.hero-photo-row{grid-template-columns:1fr;}}
  .stamp-row{display:flex; gap:8px; flex-wrap:wrap; margin-top:1.5rem; padding-top:1.25rem; border-top:1px solid var(--line);}
  .stamp-slot{width:52px; height:52px; border-radius:50%; border:2px dashed var(--line-strong); display:flex; align-items:center; justify-content:center; font-family:'JetBrains Mono',monospace; font-size:8px; text-align:center; color:var(--line-strong); position:relative; transition:transform .3s ease;}
  .stamp-slot span{padding:0 3px; line-height:1.1;}
  .stamp-slot.stamped{border:2px solid var(--stamp); color:var(--stamp); transform:rotate(-8deg); animation:stampIn .35s ease;}
  .stamp-slot.stamped::after{content:""; position:absolute; inset:-2px; border-radius:50%; border:1px solid var(--stamp); opacity:0.5;}
  @keyframes stampIn{0%{transform:scale(1.6) rotate(-8deg); opacity:0;} 60%{transform:scale(0.92) rotate(-8deg); opacity:1;} 100%{transform:scale(1) rotate(-8deg); opacity:1;}}

  /* ---------- Section shell ---------- */
  section{max-width:950px; margin:0 auto; padding:3rem 1.25rem 0.5rem; scroll-margin-top:70px;}
  .sec-head{display:flex; align-items:baseline; gap:12px; margin-bottom:1.5rem;}
  .sec-num{font-family:'JetBrains Mono',monospace; font-size:13px; color:var(--stamp); font-weight:600;}
  .sec-head h2{margin:0; font-size:1.6rem; font-weight:700;}
  .sec-head h2 .kr-tag{font-family:'Noto Serif KR',serif; color:var(--ink-soft); font-size:1.1rem; margin-left:8px;}
  .sec-desc{color:var(--ink-soft); font-size:0.95rem; margin:-0.75rem 0 1.5rem; max-width:64ch;}
  .card{background:var(--paper-card); border:1px solid var(--line); border-radius:14px; padding:1.5rem; margin-bottom:1rem;}
  .sub-heading{font-weight:700; font-size:1rem; margin:0 0 0.9rem;}
  .sub-heading .tag{font-weight:400; font-size:0.78rem; color:var(--ink-soft); margin-left:6px;}
  .block-hint{font-size:0.85rem; color:var(--ink-soft); margin:-0.4rem 0 0.9rem;}

  /* ---------- Image slot ---------- */
  .img-slot{position:relative; border-radius:12px; border:1px dashed var(--line-strong); background:var(--paper); display:flex; align-items:center; justify-content:center; overflow:hidden; min-height:120px; font-size:12.5px; color:var(--ink-soft); text-align:center;}
  .img-slot img{width:100%; height:100%; object-fit:cover; display:block;}
  .img-slot .placeholder-text{padding:0 1rem; line-height:1.5;}
  .img-slot .pencil-btn{display:none; position:absolute; top:8px; right:8px; width:28px; height:28px; border-radius:50%; background:var(--ink); color:var(--paper); border:none; align-items:center; justify-content:center; font-size:13px; cursor:pointer; z-index:2;}
  body.admin-on .img-slot .pencil-btn{display:flex;}
  .img-slot .url-form{display:none; position:absolute; inset:auto 8px 8px 8px; background:var(--paper-card); border:1px solid var(--line-strong); border-radius:8px; padding:6px; gap:6px; z-index:2;}
  .img-slot .url-form.open{display:flex;}
  .img-slot .url-form input{flex:1; min-width:0; border:1px solid var(--line); border-radius:6px; padding:6px 8px; font-size:12px; font-family:'Be Vietnam Pro',sans-serif;}
  .img-slot .url-form button{border:none; background:var(--jade); color:#fff; border-radius:6px; padding:0 10px; font-size:12px; cursor:pointer; flex-shrink:0;}
  .img-slot.compact{min-height:64px; font-size:11px; border-radius:9px;}
  .img-slot.compact .placeholder-text{padding:0 0.6rem;}
  .img-slot.compact .pencil-btn{width:22px; height:22px; font-size:11px; top:5px; right:5px;}
  .img-slot.compact .url-form{inset:auto 5px 5px 5px; padding:5px;}
  .img-slot.compact .url-form input{font-size:10.5px; padding:5px 6px;}
  .img-slot.compact .url-form button{font-size:10.5px; padding:0 7px;}
  .img-grid{display:grid; grid-template-columns:repeat(auto-fill,minmax(120px,1fr)); gap:10px;}
  .img-grid.cols-2{grid-template-columns:repeat(2, 1fr);}
  .img-grid-cap{font-size:12px; text-align:center; margin-top:6px; color:var(--ink-soft); line-height:1.35; font-weight:600;}
  .img-cap-cell{display:flex; flex-direction:column;}
  .sample-box{display:flex; align-items:center; gap:12px; background:var(--paper); border:1px solid var(--line); border-radius:10px; padding:10px 12px; margin-bottom:12px; flex-wrap:wrap;}
  .sample-box .img-slot{width:88px; height:88px; flex-shrink:0; min-height:0;}
  .sample-box .sample-text{flex:1; min-width:160px; font-size:0.9rem;}
  .sample-box .sample-label{font-family:'JetBrains Mono',monospace; font-size:10.5px; letter-spacing:0.06em; text-transform:uppercase; color:var(--gold); margin-bottom:3px;}
  /* Flip card real image */
  .flip-img{width:76px; height:76px; object-fit:cover; border-radius:12px; display:block; margin:0 auto 2px;}

  /* ---------- Audio slot ---------- */
  .audio-slot{border:1px dashed var(--line-strong); border-radius:10px; padding:10px 12px; background:var(--paper); margin:0 0 12px;}
  .audio-slot-head{display:flex; align-items:center; gap:8px; font-size:12.5px; color:var(--ink-soft);}
  .audio-icon{font-size:15px; flex-shrink:0;}
  .audio-label{flex:1;}
  .audio-pencil{display:none; width:24px; height:24px; border-radius:50%; background:var(--ink); color:var(--paper); border:none; font-size:11px; cursor:pointer; align-items:center; justify-content:center; flex-shrink:0;}
  body.admin-on .audio-pencil{display:inline-flex;}
  .audio-form{display:none; margin-top:8px;}
  .audio-form.open{display:flex;}
  .audio-form input{flex:1; width:100%; border:1px solid var(--line); border-radius:6px; padding:6px 8px; font-size:12px;}
  .audio-player-wrap audio{width:100%; margin-top:8px; height:34px;}

  /* ---------- Vocab flip cards (reused) ---------- */
  .flip-grid{display:grid; grid-template-columns:repeat(2, 1fr); gap:14px;}
  @media(min-width:700px){ .flip-grid{grid-template-columns:repeat(4, 1fr);} }
  .flip-card{position:relative; width:100%; padding-top:100%; perspective:800px; cursor:pointer;}
  .flip-inner{position:absolute; inset:0; width:100%; height:100%; transform-style:preserve-3d; transition:transform .5s cubic-bezier(.4,.2,.2,1);}
  .flip-card.flipped .flip-inner{transform:rotateY(180deg);}
  .flip-face{position:absolute; inset:0; width:100%; height:100%; backface-visibility:hidden; border-radius:12px; border:1px solid var(--line); display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; padding:10px; gap:6px; box-sizing:border-box;}
  .flip-front{background:var(--paper-card); position:absolute;}
  .flip-front .emo{font-size:2.6rem; line-height:1;}
  .flip-front .kr{font-size:1.15rem; font-weight:700;}
  .flip-back{background:var(--ink); color:var(--paper); transform:rotateY(180deg);}
  .flip-back .vi{font-size:1.05rem; font-weight:600; line-height:1.35;}
  .flip-back .kr-small{font-family:'Noto Serif KR',serif; font-size:0.95rem; color:var(--gold); margin-top:6px;}
  .flip-card.seen .flip-front{border-color:var(--jade);}
  .flip-front .pencil-btn{display:none; position:absolute; width:22px; height:22px; border-radius:50%; background:var(--ink); color:var(--paper); border:none; font-size:11px; top:4px; right:4px; align-items:center; justify-content:center; cursor:pointer; z-index:2;}
  body.admin-on .flip-front .pencil-btn{display:flex;}
  .flip-front .url-form{display:none; position:absolute; inset:auto 4px 4px 4px; padding:4px; background:var(--paper-card); border:1px solid var(--line-strong); border-radius:8px; z-index:2;}
  .flip-front .url-form.open{display:flex;}
  .flip-front .url-form input{width:100%; font-size:10.5px; padding:5px 6px;}
  .helper-row{display:flex; align-items:center; justify-content:space-between; margin:0.6rem 0 1.5rem; font-size:12.5px; color:var(--ink-soft);}
  .progress-bar{flex:1; height:5px; background:var(--line); border-radius:3px; margin:0 10px; overflow:hidden;}
  .progress-fill{height:100%; background:var(--jade); width:0%; transition:width .3s ease;}
  .greet-grid{display:grid; grid-template-columns:1fr 1fr; gap:10px;}
  @media(max-width:520px){.greet-grid{grid-template-columns:1fr;}}
  .greet-card{background:var(--paper-card); border:1px solid var(--line); border-radius:10px; padding:12px 14px; cursor:pointer; transition:border-color .15s ease;}
  .greet-card .kr{font-size:1rem; font-weight:700;}
  .greet-card .vi{font-size:12.5px; color:var(--ink-soft); margin-top:2px; display:none;}
  .greet-card.revealed .vi{display:block;}
  .greet-card:hover{border-color:var(--stamp);}
  .speak-btn{border:none; background:transparent; cursor:pointer; color:var(--ink-soft); font-size:14px; padding:2px 4px;}
  .speak-btn:hover{color:var(--stamp);}

  /* ---------- Grammar (reused) ---------- */
  .gram-card{border:1px solid var(--line); border-radius:14px; background:var(--paper-card); margin-bottom:14px; overflow:hidden;}
  .gram-head{display:flex; align-items:center; justify-content:space-between; padding:1rem 1.25rem; cursor:pointer;}
  .gram-head .g-title{font-size:1.15rem; font-weight:700;}
  .gram-head .g-title .kr{font-family:'Noto Serif KR',serif; color:var(--stamp);}
  .gram-head .g-mean{font-size:0.85rem; color:var(--ink-soft); font-weight:400;}
  .gram-chevron{transition:transform .2s ease; color:var(--ink-soft); font-size:14px;}
  .gram-card.open .gram-chevron{transform:rotate(180deg);}
  .gram-body{max-height:0; overflow:hidden; transition:max-height .3s ease; padding:0 1.25rem;}
  .gram-card.open .gram-body{max-height:1400px; padding:0 1.25rem 1.25rem;}
  .gram-note{font-size:0.9rem; color:var(--ink-soft); margin:0 0 0.9rem;}
  .ex-row{display:flex; justify-content:space-between; gap:10px; padding:8px 0; border-top:1px solid var(--line); font-size:0.92rem;}
  .ex-row:first-of-type{border-top:none;}
  .ex-row .kr{font-weight:600;}
  .ex-row .vi{color:var(--ink-soft); text-align:right;}
  .mini-quiz{border-top:1px dashed var(--line-strong); margin-top:1rem; padding-top:1rem;}
  .mq-item{margin-bottom:0.9rem; font-size:0.92rem;}
  .mq-sentence{margin-bottom:6px;}
  .mq-choices{display:flex; gap:8px;}
  .choice-btn{font-family:'JetBrains Mono',monospace; font-size:13px; border:1px solid var(--line-strong); background:transparent; color:var(--ink); padding:6px 12px; border-radius:8px; cursor:pointer;}
  .choice-btn.correct{background:var(--jade); border-color:var(--jade); color:#fff;}
  .choice-btn.wrong{background:#F3D9D2; border-color:var(--stamp); color:var(--stamp-dark);}
  .choice-btn:disabled{cursor:default;}

  /* ---------- Speaking / matching (reused) ---------- */
  .ex-block{margin-bottom:2rem;}
  .ex-block:last-child{margin-bottom:0;}
  .ex-block-title{font-weight:700; font-size:1rem; margin-bottom:0.35rem;}
  .match-wrap{display:grid; grid-template-columns:1fr 1fr; gap:10px 20px;}
  @media(max-width:560px){.match-wrap{grid-template-columns:1fr;}}
  .match-item{border:1px solid var(--line-strong); border-radius:9px; padding:10px 12px; font-size:0.9rem; cursor:pointer; background:var(--paper-card); transition:all .15s ease; margin-bottom:8px;}
  .match-item .img-slot{max-width:90px; margin:0 auto 6px;}
  .match-item.kr{font-weight:600;}
  .match-item.selected{border-color:var(--gold); background:#FCF4E0;}
  .match-item.paired-correct{border-color:var(--jade); background:#E4F2EA; color:var(--jade); cursor:default;}
  .match-item.paired-wrong{border-color:var(--stamp); background:#F8E2DC;}
  .flag-drill{display:flex; flex-wrap:wrap; gap:8px; margin-bottom:0.9rem;}
  .flag-btn{font-size:0.88rem; padding:7px 13px; border-radius:999px; border:1px solid var(--line-strong); background:var(--paper-card); cursor:pointer;}
  .flag-btn.active{background:var(--ink); color:var(--paper); border-color:var(--ink);}
  .flag-output{min-height:52px; border-radius:10px; background:var(--paper); border:1px dashed var(--line-strong); padding:12px 14px; font-size:0.95rem;}
  .flag-output .kr{font-weight:700; font-size:1.05rem;}
  .flag-output .vi{color:var(--ink-soft); font-size:0.85rem; margin-top:3px;}
  .flag-output.placeholder{color:var(--ink-soft); font-size:0.85rem; display:flex; align-items:center;}
  .sub-grid{display:grid; grid-template-columns:repeat(auto-fit,minmax(190px,1fr)); gap:10px;}
  .sub-card{border:1px solid var(--line-strong); border-radius:10px; padding:12px; background:var(--paper-card); cursor:pointer; min-height:64px;}
  .sub-card .prompt{font-weight:600; font-size:0.92rem;}
  .sub-card .reveal{display:none; margin-top:8px; padding-top:8px; border-top:1px solid var(--line); font-size:0.85rem; line-height:1.55;}
  .sub-card.open .reveal{display:block;}
  .sub-card .reveal b{color:var(--stamp-dark);}

  /* ---------- Fill-check exercises ---------- */
  .fill-row{margin-bottom:14px;}
  .fill-prompt{font-size:0.92rem; margin-bottom:6px;}
  .fill-input-wrap{display:flex; gap:8px; flex-wrap:wrap;}
  .fill-input{flex:1; min-width:160px; border:1px solid var(--line-strong); border-radius:8px; padding:8px 10px; font-family:'Noto Serif KR',serif; font-size:0.95rem;}
  .fill-input.correct{border-color:var(--jade); background:#E4F2EA;}
  .fill-input.incorrect{border-color:var(--stamp); background:#F8E2DC;}
  .fill-check-btn{border:1px solid var(--line-strong); background:var(--paper-card); border-radius:8px; padding:0 14px; font-size:12.5px; cursor:pointer; flex-shrink:0;}
  .fill-feedback{font-size:12.5px; margin-top:5px; color:var(--ink-soft);}
  .fill-feedback.ok{color:var(--jade); font-weight:600;}
  .fill-feedback.no{color:var(--stamp-dark);}
  .fill-with-img{display:flex; align-items:center; gap:10px; margin-bottom:12px;}
  .fill-with-img .img-slot{width:64px; height:64px; flex-shrink:0; min-height:0;}
  .fill-with-img .fill-body{flex:1;}
  .fill-with-img .fill-cap{font-size:12px; color:var(--ink-soft); margin-bottom:3px;}

  /* ---------- O/X + Yes/No ---------- */
  .ox-row{display:flex; align-items:center; justify-content:space-between; gap:10px; padding:9px 0; border-top:1px solid var(--line); font-size:0.9rem; flex-wrap:wrap;}
  .ox-row:first-child{border-top:none;}
  .ox-btns{display:flex; gap:6px; flex-shrink:0; align-items:center;}
  .ox-btn{min-width:34px; height:34px; padding:0 8px; border-radius:8px; border:1px solid var(--line-strong); background:var(--paper-card); font-weight:700; cursor:pointer;}
  .ox-btn.correct{background:var(--jade); border-color:var(--jade); color:#fff;}
  .ox-btn.wrong{background:#F3D9D2; border-color:var(--stamp); color:var(--stamp-dark);}
  .ox-btn.picked-neutral{background:#FCF4E0; border-color:var(--gold);}

  /* ---------- Answer-editing pencil (admin) ---------- */
  .answer-pencil{display:none; width:22px; height:22px; border-radius:50%; background:var(--gold); color:#fff; border:none; font-size:11px; cursor:pointer; align-items:center; justify-content:center; flex-shrink:0; line-height:1;}
  body.admin-on .answer-pencil{display:inline-flex;}
  .answer-pencil.unset{background:var(--ink-soft);}
  .fill-prompt .answer-pencil{margin-left:6px; vertical-align:middle;}
  .answer-editor{width:100%; margin-top:8px; padding:8px; background:#FCF4E0; border:1px dashed var(--gold); border-radius:8px; display:flex; align-items:center; gap:6px; flex-wrap:wrap;}
  .answer-editor-label{font-size:11px; color:#6B5416; flex-shrink:0;}
  .answer-editor-opt{font-family:'JetBrains Mono',monospace; font-size:12px; border:1px solid var(--line-strong); background:#fff; padding:4px 10px; border-radius:6px; cursor:pointer;}
  .answer-editor-opt.active{background:var(--gold); border-color:var(--gold); color:#fff;}
  .answer-editor-input{flex:1; min-width:120px; border:1px solid var(--line-strong); border-radius:6px; padding:6px 8px; font-size:12px; font-family:'Noto Serif KR',serif;}
  .answer-editor-select{flex:1; min-width:140px; border:1px solid var(--line-strong); border-radius:6px; padding:5px 6px; font-size:12px; font-family:'Be Vietnam Pro',sans-serif;}

  /* ---------- Open prompts ---------- */
  .open-textarea{width:100%; border:1px solid var(--line-strong); border-radius:10px; padding:10px 12px; font-family:'Be Vietnam Pro',sans-serif; font-size:0.9rem; resize:vertical;}
  .lined-textarea{background-image:repeating-linear-gradient(var(--paper-card) 0 31px, var(--line) 31px 32px); line-height:32px; padding-top:8px;}
  .hint-btn{margin-top:6px; font-size:12px; border:1px solid var(--line-strong); background:transparent; border-radius:999px; padding:5px 12px; cursor:pointer; color:var(--ink-soft);}
  .hint-box{display:none; margin-top:8px; padding:10px 12px; background:var(--paper); border:1px dashed var(--line-strong); border-radius:8px; font-size:0.85rem; color:var(--ink-soft);}
  .hint-box.open{display:block;}

  /* ---------- Reference table ---------- */
  .ref-table{width:100%; border-collapse:collapse; font-size:0.88rem; margin:0.75rem 0;}
  .ref-table th,.ref-table td{border:1px solid var(--line); padding:8px 10px; text-align:left;}
  .ref-table th{background:var(--paper); font-family:'JetBrains Mono',monospace; font-size:11px; text-transform:uppercase; letter-spacing:0.04em; color:var(--ink-soft);}
  .ref-table input{width:100%; border:none; background:transparent; font-family:'Be Vietnam Pro',sans-serif; font-size:0.88rem; padding:2px;}
  .ref-table input:focus{outline:1px solid var(--gold); border-radius:4px;}

  /* ---------- Pronunciation ---------- */
  .rule-box{background:var(--paper); border:1px dashed var(--line-strong); border-radius:10px; padding:12px 14px; font-size:0.85rem; color:var(--ink-soft); margin-top:10px;}
  .rule-box b{color:var(--ink);}
  .hl{color:var(--stamp); font-weight:700;}
  .refer-box{background:#FCF4E0; border:1px dashed var(--gold); border-radius:10px; padding:10px 12px; font-size:0.85rem; color:#6B5416; margin-top:10px;}
  .refer-box b{color:var(--stamp-dark);}
  .pron-line{display:flex; align-items:center; gap:10px; padding:6px 0; border-top:1px solid var(--line); font-size:0.95rem;}
  .pron-line:first-child{border-top:none;}

  /* ---------- Culture ---------- */
  .culture-title{font-family:'Noto Serif KR',serif; font-size:1.4rem; text-align:center; margin:0 0 2px;}
  .culture-sub{text-align:center; color:var(--ink-soft); font-size:0.85rem; margin:0 0 1.25rem;}
  .culture-photos{display:grid; grid-template-columns:repeat(3,1fr); gap:10px; margin-bottom:1.25rem;}
  @media(max-width:600px){.culture-photos{grid-template-columns:1fr;}}
  .culture-p{font-size:0.92rem; color:var(--ink-soft); margin:0 0 0.9rem;}

  /* ---------- Quiz ---------- */
  .quiz-item{margin-bottom:1.4rem;}
  .quiz-q{font-weight:600; margin-bottom:0.6rem; font-size:0.95rem;}
  .quiz-opts{display:flex; flex-direction:column; gap:6px;}
  .quiz-opt{text-align:left; border:1px solid var(--line-strong); border-radius:9px; padding:9px 13px; background:var(--paper-card); cursor:pointer; font-size:0.9rem;}
  .quiz-opt.picked{border-color:var(--gold); background:#FCF4E0;}
  .quiz-opt.correct{border-color:var(--jade); background:#E4F2EA; color:var(--jade); font-weight:600;}
  .quiz-opt.incorrect{border-color:var(--stamp); background:#F8E2DC; color:var(--stamp-dark);}
  .quiz-submit{margin-top:0.5rem; font-family:'JetBrains Mono',monospace; font-weight:600; font-size:13.5px; background:var(--ink); color:var(--paper); border:none; border-radius:9px; padding:11px 22px; cursor:pointer;}
  .quiz-submit:disabled{opacity:0.4; cursor:default;}
  .quiz-result{margin-top:1.25rem; padding:1.1rem 1.25rem; border-radius:12px; background:var(--paper); border:1px dashed var(--line-strong); display:none;}
  .quiz-result.show{display:block;}
  .quiz-result .score{font-size:1.4rem; font-weight:700; font-family:'JetBrains Mono',monospace;}

  /* ---------- Từ mới ---------- */
  .word-grid{display:grid; grid-template-columns:repeat(auto-fill,minmax(150px,1fr)); gap:8px;}
  .word-card{border:1px solid var(--line); border-radius:9px; padding:9px 11px; background:var(--paper-card);}
  .word-card .kr{font-size:0.95rem; font-weight:700;}
  .word-card .vi{font-size:0.8rem; color:var(--ink-soft); margin-top:2px;}

  footer{max-width:1040px; margin:3rem auto 0; padding:0 1.25rem; color:var(--ink-soft); font-size:0.8rem; text-align:center;}
  ::selection{background:var(--gold); color:var(--ink);}

===== END FILE: public/assets/css/lesson-giaoan.css =====

===== FILE: public/assets/css/video.css =====
/* ========== VIDEO LEARNING PAGE v6 — 2-Column Flex ========== */

/* ── Wrapper ── */
.video-wrapper {
    max-width:1100px; margin:0 auto;
    background:rgba(255,255,255,.45); backdrop-filter:blur(16px); -webkit-backdrop-filter:blur(16px);
    border:1px solid rgba(255,255,255,.55); border-radius:24px; padding:16px 20px;
    box-shadow:0 20px 50px rgba(0,0,0,.06); width:100%; box-sizing:border-box;
}
body.dark-mode .video-wrapper { background:rgba(15,23,42,.7); border-color:rgba(255,255,255,.08); }

/* ── Shell ── */
.video-sticky-shell {
    width:100%; box-sizing:border-box;
    padding:0 24px; max-width:1148px; margin:0 auto; margin-top:20px; margin-bottom: 40px;
}
.video-sticky-shell .video-wrapper {
    padding:16px 20px; border-radius:24px; box-sizing:border-box;
    display:flex; flex-direction:column;
}

/* ── Title ── */
.video-title-bar {
    display:flex; align-items:center; gap:8px; padding:6px 12px;
    background:rgba(255,255,255,.35); border-radius:10px; margin-bottom:10px; flex-wrap:wrap;
}
body.dark-mode .video-title-bar { background:rgba(30,41,59,.35); }
.video-title-badge { display:flex; align-items:center; justify-content:center; min-width:30px; height:30px; background:#4f46e5; color:#fff; border-radius:7px; font-size:.9em; font-weight:800; flex-shrink:0; }
.video-title-heading { font-size:1em; font-weight:800; color:#1e293b; margin:0; flex:1; min-width:0; letter-spacing:-.2px; }
body.dark-mode .video-title-heading { color:#f1f5f9; }
.video-title-meta { font-size:.72em; color:#94a3b8; font-weight:600; flex-shrink:0; }

/* ════════════════ GRID LAYOUT ════════════════ */
.video-grid {
    display:grid;
    grid-template-columns:2.1fr 1fr;
    grid-template-rows:auto auto 180px auto;
    gap:6px;
    flex:1; min-height:0;
}
body.vmode-listen-mode .video-grid {
    grid-template-rows:auto auto auto auto;
}
.video-grid-video      { grid-row:1; grid-column:1; }
.video-grid-controls   { grid-row:2; grid-column:1; margin-top:-2px; }
.video-grid-sublist    { grid-row:1 / 3; grid-column:2; min-height:0; position:relative; }
.video-grid-cursub     { grid-row:3; grid-column:1; min-height:0; display:flex; flex-direction:column; }
.video-grid-mode       { grid-row:4; grid-column:1; min-height:0; display:flex; flex-direction:column; }
.video-grid-modebtns   { grid-row:3; grid-column:2; }

.video-col-left {
    display:contents;
}
.video-col-right {
    display:contents;
}

/* ── Video Player ── */
.video-player-wrap {
    position:relative; width:100%;
    aspect-ratio:16/9; background:#0f172a;
    border-radius:12px; overflow:hidden; box-shadow:0 6px 20px rgba(0,0,0,.12);
    border:2px solid rgba(255,255,255,.08); cursor:pointer; flex-shrink:0;
}
.video-player-wrap.cc-covered::after, .video-player-wrap.dict-mode-active::after { content:""; position:absolute; bottom:0; left:0; width:100%; height:18%; background:#000; z-index:10; pointer-events:none; }
#youtube-player,#youtube-player iframe { width:100%; height:100%; border:none; pointer-events:none; }

/* ── Controls Bar ── */
.video-controls-bar {
    display:flex; align-items:center; gap:4px; padding:4px 8px;
    background:rgba(255,255,255,.7); border:1px solid rgba(255,255,255,.5);
    border-radius:10px; flex-wrap:wrap; flex-shrink:0;
}
body.dark-mode .video-controls-bar { background:rgba(30,41,59,.65); border-color:rgba(255,255,255,.05); }

.video-ctrl-btn {
    background:rgba(255,255,255,.7); border:1px solid rgba(0,0,0,.05); color:#475569;
    cursor:pointer; display:flex; align-items:center; justify-content:center;
    padding:5px; border-radius:7px; transition:all .18s; flex-shrink:0; backdrop-filter:blur(4px);
}
.video-ctrl-btn:hover { background:#fff; color:#4f46e5; border-color:rgba(79,70,229,.2); }
.video-ctrl-btn:active { transform:scale(.95); }
body.dark-mode .video-ctrl-btn { background:rgba(255,255,255,.04); border-color:rgba(255,255,255,.05); color:#94a3b8; }
body.dark-mode .video-ctrl-btn:hover { background:rgba(255,255,255,.08); color:#a5b4fc; }

#vb-play-pause { background:#4f46e5; color:#fff; border:none; width:30px; height:30px; padding:0; box-shadow:0 3px 10px rgba(79,70,229,.25); }
#vb-play-pause:hover { background:#4338ca; color:#fff; }
body.dark-mode #vb-play-pause { background:#6366f1; }

.video-time-display { font-size:.7em; color:#64748b; font-weight:600; min-width:34px; text-align:center; user-select:none; font-variant-numeric:tabular-nums; }
body.dark-mode .video-time-display { color:#94a3b8; }

/* Progress */
.video-progress-wrap { flex:1; position:relative; min-width:36px; height:16px; display:flex; align-items:center; }
.video-progress { width:100%; -webkit-appearance:none; appearance:none; height:3px; background:rgba(0,0,0,.07); border-radius:2px; outline:none; cursor:pointer; z-index:1; }
.video-progress:hover { height:5px; }
body.dark-mode .video-progress { background:rgba(255,255,255,.06); }
.video-progress::-webkit-slider-thumb { -webkit-appearance:none; appearance:none; width:11px; height:11px; border-radius:50%; background:#4f46e5; cursor:pointer; box-shadow:0 2px 4px rgba(79,70,229,.25); border:2px solid #fff; }
body.dark-mode .video-progress::-webkit-slider-thumb { border-color:#1e293b; }

/* Note dots */
.progress-notes-layer { position:absolute; top:0; left:0; right:0; bottom:0; pointer-events:none; z-index:2; }
.timeline-note-dot { position:absolute; top:50%; transform:translate(-50%,-50%); width:6px; height:6px; background:#f59e0b; border:1.5px solid #fff; border-radius:50%; cursor:pointer; pointer-events:all; transition:transform .15s; box-shadow:0 0 0 2px rgba(245,158,11,.15); }
.timeline-note-dot:hover { transform:translate(-50%,-50%) scale(1.7); }
body.dark-mode .timeline-note-dot { border-color:#1e293b; }

.note-tooltip { position:fixed; z-index:9999; background:#1e293b; color:#f8fafc; padding:8px 12px; border-radius:8px; font-size:.74em; font-weight:600; pointer-events:none; max-width:220px; line-height:1.4; box-shadow:0 8px 24px rgba(0,0,0,.25); white-space:pre-wrap; word-break:break-word; }
.note-tooltip .note-tip-time { color:#f59e0b; font-size:.85em; margin-bottom:2px; }

/* Speed */
.video-speed-select { font-size:.65em; font-weight:700; padding:3px 2px; border:1px solid rgba(0,0,0,.07); border-radius:6px; background:rgba(255,255,255,.65); color:#475569; cursor:pointer; font-family:inherit; transition:all .18s; backdrop-filter:blur(4px); min-width:44px; }
.video-speed-select:hover { border-color:#4f46e5; }
body.dark-mode .video-speed-select { background:rgba(255,255,255,.04); color:#cbd5e1; border-color:rgba(255,255,255,.07); }

/* CC */
.cc-dropdown-wrap { position:relative; flex-shrink:0; }
.cc-toggle-btn { display:flex; align-items:center; justify-content:center; padding:3px 5px; border:1px solid rgba(0,0,0,.07); border-radius:6px; background:rgba(255,255,255,.65); color:#475569; cursor:pointer; font-size:.65em; font-weight:700; transition:all .18s; backdrop-filter:blur(4px); min-width:28px; }
.cc-toggle-btn:hover { border-color:#4f46e5; color:#4f46e5; }
.cc-toggle-btn.active { background:#eef2ff; color:#4f46e5; border-color:#4f46e5; }
body.dark-mode .cc-toggle-btn { background:rgba(255,255,255,.04); color:#cbd5e1; border-color:rgba(255,255,255,.07); }
body.dark-mode .cc-toggle-btn.active { background:rgba(99,102,241,.12); color:#a5b4fc; border-color:#818cf8; }
.cc-dropdown {
    display:none; position:absolute; top:100%; right:0; margin-top:4px;
    background:#fff; border:1px solid rgba(0,0,0,.08); border-radius:10px;
    padding:4px; min-width:105px; box-shadow:0 10px 30px rgba(0,0,0,.12);
    z-index:9999; flex-direction:column; gap:2px;
}
.cc-dropdown.open { display:flex; }
body.dark-mode .cc-dropdown { background:#1e293b; border-color:rgba(255,255,255,.08); }
.cc-option { padding:6px 10px; border:none; border-radius:7px; background:transparent; color:#475569; font-size:.78em; font-weight:600; cursor:pointer; text-align:left; font-family:inherit; transition:all .12s; }
.cc-option:hover { background:rgba(79,70,229,.06); color:#4f46e5; }
.cc-option.active { background:#eef2ff; color:#4f46e5; font-weight:700; }
body.dark-mode .cc-option { color:#cbd5e1; }
body.dark-mode .cc-option:hover { background:rgba(99,102,241,.1); color:#a5b4fc; }
body.dark-mode .cc-option.active { background:rgba(99,102,241,.15); color:#a5b4fc; }

/* ── Gear Settings Dropdown ── */
.gear-dropdown-wrap { position:relative; flex-shrink:0; }
.gear-toggle-btn {
    display:flex; align-items:center; justify-content:center; padding:3px 5px;
    border:1px solid rgba(0,0,0,.07); border-radius:6px;
    background:rgba(255,255,255,.65); color:#475569; cursor:pointer;
    font-size:.7em; transition:all .18s; backdrop-filter:blur(4px); min-width:28px;
}
.gear-toggle-btn:hover { border-color:#4f46e5; color:#4f46e5; }
body.dark-mode .gear-toggle-btn { background:rgba(255,255,255,.04); color:#cbd5e1; border-color:rgba(255,255,255,.07); }
.gear-dropdown {
    display:none; position:absolute; top:100%; right:0; margin-top:4px;
    background:#fff; border:1px solid rgba(0,0,0,.08); border-radius:10px;
    padding:8px; min-width:180px; box-shadow:0 10px 30px rgba(0,0,0,.12);
    z-index:9999; flex-direction:column; gap:6px;
}
.gear-dropdown.open { display:flex; }
body.dark-mode .gear-dropdown { background:#1e293b; border-color:rgba(255,255,255,.08); }
.gear-row {
    display:flex; align-items:center; justify-content:space-between; gap:8px;
    font-size:.72em; font-weight:600; color:#475569;
}
body.dark-mode .gear-row { color:#cbd5e1; }
.gear-row select {
    font-size:.85em; padding:3px 6px; border:1px solid rgba(0,0,0,.1); border-radius:5px;
    background:#f8fafc; color:#334155; font-family:inherit; cursor:pointer; max-width:110px;
}
body.dark-mode .gear-row select { background:#0f172a; color:#e2e8f0; border-color:rgba(255,255,255,.1); }

/* Gear toggle switch */
.gear-toggle { position:relative; display:inline-block; width:36px; height:20px; flex-shrink:0; }
.gear-toggle input { opacity:0; width:0; height:0; }
.gear-slider { position:absolute; inset:0; background:#cbd5e1; border-radius:10px; cursor:pointer; transition:background .2s; }
.gear-slider::before { content:''; position:absolute; width:16px; height:16px; left:2px; bottom:2px; background:#fff; border-radius:50%; transition:transform .2s; }
.gear-toggle input:checked+.gear-slider { background:#4f46e5; }
.gear-toggle input:checked+.gear-slider::before { transform:translateX(16px); }
body.dark-mode .gear-slider { background:#475569; }
body.dark-mode .gear-toggle input:checked+.gear-slider { background:#6366f1; }

/* ════════════════ BILINGUAL SUBTITLE + MODE CONTENT ════════════════ */
/* Current subtitle — always visible, CC-controlled */
.video-current-sub {
    background:rgba(255,255,255,.65); backdrop-filter:blur(12px); -webkit-backdrop-filter:blur(12px);
    border-radius:10px; padding:16px 16px 12px 16px; text-align:center;
    box-shadow:0 2px 10px rgba(0,0,0,.03);
    height: 180px; box-sizing: border-box; overflow: hidden;
    display:flex; flex-direction:column; justify-content:center; gap:8px;
    border:1px solid rgba(255,255,255,.5); transition:all .2s;
    flex-shrink:0; position:relative; flex:1;
    font-family:'Noto Sans KR','Pretendard',sans-serif;
}
.video-current-sub.cc-off { display:none; }
.video-current-sub.cc-kr .cur-sub-vi { display:none; }
.video-current-sub.cc-kr .cur-sub-next-vi { display:none; }
.video-current-sub.cc-vn .cur-sub-ko { display:none; }
.video-current-sub.cc-vn .cur-sub-next-ko { display:none; }
.video-current-sub.dict-mode-active .cur-sub-vi { display:none !important; }
.video-current-sub.dict-mode-active .cur-sub-next { display:none !important; }

.cur-sub-active { position:relative; z-index:2; transition:transform .3s ease, opacity .3s ease; }
.cur-sub-ko { font-size:1.3em; font-weight:900; color:var(--sub-color, #1e293b); margin-bottom:3px; line-height:var(--sub-spacing, 1.4); cursor:pointer; font-family:var(--sub-font, inherit); }
.cur-sub-ko:hover { color:#4f46e5; }
.cur-sub-vi { font-size:.9em; color:#64748b; font-weight:600; line-height:var(--sub-spacing, 1.4); }

.cur-sub-next { position:absolute; bottom:8px; left:0; right:0; z-index:1; opacity:.55; }
.cur-sub-next-ko { font-size:.9em; font-weight:700; color:#64748b; line-height:1.3; }
.cur-sub-next-vi { display:none; }

/* Slide animation — only on current subtitle, NOT next */
.cur-sub-slide .cur-sub-active { animation:slideUpIn .35s ease; }
@keyframes slideUpIn { from{opacity:0;transform:translateY(12px);} to{opacity:1;transform:translateY(0);} }

body.dark-mode .video-current-sub { background:rgba(30,41,59,.65); border-color:rgba(255,255,255,.06); }
body.dark-mode .cur-sub-ko { color:#f8fafc; }
body.dark-mode .cur-sub-vi { color:#94a3b8; }
body.dark-mode .cur-sub-next-ko { color:#64748b; }
body.dark-mode .cur-sub-next-vi { color:#475569; }

/* Enlarged subtitle in listen mode — fills available space */
.video-current-sub.sub-listen {
    flex:1.2; flex-shrink:1;
    padding:16px 36px 36px 36px; min-height:140px;
    justify-content:flex-start;
}
.video-current-sub.sub-listen .cur-sub-ko { font-size:var(--sub-listen-size, 2.4em); }
.video-current-sub.sub-listen .cur-sub-vi { font-size:1.1em; }
.video-current-sub.sub-listen .cur-sub-next-ko { font-size:1em; }
.video-current-sub.sub-listen .cur-sub-next { bottom:12px; }

/* Mode content area — only visible for speak/dictation/notes */
.video-mode-content { width:100%; }
.video-mode-content:empty-listening { display:none; }
.vmode-pane { display:none; }
.vmode-pane.active { display:block; animation:fadeIn .25s ease; }
@keyframes fadeIn { from{opacity:0;transform:translateY(4px);} to{opacity:1;transform:translateY(0);} }
/* In listen mode, hide mode-content to give subtitle more space */
.vmode-listen-mode .video-mode-content { flex:0; min-height:0; }
.vmode-listen-mode .video-current-sub { flex:1.2; }
.vmode-listen-mode .video-grid-mode { flex:1; min-height:0; }

/* ── Speak Mode Results ── */
.video-current-sub.speak-mode-active .cur-sub-next { display: none !important; }
.video-current-sub.speak-mode-active #speak-result-in-sub { display: block; }
.speak-result-in-sub {
    display: none;
    font-size: 1.15em;
    color: #64748b;
    margin-top: auto;
    text-align: center;
    line-height: 1.45;
    word-break: keep-all;
    min-height: 32px;
}
body.dark-mode .speak-result-in-sub { color: #94a3b8; }
.speak-mic-pulse {
    width:10px; height:10px; background:#8b5cf6; border-radius:50%;
    animation:pulse 1s infinite; display: inline-block;
}
@keyframes pulse { 0%{box-shadow:0 0 0 0 rgba(139,92,246,.4);} 70%{box-shadow:0 0 0 8px rgba(139,92,246,0);} 100%{box-shadow:0 0 0 0 rgba(139,92,246,0);} }

/* ── Dictation ── */
.dict-hint { font-size:.72em; font-weight:700; color:#94a3b8; margin-bottom:6px; text-transform:uppercase; }
.dict-target-vi { background:rgba(79,70,229,.04); border:1px solid rgba(79,70,229,.1); border-radius:10px; padding:10px 14px; font-size:.9em; font-weight:700; color:#4338ca; margin-bottom:10px; }
body.dark-mode .dict-target-vi { background:rgba(99,102,241,.1); border-color:rgba(99,102,241,.15); color:#a5b4fc; }
.dict-input { width:100%; box-sizing:border-box; font-size:.92em; font-weight:500; padding:10px 14px; border:2px solid rgba(0,0,0,.08); border-radius:10px; font-family:'Pretendard',sans-serif; color:#1e293b; background:#fff; transition:all .2s; resize:none; min-height:44px; }
.dict-input:focus { border-color:#4f46e5; outline:none; box-shadow:0 0 0 4px rgba(79,70,229,.08); }
body.dark-mode .dict-input { background:#0f172a; color:#f1f5f9; border-color:rgba(255,255,255,.08); }
.dict-input.correct { border-color:#22c55e!important; background:#f0fdf4!important; }
.dict-input.incorrect { border-color:#ef4444!important; background:#fef2f2!important; }
body.dark-mode .dict-input.correct { background:rgba(34,197,94,.1)!important; }
body.dark-mode .dict-input.incorrect { background:rgba(239,68,68,.1)!important; }
.dict-check-btn { padding:8px 18px; background:#4f46e5; color:#fff; border:none; border-radius:10px; font-size:.84em; font-weight:700; cursor:pointer; font-family:inherit; transition:all .2s; box-shadow:0 3px 10px rgba(79,70,229,.2); }
.dict-check-btn:hover { background:#4338ca; transform:translateY(-1px); }
.dict-result { margin-top:8px; font-size:.84em; line-height:1.5; }
.dict-result .correct-char { color:#16a34a; font-weight:700; }
.dict-result .incorrect-char { color:#dc2626; font-weight:700; text-decoration:underline wavy; }
.dict-result .missing-char { color:#f59e0b; font-weight:600; }
.dict-score { font-size:.92em; font-weight:800; color:#4f46e5; }
.diff-line { padding:6px 10px; border-radius:6px; margin-bottom:4px; font-family:'Pretendard',monospace; font-size:.82em; }
.diff-line.original { background:#f0fdf4; border:1px solid #bbf7d0; color:#166534; }
body.dark-mode .diff-line.original { background:rgba(34,197,94,.08); border-color:rgba(34,197,94,.15); color:#86efac; }
.diff-line.user-input { background:#fef2f2; border:1px solid #fecaca; color:#991b1b; }
body.dark-mode .diff-line.user-input { background:rgba(239,68,68,.08); border-color:rgba(239,68,68,.15); color:#fca5a5; }

/* ── Dictation New UI ── */
.dict-reveal-eye { position:absolute; top:50%; right:10px; transform:translateY(-50%); background:rgba(255,255,255,.8); border:1px solid rgba(0,0,0,.1); border-radius:8px; padding:4px 8px; font-size:1.1em; cursor:pointer; box-shadow:0 2px 5px rgba(0,0,0,.1); transition:all .2s; z-index:5; }
.dict-reveal-eye:hover { background:#fff; transform:translateY(-50%) scale(1.05); }
body.dark-mode .dict-reveal-eye { background:rgba(30,41,59,.9); border-color:rgba(255,255,255,.1); }
.dict-hidden-text { filter:blur(5px); user-select:none; transition:filter .3s; }
.dict-hidden-text.revealed { filter:none; user-select:text; }
.dict-blank-input { display:inline-block; margin:0 3px; font-family:inherit; border:none; background:transparent; outline:none; transition:all .2s; min-width:40px; text-align:center; cursor:text; border-bottom:2px solid transparent; }
.dict-blank-input:empty::before { content:"___"; color:#94a3b8; letter-spacing:1px; }
.dict-blank-input:focus { border-bottom:2px solid #4f46e5; background:rgba(79,70,229,.05); border-radius:4px; }
.dict-blank-input.correct { color:#10b981; pointer-events:none; font-weight:700; border-bottom:none; }
.dict-blank-input.incorrect { color:#ef4444; }
body.dark-mode .dict-blank-input:empty::before { color:#64748b; }
body.dark-mode .dict-blank-input:focus { background:rgba(99,102,241,.15); }

.dict-btn-big { display:flex; align-items:center; justify-content:center; gap:6px; padding:10px 20px; font-size:.9em; font-weight:800; border-radius:12px; cursor:pointer; font-family:inherit; transition:all .2s; border:none; box-shadow:0 4px 12px rgba(0,0,0,.08); }
.dict-btn-big:hover { transform:translateY(-2px); box-shadow:0 6px 16px rgba(0,0,0,.12); }
.dict-btn-big:active { transform:translateY(1px); }
.dict-btn-primary { background:linear-gradient(135deg, #4f46e5, #6366f1); color:#fff; }
.dict-btn-primary:hover { background:linear-gradient(135deg, #4338ca, #4f46e5); }
.dict-btn-secondary { background:#f8fafc; color:#475569; border:1px solid #e2e8f0; }
.dict-btn-secondary:hover { background:#fff; color:#4f46e5; border-color:#cbd5e1; }
body.dark-mode .dict-btn-secondary { background:rgba(30,41,59,.8); color:#cbd5e1; border-color:rgba(255,255,255,.1); }
body.dark-mode .dict-btn-secondary:hover { background:rgba(30,41,59,1); color:#fff; }
.dict-btn-big .icon { font-size:1.15em; }

/* ── Notes ── */
.notes-add-area { display:flex; gap:6px; margin-bottom:10px; }
.notes-input { flex:1; box-sizing:border-box; font-size:.82em; font-weight:500; padding:7px 10px; border:2px solid rgba(0,0,0,.08); border-radius:8px; font-family:inherit; color:#1e293b; background:#fff; transition:all .2s; resize:none; min-height:36px; }
.notes-input:focus { border-color:#4f46e5; outline:none; box-shadow:0 0 0 3px rgba(79,70,229,.08); }
body.dark-mode .notes-input { background:#0f172a; color:#f1f5f9; border-color:rgba(255,255,255,.08); }
.notes-add-btn { padding:7px 14px; background:#4f46e5; color:#fff; border:none; border-radius:8px; font-size:.8em; font-weight:700; cursor:pointer; font-family:inherit; transition:all .2s; flex-shrink:0; }
.notes-add-btn:hover { background:#4338ca; }
.notes-list { flex:1; overflow-y:auto; display:flex; flex-direction:column; gap:6px; }
.notes-list::-webkit-scrollbar { width:3px; }
.notes-list::-webkit-scrollbar-thumb { background:rgba(0,0,0,.1); border-radius:10px; }
body.dark-mode .notes-list::-webkit-scrollbar-thumb { background:rgba(255,255,255,.1); }
.note-card { background:#fffbeb; border:1px solid #fef3c7; border-radius:8px; padding:8px 12px; font-size:.8em; color:#78350f; position:relative; line-height:1.45; }
body.dark-mode .note-card { background:rgba(251,191,36,.08); border-color:rgba(251,191,36,.15); color:#fde68a; }
.note-card .note-time { font-size:.7em; font-weight:700; color:#f59e0b; margin-bottom:3px; cursor:pointer; }
.note-card .note-time:hover { text-decoration:underline; }
.note-card .note-sub-ko { font-size:.78em; color:#92400e; margin-bottom:3px; font-weight:500; }
body.dark-mode .note-card .note-sub-ko { color:#fbbf24; }
.note-card .note-delete { position:absolute; top:4px; right:6px; background:none; border:none; cursor:pointer; font-size:.9em; color:#d97706; opacity:.5; transition:opacity .15s; }
.note-card .note-delete:hover { opacity:1; }
.practice-empty { flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; color:#94a3b8; text-align:center; gap:6px; font-size:.82em; padding:20px 12px; }
.practice-empty .empty-icon { font-size:2.4em; opacity:.5; }

/* ════════════════ 4 ROUND ACTION BUTTONS (inside speak pane) ════════════════ */
.video-actions-row { display:flex; justify-content:center; gap:24px; flex-shrink:0; padding:10px 0 2px; }
.vact-wrap { display:flex; flex-direction:column; align-items:center; gap:4px; }
.vact-btn {
    width:44px; height:44px; border-radius:50%; border:1.5px solid rgba(0,0,0,.08);
    background:rgba(255,255,255,.75); color:#475569; cursor:pointer;
    display:flex; align-items:center; justify-content:center;
    transition:all .2s; backdrop-filter:blur(6px); padding:0;
    box-shadow:0 1px 3px rgba(0,0,0,.04);
}
.vact-btn:hover { background:#fff; border-color:#4f46e5; color:#4f46e5; box-shadow:0 4px 14px rgba(79,70,229,.15); transform:translateY(-2px); }
.vact-btn:active { transform:scale(.92); }
.vact-btn.active { background:#eef2ff; border-color:#4f46e5; color:#4f46e5; box-shadow:0 2px 8px rgba(79,70,229,.12); }
body.dark-mode .vact-btn { background:rgba(255,255,255,.05); border-color:rgba(255,255,255,.08); color:#94a3b8; }
body.dark-mode .vact-btn:hover { background:rgba(255,255,255,.1); border-color:#818cf8; color:#a5b4fc; }
body.dark-mode .vact-btn.active { background:rgba(99,102,241,.15); border-color:#818cf8; color:#a5b4fc; }
.vact-icon { font-size:1.1em; line-height:1; display:flex; align-items:center; justify-content:center; }
.vact-icon svg { display:block; }
.vact-label { font-size:.65em; color:#94a3b8; font-weight:600; white-space:nowrap; }
body.dark-mode .vact-label { color:#64748b; }

/* ════════════════ RIGHT COLUMN: SUBTITLE LIST ════════════════ */
.subtitle-panel {
    background:rgba(255,255,255,.6); border:1px solid rgba(0,0,0,.06);
    border-radius:14px; overflow:hidden; display:flex; flex-direction:column;
    backdrop-filter:blur(4px); height:100%;
}
@media (min-width: 1101px) {
    .subtitle-panel { position:absolute; top:0; left:0; right:0; bottom:0; height:auto; }
}
body.dark-mode .subtitle-panel { background:rgba(30,41,59,.55); border-color:rgba(255,255,255,.06); }

.subtitle-header { display:flex; align-items:center; gap:4px; padding:8px 10px; border-bottom:1px solid rgba(0,0,0,.06); flex-shrink:0; }
body.dark-mode .subtitle-header { border-color:rgba(255,255,255,.06); }
.subtitle-search { flex:1; font-size:.72em; font-weight:500; padding:5px 6px 5px 24px; border:1px solid rgba(0,0,0,.08); border-radius:6px; background:rgba(255,255,255,.8) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%2394a3b8' viewBox='0 0 16 16'%3E%3Cpath d='M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z'%3E%3C/path%3E%3C/svg%3E") 6px center no-repeat; color:#475569; font-family:inherit; transition:all .2s; min-width:0; }
.subtitle-search:focus { border-color:#4f46e5; outline:none; box-shadow:0 0 0 3px rgba(79,70,229,.08); }
body.dark-mode .subtitle-search { background-color:rgba(255,255,255,.05); color:#e2e8f0; border-color:rgba(255,255,255,.08); }
.sub-header-btn { flex-shrink:0; width:26px; height:26px; border:1px solid rgba(0,0,0,.08); border-radius:6px; background:transparent; font-size:.8em; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:all .15s; opacity:.5; color:#64748b; }
.sub-header-btn:hover { opacity:1; background:rgba(0,0,0,.04); }
.sub-header-btn.active { opacity:1; color:#f59e0b; background:rgba(245,158,11,.1); border-color:#f59e0b; }
body.dark-mode .sub-header-btn { border-color:rgba(255,255,255,.1); color:#94a3b8; }
body.dark-mode .sub-header-btn.active { color:#fbbf24; background:rgba(251,191,36,.1); border-color:#fbbf24; }

.subtitle-footer { padding:4px 10px; border-top:1px solid rgba(0,0,0,.04); font-size:.64em; font-weight:600; color:#94a3b8; display:flex; align-items:center; gap:6px; flex-shrink:0; }
body.dark-mode .subtitle-footer { border-color:rgba(255,255,255,.04); }

.subtitle-list { flex:1; overflow-y:auto; padding:2px 0; scroll-behavior:smooth; min-height:0; }
.subtitle-list::-webkit-scrollbar { width:3px; }
.subtitle-list::-webkit-scrollbar-thumb { background:rgba(0,0,0,.08); border-radius:10px; }
body.dark-mode .subtitle-list::-webkit-scrollbar-thumb { background:rgba(255,255,255,.08); }

.sub-item { display:flex; align-items:flex-start; gap:5px; padding:5px 26px 5px 10px; cursor:pointer; border-left:3px solid transparent; transition:all .15s; position:relative; }
.sub-item+.sub-item { border-top:1px solid rgba(0,0,0,.03); }
body.dark-mode .sub-item+.sub-item { border-top-color:rgba(255,255,255,.03); }
.sub-item:hover { background:rgba(79,70,229,.04); }
.sub-item.active { background:rgba(79,70,229,.06); border-left-color:#4f46e5; }
body.dark-mode .sub-item.active { background:rgba(99,102,241,.1); border-left-color:#818cf8; }
.sub-idx { font-size:.62em; font-weight:800; color:#94a3b8; min-width:18px; height:18px; display:flex; align-items:center; justify-content:center; background:rgba(0,0,0,.03); border-radius:4px; flex-shrink:0; }
.sub-item.active .sub-idx { background:#4f46e5; color:#fff; }
.sub-time { font-size:.68em; color:#94a3b8; font-weight:600; min-width:34px; flex-shrink:0; font-variant-numeric:tabular-nums; padding-top:1px; }
.sub-item.active .sub-time { color:#4f46e5; }
.sub-text-wrap { flex:1; min-width:0; }
.sub-ko { font-size:.85em; font-weight:600; color:#1e293b; line-height:1.45; word-break:keep-all; cursor:text; }
body.dark-mode .sub-ko { color:#f1f5f9; }
.sub-vi { font-size:.74em; color:#64748b; line-height:1.35; margin-top:1px; }
body.dark-mode .sub-vi { color:#94a3b8; }

.subtitle-list.eye-hidden .sub-text-wrap { visibility:hidden; }

.sub-star { position:absolute; top:4px; right:4px; width:20px; height:20px; border:none; border-radius:4px; background:transparent; color:#cbd5e1; font-size:.72em; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:all .15s; padding:0; opacity:0; z-index:2; }
.sub-item:hover .sub-star,.sub-item.saved .sub-star { opacity:1; }
.sub-star:hover { color:#f59e0b; background:rgba(245,158,11,.1); transform:scale(1.2); }
.sub-star.active { opacity:1; color:#f59e0b; }
body.dark-mode .sub-star { color:#64748b; }
body.dark-mode .sub-star.active { color:#fbbf24; }
.sub-item.saved { background:rgba(245,158,11,.03); }
body.dark-mode .sub-item.saved { background:rgba(251,191,36,.05); }
.sub-item.filtered-out { display:none; }

/* ════════════════ 2x2 MODE BUTTONS (right col bottom) ════════════════ */
.mode-grid-2x2 { display:grid; grid-template-columns:1fr 1fr; grid-template-rows:1fr 1fr; gap:8px; flex-shrink:0; height: 180px; }
.mbtn-card {
    display:flex; flex-direction:column; align-items:center; justify-content:center;
    gap:5px; padding:12px 6px; background:rgba(255,255,255,.6);
    border:2px solid rgba(0,0,0,.06); border-radius:14px;
    cursor:pointer; font-family:inherit; transition:all .2s; backdrop-filter:blur(4px);
}
.mbtn-card:hover { border-color:rgba(79,70,229,.2); box-shadow:0 6px 20px rgba(79,70,229,.08); transform:translateY(-2px); }
.mbtn-card:active { transform:scale(.97); }
.mbtn-card.active { background:#4f46e5; border-color:#4f46e5; box-shadow:0 6px 20px rgba(79,70,229,.3); }
body.dark-mode .mbtn-card { background:rgba(30,41,59,.55); border-color:rgba(255,255,255,.06); }
body.dark-mode .mbtn-card:hover { border-color:rgba(99,102,241,.3); }
body.dark-mode .mbtn-card.active { background:#6366f1; border-color:#6366f1; }
.mbtn-icon { font-size:1.7em; line-height:1; transition:transform .2s; display:flex; align-items:center; justify-content:center; }
.mbtn-icon svg { display:block; stroke:#475569; transition:stroke .2s; }
.mbtn-card.active .mbtn-icon svg { stroke:#fff; }
.mbtn-card:hover .mbtn-icon { transform:scale(1.1); }
.mbtn-label { font-size:.82em; font-weight:800; color:#475569; text-align:center; line-height:1.3; transition:color .2s; }
.mbtn-card.active .mbtn-label { color:#fff; }
body.dark-mode .mbtn-label { color:#cbd5e1; }
body.dark-mode .mbtn-card.active .mbtn-label { color:#fff; }

/* ── Hero (home.html) ── */
.video-hero-wrap { position:relative; border-radius:20px; overflow:hidden; margin-bottom:24px; box-shadow:0 8px 32px rgba(79,70,229,.12); }
.video-hero { position:relative; z-index:1; background:linear-gradient(135deg,#1e1b4b 0%,#3730a3 30%,#5b21b6 65%,#9d174d 100%); padding:28px 32px; display:flex; align-items:center; gap:18px; }
.video-hero::after { content:''; position:absolute; inset:0; background:url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E"); pointer-events:none; opacity:.5; }
.video-hero h1 { font-size:1.45em; font-weight:900; letter-spacing:-.4px; color:#fff; margin:0 0 4px; }
.video-hero p { color:rgba(255,255,255,.7); font-size:.88em; margin:0; font-weight:500; }
.video-hero-badge { display:flex; align-items:center; justify-content:center; min-width:52px; height:52px; background:rgba(255,255,255,.15); backdrop-filter:blur(8px); border:1px solid rgba(255,255,255,.2); border-radius:14px; font-size:1.4em; font-weight:900; color:#fff; flex-shrink:0; }
.video-hero-text { flex:1; min-width:0; }
.video-hero-meta { display:flex; gap:14px; margin-top:8px; }
.video-hero-meta span { display:flex; align-items:center; gap:5px; font-size:.78em; color:rgba(255,255,255,.55); font-weight:500; }
.video-hero-progress { display:flex; align-items:center; gap:8px; margin-left:auto; flex-shrink:0; }
.video-hero-progress-bar { width:80px; height:4px; background:rgba(255,255,255,.15); border-radius:2px; overflow:hidden; }
.video-hero-progress-fill { height:100%; background:#a78bfa; border-radius:2px; transition:width .3s; }

/* ── Home cards ── */
.video-lesson-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(300px,1fr)); gap:18px; }
.video-lesson-card { background:rgba(255,255,255,.7); border:1px solid rgba(0,0,0,.06); border-radius:18px; overflow:hidden; cursor:pointer; transition:all .25s; text-decoration:none; color:inherit; display:flex; flex-direction:column; backdrop-filter:blur(4px); }
.video-lesson-card:hover { transform:translateY(-4px); box-shadow:0 12px 32px rgba(0,0,0,.1); border-color:rgba(79,70,229,.15); }
.video-lesson-card:active { transform:scale(.98); }
body.dark-mode .video-lesson-card { background:rgba(30,41,59,.6); border-color:rgba(255,255,255,.06); }
.video-lesson-card .card-thumb { aspect-ratio:16/10; background:linear-gradient(135deg,#3730a3,#5b21b6); display:flex; align-items:center; justify-content:center; font-size:2.8em; position:relative; }
.video-lesson-card:nth-child(2n) .card-thumb { background:linear-gradient(135deg,#1e40af,#7e22ce); }
.video-lesson-card:nth-child(3n) .card-thumb { background:linear-gradient(135deg,#6d28d9,#be185d); }
.video-lesson-card .card-thumb::after { content:''; position:absolute; inset:0; background:linear-gradient(to top,rgba(0,0,0,.3),transparent 50%); opacity:0; transition:opacity .2s; }
.video-lesson-card:hover .card-thumb::after { opacity:1; }
.video-lesson-card .card-play-icon { position:absolute; width:48px; height:48px; background:rgba(255,255,255,.2); backdrop-filter:blur(6px); border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:.6em; opacity:0; transform:scale(.8); transition:all .25s; }
.video-lesson-card:hover .card-play-icon { opacity:1; transform:scale(1); }
.video-lesson-card .card-body { padding:16px 20px; }
.video-lesson-card .card-title { font-weight:800; font-size:1.05em; color:#1e293b; margin-bottom:6px; }
body.dark-mode .video-lesson-card .card-title { color:#f1f5f9; }
.video-lesson-card .card-meta { font-size:.8em; color:#94a3b8; display:flex; gap:12px; align-items:center; font-weight:500; }
.video-lesson-card-wrap { position:relative; }
.video-lesson-card-wrap .card-admin-actions { position:absolute; top:10px; right:10px; display:flex; gap:6px; z-index:5; opacity:0; transition:opacity .2s; }
.video-lesson-card-wrap:hover .card-admin-actions { opacity:1; }
.card-admin-btn { width:32px; height:32px; border:1px solid rgba(0,0,0,.1); border-radius:8px; background:rgba(255,255,255,.85); backdrop-filter:blur(4px); cursor:pointer; font-size:.9em; display:flex; align-items:center; justify-content:center; transition:all .15s; }
.card-admin-btn:hover { transform:scale(1.1); }
.card-admin-btn.edit:hover { background:#eff6ff; border-color:#3b82f6; }
.card-admin-btn.delete:hover { background:#fef2f2; border-color:#ef4444; }
body.dark-mode .card-admin-btn { background:rgba(30,41,59,.85); border-color:rgba(255,255,255,.1); }

/* ── Hide mobile bottom nav on desktop ── */
@media (min-width: 769px) {
    .mobile-bottom-nav { display: none; }
}

/* ── Responsive ── */
@media (max-width:1100px) {
    .video-grid {
        grid-template-columns:1fr;
        grid-template-rows:auto auto auto auto auto;
    }
    .video-grid-video      { grid-row:1; grid-column:1; }
    .video-grid-controls   { grid-row:2; grid-column:1; }
    .video-grid-sublist    { grid-row:3; grid-column:1; max-height:280px; }
    .video-grid-cursub     { grid-row:4; grid-column:1; }
    .video-grid-modebtns   { grid-row:5; grid-column:1; }
    .video-grid-mode       { grid-row:6; grid-column:1; }
    .video-grid-modebtns .mode-grid-2x2 { grid-template-columns:repeat(4,1fr); grid-template-rows:auto; }
}
@media (max-width:991px) {
    .video-sticky-shell { position:static!important; height:auto!important; overflow:visible!important; }
}
@media (max-width:768px) {
    body {
        padding: 0 !important; margin: 0 !important; overflow: hidden !important;
        display: flex !important; flex-direction: column !important;
        box-sizing: border-box;
        height: 100vh; /* fallback cho browser cũ */
        height: 100dvh; /* dynamic viewport — JS important inline style sẽ ghi đè */
        min-height: 0 !important; /* dập min-height:100vh từ base.css */
    }
    html {
        margin: 0; padding: 0;
        height: 100vh;
        height: 100dvh;
    }

    /* Ẩn lớp gradient phía trên gây khoảng trống lớn */
    .top-gradient-mask { display: none !important; }

    /* Navbar sát lên trên, margin nhỏ gọn */
    .global-nav { position: relative !important; top: 0 !important; flex-shrink: 0 !important; margin: 4px 8px 0 8px !important; width: auto !important; border-radius: 12px !important; }

    .video-sticky-shell { position: relative !important; top: auto !important; left: auto !important; right: auto !important; bottom: auto !important; padding: 0 !important; margin: 6px 0 0 0 !important; overflow: hidden; flex: 1; display: flex; flex-direction: column; min-height: 0; }
    .video-wrapper { padding: 0 !important; border: none !important; border-radius: 0 !important; margin: 0 !important; flex: 1; display: flex; flex-direction: column; min-height: 0; }

    /* Chiều cao thanh 5 tab — tỷ lệ theo % chiều cao màn hình thực (100dvh đã tự trừ thanh địa chỉ trình duyệt), có chặn trên/dưới cho máy quá ngắn/quá dài, cộng vùng an toàn home-indicator iPhone */
    :root { --mobile-nav-h: calc(clamp(50px, 8vh, 74px) + env(safe-area-inset-bottom)); }

    .video-grid { display: flex; flex-direction: column; flex: 1; min-height: 0; gap: 0; overflow: hidden; }

    /* ═══ TOP: Fixed video ═══ */
    .video-grid-video { order: 1; flex-shrink: 0; }
    .video-player-wrap { border-radius: 0 !important; border: none !important; }

    /* ═══ TOP: Compact controls bar ═══ */
    .video-grid-controls {
        order: 2;
        flex-shrink: 0; padding: 5px 8px;
        background: #fff; z-index: 10;
        border-bottom: 1px solid #e2e8f0;
    }
    body.dark-mode .video-grid-controls { background: #0f172a; border-bottom-color: #334155; }

    .video-controls-bar { padding: 0; gap: 3px; flex-wrap: nowrap; align-items: center; }
    .video-ctrl-btn { padding: 4px; border-radius: 6px; }
    .video-ctrl-btn svg { display: block; }
    #vb-play-pause { width: 26px; height: 26px; flex-shrink: 0; }
    .video-time-display { font-size: 0.6em; min-width: 26px; }
    .video-speed-select { font-size: 0.58em; padding: 2px 1px; min-width: 36px; }
    .cc-toggle-btn { padding: 2px 3px; font-size: 0.58em; }
    .cc-toggle-btn svg { width: 14px; height: 14px; }
    .gear-toggle-btn { padding: 2px 3px; font-size: 0.58em; }
    .video-progress-wrap { min-width: 24px; height: 14px; }

    /* Hide desktop 2x2 mode buttons */
    .video-grid-modebtns { display: none !important; }

    /* ═══ MIDDLE: Scrollable content (padding-bottom for bottom nav) ═══ */
    /* max-height: none — clears the 280px cap inherited from the @media(max-width:1100px) rule above */
    .video-grid-sublist { order: 3; display: none; max-height: none; }
    .video-grid-cursub { order: 4; flex-shrink: 0; }

    .video-current-sub {
        height: auto; min-height: 90px; max-height: 150px;
        padding: 10px 14px; border-radius: 0; border-left: none; border-right: none;
    }
    .video-current-sub .cur-sub-ko { font-size: 1.1em; }
    .video-current-sub .cur-sub-vi { font-size: 0.82em; }

    .video-grid-mode {
        order: 6;
        flex: 1; overflow-y: auto; min-height: 0;
        display: flex; flex-direction: column;
        padding: 8px 10px;
    }

    /* ── SUBLIST MODE (Phụ đề tab): chỉ hiện full list script, lấp đầy từ dưới thanh video xuống tận thanh 5 tab ── */
    .video-grid.show-sublist .video-grid-sublist {
        display: flex; flex-direction: column; flex: 1;
        overflow-y: auto; min-height: 0; max-height: none;
    }
    .video-grid.show-sublist .video-grid-cursub { display: none !important; }
    .video-grid.show-sublist .video-grid-mode { display: none !important; }
    .video-grid.show-sublist .subtitle-list { padding-bottom: 10px; } /* small breathing room; bar space already reserved on .video-grid */
    .subtitle-panel { border-radius: 0; border: none; height: 100%; }

    /* ── LISTEN MODE: mở rộng subtitle, ẩn mode content ── */
    .video-grid.vmode-listen-mode .video-grid-mode {
        flex: 0; overflow: hidden; padding: 0; min-height: 0;
    }
    .video-grid.vmode-listen-mode .video-mode-content { display: none; }
    .video-grid.vmode-listen-mode .video-grid-cursub { flex: 1; display: flex; }

    .video-current-sub.sub-listen {
        flex: 1; height: auto; min-height: auto; max-height: none;
        padding: 10px 18px 40px 18px; justify-content: flex-start; gap: 0;
    }
    .video-current-sub.sub-listen .cur-sub-ko { font-size: var(--sub-listen-size, 1.6em); }
    .video-current-sub.sub-listen .cur-sub-vi { font-size: 0.92em; }
    .video-current-sub.sub-listen .cur-sub-next-ko { font-size: 0.82em; }
    .video-current-sub.sub-listen .cur-sub-next { bottom: 14px; }

    /* Dictation sizing */
    .dict-actions-big {
        flex-wrap: wrap; gap: 8px;
        display: flex; justify-content: center;
        margin-top: 12px;
    }
    .dict-btn-big { font-size: 0.85em; padding: 8px 12px; }

    /* Extra bottom padding no longer needed */
    .video-grid-mode:has(#mode-dictation.active) { padding-bottom: 0 !important; }

    /* Speak-mode subtitle — same box size as dictation, so switching tabs doesn't shift the layout */
    .video-current-sub.speak-mode-active {
        min-height: 160px !important;
        padding-bottom: 50px !important;
    }

    /* Same top offset as .dict-actions-big so prev/next/mic/loop buttons sit at the same position as the dictation buttons */
    .video-actions-row {
        margin-top: 12px;
        padding: 0;
    }

    /* Dictation subtitle — more height for input + hint spacing */
    .video-current-sub.dict-mode-active {
        min-height: 160px !important;
        padding-bottom: 50px !important;
    }

    /* Dictation VI hint — compact bulb icon */
    .dict-hint-label {
        color: #64748b; position: absolute; left: 0; top: 2px;
        display: flex; align-items: center;
    }
    .dict-vi-hint-wrapper {
        font-size: 0.75em !important;
        bottom: 8px !important;
        left: 14px !important;
        right: 14px !important;
    }

    /* ═══ BOTTOM TAB BAR: đặt cuối cùng trong flex column bằng "order" (KHÔNG dùng position:fixed) — .video-grid phía trên là flex:1 nên đẩy thanh này nằm sát đáy màn hình một cách tự nhiên qua layout flow bình thường, không bị lỗi thanh địa chỉ trình duyệt che khuất như position:fixed hay gặp trên Safari iOS / webview ═══ */
    .mobile-bottom-nav {
        display: flex;
        order: 1; /* .video-grid không set order = mặc định 0, nên nav luôn render sau nó */
        flex-shrink: 0;
        height: var(--mobile-nav-h);
        box-sizing: border-box;
        justify-content: space-around; align-items: center;
        background: rgba(255,255,255,0.97);
        backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px);
        border-top: 1px solid rgba(0,0,0,0.07);
        padding: 6px 0 calc(5px + env(safe-area-inset-bottom)) 0;
        box-shadow: 0 -2px 10px rgba(0,0,0,0.06);
    }
    body.dark-mode .mobile-bottom-nav { background: rgba(15,23,42,0.97); border-color: rgba(255,255,255,0.08); }

    .mobile-tab-btn {
        background: none; border: none;
        display: flex; flex-direction: column; align-items: center;
        gap: 2px; color: #94a3b8;
        font-size: 0.66em; font-weight: 600;
        padding: 3px 2px; cursor: pointer;
        transition: color 0.18s, transform 0.18s;
        min-width: 0; flex: 1; max-width: 72px;
        -webkit-tap-highlight-color: transparent;
    }
    .mobile-tab-btn svg { width: 20px; height: 20px; transition: transform 0.18s; }
    .mobile-tab-btn span { white-space: nowrap; line-height: 1.2; }
    .mobile-tab-btn.active { color: #4f46e5; }
    .mobile-tab-btn.active svg { transform: scale(1.1); }
    .mobile-tab-btn:active { transform: scale(0.9); }
    body.dark-mode .mobile-tab-btn { color: #64748b; }
    body.dark-mode .mobile-tab-btn.active { color: #818cf8; }
}
@media (max-width:600px) {
    .video-controls-bar { flex-wrap: wrap; row-gap: 5px; }
    .video-progress-wrap { width: 100%; min-width: 60px; order: 10; }
    .video-title-heading { font-size:.88em; }
    .mode-grid-2x2 { gap:5px; }
}

===== END FILE: public/assets/css/video.css =====

===== FILE: public/assets/css/vocab-tooltip.css =====
/* ==========================================================================
   VOCAB-TOOLTIP.CSS — Từ Vựng Tàng Hình & Smart Tooltip
   ========================================================================== */

/* Giao diện Từ Vựng tĩnh — Không thay đổi độ rộng hay border để tránh giật khung */
.vocab-word {
    display: inline; position: relative; cursor: help; text-decoration: none !important;
    transition: color 0.2s ease, background 0.2s ease;
    padding: 0 2px; margin: 0 -2px; border-radius: 4px;
}
body:not(.vocab-disabled) .vocab-word { color: var(--vocab-highlight); }
body:not(.vocab-disabled) .vocab-word:hover { background-color: #fee2e2; }
body.vocab-disabled .vocab-word { color: inherit !important; cursor: auto !important; pointer-events: none !important; background: transparent !important; }

/* Popup thông minh */
#smart-vocab-tooltip {
    position: absolute; display: none; background: #ffffff; border: 1px solid #e2e8f0;
    box-shadow: 0 10px 25px -5px rgba(0,0,0,0.15); padding: 16px 20px; border-radius: 12px;
    z-index: 9999; min-width: 220px; max-width: 300px; color: #0f172a; pointer-events: auto;
}
#smart-vocab-tooltip::before {
    content: ''; position: absolute; top: -6px; left: 24px; width: 12px; height: 12px;
    background: #ffffff; border-top: 1px solid #e2e8f0; border-left: 1px solid #e2e8f0;
    transform: rotate(45deg);
}

.tooltip-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; border-bottom: 1px dashed #e2e8f0; padding-bottom: 10px; }
.tooltip-base { font-size: 1.3em; font-weight: 800; color: var(--vocab-highlight); letter-spacing: 0.5px; }
.save-vocab-btn { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; cursor: pointer; padding: 6px 10px; transition: 0.2s; font-size: 1.1em; display: inline-flex; align-items: center; justify-content: center; }
.save-vocab-btn:hover { background: #e2e8f0; transform: translateY(-2px); box-shadow: 0 2px 5px rgba(0,0,0,0.05); }

/* Flat icon button (Lưu / Phát âm trong tooltip) */
.flat-icon-btn {
    background: transparent; border: none; cursor: pointer; padding: 6px;
    border-radius: 6px; color: #64748b; display: inline-flex; align-items: center;
    justify-content: center; transition: 0.2s;
}
.flat-icon-btn:hover { background: #f1f5f9; color: #0f172a; }
.flat-icon-btn.saved { color: #3b82f6; }

/* Vocab toggle switch */
.vocab-toggle-container { position: fixed; top: 15px; left: 15px; z-index: 99999; background: #fff; padding: 8px 12px; border-radius: 8px; border: 1px solid #cbd5e0; font-weight: bold; color: #4a5568; font-size: 0.85em; display: flex; align-items: center; gap: 8px; transition: all 0.3s ease; }
.switch { position: relative; display: inline-block; width: 36px; height: 20px; flex-shrink: 0; }
.switch input { opacity: 0; width: 0; height: 0; }
.slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #cbd5e0; transition: .3s; border-radius: 20px; }
.slider:before { position: absolute; content: ""; height: 14px; width: 14px; left: 3px; bottom: 3px; background-color: white; transition: .3s; border-radius: 50%; }
input:checked + .slider { background-color: #48bb78; }
input:checked + .slider:before { transform: translateX(16px); }

===== END FILE: public/assets/css/vocab-tooltip.css =====

===== FILE: public/assets/js/navbar.js =====
/* ==========================================================================
   NAVBAR.JS — Auto-inject Global Navbar & Side Drawer
   Gradient + Dark mode được quản lý bởi theme-picker.js
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('globalNavbar')) return;

    const path = window.location.pathname;
    let rootPath = '';
    let publicIndex = path.indexOf('/public/');
    if (publicIndex !== -1) {
        let subPath = path.substring(publicIndex + 8);
        const depth = subPath.split('/').length - 1;
        rootPath = depth > 0 ? '../'.repeat(depth) : '';
    } else {
        const parts = path.split('/');
        let depth = parts.filter(p => p !== '').length - 1;
        if (depth < 0) depth = 0;
        rootPath = depth > 0 ? '../'.repeat(depth) : '';
    }

    const isListening = path.includes('/listening/');
    const isReading   = path.includes('/reading/');
    const isWriting   = path.includes('/writing/');
    const isGrammar   = path.includes('/grammar/');

    // === CSS ===
    const style = document.createElement('style');
    style.innerHTML = `
        .icon-home,.post-explain-actions,.review-link{display:none!important}

        /* Vocab icon states */
        #globalVocabBtn{color:#6b7280;transition:color .3s}
        body:not(.vocab-disabled):not(.vocab-level-1):not(.vocab-level-2) #globalVocabBtn{color:#2563eb}
        #globalVocabBtn:disabled{color:#9ca3af!important;opacity:.45!important}

        .nav-right{display:flex;align-items:center;gap:6px}

        /* TOP MASK */
        .top-gradient-mask{
            position:fixed;top:0;left:0;right:0;height:38px;
            background:var(--random-bg-gradient,linear-gradient(135deg,#e0c3fc,#8ec5fc));
            background-attachment:fixed;z-index:998;pointer-events:none;
        }

        /* NAVBAR */
        .global-nav{
            position:sticky;top:14px;z-index:1000;
            background:rgba(255,255,255,.45);
            backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);
            border:1px solid rgba(255,255,255,.7);
            border-radius:20px;
            box-shadow:0 4px 24px rgba(0,0,0,.08),0 1px 4px rgba(255,255,255,.6) inset;
            font-family:"Pretendard","Inter",-apple-system,sans-serif;
            width:100%;max-width:900px;margin:14px auto 24px;box-sizing:border-box;
        }
        body.dark-mode .global-nav{
            background:rgba(15,23,42,.65);
            border-color:rgba(255,255,255,.12);
            box-shadow:0 4px 24px rgba(0,0,0,.35);
        }
        /* NAVBAR LAYOUT — 4-item flex layout */
        .nav-top-row{display:flex;align-items:center;justify-content:space-between;padding:0 20px;height:55px;position:relative}
        .nav-left{display:flex;align-items:center;gap:12px;position:relative;z-index:2}
        .nav-logo{text-decoration:none;display:flex;align-items:center;gap:8px;white-space:nowrap;margin:0;font-family:'Pretendard','Inter',-apple-system,sans-serif}
        .nav-logo img{height:38px;width:auto;display:block;flex-shrink:0}
        .nav-logo-text .vh{color:#142657}
        .nav-logo-text .th{color:#f95052}
        .nav-logo-text{font-size:1.15em;font-weight:900;display:flex;align-items:center;gap:2px}
        body.dark-mode .nav-logo-text .vh{color:#60a5fa}
        body.dark-mode .nav-logo-text .th{color:#fca5a5}

        /* ICON BUTTON — Apple flat */
        .nav-icon-btn{
            background:rgba(255,255,255,.35);
            border:1px solid rgba(255,255,255,.55);
            backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);
            cursor:pointer;display:flex;align-items:center;justify-content:center;
            padding:7px;border-radius:10px;transition:all .2s;color:#1f2937;
            flex-shrink:0;box-shadow:0 1px 4px rgba(0,0,0,.06);
        }
        .nav-icon-btn:hover{background:rgba(255,255,255,.65);transform:scale(1.05);box-shadow:0 2px 8px rgba(0,0,0,.1)}
        .nav-icon-btn:active{transform:scale(.97)}
        body.dark-mode .nav-icon-btn{background:rgba(255,255,255,.08);border-color:rgba(255,255,255,.15);color:#f1f5f9}
        body.dark-mode .nav-icon-btn:hover{background:rgba(255,255,255,.15)}

        /* DESKTOP LINKS */
        .nav-desktop-links{display:flex;gap:30px;margin:0;}
        .nav-link{
            text-decoration:none;
            color:#6b7280;
            font-weight:700;
            font-size:1.15em;
            transition:0.2s;
            white-space:nowrap;
            padding:0;
            border-radius:0;
            background:none;
        }
        .nav-link.active, .nav-link:hover{
            font-weight:800;
            background:none;
        }
        .nav-link[data-skill="read"]{color:#142657}
        .nav-link[data-skill="listen"]{color:#142657}
        .nav-link[data-skill="write"]{color:#f95052}
        .nav-link[data-skill="grammar"]{color:#f95052}
        .nav-link[data-skill="read"]:hover{color:#f95052!important}
        .nav-link[data-skill="listen"]:hover{color:#f95052!important}
        .nav-link[data-skill="write"]:hover{color:#142657!important}
        .nav-link[data-skill="grammar"]:hover{color:#142657!important}
        @keyframes blink-read{0%,100%{color:#142657}50%{color:#f95052}}
        @keyframes blink-listen{0%,100%{color:#142657}50%{color:#f95052}}
        @keyframes blink-write{0%,100%{color:#f95052}50%{color:#142657}}
        @keyframes blink-grammar{0%,100%{color:#f95052}50%{color:#142657}}
        .nav-link[data-skill="read"].active{animation:blink-read 1.2s infinite}
        .nav-link[data-skill="listen"].active{animation:blink-listen 1.2s infinite}
        .nav-link[data-skill="write"].active{animation:blink-write 1.2s infinite}
        .nav-link[data-skill="grammar"].active{animation:blink-grammar 1.2s infinite}
        body.dark-mode .nav-link{color:#9ca3af}
        body.dark-mode .nav-link.active, body.dark-mode .nav-link:hover{background:none;font-weight:800;}

        /* SIDE DRAWER — Glassmorphism */
        .side-drawer{
            position:fixed;top:0;left:-310px;width:290px;height:100vh;
            background:rgba(255,255,255,.85);
            backdrop-filter:blur(28px);-webkit-backdrop-filter:blur(28px);
            border-right:1px solid rgba(255,255,255,.7);
            box-shadow:6px 0 32px rgba(0,0,0,.12);
            z-index:1001;transition:left .3s cubic-bezier(.4,0,.2,1);
            box-sizing:border-box;overflow-y:auto;
        }
        body.dark-mode .side-drawer{
            background:rgba(10,15,30,.9);
            border-right-color:rgba(255,255,255,.1);
            box-shadow:6px 0 32px rgba(0,0,0,.5);
        }
        .side-drawer.open{left:0}

        .drawer-header{display:flex;align-items:center;justify-content:space-between;padding:20px 18px 14px;border-bottom:1px solid rgba(0,0,0,.06)}
        body.dark-mode .drawer-header{border-bottom-color:rgba(255,255,255,.08)}
        .drawer-logo{text-decoration:none;display:flex;align-items:center;gap:8px}
        .drawer-logo img{height:30px;width:auto;display:block;flex-shrink:0}
        .drawer-logo-text .vh{color:#142657}
        .drawer-logo-text .th{color:#f95052}
        .drawer-logo-text{font-size:1em;font-weight:900;display:flex;align-items:center;gap:2px}
        body.dark-mode .drawer-logo-text .vh{color:#60a5fa}
        body.dark-mode .drawer-logo-text .th{color:#fca5a5}
        body.dark-mode .drawer-logo{color:#f1f5f9}

        .drawer-close-btn{width:30px;height:30px;background:rgba(0,0,0,.06);border:none;border-radius:8px;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#64748b;transition:all .2s}
        .drawer-close-btn:hover{background:rgba(0,0,0,.12);color:#1f2937}
        body.dark-mode .drawer-close-btn{background:rgba(255,255,255,.08);color:#94a3b8}
        body.dark-mode .drawer-close-btn:hover{background:rgba(255,255,255,.15);color:#f1f5f9}

        .drawer-section{font-size:.7em;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#94a3b8;padding:14px 18px 6px}
        body.dark-mode .drawer-section{color:#475569}

        .nav-link-side{
            display:flex;align-items:center;gap:11px;text-decoration:none;
            color:#374151;font-weight:600;font-size:.93em;
            padding:9px 18px;transition:background .15s,color .15s;
            cursor:pointer;position:relative;border:none;background:none;width:100%;text-align:left;
        }
        .nav-link-side:hover{background:rgba(37,99,235,.07);color:#2563eb}
        .nav-link-side.active{background:rgba(37,99,235,.1);color:#2563eb}
        .nav-link-side.active::before{content:'';position:absolute;left:0;top:4px;bottom:4px;width:3px;background:#2563eb;border-radius:0 3px 3px 0}
        body.dark-mode .nav-link-side{color:#cbd5e1}
        body.dark-mode .nav-link-side:hover{background:rgba(96,165,250,.1);color:#60a5fa}
        body.dark-mode .nav-link-side.active{background:rgba(96,165,250,.12);color:#60a5fa}
        body.dark-mode .nav-link-side.active::before{background:#60a5fa}

        .drawer-icon{width:30px;height:30px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:.95em;flex-shrink:0;background:rgba(0,0,0,.04);transition:background .15s}
        body.dark-mode .drawer-icon{background:rgba(255,255,255,.06)}
        .nav-link-side:hover .drawer-icon{background:rgba(37,99,235,.12)}
        body.dark-mode .nav-link-side:hover .drawer-icon{background:rgba(96,165,250,.12)}

        .drawer-divider{height:1px;background:rgba(0,0,0,.06);margin:6px 18px}
        body.dark-mode .drawer-divider{background:rgba(255,255,255,.06)}

        /* DRAWER — AUTH CARD */
        .drawer-auth{padding:14px 16px;border-bottom:1px solid rgba(0,0,0,.06)}
        body.dark-mode .drawer-auth{border-bottom-color:rgba(255,255,255,.08)}
        .drawer-auth a{text-decoration:none}
        .auth-login-btn{
            display:flex;align-items:center;justify-content:center;gap:8px;width:100%;
            padding:11px;border:none;border-radius:12px;cursor:pointer;
            background:linear-gradient(135deg,#2563eb,#4f46e5);color:#fff;
            font-weight:700;font-size:.92em;box-shadow:0 6px 16px rgba(37,99,235,.25);
            transition:transform .15s,box-shadow .15s;
        }
        .auth-login-btn:hover{transform:translateY(-1px);box-shadow:0 8px 20px rgba(37,99,235,.32)}
        .auth-user{
            display:flex;align-items:center;gap:12px;padding:10px;border-radius:14px;
            background:rgba(37,99,235,.06);border:1px solid rgba(37,99,235,.15);
            cursor:pointer;transition:background .15s;
        }
        .auth-user:hover{background:rgba(37,99,235,.1)}
        .auth-user img{width:44px;height:44px;border-radius:50%;object-fit:cover;border:2px solid rgba(255,255,255,.6);flex-shrink:0}
        body.dark-mode .auth-user img{border-color:rgba(255,255,255,.2)}
        .auth-user-info{min-width:0;flex:1}
        .auth-user-name{display:block;font-weight:800;font-size:.95em;color:#1f2937;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        body.dark-mode .auth-user-name{color:#f1f5f9}
        .auth-user-role{display:block;font-size:.74em;color:#b45309;font-weight:700;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        body.dark-mode .auth-user-role{color:#fbbf24}
        .auth-user-streak{display:block;font-size:.72em;color:#f59e0b;font-weight:800;margin-top:3px}
        .auth-arrow{color:#94a3b8;flex-shrink:0;transition:transform .15s,color .15s}
        .auth-user:hover .auth-arrow{transform:translateX(2px);color:#2563eb}
        .auth-logout-btn{
            display:flex;align-items:center;gap:11px;width:100%;
            padding:9px 18px;background:none;border:none;cursor:pointer;
            color:#dc2626;font-weight:600;font-size:.9em;text-align:left;transition:background .15s;
        }
        .auth-logout-btn:hover{background:rgba(220,38,38,.08)}
        body.dark-mode .auth-logout-btn{color:#f87171}
        body.dark-mode .auth-logout-btn:hover{background:rgba(248,113,113,.12)}

        /* DRAWER — ACCORDION */
        .drawer-acc{border-bottom:1px solid rgba(0,0,0,.06)}
        body.dark-mode .drawer-acc{border-bottom-color:rgba(255,255,255,.08)}
        .drawer-acc-head{
            display:flex;align-items:center;justify-content:space-between;width:100%;
            padding:13px 18px;background:none;border:none;cursor:pointer;
            font-size:.78em;font-weight:800;text-transform:uppercase;letter-spacing:.8px;
            color:#475569;transition:color .15s;
        }
        body.dark-mode .drawer-acc-head{color:#94a3b8}
        .drawer-acc-head:hover{color:#2563eb}
        body.dark-mode .drawer-acc-head:hover{color:#60a5fa}
        .drawer-acc-lbl{display:flex;align-items:center;gap:9px}
        .drawer-chevron{width:14px;height:14px;transition:transform .25s;color:#94a3b8;flex-shrink:0}
        .drawer-acc.open .drawer-chevron{transform:rotate(180deg)}
        .drawer-acc-body{display:none;padding-bottom:6px}
        .drawer-acc.open .drawer-acc-body{display:block}
        .drawer-acc-body .nav-link-side{padding-left:30px;font-size:.9em}

        /* Mọi nút trong drawer kế thừa font của trang (tránh rơi về font mặc định như Arial) */
        .side-drawer button{font-family:inherit}

        /* OVERLAY */
        .drawer-overlay{position:fixed;inset:0;background:rgba(0,0,0,.3);backdrop-filter:blur(2px);-webkit-backdrop-filter:blur(2px);z-index:1000;display:none;opacity:0;transition:opacity .3s}
        .drawer-overlay.show{display:block;opacity:1}

        /* RESPONSIVE — Navbar + Wrapper/Container width sync */
        @media(min-width:769px){
            .container,.wrapper{max-width:900px!important;margin-left:auto!important;margin-right:auto!important;width:auto!important}
        }
        @media(max-width:768px){
            .global-nav{margin-left:4px!important;margin-right:4px!important;width:auto!important;border-radius:16px;}
            .container,.wrapper{margin-left:4px!important;margin-right:4px!important;width:auto!important;padding-left:12px!important;padding-right:12px!important;}
            .top-gradient-mask{height:28px}
            .nav-top-row{height:50px;padding:0 15px}
            .nav-logo-wrapper{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);white-space:nowrap;z-index:1;}
            .nav-desktop-links{display:none}
            .nav-logo img{height:32px}
            .nav-logo-text{font-size:1em;font-weight:900}
            .nav-right .nav-icon-btn{padding:5px;border-radius:8px}
            .nav-right .nav-icon-btn svg{width:17px!important;height:17px!important}
        }
        @media(max-width:600px){
            .global-nav{margin:10px 2px 15px 2px!important;border-radius:12px;top:10px;}
            .container,.wrapper{margin-left:2px!important;margin-right:2px!important;width:auto!important;padding-left:8px!important;padding-right:8px!important;}
            .top-gradient-mask{height:18px}
        }
    `;
    document.head.appendChild(style);

    // Restore vocab toggle state (default: enabled)
    const vocabEnabled = localStorage.getItem('vocabEnabled');
    if (vocabEnabled === 'false') {
        document.body.classList.add('vocab-disabled');
    } else {
        document.body.classList.remove('vocab-disabled');
    }

    // Inject menu.js (chỉ toggleDrawer)
    if (!document.querySelector('script[src*="menu.js"]')) {
        const s = document.createElement('script');
        s.src = `${rootPath}assets/js/menu.js`; s.async = false;
        document.body.appendChild(s);
    }

    // HTML
    const navHTML = `
    <div class="top-gradient-mask" id="topGradientMask"></div>
    <nav class="global-nav" id="globalNavbar">
        <div class="nav-top-row">
            <div class="nav-left">
                <button class="nav-icon-btn" onclick="toggleDrawer(true)" title="Menu" aria-label="Menu">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="24" height="24" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="3" y1="12" x2="21" y2="12"></line>
                        <line x1="3" y1="6" x2="21" y2="6"></line>
                        <line x1="3" y1="18" x2="21" y2="18"></line>
                    </svg>
                </button>
            </div>
            
            <div class="nav-logo-wrapper">
                <a href="${rootPath}index.html" class="nav-logo"><img src="${rootPath}assets/img/logo-navbar.png" alt=""><span class="nav-logo-text"><span class="vh">Vui Học</span><span class="th">Tiếng Hàn</span></span></a>
            </div>

            <div class="nav-desktop-links">
                <a href="${rootPath}reading/home.html" class="nav-link ${isReading?'active':''}" data-skill="read">Đọc</a>
                <a href="${rootPath}listening/home.html" class="nav-link ${isListening?'active':''}" data-skill="listen">Nghe</a>
                <a href="${rootPath}writing/home.html" class="nav-link ${isWriting?'active':''}" data-skill="write">Viết</a>
                <a href="${rootPath}grammar/home.html" class="nav-link ${isGrammar?'active':''}" data-skill="grammar">Ngữ pháp</a>
            </div>

            <div class="nav-right">
                <button class="nav-icon-btn" id="globalVocabBtn" onclick="window.toggleVocab()" title="Bật/Tắt tra từ điển">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="20" height="20">
                        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                        <line x1="12" y1="6" x2="12" y2="14"/>
                        <line x1="8" y1="10" x2="16" y2="10"/>
                    </svg>
                </button>
                ${path.includes('mypage.html') ? `
                    <button class="nav-icon-btn" onclick="window.location.href='${rootPath}index.html'" title="Trang chủ">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" width="20" height="20"><path d="M3 12L12 3l9 9M5 10v10h5v-6h4v6h5V10"/></svg>
                    </button>
                ` : `
                    <button class="nav-icon-btn" id="navAvatarBtn" onclick="handleAvatarClick()" title="Tài khoản">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" width="20" height="20">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                        </svg>
                    </button>
                `}
            </div>
        </div>
    </nav>
    <div class="drawer-overlay" id="drawerOverlay" onclick="toggleDrawer(false)"></div>
    <div class="side-drawer" id="sideDrawer">
        <div class="drawer-header">
            <a href="${rootPath}index.html" class="drawer-logo" onclick="toggleDrawer(false)"><img src="${rootPath}assets/img/logo-navbar.png" alt=""><span class="drawer-logo-text"><span class="vh">Vui Học</span><span class="th">Tiếng Hàn</span></span></a>
            <button class="drawer-close-btn" onclick="toggleDrawer(false)" aria-label="Đóng">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="15" height="15" stroke-width="2.5" stroke-linecap="round">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
            </button>
        </div>
        <div class="drawer-auth" id="drawerAuth"></div>

        <div class="drawer-acc" id="accPractice">
            <button class="drawer-acc-head" onclick="window.toggleAcc('accPractice')">
                <span class="drawer-acc-lbl"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="16" height="16" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg> Luyện tập</span>
                <svg class="drawer-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M6 9l6 6 6-6"/></svg>
            </button>
            <div class="drawer-acc-body">
        <a href="${rootPath}reading/home.html" class="nav-link-side ${isReading?'active':''}" onclick="toggleDrawer(false)">
            <span class="drawer-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="15" height="15" stroke-width="2" stroke-linecap="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg></span>
            <span>Luyện Đọc</span>
        </a>
        <a href="${rootPath}listening/home.html" class="nav-link-side ${isListening?'active':''}" onclick="toggleDrawer(false)">
            <span class="drawer-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="15" height="15" stroke-width="2" stroke-linecap="round"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/></svg></span>
            <span>Luyện Nghe</span>
        </a>
        <a href="${rootPath}writing/home.html" class="nav-link-side ${isWriting?'active':''}" onclick="toggleDrawer(false)">
            <span class="drawer-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="15" height="15" stroke-width="2" stroke-linecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></span>
            <span>Luyện Viết</span>
        </a>
        <a href="${rootPath}grammar/home.html" class="nav-link-side ${isGrammar?'active':''}" onclick="toggleDrawer(false)">
            <span class="drawer-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="15" height="15" stroke-width="2" stroke-linecap="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg></span>
            <span>Ngữ Pháp</span>
        </a>
            </div>
        </div>

        <div class="drawer-acc" id="accTools">
            <button class="drawer-acc-head" onclick="window.toggleAcc('accTools')">
                <span class="drawer-acc-lbl"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="16" height="16" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg> Công cụ</span>
                <svg class="drawer-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M6 9l6 6 6-6"/></svg>
            </button>
            <div class="drawer-acc-body">
        <a href="${rootPath}dict.html" class="nav-link-side" onclick="toggleDrawer(false)">
            <span class="drawer-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="15" height="15" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></span>
            <span>Tra Từ Điển</span>
        </a>
        <a href="${rootPath}forum.html" class="nav-link-side" onclick="toggleDrawer(false)">
            <span class="drawer-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="15" height="15" stroke-width="2" stroke-linecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></span>
            <span>Hỏi Đáp</span>
        </a>
        <a href="${rootPath}vocab.html" class="nav-link-side" onclick="toggleDrawer(false)">
            <span class="drawer-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="15" height="15" stroke-width="2" stroke-linecap="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg></span>
            <span>Sổ Từ Vựng</span>
        </a>
        <a href="${rootPath}dailynews.html" class="nav-link-side" onclick="toggleDrawer(false)">
            <span class="drawer-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="15" height="15" stroke-width="2" stroke-linecap="round"><path d="M4 11a9 9 0 0 1 9 9"/><path d="M4 4a16 16 0 0 1 16 16"/><circle cx="5" cy="19" r="1"/></svg></span>
            <span>Đọc Báo</span>
        </a>
        <a href="${rootPath}hanhan.html" class="nav-link-side" onclick="toggleDrawer(false)">
            <span class="drawer-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="15" height="15" stroke-width="2" stroke-linecap="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg></span>
            <span>Hán Hàn</span>
        </a>
        <a href="${rootPath}video/home.html" class="nav-link-side" onclick="toggleDrawer(false)">
            <span class="drawer-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="15" height="15" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><polygon points="10,8 16,12 10,16"/></svg></span>
            <span>Học qua Video</span>
        </a>
        <a href="${rootPath}games/home.html" class="nav-link-side" onclick="toggleDrawer(false)">
            <span class="drawer-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="15" height="15" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="6" y1="12" x2="10" y2="12"/><line x1="8" y1="10" x2="8" y2="14"/><line x1="15" y1="13" x2="15.01" y2="13"/><line x1="18" y1="11" x2="18.01" y2="11"/><rect x="2" y="6" width="20" height="12" rx="6"/></svg></span>
            <span>Trò Chơi</span>
        </a>
            </div>
        </div>

        <div class="drawer-acc" id="accSettings">
            <button class="drawer-acc-head" onclick="window.toggleAcc('accSettings')">
                <span class="drawer-acc-lbl"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="16" height="16" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg> Cài đặt</span>
                <svg class="drawer-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M6 9l6 6 6-6"/></svg>
            </button>
            <div class="drawer-acc-body">
        <button class="nav-link-side" onclick="window.THEME && window.THEME.openPopup()">
            <span class="drawer-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="15" height="15" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg></span>
            <span>Đổi Giao Diện</span>
        </button>
        <a href="${rootPath}feedback.html" class="nav-link-side" onclick="toggleDrawer(false)">
            <span class="drawer-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="15" height="15" stroke-width="2" stroke-linecap="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg></span>
            <span>Góp ý</span>
        </a>
        <a href="${rootPath}data.html" class="nav-link-side" id="drawerDashboardLink" onclick="toggleDrawer(false)" style="display:none;">
            <span class="drawer-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="15" height="15" stroke-width="2" stroke-linecap="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg></span>
            <span>Dashboard</span>
        </a>
        <button class="auth-logout-btn" onclick="window.logoutUser()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="15" height="15" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            <span>Đăng xuất</span>
        </button>
            </div>
        </div>
    </div>`;

    document.body.insertAdjacentHTML('afterbegin', navHTML);

    // Sync gradient mask
    const syncMask = () => {
        const mask = document.getElementById('topGradientMask');
        if (!mask) return;
        const g = getComputedStyle(document.documentElement).getPropertyValue('--random-bg-gradient').trim()
                  || 'linear-gradient(135deg,#e0c3fc,#8ec5fc)';
        mask.style.background = g;
        mask.style.backgroundAttachment = 'fixed';
    };
    setTimeout(syncMask, 50);

    // Avatar
    window.handleAvatarClick = () => {
        const modal = document.getElementById('authModal');
        if (typeof firebase !== 'undefined' && firebase.auth && firebase.auth().currentUser) {
            window.location.href = `${rootPath}mypage.html`;
        } else if (modal) { modal.style.display = 'flex'; }
        else { window.location.href = `${rootPath}index.html`; }
    };

    setTimeout(() => {
        if (typeof firebase !== 'undefined' && firebase.auth) {
            firebase.auth().onAuthStateChanged(user => {
                const btn = document.getElementById('navAvatarBtn');
                const drawerAuth = document.getElementById('drawerAuth');
                if (user) {
                    if (btn) {
                        btn.style.cssText += 'color:#2563eb;background:rgba(37,99,235,.1);border-color:rgba(37,99,235,.2)';
                        btn.title = user.displayName || user.email;
                        btn.onclick = () => { 
                            if (window.location.pathname.includes('forum.html')) {
                                if (typeof window.handleAvatarClick === 'function') window.handleAvatarClick();
                            } else {
                                window.location.href = `${rootPath}mypage.html`; 
                            }
                        };
                    }
                    const ADMIN_EMAILS = ['nmhieu2526@gmail.com', 'vuihoctienghan27@gmail.com'];
                    const dashLink = document.getElementById('drawerDashboardLink');
                    if (dashLink && ADMIN_EMAILS.includes(user.email)) {
                        dashLink.style.display = '';
                    }
                    // Drawer: thẻ người dùng (tên + chức danh + streak) → bấm vào về mypage
                    if (drawerAuth) {
                        const uName = user.displayName || user.email || 'Học viên';
                        const uAvatar = user.photoURL || '';
                        drawerAuth.innerHTML = `
                            <a href="${rootPath}mypage.html" onclick="toggleDrawer(false)" class="auth-user">
                                <img src="${uAvatar || ''}" alt="" referrerpolicy="no-referrer" onerror="this.style.display='none'">
                                <span class="auth-user-info">
                                    <span class="auth-user-name">${uName.replace(/[<>&"']/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&#39;'}[c]))}</span>
                                    <span class="auth-user-role">Đang tải...</span>
                                    <span class="auth-user-streak">🔥 …</span>
                                </span>
                                <svg class="auth-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" width="16" height="16" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>
                            </a>`;
                        try {
                            firebase.firestore().collection('users').doc(user.uid).get().then(function (doc) {
                                if (!doc.exists) return;
                                const d = doc.data();
                                const roleEl = drawerAuth.querySelector('.auth-user-role');
                                if (roleEl) {
                                    // Chức danh = hạng thành viên theo tổng EXP (Thường Dân → Trạng Nguyên)
                                    const totalExp = Math.max(0, Math.floor((d.totalStudyMinutes || 0) / 10) * 5 + (d.bonusEXP || 0));
                                    roleEl.innerText = memberRank(totalExp);
                                }
                                const streakEl = drawerAuth.querySelector('.auth-user-streak');
                                if (streakEl) streakEl.innerText = '🔥 ' + (d.streakDays || 1) + ' ngày streak';
                            }).catch(function () {});
                        } catch (e) {}
                    }
                } else {
                    // Drawer: nút đăng nhập
                    if (drawerAuth) {
                        drawerAuth.innerHTML = `
                            <button class="auth-login-btn" onclick="window.handleAvatarClick()">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="18" height="18" stroke-width="2" stroke-linecap="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
                                <span>Đăng nhập</span>
                            </button>`;
                    }
                }
            });
        }
    }, 300);

    // Accordion đóng/mở cho drawer
    window.toggleAcc = function (id) {
        const acc = document.getElementById(id);
        if (acc) acc.classList.toggle('open');
    };

    // Hạng thành viên theo tổng EXP (đồng bộ mypage.html getLevelInfo)
    function memberRank(exp) {
        if (exp > 3000) return '👑 Trạng Nguyên';
        if (exp >= 1001) return '📜 Thượng Thư';
        if (exp >= 401) return '🖋️ Tú Tài';
        if (exp >= 51) return '🕯️ Sĩ Tử';
        return '🌱 Thường Dân';
    }

    // Tự mở mục đang active khi load
    setTimeout(function () {
        document.querySelectorAll('.drawer-acc').forEach(function (acc) {
            if (acc.querySelector('.nav-link-side.active')) acc.classList.add('open');
        });
    }, 400);

    // Đăng xuất
    window.logoutUser = function () {
        if (typeof firebase !== 'undefined' && firebase.auth) {
            firebase.auth().signOut().then(function () {
                if (typeof toggleDrawer === 'function') toggleDrawer(false);
                window.location.href = rootPath + 'index.html';
            }).catch(function () {
                if (typeof toggleDrawer === 'function') toggleDrawer(false);
                window.location.href = rootPath + 'index.html';
            });
        } else {
            window.location.href = rootPath + 'index.html';
        }
    };

    // Audio player
    const nav = document.getElementById('globalNavbar');
    const player = document.getElementById('sticky-audio-player');
    if (nav && player) { nav.appendChild(player); player.classList.add('integrated-player'); }

    // Vocab toggle button
    window.toggleVocab = function() {
        const btn = document.getElementById('globalVocabBtn');
        if (!btn || btn.disabled) return;
        if (document.body.classList.contains('vocab-disabled')) {
            document.body.classList.remove('vocab-disabled');
        } else {
            document.body.classList.add('vocab-disabled');
        }
        localStorage.setItem('vocabEnabled', !document.body.classList.contains('vocab-disabled'));
    };

    // Global logic & Vocab scripts
    ['user-profile-popup.js', 'vocab-external.js','vocab-dictionary.js','hover-lookup.js','vocab-stats.js'].forEach(f => {
        if (!document.querySelector(`script[src*="${f}"]`)) {
            const s = document.createElement('script');
            s.src = `${rootPath}assets/js/${f}`; s.async = false;
            document.body.appendChild(s);
        }
    });
});

===== END FILE: public/assets/js/navbar.js =====

===== FILE: public/assets/js/theme-picker.js =====
/* ==========================================================================
   THEME-PICKER.JS — Random gradient + Dark mode + Popup chọn theme
   Chạy ngay khi script load (không cần DOMContentLoaded)
   ========================================================================== */

window.THEME = (() => {
    const LS_KEY = 'userTheme';

    const GRADIENTS = [
        // Pastel nhẹ
        { name: 'Tím & Xanh dương',   value: 'linear-gradient(135deg,#e0c3fc,#8ec5fc)' },
        { name: 'Hồng & Xanh lơ',     value: 'linear-gradient(135deg,#fbc2eb,#a6c1ee)' },
        { name: 'Xanh biển & Ngọc',   value: 'linear-gradient(135deg,#a1c4fd,#c2e9fb)' },
        { name: 'Cam & Hồng đào',     value: 'linear-gradient(135deg,#ffecd2,#fcb69f)' },
        { name: 'Chanh & Xanh lá',    value: 'linear-gradient(135deg,#d4fc79,#96e6a1)' },
        { name: 'Hồng & Trắng hồng',  value: 'linear-gradient(135deg,#ff9a9e,#fecfef)' },
        { name: 'Tím đậm & Hồng',     value: 'linear-gradient(135deg,#a18cd1,#fbc2eb)' },
        { name: 'Mint & Xanh dương',  value: 'linear-gradient(135deg,#84fab0,#8fd3f4)' },
        { name: 'Cam sữa & Tím',      value: 'linear-gradient(135deg,#fccb90,#d57eeb)' },
        { name: 'Vàng nắng & Ngọc',   value: 'linear-gradient(135deg,#f8ffae,#43c6ac)' },
        { name: 'Bạc sương & Trắng',  value: 'linear-gradient(135deg,#c3cfe2,#f5f7fa)' },
        { name: 'Vàng mật & Băng',    value: 'linear-gradient(135deg,#fddb92,#d1fdff)' },
        // Rực rỡ
        { name: 'San hô & Vàng',      value: 'linear-gradient(135deg,#ff6b6b,#feca57)' },
        { name: 'Dương xỉ & Ngọc',    value: 'linear-gradient(135deg,#43e97b,#38f9d7)' },
        { name: 'Tím hoàng hôn',      value: 'linear-gradient(135deg,#667eea,#764ba2)' },
        { name: 'Cam cháy & Vàng',    value: 'linear-gradient(135deg,#f83600,#f9d423)' },
        { name: 'Xanh dương đậm',     value: 'linear-gradient(135deg,#4facfe,#00f2fe)' },
        { name: 'Hồng rubi & Tím',    value: 'linear-gradient(135deg,#f093fb,#f5576c)' },
        { name: 'Xanh lá & Vàng',     value: 'linear-gradient(135deg,#11998e,#38ef7d)' },
        { name: 'Hồng cánh sen',      value: 'linear-gradient(135deg,#fddb92,#ff758c)' },
        { name: 'Biển đêm',           value: 'linear-gradient(135deg,#2193b0,#6dd5ed)' },
        { name: 'Mây tím',            value: 'linear-gradient(135deg,#cc2b5e,#753a88)' },
        { name: 'Bình minh',          value: 'linear-gradient(135deg,#f7971e,#ffd200)' },
        { name: 'Lá mùa thu',         value: 'linear-gradient(135deg,#f46b45,#eea849)' },
        // Đa sắc
        { name: 'Cầu vồng nhạt',      value: 'linear-gradient(135deg,#ffeaa7,#a29bfe,#fd79a8)' },
        { name: 'Hoa oải hương',      value: 'linear-gradient(135deg,#dfe6e9,#b2bec3,#a29bfe)' },
        { name: 'Xanh ngọc tươi',     value: 'linear-gradient(135deg,#0cebeb,#20e3b2,#29ffc6)' },
        { name: 'Lá thư mùa xuân',   value: 'linear-gradient(135deg,#c6f6d5,#bee3f8,#e9d8fd)' },
        { name: 'Mưa hồng',           value: 'linear-gradient(135deg,#e0c3fc,#fbc2eb,#a1c4fd)' },
        { name: 'Hoàng hôn đỏ',       value: 'linear-gradient(135deg,#ff9966,#ff5e62)' },
        { name: 'Bầu trời đêm',       value: 'linear-gradient(135deg,#373b44,#4286f4)' },
        { name: 'Xuân xanh',          value: 'linear-gradient(135deg,#c1dfc4,#deecdd)' },
        { name: 'Cam ánh hồng',       value: 'linear-gradient(135deg,#fda085,#f6d365)' },
        { name: 'Xanh lam nhạt',      value: 'linear-gradient(135deg,#89f7fe,#66a6ff)' },
        { name: 'Hoa anh đào',        value: 'linear-gradient(135deg,#f8cdda,#1d2b64)' },
        { name: 'Tím bạo',            value: 'linear-gradient(135deg,#da22ff,#9733ee)' },
        { name: 'Xanh dương Navy',    value: 'linear-gradient(135deg,#1e3c72,#2a5298)' },
        { name: 'Xanh lá đậm',        value: 'linear-gradient(135deg,#134e5e,#71b280)' },
        { name: 'Hoa mặt trời',       value: 'linear-gradient(135deg,#f2994a,#f2c94c)' },
        { name: 'Xanh đại dương',     value: 'linear-gradient(135deg,#005c97,#363795)' },
        { name: 'Hoa cúc trắng',      value: 'linear-gradient(135deg,#ffffff,#e0e0e0)' },
    ];

    function getSaved() { return localStorage.getItem(LS_KEY); }

    function applyGrad(g) {
        // Đồng bộ tất cả cùng lúc: html + body + mask → không bị seam
        document.documentElement.style.setProperty('--random-bg-gradient', g);
        // html element: dùng backgroundImage để background-attachment:fixed hoạt động đúng
        document.documentElement.style.backgroundImage = g.startsWith('linear') || g.startsWith('radial') ? g : 'none';
        document.documentElement.style.backgroundAttachment = 'fixed';
        document.documentElement.style.backgroundSize = 'cover';
        if (document.body) {
            document.body.style.cssText += `;background:${g}!important;background-attachment:fixed!important;`;
            document.body.classList.remove('dark-mode');
        }
        // Sync mask ngay lập tức
        const mask = document.getElementById('topGradientMask');
        if (mask) {
            mask.style.background = g;
            mask.style.backgroundAttachment = 'fixed';
        }
    }

    function applyDark() {
        const dark = 'linear-gradient(135deg,#0f172a,#1e293b)';
        document.documentElement.style.setProperty('--random-bg-gradient', dark);
        document.documentElement.style.backgroundImage = 'none';
        document.documentElement.style.backgroundAttachment = 'fixed';
        if (document.body) {
            document.body.style.cssText += `;background:${dark}!important;background-attachment:fixed!important;`;
            document.body.classList.add('dark-mode');
        }
        const mask = document.getElementById('topGradientMask');
        if (mask) {
            mask.style.background = dark;
            mask.style.backgroundAttachment = 'fixed';
        }
    }

    function init() {
        const saved = getSaved();
        if (saved === 'dark') {
            // Set CSS var early, apply body after DOM
            document.documentElement.style.setProperty('--random-bg-gradient', 'linear-gradient(135deg,#0f172a,#1e293b)');
            document.documentElement.style.background = 'linear-gradient(135deg,#0f172a,#1e293b)';
            document.addEventListener('DOMContentLoaded', applyDark);
        } else if (saved && saved.startsWith('gradient:')) {
            const g = saved.slice(9);
            document.documentElement.style.setProperty('--random-bg-gradient', g);
            document.documentElement.style.background = g;
            document.addEventListener('DOMContentLoaded', () => applyGrad(g));
        } else {
            // Mặc định: Tím & Xanh dương (lần đầu truy cập)
            const defaultGrad = 'linear-gradient(135deg,#e0c3fc,#8ec5fc)';
            document.documentElement.style.setProperty('--random-bg-gradient', defaultGrad);
            document.documentElement.style.background = defaultGrad;
            document.addEventListener('DOMContentLoaded', () => applyGrad(defaultGrad));
        }
    }

    function selectGradient(g) {
        localStorage.setItem(LS_KEY, 'gradient:' + g);
        applyGrad(g);
        closePopup();
    }

    function selectDark() {
        localStorage.setItem(LS_KEY, 'dark');
        applyDark();
        closePopup();
    }

    function selectRandom() {
        localStorage.removeItem(LS_KEY);
        const chosen = GRADIENTS[Math.floor(Math.random() * GRADIENTS.length)].value;
        applyGrad(chosen);
        closePopup();
    }

    function openPopup() {
        // Xóa popup cũ nếu có (cho phép mở lại)
        closePopup();

        const saved = getSaved();
        const isDark = saved === 'dark';
        const currentG = saved && saved.startsWith('gradient:') ? saved.slice(9) : '';

        const overlay = document.createElement('div');
        overlay.id = 'themePickerOverlay';
        overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.45);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);';
        overlay.addEventListener('click', (e) => { if (e.target === overlay) closePopup(); });

        const tc = isDark ? '#f1f5f9' : '#1f2937';
        const sc = isDark ? '#94a3b8' : '#6b7280';
        const boxBg = isDark ? 'rgba(15,23,42,0.93)' : 'rgba(255,255,255,0.88)';
        const boxBorder = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.7)';
        const divBg = isDark ? 'rgba(255,255,255,0.06)' : '#f8fafc';
        const rndBg = 'rgba(37,99,235,0.1)';
        const drkBorderC = isDark ? '#60a5fa' : 'rgba(0,0,0,0.12)';
        const drkBg = isDark ? 'rgba(96,165,250,0.15)' : 'rgba(15,23,42,0.08)';
        const drkTc = isDark ? '#60a5fa' : '#374151';

        const box = document.createElement('div');
        box.style.cssText = `background:${boxBg};backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);border:1px solid ${boxBorder};border-radius:20px;box-shadow:0 8px 40px rgba(0,0,0,0.2);padding:24px;width:min(540px,93vw);max-height:82vh;overflow-y:auto;font-family:"Pretendard","Inter",sans-serif;`;

        box.innerHTML = `
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:18px;">
                <div>
                    <div style="font-size:1.1em;font-weight:800;color:${tc};">Chọn Giao Diện</div>
                    <div style="font-size:0.78em;color:${sc};margin-top:2px;">Lựa chọn được lưu tự động</div>
                </div>
                <button id="themePickerClose" style="width:30px;height:30px;background:rgba(0,0,0,.06);border:none;border-radius:8px;cursor:pointer;display:flex;align-items:center;justify-content:center;color:${sc};">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="14" height="14" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
            </div>
            <div style="font-size:0.7em;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:${sc};margin-bottom:8px;">Chế độ</div>
            <div style="display:flex;gap:8px;margin-bottom:18px;">
                <button id="btnPickRandom" style="flex:1;padding:9px;border-radius:10px;border:2px solid rgba(37,99,235,0.3);background:${rndBg};color:#2563eb;font-weight:700;font-size:0.85em;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="14" height="14" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
                    Ngẫu nhiên
                </button>
                <button id="btnPickDark" style="flex:1;padding:9px;border-radius:10px;border:2px solid ${drkBorderC};background:${drkBg};color:${drkTc};font-weight:700;font-size:0.85em;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="14" height="14" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
                    Chế độ tối
                </button>
            </div>
            <div style="font-size:0.7em;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:${sc};margin-bottom:10px;">Màu nền</div>
            <div id="gradientGrid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(68px,1fr));gap:8px;"></div>
        `;

        const grid = box.querySelector('#gradientGrid');
        GRADIENTS.forEach(g => {
            const btn = document.createElement('button');
            const isActive = g.value === currentG;
            btn.title = g.name;
            btn.style.cssText = `height:52px;border-radius:10px;background:${g.value};border:${isActive ? '3px solid #2563eb' : '2px solid rgba(255,255,255,0.4)'};cursor:pointer;box-shadow:0 2px 6px rgba(0,0,0,0.1);transition:transform 0.15s;position:relative;overflow:hidden;`;
            if (isActive) btn.innerHTML = '<span style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#fff;font-size:1.1em;text-shadow:0 1px 3px rgba(0,0,0,0.5);">✓</span>';
            btn.onmouseenter = () => { btn.style.transform = 'scale(1.08)'; };
            btn.onmouseleave = () => { btn.style.transform = ''; };
            btn.onclick = (e) => { e.stopPropagation(); selectGradient(g.value); };
            grid.appendChild(btn);
        });

        overlay.appendChild(box);
        document.body.appendChild(overlay);

        box.querySelector('#themePickerClose').onclick = closePopup;
        box.querySelector('#btnPickRandom').onclick = (e) => { e.stopPropagation(); selectRandom(); };
        box.querySelector('#btnPickDark').onclick = (e) => { e.stopPropagation(); selectDark(); };
    }

    function closePopup() {
        const el = document.getElementById('themePickerOverlay');
        if (el) el.remove();
    }

    // Chạy ngay
    init();

    return { openPopup, closePopup, selectGradient, selectDark, selectRandom, GRADIENTS, getSaved };
})();

===== END FILE: public/assets/js/theme-picker.js =====

===== FILE: public/assets/js/theme.js =====
// ===== TỰ ĐỘNG BƠM FOOTER VÀO CUỐI MỌI TRANG =====
document.addEventListener("DOMContentLoaded", function() {
    if (!document.querySelector('footer.global-footer')) {
        const style = document.createElement('style');
        style.innerHTML = `
            .global-footer { max-width:950px;margin:20px auto 30px;background:rgba(255,255,255,0.25);backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);border:1px solid rgba(255,255,255,0.4);border-radius:20px;padding:18px 20px;display:flex;justify-content:center;align-items:center;box-shadow:0 10px 25px rgba(0,0,0,0.05); }
            body.dark-mode .global-footer { background:rgba(15,23,42,0.4);border-color:rgba(255,255,255,0.1); }
            .global-footer a.footer-link { display:flex;align-items:center;gap:10px;text-decoration:none;color:inherit;font-weight:700;font-size:1.05em;transition:0.2s; }
            .global-footer a.footer-link:hover { transform:translateY(-2px);color:#1877f2; }
            .global-footer .footer-fb-icon { width:24px;height:24px;fill:currentColor; }
            @media(max-width:1399px) { .global-footer { max-width:950px; } }
            @media(max-width:768px) { .global-footer { margin:15px 4px 25px;border-radius:18px; } }
        `;
        document.head.appendChild(style);

        const footerHTML = `
<footer class="global-footer" id="global-auto-footer">
    <a href="https://www.facebook.com/groups/vuihoctienghan.online" target="_blank" rel="noopener noreferrer" class="footer-link">
        <span>📚 Vui Học Tiếng Hàn</span>
        <svg class="footer-fb-icon" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
    </a>
</footer>
        `;
        document.body.insertAdjacentHTML('beforeend', footerHTML);
    }
});

===== END FILE: public/assets/js/theme.js =====

===== FILE: public/assets/js/menu.js =====
/* ==========================================================================
   MENU.JS — Chỉ export hàm toggleDrawer (HTML được navbar.js inject)
   ========================================================================== */

window.toggleDrawer = function(isOpen) {
    const d = document.getElementById('sideDrawer');
    const o = document.getElementById('drawerOverlay');
    if (!d || !o) return;
    if (isOpen) {
        d.classList.add('open');
        o.classList.add('show');
        document.body.style.overflow = 'hidden'; // Khóa scroll khi drawer mở
    } else {
        d.classList.remove('open');
        o.classList.remove('show');
        document.body.style.overflow = '';
    }
};

// Đóng drawer khi nhấn ESC
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') window.toggleDrawer(false);
});

===== END FILE: public/assets/js/menu.js =====

===== FILE: public/assets/js/script.js =====
/* ==========================================================================
   TOPIK EDTECH - JAVASCRIPT MASTER (BẢN FIX LỖI TẢI TRANG ĐỀ THI)
   ========================================================================== */

// RANDOM BACKGROUND GRADIENT CHO MỖI LẦN TRUY CẬP
(function() {
    const gradients = [
        'linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%)', // Tím nhạt - Xanh dương
        'linear-gradient(135deg, #fbc2eb 0%, #a6c1ee 100%)', // Hồng nhạt - Xanh lơ
        'linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%)', // Xanh biển - Xanh ngọc
        'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)', // Cam nhạt - Hồng đào
        'linear-gradient(135deg, #d4fc79 0%, #96e6a1 100%)', // Vàng chanh - Xanh lá nhạt
        'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)', // Hồng đào - Trắng hồng
        'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)', // Tím đậm - Hồng nhạt
        'linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%)', // Xanh mint - Xanh dương
        'linear-gradient(135deg, #fccb90 0%, #d57eeb 100%)', // Cam sữa - Tím môn
        'linear-gradient(135deg, #f8ffae 0%, #43c6ac 100%)', // Vàng nắng - Xanh ngọc
        'linear-gradient(135deg, #c3cfe2 0%, #f5f7fa 100%)', // Bạc sương - Trắng
        'linear-gradient(135deg, #fddb92 0%, #d1fdff 100%)'  // Vàng mật - Xanh băng
    ];
    const chosen = gradients[Math.floor(Math.random() * gradients.length)];
    // Ghi vào CSS variable VÀ trực tiếp vào body để tránh flash
    document.documentElement.style.setProperty('--random-bg-gradient', chosen);
    // Lưu vào sessionStorage để đồng bộ giữa các tab trong cùng phiên
    sessionStorage.setItem('bgGradient', chosen);
})();

document.addEventListener("DOMContentLoaded", function() {
    // Sử dụng TreeWalker để duyệt qua tất cả các nốt văn bản (Text Nodes) trên trang
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
    let node;
    
    // Regex tìm chuỗi có dạng hoặc và cả khoảng trắng dư thừa phía trước
    const citeRegex = /\s*\+\]/gi;
    
    while(node = walker.nextNode()) {
        // Nếu phát hiện đoạn text chứa mã rác, tiến hành xóa nó đi
        if (citeRegex.test(node.nodeValue)) {
            node.nodeValue = node.nodeValue.replace(citeRegex, "");
        }
    }
});

// 1. BIẾN TOÀN CỤC
let uid = null;
let myVocabList = [];
let examVocabList = [];
let currentStudyList = [];
let studyContext = '';

// Lưu trữ danh sách thư mục của user
window.userVocabLists = ['Đã lưu'];
window.savedVocabSet = new Set();

// ===== DARK MODE & GIAO DIỆN CHUNG (CHỜ TẢI TRANG XONG MỚI CHẠY) =====
document.addEventListener('DOMContentLoaded', () => {
    if (localStorage.getItem('darkMode') === 'true') document.body.classList.add('dark-mode');
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            document.body.classList.toggle('dark-mode');
            localStorage.setItem('darkMode', document.body.classList.contains('dark-mode'));
        });
    }

    // Navbar được quản lý bởi navbar.js (không inject ở đây)
});


// Đọc phát âm
function speakText(text) {
    if (!text || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text); u.lang = 'ko-KR'; u.rate = 0.85;
    window.speechSynthesis.speak(u);
}

// ========================================================
// ĐỒNG BỘ DỮ LIỆU USER & FOLDERS TỪ VỰNG
// ========================================================
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if (typeof firebase !== 'undefined' && firebase.auth) {
            firebase.auth().onAuthStateChanged(user => {
                if (user && firebase.firestore) {
                    uid = user.uid;
                    const db = firebase.firestore();
                    
                    db.collection('users').doc(uid).onSnapshot(doc => {
                        if (doc.exists) {
                            let data = doc.data();
                            let lists = data.vocabLists || [];
                            
                            // Tự động chuyển Mặc định thành Đã lưu và ưu tiên hiển thị đầu
                            if (lists.includes('Mặc định')) lists[lists.indexOf('Mặc định')] = 'Đã lưu';
                            if (!lists.includes('Đã lưu')) lists.unshift('Đã lưu');
                            
                            window.userVocabLists = lists;
                        } else {
                            window.userVocabLists = ['Đã lưu'];
                        }
                    });

                    db.collection('users').doc(uid).collection('vocabulary').onSnapshot(snap => {
                        window.savedVocabSet.clear();
                        snap.forEach(d => window.savedVocabSet.add(d.id));
                    });
                } else {
                    window.savedVocabSet.clear();
                    uid = null;
                }
            });
        }
    }, 500);
});

// ========================================================
// LOGIC GAME ĐỀ THI
// ========================================================
let isExamMode = false, isExamSubmitted = false, timeLeft = 70 * 60, examTimer = null;
let globalExamSeconds = 0; let globalExamInterval = null;

window.selectMode = (mode) => {
    document.body.classList.add('app-started');
    const startScreen = document.getElementById('startScreen');
    if (startScreen) startScreen.style.display = 'none';
    window.learningActive = true;
    if (mode === 'exam') {
        isExamMode = true;
        const ec = document.getElementById('examControls'); if (ec) ec.style.display = 'block';
        const tog = document.getElementById('globalVocabToggle');
        if (tog) { tog.checked = false; window.toggleGlobalVocab(); }
        startTimer();
    } else { isExamMode = false; }
    
    if (!globalExamInterval) {
        globalExamInterval = setInterval(() => {
            globalExamSeconds++;
            if (globalExamSeconds >= 60) {
                globalExamSeconds = 0;
                saveExamTime();
            }
        }, 1000);
    }
};

function saveExamTime() {
    if (typeof firebase === 'undefined' || !firebase.auth().currentUser) return;

    // Thời gian học (totalStudyMinutes / dailyStudyData) do activity-tracker.js đếm
    // (chạy song song trên mọi trang có activity-tracker) — không cộng lại ở đây.

    let sessionMins = parseInt(sessionStorage.getItem('studySessionMins') || '0');
    sessionMins++;
    sessionStorage.setItem('studySessionMins', sessionMins);

    let updates = {};

    if (sessionMins === 60) {
        updates.bonusEXP = firebase.firestore.FieldValue.increment(10);
        if (typeof Swal !== 'undefined') {
            Swal.fire({icon: 'success', title: 'Tuyệt vời!', text: '🎉 Chúc mừng! Bạn đã giải đề liên tục 1 giờ và nhận được 10 EXP!', confirmButtonColor: '#2563eb'});
        } else {
            alert("🎉 Chúc mừng! Bạn đã giải đề liên tục 1 giờ và nhận được 10 EXP!");
        }
    }
    if (Object.keys(updates).length > 0) {
        firebase.firestore().collection("users").doc(firebase.auth().currentUser.uid).set(updates, {merge: true});
    }
}

function startTimer() {
    if (examTimer) clearInterval(examTimer);
    timeLeft = 70 * 60; updateTimerDisplay();
    examTimer = setInterval(() => {
        timeLeft--; updateTimerDisplay();
        if (timeLeft <= 0) { clearInterval(examTimer); window.submitExam(); }
    }, 1000);
}
function updateTimerDisplay() {
    const m = Math.floor(timeLeft / 60), s = timeLeft % 60;
    const el = document.getElementById('timerDisplay');
    if (el) el.innerText = (m < 10 ? '0'+m : m) + ':' + (s < 10 ? '0'+s : s);
}

window.lastScrollPositionBeforeExplain = window.lastScrollPositionBeforeExplain || 0;

window.toggleExplain = (btn) => {
    const content = btn.nextElementSibling;
    if (!content) return;
    if (typeof Swal === 'undefined') {
        content.style.display = (content.style.display === 'block') ? 'none' : 'block';
        return;
    }
    const html = content.innerHTML;
    Swal.fire({
        title: '📖 Giải thích chi tiết',
        html: `<div class="explain-popup-body" style="text-align:left;max-height:70vh;overflow-y:auto;line-height:1.7;padding-right:4px;">${html}</div>`,
        width: 'min(920px, 95vw)',
        showConfirmButton: false,
        showCloseButton: true,
        background: 'var(--bg-card)',
        color: 'var(--primary-text)',
        customClass: { popup: 'explain-popup' }
    });
};

document.addEventListener('click', function(e) {
    if (e.target.closest('.btn-explain')) return;
    if (e.target.closest('.vocab-word') || e.target.closest('.review-link')) return;

    // Check if clicked the injected close button
    const isCloseBtn = e.target.closest('.btn-close-explain-injected');

    const openExplains = document.querySelectorAll('.explanation-content[style*="display: block"]');
    if (openExplains.length > 0) {
        openExplains.forEach(el => el.style.display = 'none');
        // Only scroll back if the user explicitly clicked the close button
        if (isCloseBtn) {
            window.scrollTo({ top: window.lastScrollPositionBeforeExplain, behavior: 'instant' });
        }
    }
});

window.toggleGlobalVocab = () => { 
    const tog = document.getElementById('globalVocabToggle'); 
    if (tog) {
        if (tog.checked) {
            document.body.classList.remove('vocab-disabled'); 
        } else {
            document.body.classList.add('vocab-disabled'); 
        }
    } else {
        document.body.classList.toggle('vocab-disabled');
    }
    localStorage.setItem('vocabEnabled', !document.body.classList.contains('vocab-disabled'));
};

window.checkAnswer = (el, isCorrect_Original) => {
    if (isExamSubmitted) return;
    const opts = el.parentElement.querySelectorAll('.option');
    if (isExamMode) { opts.forEach(opt => opt.classList.remove('selected')); el.classList.add('selected'); } 
    else {
        if (Array.from(opts).some(opt => opt.classList.contains('correct')) || el.classList.contains('wrong')) return;
        if (el.dataset.isCorrect === 'true' || isCorrect_Original) {
            el.classList.add('correct');
            const actArea = el.closest('.question-block')?.querySelector('.action-area');
            if (actArea) actArea.style.display = 'block';
        } else { el.classList.add('wrong'); }
    }
};

window.submitExam = () => {
    if (timeLeft > 0 && !confirm('Bạn có chắc muốn nộp bài không?')) return;
    clearInterval(examTimer); isExamSubmitted = true;
    const ec = document.getElementById('examControls'); if (ec) ec.style.display = 'none';
    let correctCount = 0, gridHTML = '';
    const blocks = document.querySelectorAll('.question-block');
    blocks.forEach((block, index) => {
        const optCont = block.querySelector('.options'); if (!optCont) return;
        const selOpt = optCont.querySelector('.option.selected');
        const corOpt = optCont.querySelector('[data-is-correct="true"]') || optCont.querySelector('[onclick*="true"]');
        let isCor = false;
        if (selOpt) {
            if (selOpt.dataset.isCorrect === 'true' || (selOpt.getAttribute('onclick') || '').includes('true')) { selOpt.classList.add('correct'); correctCount++; isCor = true; } 
            else { selOpt.classList.add('wrong'); if (corOpt) corOpt.classList.add('correct'); }
        } else if (corOpt) corOpt.classList.add('correct');
        const actArea = block.querySelector('.action-area'); if (actArea) actArea.style.display = 'block';
        const qNum = block.querySelector('.q-number'); const qText = qNum ? qNum.innerText.replace('.','').trim() : (index + 1);
        gridHTML += `<div class="q-status-item ${isCor ? 'q-correct' : 'q-wrong'}">${qText}</div>`;
    });
    const score = correctCount * 2;
    const ccEl = document.getElementById('correctCountText'); const tcEl = document.getElementById('totalCountText'); const fsEl = document.getElementById('finalScoreText'); const qsEl = document.getElementById('questionStatusGrid');
    if (ccEl) ccEl.innerText = correctCount; if (tcEl) tcEl.innerText = blocks.length; if (fsEl) fsEl.innerText = score; if (qsEl) qsEl.innerHTML = gridHTML;
    
    const circle = document.querySelector('.score-circle');
    if (circle) {
        circle.style.setProperty('--progress', '0%');
        if (score > 0) {
            let p = 0;
            const iv = setInterval(() => {
                if (p >= score) clearInterval(iv);
                else { p++; circle.style.setProperty('--progress', p + '%'); }
            }, 15);
        }
    }

    const rm = document.getElementById('examResultModal'); if (rm) rm.style.display = 'flex';
    if (score >= 60 && typeof confetti === 'function') confetti({ particleCount: 200, spread: 100, zIndex: 999999 });
    
    const tg = document.getElementById('globalVocabToggle'); 
    if (tg) { tg.checked = true; window.toggleGlobalVocab(); }
};

window.closeResultAndReview = () => { document.getElementById('examResultModal').style.display = 'none'; window.scrollTo({ top: 0, behavior: 'smooth' }); };
document.addEventListener("DOMContentLoaded", function() {
    // 1. Xóa các node văn bản chứa từ khóa rác
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
    let node;
    const garbageRegex = /\[?(cite|source)[:\s]*\d+\]?/gi;
    
    while(node = walker.nextNode()) {
        if (garbageRegex.test(node.nodeValue)) {
            node.nodeValue = node.nodeValue.replace(garbageRegex, "");
        }
    }

    // 2. Xóa các thẻ <cite> vật lý nếu hệ thống tự render thẻ
    const physicalCites = document.querySelectorAll('cite');
    physicalCites.forEach(el => el.remove());
});


// ===== TỰ ĐỘNG BƠM FOOTER VÀO CUỐI MỌI TRANG =====
document.addEventListener("DOMContentLoaded", function() {
    // Kiểm tra xem trang đã có footer chưa để tránh bị nhân đôi
    if (!document.getElementById('global-auto-footer')) {
        const footerHTML = `
        <footer id="global-auto-footer" class="global-footer">
            <div class="footer-content">
                <div class="footer-logo"><img src="assets/img/logo-navbar.png" alt="Vui Học Tiếng Hàn" style="height:32px;width:auto;display:inline-block;vertical-align:middle"></div>
                <p class="footer-slogan">Hệ thống học và luyện thi tiếng Hàn</p>
                <div class="footer-contact">
                    <span>Liên hệ:</span>
                    <a href="https://www.facebook.com/groups/vuihoctienghan.online" target="_blank" rel="noopener noreferrer" class="social-icon" aria-label="Facebook Group">
                        <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
                            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                        </svg>
                    </a>
                </div>
            </div>
        </footer>
        `;
        // Bơm vào vị trí cuối cùng của thẻ body
        document.body.insertAdjacentHTML('beforeend', footerHTML);
    }
});

===== END FILE: public/assets/js/script.js =====

===== FILE: public/index.html =====
<!DOCTYPE html>
<html lang="vi">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Vui Học Tiếng Hàn - Nền Tảng Luyện Thi TOPIK</title>
    <link rel="icon" type="image/png" sizes="16x16"  href="/public/assets/img/favicon.png">
    <meta name="msapplication-TileColor" content="#ffffff">
    <meta name="theme-color" content="#ffffff">
    <meta name="description"
        content="Hệ thống luyện thi TOPIK thông minh với Flashcard từ vựng, minigame và chế độ thi thử chuẩn xác.">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
    <!-- Giao diện bài thi -->
    <link rel="stylesheet" href="assets/css/exam-layout.css">
    <link rel="stylesheet" href="assets/css/exam-controls.css">

    <!-- CSS của riêng Landing Page -->
    <style>
        :root {
            --bg-card: rgba(255,255,255,0.65);
            --bg-card-hover: rgba(255,255,255,0.95);
            --text-main: #1f2937;
            --text-sub: #6b7280;
            --border: rgba(255,255,255,0.5);
            --border-hover: rgba(255,255,255,0.9);
            --primary: #2563eb;
            --correct-bg: #f0fdf4;
            --wrong-bg: #fef2f2;
            --border-color: #e5e7eb;
        }
        body.dark-mode {
            --bg-card: rgba(30,41,59,0.65);
            --bg-card-hover: rgba(30,41,59,0.95);
            --text-main: #f8fafc;
            --text-sub: #94a3b8;
            --border: rgba(255,255,255,0.1);
            --border-hover: rgba(255,255,255,0.25);
            --primary: #60a5fa;
            --correct-bg: rgba(34,197,94,0.1);
            --wrong-bg: rgba(239,68,68,0.1);
            --border-color: #334155;
        }
        * { box-sizing: border-box; }
        body {
            font-family: 'Pretendard','Inter',sans-serif;
            background: linear-gradient(120deg,#e0c3fc 0%,#8ec5fc 100%);
            background-attachment: fixed;
            color: var(--text-main);
            margin: 0;
            padding: 0 0 40px 0;
            overflow-x: hidden;
        }
        body { transition: padding-right 0.35s ease; }
        button,input,select { font-family: 'Pretendard','Inter',sans-serif !important; }

        /* AUTH MODAL */
        #authModal { display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(15,23,42,0.85);z-index:99999;justify-content:center;align-items:center; }
        .auth-box { background:#fff;padding:40px 30px;border-radius:16px;width:90%;max-width:350px;text-align:center;position:relative; }
        body.dark-mode .auth-box { background:#1e293b;color:#f8fafc; }
        .auth-close { position:absolute;top:15px;right:20px;font-size:1.5em;cursor:pointer;color:#64748b;background:none;border:none; }
        #googleAuthBtn { width:100%;background:#fff;color:#0f172a;border:1px solid #cbd5e0;padding:12px;border-radius:8px;font-weight:bold;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:10px;font-size:1em;transition:0.2s; }
        #googleAuthBtn:hover { background:#f8fafc; }
        body.dark-mode #googleAuthBtn { background:#0f172a;border-color:#334155;color:#f8fafc; }

        /* DESKTOP DECORATIONS */
        .desktop-decorations { position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:-1;display:none; }
        @media(min-width:1200px) { .desktop-decorations { display:block; } }
        .floating-img { position:absolute;animation:float 6s ease-in-out infinite;filter:drop-shadow(0 15px 25px rgba(0,0,0,0.15));opacity:0.85; }
        body.dark-mode .floating-img { opacity:0.5; }
        .img-left { top:22%;left:4%;width:130px;animation-delay:0s; }
        .img-right { bottom:28%;right:4%;width:150px;animation-delay:-3s; }
        .img-top-right { top:18%;right:7%;width:100px;animation-delay:-1.5s; }
        .img-bottom-left { bottom:18%;left:7%;width:110px;animation-delay:-4.5s; }
        @keyframes float { 0%,100% { transform:translateY(0px); } 50% { transform:translateY(-20px); } }

        /* WRAPPER */
        .wrapper {
            max-width:950px;margin:0 auto;
            background:rgba(255,255,255,0.25);
            backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);
            border:1px solid var(--border);border-radius:28px;
            padding:25px 28px;
            box-shadow:0 20px 40px rgba(0,0,0,0.08);
            width:100%;
        }
        @media (min-width: 1400px) {
            .wrapper { max-width: 950px; }
        }
        body.dark-mode .wrapper { background:rgba(15,23,42,0.4); }

        /* HERO */
        .hero-section {
            /* Styles replaced by inline styles and image */
            position:relative;
        }

        /* SECTION HEADERS */
        .section-header { display:flex;align-items:center;justify-content:space-between;margin-bottom:18px;padding-bottom:12px;border-bottom:2px dashed rgba(255,255,255,0.4); }
        body.dark-mode .section-header { border-bottom-color:rgba(255,255,255,0.1); }
        .section-title { font-size:1.3em;font-weight:900;margin:0;color:var(--text-main);display:flex;align-items:center;gap:10px; }
        .section-more-link { font-size:0.85em;font-weight:700;color:var(--primary);text-decoration:none;display:flex;align-items:center;gap:4px;transition:0.2s; }
        .section-more-link:hover { opacity:0.8; }

        /* 4 PILLARS */
        .pillars-grid { display:grid;grid-template-columns:repeat(2,1fr);gap:18px;margin-bottom:32px; }
        .pillar-card { background:var(--bg-card);border:1px solid var(--border);border-radius:20px;padding:22px;text-decoration:none;color:var(--text-main);transition:all 0.3s cubic-bezier(0.4,0,0.2,1);display:flex;flex-direction:column;gap:10px;box-shadow:0 4px 15px rgba(0,0,0,0.02); }
        .pillar-card:hover { background:var(--bg-card-hover);border-color:var(--border-hover);transform:translateY(-5px);box-shadow:0 15px 30px rgba(0,0,0,0.08); }
        .pillar-icon-wrapper { width:52px;height:52px;border-radius:16px;display:flex;align-items:center;justify-content:center;font-size:1.7em; }
        .c-read { background:#fee2e2; } .c-listen { background:#e0e7ff; } .c-write { background:#fef3c7; } .c-grammar { background:#dcfce7; }
        body.dark-mode .c-read { background:rgba(239,68,68,0.2); } body.dark-mode .c-listen { background:rgba(99,102,241,0.2); } body.dark-mode .c-write { background:rgba(245,158,11,0.2); } body.dark-mode .c-grammar { background:rgba(34,197,94,0.2); }
        .pillar-title { font-size:1.25em;font-weight:800;margin:0;display:flex;align-items:center;justify-content:space-between; }
        .pillar-desc { font-size:0.9em;color:var(--text-sub);margin:0;line-height:1.5;font-weight:500; }
        .pillar-arrow { color:var(--text-sub);transition:0.3s; }
        .pillar-card:hover .pillar-arrow { color:var(--primary);transform:translateX(4px); }

        /* FEATURED EXAMS */
        .featured-exams-grid { display:grid;grid-template-columns:repeat(2,1fr);gap:14px;margin-bottom:32px; }
        .exam-card { display:flex;align-items:center;justify-content:space-between;padding:18px 22px;background:var(--bg-card);border:1px solid var(--border);border-radius:16px;text-decoration:none;color:var(--text-main);transition:all 0.3s;box-shadow:0 4px 10px rgba(0,0,0,0.03); }
        .exam-card:hover { background:var(--bg-card-hover);border-color:var(--border-hover);transform:translateY(-4px);box-shadow:0 12px 25px rgba(37,99,235,0.12); }
        .exam-info { display:flex;flex-direction:column;gap:6px; }
        .exam-number { font-size:1.2em;font-weight:800;display:flex;align-items:center;gap:8px;flex-wrap:wrap; }
        .badge-hot { background:#fff7ed;color:#ea580c;font-size:0.65em;padding:4px 10px;border-radius:99px;font-weight:800;border:1px solid #ffedd5; }
        .badge-new { background:#eff6ff;color:#2563eb;font-size:0.65em;padding:4px 10px;border-radius:99px;font-weight:800;border:1px solid #dbeafe; }
        body.dark-mode .badge-hot { background:rgba(234,88,12,0.2);border-color:rgba(234,88,12,0.3);color:#fdba74; }
        body.dark-mode .badge-new { background:rgba(37,99,235,0.2);border-color:rgba(37,99,235,0.3);color:#93c5fd; }
        .exam-desc { font-size:0.88em;color:var(--text-sub);font-weight:600; }

        /* ===== DAILY TOPIK WIDGET ===== */
        .daily-topik-widget {
            background:var(--bg-card);border:1px solid var(--border);border-radius:20px;
            overflow:hidden;margin-bottom:32px;box-shadow:0 6px 20px rgba(0,0,0,0.04);
        }
        .dtw-header {
            background:linear-gradient(135deg,#1e40af,#4f46e5);
            padding:16px 22px;color:white;
            display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;
        }
        .dtw-header-left { display:flex;align-items:center;gap:10px; }
        .dtw-header-title { font-size:1.1em;font-weight:800; }
        .dtw-header-sub { font-size:0.8em;opacity:0.85;margin-top:2px; }
        .dtw-toggle-row { display:flex;gap:8px; }
        .dtw-toggle { padding:6px 14px;border-radius:99px;border:1.5px solid rgba(255,255,255,0.4);background:rgba(255,255,255,0.15);color:white;font-size:0.8em;font-weight:700;cursor:pointer;transition:0.2s; }
        .dtw-toggle.active { background:white;color:#1e40af;border-color:white; }
        .dtw-body { padding:20px 22px; }
        .dtw-loading { text-align:center;padding:28px;color:var(--text-sub); }
        .dtw-spinner { width:28px;height:28px;border:3px solid rgba(37,99,235,0.15);border-top:3px solid #2563eb;border-radius:50%;animation:spin 0.8s linear infinite;margin:0 auto 10px; }
        @keyframes spin { to { transform:rotate(360deg); } }
        .dtw-source { display:inline-block;font-size:0.75em;font-weight:700;padding:3px 10px;border-radius:99px;background:#eff6ff;color:#2563eb;border:1px solid #dbeafe;margin-bottom:12px; }
        body.dark-mode .dtw-source { background:rgba(37,99,235,0.2);border-color:rgba(37,99,235,0.3);color:#93c5fd; }
        
        .dtw-footer { display:flex;align-items:center;justify-content:flex-end;padding-top:8px; }
        .dtw-more-link { display:inline-flex;align-items:center;gap:6px;background:linear-gradient(135deg,#2563eb,#4f46e5);color:white;padding:10px 20px;border-radius:12px;font-size:0.9em;font-weight:800;text-decoration:none;transition:0.2s; }
        .dtw-more-link:hover { transform:translateY(-2px);box-shadow:0 6px 15px rgba(37,99,235,0.35); }

        /* ===== DAILY QUOTE WIDGET ===== */
        .quote-widget {
            background:var(--bg-card);border:1px solid var(--border);border-radius:20px;
            overflow:hidden;margin-bottom:32px;box-shadow:0 6px 20px rgba(0,0,0,0.04);
        }
        .qw-calendar-top {
            background:linear-gradient(135deg,#7c3aed,#4f46e5);
            padding:14px 22px;color:white;
            display:flex;align-items:center;justify-content:space-between;gap:10px;
        }
        .qw-month-label { font-size:1.1em;font-weight:800;opacity:0.9; }
        .qw-weekday { font-size:0.9em;font-weight:600;opacity:0.8;margin-top:2px; }
        .qw-clock { font-size:1.5em;font-weight:900;letter-spacing:2px;font-variant-numeric:tabular-nums; }
        .qw-main { display:flex;align-items:center;gap:16px;padding:18px 22px 0; }
        .qw-day-num { font-size:4.5em;font-weight:900;line-height:1;letter-spacing:-3px;color:#7c3aed;flex-shrink:0; }
        body.dark-mode .qw-day-num { color:#a78bfa; }
        .qw-date-label { font-size:1.25em;font-weight:800;color:var(--text-main); }
        .qw-divider { height:1px;background:rgba(0,0,0,0.07);margin:0 22px; }
        body.dark-mode .qw-divider { background:rgba(255,255,255,0.07); }
        .qw-quote-body { padding:16px 22px 20px; }
        .qw-label { display:inline-block;font-size:0.75em;font-weight:800;padding:3px 10px;border-radius:99px;background:linear-gradient(135deg,#7c3aed,#4f46e5);color:white;margin-bottom:12px; }
        .qw-kr { font-size:1.15em;font-weight:700;line-height:1.7;color:var(--text-main);padding-left:14px;border-left:3px solid #7c3aed;margin-bottom:10px; }
        .qw-vn { font-size:0.9em;color:var(--text-sub);font-weight:500;line-height:1.6;font-style:italic;padding-left:14px; }
        .qw-author { text-align:right;font-size:0.85em;font-weight:700;color:#7c3aed;margin-top:10px; }
        body.dark-mode .qw-author { color:#a78bfa; }

        /* ===== FLASHCARD WIDGET ===== */
        .flashcard-widget {
            background:var(--bg-card);border:1px solid var(--border);border-radius:20px;
            overflow:hidden;margin-bottom:32px;box-shadow:0 6px 20px rgba(0,0,0,0.04);
        }
        .fw-header {
            background:linear-gradient(135deg,#059669,#10b981);
            padding:16px 22px;color:white;
            display:flex;align-items:center;justify-content:space-between;gap:12px;
        }
        .fw-header-title { font-size:1.1em;font-weight:800; }
        .fw-header-sub { font-size:0.8em;opacity:0.85;margin-top:2px; }
        .fw-body { padding:20px 22px; }
        .fw-carousel { position:relative;overflow:hidden;border-radius:16px;touch-action:pan-y; }
        .fw-track { display:flex;transition:transform 0.35s cubic-bezier(0.4,0,0.2,1); }
        .fw-card {
            flex-shrink:0;width:100%;
            perspective:1000px;
        }
        .fw-card-inner {
            position:relative;width:100%;min-height:200px;
            transform-style:preserve-3d;
            transition:transform 0.5s ease;
            cursor:pointer;
        }
        .fw-card-inner.flipped { transform:rotateY(180deg); }
        .fw-front, .fw-back {
            position:absolute;inset:0;
            backface-visibility:hidden;-webkit-backface-visibility:hidden;
            border-radius:16px;
            display:flex;flex-direction:column;align-items:center;justify-content:center;
            padding:24px 20px;text-align:center;
            min-height:200px;
            border:2px solid var(--border);
        }
        .fw-front { background:linear-gradient(135deg,#ecfdf5,#d1fae5);border-color:rgba(16,185,129,0.3); }
        body.dark-mode .fw-front { background:rgba(16,185,129,0.1);border-color:rgba(16,185,129,0.2); }
        .fw-back { background:linear-gradient(135deg,#eff6ff,#dbeafe);border-color:rgba(37,99,235,0.3);transform:rotateY(180deg); }
        body.dark-mode .fw-back { background:rgba(37,99,235,0.1);border-color:rgba(37,99,235,0.2); }
        .fw-hint { font-size:0.75em;color:#6b7280;margin-bottom:12px;font-weight:600; }
        .fw-word { font-size:2em;font-weight:900;color:#1f2937;line-height:1.2; }
        body.dark-mode .fw-word { color:#f8fafc; }
        .fw-meaning { font-size:1.3em;font-weight:800;color:#1e40af;margin-bottom:10px; }
        body.dark-mode .fw-meaning { color:#93c5fd; }
        .fw-example-kr { font-size:0.88em;color:#374151;line-height:1.6;margin-bottom:6px; }
        .fw-example-vn { font-size:0.82em;color:#6b7280;font-style:italic;line-height:1.5; }
        body.dark-mode .fw-example-kr { color:#e2e8f0; }
        .fw-nav { display:flex;align-items:center;justify-content:center;gap:14px;margin-top:14px; }
        .fw-nav-btn { background:var(--bg-card);border:1px solid var(--border);border-radius:10px;padding:8px 16px;font-size:0.9em;font-weight:700;cursor:pointer;color:var(--text-main);transition:0.2s; }
        .fw-nav-btn:hover { background:var(--bg-card-hover);transform:translateY(-1px); }
        .fw-dots { display:flex;gap:6px;align-items:center; }
        .fw-dot { width:7px;height:7px;border-radius:50%;background:rgba(0,0,0,0.15);transition:0.3s;cursor:pointer; }
        body.dark-mode .fw-dot { background:rgba(255,255,255,0.2); }
        .fw-dot.active { background:#10b981;transform:scale(1.4); }

        /* UTILS GRID */
        .utils-grid { display:grid;grid-template-columns:repeat(3,1fr);gap:14px; }
        .util-card { background:var(--bg-card);border:1px solid var(--border);padding:16px;border-radius:16px;text-align:center;text-decoration:none;color:var(--text-main);transition:all 0.2s;display:flex;flex-direction:column;align-items:center;gap:8px;font-weight:700;font-size:1em; }
        .util-card:hover { background:var(--bg-card-hover);border-color:var(--border-hover);transform:translateY(-3px);color:var(--primary); }
        .util-icon { font-size:1.7em; }

        /* FOOTER */
        .global-footer { max-width:950px;margin:20px auto 30px;background:rgba(255,255,255,0.25);backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);border:1px solid rgba(255,255,255,0.4);border-radius:20px;padding:18px 20px;display:flex;justify-content:center;align-items:center;box-shadow:0 10px 25px rgba(0,0,0,0.05); }
        body.dark-mode .global-footer { background:rgba(15,23,42,0.4);border-color:rgba(255,255,255,0.1); }
        .footer-link { display:flex;align-items:center;gap:10px;text-decoration:none;color:var(--text-main);font-weight:700;font-size:1.05em;transition:0.2s; }
        .footer-link:hover { transform:translateY(-2px);color:#1877f2; }
        .footer-fb-icon { width:24px;height:24px;fill:currentColor; }

        @media(max-width:1399px) { .global-footer { max-width:950px; } }
        /* RESPONSIVE */
        @media(max-width:768px) {
            .wrapper { padding:18px 12px;margin:0 4px;width:auto;border-radius:20px; }
            .global-footer { margin:15px 4px 25px;border-radius:18px; }
            .hero-title { font-size:2em; }
            .hero-section { padding:32px 22px; }
            .pillars-grid { gap:12px; }
            .pillar-desc { display:none; }
            .pillar-card { padding:18px; }
            .pillar-title { font-size:1.1em; }
            .featured-exams-grid { grid-template-columns:1fr;gap:10px; }
            .utils-grid { grid-template-columns:repeat(2,1fr);gap:8px; }
            .util-card { flex-direction:column;text-align:center;padding:14px 10px;font-size:0.88em; }
            .dtw-options { grid-template-columns:1fr; }
            .qw-day-num { font-size:3.5em; }
        }
        @media(max-width:500px) {
            .pillars-grid { grid-template-columns:repeat(2,1fr); }
            .hero-title { font-size:1.75em; }
        }
    </style>

    <script src="assets/js/block.js"></script>
    <script src="assets/js/theme-picker.js"></script>
    <script src="assets/js/navbar.js"></script>
    <script src="assets/js/chatbox.js"></script>
<!-- Nhúng Siêu Widget Học Tiếng Hàn 2027 -->
<script src="assets/js/korean-chat-widget.js"></script>
</head>















<body>

<div id="authModal">
    <div class="auth-box">
        <button class="auth-close" onclick="document.getElementById('authModal').style.display='none'">&times;</button>
        <h2 style="margin-top:0;font-size:1.6em;font-weight:800;">Bắt đầu học</h2>
        <p style="color:var(--text-sub);font-size:0.95em;margin-bottom:28px;">Đăng nhập để lưu tiến độ và từ vựng của bạn.</p>
        <button id="googleAuthBtn">
            <svg width="22" height="22" viewBox="0 0 48 48">
                <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
                <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/>
                <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"/>
                <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"/>
            </svg>
            Tiếp tục với Google
        </button>
    </div>
</div>

<!-- DESKTOP DECORATIONS -->
<div class="desktop-decorations">
    <svg class="floating-img img-left" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <path d="M20 80 Q 50 90 80 80 L 80 20 Q 50 30 20 20 Z" fill="#60a5fa" opacity="0.8"/>
        <path d="M50 85 L 50 25" stroke="#ffffff" stroke-width="3" stroke-linecap="round"/>
        <path d="M30 40 L 45 45 M 30 55 L 45 60 M 55 45 L 70 40 M 55 60 L 70 55" stroke="#ffffff" stroke-width="3" stroke-linecap="round"/>
        <circle cx="35" cy="70" r="3" fill="#ffffff"/><circle cx="65" cy="70" r="3" fill="#ffffff"/>
        <path d="M45 75 Q 50 80 55 75" stroke="#ffffff" stroke-width="2" fill="none" stroke-linecap="round"/>
    </svg>
    <svg class="floating-img img-right" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <circle cx="40" cy="40" r="25" fill="#fef08a" stroke="#ca8a04" stroke-width="6"/>
        <circle cx="40" cy="40" r="18" fill="#ffffff" opacity="0.6"/>
        <line x1="58" y1="58" x2="85" y2="85" stroke="#ca8a04" stroke-width="12" stroke-linecap="round"/>
        <line x1="62" y1="62" x2="80" y2="80" stroke="#fcd34d" stroke-width="6" stroke-linecap="round"/>
    </svg>
    <svg class="floating-img img-top-right" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <path d="M50 10 L 60 40 L 90 40 L 65 60 L 75 90 L 50 70 L 25 90 L 35 60 L 10 40 L 40 40 Z" fill="#fcd34d" opacity="0.9"/>
        <circle cx="42" cy="50" r="4" fill="#854d0e"/><circle cx="58" cy="50" r="4" fill="#854d0e"/>
        <path d="M46 62 Q 50 68 54 62" stroke="#854d0e" stroke-width="3" fill="none" stroke-linecap="round"/>
    </svg>
    <svg class="floating-img img-bottom-left" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <polygon points="20,80 15,95 30,90" fill="#fca5a5"/>
        <polygon points="20,80 70,30 80,40 30,90" fill="#fcd34d"/>
        <polygon points="70,30 80,20 90,30 80,40" fill="#cbd5e1"/>
        <polygon points="80,20 85,15 95,25 90,30" fill="#ef4444"/>
    </svg>
</div>

<div class="wrapper">

    <!-- HERO -->
    <div class="hero-section" style="padding: 0; background: transparent; box-shadow: none; border: none; margin-bottom: 35px; text-align: center;">
        <img src="assets/img/hero-banner.png" alt="Chinh phục Tiếng Hàn - Dễ dàng hơn bao giờ hết" style="width: 100%; height: auto; border-radius: 24px; box-shadow: 0 15px 40px rgba(0,0,0,0.12); display: block;">
    </div>

    <!-- 4 PILLARS -->
    <div class="section-header">
        <h2 class="section-title"><span>🎯</span> Khám phá Kỹ năng</h2>
    </div>
    <div class="pillars-grid">
        <a href="reading/home.html" class="pillar-card">
            <div class="pillar-icon-wrapper c-read">📖</div>
            <h3 class="pillar-title">Luyện Đọc <svg class="pillar-arrow" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg></h3>
            <p class="pillar-desc">Kho đề thi thử phong phú với giải thích chi tiết và dịch thuật ngữ cảnh 1 chạm.</p>
        </a>
        <a href="listening/home.html" class="pillar-card">
            <div class="pillar-icon-wrapper c-listen">🎧</div>
            <h3 class="pillar-title">Luyện Nghe <svg class="pillar-arrow" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg></h3>
            <p class="pillar-desc">Tích hợp trình phát Audio thông minh. Luyện nghe theo chủ đề và kịch bản TOPIK chuẩn.</p>
        </a>
        <a href="writing/home.html" class="pillar-card">
            <div class="pillar-icon-wrapper c-write">✍️</div>
            <h3 class="pillar-title">Luyện Viết <svg class="pillar-arrow" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg></h3>
            <p class="pillar-desc">Thực hành viết câu 51-54. Hệ thống tự động kiểm tra từ khoá và tính điểm trực tiếp.</p>
        </a>
        <a href="grammar/home.html" class="pillar-card">
            <div class="pillar-icon-wrapper c-grammar">🧩</div>
            <h3 class="pillar-title">Ngữ Pháp <svg class="pillar-arrow" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg></h3>
            <p class="pillar-desc">Hệ thống ngữ pháp trọng tâm TOPIK I & II dễ hiểu kèm ví dụ thực tế.</p>
        </a>
    </div>

    <!-- DAILY QUOTE WIDGET -->
    <div class="section-header">
        <h2 class="section-title"><span>🗓️</span> Danh ngôn hôm nay</h2>
    </div>
    <div class="quote-widget">
        <div class="qw-calendar-top">
            <div>
                <div class="qw-month-label" id="qwMonthLabel">Tháng --</div>
                <div class="qw-weekday" id="qwWeekday">---</div>
            </div>
            <div class="qw-clock" id="qwClock">00:00:00</div>
        </div>
        <div class="qw-main">
            <div class="qw-day-num" id="qwDayNum">--</div>
            <div>
                <div class="qw-date-label" id="qwDateLabel">Đang tải...</div>
            </div>
        </div>
        <div class="qw-divider"></div>
        <div class="qw-quote-body">
            <div class="qw-label">💬 Danh ngôn tiếng Hàn</div>
            <div class="qw-kr" id="qwKr">Đang tải...</div>
            <div class="qw-vn" id="qwVn"></div>
            <div class="qw-author" id="qwAuthor"></div>
        </div>
    </div>

    <!-- DAILY TOPIK WIDGET -->
    <div class="section-header">
        <h2 class="section-title"><span>📝</span> Mỗi ngày 5 câu TOPIK</h2>
  
    </div>
    <div class="daily-topik-widget">
        <div class="dtw-header">
            <div class="dtw-header-left">
                <div>
                    <div class="dtw-header-title">Câu hỏi hôm nay</div>
                    <div class="dtw-header-sub">1 câu ngẫu nhiên từ bộ đề thật</div>
                </div>
            </div>
            <div class="dtw-toggle-row">
                <button class="dtw-toggle" id="dtwBtnT1" onclick="dtwSetLevel(1)">TOPIK I</button>
                <button class="dtw-toggle active" id="dtwBtnT2" onclick="dtwSetLevel(2)">TOPIK II</button>
            </div>
        </div>
        <div class="dtw-body">
            <div id="dtwLoading" class="dtw-loading">
                <div class="dtw-spinner"></div>
                <div>Đang tải câu hỏi...</div>
            </div>
            <div id="dtwContent" style="display:none;"></div>
            <div class="dtw-footer">
                <a href="topikdaily.html" class="dtw-more-link">Xem thêm →</a>
            </div>
        </div>
    </div>

    <!-- DAILY VOCAB FLASHCARD -->
    <div class="section-header">
        <h2 class="section-title"><span>🃏</span> Mỗi ngày 10 từ vựng</h2>
        <a href="vocab.html" class="section-more-link">Sổ từ vựng →</a>
    </div>
    <div class="flashcard-widget">
        <div class="fw-header">
            <div>
                <div class="fw-header-title">Flashcard từ vựng hôm nay</div>
                <div class="fw-header-sub">Nhấn vào thẻ để lật và xem nghĩa</div>
            </div>
        </div>
        <div class="fw-body">
            <div class="fw-carousel" id="fwCarousel">
                <div class="fw-track" id="fwTrack"></div>
            </div>
            <div class="fw-nav">
                <button class="fw-nav-btn" onclick="fwPrev()">◀ Trước</button>
                <div class="fw-dots" id="fwDots"></div>
                <button class="fw-nav-btn" onclick="fwNext()">Tiếp ▶</button>
            </div>
        </div>
    </div>

    <!-- FEATURED EXAMS — random mỗi ngày -->
    <div class="section-header">
        <h2 class="section-title"><span>🔥</span> Đề thi TOPIK Nổi Bật</h2>
        <a href="reading/home.html" class="section-more-link">Tất cả đề →</a>
    </div>
    <div class="featured-exams-grid" id="featuredExamsGrid">
        <div class="exam-card"><div class="exam-info"><span>Đang tải...</span></div></div>
    </div>

    <!-- UTILS -->
    <div class="section-header">
        <h2 class="section-title"><span>🛠️</span> Công cụ Tiện ích</h2>
    </div>
    <div class="utils-grid">
        <a href="dict.html" class="util-card"><span class="util-icon">📚</span> Từ điển</a>
        <a href="vocab.html" class="util-card"><span class="util-icon">📇</span> Sổ Từ Vựng</a>
        <a href="forum.html" class="util-card"><span class="util-icon">💬</span> Hỏi Đáp</a>
        <a href="dailynews.html" class="util-card"><span class="util-icon">📰</span> Đọc Báo</a>
        <a href="hanhan.html" class="util-card"><span class="util-icon">🧠</span> Hán Hàn</a>
        <a href="video/home.html" class="util-card"><span class="util-icon">🎬</span> Học qua Video</a>
    </div>

</div>

<footer class="global-footer">
    <a href="https://www.facebook.com/groups/vuihoctienghan.online" target="_blank" rel="noopener noreferrer" class="footer-link">
        <span>📚 Vui Học Tiếng Hàn</span>
        <svg class="footer-fb-icon" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
    </a>
</footer>

<script src="https://www.gstatic.com/firebasejs/10.8.1/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.8.1/firebase-auth-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore-compat.js"></script>

<script src="assets/js/vocab-daily.js"></script>
<script>
// ==================== DAILY QUOTE WIDGET ====================
const QUOTES_MINI = [
    {kr:"가는 말이 고와야 오는 말이 곱다.",vn:"Lời nói chẳng mất tiền mua, lựa lời mà nói cho vừa lòng nhau.",author:"Tục ngữ"},
    {kr:"시작이 반이다.",vn:"Bắt đầu là đã đi được nửa chặng đường.",author:"Tục ngữ"},
    {kr:"꿈을 향해 나아가는 것, 그것이 용기다.",vn:"Tiến về phía ước mơ — đó chính là can đảm.",author:""},
    {kr:"배움에는 끝이 없다.",vn:"Học tập là hành trình không có điểm kết.",author:""},
    {kr:"천 리 길도 한 걸음부터.",vn:"Vạn lý trường chinh bắt đầu từ một bước chân.",author:"Tục ngữ"},
    {kr:"포기하지 않는 한 실패는 없다.",vn:"Chừng nào chưa bỏ cuộc, thất bại chưa tới.",author:""},
    {kr:"오늘의 노력이 내일의 나를 만든다.",vn:"Nỗ lực hôm nay tạo nên bản thân ngày mai.",author:""},
    {kr:"실패는 성공의 어머니다.",vn:"Thất bại là mẹ thành công.",author:"Tục ngữ"},
    {kr:"불가능이란 없다, 오직 도전만이 있을 뿐.",vn:"Không có gì là không thể, chỉ có thách thức đang chờ.",author:""},
    {kr:"지금 이 순간이 인생에서 가장 젊은 때다.",vn:"Khoảnh khắc này là lúc bạn trẻ nhất trong cuộc đời.",author:""},
    {kr:"지식은 힘이다.",vn:"Tri thức là sức mạnh.",author:"Francis Bacon"},
    {kr:"꾸준함이 재능을 이긴다.",vn:"Sự kiên trì sẽ đánh bại tài năng.",author:""},
    {kr:"기회는 준비된 자에게 온다.",vn:"Cơ hội đến với người đã chuẩn bị sẵn.",author:"Louis Pasteur"},
    {kr:"멈추지 않는다면 느려도 괜찮다.",vn:"Dù chậm cũng được, miễn là đừng dừng lại.",author:"Khổng Tử"},
    {kr:"배움은 평생의 동반자다.",vn:"Học hỏi là người bạn đồng hành suốt đời.",author:""},
    {kr:"오늘 할 수 있는 일을 내일로 미루지 마라.",vn:"Đừng để việc có thể làm hôm nay sang ngày mai.",author:""},
    {kr:"언어를 배우는 것은 새로운 세계를 여는 것이다.",vn:"Học ngôn ngữ mới là mở ra một thế giới mới.",author:""},
    {kr:"한국어를 배우는 것은 한국의 마음을 여는 열쇠다.",vn:"Học tiếng Hàn là chiếc chìa khóa mở ra trái tim của Hàn Quốc.",author:""},
    {kr:"매 순간을 소중히 여겨라.",vn:"Hãy trân trọng từng khoảnh khắc.",author:""},
    {kr:"한국어 공부, 포기하지 마세요. 반드시 빛나는 날이 옵니다.",vn:"Học tiếng Hàn, đừng bỏ cuộc. Nhất định sẽ có ngày tỏa sáng.",author:"Vui Học Tiếng Hàn"}
];

function initQuoteWidget() {
    const now = new Date();
    const weekdays = ['Chủ Nhật','Thứ Hai','Thứ Ba','Thứ Tư','Thứ Năm','Thứ Sáu','Thứ Bảy'];
    const months = ['Tháng 1','Tháng 2','Tháng 3','Tháng 4','Tháng 5','Tháng 6','Tháng 7','Tháng 8','Tháng 9','Tháng 10','Tháng 11','Tháng 12'];

    document.getElementById('qwDayNum').textContent = now.getDate();
    document.getElementById('qwMonthLabel').textContent = `${months[now.getMonth()]} ${now.getFullYear()}`;
    document.getElementById('qwWeekday').textContent = weekdays[now.getDay()];
    document.getElementById('qwDateLabel').textContent = `${weekdays[now.getDay()]}, ngày ${now.getDate()} ${months[now.getMonth()]}`;

    const q = QUOTES_MINI[window.getDayOfYear(now) % QUOTES_MINI.length];
    document.getElementById('qwKr').textContent = q.kr;
    document.getElementById('qwVn').textContent = q.vn;
    document.getElementById('qwAuthor').textContent = q.author ? `— ${q.author}` : '';

    function updateClock() {
        const t = new Date();
        const h = String(t.getHours()).padStart(2,'0');
        const m = String(t.getMinutes()).padStart(2,'0');
        const s = String(t.getSeconds()).padStart(2,'0');
        document.getElementById('qwClock').textContent = `${h}:${m}:${s}`;
    }
    updateClock();
    setInterval(updateClock, 1000);
}

// ==================== DAILY TOPIK WIDGET ====================
let dtwLevel = 2;
const DTW_T2_EXAMS = [35,36,37,41,47,52,60,64,83,91,96,102];
const DTW_T1_EXAMS = [35,36,37,41,47,52];
const DTW_T2_QS = [1,2,3,4,5,6,7,8];
const DTW_T1_QS = [30,31,32,33,34,35,36,37];

function dtwSetLevel(lvl) {
    dtwLevel = lvl;
    document.getElementById('dtwBtnT1').classList.toggle('active', lvl===1);
    document.getElementById('dtwBtnT2').classList.toggle('active', lvl===2);
    dtwLoadQuestion();
}

async function dtwLoadQuestion() {
    document.getElementById('dtwLoading').style.display = 'block';
    document.getElementById('dtwContent').style.display = 'none';

    const exams = dtwLevel === 2 ? DTW_T2_EXAMS : DTW_T1_EXAMS;
    const qs = dtwLevel === 2 ? DTW_T2_QS : DTW_T1_QS;

    // Try a few random combos
    for (let attempt = 0; attempt < 8; attempt++) {
        const exam = exams[Math.floor(Math.random() * exams.length)];
        const q = qs[Math.floor(Math.random() * qs.length)];
        const folder = dtwLevel === 2 ? 'reading/topik_ii' : 'reading/topik_i';
        try {
            const res = await fetch(`${folder}/topik${exam}.html`);
            if (!res.ok) continue;
            const html = await res.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            const qBlock = doc.getElementById(`q${q}`);
            if (!qBlock) continue;

            // Keep explanation area hidden initially
            qBlock.querySelectorAll('.action-area').forEach(el => el.style.display = 'none');

            // Override option handlers
            qBlock.querySelectorAll('.option').forEach((opt, oi) => {
                const isCorrect = opt.getAttribute('onclick')?.includes('true');
                opt.removeAttribute('onclick');
                opt.setAttribute('data-correct', isCorrect ? '1' : '0');
                opt.setAttribute('onclick', `dtwAnswer(this, ${isCorrect})`);
            });

            // Fix q-number
            const qNum = qBlock.querySelector('.q-number');
            if (qNum) qNum.style.fontWeight = '900';

            const sourceHtml = `<div class="dtw-source">📄 Đề ${exam} - Câu ${q}</div>`;
            const feedbackHtml = `<div class="dtw-feedback" id="dtwFeedback"></div>`;

            document.getElementById('dtwContent').innerHTML = sourceHtml + qBlock.outerHTML + feedbackHtml;
            document.getElementById('dtwLoading').style.display = 'none';
            document.getElementById('dtwContent').style.display = 'block';
            return;
        } catch(e) { continue; }
    }

    document.getElementById('dtwLoading').innerHTML = '<div style="padding:20px;color:var(--text-sub);text-align:center;">Không thể tải. Vui lòng thử lại.</div>';
}

function dtwAnswer(el, isCorrect) {
    document.querySelectorAll('.dtw-option').forEach(o => {
        o.classList.add('disabled');
        if (o.getAttribute('onclick')?.includes('true')) o.classList.add('correct');
    });
    const fb = document.getElementById('dtwFeedback');
    if (isCorrect) {
        el.classList.add('correct');
        fb.textContent = '✅ Chính xác! Bạn làm đúng rồi.';
        fb.className = 'dtw-feedback ok';
    } else {
        el.classList.add('wrong');
        fb.textContent = '❌ Sai rồi! Đáp án đúng đã được tô xanh.';
        fb.className = 'dtw-feedback bad';
    }
}

// ==================== FLASHCARD VOCAB WIDGET ====================
let fwCards = [];
let fwIdx = 0;

function initFlashcards() {
    fwCards = window.getDailyVocab();
    const track = document.getElementById('fwTrack');
    const dotsContainer = document.getElementById('fwDots');

    track.innerHTML = fwCards.map((card, i) => `
        <div class="fw-card">
            <div class="fw-card-inner" onclick="fwFlip(this)">
                <div class="fw-front">
                    <div class="fw-hint">Nhấn để xem nghĩa</div>
                    <div class="fw-word">${card.word}</div>
                </div>
                <div class="fw-back">
                    <div class="fw-meaning">${card.meaning}</div>
                    <div class="fw-example-kr">${card.ex_kr}</div>
                    <div class="fw-example-vn">${card.ex_vn}</div>
                </div>
            </div>
        </div>
    `).join('');

    dotsContainer.innerHTML = fwCards.map((_,i) =>
        `<div class="fw-dot ${i===0?'active':''}" onclick="fwGoTo(${i})"></div>`
    ).join('');

    fwGoTo(0);
}

function fwFlip(inner) {
    inner.classList.toggle('flipped');
}

function fwGoTo(idx) {
    fwIdx = idx;
    const track = document.getElementById('fwTrack');
    track.style.transform = `translateX(-${idx * 100}%)`;
    document.querySelectorAll('.fw-dot').forEach((d,i) => d.classList.toggle('active', i===idx));
    // Reset flip state
    document.querySelectorAll('.fw-card-inner').forEach((c,i) => {
        if (i !== idx) c.classList.remove('flipped');
    });
}
function fwPrev() { fwGoTo((fwIdx - 1 + fwCards.length) % fwCards.length); }
function fwNext() { fwGoTo((fwIdx + 1) % fwCards.length); }

// Touch swipe for flashcards
let fwTouchStartX = 0;
document.addEventListener('DOMContentLoaded', () => {
    const carousel = document.getElementById('fwCarousel');
    carousel.addEventListener('touchstart', e => { fwTouchStartX = e.touches[0].clientX; });
    carousel.addEventListener('touchend', e => {
        const diff = fwTouchStartX - e.changedTouches[0].clientX;
        if (Math.abs(diff) > 40) diff > 0 ? fwNext() : fwPrev();
    });
});

// ==================== AUTH ====================
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if (typeof firebase !== 'undefined' && firebase.auth) {
            firebase.auth().onAuthStateChanged(user => {
                const btn = document.getElementById('navAvatarBtn');
                if (!btn) return;
                if (user) {
                    btn.style.color = '#2563eb';
                    btn.style.background = '#eff6ff';
                    btn.style.borderRadius = '8px';
                    btn.title = 'Tài khoản (' + (user.displayName || user.email) + ')';
                    btn.onclick = () => { window.location.href = 'mypage.html'; };
                } else {
                    btn.title = 'Chưa đăng nhập — Nhấn để đăng nhập';
                    btn.onclick = () => {
                        const modal = document.getElementById('authModal');
                        if (modal) modal.style.display = 'flex';
                    };
                }
            });
        }
    }, 300);
});

// ==================== FEATURED EXAMS — random mỗi ngày ====================
const EXAM_POOL = [
    {label:"TOPIK II Đọc",href:"reading/topik_ii/topik96.html",exam:"Kỳ 96",tag:"HOT",tagClass:"badge-hot",desc:"Bộ đề chính thức mới nhất"},
    {label:"TOPIK II Đọc",href:"reading/topik_ii/topik102.html",exam:"Kỳ 102",tag:"NEW",tagClass:"badge-new",desc:"Xu hướng ra đề mới"},
    {label:"TOPIK II Đọc",href:"reading/topik_ii/topik91.html",exam:"Kỳ 91",tag:"",tagClass:"",desc:"Đề thi chính thức"},
    {label:"TOPIK II Đọc",href:"reading/topik_ii/topik83.html",exam:"Kỳ 83",tag:"",tagClass:"",desc:"Đề thi chính thức"},
    {label:"TOPIK II Đọc",href:"reading/topik_ii/topik64.html",exam:"Kỳ 64",tag:"",tagClass:"",desc:"Đề thi chính thức"},
    {label:"TOPIK II Nghe",href:"listening/topik_ii/topik102.html",exam:"Kỳ 102",tag:"NEW",tagClass:"badge-new",desc:"Luyện nghe TOPIK II"},
    {label:"TOPIK II Nghe",href:"listening/topik_ii/topik91.html",exam:"Kỳ 91",tag:"",tagClass:"",desc:"Luyện nghe TOPIK II"},
    {label:"TOPIK II Viết",href:"writing/topik_ii/topik96.html",exam:"Kỳ 96",tag:"HOT",tagClass:"badge-hot",desc:"Luyện viết câu 51-54"},
    {label:"TOPIK II Viết",href:"writing/topik_ii/topik102.html",exam:"Kỳ 102",tag:"NEW",tagClass:"badge-new",desc:"Luyện viết câu 51-54"},
    {label:"TOPIK II Viết",href:"writing/topik_ii/topik83.html",exam:"Kỳ 83",tag:"",tagClass:"",desc:"Luyện viết câu 51-54"},
    {label:"TOPIK II Đọc",href:"reading/topik_ii/topik60.html",exam:"Kỳ 60",tag:"",tagClass:"",desc:"Đề thi chính thức"},
    {label:"TOPIK II Đọc",href:"reading/topik_ii/topik52.html",exam:"Kỳ 52",tag:"",tagClass:"",desc:"Đề thi chính thức"},
    {label:"TOPIK II Đọc",href:"reading/topik_ii/topik47.html",exam:"Kỳ 47",tag:"",tagClass:"",desc:"Đề thi chính thức"},
    {label:"TOPIK I Đọc",href:"reading/topik_i/topik96.html",exam:"Kỳ 96",tag:"",tagClass:"",desc:"Luyện đọc TOPIK I"},
    {label:"TOPIK I Đọc",href:"reading/topik_i/topik102.html",exam:"Kỳ 102",tag:"NEW",tagClass:"badge-new",desc:"Luyện đọc TOPIK I"},
    {label:"TOPIK I Đọc",href:"reading/topik_i/topik83.html",exam:"Kỳ 83",tag:"",tagClass:"",desc:"Luyện đọc TOPIK I"},
    {label:"TOPIK I Đọc",href:"reading/topik_i/topik64.html",exam:"Kỳ 64",tag:"",tagClass:"",desc:"Luyện đọc TOPIK I"},
    {label:"TOPIK II Nghe",href:"listening/topik_ii/topik36.html",exam:"Kỳ 36",tag:"",tagClass:"",desc:"Luyện nghe TOPIK II"},
    {label:"TOPIK II Viết",href:"writing/topik_ii/topik64.html",exam:"Kỳ 64",tag:"",tagClass:"",desc:"Luyện viết câu 51-54"},
    {label:"TOPIK II Đọc",href:"reading/topik_ii/topik41.html",exam:"Kỳ 41",tag:"",tagClass:"",desc:"Đề thi chính thức"},
    {label:"TOPIK II Đọc",href:"reading/topik_ii/topik37.html",exam:"Kỳ 37",tag:"",tagClass:"",desc:"Đề thi chính thức"},
    {label:"TOPIK I Đọc",href:"reading/topik_i/topik60.html",exam:"Kỳ 60",tag:"",tagClass:"",desc:"Luyện đọc TOPIK I"},
    {label:"TOPIK I Đọc",href:"reading/topik_i/topik52.html",exam:"Kỳ 52",tag:"",tagClass:"",desc:"Luyện đọc TOPIK I"},
    {label:"TOPIK I Đọc",href:"reading/topik_i/topik47.html",exam:"Kỳ 47",tag:"",tagClass:"",desc:"Luyện đọc TOPIK I"},
    {label:"TOPIK II Nghe",href:"listening/topik_ii/topik35.html",exam:"Kỳ 35",tag:"",tagClass:"",desc:"Luyện nghe TOPIK II"},
    {label:"TOPIK II Viết",href:"writing/topik_ii/topik60.html",exam:"Kỳ 60",tag:"",tagClass:"",desc:"Luyện viết câu 51-54"},
    {label:"TOPIK II Viết",href:"writing/topik_ii/topik52.html",exam:"Kỳ 52",tag:"",tagClass:"",desc:"Luyện viết câu 51-54"},
    {label:"TOPIK II Viết",href:"writing/topik_ii/topik47.html",exam:"Kỳ 47",tag:"",tagClass:"",desc:"Luyện viết câu 51-54"},
    {label:"TOPIK II Viết",href:"writing/topik_ii/topik41.html",exam:"Kỳ 41",tag:"",tagClass:"",desc:"Luyện viết câu 51-54"},
    {label:"TOPIK II Viết",href:"writing/topik_ii/topik37.html",exam:"Kỳ 37",tag:"",tagClass:"",desc:"Luyện viết câu 51-54"},
    {label:"TOPIK II Viết",href:"writing/topik_ii/topik36.html",exam:"Kỳ 36",tag:"",tagClass:"",desc:"Luyện viết câu 51-54"},
];

const SKILL_ICON = {
    'Đọc': '📖', 'Nghe': '🎧', 'Viết': '✍️'
};

function getDailyPick(arr, count, seedOffset) {
    const day = window.getDayOfYear(new Date());
    const rng = window.seededRandom(day * 7919 + (seedOffset || 0));
    const shuffled = [...arr];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled.slice(0, count);
}

function initFeaturedExams() {
    const picks = getDailyPick(EXAM_POOL, 4);
    const grid = document.getElementById('featuredExamsGrid');
    grid.innerHTML = picks.map(e => {
        const icon = SKILL_ICON[e.label.split(' ').pop()] || '';
        return `<a href="${e.href}" class="exam-card">
            <div class="exam-info">
                <span class="exam-number">${icon} ${e.label} - ${e.exam} ${e.tag ? `<span class="${e.tagClass}">${e.tag}</span>` : ''}</span>
                <span class="exam-desc">${e.desc}</span>
            </div>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2" stroke-linecap="round"><path d="M9 18l6-6-6-6"/></svg>
        </a>`;
    }).join('');
}

// Init all widgets
window.addEventListener('load', () => {
    initQuoteWidget();
    dtwLoadQuestion();
    initFlashcards();
    initFeaturedExams();
});
</script>

<script src="auth.js"></script>
<script src="assets/js/theme.js"></script>
</body>
</html>

===== END FILE: public/index.html =====

