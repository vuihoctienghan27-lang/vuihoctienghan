/* ==========================================================================
   KHO GIÁO TRÌNH → SỔ TỪ CÁ NHÂN (Giai đoạn 3) — vocab.html, mọi học viên
   --------------------------------------------------------------------------
   Học viên chọn giáo trình đã được gán cho lớp mình (curriculum-access.js) và các bài được giao,
   từ vựng được chép vào users/{uid}/vocabulary thành:
       Thư mục  = tên giáo trình (vocabLists)
       Bài học  = "01. Tên bài"  (đánh số để giữ đúng thứ tự khi sắp xếp)
   Mỗi từ có ID cố định "cv_{curId}_{wordId}" và src: { c, l, w }, nên bấm
   "Cập nhật" lần sau sẽ: thêm từ/bài mới, sửa nghĩa đã đổi, bỏ từ giáo trình đã bỏ
   — và GIỮ NGUYÊN trạng thái ghi nhớ (status) cùng vị trí bài nếu học viên đã đổi tên/chuyển bài.
   Sổ từ cá nhân chỉ có từ vựng; ngữ pháp sẽ xem ở chế độ "Học theo giáo trình".
   ========================================================================== */
(function () {
    'use strict';

    const db = () => firebase.firestore();
    const FV = () => firebase.firestore.FieldValue;
    const uid = () => window.currentUserUid || ((firebase.auth().currentUser || {}).uid);
    const vocabCol = () => db().collection('users').doc(uid()).collection('vocabulary');
    const LEVELS = {
        socap1: 'Sơ cấp 1', socap2: 'Sơ cấp 2', trungcap3: 'Trung cấp 3', trungcap4: 'Trung cấp 4',
        caocap5: 'Cao cấp 5', caocap6: 'Cao cấp 6', topik1: 'TOPIK I', topik2: 'TOPIK II', other: ''
    };

    function esc(s) {
        return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    }
    const norm = (v) => String(v == null ? '' : v).trim();
    const safePart = (s) => norm(s).replace(/\//g, '-');
    const pad = (n) => String(n).padStart(2, '0');
    const wordDocId = (curId, wid) => ('cv_' + curId + '_' + wid).replace(/[\/\s]/g, '_');
    function loading(t) { Swal.fire({ title: t || 'Đang tải…', allowOutsideClick: false, didOpen: () => Swal.showLoading() }); }
    function fail(err) { console.error(err); Swal.fire('Lỗi', (err && err.message) || String(err), 'error'); }
    async function commitInChunks(ops) {
        for (let i = 0; i < ops.length; i += 400) {
            const b = db().batch();
            ops.slice(i, i + 400).forEach(fn => fn(b));
            await b.commit();
        }
    }

    function injectStyles() {
        if (document.getElementById('cpersStyles')) return;
        const st = document.createElement('style');
        st.id = 'cpersStyles';
        st.textContent = `
            .cpers { text-align:left; font-size:.92em; }
            .cpers .cur { display:flex; gap:12px; align-items:center; border:1px solid rgba(148,163,184,.45); border-radius:12px; padding:12px; margin-bottom:8px; cursor:pointer; }
            .cpers .cur:hover { border-color:#6366f1; background:rgba(99,102,241,.06); }
            .cpers .cur .ic { font-size:1.8em; line-height:1; }
            .cpers .cur .t { font-weight:700; }
            .cpers .muted { color:#64748b; font-size:.86em; line-height:1.5; }
            .cpers .pill { display:inline-block; font-size:.76em; font-weight:700; padding:2px 8px; border-radius:999px; background:rgba(99,102,241,.12); color:#4f46e5; margin-left:4px; }
            .cpers .pill.ok { background:rgba(16,185,129,.14); color:#059669; }
            .cpers .list { max-height:42vh; overflow:auto; border:1px solid rgba(148,163,184,.45); border-radius:10px; padding:4px 0; }
            .cpers .list label { display:flex; gap:8px; align-items:center; padding:6px 10px; cursor:pointer; }
            .cpers .list input { width:auto; margin:0; }
            .cpers .list .c { margin-left:auto; color:#64748b; font-size:.82em; white-space:nowrap; }
            .cpers .lbl { display:block; font-weight:700; font-size:.85em; color:#475569; margin:10px 0 4px; }
            .cpers input[type=text] { width:100%; box-sizing:border-box; padding:8px 10px; border-radius:8px; border:1px solid rgba(148,163,184,.6); font:inherit; background:transparent; color:inherit; }
            .cpers .b { border:1px solid rgba(148,163,184,.5); background:transparent; color:inherit; border-radius:8px; padding:5px 10px; font-weight:600; cursor:pointer; font-size:.88em; }
        `;
        document.head.appendChild(st);
    }

    // Giáo trình được gán cho lớp của học viên (admin: tất cả) — xem curriculum-access.js
    async function listVisibleCurricula() {
        const user = firebase.auth().currentUser;
        const list = await window.CurriculumAccess.listCurricula(user);
        const units = (c) => c.allowed ? (c.units || []).filter(u => c.allowed.has(u.id)) : (c.units || []);
        return list.filter(c => units(c).length).map(c => ({ ...c, units: units(c), allUnits: c.units || [] }))
            .sort((a, b) => (a.order ?? 999) - (b.order ?? 999) || String(a.title).localeCompare(String(b.title), 'vi'));
    }

    function myVocab() { return Array.isArray(window._allVocabData) ? window._allVocabData : []; }
    function addedLessonIds(curId) {
        const s = new Set();
        myVocab().forEach(w => { if (w.src && w.src.c === curId && w.src.l) s.add(w.src.l); });
        return s;
    }

    // ------------------------------------------------------------------ thêm / cập nhật
    async function addToNotebook(cur, lessonIds, folderName) {
        const folder = safePart(folderName) || safePart(cur.title) || 'Giáo trình';
        const units = cur.allUnits || cur.units || []; // đánh số theo vị trí trong cả giáo trình
        const lessonsSnap = await Promise.all(lessonIds.map(id => db().collection('curricula').doc(cur.id).collection('lessons').doc(id).get()));
        const lessons = new Map(lessonsSnap.filter(d => d.exists).map(d => [d.id, d.data()]));

        // Đọc thẳng Firestore (không dựa vào cache giao diện) để biết từ nào đã có
        const existingSnap = await vocabCol().where('src.c', '==', cur.id).get();
        const existing = new Map(existingSnap.docs.map(d => [d.id, d.data()]));
        const ops = [];
        let added = 0, updated = 0, removed = 0, nLessons = 0;

        lessonIds.forEach(lid => {
            const L = lessons.get(lid);
            if (!L) return;
            const idx = units.findIndex(u => u.id === lid);
            // Bài đã thêm trước đó → giữ tên/vị trí học viên đang dùng
            const prev = [...existing.values()].find(w => w.src && w.src.l === lid && w.listName);
            const listName = prev ? prev.listName : `${folder}/${pad(idx + 1)}. ${safePart(L.title) || 'Bài'}`;
            const keep = new Set();
            let any = false;
            (L.words || []).forEach((cw, i) => {
                if (!norm(cw.word) || !cw.id) return;
                const id = wordDocId(cur.id, cw.id);
                keep.add(id); any = true;
                const base = {
                    word: norm(cw.word), meaning: norm(cw.meaning), ex_kr: norm(cw.ex_kr), ex_vn: norm(cw.ex_vn),
                    definition: norm(cw.definition), order: i, src: { c: cur.id, l: lid, w: cw.id }
                };
                const old = existing.get(id);
                if (old) {
                    const changed = ['word', 'meaning', 'ex_kr', 'ex_vn', 'definition'].some(f => norm(old[f]) !== base[f]) || old.order !== i;
                    if (changed) { updated++; ops.push(b => b.update(vocabCol().doc(id), base)); }
                } else {
                    added++;
                    ops.push(b => b.set(vocabCol().doc(id), { ...base, listName, status: 0, savedAt: FV().serverTimestamp() }));
                }
            });
            // Từ giáo trình đã bỏ khỏi bài này
            existing.forEach((w, id) => {
                if (w.src && w.src.l === lid && !keep.has(id)) { removed++; ops.push(b => b.delete(vocabCol().doc(id))); }
            });
            if (any) nLessons++;
        });

        if (!prevFolderExists(folder)) {
            await db().collection('users').doc(uid()).set({ vocabLists: FV().arrayUnion(folder) }, { merge: true });
        }
        await commitInChunks(ops);
        return { folder, lessons: nLessons, added, updated, removed };
    }
    function prevFolderExists(folder) {
        return Array.isArray(window.userVocabLists) && window.userVocabLists.includes(folder);
    }

    // ------------------------------------------------------------------ giao diện
    async function openPicker() {
        if (!uid()) return Swal.fire('Cần đăng nhập', 'Vui lòng đăng nhập để thêm giáo trình vào Sổ từ.', 'info');
        injectStyles();
        let list;
        try { loading('Đang tải Kho giáo trình…'); list = await listVisibleCurricula(); Swal.close(); } catch (err) { return fail(err); }
        if (!list.length) return Swal.fire({ icon: 'info', title: 'Chưa có giáo trình', text: 'Lớp của bạn chưa được giao giáo trình nào.' });

        let picked = null;
        await Swal.fire({
            title: '📚 Thêm giáo trình vào Sổ từ', width: 'min(600px, 96vw)', showConfirmButton: false, showCloseButton: true,
            html: `<div class="cpers">
                <div class="muted" style="margin-bottom:10px">Chọn giáo trình bạn đang học — từ vựng từng bài sẽ được thêm vào Sổ từ để ôn bằng flashcard & minigame.</div>
                ${list.map(c => {
                    const total = (c.units || []).length, words = (c.units || []).reduce((n, u) => n + (u.wordCount || 0), 0);
                    const done = addedLessonIds(c.id).size;
                    return `<div class="cur" data-id="${esc(c.id)}">
                        <span class="ic">${esc(c.icon || '📘')}</span>
                        <div style="flex:1;min-width:0"><div class="t">${esc(c.title)}
                            ${LEVELS[c.level] ? `<span class="pill">${esc(LEVELS[c.level])}</span>` : ''}
                            ${done ? `<span class="pill ok">Đã thêm ${done}/${total} bài</span>` : ''}</div>
                            <div class="muted">${total} bài · ${words} từ vựng${c.description ? ' · ' + esc(c.description) : ''}</div></div>
                        <span class="b">${done ? 'Cập nhật' : 'Chọn'}</span></div>`;
                }).join('')}
            </div>`,
            didOpen: (p) => p.querySelectorAll('.cur').forEach(el => el.addEventListener('click', () => {
                picked = list.find(c => c.id === el.dataset.id); Swal.close();
            }))
        });
        if (picked) lessonDialog(picked);
    }

    async function lessonDialog(cur) {
        injectStyles();
        const done = addedLessonIds(cur.id);
        // chỉ các bài được giao; số thứ tự theo vị trí trong cả giáo trình
        const all = cur.allUnits || cur.units || [];
        const units = cur.allowed ? (cur.units || []).filter(u => cur.allowed.has(u.id)) : (cur.units || []);
        const prevFolder = (myVocab().find(w => w.src && w.src.c === cur.id && w.listName) || {}).listName;
        const folderDefault = prevFolder ? prevFolder.split('/')[0] : safePart(cur.title);
        let stage = null;
        const rows = units.map((u, i) => {
            const head = u.stage && u.stage !== stage ? `<div class="muted" style="padding:6px 10px 2px;font-weight:700">${esc(stage = u.stage)}</div>` : '';
            return head + `<label><input type="checkbox" data-id="${esc(u.id)}" ${done.size ? (done.has(u.id) ? 'checked' : '') : 'checked'}>
                <span>${pad(all.indexOf(u) + 1)}. ${esc(u.title)}</span>
                <span class="c">${done.has(u.id) ? '✓ đã thêm · ' : ''}${u.wordCount || 0} từ</span></label>`;
        }).join('');
        const { value } = await Swal.fire({
            title: esc(cur.icon || '📘') + ' ' + esc(cur.title), width: 'min(600px, 96vw)',
            html: `<div class="cpers">
                <span class="lbl">Chọn bài</span>
                <div style="display:flex;gap:6px;margin-bottom:6px"><button type="button" class="b" id="cpAll">Chọn tất cả</button><button type="button" class="b" id="cpNone">Bỏ chọn</button></div>
                <div class="list" id="cpList">${rows}</div>
                <span class="lbl">Thêm vào thư mục</span>
                <input type="text" id="cpFolder" value="${esc(folderDefault)}" ${prevFolder ? 'disabled' : ''}>
                <div class="muted" style="margin-top:8px">${done.size
                    ? 'Bài đã thêm sẽ được <b>cập nhật</b> theo giáo trình mới nhất — trạng thái ghi nhớ của bạn được giữ nguyên.'
                    : 'Mỗi bài thành một Bài học trong thư mục này. Thêm lại lần sau sẽ cập nhật mà không mất tiến độ.'}</div>
            </div>`,
            showCancelButton: true, confirmButtonText: done.size ? 'Thêm / Cập nhật' : 'Thêm vào Sổ từ', cancelButtonText: 'Hủy',
            confirmButtonColor: '#4f46e5', focusConfirm: false,
            didOpen: () => {
                const set = v => document.querySelectorAll('#cpList input').forEach(x => { x.checked = v; });
                document.getElementById('cpAll').onclick = () => set(true);
                document.getElementById('cpNone').onclick = () => set(false);
            },
            preConfirm: () => {
                const ids = [...document.querySelectorAll('#cpList input:checked')].map(x => x.dataset.id);
                const folder = safePart(document.getElementById('cpFolder').value);
                if (!ids.length) { Swal.showValidationMessage('Chọn ít nhất một bài'); return false; }
                if (!folder) { Swal.showValidationMessage('Nhập tên thư mục'); return false; }
                if (folder === 'Daily Vocab') { Swal.showValidationMessage('Không dùng được thư mục Daily Vocab'); return false; }
                return { ids, folder };
            }
        });
        if (!value) return;
        try {
            loading('Đang thêm vào Sổ từ…');
            const r = await addToNotebook(cur, value.ids, value.folder);
            const parts = [];
            if (r.added) parts.push(`<b>${r.added}</b> từ mới`);
            if (r.updated) parts.push(`<b>${r.updated}</b> từ được cập nhật`);
            if (r.removed) parts.push(`<b>${r.removed}</b> từ đã bỏ`);
            Swal.fire({
                icon: 'success', title: parts.length ? 'Đã thêm vào Sổ từ!' : 'Sổ từ đã khớp với giáo trình',
                html: (parts.length ? parts.join(' · ') + '<br>' : '') + `📁 Thư mục <b>${esc(r.folder)}</b> — ${r.lessons} bài`,
                confirmButtonText: 'Mở thư mục', showCancelButton: true, cancelButtonText: 'Đóng', confirmButtonColor: '#4f46e5'
            }).then(res => {
                if (!res.isConfirmed) return;
                if (typeof window.switchVocabTab === 'function') window.switchVocabTab('folders');
                if (typeof window.openFolder === 'function') setTimeout(() => window.openFolder(r.folder), 300);
            });
        } catch (err) { fail(err); }
    }

    window.CurriculumPersonal = { openPicker, lessonDialog, _addToNotebook: addToNotebook, _listVisibleCurricula: listVisibleCurricula };
})();
