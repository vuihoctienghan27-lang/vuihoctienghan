/* ==========================================================================
   VOCAB-STATS.JS — Đếm số từ vựng đã học của học viên
   Lắng nghe users/{uid}/vocabulary, đếm số từ DISTINCT (bỏ folder marker)
   rồi ghi users/{uid}.stats.vocabLearned (idempotent, tự đồng bộ khi xoá/thêm).
   ========================================================================== */
(function () {
    'use strict';

    function tryStart() {
        if (typeof firebase === 'undefined' || !firebase.auth || !firebase.firestore) {
            setTimeout(tryStart, 500);
            return;
        }
        firebase.auth().onAuthStateChanged(user => {
            if (!user) return;
            const db = firebase.firestore();
            db.collection('users').doc(user.uid).collection('vocabulary').onSnapshot(snap => {
                const words = new Set();
                snap.forEach(d => {
                    const data = d.data();
                    const w = data.word;
                    if (!w || w === '__folder_marker__') return;
                    // Bỏ qua từ do hệ thống tự đồng bộ vào thư mục Daily Vocab
                    if ((data.listName || '').startsWith('Daily Vocab')) return;
                    words.add(w);
                });
                const userRef = db.collection('users').doc(user.uid);
                // update() để dot notation được hiểu là field lồng
                userRef.set({}, { merge: true }).then(() =>
                    userRef.update({ 'stats.vocabLearned': words.size })
                ).catch(() => {});
            }, err => console.log('[VocabStats] snapshot error:', err));
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', tryStart);
    } else {
        tryStart();
    }
})();
