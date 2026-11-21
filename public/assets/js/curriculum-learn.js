/* ==========================================================================
   HỌC THEO GIÁO TRÌNH — curriculum/index.html & curriculum/lesson.html
   --------------------------------------------------------------------------
   Đọc dữ liệu Kho giáo trình (curricula/{id}, curricula/{id}/lessons/{lid}):
     index.html            → danh sách giáo trình được xem
     index.html?c=ID       → danh sách bài của một giáo trình
     lesson.html?c=ID&l=LID#words|grammar|dialogues → trang một bài
   Quyền đọc theo firestore.rules: "public" ai cũng xem, "students" cần đăng nhập,
   "private" chỉ giáo viên (admin).
   ========================================================================== */
(function () {
    'use strict';

    const ADMIN_EMAILS = ['nmhieu2526@gmail.com', 'vuihoctienghan27@gmail.com']; // khớp isAdmin() trong rules
    const LEVELS = {
        socap1: 'Sơ cấp 1', socap2: 'Sơ cấp 2', trungcap3: 'Trung cấp 3', trungcap4: 'Trung cấp 4',
        caocap5: 'Cao cấp 5', caocap6: 'Cao cấp 6', topik1: 'TOPIK I', topik2: 'TOPIK II', other: ''
    };
    const AVATAR_COLORS = ['#6366f1', '#0ea5e9', '#f59e0b', '#10b981', '#ec4899', '#8b5cf6'];

    const root = document.getElementById('clRoot');
    const PAGE = root ? root.dataset.page : '';
    const params = new URLSearchParams(location.search);
    const db = () => firebase.firestore();
    const S = { user: null, cur: null, lesson: null, lessonId: null, tab: 'words', hide: '', loadedFor: undefined };

    // ------------------------------------------------------------------ helpers
    function esc(s) {
        return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    }
    const isAdmin = (u) => !!(u && u.email && ADMIN_EMAILS.includes(u.email.toLowerCase()));
    const lessonUrl = (cid, lid, tab) => `lesson.html?c=${encodeURIComponent(cid)}&l=${encodeURIComponent(lid)}${tab ? '#' + tab : ''}`;
    function splitTitle(t) {
        // "Bài 1. 안녕하세요? — Xin chào" → { main: "Bài 1. 안녕하세요?", sub: "Xin chào" }
        const i = String(t || '').indexOf(' — ');
        return i > 0 ? { main: t.slice(0, i), sub: t.slice(i + 3) } : { main: t || '', sub: '' };
    }
    function showMessage(icon, html, actions) {
        root.innerHTML = `<div class="cl-panel cl-empty"><div class="big">${icon}</div>${html}${actions ? `<div style="margin-top:16px;display:flex;gap:8px;justify-content:center;flex-wrap:wrap">${actions}</div>` : ''}</div>`;
    }
    function openLogin() {
        const m = document.getElementById('authModal');
        if (m) m.style.display = 'flex';
    }
    window.clOpenLogin = openLogin;
    function permissionMessage(what) {
        if (!S.user) {
            showMessage('🔐', `Bạn cần đăng nhập để xem ${what}.`, `<button class="cl-btn pri" onclick="clOpenLogin()">Đăng nhập</button>`);
        } else {
            showMessage('⛔', `Tài khoản của bạn chưa được xem ${what} này.<br>Hãy liên hệ giáo viên.`, `<a class="cl-btn" href="index.html">← Danh sách giáo trình</a>`);
        }
    }

    // ------------------------------------------------------------------ đọc tiếng Hàn (có Promise để phát lần lượt)
    let speakToken = 0;
    const audioEl = new Audio();
    function stopSpeak() {
        speakToken++;
        try { audioEl.pause(); } catch (e) { }
        try { window.speechSynthesis && window.speechSynthesis.cancel(); } catch (e) { }
    }
    function speakFallback(text, token) {
        return new Promise(resolve => {
            if (!window.speechSynthesis || token !== speakToken) return resolve();
            try {
                const u = new SpeechSynthesisUtterance(text);
                u.lang = 'ko-KR'; u.rate = 0.95;
                const ko = window.speechSynthesis.getVoices().filter(v => (v.lang || '').toLowerCase().startsWith('ko'));
                if (ko.length) u.voice = ko.find(v => /Google|Heami|Yuna/.test(v.name)) || ko[0];
                u.onend = () => resolve(); u.onerror = () => resolve();
                window.speechSynthesis.speak(u);
                setTimeout(resolve, 2500 + text.length * 250); // phòng khi onend không bắn
            } catch (e) { resolve(); }
        });
    }
    function speak(text) {
        text = String(text || '').trim();
        stopSpeak();
        const token = speakToken;
        if (!text) return Promise.resolve();
        return new Promise(resolve => {
            let done = false;
            const finish = () => { if (!done) { done = true; resolve(); } };
            const fallback = () => { if (done || token !== speakToken) return finish(); speakFallback(text, token).then(finish); };
            const q = encodeURIComponent(text);
            audioEl.onended = finish;
            audioEl.onerror = fallback;
            audioEl.src = 'https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=ko&total=1&idx=0&textlen=' + q.length + '&q=' + q;
            const p = audioEl.play();
            if (p && p.catch) p.catch(fallback);
        });
    }
    window.clSpeak = speak;

    // ------------------------------------------------------------------ dữ liệu
    async function listCurricula() {
        const col = db().collection('curricula');
        if (isAdmin(S.user)) {
            const snap = await col.get();
            return snap.docs.map(d => ({ id: d.id, ...d.data() }));
        }
        const levels = S.user ? ['students', 'public'] : ['public'];
        const snaps = await Promise.all(levels.map(v => col.where('visibility', '==', v).get().catch(() => null)));
        const map = new Map();
        snaps.forEach(s => s && s.docs.forEach(d => map.set(d.id, { id: d.id, ...d.data() })));
        return [...map.values()];
    }
    const sortCurricula = (list) => list.filter(c => (c.units || []).length || isAdmin(S.user))
        .sort((a, b) => (a.order ?? 999) - (b.order ?? 999) || String(a.title).localeCompare(String(b.title), 'vi'));

    // ------------------------------------------------------------------ INDEX
    async function renderIndex() {
        const cid = params.get('c');
        if (cid) return renderCurriculumPage(cid);
        let list;
        try { list = sortCurricula(await listCurricula()); } catch (e) { return showMessage('⚠️', 'Không tải được giáo trình: ' + esc(e.message)); }
        document.title = 'Học theo giáo trình - Vui Học Tiếng Hàn';
        const body = list.length ? `<div class="cl-cgrid">${list.map(c => {
            const units = c.units || [];
            const words = units.reduce((n, u) => n + (u.wordCount || 0), 0);
            return `<a class="cl-ccard" href="index.html?c=${encodeURIComponent(c.id)}">
                <div class="ic">${esc(c.icon || '📘')}</div>
                <h3 class="kr">${esc(c.title)}</h3>
                <div class="meta">${units.length} bài · ${words} từ vựng${c.description ? '<br>' + esc(c.description) : ''}</div>
                ${LEVELS[c.level] ? `<span class="lv">${esc(LEVELS[c.level])}</span>` : ''}
                ${c.visibility === 'private' ? '<span class="lv" style="margin-left:4px;background:var(--cl-warn-soft);color:var(--cl-warn)">🔒 Riêng tư</span>' : ''}
            </a>`;
        }).join('')}</div>`
            : `<div class="cl-empty"><div class="big">📭</div>${S.user ? 'Chưa có giáo trình nào được chia sẻ với bạn.' : 'Đăng nhập để xem giáo trình của lớp bạn.'}
                ${S.user ? '' : '<div style="margin-top:14px"><button class="cl-btn pri" onclick="clOpenLogin()">Đăng nhập</button></div>'}</div>`;
        root.innerHTML = `
            <section class="cl-hero">
                <div class="eyebrow">📚 Kho giáo trình</div>
                <h1>Học theo giáo trình</h1>
                <p class="sub">Từ vựng, ngữ pháp và hội thoại của từng bài — học trước khi lên lớp, ôn lại sau giờ học.</p>
                ${isAdmin(S.user) ? '<div class="nav"><a class="cl-btn" href="admin.html">✎ Soạn giáo trình</a></div>' : ''}
            </section>
            <div class="cl-panel cl-section">${body}</div>`;
    }

    async function renderCurriculumPage(cid) {
        let cur;
        try {
            const d = await db().collection('curricula').doc(cid).get();
            if (!d.exists) return showMessage('🔍', 'Không tìm thấy giáo trình này.', '<a class="cl-btn" href="index.html">← Danh sách giáo trình</a>');
            cur = { id: d.id, ...d.data() };
        } catch (e) { return permissionMessage('giáo trình'); }
        S.cur = cur;
        document.title = cur.title + ' - Học theo giáo trình';
        const units = cur.units || [];
        const words = units.reduce((n, u) => n + (u.wordCount || 0), 0);
        const gram = units.reduce((n, u) => n + (u.grammarCount || 0), 0);
        let stage = null, rows = '';
        units.forEach((u, i) => {
            if ((u.stage || '') !== stage) { stage = u.stage || ''; if (stage) rows += `<div class="cl-stage">${esc(stage)}</div>`; }
            const t = splitTitle(u.title);
            rows += `<a class="cl-lrow" href="${lessonUrl(cur.id, u.id)}">
                <span class="no">${i + 1}</span>
                <span class="t kr">${esc(t.main)}${t.sub ? `<br><small style="color:var(--cl-sub);font-weight:600">${esc(t.sub)}</small>` : ''}</span>
                <span class="c">${u.wordCount || 0} từ · ${u.grammarCount || 0} NP${u.dialogueCount ? ' · ' + u.dialogueCount + ' HT' : ''}</span>
            </a>`;
        });
        root.innerHTML = `
            <nav class="cl-crumbs"><a href="index.html">📚 Giáo trình</a> › <span class="kr">${esc(cur.title)}</span></nav>
            <section class="cl-hero">
                <div class="eyebrow">${esc(cur.icon || '📘')} ${esc(LEVELS[cur.level] || 'Giáo trình')}</div>
                <h1 class="kr">${esc(cur.title)}</h1>
                ${cur.description ? `<p class="sub">${esc(cur.description)}</p>` : ''}
                <div class="chips"><span class="cl-chip">📄 ${units.length} bài</span><span class="cl-chip">🔤 ${words} từ</span><span class="cl-chip">📗 ${gram} ngữ pháp</span></div>
                <div class="nav">
                    ${units.length ? `<a class="cl-btn" href="${lessonUrl(cur.id, units[0].id)}">▶ Bắt đầu từ bài 1</a>` : ''}
                    <button class="cl-btn" onclick="clAddCurriculumToNotebook()">＋ Thêm vào Sổ từ</button>
                    ${isAdmin(S.user) ? '<a class="cl-btn" href="admin.html">✎ Soạn</a>' : ''}
                </div>
            </section>
            <div class="cl-panel cl-section">${rows || '<div class="cl-empty">Giáo trình chưa có bài.</div>'}</div>`;
    }
    window.clAddCurriculumToNotebook = function () {
        if (!S.user) return openLogin();
        if (window.CurriculumPersonal && S.cur) window.CurriculumPersonal.lessonDialog(S.cur);
    };

    // ------------------------------------------------------------------ LESSON
    async function renderLessonPage() {
        const cid = params.get('c'), lid = params.get('l');
        if (!cid || !lid) return showMessage('🔍', 'Thiếu thông tin bài học.', '<a class="cl-btn" href="index.html">← Danh sách giáo trình</a>');
        let cur, lesson;
        try {
            const [cd, ld] = await Promise.all([
                db().collection('curricula').doc(cid).get(),
                db().collection('curricula').doc(cid).collection('lessons').doc(lid).get()
            ]);
            if (!cd.exists || !ld.exists) return showMessage('🔍', 'Không tìm thấy bài học này.', `<a class="cl-btn" href="index.html${cd.exists ? '?c=' + encodeURIComponent(cid) : ''}">← Quay lại</a>`);
            cur = { id: cd.id, ...cd.data() };
            lesson = { id: ld.id, ...ld.data() };
        } catch (e) { return permissionMessage('bài học'); }
        S.cur = cur; S.lesson = lesson; S.lessonId = lid;
        lesson.words = (lesson.words || []).filter(w => w && w.word);
        lesson.grammar = lesson.grammar || [];
        lesson.dialogues = (lesson.dialogues || []).filter(d => d && (d.lines || []).length);
        const hash = (location.hash || '').replace('#', '');
        S.tab = ['words', 'grammar', 'dialogues'].includes(hash) ? hash
            : (lesson.words.length ? 'words' : lesson.grammar.length ? 'grammar' : lesson.dialogues.length ? 'dialogues' : 'words');
        window.learningActive = true; // activity-tracker.js: tính giờ học
        S.media = {};
        drawLesson();
        loadMedia(cid, lid);
    }

    // ---------- Ảnh minh họa (curricula/{c}/media, mỗi doc { lesson, items: { id: dataURL } })
    // Thẻ ảnh được vẽ sẵn dạng <img data-img="id" hidden>; tải xong thì gắn src và hiện ra.
    function imgTag(id, cls) { return `<img class="${cls}" data-img="${esc(id)}" alt="" ${S.media[id] ? `src="${S.media[id]}"` : 'hidden'}>`; }
    function applyMedia(root2) {
        (root2 || document).querySelectorAll('img[data-img]').forEach(im => {
            const u = S.media[im.dataset.img];
            if (u && im.getAttribute('src') !== u) { im.src = u; im.hidden = false; }
        });
        document.querySelectorAll('.cl-vcard').forEach(c => c.classList.toggle('has-img', !!c.querySelector('img[data-img]:not([hidden])')));
    }
    async function loadMedia(cid, lid) {
        try {
            const snap = await db().collection('curricula').doc(cid).collection('media').where('lesson', '==', lid).get();
            snap.docs.forEach(d => Object.assign(S.media, d.data().items || {}));
            if (S.lessonId === lid) applyMedia();
        } catch (e) { /* chưa có ảnh hoặc không có quyền → bỏ qua */ }
    }

    function drawLesson() {
        const cur = S.cur, L = S.lesson;
        const units = cur.units || [];
        const idx = units.findIndex(u => u.id === S.lessonId);
        const prev = idx > 0 ? units[idx - 1] : null, next = idx >= 0 && idx < units.length - 1 ? units[idx + 1] : null;
        const t = splitTitle(L.title);
        document.title = `${t.main} · ${cur.title}`;
        root.innerHTML = `
            <nav class="cl-crumbs"><a href="index.html">📚 Giáo trình</a> › <a class="kr" href="index.html?c=${encodeURIComponent(cur.id)}">${esc(cur.title)}</a> › <span>Bài ${idx + 1}</span></nav>
            <section class="cl-hero">
                <div class="eyebrow kr">${esc(cur.icon || '📘')} ${esc(cur.title)}${L.stage ? ' · ' + esc(L.stage) : ''}</div>
                <h1 class="kr">${esc(t.main)}</h1>
                ${t.sub ? `<p class="sub">${esc(t.sub)}</p>` : ''}
                <div class="chips"><span class="cl-chip">🔤 ${L.words.length} từ vựng</span><span class="cl-chip">📗 ${L.grammar.length} ngữ pháp</span><span class="cl-chip">💬 ${L.dialogues.length} hội thoại</span></div>
                <div class="nav">
                    ${prev ? `<a class="cl-btn" href="${lessonUrl(cur.id, prev.id, S.tab)}" title="${esc(prev.title)}">← Bài trước</a>` : '<button class="cl-btn" disabled>← Bài trước</button>'}
                    <select id="clLessonSel" aria-label="Chọn bài">${units.map((u, i) => `<option value="${esc(u.id)}" ${u.id === S.lessonId ? 'selected' : ''}>${i + 1}. ${esc(splitTitle(u.title).main)}</option>`).join('')}</select>
                    ${next ? `<a class="cl-btn" href="${lessonUrl(cur.id, next.id, S.tab)}" title="${esc(next.title)}">Bài sau →</a>` : '<button class="cl-btn" disabled>Bài sau →</button>'}
                    ${isAdmin(S.user) ? '<a class="cl-btn" href="admin.html" title="Mở trang soạn">✎ Soạn</a>' : ''}
                </div>
            </section>
            <div class="cl-panel cl-tabs" role="tablist">
                <button class="cl-tab" role="tab" data-tab="words">🔤 Từ vựng <span class="n">${L.words.length}</span></button>
                <button class="cl-tab" role="tab" data-tab="grammar">📗 Ngữ pháp <span class="n">${L.grammar.length}</span></button>
                <button class="cl-tab" role="tab" data-tab="dialogues">💬 Hội thoại <span class="n">${L.dialogues.length}</span></button>
            </div>
            <div class="cl-panel cl-section" id="clTabBody"></div>`;
        document.getElementById('clLessonSel').addEventListener('change', e => { location.href = lessonUrl(cur.id, e.target.value, S.tab); });
        root.querySelectorAll('.cl-tab').forEach(b => b.addEventListener('click', () => switchTab(b.dataset.tab)));
        switchTab(S.tab, true);
    }

    function switchTab(tab, initial) {
        S.tab = tab;
        stopSpeak(); closePop();
        root.querySelectorAll('.cl-tab').forEach(b => { b.classList.toggle('active', b.dataset.tab === tab); b.setAttribute('aria-selected', b.dataset.tab === tab); });
        if (!initial) history.replaceState(null, '', '#' + tab);
        // giữ tab khi chuyển bài
        root.querySelectorAll('.cl-hero a[href^="lesson.html"]').forEach(a => { a.href = a.href.replace(/#.*$/, '') + '#' + tab; });
        if (tab === 'grammar') renderGrammar();
        else if (tab === 'dialogues') renderDialogues();
        else renderWords();
    }

    // ---------- Từ vựng
    function renderWords() {
        const W = S.lesson.words, box = document.getElementById('clTabBody');
        if (!W.length) { box.innerHTML = '<div class="cl-empty"><div class="big">🔤</div>Bài này chưa có từ vựng.</div>'; return; }
        box.innerHTML = `
            <div class="cl-toolbar">
                <div class="cl-seg" role="group" aria-label="Chế độ tự kiểm tra">
                    <button data-hide="" class="${S.hide === '' ? 'on' : ''}">👁 Hiện tất cả</button>
                    <button data-hide="hide-m" class="${S.hide === 'hide-m' ? 'on' : ''}">Che nghĩa</button>
                    <button data-hide="hide-w" class="${S.hide === 'hide-w' ? 'on' : ''}">Che tiếng Hàn</button>
                </div>
                <button class="cl-btn" id="clFlashBtn">🃏 Flashcard</button>
                <button class="cl-btn" id="clAddNb">＋ Thêm vào Sổ từ</button>
                <span class="grow"></span>
                <input class="cl-search" id="clSearch" type="search" placeholder="Tìm từ hoặc nghĩa…" aria-label="Tìm từ">
            </div>
            <div class="cl-vgrid ${S.hide}" id="clVGrid">${W.map((w, i) => `
                <div class="cl-vcard${S.media[w.id] ? ' has-img' : ''}" data-i="${i}" data-q="${esc((w.word + ' ' + w.meaning).toLowerCase())}">
                    ${imgTag(w.id, 'pic')}
                    <div class="top"><div class="w kr">${esc(w.word)}</div><button class="cl-say" data-say="${i}" title="Nghe phát âm" aria-label="Nghe ${esc(w.word)}">🔊</button></div>
                    <div class="m">${esc(w.meaning)}</div>
                    ${w.ex_kr ? `<div class="ex"><div class="ko kr">${esc(w.ex_kr)}</div>${w.ex_vn ? `<div class="vi">${esc(w.ex_vn)}</div>` : ''}</div>` : ''}
                    <span class="num">${i + 1}</span>
                </div>`).join('')}</div>`;
        const grid = document.getElementById('clVGrid');
        box.querySelectorAll('[data-hide]').forEach(b => b.addEventListener('click', () => {
            S.hide = b.dataset.hide;
            box.querySelectorAll('[data-hide]').forEach(x => x.classList.toggle('on', x === b));
            grid.className = 'cl-vgrid ' + S.hide;
            grid.querySelectorAll('.reveal').forEach(c => c.classList.remove('reveal'));
        }));
        grid.addEventListener('click', e => {
            const say = e.target.closest('[data-say]');
            if (say) { e.stopPropagation(); playButton(say, W[+say.dataset.say].word); return; }
            const card = e.target.closest('.cl-vcard');
            if (card && S.hide) card.classList.toggle('reveal');
            else if (card) speak(W[+card.dataset.i].word);
        });
        document.getElementById('clSearch').addEventListener('input', e => {
            const q = e.target.value.trim().toLowerCase();
            grid.querySelectorAll('.cl-vcard').forEach(c => { c.style.display = !q || c.dataset.q.includes(q) ? '' : 'none'; });
        });
        document.getElementById('clFlashBtn').addEventListener('click', () => openFlash());
        document.getElementById('clAddNb').addEventListener('click', addLessonToNotebook);
    }
    function playButton(btn, text) {
        btn.classList.add('playing');
        speak(text).then(() => btn.classList.remove('playing'));
    }

    async function addLessonToNotebook() {
        if (!S.user) return openLogin();
        if (!window.CurriculumPersonal) return;
        try {
            Swal.fire({ title: 'Đang thêm vào Sổ từ…', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
            // Dùng lại thư mục của lần thêm trước (nếu học viên đã thêm giáo trình này)
            const prev = await db().collection('users').doc(S.user.uid).collection('vocabulary').where('src.c', '==', S.cur.id).limit(1).get();
            const folder = prev.empty ? S.cur.title : String(prev.docs[0].data().listName || S.cur.title).split('/')[0];
            const r = await window.CurriculumPersonal._addToNotebook(S.cur, [S.lessonId], folder);
            Swal.fire({
                icon: 'success', title: r.added || r.updated ? 'Đã thêm vào Sổ từ' : 'Sổ từ đã có đủ từ của bài này',
                html: `📁 <b>${esc(r.folder)}</b>${r.added ? ` · ${r.added} từ mới` : ''}${r.updated ? ` · ${r.updated} từ cập nhật` : ''}`,
                confirmButtonText: 'Mở Sổ từ', showCancelButton: true, cancelButtonText: 'Đóng', confirmButtonColor: '#4f46e5'
            }).then(res => { if (res.isConfirmed) location.href = '../vocab.html'; });
        } catch (e) { Swal.fire('Lỗi', e.message, 'error'); }
    }

    // ---------- Flashcard
    const FC = { list: [], i: 0, reverse: false, picOnly: false };
    function openFlash() {
        FC.list = S.lesson.words.slice(); FC.i = 0;
        const el = document.getElementById('clFlash');
        el.classList.add('open'); el.setAttribute('aria-hidden', 'false');
        drawFlash();
        document.addEventListener('keydown', flashKeys);
    }
    function closeFlash() {
        const el = document.getElementById('clFlash');
        el.classList.remove('open'); el.setAttribute('aria-hidden', 'true');
        document.removeEventListener('keydown', flashKeys);
        stopSpeak();
    }
    function flashKeys(e) {
        if (e.key === 'Escape') closeFlash();
        else if (e.key === 'ArrowRight') moveFlash(1);
        else if (e.key === 'ArrowLeft') moveFlash(-1);
        else if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); flipFlash(); }
    }
    function moveFlash(d) { FC.i = (FC.i + d + FC.list.length) % FC.list.length; drawFlash(); }
    function flipFlash() { const c = document.querySelector('#clFlash .card'); if (c) c.classList.toggle('flip'); }
    function drawFlash() {
        const w = FC.list[FC.i], el = document.getElementById('clFlash');
        const pic = S.media[w.id] ? `<img class="fc-pic" src="${S.media[w.id]}" alt="">` : '';
        const front = FC.reverse ? `${pic}<div class="big" style="font-size:1.7em">${esc(w.meaning)}</div>` : `${FC.picOnly && pic ? pic + '<div class="small">Đây là từ gì?</div>' : pic + `<div class="big kr">${esc(w.word)}</div>`}`;
        const back = FC.reverse ? `<div class="big kr">${esc(w.word)}</div>`
            : (FC.picOnly && pic ? `<div class="big kr">${esc(w.word)}</div><div class="small" style="font-size:1.15em">${esc(w.meaning)}</div>` : `<div class="big" style="font-size:1.7em">${esc(w.meaning)}</div>`);
        const ex = w.ex_kr ? `<div class="small kr">${esc(w.ex_kr)}${w.ex_vn ? '<br>' + esc(w.ex_vn) : ''}</div>` : '';
        el.innerHTML = `<div class="box">
            <div class="bar"><b>🃏 ${esc(splitTitle(S.lesson.title).main)}</b><span>${FC.i + 1} / ${FC.list.length}</span>
                <button class="cl-btn icon" data-fc="close" aria-label="Đóng" style="background:rgba(255,255,255,.12);color:#fff;border-color:rgba(255,255,255,.3)">✕</button></div>
            <div class="card" data-fc="flip"><div class="inner"><div class="face">${front}</div><div class="face back">${back}${ex}</div></div></div>
            <div class="ctrl">
                <button class="cl-btn" data-fc="prev">← Trước</button>
                <button class="cl-btn" data-fc="say">🔊 Nghe</button>
                <button class="cl-btn" data-fc="flip">↻ Lật</button>
                <button class="cl-btn" data-fc="next">Sau →</button>
            </div>
            <div class="ctrl">
                <button class="cl-btn" data-fc="shuffle">🔀 Trộn thẻ</button>
                <button class="cl-btn ${FC.reverse ? 'on' : ''}" data-fc="reverse">⇄ Nghĩa trước</button>
                ${S.lesson.words.some(x => S.media[x.id]) ? `<button class="cl-btn ${FC.picOnly ? 'on' : ''}" data-fc="pic">🖼 Chỉ xem ảnh</button>` : ''}
            </div>
            <div class="hint">Chạm vào thẻ để lật · phím ← → để chuyển · Space để lật · Esc để đóng</div></div>`;
        el.onclick = e => {
            const a = e.target.closest('[data-fc]');
            if (!a) { if (e.target === el) closeFlash(); return; }
            const act = a.dataset.fc;
            if (act === 'close') closeFlash();
            else if (act === 'flip') flipFlash();
            else if (act === 'prev') moveFlash(-1);
            else if (act === 'next') moveFlash(1);
            else if (act === 'say') speak(FC.list[FC.i].word);
            else if (act === 'shuffle') { for (let i = FC.list.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [FC.list[i], FC.list[j]] = [FC.list[j], FC.list[i]]; } FC.i = 0; drawFlash(); }
            else if (act === 'reverse') { FC.reverse = !FC.reverse; if (FC.reverse) FC.picOnly = false; drawFlash(); }
            else if (act === 'pic') { FC.picOnly = !FC.picOnly; if (FC.picOnly) FC.reverse = false; drawFlash(); }
        };
    }

    // ---------- Ngữ pháp
    function renderGrammar() {
        const G = S.lesson.grammar, box = document.getElementById('clTabBody');
        if (!G.length) { box.innerHTML = '<div class="cl-empty"><div class="big">📗</div>Bài này chưa có ngữ pháp.</div>'; return; }
        box.innerHTML = G.map((g, i) => {
            const i2 = String(g.title || '').indexOf(' - ');
            const ko = i2 > 0 ? g.title.slice(0, i2) : g.title, vi = i2 > 0 ? g.title.slice(i2 + 3) : '';
            return `<div class="cl-gitem${i === 0 ? ' open' : ''}" data-i="${i}">
                <button class="cl-ghead" aria-expanded="${i === 0}"><span class="no">${i + 1}</span>
                    <span class="t kr">${esc(ko)}${vi ? `<small>${esc(vi)}</small>` : ''}</span><span class="chev">▼</span></button>
                <div class="cl-gbody"><div class="grammar-content kr"></div></div></div>`;
        }).join('');
        const fill = (item) => {
            const c = item.querySelector('.grammar-content');
            if (c.dataset.ready) return;
            c.innerHTML = G[+item.dataset.i].contentHtml || '<p><i>(Chưa có nội dung)</i></p>';
            c.dataset.ready = '1';
            c.querySelectorAll('.quiz-section').forEach(initQuizSection);
        };
        box.querySelectorAll('.cl-gitem').forEach(item => {
            if (item.classList.contains('open')) fill(item);
            item.querySelector('.cl-ghead').addEventListener('click', () => {
                const open = !item.classList.contains('open');
                item.classList.toggle('open', open);
                item.querySelector('.cl-ghead').setAttribute('aria-expanded', open);
                if (open) fill(item);
            });
        });
    }

    // Bộ chạy bài tập trong nội dung ngữ pháp (định dạng của grammar-library.js)
    function initQuizSection(sec) {
        const qs = sec.querySelectorAll('.quiz-q');
        let correct = 0, answered = 0;
        const done = (ok, q) => {
            if (q.classList.contains('answered')) return;
            if (ok) correct++;
            answered++;
            const fb = q.querySelector('.quiz-feedback');
            if (fb) { fb.textContent = ok ? '✅ Chính xác!' : '❌ Chưa đúng rồi!'; fb.className = 'quiz-feedback show ' + (ok ? 'ok' : 'fail'); }
            const ex = q.querySelector('.quiz-explain'); if (ex) ex.classList.add('show');
            q.classList.add('answered');
            const sc = sec.querySelector('.quiz-score');
            if (sc && answered >= qs.length) {
                const pct = Math.round(correct / qs.length * 100);
                sc.innerHTML = (pct >= 80 ? '🎉' : pct >= 50 ? '👍' : '💪') + ` Kết quả: <strong>${correct}/${qs.length}</strong> câu đúng (${pct}%)`;
                sc.classList.add('show');
            }
        };
        qs.forEach(q => {
            const type = q.dataset.type || 'mc', ans = q.dataset.answer || '';
            if (type === 'mc' || type === 'tf') {
                const btns = q.querySelectorAll(type === 'mc' ? '.quiz-opt' : '.quiz-tf button');
                btns.forEach(b => b.addEventListener('click', () => {
                    if (q.classList.contains('answered')) return;
                    btns.forEach(x => { if (x.dataset.v === ans) x.classList.add('correct'); });
                    if (b.dataset.v !== ans) b.classList.add('wrong');
                    done(b.dataset.v === ans, q);
                }));
            } else if (type === 'fill') {
                const input = q.querySelector('.quiz-fill input'), btn = q.querySelector('.quiz-check-btn');
                const okList = ans.split('|').map(a => a.trim().toLowerCase());
                const check = () => {
                    if (!input || q.classList.contains('answered') || !input.value.trim()) return;
                    const ok = okList.includes(input.value.trim().toLowerCase());
                    input.classList.add(ok ? 'correct' : 'wrong'); input.readOnly = true;
                    if (!ok) { const s = document.createElement('span'); s.style.cssText = 'color:#059669;font-weight:700'; s.textContent = '→ ' + okList[0]; input.parentNode.appendChild(s); }
                    done(ok, q);
                };
                if (btn) btn.addEventListener('click', check);
                if (input) input.addEventListener('keydown', e => { if (e.key === 'Enter') check(); });
            } else if (type === 'match') {
                const items = q.querySelectorAll('.quiz-match-item');
                const total = q.querySelectorAll('.quiz-match-item[data-side="l"]').length;
                let sel = null, matched = 0, mistakes = 0;
                items.forEach(it => it.addEventListener('click', () => {
                    if (it.classList.contains('matched')) return;
                    if (!sel || sel.dataset.side === it.dataset.side) {
                        if (sel) sel.classList.remove('selected');
                        sel = it; it.classList.add('selected'); return;
                    }
                    if (sel.dataset.pair === it.dataset.pair) {
                        sel.classList.remove('selected'); sel.classList.add('matched'); it.classList.add('matched');
                        if (++matched >= total) done(mistakes === 0, q);
                    } else {
                        mistakes++;
                        const a = sel; a.classList.add('wrong-flash'); it.classList.add('wrong-flash');
                        setTimeout(() => { a.classList.remove('wrong-flash', 'selected'); it.classList.remove('wrong-flash'); }, 500);
                    }
                    sel = null;
                }));
            }
        });
    }

    // ---------- Hội thoại
    // Từ khóa để tô sáng từ vựng của bài trong hội thoại (bỏ phần trong ngoặc, động/tính từ bỏ đuôi 다/하다)
    function vocabKeys() {
        const keys = [];
        S.lesson.words.forEach((w, i) => {
            String(w.word).replace(/\([^)]*\)|\[[^\]]*\]/g, ' ').split(/\s+[-–]\s+|\//).forEach(part => {
                let k = part.trim();
                if (!k) return;
                if (/하다$/.test(k) && k.length > 2) k = k.slice(0, -2);
                else if (/다$/.test(k) && k.length > 2) k = k.slice(0, -1);
                if (k.replace(/\s/g, '').length >= 2) keys.push({ k, i });
            });
        });
        return keys.sort((a, b) => b.k.length - a.k.length);
    }
    function highlight(text, keys) {
        // tìm các đoạn trùng từ vựng (ưu tiên khóa dài, không chồng lấn) rồi bọc <span class="cl-vh">
        const marks = [];
        keys.forEach(({ k, i }) => {
            let from = 0, at;
            while ((at = text.indexOf(k, from)) !== -1) {
                const end = at + k.length;
                if (!marks.some(m => at < m.end && end > m.start)) marks.push({ start: at, end, i });
                from = end;
            }
        });
        marks.sort((a, b) => a.start - b.start);
        let out = '', pos = 0;
        marks.forEach(m => { out += esc(text.slice(pos, m.start)) + `<span class="cl-vh" data-w="${m.i}">${esc(text.slice(m.start, m.end))}</span>`; pos = m.end; });
        return out + esc(text.slice(pos));
    }

    const DLG = { playing: -1 };
    function renderDialogues() {
        const D = S.lesson.dialogues, box = document.getElementById('clTabBody');
        if (!D.length) { box.innerHTML = '<div class="cl-empty"><div class="big">💬</div>Bài này chưa có hội thoại.<br><small>Giáo viên có thể thêm ở tab “💬 Hội thoại” trong trang soạn giáo trình.</small></div>'; return; }
        const keys = vocabKeys();
        box.innerHTML = D.map((d, di) => {
            const speakers = [...new Set(d.lines.map(l => l.s).filter(Boolean))];
            const side = (s) => !s ? 'n' : (speakers.indexOf(s) % 2 === 1 ? 'r' : 'l');
            return `<div class="cl-dlg" data-d="${di}">
                <div class="head">
                    <h3 class="kr">💬 ${esc(d.title || 'Hội thoại ' + (di + 1))}</h3>
                    <button class="cl-btn pri" data-act="play">▶ Nghe cả đoạn</button>
                    <button class="cl-btn on" data-act="vi">🇻🇳 Bản dịch</button>
                    ${speakers.length ? `<select data-act="role" aria-label="Luyện vai"><option value="">🎭 Luyện vai: tắt</option>${speakers.map(s => `<option value="${esc(s)}">🎤 Tôi đóng vai ${esc(s)}</option>`).join('')}</select>` : ''}
                </div>
                ${imgTag(d.id, 'scene')}
                ${d.audio ? `<audio controls preload="none" src="${esc(d.audio)}"></audio>` : ''}
                <div class="cl-lines">${d.lines.map((l, li) => `
                    <div class="cl-line ${side(l.s)}" data-l="${li}" data-s="${esc(l.s)}">
                        ${l.s ? `<span class="cl-ava" style="background:${AVATAR_COLORS[speakers.indexOf(l.s) % AVATAR_COLORS.length]}">${esc(l.s.slice(0, 2))}</span>` : ''}
                        <div class="cl-bub">
                            ${l.s ? `<div class="who">${esc(l.s)}</div>` : ''}
                            <div class="ko kr">${highlight(l.kr, keys)}</div>
                            ${l.vi ? `<div class="vi">${esc(l.vi)}</div>` : ''}
                            <div class="mask">🎤 Lượt của bạn — nói xong chạm để xem</div>
                            <button class="say" data-act="say" title="Nghe câu này" aria-label="Nghe câu này">🔊</button>
                        </div>
                    </div>`).join('')}</div>
            </div>`;
        }).join('');

        box.querySelectorAll('.cl-dlg').forEach(card => {
            const d = D[+card.dataset.d];
            card.addEventListener('click', e => {
                const vh = e.target.closest('.cl-vh');
                if (vh) { e.stopPropagation(); return showPop(vh, S.lesson.words[+vh.dataset.w]); }
                const act = e.target.closest('[data-act]');
                const line = e.target.closest('.cl-line');
                if (act && act.dataset.act === 'say' && line) { e.stopPropagation(); stopDialogue(); speakLine(card, d, +line.dataset.l); return; }
                if (act && act.dataset.act === 'play') { if (DLG.playing === +card.dataset.d) stopDialogue(); else playDialogue(card, d); return; }
                if (act && act.dataset.act === 'vi') { act.classList.toggle('on'); card.classList.toggle('no-vi', !act.classList.contains('on')); return; }
                if (line && line.classList.contains('mine')) line.classList.toggle('reveal');
            });
            const role = card.querySelector('[data-act="role"]');
            if (role) role.addEventListener('change', () => {
                card.querySelectorAll('.cl-line').forEach(l => { l.classList.toggle('mine', !!role.value && l.dataset.s === role.value); l.classList.remove('reveal'); });
            });
        });
    }
    function speakLine(card, d, li) {
        const el = card.querySelector(`.cl-line[data-l="${li}"]`);
        card.querySelectorAll('.speaking').forEach(x => x.classList.remove('speaking'));
        if (el) el.classList.add('speaking');
        return speak(d.lines[li].kr).then(() => { if (el) el.classList.remove('speaking'); });
    }
    async function playDialogue(card, d) {
        stopDialogue();
        const di = +card.dataset.d;
        DLG.playing = di;
        const myToken = ++DLG.token; // stopDialogue() vừa khởi tạo DLG.token
        const btn = card.querySelector('[data-act="play"]');
        btn.textContent = '⏹ Dừng';
        for (let li = 0; li < d.lines.length; li++) {
            if (DLG.token !== myToken) return;
            const el = card.querySelector(`.cl-line[data-l="${li}"]`);
            if (el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            if (el && el.classList.contains('mine')) {
                // Luyện vai: chừa thời gian cho học viên tự nói rồi hiện đáp án
                card.querySelectorAll('.speaking').forEach(x => x.classList.remove('speaking'));
                el.classList.add('speaking');
                await new Promise(r => setTimeout(r, 1500 + d.lines[li].kr.length * 180));
                if (DLG.token !== myToken) return;
                el.classList.add('reveal'); el.classList.remove('speaking');
            } else {
                await speakLine(card, d, li);
            }
            await new Promise(r => setTimeout(r, 350));
        }
        if (DLG.token === myToken) stopDialogue();
    }
    function stopDialogue() {
        DLG.token = (DLG.token || 0) + 1;
        DLG.playing = -1;
        stopSpeak();
        document.querySelectorAll('.cl-dlg [data-act="play"]').forEach(b => { b.textContent = '▶ Nghe cả đoạn'; });
        document.querySelectorAll('.cl-line.speaking').forEach(x => x.classList.remove('speaking'));
    }

    // popover nghĩa từ trong hội thoại
    let popEl = null;
    function closePop() { if (popEl) { popEl.remove(); popEl = null; } }
    function showPop(anchor, w) {
        closePop();
        if (!w) return;
        popEl = document.createElement('div');
        popEl.className = 'cl-pop';
        popEl.innerHTML = `<div class="w kr">${esc(w.word)} <button class="cl-say" aria-label="Nghe">🔊</button></div><div>${esc(w.meaning)}</div>`;
        document.body.appendChild(popEl);
        const r = anchor.getBoundingClientRect();
        const left = Math.min(window.scrollX + r.left, window.scrollX + document.documentElement.clientWidth - popEl.offsetWidth - 12);
        popEl.style.left = Math.max(8, left) + 'px';
        popEl.style.top = (window.scrollY + r.bottom + 6) + 'px';
        popEl.querySelector('.cl-say').addEventListener('click', ev => { ev.stopPropagation(); speak(w.word); });
    }
    document.addEventListener('click', e => { if (popEl && !popEl.contains(e.target) && !e.target.closest('.cl-vh')) closePop(); });

    // ------------------------------------------------------------------ khởi động
    function start() {
        if (!root || typeof firebase === 'undefined' || !firebase.apps.length) {
            if (root) showMessage('⚠️', 'Không khởi tạo được Firebase.');
            return;
        }
        firebase.auth().onAuthStateChanged(user => {
            const key = user ? user.uid : null;
            if (S.loadedFor === key) return; // tránh vẽ lại khi token làm mới
            S.loadedFor = key; S.user = user;
            const m = document.getElementById('authModal');
            if (user && m) m.style.display = 'none';
            if (PAGE === 'lesson') renderLessonPage(); else renderIndex();
        });
    }
    window.CurriculumLearn = { _vocabKeys: vocabKeys, _highlight: highlight, _state: S };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
