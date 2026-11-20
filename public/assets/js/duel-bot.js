/* duel-bot.js — Chơi với máy cho thi đấu 1-1 (Kéo co trắc nghiệm, Ninja phi tiêu).
   Không cần ai khác online: tạo một "phòng giả" trong bộ nhớ, bắt chước đúng phần API Firestore mà
   duel-tug.js / duel-ninja.js dùng (update có dot-path, onSnapshot, claims chỉ tạo được 1 lần, serverTimestamp).
   Máy là người chơi thứ hai (uid 'bot') ghi vào phòng đó → hai trò chạy nguyên code, không sửa luật.

   Cách máy trả lời (mỗi câu / mỗi từ):
   - Tung xác suất đúng theo mức (kéo co: Dễ 60% · Vừa 78% · Khó 92%; Ninja: 50% · 65% · 80%).
   - Thời gian phản xạ ngẫu nhiên trong khoảng của mức; Ninja cộng thêm thời gian "gõ" theo số ký tự đáp án
     (0,38 / 0,30 / 0,23 giây mỗi ký tự — ngang tốc độ gõ trên điện thoại) vì người chơi phải gõ chứ không chọn.
   - Cân bằng nhẹ: máy đang dẫn ≥ 2 điểm thì chậm & dễ sai hơn, đang thua ≥ 2 điểm thì cố hơn → trận gay cấn tới cuối.
   - Kéo co: máy chọn sai → bị khoá câu đó, người chơi vẫn còn cơ hội. Người chơi đúng trước → máy mất lượt.
   - Ninja: máy gõ sai → phi trượt (người chơi thấy), thử lại sau ~2 giây nếu từ còn rơi. */
