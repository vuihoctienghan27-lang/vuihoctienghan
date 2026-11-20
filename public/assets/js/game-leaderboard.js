/* game-leaderboard.js — Bảng xếp hạng điểm cho các game (hwacha, starship, froggame, mugonghwa).
   - Chỉ đọc TOP N bằng truy vấn orderBy(field).limit(N) thay vì tải toàn bộ users (mỗi lần mở trước đây
     tốn số lượt đọc = số người dùng).
   - Hạng của mình (khi ngoài top): đếm bằng truy vấn count() nếu SDK hỗ trợ; nếu không thì hiện "Ngoài top N".
   - bind(): gắn sự kiện bấm bằng data-uid / data-name — KHÔNG nhét tên người dùng vào onclick="...('tên')"
     (tên đã escape HTML vẫn bị trình duyệt giải mã lại trước khi chạy JS → chèn được mã). */
(function () {
    'use strict';
    async function load(field, limit) {
        limit = limit || 10;
        const db = window.db || firebase.firestore();
        const me = window.currentUserUid || null;
        const col = db.collection('users');
        const [topSnap, meSnap] = await Promise.all([
            col.orderBy(field, 'desc').limit(limit).get(),
            me ? col.doc(me).get().catch(() => null) : Promise.resolve(null)
        ]);
        const users = [];
        topSnap.forEach(d => {
            const data = d.data();
            const score = Math.max(0, Number(data[field]) || 0);
            if (score > 0) users.push({ uid: d.id, data, score });
        });
        let myRank = null;
        const idx = users.findIndex(u => u.uid === me);
        if (idx >= 0) myRank = idx;
        else if (me && meSnap && meSnap.exists) {
            const data = meSnap.data();
            const score = Math.max(0, Number(data[field]) || 0);
            users.push({ uid: me, data, score, outside: true });
            if (score <= 0) myRank = -1; // chưa có điểm → không xếp hạng
            else {
                try {
                    const q = col.where(field, '>', score);
                    if (typeof q.count === 'function') { const c = await q.count().get(); myRank = c.data().count; }
                } catch (e) { /* không đếm được → để null */ }
            }
        }
        return { users, myRank, limit };
    }
    function rankText(myRank, limit) { return myRank === -1 ? '—' : myRank == null ? 'Ngoài top ' + (limit || 10) : '#' + (myRank + 1); }
    // Bấm vào một dòng có data-uid → mở hồ sơ (tên lấy từ data-name, không qua chuỗi JS)
    function bind(container, fn) {
        if (!container) return;
        container.onclick = e => {
            const row = e.target.closest('[data-uid]');
            if (row && container.contains(row) && typeof fn === 'function') fn(row.dataset.uid, row.dataset.name || '');
        };
    }
    window.GameLB = { load, rankText, bind };
})();
