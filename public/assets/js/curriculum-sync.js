/* ==========================================================================
   KHO GIÁO TRÌNH ↔ LỚP 1:1 (Giai đoạn 2) — dùng trong vocab.html cho giáo viên
   --------------------------------------------------------------------------
   - Nhập bài từ Kho giáo trình (curricula) vào thư mục lớp (shared_folders)
   - Tạo lớp mới từ cả giáo trình
   - Đồng bộ: kéo phần giáo trình đã sửa về lớp (thêm / sửa / bỏ từ & ngữ pháp)
   - Liên kết lại lớp đã được "Chuyển thành giáo trình" ở Giai đoạn 1

   Lớp lưu liên kết trong shared_folders/{id}.curLinks:
     { [curId]: { title, lessons: { [lessonId]: {
         name,      // tên bài trong lớp (listName)
         v,         // version bài giáo trình ở lần nhập/đồng bộ gần nhất
         w: { [curWordId]: classWordDocId },
         g: { [curGrammarId]: classGrammarDocId } } } } }
   Từ/ngữ pháp nhập vào lớp mang thêm src: { c, l, w|g }.
   Từ giáo viên tự thêm trong lớp (không có trong w) không bao giờ bị đụng tới.
   Từ đã nhập mà giáo viên xóa khỏi lớp thì đồng bộ không thêm lại.
   ID từ giữ nguyên theo giáo trình → tiến độ học viên (theo wordId) không mất.
   ========================================================================== */
