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

    // ===== KHỞI TẠO =====
    document.addEventListener('DOMContentLoaded', function () {
        const style = document.createElement('style');
        style.innerHTML = `
            .container, .global-nav { transition: transform 0.28s cubic-bezier(0.4, 0, 0.2, 1); }
            @media (min-width: 1160px) {
                body.nav-open .container, body.nav-open .global-nav {
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
            body.dark-mode .nav-panel-header {
                background: rgba(30, 41, 59, 0.95) !important;
                border-bottom-color: rgba(255, 255, 255, 0.1) !important;
            }
            body.dark-mode .nav-panel-title {
                color: #93c5fd !important;
            }
            body.dark-mode .nav-panel-close {
                background: rgba(255, 255, 255, 0.08) !important;
                color: #94a3b8 !important;
                border-color: rgba(255, 255, 255, 0.1) !important;
            }
            body.dark-mode .nav-panel-close:hover {
                background: rgba(255, 255, 255, 0.15) !important;
                color: #f1f5f9 !important;
            }
            body.dark-mode .nav-q-btn {
                background: rgba(30, 41, 59, 0.8) !important;
                color: #cbd5e1 !important;
                border-color: rgba(255, 255, 255, 0.1) !important;
            }
            body.dark-mode .nav-q-btn:hover {
                background: rgba(51, 65, 85, 0.9) !important;
                color: #f1f5f9 !important;
            }
            body.dark-mode .nav-q-btn.nav-q-correct {
                background: rgba(16, 185, 129, 0.25) !important;
                border-color: #10b981 !important;
                color: #6ee7b7 !important;
            }
            body.dark-mode .nav-q-btn.nav-q-wrong {
                background: rgba(239, 68, 68, 0.25) !important;
                border-color: #ef4444 !important;
                color: #fca5a5 !important;
            }
            body.dark-mode .nav-q-btn.nav-q-answered {
                background: rgba(59, 130, 246, 0.25) !important;
                border-color: #3b82f6 !important;
                color: #93c5fd !important;
            }
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
                <span class="nav-panel-title">📋 Danh sách câu hỏi</span>
                <button class="nav-panel-close" id="nav-close-btn" title="Đóng">✕</button>
            </div>
            <div class="nav-grid" id="nav-grid-content"></div>`;
        document.body.appendChild(navPanel);

        document.getElementById('nav-close-btn').addEventListener('click', closePanel);
        window._navToggle = togglePanel;

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

        const blocks = Array.from(document.querySelectorAll('.question-block[id]'));
        if (blocks.length === 0) return;

        grid.innerHTML = '';

        // Tính số cột: mobile tự tính để vừa hết màn hình không scroll
        const isMobile = window.innerWidth < 768;
        let cols = GRID_COLS; // 5 cột desktop
        if (isMobile) {
            const n = blocks.length;
            // Chiều cao khả dụng = màn hình - header panel (~58px) - padding (~28px)
            const panelH    = window.innerHeight;
            const headerH   = 58;
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
