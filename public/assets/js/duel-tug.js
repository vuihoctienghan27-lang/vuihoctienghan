/* duel-tug.js — "Kéo co trắc nghiệm" cho thi đấu 1-1 (duel.html).
   - Hai người thấy CÙNG một câu cùng lúc. Ai chọn đúng trước giành câu đó (claims/{k} chỉ tạo được 1 lần,
     rules kiểm tra c == đáp án đúng) → người kia mất quyền trả lời. Chọn sai thì bị khoá, người kia còn cơ hội.
   - Lịch câu hỏi tính từ dữ liệu chung (thời điểm claim trên server, thời điểm hai người cùng sai) theo giờ server
     → hai máy chuyển câu cùng lúc.
   - Dây kéo: f = (điểm mình − điểm đối thủ) / (|chênh lệch| + số câu còn lại) ∈ [−1, 1].
     |f| = 1 chỉ xảy ra khi hết câu: người ít điểm bị kéo tới vạch đỏ và ngã.
   - Cảnh nền (biển / rừng / cánh đồng / núi / thảo nguyên) chọn theo mã phòng → hai máy giống nhau.
   - Nhạc nền êm dịu tạo bằng Web Audio (ngũ cung), không dùng file âm thanh có bản quyền. */
(function () {
    'use strict';
    const COUNT = 3500, Q_MS = 10000, GRACE = 1000, REVEAL = 2400;
    const SCENES = [
        { id: 'beach', name: 'Bãi biển' }, { id: 'forest', name: 'Trong rừng' }, { id: 'field', name: 'Cánh đồng' },
        { id: 'mountain', name: 'Núi' }, { id: 'steppe', name: 'Thảo nguyên' }
    ];
    const sceneIndex = id => { let h = 0; for (const ch of String(id)) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return h % SCENES.length; };

    // ───────────────────────── NHẠC NỀN ─────────────────────────
    const Music = (() => {
        let ac = null, master = null, dry = null, verb = null, timer = null, nextT = 0, step = 0, cfg = null, last = 7, ambT = 0;
        let enabled = true;
        try { enabled = localStorage.getItem('duel_music') !== '0'; } catch (e) {}
        const STYLES = [ // [nốt gốc MIDI, ngũ cung trưởng/thứ, nhịp/phút, âm sắc giai điệu, tiếng môi trường]
            { root: 62, minor: false, bpm: 66, wave: 'sine', amb: 'waves' },     // biển — D
            { root: 67, minor: false, bpm: 72, wave: 'triangle', amb: 'birds' }, // rừng — G
            { root: 65, minor: false, bpm: 76, wave: 'triangle', amb: 'birds' }, // cánh đồng — F
            { root: 69, minor: true, bpm: 62, wave: 'sine', amb: 'wind' },       // núi — A thứ
            { root: 64, minor: false, bpm: 70, wave: 'sine', amb: 'wind' }       // thảo nguyên — E
        ];
        const hz = m => 440 * Math.pow(2, (m - 69) / 12);
        function ensure() {
            if (ac) return ac;
            const AC = window.AudioContext || window.webkitAudioContext;
            if (!AC) return null;
            ac = new AC();
            master = ac.createGain(); master.gain.value = 0; master.connect(ac.destination);
            dry = ac.createGain(); dry.gain.value = 0.8; dry.connect(master);
            // Hồi âm: nhiễu tắt dần
            const len = Math.floor(ac.sampleRate * 2.6), buf = ac.createBuffer(2, len, ac.sampleRate);
            for (let c = 0; c < 2; c++) { const d = buf.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3); }
            verb = ac.createConvolver(); verb.buffer = buf;
            const wet = ac.createGain(); wet.gain.value = 0.45; verb.connect(wet); wet.connect(master);
            return ac;
        }
        function tone(f, t, dur, type, vol, cutoff) {
            const o = ac.createOscillator(), g = ac.createGain(), lp = ac.createBiquadFilter();
            o.type = type; o.frequency.value = f;
            lp.type = 'lowpass'; lp.frequency.value = cutoff || 2200;
            g.gain.setValueAtTime(0, t);
            g.gain.linearRampToValueAtTime(vol, t + Math.min(0.08, dur * 0.3));
            g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
            o.connect(lp); lp.connect(g); g.connect(dry); g.connect(verb);
            o.start(t); o.stop(t + dur + 0.05);
        }
        function noise(t, dur, vol, freq) {
            const len = Math.floor(ac.sampleRate * dur), b = ac.createBuffer(1, len, ac.sampleRate), d = b.getChannelData(0);
            for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
            const s = ac.createBufferSource(), lp = ac.createBiquadFilter(), g = ac.createGain();
            s.buffer = b; lp.type = 'lowpass'; lp.frequency.value = freq;
            g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + dur * 0.45); g.gain.linearRampToValueAtTime(0, t + dur);
            s.connect(lp); lp.connect(g); g.connect(dry); s.start(t);
        }
        function bird(t) {
            for (let k = 0; k < 3; k++) {
                const o = ac.createOscillator(), g = ac.createGain(), t0 = t + k * 0.13;
                o.type = 'sine'; o.frequency.setValueAtTime(2600 + Math.random() * 600, t0); o.frequency.exponentialRampToValueAtTime(3800 + Math.random() * 500, t0 + 0.08);
                g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(0.025, t0 + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.1);
                o.connect(g); g.connect(dry); g.connect(verb); o.start(t0); o.stop(t0 + 0.12);
            }
        }
        function schedule() {
            const beat = 60 / cfg.bpm / 2; // nốt móc đơn
            const pent = cfg.minor ? [0, 3, 5, 7, 10] : [0, 2, 4, 7, 9];
            const prog = cfg.minor ? [0, 8, 3, 10] : [0, 9, 5, 7]; // I–vi–IV–V (thứ: i–VI–III–VII)
            while (nextT < ac.currentTime + 0.4) {
                const bar = Math.floor(step / 8) % 4, inBar = step % 8, r = cfg.root + prog[bar];
                if (inBar === 0) {
                    const third = cfg.minor ? ([0, 3].includes(bar) ? 3 : 4) : ([1].includes(bar) ? 3 : 4);
                    [r - 12, r - 12 + third, r - 12 + 7].forEach(m => tone(hz(m), nextT, beat * 8.2, 'triangle', 0.035, 900));
                    tone(hz(r - 24), nextT, beat * 7, 'sine', 0.05, 400);
                }
                if (Math.random() < (inBar % 2 ? 0.25 : 0.6)) {
                    last = Math.max(0, Math.min(10, last + [-2, -1, -1, 0, 1, 1, 2][Math.floor(Math.random() * 7)]));
                    const m = cfg.root + Math.floor(last / 5) * 12 + pent[last % 5];
                    tone(hz(m), nextT, beat * (1.6 + Math.random()), cfg.wave, 0.05, 2400);
                }
                step++; nextT += beat;
            }
            if (ac.currentTime > ambT) {
                const t = ac.currentTime + 0.1;
                if (cfg.amb === 'waves') { noise(t, 4.5, 0.05, 700); ambT = t + 6 + Math.random() * 3; }
                else if (cfg.amb === 'birds') { bird(t); ambT = t + 5 + Math.random() * 6; }
                else { noise(t, 6, 0.025, 450); ambT = t + 7 + Math.random() * 4; }
            }
        }
        return {
            unlock() { if (ensure() && ac.state === 'suspended') ac.resume().catch(() => {}); },
            isOn: () => enabled,
            blocked: () => !ac || ac.state !== 'running',
            start(scene) {
                if (!enabled || !ensure()) return;
                cfg = STYLES[scene] || STYLES[0];
                if (ac.state === 'suspended') ac.resume().catch(() => {});
                if (timer) return;
                nextT = ac.currentTime + 0.15; step = 0; ambT = ac.currentTime + 2;
                master.gain.cancelScheduledValues(ac.currentTime);
                master.gain.setValueAtTime(master.gain.value, ac.currentTime);
                master.gain.linearRampToValueAtTime(0.9, ac.currentTime + 2.5);
                timer = setInterval(schedule, 120);
                schedule();
            },
            stop() {
                if (!ac) return;
                clearInterval(timer); timer = null;
                master.gain.cancelScheduledValues(ac.currentTime);
                master.gain.setValueAtTime(master.gain.value, ac.currentTime);
                master.gain.linearRampToValueAtTime(0, ac.currentTime + 1.2);
            },
            toggle(scene) {
                enabled = !enabled;
                try { localStorage.setItem('duel_music', enabled ? '1' : '0'); } catch (e) {}
                if (enabled) { this.unlock(); this.start(scene); } else this.stop();
                return enabled;
            },
            chime(good) { // tiếng "ting" nhẹ khi xong một câu
                if (!enabled || !ac || ac.state !== 'running') return;
                const t = ac.currentTime + 0.02, base = cfg ? cfg.root + 12 : 72;
                (good ? [0, 4, 7] : [7, 4]).forEach((d, k) => tone(hz(base + d), t + k * 0.09, 0.5, 'sine', 0.06, 3000));
            }
        };
    })();

    // ───────────────────────── ĐỒ HOẠ ─────────────────────────
    // Nhân vật mặc Hanbok (jeogori + chima, nơ goreum, tóc búi cài trâm), quay mặt sang phải, chân tại (50,135)
    function hanbok(c) {
        return `
        <path d="M50 47 Q66 53 84 58" stroke="${c.jeo}" stroke-width="8" stroke-linecap="round" fill="none" opacity=".85"/>
        <path d="M36 52 Q25 96 18 134 Q50 140 82 134 Q75 96 64 52 Z" fill="${c.chima}"/>
        <path d="M44 60 Q39 100 36 134 M56 60 Q61 100 66 134" stroke="rgba(0,0,0,.13)" stroke-width="2" fill="none"/>
        <path d="M36 52 Q50 56 64 52 L65 57 Q50 61 35 57 Z" fill="rgba(255,255,255,.35)"/>
        <path d="M62 133 Q73 130 84 135 Q74 139 62 137 Z" fill="#f8fafc" stroke="#94a3b8" stroke-width=".8"/>
        <path d="M37 39 Q50 33 63 39 L66 55 Q50 59 34 55 Z" fill="${c.jeo}"/>
        <path d="M46 38 L54 50 L61 39" stroke="#fff" stroke-width="3" fill="none" stroke-linejoin="round"/>
        <path d="M54 50 Q58 63 55 80" stroke="${c.goreum}" stroke-width="3" fill="none" stroke-linecap="round"/>
        <path d="M54 50 Q61 61 61 73" stroke="${c.goreum}" stroke-width="3" fill="none" stroke-linecap="round"/>
        <circle cx="54" cy="50" r="2.6" fill="${c.goreum}"/>
        <path d="M58 44 Q72 50 83 57" stroke="${c.jeo}" stroke-width="9" stroke-linecap="round" fill="none"/>
        <path d="M80 55.2 L85 58.2" stroke="${c.cuff}" stroke-width="9" stroke-linecap="round"/>
        <circle cx="89" cy="59" r="4.2" fill="#fcd9b6"/>
        <rect x="47.5" y="32" width="6" height="8" rx="2" fill="#fcd9b6"/>
        <circle cx="52" cy="23" r="12.5" fill="#fcd9b6"/>
        <path d="M39.5 24 Q39 9 53 10 Q65 11 64.5 21 Q58 15 50 16.5 Q44 18 42.5 27 Z" fill="#1f2937"/>
        <circle cx="37.5" cy="27" r="6.2" fill="#1f2937"/>
        <path d="M30.5 24.5 L45 28.5" stroke="#f59e0b" stroke-width="1.6" stroke-linecap="round"/>
        <circle cx="58.5" cy="23" r="1.6" fill="#111827"/>
        <path d="M56 19.5 L60.5 19" stroke="#111827" stroke-width="1" stroke-linecap="round"/>
        <circle cx="58" cy="28.5" r="2.5" fill="#fda4af" opacity=".7"/>
        <path d="M58.5 31 Q61.5 32.5 63 30" stroke="#be123c" stroke-width="1.1" fill="none" stroke-linecap="round"/>`;
    }
    const PL_ME = { jeo: '#fef3c7', chima: '#2563eb', goreum: '#dc2626', cuff: '#60a5fa' };
    const PL_OP = { jeo: '#fce7f3', chima: '#e11d48', goreum: '#7c3aed', cuff: '#f472b6' };

    const cloud = (x, y, s, dur) => `<g opacity=".92"><g transform="translate(${x} ${y}) scale(${s})">
        <ellipse cx="0" cy="0" rx="22" ry="9" fill="#fff"/><ellipse cx="-12" cy="-5" rx="11" ry="9" fill="#fff"/><ellipse cx="9" cy="-7" rx="13" ry="11" fill="#fff"/></g>
        <animateTransform attributeName="transform" type="translate" from="-460 0" to="460 0" dur="${dur}s" begin="-${dur * 0.5}s" repeatCount="indefinite"/></g>`;
    function sceneSVG(i) {
        const clouds = cloud(120, 28, 1, 70) + cloud(300, 46, .7, 95) + cloud(40, 60, .55, 120);
        switch (SCENES[i].id) {
            case 'beach': return `
                <defs><linearGradient id="tgSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7dd3fc"/><stop offset="1" stop-color="#e0f2fe"/></linearGradient>
                <linearGradient id="tgSea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0284c7"/><stop offset="1" stop-color="#38bdf8"/></linearGradient>
                <linearGradient id="tgSand" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fde68a"/><stop offset="1" stop-color="#f59e0b"/></linearGradient></defs>
                <rect width="400" height="200" fill="url(#tgSky)"/>
                <circle cx="330" cy="40" r="20" fill="#fde047"/><circle cx="330" cy="40" r="30" fill="#fde047" opacity=".25"/>${clouds}
                <rect y="104" width="400" height="50" fill="url(#tgSea)"/>
                <g opacity=".6"><path d="M-40 118 q20 -5 40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0" stroke="#e0f2fe" stroke-width="2" fill="none">
                    <animateTransform attributeName="transform" type="translate" from="0 0" to="40 0" dur="4s" repeatCount="indefinite"/></path>
                <path d="M-40 134 q20 -5 40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0" stroke="#e0f2fe" stroke-width="2" fill="none">
                    <animateTransform attributeName="transform" type="translate" from="40 0" to="0 0" dur="5s" repeatCount="indefinite"/></path></g>
                <path d="M0 150 Q100 140 200 146 T400 144 L400 200 L0 200 Z" fill="url(#tgSand)"/>
                <path d="M30 152 Q36 110 52 82" stroke="#92400e" stroke-width="6" fill="none" stroke-linecap="round"/>
                <g fill="#16a34a"><path d="M52 82 Q30 70 12 84 Q32 76 50 86Z"/><path d="M52 82 Q74 66 94 78 Q72 74 54 86Z"/><path d="M52 82 Q46 58 30 52 Q46 64 50 84Z"/><path d="M52 82 Q62 58 80 56 Q64 66 54 84Z"/></g>
                <circle cx="356" cy="168" r="4" fill="#fb7185"/><path d="M340 176 l6 -4 l6 4 z" fill="#fff" opacity=".8"/>`;
            case 'forest': return `
                <defs><linearGradient id="tgSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a7f3d0"/><stop offset="1" stop-color="#ecfccb"/></linearGradient></defs>
                <rect width="400" height="200" fill="url(#tgSky)"/>${clouds}
                <g fill="#4d7c0f" opacity=".55">${[0, 40, 80, 120, 160, 200, 240, 280, 320, 360, 400].map((x, k) => `<path d="M${x - 24} 150 L${x} ${70 + (k % 3) * 12} L${x + 24} 150 Z"/>`).join('')}</g>
                <g fill="#166534">${[-10, 50, 110, 290, 350, 410].map((x, k) => `<path d="M${x - 30} 160 L${x} ${40 + (k % 2) * 16} L${x + 30} 160 Z"/><rect x="${x - 4}" y="156" width="8" height="12" fill="#78350f"/>`).join('')}</g>
                <path d="M0 158 Q200 148 400 158 L400 200 L0 200 Z" fill="#22c55e"/><path d="M0 172 Q200 166 400 172 L400 200 L0 200 Z" fill="#16a34a"/>
                ${[60, 140, 250, 330].map(x => `<circle cx="${x}" cy="176" r="2.5" fill="#fef08a"/><circle cx="${x + 8}" cy="181" r="2" fill="#f9a8d4"/>`).join('')}`;
            case 'field': return `
                <defs><linearGradient id="tgSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#bae6fd"/><stop offset="1" stop-color="#fef3c7"/></linearGradient></defs>
                <rect width="400" height="200" fill="url(#tgSky)"/>
                <circle cx="70" cy="44" r="18" fill="#fef08a"/>${clouds}
                <path d="M0 128 Q100 108 200 124 T400 118 L400 200 L0 200Z" fill="#86efac"/>
                <g fill="#15803d">${[230, 250, 262].map(x => `<circle cx="${x}" cy="118" r="9"/>`).join('')}</g>
                <path d="M0 140 L400 136 L400 200 L0 200Z" fill="#facc15"/>
                ${[148, 158, 170, 184].map((y, k) => `<path d="M0 ${y} L400 ${y - 2}" stroke="${k % 2 ? '#eab308' : '#fde047'}" stroke-width="${3 + k}" />`).join('')}
                ${[30, 90, 340, 380].map(x => `<g><line x1="${x}" y1="186" x2="${x}" y2="160" stroke="#15803d" stroke-width="2"/><circle cx="${x}" cy="158" r="6" fill="#f59e0b"/><circle cx="${x}" cy="158" r="2.6" fill="#78350f"/></g>`).join('')}`;
            case 'mountain': return `
                <defs><linearGradient id="tgSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c7d2fe"/><stop offset="1" stop-color="#f1f5f9"/></linearGradient></defs>
                <rect width="400" height="200" fill="url(#tgSky)"/>${clouds}
                <path d="M-20 150 L70 40 L130 110 L200 30 L280 120 L330 60 L420 150 Z" fill="#a5b4fc"/>
                <path d="M70 40 L86 60 L76 58 L66 66 L58 55 Z M200 30 L220 54 L206 50 L196 60 L184 50 Z M330 60 L344 76 L334 74 L326 80 L318 74 Z" fill="#fff"/>
                <path d="M-20 160 L60 96 L140 150 L230 90 L320 150 L420 110 L420 170 L-20 170 Z" fill="#6366f1" opacity=".75"/>
                <path d="M0 160 Q200 148 400 160 L400 200 L0 200 Z" fill="#4ade80"/><path d="M0 176 Q200 170 400 176 L400 200 L0 200 Z" fill="#22c55e"/>
                ${[24, 52, 352, 380].map(x => `<path d="M${x - 9} 168 L${x} 140 L${x + 9} 168 Z" fill="#14532d"/>`).join('')}`;
            default: return `
                <defs><linearGradient id="tgSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#93c5fd"/><stop offset="1" stop-color="#e0f2fe"/></linearGradient></defs>
                <rect width="400" height="200" fill="url(#tgSky)"/>
                <circle cx="320" cy="36" r="16" fill="#fef9c3"/>${clouds}
                <path d="M0 132 Q80 104 170 126 T400 112 L400 200 L0 200 Z" fill="#bbf7d0"/>
                <path d="M0 150 Q120 130 250 148 T400 140 L400 200 L0 200 Z" fill="#86efac"/>
                <path d="M0 168 Q200 158 400 168 L400 200 L0 200 Z" fill="#4ade80"/>
                <g transform="translate(330 128)"><path d="M-16 12 Q-16 -6 0 -8 Q16 -6 16 12 Z" fill="#f8fafc" stroke="#cbd5e1"/><path d="M-16 4 L16 4" stroke="#dc2626" stroke-width="2"/><rect x="-4" y="3" width="8" height="9" fill="#92400e"/></g>
                ${[40, 110, 190, 270, 360].map(x => `<circle cx="${x}" cy="182" r="2.2" fill="#fde047"/><circle cx="${x + 10}" cy="188" r="2" fill="#f0abfc"/>`).join('')}`;
        }
    }

    const CSS = `
    /* Gọn để cả cảnh + câu hỏi vừa một màn hình; ghim ngay dưới thanh menu khi cuộn.
       Chiều cao ≤ 40vw để trên điện thoại vẫn thấy đủ hai nhân vật (kể cả lúc dây kéo hết cỡ). */
    .tg-scene { --tg-h: max(130px, min(30vh, 40vw, 230px)); position: sticky; top: var(--tg-top, 84px); z-index: 20; width: 100%; height: var(--tg-h);
        margin: 0 auto 10px; border-radius: 20px; overflow: hidden;
        box-shadow: 0 14px 30px -14px rgba(15,23,42,.45); background: #bae6fd; }
    .tg-scene > svg { position: absolute; inset: 0; width: 100%; height: 100%; display: block; overflow: visible; }
    .tg-scene.done { position: relative; top: auto; }
    .tg-hud { position: absolute; left: 0; right: 0; top: 0; display: flex; justify-content: space-between; align-items: flex-start; padding: 10px 12px; gap: 8px; pointer-events: none; }
    .tg-pl { display: flex; align-items: center; gap: 8px; padding: 5px 12px 5px 5px; border-radius: 999px; background: rgba(255,255,255,.88); box-shadow: 0 4px 12px -4px rgba(0,0,0,.25);
        min-width: 0; max-width: 30%; color: #0f172a; }
    .tg-pl span { max-width: 90px; }
    .tg-pl.op { flex-direction: row-reverse; padding: 5px 5px 5px 12px; }
    .tg-pl b { font-size: 1.35em; font-weight: 900; min-width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #fff; font-variant-numeric: tabular-nums; }
    .tg-pl.me b { background: #2563eb; } .tg-pl.op b { background: #e11d48; }
    .tg-pl span { font-weight: 800; font-size: .82em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .tg-mid { display: flex; flex-direction: column; align-items: center; gap: 5px; }
    .tg-music { pointer-events: auto; border: 0; cursor: pointer; width: 34px; height: 34px; border-radius: 50%; background: rgba(255,255,255,.88); color: #334155; display: flex; align-items: center; justify-content: center;
        box-shadow: 0 4px 12px -4px rgba(0,0,0,.25); font-size: 17px; position: relative; }
    .tg-music.off::after { content: ''; position: absolute; width: 22px; height: 2.5px; background: #e11d48; transform: rotate(-45deg); border-radius: 2px; }
    .tg-music.hint { animation: tgPulse 1.4s infinite; }
    @keyframes tgPulse { 50% { box-shadow: 0 0 0 7px rgba(37,99,235,.25); } }
    .tg-banner { position: absolute; left: 50%; top: 46%; transform: translate(-50%, -50%); font-weight: 900; font-size: 1.6em; color: #fff; text-shadow: 0 3px 12px rgba(0,0,0,.45); white-space: nowrap; pointer-events: none; }
    .tg-q { text-align: center; padding: 12px 14px; position: relative; }
    .tg-q .du-ask { font-size: .72em; padding: 3px 10px; }
    .tg-q .du-word { font-size: 2.1em; margin: 6px 0 10px; }
    .tg-q .du-timer { height: 8px; margin-bottom: 12px; }
    .tg-q .du-answers { grid-template-columns: 1fr 1fr !important; gap: 8px; }
    .tg-q .du-ans { min-height: 48px; padding: 8px 10px; gap: 8px; font-size: .92em; border-radius: 14px; }
    .tg-q .du-key { width: 26px; height: 26px; border-radius: 8px; font-size: .82em; }
    .tg-q .du-timer div { transition: none; }
    .tg-fb { min-height: 26px; margin-top: 8px; font-size: .92em; font-weight: 800; display: flex; align-items: center; justify-content: center; gap: 8px; flex-wrap: wrap; }
    .tg-fb.ok { color: var(--pos); } .tg-fb.no { color: var(--neg); } .tg-fb.info { color: var(--text-sub); }
    .tg-fb .ui-tile { width: 28px; height: 28px; border-radius: 50%; font-size: 14px; }
    .tg-opchip { display: inline-flex; align-items: center; gap: 6px; font-size: .8em; font-weight: 800; padding: 4px 10px; border-radius: 999px; background: #fff7ed; color: #c2410c; margin-top: 8px; }
    body.dark-mode .tg-opchip { background: #431407; color: #fdba74; }
    .tg-count { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; border-radius: inherit; background: var(--card); z-index: 2; }
    .tg-count b { font-size: 4em; font-weight: 900; color: var(--primary); line-height: 1; }
    .tg-count small { font-weight: 700; color: var(--text-sub); margin-top: 6px; }
    .du-ans.pending { border-color: #34d399; }
    .nj-who { display: inline-flex; align-items: center; font-size: .78em; font-weight: 800; padding: 2px 8px; border-radius: 999px; white-space: nowrap; }
    .nj-who.me { background: #dbeafe; color: #1d4ed8; } .nj-who.op { background: #ffe4e6; color: #be123c; } .nj-who.none { background: var(--soft); color: var(--text-sub); }
    body.dark-mode .nj-who.me { background: #1e3a8a; color: #bfdbfe; } body.dark-mode .nj-who.op { background: #4c0519; color: #fecdd3; }
    @media (max-width: 600px) { .tg-q .du-word { font-size: 1.7em; } .tg-q .du-ans { font-size: .86em; min-height: 46px; }
        .tg-pl { padding: 3px 9px 3px 3px; } .tg-pl.op { padding: 3px 3px 3px 9px; } .tg-hud { padding: 7px 8px; }
        .tg-pl span { max-width: 80px; } .tg-pl b { min-width: 26px; height: 26px; font-size: 1.1em; } .tg-banner { font-size: 1.15em; } }`;

    // ───────────────────────── TRẠNG THÁI ─────────────────────────
    let ctx = null, room = null, scene = 0, claims = new Map(), claimsUnsub = null, raf = 0, logicTimer = null, startLocal = 0, syncing = false;
    let myAns = {}, sched = null, shownK = -2, shownPhase = '', revealKey = '', finishedAt = 0, resultShown = false, doneWritten = false, waitTimer = null, opSeen = false;
    // Hình: vị trí dây (hiện tại / đích), độ giật khi thắng câu, ngã
    let dx = 0, jolt = { me: 0, op: 0 }, fall = null, keyHandler = null;
    const G0 = 70, S = 0.75, FOOT_Y = 185;
    const $ = id => document.getElementById(id);
    const uidMe = () => ctx.me.uid;

    function injectCss() { if ($('tg-css')) return; const s = document.createElement('style'); s.id = 'tg-css'; s.textContent = CSS; document.head.appendChild(s); }

    function start(c) {
        stop();
        ctx = c; room = c.room; injectCss();
        scene = sceneIndex(room.id);
        claims = new Map(); myAns = {}; shownK = -2; shownPhase = ''; revealKey = ''; finishedAt = 0; resultShown = false; doneWritten = false;
        dx = 0; jolt = { me: 0, op: 0 }; fall = null; startLocal = 0; syncing = false;
        const mine = room[ctx.myKey()] || {};
        Object.keys(mine.w || {}).forEach(k => { myAns[k] = { c: -1, wrong: true }; });
        opSeen = !!(room['s_' + ctx.opId()] || {}).on;
        render();
        claimsUnsub = ctx.roomRef.collection('claims').onSnapshot(onClaims, e => console.warn('[Tug] claims', e));
        keyHandler = e => {
            if (!ctx || e.target.tagName === 'INPUT' || e.ctrlKey || e.metaKey || e.altKey) return;
            const k = parseInt(e.key, 10);
            if (k >= 1 && k <= 4) answer(k - 1);
        };
        document.addEventListener('keydown', keyHandler);
        Music.start(scene);
        update(room);
    }

    function stop() {
        cancelAnimationFrame(raf); raf = 0; clearInterval(logicTimer); logicTimer = null; clearTimeout(waitTimer); waitTimer = null;
        if (claimsUnsub) { claimsUnsub(); claimsUnsub = null; }
        if (keyHandler) { document.removeEventListener('keydown', keyHandler); keyHandler = null; }
        Music.stop();
        ctx = null;
    }

    function update(r) {
        if (!ctx) return;
        room = r;
        const op = room['s_' + ctx.opId()] || {};
        if (op.on) opSeen = true;
        $('tgOpName').textContent = ctx.opName();
        initClock();
        tickLogic();
        if (finishedAt && !resultShown && (op.done || room.status === 'finished')) showResult(false);
    }

    function initClock() {
        if (startLocal || syncing || !room.startAt || !room.startAt.toMillis) return;
        syncing = true;
        const c = ctx, startMs = room.startAt.toMillis(), key = 'tg_off_' + room.id;
        c.serverOffset().then(off => {
            syncing = false;
            if (ctx !== c) return;
            if (off == null) {
                try { off = parseFloat(sessionStorage.getItem(key)); } catch (e) {}
                if (!isFinite(off)) off = c.fresh && Math.abs(Date.now() - startMs) > 3000 ? startMs - Date.now() + 300 : 0;
            }
            try { sessionStorage.setItem(key, String(off)); } catch (e) {}
            startLocal = startMs - off;
            if (!raf) raf = requestAnimationFrame(frame);
            // Tab ẩn: rAF dừng → logic vẫn chạy để chuyển câu / kết thúc đúng giờ
            clearInterval(logicTimer); logicTimer = setInterval(tickLogic, 250);
            tickLogic();
        });
    }
    const now = () => Date.now() - startLocal;

    // ── Lịch câu hỏi (giống nhau ở 2 máy) ──
    // S[k] bắt đầu · D[k] hết giờ · E[k] kết thúc (đúng trước / cả hai sai / hết giờ + GRACE) · W[k] người thắng câu
    function wrongAt(uid, k) {
        if (uid === uidMe() && myAns[k] && myAns[k].wrong && myAns[k].t != null) return myAns[k].t;
        const w = (room['s_' + uid] || {}).w;
        return w && w[k] != null ? w[k] : null;
    }
    function computeSchedule() {
        const n = room.questions.length, Sx = [], D = [], E = [], W = [];
        let s = COUNT;
        for (let k = 0; k < n; k++) {
            Sx[k] = s; D[k] = s + Q_MS;
            const c = claims.get(k);
            if (c && c.at <= D[k] + GRACE) { E[k] = Math.max(c.at, s); W[k] = c.uid; }
            else {
                const a = wrongAt(uidMe(), k), b = wrongAt(ctx.opId(), k);
                E[k] = a != null && b != null ? Math.min(Math.max(a, b, s), D[k]) : D[k] + GRACE;
                W[k] = null;
            }
            s = E[k] + REVEAL;
        }
        sched = { S: Sx, D, E, W, n };
        return sched;
    }
    function standing(t) {
        let me = 0, op = 0, done = 0;
        for (let k = 0; k < sched.n; k++) if (t >= sched.E[k]) { done++; if (sched.W[k] === uidMe()) me++; else if (sched.W[k]) op++; }
        return { me, op, remaining: sched.n - done };
    }

    // ── Logic theo thời gian ──
    function tickLogic() {
        if (!ctx || !startLocal || !room.questions) return;
        const t = now();
        computeSchedule();
        const st = standing(t);
        $('tgMeScore').textContent = st.me; $('tgOpScore').textContent = st.op;
        const diff = st.me - st.op;
        // Hết câu: người ít điểm bị kéo tới vạch rồi ngã
        if (st.remaining === 0) { if (!finishedAt) finish(diff); return; }
        let k = -1;
        for (let i = 0; i < sched.n; i++) if (t >= sched.S[i]) k = i;
        if (k < 0) { // đếm ngược trước câu 1
            showCount(Math.ceil((sched.S[0] - t) / 1000));
            return;
        }
        if (k !== shownK) { shownK = k; renderQuestion(k); }
        const open = t < sched.E[k];
        if (open) {
            const left = Math.max(0, sched.D[k] - t);
            $('tgTimer').style.width = (left / Q_MS * 100).toFixed(2) + '%';
            if (left <= 0 && !myAns[k]) lockButtons(k, null);
            renderStatus(k, t);
        } else {
            $('tgTimer').style.width = '0%';
            const rk = k + ':' + (sched.W[k] || '-');
            if (revealKey !== rk) { revealKey = rk; renderReveal(k); }
        }
    }

    function showCount(n) {
        const q = $('tgQ');
        if (!q.querySelector('.tg-count')) q.insertAdjacentHTML('beforeend', '<div class="tg-count"><b></b><small></small></div>');
        q.querySelector('.tg-count b').textContent = Math.max(1, n);
        q.querySelector('.tg-count small').textContent = opSeen ? 'Chuẩn bị kéo co!' : 'Đang chờ ' + ctx.opName() + ' kết nối…';
    }

    function render() {
        const box = ctx.container, esc = ctx.esc;
        const fig = (who, c) => `<g class="tg-fig-${who}">${hanbok(c)}</g>`;
        box.innerHTML = `
            <div class="tg-scene" id="tgScene">
                <svg viewBox="0 40 400 160" preserveAspectRatio="xMidYMax meet" aria-hidden="true">
                    <!-- Luôn thấy trọn chiều cao cảnh; hai bên lấp bằng bản phản chiếu của cảnh (nối liền mạch) để giãn hết bề ngang -->
                    <clipPath id="tgTile"><rect x="-0.5" y="-60" width="401" height="320"/></clipPath>
                    <g id="tgArt" clip-path="url(#tgTile)">${sceneSVG(scene)}</g>
                    <!-- chồng mép 2 đơn vị (≥ 1 điểm ảnh) để không lộ vệt nối -->
                    <use href="#tgArt" transform="translate(2 0) scale(-1 1)"/><use href="#tgArt" transform="translate(798 0) scale(-1 1)"/>
                    <use href="#tgArt" transform="translate(-796 0)"/><use href="#tgArt" transform="translate(796 0)"/>
                    <rect x="197.5" y="150" width="5" height="50" fill="#dc2626"/>
                    <path d="M150 196 L250 196" stroke="#dc2626" stroke-width="1" opacity=".0"/>
                    <g id="tgAsm">
                        <path d="M-800 128 L1200 128" stroke="#a16207" stroke-width="3.4" stroke-linecap="round"/>
                        <path d="M-800 128 L1200 128" stroke="#fde68a" stroke-width="1.2" stroke-dasharray="3 4" opacity=".7"/>
                        <path d="M200 128 L195 143 L205 143 Z" fill="#dc2626"/><circle cx="200" cy="128" r="3" fill="#dc2626"/>
                        <g id="tgMeWrap" transform="translate(70 ${FOOT_Y - 135 * S}) scale(${S})"><g id="tgMe">${fig('me', PL_ME)}</g></g>
                        <g id="tgOpWrap" transform="translate(330 ${FOOT_Y - 135 * S}) scale(${-S} ${S})"><g id="tgOp">${fig('op', PL_OP)}</g></g>
                    </g>
                </svg>
                <div class="tg-hud">
                    <div class="tg-pl me"><b id="tgMeScore">0</b><span>${esc(ctx.myName)}</span></div>
                    <div class="tg-mid">
                        <button class="tg-music" id="tgMusic" title="Bật/tắt nhạc" aria-label="Bật/tắt nhạc">${ctx.ic('headphones')}</button></div>
                    <div class="tg-pl op"><b id="tgOpScore">0</b><span id="tgOpName"></span></div>
                </div>
                <div class="tg-banner" id="tgBanner"></div>
            </div>
            <div class="lx-card tg-q" id="tgQ">
                <span class="du-ask"><span class="ui-ic">${ctx.ic('sparkle')}</span><span id="tgQNum">Câu 1 / ${room.questions.length}</span></span>
                <div class="du-word" id="tgWord">…</div>
                <div class="du-timer"><div id="tgTimer"></div></div>
                <div class="du-answers" id="tgAnswers"></div>
                <div class="tg-fb info" id="tgFb"></div>
            </div>`;
        fitToScreen();
        const mb = $('tgMusic');
        const syncBtn = () => { mb.classList.toggle('off', !Music.isOn()); mb.classList.toggle('hint', Music.isOn() && Music.blocked()); };
        mb.onclick = () => {
            if (Music.isOn() && Music.blocked()) { Music.unlock(); Music.start(scene); } else Music.toggle(scene);
            setTimeout(syncBtn, 100);
        };
        syncBtn(); setTimeout(syncBtn, 800);
    }

    function fitToScreen() {
        const nav = document.querySelector('.global-nav');
        let top = 12;
        if (nav) { const cs = getComputedStyle(nav); top = (cs.position === 'sticky' || cs.position === 'fixed' ? (parseFloat(cs.top) || 0) + nav.offsetHeight : 0) + 8; }
        ctx.container.style.setProperty('--tg-top', top + 'px');
        const y = ctx.container.getBoundingClientRect().top + window.scrollY - top;
        setTimeout(() => window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' }), 60);
    }

    function renderQuestion(k) {
        const q = room.questions[k], esc = ctx.esc;
        const cnt = $('tgQ').querySelector('.tg-count'); if (cnt) cnt.remove();
        $('tgQNum').textContent = 'Câu ' + (k + 1) + ' / ' + room.questions.length;
        $('tgWord').textContent = q.w;
        $('tgAnswers').innerHTML = q.o.map((o, i) => `<button class="du-ans" data-i="${i}"><span class="du-key">${i + 1}</span><span>${esc(o)}</span></button>`).join('');
        $('tgAnswers').querySelectorAll('.du-ans').forEach(b => b.onclick = () => answer(parseInt(b.dataset.i, 10)));
        $('tgBanner').textContent = '';
        revealKey = ''; shownPhase = '';
        if (myAns[k]) lockButtons(k, myAns[k].c);
    }

    function lockButtons(k, chosen) {
        $('tgAnswers').querySelectorAll('.du-ans').forEach(b => {
            b.disabled = true;
            const i = parseInt(b.dataset.i, 10);
            if (i === chosen) b.classList.add(chosen === room.questions[k].a ? 'pending' : 'bad');
        });
    }

    function renderStatus(k, t) {
        const fb = $('tgFb'), mine = myAns[k], opWrong = wrongAt(ctx.opId(), k) != null, name = ctx.esc(ctx.opName());
        const key = (mine ? (mine.wrong ? 'w' : 'c') : '-') + (opWrong ? 'W' : '') + (t >= sched.D[k] ? 'T' : '');
        if (shownPhase === key) return;
        shownPhase = key;
        if (mine && !mine.wrong) { fb.className = 'tg-fb ok'; fb.innerHTML = ctx.tile('check', 'green') + 'Chính xác! Đang xem ai nhanh hơn…'; }
        else if (mine && mine.wrong) { fb.className = 'tg-fb no'; fb.innerHTML = ctx.tile('x', 'coral') + (opWrong ? 'Cả hai đều sai!' : 'Sai rồi! Bạn mất lượt — chờ ' + name + '…'); }
        else if (t >= sched.D[k]) { fb.className = 'tg-fb info'; fb.innerHTML = ctx.tile('clock', 'amber') + 'Hết giờ!'; }
        else if (opWrong) { fb.className = 'tg-fb info'; fb.innerHTML = `<span class="tg-opchip">${ctx.ic('bolt')}${name} trả lời sai — cơ hội của bạn!</span>`; }
        else { fb.className = 'tg-fb info'; fb.textContent = 'Chọn đúng trước để kéo dây về phía bạn!'; }
    }

    function renderReveal(k) {
        const q = room.questions[k], w = sched.W[k], mine = myAns[k], fb = $('tgFb'), name = ctx.esc(ctx.opName());
        $('tgAnswers').querySelectorAll('.du-ans').forEach(b => {
            b.disabled = true;
            const i = parseInt(b.dataset.i, 10);
            b.classList.remove('pending');
            if (i === q.a) b.classList.add('ok');
            else if (mine && i === mine.c) b.classList.add('bad');
        });
        if (w === uidMe()) {
            fb.className = 'tg-fb ok'; fb.innerHTML = ctx.tile('check', 'green') + 'Bạn trả lời đúng trước — kéo!';
            jolt.me = 1; $('tgBanner').textContent = 'Kéo!'; Music.chime(true);
        } else if (w) {
            fb.className = 'tg-fb no';
            fb.innerHTML = ctx.tile('x', 'coral') + (mine && !mine.wrong ? 'Bạn đúng nhưng ' + name + ' nhanh hơn!' : name + ' trả lời đúng trước!');
            jolt.op = 1; $('tgBanner').textContent = ''; Music.chime(false);
        } else {
            const both = wrongAt(uidMe(), k) != null && wrongAt(ctx.opId(), k) != null;
            fb.className = 'tg-fb info'; fb.innerHTML = ctx.tile(both ? 'x' : 'clock', 'amber') + (both ? 'Cả hai đều sai — không ai được kéo.' : 'Hết giờ — không ai được kéo.');
            $('tgBanner').textContent = '';
        }
        setTimeout(() => { if ($('tgBanner')) $('tgBanner').textContent = ''; }, 1200);
    }

    // ── Trả lời ──
    function answer(c) {
        if (!ctx || !sched || !startLocal) return;
        const t = now(), k = shownK;
        if (k < 0 || myAns[k] || claims.has(k) || t >= sched.D[k] || t < sched.S[k]) return;
        const q = room.questions[k], right = c === q.a;
        myAns[k] = { c, wrong: !right, t };
        lockButtons(k, c);
        shownPhase = '';
        if (right) {
            ctx.roomRef.collection('claims').doc(String(k)).set({ uid: uidMe(), at: ctx.FV().serverTimestamp(), c })
                .catch(() => { /* đối thủ đúng trước → rules từ chối; listener sẽ báo người thắng */ });
        } else {
            ctx.roomRef.update({ [ctx.myKey() + '.w.' + k]: Math.round(t) }).catch(e => console.warn('[Tug] wrong', e));
        }
        tickLogic();
    }

    function onClaims(snap) {
        if (!ctx) return;
        const startMs = room.startAt && room.startAt.toMillis ? room.startAt.toMillis() : 0;
        snap.docChanges().forEach(ch => {
            if (ch.type === 'removed' || ch.doc.metadata.hasPendingWrites) return;
            const d = ch.doc.data(), k = parseInt(ch.doc.id, 10);
            if (!d.at || !d.at.toMillis) return;
            claims.set(k, { uid: d.uid, at: d.at.toMillis() - startMs });
        });
        tickLogic();
    }

    // ── Hình: dây + nhân vật (mỗi khung hình) ──
    function frame() {
        raf = 0;
        if (!ctx) return;
        const t = now();
        let target = 0;
        if (sched) {
            const st = standing(t), diff = st.me - st.op;
            const f = diff === 0 ? 0 : diff / (Math.abs(diff) + st.remaining);
            target = -f * G0; // mình thắng → cả cụm dịch về phía mình (trái)
        }
        dx += (target - dx) * 0.06;
        jolt.me *= 0.94; jolt.op *= 0.94;
        const wob = Math.sin(performance.now() / 380) * 1.5;
        const asm = $('tgAsm');
        if (!asm) return;
        asm.setAttribute('transform', `translate(${(dx + wob * 0.4).toFixed(2)} 0)`);
        setPose('tgMe', 'me', 12 + wob + jolt.me * 10 - jolt.op * 14);
        setPose('tgOp', 'op', 12 - wob + jolt.op * 10 - jolt.me * 14);
        raf = requestAnimationFrame(frame);
    }
    // Nghiêng người quanh bàn chân (skewX giữ tay ở cùng độ cao với dây); ngã = xoay quanh mũi chân trước
    function setPose(id, who, lean) {
        const el = $(id);
        if (!el) return;
        let tr = `translate(0 135) skewX(${lean.toFixed(2)}) translate(0 -135)`;
        if (fall) {
            const p = Math.min(1, (performance.now() - fall.at) / 900), e = p * p * (3 - 2 * p);
            if (fall.loser === who || fall.loser === 'both') {
                const ang = fall.loser === 'both' ? -70 * e : 82 * e; // hoà: cả hai ngồi phịch ra sau
                const cx = fall.loser === 'both' ? 22 : 82;
                tr = `translate(${cx} 135) rotate(${ang.toFixed(2)}) translate(${-cx} -135) translate(0 135) skewX(${(lean * (1 - e)).toFixed(2)}) translate(0 -135)`;
            } else {
                const hop = Math.abs(Math.sin((performance.now() - fall.at) / 180)) * 10 * Math.max(0, 1 - (performance.now() - fall.at) / 2600);
                tr = `translate(0 ${(-hop).toFixed(2)}) translate(0 135) skewX(${(lean * 0.4).toFixed(2)}) translate(0 -135)`;
            }
        }
        el.setAttribute('transform', tr);
    }

    // ── Kết thúc ──
    function finish(diff) {
        finishedAt = Date.now();
        const loser = diff > 0 ? 'op' : diff < 0 ? 'me' : 'both';
        // Đợi dây kéo tới vạch rồi mới ngã
        setTimeout(() => {
            if (!ctx) return;
            fall = { loser, at: performance.now() };
            $('tgBanner').textContent = diff > 0 ? ctx.opName() + ' ngã rồi!' : diff < 0 ? 'Bạn bị kéo ngã!' : 'Hoà!';
            Music.chime(diff >= 0);
        }, 900);
        const fb = $('tgFb'); if (fb) { fb.className = 'tg-fb info'; fb.textContent = 'Hết câu hỏi!'; }
        $('tgAnswers').querySelectorAll('.du-ans').forEach(b => { b.disabled = true; });
        if (!doneWritten) {
            doneWritten = true;
            computeSchedule();
            ctx.roomRef.update({ [ctx.myKey() + '.done']: true, [ctx.myKey() + '.score']: standing(now()).me }).catch(() => {});
        }
        const op = room['s_' + ctx.opId()] || {};
        waitTimer = setTimeout(() => showResult(!(op.done || room.status === 'finished')), 3200);
    }

    function showResult(opLeft) {
        if (resultShown || !ctx) return;
        if (Date.now() - finishedAt < 3000) { clearTimeout(waitTimer); waitTimer = setTimeout(() => showResult(opLeft), 3000 - (Date.now() - finishedAt)); return; }
        resultShown = true;
        clearTimeout(waitTimer); waitTimer = null;
        const sc = $('tgScene'); if (sc) sc.classList.add('done');
        computeSchedule();
        const st = standing(1e12), outcome = st.me > st.op ? 'win' : st.me < st.op ? 'lose' : 'draw';
        if (room.status !== 'finished') ctx.roomRef.update({ status: 'finished', endedAt: ctx.FV().serverTimestamp() }).catch(() => {});
        const { esc, tile, ic } = ctx, N = sched.n, opName = ctx.opName();
        const title = outcome === 'win' ? 'Chiến thắng!' : outcome === 'lose' ? 'Thua mất rồi!' : 'Hoà!';
        const sub = outcome === 'win' ? esc(opName) + ' bị kéo qua vạch đỏ!' : outcome === 'lose' ? 'Bạn bị kéo qua vạch đỏ — thử lại nhé!' : 'Hai bên ngang sức, dây đứng yên ở giữa.';
        const box = (name, score, state, you) => `<div class="du-score-box ${state}">
            ${state === 'win' ? `<span class="du-crown">${tile('crown', 'amber')}</span>` : ''}
            <div class="n"><span>${esc(name)}</span>${you ? '<span class="lx-badge reading">Bạn</span>' : ''}</div>
            <b>${score}</b><div class="c">câu thắng / ${N}</div></div>`;
        const rows = room.questions.map((q, k) => {
            const w = sched.W[k];
            const who = w === uidMe() ? '<span class="nj-who me">Bạn</span>' : w ? `<span class="nj-who op">${esc(opName)}</span>` : '<span class="nj-who none">Không ai</span>';
            return `<div class="du-review-row"><span class="i">${k + 1}</span><span class="w" lang="ko">${esc(q.w)}</span><span class="m">${esc(q.o[q.a])}</span>${who}</div>`;
        }).join('');
        $('tgQ').outerHTML = `
            <div class="lx-card" style="text-align:center;padding:20px;">
                <div class="du-res-title" style="margin:4px 0;">${title}</div>
                <div class="du-res-sub" style="color:var(--text-sub);">${sub}${opLeft ? ' · ' + esc(opName) + ' đã rời trận' : ''}</div>
                <div id="duReward" class="du-reward" style="background:var(--soft);"></div>
            </div>
            <div class="lx-card"><div class="du-score-row">${box(ctx.myName, st.me, outcome === 'win' ? 'win' : '', true)}${box(opName, st.op, outcome === 'lose' ? 'win' : '', false)}</div></div>
            <div class="lx-card">
                <div class="lx-sec">${tile('list', 'blue', 'sm')}<div><div class="lx-sec-t">Xem lại các câu</div><div class="lx-sec-s">Bạn thắng ${st.me}/${N} câu</div></div></div>
                <div class="du-review">${rows}</div>
            </div>
            <div class="lx-card du-actions">
                <button class="lx-btn lx-btn-coral" onclick="Duel.rematch()">${ic('swords')}Thách đấu lại</button>
                <button class="lx-btn" onclick="Duel.toLobby()">${ic('home')}Về sảnh</button>
            </div>`;
        if (outcome === 'win' && typeof confetti === 'function') confetti({ particleCount: 180, spread: 90, origin: { y: 0.35 } });
        ctx.giveReward(outcome);
        // Giữ khung cảnh (người thua nằm ngã) và nhạc; chỉ dừng logic
        clearInterval(logicTimer); logicTimer = null;
        if (claimsUnsub) { claimsUnsub(); claimsUnsub = null; }
        ctx.onDone && ctx.onDone();
    }

    // Cho máy (duel-bot.js) đọc lịch câu hỏi và điểm hiện tại
    function peek() {
        if (!ctx || !startLocal || !room.questions) return null;
        const t = now(); computeSchedule();
        const st = standing(t);
        return { t, S: sched.S, D: sched.D, E: sched.E, n: sched.n, claimed: k => claims.has(k), me: st.me, op: st.op, over: !!finishedAt };
    }
    window.DuelTug = { start, update, stop, peek, unlockAudio: () => Music.unlock(), isRunning: () => !!ctx, SCENES, sceneIndex };
})();
