/* ==========================================================================
   NAVIGATOR.JS — Bảng Điều Hướng Câu Hỏi (Question Navigator)

   Chế độ Luyện Tập: hiện ngay, lưới câu + màu trạng thái đã/chưa trả lời
   Chế độ Thi Thử:   ẩn cho đến sau khi nộp bài, sau đó hiện với màu đúng/sai
   Listening mode:   click câu → cuộn + tự phát audio timestamp câu đó
   Mobile:           đóng panel sau khi chọn câu
   ========================================================================== */

(function () {
    'use strict';

    // ===== PHÁT HIỆN LOẠI ĐỀ =====
    const isListening = window.location.pathname.includes('/listening/');
    const GRID_COLS   = 5;

    let navPanel  = null;
    let navToggle = null;
    let isOpen    = false;
    let isExamFinishedNav = false;
    let panelVisible = false;
    let allBlocks = [];

    // ===== KHỞI TẠO =====
    document.addEventListener('DOMContentLoaded', function () {
        const style = document.createElement('style');
        style.innerHTML = `
            .container, .global-nav, .global-footer { transition: transform 0.28s cubic-bezier(0.4, 0, 0.2, 1); }
            @media (min-width: 1160px) {
                body.nav-open .container, body.nav-open .global-nav, body.nav-open .global-footer {
                    transform: translateX(-130px);
                }
            }

            /* ===== DARK MODE CHO NAVIGATOR PANEL ===== */
            body.dark-mode #question-nav-panel {
                background: rgba(15, 23, 42, 0.97) !important;
                border-color: rgba(255, 255, 255, 0.12) !important;
                color: #e2e8f0 !important;
                box-shadow: -4px 0 30px rgba(0, 0, 0, 0.5) !important;
            }
            /* ===== GIAO DIỆN BẢNG CÂU HỎI (đồng bộ với popup kết quả) ===== */
            #question-nav-panel { font-family: 'Pretendard','Inter',sans-serif; background: #fff; border-left: 1px solid #e5e7eb; box-shadow: -12px 0 40px -12px rgba(15,23,42,.25); }
            #question-nav-panel .nav-panel-header { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 16px 14px 14px 16px;
                background: linear-gradient(135deg, #eff6ff 0%, #f5f3ff 100%); border-bottom: 1px solid #e5e7eb; flex-shrink: 0; }
            #question-nav-panel .nav-head-l { display: flex; align-items: center; gap: 10px; min-width: 0; }
            #question-nav-panel .nav-head-ic { width: 36px; height: 36px; border-radius: 11px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; color: #fff;
                background: linear-gradient(135deg, #60a5fa, #2563eb); box-shadow: 0 4px 10px -3px rgba(37,99,235,.55), inset 0 1px 0 rgba(255,255,255,.35); }
            #question-nav-panel .nav-head-ic svg { width: 18px; height: 18px; }
            #question-nav-panel .nav-panel-title { display: block; font-weight: 800; font-size: .95em; color: #1f2937; }
            #question-nav-panel .nav-panel-sub { display: block; font-size: .74em; color: #6b7280; font-weight: 600; margin-top: 2px; }
            #question-nav-panel .nav-panel-close { width: 32px; height: 32px; padding: 0; border: 0; border-radius: 10px; background: rgba(255,255,255,.9); color: #64748b; font-size: 1em;
                display: flex; align-items: center; justify-content: center; box-shadow: 0 1px 3px rgba(15,23,42,.12); flex-shrink: 0; cursor: pointer; }
            #question-nav-panel .nav-panel-close:hover { background: #fff1f2; color: #e11d48; }
            #question-nav-panel .nav-legend { display: flex; flex-wrap: wrap; gap: 4px; padding: 12px 14px 0; flex-shrink: 0; }
            #question-nav-panel .nav-legend:empty { display: none; }
            #question-nav-panel .nav-pill { display: inline-flex; align-items: center; gap: 5px; border-radius: 999px; padding: 3px 8px; font-size: .7em; font-weight: 700; white-space: nowrap;
                background: #fff; border: 1px solid #e5e7eb; color: #4b5563; }
            #question-nav-panel .nav-pill b { font-weight: 900; font-variant-numeric: tabular-nums; }
            #question-nav-panel .nav-pill i { width: 7px; height: 7px; border-radius: 50%; }
            #question-nav-panel .nav-pill.ok b { color: #059669; } #question-nav-panel .nav-pill.ok i { background: #10b981; }
            #question-nav-panel .nav-pill.bad b { color: #e11d48; } #question-nav-panel .nav-pill.bad i { background: #f43f5e; }
            #question-nav-panel .nav-pill.ans b { color: #1d4ed8; } #question-nav-panel .nav-pill.ans i { background: #3b82f6; }
            #question-nav-panel .nav-pill.skip b { color: #64748b; } #question-nav-panel .nav-pill.skip i { background: #cbd5e1; }
            #question-nav-panel .nav-grid { padding: 12px 14px 14px; gap: 6px; }
            #question-nav-panel .nav-q-btn { border: 1px solid #e2e8f0; border-radius: 9px; background: #fff; color: #64748b; font-size: .8em; font-weight: 800;
                font-variant-numeric: tabular-nums; font-family: inherit; transition: transform .12s, border-color .15s, background .15s; }
            #question-nav-panel .nav-q-btn:hover { transform: translateY(-1px); border-color: #93c5fd; color: #1d4ed8; background: #fff; }
            #question-nav-panel .nav-q-btn.nav-q-answered { background: #eff6ff; border-color: #bfdbfe; color: #1d4ed8; }
            #question-nav-panel .nav-q-btn.nav-q-correct { background: #ecfdf5; border-color: #a7f3d0; color: #047857; }
            #question-nav-panel .nav-q-btn.nav-q-wrong { background: #fff1f2; border-color: #fecdd3; color: #be123c; }
            #question-nav-panel .nav-q-btn.nav-q-skipped { background: #f8fafc; border-color: #e2e8f0; color: #94a3b8; }
            #question-nav-panel .nav-dict-head { background: #f8fafc; }
            #nav-toggle-btn.nav-toggle-btn { background: linear-gradient(135deg, #3b82f6, #2563eb); border-radius: 14px; box-shadow: 0 10px 22px -8px rgba(37,99,235,.65); font-family: 'Pretendard','Inter',sans-serif; }
            #nav-toggle-btn.nav-toggle-btn:hover { background: linear-gradient(135deg, #2563eb, #1d4ed8); }
            #nav-toggle-btn.nav-toggle-btn.active { background: linear-gradient(135deg, #1e3a8a, #312e81); }
            @media (max-width: 767px) {
                body.nav-open #nav-toggle-btn { display: none !important; }
                #question-nav-panel .nav-panel-header { padding: 14px 14px 12px 16px; }
                #question-nav-panel .nav-legend { padding: 12px 16px 0; }
                #question-nav-panel .nav-grid { padding: 12px 16px 16px; gap: 8px; }
                #question-nav-panel .nav-q-btn { border-radius: 10px; font-size: .88em; }
            }
            body.dark-mode #question-nav-panel { background: #1e293b !important; border-color: #334155 !important; }
            body.dark-mode #question-nav-panel .nav-panel-header { background: linear-gradient(135deg, #172554, #2e1065); border-color: #334155; }
            body.dark-mode #question-nav-panel .nav-panel-title { color: #f1f5f9; }
            body.dark-mode #question-nav-panel .nav-panel-sub { color: #94a3b8; }
            body.dark-mode #question-nav-panel .nav-panel-close { background: rgba(255,255,255,.08); color: #94a3b8; box-shadow: none; }
            body.dark-mode #question-nav-panel .nav-pill { background: #0f172a; border-color: #334155; color: #cbd5e1; }
            body.dark-mode #question-nav-panel .nav-q-btn { background: #0f172a; border-color: #334155; color: #94a3b8; }
            body.dark-mode #question-nav-panel .nav-q-btn.nav-q-answered { background: rgba(59,130,246,.18); border-color: rgba(59,130,246,.45); color: #93c5fd; }
            body.dark-mode #question-nav-panel .nav-q-btn.nav-q-correct { background: rgba(16,185,129,.16); border-color: rgba(16,185,129,.45); color: #6ee7b7; }
            body.dark-mode #question-nav-panel .nav-q-btn.nav-q-wrong { background: rgba(244,63,94,.16); border-color: rgba(244,63,94,.45); color: #fda4af; }
            body.dark-mode #question-nav-panel .nav-q-btn.nav-q-skipped { background: #0f172a; border-color: #334155; color: #64748b; }
            body.dark-mode .nav-toggle-btn {
                background: rgba(15, 23, 42, 0.9) !important;
                color: #93c5fd !important;
                border-color: rgba(147, 197, 253, 0.3) !important;
            }
            body.dark-mode .type-nav-content {
                color: #e2e8f0 !important;
            }
            body.dark-mode .nav-type-row {
                border-bottom-color: rgba(255, 255, 255, 0.08) !important;
                color: #cbd5e1 !important;
            }

            /* ===== LƯỚI CÂU HỎI (cuộn) + THANH KÉO PHÂN CÁCH ===== */
            @media (min-width: 768px) { .nav-grid { flex: 0 0 auto; overflow-y: auto; } }
            .nav-splitter { flex: 0 0 auto; height: 10px; cursor: row-resize; background: #f1f5f9; border-top: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; position: relative; }
            .nav-splitter::before { content: ""; position: absolute; left: 50%; top: 50%; transform: translate(-50%,-50%); width: 46px; height: 4px; border-radius: 4px; background: #cbd5e1; }
            .nav-splitter:hover { background: #e2e8f0; }
            body.dark-mode .nav-splitter { background: #1e293b; border-color: #334155; }
            body.dark-mode .nav-splitter::before { background: #475569; }

            /* ===== KHUNG TỪ ĐIỂN (nhúng hover lookup) ===== */
            .nav-dict { display: flex; flex-direction: column; flex: 1 1 auto; min-height: 0; border-top: 1px solid #e2e8f0; }
            .nav-dict-head { display: flex; align-items: center; justify-content: space-between; padding: 8px 14px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; flex: 0 0 auto; }
            .nav-dict-title { font-weight: 800; font-size: 0.85em; color: #1e293b; }
            .nav-dict-body { flex: 1 1 auto; overflow-y: auto; padding: 10px 12px; }
            .nav-dict-empty { color: #94a3b8; font-size: 0.85em; text-align: center; padding: 22px 8px; line-height: 1.5; }
            .nav-dict-word { font-weight: 800; font-size: 1.05em; color: #2563eb; margin-bottom: 8px; display: flex; align-items: center; gap: 6px; }
            .nav-dict-speak { background: none; border: none; cursor: pointer; font-size: 1em; padding: 2px 4px; border-radius: 6px; }
            body.dark-mode .nav-dict { border-color: #334155; }
            body.dark-mode .nav-dict-head { background: #0f172a; border-color: #334155; }
            body.dark-mode .nav-dict-title { color: #e2e8f0; }
            body.dark-mode .nav-dict-body { background: #0f172a; }
            body.dark-mode .nav-dict-empty { color: #64748b; }
            body.dark-mode .nav-dict-word { color: #93c5fd; }

            /* Công tắc Tra từ */
            .nav-switch { position: relative; display: inline-block; width: 40px; height: 22px; flex-shrink: 0; }
            .nav-switch input { opacity: 0; width: 0; height: 0; }
            .nav-switch .nav-slider { position: absolute; inset: 0; background: #cbd5e1; border-radius: 22px; transition: .3s; cursor: pointer; }
            .nav-switch .nav-slider:before { content: ""; position: absolute; width: 16px; height: 16px; left: 3px; bottom: 3px; background: #fff; border-radius: 50%; transition: .3s; }
            .nav-switch input:checked + .nav-slider { background: #2563eb; }
            .nav-switch input:checked + .nav-slider:before { transform: translateX(18px); }

            /* Tay kéo cạnh trái để đổi chiều rộng navigator */
            .nav-resize-left { position: absolute; left: 0; top: 0; bottom: 0; width: 6px; cursor: w-resize; z-index: 30; transition: background 0.15s; }
            .nav-resize-left:hover { background: rgba(37,99,235,0.25); }

            /* Desktop trang đề: ẩn nút tra từ ở navbar + ẩn nút sách khi panel mở */
            @media (min-width: 768px) {
                body.has-question-nav #globalVocabBtn { display: none !important; }
                body.nav-open #nav-toggle-btn { display: none !important; }
            }
            /* Mobile: giữ nguyên giao diện cũ → ẩn splitter + khung từ điển + tay kéo */
            @media (max-width: 767px) { .nav-splitter, .nav-dict, .nav-resize-left { display: none !important; } .question-nav-panel { width: 100% !important; } }
        `;
        document.head.appendChild(style);
        buildNavigator();
        hookAnswerEvents();
    });

    // ===== XÂY DỰNG HTML =====
    function buildNavigator() {
        // Nút toggle
        navToggle = document.createElement('button');
        navToggle.id        = 'nav-toggle-btn';
        navToggle.className = 'nav-toggle-btn';
        navToggle.title     = 'Danh sách câu hỏi';
        navToggle.innerHTML =
            `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                <path d="M21 5c-1.11-.35-2.33-.5-3.5-.5-1.95 0-4.05.4-5.5 1.5-1.45-1.1-3.55-1.5-5.5-1.5S2.45 4.9 1 6v14.65c0 .25.25.5.5.5.1 0 .15-.05.25-.05C3.1 20.45 5.05 20 6.5 20c1.95 0 4.05.4 5.5 1.5 1.35-.85 3.8-1.5 5.5-1.5 1.65 0 3.35.3 4.75 1.05.1.05.15.05.25.05.25 0 .5-.25.5-.5V6c-.6-.45-1.25-.75-2-1zm0 13.5c-1.1-.35-2.3-.5-3.5-.5-1.7 0-4.15.65-5.5 1.5V8c1.35-.85 3.8-1.5 5.5-1.5 1.2 0 2.4.15 3.5.5v11.5z"/>
            </svg>
            <span class="nav-toggle-label">Câu hỏi</span>`;
        navToggle.addEventListener('click', togglePanel);
        document.body.appendChild(navToggle);

        // Panel
        navPanel = document.createElement('div');
        navPanel.id        = 'question-nav-panel';
        navPanel.className = 'question-nav-panel';
        navPanel.innerHTML =
            `<div class="nav-panel-header">
                <div class="nav-head-l">
                    <span class="nav-head-ic"><svg viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="3" width="7.5" height="7.5" rx="2" opacity=".45"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="2"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="2"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2" opacity=".45"/></svg></span>
                    <div><span class="nav-panel-title">Danh sách câu hỏi</span><span class="nav-panel-sub" id="nav-panel-sub"></span></div>
                </div>
                <button class="nav-panel-close" id="nav-close-btn" title="Đóng" aria-label="Đóng">✕</button>
            </div>
            <div class="nav-legend" id="nav-legend"></div>
            <div class="nav-grid" id="nav-grid-content"></div>
            <div class="nav-splitter" id="nav-splitter" title="Kéo để điều chỉnh chiều cao danh sách câu hỏi"></div>
            <div class="nav-dict" id="nav-dict">
                <div class="nav-dict-head">
                    <span class="nav-dict-title">Tra từ</span>
                    <label class="nav-switch"><input type="checkbox" id="nav-dict-toggle"><span class="nav-slider"></span></label>
                </div>
                <div class="nav-dict-body" id="nav-dict-body">
                    <div class="nav-dict-empty">Bấm vào một từ tiếng Hàn trong đề để tra nghĩa…</div>
                </div>
            </div>
            <div class="nav-resize-left" id="nav-resize-left"></div>`;
        document.body.appendChild(navPanel);
        document.body.classList.add('has-question-nav');

        document.getElementById('nav-close-btn').addEventListener('click', closePanel);
        window._navToggle = togglePanel;
        window._navClose = closePanel;

        // Thanh kéo phân cách: điều chỉnh chiều cao lưới câu hỏi (tối thiểu 2 dòng = 10 câu)
        (function () {
            var splitter = document.getElementById('nav-splitter');
            var grid = document.getElementById('nav-grid-content');
            if (!splitter || !grid) return;
            function minGridH() {
                var btn = grid.querySelector('.nav-q-btn');
                var rowH = btn ? btn.offsetHeight : 42;
                return 28 + 2 * rowH + 6; // padding 14*2 + 2 dòng + gap 6
            }
            var info = null;
            splitter.addEventListener('mousedown', function (e) {
                if (window.innerWidth < 768) return;
                info = { sy: e.clientY, h: grid.offsetHeight };
                e.preventDefault(); e.stopPropagation();
            });
            document.addEventListener('mousemove', function (e) {
                if (!info) return;
                var maxH = navPanel.offsetHeight - 160; // chừa header + khung từ điển tối thiểu
                var nh = Math.max(minGridH(), Math.min(maxH, info.h + (e.clientY - info.sy)));
                grid.style.height = nh + 'px';
            });
            document.addEventListener('mouseup', function () {
                if (!info) return;
                info = null;
                try { localStorage.setItem('navGridHeight', grid.offsetHeight); } catch (_) {}
            });
        })();

        // Công tắc Tra từ
        var dictToggle = document.getElementById('nav-dict-toggle');
        window._navSyncDictToggle = function () { if (dictToggle) dictToggle.checked = !document.body.classList.contains('vocab-disabled'); };
        window._navSyncDictToggle();
        dictToggle.addEventListener('change', function () {
            var on = this.checked;
            document.body.classList.toggle('vocab-disabled', !on);
            try { localStorage.setItem('vocabEnabled', on); } catch (_) {}
            var db = document.getElementById('nav-dict-body');
            if (!db) return;
            if (!on) db.innerHTML = '<div class="nav-dict-empty">Tra từ đang tắt.</div>';
            else if (!db.querySelector('.nav-dict-word')) db.innerHTML = '<div class="nav-dict-empty">Bấm vào một từ tiếng Hàn trong đề để tra nghĩa…</div>';
        });

        // Kéo cạnh trái để đổi chiều rộng
        (function () {
            var handle = document.getElementById('nav-resize-left');
            if (!handle) return;
            var info = null;
            handle.addEventListener('mousedown', function (e) {
                if (window.innerWidth < 768) return;
                info = { sx: e.clientX, w: navPanel.offsetWidth };
                e.preventDefault(); e.stopPropagation();
            });
            document.addEventListener('mousemove', function (e) {
                if (!info) return;
                var nw = Math.max(260, Math.min(760, info.w - (e.clientX - info.sx)));
                navPanel.style.width = nw + 'px';
            });
            document.addEventListener('mouseup', function () {
                if (!info) return;
                info = null;
                try { localStorage.setItem('navPanelWidth', navPanel.offsetWidth); } catch (_) {}
            });
            // Khôi phục chiều rộng đã lưu (chỉ desktop)
            try {
                var w = parseInt(localStorage.getItem('navPanelWidth'));
                if (w && window.innerWidth >= 768) navPanel.style.width = w + 'px';
            } catch (_) {}
        })();

        // Ẩn mặc định
        setToggleVisible(false);
        renderGrid(false);
    }

    // ===== HIỆN / ẨN NÚT TOGGLE =====
    function setToggleVisible(visible) {
        panelVisible = visible;
        navToggle.style.display = visible ? 'flex' : 'none';
        if (!visible) closePanel();
    }

    // ===== RENDER LƯỚI =====
    function renderGrid(showResults) {
        const grid = document.getElementById('nav-grid-content');
        if (!grid) return;

        allBlocks = Array.from(document.querySelectorAll('.question-block[id]'));
        if (allBlocks.length === 0) return;

        const isMobile = window.innerWidth < 768;
        const blocks = allBlocks;

        grid.innerHTML = '';

        // Tính số cột: mobile tự tính để vừa hết màn hình không scroll
        let cols = GRID_COLS; // 5 cột desktop
        if (isMobile) {
            const n = allBlocks.length;
            // Chiều cao khả dụng = màn hình - header panel (~58px) - padding (~28px)
            const panelH    = window.innerHeight;
            const hdEl      = document.querySelector('#question-nav-panel .nav-panel-header');
            const lgEl      = document.getElementById('nav-legend');
            const headerH   = (hdEl ? hdEl.offsetHeight : 64) + (lgEl ? 40 : 0);
            const paddingH  = 28;
            const availH    = panelH - headerH - paddingH;
            const gap       = 8;

            // Thử từ cols=5 đến cols=8, tìm cấu hình nhỏ nhất mà button vẫn >= 32px cao
            cols = 5;
            for (let c = 5; c <= 8; c++) {
                const rows      = Math.ceil(n / c);
                const btnH      = (availH - gap * (rows - 1)) / rows;
                if (btnH >= 32) { cols = c; break; }
                cols = c; // nếu không tìm được lý tưởng, dùng cols lớn nhất
            }
        }
        grid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;

        blocks.forEach(function (block) {
            const qNumEl = block.querySelector('.q-number');
            const qNum   = qNumEl
                ? qNumEl.innerText.replace(/[^\d]/g, '').trim()
                : block.id.replace(/\D/g, '');

            const btn = document.createElement('button');
            btn.className       = 'nav-q-btn';
            btn.textContent     = qNum || block.id;
            btn.dataset.blockId = block.id;
            btn.title           = 'Câu ' + qNum;

            // Đọc timestamp từ speaker icon (nếu có)
            const speakerIcon = block.querySelector('.speaker-icon');
            if (speakerIcon) {
                const oc    = speakerIcon.getAttribute('onclick') || '';
                const match = oc.match(/playQuestionAudio\((\d+),\s*(\d+)/);
                if (match) {
                    btn.dataset.audioStart = match[1];
                    btn.dataset.audioEnd   = match[2];
                }
            }

            if (showResults) {
                applyResultColor(btn, block);
            } else {
                updateBtnState(btn, block);
            }

            btn.addEventListener('click', function () {
                scrollToBlock(block.id);

                // Listening: tự phát audio timestamp câu đó
                if (isListening && btn.dataset.audioStart && typeof window.playQuestionAudio === 'function') {
                    var start = parseInt(btn.dataset.audioStart);
                    var end   = parseInt(btn.dataset.audioEnd);
                    // Chờ scroll animation xong (~400ms) rồi mới phát
                    setTimeout(function () {
                        window.playQuestionAudio(start, end, block);
                    }, 450);
                }

                // Mobile: đóng panel
                if (window.innerWidth < 768) closePanel();
            });

            grid.appendChild(btn);
        });

        updateSummary();

        // Chiều cao lưới (desktop): khôi phục đã lưu hoặc mặc định ~40%
        if (!isMobile) {
            var btn0 = grid.querySelector('.nav-q-btn');
            var rowH = btn0 ? btn0.offsetHeight : 42;
            var minH = 28 + 2 * rowH + 6; // tối thiểu 2 dòng = 10 câu
            var saved = 0;
            try { saved = parseInt(localStorage.getItem('navGridHeight')) || 0; } catch (_) {}
            var h = Math.max(minH, saved || Math.round(window.innerHeight * 0.4));
            h = Math.min(h, window.innerHeight - 160);
            grid.style.height = h + 'px';
        } else {
            grid.style.height = '';
        }
    }

    // ===== TỔNG KẾT (dòng phụ + chú thích màu) =====
    function updateSummary() {
        const grid = document.getElementById('nav-grid-content');
        const sub = document.getElementById('nav-panel-sub');
        const lg = document.getElementById('nav-legend');
        if (!grid || !sub || !lg) return;
        const n = cls => grid.querySelectorAll('.nav-q-btn.' + cls).length;
        const total = grid.querySelectorAll('.nav-q-btn').length;
        const ok = n('nav-q-correct'), bad = n('nav-q-wrong'), ans = n('nav-q-answered');
        const pill = (c, label, v) => '<span class="nav-pill ' + c + '"><i></i>' + label + ' <b>' + v + '</b></span>';
        if (isExamFinishedNav) {
            sub.textContent = 'Bấm số câu để xem lại';
            lg.innerHTML = pill('ok', 'Đúng', ok) + pill('bad', 'Sai', bad) + pill('skip', 'Bỏ qua', n('nav-q-skipped'));
        } else {
            const done = ok + bad + ans;
            sub.textContent = 'Đã làm ' + done + '/' + total + ' câu';
            lg.innerHTML = (ok || bad ? pill('ok', 'Đúng', ok) + pill('bad', 'Sai', bad) : '') + (ans ? pill('ans', 'Đã chọn', ans) : '') + pill('skip', 'Chưa làm', total - done);
        }
    }

    // ===== MÀU KẾT QUẢ (sau nộp bài) =====
    function applyResultColor(btn, block) {
        const opts = block.querySelector('.options');
        if (!opts) return;
        const hasWrong    = opts.querySelector('.option.wrong');
        const hasCorrect  = opts.querySelector('.option.correct');
        const hasSelected = opts.querySelector('.option.selected');

        if (hasWrong) {
            btn.classList.add('nav-q-wrong');
        } else if (hasCorrect && (hasSelected || hasCorrect.classList.contains('selected'))) {
            btn.classList.add('nav-q-correct');
        } else {
            btn.classList.add('nav-q-skipped'); // chưa chọn
        }
    }

    // ===== MÀU LUYỆN TẬP =====
    function updateBtnState(btn, block) {
        const opts = block.querySelector('.options');
        if (!opts) return;
        btn.classList.remove('nav-q-correct', 'nav-q-wrong', 'nav-q-answered', 'nav-q-skipped');
        if (opts.querySelector('.option.correct')) {
            btn.classList.add('nav-q-correct');
        } else if (opts.querySelector('.option.wrong')) {
            btn.classList.add('nav-q-wrong');
        } else if (opts.querySelector('.option.selected')) {
            btn.classList.add('nav-q-answered');
        }
    }

    // ===== CUỘN ĐẾN CÂU HỎI =====
    function scrollToBlock(blockId) {
        const el = document.getElementById(blockId);
        if (!el) return;
        const navEl = document.getElementById('globalNavbar');
        const navH  = navEl ? (navEl.offsetHeight + 30) : 85;
        const top   = el.getBoundingClientRect().top + window.pageYOffset - navH;
        window.scrollTo({ top: top, behavior: 'smooth' });
    }

    // ===== TOGGLE / OPEN / CLOSE =====
    function togglePanel() {
        if (isOpen) closePanel();
        else openPanel();
    }

    function openPanel() {
        if (!panelVisible) return;
        isOpen = true;
        navPanel.classList.add('open');
        navToggle.classList.add('active');
        document.body.classList.add('nav-open');
        if (window._navSyncDictToggle) window._navSyncDictToggle();
        if (!isExamFinishedNav) refreshGridColors();
    }

    function closePanel() {
        isOpen = false;
        navPanel.classList.remove('open');
        navToggle.classList.remove('active');
        document.body.classList.remove('nav-open');
    }

    // ===== LÀM MỚI MÀU LƯỚI =====
    function refreshGridColors() {
        const grid = document.getElementById('nav-grid-content');
        if (!grid) return;
        grid.querySelectorAll('.nav-q-btn').forEach(function (btn) {
            const block = document.getElementById(btn.dataset.blockId);
            if (block) updateBtnState(btn, block);
        });
        updateSummary();
    }

    // ===== HOOK CLICK ĐÁP ÁN =====
    function hookAnswerEvents() {
        document.addEventListener('click', function (e) {
            if (!e.target.closest('.option')) return;
            if (isExamFinishedNav) return;
            setTimeout(refreshGridColors, 150);
        });
    }

    // ===== PUBLIC API =====

    window.showPracticeNavigator = function () {
        isExamFinishedNav = false;
        renderGrid(false);
        setToggleVisible(true);
        // Mở sẵn danh sách câu hỏi trên desktop (máy tính)
        if (window.innerWidth >= 768) openPanel();
    };

    window.showExamNavigator = function () {
        isExamFinishedNav = true;
        renderGrid(true);
        setToggleVisible(true);
        openPanel();
    };

    window.hideNavigator = function () {
        setToggleVisible(false);
    };

})();
