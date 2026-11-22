/* ==========================================================================
   BÀI TRONG LỚP ↔ GIÁO TRÌNH GỐC — vocab.html (mục Giáo trình)
   --------------------------------------------------------------------------
   Bài học của lớp được gán từ Kho giáo trình (shared_folders/{id}.curLinks[curId].lessons[lid].name
   = tên bài trong lớp) được bổ sung từ bài giáo trình gốc:
     - tab 💬 Hội thoại và 🎧 Nghe (vẽ bằng CurriculumLearn.mount — curriculum-learn.js)
     - ảnh minh họa của từ (curricula/{curId}/media) + nút chuyển 🖼 Ảnh / ☰ Tối giản ở tab Từ vựng
   Bấm vào thẻ ảnh mở flashcard của Sổ từ (openWordFlashcard).
   Bài giáo viên tự soạn trong lớp (không có liên kết) giữ nguyên như cũ.
   Học viên đọc được giáo trình gốc nhờ thẻ đọc (curriculum-access.js + firestore.rules).
   ========================================================================== */
(function () {
    'use strict';

    const db = () => firebase.firestore();
    const VIEW_KEY = 'vhtClassVocabView';      // 'pic' | 'list'
    const ST = { key: null, cid: null, lid: null, lesson: null, media: {}, credits: {}, tab: 'vocab' };

    const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    function viewMode() { try { return localStorage.getItem(VIEW_KEY) || 'pic'; } catch (e) { return 'pic'; } }
    function setViewMode(v) { try { localStorage.setItem(VIEW_KEY, v); } catch (e) { } }

    // ------------------------------------------------------------------ giao diện chèn thêm
    function injectStyles() {
        if (document.getElementById('ccStyles')) return;
        const st = document.createElement('style');
        st.id = 'ccStyles';
        st.textContent = `
            #ccViewToggle { display:none; gap:6px; margin:10px 0 12px; flex-wrap:wrap; align-items:center; }
            #ccViewToggle.on { display:flex; }
            #ccViewToggle button { border:1px solid rgba(148,163,184,.55); background:rgba(255,255,255,.7); color:inherit; border-radius:999px; padding:6px 14px; font-weight:700; font-size:.85em; cursor:pointer; }
            #ccViewToggle button.on { background:#4f46e5; color:#fff; border-color:#4f46e5; }
            #ccViewToggle .hint { font-size:.8em; color:#64748b; }
            body.dark-mode #ccViewToggle button { background:rgba(30,41,59,.7); }
            body.dark-mode #ccViewToggle button.on { background:#6366f1; }
            #vocabGridDetail.cc-pic { display:grid; grid-template-columns:repeat(auto-fill,minmax(190px,1fr)); gap:12px; }
            #vocabGridDetail.cc-pic .cl-vcard { padding:12px 12px 10px; }
            #vocabGridDetail.cc-pic .cl-vcard .pic { height:120px; }
            #vocabGridDetail.cc-pic .cl-vcard .noimg { height:120px; border-radius:12px; margin-bottom:10px; display:flex; align-items:center; justify-content:center; font-size:2.2em; font-weight:800; color:#a5b4fc; background:linear-gradient(135deg,#eef2ff,#e0f2fe); }
            body.dark-mode #vocabGridDetail.cc-pic .cl-vcard .noimg { background:linear-gradient(135deg,#1e1b4b,#0c4a6e); color:#818cf8; }
            #vocabGridDetail.cc-pic .cl-vcard .v-status-dot { position:absolute; left:12px; bottom:10px; margin:0; }
            #vocabGridDetail.cc-pic .cl-vcard .m { padding-bottom:6px; }
            #ccCurContent { display:none; }
            #ccCurContent.on { display:block; }
        `;
        document.head.appendChild(st);
    }
    function ensureUi() {
        injectStyles();
        const tabs = document.getElementById('lessonSubTabs');
        if (tabs && !document.getElementById('tabLessonDialogueBtn')) {
            tabs.insertAdjacentHTML('beforeend',
                `<button class="tab-btn-flat" id="tabLessonDialogueBtn" style="display:none" onclick="switchLessonSubTab('dialogue')">💬 Hội thoại (<span id="tabDialogueBadge">0</span>)</button>
                 <button class="tab-btn-flat" id="tabLessonListeningBtn" style="display:none" onclick="switchLessonSubTab('listening')">🎧 Nghe (<span id="tabListeningBadge">0</span>)</button>`);
        }
        const ex = document.getElementById('exerciseSubTabContent');
        if (ex && !document.getElementById('ccCurContent')) {
            ex.insertAdjacentHTML('afterend', '<div id="ccCurContent"><div class="cc-cur-box"></div></div>');
        }
        const title = document.getElementById('vocabDetailSectionTitle');
        if (title && !document.getElementById('ccViewToggle')) {
            title.insertAdjacentHTML('afterend',
                `<div id="ccViewToggle"><button type="button" data-v="pic">🖼 Xem ảnh</button><button type="button" data-v="list">☰ Tối giản</button>
                 <span class="hint">Bấm vào thẻ để mở flashcard</span></div>`);
            document.getElementById('ccViewToggle').addEventListener('click', e => {
                const b = e.target.closest('[data-v]'); if (!b) return;
                setViewMode(b.dataset.v);
                syncToggle();
                window.renderVocabGridDetail();
            });
        }
    }
    function syncToggle() {
        const t = document.getElementById('ccViewToggle'); if (!t) return;
        t.classList.toggle('on', hasWordImages());
        t.querySelectorAll('[data-v]').forEach(b => b.classList.toggle('on', b.dataset.v === viewMode()));
    }
    function countOf(kind) {
        const L = ST.lesson || {};
        if (kind === 'dialogue') return (L.dialogues || []).filter(d => d && (d.lines || []).length).length;
        return (L.listening || []).filter(d => d && ((d.lines || []).length || (d.questions || []).length)).length;
    }
    function syncTabs() {
        const tabs = document.getElementById('lessonSubTabs'); if (!tabs) return;
        const nd = countOf('dialogue'), nl = countOf('listening');
        const dB = document.getElementById('tabLessonDialogueBtn'), lB = document.getElementById('tabLessonListeningBtn');
        if (dB) { dB.style.display = nd ? '' : 'none'; document.getElementById('tabDialogueBadge').textContent = nd; }
        if (lB) { lB.style.display = nl ? '' : 'none'; document.getElementById('tabListeningBadge').textContent = nl; }
        const visible = [...tabs.children].filter(b => b.style.display !== 'none').length;
        tabs.style.gridTemplateColumns = `repeat(${Math.max(visible, 1)}, minmax(0, 1fr))`;
    }
    function resetUi() {
        ST.cid = ST.lid = null; ST.lesson = null; ST.media = {}; ST.credits = {};
        hideCurContent();
        syncTabs(); syncToggle();
        const grid = document.getElementById('vocabGridDetail');
        if (grid) grid.classList.remove('cc-pic');
    }
    function hideCurContent() {
        const c = document.getElementById('ccCurContent');
        if (c) c.classList.remove('on');
        ['tabLessonDialogueBtn', 'tabLessonListeningBtn'].forEach(id => { const b = document.getElementById(id); if (b) b.classList.remove('active'); });
        if (window.CurriculumLearn && window.CurriculumLearn.unmount) window.CurriculumLearn.unmount();
    }

    // ------------------------------------------------------------------ dữ liệu
    async function findLink(folderId, lessonName) {
        const f = await db().collection('shared_folders').doc(folderId).get();
        const links = (f.exists && f.data().curLinks) || {};
        for (const [cid, l] of Object.entries(links)) {
            for (const [lid, e] of Object.entries((l && l.lessons) || {})) {
                if (e && e.name === lessonName) return { cid, lid };
            }
        }
        // Giáo viên đổi tên bài trong lớp → dò theo nguồn của từ vựng
        const w = (window.currentSharedWords || []).find(x => x.src && x.src.c && x.src.l && links[x.src.c]);
        return w ? { cid: w.src.c, lid: w.src.l } : null;
    }
    async function load(folderId, lessonName) {
        const key = folderId + '|' + lessonName;
        ST.key = key;
        ensureUi();
        resetUi();
        try {
            let link = await findLink(folderId, lessonName);
            if (!link) { // từ vựng có thể chưa về kịp → thử lại một lần
                await new Promise(r => setTimeout(r, 1200));
                if (ST.key !== key) return;
                link = await findLink(folderId, lessonName);
            }
            if (!link || ST.key !== key) return;
            const user = firebase.auth().currentUser;
            const cref = db().collection('curricula').doc(link.cid);
            const d = await window.CurriculumAccess.getWithAccess(user, link.cid, cref.collection('lessons').doc(link.lid));
            if (!d.exists || ST.key !== key) return;
            ST.cid = link.cid; ST.lid = link.lid; ST.lesson = d.data();
            syncTabs();
            const ms = await cref.collection('media').where('lesson', '==', link.lid).get().catch(() => null);
            if (ST.key !== key) return;
            if (ms) ms.docs.forEach(x => { Object.assign(ST.media, x.data().items || {}); Object.assign(ST.credits, x.data().credits || {}); });
            syncToggle();
            if (typeof window.renderVocabGridDetail === 'function') window.renderVocabGridDetail();
        } catch (err) {
            console.warn('Không tải được nội dung giáo trình của bài:', err && err.message);
        }
    }
    function imageOf(w) {
        const k = (w.src && w.src.w) || w.id;
        return ST.media[k] || ST.media[w.id] || '';
    }
    function hasWordImages() {
        return !!ST.lesson && (window.currentSharedWords || []).some(w => imageOf(w));
    }
    function creditOf(w) {
        const k = (w.src && w.src.w) || w.id;
        return ST.credits[k] || ST.credits[w.id] || null;
    }

    // ------------------------------------------------------------------ tab Từ vựng dạng ảnh
    function renderPicGrid() {
        const grid = document.getElementById('vocabGridDetail');
        if (!grid) return;
        const on = !!window.currentSharedFolderId && !!window.currentSharedLesson && hasWordImages() && viewMode() === 'pic';
        grid.classList.toggle('cc-pic', on);
        if (!on) return;
        const byId = new Map((window.currentSharedWords || []).map(w => [String(w.id), w]));
        const ids = [...grid.querySelectorAll('.v-card[data-id]')].map(c => c.getAttribute('data-id'));   // giữ đúng bộ lọc trạng thái
        const colors = ['bg-moi', 'bg-hoc', 'bg-on', 'bg-thanh'];
        const html = ids.map((id, i) => {
            const w = byId.get(String(id)); if (!w) return '';
            const img = imageOf(w), cr = creditOf(w);
            return `<div class="cl-vcard cc-pcard${img ? ' has-img' : ''}" data-id="${esc(w.id)}" onclick="openWordFlashcard('${esc(w.id)}')" title="Bấm để mở flashcard">
                ${img ? `<img class="pic" src="${esc(img)}" alt="" loading="lazy"${cr ? ` title="${esc(cr.t)}"` : ''}>` : `<div class="noimg kr">${esc(String(w.word || '').slice(0, 1))}</div>`}
                <div class="top"><div class="w kr">${esc(w.word)}</div></div>
                <div class="m">${esc(w.meaning)}</div>
                <div class="v-status-dot ${colors[w.status || 0]}" onclick="event.stopPropagation();cycleWordStatus('${esc(w.id)}',${w.status || 0})" title="Chu kỳ: Mới → Đang học → Đang ôn → Thành thạo"></div>
                <span class="num">${i + 1}</span>
            </div>`;
        }).join('');
        if (html) grid.innerHTML = html;
    }

    // ------------------------------------------------------------------ móc vào shared-vocab.js / mypage-vocab.js
    function hook() {
        const openLesson = window.openSharedLesson;
        if (typeof openLesson === 'function' && !openLesson._cc) {
            window.openSharedLesson = function (folderId, lessonName) {
                const r = openLesson.apply(this, arguments);
                load(folderId, lessonName);
                return r;
            };
            window.openSharedLesson._cc = true;
        }
        const sw = window.switchLessonSubTab;
        if (typeof sw === 'function' && !sw._cc) {
            window.switchLessonSubTab = function (tab) {
                if ((tab === 'dialogue' || tab === 'listening') && ST.lesson) {
                    sw.call(this, 'vocab');
                    ['tabLessonVocabBtn', 'tabLessonGrammarBtn', 'tabLessonExerciseBtn'].forEach(id => { const b = document.getElementById(id); if (b) b.classList.remove('active'); });
                    ['vocabSubTabContent', 'grammarSubTabContent', 'exerciseSubTabContent'].forEach(id => { const c = document.getElementById(id); if (c) c.style.display = 'none'; });
                    const fab = document.getElementById('fabContainer'); if (fab) fab.style.display = 'none';
                    const dB = document.getElementById('tabLessonDialogueBtn'), lB = document.getElementById('tabLessonListeningBtn');
                    if (dB) dB.classList.toggle('active', tab === 'dialogue');
                    if (lB) lB.classList.toggle('active', tab === 'listening');
                    const c = document.getElementById('ccCurContent'); c.classList.add('on');
                    // mount() đặt id="clTabBody" cho hộp chứa → tìm hộp theo vị trí, không theo id
                    window.CurriculumLearn.mount(c.firstElementChild, ST.lesson,
                        { tab: tab === 'listening' ? 'listening' : 'dialogues', media: ST.media, credits: ST.credits });
                    ST.tab = tab;
                    return;
                }
                hideCurContent();
                ST.tab = tab;
                return sw.apply(this, arguments);
            };
            window.switchLessonSubTab._cc = true;
        }
        const render = window.renderVocabGridDetail;
        if (typeof render === 'function' && !render._cc) {
            window.renderVocabGridDetail = function () {
                const r = render.apply(this, arguments);
                try { renderPicGrid(); } catch (e) { console.warn(e); }
                return r;
            };
            window.renderVocabGridDetail._cc = true;
        }
        const back = window.backToSets;
        if (typeof back === 'function' && !back._cc) {
            window.backToSets = function () {
                if (window.currentSharedLesson) { ST.key = null; resetUi(); }
                return back.apply(this, arguments);
            };
            window.backToSets._cc = true;
        }
    }
    hook();
    window.ClassCurriculum = { _state: ST, _load: load, _hook: hook };
})();
