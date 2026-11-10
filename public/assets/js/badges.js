/* ==========================================================================
   BADGES.JS — Huy hiệu thành tích
   - Tính từ dữ liệu sẵn có (users/{uid}, vocabulary, mistakes) — không cần server
   - Huy hiệu đã đạt lưu ở users/{uid}.badges = { <id>: <ms> } (công khai → hiện trên hồ sơ / BXH)
   API:
     Badges.DEFS                      danh sách huy hiệu
     Badges.check()                   tính lại, lưu huy hiệu mới + hiện chúc mừng
     Badges.renderGrid(el, result)    lưới huy hiệu (MyPage)
     Badges.iconsHtml(badgesMap, max) dãy icon nhỏ (popup hồ sơ, BXH)
   ========================================================================== */
(function () {
    'use strict';
    if (window.Badges) return;

    const sumMap = m => Object.values(m || {}).reduce((s, v) => s + (Number(v) || 0), 0);

    // metric: tên chỉ số trong bảng metrics (xem gather) · goal: ngưỡng đạt
    const DEFS = [
        { id: 'streak3', icon: '🔥', name: 'Khởi động', desc: 'Học 3 ngày liên tiếp', metric: 'streak', goal: 3 },
        { id: 'streak7', icon: '🔥', name: 'Một tuần bền bỉ', desc: 'Học 7 ngày liên tiếp', metric: 'streak', goal: 7 },
        { id: 'streak30', icon: '🌋', name: 'Kỷ luật thép', desc: 'Học 30 ngày liên tiếp', metric: 'streak', goal: 30 },
        { id: 'time10h', icon: '⏱️', name: 'Chăm chỉ', desc: 'Tổng 10 giờ học', metric: 'minutes', goal: 600, unit: 'phút' },
        { id: 'time50h', icon: '🕰️', name: 'Chuyên cần', desc: 'Tổng 50 giờ học', metric: 'minutes', goal: 3000, unit: 'phút' },
        { id: 'vocab50', icon: '📚', name: 'Nhà sưu tầm', desc: 'Lưu 50 từ vào sổ', metric: 'vocab', goal: 50 },
        { id: 'vocab300', icon: '📖', name: 'Kho từ vựng', desc: 'Lưu 300 từ vào sổ', metric: 'vocab', goal: 300 },
        { id: 'master50', icon: '🧠', name: 'Trí nhớ vàng', desc: '50 từ "Thành thạo"', metric: 'mastered', goal: 50 },
        { id: 'master200', icon: '💎', name: 'Bậc thầy từ vựng', desc: '200 từ "Thành thạo"', metric: 'mastered', goal: 200 },
        { id: 'review100', icon: '🔁', name: 'Ôn tập đều đặn', desc: 'Ôn 100 thẻ từ', metric: 'reviews', goal: 100 },
        { id: 'review1000', icon: '♾️', name: 'Không bao giờ quên', desc: 'Ôn 1.000 thẻ từ', metric: 'reviews', goal: 1000 },
        { id: 'fix10', icon: '📕', name: 'Sửa sai', desc: 'Thuộc 10 câu trong Sổ câu sai', metric: 'fixed', goal: 10 },
        { id: 'fix50', icon: '🛠️', name: 'Không lặp lỗi', desc: 'Thuộc 50 câu trong Sổ câu sai', metric: 'fixed', goal: 50 },
        { id: 'exam5', icon: '📝', name: 'Luyện đề', desc: 'Làm 5 đề thi khác nhau', metric: 'exams', goal: 5 },
        { id: 'exam20', icon: '🗂️', name: 'Cày đề', desc: 'Làm 20 đề thi khác nhau', metric: 'exams', goal: 20 },
        { id: 'score70', icon: '🎯', name: 'Thiện xạ', desc: 'Đạt ≥ 70 điểm trong 1 đề', metric: 'best', goal: 70, unit: 'điểm' },
        { id: 'score90', icon: '🏹', name: 'Cao thủ', desc: 'Đạt ≥ 90 điểm trong 1 đề', metric: 'best', goal: 90, unit: 'điểm' },
        { id: 'duel1', icon: '⚔️', name: 'Chiến binh', desc: 'Thắng 1 trận thi đấu 1-1', metric: 'duelWins', goal: 1 },
        { id: 'duel10', icon: '🛡️', name: 'Bất bại', desc: 'Thắng 10 trận thi đấu 1-1', metric: 'duelWins', goal: 10 },
        { id: 'speak20', icon: '🎤', name: 'Phát âm chuẩn', desc: 'Đọc đạt chuẩn 20 lần', metric: 'speak', goal: 20 },
        { id: 'speak100', icon: '🎙️', name: 'Giọng Hàn bản xứ', desc: 'Đọc đạt chuẩn 100 lần', metric: 'speak', goal: 100 },
        { id: 'exp401', icon: '🖋️', name: 'Tú Tài', desc: 'Đạt 401 EXP', metric: 'exp', goal: 401, unit: 'EXP' },
        { id: 'exp1001', icon: '📜', name: 'Thượng Thư', desc: 'Đạt 1.001 EXP', metric: 'exp', goal: 1001, unit: 'EXP' },
        { id: 'exp3001', icon: '👑', name: 'Trạng Nguyên', desc: 'Đạt 3.001 EXP', metric: 'exp', goal: 3001, unit: 'EXP' }
    ];
    const BY_ID = {};
    DEFS.forEach(b => { BY_ID[b.id] = b; });

    function esc(s) {
        return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    // Thu thập chỉ số của người dùng hiện tại
    async function gather(uid) {
        const db = firebase.firestore();
        const userRef = db.collection('users').doc(uid);
        const vocabFromPage = Array.isArray(window._allVocabData) ? window._allVocabData : null;
        const [uDoc, vocabSnap, fixedSnap] = await Promise.all([
            userRef.get(),
            vocabFromPage ? Promise.resolve(null) : userRef.collection('vocabulary').get().catch(() => null),
            userRef.collection('mistakes').where('mastered', '==', true).get().catch(() => null)
        ]);
        const d = uDoc.exists ? uDoc.data() : {};
        let vocab = vocabFromPage || [];
        if (!vocabFromPage && vocabSnap) { vocab = []; vocabSnap.forEach(x => vocab.push(x.data())); }
        vocab = vocab.filter(w => w && w.word && w.word !== '__folder_marker__');
        const exams = (d.stats && d.stats.exams) || {};
        const examKeys = Object.keys(exams);
        return {
            user: d,
            metrics: {
                streak: Number(d.streakDays) || 0,
                minutes: Number(d.totalStudyMinutes) || 0,
                vocab: vocab.length,
                mastered: vocab.filter(w => w.status === 3).length,
                reviews: sumMap(d.dailyReviewData),
                fixed: fixedSnap ? fixedSnap.size : 0,
                exams: examKeys.length,
                best: examKeys.reduce((m, k) => Math.max(m, Number(exams[k].best) || 0), 0),
                duelWins: Number(d.duelWins) || 0,
                speak: sumMap(d.dailySpeakData),
                exp: Math.max(0, Math.floor((Number(d.totalStudyMinutes) || 0) / 10) * 5 + (Number(d.bonusEXP) || 0))
            }
        };
    }

    let _lastCheck = 0, _lastResult = null, _running = null;

    // Tính lại huy hiệu; lưu + chúc mừng huy hiệu mới
    async function check(opts) {
        opts = opts || {};
        if (typeof firebase === 'undefined' || !firebase.auth().currentUser) return null;
        if (_running) return _running;
        if (!opts.force && _lastResult && Date.now() - _lastCheck < 10000) return _lastResult;
        const uid = firebase.auth().currentUser.uid;
        _running = (async () => {
            try {
                const { user, metrics } = await gather(uid);
                const owned = Object.assign({}, user.badges || {});
                const fresh = DEFS.filter(b => (metrics[b.metric] || 0) >= b.goal && !owned[b.id]);
                if (fresh.length) {
                    const now = Date.now();
                    const upd = {};
                    fresh.forEach(b => { upd[b.id] = now; owned[b.id] = now; });
                    await firebase.firestore().collection('users').doc(uid).set({ badges: upd }, { merge: true }).catch(e => console.warn('[Badges]', e));
                    if (!opts.silent) celebrate(fresh);
                }
                _lastResult = { metrics, owned, fresh };
                _lastCheck = Date.now();
                document.dispatchEvent(new CustomEvent('badges:updated', { detail: _lastResult }));
                return _lastResult;
            } catch (e) {
                console.warn('[Badges] Không tính được huy hiệu:', e && e.message);
                return null;
            } finally { _running = null; }
        })();
        return _running;
    }

    function celebrate(list) {
        if (typeof confetti === 'function') confetti({ particleCount: 140, spread: 90, origin: { y: 0.5 }, zIndex: 999999999 });
        if (typeof Swal === 'undefined') return;
        Swal.fire({
            title: list.length > 1 ? '🏅 ' + list.length + ' huy hiệu mới!' : '🏅 Huy hiệu mới!',
            html: '<div style="display:flex;flex-wrap:wrap;justify-content:center;gap:14px;margin-top:6px;">' + list.map(b =>
                `<div style="width:120px;"><div style="font-size:3em;line-height:1.1;">${b.icon}</div><div style="font-weight:900;color:#1e1b4b;">${esc(b.name)}</div><div style="font-size:0.8em;color:#64748b;">${esc(b.desc)}</div></div>`).join('') + '</div>',
            confirmButtonText: 'Tuyệt vời!', confirmButtonColor: '#7c3aed'
        });
    }

    // Lưới huy hiệu đầy đủ (đã đạt / chưa đạt + tiến độ)
    function renderGrid(el, result) {
        if (!el || !result) return;
        const m = result.metrics, owned = result.owned || {};
        const got = DEFS.filter(b => owned[b.id]).length;
        el.innerHTML = `<div class="bd-head"><div class="bd-title">🏅 Huy hiệu</div><div class="bd-count">${got}/${DEFS.length} đã đạt</div></div>
            <div class="bd-grid">${DEFS.map(b => {
                const has = !!owned[b.id];
                const val = Math.min(m[b.metric] || 0, b.goal);
                const pct = Math.round(val / b.goal * 100);
                return `<div class="bd-item ${has ? 'got' : 'lock'}" title="${esc(b.desc)}">
                    <div class="bd-icon">${b.icon}</div>
                    <div class="bd-name">${esc(b.name)}</div>
                    <div class="bd-desc">${esc(b.desc)}</div>
                    ${has ? `<div class="bd-date">✓ ${new Date(owned[b.id]).toLocaleDateString('vi-VN')}</div>`
                        : `<div class="bd-prog"><div style="width:${pct}%"></div></div><div class="bd-val">${val.toLocaleString('vi-VN')}/${b.goal.toLocaleString('vi-VN')}</div>`}
                </div>`;
            }).join('')}</div>`;
    }

    // Dãy icon nhỏ cho hồ sơ / BXH — mới nhất trước
    function iconsHtml(map, max) {
        const ids = Object.keys(map || {}).filter(id => BY_ID[id]).sort((a, b) => (map[b] || 0) - (map[a] || 0));
        if (!ids.length) return '';
        max = max || 8;
        return ids.slice(0, max).map(id => `<span class="bd-mini" title="${esc(BY_ID[id].name + ' — ' + BY_ID[id].desc)}">${BY_ID[id].icon}</span>`).join('') +
            (ids.length > max ? `<span class="bd-mini bd-more">+${ids.length - max}</span>` : '');
    }

    function injectCss() {
        if (document.getElementById('bd-css')) return;
        const st = document.createElement('style');
        st.id = 'bd-css';
        st.textContent = `
            #badgeBox { background: rgba(255,255,255,0.95); border-radius: 18px; padding: 18px 20px; margin-bottom: 20px; box-shadow: 0 4px 18px rgba(0,0,0,0.06); }
            .bd-head { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 12px; }
            .bd-title { font-size: 1.15em; font-weight: 900; color: #0f172a; }
            .bd-count { font-size: 0.85em; font-weight: 800; color: #7c3aed; }
            .bd-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 10px; }
            .bd-item { border-radius: 14px; padding: 12px 8px; text-align: center; border: 1px solid #e2e8f0; background: #f8fafc; }
            .bd-item.got { background: linear-gradient(160deg, #fefce8, #fff7ed); border-color: #fcd34d; box-shadow: 0 3px 10px rgba(245,158,11,0.15); }
            .bd-item.lock .bd-icon { filter: grayscale(1); opacity: 0.35; }
            .bd-icon { font-size: 2.1em; line-height: 1.15; }
            .bd-name { font-weight: 900; font-size: 0.88em; color: #1e293b; margin-top: 3px; }
            .bd-desc { font-size: 0.72em; color: #64748b; margin-top: 2px; min-height: 2.4em; }
            .bd-date { font-size: 0.72em; color: #b45309; font-weight: 800; margin-top: 4px; }
            .bd-prog { height: 5px; background: #e2e8f0; border-radius: 4px; overflow: hidden; margin: 6px 6px 2px; }
            .bd-prog div { height: 100%; background: linear-gradient(90deg, #a78bfa, #7c3aed); }
            .bd-val { font-size: 0.7em; color: #94a3b8; font-weight: 700; }
            .bd-mini { display: inline-block; font-size: 1.05em; margin-right: 2px; cursor: default; }
            .bd-more { font-size: 0.75em; font-weight: 800; color: #7c3aed; vertical-align: middle; }
            body.dark-mode #badgeBox { background: #1e293b; } body.dark-mode .bd-title, body.dark-mode .bd-name { color: #f1f5f9; }
            body.dark-mode .bd-item { background: #0f172a; border-color: #334155; }
            @media (max-width: 640px) { .bd-grid { grid-template-columns: repeat(3, 1fr); gap: 8px; } .bd-desc { display: none; } .bd-icon { font-size: 1.8em; } }`;
        document.head.appendChild(st);
    }

    // MyPage: tự vẽ lưới nếu có #badgeBox
    function autoInit() {
        injectCss();
        const box = document.getElementById('badgeBox');
        if (typeof firebase === 'undefined') return;
        firebase.auth().onAuthStateChanged(async user => {
            if (!user) return;
            const res = await check({ force: true });
            if (box && res) { box.style.display = 'block'; renderGrid(box, res); }
        });
        if (box) document.addEventListener('badges:updated', e => renderGrid(box, e.detail));
    }

    window.Badges = { DEFS, check, renderGrid, iconsHtml, gather };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', autoInit);
    else autoInit();
})();
