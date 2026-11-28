/* ==========================================================================
   HỌC THEO GIÁO TRÌNH — lesson/index.html & lesson/lesson.html
   --------------------------------------------------------------------------
   Đọc dữ liệu Kho giáo trình (curricula/{id}, curricula/{id}/lessons/{lid}):
     index.html            → danh sách giáo trình được xem
     index.html?c=ID       → danh sách bài của một giáo trình
     lesson.html?c=ID&l=LID#words|grammar|dialogues|listening → trang một bài
   Quyền đọc (firestore.rules + curriculum-access.js): admin xem tất cả; học viên chỉ xem
   giáo trình được gán cho lớp mình và chỉ thấy các bài đã giao.
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
    // Mở từ bài trong lớp (vocab.html → nút "📚 Học theo giáo trình"): ?from=<folderId>&fl=<tên bài trong lớp>
    // → giữ 2 tham số này khi chuyển bài, và hiện nút "← Về bài học trong lớp".
    const FROM = { f: params.get('from') || '', l: params.get('fl') || '' };
    const fromQs = FROM.f ? `&from=${encodeURIComponent(FROM.f)}&fl=${encodeURIComponent(FROM.l)}` : '';
    const backToClassUrl = () => `../vocab.html?view=classes&f=${encodeURIComponent(FROM.f)}${FROM.l ? '&lesson=' + encodeURIComponent(FROM.l) : ''}`;
    const lessonUrl = (cid, lid, tab) => `lesson.html?c=${encodeURIComponent(cid)}&l=${encodeURIComponent(lid)}${fromQs}${tab ? '#' + tab : ''}`;
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
    function speakFallback(text, token, rate) {
        return new Promise(resolve => {
            if (!window.speechSynthesis || token !== speakToken) return resolve();
            try {
                const u = new SpeechSynthesisUtterance(text);
                u.lang = 'ko-KR'; u.rate = 0.95 * (rate || 1);
                const ko = window.speechSynthesis.getVoices().filter(v => (v.lang || '').toLowerCase().startsWith('ko'));
                if (ko.length) u.voice = ko.find(v => /Google|Heami|Yuna/.test(v.name)) || ko[0];
                u.onend = () => resolve(); u.onerror = () => resolve();
                window.speechSynthesis.speak(u);
                setTimeout(resolve, 2500 + text.length * 250); // phòng khi onend không bắn
            } catch (e) { resolve(); }
        });
    }
    // MP3 đọc sẵn (tools/curriculum-tts/gen.py): audio/index.json = { w: {từ: file}, d: {"nhân vật|câu": file} }
    // Thư mục MP3 tính từ vị trí file script → dùng được cả ở lesson/*.html lẫn vocab.html
    const AUDIO_BASE = (function () {
        try { return new URL('../../lesson/audio/', (document.currentScript && document.currentScript.src) || location.href).href; }
        catch (e) { return 'audio/'; }
    })();
    let audioIndex = null;
    const audioIndexReady = fetch(AUDIO_BASE + 'index.json', { cache: 'no-cache' })
        .then(r => r.ok ? r.json() : null).then(j => { audioIndex = j || { w: {}, d: {} }; })
        .catch(() => { audioIndex = { w: {}, d: {} }; });
    function audioFileFor(text, speaker) {
        const ix = audioIndex || {};
        const d = ix.d || {}, w = ix.w || {};
        return (speaker != null && d[speaker + '|' + text]) || w[text] || d['|' + text] || null;
    }
    function speak(text, speaker, rate) {
        text = String(text || '').trim();
        stopSpeak();
        const token = speakToken;
        if (!text) return Promise.resolve();
        return audioIndexReady.then(() => new Promise(resolve => {
            if (token !== speakToken) return resolve();
            let done = false;
            const finish = () => { if (!done) { done = true; resolve(); } };
            const file = audioFileFor(text, speaker);
            let triedGoogle = false;
            const next = () => {
                if (done || token !== speakToken) return finish();
                if (!triedGoogle) { triedGoogle = true; playSrc(googleTts(text)); return; }
                speakFallback(text, token, rate).then(finish);
            };
            const playSrc = (src) => {
                audioEl.onended = finish;
                audioEl.onerror = next;
                audioEl.playbackRate = rate || 1;
                audioEl.src = src;
                const p = audioEl.play();
                if (p && p.catch) p.catch(next);
            };
            if (file) playSrc(AUDIO_BASE + file); else next();
        }));
    }
    function googleTts(text) {
        const q = encodeURIComponent(text);
        return 'https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=ko&total=1&idx=0&textlen=' + q.length + '&q=' + q;
    }
    window.clSpeak = speak;

    // ------------------------------------------------------------------ dữ liệu
    const ACC = () => window.CurriculumAccess;
    async function listCurricula() { return ACC().listCurricula(S.user); }
    // Lọc danh sách bài theo bài được giao (allowed = null → admin, xem tất cả)
    const visibleUnits = (units, allowed) => allowed ? (units || []).filter(u => allowed.has(u.id)) : (units || []);
    const sortCurricula = (list) => list.filter(c => visibleUnits(c.units, c.allowed).length || isAdmin(S.user))
        .sort((a, b) => (a.order ?? 999) - (b.order ?? 999) || String(a.title).localeCompare(String(b.title), 'vi'));

    // ------------------------------------------------------------------ INDEX
    async function renderIndex() {
        const cid = params.get('c');
        if (cid) return renderCurriculumPage(cid);
        let list;
        try { list = sortCurricula(await listCurricula()); } catch (e) { return showMessage('⚠️', 'Không tải được giáo trình: ' + esc(e.message)); }
        document.title = 'Học theo giáo trình - Vui Học Tiếng Hàn';
        const card = (c) => {
            const units = visibleUnits(c.units, c.allowed);
            const words = units.reduce((n, u) => n + (u.wordCount || 0), 0);
            return `<a class="cl-ccard" href="index.html?c=${encodeURIComponent(c.id)}">
                <div class="ic">${esc(c.icon || '📘')}</div>
                <h3 class="kr">${esc(c.title)}</h3>
                <div class="meta">${units.length} bài · ${words} từ vựng${c.description ? '<br>' + esc(c.description) : ''}</div>
                ${LEVELS[c.level] ? `<span class="lv">${esc(LEVELS[c.level])}</span>` : ''}
                ${c.classes && c.classes.length ? `<span class="lv" style="margin-left:4px">👥 ${esc(c.classes.map(x => x.name).filter(Boolean).join(', ') || 'Lớp của bạn')}</span>` : ''}
            </a>`;
        };
        let body;
        if (!list.length) {
            body = `<div class="cl-empty"><div class="big">📭</div>${S.user
                ? 'Lớp của bạn chưa được giao giáo trình nào.<br><small>Nếu bạn chưa vào lớp, hãy nhập Key Code giáo viên gửi ở mục <b>Sổ từ vựng</b>.</small>'
                : 'Đăng nhập để xem giáo trình của lớp bạn.'}
                ${S.user ? '' : '<div style="margin-top:14px"><button class="cl-btn pri" onclick="clOpenLogin()">Đăng nhập</button></div>'}</div>`;
        } else if (isAdmin(S.user)) {
            body = `<div class="cl-cgrid">${list.map(card).join('')}</div>`;
        } else {
            // Học viên: gom theo lớp
            const classes = await ACC().myClasses(S.user);
            body = classes.filter(f => list.some(c => f.curLinks && f.curLinks[c.id])).map(f => `
                <h2 class="cl-classh">👥 ${esc(f.name || 'Lớp của tôi')}</h2>
                <div class="cl-cgrid">${list.filter(c => f.curLinks && f.curLinks[c.id]).map(c => card({ ...c, classes: [] })).join('')}</div>`).join('');
        }
        root.innerHTML = `
            <section class="cl-hero">
                <div class="eyebrow">📚 ${isAdmin(S.user) ? 'Kho giáo trình' : 'Lớp của tôi'}</div>
                <h1>Học theo giáo trình</h1>
                <p class="sub">Từ vựng, ngữ pháp, hội thoại và bài nghe của từng bài được giao — học trước khi lên lớp, ôn lại sau giờ học.</p>
                ${isAdmin(S.user) ? '<div class="nav"><a class="cl-btn" href="admin.html">✎ Soạn giáo trình</a></div>' : ''}
            </section>
            <div class="cl-panel cl-section">${body}</div>`;
    }

    async function renderCurriculumPage(cid) {
        let cur;
        try {
            const d = await ACC().getWithAccess(S.user, cid, db().collection('curricula').doc(cid));
            if (!d.exists) return showMessage('🔍', 'Không tìm thấy giáo trình này.', '<a class="cl-btn" href="index.html">← Danh sách giáo trình</a>');
            cur = { id: d.id, ...d.data() };
            cur.allowed = await ACC().allowedLessons(S.user, cid);
        } catch (e) { return permissionMessage('giáo trình'); }
        S.cur = cur;
        document.title = cur.title + ' - Học theo giáo trình';
        const units = visibleUnits(cur.units, cur.allowed);
        const words = units.reduce((n, u) => n + (u.wordCount || 0), 0);
        const gram = units.reduce((n, u) => n + (u.grammarCount || 0), 0);
        let stage = null, rows = '';
        units.forEach((u, i) => {
            if ((u.stage || '') !== stage) { stage = u.stage || ''; if (stage) rows += `<div class="cl-stage">${esc(stage)}</div>`; }
            const t = splitTitle(u.title);
            rows += `<a class="cl-lrow" href="${lessonUrl(cur.id, u.id)}">
                <span class="no">${(cur.units || []).indexOf(u) + 1}</span>
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
                    ${units.length ? `<a class="cl-btn" href="${lessonUrl(cur.id, units[0].id)}">▶ Bắt đầu học</a>` : ''}
                    <button class="cl-btn" onclick="clAddCurriculumToNotebook()">＋ Thêm vào Sổ từ</button>
                    ${isAdmin(S.user) ? '<a class="cl-btn" href="admin.html">✎ Soạn</a>' : ''}
                </div>
            </section>
            <div class="cl-panel cl-section">${rows || `<div class="cl-empty">${cur.allowed ? 'Lớp của bạn chưa được giao bài nào trong giáo trình này.' : 'Giáo trình chưa có bài.'}</div>`}</div>`;
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
            const cref = db().collection('curricula').doc(cid);
            const cd = await ACC().getWithAccess(S.user, cid, cref);
            const allowed = await ACC().allowedLessons(S.user, cid);
            if (allowed && !allowed.has(lid)) return showMessage('🔒', 'Bài này chưa được giao cho lớp của bạn.', `<a class="cl-btn" href="index.html?c=${encodeURIComponent(cid)}">← Các bài được giao</a>`);
            const ld = await cref.collection('lessons').doc(lid).get();
            if (!cd.exists || !ld.exists) return showMessage('🔍', 'Không tìm thấy bài học này.', `<a class="cl-btn" href="index.html${cd.exists ? '?c=' + encodeURIComponent(cid) : ''}">← Quay lại</a>`);
            cur = { id: cd.id, ...cd.data(), allowed };
            lesson = { id: ld.id, ...ld.data() };
        } catch (e) { return permissionMessage('bài học'); }
        S.cur = cur; S.lesson = lesson; S.lessonId = lid;
        lesson.words = (lesson.words || []).filter(w => w && w.word);
        lesson.grammar = lesson.grammar || [];
        lesson.dialogues = (lesson.dialogues || []).filter(d => d && (d.lines || []).length);
        lesson.listening = (lesson.listening || []).filter(d => d && ((d.lines || []).length || (d.questions || []).length));
        lesson.listening.forEach(d => { d.lines = d.lines || []; d.questions = d.questions || []; });
        normalizeExtra(lesson);
        const hash = (location.hash || '').replace('#', '');
        S.tab = ['words', 'grammar', 'dialogues', 'listening', 'reading', 'culture', 'pron', 'exercises'].includes(hash) ? hash
            : (lesson.words.length ? 'words' : lesson.grammar.length ? 'grammar' : lesson.dialogues.length ? 'dialogues' : 'words');
        window.learningActive = true; // activity-tracker.js: tính giờ học
        S.media = {}; S.credits = {};
        drawLesson();
        loadMedia(cid, lid);
    }

    // ---------- Ảnh minh họa (curricula/{c}/media, mỗi doc { lesson, items: { id: dataURL } })
    // Thẻ ảnh được vẽ sẵn dạng <img data-img="id" hidden>; tải xong thì gắn src và hiện ra.
    // Ảnh có giấy phép mở (CC BY / BY-SA…) mang theo credits[id] = { t, u } → hiện ở mục "Nguồn ảnh".
    function imgTag(id, cls) {
        const cr = (S.credits || {})[id];
        return `<img class="${cls}" data-img="${esc(id)}" alt="" ${cr ? `title="${esc(cr.t)}"` : ''} ${S.media[id] ? `src="${esc(S.media[id])}"` : 'hidden'}>`;
    }
    function creditsBlock(ids) {
        // gom theo nguồn: nhiều từ cùng dùng biểu tượng Twemoji → một dòng
        const groups = new Map();
        ids.forEach(({ id, label }) => {
            const cr = (S.credits || {})[id];
            if (!cr || !S.media[id]) return;
            const key = cr.t + '|' + cr.u;
            if (!groups.has(key)) groups.set(key, { cr, labels: [] });
            groups.get(key).labels.push(label);
        });
        const rows = [...groups.values()].map(({ cr, labels }) => {
            const names = labels.length > 6 ? labels.slice(0, 6).join(', ') + ` … (+${labels.length - 6})` : labels.join(', ');
            return `<li><b class="kr">${esc(names)}</b>: ${cr.u ? `<a href="${esc(cr.u)}" target="_blank" rel="noopener nofollow">${esc(cr.t)}</a>` : esc(cr.t)}</li>`;
        });
        return rows.length ? `<details class="cl-credits"><summary>📷 Nguồn ảnh (${rows.length})</summary><ul>${rows.join('')}</ul></details>` : '';
    }
    function fillCredits() {
        const el = document.getElementById('clCredits'); if (!el) return;
        const L = S.lesson;
        el.innerHTML = S.tab === 'dialogues'
            ? creditsBlock(L.dialogues.map((d, i) => ({ id: d.id, label: d.title || 'Hội thoại ' + (i + 1) })))
            : S.tab === 'culture' ? creditsBlock((L.culture || []).map((d, i) => ({ id: d.id, label: d.title || 'Văn hóa ' + (i + 1) })))
            : creditsBlock(L.words.map(w => ({ id: w.id, label: w.word })));
    }
    function applyMedia(root2) {
        (root2 || document).querySelectorAll('img[data-img]').forEach(im => {
            const u = S.media[im.dataset.img], cr = (S.credits || {})[im.dataset.img];
            if (u && im.getAttribute('src') !== u) { im.src = u; im.hidden = false; }
            if (cr) im.title = cr.t;
        });
        document.querySelectorAll('.cl-vcard').forEach(c => c.classList.toggle('has-img', !!c.querySelector('img[data-img]:not([hidden])')));
        fillCredits();
    }
    async function loadMedia(cid, lid) {
        try {
            const snap = await db().collection('curricula').doc(cid).collection('media').where('lesson', '==', lid).get();
            S.credits = S.credits || {};
            snap.docs.forEach(d => { Object.assign(S.media, d.data().items || {}); Object.assign(S.credits, d.data().credits || {}); });
            if (S.lessonId === lid) applyMedia();
        } catch (e) { /* chưa có ảnh hoặc không có quyền → bỏ qua */ }
    }

    function drawLesson() {
        const cur = S.cur, L = S.lesson;
        const units = visibleUnits(cur.units, cur.allowed);
        const idx = units.findIndex(u => u.id === S.lessonId);
        const prev = idx > 0 ? units[idx - 1] : null, next = idx >= 0 && idx < units.length - 1 ? units[idx + 1] : null;
        const t = splitTitle(L.title);
        document.title = `${t.main} · ${cur.title}`;
        root.innerHTML = `
            <nav class="cl-crumbs">${FROM.f
                ? `<a href="${esc(backToClassUrl())}">← Về bài học trong lớp</a> · <span class="kr">${esc(cur.title)}</span>`
                : `<a href="index.html">📚 Giáo trình</a> › <a class="kr" href="index.html?c=${encodeURIComponent(cur.id)}">${esc(cur.title)}</a>`} › <span>Bài ${(cur.units || []).findIndex(u => u.id === S.lessonId) + 1}</span></nav>
            <section class="cl-hero">
                <div class="eyebrow kr">${esc(cur.icon || '📘')} ${esc(cur.title)}${L.stage ? ' · ' + esc(L.stage) : ''}</div>
                <h1 class="kr">${esc(t.main)}</h1>
                ${t.sub ? `<p class="sub">${esc(t.sub)}</p>` : ''}
                <div class="chips"><span class="cl-chip">🔤 ${L.words.length} từ vựng</span><span class="cl-chip">📗 ${L.grammar.length} ngữ pháp</span><span class="cl-chip">💬 ${L.dialogues.length} hội thoại</span>${L.listening.length ? `<span class="cl-chip">🎧 ${L.listening.length} bài nghe</span>` : ''}${L.reading.length ? `<span class="cl-chip">📖 ${L.reading.length} bài đọc</span>` : ''}</div>
                <div class="nav">
                    ${FROM.f ? `<a class="cl-btn pri" href="${esc(backToClassUrl())}" title="Quay lại bài này trong thư mục lớp">← Về bài học trong lớp</a>` : ''}
                    ${prev ? `<a class="cl-btn" href="${lessonUrl(cur.id, prev.id, S.tab)}" title="${esc(prev.title)}">← Bài trước</a>` : '<button class="cl-btn" disabled>← Bài trước</button>'}
                    <select id="clLessonSel" aria-label="Chọn bài">${units.map(u => `<option value="${esc(u.id)}" ${u.id === S.lessonId ? 'selected' : ''}>${(cur.units || []).indexOf(u) + 1}. ${esc(splitTitle(u.title).main)}</option>`).join('')}</select>
                    ${next ? `<a class="cl-btn" href="${lessonUrl(cur.id, next.id, S.tab)}" title="${esc(next.title)}">Bài sau →</a>` : '<button class="cl-btn" disabled>Bài sau →</button>'}
                    ${isAdmin(S.user) ? '<a class="cl-btn" href="admin.html" title="Mở trang soạn">✎ Soạn</a>' : ''}
                    ${isAdmin(S.user) && window.LessonAnnotate ? '<button type="button" class="cl-btn" id="clAnnotateBtn" title="Vẽ, khoanh, gạch chân, ghi chú thẳng lên bài khi giảng (chỉ giáo viên thấy nút này)">✏️ Vẽ chú thích</button>' : ''}
                    ${window.LessonNotes ? '<button type="button" class="cl-btn" id="clNotesBtn" title="Ghi chú nháp riêng cho bài này (lưu vào máy & tài khoản)">📖 Sổ tay nháp</button>' : ''}
                </div>
            </section>
            <div class="cl-panel cl-tabs" role="tablist">
                <button class="cl-tab" role="tab" data-tab="words">🔤 Từ vựng <span class="n">${L.words.length}</span></button>
                <button class="cl-tab" role="tab" data-tab="grammar">📗 Ngữ pháp <span class="n">${L.grammar.length}</span></button>
                <button class="cl-tab" role="tab" data-tab="dialogues">💬 Hội thoại <span class="n">${L.dialogues.length}</span></button>
                <button class="cl-tab" role="tab" data-tab="listening">🎧 Nghe <span class="n">${L.listening.length}</span></button>
                ${L.reading.length ? `<button class="cl-tab" role="tab" data-tab="reading">📖 Đọc <span class="n">${L.reading.length}</span></button>` : ''}
                ${L.culture.length ? `<button class="cl-tab" role="tab" data-tab="culture">🏮 Văn hóa <span class="n">${L.culture.length}</span></button>` : ''}
                ${L.pron.length ? `<button class="cl-tab" role="tab" data-tab="pron">🗣 Phát âm <span class="n">${L.pron.length}</span></button>` : ''}
                ${L.exercises.length ? `<button class="cl-tab" role="tab" data-tab="exercises">📝 Bài tập <span class="n">${L.exercises.length}</span></button>` : ''}
            </div>
            <div class="cl-panel cl-section" id="clTabBody"></div>`;
        document.getElementById('clLessonSel').addEventListener('change', e => { location.href = lessonUrl(cur.id, e.target.value, S.tab); });
        if (window.LessonNotes) {
            // Sổ tay nháp (lesson-notes.js): mỗi bài giáo trình một trang nháp riêng
            const notesOpts = () => ({
                noteId: `cur_${cur.id}_${S.lessonId}`,
                folderId: 'cur_' + cur.id,
                folderTitle: cur.title,
                lessonName: `Bài ${(cur.units || []).findIndex(u => u.id === S.lessonId) + 1}. ${t.main}`
            });
            document.getElementById('clNotesBtn').addEventListener('click', () => window.LessonNotes.open(notesOpts()));
            window.LessonNotes.mountFab(notesOpts);
        }
        if (isAdmin(S.user) && window.LessonAnnotate) {
            // Vẽ chú thích đè lên bài (lesson-annotate.js) — chỉ giáo viên, không lưu
            window.LessonAnnotate.mount();
            document.getElementById('clAnnotateBtn').addEventListener('click', () => window.LessonAnnotate.toggle());
        }
        root.querySelectorAll('.cl-tab').forEach(b => b.addEventListener('click', () => switchTab(b.dataset.tab)));
        switchTab(S.tab, true);
    }

    function switchTab(tab, initial) {
        S.tab = tab;
        stopSpeak(); closePop();
        root.querySelectorAll('.cl-tab').forEach(b => { b.classList.toggle('active', b.dataset.tab === tab); b.setAttribute('aria-selected', b.dataset.tab === tab); });
        if (!initial) history.replaceState(null, '', '#' + tab);
        if (window.LessonAnnotate) window.LessonAnnotate.setPage(tab); // mỗi tab một lớp nét vẽ
        // giữ tab khi chuyển bài
        root.querySelectorAll('.cl-hero a[href^="lesson.html"]').forEach(a => { a.href = a.href.replace(/#.*$/, '') + '#' + tab; });
        if (tab === 'grammar') renderGrammar();
        else if (tab === 'dialogues') renderDialogues();
        else if (tab === 'listening') renderListening();
        else if (tab === 'reading') renderReading();
        else if (tab === 'culture') renderCulture();
        else if (tab === 'pron') renderPron();
        else if (tab === 'exercises') renderExercises();
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
                </div>`).join('')}</div>
            <div id="clCredits"></div>`;
        fillCredits();
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
        const pic = S.media[w.id] ? `<img class="fc-pic" src="${esc(S.media[w.id])}" alt="">` : '';
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
            mountConjugator(c, G[+item.dataset.i]);
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

    // Bảng quy tắc + Máy chia ngữ pháp (grammar-conjugator*.js). Mục lấy từ thư viện có libId;
    // mục tự soạn thì ghép theo tên — chỉ khi đó mới tải thư viện ngữ pháp (file lớn).
    const GRAMMAR_LIB_SRC = (function () {
        try { return new URL('grammar-library.js', (document.currentScript && document.currentScript.src) || location.href).href; }
        catch (e) { return '/assets/js/grammar-library.js'; }
    })();
    let grammarLibLoading = null;
    function loadGrammarLibrary() {
        if (window.GrammarLibrary) return Promise.resolve();
        if (!grammarLibLoading) grammarLibLoading = new Promise(resolve => {
            const sc = document.createElement('script'); sc.src = GRAMMAR_LIB_SRC;
            sc.onload = sc.onerror = () => resolve(); document.head.appendChild(sc);
        });
        return grammarLibLoading;
    }
    function mountConjugator(box, g) {
        const UI = window.GrammarConjugatorUI; if (!UI || !g) return;
        const go = () => { const key = UI.keyFor(g); if (key && box.isConnected) UI.mount(box, key); return !!key; };
        if (go() || g.libId) return;
        loadGrammarLibrary().then(go);
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
                            <div class="mask">🎤 Lượt của bạn — nói xong chạm để xem</div>
                            ${l.vi ? `<div class="vi">${esc(l.vi)}</div>` : ''}
                            <button class="say" data-act="say" title="Nghe câu này" aria-label="Nghe câu này">🔊</button>
                        </div>
                    </div>`).join('')}</div>
            </div>`;
        }).join('') + '<div id="clCredits"></div>';
        fillCredits();

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
        return speak(d.lines[li].kr, d.lines[li].s || '').then(() => { if (el) el.classList.remove('speaking'); });
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
            if (el && !card.classList.contains('no-script')) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
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

    // ---------- Nghe: nghe audio (hoặc đọc theo vai) → trả lời câu hỏi → mở lời thoại để đối chiếu
    // Dùng chung bộ phát của hội thoại (playDialogue / speakLine) và bộ chấm bài của ngữ pháp (initQuizSection).
    function renderListening() {
        const D = S.lesson.listening, box = document.getElementById('clTabBody');
        if (!D.length) { box.innerHTML = '<div class="cl-empty"><div class="big">🎧</div>Bài này chưa có bài nghe.<br><small>Giáo viên có thể thêm ở tab “🎧 Nghe” trong trang soạn giáo trình.</small></div>'; return; }
        const keys = vocabKeys();
        box.innerHTML = D.map((d, di) => {
            const speakers = [...new Set(d.lines.map(l => l.s).filter(Boolean))];
            const side = (s) => !s ? 'n' : (speakers.indexOf(s) % 2 === 1 ? 'r' : 'l');
            const qs = d.questions || [];
            return `<div class="cl-dlg cl-lis no-script" data-d="${di}">
                <div class="head">
                    <h3 class="kr">🎧 ${esc(d.title || 'Bài nghe ' + (di + 1))}</h3>
                    ${d.audio ? '' : (d.lines.length ? '<button class="cl-btn pri" data-act="play">▶ Nghe cả đoạn</button>' : '')}
                    ${d.lines.length ? '<button class="cl-btn" data-act="script">📜 Xem lời thoại</button>' : ''}
                </div>
                ${d.audio ? `<audio controls preload="none" src="${esc(d.audio)}"></audio>` : ''}
                ${qs.length ? `<div class="grammar-content cl-lq"><div class="quiz-section">
                    ${qs.map((q, qi) => `<div class="quiz-q" data-type="mc" data-answer="${q.answer}">
                        <div class="quiz-q-text"><b>${qi + 1}.</b> <span class="kr">${esc(q.q)}</span>${q.qvi ? `<div class="qvi">${esc(q.qvi)}</div>` : ''}</div>
                        <div class="quiz-opts">${q.options.map((o, oi) => `<button class="quiz-opt kr" data-v="${oi}">${esc(o)}</button>`).join('')}</div>
                        <div class="quiz-feedback"></div>
                        ${q.explain ? `<div class="quiz-explain">💡 ${esc(q.explain)}</div>` : ''}
                    </div>`).join('')}
                    <div class="quiz-score"></div>
                </div></div>` : ''}
                <div class="cl-lis-script">
                    <div class="cl-lis-tools"><button class="cl-btn on" data-act="vi">🇻🇳 Bản dịch</button></div>
                    <div class="cl-lines">${d.lines.map((l, li) => `
                    <div class="cl-line ${side(l.s)}" data-l="${li}" data-s="${esc(l.s)}">
                        ${l.s ? `<span class="cl-ava" style="background:${AVATAR_COLORS[speakers.indexOf(l.s) % AVATAR_COLORS.length]}">${esc(l.s.slice(0, 2))}</span>` : ''}
                        <div class="cl-bub">
                            ${l.s ? `<div class="who">${esc(l.s)}</div>` : ''}
                            <div class="ko kr">${highlight(l.kr, keys)}</div>
                            ${l.vi ? `<div class="vi">${esc(l.vi)}</div>` : ''}
                            <button class="say" data-act="say" title="Nghe câu này" aria-label="Nghe câu này">🔊</button>
                        </div>
                    </div>`).join('')}</div>
                </div>
            </div>`;
        }).join('');

        box.querySelectorAll('.cl-lis').forEach(card => {
            const d = D[+card.dataset.d];
            const sec = card.querySelector('.quiz-section'); if (sec) initQuizSection(sec);
            card.addEventListener('click', e => {
                const vh = e.target.closest('.cl-vh');
                if (vh) { e.stopPropagation(); return showPop(vh, S.lesson.words[+vh.dataset.w]); }
                const act = e.target.closest('[data-act]'); if (!act) return;
                const line = e.target.closest('.cl-line');
                if (act.dataset.act === 'say' && line) { stopDialogue(); speakLine(card, d, +line.dataset.l); }
                else if (act.dataset.act === 'play') { if (DLG.playing === +card.dataset.d) stopDialogue(); else playDialogue(card, d); }
                else if (act.dataset.act === 'vi') { act.classList.toggle('on'); card.classList.toggle('no-vi', !act.classList.contains('on')); }
                else if (act.dataset.act === 'script') {
                    const show = card.classList.toggle('no-script') === false;
                    act.textContent = show ? '🙈 Ẩn lời thoại' : '📜 Xem lời thoại';
                    act.classList.toggle('on', show);
                }
            });
        });
    }

    // ---------- Đọc / Văn hóa / Phát âm (읽고 쓰기 · 문화 산책 · 발음 của sách)
    // reading: [{ id, title, lines: [{ kr, vi }], questions, task, taskVi }] — ảnh minh họa (nếu có): media[id]
    // culture: [{ id, title, lines: [{ kr, vi }] }] — ảnh minh họa: media[id]
    // pron:    [{ id, title, rule, examples: [{ kr, pr, vi }] }]
    function normalizeExtra(lesson) {
        const lines = (a) => (a || []).filter(l => l && (l.kr || l.vi)).map(l => ({ kr: String(l.kr || ''), vi: String(l.vi || '') }));
        lesson.reading = (lesson.reading || []).filter(Boolean)
            .map(r => ({ ...r, lines: lines(r.lines), questions: (r.questions || []).filter(q => q && q.options && q.options.length >= 2) }))
            .filter(r => r.lines.length || r.questions.length || r.task);
        lesson.culture = (lesson.culture || []).filter(Boolean).map(c => ({ ...c, lines: lines(c.lines) })).filter(c => c.lines.length || c.title);
        lesson.pron = (lesson.pron || []).filter(Boolean).map(p => ({ ...p, examples: (p.examples || []).filter(e => e && e.kr) })).filter(p => p.rule || p.examples.length);
        lesson.exercises = (lesson.exercises || []).filter(e => e && e.id && (e.items || []).length).map(e => ({ ...e, items: e.items.filter(it => it && it.q) }));
    }
    const nl2br = (s) => esc(s).replace(/\n/g, '<br>');
    // Đọc lần lượt các câu; phần tử [data-k="i"] trong card được tô sáng khi đang đọc
    async function playSeq(card, texts, btn, label) {
        if (DLG.playing === card) { stopDialogue(); if (btn) btn.textContent = label; return; }
        stopDialogue();
        DLG.playing = card;
        const my = ++DLG.token;
        if (btn) btn.textContent = '⏹ Dừng';
        for (let i = 0; i < texts.length; i++) {
            if (DLG.token !== my) break;
            const el = card.querySelector(`.cl-para[data-k="${i}"], .row[data-k="${i}"]`);
            card.querySelectorAll('.speaking').forEach(x => x.classList.remove('speaking'));
            if (el) { el.classList.add('speaking'); el.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }
            await speak(texts[i], '');
            if (el) el.classList.remove('speaking');
            await new Promise(r => setTimeout(r, 300));
        }
        if (DLG.token === my) stopDialogue();
        if (btn) btn.textContent = label;
    }
    function quizHtml(qs) {
        return qs.length ? `<div class="grammar-content cl-lq"><div class="quiz-section">
            ${qs.map((q, qi) => `<div class="quiz-q" data-type="mc" data-answer="${q.answer}">
                <div class="quiz-q-text"><b>${qi + 1}.</b> <span class="kr">${esc(q.q)}</span>${q.qvi ? `<div class="qvi">${esc(q.qvi)}</div>` : ''}</div>
                <div class="quiz-opts">${q.options.map((o, oi) => `<button class="quiz-opt kr" data-v="${oi}">${esc(o)}</button>`).join('')}</div>
                <div class="quiz-feedback"></div>
                ${q.explain ? `<div class="quiz-explain">💡 ${esc(q.explain)}</div>` : ''}
            </div>`).join('')}
            <div class="quiz-score"></div>
        </div></div>` : '';
    }
    // Đoạn văn: chỉ số data-k đếm theo câu có tiếng Hàn (khớp với danh sách đọc của playSeq)
    function passageHtml(lines, keys) {
        let k = 0;
        return `<div class="cl-pass">${lines.map(l => {
            const idx = l.kr ? k++ : -1;
            return `<div class="cl-para" ${idx >= 0 ? `data-k="${idx}"` : ''}>
                ${l.kr ? `<div class="ko kr">${keys ? highlight(l.kr, keys) : esc(l.kr)} <button class="say" data-act="say" data-t="${esc(l.kr)}" title="Nghe câu này" aria-label="Nghe câu này">🔊</button></div>` : ''}
                ${l.vi ? `<div class="vi">${esc(l.vi)}</div>` : ''}
            </div>`;
        }).join('')}</div>`;
    }
    function bindPassage(card, lines) {
        card.addEventListener('click', e => {
            const vh = e.target.closest('.cl-vh');
            if (vh) { e.stopPropagation(); return showPop(vh, S.lesson.words[+vh.dataset.w]); }
            const act = e.target.closest('[data-act]'); if (!act) return;
            if (act.dataset.act === 'say') {
                stopDialogue();
                const el = act.closest('.cl-para');
                card.querySelectorAll('.speaking').forEach(x => x.classList.remove('speaking'));
                if (el) el.classList.add('speaking');
                speak(act.dataset.t, '').then(() => el && el.classList.remove('speaking'));
            } else if (act.dataset.act === 'playall') playSeq(card, lines.map(l => l.kr).filter(Boolean), act, '▶ Nghe cả bài');
            else if (act.dataset.act === 'vi') { act.classList.toggle('on'); card.classList.toggle('no-vi', !act.classList.contains('on')); }
        });
    }
    function renderReading() {
        const D = S.lesson.reading, box = document.getElementById('clTabBody');
        if (!D.length) { box.innerHTML = '<div class="cl-empty"><div class="big">📖</div>Bài này chưa có bài đọc.</div>'; return; }
        const keys = vocabKeys();
        box.innerHTML = D.map((r, ri) => {
            const wkey = `clw_${S.cur ? S.cur.id : ''}_${S.lessonId || ''}_${r.id || ri}`;
            let saved = ''; try { saved = localStorage.getItem(wkey) || ''; } catch (e) { }
            return `<div class="cl-dlg cl-read" data-r="${ri}">
                <div class="head">
                    <h3 class="kr">📖 ${esc(r.title || 'Bài đọc ' + (ri + 1))}</h3>
                    ${r.lines.some(l => l.kr) ? '<button class="cl-btn pri" data-act="playall">▶ Nghe cả bài</button>' : ''}
                    ${r.lines.some(l => l.vi) ? '<button class="cl-btn on" data-act="vi">🇻🇳 Bản dịch</button>' : ''}
                </div>
                ${imgTag(r.id, 'cl-rimg')}
                ${passageHtml(r.lines, keys)}
                ${quizHtml(r.questions)}
                ${r.task ? `<div class="cl-task">
                    <div class="t">✍️ Luyện viết</div>
                    <div class="kr">${nl2br(r.task)}</div>
                    ${r.taskVi ? `<div class="vi">${nl2br(r.taskVi)}</div>` : ''}
                    <textarea class="kr" data-wkey="${esc(wkey)}" rows="5" placeholder="Viết bài của bạn ở đây (tự lưu trên máy này)…">${esc(saved)}</textarea>
                    <div class="cnt">${saved.replace(/\s/g, '').length} chữ</div>
                </div>` : ''}
            </div>`;
        }).join('');
        box.querySelectorAll('.cl-read').forEach(card => {
            const r = D[+card.dataset.r];
            const sec = card.querySelector('.quiz-section'); if (sec) initQuizSection(sec);
            bindPassage(card, r.lines);
            const ta = card.querySelector('textarea[data-wkey]');
            if (ta) ta.addEventListener('input', () => {
                try { localStorage.setItem(ta.dataset.wkey, ta.value); } catch (e) { }
                card.querySelector('.cl-task .cnt').textContent = ta.value.replace(/\s/g, '').length + ' chữ';
            });
        });
        applyMedia(box);
    }
    function renderCulture() {
        const D = S.lesson.culture, box = document.getElementById('clTabBody');
        if (!D.length) { box.innerHTML = '<div class="cl-empty"><div class="big">🏮</div>Bài này chưa có phần văn hóa.</div>'; return; }
        box.innerHTML = D.map((c, ci) => `<div class="cl-dlg cl-cult" data-c="${ci}">
            <div class="head">
                <h3 class="kr">🏮 ${esc(c.title || 'Văn hóa ' + (ci + 1))}</h3>
                ${c.lines.some(l => l.kr) ? '<button class="cl-btn" data-act="playall">▶ Nghe cả bài</button>' : ''}
                ${c.lines.some(l => l.kr) && c.lines.some(l => l.vi) ? '<button class="cl-btn on" data-act="vi">🇻🇳 Bản dịch</button>' : ''}
            </div>
            ${imgTag(c.id, 'cl-cimg')}
            ${passageHtml(c.lines)}
        </div>`).join('') + '<div id="clCredits"></div>';
        box.querySelectorAll('.cl-cult').forEach(card => bindPassage(card, D[+card.dataset.c].lines));
        applyMedia(box);
    }
    // ---------- Bài tập (연습 của sách bài tập)
    // exercises: [{ id, part, sub, no, kr, vi, kind: 'fill'|'choice'|'match'|'free', ex, opts, imgs, items: [{ q, a, o, t }] }]
    // Tiến độ lưu trên máy: clex_<giáo trình>_<bài> = { ok: { 'exId:k': 1 }, v: { 'exId:k': giá trị đã làm } }
    const exKey = () => `clex_${S.cur ? S.cur.id : ''}_${S.lessonId || ''}`;
    function exLoad() { try { return Object.assign({ ok: {}, v: {} }, JSON.parse(localStorage.getItem(exKey()) || '{}')); } catch (e) { return { ok: {}, v: {} }; } }
    function exSave(st) { try { localStorage.setItem(exKey(), JSON.stringify(st)); } catch (e) { } }
    const exNorm = (s) => String(s || '').normalize('NFC').toLowerCase().replace(/[\s.,?!~·…'"“”‘’()\[\]{}:;\-–—]/g, '');
    const exAlts = (a) => String(a || '').split('/').map(x => x.trim()).filter(Boolean);
    const exGraded = (e) => e.kind !== 'free';
    const exW = (n) => Math.min(n * 1.05 + 1.4, 30).toFixed(2) + 'em'; // chữ Hàn ≈ 1em
    function exImgIds(e) { const ids = [e.id]; for (let k = 2; k <= (e.imgs || 1); k++) ids.push(e.id + '_' + k); return ids; }
    // câu ngắn (vd. ② ＿국, 나나(＿)) → xếp lưới nhiều cột cho gọn
    const exShort = (e) => e.kind !== 'free' && e.items.length > 2 && e.items.every(it => !it.p && !it.t && String(it.q).length <= 22 && (e.kind !== 'fill' || (it.a || []).every(a => exAlts(a).every(x => x.length <= 8))) && (e.kind !== 'choice' || (it.o || []).join('').length <= 14));
    function exStats(D, st) {
        let got = 0, all = 0;
        D.forEach(e => { if (!exGraded(e)) return; e.items.forEach((it, k) => { all++; if (st.ok[e.id + ':' + k]) got++; }); });
        return { got, all };
    }
    function exProgressHtml(D, st) {
        const { got, all } = exStats(D, st);
        const parts = [...new Set(D.map(e => e.part || 'Bài tập'))];
        return `<div class="pr-progress ex-progress ${all && got >= all ? 'complete' : ''}">
            <div class="pp-head">${all && got >= all ? '🏆 Hoàn thành toàn bộ bài tập của bài!' : `📝 Bài tập của bài · đúng <b>${got}/${all}</b> câu`}</div>
            <div class="pp-bar"><i style="width:${all ? Math.round(got / all * 100) : 0}%"></i></div>
            ${parts.length > 1 ? `<div class="ex-jump">${parts.map((p, i) => `<button type="button" class="cl-btn" data-jump="${i}">${esc(p)}</button>`).join('')}</div>` : ''}
        </div>`;
    }
    function exRefresh(box, D, st) {
        const { got, all } = exStats(D, st);
        const pg = box.querySelector('.ex-progress');
        if (pg) {
            pg.classList.toggle('complete', !!all && got >= all);
            pg.querySelector('.pp-head').innerHTML = all && got >= all ? '🏆 Hoàn thành toàn bộ bài tập của bài!' : `📝 Bài tập của bài · đúng <b>${got}/${all}</b> câu`;
            pg.querySelector('.pp-bar i').style.width = (all ? Math.round(got / all * 100) : 0) + '%';
        }
        box.querySelectorAll('.ex-card').forEach(card => {
            const e = D[+card.dataset.e]; if (!exGraded(e)) return;
            const n = e.items.filter((it, k) => st.ok[e.id + ':' + k]).length;
            const pill = card.querySelector('.ex-pill');
            pill.textContent = n >= e.items.length ? '✓ Xong' : `${n}/${e.items.length}`;
            card.classList.toggle('done', n >= e.items.length);
        });
        const tab = root.querySelector('.cl-tab[data-tab="exercises"]');
        if (tab) tab.classList.toggle('done', !!all && got >= all);
    }
    // một câu hỏi: chỗ trống "___" thành ô nhập (fill) hoặc ô hiện lựa chọn (choice / match)
    function exItemHtml(e, it, k, st) {
        const key = e.id + ':' + k, saved = st.v[key], ok = st.ok[key];
        const say = it.t ? `<button type="button" class="ex-say" data-say="${esc(it.t)}" title="Nghe câu">🔊</button>` : '';
        // số câu theo sách ("3) …") hiện ở ô số, bỏ khỏi câu
        const m = String(it.q).match(/^\s*(\d+)\)\s*/);
        it = Object.assign({}, it, { q: m ? String(it.q).slice(m[0].length) : String(it.q) });
        const num = `<span class="ex-n">${m ? m[1] : k + 1}</span>`;
        const pic = it.p ? imgTag(e.id + '_i' + (k + 1), 'ex-img ex-ithumb') : '';
        if (e.kind === 'fill') {
            const parts = String(it.q).split('___');
            const blanks = parts.length - 1;
            const vals = Array.isArray(saved) ? saved : [];
            let html = '';
            parts.forEach((p, j) => {
                html += `<span class="kr">${esc(p)}</span>`;
                if (j < blanks) {
                    const longest = Math.max(2, ...exAlts((it.a || [])[j]).map(x => [...x].length));
                    const wide = longest > 10;
                    html += `<input class="ex-in kr ${wide ? 'wide' : ''}" data-j="${j}" autocomplete="off" spellcheck="false" data-base="${longest}" style="--w:${exW(Math.max(longest, [...(vals[j] || '')].length))}" value="${esc(vals[j] || '')}" aria-label="Chỗ trống ${j + 1}">`;
                }
            });
            if (!blanks) html += `<input class="ex-in kr wide" data-j="0" autocomplete="off" spellcheck="false" value="${esc(vals[0] || '')}">`;
            return `<div class="ex-it ${ok ? 'ok' : ''}" data-k="${k}">${num}<div class="ex-q">${pic}${say}${html}</div><span class="ex-mark">${ok ? '✓' : ''}</span><div class="ex-ans" hidden></div></div>`;
        }
        if (e.kind === 'free') {
            return `<div class="ex-it free" data-k="${k}">${num}<div class="ex-q">${pic}${say}<span class="kr">${esc(it.q)}</span>
                <textarea class="ex-free kr" rows="2" placeholder="Viết câu trả lời của bạn…">${esc(saved || '')}</textarea>
                ${it.a ? `<details class="ex-sample"><summary>💡 Câu trả lời mẫu</summary><div class="kr">${esc(it.a)}</div></details>` : ''}</div></div>`;
        }
        const opts = e.kind === 'match' ? (e.opts || []) : (it.o || []);
        const q = String(it.q);
        const slot = `<span class="ex-slot kr">${saved != null && opts[saved] != null ? esc(opts[saved]) : '&nbsp;'}</span>`;
        const qHtml = q.includes('___') ? q.split('___').map(esc).join(slot) : (e.kind === 'match' ? (q ? esc(q) + ' → ' : '') + slot : esc(q));
        return `<div class="ex-it pick ${ok ? 'ok' : saved != null ? 'bad' : ''}" data-k="${k}">${num}<div class="ex-q">${pic}${say}<span class="kr">${qHtml}</span>
            <div class="ex-opts">${opts.map((o, oi) => `<button type="button" class="ex-opt kr ${saved === oi ? (ok ? 'right' : 'wrong') : ''}" data-oi="${oi}">${esc(o)}</button>`).join('')}</div></div>
            <span class="ex-mark">${ok ? '✓' : saved != null ? '✗' : ''}</span></div>`;
    }
    function renderExercises() {
        const D = S.lesson.exercises, box = document.getElementById('clTabBody');
        if (!D.length) { box.innerHTML = '<div class="cl-empty"><div class="big">📝</div>Bài này chưa có bài tập.</div>'; return; }
        const st = exLoad();
        let lastPart = null, lastSub = null, partNo = -1;
        const parts = [...new Set(D.map(e => e.part || 'Bài tập'))];
        box.innerHTML = exProgressHtml(D, st) + D.map((e, ei) => {
            let head = '';
            const part = e.part || 'Bài tập';
            if (part !== lastPart) { partNo = parts.indexOf(part); head += `<h2 class="ex-part kr" data-part="${partNo}">${esc(part)}</h2>`; lastPart = part; lastSub = null; }
            if (e.sub && e.sub !== lastSub) { head += `<h3 class="ex-sub kr">📗 ${esc(e.sub)}</h3>`; }
            lastSub = e.sub || null;
            const imgs = exImgIds(e).map(id => imgTag(id, 'ex-img')).join('');
            const graded = exGraded(e);
            const hasFill = e.kind === 'fill';
            return head + `<div class="ex-card" data-e="${ei}">
                <div class="ex-head">
                    <span class="ex-no kr">${esc(e.no || 'Bài ' + (ei + 1))}</span>
                    <div class="ex-title"><b class="kr">${esc(e.kr)}</b>${e.vi ? `<small>${esc(e.vi)}</small>` : ''}</div>
                    ${graded ? '<span class="ex-pill"></span>' : '<span class="ex-pill free">Tự luyện</span>'}
                </div>
                ${e.ex ? `<div class="ex-example"><span class="lb">[보기]</span> <span class="kr">${esc(e.ex)}</span></div>` : ''}
                <div class="ex-body">
                    <div class="ex-pics">${imgs}</div>
                    <div class="ex-items ${exShort(e) ? 'short' : ''}">${e.items.map((it, k) => exItemHtml(e, it, k, st)).join('')}</div>
                </div>
                ${graded ? `<div class="ex-foot">
                    ${hasFill ? '<button type="button" class="cl-btn pri" data-act="check">✅ Kiểm tra</button>' : ''}
                    <button type="button" class="cl-btn" data-act="show">👀 Xem đáp án</button>
                    <button type="button" class="cl-btn" data-act="reset">↺ Làm lại</button>
                    <span class="ex-res"></span>
                </div>` : ''}
            </div>`;
        }).join('') + '<div id="clCredits"></div>';
        exRefresh(box, D, st);
        box.querySelectorAll('[data-jump]').forEach(b => b.addEventListener('click', () => {
            const h = box.querySelector(`.ex-part[data-part="${b.dataset.jump}"]`);
            if (h) h.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }));
        box.querySelectorAll('.ex-card').forEach(card => bindExercise(card, D[+card.dataset.e], st, box, D));
        applyMedia(box);
    }
    function exCheckItem(e, it, k, row, st) {
        const key = e.id + ':' + k;
        const ins = [...row.querySelectorAll('.ex-in')];
        const vals = ins.map(x => x.value);
        st.v[key] = vals;
        if (vals.every(v => !v.trim())) { row.classList.remove('ok', 'bad'); row.querySelector('.ex-mark').textContent = ''; return null; }
        // chấp nhận cả khi gõ luôn chữ dính liền trước / sau chỗ trống (vd. ô ＿국 gõ 한국)
        const segs = String(it.q).split('___');
        const res = ins.map((x, j) => {
            const pre = exNorm((String(segs[j] || '').trim().split(/\s+/).pop() || '').replace(/^[\d)①-⑳]+/, ''));
            const post = exNorm(String(segs[j + 1] || '').trim().split(/\s+/)[0] || '');
            const v = exNorm(x.value);
            return exAlts((it.a || [])[j]).some(a => { const n = exNorm(a); return v === n || v === pre + n || v === n + post || v === pre + n + post; });
        });
        ins.forEach((x, j) => { x.classList.toggle('right', res[j]); x.classList.toggle('wrong', !res[j]); });
        const good = res.every(Boolean);
        if (good) st.ok[key] = 1; else delete st.ok[key];
        row.classList.toggle('ok', good); row.classList.toggle('bad', !good);
        row.querySelector('.ex-mark').textContent = good ? '✓' : '✗';
        return good;
    }
    function bindExercise(card, e, st, box, D) {
        const res = card.querySelector('.ex-res');
        const flash = (txt, cls) => { if (!res) return; res.textContent = txt; res.className = 'ex-res ' + (cls || ''); };
        card.querySelectorAll('.ex-say').forEach(b => b.addEventListener('click', () => speak(b.dataset.say, '')));
        card.querySelectorAll('.ex-img').forEach(im => im.addEventListener('click', () => exZoom(im.src)));
        // điền: Enter → ô kế tiếp; hết ô thì kiểm tra
        const ins = [...card.querySelectorAll('.ex-in')];
        ins.forEach((x, i) => {
            x.addEventListener('keydown', ev => {
                if (ev.key !== 'Enter' || ev.isComposing) return;
                ev.preventDefault();
                if (ins[i + 1]) ins[i + 1].focus(); else card.querySelector('[data-act="check"]').click();
            });
            x.addEventListener('input', () => { x.classList.remove('right', 'wrong'); x.style.setProperty('--w', exW(Math.max(+x.dataset.base || 2, [...x.value].length))); });
        });
        // chọn / nối: bấm là chấm ngay
        card.querySelectorAll('.ex-it.pick').forEach(row => {
            const k = +row.dataset.k, it = e.items[k], key = e.id + ':' + k;
            const opts = e.kind === 'match' ? (e.opts || []) : (it.o || []);
            row.querySelectorAll('.ex-opt').forEach(b => b.addEventListener('click', () => {
                const oi = +b.dataset.oi;
                const good = e.kind === 'match' ? exNorm(opts[oi]) === exNorm(it.a) : oi === it.a;
                st.v[key] = oi;
                if (good) st.ok[key] = 1; else delete st.ok[key];
                row.querySelectorAll('.ex-opt').forEach(x => x.classList.remove('right', 'wrong'));
                b.classList.add(good ? 'right' : 'wrong');
                row.classList.toggle('ok', good); row.classList.toggle('bad', !good);
                row.querySelectorAll('.ex-slot').forEach(s => { s.textContent = opts[oi]; });
                row.querySelector('.ex-mark').textContent = good ? '✓' : '✗';
                if (!good) { row.classList.remove('nudge'); void row.offsetWidth; row.classList.add('nudge'); }
                exSave(st); exRefresh(box, D, st);
            }));
        });
        card.querySelectorAll('.ex-free').forEach(t => t.addEventListener('input', () => { st.v[e.id + ':' + t.closest('.ex-it').dataset.k] = t.value; exSave(st); }));
        const act = (name, fn) => { const b = card.querySelector(`[data-act="${name}"]`); if (b) b.addEventListener('click', fn); };
        act('check', () => {
            let good = 0, done = 0;
            card.querySelectorAll('.ex-it').forEach(row => {
                if (row.classList.contains('pick')) { if (row.classList.contains('ok')) { good++; done++; } else if (row.classList.contains('bad')) done++; return; }
                const k = +row.dataset.k, r = exCheckItem(e, e.items[k], k, row, st);
                if (r !== null) { done++; if (r) good++; }
            });
            exSave(st); exRefresh(box, D, st);
            if (!done) flash('Hãy điền câu trả lời trước nhé.', 'warn');
            else if (good === e.items.length) flash('🎉 Chính xác tất cả!', 'ok');
            else flash(`Đúng ${good}/${e.items.length} câu — sửa ô đỏ rồi kiểm tra lại.`, 'warn');
        });
        act('show', () => {
            card.querySelectorAll('.ex-it').forEach(row => {
                const k = +row.dataset.k, it = e.items[k];
                if (row.classList.contains('pick')) {
                    const opts = e.kind === 'match' ? (e.opts || []) : (it.o || []);
                    const ci = e.kind === 'match' ? opts.findIndex(o => exNorm(o) === exNorm(it.a)) : it.a;
                    row.querySelectorAll('.ex-opt').forEach((b, oi) => b.classList.toggle('reveal', oi === ci));
                    return;
                }
                const box2 = row.querySelector('.ex-ans');
                if (box2) { box2.hidden = false; box2.innerHTML = '💡 ' + (it.a || []).map(a => `<b class="kr">${esc(exAlts(a)[0] || '')}</b>`).join(' · '); }
            });
            flash('Đáp án hiện bên dưới mỗi câu (không tính điểm).', '');
        });
        act('reset', () => {
            e.items.forEach((it, k) => { delete st.ok[e.id + ':' + k]; delete st.v[e.id + ':' + k]; });
            exSave(st);
            card.querySelector('.ex-items').innerHTML = e.items.map((it, k) => exItemHtml(e, it, k, st)).join('');
            const clone = card.cloneNode(true);
            card.replaceWith(clone);
            bindExercise(clone, e, st, box, D);
            exRefresh(box, D, st);
        });
    }
    function exZoom(src) {
        if (!src) return;
        const o = document.createElement('div');
        o.className = 'ex-zoom';
        o.innerHTML = `<img src="${esc(src)}" alt=""><button type="button" aria-label="Đóng">✕</button>`;
        const close = () => { o.remove(); document.removeEventListener('keydown', onKey); };
        const onKey = (ev) => { if (ev.key === 'Escape') close(); };
        o.addEventListener('click', close);
        document.addEventListener('keydown', onKey);
        document.body.appendChild(o);
    }
    // ---------- Phát âm (발음): công thức · từ mẫu (thẻ lật) · luyện câu · hội thoại · luyện tập
    // pron: [{ id, title, formula, rule, examples: [{ kr, pr, vi, g: 'w'|'s'|'d' }], quiz: [{ q, qvi, options, answer, explain }] }]
    const isHangul = (c) => c >= '가' && c <= '힣';
    function hSyl(c) { const n = c.charCodeAt(0) - 0xAC00; return [Math.floor(n / 588), Math.floor((n % 588) / 28), n % 28]; }
    function sylScore(a, b) {
        if (a === b) return 3;
        const x = hSyl(a), y = hSyl(b);
        return (x[0] === y[0] && x[1] === y[1]) ? 2 : (x[1] === y[1] || x[0] === y[0]) ? 1 : 0;
    }
    // Tìm đoạn trong câu (chữ viết) ứng với phần đọc trong [ ] → [{ ki: vị trí trong kr, k, p }]
    function prAlign(kr, chunk) {
        const ks = []; [...kr].forEach((c, i) => { if (isHangul(c)) ks.push([i, c]); });
        const ps = [...chunk].filter(isHangul), L = ps.length;
        if (!L || L > ks.length) return null;
        let best = -1, at = 0;
        for (let s = 0; s + L <= ks.length; s++) {
            let sc = 0; for (let j = 0; j < L; j++) sc += sylScore(ks[s + j][1], ps[j]);
            if (sc > best) { best = sc; at = s; }
        }
        if (best < L * 1.5) return null;
        return ps.map((p, j) => ({ ki: ks[at + j][0], k: ks[at + j][1], p }));
    }
    // Tô màu những âm tiết đọc khác chữ viết, ở cả câu lẫn phần [cách đọc]
    function prMark(kr, pr) {
        const hiK = new Set();
        const parts = String(pr || '').split(/\s*…\s*/).filter(Boolean).map(ch => {
            const al = prAlign(kr, ch);
            if (!al) return esc(ch);
            const diff = new Set(); al.forEach((x, j) => { if (x.k !== x.p) { hiK.add(x.ki); diff.add(j); } });
            let j = 0, out = '';
            for (const c of ch) out += isHangul(c) ? (diff.has(j++) ? `<b class="chg">${esc(c)}</b>` : esc(c)) : esc(c);
            return out;
        });
        return { kr: [...kr].map((c, i) => hiK.has(i) ? `<b class="chg">${esc(c)}</b>` : esc(c)).join(''), pr: parts.join(' … ') };
    }
    function formulaHtml(f) {
        if (!f) return '';
        const tok = (t) => {
            if (t === '+') return '<span class="pf-op">+</span>';
            if (t === '→') return '<span class="pf-arrow">➜</span>';
            if (/^[↗↘]+$/.test(t)) return `<span class="pf-tone">${t}</span>`;
            const m = t.match(/^\[(.+)\]$/), txt = esc((m ? m[1] : t).replace(/_/g, ' '));
            return m ? `<span class="pf-chip out">[${txt}]</span>` : `<span class="pf-chip${txt.length > 3 ? ' wide' : ''}">${txt}</span>`;
        };
        return `<div class="pr-formula">${f.split(/\s*\|\s*/).map(g => `<div class="pf-row">${g.trim().split(/\s+/).map(tok).join('')}</div>`).join('')}</div>`;
    }
    function prGroup(e) { return e.g || (!/[.?!—]/.test(e.kr) && e.kr.length <= 12 ? 'w' : 's'); }
    // tiến độ luyện phát âm của bài (lưu trên máy): h = câu đã nghe, q = câu "Đọc thế nào?" đã đúng, l = số câu "Nghe & chọn" đúng nhiều nhất
    const prKey = () => `clpr_${S.cur ? S.cur.id : ''}_${S.lessonId || ''}`;
    function prLoad() { try { return Object.assign({ h: {}, q: {}, l: {} }, JSON.parse(localStorage.getItem(prKey()) || '{}')); } catch (e) { return { h: {}, q: {}, l: {} }; } }
    function prSave(st) { try { localStorage.setItem(prKey(), JSON.stringify(st)); } catch (e) { } }
    const LISTEN_N = 4;
    // "Nghe & chọn chữ viết": nghe từ (đã biến âm) rồi chọn cách VIẾT đúng; đáp án nhiễu = viết theo âm nghe được
    // (lấy từ câu "Đọc thế nào?": đáp án đúng [cách đọc] và các phương án sai, bỏ ngoặc)
    function listenPool(p) {
        const seen = new Set();
        return (p.quiz || []).map(q => {
            const t = String(q.q || '').replace(/^\(.*?\)\s*/, '').trim();
            if (!t || seen.has(t) || !(q.options || []).every(o => /^\[.*\]$/.test(o))) return null;
            const bare = q.options.map(o => o.slice(1, -1).trim());
            const cor = bare[q.answer];
            const wrong = [cor, ...bare.filter((o, i) => i !== q.answer)].filter(o => o && o.replace(/\s/g, '') !== t.replace(/\s/g, ''));
            const opts = [...new Set(wrong)].slice(0, 2);
            if (opts.length < 2) return null;
            seen.add(t);
            return { t, pr: cor, opts: [t, ...opts] };
        }).filter(Boolean);
    }
    function prStats(D, st) {
        let h = 0, ht = 0, q = 0, qt = 0, l = 0, lt = 0;
        D.forEach(p => {
            p.examples.forEach((e, ei) => { ht++; if (st.h[p.id + ':' + ei]) h++; });
            (p.quiz || []).forEach((x, qi) => { qt++; if (st.q[p.id + ':' + qi]) q++; });
            const n = Math.min(LISTEN_N, listenPool(p).length);
            if (n >= 2) { lt += n; l += Math.min(st.l[p.id] || 0, n); }
        });
        return { h, ht, q, qt, l, lt };
    }
    function prProgressHtml(D, st) {
        const s = prStats(D, st);
        const bar = (icon, label, a, b) => b ? `<div class="pp-item ${a >= b ? 'done' : ''}">
            <div class="pp-top"><span>${icon} ${label}</span><b>${a}/${b}</b></div>
            <div class="pp-bar"><i style="width:${Math.round(a / b * 100)}%"></i></div></div>` : '';
        const all = s.ht + s.qt + s.lt, got = s.h + s.q + s.l;
        return `<div class="pr-progress ${got >= all ? 'complete' : ''}">
            <div class="pp-head">${got >= all ? '🏆 Hoàn thành phần phát âm của bài!' : `📈 Tiến độ luyện phát âm · <b>${all ? Math.round(got / all * 100) : 0}%</b>`}</div>
            <div class="pp-grid">${bar('🔊', 'Đã nghe', s.h, s.ht)}${bar('🧩', 'Đọc thế nào?', s.q, s.qt)}${bar('👂', 'Nghe & chọn', s.l, s.lt)}</div>
        </div>`;
    }
    function prRefreshProgress(D, st) {
        const box = document.querySelector('#clTabBody .pr-progress');
        if (box) box.outerHTML = prProgressHtml(D, st);
        const s = prStats(D, st), tab = root.querySelector('.cl-tab[data-tab="pron"]');
        if (tab) tab.classList.toggle('done', s.h + s.q + s.l >= s.ht + s.qt + s.lt);
    }
    function readQuizHtml(p) {
        const Q = p.quiz || [];
        if (!Q.length) return '';
        return `<div class="pr-block pr-rq">
            <div class="pr-sub">🧩 Đọc thế nào? <span>Chọn cách đọc đúng</span></div>
            ${Q.map((q, qi) => `<div class="pq" data-q="${qi}">
                <div class="pq-q"><span class="kr">${esc(q.q)}</span>${q.qvi ? `<span class="qvi">${esc(q.qvi)}</span>` : ''}</div>
                <div class="pq-opts">${q.options.map((o, oi) => `<button class="pq-opt kr" data-v="${oi}">${esc(o)}</button>`).join('')}</div>
                <div class="pq-after"><b class="pq-res"></b><button class="say" data-act="sayq" title="Nghe cách đọc" aria-label="Nghe cách đọc">🔊</button>${q.explain ? `<span>💡 ${esc(q.explain)}</span>` : ''}</div>
            </div>`).join('')}
            <div class="pq-score"></div>
        </div>`;
    }
    function listenQuizHtml(p) {
        const pool = listenPool(p);
        if (pool.length < 2) return '';
        const pick = shuffleArr(pool).slice(0, Math.min(LISTEN_N, pool.length));
        return `<div class="pr-block pr-lq">
            <div class="pr-sub">👂 Nghe & chọn chữ viết <span>Nghe cách đọc rồi chọn cách <b>viết</b> đúng — đừng để tai đánh lừa!</span><button class="cl-btn sm" data-act="lqnew">🔄 Câu khác</button></div>
            ${pick.map((x, i) => `<div class="lq" data-i="${i}" data-t="${esc(x.t)}">
                    <button class="lq-play" data-act="lqplay" title="Nghe" aria-label="Nghe câu ${i + 1}">▶</button>
                    <div class="lq-main">
                        <div class="lq-opts">${shuffleArr(x.opts).map(o => `<button class="lq-opt kr" data-v="${esc(o)}">${esc(o)}</button>`).join('')}</div>
                        <div class="lq-ex">✍️ Viết <b class="kr">${esc(x.t)}</b> nhưng đọc là <b class="kr">[${esc(x.pr)}]</b></div>
                    </div>
                </div>`).join('')}
            <div class="pq-score"></div>
        </div>`;
    }
    function shuffleArr(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
    function pronCardHtml(p, pi) {
        const ex = p.examples.map((e, ei) => ({ ...e, ei, g: prGroup(e) }));
        const W = ex.filter(e => e.g === 'w'), Sn = ex.filter(e => e.g === 's'), Dl = ex.filter(e => e.g === 'd');
        const ruleLines = String(p.rule || '').split('\n').map(s => s.trim()).filter(Boolean);
        const ruleHtml = ruleLines.map(s => {
            const hangul = [...s].filter(isHangul).length;
            return `<div class="${hangul > s.length * 0.4 ? 'kr rk' : 'rv'}">${esc(s)}</div>`;
        }).join('');
        const slow = (ei) => `<button class="say slow" data-act="slow" data-k="${ei}" title="Nghe chậm" aria-label="Nghe chậm">🐢</button>`;
        let bubble = 0;
        const dlgHtml = Dl.map(e => {
            const turns = e.kr.split(/\s+—\s+/);
            const m = prMark(e.kr, e.pr);
            const mk = turns.length > 1 ? turns.map(t => esc(t)) : [m.kr];
            return turns.map((t, ti) => {
                const side = bubble++ % 2 ? 'r' : '';
                return `<div class="cl-line ${side}" data-k="${e.ei}" data-t="${esc(t)}">
                    <span class="cl-ava" style="background:${side ? '#0ea5e9' : '#f97316'}">${side ? 'B' : 'A'}</span>
                    <div class="cl-bub"><button class="say" data-act="sayt" title="Nghe" aria-label="Nghe">🔊</button>
                        <div class="ko kr">${mk[ti]}</div>
                        ${ti === turns.length - 1 && e.pr ? `<div class="prn kr">[${m.pr}]</div>` : ''}
                        ${ti === turns.length - 1 && e.vi ? `<div class="vi">${esc(e.vi)}</div>` : ''}
                    </div></div>`;
            }).join('');
        }).join('');
        return `<div class="cl-dlg cl-pron" data-p="${pi}">
            <div class="head">
                <h3>🗣 ${esc(p.title || 'Phát âm ' + (pi + 1))}</h3>
                ${ex.length ? '<button class="cl-btn pri" data-act="playall">▶ Nghe tất cả</button>' : ''}
            </div>
            ${formulaHtml(p.formula)}
            ${ruleHtml ? `<div class="pr-rule">${ruleHtml}</div>` : ''}
            ${W.length ? `<div class="pr-block"><div class="pr-sub">🔤 Từ mẫu <span>Chạm vào thẻ để lật: chữ viết ↔ cách đọc</span></div>
                <div class="pr-cards">${W.map(e => {
                    const m = prMark(e.kr, e.pr);
                    return `<div class="pr-card" data-k="${e.ei}" tabindex="0" role="button" aria-label="${esc(e.kr)}">
                        <div class="in">
                            <div class="face front"><div class="tag">Chữ viết</div><div class="ko kr">${m.kr}</div></div>
                            <div class="face back"><div class="tag">Cách đọc</div><div class="pr kr">${e.pr ? '[' + m.pr + ']' : esc(e.kr)}</div>${e.vi ? `<div class="vi">${esc(e.vi)}</div>` : ''}</div>
                        </div>${slow(e.ei)}
                    </div>`;
                }).join('')}</div></div>` : ''}
            ${Sn.length ? `<div class="pr-block"><div class="pr-sub">🗣 Luyện câu <span>Chữ tô màu là chỗ đọc khác chữ viết</span></div>
                <div class="pr-rows">${Sn.map(e => {
                    const m = prMark(e.kr, e.pr);
                    return `<div class="row" data-k="${e.ei}">
                        <div class="btns"><button class="say" data-act="say" data-k="${e.ei}" title="Nghe" aria-label="Nghe">🔊</button>${slow(e.ei)}</div>
                        <div class="txt"><div class="ko kr">${m.kr}</div>${e.pr ? `<div class="prn kr">[${m.pr}]</div>` : ''}${e.vi ? `<div class="vi">${esc(e.vi)}</div>` : ''}</div>
                    </div>`;
                }).join('')}</div></div>` : ''}
            ${Dl.length ? `<div class="pr-block"><div class="pr-sub">💬 Hội thoại <span>Đọc theo vai A – B</span></div><div class="cl-lines">${dlgHtml}</div></div>` : ''}
            ${readQuizHtml(p)}${listenQuizHtml(p)}
        </div>`;
    }
    function renderPron() {
        const D = S.lesson.pron, box = document.getElementById('clTabBody');
        if (!D.length) { box.innerHTML = '<div class="cl-empty"><div class="big">🗣</div>Bài này chưa có phần phát âm.</div>'; return; }
        const st = prLoad();
        box.innerHTML = prProgressHtml(D, st) + D.map(pronCardHtml).join('');
        prRefreshProgress(D, st);
        const heard = (p, ei) => { const k = p.id + ':' + ei; if (!st.h[k]) { st.h[k] = 1; prSave(st); prRefreshProgress(D, st); } };
        const mark = (card, el) => { card.querySelectorAll('.speaking').forEach(x => x.classList.remove('speaking')); if (el) el.classList.add('speaking'); };
        const say = (card, p, el, text, ei, rate) => {
            stopDialogue(); mark(card, el);
            if (ei != null) heard(p, ei);
            return speak(text, '', rate).then(() => el && el.classList.remove('speaking'));
        };
        box.querySelectorAll('.cl-pron').forEach(card => {
            const p = D[+card.dataset.p];
            bindReadQuiz(card, p, st, D);
            bindListenQuiz(card, p, st, D);
            card.addEventListener('click', e => {
                const act = e.target.closest('[data-act]');
                const fc = e.target.closest('.pr-card');
                if (act && act.closest('.pq, .lq, .pr-lq')) return; // trắc nghiệm tự xử lý
                if (act && act.dataset.act === 'slow') {
                    e.stopPropagation();
                    const ei = +act.dataset.k;
                    return say(card, p, act.closest('[data-k]'), p.examples[ei].kr, ei, 0.7);
                }
                if (fc && !act) {
                    fc.classList.toggle('flip');
                    const ei = +fc.dataset.k;
                    return say(card, p, fc, p.examples[ei].kr, ei);
                }
                if (!act) return;
                if (act.dataset.act === 'say') { const ei = +act.dataset.k; say(card, p, act.closest('.row'), p.examples[ei].kr, ei); }
                else if (act.dataset.act === 'sayt') { const ln = act.closest('.cl-line'); say(card, p, ln, ln.dataset.t, +ln.dataset.k); }
                else if (act.dataset.act === 'playall') playPron(card, p, act, heard);
            });
            card.addEventListener('keydown', e => {
                const fc = e.target.closest('.pr-card');
                if (fc && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); fc.click(); }
            });
        });
    }
    // Nghe lần lượt: từ mẫu → luyện câu → hội thoại (theo thứ tự hiển thị)
    async function playPron(card, p, btn, heard) {
        const label = '▶ Nghe tất cả';
        if (DLG.playing === card) { stopDialogue(); btn.textContent = label; return; }
        stopDialogue();
        DLG.playing = card;
        const my = ++DLG.token;
        btn.textContent = '⏹ Dừng';
        const els = [...card.querySelectorAll('.pr-card[data-k], .pr-rows .row[data-k], .cl-line[data-k]')];
        for (const el of els) {
            if (DLG.token !== my) break;
            const ei = +el.dataset.k;
            card.querySelectorAll('.speaking').forEach(x => x.classList.remove('speaking'));
            el.classList.add('speaking');
            if (el.classList.contains('pr-card')) el.classList.add('flip');
            el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            heard(p, ei);
            await speak(el.dataset.t || p.examples[ei].kr, '');
            el.classList.remove('speaking');
            await new Promise(r => setTimeout(r, 350));
        }
        if (DLG.token === my) stopDialogue();
        btn.textContent = label;
    }
    function bindReadQuiz(card, p, st, D) {
        const sec = card.querySelector('.pr-rq'); if (!sec) return;
        const qs = [...sec.querySelectorAll('.pq')];
        let ok = 0, done = 0;
        qs.forEach(qel => {
            const q = p.quiz[+qel.dataset.q];
            qel.addEventListener('click', e => {
                const sayq = e.target.closest('[data-act="sayq"]');
                if (sayq) {
                    // câu có ngữ cảnh "(…) câu" → chỉ đọc phần câu
                    const t = q.q.replace(/^\(.*?\)\s*/, '');
                    stopDialogue(); return speak(t, '');
                }
                const b = e.target.closest('.pq-opt'); if (!b || qel.classList.contains('answered')) return;
                const right = +b.dataset.v === q.answer;
                qel.querySelectorAll('.pq-opt').forEach(x => { if (+x.dataset.v === q.answer) x.classList.add('correct'); });
                if (!right) b.classList.add('wrong');
                qel.classList.add('answered', right ? 'ok' : 'fail'); qel.querySelector('.pq-res').textContent = right ? '✅ Đúng!' : '❌ Chưa đúng';
                done++; if (right) ok++;
                if (right) { st.q[p.id + ':' + qel.dataset.q] = 1; prSave(st); prRefreshProgress(D, st); }
                const t = q.q.replace(/^\(.*?\)\s*/, ''); stopDialogue(); speak(t, '');
                if (done >= qs.length) {
                    const sc = sec.querySelector('.pq-score');
                    sc.innerHTML = `${ok === qs.length ? '🎉' : ok * 2 >= qs.length ? '👍' : '💪'} Đúng <b>${ok}/${qs.length}</b> câu <button class="cl-btn sm" data-act="rqagain">↺ Làm lại</button>`;
                    sc.classList.add('show');
                    sc.querySelector('[data-act="rqagain"]').addEventListener('click', ev => {
                        ev.stopPropagation(); ok = 0; done = 0; sc.classList.remove('show');
                        qs.forEach(x => { x.classList.remove('answered', 'ok', 'fail'); x.querySelectorAll('.pq-opt').forEach(o => o.classList.remove('correct', 'wrong')); });
                    });
                }
            });
        });
    }
    function bindListenQuiz(card, p, st, D) {
        const sec = card.querySelector('.pr-lq'); if (!sec) return;
        const qs = [...sec.querySelectorAll('.lq')];
        let ok = 0, done = 0;
        sec.addEventListener('click', e => {
            const act = e.target.closest('[data-act]');
            if (act && act.dataset.act === 'lqnew') {
                e.stopPropagation(); stopDialogue();
                sec.outerHTML = listenQuizHtml(p);
                return bindListenQuiz(card, p, st, D);
            }
            if (act && act.dataset.act === 'lqplay') {
                const lq = act.closest('.lq');
                stopDialogue(); act.classList.add('playing');
                return speak(lq.dataset.t, '').then(() => act.classList.remove('playing'));
            }
            const b = e.target.closest('.lq-opt'); if (!b) return;
            const lq = b.closest('.lq');
            if (lq.classList.contains('answered')) return;
            if (!lq.dataset.played) {
                const play = lq.querySelector('.lq-play');
                play.classList.add('nudge'); setTimeout(() => play.classList.remove('nudge'), 700);
                return; // phải nghe trước khi chọn
            }
            const right = b.dataset.v === lq.dataset.t;
            lq.querySelectorAll('.lq-opt').forEach(x => { if (x.dataset.v === lq.dataset.t) x.classList.add('correct'); });
            if (!right) b.classList.add('wrong');
            lq.classList.add('answered');
            done++; if (right) ok++;
            if (ok > (st.l[p.id] || 0)) { st.l[p.id] = ok; prSave(st); prRefreshProgress(D, st); }
            if (done >= qs.length) {
                const sc = sec.querySelector('.pq-score');
                sc.innerHTML = `${ok === qs.length ? '🎉' : ok * 2 >= qs.length ? '👍' : '💪'} Nghe đúng <b>${ok}/${qs.length}</b> câu`;
                sc.classList.add('show');
            }
        });
        qs.forEach(lq => lq.querySelector('.lq-play').addEventListener('click', () => { lq.dataset.played = '1'; }));
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
            if (window.CurriculumAccess) window.CurriculumAccess.reset();
            const m = document.getElementById('authModal');
            if (user && m) m.style.display = 'none';
            if (PAGE === 'lesson') renderLessonPage(); else renderIndex();
        });
    }
    // Nhúng tab Hội thoại / Nghe của một bài giáo trình vào trang khác (vocab.html — bài trong lớp).
    // box: phần tử chứa; lesson: doc bài giáo trình; opts: { tab: 'dialogues'|'listening', media, credits }
    function mount(box, lesson, opts) {
        opts = opts || {};
        stopDialogue(); closePop();
        const old = document.getElementById('clTabBody');
        if (old && old !== box) old.removeAttribute('id');
        box.id = 'clTabBody';
        lesson = Object.assign({}, lesson);
        lesson.words = (lesson.words || []).filter(w => w && w.word);
        lesson.grammar = lesson.grammar || [];
        lesson.dialogues = (lesson.dialogues || []).filter(d => d && (d.lines || []).length);
        lesson.listening = (lesson.listening || []).filter(d => d && ((d.lines || []).length || (d.questions || []).length));
        lesson.listening.forEach(d => { d.lines = d.lines || []; d.questions = d.questions || []; });
        S.lesson = lesson;
        S.media = opts.media || {};
        S.credits = opts.credits || {};
        S.tab = opts.tab === 'listening' ? 'listening' : 'dialogues';
        if (S.tab === 'listening') renderListening(); else renderDialogues();
        applyMedia(box);
    }
    function unmount() { stopDialogue(); closePop(); }
    window.CurriculumLearn = { mount, unmount, speak, _vocabKeys: vocabKeys, _highlight: highlight, _state: S };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
