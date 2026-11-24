/* Kệ sách 서울대 한국어 1A … 6B cho giáo viên (admin) ở mục Giáo trình (vocab.html?view=classes).
   Bấm một cuốn → cửa sổ danh sách bài (chủ đề, điểm chính); bài đã nhập lên Kho giáo trình thì mở thẳng bài học.
   Dữ liệu sách: seoul-books.js (window.SEOUL_BOOKS). Giáo trình trên hệ thống ghép theo tên "서울대 한국어 1A" + số bài.
   Gọi: SeoulShelf.mount(elementĐứngSau) — chèn kệ ngay trước phần tử đó. */
(function () {
    const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const S = { list: [], loaded: false, loading: null };
    const ADMIN_EMAIL = 'vuihoctienghan27@gmail.com';
    // Kệ sách chỉ dành cho admin (giáo viên) — học viên không thấy.
    const isAdmin = () => { const u = window.firebase && firebase.auth && firebase.auth().currentUser; return !!(u && u.email && u.email.toLowerCase() === ADMIN_EMAIL); };

    (function css() {
        if (document.getElementById('seoulShelfCss')) return;
        const l = document.createElement('link');
        l.id = 'seoulShelfCss'; l.rel = 'stylesheet'; l.href = '/assets/css/seoul-shelf.css';
        document.head.appendChild(l);
    })();

    function curOf(code) {
        const key = ('서울대 한국어 ' + code).replace(/\s+/g, '').toLowerCase();
        return S.list.find(c => String(c.title || '').replace(/\s+/g, '').toLowerCase().includes(key)) || null;
    }
    function unitOf(cur, no) {
        if (!cur) return null;
        return (cur.units || []).find(u => { const m = String(u.title || '').match(/^\s*(?:bài|lesson|제)?\s*(\d+)/i); return m && +m[1] === +no; }) || null;
    }
    const lessonUrl = (cid, lid) => `/lesson/lesson.html?c=${encodeURIComponent(cid)}&l=${encodeURIComponent(lid)}`;
    const cover = (b, cls) => `<span class="sb-cover ${cls || ''}"><img src="/assets/img/seoul/${b.code.toLowerCase()}.jpg" alt="Bìa 서울대 한국어 ${b.code}" loading="lazy"><i class="sb-spine"></i><i class="sb-shine"></i></span>`;
    const haveCount = (b) => { const cur = curOf(b.code); return cur ? b.lessons.filter(l => unitOf(cur, l.no)).length : 0; };

    function shelfHtml() {
        const books = window.SEOUL_BOOKS || [];
        const shelves = [['🌱 Sơ cấp', 0, 4], ['🌿 Trung cấp', 4, 8], ['🌳 Cao cấp', 8, 12]];
        const book = (b) => {
            const have = S.loaded ? haveCount(b) : 0;
            const badge = !S.loaded ? '<span class="sb-have">…</span>'
                : `<span class="sb-have ${have ? (have >= b.lessons.length ? 'full' : 'part') : ''}">${have ? `✓ ${have}/${b.lessons.length} bài có trên web` : 'Chưa nhập'}</span>`;
            return `<button type="button" class="sb-book" style="--bk:${b.color};--ac:${b.accent}" data-code="${b.code}" aria-label="Mở sách 서울대 한국어 ${b.code}">
                ${cover(b)}
                <span class="sb-info"><b class="kr">${b.code}</b><small>${esc(b.level)} · ${b.lessons.length} ${typeof b.lessons[0].no === 'number' ? 'bài' : 'chủ đề'}</small>${badge}</span>
            </button>`;
        };
        return `<div class="sb-head">
                <div><div class="sb-eyebrow">📚 Bộ giáo trình</div><h2 class="kr">서울대 한국어 <span>1A – 6B</span></h2></div>
                <p>Bấm vào một cuốn để xem danh sách bài, chủ đề và nội dung chính.</p>
            </div>
            ${shelves.map(([name, a, z]) => `<div class="sb-shelf">
                <div class="sb-tag">${name}</div>
                <div class="sb-row">${books.slice(a, z).map(book).join('')}</div>
                <div class="sb-plank"></div>
            </div>`).join('')}`;
    }

    function openBook(code) {
        if (!isAdmin()) return;
        const b = (window.SEOUL_BOOKS || []).find(x => x.code === code); if (!b) return;
        const cur = curOf(code);
        const isUnit = typeof b.lessons[0].no !== 'number';
        const rows = b.lessons.map(l => {
            const u = unitOf(cur, l.no);
            const inner = `<span class="sb-no">${l.no}</span>
                <span class="sb-body">
                    <span class="sb-kr kr">${esc(l.kr)}</span>
                    <span class="sb-vi">${esc(l.vi)}</span>
                    <span class="sb-topic">🎯 <b>Chủ đề:</b> ${esc(l.topic)}</span>
                    <span class="sb-points"><span class="lb">${isUnit || /^[4-6]/.test(code) ? '📌 Nội dung' : '📗 Ngữ pháp'}</span>${l.points.map(p => `<em class="kr">${esc(p)}</em>`).join('')}</span>
                </span>
                <span class="sb-go">${u ? `<b>Học bài này →</b><small>${u.wordCount || 0} từ · ${u.grammarCount || 0} NP${u.dialogueCount ? ' · ' + u.dialogueCount + ' HT' : ''}</small>` : '<small class="off">Chưa có trên web</small>'}</span>`;
            return u ? `<a class="sb-lesson" href="${lessonUrl(cur.id, u.id)}">${inner}</a>` : `<div class="sb-lesson off">${inner}</div>`;
        }).join('');
        const have = haveCount(b);
        closeBook();
        const m = document.createElement('div');
        m.className = 'sb-modal'; m.id = 'sbModal';
        m.innerHTML = `<div class="sb-dialog" role="dialog" aria-modal="true" aria-label="서울대 한국어 ${b.code}" style="--bk:${b.color};--ac:${b.accent}">
            <button type="button" class="sb-x" aria-label="Đóng">✕</button>
            <aside class="sb-side">
                ${cover(b, 'big')}
                <div class="sb-side-t">
                    <h3 class="kr">서울대 한국어 ${b.code}</h3>
                    <div class="sb-meta">${esc(b.level)} · ${b.lessons.length} ${isUnit ? 'chủ đề' : 'bài'}</div>
                    <div class="sb-prog"><i style="width:${Math.round(have / b.lessons.length * 100)}%"></i></div>
                    <div class="sb-meta">${have ? `${have}/${b.lessons.length} bài đã có trên web` : 'Chưa nhập lên Kho giáo trình'}</div>
                    ${cur ? `<a class="sb-btn pri" href="/lesson/index.html?c=${encodeURIComponent(cur.id)}">📘 Mở giáo trình</a>` : '<a class="sb-btn" href="/lesson/admin.html">＋ Nhập ở Kho giáo trình</a>'}
                </div>
            </aside>
            <div class="sb-list">
                <div class="sb-list-h">${isUnit ? 'Các chủ đề trong sách' : 'Danh sách bài học'}</div>
                ${rows}
            </div>
        </div>`;
        m.addEventListener('click', e => { if (e.target === m || e.target.closest('.sb-x')) closeBook(); });
        document.body.appendChild(m);
        document.body.classList.add('sb-lock');
        requestAnimationFrame(() => m.classList.add('show'));
        document.addEventListener('keydown', escBook);
        m.querySelector('.sb-x').focus();
    }
    function escBook(e) { if (e.key === 'Escape') closeBook(); }
    function closeBook() {
        const m = document.getElementById('sbModal');
        if (m) m.remove();
        document.body.classList.remove('sb-lock');
        document.removeEventListener('keydown', escBook);
    }

    function load() {
        if (S.loading) return S.loading;
        const user = window.firebase && firebase.auth().currentUser;
        S.loading = (window.CurriculumAccess && user ? window.CurriculumAccess.listCurricula(user) : Promise.resolve([]))
            .then(list => { S.list = list || []; }).catch(() => { S.list = []; })
            .then(() => { S.loaded = true; });
        return S.loading;
    }
    function mount(before) {
        if (!before || !before.parentNode || !(window.SEOUL_BOOKS || []).length || !isAdmin()) return;
        let el = document.getElementById('_seoulShelf');
        if (el) el.remove();
        el = document.createElement('section');
        el.id = '_seoulShelf';
        el.className = 'sb-wrap';
        el.style.gridColumn = '1 / -1';
        el.innerHTML = shelfHtml();
        el.addEventListener('click', e => { const b = e.target.closest('.sb-book'); if (b) openBook(b.dataset.code); });
        before.parentNode.insertBefore(el, before);
        load().then(() => { if (el.isConnected) el.innerHTML = shelfHtml(); });
    }
    window.SeoulShelf = { mount, open: openBook, close: closeBook };
})();