(function () {
    'use strict';
    const BOT = 'bot';
    const LEVELS = {
        // Ninja phải GÕ đáp án (không phải chọn) → máy chậm hơn hẳn kéo co, theo tốc độ gõ thật trên điện thoại:
        // đọc từ + nghĩ (react) rồi gõ từng ký tự (perChar). VD đáp án 8 ký tự: Dễ ~6,5–9,5 giây · Vừa ~5–7,5 · Khó ~3,8–5,8.
        easy:   { name: 'Dễ',  tug: { acc: 0.60, rt: [3500, 7500] }, ninja: { acc: 0.50, react: [3500, 6500], perChar: 380 }, exp: [5, 3, 1] },
        medium: { name: 'Vừa', tug: { acc: 0.78, rt: [2200, 5500] }, ninja: { acc: 0.65, react: [2600, 5000], perChar: 300 }, exp: [8, 4, 2] },
        hard:   { name: 'Khó', tug: { acc: 0.92, rt: [1200, 3500] }, ninja: { acc: 0.80, react: [2000, 4000], perChar: 230 }, exp: [12, 6, 2] }
    };
    const rand = (a, b) => a + Math.random() * (b - a);
    const isSentinel = v => v && typeof v.isEqual === 'function' && firebase.firestore.FieldValue && v.isEqual(firebase.firestore.FieldValue.serverTimestamp());
    function resolve(v) {
        if (isSentinel(v)) return firebase.firestore.Timestamp.fromMillis(Date.now());
        if (Array.isArray(v)) return v.map(resolve);
        if (v && typeof v === 'object' && !(typeof v.toMillis === 'function')) { const o = {}; for (const k in v) o[k] = resolve(v[k]); return o; }
        return v;
    }
    function clone(v) {
        if (Array.isArray(v)) return v.map(clone);
        if (v && typeof v === 'object' && typeof v.toMillis !== 'function') { const o = {}; for (const k in v) o[k] = clone(v[k]); return o; }
        return v;
    }
    const LAT = 40; // giả độ trễ mạng (ms)

    // ── Phòng giả ──
    function createRoom(opts) {
        const id = 'BOT' + Math.random().toString(36).slice(2, 8).toUpperCase();
        const lv = LEVELS[opts.level] || LEVELS.medium;
        const data = {
            hostId: opts.me.uid, hostName: opts.myName, guestId: BOT, guestName: 'Máy · ' + lv.name,
            status: 'playing', open: false, bot: opts.level, game: opts.game, questions: opts.questions,
            startAt: firebase.firestore.Timestamp.fromMillis(Date.now() + 300),
            ['s_' + opts.me.uid]: { score: 0, done: false }, ['s_' + BOT]: { score: 0, done: false, on: true }
        };
        if (opts.game === 'ninja') data.ninjaMode = opts.ninjaMode;
        const claims = new Map(), roomSubs = new Set(), claimSubs = new Set();
        const snap = () => ({ exists: true, id, data: () => clone(data), metadata: { hasPendingWrites: false } });
        const claimDoc = (k, d) => ({ id: String(k), data: () => clone(d), metadata: { hasPendingWrites: false } });
        const emitRoom = () => setTimeout(() => roomSubs.forEach(cb => cb(snap())), LAT);
        const emitClaim = (k, d) => setTimeout(() => claimSubs.forEach(cb => cb({ docChanges: () => [{ type: 'added', doc: claimDoc(k, d) }] })), LAT);
        function setPath(path, val) {
            const parts = path.split('.'); let o = data;
            for (let i = 0; i < parts.length - 1; i++) { if (!o[parts[i]] || typeof o[parts[i]] !== 'object') o[parts[i]] = {}; o = o[parts[i]]; }
            o[parts[parts.length - 1]] = resolve(val);
        }
        const ref = {
            id,
            onSnapshot(cb) { roomSubs.add(cb); setTimeout(() => roomSubs.has(cb) && cb(snap()), 0); return () => roomSubs.delete(cb); },
            get() { return new Promise(r => setTimeout(() => r(snap()), LAT)); },
            update(obj) { return new Promise(r => setTimeout(() => { for (const k in obj) setPath(k, obj[k]); emitRoom(); r(); }, LAT)); },
            delete() { return Promise.resolve(); },
            collection() {
                return {
                    doc(k) {
                        return {
                            set(d) {
                                return new Promise((ok, fail) => setTimeout(() => {
                                    // Giống rules: claims/{k} chỉ tạo được 1 lần, khi trận đang diễn ra
                                    if (claims.has(String(k)) || data.status !== 'playing') { const e = new Error('Missing or insufficient permissions.'); e.code = 'permission-denied'; fail(e); return; }
                                    const v = resolve(d); claims.set(String(k), v); emitClaim(k, v); ok();
                                }, LAT));
                            },
                            get() { return Promise.resolve({ exists: claims.has(String(k)), data: () => clone(claims.get(String(k))) }); }
                        };
                    },
                    onSnapshot(cb) {
                        claimSubs.add(cb);
                        setTimeout(() => { if (claimSubs.has(cb)) cb({ docChanges: () => [...claims].map(([k, d]) => ({ type: 'added', doc: claimDoc(k, d) })) }); }, 0);
                        return () => claimSubs.delete(cb);
                    },
                    get() { const docs = [...claims].map(([k, d]) => claimDoc(k, d)); return Promise.resolve({ docs, size: docs.length, forEach: f => docs.forEach(f) }); }
                };
            }
        };
        return { id, ref, data, claims, level: opts.level, lv, game: opts.game, humanUid: opts.me.uid };
    }

    // ── Bộ não của máy ──
    let timer = null;
    function stop() { clearInterval(timer); timer = null; }

    function attach(room) {
        stop();
        const plan = {}; // k → { at, right } (kéo co) | i → { at, right } (ninja)
        let missN = 0, doneSent = false;
        const meKey = 's_' + room.humanUid;
        const botScore = () => { let n = 0; room.claims.forEach(c => { if (c.uid === BOT) n++; }); return n; };
        const humanScore = () => { let n = 0; room.claims.forEach(c => { if (c.uid !== BOT) n++; }); return n; };
        function tuned(base, isTime) { // cân bằng nhẹ theo tỉ số
            const lead = botScore() - humanScore();
            if (isTime) return lead >= 2 ? base * 1.25 : lead <= -2 ? base * 0.85 : base;
            return Math.max(0.3, Math.min(0.97, lead >= 2 ? base - 0.12 : lead <= -2 ? base + 0.08 : base));
        }
        function finishIfNeeded(over) {
            // Người chơi đã xong → máy cũng báo xong để hiện kết quả ngay
            if (!doneSent && (over || (room.data[meKey] || {}).done)) {
                doneSent = true;
                room.ref.update({ ['s_' + BOT + '.done']: true, ['s_' + BOT + '.score']: botScore() });
            }
        }

        function tickTug() {
            const p = window.DuelTug.peek();
            if (!p) { finishIfNeeded(false); return; }
            finishIfNeeded(p.over);
            if (p.over) return;
            const cfg = room.lv.tug;
            let k = -1;
            for (let i = 0; i < p.n; i++) if (p.t >= p.S[i]) k = i;
            if (k < 0 || p.t >= p.E[k] || p.claimed(k)) return;
            if (!plan[k]) plan[k] = { at: p.S[k] + tuned(rand(cfg.rt[0], cfg.rt[1]), true), right: Math.random() < tuned(cfg.acc, false), done: false };
            const pl = plan[k];
            if (pl.done || p.t < pl.at || p.t >= p.D[k]) return;
            pl.done = true;
            const q = room.data.questions[k];
            if (pl.right) room.ref.collection('claims').doc(String(k)).set({ uid: BOT, at: firebase.firestore.FieldValue.serverTimestamp(), c: q.a }).catch(() => {});
            else room.ref.update({ ['s_' + BOT + '.w.' + k]: Math.round(p.t) });
        }

        function answerLen(q) {
            const a = q.d === 'v' ? q.w : String(q.m).split(/[,;/]/)[0];
            return String(a).trim().length;
        }
        function tickNinja() {
            const p = window.DuelNinja.peek();
            if (!p) { finishIfNeeded(false); return; }
            finishIfNeeded(p.over);
            if (p.over) return;
            const cfg = room.lv.ninja;
            for (let i = 0; i < p.n; i++) {
                if (p.t < p.S[i] || p.t >= p.E[i] || p.claimed(i)) continue;
                const q = room.data.questions[i];
                if (!plan[i]) plan[i] = { at: p.S[i] + tuned(rand(cfg.react[0], cfg.react[1]) + answerLen(q) * cfg.perChar, true), right: Math.random() < tuned(cfg.acc, false) };
                const pl = plan[i];
                if (p.t < pl.at) continue;
                if (pl.right) {
                    pl.at = Infinity;
                    room.ref.collection('claims').doc(String(i)).set({ uid: BOT, at: firebase.firestore.FieldValue.serverTimestamp() }).catch(() => {});
                } else {
                    // Gõ sai → phi trượt, thử lại sau ~2 giây (dễ đúng hơn ở lần sau)
                    missN++;
                    room.ref.update({ ['s_' + BOT + '.miss']: { n: missN, i }, ['s_' + BOT + '.misses']: missN });
                    pl.at = p.t + rand(2200, 3400) * (cfg.perChar / 230);
                    pl.right = Math.random() < tuned(Math.min(0.95, cfg.acc + 0.15), false);
                }
                break; // mỗi nhịp chỉ xử lý 1 từ, như người thật
            }
        }

        timer = setInterval(room.game === 'ninja' ? tickNinja : tickTug, 120);
    }

    window.DuelBot = { LEVELS, createRoom, attach, stop, BOT };
})();
