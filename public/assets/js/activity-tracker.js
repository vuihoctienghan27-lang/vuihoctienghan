/* ==========================================================================
   ACTIVITY-TRACKER.JS
   Theo dõi thời gian học chủ động: đề thi & vocab game mypage
   - Dừng khi: đổi tab, idle 10 phút, chưa chọn chế độ học
   - Cứ 10 phút hợp lệ → +5 EXP
   - Mỗi giờ học đủ hôm nay → +N*10 EXP thưởng
   - Reset hàng ngày theo múi giờ thiết bị
   ========================================================================== */
(function () {
    'use strict';

    const IDLE_MS   = 10 * 60 * 1000; // 10 phút không tương tác → dừng
    const TICK_MS   = 60 * 1000;      // Kiểm tra mỗi 1 phút

    let uid             = null;
    let db              = null;
    let tabVisible      = !document.hidden;
    let lastActivity    = Date.now();
    let ticker          = null;
    let localTodayMins  = 0;  // Đã học bao nhiêu phút hôm nay (đọc từ Firestore)
    let localBlocksDone = 0;  // Số block 10-phút đã tính EXP
    let hourBonusGiven  = 0;  // Số giờ đã thưởng bonus hôm nay
    let initDone        = false;

    /* ---------- Helpers ---------- */
    function localDate() {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    }

    function isPageLearning() {
        const path = window.location.pathname;
        if (path.includes('mypage.html')) {
            // mypage: chỉ khi modal game vocab đang mở
            const modal = document.getElementById('studyModal');
            return !!(modal && modal.style.display === 'flex');
        }
        // Trang đề thi: chỉ khi học viên đã chọn chế độ
        return !!window.learningActive;
    }

    function isTracking() {
        return uid && tabVisible && !isIdle() && isPageLearning();
    }

    function isIdle() {
        return Date.now() - lastActivity > IDLE_MS;
    }

    /* ---------- Khởi tạo trạng thái từ Firestore ---------- */
    async function initState() {
        if (!uid || !db) return;
        const today = localDate();
        try {
            const snap = await db.collection('users').doc(uid).get();
            if (snap.exists) {
                const data = snap.data();
                localTodayMins  = (data.dailyStudyData?.[today]) || 0;
                localBlocksDone = Math.floor(localTodayMins / 10);
                hourBonusGiven  = (data.hourBonusData?.[today]) || 0;
            }
        } catch(e) { console.log('[Tracker] Init error:', e); }
        initDone = true;
    }

    /* ---------- Tick mỗi phút ---------- */
    async function tick() {
        if (!initDone || !isTracking()) return;

        const today = localDate();
        localTodayMins++;

        // EXP cho mỗi 10 phút
        const newBlocks = Math.floor(localTodayMins / 10);
        const blockExp = (newBlocks - localBlocksDone) * 5;
        localBlocksDone = newBlocks;

        // Bonus giờ
        const newHours = Math.floor(localTodayMins / 60);
        let hourExp = 0;
        if (newHours > hourBonusGiven) {
            for (let h = hourBonusGiven + 1; h <= newHours; h++) {
                hourExp += h * 10; // 1h: 10, 2h: 20, 3h: 30 ...
            }
            hourBonusGiven = newHours;
        }

        // Ghi Firestore
        try {
            const updates = {
                [`dailyStudyData.${today}`]: firebase.firestore.FieldValue.increment(1),
                totalStudyMinutes: firebase.firestore.FieldValue.increment(1),
            };
            if (blockExp > 0) {
                updates.bonusEXP = firebase.firestore.FieldValue.increment(blockExp);
            }
            if (hourExp > 0) {
                updates.bonusEXP = firebase.firestore.FieldValue.increment(
                    (blockExp || 0) + hourExp
                );
                updates[`hourBonusData.${today}`] = newHours;
                setTimeout(() => {
                    if (typeof Swal !== 'undefined') {
                        Swal.fire({icon: 'success', title: 'Hoàn thành giờ học!', text: `🎉 Tuyệt vời! Bạn đã học ${newHours} giờ hôm nay và nhận ${hourExp} EXP thưởng!`, confirmButtonColor: '#2563eb'});
                    } else {
                        alert(`🎉 Tuyệt vời! Bạn đã học ${newHours} giờ hôm nay và nhận ${hourExp} EXP thưởng!`);
                    }
                }, 200);
            }
            await db.collection('users').doc(uid).set(updates, { merge: true });
        } catch(e) { console.log('[Tracker] Write error:', e); }
    }

    /* ---------- Khởi động ---------- */
    function start(userId, firestore) {
        uid = userId;
        db  = firestore;

        // Phát hiện tương tác
        ['mousemove','mousedown','keydown','touchstart','scroll','click'].forEach(evt => {
            document.addEventListener(evt, () => { lastActivity = Date.now(); }, { passive: true });
        });

        // Phát hiện đổi tab
        document.addEventListener('visibilitychange', () => {
            tabVisible = !document.hidden;
            if (!document.hidden) lastActivity = Date.now();
        });

        initState().then(() => {
            ticker = setInterval(tick, TICK_MS);
        });
    }

    /* ---------- Chờ Firebase ---------- */
    function tryStart() {
        if (typeof firebase === 'undefined') { setTimeout(tryStart, 500); return; }
        firebase.auth().onAuthStateChanged(user => {
            if (user) start(user.uid, firebase.firestore());
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', tryStart);
    } else {
        tryStart();
    }
})();