(function () {
    'use strict';

    const TEACHER_EMAIL = 'vuihoctienghan27@gmail.com'; // khớp shared-vocab.js (giáo viên sở hữu lớp)
    const WORD_FIELDS = ['word', 'meaning', 'ex_kr', 'ex_vn', 'definition'];
    const GRAMMAR_FIELDS = ['title', 'contentHtml'];

    const db = () => firebase.firestore();
    const FV = () => firebase.firestore.FieldValue;
    const folderRef = (id) => db().collection('shared_folders').doc(id);
    const isTeacher = () => typeof window.isTeacherAdmin === 'function' && window.isTeacherAdmin();

    // ------------------------------------------------------------------ helpers
    function esc(s) {
        return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    }
    const clone = (o) => JSON.parse(JSON.stringify(o || {}));
    const rand = () => Math.random().toString(36).slice(2, 7);
    const norm = (v) => String(v == null ? '' : v).trim();
    function loading(text) { Swal.fire({ title: text || 'Đang xử lý…', allowOutsideClick: false, didOpen: () => Swal.showLoading() }); }
    function fail(err) { console.error(err); Swal.fire('Lỗi', (err && err.message) || String(err), 'error'); }
    async function commitInChunks(ops) {
        for (let i = 0; i < ops.length; i += 400) {
            const b = db().batch();
            ops.slice(i, i + 400).forEach(fn => fn(b));
            await b.commit();
        }
    }
    // Tên bài trong lớp: "Giai đoạn/Tên bài" — dấu "/" trong tên sẽ làm hỏng cách tách giai đoạn
    const safePart = (s) => norm(s).replace(/\//g, '-');

    function injectStyles() {
        if (document.getElementById('csyncStyles')) return;
        const st = document.createElement('style');
        st.id = 'csyncStyles';
        st.textContent = `
            .csync { text-align:left; font-size:.92em; }
            .csync .card { border:1px solid rgba(148,163,184,.4); border-radius:12px; padding:12px 14px; margin-bottom:10px; }
            .csync .card h4 { margin:0 0 4px; font-size:1.02em; }
            .csync .muted { color:#64748b; font-size:.88em; line-height:1.5; }
            .csync .row { display:flex; gap:6px; flex-wrap:wrap; margin-top:8px; }
            .csync .b { border:1px solid rgba(148,163,184,.5); background:transparent; color:inherit; border-radius:8px; padding:6px 11px; font-weight:600; cursor:pointer; font-size:.9em; }
            .csync .b:hover { border-color:#6366f1; }
            .csync .b.pri { background:#4f46e5; border-color:#4f46e5; color:#fff; }
            .csync .b.warn { background:#f59e0b; border-color:#f59e0b; color:#fff; }
            .csync .b.dan { color:#dc2626; }
            .csync .pill { display:inline-block; font-size:.78em; font-weight:700; padding:2px 8px; border-radius:999px; background:rgba(99,102,241,.12); color:#4f46e5; }
            .csync .pill.ok { background:rgba(16,185,129,.14); color:#059669; }
            .csync .pill.chg { background:rgba(245,158,11,.16); color:#b45309; }
            .csync .pill.bad { background:rgba(220,38,38,.12); color:#dc2626; }
            .csync .list { max-height:45vh; overflow:auto; border:1px solid rgba(148,163,184,.4); border-radius:10px; padding:4px 0; }
            .csync .list label { display:flex; gap:8px; align-items:center; padding:6px 10px; cursor:pointer; }
            .csync .list label.dis { opacity:.55; cursor:default; }
            .csync .list input { width:auto; margin:0; }
            .csync .list .c { margin-left:auto; color:#64748b; font-size:.82em; white-space:nowrap; }
            .csync select, .csync input[type=text] { width:100%; box-sizing:border-box; padding:8px 10px; border-radius:8px; border:1px solid rgba(148,163,184,.6); font:inherit; background:transparent; color:inherit; }
            .csync select option { color:#0f172a; }
            .csync .lbl { display:block; font-weight:700; font-size:.85em; color:#475569; margin:10px 0 4px; }
            .csync table { width:100%; border-collapse:collapse; font-size:.9em; }
            .csync td, .csync th { padding:5px 6px; border-bottom:1px solid rgba(148,163,184,.3); text-align:left; }
            .csync td.n { text-align:center; white-space:nowrap; }
            .csync .add { color:#059669; font-weight:700; } .csync .upd { color:#b45309; font-weight:700; } .csync .del { color:#dc2626; font-weight:700; }
        `;
        document.head.appendChild(st);
    }

    // ------------------------------------------------------------------ đọc dữ liệu
    async function loadFolder(folderId) {
        const d = await folderRef(folderId).get();
        if (!d.exists) throw new Error('Không tìm thấy thư mục lớp.');
        return { id: d.id, ...d.data() };
    }
    async function loadClassContent(folderId) {
        const [ws, gs] = await Promise.all([folderRef(folderId).collection('words').get(), folderRef(folderId).collection('grammar').get()]);
        const words = new Map(), grammar = new Map();
        ws.docs.forEach(d => words.set(d.id, d.data()));
        gs.docs.forEach(d => { if (!d.id.startsWith('raw_')) grammar.set(d.id, d.data()); });
        return { words, grammar };
    }
    async function listCurricula() {
        const snap = await db().collection('curricula').get();
        return snap.docs.map(d => ({ id: d.id, ...d.data() }))
            .sort((a, b) => (a.order ?? 999) - (b.order ?? 999) || String(a.title).localeCompare(String(b.title), 'vi'));
    }
    async function getLessons(curId, ids) {
        const docs = await Promise.all(ids.map(id => db().collection('curricula').doc(curId).collection('lessons').doc(id).get()));
        const m = new Map();
        docs.forEach(d => { if (d.exists) m.set(d.id, d.data()); });
        return m;
    }

    function wordDoc(cw, listName, order, src) {
        return {
            word: norm(cw.word), meaning: norm(cw.meaning), listName,
            ex_kr: norm(cw.ex_kr), ex_vn: norm(cw.ex_vn), definition: norm(cw.definition),
            order, src, createdAt: FV().serverTimestamp()
        };
    }
    function grammarDoc(g, listName, order, src) {
        return {
            listName, title: norm(g.title), contentHtml: String(g.contentHtml || ''), order, src,
            createdAt: FV().serverTimestamp(), updatedAt: FV().serverTimestamp()
        };
    }
    function diff(cur, src, fields) {
        const out = {};
        fields.forEach(f => {
            const a = f === 'contentHtml' ? String(cur[f] || '') : norm(cur[f]);
            const b = f === 'contentHtml' ? String(src[f] || '') : norm(src[f]);
            if (a !== b) out[f] = b;
        });
        return Object.keys(out).length ? out : null;
    }

    // Tên bài trong lớp mà một liên kết đang trỏ tới (giáo viên có thể đã đổi tên bài trong lớp)
    function resolveName(folder, content, entry) {
        const lessons = folder.lessons || [];
        if (lessons.includes(entry.name)) return entry.name;
        const counts = {};
        Object.values(entry.w || {}).forEach(id => { const w = content.words.get(id); if (w && lessons.includes(w.listName)) counts[w.listName] = (counts[w.listName] || 0) + 1; });
        Object.values(entry.g || {}).forEach(id => { const g = content.grammar.get(id); if (g && lessons.includes(g.listName)) counts[g.listName] = (counts[g.listName] || 0) + 1; });
        const best = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
        return best ? best[0] : null;
    }

    // ------------------------------------------------------------------ NHẬP BÀI VÀO LỚP
    // stageMode: 'cur' = theo giai đoạn của giáo trình, '' = không phân giai đoạn, hoặc tên giai đoạn có sẵn trong lớp
    async function importLessons(folderId, cur, lessonIds, stageMode) {
        const [folder, content, lessons] = await Promise.all([loadFolder(folderId), loadClassContent(folderId), getLessons(cur.id, lessonIds)]);
        const links = clone(folder.curLinks);
        const link = links[cur.id] = links[cur.id] || { title: cur.title, lessons: {} };
        link.title = cur.title;
        link.lessons = link.lessons || {};
        const taken = new Set(folder.lessons || []);
        const subs = [...(folder.subFolders || [])];
        const usedW = new Set(content.words.keys()), usedG = new Set(content.grammar.keys());
        const wordsCol = folderRef(folderId).collection('words'), gramCol = folderRef(folderId).collection('grammar');
        const newLessons = [], ops = [];
        let nWords = 0, nGram = 0;

        lessonIds.forEach(lid => {
            const L = lessons.get(lid);
            if (!L || link.lessons[lid]) return; // bài đã nhập → dùng Đồng bộ
            const stage = safePart(stageMode === 'cur' ? (L.stage || '') : stageMode);
            if (stage && !subs.includes(stage)) subs.push(stage);
            const base = (stage ? stage + '/' : '') + (safePart(L.title) || 'Bài');
            let name = base, k = 2;
            while (taken.has(name)) name = `${base} (${k++})`;
            taken.add(name); newLessons.push(name);

            const entry = { name, v: L.version || 1, w: {}, g: {} };
            (L.words || []).forEach((cw, i) => {
                if (!norm(cw.word)) return;
                let id = cw.id || ('w_' + rand());
                if (usedW.has(id)) id = id + '_' + rand();
                usedW.add(id); entry.w[cw.id || id] = id; nWords++;
                const data = wordDoc(cw, name, i, { c: cur.id, l: lid, w: cw.id || id });
                ops.push(b => b.set(wordsCol.doc(id), data));
            });
            (L.grammar || []).forEach((g, i) => {
                if (!norm(g.title)) return;
                let id = g.id || ('g_' + rand());
                if (usedG.has(id)) id = id + '_' + rand();
                usedG.add(id); entry.g[g.id || id] = id; nGram++;
                const data = grammarDoc(g, name, i, { c: cur.id, l: lid, g: g.id || id });
                ops.push(b => b.set(gramCol.doc(id), data));
            });
            link.lessons[lid] = entry;
        });

        if (!newLessons.length) return { lessons: 0, words: 0, grammar: 0 };
        // Ghi nội dung trước, cập nhật danh sách bài sau → học viên không thấy bài rỗng
        await commitInChunks(ops);
        await folderRef(folderId).update({
            lessons: FV().arrayUnion(...newLessons), subFolders: subs, curLinks: links, updatedAt: FV().serverTimestamp()
        });
        return { lessons: newLessons.length, words: nWords, grammar: nGram };
    }

    // ------------------------------------------------------------------ ĐỒNG BỘ
    async function buildSyncPlan(folder, content, curId) {
        const link = (folder.curLinks || {})[curId];
        const lids = Object.keys((link && link.lessons) || {});
        const lessons = await getLessons(curId, lids);
        const newLink = clone(link);
        const items = [];
        lids.forEach(lid => {
            const entry = link.lessons[lid];
            const L = lessons.get(lid);
            const item = { lid, title: L ? L.title : entry.name, name: null, status: 'ok', add: [], upd: [], del: [], quiet: [], gAdd: [], gUpd: [], gDel: [] };
            items.push(item);
            if (!L) { item.status = 'gone'; return; }
            const name = resolveName(folder, content, entry);
            if (!name) { item.status = 'missing'; return; }
            item.name = name;
            const ne = newLink.lessons[lid];
            ne.name = name; ne.w = ne.w || {}; ne.g = ne.g || {};
            if ((L.version || 1) === entry.v) return; // bài chưa đổi kể từ lần đồng bộ trước

            const usedW = new Set(content.words.keys()), usedG = new Set(content.grammar.keys());
            // --- từ vựng
            const seenW = new Set();
            (L.words || []).forEach((cw, i) => {
                if (!norm(cw.word)) return;
                seenW.add(cw.id);
                const src = { c: curId, l: lid, w: cw.id };
                const docId = (entry.w || {})[cw.id];
                if (!docId) {
                    let id = cw.id; if (usedW.has(id)) id = id + '_' + rand(); usedW.add(id);
                    ne.w[cw.id] = id;
                    item.add.push({ id, data: wordDoc(cw, name, i, src), label: cw.word });
                } else if (content.words.has(docId)) {
                    const cur = content.words.get(docId);
                    const ch = diff(cur, cw, WORD_FIELDS);
                    if (ch) item.upd.push({ id: docId, data: { ...ch, order: i, src }, label: cw.word });
                    else if (cur.order !== i || !cur.src) item.quiet.push({ id: docId, data: { order: i, src } });
                } // else: giáo viên đã xóa từ này khỏi lớp → không thêm lại
            });
            Object.entries(entry.w || {}).forEach(([cwid, docId]) => {
                if (seenW.has(cwid)) return;
                delete ne.w[cwid];
                if (content.words.has(docId)) item.del.push({ id: docId, label: content.words.get(docId).word });
            });
            // --- ngữ pháp
            const seenG = new Set();
            (L.grammar || []).forEach((g, i) => {
                if (!norm(g.title)) return;
                seenG.add(g.id);
                const src = { c: curId, l: lid, g: g.id };
                const docId = (entry.g || {})[g.id];
                if (!docId) {
                    let id = g.id; if (usedG.has(id)) id = id + '_' + rand(); usedG.add(id);
                    ne.g[g.id] = id;
                    item.gAdd.push({ id, data: grammarDoc(g, name, i, src), label: g.title });
                } else if (content.grammar.has(docId)) {
                    const cur = content.grammar.get(docId);
                    const ch = diff(cur, g, GRAMMAR_FIELDS);
                    if (ch) item.gUpd.push({ id: docId, data: { ...ch, order: i, src, updatedAt: FV().serverTimestamp() }, label: g.title });
                    else if (cur.order !== i || !cur.src) item.quiet.push({ id: docId, data: { order: i, src }, grammar: true });
                }
            });
            Object.entries(entry.g || {}).forEach(([gid, docId]) => {
                if (seenG.has(gid)) return;
                delete ne.g[gid];
                if (content.grammar.has(docId)) item.gDel.push({ id: docId, label: content.grammar.get(docId).title });
            });
            ne.v = L.version || 1;
            item.status = (item.add.length + item.upd.length + item.del.length + item.gAdd.length + item.gUpd.length + item.gDel.length) ? 'changed' : 'touch';
        });
        return { curId, items, newLink };
    }
    const planChanges = (plan) => plan.items.filter(i => i.status === 'changed');
    const planNeedsWrite = (plan) => plan.items.some(i => i.status === 'changed' || i.status === 'touch');

    async function applySyncPlan(folderId, plan, deleteRemoved) {
        const wordsCol = folderRef(folderId).collection('words'), gramCol = folderRef(folderId).collection('grammar');
        const ops = [];
        plan.items.forEach(it => {
            it.add.forEach(x => ops.push(b => b.set(wordsCol.doc(x.id), x.data)));
            it.upd.forEach(x => ops.push(b => b.update(wordsCol.doc(x.id), x.data)));
            it.gAdd.forEach(x => ops.push(b => b.set(gramCol.doc(x.id), x.data)));
            it.gUpd.forEach(x => ops.push(b => b.update(gramCol.doc(x.id), x.data)));
            it.quiet.forEach(x => ops.push(b => b.update((x.grammar ? gramCol : wordsCol).doc(x.id), x.data)));
            if (deleteRemoved) {
                it.del.forEach(x => ops.push(b => b.delete(wordsCol.doc(x.id))));
                it.gDel.forEach(x => ops.push(b => b.delete(gramCol.doc(x.id))));
            }
        });
        await commitInChunks(ops);
        // Ghi lại liên kết từ bản mới nhất của thư mục (tránh ghi đè liên kết giáo trình khác)
        const fresh = await loadFolder(folderId);
        const links = clone(fresh.curLinks);
        links[plan.curId] = plan.newLink;
        await folderRef(folderId).update({ curLinks: links, updatedAt: FV().serverTimestamp() });
    }

    // ------------------------------------------------------------------ LIÊN KẾT LẠI LỚP ĐÃ CHUYỂN THÀNH GIÁO TRÌNH
    async function relinkFromSource(folderId, cur) {
        const [folder, content] = await Promise.all([loadFolder(folderId), loadClassContent(folderId)]);
        const units = cur.units || [];
        const lessons = await getLessons(cur.id, units.map(u => u.id));
        const links = clone(folder.curLinks);
        const link = links[cur.id] = links[cur.id] || { title: cur.title, lessons: {} };
        link.title = cur.title; link.lessons = link.lessons || {};
        let n = 0;
        units.forEach(u => {
            const L = lessons.get(u.id);
            if (!L || link.lessons[u.id]) return;
            const entry = { name: (L.stage ? L.stage + '/' : '') + L.title, v: 0, w: {}, g: {} };
            (L.words || []).forEach(cw => { if (content.words.has(cw.id)) entry.w[cw.id] = cw.id; });
            (L.grammar || []).forEach(g => { if (content.grammar.has(g.id)) entry.g[g.id] = g.id; });
            if (!resolveName(folder, content, entry)) return; // không tìm được bài tương ứng trong lớp
            link.lessons[u.id] = entry; n++;
        });
        if (n) await folderRef(folderId).update({ curLinks: links, updatedAt: FV().serverTimestamp() });
        return n;
    }

    // ------------------------------------------------------------------ GIAO DIỆN
    function refreshFolderView(folderId) {
        // Snapshot thư mục của giáo viên cập nhật _teacherFolders; chờ một nhịp rồi vẽ lại
        setTimeout(() => {
            if (window.currentSharedFolderId === folderId && !window.currentSharedLesson && typeof window.openSharedFolder === 'function') {
                window.openSharedFolder(folderId);
            }
        }, 500);
    }

    function changeSummary(it) {
        const parts = [];
        if (it.add.length) parts.push(`<span class="add">+${it.add.length}</span>`);
        if (it.upd.length) parts.push(`<span class="upd">~${it.upd.length}</span>`);
        if (it.del.length) parts.push(`<span class="del">−${it.del.length}</span>`);
        const g = [];
        if (it.gAdd.length) g.push(`<span class="add">+${it.gAdd.length}</span>`);
        if (it.gUpd.length) g.push(`<span class="upd">~${it.gUpd.length}</span>`);
        if (it.gDel.length) g.push(`<span class="del">−${it.gDel.length}</span>`);
        return { w: parts.join(' ') || '—', g: g.join(' ') || '—' };
    }

    async function openHub(folderId) {
        if (!isTeacher()) return;
        injectStyles();
        let folder, content, curricula, plans = {};
        try {
            loading('Đang kiểm tra giáo trình…');
            [folder, content, curricula] = await Promise.all([loadFolder(folderId), loadClassContent(folderId), listCurricula()]);
            const linkedIds = Object.keys(folder.curLinks || {});
            await Promise.all(linkedIds.map(async id => { plans[id] = await buildSyncPlan(folder, content, id); }));
            // Bài giáo trình đổi phiên bản nhưng nội dung lớp vẫn khớp → chỉ cập nhật dấu phiên bản, không cần hỏi
            await Promise.all(linkedIds.filter(id => !planChanges(plans[id]).length && planNeedsWrite(plans[id]))
                .map(id => applySyncPlan(folderId, plans[id], false)));
        } catch (err) { return fail(err); }

        const linkedIds = Object.keys(folder.curLinks || {});
        const byId = Object.fromEntries(curricula.map(c => [c.id, c]));
        const cards = linkedIds.map(id => {
            const c = byId[id], link = folder.curLinks[id], plan = plans[id];
            const imported = Object.keys(link.lessons || {}).length;
            if (!c) return `<div class="card"><h4>${esc(link.title || id)}</h4>
                <div class="muted"><span class="pill bad">Giáo trình đã bị xóa</span> Các bài đã nhập vẫn còn trong lớp.</div>
                <div class="row"><button class="b dan" data-act="unlink" data-cur="${esc(id)}">Bỏ liên kết</button></div></div>`;
            const total = (c.units || []).length;
            const chg = planChanges(plan);
            const gone = plan.items.filter(i => i.status === 'gone').length;
            const missing = plan.items.filter(i => i.status === 'missing').length;
            const status = chg.length
                ? `<span class="pill chg">🔄 ${chg.length} bài có thay đổi</span>`
                : `<span class="pill ok">✅ Đã cập nhật</span>`;
            return `<div class="card">
                <h4>${esc(c.icon || '📘')} ${esc(c.title)}</h4>
                <div class="muted">Đã nhập ${imported}/${total} bài · ${status}
                    ${gone ? `<br>⚠ ${gone} bài đã bị xóa khỏi giáo trình (vẫn giữ trong lớp).` : ''}
                    ${missing ? `<br>⚠ ${missing} bài không còn trong lớp (đã xóa bài trong lớp?).` : ''}</div>
                <div class="row">
                    ${chg.length ? `<button class="b warn" data-act="sync" data-cur="${esc(id)}">🔄 Đồng bộ</button>` : ''}
                    ${imported < total ? `<button class="b" data-act="import" data-cur="${esc(id)}">＋ Nhập thêm ${total - imported} bài</button>` : ''}
                    <button class="b dan" data-act="unlink" data-cur="${esc(id)}">Bỏ liên kết</button>
                </div></div>`;
        }).join('');
        const relinkable = curricula.filter(c => c.source && c.source.folderId === folderId && !linkedIds.includes(c.id));
        const relinkCards = relinkable.map(c => `<div class="card">
            <h4>🔗 ${esc(c.title)}</h4>
            <div class="muted">Giáo trình này được tạo từ chính lớp này. Liên kết lại để lớp nhận cập nhật khi bạn sửa giáo trình
                — giữ nguyên từ vựng và tiến độ của học viên.</div>
            <div class="row"><button class="b pri" data-act="relink" data-cur="${esc(c.id)}">🔗 Liên kết lại</button></div></div>`).join('');

        await Swal.fire({
            title: '📚 Giáo trình của lớp', width: 'min(640px, 96vw)', showConfirmButton: false, showCloseButton: true,
            html: `<div class="csync">
                <div class="muted" style="margin-bottom:10px">Lớp: <b>${esc(folder.name)}</b></div>
                ${cards || (relinkCards ? '' : '<div class="card muted">Lớp chưa nhập bài nào từ Kho giáo trình.</div>')}
                ${relinkCards}
                <div class="row" style="margin-top:4px">
                    <button class="b pri" data-act="import">＋ Nhập bài từ giáo trình</button>
                    <a class="b" href="lesson/admin.html" target="_blank" rel="noopener" style="text-decoration:none">Mở Kho giáo trình ↗</a>
                </div></div>`,
            didOpen: (popup) => {
                popup.querySelectorAll('[data-act]').forEach(btn => btn.addEventListener('click', () => {
                    const act = btn.dataset.act, curId = btn.dataset.cur || null;
                    Swal.close();
                    setTimeout(() => {
                        if (act === 'import') importDialog(folderId, curId);
                        else if (act === 'sync') syncDialog(folderId, curId);
                        else if (act === 'relink') relinkDialog(folderId, byId[curId]);
                        else if (act === 'unlink') unlinkDialog(folderId, curId, (byId[curId] || folder.curLinks[curId] || {}).title);
                    }, 50);
                }));
            }
        });
    }

    async function pickCurriculum(curricula, title) {
        if (!curricula.length) {
            await Swal.fire({ icon: 'info', title: 'Kho giáo trình trống', html: 'Hãy tạo giáo trình trước ở <a href="lesson/admin.html" target="_blank">Kho giáo trình ↗</a>.' });
            return null;
        }
        const { value } = await Swal.fire({
            title, input: 'select', width: 'min(520px, 94vw)',
            inputOptions: Object.fromEntries(curricula.map(c => [c.id, `${c.icon || '📘'} ${c.title} (${(c.units || []).length} bài)`])),
            showCancelButton: true, confirmButtonText: 'Tiếp tục', cancelButtonText: 'Hủy'
        });
        return value ? curricula.find(c => c.id === value) : null;
    }

    async function importDialog(folderId, curId) {
        injectStyles();
        let folder, cur;
        try {
            loading();
            const [f, list] = await Promise.all([loadFolder(folderId), listCurricula()]);
            folder = f; Swal.close();
            cur = curId ? list.find(c => c.id === curId) : await pickCurriculum(list, '📚 Chọn giáo trình');
        } catch (err) { return fail(err); }
        if (!cur) return;
        const linked = ((folder.curLinks || {})[cur.id] || {}).lessons || {};
        const units = cur.units || [];
        if (!units.length) return Swal.fire('Giáo trình chưa có bài', '', 'info');
        const rows = units.map(u => {
            const done = !!linked[u.id];
            return `<label class="${done ? 'dis' : ''}"><input type="checkbox" data-id="${esc(u.id)}" ${done ? 'disabled' : 'checked'}>
                <span>${u.stage ? `<span class="pill">${esc(u.stage)}</span> ` : ''}${esc(u.title)}</span>
                <span class="c">${done ? 'đã nhập' : `${u.wordCount || 0} từ · ${u.grammarCount || 0} NP`}</span></label>`;
        }).join('');
        const subs = folder.subFolders || [];
        const { value } = await Swal.fire({
            title: '＋ Nhập từ “' + esc(cur.title) + '”', width: 'min(640px, 96vw)',
            html: `<div class="csync">
                <span class="lbl">Chọn bài</span>
                <div class="row" style="margin:0 0 6px"><button type="button" class="b" id="csAll">Chọn tất cả</button><button type="button" class="b" id="csNone">Bỏ chọn</button></div>
                <div class="list" id="csList">${rows}</div>
                <span class="lbl">Đặt vào giai đoạn</span>
                <select id="csStage">
                    <option value="cur">Theo giai đoạn của giáo trình (tự tạo nếu chưa có)</option>
                    <option value="">Không phân giai đoạn</option>
                    ${subs.map(s => `<option value="${esc(s)}">📂 ${esc(s)}</option>`).join('')}
                </select>
                <div class="muted" style="margin-top:8px">Từ vựng và ngữ pháp được chép vào lớp. Sau này sửa giáo trình, bấm <b>🔄 Đồng bộ</b> để lớp nhận bản mới.</div>
            </div>`,
            showCancelButton: true, confirmButtonText: 'Nhập vào lớp', cancelButtonText: 'Hủy', focusConfirm: false,
            didOpen: () => {
                const set = v => document.querySelectorAll('#csList input:not(:disabled)').forEach(x => { x.checked = v; });
                document.getElementById('csAll').onclick = () => set(true);
                document.getElementById('csNone').onclick = () => set(false);
            },
            preConfirm: () => {
                const ids = [...document.querySelectorAll('#csList input:checked:not(:disabled)')].map(x => x.dataset.id);
                if (!ids.length) { Swal.showValidationMessage('Chọn ít nhất một bài chưa nhập'); return false; }
                return { ids, stage: document.getElementById('csStage').value };
            }
        });
        if (!value) return;
        try {
            loading('Đang nhập bài vào lớp…');
            const r = await importLessons(folderId, cur, value.ids, value.stage);
            Swal.fire({ icon: 'success', title: 'Đã nhập vào lớp!', html: `<b>${r.lessons}</b> bài · <b>${r.words}</b> từ vựng · <b>${r.grammar}</b> ngữ pháp` });
            refreshFolderView(folderId);
        } catch (err) { fail(err); }
    }

    async function syncDialog(folderId, curId) {
        injectStyles();
        let plan;
        try {
            loading('Đang so sánh với giáo trình…');
            const [folder, content] = await Promise.all([loadFolder(folderId), loadClassContent(folderId)]);
            plan = await buildSyncPlan(folder, content, curId);
            Swal.close();
        } catch (err) { return fail(err); }
        const chg = planChanges(plan);
        if (!chg.length) {
            if (planNeedsWrite(plan)) { try { await applySyncPlan(folderId, plan, false); } catch (err) { return fail(err); } }
            return Swal.fire({ icon: 'success', title: 'Lớp đã khớp với giáo trình', timer: 1600, showConfirmButton: false });
        }
        const hasDel = chg.some(i => i.del.length || i.gDel.length);
        const rows = chg.map(it => {
            const s = changeSummary(it);
            const details = [...it.add.map(x => `+ ${x.label}`), ...it.upd.map(x => `~ ${x.label}`), ...it.del.map(x => `− ${x.label}`),
                ...it.gAdd.map(x => `+ NP ${x.label}`), ...it.gUpd.map(x => `~ NP ${x.label}`), ...it.gDel.map(x => `− NP ${x.label}`)];
            return `<tr title="${esc(details.slice(0, 30).join('\n'))}"><td>${esc(it.name || it.title)}</td><td class="n">${s.w}</td><td class="n">${s.g}</td></tr>`;
        }).join('');
        const { value, isConfirmed } = await Swal.fire({
            title: '🔄 Đồng bộ giáo trình', width: 'min(640px, 96vw)',
            html: `<div class="csync">
                <div class="muted" style="margin-bottom:8px"><span class="add">+ thêm</span> · <span class="upd">~ sửa nội dung</span> · <span class="del">− bỏ khỏi giáo trình</span>. Rê chuột lên một dòng để xem chi tiết.</div>
                <table><thead><tr><th>Bài trong lớp</th><th class="n">Từ vựng</th><th class="n">Ngữ pháp</th></tr></thead><tbody>${rows}</tbody></table>
                ${hasDel ? `<label style="display:flex;gap:8px;align-items:center;margin-top:10px"><input type="checkbox" id="csDel" checked style="width:auto;margin:0">
                    Xóa khỏi lớp các mục đã bị bỏ khỏi giáo trình</label>` : ''}
                <div class="muted" style="margin-top:8px">Từ bạn tự thêm riêng cho lớp được giữ nguyên. Tiến độ học của học viên không bị mất.</div>
            </div>`,
            showCancelButton: true, confirmButtonText: 'Đồng bộ', cancelButtonText: 'Hủy', focusConfirm: false,
            preConfirm: () => ({ del: hasDel ? document.getElementById('csDel').checked : false })
        });
        if (!isConfirmed) return;
        try {
            loading('Đang đồng bộ…');
            await applySyncPlan(folderId, plan, value.del);
            Swal.fire({ icon: 'success', title: 'Đã đồng bộ', text: `${chg.length} bài đã được cập nhật.`, timer: 1800, showConfirmButton: false });
            refreshFolderView(folderId);
        } catch (err) { fail(err); }
    }

    async function relinkDialog(folderId, cur) {
        if (!cur) return;
        try {
            loading('Đang liên kết…');
            const n = await relinkFromSource(folderId, cur);
            Swal.close();
            if (!n) return Swal.fire('Không tìm thấy bài tương ứng', 'Không bài nào trong lớp khớp với giáo trình này.', 'info');
            await Swal.fire({ icon: 'success', title: `Đã liên kết ${n} bài`, text: 'Tiếp theo: kiểm tra khác biệt giữa lớp và giáo trình.', timer: 1500, showConfirmButton: false });
            syncDialog(folderId, cur.id);
        } catch (err) { fail(err); }
    }

    async function unlinkDialog(folderId, curId, title) {
        const r = await Swal.fire({
            icon: 'question', title: 'Bỏ liên kết “' + (title || curId) + '”?',
            text: 'Các bài đã nhập vẫn ở lại trong lớp, chỉ là sẽ không nhận cập nhật từ giáo trình nữa.',
            showCancelButton: true, confirmButtonText: 'Bỏ liên kết', cancelButtonText: 'Hủy'
        });
        if (!r.isConfirmed) return;
        try {
            const folder = await loadFolder(folderId);
            const links = clone(folder.curLinks);
            delete links[curId];
            await folderRef(folderId).update({ curLinks: links, updatedAt: FV().serverTimestamp() });
            Swal.fire({ icon: 'success', title: 'Đã bỏ liên kết', timer: 1300, showConfirmButton: false });
        } catch (err) { fail(err); }
    }

    // ------------------------------------------------------------------ TẠO LỚP MỚI TỪ GIÁO TRÌNH
    async function createClassDialog() {
        if (!isTeacher()) return;
        injectStyles();
        let list;
        try { loading(); list = await listCurricula(); Swal.close(); } catch (err) { return fail(err); }
        const cur = await pickCurriculum(list.filter(c => (c.units || []).length), '📚 Tạo lớp từ giáo trình');
        if (!cur) return;
        const { value } = await Swal.fire({
            title: '🔑 Lớp mới từ “' + esc(cur.title) + '”', width: 'min(480px, 94vw)',
            html: `<div class="csync">
                <span class="lbl">Tên lớp</span><input type="text" id="csName" value="${esc(cur.title)} - " placeholder="VD: ${esc(cur.title)} - Lan">
                <span class="lbl">Mã Key Code (cho học viên nhập)</span>
                <input type="text" id="csCode" placeholder="VD: LAN-SC1" style="text-transform:uppercase;font-weight:700;letter-spacing:1px">
                <div class="muted" style="margin-top:8px">Lớp sẽ có sẵn ${(cur.units || []).length} bài của giáo trình, chia theo giai đoạn.</div>
            </div>`,
            showCancelButton: true, confirmButtonText: 'Tạo lớp', cancelButtonText: 'Hủy', focusConfirm: false,
            didOpen: () => { const el = document.getElementById('csName'); el.focus(); el.setSelectionRange(el.value.length, el.value.length); },
            preConfirm: async () => {
                const name = norm(document.getElementById('csName').value).replace(/\s*-\s*$/, '');
                const code = norm(document.getElementById('csCode').value).toUpperCase().replace(/\s+/g, '-');
                if (!name) { Swal.showValidationMessage('Nhập tên lớp'); return false; }
                if (code.length < 3) { Swal.showValidationMessage('Mã Key Code phải có ít nhất 3 ký tự'); return false; }
                if (code.includes('/')) { Swal.showValidationMessage('Mã Key Code không được chứa dấu "/"'); return false; }
                const dup = await db().collection('shared_folders').where('keyCode', '==', code).get();
                if (!dup.empty) { Swal.showValidationMessage(`Mã "${code}" đã được dùng ở lớp khác`); return false; }
                return { name, code };
            }
        });
        if (!value) return;
        try {
            loading('Đang tạo lớp…');
            const folderId = 'sf_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
            await folderRef(folderId).set({
                name: value.name, keyCode: value.code, ownerEmail: TEACHER_EMAIL,
                ownerUid: (firebase.auth().currentUser || {}).uid || '',
                lessons: [], subFolders: [], createdAt: FV().serverTimestamp(), updatedAt: FV().serverTimestamp()
            });
            const r = await importLessons(folderId, cur, (cur.units || []).map(u => u.id), 'cur');
            await Swal.fire({
                icon: 'success', title: 'Đã tạo lớp!',
                html: `<b>${esc(value.name)}</b><br>${r.lessons} bài · ${r.words} từ · ${r.grammar} ngữ pháp<br><br>
                       Mã Key Code: <b style="color:#d97706;font-size:1.2em">${esc(value.code)}</b><br><br>
                       <button class="swal2-confirm swal2-styled" style="background:#2563eb;padding:8px 16px;font-size:.9em"
                           onclick="copyKeyCode(${esc(JSON.stringify(value.code))})">📋 Sao chép mã gửi học viên</button>`,
                confirmButtonText: 'Mở lớp', confirmButtonColor: '#64748b'
            });
            setTimeout(() => { if (typeof window.openSharedFolder === 'function') window.openSharedFolder(folderId); }, 300);
        } catch (err) { fail(err); }
    }

    // Nút "📚 Giáo trình" trên thanh công cụ của thư mục lớp (giáo viên)
    function decorateFolder(folder) {
        if (!isTeacher() || !folder) return;
        const slot = document.getElementById('headerActionBtnSlot');
        if (!slot || slot.querySelector('[data-csync]')) return;
        const n = Object.keys(folder.curLinks || {}).length;
        const btn = document.createElement('button');
        btn.className = 'btn-edit';
        btn.dataset.csync = '1';
        btn.style.cssText = 'padding:6px 14px;font-size:0.82em;flex:0 0 auto;background:#eef2ff;color:#4338ca;border-color:#c7d2fe;';
        btn.textContent = n ? `📚 Giáo trình (${n})` : '📚 Nhập từ giáo trình';
        btn.onclick = () => openHub(folder.id);
        slot.appendChild(btn);
    }

    window.CurriculumSync = {
        openHub, importDialog, syncDialog, unlinkDialog, createClassDialog, decorateFolder,
        // dùng cho kiểm thử
        _importLessons: importLessons, _buildSyncPlan: buildSyncPlan, _applySyncPlan: applySyncPlan, _relinkFromSource: relinkFromSource,
        _loadFolder: loadFolder, _loadClassContent: loadClassContent
    };
})();
