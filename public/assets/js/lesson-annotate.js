/* ==========================================================================
   LESSON-ANNOTATE.JS — Vẽ / chú thích đè lên trang bài học (kiểu thanh Annotate của Zoom)
   - Chỉ giáo viên (admin) dùng: curriculum-learn.js gọi LessonAnnotate.mount() khi là admin.
   - Không lưu: nét vẽ chỉ tồn tại tới khi tải lại trang. Mỗi tab (Từ vựng, Ngữ pháp…) một lớp riêng.
   - Nét vẽ gắn theo vị trí trên trang (cuộn trang thì nét vẽ cuộn theo nội dung).
   - Công cụ: Chuột, Bút, Bút dạ quang, Đường thẳng / Mũi tên / Chữ nhật / Elip, Chữ, Dấu,
     Bút laser, Tẩy, Màu + độ dày, Hoàn tác / Làm lại, Xóa hết.
   API: window.LessonAnnotate = { mount, open, close, toggle, setPage }
   ========================================================================== */
(function () {
    if (window.LessonAnnotate) return;

    const COLORS = ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#8b5cf6', '#0f172a', '#ffffff'];
    const WIDTHS = [2, 4, 8];
    const STAMPS = ['✓', '✗', '★', '?', '♥', '①', '②', '③'];
    const FONT = "'Pretendard', 'Inter', system-ui, sans-serif";
    const SHAPES = ['line', 'arrow', 'rect', 'ellipse'];
    const ZWSP_RE = /​/g;

    const ICON = {
        grip: '<svg viewBox="0 0 24 24"><circle cx="9" cy="6" r="1.6"/><circle cx="15" cy="6" r="1.6"/><circle cx="9" cy="12" r="1.6"/><circle cx="15" cy="12" r="1.6"/><circle cx="9" cy="18" r="1.6"/><circle cx="15" cy="18" r="1.6"/></svg>',
        mouse: '<svg viewBox="0 0 24 24"><path d="M5 3l14 8-6 1.5L10 19z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>',
        pen: '<svg viewBox="0 0 24 24"><path d="M4 20l1.2-4.6L16 4.6a2 2 0 0 1 2.8 0l.6.6a2 2 0 0 1 0 2.8L8.6 18.8z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>',
        hl: '<svg viewBox="0 0 24 24"><path d="M9 14l-4 4v2h5l3-3" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M8 13l7-9 5 5-9 7z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>',
        line: '<svg viewBox="0 0 24 24"><path d="M5 19L19 5" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
        arrow: '<svg viewBox="0 0 24 24"><path d="M5 19L19 5M10 5h9v9" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
        rect: '<svg viewBox="0 0 24 24"><rect x="4" y="6" width="16" height="12" rx="1.5" fill="none" stroke="currentColor" stroke-width="2.2"/></svg>',
        ellipse: '<svg viewBox="0 0 24 24"><ellipse cx="12" cy="12" rx="8.5" ry="6.5" fill="none" stroke="currentColor" stroke-width="2.2"/></svg>',
        text: '<svg viewBox="0 0 24 24"><path d="M5 6V4h14v2M12 4v16M9 20h6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
        stamp: '<svg viewBox="0 0 24 24"><path d="M12 3.5l2.5 5.2 5.7.8-4.1 4 1 5.6L12 16.4 6.9 19.1l1-5.6-4.1-4 5.7-.8z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>',
        laser: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3.5" fill="currentColor"/><circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="1.6" opacity=".45"/></svg>',
        eraser: '<svg viewBox="0 0 24 24"><path d="M15.5 4.5l4 4a2 2 0 0 1 0 2.8L11 19.8H7l-2.5-2.5a2 2 0 0 1 0-2.8l8.2-8.2a2 2 0 0 1 2.8 0zM9 10.5l5 5M11 19.8h9" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/></svg>',
        undo: '<svg viewBox="0 0 24 24"><path d="M9 7L4 12l5 5M4 12h11a5 5 0 0 1 0 10h-2" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
        redo: '<svg viewBox="0 0 24 24"><path d="M15 7l5 5-5 5M20 12H9a5 5 0 0 0 0 10h2" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
        clear: '<svg viewBox="0 0 24 24"><path d="M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
        close: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>',
        caret: '<svg viewBox="0 0 24 24" class="lan-caret"><path d="M7 10l5 5 5-5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>'
    };

    // ---------- Trạng thái ----------
    const st = {
        mounted: false,
        open: false,
        tool: 'pen',
        shape: 'arrow',
        stamp: '✓',
        color: COLORS[0],
        width: WIDTHS[1],
        pageKey: 'default',
        pages: {},          // key -> { objs: [], hist: [[]], idx: 0 }
        drawing: null,      // đối tượng đang vẽ
        erasing: false,
        erasedAny: false,
        hover: null,        // {x,y} toạ độ trang (bút laser)
        laser: [],          // [{x,y,t}]
        textEditor: null
    };
    let canvas, ctx, bar, fab, raf = 0;

    function page() {
        if (!st.pages[st.pageKey]) st.pages[st.pageKey] = { objs: [], hist: [[]], idx: 0 };
        return st.pages[st.pageKey];
    }
    function commit(objs) {
        const p = page();
        p.hist = p.hist.slice(0, p.idx + 1);
        p.hist.push(objs.slice());
        if (p.hist.length > 200) p.hist.shift();
        p.idx = p.hist.length - 1;
        p.objs = objs;
        updateHistoryBtns();
        render();
    }
    function undo() {
        const p = page();
        if (p.idx <= 0) return;
        p.idx--; p.objs = p.hist[p.idx].slice();
        updateHistoryBtns(); render();
    }
    function redo() {
        const p = page();
        if (p.idx >= p.hist.length - 1) return;
        p.idx++; p.objs = p.hist[p.idx].slice();
        updateHistoryBtns(); render();
    }
    function clearAll() {
        if (!page().objs.length) return;
        commit([]);
    }

    // ---------- CSS ----------
    function ensureStyles() {
        if (document.getElementById('_lessonAnnotateStyles')) return;
        const s = document.createElement('style');
        s.id = '_lessonAnnotateStyles';
        s.textContent = `
            #lanCanvas { position: fixed; inset: 0; width: 100vw; height: 100vh; z-index: 99990; pointer-events: none; display: none; touch-action: none; }
            #lanCanvas.on { display: block; }
            #lanCanvas.drawing { pointer-events: auto; }
            #lanBar {
                position: fixed; top: 76px; left: 50%; transform: translateX(-50%);
                z-index: 99996; display: none; align-items: center; gap: 2px; flex-wrap: wrap; justify-content: center;
                width: max-content; max-width: calc(100vw - 16px);
                padding: 5px 6px; border-radius: 14px;
                background: rgba(255,255,255,0.96); border: 1px solid #e2e8f0;
                box-shadow: 0 12px 32px rgba(15,23,42,0.22), 0 2px 6px rgba(15,23,42,0.08);
                font-family: ${FONT}; font-size: 13px; color: #334155; user-select: none;
                backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
            }
            #lanBar.on { display: flex; }
            #lanBar.dragged { transform: none; }
            #lanBar svg { width: 18px; height: 18px; display: block; }
            #lanBar .lan-grip { cursor: grab; color: #94a3b8; padding: 6px 2px; touch-action: none; }
            #lanBar .lan-grip svg { fill: currentColor; width: 16px; height: 16px; }
            #lanBar .lan-sep { width: 1px; height: 22px; background: #e2e8f0; margin: 0 3px; }
            #lanBar .lan-btn {
                position: relative; display: inline-flex; align-items: center; justify-content: center; gap: 1px;
                min-width: 34px; height: 34px; padding: 0 6px; border: none; border-radius: 9px;
                background: transparent; color: #334155; cursor: pointer; font: inherit; font-weight: 700;
            }
            #lanBar .lan-btn:hover { background: #f1f5f9; color: #0f172a; }
            #lanBar .lan-btn.active { background: #e0e7ff; color: #4338ca; }
            #lanBar .lan-btn:disabled { opacity: .35; cursor: default; background: transparent; }
            #lanBar .lan-btn .lan-caret { width: 12px; height: 12px; margin-left: -1px; opacity: .6; }
            #lanBar .lan-btn .lan-stamp-glyph { font-size: 17px; line-height: 1; min-width: 18px; text-align: center; }
            #lanBar .lan-dot { width: 18px; height: 18px; border-radius: 50%; border: 2px solid #fff; box-shadow: 0 0 0 1.5px #cbd5e1; }
            #lanBar .lan-close { color: #ef4444; }
            #lanBar .lan-close:hover { background: #fee2e2; color: #dc2626; }
            .lan-pop {
                position: fixed; z-index: 99997; display: none; padding: 8px; border-radius: 12px;
                background: #fff; border: 1px solid #e2e8f0; box-shadow: 0 14px 34px rgba(15,23,42,0.22);
                font-family: ${FONT}; font-size: 13px; color: #334155;
            }
            .lan-pop.on { display: block; }
            .lan-pop .lan-row { display: flex; gap: 4px; align-items: center; }
            .lan-pop .lan-row + .lan-row { margin-top: 8px; }
            .lan-pop .lan-label { font-size: 11px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: .4px; margin: 0 0 6px 2px; }
            .lan-pop button {
                display: inline-flex; align-items: center; justify-content: center; min-width: 34px; height: 34px;
                border: none; border-radius: 9px; background: transparent; cursor: pointer; color: #334155; font: inherit; font-weight: 700;
            }
            .lan-pop button:hover { background: #f1f5f9; }
            .lan-pop button.active { background: #e0e7ff; color: #4338ca; }
            .lan-pop svg { width: 18px; height: 18px; display: block; }
            .lan-pop .lan-swatch { width: 26px; height: 26px; min-width: 26px; border-radius: 50%; border: 2px solid #fff; box-shadow: 0 0 0 1.5px #cbd5e1; padding: 0; }
            .lan-pop .lan-swatch.active { box-shadow: 0 0 0 2.5px #4f46e5; background-clip: padding-box; }
            .lan-pop .lan-w { width: 40px; }
            .lan-pop .lan-w i { display: block; width: 22px; border-radius: 99px; background: #334155; }
            .lan-pop .lan-stamp { font-size: 20px; }
            .lan-pop input[type=color] { width: 30px; height: 30px; border: none; padding: 0; background: transparent; cursor: pointer; }
            .lan-text-input {
                position: fixed; z-index: 99995; min-width: 40px; min-height: 1.3em; padding: 2px 4px; margin: 0;
                outline: 2px dashed rgba(79,70,229,.7); outline-offset: 2px; background: rgba(255,255,255,.55);
                font-family: ${FONT}; font-weight: 700; line-height: 1.3; white-space: pre; border-radius: 4px;
            }
            .lan-fab {
                position: fixed; bottom: 88px; left: 26px; z-index: 99994;
                width: 52px; height: 52px; border-radius: 50%; border: 2px solid rgba(255,255,255,.7);
                display: flex; align-items: center; justify-content: center; cursor: pointer; color: #fff;
                background: linear-gradient(135deg, #f97316 0%, #db2777 100%);
                box-shadow: 0 10px 25px rgba(219,39,119,.4), 0 2px 6px rgba(0,0,0,.15);
                transition: transform .25s cubic-bezier(.34,1.56,.64,1);
            }
            .lan-fab svg { width: 24px; height: 24px; }
            .lan-fab:hover { transform: scale(1.1) translateY(-3px); }
            .lan-fab.active { box-shadow: 0 0 0 4px rgba(249,115,22,.35), 0 10px 25px rgba(219,39,119,.4); }
            .lan-fab .lan-fab-tip {
                position: absolute; left: 64px; white-space: nowrap; pointer-events: none; opacity: 0; transform: translateX(-10px);
                transition: all .25s ease; background: rgba(15,23,42,.92); color: #fff; padding: 6px 14px; border-radius: 20px;
                font: 700 13px ${FONT};
            }
            .lan-fab:hover .lan-fab-tip { opacity: 1; transform: none; }
            body.lesson-notes-split .lan-fab { display: none !important; }
            @media (max-width: 600px) {
                .lan-fab { bottom: 74px; left: 16px; width: 48px; height: 48px; }
                .lan-fab .lan-fab-tip { display: none; }
                #lanBar { top: 64px; }
                #lanBar .lan-btn { min-width: 32px; height: 32px; padding: 0 4px; }
            }
        `;
        document.head.appendChild(s);
    }

    // ---------- Vẽ ----------
    function resizeCanvas() {
        if (!canvas) return;
        const dpr = window.devicePixelRatio || 1;
        canvas.width = Math.round(innerWidth * dpr);
        canvas.height = Math.round(innerHeight * dpr);
        render();
    }
    function render() {
        if (!canvas || !st.open) return;
        const dpr = window.devicePixelRatio || 1;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.setTransform(dpr, 0, 0, dpr, -scrollX * dpr, -scrollY * dpr);
        page().objs.forEach(o => drawObj(o));
        if (st.drawing) drawObj(st.drawing);
        drawLaser();
    }
    function requestRender() {
        if (raf) return;
        raf = requestAnimationFrame(() => { raf = 0; render(); if (st.laser.length) requestRender(); });
    }

    function strokePath(pts) {
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        if (pts.length === 1) { ctx.lineTo(pts[0].x + 0.01, pts[0].y); return; }
        for (let i = 1; i < pts.length - 1; i++) {
            const mx = (pts[i].x + pts[i + 1].x) / 2, my = (pts[i].y + pts[i + 1].y) / 2;
            ctx.quadraticCurveTo(pts[i].x, pts[i].y, mx, my);
        }
        const last = pts[pts.length - 1];
        ctx.lineTo(last.x, last.y);
    }
    function drawObj(o) {
        ctx.save();
        ctx.strokeStyle = o.color;
        ctx.fillStyle = o.color;
        ctx.lineWidth = o.width;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        switch (o.type) {
            case 'pen':
                strokePath(o.pts); ctx.stroke(); break;
            case 'hl':
                ctx.globalAlpha = 0.35;
                ctx.lineCap = 'butt';
                strokePath(o.pts); ctx.stroke(); break;
            case 'line':
                ctx.beginPath(); ctx.moveTo(o.x1, o.y1); ctx.lineTo(o.x2, o.y2); ctx.stroke(); break;
            case 'arrow': {
                const ang = Math.atan2(o.y2 - o.y1, o.x2 - o.x1);
                const head = Math.max(12, o.width * 4);
                const bx = o.x2 - Math.cos(ang) * head * 0.6, by = o.y2 - Math.sin(ang) * head * 0.6;
                ctx.beginPath(); ctx.moveTo(o.x1, o.y1); ctx.lineTo(bx, by); ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(o.x2, o.y2);
                ctx.lineTo(o.x2 - head * Math.cos(ang - 0.45), o.y2 - head * Math.sin(ang - 0.45));
                ctx.lineTo(o.x2 - head * Math.cos(ang + 0.45), o.y2 - head * Math.sin(ang + 0.45));
                ctx.closePath(); ctx.fill();
                break;
            }
            case 'rect':
                ctx.strokeRect(Math.min(o.x1, o.x2), Math.min(o.y1, o.y2), Math.abs(o.x2 - o.x1), Math.abs(o.y2 - o.y1)); break;
            case 'ellipse':
                ctx.beginPath();
                ctx.ellipse((o.x1 + o.x2) / 2, (o.y1 + o.y2) / 2, Math.abs(o.x2 - o.x1) / 2, Math.abs(o.y2 - o.y1) / 2, 0, 0, Math.PI * 2);
                ctx.stroke(); break;
            case 'text':
                ctx.font = `700 ${o.size}px ${FONT}`;
                ctx.textBaseline = 'top';
                if (o.color.toLowerCase() === '#ffffff') { ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(15,23,42,.55)'; }
                o.text.split('\n').forEach((ln, i) => {
                    const y = o.y + i * o.size * 1.3;
                    if (o.color.toLowerCase() === '#ffffff') ctx.strokeText(ln, o.x, y);
                    ctx.fillText(ln, o.x, y);
                });
                break;
            case 'stamp':
                ctx.font = `800 ${o.size}px ${FONT}`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(o.glyph, o.x, o.y);
                break;
        }
        ctx.restore();
    }
    function drawLaser() {
        const now = performance.now();
        st.laser = st.laser.filter(p => now - p.t < 700);
        if (st.laser.length > 1) {
            ctx.save();
            ctx.lineCap = 'round'; ctx.lineJoin = 'round';
            for (let i = 1; i < st.laser.length; i++) {
                const a = st.laser[i - 1], b = st.laser[i];
                const life = 1 - (now - b.t) / 700;
                ctx.strokeStyle = `rgba(239,68,68,${0.85 * life})`;
                ctx.lineWidth = 3 + 5 * life;
                ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
            }
            ctx.restore();
        }
        if (st.tool === 'laser' && st.hover) {
            ctx.save();
            ctx.shadowColor = 'rgba(239,68,68,.9)';
            ctx.shadowBlur = 14;
            ctx.fillStyle = '#ef4444';
            ctx.beginPath(); ctx.arc(st.hover.x, st.hover.y, 7, 0, Math.PI * 2); ctx.fill();
            ctx.shadowBlur = 0;
            ctx.fillStyle = '#fff';
            ctx.beginPath(); ctx.arc(st.hover.x, st.hover.y, 2.5, 0, Math.PI * 2); ctx.fill();
            ctx.restore();
        }
    }

    // ---------- Tẩy: kiểm tra chạm ----------
    function distSeg(px, py, x1, y1, x2, y2) {
        const dx = x2 - x1, dy = y2 - y1;
        const len = dx * dx + dy * dy;
        let t = len ? ((px - x1) * dx + (py - y1) * dy) / len : 0;
        t = Math.max(0, Math.min(1, t));
        return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
    }
    function hit(o, x, y) {
        const tol = 8 + (o.width || 0) / 2;
        switch (o.type) {
            case 'pen': case 'hl':
                if (o.pts.length === 1) return Math.hypot(x - o.pts[0].x, y - o.pts[0].y) <= tol;
                for (let i = 1; i < o.pts.length; i++) if (distSeg(x, y, o.pts[i - 1].x, o.pts[i - 1].y, o.pts[i].x, o.pts[i].y) <= tol) return true;
                return false;
            case 'line': case 'arrow':
                return distSeg(x, y, o.x1, o.y1, o.x2, o.y2) <= tol;
            case 'rect': {
                const l = Math.min(o.x1, o.x2), r = Math.max(o.x1, o.x2), t = Math.min(o.y1, o.y2), b = Math.max(o.y1, o.y2);
                return distSeg(x, y, l, t, r, t) <= tol || distSeg(x, y, r, t, r, b) <= tol || distSeg(x, y, r, b, l, b) <= tol || distSeg(x, y, l, b, l, t) <= tol;
            }
            case 'ellipse': {
                const cx = (o.x1 + o.x2) / 2, cy = (o.y1 + o.y2) / 2, rx = Math.abs(o.x2 - o.x1) / 2, ry = Math.abs(o.y2 - o.y1) / 2;
                let prev = null;
                for (let i = 0; i <= 48; i++) {
                    const a = i / 48 * Math.PI * 2, p = { x: cx + rx * Math.cos(a), y: cy + ry * Math.sin(a) };
                    if (prev && distSeg(x, y, prev.x, prev.y, p.x, p.y) <= tol) return true;
                    prev = p;
                }
                return false;
            }
            case 'text':
                return x >= o.x - 4 && x <= o.x + o.w + 4 && y >= o.y - 4 && y <= o.y + o.h + 4;
            case 'stamp':
                return Math.abs(x - o.x) <= o.size * 0.6 && Math.abs(y - o.y) <= o.size * 0.6;
        }
        return false;
    }
    function eraseAt(x, y) {
        const objs = page().objs;
        for (let i = objs.length - 1; i >= 0; i--) {
            if (hit(objs[i], x, y)) {
                objs.splice(i, 1);
                st.erasedAny = true;
                render();
                return;
            }
        }
    }

    // ---------- Chữ ----------
    function startText(cx, cy) {
        finishText();
        const size = [18, 24, 34][WIDTHS.indexOf(st.width)] || 24;
        const el = document.createElement('div');
        el.className = 'lan-text-input';
        el.contentEditable = 'true';
        el.spellcheck = false;
        el.style.left = cx + 'px';
        el.style.top = (cy - size * 0.65) + 'px';
        el.style.fontSize = size + 'px';
        el.style.color = st.color;
        if (st.color.toLowerCase() === '#ffffff') el.style.background = 'rgba(15,23,42,.55)';
        document.body.appendChild(el);
        st.textEditor = { el, size, color: st.color, px: cx + scrollX + 4, py: cy - size * 0.65 + scrollY + 2 };
        el.addEventListener('keydown', (e) => {
            e.stopPropagation();
            if (e.key === 'Escape') { e.preventDefault(); finishText(true); }
            else if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); finishText(); }
        });
        el.addEventListener('blur', () => setTimeout(() => finishText(), 0));
        setTimeout(() => el.focus(), 0);
    }
    function finishText(cancel) {
        const te = st.textEditor;
        if (!te) return;
        st.textEditor = null;
        const text = (te.el.innerText || '').replace(ZWSP_RE, '').replace(/\n+$/, '');
        te.el.remove();
        if (cancel || !text.trim()) return;
        ctx.save();
        ctx.font = `700 ${te.size}px ${FONT}`;
        const lines = text.split('\n');
        const w = Math.max(...lines.map(l => ctx.measureText(l).width));
        ctx.restore();
        commit(page().objs.concat([{ type: 'text', x: te.px, y: te.py, text, size: te.size, color: te.color, w, h: lines.length * te.size * 1.3 }]));
    }

    // ---------- Sự kiện vẽ ----------
    function pt(e) { return { x: e.clientX + scrollX, y: e.clientY + scrollY }; }

    function onDown(e) {
        if (e.button !== undefined && e.button !== 0) return;
        closePops();
        if (st.textEditor) { finishText(); return; }
        const p = pt(e);
        const tool = st.tool === 'shape' ? st.shape : st.tool;
        if (tool === 'text') { e.preventDefault(); startText(e.clientX, e.clientY); return; }
        e.preventDefault();
        canvas.setPointerCapture(e.pointerId);
        if (tool === 'stamp') {
            commit(page().objs.concat([{ type: 'stamp', x: p.x, y: p.y, glyph: st.stamp, color: st.color, size: [26, 38, 56][WIDTHS.indexOf(st.width)] || 38 }]));
            return;
        }
        if (tool === 'eraser') { st.erasing = true; st.erasedAny = false; eraseAt(p.x, p.y); return; }
        if (tool === 'laser') { st.laser.push({ x: p.x, y: p.y, t: performance.now() }); requestRender(); return; }
        if (tool === 'pen' || tool === 'hl') {
            st.drawing = { type: tool, color: st.color, width: tool === 'hl' ? st.width * 4 + 6 : st.width, pts: [p] };
        } else {
            st.drawing = { type: tool, color: st.color, width: st.width, x1: p.x, y1: p.y, x2: p.x, y2: p.y };
        }
        render();
    }
    function onMove(e) {
        const p = pt(e);
        if (st.tool === 'laser') {
            st.hover = p;
            if (e.buttons & 1) st.laser.push({ x: p.x, y: p.y, t: performance.now() });
            requestRender();
            return;
        }
        if (st.erasing) { eraseAt(p.x, p.y); return; }
        const d = st.drawing;
        if (!d) return;
        if (d.pts) {
            const last = d.pts[d.pts.length - 1];
            if (Math.hypot(p.x - last.x, p.y - last.y) < 1.5) return;
            d.pts.push(p);
        } else {
            let x2 = p.x, y2 = p.y;
            if (e.shiftKey) {
                // Shift: hình vuông / tròn đều, đường thẳng bám góc 45°
                const dx = x2 - d.x1, dy = y2 - d.y1;
                if (d.type === 'rect' || d.type === 'ellipse') {
                    const m = Math.max(Math.abs(dx), Math.abs(dy));
                    x2 = d.x1 + Math.sign(dx || 1) * m; y2 = d.y1 + Math.sign(dy || 1) * m;
                } else {
                    const ang = Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) * (Math.PI / 4), len = Math.hypot(dx, dy);
                    x2 = d.x1 + Math.cos(ang) * len; y2 = d.y1 + Math.sin(ang) * len;
                }
            }
            d.x2 = x2; d.y2 = y2;
        }
        requestRender();
    }
    function onUp() {
        if (st.erasing) {
            st.erasing = false;
            if (st.erasedAny) commit(page().objs.slice());
            return;
        }
        const d = st.drawing;
        if (!d) return;
        st.drawing = null;
        const tiny = !d.pts && Math.hypot(d.x2 - d.x1, d.y2 - d.y1) < 4;
        if (tiny) { render(); return; }
        commit(page().objs.concat([d]));
    }

    // ---------- Thanh công cụ ----------
    function btn(id, icon, title, extra) {
        return `<button type="button" class="lan-btn" data-id="${id}" title="${title}">${icon}${extra || ''}</button>`;
    }
    function buildBar() {
        bar = document.createElement('div');
        bar.id = 'lanBar';
        bar.setAttribute('role', 'toolbar');
        bar.setAttribute('aria-label', 'Công cụ vẽ chú thích');
        bar.innerHTML = `
            <span class="lan-grip" title="Kéo để di chuyển thanh công cụ">${ICON.grip}</span>
            ${btn('mouse', ICON.mouse, 'Chuột — bấm vào trang như bình thường (V / Esc)')}
            ${btn('pen', ICON.pen, 'Bút vẽ tự do (P)')}
            ${btn('hl', ICON.hl, 'Bút dạ quang (H)')}
            ${btn('shape', `<span class="lan-shape-icon">${ICON[st.shape]}</span>`, 'Hình: đường thẳng, mũi tên, chữ nhật, elip (giữ Shift để vẽ thẳng/đều)', ICON.caret)}
            ${btn('text', ICON.text, 'Chữ — bấm vào trang để gõ, Enter để xong (T)')}
            ${btn('stamp', `<span class="lan-stamp-glyph">${st.stamp}</span>`, 'Đóng dấu ✓ ✗ ★ … (S)', ICON.caret)}
            ${btn('laser', ICON.laser, 'Bút laser — chỉ điểm, không để lại nét (L)')}
            ${btn('eraser', ICON.eraser, 'Tẩy — bấm hoặc kéo qua nét cần xóa (E)')}
            <span class="lan-sep"></span>
            ${btn('format', '<span class="lan-dot"></span>', 'Màu sắc & độ dày', ICON.caret)}
            <span class="lan-sep"></span>
            ${btn('undo', ICON.undo, 'Hoàn tác (Ctrl+Z)')}
            ${btn('redo', ICON.redo, 'Làm lại (Ctrl+Y)')}
            ${btn('clear', ICON.clear, 'Xóa hết nét vẽ ở tab này')}
            <span class="lan-sep"></span>
            <button type="button" class="lan-btn lan-close" data-id="close" title="Tắt chế độ vẽ (nét vẽ vẫn giữ tới khi tải lại trang)">${ICON.close}</button>
        `;
        document.body.appendChild(bar);

        bar.addEventListener('click', (e) => {
            const b = e.target.closest('.lan-btn');
            if (!b) return;
            const id = b.dataset.id;
            if (id === 'shape' || id === 'stamp' || id === 'format') {
                const isOpen = pops[id].classList.contains('on');
                if (id !== 'format') setTool(id);
                closePops();
                if (!isOpen) openPop(id, b);
                return;
            }
            closePops();
            if (id === 'undo') undo();
            else if (id === 'redo') redo();
            else if (id === 'clear') clearAll();
            else if (id === 'close') close();
            else setTool(id);
        });

        // Kéo thanh công cụ
        const grip = bar.querySelector('.lan-grip');
        grip.addEventListener('pointerdown', (e) => {
            e.preventDefault();
            grip.setPointerCapture(e.pointerId);
            const r = bar.getBoundingClientRect();
            const ox = e.clientX - r.left, oy = e.clientY - r.top;
            bar.classList.add('dragged');
            bar.style.left = r.left + 'px';
            bar.style.top = r.top + 'px';
            closePops();
            const move = (ev) => {
                bar.style.left = Math.max(4, Math.min(innerWidth - r.width - 4, ev.clientX - ox)) + 'px';
                bar.style.top = Math.max(4, Math.min(innerHeight - r.height - 4, ev.clientY - oy)) + 'px';
            };
            const up = () => { grip.removeEventListener('pointermove', move); grip.removeEventListener('pointerup', up); grip.removeEventListener('pointercancel', up); };
            grip.addEventListener('pointermove', move);
            grip.addEventListener('pointerup', up);
            grip.addEventListener('pointercancel', up);
        });
    }

    const pops = {};
    function buildPops() {
        const mk = (id, html) => {
            const el = document.createElement('div');
            el.className = 'lan-pop';
            el.innerHTML = html;
            document.body.appendChild(el);
            pops[id] = el;
            return el;
        };
        const shapeNames = { line: 'Đường thẳng', arrow: 'Mũi tên', rect: 'Hình chữ nhật', ellipse: 'Hình elip' };
        mk('shape', `<div class="lan-row">${SHAPES.map(s => `<button type="button" data-shape="${s}" title="${shapeNames[s]}">${ICON[s]}</button>`).join('')}</div>`)
            .addEventListener('click', (e) => {
                const b = e.target.closest('button[data-shape]');
                if (!b) return;
                st.shape = b.dataset.shape;
                bar.querySelector('.lan-shape-icon').innerHTML = ICON[st.shape];
                setTool('shape');
                closePops();
            });
        mk('stamp', `<div class="lan-row">${STAMPS.map(g => `<button type="button" class="lan-stamp" data-stamp="${g}">${g}</button>`).join('')}</div>`)
            .addEventListener('click', (e) => {
                const b = e.target.closest('button[data-stamp]');
                if (!b) return;
                st.stamp = b.dataset.stamp;
                bar.querySelector('.lan-stamp-glyph').textContent = st.stamp;
                setTool('stamp');
                closePops();
            });
        const fmt = mk('format', `
            <div class="lan-label">Màu</div>
            <div class="lan-row">
                ${COLORS.map(c => `<button type="button" class="lan-swatch" data-color="${c}" style="background:${c}" title="${c}"></button>`).join('')}
                <input type="color" value="${st.color}" title="Màu khác">
            </div>
            <div class="lan-label" style="margin-top:10px;">Độ dày nét / cỡ chữ</div>
            <div class="lan-row">
                ${WIDTHS.map((w, i) => `<button type="button" class="lan-w" data-width="${w}" title="${['Mảnh', 'Vừa', 'Dày'][i]}"><i style="height:${w + 1}px"></i></button>`).join('')}
            </div>`);
        fmt.addEventListener('click', (e) => {
            const c = e.target.closest('button[data-color]');
            const w = e.target.closest('button[data-width]');
            if (c) setColor(c.dataset.color);
            if (w) { st.width = +w.dataset.width; syncFormat(); }
        });
        fmt.querySelector('input[type=color]').addEventListener('input', (e) => setColor(e.target.value));
    }
    function openPop(id, anchor) {
        const pop = pops[id];
        syncFormat();
        pop.querySelectorAll('[data-shape]').forEach(b => b.classList.toggle('active', b.dataset.shape === st.shape));
        pop.querySelectorAll('[data-stamp]').forEach(b => b.classList.toggle('active', b.dataset.stamp === st.stamp));
        pop.classList.add('on');
        const r = anchor.getBoundingClientRect(), pr = pop.getBoundingClientRect();
        let top = r.bottom + 8;
        if (top + pr.height > innerHeight - 8) top = r.top - pr.height - 8;
        pop.style.top = Math.max(8, top) + 'px';
        pop.style.left = Math.max(8, Math.min(innerWidth - pr.width - 8, r.left + r.width / 2 - pr.width / 2)) + 'px';
    }
    function closePops() { Object.values(pops).forEach(p => p.classList.remove('on')); }
    function setColor(c) {
        st.color = c;
        syncFormat();
        if (st.tool === 'mouse' || st.tool === 'eraser' || st.tool === 'laser') setTool('pen');
    }
    function syncFormat() {
        if (!bar) return;
        bar.querySelector('.lan-dot').style.background = st.color;
        const fmt = pops.format;
        if (!fmt) return;
        fmt.querySelectorAll('[data-color]').forEach(b => b.classList.toggle('active', b.dataset.color.toLowerCase() === st.color.toLowerCase()));
        fmt.querySelectorAll('[data-width]').forEach(b => b.classList.toggle('active', +b.dataset.width === st.width));
        fmt.querySelector('input[type=color]').value = /^#[0-9a-f]{6}$/i.test(st.color) ? st.color : '#ef4444';
    }
    function updateHistoryBtns() {
        if (!bar) return;
        const p = page();
        bar.querySelector('[data-id=undo]').disabled = p.idx <= 0;
        bar.querySelector('[data-id=redo]').disabled = p.idx >= p.hist.length - 1;
        bar.querySelector('[data-id=clear]').disabled = !p.objs.length;
    }
    function setTool(t) {
        finishText();
        st.tool = t;
        st.hover = null;
        bar.querySelectorAll('.lan-btn[data-id]').forEach(b => b.classList.toggle('active', b.dataset.id === t));
        const drawing = t !== 'mouse';
        canvas.classList.toggle('drawing', drawing);
        const tool = t === 'shape' ? st.shape : t;
        canvas.style.cursor = tool === 'text' ? 'text' : tool === 'laser' ? 'none' : tool === 'eraser' ? 'cell' : 'crosshair';
        render();
    }

    // ---------- Phím tắt ----------
    function onKey(e) {
        if (!st.open) return;
        const notes = document.getElementById('_lessonNotesModal');
        if (notes && !notes.classList.contains('is-split')) return; // đang mở Sổ tay nháp toàn màn hình
        const tgt = e.target;
        if (tgt && (tgt.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(tgt.tagName))) return;
        if (typeof Swal !== 'undefined' && Swal.isVisible && Swal.isVisible()) return;
        const k = e.key.toLowerCase();
        if ((e.ctrlKey || e.metaKey) && !e.altKey) {
            if (k === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
            else if (k === 'y' || (k === 'z' && e.shiftKey)) { e.preventDefault(); redo(); }
            return;
        }
        if (e.altKey) return;
        if (e.key === 'Escape') {
            if (Object.values(pops).some(p => p.classList.contains('on'))) { closePops(); e.preventDefault(); return; }
            if (st.tool !== 'mouse') { setTool('mouse'); e.preventDefault(); }
            return;
        }
        const map = { v: 'mouse', p: 'pen', h: 'hl', t: 'text', s: 'stamp', l: 'laser', e: 'eraser' };
        if (map[k]) { e.preventDefault(); setTool(map[k]); }
    }

    // ---------- Mở / đóng ----------
    function mount() {
        if (st.mounted) return;
        st.mounted = true;
        ensureStyles();
        canvas = document.createElement('canvas');
        canvas.id = 'lanCanvas';
        document.body.appendChild(canvas);
        ctx = canvas.getContext('2d');
        buildBar();
        buildPops();

        canvas.addEventListener('pointerdown', onDown);
        canvas.addEventListener('pointermove', onMove);
        canvas.addEventListener('pointerup', onUp);
        canvas.addEventListener('pointercancel', onUp);
        canvas.addEventListener('pointerleave', () => { if (st.tool === 'laser') { st.hover = null; requestRender(); } });
        window.addEventListener('scroll', () => { if (st.open) requestRender(); }, { passive: true });
        window.addEventListener('resize', () => { if (st.open) resizeCanvas(); });
        document.addEventListener('keydown', onKey);
        document.addEventListener('pointerdown', (e) => {
            if (!e.target.closest('.lan-pop') && !e.target.closest('#lanBar')) closePops();
        }, true);

        fab = document.createElement('button');
        fab.type = 'button';
        fab.className = 'lan-fab';
        fab.setAttribute('aria-label', 'Vẽ chú thích lên bài');
        fab.innerHTML = `${ICON.pen}<span class="lan-fab-tip">✏️ Vẽ chú thích lên bài</span>`;
        fab.addEventListener('click', toggle);
        document.body.appendChild(fab);
    }
    function open() {
        mount();
        st.open = true;
        canvas.classList.add('on');
        bar.classList.add('on');
        fab.classList.add('active');
        resizeCanvas();
        setTool(st.tool === 'mouse' ? 'pen' : st.tool);
        syncFormat();
        updateHistoryBtns();
        document.dispatchEvent(new CustomEvent('lessonannotate', { detail: { open: true } }));
    }
    function close() {
        if (!st.mounted) return;
        finishText();
        closePops();
        st.open = false;
        st.drawing = null;
        st.laser = [];
        canvas.classList.remove('on', 'drawing');
        bar.classList.remove('on');
        fab.classList.remove('active');
        document.dispatchEvent(new CustomEvent('lessonannotate', { detail: { open: false } }));
    }
    function toggle() { st.open ? close() : open(); }
    // Mỗi tab một lớp nét vẽ riêng
    function setPage(key) {
        finishText();
        st.drawing = null;
        st.pageKey = key || 'default';
        updateHistoryBtns();
        render();
    }

    window.LessonAnnotate = { mount, open, close, toggle, setPage, isOpen: () => st.open };
})();
