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
                .lb-podium { display: flex; align-items: flex-end; justify-content: center; gap: 15px; margin: 30px 0 25px; padding: 0 10px; }
                .lb-podium-item { flex: 1; max-width: 110px; display: flex; flex-direction: column; align-items: center; cursor: pointer; transition: 0.2s;}
                .lb-podium-item:hover { transform: translateY(-5px); }
                .lb-avatar { font-size: 2.5em; margin-bottom: -15px; z-index: 10; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.1)); background: #fff; border-radius: 50%; width: 55px; height: 55px; display: flex; align-items: center; justify-content: center; border: 3px solid white;}
                .lb-avatar.rank-1 { font-size: 3em; width: 70px; height: 70px; margin-bottom: -20px; border-color: #facc15;}
                .lb-avatar.rank-2 { border-color: #cbd5e1; }
                .lb-avatar.rank-3 { border-color: #f97316; }
                .lb-bar { width: 100%; border-radius: 16px 16px 0 0; text-align: center; color: white; display: flex; flex-direction: column; justify-content: flex-start; padding-top: 30px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); }
                .lb-bar.rank-1 { height: 160px; background: linear-gradient(135deg, #facc15 0%, #eab308 100%); }
                .lb-bar.rank-2 { height: 120px; background: linear-gradient(135deg, #94a3b8 0%, #64748b 100%); }
                .lb-bar.rank-3 { height: 90px; background: linear-gradient(135deg, #fb923c 0%, #ea580c 100%); }
                .lb-bar-name { font-weight: 800; font-size: 0.9em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 90%; margin: 0 auto;}
                .lb-bar-exp { font-weight: 800; font-size: 0.85em; opacity: 0.9; margin-top: 4px;}
                .lb-rows-wrap { padding: 0 15px 15px 15px; }
                .lb-row { display: flex; align-items: center; padding: 14px 15px; border-bottom: 1px solid #f1f5f9; transition: 0.15s; background: #fff; border-radius: 12px; margin-bottom: 8px; cursor:pointer;}
                .lb-row:last-child { border-bottom: none; margin-bottom:0; }
                .lb-row:hover { background: #f8fafc; border-color:#e2e8f0; transform: translateX(5px);}
                .lb-rank { width: 40px; font-size: 1.25em; font-weight: 900; text-align: center; flex-shrink: 0; color:#94a3b8;}
                .lb-row-avatar { font-size: 1.8em; background: #f1f5f9; border-radius: 50%; width: 45px; height: 45px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;}
                .lb-name { flex: 1; font-size: 1.05em; font-weight: 800; color: #1e293b; padding: 5px 0 5px 10px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;}
                .lb-score { font-weight: 800; color: #7c3aed; font-size: 1.05em; flex-shrink: 0; text-align:right;}
                .lb-me-sticky { position: sticky; bottom: 0; background: rgba(255,255,255,0.98); backdrop-filter: blur(10px); border-top: 2px solid #3b82f6; padding: 15px 20px; display: flex; align-items: center; justify-content: space-between; box-shadow: 0 -4px 15px rgba(0,0,0,0.06); z-index: 20; border-radius: 0 0 16px 16px; min-height: 80px; box-sizing: border-box; cursor: pointer; transition: 0.2s;}
                .lb-me-sticky:hover { background: #eff6ff; }
                .lb-me-sticky .rank { font-size: 1.5em; font-weight: 900; color: #3b82f6; width: 40px; text-align:center;}
                .lb-me-sticky .info { flex:1; padding-left: 15px; }
                .lb-me-sticky .name { font-weight: 800; font-size: 1.15em; color: #1e293b; }
                .lb-me-sticky .exp { font-weight: 900; color: #7c3aed; font-size: 1.2em; }
                @keyframes floatAvatar { 0% { transform: translateY(0px) rotate(0deg); } 50% { transform: translateY(-8px) rotate(4deg); } 100% { transform: translateY(0px) rotate(0deg); } }
                .avatar-float { animation: floatAvatar 2.5s ease-in-out infinite; display: inline-block;}
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

    function getPodiumHTML(u, rankBox, isCenter) {
        if(!u) return `<div class="lb-podium-item" style="opacity:0"></div>`;
        const av = getUserAvatar(u._uid);
        return `
            <div class="lb-podium-item" onclick="window.lbShowProfile('${u._uid}')">
                <div class="lb-avatar rank-${rankBox}">${av}</div>
                <div class="lb-bar rank-${rankBox}">
                    <div class="lb-bar-name">${u.fullName || 'Ẩn danh'}</div>
                    <div class="lb-bar-exp">${u._exp} ⭐</div>
                    <div style="font-size: 0.75em; opacity: 0.9; font-weight:900; margin-top:2px;">${u._effectiveStreak} 🔥</div>
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
            <div style="text-align:center; padding: 25px 0 10px; font-weight:900; font-size:1.5em; color:#1e293b; text-transform:uppercase; letter-spacing:1px;">🏆 BẢNG XẾP HẠNG</div>
            <div class="lb-podium">
                ${getPodiumHTML(lbUsers[1], 2, false)}
                ${getPodiumHTML(lbUsers[0], 1, true)}
                ${getPodiumHTML(lbUsers[2], 3, false)}
            </div>
            <div class="lb-rows-wrap">
        `;

        for(let i=3; i<lbUsers.length; i++) {
            let u = lbUsers[i];
            html += `
                <div class="lb-row" onclick="window.lbShowProfile('${u._uid}')">
                    <div class="lb-rank">${i+1}</div>
                    <div class="lb-row-avatar">${getUserAvatar(u._uid)}</div>
                    <div class="lb-name">${u.fullName || 'Ẩn danh'}</div>
                    <div class="lb-score">
                        <div style="color: #7c3aed; font-weight:900;">${u._exp} ⭐</div>
                        <div style="font-size:0.8em; color:#f59e0b; font-weight:800;">${u._effectiveStreak} 🔥</div>
                    </div>
                </div>
            `;
        }
        html += `</div>`;

        if (myUser) {
            html += `
                <div class="lb-me-sticky" onclick="window.lbShowProfile('${currentUid}')">
                    <div class="rank">${myRank + 1}</div>
                    <div class="lb-row-avatar">${getUserAvatar(currentUid)}</div>
                    <div class="info">
                        <div class="name">${myUser.fullName || 'Bạn'}</div>
                        <div style="font-size:0.85em; color: #64748b; font-weight:700;">Hạng hiện tại của bạn</div>
                    </div>
                    <div class="lb-score">
                        <div class="exp">${myUser._exp} ⭐</div>
                        <div style="font-size:0.85em; color:#f59e0b; font-weight:800;">${myUser._effectiveStreak} 🔥</div>
                    </div>
                </div>
            `;
        }

        container.innerHTML = html;
    }

    window.lbShowProfile = function (uid) {
        const u = lbUsers.find(x => x._uid === uid);
        if (!u) return;

        const sticker = STICKERS[Math.floor(Math.random() * STICKERS.length)];
        const el = document.getElementById('cuteSticker');
        if (el) {
            el.textContent = sticker;
            el.classList.remove('avatar-float');
            void el.offsetWidth; // trigger reflow
            el.classList.add('avatar-float');
        }

        document.getElementById('upName').innerText = u.fullName || 'Ẩn danh';
        document.getElementById('upJoin').innerText = `Gia nhập: ${formatJoinDate(u.joinDate)}`;
        document.getElementById('upLevel').innerText = getLevelName(u._exp);
        document.getElementById('upStreak').innerHTML = `${getEffectiveStreak(u)} 🔥`;
        
        let totalMins = u.totalStudyMinutes || 0;
        document.getElementById('upTime').innerHTML = `${totalMins} ph`;
        document.getElementById('upExp').innerHTML = `${u._exp} ⭐`;

        let modal = document.getElementById('userProfileModal');
        if (modal) modal.style.display = 'flex';
    };

    window.renderLeaderboard = renderLeaderboard;

})();
