/* ==========================================================================
   LEADERBOARD.JS — V2 Flat Design with Podium & Confetti
   ========================================================================== */

(function () {
    'use strict';

    let lbUsers = [];

    // Chống XSS: tên/streak do người dùng tự ghi vào Firestore → luôn escape trước khi vào innerHTML
    function esc(v) {
        return String(v == null ? '' : v)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }
    // Số huy hiệu đã đạt (badges.js) — chỉ đếm, không chèn dữ liệu người dùng
    function badgeCount(u) {
        const n = u && u.badges && typeof u.badges === 'object' ? Object.keys(u.badges).length : 0;
        return n ? ' · ' + Math.min(n, 99) + ' huy hiệu' : '';
    }
    function arg(v) { return esc(JSON.stringify(v == null ? '' : String(v))); }
    
    function calcExp(data) {
        return Math.max(0, Math.floor((data.totalStudyMinutes || 0) / 10) * 5 + (data.bonusEXP || 0));
    }

    function getLevelName(exp) {
        if (exp > 3000) return 'Trạng Nguyên 👑';
        if (exp >= 1001) return 'Thượng Thư 📜';
        if (exp >= 401) return 'Tú Tài 🖋️';
        if (exp >= 51) return 'Sĩ Tử 🕯️';
        return 'Thường Dân 🌱';
    }

    function getLocalDate() {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }
    
    function getYesterdayStr() {
        const d = new Date(); d.setDate(d.getDate() - 1);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }

    function getTwoDaysAgoStr() {
        const d = new Date(); d.setDate(d.getDate() - 2);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }

    function getEffectiveStreak(u) {
        let lastDate = u.lastLoginDate || "";
        let today = getLocalDate();
        let yday = getYesterdayStr();
        let twoDays = getTwoDaysAgoStr(); // Add 2 days ago to grace period
        if (lastDate === today || lastDate === yday || lastDate === twoDays) {
            return u.streakDays || 0;
        }
        return 0; // Expired streak
    }

    function formatJoinDate(dateStr) {
        if (!dateStr) return 'Chưa cập nhật';
        const parts = dateStr.split('-');
        return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : dateStr;
    }

    const AV_GRAD = [['#60a5fa', '#2563eb'], ['#a78bfa', '#7c3aed'], ['#f472b6', '#db2777'], ['#34d399', '#059669'],
        ['#fbbf24', '#d97706'], ['#22d3ee', '#0891b2'], ['#fb7185', '#e11d48'], ['#818cf8', '#4f46e5']];
    function hash(str) { let h = 0; for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0; return Math.abs(h); }
    function initials(name) {
        const p = String(name || '?').trim().split(/\s+/);
        return ((p.length > 1 ? p[p.length - 2][0] : '') + p[p.length - 1][0]).toUpperCase();
    }
    function avatar(u, cls) {
        const g = AV_GRAD[hash(u._uid || '') % AV_GRAD.length];
        return '<span class="lb-av ' + (cls || '') + '" style="background:linear-gradient(135deg,' + g[0] + ',' + g[1] + ')">' + esc(u.fullName && u.fullName.trim() ? initials(u.fullName) : 'HV') + '</span>';
    }
    // Chưa có tên → "Học viên #A1B2" (lấy từ mã tài khoản, không lộ email)
    function displayName(u) {
        const n = u && typeof u.fullName === 'string' ? u.fullName.trim() : '';
        return n || 'Học viên #' + String((u && u._uid) || '').slice(0, 4).toUpperCase();
    }
    function levelPlain(exp) { return getLevelName(exp).replace(/\s*\S+$/u, ''); }
    function ic(n) { return window.UIIcons ? window.UIIcons.svg(n) : ''; }
    function tile(n, t, z) { return window.UIIcons ? window.UIIcons.tile(n, t, z) : ''; }
    function fmt(n) { return Number(n || 0).toLocaleString('vi-VN'); }

    const LB_CSS = `
        .lb { padding: 22px; font-family: 'Pretendard','Inter',sans-serif; color: #1f2937; }
        .lb-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin-bottom: 18px; }
        .lb-head-l { display: flex; align-items: center; gap: 12px; }
        .lb-title-t { font-size: 1.15em; font-weight: 800; }
        .lb-sub { font-size: .84em; color: #6b7280; font-weight: 500; margin-top: 1px; }
        .lb-chip { display: inline-flex; align-items: center; gap: 6px; font-size: .8em; font-weight: 700; color: #6b7280; background: #f8fafc; border: 1px solid #e5e7eb; border-radius: 999px; padding: 5px 11px; }
        .lb-chip svg { width: 14px; height: 14px; color: #8b5cf6; }
        .lb-av { display: inline-flex; align-items: center; justify-content: center; width: 42px; height: 42px; border-radius: 50%; color: #fff; font-weight: 800; font-size: .92em; flex-shrink: 0;
            box-shadow: inset 0 1px 0 rgba(255,255,255,.35), 0 4px 10px -4px rgba(15,23,42,.35); letter-spacing: .3px; }
        /* Bục vinh danh */
        .lb-podium { display: grid; grid-template-columns: 1fr 1.12fr 1fr; gap: 12px; align-items: end; margin-bottom: 18px; }
        .lb-pd { position: relative; display: flex; flex-direction: column; align-items: center; text-align: center; cursor: pointer; border-radius: 18px; padding: 18px 10px 0; overflow: hidden;
            border: 1px solid #e5e7eb; background: #fff; transition: transform .2s, box-shadow .2s; }
        .lb-pd:hover { transform: translateY(-3px); box-shadow: 0 14px 28px -12px rgba(15,23,42,.25); }
        .lb-pd.r1 { background: linear-gradient(180deg, #fffbeb 0%, #fff 70%); border-color: #fde68a; padding-top: 26px; }
        .lb-pd.r2 { background: linear-gradient(180deg, #f8fafc 0%, #fff 70%); border-color: #e2e8f0; }
        .lb-pd.r3 { background: linear-gradient(180deg, #fff7ed 0%, #fff 70%); border-color: #fed7aa; }
        .lb-pd-crown { position: absolute; top: 6px; left: 50%; transform: translateX(-50%); color: #f59e0b; width: 22px; height: 22px; filter: drop-shadow(0 2px 3px rgba(245,158,11,.4)); }
        .lb-pd-crown svg { width: 22px; height: 22px; }
        .lb-pd-avwrap { position: relative; padding: 3px; border-radius: 50%; }
        .lb-pd.r1 .lb-pd-avwrap { background: conic-gradient(from 200deg, #fde68a, #f59e0b, #fef3c7, #d97706, #fde68a); }
        .lb-pd.r2 .lb-pd-avwrap { background: conic-gradient(from 200deg, #f1f5f9, #94a3b8, #e2e8f0, #64748b, #f1f5f9); }
        .lb-pd.r3 .lb-pd-avwrap { background: conic-gradient(from 200deg, #fed7aa, #ea580c, #ffedd5, #c2410c, #fed7aa); }
        .lb-pd .lb-av { width: 56px; height: 56px; font-size: 1.1em; border: 3px solid #fff; box-shadow: none; }
        .lb-pd.r1 .lb-av { width: 68px; height: 68px; font-size: 1.3em; }
        .lb-pd-rank { position: absolute; right: -2px; bottom: -2px; width: 24px; height: 24px; border-radius: 50%; color: #fff; font-size: .74em; font-weight: 900; display: flex; align-items: center; justify-content: center; border: 2px solid #fff; }
        .lb-pd.r1 .lb-pd-rank { background: linear-gradient(135deg, #fbbf24, #d97706); }
        .lb-pd.r2 .lb-pd-rank { background: linear-gradient(135deg, #cbd5e1, #64748b); }
        .lb-pd.r3 .lb-pd-rank { background: linear-gradient(135deg, #fdba74, #c2410c); }
        .lb-pd-name { margin-top: 10px; font-weight: 800; font-size: .95em; max-width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .lb-pd-lv { font-size: .74em; color: #6b7280; font-weight: 600; margin-top: 2px; }
        .lb-pd-exp { display: inline-flex; align-items: center; gap: 4px; margin-top: 8px; font-weight: 900; color: #7c3aed; font-variant-numeric: tabular-nums; }
        .lb-pd-exp svg, .lb-exp svg { width: 14px; height: 14px; color: #f59e0b; }
        .lb-pd-stk { display: inline-flex; align-items: center; gap: 3px; font-size: .76em; font-weight: 700; color: #ea580c; margin-top: 2px; }
        .lb-pd-stk svg, .lb-stk svg { width: 12px; height: 12px; }
        .lb-pd-base { align-self: stretch; margin: 12px -10px 0; display: flex; align-items: flex-start; justify-content: center; padding-top: 8px; font-size: 1.6em; font-weight: 900; color: rgba(255,255,255,.95); text-shadow: 0 1px 2px rgba(0,0,0,.15); }
        .lb-pd.r1 .lb-pd-base { height: 64px; background: linear-gradient(180deg, #fbbf24, #f59e0b); }
        .lb-pd.r2 .lb-pd-base { height: 44px; background: linear-gradient(180deg, #cbd5e1, #94a3b8); }
        .lb-pd.r3 .lb-pd-base { height: 32px; background: linear-gradient(180deg, #fdba74, #f97316); font-size: 1.3em; padding-top: 4px; }
        /* Danh sách 4–10 */
        .lb-rows { display: flex; flex-direction: column; gap: 8px; }
        .lb-row { display: flex; align-items: center; gap: 12px; padding: 10px 14px; background: #fff; border: 1px solid #e5e7eb; border-radius: 14px; cursor: pointer; transition: .18s; }
        .lb-row:hover { border-color: #93c5fd; box-shadow: 0 8px 20px -10px rgba(37,99,235,.35); transform: translateY(-1px); }
        .lb-row.me { background: #eff6ff; border-color: #bfdbfe; }
        .lb-no { width: 28px; height: 28px; border-radius: 9px; background: #f1f5f9; color: #64748b; font-weight: 900; font-size: .85em; display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-variant-numeric: tabular-nums; }
        .lb-main { flex: 1; min-width: 0; }
        .lb-name { display: flex; align-items: center; gap: 6px; font-weight: 800; font-size: .96em; min-width: 0; }
        .lb-name span { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .lb-you { flex-shrink: 0; font-style: normal; font-size: .7em; font-weight: 800; color: #fff; background: #2563eb; border-radius: 6px; padding: 1px 6px; }
        .lb-meta { display: flex; align-items: center; gap: 8px; margin-top: 4px; font-size: .74em; color: #6b7280; font-weight: 600; }
        .lb-bar { flex: 1; max-width: 140px; height: 5px; border-radius: 999px; background: #f1f5f9; overflow: hidden; }
        .lb-bar > i { display: block; height: 100%; border-radius: 999px; background: linear-gradient(90deg, #a78bfa, #7c3aed); }
        .lb-right { text-align: right; flex-shrink: 0; }
        .lb-exp { display: inline-flex; align-items: center; gap: 4px; font-weight: 900; color: #7c3aed; font-variant-numeric: tabular-nums; }
        .lb-stk { display: flex; align-items: center; justify-content: flex-end; gap: 3px; font-size: .74em; font-weight: 700; color: #ea580c; margin-top: 2px; }
        /* Vị trí của bạn */
        .lb-me { position: sticky; bottom: 10px; z-index: 5; display: flex; align-items: center; gap: 12px; margin-top: 14px; padding: 12px 14px; border-radius: 16px; cursor: pointer;
            color: #fff; background: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%); box-shadow: 0 14px 30px -12px rgba(79,70,229,.6); }
        .lb-me .lb-av { border: 2px solid rgba(255,255,255,.7); }
        .lb-me-rank { display: flex; flex-direction: column; align-items: center; min-width: 44px; line-height: 1; }
        .lb-me-rank small { font-size: .62em; font-weight: 700; opacity: .8; text-transform: uppercase; letter-spacing: .4px; }
        .lb-me-rank b { font-size: 1.45em; font-weight: 900; margin-top: 3px; }
        .lb-me .lb-main .t { font-weight: 800; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .lb-me .lb-main .s { font-size: .76em; opacity: .9; font-weight: 600; margin-top: 2px; }
        .lb-me .lb-exp, .lb-me .lb-stk { color: #fff; }
        .lb-me .lb-exp svg { color: #fde68a; }
        .lb-sk { display: block; border-radius: 10px; background: linear-gradient(90deg, #eef2f7 25%, #f8fafc 50%, #eef2f7 75%); background-size: 200% 100%; animation: lbSk 1.3s ease-in-out infinite; }
        @keyframes lbSk { 0% { background-position: 100% 0; } 100% { background-position: -100% 0; } }
        .lb-err { text-align: center; padding: 30px 10px; color: #6b7280; display: flex; flex-direction: column; align-items: center; gap: 8px; }
        body.dark-mode .lb { color: #f1f5f9; }
        body.dark-mode .lb-pd, body.dark-mode .lb-row { background: #1e293b; border-color: #334155; }
        body.dark-mode .lb-pd.r1 { background: linear-gradient(180deg, #3a2a05, #1e293b 70%); }
        body.dark-mode .lb-pd.r3 { background: linear-gradient(180deg, #3a1a07, #1e293b 70%); }
        body.dark-mode .lb-row.me { background: #172554; border-color: #1e40af; }
        body.dark-mode .lb-no, body.dark-mode .lb-bar, body.dark-mode .lb-chip { background: #0f172a; border-color: #334155; }
        body.dark-mode .lb-pd .lb-av, body.dark-mode .lb-pd-rank { border-color: #1e293b; }
        body.dark-mode .lb-sub, body.dark-mode .lb-meta, body.dark-mode .lb-pd-lv { color: #94a3b8; }
        @media (max-width: 600px) {
            .lb { padding: 16px 10px; }
            .lb-podium { gap: 6px; }
            .lb-pd { padding: 14px 4px 0; border-radius: 14px; }
            .lb-pd.r1 { padding-top: 22px; }
            .lb-pd .lb-av { width: 46px; height: 46px; font-size: .95em; }
            .lb-pd.r1 .lb-av { width: 56px; height: 56px; }
            .lb-pd-name { font-size: .84em; }
            .lb-pd-lv { display: none; }
            .lb-pd-base { margin-left: -4px; margin-right: -4px; }
            .lb-row { padding: 9px 10px; gap: 9px; }
            .lb-row .lb-av { width: 36px; height: 36px; font-size: .82em; }
            .lb-bar { display: none; }
            .lb-chip { display: none; }
            .lb-me-lv { display: none; }
            .lb-me { gap: 9px; padding: 10px 12px; }
        }
    `;

    function renderLeaderboard() {
        const container = document.getElementById('lbList');
        if (!container) return;

        if (!document.getElementById('lbStyle')) {
            const st = document.createElement('style');
            st.id = 'lbStyle';
            st.textContent = LB_CSS;
            document.head.appendChild(st);
        }

        const skRow = '<div class="lb-row" style="pointer-events:none"><span class="lb-sk" style="width:28px;height:28px"></span><span class="lb-sk" style="width:42px;height:42px;border-radius:50%"></span><div class="lb-main"><span class="lb-sk" style="width:45%;height:12px"></span><span class="lb-sk" style="width:25%;height:10px;margin-top:7px"></span></div><span class="lb-sk" style="width:60px;height:14px"></span></div>';
        container.innerHTML = '<div class="lb">' + headHTML('Đang tải…') +
            '<div class="lb-podium">' + [1, 2, 3].map(i => '<span class="lb-sk" style="height:' + (i === 2 ? 210 : i === 1 ? 180 : 160) + 'px;border-radius:18px"></span>').join('') + '</div>' +
            '<div class="lb-rows">' + skRow + skRow + skRow + '</div></div>';

        if (typeof firebase === 'undefined') return;
        const db = firebase.firestore();
        const currentUid = window.currentUserUid;

        db.collection('users').get().then(snap => {
            lbUsers = [];
            snap.docs.forEach(doc => {
                const d = doc.data();
                d._uid = doc.id;
                d._exp = calcExp(d);
                d._effectiveStreak = getEffectiveStreak(d);
                lbUsers.push(d);
            });
            lbUsers.sort((a, b) => b._exp - a._exp);
            renderList(currentUid);
            
            if (typeof confetti !== 'undefined') {
                confetti({ particleCount: 150, spread: 80, origin: { y: 0.5 }, disableForReducedMotion: true });
            }
        }).catch(() => {
            container.innerHTML = '<div class="lb">' + headHTML('') + '<div class="lb-err">' + tile('alert', 'coral', 'lg') + '<b>Không tải được bảng xếp hạng</b><span>Vui lòng kiểm tra kết nối mạng rồi thử lại.</span></div></div>';
        });
    }

    function headHTML(sub) {
        return '<div class="lb-head"><div class="lb-head-l">' + tile('trophy', 'amber') +
            '<div><div class="lb-title-t">Bảng xếp hạng</div><div class="lb-sub">' + (sub || 'Top 10 thành viên theo điểm EXP') + '</div></div></div>' +
            '<span class="lb-chip">' + ic('star') + '10 phút học = 5 EXP</span></div>';
    }

    function podiumHTML(u, r) {
        if (!u) return '<div></div>';
        return '<div class="lb-pd r' + r + '" onclick="window.lbShowProfile(' + arg(u._uid) + ')">' +
            (r === 1 ? '<span class="lb-pd-crown">' + ic('crown') + '</span>' : '') +
            '<div class="lb-pd-avwrap">' + avatar(u) + '<span class="lb-pd-rank">' + r + '</span></div>' +
            '<div class="lb-pd-name">' + esc(displayName(u)) + '</div>' +
            '<div class="lb-pd-lv">' + esc(levelPlain(u._exp)) + '</div>' +
            '<div class="lb-pd-exp">' + ic('star') + fmt(u._exp) + '</div>' +
            '<div class="lb-pd-stk">' + ic('flame') + esc(u._effectiveStreak) + ' ngày</div>' +
            '<div class="lb-pd-base">' + r + '</div></div>';
    }

    function renderList(currentUid) {
        const container = document.getElementById('lbList');
        if (!container || lbUsers.length === 0) return;

        let myRank = -1, myUser = null;
        lbUsers.forEach((u, i) => { if (u._uid === currentUid) { myRank = i; myUser = u; } });
        const top = Math.max(1, lbUsers[0]._exp);

        let html = '<div class="lb">' + headHTML() +
            '<div class="lb-podium">' + podiumHTML(lbUsers[1], 2) + podiumHTML(lbUsers[0], 1) + podiumHTML(lbUsers[2], 3) + '</div>' +
            '<div class="lb-rows">';
        const endIdx = Math.min(9, lbUsers.length - 1);
        for (let i = 3; i <= endIdx; i++) {
            const u = lbUsers[i], me = u._uid === currentUid;
            html += '<div class="lb-row' + (me ? ' me' : '') + '" onclick="window.lbShowProfile(' + arg(u._uid) + ')">' +
                '<span class="lb-no">' + (i + 1) + '</span>' + avatar(u) +
                '<div class="lb-main"><div class="lb-name"><span>' + esc(displayName(u)) + '</span>' + (me ? '<em class="lb-you">Bạn</em>' : '') + '</div>' +
                '<div class="lb-meta">' + esc(levelPlain(u._exp)) + esc(badgeCount(u)) + '<span class="lb-bar"><i style="width:' + Math.round(u._exp / top * 100) + '%"></i></span></div></div>' +
                '<div class="lb-right"><div class="lb-exp">' + ic('star') + fmt(u._exp) + '</div><div class="lb-stk">' + ic('flame') + esc(u._effectiveStreak) + ' ngày</div></div></div>';
        }
        html += '</div>';

        if (myUser) {
            const above = myRank > 0 ? lbUsers[myRank - 1] : null;
            const gap = above ? Math.max(1, above._exp - myUser._exp + 1) : 0;
            const sub = myRank === 0 ? 'Bạn đang dẫn đầu bảng xếp hạng!' : 'Còn ' + fmt(gap) + ' EXP để vượt lên hạng ' + myRank;
            html += '<div class="lb-me" onclick="window.lbShowProfile(' + arg(currentUid) + ')">' +
                '<div class="lb-me-rank"><small>Hạng</small><b>' + (myRank + 1) + '</b></div>' + avatar(myUser) +
                '<div class="lb-main"><div class="t">' + esc(myUser.fullName && myUser.fullName.trim() ? myUser.fullName : 'Bạn') + '<span class="lb-me-lv"> · ' + esc(levelPlain(myUser._exp)) + '</span></div><div class="s">' + sub + '</div></div>' +
                '<div class="lb-right"><div class="lb-exp">' + ic('star') + fmt(myUser._exp) + '</div><div class="lb-stk">' + ic('flame') + esc(myUser._effectiveStreak) + ' ngày</div></div></div>';
        }
        html += '</div>';
        container.innerHTML = html;
    }

    window.lbShowProfile = function (uid) {
        const u = lbUsers.find(x => x._uid === uid);
        if (!u) return;
        if (window.showGlobalUserProfile) {
            window.showGlobalUserProfile(uid, displayName(u));
        } else {
            console.error("showGlobalUserProfile is not loaded.");
        }
    };

    window.renderLeaderboard = renderLeaderboard;

})();
