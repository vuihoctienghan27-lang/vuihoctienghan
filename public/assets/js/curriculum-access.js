/* ==========================================================================
   QUYỀN XEM GIÁO TRÌNH THEO LỚP — dùng chung cho lesson/index.html, lesson/lesson.html, vocab.html
   --------------------------------------------------------------------------
   - Admin: xem mọi giáo trình, mọi bài.
   - Học viên: chỉ xem giáo trình đã được GÁN cho lớp mình đã ghi danh
     (users/{uid}.unlockedSharedFolders → shared_folders/{id}.curLinks[curId].lessons).
     Chỉ thấy các bài đã giao (gộp từ mọi lớp của học viên).
   - Trước khi đọc, học viên tạo "thẻ đọc" curricula/{curId}/readers/{uid} = { folder } trỏ tới
     một lớp có gán giáo trình đó — firestore.rules kiểm tra lại thẻ mỗi lần đọc.
   ========================================================================== */
(function () {
    'use strict';

    const ADMIN_EMAILS = ['nmhieu2526@gmail.com', 'vuihoctienghan27@gmail.com']; // khớp isAdmin() trong rules
    const db = () => firebase.firestore();
    const cache = { uid: null, classes: null, readers: {} };

    function isAdmin(user) { return !!(user && user.email && ADMIN_EMAILS.includes(user.email.toLowerCase())); }

    // Các lớp học viên đã ghi danh (doc lớp đọc được nhờ students/{uid})
    async function myClasses(user) {
        if (!user) return [];
        if (cache.uid === user.uid && cache.classes) return cache.classes;
        const u = await db().collection('users').doc(user.uid).get().catch(() => null);
        const ids = [...new Set((u && u.exists && u.data().unlockedSharedFolders) || [])];
        const docs = await Promise.all(ids.map(id => db().collection('shared_folders').doc(id).get().catch(() => null)));
        cache.uid = user.uid;
        cache.classes = docs.filter(d => d && d.exists).map(d => ({ id: d.id, ...d.data() }));
        return cache.classes;
    }

    // { curId: { title, classes: [{ id, name }], lessons: Set<lessonId> } } — gộp từ mọi lớp
    async function assignedCurricula(user) {
        const out = {};
        (await myClasses(user)).forEach(f => {
            Object.entries(f.curLinks || {}).forEach(([cid, link]) => {
                const a = out[cid] = out[cid] || { title: (link && link.title) || '', classes: [], lessons: new Set() };
                a.classes.push({ id: f.id, name: f.name || '' });
                Object.keys((link && link.lessons) || {}).forEach(lid => a.lessons.add(lid));
            });
        });
        return out;
    }

    // Tạo / làm mới thẻ đọc cho một giáo trình. Trả về false nếu không lớp nào gán giáo trình này.
    async function ensureReader(user, curId, force) {
        if (!user) return false;
        if (isAdmin(user)) return true;
        if (!force && cache.readers[curId]) return true;
        const cls = (await myClasses(user)).find(f => f.curLinks && f.curLinks[curId]);
        if (!cls) return false;
        await db().collection('curricula').doc(curId).collection('readers').doc(user.uid)
            .set({ folder: cls.id, at: firebase.firestore.FieldValue.serverTimestamp() });
        cache.readers[curId] = cls.id;
        return true;
    }

    // Đọc một doc của giáo trình (curricula/{id} hoặc doc con); thiếu quyền thì làm mới thẻ đọc rồi thử lại.
    async function getWithAccess(user, curId, ref) {
        if (!isAdmin(user) && user && !cache.readers[curId]) await ensureReader(user, curId).catch(() => { });
        try { return await ref.get(); } catch (e) {
            if (!user || isAdmin(user)) throw e;
            const ok = await ensureReader(user, curId, true).catch(() => false);
            if (!ok) throw e;
            return ref.get();
        }
    }

    // Danh sách giáo trình xem được: admin = tất cả; học viên = đã gán cho lớp (kèm allowed = Set bài được giao)
    async function listCurricula(user) {
        const col = db().collection('curricula');
        if (isAdmin(user)) {
            const snap = await col.get();
            return snap.docs.map(d => ({ id: d.id, ...d.data(), allowed: null }));
        }
        if (!user) return [];
        const assigned = await assignedCurricula(user);
        const res = await Promise.all(Object.keys(assigned).map(async cid => {
            try {
                const d = await getWithAccess(user, cid, col.doc(cid));
                return d.exists ? { id: d.id, ...d.data(), allowed: assigned[cid].lessons, classes: assigned[cid].classes } : null;
            } catch (e) { return null; }
        }));
        return res.filter(Boolean);
    }

    // Bài được giao của một giáo trình (null = tất cả, dành cho admin)
    async function allowedLessons(user, curId) {
        if (isAdmin(user)) return null;
        const a = (await assignedCurricula(user))[curId];
        return a ? a.lessons : new Set();
    }

    function reset() { cache.uid = null; cache.classes = null; cache.readers = {}; }

    window.CurriculumAccess = { isAdmin, myClasses, assignedCurricula, ensureReader, getWithAccess, listCurricula, allowedLessons, reset };
})();
