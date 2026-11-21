/* ==========================================================================
   KHO GIÁO TRÌNH — Trang soạn thảo (curriculum/admin.html)
   --------------------------------------------------------------------------
   Firestore:
     curricula/{curId}
       title, icon, level, description, visibility ("private"|"students"|"public"),
       order, stages: [tên giai đoạn], units: [{ id, title, stage, wordCount, grammarCount }],
       version, source?, ownerUid, createdAt, updatedAt
     curricula/{curId}/lessons/{lessonId}
       title, stage, version, updatedAt,
       words:   [{ id, word, meaning, ex_kr, ex_vn, definition }]
       grammar: [{ id, title, contentHtml, libId }]   // libId = id trong GrammarLibrary (nếu lấy từ thư viện)
   Thứ tự bài = thứ tự trong mảng units. ID từ vựng ổn định để Giai đoạn 2
   (nhập vào lớp + đồng bộ) không làm mất tiến độ học của học viên.
   ========================================================================== */
(function () {
    'use strict';

    // Phải khớp với isAdmin() trong firestore.rules
    const ADMIN_EMAILS = ['nmhieu2526@gmail.com', 'vuihoctienghan27@gmail.com'];

    const LEVELS = {
        socap1: 'Sơ cấp 1', socap2: 'Sơ cấp 2', trungcap3: 'Trung cấp 3', trungcap4: 'Trung cấp 4',
        caocap5: 'Cao cấp 5', caocap6: 'Cao cấp 6', topik1: 'TOPIK I', topik2: 'TOPIK II', other: 'Khác'
    };
    const VIS = { private: '🔒 Riêng tư', students: '👥 Học viên', public: '🌐 Công khai' };
    const VIS_HINT = {
        private: 'Chỉ giáo viên thấy.',
        students: 'Học viên đã đăng nhập đọc được (dùng cho lớp học).',
        public: 'Ai cũng xem được — chỉ nên dùng với nội dung tự soạn.'
    };
    const GRAMMAR_LEVELS = { 1: 'Sơ cấp 1', 2: 'Sơ cấp 2', 3: 'Trung cấp 3', 4: 'Trung cấp 4', 5: 'Cao cấp 5', 6: 'Cao cấp 6', 7: 'TOPIK' };
    const NO_STAGE = '';
    const MAX_LESSON_BYTES = 900 * 1024; // Firestore giới hạn 1 MiB / doc

    const auth = firebase.auth();
    const db = firebase.firestore();
    const FV = firebase.firestore.FieldValue;
    const curCol = () => db.collection('curricula');

    const S = { curricula: [], cur: null, lesson: null, dirty: false, tab: 'words' };

    // ------------------------------------------------------------------ helpers
    const $ = (id) => document.getElementById(id);
    function esc(s) {
        return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    }
    const arg = (v) => esc(JSON.stringify(v)); // an toàn trong onclick="..."
    function newId(prefix) { return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
    function clone(o) { return JSON.parse(JSON.stringify(o)); }
    function toast(title, icon) {
        Swal.fire({ toast: true, position: 'bottom-end', icon: icon || 'success', title, timer: 1800, showConfirmButton: false });
    }
    function fail(err) { console.error(err); Swal.fire('Lỗi', (err && err.message) || String(err), 'error'); }
    function loading(text) { Swal.fire({ title: text || 'Đang xử lý…', allowOutsideClick: false, didOpen: () => Swal.showLoading() }); }
    function levelOptions(sel) {
        return Object.entries(LEVELS).map(([k, v]) => `<option value="${k}" ${k === sel ? 'selected' : ''}>${v}</option>`).join('');
    }
    function stageOptions(stages, sel) {
        return `<option value="">— Chưa phân giai đoạn —</option>` +
            stages.map(s => `<option value="${esc(s)}" ${s === sel ? 'selected' : ''}>${esc(s)}</option>`).join('');
    }
    function bytesOf(obj) { return new Blob([JSON.stringify(obj)]).size; }
    async function commitInChunks(ops) {
        // ops: [(batch) => void]; Firestore cho tối đa 500 thao tác / batch
        for (let i = 0; i < ops.length; i += 400) {
            const b = db.batch();
            ops.slice(i, i + 400).forEach(fn => fn(b));
            await b.commit();
        }
    }
    function normWord(w) { return String(w || '').trim().replace(/\s+/g, ' '); }
    function libLookup() { return Array.isArray(window.GrammarLibrary) ? window.GrammarLibrary : []; }

    async function confirmDiscard() {
        if (!S.dirty) return true;
        const r = await Swal.fire({
            icon: 'warning', title: 'Bài học chưa lưu', text: 'Bỏ các thay đổi chưa lưu?',
            showCancelButton: true, confirmButtonText: 'Bỏ thay đổi', cancelButtonText: 'Ở lại', confirmButtonColor: '#dc2626'
        });
        if (r.isConfirmed) { S.dirty = false; return true; }
        return false;
    }
    window.addEventListener('beforeunload', (e) => { if (S.dirty) { e.preventDefault(); e.returnValue = ''; } });

    // ------------------------------------------------------------------ auth
    function isAdmin(u) { return !!(u && u.email && ADMIN_EMAILS.includes(u.email.toLowerCase())); }

    $('googleSignInBtn').addEventListener('click', () => {
        auth.signInWithPopup(new firebase.auth.GoogleAuthProvider()).catch(err => { $('authMessage').textContent = '❌ ' + err.message; });
    });

    auth.onAuthStateChanged(user => {
        if (user && isAdmin(user)) {
            $('authOverlay').style.display = 'none';
            $('app').style.display = 'block';
            $('whoAmI').textContent = user.email;
            loadCurricula();
        } else {
            $('app').style.display = 'none';
            $('authOverlay').style.display = 'flex';
            $('googleSignInBtn').style.display = 'inline-flex';
            $('authMessage').textContent = user
                ? '⛔ Tài khoản ' + user.email + ' không có quyền soạn giáo trình.'
                : 'Đăng nhập bằng tài khoản giáo viên để soạn giáo trình.';
        }
    });

    async function logout() {
        if (!(await confirmDiscard())) return;
        auth.signOut();
    }

    // ------------------------------------------------------------------ danh sách giáo trình
    async function loadCurricula(selectId) {
        try {
            const snap = await curCol().get();
            S.curricula = snap.docs.map(d => ({ id: d.id, ...d.data() }))
                .sort((a, b) => (a.order ?? 999) - (b.order ?? 999) || String(a.title).localeCompare(String(b.title), 'vi'));
            const keepId = selectId || (S.cur && S.cur.id);
            S.cur = keepId ? (S.curricula.find(c => c.id === keepId) || null) : S.cur;
            renderSidebar();
            if (selectId && S.cur) { S.lesson = null; renderCurriculum(); }
        } catch (err) {
            $('curList').innerHTML = `<li class="hint" style="padding:10px;color:var(--danger)">Không tải được: ${esc(err.message)}<br>Đã deploy firestore.rules mới chưa?</li>`;
        }
    }

    function renderSidebar() {
        $('curCount').textContent = S.curricula.length;
        if (!S.curricula.length) {
            $('curList').innerHTML = '<li class="hint" style="padding:10px">Chưa có giáo trình nào.</li>';
            return;
        }
        $('curList').innerHTML = S.curricula.map(c => {
            const units = c.units || [];
            const words = units.reduce((n, u) => n + (u.wordCount || 0), 0);
            return `<li class="cur-item ${S.cur && S.cur.id === c.id ? 'active' : ''}" onclick="CA.openCurriculum(${arg(c.id)})">
                <span class="ic">${esc(c.icon || '📘')}</span>
                <div style="min-width:0">
                    <div class="t">${esc(c.title)}</div>
                    <div class="m">${esc(LEVELS[c.level] || '')} · ${units.length} bài · ${words} từ</div>
                    <div style="margin-top:4px"><span class="badge ${esc(c.visibility || 'private')}">${VIS[c.visibility || 'private']}</span></div>
                </div></li>`;
        }).join('');
    }

    async function openCurriculum(id) {
        if (!(await confirmDiscard())) return;
        S.cur = S.curricula.find(c => c.id === id) || null;
        S.lesson = null;
        renderSidebar();
        renderCurriculum();
    }

    function metaForm(c) {
        c = c || {};
        const vis = c.visibility || 'private';
        return `<div class="sw-form">
            <div class="row2">
                <div class="field" style="grid-column:span 2"><label>Tên giáo trình</label>
                    <input id="fTitle" value="${esc(c.title || '')}" placeholder="VD: Tiếng Hàn Tổng hợp 1"></div>
            </div>
            <div class="row2">
                <div class="field"><label>Cấp độ</label><select id="fLevel">${levelOptions(c.level || 'socap1')}</select></div>
                <div class="field"><label>Biểu tượng (emoji)</label><input id="fIcon" value="${esc(c.icon || '📘')}" maxlength="4"></div>
            </div>
            <div class="field"><label>Ai được xem</label>
                <select id="fVis">${Object.entries(VIS).map(([k, v]) => `<option value="${k}" ${k === vis ? 'selected' : ''}>${v} — ${VIS_HINT[k]}</option>`).join('')}</select></div>
            <div class="field"><label>Mô tả ngắn</label><textarea id="fDesc" rows="2" placeholder="Giáo trình dùng cho lớp…">${esc(c.description || '')}</textarea></div>
            <div class="field"><label>Thứ tự hiển thị</label><input id="fOrder" type="number" value="${esc(c.order ?? '')}" placeholder="Nhỏ hiện trước"></div>
        </div>`;
    }
    function readMetaForm() {
        const title = $('fTitle').value.trim();
        if (!title) { Swal.showValidationMessage('Vui lòng nhập tên giáo trình'); return false; }
        const order = $('fOrder').value.trim();
        return {
            title, level: $('fLevel').value, icon: $('fIcon').value.trim() || '📘',
            visibility: $('fVis').value, description: $('fDesc').value.trim(),
            order: order === '' ? 999 : Number(order)
        };
    }

    async function createCurriculum() {
        if (!(await confirmDiscard())) return;
        const { value } = await Swal.fire({
            title: '📚 Giáo trình mới', html: metaForm({ visibility: 'students' }), width: 'min(560px, 94vw)',
            showCancelButton: true, confirmButtonText: 'Tạo', cancelButtonText: 'Hủy', focusConfirm: false, preConfirm: readMetaForm
        });
        if (!value) return;
        try {
            const id = newId('cur_');
            await curCol().doc(id).set({
                ...value, stages: [], units: [], version: 1,
                ownerUid: auth.currentUser.uid, createdAt: FV.serverTimestamp(), updatedAt: FV.serverTimestamp()
            });
            toast('Đã tạo giáo trình');
            await loadCurricula(id);
        } catch (err) { fail(err); }
    }

    async function editCurriculum() {
        const c = S.cur; if (!c) return;
        const { value } = await Swal.fire({
            title: '✎ Thông tin giáo trình', html: metaForm(c), width: 'min(560px, 94vw)',
            showCancelButton: true, confirmButtonText: 'Lưu', cancelButtonText: 'Hủy', focusConfirm: false, preConfirm: readMetaForm
        });
        if (!value) return;
        try {
            await curCol().doc(c.id).update({ ...value, updatedAt: FV.serverTimestamp() });
            Object.assign(c, value);
            renderSidebar(); renderCurriculum();
            toast('Đã lưu');
        } catch (err) { fail(err); }
    }

    async function deleteCurriculum() {
        const c = S.cur; if (!c) return;
        const { value } = await Swal.fire({
            icon: 'warning', title: 'Xóa giáo trình?',
            html: `Toàn bộ <b>${(c.units || []).length} bài</b> của <b>${esc(c.title)}</b> sẽ bị xóa vĩnh viễn, không khôi phục được.<br>
                   Các lớp đã nhập từ giáo trình này vẫn giữ bản sao của họ.<br><br>Gõ lại tên giáo trình để xác nhận:`,
            input: 'text', inputPlaceholder: c.title, showCancelButton: true, confirmButtonText: 'Xóa vĩnh viễn',
            cancelButtonText: 'Hủy', confirmButtonColor: '#dc2626',
            preConfirm: (v) => { if ((v || '').trim() !== c.title) { Swal.showValidationMessage('Tên chưa khớp'); return false; } return true; }
        });
        if (!value) return;
        try {
            loading('Đang xóa…');
            const [snap, media] = await Promise.all([curCol().doc(c.id).collection('lessons').get(), curCol().doc(c.id).collection('media').get()]);
            await commitInChunks(snap.docs.concat(media.docs).map(d => (b) => b.delete(d.ref)));
            await curCol().doc(c.id).delete();
            S.cur = null; S.lesson = null;
            Swal.close();
            $('main').innerHTML = '<div class="empty"><div class="big">🗑</div><p>Đã xóa giáo trình.</p></div>';
            await loadCurricula();
        } catch (err) { fail(err); }
    }

    // ------------------------------------------------------------------ trang giáo trình (danh sách bài)
    function groupedUnits(c) {
        const stages = [...(c.stages || [])];
        const groups = stages.map(s => ({ stage: s, items: [] }));
        const loose = { stage: NO_STAGE, items: [] };
        (c.units || []).forEach((u, idx) => {
            const g = groups.find(x => x.stage === u.stage) || loose;
            g.items.push({ u, idx });
        });
        if (loose.items.length || !groups.length) groups.push(loose);
        return groups;
    }

    function renderCurriculum() {
        const c = S.cur;
        if (!c) { $('main').innerHTML = '<div class="empty"><div class="big">📖</div><p>Chọn một giáo trình bên trái.</p></div>'; return; }
        const units = c.units || [];
        const words = units.reduce((n, u) => n + (u.wordCount || 0), 0);
        const gram = units.reduce((n, u) => n + (u.grammarCount || 0), 0);
        let num = 0;
        const body = groupedUnits(c).map(g => {
            const head = g.stage === NO_STAGE
                ? (c.stages && c.stages.length ? `<div class="stage-h"><h3>Chưa phân giai đoạn</h3><div class="line"></div></div>` : '')
                : `<div class="stage-h"><h3>${esc(g.stage)}</h3><div class="line"></div>
                    <button class="btn ghost sm" title="Thêm bài vào giai đoạn này" onclick="CA.createLesson(${arg(g.stage)})">＋ Bài</button>
                    <button class="btn ghost sm" title="Đổi tên" onclick="CA.renameStage(${arg(g.stage)})">✎</button>
                    <button class="btn ghost sm danger" title="Xóa giai đoạn" onclick="CA.deleteStage(${arg(g.stage)})">🗑</button></div>`;
            const rows = g.items.length ? g.items.map(({ u, idx }) => {
                num++;
                return `<div class="lesson-row" onclick="CA.openLesson(${arg(u.id)})">
                    <span class="n">${num}</span>
                    <span class="t">${esc(u.title)}</span>
                    <span class="c">${u.wordCount || 0} từ · ${u.grammarCount || 0} NP${u.dialogueCount ? ' · ' + u.dialogueCount + ' HT' : ''}</span>
                    <span class="ops" onclick="event.stopPropagation()">
                        <button class="btn ghost sm" title="Lên" ${idx === 0 ? 'disabled' : ''} onclick="CA.moveLesson(${idx},-1)">↑</button>
                        <button class="btn ghost sm" title="Xuống" ${idx === units.length - 1 ? 'disabled' : ''} onclick="CA.moveLesson(${idx},1)">↓</button>
                        <button class="btn ghost sm danger" title="Xóa bài" onclick="CA.deleteLesson(${arg(u.id)})">🗑</button>
                    </span></div>`;
            }).join('') : `<div class="hint" style="padding:6px 4px">Chưa có bài nào.</div>`;
            return `<div class="stage">${head}${rows}</div>`;
        }).join('');

        $('main').innerHTML = `
            <div class="cur-head">
                <span class="ic">${esc(c.icon || '📘')}</span>
                <div style="min-width:0">
                    <h1>${esc(c.title)}</h1>
                    <div><span class="badge">${esc(LEVELS[c.level] || '')}</span> <span class="badge ${esc(c.visibility || 'private')}">${VIS[c.visibility || 'private']}</span></div>
                    ${c.description ? `<p class="desc">${esc(c.description)}</p>` : ''}
                    <div class="stats"><span>📄 ${units.length} bài</span><span>🔤 ${words} từ vựng</span><span>📗 ${gram} ngữ pháp</span>
                        ${c.source && c.source.folderName ? `<span>⭐ Chuyển từ lớp “${esc(c.source.folderName)}”</span>` : ''}</div>
                </div>
                <div class="actions">
                    <button class="btn" onclick="CA.editCurriculum()">✎ Thông tin</button>
                    <button class="btn" onclick="CA.importMedia()" title="Nhập file ảnh minh họa (tranh từ vựng, tranh hội thoại)">🖼 Nhập ảnh</button>
                    <button class="btn" onclick="CA.exportJson()">⬇ Xuất JSON</button>
                    <button class="btn danger" onclick="CA.deleteCurriculum()">🗑 Xóa</button>
                </div>
            </div>
            <div class="panel-b" style="border-top:1px solid var(--border)">
                <div class="toolbar">
                    <button class="btn primary" onclick="CA.createLesson('')">＋ Bài học</button>
                    <button class="btn" onclick="CA.createStage()">＋ Giai đoạn</button>
                    <span class="grow"></span>
                    <span class="hint">Bấm vào một bài để soạn từ vựng & ngữ pháp.</span>
                </div>
                ${body}
            </div>`;
    }

    async function saveUnits(units, extra) {
        const c = S.cur;
        await curCol().doc(c.id).update({ units, ...(extra || {}), version: FV.increment(1), updatedAt: FV.serverTimestamp() });
        c.units = units;
        if (extra) Object.assign(c, extra);
        c.version = (c.version || 0) + 1;
    }

    async function moveLesson(idx, dir) {
        const units = clone(S.cur.units || []);
        const j = idx + dir;
        if (j < 0 || j >= units.length) return;
        // Đổi chỗ trong cùng giai đoạn; nếu khác giai đoạn thì bài đi theo sang giai đoạn kia
        [units[idx], units[j]] = [units[j], units[idx]];
        const moved = units[j];
        if (moved.stage !== units[idx].stage) {
            moved.stage = units[idx].stage;
            try { await curCol().doc(S.cur.id).collection('lessons').doc(moved.id).update({ stage: moved.stage }); } catch (err) { return fail(err); }
        }
        try { await saveUnits(units); renderCurriculum(); } catch (err) { fail(err); }
    }

    async function createStage() {
        const { value } = await Swal.fire({
            title: '＋ Giai đoạn mới', input: 'text', inputPlaceholder: 'VD: Giai đoạn 1 — Bài 1–5',
            showCancelButton: true, confirmButtonText: 'Thêm', cancelButtonText: 'Hủy',
            preConfirm: (v) => {
                v = (v || '').trim();
                if (!v) { Swal.showValidationMessage('Nhập tên giai đoạn'); return false; }
                if ((S.cur.stages || []).includes(v)) { Swal.showValidationMessage('Giai đoạn đã tồn tại'); return false; }
                return v;
            }
        });
        if (!value) return;
        try {
            const stages = [...(S.cur.stages || []), value];
            await curCol().doc(S.cur.id).update({ stages, updatedAt: FV.serverTimestamp() });
            S.cur.stages = stages; renderCurriculum();
        } catch (err) { fail(err); }
    }

    async function restageLessons(fromStage, toStage) {
        const units = clone(S.cur.units || []);
        const ref = curCol().doc(S.cur.id);
        const ops = [];
        units.forEach(u => { if (u.stage === fromStage) { u.stage = toStage; ops.push(b => b.update(ref.collection('lessons').doc(u.id), { stage: toStage })); } });
        await commitInChunks(ops);
        return units;
    }

    async function renameStage(oldName) {
        const { value } = await Swal.fire({
            title: '✎ Đổi tên giai đoạn', input: 'text', inputValue: oldName,
            showCancelButton: true, confirmButtonText: 'Lưu', cancelButtonText: 'Hủy',
            preConfirm: (v) => {
                v = (v || '').trim();
                if (!v) { Swal.showValidationMessage('Nhập tên giai đoạn'); return false; }
                if (v !== oldName && (S.cur.stages || []).includes(v)) { Swal.showValidationMessage('Giai đoạn đã tồn tại'); return false; }
                return v;
            }
        });
        if (!value || value === oldName) return;
        try {
            loading('Đang đổi tên…');
            const units = await restageLessons(oldName, value);
            await saveUnits(units, { stages: (S.cur.stages || []).map(s => s === oldName ? value : s) });
            Swal.close(); renderCurriculum();
        } catch (err) { fail(err); }
    }

    async function deleteStage(name) {
        const n = (S.cur.units || []).filter(u => u.stage === name).length;
        const r = await Swal.fire({
            icon: 'question', title: 'Xóa giai đoạn “' + name + '”?',
            text: n ? `${n} bài trong giai đoạn này sẽ chuyển sang "Chưa phân giai đoạn" (không bị xóa).` : 'Giai đoạn đang trống.',
            showCancelButton: true, confirmButtonText: 'Xóa giai đoạn', cancelButtonText: 'Hủy', confirmButtonColor: '#dc2626'
        });
        if (!r.isConfirmed) return;
        try {
            loading();
            const units = await restageLessons(name, NO_STAGE);
            await saveUnits(units, { stages: (S.cur.stages || []).filter(s => s !== name) });
            Swal.close(); renderCurriculum();
        } catch (err) { fail(err); }
    }

    // ------------------------------------------------------------------ bài học
    async function createLesson(stage) {
        if (!(await confirmDiscard())) return;
        const c = S.cur;
        const { value } = await Swal.fire({
            title: '＋ Bài học mới', width: 'min(480px, 94vw)',
            html: `<div class="sw-form">
                <div class="field"><label>Tên bài</label><input id="fLTitle" placeholder="VD: Bài 1. 소개 — Giới thiệu"></div>
                <div class="field"><label>Giai đoạn</label><select id="fLStage">${stageOptions(c.stages || [], stage || NO_STAGE)}</select></div>
            </div>`,
            showCancelButton: true, confirmButtonText: 'Tạo & soạn', cancelButtonText: 'Hủy', focusConfirm: false,
            didOpen: () => $('fLTitle').focus(),
            preConfirm: () => {
                const title = $('fLTitle').value.trim();
                if (!title) { Swal.showValidationMessage('Nhập tên bài'); return false; }
                return { title, stage: $('fLStage').value };
            }
        });
        if (!value) return;
        try {
            const id = newId('l_');
            const units = clone(c.units || []);
            // Chèn ngay sau bài cuối cùng của cùng giai đoạn để danh sách không bị xáo trộn
            let at = units.length;
            for (let i = units.length - 1; i >= 0; i--) { if (units[i].stage === value.stage) { at = i + 1; break; } }
            units.splice(at, 0, { id, title: value.title, stage: value.stage, wordCount: 0, grammarCount: 0 });
            const b = db.batch();
            b.set(curCol().doc(c.id).collection('lessons').doc(id), {
                title: value.title, stage: value.stage, words: [], grammar: [], version: 1, updatedAt: FV.serverTimestamp()
            });
            b.update(curCol().doc(c.id), { units, version: FV.increment(1), updatedAt: FV.serverTimestamp() });
            await b.commit();
            c.units = units;
            renderSidebar();
            await openLesson(id, true);
        } catch (err) { fail(err); }
    }

    async function deleteLesson(id) {
        const u = (S.cur.units || []).find(x => x.id === id);
        if (!u) return;
        const r = await Swal.fire({
            icon: 'warning', title: 'Xóa bài “' + u.title + '”?',
            text: `${u.wordCount || 0} từ vựng và ${u.grammarCount || 0} ngữ pháp của bài sẽ bị xóa vĩnh viễn, không khôi phục được.`,
            showCancelButton: true, confirmButtonText: 'Xóa vĩnh viễn', cancelButtonText: 'Hủy', confirmButtonColor: '#dc2626'
        });
        if (!r.isConfirmed) return;
        try {
            const units = (S.cur.units || []).filter(x => x.id !== id);
            const media = await curCol().doc(S.cur.id).collection('media').where('lesson', '==', id).get();
            const b = db.batch();
            media.docs.forEach(d => b.delete(d.ref));
            b.delete(curCol().doc(S.cur.id).collection('lessons').doc(id));
            b.update(curCol().doc(S.cur.id), { units, version: FV.increment(1), updatedAt: FV.serverTimestamp() });
            await b.commit();
            S.cur.units = units;
            if (S.lesson && S.lesson.id === id) { S.lesson = null; S.dirty = false; }
            renderSidebar(); renderCurriculum();
            toast('Đã xóa bài');
        } catch (err) { fail(err); }
    }

    async function openLesson(id, skipConfirm) {
        if (!skipConfirm && !(await confirmDiscard())) return;
        try {
            const d = await curCol().doc(S.cur.id).collection('lessons').doc(id).get();
            if (!d.exists) return Swal.fire('Không tìm thấy bài', 'Bài học này không còn tồn tại.', 'warning');
            const data = d.data();
            S.lesson = {
                id, title: data.title || '', stage: data.stage || NO_STAGE, version: data.version || 0,
                words: clone(data.words || []), grammar: clone(data.grammar || []), dialogues: clone(data.dialogues || [])
            };
            S.dirty = false;
            S.media = {};
            renderLesson();
            loadLessonMedia(id);
        } catch (err) { fail(err); }
    }

    async function backToCurriculum() {
        if (!(await confirmDiscard())) return;
        S.lesson = null;
        renderCurriculum();
    }

    function markDirty() {
        S.dirty = true;
        const st = $('saveStatus');
        if (st) { st.textContent = '● Có thay đổi chưa lưu'; st.classList.add('dirty'); }
    }

    function renderLesson() {
        const L = S.lesson, c = S.cur;
        const idx = (c.units || []).findIndex(u => u.id === L.id);
        $('main').innerHTML = `
            <div class="crumbs"><a onclick="CA.backToCurriculum()">${esc(c.icon || '📘')} ${esc(c.title)}</a> <span>›</span> <span>Bài ${idx + 1}</span></div>
            <div class="editor-head">
                <div class="field"><label>Tên bài</label><input id="lTitle" value="${esc(L.title)}"></div>
                <div class="field"><label>Giai đoạn</label><select id="lStage">${stageOptions(c.stages || [], L.stage)}</select></div>
                <div style="display:flex;gap:6px">
                    <a class="btn" href="lesson.html?c=${encodeURIComponent(c.id)}&l=${encodeURIComponent(L.id)}" target="_blank" rel="noopener" title="Mở trang học của bài này (bản đã lưu)">👁 Xem</a>
                    <button class="btn danger" onclick="CA.deleteLesson(${arg(L.id)})">🗑 Xóa bài</button></div>
            </div>
            <div class="tabs">
                <button class="tab ${S.tab === 'words' ? 'active' : ''}" data-tab="words" onclick="CA.switchTab('words')">🔤 Từ vựng (<span id="wCount">${L.words.length}</span>)</button>
                <button class="tab ${S.tab === 'grammar' ? 'active' : ''}" data-tab="grammar" onclick="CA.switchTab('grammar')">📗 Ngữ pháp (<span id="gCount">${L.grammar.length}</span>)</button>
                <button class="tab ${S.tab === 'dialogues' ? 'active' : ''}" data-tab="dialogues" onclick="CA.switchTab('dialogues')">💬 Hội thoại (<span id="dCount">${L.dialogues.length}</span>)</button>
            </div>
            <div class="tab-b" id="tabBody"></div>
            <div class="savebar">
                <span class="status" id="saveStatus">Đã lưu · phiên bản ${L.version}</span>
                <button class="btn" onclick="CA.backToCurriculum()">← Danh sách bài</button>
                <button class="btn primary" id="saveBtn" onclick="CA.saveLesson()">💾 Lưu bài</button>
            </div>`;
        $('lTitle').addEventListener('input', e => { L.title = e.target.value; markDirty(); });
        $('lStage').addEventListener('change', e => { L.stage = e.target.value; markDirty(); });
        renderTab();
    }

    function switchTab(t) {
        S.tab = t;
        document.querySelectorAll('.tab').forEach(el => el.classList.toggle('active', el.dataset.tab === t));
        renderTab();
    }
    function renderTab() {
        if (S.tab === 'grammar') renderGrammar();
        else if (S.tab === 'dialogues') renderDialogues();
        else renderWords();
    }

    // ---------- tab hội thoại
    // Định dạng soạn thảo (mỗi câu một dòng):
    //   A: 안녕하세요?
    //   = Xin chào?            ← dòng bắt đầu bằng "=" là bản dịch của câu ngay trên
    //   B: 네, 안녕하세요.
    // Dòng không có "Tên:" được nối vào câu trước (hoặc thành lời dẫn nếu là dòng đầu).
    function parseScript(text) {
        const lines = [];
        String(text || '').split(/\r?\n/).forEach(raw => {
            const s = raw.trim();
            if (!s) return;
            if (/^[=＝]/.test(s)) {
                const vi = s.replace(/^[=＝]\s*/, '');
                if (lines.length) lines[lines.length - 1].vi = (lines[lines.length - 1].vi ? lines[lines.length - 1].vi + ' ' : '') + vi;
                return;
            }
            // Dòng nằm trọn trong ngoặc, VD "(…)" hay "(두 사람이 웃는다)" → lời dẫn / chuyển cảnh
            if (/^[(（][^)）]*[)）]$/.test(s)) { lines.push({ s: '', kr: s, vi: '' }); return; }
            const m = s.match(/^([^:：]{1,15})\s*[:：]\s*(.+)$/);
            if (m && !/[.?!。]/.test(m[1]) && !/^\d+$/.test(m[1].trim())) lines.push({ s: m[1].trim(), kr: m[2].trim(), vi: '' });
            else if (lines.length && lines[lines.length - 1].s) lines[lines.length - 1].kr += ' ' + s;
            else lines.push({ s: '', kr: s, vi: '' });
        });
        return lines;
    }
    function serializeScript(lines) {
        return (lines || []).map(l => (l.s ? l.s + ': ' : '') + l.kr + (l.vi ? '\n= ' + l.vi : '')).join('\n');
    }

    function renderDialogues() {
        const D = S.lesson.dialogues;
        $('dCount') && ($('dCount').textContent = D.length);
        $('tabBody').innerHTML = `
            <div class="toolbar">
                <button class="btn primary" onclick="CA.addDialogue()">＋ Thêm đoạn hội thoại</button>
                <span class="grow"></span>
                <span class="hint">Mỗi câu một dòng dạng <code>A: 안녕하세요?</code>, dòng <code>= …</code> ngay dưới là bản dịch, dòng <code>(…)</code> là lời dẫn / chuyển cảnh.</span>
            </div>
            ${D.length ? D.map((d, i) => `<div class="panel" style="margin-bottom:12px">
                <div class="panel-h">
                    <h2>💬 Đoạn ${i + 1}</h2>
                    <span>
                        ${picButton(d.id, i, "dialogue")}
                        <button class="btn ghost sm" ${i === 0 ? 'disabled' : ''} onclick="CA.moveDialogue(${i},-1)">↑</button>
                        <button class="btn ghost sm" ${i === D.length - 1 ? 'disabled' : ''} onclick="CA.moveDialogue(${i},1)">↓</button>
                        <button class="btn ghost sm danger" onclick="CA.removeDialogue(${i})">✕</button>
                    </span>
                </div>
                <div class="panel-b" style="display:grid;gap:10px">
                    <div class="editor-head" style="padding:0;grid-template-columns:1fr 1fr">
                        <div class="field"><label>Tiêu đề (tùy chọn)</label><input data-d="${i}" data-f="title" value="${esc(d.title || '')}" placeholder="VD: 말하기 1 — Ở quán cà phê"></div>
                        <div class="field"><label>Link audio mp3 (tùy chọn)</label><input data-d="${i}" data-f="audio" value="${esc(d.audio || '')}" placeholder="https://… (để trống thì web tự đọc)"></div>
                    </div>
                    <div class="field"><label>Kịch bản</label>
                        <textarea data-d="${i}" data-f="script" rows="8" class="kr" placeholder="A: 안녕하세요? 저는 마리코예요.&#10;= Xin chào, tôi là Mariko.&#10;B: 안녕하세요? 저는 스티븐이에요.">${esc(serializeScript(d.lines))}</textarea></div>
                    <div class="hint" id="dInfo${i}">${dialogueInfo(d)}</div>
                </div></div>`).join('')
                : `<div class="empty" style="padding:30px"><p>Chưa có hội thoại. Bấm <b>＋ Thêm đoạn hội thoại</b> rồi dán kịch bản.</p></div>`}`;
        $('tabBody').querySelectorAll('[data-d]').forEach(el => el.addEventListener('input', () => {
            const d = D[+el.dataset.d];
            if (el.dataset.f === 'script') d.lines = parseScript(el.value);
            else d[el.dataset.f] = el.value;
            const info = $('dInfo' + el.dataset.d); if (info) info.innerHTML = dialogueInfo(d);
            markDirty();
        }));
    }
    function dialogueInfo(d) {
        const lines = d.lines || [];
        if (!lines.length) return 'Chưa có câu nào.';
        const speakers = [...new Set(lines.map(l => l.s).filter(Boolean))];
        const noVi = lines.filter(l => !l.vi).length;
        return `${lines.length} câu · nhân vật: ${speakers.length ? speakers.map(esc).join(', ') : '(không có)'}` +
            (noVi ? ` · <span style="color:var(--warn)">${noVi} câu chưa có bản dịch</span>` : ' · đủ bản dịch');
    }
    function addDialogue() { S.lesson.dialogues.push({ id: newId('d'), title: '', audio: '', lines: [] }); markDirty(); renderDialogues(); }
    function moveDialogue(i, d) {
        const D = S.lesson.dialogues, j = i + d;
        if (j < 0 || j >= D.length) return;
        [D[i], D[j]] = [D[j], D[i]]; markDirty(); renderDialogues();
    }
    async function removeDialogue(i) {
        const r = await Swal.fire({ icon: 'question', title: 'Xóa đoạn hội thoại này?', showCancelButton: true, confirmButtonText: 'Xóa', cancelButtonText: 'Hủy', confirmButtonColor: '#dc2626' });
        if (!r.isConfirmed) return;
        S.lesson.dialogues.splice(i, 1); markDirty(); renderDialogues();
    }
    function cleanDialogue(d) {
        return {
            id: d.id || newId('d'), title: String(d.title || '').trim(), audio: String(d.audio || '').trim(),
            lines: (d.lines || []).map(l => ({ s: String(l.s || '').trim(), kr: String(l.kr || '').trim(), vi: String(l.vi || '').trim() })).filter(l => l.kr)
        };
    }

    // ---------- ảnh minh họa của bài (curricula/{id}/media) — lưu ngay, không cần bấm "Lưu bài"
    // Giá trị ảnh: link https://… hoặc data:image/… (ảnh chọn từ máy / dán từ clipboard, đã thu nhỏ)
    async function loadLessonMedia(lid) {
        try {
            const snap = await curCol().doc(S.cur.id).collection('media').where('lesson', '==', lid).get();
            const items = {};
            snap.docs.forEach(d => Object.assign(items, d.data().items || {}));
            if (!S.lesson || S.lesson.id !== lid) return;
            S.media = items;
            renderTab();
        } catch (err) { console.warn('Không tải được ảnh của bài:', err); }
    }
    async function writeLessonMedia(lid, items) {
        const media = curCol().doc(S.cur.id).collection('media');
        const old = await media.where('lesson', '==', lid).get();
        const docs = []; let cur = {}, size = 0;
        Object.entries(items).forEach(([id, url]) => {
            if (size + url.length > MEDIA_DOC_BYTES && Object.keys(cur).length) { docs.push(cur); cur = {}; size = 0; }
            cur[id] = url; size += url.length + id.length;
        });
        if (Object.keys(cur).length) docs.push(cur);
        const ops = old.docs.map(d => b => b.delete(d.ref));
        docs.forEach((it, part) => ops.push(b => b.set(media.doc(`${lid}_${part}`), { lesson: lid, part, items: it })));
        await commitInChunks(ops);
    }
    function picButton(id, i, kind) {
        const u = (S.media || {})[id];
        const title = kind === 'dialogue' ? 'Tranh minh họa đoạn hội thoại' : 'Ảnh minh họa của từ';
        return u
            ? `<button class="pic-btn has" title="${title} — bấm để đổi" onclick="CA.editImage('${kind}',${i})"><img src="${esc(u)}" alt=""></button>`
            : `<button class="pic-btn" title="${title} — bấm để thêm" onclick="CA.editImage('${kind}',${i})">🖼</button>`;
    }
    const isImageValue = (v) => /^https:\/\/\S+$/i.test(v) || /^data:image\/(png|jpe?g|gif|webp);base64,/i.test(v);
    function loadImage(src) {
        return new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => rej(new Error('load')); im.src = src; });
    }
    async function shrinkToDataUrl(src, maxSide) {
        const im = await loadImage(src);
        const k = Math.min(1, maxSide / Math.max(im.naturalWidth, im.naturalHeight));
        const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(im.naturalWidth * k)); c.height = Math.max(1, Math.round(im.naturalHeight * k));
        const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(im, 0, 0, c.width, c.height);
        return c.toDataURL('image/jpeg', 0.8);
    }
    const readFileAsDataUrl = (f) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(f); });

    async function editImage(kind, i) {
        const L = S.lesson; if (!L) return;
        const item = kind === 'dialogue' ? L.dialogues[i] : L.words[i];
        if (!item) return;
        if (!item.id) item.id = newId(kind === 'dialogue' ? 'd' : 'w');
        const label = kind === 'dialogue' ? (item.title || 'Đoạn ' + (i + 1)) : (item.word || 'Từ ' + (i + 1));
        const maxSide = kind === 'dialogue' ? 720 : 300;
        const current = (S.media || {})[item.id] || '';
        let value = current;
        const res = await Swal.fire({
            title: '🖼 Ảnh: ' + esc(label), width: 'min(560px, 96vw)',
            html: `<div class="sw-form">
                <div class="img-prev" id="imgPrev">${current ? `<img src="${esc(current)}" alt="">` : '<span class="hint">Chưa có ảnh</span>'}</div>
                <div class="field"><label>Dán link ảnh (https://…)</label>
                    <input id="imgUrl" value="${current.startsWith('https://') ? esc(current) : ''}" placeholder="https://…/anh.jpg"></div>
                <div class="hint">Hoặc <label class="btn sm" style="display:inline-flex;cursor:pointer">📁 Chọn ảnh từ máy<input type="file" id="imgFile" accept="image/*" style="display:none"></label>
                    — hoặc bấm vào ô này rồi <b>Ctrl+V</b> để dán ảnh vừa copy. Ảnh từ máy được thu nhỏ còn ${maxSide}px.</div>
                <div class="hint">Mẹo: link phải là link trực tiếp tới file ảnh (chuột phải vào ảnh → "Sao chép địa chỉ hình ảnh").</div>
            </div>`,
            showCancelButton: true, showDenyButton: !!current,
            confirmButtonText: 'Lưu ảnh', denyButtonText: 'Xóa ảnh', cancelButtonText: 'Hủy', focusConfirm: false,
            didOpen: (popup) => {
                // tìm trong chính hộp thoại này (hộp thoại có thể đã bị thay nếu người dùng bấm quá nhanh)
                const q = (id) => popup.querySelector("#" + id);
                const prev = q("imgPrev"), url = q("imgUrl"), file = q("imgFile");
                if (!prev || !url || !file) return;
                const show = (src) => { value = src; prev.innerHTML = src ? `<img src="${esc(src)}" alt="">` : '<span class="hint">Chưa có ảnh</span>'; };
                const fromBlob = async (blob) => {
                    try { show(await shrinkToDataUrl(await readFileAsDataUrl(blob), maxSide)); url.value = ''; }
                    catch (e) { Swal.showValidationMessage('Không đọc được file ảnh này'); }
                };
                url.addEventListener('input', e => { const v = e.target.value.trim(); if (v) show(v); });
                file.addEventListener('change', e => { const f = e.target.files[0]; if (f) fromBlob(f); });
                popup.addEventListener('paste', e => {
                    const f = [...((e.clipboardData || {}).items || [])].find(x => x.kind === 'file' && x.type.startsWith('image/'));
                    if (f) { e.preventDefault(); fromBlob(f.getAsFile()); }
                });
            },
            preConfirm: async () => {
                // ô link có chữ thì ưu tiên link (đọc thẳng từ ô, không phụ thuộc sự kiện input)
                const v = String((($('imgUrl') || {}).value || '').trim() || value || '').trim();
                if (!v) { Swal.showValidationMessage('Chưa có ảnh: dán link, chọn file hoặc Ctrl+V'); return false; }
                if (!isImageValue(v)) { Swal.showValidationMessage('Link phải bắt đầu bằng https:// (hoặc dùng ảnh từ máy)'); return false; }
                try { await loadImage(v); } catch (e) { Swal.showValidationMessage('Không tải được ảnh từ link này — hãy dùng link trực tiếp tới file ảnh'); return false; }
                return v;
            }
        });
        if (!res.isConfirmed && !res.isDenied) return;
        const items = Object.assign({}, S.media || {});
        if (res.isDenied) delete items[item.id]; else items[item.id] = res.value;
        try {
            loading('Đang lưu ảnh…');
            await writeLessonMedia(L.id, items);
            S.media = items;
            Swal.close();
            toast(res.isDenied ? 'Đã xóa ảnh' : 'Đã lưu ảnh');
            renderTab();
        } catch (err) { fail(err); }
    }

    // ---------- tab từ vựng
    function renderWords() {
        const W = S.lesson.words;
        const seen = {}, dup = new Set();
        W.forEach((w, i) => { const k = normWord(w.word); if (!k) return; if (k in seen) { dup.add(i); dup.add(seen[k]); } else seen[k] = i; });
        $('wCount') && ($('wCount').textContent = W.length);
        const rows = W.map((w, i) => `<tr class="${dup.has(i) ? 'dup' : ''}" title="${dup.has(i) ? 'Từ bị trùng trong bài' : ''}">
            <td class="idx">${i + 1}</td>
            <td class="pic">${picButton(w.id, i, "word")}</td>
            <td><input class="kr" data-i="${i}" data-f="word" value="${esc(w.word)}" placeholder="단어"></td>
            <td><input data-i="${i}" data-f="meaning" value="${esc(w.meaning)}" placeholder="Nghĩa"></td>
            <td class="col-ex"><input class="kr" data-i="${i}" data-f="ex_kr" value="${esc(w.ex_kr)}" placeholder="예문"></td>
            <td class="col-ex"><input data-i="${i}" data-f="ex_vn" value="${esc(w.ex_vn)}" placeholder="Dịch ví dụ"></td>
            <td class="ops">
                <button class="btn ghost sm" ${i === 0 ? 'disabled' : ''} onclick="CA.moveWord(${i},-1)">↑</button>
                <button class="btn ghost sm" ${i === W.length - 1 ? 'disabled' : ''} onclick="CA.moveWord(${i},1)">↓</button>
                <button class="btn ghost sm danger" onclick="CA.removeWord(${i})">✕</button>
            </td></tr>`).join('');
        $('tabBody').innerHTML = `
            <div class="toolbar">
                <button class="btn primary" onclick="CA.addWordRow()">＋ Thêm dòng</button>
                <button class="btn" onclick="CA.bulkPaste()">📋 Dán danh sách</button>
                ${dup.size ? `<button class="btn" onclick="CA.removeDuplicates()">🧹 Xóa ${dup.size} dòng trùng</button>` : ''}
                <span class="grow"></span>
                <span class="hint">Ô vàng = từ bị trùng. Dòng để trống từ sẽ bị bỏ khi lưu. Bấm 🖼 để thêm / đổi ảnh (lưu ngay).</span>
            </div>
            ${W.length ? `<div style="overflow-x:auto"><table class="words">
                <thead><tr><th>#</th><th title="Ảnh minh họa">Ảnh</th><th>Từ (한국어)</th><th>Nghĩa</th><th class="col-ex">Ví dụ</th><th class="col-ex">Dịch ví dụ</th><th></th></tr></thead>
                <tbody id="wordsBody">${rows}</tbody></table></div>`
                : `<div class="empty" style="padding:30px"><p>Chưa có từ vựng. Bấm <b>📋 Dán danh sách</b> để thêm nhanh nhiều từ.</p></div>`}`;
        const body = $('wordsBody');
        if (body) {
            body.addEventListener('input', e => {
                const t = e.target; if (!t.dataset || t.dataset.i == null) return;
                W[+t.dataset.i][t.dataset.f] = t.value; markDirty();
            });
            body.addEventListener('keydown', e => {
                // Enter ở ô cuối cùng → thêm dòng mới
                if (e.key === 'Enter' && e.target.dataset && +e.target.dataset.i === W.length - 1) { e.preventDefault(); addWordRow(); }
            });
        }
    }

    function addWordRow() {
        S.lesson.words.push({ id: newId('w'), word: '', meaning: '', ex_kr: '', ex_vn: '' });
        markDirty(); renderWords();
        const inputs = document.querySelectorAll('#wordsBody input[data-f="word"]');
        if (inputs.length) inputs[inputs.length - 1].focus();
    }
    function moveWord(i, d) {
        const W = S.lesson.words, j = i + d;
        if (j < 0 || j >= W.length) return;
        [W[i], W[j]] = [W[j], W[i]]; markDirty(); renderWords();
    }
    function removeWord(i) { S.lesson.words.splice(i, 1); markDirty(); renderWords(); }
    function removeDuplicates() {
        const seen = new Set();
        S.lesson.words = S.lesson.words.filter(w => { const k = normWord(w.word); if (!k) return true; if (seen.has(k)) return false; seen.add(k); return true; });
        markDirty(); renderWords();
    }

    // Dán: mỗi dòng "từ<TAB>nghĩa[<TAB>ví dụ<TAB>dịch]" hoặc "từ : nghĩa" / "từ - nghĩa" / "từ = nghĩa"
    function parseLine(line) {
        let s = line.replace(/^\s*(\d+[.)]|[-•*])\s+/, '').trim();
        if (!s) return null;
        let parts;
        if (s.includes('\t')) parts = s.split('\t').map(x => x.trim());
        else {
            const m = s.match(/^(.+?)\s*(?:\s[-–—]\s|:|=)\s*(.+)$/);
            parts = m ? [m[1].trim(), m[2].trim()] : [s];
        }
        const [word, meaning, ex_kr, ex_vn] = parts;
        if (!word || !meaning) return { bad: true, raw: line };
        return { word: normWord(word), meaning, ex_kr: ex_kr || '', ex_vn: ex_vn || '' };
    }
    function parsePaste(text, skipExisting) {
        const existing = new Set(S.lesson.words.map(w => normWord(w.word)));
        const out = [], seen = new Set();
        text.split(/\r?\n/).forEach(line => {
            const p = parseLine(line);
            if (!p) return;
            if (p.bad) return out.push(p);
            if (seen.has(p.word) || (skipExisting && existing.has(p.word))) return out.push({ ...p, skip: true });
            seen.add(p.word); out.push(p);
        });
        return out;
    }

    async function bulkPaste() {
        const preview = () => {
            const items = parsePaste($('pasteArea').value, $('pasteSkip').checked);
            const ok = items.filter(x => !x.bad && !x.skip).length;
            $('pasteSummary').textContent = items.length ? `${ok} từ sẽ được thêm` +
                (items.some(x => x.skip) ? ` · ${items.filter(x => x.skip).length} trùng (bỏ qua)` : '') +
                (items.some(x => x.bad) ? ` · ${items.filter(x => x.bad).length} dòng lỗi` : '') : '';
            $('pastePreview').innerHTML = items.slice(0, 200).map(x => x.bad
                ? `<div class="bad">⚠ Không tách được nghĩa: ${esc(x.raw)}</div>`
                : `<div class="${x.skip ? 'skip' : ''}"><b class="kr">${esc(x.word)}</b><span>${esc(x.meaning)}</span>${x.skip ? '<span>(trùng)</span>' : ''}</div>`).join('');
        };
        const { value } = await Swal.fire({
            title: '📋 Dán danh sách từ vựng', width: 'min(720px, 96vw)',
            html: `<div class="sw-form">
                <div class="hint">Mỗi dòng một từ. Dán thẳng từ Excel/Google Sheets (cột: Từ | Nghĩa | Ví dụ | Dịch ví dụ),
                    hoặc gõ dạng <code>사과 : quả táo</code>, <code>사과 - quả táo</code>, <code>사과 = quả táo</code>.</div>
                <textarea id="pasteArea" rows="10" class="kr" placeholder="학교\ttrường học\n선생님 : giáo viên\n학생 - học sinh"></textarea>
                <label style="display:flex;gap:6px;align-items:center;font-size:.9em"><input type="checkbox" id="pasteSkip" checked style="width:auto"> Bỏ qua từ đã có trong bài</label>
                <div class="hint" id="pasteSummary"></div>
                <div class="paste-preview" id="pastePreview"></div>
            </div>`,
            showCancelButton: true, confirmButtonText: 'Thêm vào bài', cancelButtonText: 'Hủy', focusConfirm: false,
            didOpen: () => { $('pasteArea').addEventListener('input', preview); $('pasteSkip').addEventListener('change', preview); $('pasteArea').focus(); },
            preConfirm: () => {
                const items = parsePaste($('pasteArea').value, $('pasteSkip').checked).filter(x => !x.bad && !x.skip);
                if (!items.length) { Swal.showValidationMessage('Không có từ hợp lệ để thêm'); return false; }
                return items;
            }
        });
        if (!value) return;
        value.forEach(x => S.lesson.words.push({ id: newId('w'), word: x.word, meaning: x.meaning, ex_kr: x.ex_kr, ex_vn: x.ex_vn }));
        markDirty(); renderWords();
        toast(`Đã thêm ${value.length} từ — nhớ bấm Lưu bài`, 'info');
    }

    // ---------- tab ngữ pháp
    function renderGrammar() {
        const G = S.lesson.grammar;
        $('gCount') && ($('gCount').textContent = G.length);
        $('tabBody').innerHTML = `
            <div class="toolbar">
                <button class="btn primary" onclick="CA.pickFromLibrary()">📗 Chọn từ Thư viện ngữ pháp</button>
                <button class="btn" onclick="CA.editGrammar(-1)">✍️ Tự soạn</button>
            </div>
            ${G.length ? G.map((g, i) => `<div class="gram-item">
                <span class="badge">${i + 1}</span>
                <div style="flex:1;min-width:0"><div class="t kr">${esc(g.title)}</div>
                    <div class="src">${g.libId ? '📗 Từ thư viện: ' + esc(g.libId) : '✍️ Tự soạn'}</div></div>
                <button class="btn ghost sm" onclick="CA.previewGrammar(${i})">👁</button>
                <button class="btn ghost sm" onclick="CA.editGrammar(${i})">✎</button>
                <button class="btn ghost sm" ${i === 0 ? 'disabled' : ''} onclick="CA.moveGrammar(${i},-1)">↑</button>
                <button class="btn ghost sm" ${i === G.length - 1 ? 'disabled' : ''} onclick="CA.moveGrammar(${i},1)">↓</button>
                <button class="btn ghost sm danger" onclick="CA.removeGrammar(${i})">✕</button>
            </div>`).join('') : `<div class="empty" style="padding:30px"><p>Chưa có ngữ pháp. Chọn từ thư viện (${libLookup().length} điểm ngữ pháp có sẵn) hoặc tự soạn.</p></div>`}`;
    }

    function grammarFromLib(g) {
        return { id: newId('g'), libId: g.id, title: g.korean + (g.vietnamese ? ' - ' + g.vietnamese : ''), contentHtml: g.content || '' };
    }

    async function pickFromLibrary() {
        const lib = libLookup();
        if (!lib.length) return Swal.fire('Không có thư viện', 'Không tải được grammar-library.js', 'error');
        let added = 0;
        const draw = () => {
            const q = $('libSearch').value.trim().toLowerCase();
            const lv = $('libLevel').value;
            const have = new Set(S.lesson.grammar.map(g => g.libId).filter(Boolean));
            const rows = lib.filter(g => (!lv || String(g.level) === lv) &&
                (!q || (g.korean + ' ' + g.vietnamese + ' ' + g.id).toLowerCase().includes(q)));
            $('libList').innerHTML = rows.length ? rows.map(g => `<div class="lib-row ${have.has(g.id) ? 'added' : ''}">
                <span class="k kr">${esc(g.korean)}</span><span class="v">${esc(g.vietnamese)}</span>
                <span class="badge">${esc(GRAMMAR_LEVELS[g.level] || '')}</span>
                ${have.has(g.id) ? '<span class="badge public">Đã thêm</span>' : `<button class="btn sm" data-add="${esc(g.id)}">＋ Thêm</button>`}
            </div>`).join('') : '<div class="hint" style="padding:12px">Không tìm thấy.</div>';
        };
        await Swal.fire({
            title: '📗 Thư viện ngữ pháp', width: 'min(760px, 96vw)',
            html: `<div class="sw-form">
                <div class="row2"><input id="libSearch" placeholder="Tìm: 은/는, -고 싶다, muốn…">
                    <select id="libLevel"><option value="">Tất cả cấp độ</option>${Object.entries(GRAMMAR_LEVELS).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select></div>
                <div class="lib-list" id="libList"></div>
            </div>`,
            confirmButtonText: 'Xong', focusConfirm: false,
            didOpen: () => {
                $('libSearch').addEventListener('input', draw);
                $('libLevel').addEventListener('change', draw);
                $('libList').addEventListener('click', e => {
                    const id = e.target.dataset && e.target.dataset.add; if (!id) return;
                    const g = lib.find(x => x.id === id); if (!g) return;
                    S.lesson.grammar.push(grammarFromLib(g)); added++; markDirty(); draw();
                });
                draw(); $('libSearch').focus();
            }
        });
        renderGrammar();
        if (added) toast(`Đã thêm ${added} ngữ pháp — nhớ bấm Lưu bài`, 'info');
    }

    function previewGrammar(i) {
        const g = S.lesson.grammar[i];
        Swal.fire({ title: esc(g.title), width: 'min(820px, 96vw)', html: `<div class="gram-preview kr">${g.contentHtml || '<i>(Chưa có nội dung)</i>'}</div>`, confirmButtonText: 'Đóng' });
    }

    async function editGrammar(i) {
        const isNew = i < 0;
        const g = isNew ? { id: newId('g'), libId: null, title: '', contentHtml: '' } : S.lesson.grammar[i];
        const { value } = await Swal.fire({
            title: isNew ? '✍️ Ngữ pháp tự soạn' : '✎ Sửa ngữ pháp', width: 'min(820px, 96vw)',
            html: `<div class="sw-form">
                <div class="field"><label>Tiêu đề</label><input id="gTitle" class="kr" value="${esc(g.title)}" placeholder="VD: -고 싶다 - Muốn làm gì"></div>
                <div class="field"><label>Nội dung (HTML)</label><textarea id="gHtml" rows="14" class="kr" style="font-family:ui-monospace,monospace;font-size:.85em">${esc(g.contentHtml)}</textarea></div>
                ${g.libId ? '<div class="hint">Nội dung lấy từ thư viện. Chỉnh ở đây chỉ áp dụng cho giáo trình này.</div>' : ''}
            </div>`,
            showCancelButton: true, confirmButtonText: 'Xong', cancelButtonText: 'Hủy', focusConfirm: false,
            preConfirm: () => {
                const title = $('gTitle').value.trim();
                if (!title) { Swal.showValidationMessage('Nhập tiêu đề'); return false; }
                return { title, contentHtml: $('gHtml').value };
            }
        });
        if (!value) return;
        Object.assign(g, value);
        if (isNew) S.lesson.grammar.push(g);
        markDirty(); renderGrammar();
    }
    function moveGrammar(i, d) {
        const G = S.lesson.grammar, j = i + d;
        if (j < 0 || j >= G.length) return;
        [G[i], G[j]] = [G[j], G[i]]; markDirty(); renderGrammar();
    }
    function removeGrammar(i) { S.lesson.grammar.splice(i, 1); markDirty(); renderGrammar(); }

    // ---------- lưu bài
    function cleanWord(w) {
        const o = { id: w.id || newId('w'), word: normWord(w.word), meaning: String(w.meaning || '').trim(), ex_kr: String(w.ex_kr || '').trim(), ex_vn: String(w.ex_vn || '').trim() };
        if (w.definition) o.definition = String(w.definition);
        return o;
    }
    function cleanGrammar(g) {
        return { id: g.id || newId('g'), title: String(g.title || '').trim(), contentHtml: String(g.contentHtml || ''), libId: g.libId || null };
    }

    async function saveLesson() {
        const L = S.lesson, c = S.cur;
        const title = L.title.trim();
        if (!title) return Swal.fire('Thiếu tên bài', 'Vui lòng nhập tên bài.', 'info');
        const words = L.words.map(cleanWord).filter(w => w.word);
        const grammar = L.grammar.map(cleanGrammar).filter(g => g.title);
        const dialogues = (L.dialogues || []).map(cleanDialogue).filter(d => d.lines.length);
        const noMeaning = words.filter(w => !w.meaning).length;
        if (noMeaning) {
            const r = await Swal.fire({ icon: 'question', title: `${noMeaning} từ chưa có nghĩa`, text: 'Vẫn lưu?', showCancelButton: true, confirmButtonText: 'Vẫn lưu', cancelButtonText: 'Quay lại sửa' });
            if (!r.isConfirmed) return;
        }
        const payload = { title, stage: L.stage, words, grammar, dialogues, version: (L.version || 0) + 1 };
        if (bytesOf(payload) > MAX_LESSON_BYTES) {
            return Swal.fire('Bài quá lớn', 'Nội dung bài vượt giới hạn ~1MB của Firestore. Hãy tách bớt ngữ pháp sang bài khác.', 'error');
        }
        const btn = $('saveBtn'); btn.disabled = true; btn.textContent = 'Đang lưu…';
        try {
            const units = clone(c.units || []).map(u => u.id === L.id
                ? { ...u, title, stage: L.stage, wordCount: words.length, grammarCount: grammar.length, dialogueCount: dialogues.length } : u);
            const b = db.batch();
            b.set(curCol().doc(c.id).collection('lessons').doc(L.id), { ...payload, updatedAt: FV.serverTimestamp() }, { merge: true });
            b.update(curCol().doc(c.id), { units, version: FV.increment(1), updatedAt: FV.serverTimestamp() });
            await b.commit();
            c.units = units; c.version = (c.version || 0) + 1;
            Object.assign(L, { title, words, grammar, dialogues, version: payload.version });
            S.dirty = false;
            renderSidebar(); renderLesson();
            toast('Đã lưu bài');
        } catch (err) {
            btn.disabled = false; btn.textContent = '💾 Lưu bài';
            fail(err);
        }
    }

    // ------------------------------------------------------------------ tạo giáo trình từ dữ liệu (dùng chung cho Import + Chuyển lớp)
    async function createCurriculumFromData(meta, lessons, source) {
        const curId = newId('cur_');
        const ref = curCol().doc(curId);
        const stages = [];
        const units = [];
        const ops = [];
        lessons.forEach(l => {
            const stage = String(l.stage || '').trim();
            if (stage && !stages.includes(stage)) stages.push(stage);
            const id = newId('l_');
            const words = (l.words || []).map(cleanWord).filter(w => w.word);
            const grammar = (l.grammar || []).map(cleanGrammar).filter(g => g.title);
            const dialogues = (l.dialogues || []).map(cleanDialogue).filter(d => d.lines.length);
            const doc = { title: String(l.title || 'Bài').trim(), stage, words, grammar, dialogues, version: 1 };
            if (bytesOf(doc) > MAX_LESSON_BYTES) throw new Error(`Bài "${doc.title}" vượt giới hạn 1MB — hãy tách nhỏ.`);
            units.push({ id, title: doc.title, stage, wordCount: words.length, grammarCount: grammar.length, dialogueCount: dialogues.length });
            ops.push(b => b.set(ref.collection('lessons').doc(id), { ...doc, updatedAt: FV.serverTimestamp() }));
        });
        await commitInChunks(ops);
        await ref.set({
            title: meta.title, level: meta.level || 'other', icon: meta.icon || '📘', description: meta.description || '',
            visibility: meta.visibility || 'private', order: meta.order ?? 999,
            stages, units, version: 1, ...(source ? { source } : {}),
            ownerUid: auth.currentUser.uid, createdAt: FV.serverTimestamp(), updatedAt: FV.serverTimestamp()
        });
        return curId;
    }

    // ------------------------------------------------------------------ ⭐ Chuyển lớp 1:1 thành giáo trình
    async function convertFromClass() {
        if (!(await confirmDiscard())) return;
        let folders;
        try {
            loading('Đang tải danh sách lớp…');
            const snap = await db.collection('shared_folders').get();
            folders = snap.docs.map(d => ({ id: d.id, ...d.data() }))
                .filter(f => (f.lessons || []).length)
                .sort((a, b) => String(a.name).localeCompare(String(b.name), 'vi'));
            Swal.close();
        } catch (err) { return fail(err); }
        if (!folders.length) return Swal.fire('Chưa có lớp nào', 'Không có thư mục lớp 1:1 nào có bài học.', 'info');

        const { value: folderId } = await Swal.fire({
            title: '⭐ Chọn lớp 1:1 để chuyển', width: 'min(560px, 94vw)',
            html: `<div class="hint" style="text-align:left;margin-bottom:8px">Từ vựng và ngữ pháp của lớp sẽ được <b>sao chép</b> sang một giáo trình mới.
                   Lớp gốc và tiến độ của học viên không bị thay đổi.</div>`,
            input: 'select', inputOptions: Object.fromEntries(folders.map(f => [f.id, `${f.name} (${f.lessons.length} bài)`])),
            showCancelButton: true, confirmButtonText: 'Tiếp tục', cancelButtonText: 'Hủy'
        });
        if (!folderId) return;
        const folder = folders.find(f => f.id === folderId);

        let wordsBy = {}, gramBy = {};
        try {
            loading('Đang đọc nội dung lớp…');
            const fref = db.collection('shared_folders').doc(folderId);
            const [ws, gs] = await Promise.all([fref.collection('words').get(), fref.collection('grammar').get()]);
            ws.docs.forEach(d => {
                const w = d.data();
                if (!w.word || w.word === '__folder_marker__') return;
                (wordsBy[w.listName] = wordsBy[w.listName] || []).push({ ...w, id: d.id });
            });
            gs.docs.forEach(d => {
                if (d.id.startsWith('raw_')) return; // bản nháp dán thô của trình soạn ngữ pháp
                const g = d.data();
                if (!g.title && !g.contentHtml) return;
                (gramBy[g.listName] = gramBy[g.listName] || []).push({ ...g, id: d.id });
            });
            Swal.close();
        } catch (err) { return fail(err); }

        const subs = [...(folder.subFolders || [])].sort((a, b) => b.length - a.length); // ưu tiên tiền tố dài nhất
        const split = (name) => {
            const sf = subs.find(s => name.startsWith(s + '/'));
            return sf ? { stage: sf, title: name.slice(sf.length + 1) } : { stage: '', title: name };
        };
        const lessonNames = folder.lessons;
        const lessonRows = lessonNames.map((n, i) => {
            const p = split(n);
            return `<label><input type="checkbox" data-i="${i}" checked>
                <span>${p.stage ? `<span class="badge">${esc(p.stage)}</span> ` : ''}${esc(p.title)}</span>
                <span class="c">${(wordsBy[n] || []).length} từ · ${(gramBy[n] || []).length} NP</span></label>`;
        }).join('');

        const { value: form } = await Swal.fire({
            title: '⭐ ' + esc(folder.name), width: 'min(640px, 96vw)',
            html: `<div class="sw-form">
                <div class="row2">
                    <div class="field"><label>Tên giáo trình mới</label><input id="cvTitle" value="${esc(folder.name)}"></div>
                    <div class="field"><label>Cấp độ</label><select id="cvLevel">${levelOptions('socap1')}</select></div>
                </div>
                <div class="field"><label>Chọn bài cần chuyển</label>
                    <div style="display:flex;gap:6px;margin-bottom:6px">
                        <button type="button" class="btn sm" id="cvAll">Chọn tất cả</button>
                        <button type="button" class="btn sm" id="cvNone">Bỏ chọn</button></div>
                    <div class="check-list" id="cvList">${lessonRows}</div></div>
                <div class="hint">Giáo trình mới ở chế độ 🔒 Riêng tư. Kiểm tra lại rồi đổi sang 👥 Học viên khi sẵn sàng.</div>
            </div>`,
            showCancelButton: true, confirmButtonText: 'Tạo giáo trình', cancelButtonText: 'Hủy', focusConfirm: false,
            didOpen: () => {
                const set = (v) => document.querySelectorAll('#cvList input').forEach(x => { x.checked = v; });
                $('cvAll').onclick = () => set(true); $('cvNone').onclick = () => set(false);
            },
            preConfirm: () => {
                const title = $('cvTitle').value.trim();
                const picked = [...document.querySelectorAll('#cvList input:checked')].map(x => +x.dataset.i);
                if (!title) { Swal.showValidationMessage('Nhập tên giáo trình'); return false; }
                if (!picked.length) { Swal.showValidationMessage('Chọn ít nhất một bài'); return false; }
                return { title, level: $('cvLevel').value, picked };
            }
        });
        if (!form) return;

        const lib = libLookup();
        const findLib = (title) => {
            const t = String(title || '').trim();
            const g = lib.find(x => t === x.korean || t.startsWith(x.korean + ' - '));
            return g ? g.id : null;
        };
        const lessons = form.picked.map(i => {
            const name = lessonNames[i];
            const p = split(name);
            return {
                title: p.title, stage: p.stage,
                // Giữ nguyên ID từ của lớp gốc → Giai đoạn 2 có thể liên kết lại lớp này mà không mất tiến độ
                words: (wordsBy[name] || []).sort((a, b) => (a.order || 0) - (b.order || 0))
                    .map(w => ({ id: w.id, word: w.word, meaning: w.meaning || '', ex_kr: w.ex_kr || '', ex_vn: w.ex_vn || '', definition: w.definition || '' })),
                grammar: (gramBy[name] || []).sort((a, b) => (a.order || 0) - (b.order || 0))
                    .map(g => ({ id: g.id, title: g.title || '(Không tiêu đề)', contentHtml: g.contentHtml || '', libId: findLib(g.title) }))
            };
        });
        try {
            loading('Đang tạo giáo trình…');
            const id = await createCurriculumFromData(
                { title: form.title, level: form.level, icon: '📘', visibility: 'private', description: '' },
                lessons, { type: 'shared_folder', folderId, folderName: folder.name });
            const nw = lessons.reduce((n, l) => n + l.words.length, 0), ng = lessons.reduce((n, l) => n + l.grammar.length, 0);
            await loadCurricula(id);
            Swal.fire({ icon: 'success', title: 'Đã tạo giáo trình!', html: `<b>${lessons.length}</b> bài · <b>${nw}</b> từ vựng · <b>${ng}</b> ngữ pháp` });
        } catch (err) { fail(err); }
    }

    // ------------------------------------------------------------------ Ảnh minh họa
    // File: { format: 'vht-curriculum-media', items: { <wordId | dialogueId>: 'data:image/jpeg;base64,…' } }
    // Ảnh được ghép theo ID từ / đoạn hội thoại của giáo trình đang mở, gom theo bài,
    // lưu ở curricula/{id}/media/{lessonId}_{n} (mỗi doc < 900KB) — cùng quyền xem với bài học.
    const MEDIA_DOC_BYTES = 850 * 1024;
    async function importMedia() {
        const c = S.cur; if (!c) return;
        if (!(await confirmDiscard())) return;
        const input = $('jsonFileInput');
        input.value = '';
        input.onchange = async () => {
            const file = input.files[0]; if (!file) return;
            let data;
            try { data = JSON.parse(await file.text()); } catch (e) { return Swal.fire('File không hợp lệ', 'Không đọc được JSON.', 'error'); }
            if (!data || data.format !== 'vht-curriculum-media' || !data.items) return Swal.fire('Sai định dạng', 'Đây không phải file ảnh giáo trình.', 'error');
            try {
                loading('Đang ghép ảnh với bài học…');
                const snap = await curCol().doc(c.id).collection('lessons').get();
                const owner = {}; // id → lessonId
                snap.docs.forEach(d => {
                    const L = d.data();
                    (L.words || []).forEach(w => { owner[w.id] = d.id; });
                    (L.dialogues || []).forEach(x => { owner[x.id] = d.id; });
                });
                const byLesson = {}; let unmatched = 0;
                Object.entries(data.items).forEach(([id, url]) => {
                    if (typeof url !== 'string' || !isImageValue(url)) return;
                    const lid = owner[id];
                    if (!lid) { unmatched++; return; }
                    (byLesson[lid] = byLesson[lid] || {})[id] = url;
                });
                const lids = Object.keys(byLesson);
                if (!lids.length) { Swal.close(); return Swal.fire('Không khớp ảnh nào', 'ID trong file ảnh không trùng với từ / hội thoại của giáo trình này.', 'warning'); }
                Swal.close();
                const total = lids.reduce((n, l) => n + Object.keys(byLesson[l]).length, 0);
                const r = await Swal.fire({
                    icon: 'question', title: 'Nhập ảnh minh họa?',
                    html: `<b>${total}</b> ảnh cho <b>${lids.length}</b> bài${unmatched ? `<br><span class="hint">${unmatched} ảnh không khớp sẽ bị bỏ qua</span>` : ''}<br><span class="hint">Ảnh cũ của các bài này sẽ được thay mới.</span>`,
                    showCancelButton: true, confirmButtonText: 'Nhập', cancelButtonText: 'Hủy'
                });
                if (!r.isConfirmed) return;
                loading('Đang lưu ảnh…');
                const media = curCol().doc(c.id).collection('media');
                const old = await media.get();
                const ops = old.docs.filter(d => lids.includes(d.data().lesson)).map(d => b => b.delete(d.ref));
                await commitInChunks(ops);
                for (const lid of lids) {
                    let part = 0, items = {}, size = 0;
                    const flush = async () => { if (!Object.keys(items).length) return; await media.doc(`${lid}_${part}`).set({ lesson: lid, part, items }); part++; items = {}; size = 0; };
                    for (const [id, url] of Object.entries(byLesson[lid])) {
                        if (size + url.length > MEDIA_DOC_BYTES) await flush();
                        items[id] = url; size += url.length + id.length;
                    }
                    await flush();
                }
                Swal.fire({ icon: 'success', title: `Đã nhập ${total} ảnh`, timer: 1800, showConfirmButton: false });
            } catch (err) { fail(err); }
        };
        input.click();
    }

    // ------------------------------------------------------------------ Xuất / Nhập JSON
    async function exportJson() {
        const c = S.cur; if (!c) return;
        if (!(await confirmDiscard())) return;
        try {
            loading('Đang xuất…');
            const snap = await curCol().doc(c.id).collection('lessons').get();
            const byId = Object.fromEntries(snap.docs.map(d => [d.id, d.data()]));
            const lessons = (c.units || []).map(u => byId[u.id]).filter(Boolean)
                .map(l => ({ title: l.title, stage: l.stage || '', words: l.words || [], grammar: l.grammar || [], dialogues: l.dialogues || [] }));
            const data = {
                format: 'vht-curriculum', formatVersion: 1, exportedAt: new Date().toISOString(),
                curriculum: { title: c.title, level: c.level, icon: c.icon, description: c.description || '', visibility: c.visibility, stages: c.stages || [] },
                lessons
            };
            const a = document.createElement('a');
            a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
            a.download = 'giao-trinh-' + c.title.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() + '.json';
            a.click();
            setTimeout(() => URL.revokeObjectURL(a.href), 2000);
            Swal.close();
        } catch (err) { fail(err); }
    }

    async function importJson() {
        if (!(await confirmDiscard())) return;
        const input = $('jsonFileInput');
        input.value = '';
        input.onchange = async () => {
            const file = input.files[0]; if (!file) return;
            let data;
            try { data = JSON.parse(await file.text()); } catch (e) { return Swal.fire('File không hợp lệ', 'Không đọc được JSON.', 'error'); }
            if (!data || data.format !== 'vht-curriculum' || !Array.isArray(data.lessons) || !data.curriculum) {
                return Swal.fire('Sai định dạng', 'File này không phải file giáo trình xuất từ trang này.', 'error');
            }
            const nw = data.lessons.reduce((n, l) => n + (l.words || []).length, 0);
            const r = await Swal.fire({
                icon: 'question', title: 'Nhập giáo trình?',
                html: `<b>${esc(data.curriculum.title)}</b><br>${data.lessons.length} bài · ${nw} từ vựng<br><span class="hint">Sẽ tạo thành một giáo trình mới (🔒 Riêng tư).</span>`,
                showCancelButton: true, confirmButtonText: 'Nhập', cancelButtonText: 'Hủy'
            });
            if (!r.isConfirmed) return;
            try {
                loading('Đang nhập…');
                const meta = { ...data.curriculum, title: data.curriculum.title || file.name, visibility: 'private' };
                const id = await createCurriculumFromData(meta, data.lessons, null);
                // giữ thứ tự giai đoạn của file gốc (kể cả giai đoạn trống)
                if (Array.isArray(data.curriculum.stages) && data.curriculum.stages.length) {
                    const doc = await curCol().doc(id).get();
                    const merged = [...data.curriculum.stages, ...(doc.data().stages || []).filter(s => !data.curriculum.stages.includes(s))];
                    await curCol().doc(id).update({ stages: merged });
                }
                await loadCurricula(id);
                Swal.fire({ icon: 'success', title: 'Đã nhập giáo trình', timer: 1600, showConfirmButton: false });
            } catch (err) { fail(err); }
        };
        input.click();
    }

    window.CA = {
        logout, createCurriculum, openCurriculum, editCurriculum, deleteCurriculum,
        createStage, renameStage, deleteStage, createLesson, deleteLesson, openLesson, moveLesson, backToCurriculum,
        switchTab, addWordRow, moveWord, removeWord, removeDuplicates, bulkPaste,
        pickFromLibrary, previewGrammar, editGrammar, moveGrammar, removeGrammar, saveLesson,
        addDialogue, moveDialogue, removeDialogue, editImage, _parseScript: parseScript,
        convertFromClass, exportJson, importJson, importMedia,
        _parseLine: parseLine // để kiểm thử
    };
})();
