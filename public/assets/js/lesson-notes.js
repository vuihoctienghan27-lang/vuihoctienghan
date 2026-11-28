/* ==========================================================================
   LESSON-NOTES.JS — Sổ tay nháp bài học (dùng chung vocab.html + trang giáo trình)
   - window.LessonNotes.open({ folderId, folderTitle, lessonName, noteId })
       noteId (tùy chọn): khóa lưu riêng, ví dụ bài giáo trình → 'cur_<cid>_<lid>'.
       Không có noteId thì dùng khóa cũ theo folderId + lessonName (tương thích dữ liệu cũ).
   - Lưu localStorage + Firestore users/{uid}/lesson_notes/{docId}.
   - Zoom (nút −/+, Ctrl + lăn chuột, Ctrl +/−/0) chỉ phóng to phần nội dung;
     header, thanh công cụ và footer giữ nguyên kích thước.
   - Cần web-telex.js nếu muốn nút Telex (không có thì nút tự ẩn).
   ========================================================================== */
(function () {
    if (window.LessonNotes) return;

    const MODAL_ID = '_lessonNotesModal';
    const BASE_FONT_SIZE = '18px';
    const ZOOM_KEY = 'topik_lesson_note_zoom';
    const ZOOM_MIN = 0.5, ZOOM_MAX = 3, ZOOM_STEP = 0.1;
    const ZWSP = '​';

    function escapeHtml(text) {
        if (text === null || text === undefined || text === '') return '';
        return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    function ensureStyles() {
        if (document.getElementById('_lessonNotesStyles')) return;
        const style = document.createElement('style');
        style.id = '_lessonNotesStyles';
        const M = '#' + MODAL_ID;
        style.textContent = `
            ${M} {
                position: fixed;
                inset: 0;
                z-index: 999999;
                background: rgba(15, 23, 42, 0.85);
                backdrop-filter: blur(8px);
                display: flex;
                align-items: center;
                justify-content: center;
                font-family: 'Pretendard', 'Inter', system-ui, -apple-system, sans-serif;
                font-size: 16px;
                color: #0f172a;
                animation: lnmFadeIn 0.2s ease-out;
            }
            @keyframes lnmFadeIn {
                from { opacity: 0; transform: scale(0.99); }
                to { opacity: 1; transform: scale(1); }
            }
            ${M} *, ${M} *::before, ${M} *::after { box-sizing: border-box; }
            ${M} .gfm-container {
                background: #f8fafc;
                display: flex;
                flex-direction: column;
                width: 100vw;
                height: 100vh;
                height: 100dvh;
                overflow: hidden;
                box-shadow: 0 25px 60px rgba(0,0,0,0.4);
                transition: all 0.25s ease;
            }
            ${M} .gfm-container.is-windowed {
                width: 95vw;
                max-width: 1380px;
                height: 94vh;
                border-radius: 18px;
                border: 1px solid rgba(255,255,255,0.2);
            }
            /* Chia đôi màn hình: sổ tay thu gọn nửa phải, lộ nội dung trang bên trái */
            ${M}.is-split {
                background: transparent !important;
                backdrop-filter: none !important;
                justify-content: flex-end !important;
                align-items: stretch !important;
                pointer-events: none !important;
            }
            ${M}.is-split .gfm-container {
                pointer-events: auto !important;
                width: 50vw !important;
                max-width: none !important;
                height: 100vh !important;
                height: 100dvh !important;
                border-radius: 0 !important;
                border: none !important;
                border-left: 2px solid rgba(255,255,255,0.25) !important;
                box-shadow: -16px 0 48px rgba(0,0,0,0.35) !important;
            }
            ${M}.is-split .gfm-editor-content {
                max-width: 100% !important;
                padding: 26px 28px !important;
            }
            body.lesson-notes-split .wrapper,
            body.lesson-notes-split .container,
            body.lesson-notes-split .cl-wrap {
                width: 50vw !important;
                max-width: none !important;
                margin-left: 0 !important;
                margin-right: 0 !important;
                border-radius: 0 24px 24px 0 !important;
            }
            body.lesson-notes-split .global-nav {
                width: 50vw !important;
                max-width: none !important;
                margin-left: 0 !important;
                margin-right: 0 !important;
                border-radius: 0 20px 20px 0 !important;
            }
            body.lesson-notes-split .top-gradient-mask {
                right: auto !important;
                width: 50vw !important;
            }
            body.lesson-notes-split .swal2-container,
            body.lesson-notes-split .swal2-backdrop,
            body.lesson-notes-split .modal-overlay,
            body.lesson-notes-split .cl-fc,
            body.lesson-notes-split #_grammarVocabViewer,
            body.lesson-notes-split #_grammarLibraryModal,
            body.lesson-notes-split #_grammarLibPreviewModal {
                left: 0 !important;
                right: auto !important;
                width: 50vw !important;
            }
            body.lesson-notes-split .lnm-fab { display: none !important; }

            ${M} .gfm-header {
                padding: 6px 16px;
                min-height: 44px;
                background: linear-gradient(135deg, #eef2ff, #f8fafc);
                border-bottom: 1px solid #e2e8f0;
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 10px;
                flex-shrink: 0;
            }
            ${M} .gfm-title-area { display: flex; align-items: center; gap: 8px; min-width: 0; }
            ${M} .gfm-badge {
                background: linear-gradient(135deg, #4f46e5, #4338ca);
                color: #ffffff;
                font-size: 0.72em;
                font-weight: 800;
                padding: 3px 8px;
                border-radius: 6px;
                letter-spacing: 0.5px;
                white-space: nowrap;
            }
            ${M} .gfm-tabs { display: flex; background: #f1f5f9; padding: 2px; border-radius: 8px; gap: 3px; }
            ${M} .gfm-tab-btn {
                background: transparent;
                border: none;
                padding: 4px 10px;
                border-radius: 6px;
                font-size: 0.82em;
                font-weight: 700;
                color: #64748b;
                cursor: pointer;
                transition: all 0.15s ease;
                display: inline-flex;
                align-items: center;
                gap: 5px;
                font-family: inherit;
            }
            ${M} .gfm-tab-btn.active { background: #ffffff; color: #4f46e5; box-shadow: 0 2px 6px rgba(0,0,0,0.06); }
            ${M} .gfm-workspace { display: flex; flex: 1; min-height: 0; overflow: hidden; background: #f1f5f9; }
            ${M} .gfm-editor-col {
                flex: 1;
                min-width: 0;
                display: flex;
                flex-direction: column;
                background: #f1f5f9;
                width: 100%;
                overflow: hidden;
            }
            ${M} .gfm-toolbar {
                display: flex;
                flex-wrap: wrap;
                align-items: center;
                gap: 3px;
                padding: 5px 14px;
                background: #ffffff;
                border-bottom: 1px solid #e2e8f0;
                user-select: none;
                width: 100%;
                flex-shrink: 0;
            }
            ${M} .gfm-tool-group {
                display: inline-flex;
                align-items: center;
                gap: 2px;
                background: #ffffff;
                padding: 1px 3px;
                border: 1px solid #e2e8f0;
                border-radius: 6px;
            }
            ${M} .gfm-tool-sep { width: 1px; height: 18px; background: #cbd5e1; margin: 0 3px; }
            ${M} .gfm-tool-btn {
                background: transparent;
                border: none;
                border-radius: 5px;
                padding: 4px 7px;
                font-size: 0.82em;
                font-weight: 700;
                color: #334155;
                cursor: pointer;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                min-width: 28px;
                height: 28px;
                transition: all 0.15s ease;
                font-family: inherit;
                line-height: 1;
            }
            ${M} .gfm-tool-btn:hover { background: #e2e8f0; color: #0f172a; }
            ${M} .gfm-tool-btn:active { background: #cbd5e1; }
            ${M} .gfm-tool-btn.is-active { background: #e0e7ff !important; color: #4338ca !important; }
            ${M} .gfm-select {
                border: none;
                background: transparent;
                padding: 3px 5px;
                font-size: 0.82em;
                font-weight: 600;
                color: #334155;
                outline: none;
                cursor: pointer;
                border-radius: 5px;
                font-family: inherit;
                height: 28px;
            }
            ${M} .gfm-select:hover { background: #f1f5f9; }
            ${M} .lnm-zoom-val {
                min-width: 52px;
                font-variant-numeric: tabular-nums;
                color: #4338ca;
            }
            ${M} .gfm-editor-scroll-wrap {
                flex: 1;
                min-height: 0;
                overflow: auto;
                padding: 22px 20px;
                display: flex;
                flex-direction: column;
                align-items: center;
                width: 100%;
            }
            ${M} .gfm-editor-content {
                display: block;
                width: 100%;
                max-width: 880px;
                min-height: 100%;
                height: auto;
                flex-shrink: 0;
                margin: 0 auto 30px auto;
                padding: 32px 40px;
                font-size: ${BASE_FONT_SIZE};
                line-height: 1.85;
                color: #1e293b;
                outline: none;
                word-break: break-word;
                background: #ffffff;
                border-radius: 14px;
                border: 1px solid #e2e8f0;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04);
                transition: border-color 0.2s, box-shadow 0.2s;
                text-align: left;
            }
            ${M} .gfm-editor-content:focus { border-color: #cbd5e1; box-shadow: 0 4px 24px rgba(0, 0, 0, 0.07); }
            ${M} .gfm-editor-content:empty:before { content: attr(placeholder); color: #94a3b8; font-style: italic; }
            ${M} .gfm-editor-content p { margin: 0 0 6px; }
            ${M} .gfm-footer {
                padding: 12px 24px;
                background: #ffffff;
                border-top: 1px solid #e2e8f0;
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 10px;
                flex-shrink: 0;
            }
            ${M} .lnm-footer-btns { display: flex; align-items: center; gap: 10px; }
            ${M} .lnm-footer-btns button { font-family: inherit; }
            ${M} .gfm-preview-wrapper {
                flex: 1;
                min-height: 0;
                overflow: auto;
                padding: 30px;
                background: #f1f5f9;
                display: flex;
                justify-content: center;
            }
            ${M} .gfm-preview-card {
                background: #ffffff;
                border-radius: 16px;
                border: 2px solid #e2e8f0;
                border-left: 6px solid #4f46e5;
                padding: 26px 30px;
                max-width: 860px;
                width: 100%;
                box-shadow: 0 10px 30px rgba(0,0,0,0.06);
                align-self: flex-start;
            }
            ${M} .lnm-preview-body { font-size: ${BASE_FONT_SIZE}; line-height: 1.85; color: #1e293b; word-break: break-word; }

            /* Popover chọn màu ô ghi chú (gắn vào body) */
            .gfm-color-popover {
                position: fixed;
                z-index: 1000005;
                background: #ffffff;
                border: 1px solid #cbd5e1;
                border-radius: 12px;
                padding: 8px 10px;
                box-shadow: 0 12px 32px rgba(0,0,0,0.2);
                display: flex;
                flex-direction: column;
                gap: 4px;
                min-width: 200px;
                font-family: 'Pretendard', 'Inter', system-ui, sans-serif;
            }
            .gfm-color-popover-item {
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 7px 10px;
                border-radius: 8px;
                cursor: pointer;
                font-size: 0.86em;
                font-weight: 700;
                color: #334155;
                background: transparent;
                border: none;
                text-align: left;
                width: 100%;
                font-family: inherit;
            }
            .gfm-color-popover-item:hover { background: #f1f5f9; }
            .gfm-color-dot {
                width: 16px;
                height: 16px;
                border-radius: 50%;
                border: 2px solid #fff;
                box-shadow: 0 0 0 1px rgba(0,0,0,0.2);
                flex-shrink: 0;
            }

            /* Ô ghi chú nổi bật trong nội dung */
            ${M} .grammar-example-box {
                margin: 14px 0;
                padding: 14px 18px;
                background: #f0fdf4;
                border: 1.5px solid #86efac;
                border-left: 5px solid #10b981;
                border-radius: 12px;
                box-shadow: 0 2px 8px rgba(16, 185, 129, 0.08);
                position: relative;
            }
            ${M} .grammar-example-box.theme-blue { background: #f0f9ff; border-color: #7dd3fc; border-left-color: #0284c7; }
            ${M} .grammar-example-box.theme-purple { background: #faf5ff; border-color: #d8b4fe; border-left-color: #8b5cf6; }
            ${M} .grammar-example-box.theme-amber { background: #fffbeb; border-color: #fde68a; border-left-color: #f59e0b; }
            ${M} .grammar-example-box.theme-yellow { background: #fefce8; border-color: #fef08a; border-left-color: #eab308; }
            ${M} .grammar-example-box.theme-rose { background: #fff1f2; border-color: #fecdd3; border-left-color: #f43f5e; }
            ${M} .grammar-example-box .example-badge {
                display: inline-flex;
                align-items: center;
                gap: 5px;
                font-weight: 800;
                font-size: 0.82em;
                color: #15803d;
                background: #dcfce7;
                padding: 3px 10px;
                border-radius: 8px;
                margin-bottom: 8px;
            }
            ${M} .grammar-example-box.theme-blue .example-badge { color: #0369a1; background: #e0f2fe; }
            ${M} .grammar-example-box.theme-purple .example-badge { color: #6d28d9; background: #f3e8ff; }
            ${M} .grammar-example-box.theme-amber .example-badge { color: #b45309; background: #fef3c7; }
            ${M} .grammar-example-box.theme-yellow .example-badge { color: #a16207; background: #fef9c3; }
            ${M} .grammar-example-box.theme-rose .example-badge { color: #be123c; background: #ffe4e6; }
            ${M} .grammar-example-box .example-content {
                outline: none;
                min-height: 24px;
                line-height: 1.7;
                font-size: 1.05em;
                color: #1e293b;
                word-break: break-word;
            }
            ${M} .grammar-example-box .example-content p { margin: 4px 0; }

            /* Nút nổi mở sổ tay (trang giáo trình) */
            .lnm-fab {
                position: fixed;
                bottom: 26px;
                left: 26px;
                z-index: 99994;
                background: linear-gradient(135deg, #6366f1 0%, #4338ca 100%);
                color: #ffffff;
                width: 52px;
                height: 52px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 24px;
                box-shadow: 0 10px 25px rgba(79, 70, 229, 0.45), 0 2px 6px rgba(0, 0, 0, 0.15);
                cursor: pointer;
                border: 2px solid rgba(255, 255, 255, 0.7);
                transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
            }
            .lnm-fab:hover { transform: scale(1.1) translateY(-3px); }
            .lnm-fab .lnm-fab-tip {
                position: absolute;
                left: 64px;
                background: rgba(15, 23, 42, 0.92);
                color: #ffffff;
                padding: 6px 14px;
                border-radius: 20px;
                font-size: 13px;
                font-weight: 700;
                white-space: nowrap;
                pointer-events: none;
                opacity: 0;
                transform: translateX(-10px);
                transition: all 0.25s ease;
                font-family: 'Pretendard', 'Inter', sans-serif;
            }
            .lnm-fab:hover .lnm-fab-tip { opacity: 1; transform: translateX(0); }

            @media (max-width: 768px) {
                ${M}.is-split .gfm-container { width: 100vw !important; }
                body.lesson-notes-split .wrapper,
                body.lesson-notes-split .container,
                body.lesson-notes-split .cl-wrap,
                body.lesson-notes-split .global-nav {
                    width: 100vw !important;
                    border-radius: 16px !important;
                }
                body.lesson-notes-split .swal2-container,
                body.lesson-notes-split .swal2-backdrop,
                body.lesson-notes-split .modal-overlay,
                body.lesson-notes-split .cl-fc,
                body.lesson-notes-split #_grammarVocabViewer,
                body.lesson-notes-split #_grammarLibraryModal,
                body.lesson-notes-split #_grammarLibPreviewModal {
                    width: 100vw !important;
                }
                ${M} .gfm-container { width: 100vw !important; height: 100dvh !important; border-radius: 0 !important; }
                ${M} .gfm-header { padding: 8px 12px; flex-wrap: wrap; gap: 6px; }
                ${M} .gfm-title-area { gap: 6px; flex: 1 1 auto; }
                ${M} .gfm-tabs { width: 100%; order: 3; margin-top: 2px; }
                ${M} .gfm-tab-btn { flex: 1; justify-content: center; padding: 6px; }
                ${M} .gfm-toolbar { padding: 5px 8px; }
                ${M} .gfm-editor-scroll-wrap { padding: 0; }
                ${M} .gfm-editor-content {
                    padding: 14px;
                    line-height: 1.65;
                    border-radius: 0;
                    border: none;
                    box-shadow: none;
                    min-height: 280px;
                }
                ${M} .gfm-footer { padding: 8px 10px; flex-direction: column; gap: 6px; }
                ${M} .lnm-footer-btns { width: 100%; gap: 6px; }
                ${M} .lnm-footer-btns button { flex: 1; padding: 9px 4px !important; font-size: 0.82em !important; justify-content: center; }
                .lnm-fab { bottom: 18px; left: 16px; width: 48px; height: 48px; font-size: 22px; }
                .lnm-fab .lnm-fab-tip { display: none; }
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * Khởi tạo tính năng Ô Ví Dụ Ngang + Chọn màu khi Ấn Giữ
     * @param {object} config - { btn, getEditor, getSavedRange, defaultBadge }
     */
    function setupHorizontalExampleTool(config) {
        const btn = config.btn;
        if (!btn) return;
        const getEditor = config.getEditor;
        const getSavedRange = config.getSavedRange;
        const defaultBadge = config.defaultBadge || '💡 Ví dụ minh họa';

        let activeColor = 'green';
        let pressTimer = null;
        let isLongPress = false;

        const colorMap = {
            green: { name: 'Xanh lá giáo trình', hex: '#10b981' },
            blue: { name: 'Xanh dương hiện đại', hex: '#0284c7' },
            purple: { name: 'Tím nổi bật', hex: '#8b5cf6' },
            amber: { name: 'Cam ấm áp', hex: '#f59e0b' },
            yellow: { name: 'Vàng dạ quang', hex: '#eab308' },
            rose: { name: 'Đỏ hồng lưu ý', hex: '#f43f5e' }
        };

        const dot = btn.querySelector('.gfm-color-dot-indicator');
        function updateDot(c) {
            activeColor = c;
            if (dot && colorMap[c]) {
                dot.style.background = colorMap[c].hex;
                dot.style.boxShadow = `0 0 0 1px ${colorMap[c].hex}`;
            }
        }

        // Chèn 1 ô ngang ví dụ vào vị trí con trỏ
        function insertBox() {
            const editor = getEditor();
            if (!editor) return;
            editor.focus();

            if (typeof getSavedRange === 'function') {
                const r = getSavedRange();
                if (r) {
                    const sel = window.getSelection();
                    sel.removeAllRanges();
                    sel.addRange(r);
                }
            }

            const sel = window.getSelection();
            let selectedHtml = '';
            let hasSelection = false;

            if (sel && sel.rangeCount > 0) {
                const range = sel.getRangeAt(0);
                if (editor.contains(range.commonAncestorContainer) && !range.collapsed) {
                    hasSelection = true;
                    // Lấy chính xác HTML bao gồm in đậm <b>, <strong> và các thẻ xuống dòng <p>, <br>, <div>
                    const fragment = range.cloneContents();
                    const tempDiv = document.createElement("div");
                    tempDiv.appendChild(fragment);
                    selectedHtml = tempDiv.innerHTML.trim();

                    // Nếu text được chọn là văn bản thuần có dấu xuống dòng \n nhưng không có thẻ xuống dòng
                    if (selectedHtml && !/<(p|br|div|h[1-6]|li|tr|table)\b/i.test(selectedHtml) && selectedHtml.includes('\n')) {
                        selectedHtml = selectedHtml.replace(/\r?\n/g, '<br>');
                    }
                }
            }

            // Nếu không có nội dung bôi đen: CHỈ HIỆN Ô TRỐNG (không có ví dụ sẵn)
            // Nếu có nội dung bôi đen: đưa nội dung vào ô ví dụ và giữ nguyên 100% in đậm và cách xuống dòng
            const innerContent = hasSelection ? selectedHtml : '<p><br></p>';

            const boxHtml = `
                <div class="grammar-example-box theme-${activeColor}" style="margin:14px 0;padding:14px 18px;border-radius:12px;">
                    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;user-select:none;" contenteditable="false">
                        <span class="example-badge">${escapeHtml(defaultBadge)}</span>
                        <span style="font-size:0.75em;color:#64748b;font-weight:600;">(Ấn giữ nút trên thanh công cụ để đổi màu ô)</span>
                    </div>
                    <div class="example-content" style="outline:none;min-height:24px;line-height:1.7;font-size:1.05em;">${innerContent}</div>
                </div>
                <p><br></p>
            `;

            if (sel && sel.rangeCount > 0) {
                const range = sel.getRangeAt(0);
                if (editor.contains(range.commonAncestorContainer)) {
                    range.deleteContents();
                    const temp = document.createElement("div");
                    temp.innerHTML = boxHtml;
                    const frag = document.createDocumentFragment();
                    let node, targetContentEl;
                    while ((node = temp.firstChild)) {
                        if (!targetContentEl && node.querySelector) {
                            targetContentEl = node.querySelector('.example-content');
                        }
                        frag.appendChild(node);
                    }
                    range.insertNode(frag);

                    // Đặt con trỏ soạn thảo vào ngay bên trong ô ví dụ
                    if (targetContentEl) {
                        const newRange = document.createRange();
                        newRange.selectNodeContents(targetContentEl);
                        newRange.collapse(false);
                        sel.removeAllRanges();
                        sel.addRange(newRange);
                    }
                    return;
                }
            }

            editor.insertAdjacentHTML('beforeend', boxHtml);
        }

        // Mở popover chọn màu sắc ô ví dụ
        function showColorPopover() {
            const old = document.getElementById('_gfmColorPopover');
            if (old) old.remove();

            const pop = document.createElement('div');
            pop.id = '_gfmColorPopover';
            pop.className = 'gfm-color-popover';

            const rect = btn.getBoundingClientRect();
            pop.style.top = (rect.bottom + 6) + 'px';
            pop.style.left = Math.max(10, Math.min(window.innerWidth - 220, rect.left)) + 'px';

            pop.innerHTML = `
                <div style="font-size:0.78em;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;padding:4px 6px 6px;border-bottom:1px solid #e2e8f0;margin-bottom:4px;">
                    🎨 Chọn màu sắc ô ví dụ
                </div>
                ${Object.keys(colorMap).map(k => `
                    <button type="button" class="gfm-color-popover-item" data-theme="${k}">
                        <span class="gfm-color-dot" style="background:${colorMap[k].hex};"></span>
                        <span style="flex:1;">${colorMap[k].name}</span>
                        ${k === activeColor ? '<span style="color:#10b981;font-weight:900;">✓</span>' : ''}
                    </button>
                `).join('')}
            `;

            document.body.appendChild(pop);

            pop.querySelectorAll('.gfm-color-popover-item').forEach(item => {
                item.addEventListener('click', (ev) => {
                    ev.stopPropagation();
                    const chosen = item.dataset.theme;
                    updateDot(chosen);

                    // Nếu con trỏ đang nằm trong 1 ô ví dụ hiện có -> đổi màu ô đó luôn!
                    const editor = getEditor();
                    if (editor) {
                        const sel = window.getSelection();
                        if (sel && sel.anchorNode) {
                            let curr = sel.anchorNode;
                            while (curr && curr !== editor) {
                                if (curr.classList && curr.classList.contains('grammar-example-box')) {
                                    curr.className = curr.className.replace(/theme-[a-z]+/g, '').trim();
                                    curr.classList.add('theme-' + chosen);
                                    break;
                                }
                                curr = curr.parentNode;
                            }
                        }
                    }

                    if (typeof Swal !== 'undefined' && Swal.mixin) {
                        const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 1400 });
                        Toast.fire({ icon: 'success', title: `Đã chọn: ${colorMap[chosen].name}` });
                    }

                    pop.remove();
                });
            });

            setTimeout(() => {
                const closeHandler = (ev) => {
                    if (!pop.contains(ev.target) && ev.target !== btn && !btn.contains(ev.target)) {
                        pop.remove();
                        document.removeEventListener('click', closeHandler);
                    }
                };
                document.addEventListener('click', closeHandler);
            }, 50);
        }

        btn.addEventListener('mousedown', (e) => {
            if (e.button !== 0) return;
            isLongPress = false;
            pressTimer = setTimeout(() => {
                isLongPress = true;
                showColorPopover();
            }, 350);
        });

        btn.addEventListener('mouseup', () => {
            clearTimeout(pressTimer);
            if (!isLongPress) {
                insertBox();
            }
        });

        btn.addEventListener('mouseleave', () => {
            clearTimeout(pressTimer);
        });

        btn.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            showColorPopover();
        });

        btn.addEventListener('touchstart', () => {
            isLongPress = false;
            pressTimer = setTimeout(() => {
                isLongPress = true;
                showColorPopover();
            }, 350);
        }, { passive: true });

        btn.addEventListener('touchend', () => {
            clearTimeout(pressTimer);
            if (!isLongPress) {
                insertBox();
            }
        });

        updateDot('green');
    }
    window.setupHorizontalExampleTool = setupHorizontalExampleTool;

    // ---------- Khóa lưu trữ ----------
    function storageKeys(opts) {
        if (opts.noteId) {
            const id = String(opts.noteId).replace(/[^a-zA-Z0-9_-]/g, '_');
            return { local: 'topik_lesson_note_' + id, remote: id };
        }
        const folderId = opts.folderId || 'general';
        const lessonName = opts.lessonName || '';
        return {
            local: 'topik_lesson_note_' + folderId + '_' + (lessonName || 'general').replace(/[^a-zA-Z0-9_À-ɏḀ-ỿ가-힯]/g, '_'),
            remote: (folderId || 'gen') + '_' + (lessonName || 'all').replace(/[^a-zA-Z0-9_-]/g, '_')
        };
    }

    function currentUser() {
        const auth = (window.auth) || (typeof firebase !== 'undefined' && firebase.auth && firebase.auth());
        return auth && auth.currentUser;
    }

    // Bỏ ký tự giữ chỗ (ZWSP) và các thẻ cỡ chữ rỗng trước khi lưu
    function cleanContent(html) {
        if (!html || html.indexOf(ZWSP) === -1) return (html || '').trim();
        const tmp = document.createElement('div');
        tmp.innerHTML = html;
        const walker = document.createTreeWalker(tmp, NodeFilter.SHOW_TEXT);
        const texts = [];
        while (walker.nextNode()) texts.push(walker.currentNode);
        texts.forEach(t => { if (t.nodeValue.indexOf(ZWSP) !== -1) t.nodeValue = t.nodeValue.split(ZWSP).join(''); });
        tmp.querySelectorAll('span, font').forEach(el => { if (!el.textContent && !el.querySelector('img,br,hr')) el.remove(); });
        return tmp.innerHTML.trim();
    }

    function loadZoom() {
        const z = parseFloat(localStorage.getItem(ZOOM_KEY));
        return isFinite(z) && z >= ZOOM_MIN && z <= ZOOM_MAX ? z : 1;
    }

    // =========================================================================
    // MỞ SỔ TAY NHÁP
    // =========================================================================
    function open(opts) {
        opts = opts || {};
        ensureStyles();

        const folderId = opts.folderId || 'general';
        const folderTitle = opts.folderTitle || 'Thư mục học tập';
        const lessonName = opts.lessonName || '';
        const keys = storageKeys(opts);

        const old = document.getElementById(MODAL_ID);
        if (old) {
            if (typeof old._lnmCleanup === 'function') old._lnmCleanup();
            old.remove();
        }

        let savedData = { content: '' };
        try {
            const raw = localStorage.getItem(keys.local);
            if (raw) savedData = JSON.parse(raw) || savedData;
        } catch (e) { }

        let isFullscreen = true;
        let isSplit = false;
        let savedRange = null;
        let zoom = loadZoom();
        const hasTelex = typeof window.toggleWebTelex === 'function';

        const overlay = document.createElement('div');
        overlay.id = MODAL_ID;
        overlay.innerHTML = `
            <div class="gfm-container" id="lnmContainer">
                <div class="gfm-header">
                    <div class="gfm-title-area">
                        <span class="gfm-badge">📖 SỔ TAY NHÁP</span>
                        <span style="font-weight:700;font-size:0.9em;color:#1e1b4b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                            ${escapeHtml(folderTitle)}${lessonName ? ' / <b style="color:#4f46e5;">' + escapeHtml(lessonName) + '</b>' : ''}
                        </span>
                    </div>
                    <div class="gfm-tabs">
                        <button type="button" class="gfm-tab-btn active" id="lnmTabEdit"><span>✍️ Soạn ghi chú</span></button>
                        <button type="button" class="gfm-tab-btn" id="lnmTabPreview"><span>👁️ Xem lại</span></button>
                    </div>
                    <div style="display:flex;align-items:center;gap:4px;">
                        <button type="button" class="gfm-tool-btn" id="lnmToggleFullscreenBtn" title="Phóng to / Thu nhỏ cửa sổ" style="font-size:1.05em;padding:3px 6px;">⛶</button>
                        <button type="button" class="gfm-tool-btn" id="lnmSplitBtn" title="Chia đôi màn hình" style="font-size:1.05em;padding:3px 6px;">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:block;">
                                <path d="M2 4h5a5 5 0 0 1 5 5v11a5 5 0 0 0-5-5H2z"></path>
                                <path d="M22 4h-5a5 5 0 0 0-5 5v11a5 5 0 0 1 5-5h5z"></path>
                                <line x1="12" y1="4" x2="12" y2="20"></line>
                            </svg>
                        </button>
                        <button type="button" class="gfm-tool-btn" id="lnmCloseModalBtn" title="Đóng cửa sổ" style="font-size:1.25em;color:#ef4444;padding:3px 6px;">&times;</button>
                    </div>
                </div>

                <div class="gfm-workspace" id="lnmWorkspace">
                    <div class="gfm-editor-col">
                        <div class="gfm-toolbar" id="lnmToolbar">
                            <div class="gfm-tool-group" title="Chọn Font chữ">
                                <select id="lnmFontFamily" class="gfm-select">
                                    <option value="'Pretendard', sans-serif">Pretendard (Chuẩn)</option>
                                    <option value="'Nanum Gothic', sans-serif">Nanum Gothic (나눔고딕)</option>
                                    <option value="'Nanum Myeongjo', serif">Nanum Myeongjo (나눔명조)</option>
                                    <option value="Inter, sans-serif">Inter</option>
                                    <option value="Roboto, sans-serif">Roboto</option>
                                    <option value="Arial, sans-serif">Arial</option>
                                    <option value="'Times New Roman', serif">Times New Roman</option>
                                    <option value="'Courier New', monospace">Courier New</option>
                                </select>
                            </div>
                            <div class="gfm-tool-group" title="Kích thước chữ (bôi đen chữ để đổi; không bôi đen thì áp dụng cho chữ gõ tiếp theo)">
                                <select id="lnmFontSize" class="gfm-select">
                                    <option value="14px">14px - Nhỏ</option>
                                    <option value="16px">16px - Vừa</option>
                                    <option value="18px" selected>18px - Chuẩn</option>
                                    <option value="20px">20px - Lớn</option>
                                    <option value="24px">24px - Tiêu đề 3</option>
                                    <option value="28px">28px - Tiêu đề 2</option>
                                    <option value="32px">32px - Tiêu đề 1</option>
                                </select>
                            </div>

                            <span class="gfm-tool-sep"></span>

                            <div class="gfm-tool-group" title="Màu chữ">
                                <span style="font-size:0.82em;font-weight:700;color:#64748b;padding-left:4px;">Chữ:</span>
                                <input type="color" id="lnmTextColorPicker" value="#0f172a" style="width:26px;height:26px;border:none;background:transparent;cursor:pointer;padding:0;" title="Bảng màu chữ">
                                <button type="button" class="gfm-tool-btn" data-color="#dc2626" style="color:#dc2626;padding:2px 4px;" title="Đỏ">A</button>
                                <button type="button" class="gfm-tool-btn" data-color="#2563eb" style="color:#2563eb;padding:2px 4px;" title="Xanh">A</button>
                                <button type="button" class="gfm-tool-btn" data-color="#16a34a" style="color:#16a34a;padding:2px 4px;" title="Xanh lá">A</button>
                                <button type="button" class="gfm-tool-btn" data-color="#7c3aed" style="color:#7c3aed;padding:2px 4px;" title="Tím">A</button>
                            </div>
                            <div class="gfm-tool-group" title="Màu nền / Highlight">
                                <span style="font-size:0.82em;font-weight:700;color:#64748b;padding-left:4px;">Nền:</span>
                                <input type="color" id="lnmBgColorPicker" value="#fef08a" style="width:26px;height:26px;border:none;background:transparent;cursor:pointer;padding:0;" title="Bảng màu nền">
                                <button type="button" class="gfm-tool-btn" data-bg="#fef08a" style="background:#fef08a;width:18px;height:18px;min-width:18px;border-radius:4px;padding:0;" title="Vàng nhạt"></button>
                                <button type="button" class="gfm-tool-btn" data-bg="#bae6fd" style="background:#bae6fd;width:18px;height:18px;min-width:18px;border-radius:4px;padding:0;" title="Xanh nhạt"></button>
                                <button type="button" class="gfm-tool-btn" data-bg="#bbf7d0" style="background:#bbf7d0;width:18px;height:18px;min-width:18px;border-radius:4px;padding:0;" title="Xanh lá nhạt"></button>
                                <button type="button" class="gfm-tool-btn" data-bg="#fbcfe8" style="background:#fbcfe8;width:18px;height:18px;min-width:18px;border-radius:4px;padding:0;" title="Hồng nhạt"></button>
                                <button type="button" class="gfm-tool-btn" data-bg="transparent" style="font-size:0.75em;color:#64748b;padding:2px 4px;" title="Xóa nền">✕</button>
                            </div>

                            <span class="gfm-tool-sep"></span>

                            <button type="button" class="gfm-tool-btn" id="lnmInsertExampleBtn"
                                    title="Bấm: Chèn ô ghi chú nổi bật | Ấn giữ: Chọn màu sắc ô"
                                    style="background:#f0fdf4;border:1.5px solid #10b981;color:#15803d;padding:3px 9px;display:inline-flex;align-items:center;gap:5px;border-radius:6px;">
                                <span>💡 Ô ghi chú</span>
                                <span class="gfm-color-dot-indicator" style="width:9px;height:9px;border-radius:50%;background:#10b981;border:1px solid #fff;box-shadow:0 0 0 1px #10b981;"></span>
                                <span style="font-size:0.7em;opacity:0.7;">▾</span>
                            </button>

                            <span class="gfm-tool-sep"></span>

                            <div class="gfm-tool-group">
                                <button type="button" class="gfm-tool-btn" data-cmd="bold" title="In đậm (Ctrl+B)"><b>B</b></button>
                                <button type="button" class="gfm-tool-btn" data-cmd="italic" title="In nghiêng (Ctrl+I)"><i>I</i></button>
                                <button type="button" class="gfm-tool-btn" data-cmd="underline" title="Gạch chân (Ctrl+U)"><u>U</u></button>
                                <button type="button" class="gfm-tool-btn" data-cmd="strikeThrough" title="Gạch ngang"><s>S</s></button>
                            </div>
                            <div class="gfm-tool-group">
                                <button type="button" class="gfm-tool-btn" data-cmd="justifyLeft" title="Căn trái">⇤</button>
                                <button type="button" class="gfm-tool-btn" data-cmd="justifyCenter" title="Căn giữa">≡</button>
                                <button type="button" class="gfm-tool-btn" data-cmd="justifyRight" title="Căn phải">⇥</button>
                            </div>
                            <div class="gfm-tool-group">
                                <button type="button" class="gfm-tool-btn" data-cmd="insertUnorderedList" title="Danh sách chấm tròn">•≡</button>
                                <button type="button" class="gfm-tool-btn" data-cmd="insertOrderedList" title="Danh sách số 1,2,3">1≡</button>
                            </div>

                            <span class="gfm-tool-sep"></span>

                            <div class="gfm-tool-group">
                                <button type="button" class="gfm-tool-btn" data-cmd="insertHorizontalRule" title="Đường kẻ ngang">―</button>
                                <button type="button" class="gfm-tool-btn" data-cmd="removeFormat" title="Xóa định dạng" style="color:#ef4444;">Tx</button>
                                <button type="button" class="gfm-tool-btn" data-cmd="undo" title="Hoàn tác (Ctrl+Z)">↶</button>
                                <button type="button" class="gfm-tool-btn" data-cmd="redo" title="Làm lại (Ctrl+Y)">↷</button>
                            </div>

                            <span class="gfm-tool-sep"></span>

                            <!-- ZOOM NỘI DUNG (chỉ phóng to phần nội dung) -->
                            <div class="gfm-tool-group" title="Phóng to / thu nhỏ nội dung (Ctrl + lăn chuột, Ctrl + / Ctrl − / Ctrl 0)">
                                <button type="button" class="gfm-tool-btn" id="lnmZoomOut" title="Thu nhỏ nội dung (Ctrl −)">−</button>
                                <button type="button" class="gfm-tool-btn lnm-zoom-val" id="lnmZoomReset" title="Về 100% (Ctrl 0)">100%</button>
                                <button type="button" class="gfm-tool-btn" id="lnmZoomIn" title="Phóng to nội dung (Ctrl +)">+</button>
                            </div>

                            ${hasTelex ? `
                            <span class="gfm-tool-sep"></span>
                            <button type="button" class="gfm-tool-btn gfm-telex-toggle-btn" id="lnmTelexBtn"
                                    title="Bộ gõ Telex tích hợp: Khi bật, bạn có thể để EVKey ở chữ E, chỉ cần bấm Alt để đổi giữa gõ tiếng Hàn (가) và tiếng Việt (A)!"
                                    style="background:#eff6ff;border:1.5px solid #3b82f6;color:#1d4ed8;padding:3px 8px;display:inline-flex;align-items:center;gap:4px;border-radius:6px;">
                                <span class="telex-status-icon">🇻🇳</span>
                                <span class="telex-status-text">Telex: BẬT</span>
                            </button>` : ''}
                        </div>

                        <div class="gfm-editor-scroll-wrap" id="lnmScrollWrap">
                            <div id="lnmContentBody" class="gfm-editor-content" contenteditable="true"
                                 placeholder="Nhập nội dung note nháp bài học, từ vựng, ngữ pháp cần nhớ, cấu trúc hoặc dàn bài tại đây...">${savedData.content || ''}</div>
                        </div>
                    </div>
                </div>

                <div class="gfm-preview-wrapper" id="lnmStudentPreviewArea" style="display:none;">
                    <div class="gfm-preview-card">
                        <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;padding-bottom:12px;border-bottom:1px solid #e2e8f0;">
                            <span class="gfm-badge">Ghi chú bài học</span>
                            <h2 style="margin:0;font-size:1.35em;color:#1e1b4b;font-weight:800;">${escapeHtml(lessonName || 'Ghi chú bài học')}</h2>
                        </div>
                        <div id="lnmStudentPrevBody" class="lnm-preview-body"></div>
                    </div>
                </div>

                <div class="gfm-footer">
                    <div id="lnmAutoSaveStatus" style="display:flex;align-items:center;gap:8px;font-size:0.85em;color:#64748b;">
                        <span>💾</span>
                        <span>Tự động lưu nháp vào máy & tài khoản.</span>
                    </div>
                    <div class="lnm-footer-btns">
                        <button type="button" id="lnmClearBtn" style="padding:10px 18px;background:#fee2e2;color:#b91c1c;border:1px solid #fca5a5;border-radius:10px;font-weight:700;cursor:pointer;font-size:0.88em;">🗑️ Xóa nháp</button>
                        <button type="button" id="lnmCloseBtn" style="padding:10px 20px;background:#f1f5f9;color:#64748b;border:none;border-radius:10px;font-weight:700;cursor:pointer;font-size:0.9em;">Đóng</button>
                        <button type="button" id="lnmSaveBtn" style="padding:10px 26px;background:linear-gradient(135deg, #4f46e5, #4338ca);color:#ffffff;border:none;border-radius:10px;font-weight:800;cursor:pointer;font-size:0.92em;box-shadow:0 4px 14px rgba(79,70,229,0.35);display:flex;align-items:center;gap:8px;">💾 Lưu ghi chú</button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);
        if (typeof window.updateAllTelexUI === 'function') window.updateAllTelexUI();

        const $ = (id) => document.getElementById(id);
        const container = $('lnmContainer');
        const editor = $('lnmContentBody');
        const workspace = $('lnmWorkspace');
        const previewArea = $('lnmStudentPreviewArea');
        const previewBody = $('lnmStudentPrevBody');
        const fontSelect = $('lnmFontFamily');
        const fontSizeSelect = $('lnmFontSize');

        if (hasTelex) $('lnmTelexBtn').addEventListener('click', () => window.toggleWebTelex());

        setupHorizontalExampleTool({
            btn: $('lnmInsertExampleBtn'),
            getEditor: () => editor,
            getSavedRange: () => savedRange,
            defaultBadge: '💡 Ghi chú cần nhớ'
        });

        // ---------- Vùng chọn ----------
        function saveSelection() {
            const sel = window.getSelection();
            if (sel.rangeCount > 0 && editor.contains(sel.anchorNode)) {
                savedRange = sel.getRangeAt(0).cloneRange();
            }
        }
        editor.addEventListener('keyup', saveSelection);
        editor.addEventListener('mouseup', saveSelection);
        editor.addEventListener('touchend', saveSelection);
        editor.addEventListener('blur', saveSelection);

        function restoreSelection() {
            editor.focus();
            const sel = window.getSelection();
            if (savedRange && editor.contains(savedRange.startContainer)) {
                sel.removeAllRanges();
                sel.addRange(savedRange);
            } else if (!sel.rangeCount || !editor.contains(sel.anchorNode)) {
                // Chưa từng đặt con trỏ: đưa con trỏ về cuối nội dung
                const r = document.createRange();
                r.selectNodeContents(editor);
                r.collapse(false);
                sel.removeAllRanges();
                sel.addRange(r);
            }
        }

        // ---------- Đồng bộ ô chọn font / cỡ chữ theo vị trí con trỏ ----------
        function styleAtCaret(prop, attr) {
            const sel = window.getSelection();
            if (!sel.rangeCount || !editor.contains(sel.anchorNode)) return '';
            let el = sel.anchorNode.nodeType === 1 ? sel.anchorNode : sel.anchorNode.parentNode;
            while (el && el !== editor) {
                if (el.style && el.style[prop]) return el.style[prop];
                if (attr && el.getAttribute && el.getAttribute(attr)) return el.getAttribute(attr);
                el = el.parentNode;
            }
            return '';
        }
        function setSelectValue(select, value, label) {
            let opt = Array.from(select.options).find(o => !o.dataset.custom && o.value.replace(/["\s]/g, '').toLowerCase() === String(value).replace(/["\s]/g, '').toLowerCase());
            const custom = select.querySelector('option[data-custom]');
            if (opt) {
                if (custom) custom.remove();
                select.value = opt.value;
                return;
            }
            if (!custom) {
                opt = document.createElement('option');
                opt.dataset.custom = '1';
                select.appendChild(opt);
            } else opt = custom;
            opt.value = value;
            opt.textContent = label || value;
            select.value = value;
        }
        function syncToolbar() {
            const sel = window.getSelection();
            if (!sel.rangeCount || !editor.contains(sel.anchorNode)) return;
            const size = styleAtCaret('fontSize') || BASE_FONT_SIZE;
            setSelectValue(fontSizeSelect, size, size);
            const fam = styleAtCaret('fontFamily', 'face') || fontSelect.options[0].value;
            setSelectValue(fontSelect, fam, fam.split(',')[0].replace(/['"]/g, ''));
        }
        const onSelectionChange = () => { if (document.activeElement === editor) syncToolbar(); };
        document.addEventListener('selectionchange', onSelectionChange);

        // ---------- Lệnh định dạng ----------
        overlay.querySelectorAll('#lnmToolbar button[data-cmd]').forEach(btn => {
            btn.addEventListener('mousedown', (e) => e.preventDefault());
            btn.addEventListener('click', () => {
                restoreSelection();
                document.execCommand(btn.dataset.cmd, false, null);
                saveSelection();
                triggerAutoSave();
            });
        });

        fontSelect.addEventListener('change', () => {
            restoreSelection();
            try { document.execCommand('styleWithCSS', false, false); } catch (e) { }
            document.execCommand('fontName', false, fontSelect.value);
            saveSelection();
            triggerAutoSave();
        });

        // Cỡ chữ:
        //  - Có bôi đen: đổi cỡ cho đoạn đó (gỡ cỡ chữ cũ lồng bên trong để không bị "dính" cỡ cũ).
        //  - Không bôi đen: tạo ô giữ chỗ để chữ gõ tiếp theo dùng cỡ mới
        //    (trước đây execCommand để lại <font size="7"> = 48px cho chữ gõ sau).
        function applyFontSize(size) {
            restoreSelection();
            const sel = window.getSelection();
            if (!sel.rangeCount) return;
            const range = sel.getRangeAt(0);

            if (range.collapsed) {
                const node = range.startContainer;
                const holder = (node.nodeType === 3 ? node.parentNode : node);
                // Đang đứng trong ô giữ chỗ chưa gõ gì → chỉ đổi cỡ của ô đó
                if (holder && holder !== editor && holder.dataset && holder.dataset.lnmSize !== undefined && holder.textContent === ZWSP) {
                    holder.style.fontSize = size;
                } else {
                    const span = document.createElement('span');
                    span.style.fontSize = size;
                    span.dataset.lnmSize = '';
                    const t = document.createTextNode(ZWSP);
                    span.appendChild(t);
                    range.insertNode(span);
                    const r = document.createRange();
                    r.setStart(t, 1);
                    r.collapse(true);
                    sel.removeAllRanges();
                    sel.addRange(r);
                }
            } else {
                try { document.execCommand('styleWithCSS', false, false); } catch (e) { }
                document.execCommand('fontSize', false, '7');
                editor.querySelectorAll('font[size="7"]').forEach(f => {
                    f.removeAttribute('size');
                    f.style.fontSize = size;
                    f.querySelectorAll('[style]').forEach(el => {
                        if (!el.style.fontSize) return;
                        el.style.fontSize = '';
                        if (!el.getAttribute('style')) el.removeAttribute('style');
                    });
                    f.querySelectorAll('font[size]').forEach(el => el.removeAttribute('size'));
                });
                // Trình duyệt dùng CSS thay vì <font> → xử lý cả trường hợp này
                editor.querySelectorAll('span[style*="xxx-large"]').forEach(s => { s.style.fontSize = size; });
                editor.querySelectorAll('[style=""]').forEach(el => el.removeAttribute('style'));
            }
            saveSelection();
            syncToolbar();
            triggerAutoSave();
        }
        fontSizeSelect.addEventListener('change', () => applyFontSize(fontSizeSelect.value));

        // Màu chữ
        const textColorPicker = $('lnmTextColorPicker');
        textColorPicker.addEventListener('input', () => {
            restoreSelection();
            document.execCommand('foreColor', false, textColorPicker.value);
            saveSelection();
            triggerAutoSave();
        });
        overlay.querySelectorAll('#lnmToolbar button[data-color]').forEach(btn => {
            btn.addEventListener('mousedown', (e) => e.preventDefault());
            btn.addEventListener('click', () => {
                restoreSelection();
                document.execCommand('foreColor', false, btn.dataset.color);
                textColorPicker.value = btn.dataset.color;
                saveSelection();
                triggerAutoSave();
            });
        });

        // Màu nền
        const bgColorPicker = $('lnmBgColorPicker');
        function applyBg(color) {
            restoreSelection();
            if (color === 'transparent') {
                document.execCommand('removeFormat', false, null);
            } else if (!document.execCommand('hiliteColor', false, color)) {
                document.execCommand('backColor', false, color);
            }
            saveSelection();
            triggerAutoSave();
        }
        bgColorPicker.addEventListener('input', () => applyBg(bgColorPicker.value));
        overlay.querySelectorAll('#lnmToolbar button[data-bg]').forEach(btn => {
            btn.addEventListener('mousedown', (e) => e.preventDefault());
            btn.addEventListener('click', () => applyBg(btn.dataset.bg));
        });

        // ---------- Zoom nội dung ----------
        const zoomVal = $('lnmZoomReset');
        function setZoom(z) {
            zoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(z * 100) / 100));
            editor.style.zoom = zoom;
            previewBody.style.zoom = zoom;
            zoomVal.textContent = Math.round(zoom * 100) + '%';
            try { localStorage.setItem(ZOOM_KEY, String(zoom)); } catch (e) { }
        }
        setZoom(zoom);
        [['lnmZoomOut', () => setZoom(zoom - ZOOM_STEP)], ['lnmZoomIn', () => setZoom(zoom + ZOOM_STEP)], ['lnmZoomReset', () => setZoom(1)]]
            .forEach(([id, fn]) => {
                const b = $(id);
                b.addEventListener('mousedown', (e) => e.preventDefault()); // giữ con trỏ trong nội dung
                b.addEventListener('click', fn);
            });

        // Ctrl + lăn chuột / chụm 2 ngón trên touchpad → chỉ zoom nội dung, không zoom cả trang
        container.addEventListener('wheel', (e) => {
            if (!(e.ctrlKey || e.metaKey)) return;
            e.preventDefault();
            const d = e.deltaY;
            if (!d) return;
            setZoom(Math.abs(d) >= 50 ? zoom + (d < 0 ? ZOOM_STEP : -ZOOM_STEP) : zoom - d * 0.01);
        }, { passive: false });

        // Ctrl + / Ctrl − / Ctrl 0
        const onZoomKey = (e) => {
            if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
            if (isSplit && !container.contains(document.activeElement)) return; // đang ở trang bên trái
            const k = e.key, c = e.code;
            let fn = null;
            if (k === '+' || k === '=' || c === 'NumpadAdd') fn = () => setZoom(zoom + ZOOM_STEP);
            else if (k === '-' || k === '_' || c === 'NumpadSubtract') fn = () => setZoom(zoom - ZOOM_STEP);
            else if (k === '0' || c === 'Numpad0') fn = () => setZoom(1);
            if (!fn) return;
            e.preventDefault();
            e.stopPropagation();
            fn();
        };
        document.addEventListener('keydown', onZoomKey, true);

        // ---------- Cửa sổ / chia đôi ----------
        const toggleFullscreenBtn = $('lnmToggleFullscreenBtn');
        const splitBtn = $('lnmSplitBtn');
        function setSplit(on) {
            isSplit = on;
            overlay.classList.toggle('is-split', on);
            splitBtn.classList.toggle('is-active', on);
            splitBtn.title = on ? 'Trở về chế độ toàn màn hình' : 'Chia đôi màn hình';
            document.body.classList.toggle('lesson-notes-split', on);
        }
        toggleFullscreenBtn.addEventListener('click', () => {
            isFullscreen = !isFullscreen;
            container.classList.toggle('is-windowed', !isFullscreen);
            toggleFullscreenBtn.textContent = isFullscreen ? '⛶' : '🗖';
            if (isSplit) setSplit(false);
        });
        splitBtn.addEventListener('click', () => {
            setSplit(!isSplit);
            if (isSplit) {
                container.classList.remove('is-windowed');
                isFullscreen = true;
                toggleFullscreenBtn.textContent = '⛶';
            }
        });

        // ---------- Tab Soạn / Xem lại ----------
        function switchTab(tab) {
            const prev = tab === 'preview';
            $('lnmTabEdit').classList.toggle('active', !prev);
            $('lnmTabPreview').classList.toggle('active', prev);
            workspace.style.display = prev ? 'none' : 'flex';
            previewArea.style.display = prev ? 'flex' : 'none';
            if (prev) {
                previewBody.innerHTML = cleanContent(editor.innerHTML) || '<p style="color:#94a3b8;font-style:italic;">Chưa có nội dung ghi chú nào.</p>';
            }
        }
        $('lnmTabEdit').addEventListener('click', () => switchTab('edit'));
        $('lnmTabPreview').addEventListener('click', () => switchTab('preview'));
        window._lnmSwitchTab = switchTab; // tương thích code cũ

        // ---------- Lưu ----------
        let saveTimer = null;
        function saveNote(showToast) {
            clearTimeout(saveTimer);
            const data = {
                folderId: folderId,
                folderTitle: folderTitle,
                lessonName: lessonName,
                content: cleanContent(editor.innerHTML),
                updatedAt: new Date().toISOString()
            };
            try { localStorage.setItem(keys.local, JSON.stringify(data)); } catch (e) { console.warn(e); }

            const user = currentUser();
            if (user && typeof firebase !== 'undefined' && firebase.firestore) {
                firebase.firestore().collection('users').doc(user.uid)
                    .collection('lesson_notes').doc(keys.remote).set(data, { merge: true }).catch(console.warn);
            }

            const statusEl = $('lnmAutoSaveStatus');
            if (statusEl) {
                const now = new Date();
                const timeStr = [now.getHours(), now.getMinutes(), now.getSeconds()].map(n => String(n).padStart(2, '0')).join(':');
                statusEl.innerHTML = `<span>💾</span><span style="color:#10b981;font-weight:700;">✓ Đã lưu nháp lúc ${timeStr}</span>`;
            }
            if (showToast && typeof Swal !== 'undefined') {
                Swal.fire({ icon: 'success', title: 'Đã lưu ghi chú!', text: 'Ghi chú của bạn đã được lưu an toàn.', timer: 1500, showConfirmButton: false });
            }
        }
        function triggerAutoSave() {
            clearTimeout(saveTimer);
            saveTimer = setTimeout(() => saveNote(false), 800);
        }
        editor.addEventListener('input', triggerAutoSave);

        // Dữ liệu trên tài khoản mới hơn máy này → dùng bản trên tài khoản (nếu chưa gõ gì)
        const user = currentUser();
        if (user && typeof firebase !== 'undefined' && firebase.firestore) {
            const initial = editor.innerHTML;
            firebase.firestore().collection('users').doc(user.uid)
                .collection('lesson_notes').doc(keys.remote).get().then(doc => {
                    if (!doc.exists || !editor.isConnected) return;
                    const r = doc.data();
                    if (r && r.updatedAt && (!savedData.updatedAt || new Date(r.updatedAt) > new Date(savedData.updatedAt))) {
                        if (editor.innerHTML === initial) editor.innerHTML = r.content || '';
                    }
                }).catch(console.warn);
        }

        // ---------- Đóng ----------
        function cleanup() {
            document.removeEventListener('selectionchange', onSelectionChange);
            document.removeEventListener('keydown', onZoomKey, true);
            document.body.classList.remove('lesson-notes-split');
            const pop = document.getElementById('_gfmColorPopover');
            if (pop) pop.remove();
        }
        overlay._lnmCleanup = cleanup;
        function closeModal() {
            saveNote(false);
            cleanup();
            overlay.remove();
        }
        $('lnmCloseModalBtn').addEventListener('click', closeModal);
        $('lnmCloseBtn').addEventListener('click', closeModal);
        $('lnmSaveBtn').addEventListener('click', () => saveNote(true));
        $('lnmClearBtn').addEventListener('click', () => {
            const doClear = () => { editor.innerHTML = ''; saveNote(false); };
            if (typeof Swal === 'undefined') { if (confirm('Xóa toàn bộ nội dung nháp?')) doClear(); return; }
            Swal.fire({
                title: 'Xóa toàn bộ nội dung nháp?',
                text: 'Hành động này không thể hoàn tác.',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#ef4444',
                confirmButtonText: 'Xóa nháp',
                cancelButtonText: 'Hủy'
            }).then(r => {
                if (r.isConfirmed) {
                    doClear();
                    Swal.fire('Đã xóa', 'Đã xóa nội dung nháp bài học.', 'info');
                }
            });
        });

        // ESC để đóng (vocab.html đã có bộ xử lý ESC chung ở pha capture, nó chặn trước sự kiện này)
        overlay.addEventListener('keydown', (e) => {
            if (e.key !== 'Escape') return;
            if (typeof Swal !== 'undefined' && Swal.isVisible && Swal.isVisible()) return;
            e.preventDefault();
            closeModal();
        });

        setTimeout(() => { editor.focus(); syncToolbar(); }, 150);
    }

    // Nút nổi mở sổ tay (trang không có nút riêng, ví dụ trang bài học giáo trình)
    function mountFab(getOpts) {
        ensureStyles();
        let fab = document.getElementById('lnmFab');
        if (!fab) {
            fab = document.createElement('button');
            fab.type = 'button';
            fab.id = 'lnmFab';
            fab.className = 'lnm-fab';
            fab.setAttribute('aria-label', 'Mở Sổ tay nháp bài học');
            fab.innerHTML = '<span aria-hidden="true">📖</span><span class="lnm-fab-tip">📖 Sổ tay nháp bài học</span>';
            document.body.appendChild(fab);
        }
        fab.onclick = () => open(typeof getOpts === 'function' ? getOpts() : getOpts);
        return fab;
    }

    window.LessonNotes = { open, mountFab };
})();
