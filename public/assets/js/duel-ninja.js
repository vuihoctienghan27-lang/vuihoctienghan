/* duel-ninja.js — Trò "Ninja phi tiêu" cho thi đấu 1-1 (duel.html).
   Từ vựng rơi từ trên xuống theo cùng một lịch cho cả 2 người (tính từ startAt của phòng).
   Ai gõ đúng trước → Ninja phi tiêu phá từ đó. "Ai trước" do Firestore quyết định:
   duels/{id}/claims/{i} chỉ được TẠO một lần (xem firestore.rules) → người ghi sau bị từ chối.
   Phi trúng thì từ vỡ ngay trên máy mình (không chờ mạng); nếu server báo đối thủ phá trước thì hiện "Chậm hơn!".
   Lượt phi trượt được ghi vào s_<uid>.miss để đối thủ cũng thấy.
   Đồng hồ: mỗi máy đo độ lệch so với giờ server (ghi serverTimestamp vào s_<uid>.ping rồi đọc lại)
   → hai máy tính cùng một mốc thời gian từ startAt, dù nhận được tín hiệu bắt đầu sớm/muộn khác nhau. */
(function () {
    'use strict';
    const N_WORDS = 15, COUNTDOWN = 4000;
    // Lịch rơi: ~4 giây một từ, rơi 14 giây (nhanh dần nhẹ về cuối) → cùng lúc chỉ ~3 từ trên màn hình
    // Lịch rơi theo sự kiện: trên màn hình tối đa 2 từ đang "chiếm chỗ".
    // Một từ nhả chỗ khi bị phá (thời điểm claim trên server) hoặc khi rơi tới 1/3 dưới khung hình;
    // lúc đó từ kế tiếp mới bắt đầu rơi. Mọi mốc đều tính theo giờ server từ startAt
    // → hai máy tính ra cùng một lịch (chỉ lệch bằng độ trễ mạng khi nhận tin đối thủ phá từ).
    const FALL_MS = 16000, RELEASE_P = 2 / 3, STAGGER = 5000, MIN_GAP = 1500, SPAWN0 = COUNTDOWN + 600;
    const FLIGHT = 200;

    // ── Bộ từ: { w: tiếng Hàn, m: nghĩa Việt, d: 'k' (hiện Hàn, gõ Việt) | 'v' (hiện Việt, gõ Hàn), x: vị trí ngang 0..1 }
    function buildQuestions(pool, mode, shuffle) {
        // Bỏ từ trùng chữ / trùng nghĩa (VD hai từ cùng hiện "duy trì" → không biết gõ từ nào)
        const seen = new Set(), picked = [];
        const key = s => (window.NinjaMatch ? window.NinjaMatch.norm(s) : String(s).trim().toLowerCase());
        for (const it of shuffle(pool)) {
            const kw = 'w:' + key(it.w), km = 'm:' + key(it.m);
            if (seen.has(kw) || seen.has(km)) continue;
            seen.add(kw); seen.add(km); picked.push(it);
            if (picked.length >= N_WORDS) break;
        }
        let lastX = 0.5;
        return picked.map(it => {
            let x;
            for (let k = 0; k < 8; k++) { x = 0.14 + Math.random() * 0.72; if (Math.abs(x - lastX) > 0.25) break; }
            lastX = x;
            const d = mode === 'vi2ko' ? 'v' : mode === 'mix' ? (Math.random() < 0.5 ? 'k' : 'v') : 'k';
            return { w: String(it.w).slice(0, 60), m: String(it.m).slice(0, 120), d, x: Math.round(x * 1000) / 1000 };
        });
    }

    // ── Đồ hoạ tự vẽ ──
    function ninjaSVG(team) {
        return `<svg class="nj-ninja-svg" viewBox="0 0 80 96" aria-hidden="true">
            <ellipse cx="40" cy="92" rx="22" ry="4" fill="rgba(0,0,0,.35)"/>
            <path class="nj-tail" d="M27 20 C16 18 10 24 3 20 C9 27 17 27 26 25Z" fill="${team}"/>
            <rect x="29" y="62" width="9" height="26" rx="4" fill="#111827"/>
            <rect x="42" y="62" width="9" height="26" rx="4" fill="#111827"/>
            <rect x="27" y="84" width="12" height="6" rx="3" fill="#0b1020"/><rect x="41" y="84" width="12" height="6" rx="3" fill="#0b1020"/>
            <path d="M24 40 Q40 32 56 40 L54 68 Q40 72 26 68Z" fill="#1f2937"/>
            <path d="M33 38 L40 52 L47 38" fill="none" stroke="#374151" stroke-width="2"/>
            <rect x="25" y="56" width="30" height="5" rx="2" fill="${team}"/>
            <g class="nj-arm-back"><rect x="20" y="42" width="8" height="20" rx="4" fill="#111827"/></g>
            <circle cx="40" cy="24" r="16" fill="#1f2937"/>
            <rect x="26" y="19" width="28" height="9" rx="4.5" fill="#fcd9b6"/>
            <ellipse cx="34.5" cy="23.5" rx="2.2" ry="2.6" fill="#111827"/><ellipse cx="45.5" cy="23.5" rx="2.2" ry="2.6" fill="#111827"/>
            <circle cx="35.2" cy="22.6" r=".8" fill="#fff"/><circle cx="46.2" cy="22.6" r=".8" fill="#fff"/>
            <path d="M31 19.5 L37 21" stroke="#111827" stroke-width="1.6" stroke-linecap="round"/><path d="M49 19.5 L43 21" stroke="#111827" stroke-width="1.6" stroke-linecap="round"/>
            <rect x="24.5" y="12" width="31" height="5" rx="2.5" fill="${team}"/>
            <g class="nj-arm"><rect x="52" y="40" width="8" height="20" rx="4" fill="#111827"/><circle cx="56" cy="60" r="4" fill="#fcd9b6"/></g>
        </svg>`;
    }
    const STAR = `<svg viewBox="0 0 24 24" aria-hidden="true"><defs><linearGradient id="njMetal" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f1f5f9"/><stop offset=".5" stop-color="#94a3b8"/><stop offset="1" stop-color="#e2e8f0"/></linearGradient></defs>
        <path d="M12 0 L14.6 9.4 L24 12 L14.6 14.6 L12 24 L9.4 14.6 L0 12 L9.4 9.4Z" fill="url(#njMetal)" stroke="#475569" stroke-width=".6"/><circle cx="12" cy="12" r="2.2" fill="#1e293b"/></svg>`;

    const CSS = `
    .nj-top { display: grid; grid-template-columns: 1fr auto 1fr; gap: 10px; align-items: center; padding: 10px 14px; border-radius: 18px; color: #fff; margin-bottom: 10px;
        background: linear-gradient(135deg, #142657, #312e81 55%, #7c3aed); box-shadow: 0 12px 26px -12px rgba(124,58,237,.55); }
    .nj-pl { min-width: 0; display: flex; align-items: center; gap: 10px; }
    .nj-pl.op { flex-direction: row-reverse; text-align: right; }
    .nj-pl .nm { font-size: .8em; font-weight: 700; opacity: .85; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .nj-pl .sc { font-size: 1.8em; font-weight: 900; line-height: 1; font-variant-numeric: tabular-nums; }
    .nj-pl .dot { width: 12px; height: 12px; border-radius: 50%; flex-shrink: 0; box-shadow: 0 0 0 3px rgba(255,255,255,.2); }
    .nj-pl.me .dot { background: #3b82f6; } .nj-pl.op .dot { background: #f43f5e; }
    .nj-mid { text-align: center; font-size: .75em; font-weight: 800; opacity: .9; white-space: nowrap; }
    .nj-mid b { display: block; font-size: 1.25em; font-style: italic; color: #fde047; }
    .nj-arena { position: relative; overflow: hidden; height: clamp(250px, 54vh, 470px); border-radius: 20px; touch-action: manipulation; user-select: none; -webkit-user-select: none;
        background: linear-gradient(180deg, #0b1437 0%, #1e1b4b 45%, #4c1d95 78%, #7e22ce 100%); box-shadow: inset 0 0 0 1px rgba(255,255,255,.08); contain: strict; }
    .nj-moon { position: absolute; right: 12%; top: 9%; width: 54px; height: 54px; border-radius: 50%; background: radial-gradient(circle at 38% 38%, #fffbeb, #fde68a 60%, #f59e0b); box-shadow: 0 0 40px 8px rgba(253,230,138,.35); }
    .nj-stars { position: absolute; inset: 0; background-image: radial-gradient(1.5px 1.5px at 12% 18%, #fff8, transparent), radial-gradient(1px 1px at 30% 8%, #fff9, transparent), radial-gradient(1.5px 1.5px at 55% 22%, #fff7, transparent), radial-gradient(1px 1px at 72% 12%, #fffa, transparent), radial-gradient(1px 1px at 88% 30%, #fff8, transparent), radial-gradient(1.5px 1.5px at 42% 36%, #fff6, transparent); }
    .nj-hills { position: absolute; left: 0; bottom: 34px; width: 100%; height: 90px; }
    .nj-ground { position: absolute; left: 0; right: 0; bottom: 0; height: 36px; background: linear-gradient(180deg, #1e1b4b, #0f0a2e); border-top: 2px solid rgba(167,139,250,.5); }
    .nj-ninja { position: absolute; bottom: 14px; width: 66px; height: 80px; z-index: 3; }
    .nj-ninja.away { opacity: .35; filter: grayscale(.7); }
    .nj-ninja.me { left: 4%; } .nj-ninja.op { right: 4%; transform: scaleX(-1); }
    .nj-ninja svg { width: 100%; height: 100%; overflow: visible; }
    .nj-ninja .nj-arm { transform-origin: 56px 42px; transition: transform .12s; }
    .nj-ninja.throw .nj-arm { transform: rotate(-150deg); }
    .nj-ninja .nj-tail { transform-origin: 27px 22px; animation: njTail 1.1s ease-in-out infinite; }
    .nj-ninja.throw svg { animation: njHop .3s ease-out; }
    .nj-ninja .tag { position: absolute; left: 50%; bottom: -13px; font-size: 10px; font-weight: 900; color: #fff; padding: 1px 7px; border-radius: 999px; white-space: nowrap; transform: translateX(-50%); max-width: 110px; overflow: hidden; text-overflow: ellipsis; }
    .nj-ninja.me .tag { background: #2563eb; } .nj-ninja.op .tag { background: #e11d48; transform: translateX(-50%) scaleX(-1); }
    @keyframes njTail { 50% { transform: rotate(-12deg) scaleY(.8); } }
    @keyframes njHop { 40% { transform: translateY(-6px); } }
    .nj-word { position: absolute; left: 0; top: 0; z-index: 2; will-change: transform; padding: 7px 12px 8px; border-radius: 14px; max-width: 48%; text-align: center;
        background: rgba(255,255,255,.96); color: #1e1b4b; box-shadow: 0 8px 18px -6px rgba(0,0,0,.5), inset 0 -3px 0 rgba(124,58,237,.18); font-weight: 900; line-height: 1.25; }
    .nj-word b { display: block; font-size: 1.12em; word-break: keep-all; overflow-wrap: anywhere; }
    .nj-word .tg { display: inline-block; font-size: 9.5px; font-weight: 900; letter-spacing: .3px; padding: 1px 6px; border-radius: 6px; margin-bottom: 2px; }
    .nj-word.k .tg { background: #ede9fe; color: #6d28d9; } .nj-word.v .tg { background: #fef3c7; color: #b45309; }
    .nj-word.pending { box-shadow: 0 0 0 3px #60a5fa, 0 8px 18px -6px rgba(0,0,0,.5); }
    .nj-word.danger { box-shadow: 0 0 0 2px #fb7185, 0 8px 18px -6px rgba(0,0,0,.5); }
    .nj-word.gone { transition: opacity .5s, filter .5s; opacity: 0; filter: grayscale(1) blur(1px); }
    .nj-word.boom { animation: njBoom .42s ease-out forwards; }
    .nj-word.boom.me { background: #dbeafe; } .nj-word.boom.op { background: #ffe4e6; }
    @keyframes njBoom { 30% { scale: 1.18; } 100% { scale: 1.5; opacity: 0; filter: blur(3px); } }
    .nj-star { position: absolute; left: 0; top: 0; width: 24px; height: 24px; margin: -12px 0 0 -12px; z-index: 4; pointer-events: none; will-change: transform; filter: drop-shadow(0 0 4px rgba(255,255,255,.6)); }
    .nj-star svg { width: 100%; height: 100%; display: block; }
    .nj-spark { position: absolute; left: 0; top: 0; width: 7px; height: 7px; margin: -3.5px 0 0 -3.5px; border-radius: 50%; z-index: 4; pointer-events: none; }
    .nj-float { position: absolute; left: 0; top: 0; z-index: 5; pointer-events: none; font-weight: 900; font-size: 13px; white-space: nowrap; padding: 3px 9px; border-radius: 999px; color: #fff; transform: translate(-50%, -50%); }
    .nj-float.me { background: #2563eb; } .nj-float.op { background: #e11d48; } .nj-float.miss { background: #475569; }
    .nj-count { position: absolute; inset: 0; z-index: 6; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #fff; text-align: center; background: rgba(15,10,46,.55); }
    .nj-count b { font-size: 5.5em; font-weight: 900; line-height: 1; text-shadow: 0 8px 26px rgba(0,0,0,.5); }
    .nj-count small { font-weight: 800; opacity: .9; margin-top: 6px; padding: 0 16px; }
    .nj-timer { position: absolute; left: 0; top: 0; height: 4px; background: linear-gradient(90deg, #22c55e, #f59e0b, #ef4444); z-index: 5; transform-origin: left; width: 100%; }
    .nj-form { display: flex; gap: 8px; margin-top: 10px; }
    .nj-form input { flex: 1; min-width: 0; font-size: 17px !important; font-weight: 700; }
    .nj-form input.shake { animation: njShake .3s; border-color: #fb7185 !important; }
    @keyframes njShake { 25% { transform: translateX(-6px); } 75% { transform: translateX(6px); } }
    .nj-hint { font-size: .82em; color: var(--text-sub); font-weight: 600; text-align: center; margin-top: 8px; }
    .nj-who { display: inline-flex; align-items: center; gap: 5px; font-size: .78em; font-weight: 800; padding: 2px 8px; border-radius: 999px; white-space: nowrap; }
    .nj-who.me { background: #dbeafe; color: #1d4ed8; } .nj-who.op { background: #ffe4e6; color: #be123c; } .nj-who.none { background: var(--soft); color: var(--text-sub); }
    body.dark-mode .nj-who.me { background: #1e3a8a; color: #bfdbfe; } body.dark-mode .nj-who.op { background: #4c0519; color: #fecdd3; }
    @media (max-width: 600px) { .nj-ninja { width: 52px; height: 64px; } .nj-word { font-size: .9em; max-width: 56%; } .nj-pl .sc { font-size: 1.45em; } .nj-moon { width: 38px; height: 38px; } }
    @media (prefers-reduced-motion: reduce) { .nj-ninja .nj-tail { animation: none; } }`;

    // ── Trạng thái trận ──
    let ctx = null, room = null, el = {}, claims = new Map(), claimsUnsub = null, raf = 0, startLocal = 0;
    let claimAt = new Map(), hitAt = new Map(), sched = { S: [], E: [], end: 0 };
    let words = [], pending = new Set(), myMiss = 0, myMissObj = { n: 0, i: -1 }, lastOpMiss = -1, finished = false, resultShown = false, waitTimer = null, resizeObs = null;
    let opSeen = false, tickTimer = null, W = 0, H = 0, lastSubmit = 0, composing = false, submitAfterCompose = false, composeFallback = null;

    const $ = id => document.getElementById(id);
    const uidMe = () => ctx.me.uid;
    const hits = uid => { let n = 0; claims.forEach(u => { if (u === uid) n++; }); return n; };
    const opName = () => ctx.opName();

    function injectCss() {
        if ($('nj-css')) return;
        const s = document.createElement('style'); s.id = 'nj-css'; s.textContent = CSS; document.head.appendChild(s);
    }

    function start(c) {
        stop();
        ctx = c; room = c.room; injectCss();
        claims = new Map(); words = []; pending = new Set(); finished = false; resultShown = false;
        claimAt = new Map(); hitAt = new Map(); sched = { S: [], E: [], end: 0 };
        const mine = room[ctx.myKey()] || {};
        myMiss = (mine.miss && mine.miss.n) || 0;
        myMissObj = mine.miss || { n: myMiss, i: -1 };
        const op = room['s_' + ctx.opId()] || {};
        lastOpMiss = (op.miss && op.miss.n) || 0;
        startLocal = 0; syncing = false; opSeen = !!op.on;
        render();
        claimsUnsub = ctx.roomRef.collection('claims').onSnapshot(onClaims, e => console.warn('[Ninja] claims', e));
        update(room);
    }

    function stop() {
        cancelAnimationFrame(raf); raf = 0; clearInterval(tickTimer); tickTimer = null;
        if (claimsUnsub) { claimsUnsub(); claimsUnsub = null; }
        clearTimeout(waitTimer); waitTimer = null; clearTimeout(composeFallback);
        if (resizeObs) { resizeObs.disconnect(); resizeObs = null; }
        ctx = null;
    }

    // Độ lệch đồng hồ máy so với server: ghi serverTimestamp rồi đọc lại (≈ 2 lượt mạng)
    async function serverOffset(c) {
        const k = c.myKey();
        for (let attempt = 0; attempt < 3; attempt++) {
            try {
                const t1 = Date.now();
                await c.roomRef.update({ [k + '.ping']: c.FV().serverTimestamp(), [k + '.on']: true });
                const t2 = Date.now();
                const s = await c.roomRef.get({ source: 'server' });
                const p = s.exists && s.data()[k] && s.data()[k].ping;
                if (p && p.toMillis && t2 - t1 < 5000) return p.toMillis() - (t1 + t2) / 2;
                console.warn('[Ninja] clock: thiếu ping', t2 - t1, s.exists && s.data()[k]);
            } catch (e) { console.warn('[Ninja] clock', e); }
        }
        return null;
    }

    let syncing = false;
    function initClock() {
        if (startLocal || syncing || !room.startAt || !room.startAt.toMillis) return;
        syncing = true;
        const c = ctx, startMs = room.startAt.toMillis(), key = 'nj_off_' + room.id;
        serverOffset(c).then(off => {
            syncing = false;
            if (ctx !== c) return;
            if (off == null) {
                // Không đo được → dùng số đo lần trước (mở lại trang) hoặc tin đồng hồ máy
                try { off = parseFloat(sessionStorage.getItem(key)); } catch (e) {}
                // Vừa vào trận cùng lúc → coi thời điểm nhận được startAt là mốc 0
                if (!isFinite(off)) off = c.fresh && Math.abs(Date.now() - startMs) > 3000 ? startMs - Date.now() + 300 : 0;
            }
            try { sessionStorage.setItem(key, String(off)); } catch (e) {}
            startLocal = startMs - off;
            startTicking();
        });
    }

    function startTicking() {
        if (!raf) raf = requestAnimationFrame(loop);
        // Tab ẩn / app chạy nền: rAF dừng → vẫn kết thúc trận đúng giờ để đối thủ không phải chờ
        clearInterval(tickTimer);
        tickTimer = setInterval(() => { if (ctx && !finished && gameOver(now())) finish(); }, 1000);
    }

    function update(r) {
        if (!ctx) return;
        room = r;
        initClock();
        const op = room['s_' + ctx.opId()] || {};
        $('njOpName').textContent = opName();
        $('njOpTag').textContent = opName();
        // Đối thủ đã vào màn chơi chưa (ghi s_<uid>.on khi đồng bộ đồng hồ)
        if (op.on) opSeen = true;
        el.op.classList.toggle('away', !opSeen);
        // Đối thủ phi trượt → hiện animation phía đối thủ
        const n = (op.miss && op.miss.n) || 0;
        if (lastOpMiss < 0) lastOpMiss = n;
        if (n > lastOpMiss) {
            lastOpMiss = n;
            if (!finished) throwMiss('op', op.miss.i);
        }
        if (finished && !resultShown && (op.done || room.status === 'finished')) showResult(false);
    }

    function render() {
        const box = ctx.container;
        const modeHint = room.ninjaMode === 'vi2ko' ? 'Gõ <b>tiếng Hàn</b> cho từ tiếng Việt đang rơi'
            : room.ninjaMode === 'mix' ? 'Thẻ <b>KR→VN</b>: gõ nghĩa tiếng Việt · Thẻ <b>VN→KR</b>: gõ tiếng Hàn'
            : 'Gõ <b>nghĩa tiếng Việt</b> cho từ tiếng Hàn đang rơi';
        box.innerHTML = `
            <div class="nj-top">
                <div class="nj-pl me"><span class="dot"></span><div style="min-width:0"><div class="nm">${ctx.esc(ctx.myName)}</div><div class="sc" id="njMeScore">0</div></div></div>
                <div class="nj-mid"><b>VS</b><span id="njLeft">${room.questions.length} từ</span></div>
                <div class="nj-pl op"><span class="dot"></span><div style="min-width:0"><div class="nm" id="njOpName"></div><div class="sc" id="njOpScore">0</div></div></div>
            </div>
            <div class="nj-arena" id="njArena">
                <div class="nj-stars"></div><div class="nj-moon"></div>
                <svg class="nj-hills" viewBox="0 0 400 90" preserveAspectRatio="none" aria-hidden="true">
                    <path d="M0 90 L0 55 L40 30 L80 52 L130 14 L180 50 L220 34 L270 60 L320 22 L370 48 L400 36 L400 90Z" fill="#2e1065" opacity=".9"/>
                    <path d="M0 90 L0 70 L60 50 L110 72 L170 46 L240 74 L300 52 L360 72 L400 60 L400 90Z" fill="#1e1b4b"/>
                </svg>
                <div class="nj-ground"></div>
                <div class="nj-timer" id="njTimer"></div>
                <div class="nj-ninja me" id="njMe">${ninjaSVG('#3b82f6')}<span class="tag">${ctx.esc(ctx.myName)}</span></div>
                <div class="nj-ninja op" id="njOp">${ninjaSVG('#f43f5e')}<span class="tag" id="njOpTag"></span></div>
                <div class="nj-count" id="njCount"><b>…</b><small>Đang đồng bộ trận đấu</small></div>
            </div>
            <form class="nj-form" id="njForm" autocomplete="off">
                <input id="njInput" class="lx-input" type="text" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" enterkeyhint="send"
                    placeholder="${room.ninjaMode === 'vi2ko' ? '한국어로 입력…' : room.ninjaMode === 'mix' ? 'Nghĩa tiếng Việt / 한국어…' : 'Nhập nghĩa tiếng Việt…'}" maxlength="80">
                <button type="submit" class="lx-btn lx-btn-coral" id="njFire">${ctx.ic('bolt')}Phi!</button>
            </form>
            <div class="nj-hint">${modeHint} · Ai đúng trước người đó ăn điểm</div>`;
        el = { arena: $('njArena'), input: $('njInput'), me: $('njMe'), op: $('njOp'), count: $('njCount'), timer: $('njTimer') };
        measure();
        resizeObs = new ResizeObserver(measure);
        resizeObs.observe(el.arena);

        const inp = el.input;
        inp.addEventListener('compositionstart', () => { composing = true; });
        inp.addEventListener('compositionend', () => {
            composing = false;
            if (submitAfterCompose) { submitAfterCompose = false; clearTimeout(composeFallback); setTimeout(() => submit(true), 0); }
            else setTimeout(autoCheck, 0);
        });
        inp.addEventListener('input', e => { if (!e.isComposing && !composing && e.inputType !== 'insertCompositionText') autoCheck(); });
        inp.addEventListener('keydown', e => {
            if (e.key !== 'Enter') return;
            e.preventDefault();
            // Bàn phím tiếng Hàn: Enter khi đang ghép chữ → đợi compositionend rồi mới chấm
            if (e.isComposing || e.keyCode === 229 || composing) {
                submitAfterCompose = true;
                clearTimeout(composeFallback);
                composeFallback = setTimeout(() => { if (submitAfterCompose) { submitAfterCompose = false; submit(true); } }, 250);
                return;
            }
            submit(true);
        });
        $('njForm').addEventListener('submit', e => { e.preventDefault(); if (!composing) submit(true); });
        // Giữ bàn phím ảo mở khi bấm nút "Phi!"
        $('njFire').addEventListener('pointerdown', e => e.preventDefault());
        inp.addEventListener('focus', () => { if (refocusing) return; if (window.innerWidth < 720) setTimeout(() => $('njArena').scrollIntoView({ block: 'start', behavior: 'smooth' }), 250); });
        setTimeout(() => { try { inp.focus({ preventScroll: true }); } catch (e) {} }, 50);
    }

    function measure() { if (!el.arena) return; W = el.arena.clientWidth; H = el.arena.clientHeight; words.forEach(w => { if (w && w.el) placeX(w); }); }
    function placeX(w) { const ww = w.el.offsetWidth || 80; w.wpx = ww; w.hpx = w.el.offsetHeight || 40; w.left = Math.max(ww / 2 + 6, Math.min(W - ww / 2 - 6, w.q.x * W)); }

    // ── Vòng lặp hình ảnh ──
    function now() { return Date.now() - startLocal; }
    function wordY(w, t) { const p = Math.max(0, (t - w.t0) / w.dur); return { p, y: 8 + p * (H - 46 - 8 - (w.hpx || 40)) }; }
    function wordPos(w, t) { const { y } = wordY(w, t); return { x: w.left, y: y + (w.hpx || 40) / 2 }; }

    // S[i]: lúc từ i bắt đầu rơi · R[i]: lúc từ i nhả chỗ · E[i]: lúc từ i biến mất (vỡ / chạm đất)
    function computeSchedule() {
        const n = room.questions.length, S = [], R = [], E = [];
        const hit = j => (claimAt.has(j) ? claimAt.get(j) : hitAt.has(j) ? hitAt.get(j) : Infinity);
        for (let i = 0; i < n; i++) {
            if (i === 0) S[i] = SPAWN0;
            else if (i === 1) S[i] = Math.max(S[0] + MIN_GAP, Math.min(S[0] + STAGGER, R[0]));
            else S[i] = Math.max(S[i - 1] + MIN_GAP, R.slice(0, i).sort((a, b) => a - b)[i - 2],
                // kể cả từ đang ở 1/3 dưới, không bao giờ quá 3 từ cùng lúc
                i >= 3 ? E.slice(0, i).sort((a, b) => a - b)[i - 3] : 0);
            const h = Math.max(hit(i), S[i]);
            R[i] = Math.min(h, S[i] + FALL_MS * RELEASE_P);
            E[i] = Math.min(h, S[i] + FALL_MS);
        }
        sched = { S, R, E, end: n ? Math.max(...E) : 0 };
        return sched;
    }
    function gameOver(t) { computeSchedule(); return t >= sched.end + 500 && !pending.size; }

    function loop() {
        raf = 0;
        if (!ctx) return;
        const t = now();
        const qs = room.questions;
        // Đếm ngược
        if (t < COUNTDOWN) {
            el.count.style.display = 'flex';
            el.count.innerHTML = `<b>${Math.ceil((COUNTDOWN - t) / 1000)}</b><small>${ctx.esc(ctx.myName)} vs ${ctx.esc(opName())}${opSeen ? '' : '<br>Đang chờ đối thủ kết nối…'}</small>`;
        } else if (el.count.style.display !== 'none') {
            if (t < COUNTDOWN + 700) el.count.innerHTML = '<b style="font-size:3.2em">Bắt đầu!</b>';
            else el.count.style.display = 'none';
        }
        computeSchedule();
        for (let i = 0; i < qs.length; i++) {
            const t0 = sched.S[i], dur = FALL_MS;
            let w = words[i];
            if (!w) {
                if (t < t0 || claims.has(i) || t >= t0 + dur) continue;
                w = words[i] = spawn(i, t0, dur);
            }
            w.t0 = t0; // lịch có thể sớm lên chút khi tin đối thủ phá từ đến muộn
            if (w.state !== 'fall' && w.state !== 'hit') continue;
            const { p, y } = wordY(w, t);
            w.el.style.transform = `translate3d(${(w.left - w.wpx / 2).toFixed(1)}px, ${Math.min(y, H).toFixed(1)}px, 0)`;
            if (p > 0.78) w.el.classList.add('danger');
            if (p >= 1 && w.state === 'fall' && !pending.has(i)) {
                w.state = 'gone'; w.el.classList.add('gone');
                setTimeout(() => w.el.remove(), 600);
            }
        }
        let left = 0;
        for (let i = 0; i < qs.length; i++) if (t < sched.E[i]) left++;
        $('njLeft').textContent = 'Còn ' + left + ' từ';
        el.timer.style.transform = 'scaleX(' + (left / qs.length).toFixed(4) + ')';
        if (gameOver(t)) { finish(); return; }
        raf = requestAnimationFrame(loop);
    }

    function spawn(i, t0, dur) {
        const q = room.questions[i];
        const d = document.createElement('div');
        d.className = 'nj-word ' + (q.d === 'v' ? 'v' : 'k');
        d.innerHTML = `<span class="tg">${q.d === 'v' ? 'VN→KR' : 'KR→VN'}</span><b></b>`;
        d.querySelector('b').textContent = q.d === 'v' ? q.m : q.w;
        d.lang = q.d === 'v' ? 'vi' : 'ko';
        el.arena.appendChild(d);
        const w = { i, q, el: d, t0, dur, state: 'fall' };
        placeX(w);
        return w;
    }

    // ── Gõ đáp án ──
    function activeWords() {
        const t = now();
        return words.filter(w => w && w.state === 'fall' && !pending.has(w.i) && !claims.has(w.i) && t < w.t0 + w.dur);
    }
    function findMatch(text, loose) {
        const m = activeWords().filter(w => window.NinjaMatch.check(text, w.q, loose));
        if (!m.length) return null;
        const t = now();
        return m.sort((a, b) => wordY(b, t).p - wordY(a, t).p)[0]; // ưu tiên từ sắp chạm đất
    }
    // Xoá ô nhập an toàn với bộ gõ. Nếu chỉ gán value = '' thì bộ gõ (Unikey/EVKey Telex, bàn phím Hàn,
    // Gboard…) vẫn giữ chữ của từ vừa gõ trong bộ đệm → phím tiếp theo làm chữ cũ "nhảy" lại vào ô.
    // Mất focus rồi focus lại buộc bộ gõ chốt và bỏ bộ đệm. Trên điện thoại, khi không còn đang ghép chữ thì
    // chỉ cần xoá (tránh bàn phím ảo đóng/mở).
    let refocusing = false;
    const TOUCH = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
    function clearInput() {
        const inp = el.input;
        if (!inp) return;
        submitAfterCompose = false; clearTimeout(composeFallback);
        if (!TOUCH || composing) {
            refocusing = true;
            inp.blur();          // bộ gõ kết thúc từ đang gõ (compositionend nếu có)
            inp.value = '';
            composing = false;
            try { inp.focus({ preventScroll: true }); } catch (e) { inp.focus(); }
            refocusing = false;
        } else inp.value = '';
    }
    function autoCheck() {
        if (finished || !startLocal || now() < COUNTDOWN || composing) return;
        const v = el.input.value;
        if (!v.trim()) return;
        const w = findMatch(v, false);
        if (w) { clearInput(); fire(w); }
    }
    function submit(loose) {
        if (finished || !startLocal || now() < COUNTDOWN) return;
        const v = el.input.value;
        if (!v.trim()) return;
        if (Date.now() - lastSubmit < 80) return;
        lastSubmit = Date.now();
        clearInput();
        const w = findMatch(v, loose);
        if (w) { fire(w); return; }
        // Sai → phi trượt vào từ thấp nhất (nếu có), đối thủ cũng thấy
        el.input.classList.remove('shake'); void el.input.offsetWidth; el.input.classList.add('shake');
        const act = activeWords(), t = now();
        const target = act.sort((a, b) => wordY(b, t).p - wordY(a, t).p)[0];
        throwMiss('me', target ? target.i : -1);
        myMiss++;
        myMissObj = { n: myMiss, i: target ? target.i : -1 };
        saveSelf();
    }

    function saveSelf(extra) {
        if (!ctx) return;
        const data = Object.assign({ score: hits(uidMe()), misses: myMiss, miss: myMissObj, done: finished, on: true }, extra || {});
        ctx.roomRef.update({ [ctx.myKey()]: data }).catch(e => console.warn('[Ninja] save', e));
    }

    // Tranh chấp "ai phá trước": claims/{i} chỉ được tạo 1 lần (rules) → set() thẳng, 1 lượt mạng.
    // Đã có người tạo trước → server từ chối (permission-denied) → mình chậm hơn.
    const pendingPos = new Map();
    function sendClaim(i) {
        const c = ctx;
        const ref = c.roomRef.collection('claims').doc(String(i));
        let done = false;
        const t = setTimeout(() => { if (!done) { done = true; settle(i, false, c); } }, 6000); // mạng treo
        ref.set({ uid: c.me.uid, at: c.FV().serverTimestamp() })
            .then(() => { if (!done) { done = true; clearTimeout(t); settle(i, true, c); } })
            .catch(() => { if (!done) { done = true; clearTimeout(t); settle(i, false, c); } });
    }

    function settle(i, won, c) {
        if (ctx !== c || !pending.has(i)) return;
        pending.delete(i);
        if (!won) hitAt.delete(i);
        const pos = pendingPos.get(i); pendingPos.delete(i);
        if (won) claims.set(i, uidMe());
        else if (claims.get(i) !== uidMe()) {
            // Từ đã vỡ trên máy mình nhưng đối thủ phá trước → báo lại
            swing('op');
            floatText(pos ? { x: pos.x, y: pos.y + 30 } : { x: W / 2, y: 60 }, 'Chậm hơn! ' + opName() + ' phá trước', 'op');
        }
        updateScores();
        saveSelf();
    }

    function fire(w) {
        const i = w.i;
        pending.add(i);
        sendClaim(i);
        swing('me');
        const target = wordPos(w, now() + FLIGHT);
        pendingPos.set(i, target);
        const from = handPos('me');
        const star = makeStar(from);
        w.el.classList.add('pending');
        star.animate([
            { transform: `translate(${from.x}px, ${from.y}px) rotate(0deg)` },
            { transform: `translate(${target.x}px, ${target.y}px) rotate(720deg)` }
        ], { duration: FLIGHT, easing: 'cubic-bezier(.25,.7,.4,1)', fill: 'forwards' });
        // Hẹn giờ cố định (không chờ animation báo xong — máy yếu/tab bị hãm khung hình vẫn vỡ đúng lúc)
        setTimeout(() => {
            star.remove();
            if (!ctx) return;
            // Vỡ ngay khi trúng, không chờ server; tạm coi lúc này là lúc nhả chỗ cho từ kế tiếp
            if (!claims.has(i)) hitAt.set(i, now());
            const owner = claims.get(i);
            if (w.state === 'fall' || w.state === 'hit') boom(w, owner && owner !== uidMe() ? 'op' : 'me', wordPos(w, now()));
            updateScores();
        }, FLIGHT);
    }

    function onClaims(snap) {
        if (!ctx) return;
        snap.docChanges().forEach(ch => {
            if (ch.type === 'removed' || ch.doc.metadata.hasPendingWrites) return; // bỏ bản ghi tạm của chính mình
            const i = parseInt(ch.doc.id, 10), uid = ch.doc.data().uid, at = ch.doc.data().at;
            if (at && at.toMillis && room.startAt && room.startAt.toMillis) claimAt.set(i, at.toMillis() - room.startAt.toMillis());
            if (claims.get(i) === uid) return;
            claims.set(i, uid);
            if (uid === uidMe()) {
                if (pending.has(i)) settle(i, true, ctx);
                else if (words[i] && words[i].state === 'fall') { words[i].state = 'dead'; words[i].el.remove(); }
            } else if (pending.has(i)) settle(i, false, ctx);
            else opHit(i, false);
        });
        updateScores();
    }

    function opHit(i, afterMine) {
        const w = words[i];
        swing('op');
        if (!w || w.state !== 'fall') {
            // Từ đã rơi khỏi màn hình ở máy mình nhưng đối thủ phá kịp
            floatText({ x: W / 2, y: 40 }, opName() + ' phá: ' + (room.questions[i] ? room.questions[i].w : ''), 'op');
            return;
        }
        w.state = 'hit';
        const target = wordPos(w, now() + FLIGHT), from = handPos('op');
        const star = makeStar(from);
        star.animate([
            { transform: `translate(${from.x}px, ${from.y}px) rotate(0deg)` },
            { transform: `translate(${target.x}px, ${target.y}px) rotate(-900deg)` }
        ], { duration: afterMine ? 160 : FLIGHT, easing: 'cubic-bezier(.25,.7,.4,1)', fill: 'forwards' });
        setTimeout(() => {
            star.remove();
            if (ctx && w.state === 'hit') boom(w, 'op', wordPos(w, now()));
        }, afterMine ? 160 : FLIGHT);
    }

    function throwMiss(who, i) {
        swing(who);
        const w = i >= 0 ? words[i] : null;
        const from = handPos(who);
        const tgt = w && w.state === 'fall' ? wordPos(w, now() + FLIGHT) : { x: W / 2, y: H * 0.35 };
        const side = who === 'me' ? 1 : -1;
        const star = makeStar(from);
        star.animate([
            { transform: `translate(${from.x}px, ${from.y}px) rotate(0deg)`, opacity: 1 },
            { transform: `translate(${tgt.x + side * 70}px, ${tgt.y - 10}px) rotate(${side * 700}deg)`, opacity: 1, offset: 0.6 },
            { transform: `translate(${tgt.x + side * 140}px, ${-30}px) rotate(${side * 1200}deg)`, opacity: 0 }
        ], { duration: 520, easing: 'ease-out', fill: 'forwards' }).finished.then(() => star.remove());
        floatText({ x: tgt.x + side * 60, y: tgt.y + 26 }, who === 'me' ? 'Trượt!' : opName() + ' trượt!', 'miss');
    }

    // ── Hiệu ứng ──
    function handPos(who) {
        const n = who === 'me' ? el.me : el.op;
        const r = n.getBoundingClientRect(), a = el.arena.getBoundingClientRect();
        return { x: (who === 'me' ? r.right - r.width * 0.2 : r.left + r.width * 0.2) - a.left, y: r.top - a.top + r.height * 0.35 };
    }
    function swing(who) {
        const n = who === 'me' ? el.me : el.op;
        if (!n) return;
        n.classList.remove('throw'); void n.offsetWidth; n.classList.add('throw');
        clearTimeout(n._t); n._t = setTimeout(() => n.classList.remove('throw'), 280);
    }
    function makeStar(p) {
        const s = document.createElement('div');
        s.className = 'nj-star'; s.innerHTML = STAR;
        s.style.transform = `translate(${p.x}px, ${p.y}px)`;
        el.arena.appendChild(s);
        return s;
    }
    function boom(w, who, p) {
        w.state = 'dead';
        w.el.classList.remove('danger');
        w.el.classList.add('boom', who);
        setTimeout(() => w.el.remove(), 450);
        const col = who === 'me' ? ['#60a5fa', '#bfdbfe', '#fde047'] : ['#fb7185', '#fecdd3', '#fde047'];
        for (let k = 0; k < 10; k++) {
            const s = document.createElement('div');
            s.className = 'nj-spark'; s.style.background = col[k % 3];
            el.arena.appendChild(s);
            const ang = (k / 10) * Math.PI * 2, dist = 34 + Math.random() * 30;
            s.animate([
                { transform: `translate(${p.x}px, ${p.y}px) scale(1)`, opacity: 1 },
                { transform: `translate(${p.x + Math.cos(ang) * dist}px, ${p.y + Math.sin(ang) * dist}px) scale(.3)`, opacity: 0 }
            ], { duration: 480, easing: 'ease-out', fill: 'forwards' }).finished.then(() => s.remove());
        }
        floatText({ x: p.x, y: p.y - 26 }, who === 'me' ? '+1 Bạn' : '+1 ' + opName(), who);
    }
    function floatText(p, text, cls) {
        const f = document.createElement('div');
        f.className = 'nj-float ' + cls; f.textContent = text;
        el.arena.appendChild(f);
        const x = Math.max(50, Math.min(W - 50, p.x));
        f.animate([
            { transform: `translate(${x}px, ${p.y}px) translate(-50%, -50%) scale(.7)`, opacity: 0 },
            { transform: `translate(${x}px, ${p.y - 10}px) translate(-50%, -50%) scale(1)`, opacity: 1, offset: 0.2 },
            { transform: `translate(${x}px, ${p.y - 40}px) translate(-50%, -50%)`, opacity: 0 }
        ], { duration: 1100, easing: 'ease-out', fill: 'forwards' }).finished.then(() => f.remove());
    }
    function updateScores() {
        if (!ctx || !$('njMeScore')) return;
        let opt = 0; pending.forEach(i => { if (!claims.has(i)) opt++; }); // tạm cộng từ đang chờ server xác nhận
        $('njMeScore').textContent = hits(uidMe()) + opt;
        $('njOpScore').textContent = hits(ctx.opId());
    }

    // ── Kết thúc ──
    function finish() {
        if (finished) return;
        finished = true;
        cancelAnimationFrame(raf); raf = 0; clearInterval(tickTimer); tickTimer = null;
        el.input.disabled = true; el.input.blur();
        saveSelf({ done: true });
        const op = room['s_' + ctx.opId()] || {};
        if (op.done || room.status === 'finished') { showResult(false); return; }
        el.count.style.display = 'flex';
        el.count.innerHTML = '<b style="font-size:2.4em">Hết giờ!</b><small>Đang chờ kết quả của ' + ctx.esc(opName()) + '…</small>';
        // Đối thủ thoát → vẫn hiện kết quả sau 8 giây
        waitTimer = setTimeout(() => showResult(true), 8000);
    }

    function showResult(opLeft) {
        if (resultShown || !ctx) return;
        resultShown = true;
        clearTimeout(waitTimer); waitTimer = null;
        cancelAnimationFrame(raf); raf = 0;
        const myS = hits(uidMe()), opS = hits(ctx.opId());
        const outcome = myS > opS ? 'win' : myS < opS ? 'lose' : 'draw';
        if (room.status !== 'finished') ctx.roomRef.update({ status: 'finished', endedAt: ctx.FV().serverTimestamp() }).catch(() => {});
        const { esc, tile, ic } = ctx;
        const N = room.questions.length;
        const winnerName = outcome === 'win' ? ctx.myName : outcome === 'lose' ? opName() : '';
        const title = outcome === 'win' ? 'Chiến thắng!' : outcome === 'lose' ? 'Thua mất rồi!' : 'Hoà!';
        const box = (name, score, state, you, miss) => `<div class="du-score-box ${state}">
            ${state === 'win' ? `<span class="du-crown">${tile('crown', 'amber')}</span>` : ''}
            <div class="n"><span>${esc(name)}</span>${you ? '<span class="lx-badge reading">Bạn</span>' : ''}</div>
            <b>${score}</b><div class="c">từ đã phá · ${miss} lần trượt</div></div>`;
        const op = room['s_' + ctx.opId()] || {};
        const rows = room.questions.map((q, i) => {
            const u = claims.get(i);
            const who = u === uidMe() ? '<span class="nj-who me">Bạn</span>' : u ? `<span class="nj-who op">${esc(opName())}</span>` : '<span class="nj-who none">Rơi mất</span>';
            return `<div class="du-review-row"><span class="i">${i + 1}</span><span class="w" lang="ko">${esc(q.w)}</span><span class="m">${esc(q.m)}</span>${who}</div>`;
        }).join('');
        ctx.show('duResult');
        $('duResult').innerHTML = `
            <section class="lx-banner duel du-res-banner ${outcome}">
                ${tile(outcome === 'win' ? 'trophy' : outcome === 'lose' ? 'shield' : 'swords', 'violet', 'lg')}
                <div class="du-res-title">${title}</div>
                <div class="du-res-sub">Ninja phi tiêu · ${myS} – ${opS}${winnerName ? ' · ' + esc(winnerName) + ' thắng' : ''}${opLeft ? ' · ' + esc(opName()) + ' đã rời trận' : ''}</div>
                <div id="duReward" class="du-reward"></div>
            </section>
            <div class="lx-card"><div class="du-score-row">
                ${box(ctx.myName, myS, outcome === 'win' ? 'win' : '', true, myMiss)}
                ${box(opName(), opS, outcome === 'lose' ? 'win' : '', false, op.misses || 0)}
            </div></div>
            <div class="lx-card">
                <div class="lx-sec">${tile('list', 'blue', 'sm')}<div><div class="lx-sec-t">Các từ trong trận</div><div class="lx-sec-s">Bạn phá ${myS}/${N} từ · ${N - myS - opS} từ rơi mất</div></div></div>
                <div class="du-review">${rows}</div>
            </div>
            <div class="lx-card du-actions">
                <button class="lx-btn lx-btn-coral" onclick="Duel.rematch()">${ic('swords')}Thách đấu lại</button>
                <button class="lx-btn" onclick="Duel.toLobby()">${ic('home')}Về sảnh</button>
            </div>`;
        if (outcome === 'win' && typeof confetti === 'function') confetti({ particleCount: 180, spread: 90, origin: { y: 0.6 } });
        ctx.giveReward(outcome);
        const c = ctx; stop(); c.onDone && c.onDone();
    }

    // Mở lại trang sau khi trận đã xong → hiện kết quả luôn
    async function showFinished(c) {
        stop();
        ctx = c; room = c.room; injectCss();
        claims = new Map();
        const mine = room[ctx.myKey()] || {};
        myMiss = mine.misses || 0;
        try { (await ctx.roomRef.collection('claims').get()).forEach(d => claims.set(parseInt(d.id, 10), d.data().uid)); } catch (e) {}
        resultShown = false; finished = true;
        showResult(false);
    }

    // serverOffset dùng chung cho trò kéo co (duel-tug.js)
    // Cho máy (duel-bot.js) đọc lịch rơi: từ nào đang rơi, đã có chủ chưa
    function peek() {
        if (!ctx || !startLocal) return null;
        computeSchedule();
        return { t: now(), S: sched.S, E: sched.E, n: room.questions.length, claimed: k => claims.has(k), over: finished };
    }
    window.DuelNinja = { buildQuestions, start, update, stop, showFinished, serverOffset, peek, isRunning: () => !!ctx, N_WORDS };
})();
