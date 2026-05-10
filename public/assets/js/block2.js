/* ==========================================================================
   BLOCK.JS — Bảo Vệ Nội Dung: Chặn F12, Copy, Xem Mã Nguồn
   =========================================================================
   ⚠️  HƯỚNG DẪN SỬ DỤNG:
   - Khi cần kiểm tra giao diện mobile: DI CHUYỂN file này ra chỗ khác
   - Khi deploy lên server: ĐẶT file này đúng vị trí /assets/js/block.js
   ========================================================================== */

(function () {
    'use strict';

    // ===== 1. CHẶN CHUỘT PHẢI (Right-click) =====
    document.addEventListener('contextmenu', function (e) {
        e.preventDefault();
        return false;
    });

    // ===== 2. CHẶN PHÍM TẮT MỞ DEVTOOLS & XEM NGUỒN =====
    document.addEventListener('keydown', function (e) {
        // F12
        if (e.key === 'F12') {
            e.preventDefault();
            return false;
        }

        // Ctrl+Shift+I  (Elements / DevTools)
        // Ctrl+Shift+J  (Console)
        // Ctrl+Shift+C  (Inspect Element)
        if (e.ctrlKey && e.shiftKey) {
            const k = e.key.toLowerCase();
            if (k === 'i' || k === 'j' || k === 'c') {
                e.preventDefault();
                return false;
            }
        }

        // Ctrl+U  (View Page Source)
        if (e.ctrlKey && (e.key === 'u' || e.key === 'U')) {
            e.preventDefault();
            return false;
        }

        // Ctrl+S  (Save page)
        if (e.ctrlKey && (e.key === 's' || e.key === 'S')) {
            e.preventDefault();
            return false;
        }

        // Ctrl+A  (Select All) — ngoại trừ trong input/textarea
        if (e.ctrlKey && (e.key === 'a' || e.key === 'A')) {
            const tag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
            if (tag !== 'input' && tag !== 'textarea' && tag !== 'select') {
                e.preventDefault();
                return false;
            }
        }

        // Ctrl+C  (Copy) — ngoại trừ trong input/textarea
        if (e.ctrlKey && (e.key === 'c' || e.key === 'C')) {
            const tag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
            if (tag !== 'input' && tag !== 'textarea' && tag !== 'select') {
                e.preventDefault();
                return false;
            }
        }
    });

    // ===== 3. CHẶN KÉO THẢ NỘI DUNG =====
    document.addEventListener('dragstart', function (e) {
        // Cho phép kéo thả trong input/textarea
        const tag = e.target.tagName ? e.target.tagName.toLowerCase() : '';
        if (tag !== 'input' && tag !== 'textarea') {
            e.preventDefault();
            return false;
        }
    });

    // ===== 4. CHẶN COPY / CUT qua clipboard events =====
    // (Vẫn cho phép copy trong ô input và textarea)
    document.addEventListener('copy', function (e) {
        const tag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
        if (tag !== 'input' && tag !== 'textarea' && tag !== 'select') {
            e.preventDefault();
            return false;
        }
    });

    document.addEventListener('cut', function (e) {
        const tag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
        if (tag !== 'input' && tag !== 'textarea' && tag !== 'select') {
            e.preventDefault();
            return false;
        }
    });

    // ===== 5. CHẶN CHỌN VĂN BẢN BẰNG CSS UserSelect =====
    // Áp dụng cho toàn trang nhưng loại trừ input/textarea
    var style = document.createElement('style');
    style.id = 'block-js-styles';
    style.textContent = [
        '*, *::before, *::after {',
        '    -webkit-user-select: none !important;',
        '    -moz-user-select: none !important;',
        '    -ms-user-select: none !important;',
        '    user-select: none !important;',
        '}',
        'input, textarea, select, [contenteditable="true"] {',
        '    -webkit-user-select: text !important;',
        '    -moz-user-select: text !important;',
        '    -ms-user-select: text !important;',
        '    user-select: text !important;',
        '}'
    ].join('\n');
    document.head.appendChild(style);

    // ===== 6. PHÁT HIỆN DevTools ĐANG MỞ (Anti-inspect trick) =====
    // Dùng kỹ thuật đo thời gian debugger để phát hiện DevTools
    var devtoolsOpen = false;
    var threshold = 160;

    function checkDevTools() {
        if (
            window.outerWidth - window.innerWidth > threshold ||
            window.outerHeight - window.innerHeight > threshold
        ) {
            if (!devtoolsOpen) {
                devtoolsOpen = true;
                // Redirect hoặc clear nội dung khi phát hiện DevTools
                // (comment dòng dưới nếu không muốn redirect)
                // window.location.href = '/';
            }
        } else {
            devtoolsOpen = false;
        }
    }

    // Kiểm tra định kỳ mỗi 1 giây
    setInterval(checkDevTools, 1000);

    // ===== 7. CHO PHÉP CLICK VÀO THẺ TỪ VỰNG =====
    // Tính năng vocab-word vẫn hoạt động bình thường
    // (không cần can thiệp vì chỉ chặn select/copy text, không chặn click event)

})();
