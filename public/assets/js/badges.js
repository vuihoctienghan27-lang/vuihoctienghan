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

    // ── Hình huy chương: mặt màu theo nhóm, viền kim loại theo bậc, icon duotone trắng ──
    const Lo = ' opacity=".42"';
    const St = ' fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"';
    const GLYPH = {
        flame: `<path${Lo} d="M12 2c.7 3.3 2.7 5.1 4.5 7 1.8 1.9 3 3.9 3 6.5a7.5 7.5 0 0 1-15 0c0-2.6 1.3-4.6 3-6.2.3 1.8 1.2 3 2.5 3.6C9.4 9.4 10 5.4 12 2Z"/><path d="M12 11.6c1.8 1.5 3.2 3 3.2 5a3.2 3.2 0 0 1-6.4 0c0-1.8 1.4-3.4 3.2-5Z"/>`,
        volcano: `<path${Lo} d="M2 21 8.5 9.5h7L22 21Z"/><path d="M8.5 9.5h7l-2 3.5-1.5-1.5-1.5 2-1.5-2Z"/><path d="M11 2.5c.3 1.6 1.4 2.4 1.4 3.6a1.4 1.4 0 0 1-2.8 0c0-.6.2-1 .5-1.4M14.5 4c.8.6 1.2 1.3 1.2 2.1"/>`,
        clock: `<circle${Lo} cx="12" cy="12.5" r="9.5"/><path${St} d="M12 7.5v5l3.2 2"/><rect x="9" y="1" width="6" height="2.4" rx="1.2"/>`,
        hourglass: `<path${Lo} d="M6 2.5h12v3.2a6 6 0 0 1-3 5.2L13.2 12l1.8 1.1a6 6 0 0 1 3 5.2v3.2H6v-3.2a6 6 0 0 1 3-5.2l1.8-1.1L9 10.9a6 6 0 0 1-3-5.2Z"/><path d="M8.5 19.5c0-1.7 1.6-3.3 3.5-4.3 1.9 1 3.5 2.6 3.5 4.3Z"/><rect x="4.5" y="1.5" width="15" height="2.5" rx="1.25"/><rect x="4.5" y="20" width="15" height="2.5" rx="1.25"/>`,
        book: `<path${Lo} d="M2.5 5.2C2.5 4.5 3 4 3.7 4H8a4 4 0 0 1 4 4v12.5a2.6 2.6 0 0 0-2.6-2.4H3.7a1.2 1.2 0 0 1-1.2-1.2Z"/><path d="M21.5 5.2c0-.7-.5-1.2-1.2-1.2H16a4 4 0 0 0-4 4v12.5a2.6 2.6 0 0 1 2.6-2.4h5.7c.7 0 1.2-.5 1.2-1.2Z"/>`,
        library: `<rect${Lo} x="3" y="4" width="4.5" height="17" rx="1.2"/><rect x="8.5" y="2.5" width="4.5" height="18.5" rx="1.2"/><path${Lo} d="m14 5.5 4.3-1.2 3.7 15.4-4.3 1.1Z"/><rect x="2" y="20" width="20" height="2" rx="1"/>`,
        brain: `<path${Lo} d="M9 3a3 3 0 0 0-3 3 3 3 0 0 0-2.6 4.5A3.5 3.5 0 0 0 5 17a3 3 0 0 0 4 3.5c1.1 0 2-.6 2.5-1.5V4.5A2.5 2.5 0 0 0 9 3Z"/><path d="M15 3a3 3 0 0 1 3 3 3 3 0 0 1 2.6 4.5A3.5 3.5 0 0 1 19 17a3 3 0 0 1-4 3.5c-1.1 0-2-.6-2.5-1.5V4.5A2.5 2.5 0 0 1 15 3Z"/>`,
        gem: `<path${Lo} d="M7 3h10l4.5 6.2H2.5Z"/><path d="M2.5 9.2h19L12 21.5Z"/><path d="M8.6 9.2 12 21.5l3.4-12.3Z" fill="#fff" opacity=".35"/>`,
        repeat: `<path${St}${Lo} d="M4.2 13A8 8 0 0 1 17.6 6.3"/><path d="M20.6 3.4v6.2h-6.2Z"/><path${St} d="M19.8 11a8 8 0 0 1-13.4 6.7"/><path d="M3.4 20.6v-6.2h6.2Z"/>`,
        infinity: `<path${St} stroke-width="2.6" d="M12 12c-2-2.6-3.6-4-5.5-4a4 4 0 0 0 0 8c1.9 0 3.5-1.4 5.5-4Z"/><path${St}${Lo} stroke-width="2.6" d="M12 12c2 2.6 3.6 4 5.5 4a4 4 0 0 0 0-8c-1.9 0-3.5 1.4-5.5 4Z"/>`,
        checkCircle: `<circle${Lo} cx="12" cy="12" r="10"/><path${St} stroke-width="2.6" d="m7.5 12.3 3 3 6-6.3"/>`,
        wrench: `<path${Lo} d="M14.7 6.3a4.5 4.5 0 0 0 5.8 5.8l1-1a5.5 5.5 0 0 1-7.1-6.8Z"/><path d="M14.5 3.5a5.5 5.5 0 0 0-1.3 5.8L3.4 19.1a1.9 1.9 0 0 0 2.7 2.7l9.8-9.8a5.5 5.5 0 0 0 5.8-1.3l-3.2-.5-.8-2.8 2.1-2.1-.5-3.2Z"/>`,
        exam: `<path${Lo} d="M6 2h8.5L20 7.5V19a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V5a3 3 0 0 1 3-3Z"/><path d="M14.5 2v3.5a2 2 0 0 0 2 2H20Z"/><rect x="7.5" y="11.5" width="9" height="2.2" rx="1.1"/><rect x="7.5" y="15.8" width="6" height="2.2" rx="1.1"/>`,
        layers: `<path${Lo} d="m12 13.5 9.5-4.8V12L12 16.8 2.5 12V8.7Z"/><path${Lo} d="m12 18 9.5-4.8v3.3L12 21.3l-9.5-4.8v-3.3Z"/><path d="M12 2.7 21.5 7.5 12 12.3 2.5 7.5Z"/>`,
        target: `<circle${Lo} cx="12" cy="12" r="10"/><circle${Lo} cx="12" cy="12" r="6.5"/><circle cx="12" cy="12" r="3.2"/>`,
        arrowHit: `<circle${Lo} cx="10" cy="14" r="8"/><circle cx="10" cy="14" r="3.2"/><path${St} stroke-width="2.4" d="m10 14 9-9"/><path d="M15.5 3.5 18 1v3.5h3.5L19 7h-3.5Z"/>`,
        swords: `<g${Lo} transform="rotate(45 12 12)"><path d="M12 .8 13.5 3.5v11.3h-3V3.5Z"/><rect x="7.6" y="14.8" width="8.8" height="2.3" rx="1.15"/><rect x="10.9" y="17.1" width="2.2" height="3.6" rx="1"/><circle cx="12" cy="21.7" r="1.4"/></g><g transform="rotate(-45 12 12)"><path d="M12 .8 13.5 3.5v11.3h-3V3.5Z"/><rect x="7.6" y="14.8" width="8.8" height="2.3" rx="1.15"/><rect x="10.9" y="17.1" width="2.2" height="3.6" rx="1"/><circle cx="12" cy="21.7" r="1.4"/></g>`,
        shield: `<path${Lo} d="M12 2 4 5v6.5c0 5 3.4 8.8 8 10.5 4.6-1.7 8-5.5 8-10.5V5Z"/><path d="M12 2v20c4.6-1.7 8-5.5 8-10.5V5Z"/><path${St} stroke-width="2.4" d="m8.5 12 2.5 2.5 4.5-5"/>`,
        mic: `<rect x="8.5" y="2" width="7" height="12.5" rx="3.5"/><path${St}${Lo} d="M5 11a7 7 0 0 0 14 0"/><rect${Lo} x="10.9" y="17.5" width="2.2" height="4.5" rx="1.1"/>`,
        studio: `<rect x="8.5" y="2" width="7" height="12.5" rx="3.5"/><path${St}${Lo} d="M5 11a7 7 0 0 0 14 0"/><path${St} stroke-width="2" d="M2 8.5v4M22 8.5v4"/><rect${Lo} x="10.9" y="17.5" width="2.2" height="4.5" rx="1.1"/>`,
        feather: `<path${Lo} d="M20.2 3.8C14 2.5 7 6.5 6 14.5L4 20l5.5-2C17.5 17 21.5 10 20.2 3.8Z"/><path${St} d="M16 8 4 20"/>`,
        scroll: `<path${Lo} d="M6 3h11a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3H6Z"/><path d="M6 3a3 3 0 0 0-3 3v1.5h6V6a3 3 0 0 0-3-3Z"/><rect x="9" y="9" width="8" height="2" rx="1"/><rect x="9" y="13" width="6" height="2" rx="1"/><path d="M14 21a3 3 0 0 1-3-3h9a3 3 0 0 1-3 3Z"/>`,
        crown: `<path d="M3 7.5 7.5 11 12 4l4.5 7L21 7.5 19.2 17H4.8Z"/><rect${Lo} x="4.8" y="18.5" width="14.4" height="3" rx="1.5"/><circle${Lo} cx="3" cy="7" r="1.8"/><circle${Lo} cx="21" cy="7" r="1.8"/><circle${Lo} cx="12" cy="3.4" r="1.8"/>`
    };
    // Icon riêng cho từng huy hiệu + màu mặt theo nhóm
    const ART = {
        streak3: 'flame', streak7: 'flame', streak30: 'volcano', time10h: 'clock', time50h: 'hourglass',
        vocab50: 'book', vocab300: 'library', master50: 'brain', master200: 'gem', review100: 'repeat', review1000: 'infinity',
        fix10: 'checkCircle', fix50: 'wrench', exam5: 'exam', exam20: 'layers', score70: 'target', score90: 'arrowHit',
        duel1: 'swords', duel10: 'shield', speak20: 'mic', speak100: 'studio', exp401: 'feather', exp1001: 'scroll', exp3001: 'crown'
    };
    const FACE = { streak: 'orange', minutes: 'cyan', vocab: 'blue', mastered: 'violet', reviews: 'teal', fixed: 'rose',
        exams: 'navy', best: 'pink', duelWins: 'indigo', speak: 'magenta', exp: 'amber' };
    // Bậc theo vị trí trong nhóm: nhóm 2 cấp → bạc, vàng · nhóm 3 cấp → đồng, bạc, vàng
    const TIER = {};
    (function () {
        const groups = {};
        DEFS.forEach(b => { (groups[b.metric] = groups[b.metric] || []).push(b.id); });
        Object.keys(groups).forEach(k => {
            const ids = groups[k], names = ids.length >= 3 ? ['bronze', 'silver', 'gold'] : ids.length === 2 ? ['silver', 'gold'] : ['gold'];
            ids.forEach((id, i) => { TIER[id] = names[Math.min(i, names.length - 1)]; });
        });
    })();
    const TIER_LABEL = { bronze: 'Đồng', silver: 'Bạc', gold: 'Vàng' };
    const TIER_STARS = { bronze: 1, silver: 2, gold: 3 };
    function glyph(b) {
        return '<svg class="bd-glyph" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' + (GLYPH[ART[b.id]] || GLYPH.target) + '</svg>';
    }
    const RING_C = 2 * Math.PI * 30;
    function medal(b, has, pct, size) {
        const ring = has ? '' : `<svg class="bd-ring" viewBox="0 0 64 64"><circle cx="32" cy="32" r="30" class="bd-ring-bg"/>` +
            `<circle cx="32" cy="32" r="30" class="bd-ring-fg" stroke-dasharray="${RING_C.toFixed(1)}" stroke-dashoffset="${(RING_C * (1 - pct / 100)).toFixed(1)}"/></svg>`;
        const stars = has && size !== 'sm' ? `<span class="bd-stars">${'<i></i>'.repeat(TIER_STARS[TIER[b.id]])}</span>` : '';
        return `<div class="bd-medal ${has ? 'm-' + TIER[b.id] + ' f-' + FACE[b.metric] : 'locked'}${size ? ' ' + size : ''}">${ring}` +
            `<span class="bd-rim"><span class="bd-face">${glyph(b)}</span></span>${stars}</div>`;
    }
    const nf = n => Number(n || 0).toLocaleString('vi-VN');
    const TROPHY = '<svg class="bd-glyph" viewBox="0 0 24 24" fill="currentColor"><path opacity=".42" d="M7 5H4.2a.7.7 0 0 0-.7.8A5 5 0 0 0 8 10.3M17 5h2.8c.4 0 .8.4.7.8a5 5 0 0 1-4.5 4.5" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M6.5 2.5h11V8a5.5 5.5 0 0 1-11 0Z"/><path opacity=".42" d="M10 13.2h4v4.3h-4Z"/><rect x="6.5" y="17.5" width="11" height="4" rx="1.5"/></svg>';

    function celebrate(list) {
        if (typeof confetti === 'function') confetti({ particleCount: 140, spread: 90, origin: { y: 0.5 }, zIndex: 999999999 });
        if (typeof Swal === 'undefined') return;
        injectCss();
        Swal.fire({
            customClass: { popup: 'bd-swal' },
            html: `<div class="bd-scope bd-cel"><div class="bd-cel-badge">${TROPHY}${list.length > 1 ? list.length + ' huy hiệu mới!' : 'Huy hiệu mới!'}</div>
                <div class="bd-cel-list">${list.map(b => `<div class="bd-cel-item">${medal(b, true, 100, 'lg')}
                    <div class="bd-cel-name">${esc(b.name)}</div><div class="bd-cel-desc">${esc(b.desc)}</div>
                    <span class="bd-tier t-${TIER[b.id]}">${TIER_LABEL[TIER[b.id]]}</span></div>`).join('')}</div></div>`,
            confirmButtonText: 'Tuyệt vời!'
        });
    }

    // Lưới huy hiệu đầy đủ (đã đạt / chưa đạt + tiến độ)
    function renderGrid(el, result) {
        if (!el || !result) return;
        const m = result.metrics, owned = result.owned || {};
        const got = DEFS.filter(b => owned[b.id]).length;
        const filter = el.dataset.bdFilter || 'all';
        const items = DEFS.map(b => {
            const has = !!owned[b.id];
            const val = Math.min(m[b.metric] || 0, b.goal);
            return { b, has, val, pct: Math.round(val / b.goal * 100) };
        });
        const next = items.filter(x => !x.has && x.val > 0).sort((a, b) => b.pct - a.pct)[0];
        const shown = items.filter(x => filter === 'all' || (filter === 'got' ? x.has : !x.has));
        const pctAll = Math.round(got / DEFS.length * 100);
        const tab = (f, label, n) => `<button data-bd-f="${f}" class="${filter === f ? 'active' : ''}">${label}<span>${n}</span></button>`;

        el.classList.add('bd-scope');
        el.innerHTML = `<div class="bd-head">
                <div class="bd-head-l"><span class="bd-head-ic">${TROPHY}</span>
                    <div><div class="bd-title">Huy hiệu thành tích</div><div class="bd-sub">Đã mở khoá <b>${got}</b> / ${DEFS.length} huy hiệu</div></div></div>
                <div class="bd-pct">${pctAll}<small>%</small></div>
            </div>
            <div class="bd-track"><div style="width:${pctAll}%"></div></div>
            ${next ? `<div class="bd-next">${medal(next.b, false, next.pct, 'sm')}
                <div class="bd-next-b"><div class="bd-next-l">Sắp đạt được</div>
                <div class="bd-next-t"><b>${esc(next.b.name)}</b> · ${esc(next.b.desc)}</div>
                <div class="bd-next-bar"><div style="width:${next.pct}%"></div></div></div>
                <div class="bd-next-r"><b>${nf(next.val)}</b>/${nf(next.b.goal)}<span>còn ${nf(next.b.goal - next.val)}${next.b.unit ? ' ' + esc(next.b.unit) : ''}</span></div></div>` : ''}
            <div class="bd-tabs">${tab('all', 'Tất cả', DEFS.length)}${tab('got', 'Đã đạt', got)}${tab('lock', 'Chưa đạt', DEFS.length - got)}</div>
            ${shown.length ? `<div class="bd-grid">${shown.map(x => `
                <div class="bd-item ${x.has ? 'got f-' + FACE[x.b.metric] : 'lock'}" title="${esc(x.b.desc)}">
                    ${medal(x.b, x.has, x.pct)}
                    <div class="bd-name">${esc(x.b.name)}</div>
                    <div class="bd-desc">${esc(x.b.desc)}</div>
                    <div class="bd-foot">${x.has
                        ? `<span class="bd-tier t-${TIER[x.b.id]}">${TIER_LABEL[TIER[x.b.id]]}</span><span class="bd-date">${new Date(owned[x.b.id]).toLocaleDateString('vi-VN')}</span>`
                        : `<div class="bd-prog"><div style="width:${x.pct}%"></div></div><span class="bd-num">${nf(x.val)}/${nf(x.b.goal)}</span>`}</div>
                </div>`).join('')}</div>`
                : `<div class="bd-empty">${filter === 'got' ? 'Bạn chưa có huy hiệu nào — tiếp tục học để mở khoá nhé!' : 'Bạn đã mở khoá toàn bộ huy hiệu!'}</div>`}`;
        if (!el._bdBound) {
            el._bdBound = true;
            el.addEventListener('click', e => {
                const t = e.target.closest('[data-bd-f]');
                if (!t || !el._bdLast) return;
                el.dataset.bdFilter = t.dataset.bdF;
                renderGrid(el, el._bdLast);
            });
        }
        el._bdLast = result;
    }

    // Dãy huy chương nhỏ cho hồ sơ / BXH — mới nhất trước
    function iconsHtml(map, max) {
        injectCss();
        const ids = Object.keys(map || {}).filter(id => BY_ID[id]).sort((a, b) => (map[b] || 0) - (map[a] || 0));
        if (!ids.length) return '';
        max = max || 8;
        return '<span class="bd-scope bd-minis">' + ids.slice(0, max).map(id => `<span title="${esc(BY_ID[id].name + ' — ' + BY_ID[id].desc)}">${medal(BY_ID[id], true, 100, 'xs')}</span>`).join('') +
            (ids.length > max ? `<span class="bd-more">+${ids.length - max}</span>` : '') + '</span>';
    }

    function injectCss() {
        if (document.getElementById('bd-css')) return;
        const st = document.createElement('style');
        st.id = 'bd-css';
        st.textContent = `
            .bd-scope { --tx:#1f2937; --sub:#6b7280; --mute:#9ca3af; --bd:#e5e7eb; --soft:#f8fafc; --card:#fff; font-family:'Pretendard','Inter',sans-serif; }
            body.dark-mode .bd-scope { --tx:#f1f5f9; --sub:#94a3b8; --mute:#64748b; --bd:#334155; --soft:#0f172a; --card:#1e293b; }
            #badgeBox { background: var(--card); border: 1px solid var(--bd); border-radius: 16px; padding: 22px; margin-bottom: 20px; color: var(--tx); }
            .bd-head { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
            .bd-head-l { display: flex; align-items: center; gap: 12px; }
            .bd-head-ic { width: 44px; height: 44px; border-radius: 13px; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 22px; flex-shrink: 0;
                background: linear-gradient(140deg, #fcd34d, #d97706); box-shadow: 0 6px 14px -6px rgba(217,119,6,.6), inset 0 1px 0 rgba(255,255,255,.35); }
            .bd-head-ic .bd-glyph { width: 1em; height: 1em; }
            .bd-title { font-size: 1.15em; font-weight: 800; color: var(--tx); }
            .bd-sub { font-size: .86em; color: var(--sub); font-weight: 500; margin-top: 1px; }
            .bd-sub b { color: #d97706; font-weight: 900; }
            .bd-pct { font-size: 2em; font-weight: 900; color: #d97706; line-height: 1; font-variant-numeric: tabular-nums; }
            .bd-pct small { font-size: .5em; color: var(--mute); font-weight: 700; }
            .bd-track { height: 10px; border-radius: 999px; background: #e5e7eb; overflow: hidden; margin-top: 14px; }
            body.dark-mode .bd-track { background: #334155; }
            .bd-track div { height: 100%; border-radius: 999px; background: linear-gradient(90deg, #fcd34d, #f59e0b, #d97706); }

            .bd-next { display: flex; align-items: center; gap: 14px; margin-top: 16px; padding: 14px 16px; border-radius: 14px; background: #eff6ff; border: 1px solid #bfdbfe; }
            body.dark-mode .bd-next { background: #172554; border-color: #1e3a8a; }
            .bd-next-b { flex: 1; min-width: 0; }
            .bd-next-l { font-size: .72em; font-weight: 800; color: #2563eb; text-transform: uppercase; letter-spacing: .5px; }
            body.dark-mode .bd-next-l { color: #93c5fd; }
            .bd-next-t { font-size: .92em; color: var(--sub); margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
            .bd-next-t b { color: var(--tx); font-weight: 800; }
            .bd-next-bar { height: 6px; border-radius: 999px; background: #dbeafe; overflow: hidden; margin-top: 8px; }
            body.dark-mode .bd-next-bar { background: #1e3a8a; }
            .bd-next-bar div { height: 100%; border-radius: 999px; background: linear-gradient(90deg, #60a5fa, #2563eb); }
            .bd-next-r { text-align: right; font-size: .85em; color: var(--sub); font-weight: 700; font-variant-numeric: tabular-nums; }
            .bd-next-r b { font-size: 1.5em; color: #1d4ed8; font-weight: 900; }
            body.dark-mode .bd-next-r b { color: #93c5fd; }
            .bd-next-r span { display: block; font-size: .85em; font-weight: 600; margin-top: 2px; }

            .bd-tabs { display: flex; gap: 8px; margin: 18px 0 14px; flex-wrap: wrap; }
            .bd-tabs button { display: inline-flex; align-items: center; gap: 7px; border: 1.5px solid var(--bd); background: var(--card); color: var(--sub); border-radius: 999px;
                padding: 7px 14px; font-family: inherit; font-weight: 700; font-size: .88em; cursor: pointer; transition: .15s; }
            .bd-tabs button:hover { border-color: #94a3b8; color: var(--tx); }
            .bd-tabs button span { font-size: .85em; font-weight: 800; background: var(--soft); border-radius: 999px; padding: 1px 8px; }
            .bd-tabs button.active { background: #eff6ff; border-color: #3b82f6; color: #1d4ed8; }
            .bd-tabs button.active span { background: #dbeafe; }
            body.dark-mode .bd-tabs button.active { background: #172554; color: #93c5fd; } body.dark-mode .bd-tabs button.active span { background: #1e3a8a; }

            .bd-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 12px; }
            .bd-item { position: relative; border-radius: 16px; padding: 18px 10px 14px; text-align: center; border: 1px solid var(--bd); background: var(--card);
                transition: transform .2s, box-shadow .2s, border-color .2s; overflow: hidden; }
            .bd-item:hover { transform: translateY(-3px); box-shadow: 0 10px 22px -8px rgba(15,23,42,.18); }
            .bd-item.got::before { content: ''; position: absolute; inset: 0 0 auto 0; height: 64px; background: linear-gradient(180deg, var(--fc1), transparent); opacity: .16; pointer-events: none; }
            .bd-item.got:hover { border-color: var(--fc1); }
            .bd-name { font-weight: 800; font-size: .92em; color: var(--tx); margin-top: 12px; }
            .bd-item.lock .bd-name { color: var(--sub); }
            .bd-desc { font-size: .76em; color: var(--sub); margin-top: 3px; line-height: 1.4; min-height: 2.8em; }
            .bd-foot { display: flex; justify-content: center; align-items: center; gap: 6px; margin-top: 8px; flex-wrap: wrap; }
            .bd-date { font-size: .72em; color: var(--mute); font-weight: 600; }
            .bd-prog { flex: 1 1 100%; height: 6px; border-radius: 999px; background: #e5e7eb; overflow: hidden; margin: 0 8px; }
            body.dark-mode .bd-prog { background: #334155; }
            .bd-prog div { height: 100%; border-radius: 999px; background: linear-gradient(90deg, #60a5fa, #2563eb); }
            .bd-num { font-size: .74em; color: var(--sub); font-weight: 700; font-variant-numeric: tabular-nums; }
            .bd-tier { font-size: .68em; font-weight: 900; letter-spacing: .4px; text-transform: uppercase; padding: 2px 9px; border-radius: 999px; color: #fff; }
            .bd-tier.t-bronze { background: linear-gradient(135deg, #e0a679, #a8653a); }
            .bd-tier.t-silver { background: linear-gradient(135deg, #cbd5e1, #7c8aa0); }
            .bd-tier.t-gold { background: linear-gradient(135deg, #fcd34d, #d97706); }
            .bd-empty { text-align: center; color: var(--sub); font-size: .95em; padding: 30px 10px; font-weight: 600; }

            /* Màu mặt huy chương theo nhóm */
            .f-orange  { --fc1:#fbbf24; --fc2:#f97316; } .f-cyan    { --fc1:#67e8f9; --fc2:#0891b2; }
            .f-blue    { --fc1:#60a5fa; --fc2:#2563eb; } .f-violet  { --fc1:#c4b5fd; --fc2:#7c3aed; }
            .f-teal    { --fc1:#5eead4; --fc2:#0d9488; } .f-rose    { --fc1:#fda4af; --fc2:#e11d48; }
            .f-navy    { --fc1:#6b8cff; --fc2:#142657; } .f-pink    { --fc1:#f9a8d4; --fc2:#db2777; }
            .f-indigo  { --fc1:#a5b4fc; --fc2:#4338ca; } .f-magenta { --fc1:#f0abfc; --fc2:#a21caf; }
            .f-amber   { --fc1:#fde68a; --fc2:#d97706; }

            /* Huy chương */
            .bd-medal { --sz: 68px; --rim: 4px; position: relative; width: var(--sz); height: var(--sz); margin: 0 auto; flex-shrink: 0; }
            .bd-rim { position: absolute; inset: 0; border-radius: 50%; padding: var(--rim); background: linear-gradient(145deg, #e5e7eb, #94a3b8);
                box-shadow: 0 6px 14px -6px rgba(15,23,42,.35); }
            .bd-face { width: 100%; height: 100%; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #fff; position: relative; overflow: hidden;
                background: linear-gradient(145deg, var(--fc1, #e5e7eb), var(--fc2, #94a3b8)); box-shadow: inset 0 2px 0 rgba(255,255,255,.35), inset 0 -3px 6px rgba(0,0,0,.12); }
            .bd-face::after { content: ''; position: absolute; left: -20%; top: -45%; width: 140%; height: 80%; border-radius: 50%; background: rgba(255,255,255,.2); pointer-events: none; }
            .bd-glyph { width: 54%; height: 54%; position: relative; z-index: 1; filter: drop-shadow(0 1px 1.5px rgba(0,0,0,.2)); }
            .bd-medal.m-bronze .bd-rim { background: conic-gradient(from 210deg, #f3c9a4, #a8653a, #e0a679, #8a4f2a, #f3c9a4); }
            .bd-medal.m-silver .bd-rim { background: conic-gradient(from 210deg, #f8fafc, #8b97aa, #e2e8f0, #6b7789, #f8fafc); }
            .bd-medal.m-gold .bd-rim { background: conic-gradient(from 210deg, #fef3c7, #d97706, #fcd34d, #b45309, #fef3c7); box-shadow: 0 6px 16px -6px rgba(217,119,6,.55); }
            .bd-stars { position: absolute; left: 50%; bottom: -5px; transform: translateX(-50%); display: flex; gap: 2px; padding: 2px 5px; border-radius: 999px; background: var(--card);
                box-shadow: 0 1px 4px rgba(15,23,42,.18); }
            .bd-stars i { width: 7px; height: 7px; background: #f59e0b; clip-path: polygon(50% 0, 63% 35%, 100% 38%, 71% 61%, 81% 100%, 50% 78%, 19% 100%, 29% 61%, 0 38%, 37% 35%); }
            .bd-medal.locked .bd-rim { inset: 6px; padding: 3px; background: #e5e7eb; box-shadow: none; }
            body.dark-mode .bd-medal.locked .bd-rim { background: #334155; }
            .bd-medal.locked .bd-face { background: linear-gradient(145deg, #f8fafc, #e2e8f0); color: #a3b1c6; box-shadow: inset 0 2px 0 rgba(255,255,255,.5); }
            body.dark-mode .bd-medal.locked .bd-face { background: linear-gradient(145deg, #475569, #1e293b); color: #64748b; }
            .bd-medal.locked .bd-glyph { filter: none; }
            .bd-ring { position: absolute; inset: 0; width: 100%; height: 100%; transform: rotate(-90deg); }
            .bd-ring circle { fill: none; stroke-width: 3.5; }
            .bd-ring-bg { stroke: #e5e7eb; } body.dark-mode .bd-ring-bg { stroke: #334155; }
            .bd-ring-fg { stroke: #3b82f6; stroke-linecap: round; }
            .bd-medal.sm { --sz: 48px; --rim: 3px; margin: 0; } .bd-medal.sm.locked .bd-rim { inset: 5px; padding: 2px; }
            .bd-medal.lg { --sz: 96px; --rim: 5px; }
            .bd-medal.xs { --sz: 26px; --rim: 2px; display: inline-block; vertical-align: middle; margin: 0; }
            .bd-medal.xs .bd-rim { box-shadow: 0 2px 4px -1px rgba(15,23,42,.3); }
            .bd-medal.xs .bd-face::after { display: none; }
            .bd-minis { display: inline-flex; flex-wrap: wrap; gap: 4px; align-items: center; vertical-align: middle; }
            .bd-more { font-size: 11px; font-weight: 800; color: #2563eb; background: #eff6ff; border-radius: 999px; padding: 3px 8px; }

            /* Popup chúc mừng */
            .bd-swal { border-radius: 22px !important; padding: 26px 22px 22px !important; }
            .bd-swal .swal2-confirm { background: linear-gradient(135deg, #3b82f6, #2563eb) !important; border-radius: 12px !important; font-weight: 800 !important; padding: 11px 28px !important;
                box-shadow: 0 8px 18px -6px rgba(37,99,235,.55) !important; }
            .bd-cel { text-align: center; }
            .bd-cel-badge { display: inline-flex; align-items: center; gap: 8px; padding: 6px 14px 6px 8px; border-radius: 999px; font-weight: 900; color: #b45309;
                background: linear-gradient(135deg, #fef3c7, #fde68a); font-size: .95em; }
            .bd-cel-badge .bd-glyph { width: 22px; height: 22px; padding: 3px; border-radius: 50%; color: #fff; background: linear-gradient(135deg, #fbbf24, #d97706); filter: none; }
            .bd-cel-list { display: flex; flex-wrap: wrap; justify-content: center; gap: 22px; margin-top: 22px; }
            .bd-cel-item { width: 150px; animation: bdPop .55s cubic-bezier(.2,.9,.3,1.35) both; }
            .bd-cel-item:nth-child(2) { animation-delay: .1s; } .bd-cel-item:nth-child(3) { animation-delay: .2s; }
            .bd-cel-name { font-weight: 900; font-size: 1.05em; color: #1f2937; margin-top: 14px; }
            .bd-cel-desc { font-size: .85em; color: #6b7280; margin: 3px 0 8px; }
            @keyframes bdPop { from { opacity: 0; transform: scale(.6) rotate(-12deg); } to { opacity: 1; transform: none; } }

            @media (max-width: 640px) {
                #badgeBox { padding: 16px 12px; }
                .bd-grid { grid-template-columns: repeat(2, 1fr); gap: 8px; }
                .bd-desc { min-height: 0; }
                .bd-next { flex-wrap: wrap; }
                .bd-next-r { text-align: left; width: 100%; padding-left: 62px; }
                .bd-next-r span { display: inline; margin-left: 6px; }
            }`;
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
