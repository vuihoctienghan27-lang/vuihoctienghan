/* ==========================================================================
   LEADERBOARD.JS — V2 Flat Design with Podium & Confetti
   ========================================================================== */

(function () {
    'use strict';

    const STICKERS = ['🐶', '🐱', '🦊', '🐻', '🐼', '🦄', '🐯', '🐰', '🦁', '🐨', '🐸', '🐙', '🦋', '🌸', '⭐', '🔥', '💎', '🌈', '🎯', '🚀'];

    let lbUsers = [];
    
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

    function getUserAvatar(uid) {
        let u = lbUsers.find(x => x._uid === uid);
        if (u) {
            if (!u._sticker) u._sticker = STICKERS[Math.floor(Math.random() * STICKERS.length)];
            return u._sticker;
        }
        return STICKERS[Math.floor(Math.random() * STICKERS.length)];
    }

    function renderLeaderboard() {
        const container = document.getElementById('lbList');
        if (!container) return;

        if (!document.getElementById('lbAnimStyle')) {
            const s = document.createElement('style');
            s.id = 'lbAnimStyle';
            s.textContent = `
                .lb-podium { display: flex; align-items: flex-end; justify-content: center; gap: 15px; margin: 24px 10px 20px; }
                .lb-podium-item { flex: 1; max-width: 110px; display: flex; flex-direction: column; align-items: center; cursor: pointer; transition: 0.2s; }
                .lb-podium-item:hover { transform: translateY(-5px); }
                .lb-avatar { font-size: 2.4em; margin-bottom: -15px; z-index: 10; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.15)); background: var(--bg-card); border-radius: 50%; width: 55px; height: 55px; display: flex; align-items: center; justify-content: center; border: 3px solid var(--border-color);}
                .lb-avatar.rank-1 { font-size: 3em; width: 70px; height: 70px; margin-bottom: -20px; border-color: #facc15; box-shadow: 0 0 0 4px rgba(250,204,21,0.22); }
                .lb-avatar.rank-2 { border-color: #cbd5e1; }
                .lb-avatar.rank-3 { border-color: #f97316; }
                .lb-bar { width: 100%; border-radius: 16px 16px 0 0; text-align: center; color: #fff; display: flex; flex-direction: column; justify-content: flex-start; padding-top: 30px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.15); position: relative; }
                .lb-medal { position: absolute; top: 4px; left: 50%; transform: translateX(-50%); font-size: 1.15em; }
                .lb-bar.rank-1 { height: 150px; background: linear-gradient(135deg, #facc15 0%, #eab308 100%); }
                .lb-bar.rank-2 { height: 115px; background: linear-gradient(135deg, #94a3b8 0%, #64748b 100%); }
                .lb-bar.rank-3 { height: 88px; background: linear-gradient(135deg, #fb923c 0%, #ea580c 100%); }
                .lb-bar-name { font-weight: 800; font-size: 0.9em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 90%; margin: 0 auto; color: #fff; }
                .lb-bar-exp { font-weight: 800; font-size: 0.85em; opacity: 0.95; margin-top: 4px; }
                .lb-rows-wrap { padding: 4px 14px 6px; }
                .lb-row { display: flex; align-items: center; gap: 12px; padding: 12px 14px; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 14px; margin-bottom: 8px; cursor: pointer; transition: 0.18s; }
                .lb-row:hover { border-color: #2563eb; transform: translateX(4px); box-shadow: 0 6px 16px rgba(0,0,0,0.08); }
                .lb-rank { width: 34px; text-align: center; flex-shrink: 0; font-weight: 900; font-size: 1.05em; color: var(--text-sub); }
                .lb-rank.gold { color: #f59e0b; }
                .lb-row-avatar { font-size: 1.7em; background: var(--btn-hover); border-radius: 50%; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
                .lb-name-wrap { flex: 1; min-width: 0; padding-left: 4px; }
                .lb-name { font-size: 1.02em; font-weight: 800; color: var(--text-main); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
                .lb-title { font-size: 0.78em; color: #f59e0b; font-weight: 700; margin-top: 1px; }
                .lb-score { flex-shrink: 0; text-align: right; }
                .lb-score .exp { font-weight: 900; color: #8b5cf6; font-size: 1.05em; }
                .lb-score .stk { font-size: 0.8em; color: #f59e0b; font-weight: 800; }
                .lb-me-sticky { position: sticky; bottom: 8px; background: var(--bg-card); border: 2px solid #3b82f6; border-radius: 16px; margin: 10px 14px 12px; padding: 12px 14px; display: flex; align-items: center; gap: 12px; box-shadow: 0 6px 20px rgba(59,130,246,0.22); z-index: 20; cursor: pointer; transition: 0.2s; }
                .lb-me-sticky:hover { background: #eff6ff; }
                body.dark-mode .lb-me-sticky:hover { background: #172554; }
                .lb-me-sticky .rank { font-size: 1.4em; font-weight: 900; color: #3b82f6; width: 44px; text-align: center; flex-shrink: 0; }
                .lb-me-sticky .info { flex: 1; min-width: 0; }
                .lb-me-sticky .name { font-weight: 800; font-size: 1.1em; color: var(--text-main); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
                .lb-me-sticky .sub { font-size: 0.8em; color: var(--text-sub); font-weight: 700; }
                .lb-me-sticky .exp { font-weight: 900; color: #8b5cf6; font-size: 1.15em; }
            `;
            document.head.appendChild(s);
        }

        container.innerHTML = `<div style="text-align:center; padding: 40px; color:#64748b; font-weight:700;">Đang tải dữ liệu...</div>`;

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
            container.innerHTML = `<p style="text-align:center;color:#ef4444;font-weight:700;padding:40px;">⚠️ Lỗi tải dữ liệu.</p>`;
        });
    }

    function getPodiumHTML(u, rankBox, medal) {
        if(!u) return `<div class="lb-podium-item" style="opacity:0"></div>`;
        const av = getUserAvatar(u._uid);
        return `
            <div class="lb-podium-item" onclick="window.lbShowProfile('${u._uid}')">
                <div class="lb-avatar rank-${rankBox}">${av}</div>
                <div class="lb-bar rank-${rankBox}">
                    <div class="lb-medal">${medal}</div>
                    <div class="lb-bar-name">${u.fullName || 'Ẩn danh'}</div>
                    <div class="lb-bar-exp">${u._exp} ⭐</div>
                    <div style="font-size: 0.75em; opacity: 0.92; font-weight:900; margin-top:2px;">${u._effectiveStreak} 🔥</div>
                </div>
            </div>
        `;
    }

    function renderList(currentUid) {
        const container = document.getElementById('lbList');
        if (!container || lbUsers.length === 0) return;

        let myRank = -1;
        let myUser = null;
        lbUsers.forEach((u, i) => { if (u._uid === currentUid) { myRank = i; myUser = u; } });

        let html = `
            <div style="text-align:center; padding: 22px 10px 2px; font-weight:900; font-size:1.3em; color:var(--text-main); text-transform:uppercase; letter-spacing:1px;">🏆 BẢNG XẾP HẠNG</div>
            <div style="text-align:center; font-size:0.85em; color:var(--text-sub); font-weight:700; margin-bottom:4px;">Top 10 thành viên nổi bật nhất</div>
            <div class="lb-podium">
                ${getPodiumHTML(lbUsers[1], 2, '🥈')}
                ${getPodiumHTML(lbUsers[0], 1, '🥇')}
                ${getPodiumHTML(lbUsers[2], 3, '🥉')}
            </div>
            <div class="lb-rows-wrap">
        `;

        const endIdx = Math.min(9, lbUsers.length - 1);
        for (let i = 3; i <= endIdx; i++) {
            let u = lbUsers[i];
            html += `
                <div class="lb-row" onclick="window.lbShowProfile('${u._uid}')">
                    <div class="lb-rank ${i < 6 ? 'gold' : ''}">${i + 1}</div>
                    <div class="lb-row-avatar">${getUserAvatar(u._uid)}</div>
                    <div class="lb-name-wrap">
                        <div class="lb-name">${u.fullName || 'Ẩn danh'}</div>
                        <div class="lb-title">${getLevelName(u._exp)}</div>
                    </div>
                    <div class="lb-score">
                        <div class="exp">${u._exp} ⭐</div>
                        <div class="stk">${u._effectiveStreak} 🔥</div>
                    </div>
                </div>
            `;
        }
        html += `</div>`;

        if (myUser) {
            html += `
                <div class="lb-me-sticky" onclick="window.lbShowProfile('${currentUid}')">
                    <div class="rank">#${myRank + 1}</div>
                    <div class="lb-row-avatar">${getUserAvatar(currentUid)}</div>
                    <div class="info">
                        <div class="name">${myUser.fullName || 'Bạn'}</div>
                        <div class="sub">Vị trí của bạn · ${getLevelName(myUser._exp)}</div>
                    </div>
                    <div class="lb-score">
                        <div class="exp">${myUser._exp} ⭐</div>
                        <div class="stk">${myUser._effectiveStreak} 🔥</div>
                    </div>
                </div>
            `;
        }

        container.innerHTML = html;
    }

    window.lbShowProfile = function (uid) {
        const u = lbUsers.find(x => x._uid === uid);
        if (!u) return;
        if (window.showGlobalUserProfile) {
            window.showGlobalUserProfile(uid, u.fullName || 'Ẩn danh');
        } else {
            console.error("showGlobalUserProfile is not loaded.");
        }
    };

    window.renderLeaderboard = renderLeaderboard;

})();
