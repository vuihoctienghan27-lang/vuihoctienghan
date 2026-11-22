/* ==========================================================================
   BÀI TRONG LỚP → GIÁO TRÌNH GỐC — vocab.html (mục Giáo trình)
   --------------------------------------------------------------------------
   Bài học của lớp giữ nguyên 3 tab (Từ vựng / Ngữ pháp / Bài tập). Bài nào được gán từ
   Kho giáo trình (shared_folders/{id}.curLinks[curId].lessons[lid].name = tên bài trong lớp)
   có thêm nút "📚 Học theo giáo trình" → lesson/lesson.html?c=…&l=…&from=<lớp>&fl=<bài>.
   Trang giáo trình có nút "← Về bài học trong lớp" quay lại đúng bài này
   (vocab.html?view=classes&f=<lớp>&lesson=<bài> — xem openFromUrl bên dưới).
   Học viên chỉ đọc được giáo trình gán cho lớp mình (curriculum-access.js + firestore.rules).
   ========================================================================== */
(function () {
    'use strict';

    const db = () => firebase.firestore();
    const ST = { key: null };
    const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

    async function findLink(folderId, lessonName) {
        const f = await db().collection('shared_folders').doc(folderId).get();
        const links = (f.exists && f.data().curLinks) || {};
        for (const [cid, l] of Object.entries(links)) {
            for (const [lid, e] of Object.entries((l && l.lessons) || {})) {
                if (e && e.name === lessonName) return { cid, lid, title: (l && l.title) || '' };
            }
        }
        // Giáo viên đổi tên bài trong lớp → dò theo nguồn của từ vựng
        const w = (window.currentSharedWords || []).find(x => x.src && x.src.c && x.src.l && links[x.src.c]);
        return w ? { cid: w.src.c, lid: w.src.l, title: (links[w.src.c] || {}).title || '' } : null;
    }

    function curriculumUrl(link, folderId, lessonName) {
        return `lesson/lesson.html?c=${encodeURIComponent(link.cid)}&l=${encodeURIComponent(link.lid)}` +
            `&from=${encodeURIComponent(folderId)}&fl=${encodeURIComponent(lessonName)}`;
    }

    function addButton(link, folderId, lessonName) {
        const slot = document.getElementById('headerActionBtnSlot');
        if (!slot) return;
        const old = slot.querySelector('[data-cc-go]');
        if (old) old.remove();
        const a = document.createElement('a');
        a.dataset.ccGo = '1';
        a.className = 'btn-create-list';
        a.href = curriculumUrl(link, folderId, lessonName);
        a.title = 'Mở bài gốc trong giáo trình: ảnh từ vựng, hội thoại, bài nghe';
        a.style.cssText = 'padding:6px 12px;font-size:0.82em;flex:0 0 auto;background:linear-gradient(135deg,#7c3aed,#4f46e5);border:none;color:#fff;text-decoration:none;display:inline-flex;align-items:center;gap:4px;';
        a.innerHTML = `📚 Học theo giáo trình${link.title ? `<span style="opacity:.8;font-weight:600"> · ${esc(link.title)}</span>` : ''}`;
        slot.insertBefore(a, slot.firstChild);
    }

    async function onLesson(folderId, lessonName) {
        const key = folderId + '|' + lessonName;
        ST.key = key;
        try {
            let link = await findLink(folderId, lessonName);
            if (!link) { // từ vựng có thể chưa về kịp → thử lại một lần
                await new Promise(r => setTimeout(r, 1200));
                if (ST.key !== key) return;
                link = await findLink(folderId, lessonName);
            }
            if (!link || ST.key !== key || window.currentSharedLesson !== lessonName) return;
            addButton(link, folderId, lessonName);
        } catch (err) {
            console.warn('Không tìm được giáo trình gốc của bài:', err && err.message);
        }
    }

    // vocab.html?view=classes&f=<folderId>&lesson=<tên bài> → mở thẳng lớp + bài (nút "Về bài học trong lớp")
    function openFromUrl() {
        let q;
        try { q = new URLSearchParams(location.search); } catch (e) { return; }
        const fid = q.get('f'), lesson = q.get('lesson');
        if (window.VOCAB_VIEW !== 'classes' || !fid) return;
        let tries = 0;
        const timer = setInterval(() => {
            tries++;
            // chờ danh sách lớp hiện ra (đã đăng nhập + tải xong thư mục)
            const ready = document.getElementById('_sharedTeacherBlock') || document.getElementById('_sharedStudentBlock');
            if (!ready && tries < 60) return;
            clearInterval(timer);
            if (!ready || typeof window.openSharedFolder !== 'function') return;
            // Sổ từ có thể tải dữ liệu xong muộn và đặt lại giao diện về danh sách
            // → mở lại tối đa vài lần cho tới khi đúng lớp / bài đang hiện.
            const shown = () => {
                const d = document.getElementById('vocabDetailView');
                const visible = d && getComputedStyle(d).display !== 'none';
                return visible && window.currentSharedFolderId === fid && (!lesson || window.currentSharedLesson === lesson);
            };
            const open = () => {
                window.openSharedFolder(fid);
                if (lesson && typeof window.openSharedLesson === 'function') window.openSharedLesson(fid, lesson);
            };
            open();
            let checks = 0;
            const guard = setInterval(() => {
                checks++;
                if (!shown()) open();
                if (checks >= 6) clearInterval(guard);
            }, 1000);
            // bỏ tham số khỏi thanh địa chỉ để F5 không mở lại
            try { history.replaceState(null, '', 'vocab.html?view=classes'); } catch (e) { }
        }, 250);
    }

    function hook() {
        const openLesson = window.openSharedLesson;
        if (typeof openLesson === 'function' && !openLesson._cc) {
            window.openSharedLesson = function (folderId, lessonName) {
                const r = openLesson.apply(this, arguments);
                onLesson(folderId, lessonName);
                return r;
            };
            window.openSharedLesson._cc = true;
        }
    }
    hook();
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', openFromUrl); else openFromUrl();
    window.ClassCurriculum = { _findLink: findLink, _curriculumUrl: curriculumUrl };
})();
