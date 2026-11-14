// assets/js/game-speaking.js — Luyện nói có chấm phát âm
// ------------------------------------------------------------------
// API giữ nguyên: initSpeaking(list) với list = [{word, meaning, ex_kr?}]
// Chấm điểm:
//   - Căn chỉnh chuỗi âm tiết (thiếu / thừa 1 âm không làm lệch cả câu)
//   - Tách jamo: chỉ rõ sai ở phụ âm đầu, nguyên âm hay 받침
//   - Lấy phương án tốt nhất trong tối đa 5 phương án nhận dạng
// Đếm số lần đọc đạt (≥ 80đ) vào users/{uid}.dailySpeakData.{YYYY-MM-DD} (dùng cho huy hiệu / báo cáo).
// ------------------------------------------------------------------

let speakList = [];
let speakIdx = 0;
let speakMode = 'word';          // 'word' | 'sentence'
let speakResults = {};           // idx -> best score
window.speakingRecognition = null;

const PASS_SCORE = 80;
const CHO = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
const JUNG = ['ㅏ','ㅐ','ㅑ','ㅒ','ㅓ','ㅔ','ㅕ','ㅖ','ㅗ','ㅘ','ㅙ','ㅚ','ㅛ','ㅜ','ㅝ','ㅞ','ㅟ','ㅠ','ㅡ','ㅢ','ㅣ'];
const JONG = ['','ㄱ','ㄲ','ㄳ','ㄴ','ㄵ','ㄶ','ㄷ','ㄹ','ㄺ','ㄻ','ㄼ','ㄽ','ㄾ','ㄿ','ㅀ','ㅁ','ㅂ','ㅄ','ㅅ','ㅆ','ㅇ','ㅈ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];

function spkEsc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// Tách 1 âm tiết Hangul thành [phụ âm đầu, nguyên âm, 받침] (null nếu không phải Hangul)
function decompose(ch) {
    const c = ch.charCodeAt(0) - 0xAC00;
    if (c < 0 || c > 11171) return null;
    return [Math.floor(c / 588), Math.floor((c % 588) / 28), c % 28];
}

// Độ giống nhau giữa âm tiết chuẩn và âm tiết nghe được (0..1) + loại lỗi
function syllableSim(expected, actual) {
    if (expected === actual) return { s: 1, kind: 'ok' };
    const e = decompose(expected), a = decompose(actual);
    if (!e || !a) return { s: 0, kind: 'wrong' };
    const cho = e[0] === a[0], jung = e[1] === a[1], jong = e[2] === a[2];
    if (cho && jung) return { s: 0.75, kind: 'jong' };   // chỉ sai 받침
    if (jung && jong) return { s: 0.6, kind: 'cho' };    // sai phụ âm đầu
    if (cho && jong) return { s: 0.5, kind: 'jung' };    // sai nguyên âm
    if (jung) return { s: 0.3, kind: 'mixed' };
    return { s: 0, kind: 'wrong' };
}

// Căn chỉnh chuỗi (Needleman–Wunsch) giữa âm tiết chuẩn và âm tiết nghe được
function alignSyllables(target, heard) {
    const n = target.length, m = heard.length, GAP = -0.35;
    const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
    const bt = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0)); // 0 chéo, 1 thiếu (bỏ target), 2 thừa (bỏ heard)
    for (let i = 1; i <= n; i++) { dp[i][0] = i * GAP; bt[i][0] = 1; }
    for (let j = 1; j <= m; j++) { dp[0][j] = j * GAP; bt[0][j] = 2; }
    for (let i = 1; i <= n; i++) {
        for (let j = 1; j <= m; j++) {
            const diag = dp[i - 1][j - 1] + syllableSim(target[i - 1], heard[j - 1]).s;
            const up = dp[i - 1][j] + GAP, left = dp[i][j - 1] + GAP;
            if (diag >= up && diag >= left) { dp[i][j] = diag; bt[i][j] = 0; }
            else if (up >= left) { dp[i][j] = up; bt[i][j] = 1; }
            else { dp[i][j] = left; bt[i][j] = 2; }
        }
    }
    const res = []; let extra = 0;
    let i = n, j = m;
    while (i > 0 || j > 0) {
        if (i > 0 && j > 0 && bt[i][j] === 0) {
            const sim = syllableSim(target[i - 1], heard[j - 1]);
            res.unshift({ t: target[i - 1], h: heard[j - 1], s: sim.s, kind: sim.kind });
            i--; j--;
        } else if (i > 0 && (j === 0 || bt[i][j] === 1)) {
            res.unshift({ t: target[i - 1], h: '', s: 0, kind: 'missing' });
            i--;
        } else { extra++; j--; }
    }
    return { items: res, extra };
}

// Quy tắc nối âm (연음): 받침 đơn + âm tiết sau bắt đầu bằng ㅇ → 받침 chuyển sang âm sau
// (먹어요 → 머거요, 좋아요 → 조아요). Giữ nguyên số âm tiết để ánh xạ 1-1 với chữ gốc.
const JONG_TO_CHO = { 1: 0, 2: 1, 4: 2, 7: 3, 8: 5, 16: 6, 17: 7, 19: 9, 20: 10, 22: 12, 23: 14, 24: 15, 25: 16, 26: 17, 27: -1 };
function compose(cho, jung, jong) { return String.fromCharCode(0xAC00 + cho * 588 + jung * 28 + jong); }
// 받침 kép: [받침 còn lại, phụ âm chuyển sang âm sau] (읽어요 → 일거요, 앉아요 → 안자요, 싫어요 → 시러요)
const COMPOUND_JONG = { 3: [1, 10], 5: [4, 12], 6: [4, -1], 9: [8, 0], 10: [8, 6], 11: [8, 7], 12: [8, 10], 13: [8, 16], 14: [8, 17], 15: [8, -1], 18: [17, 10] };
function applyLiaison(chars) {
    const out = chars.slice();
    for (let i = 0; i < out.length - 1; i++) {
        const a = decompose(out[i]), b = decompose(out[i + 1]);
        if (!a || !b || !a[2] || b[0] !== 11) continue;
        let remain, moved;
        if (a[2] in COMPOUND_JONG) { [remain, moved] = COMPOUND_JONG[a[2]]; }
        else if (a[2] in JONG_TO_CHO) { remain = 0; moved = JONG_TO_CHO[a[2]]; }
        else continue;
        if (moved < 0 && remain === 4) { // ㄶ + ㅇ: ㅎ câm, ㄴ chuyển sang (않아 → 아나)
            out[i] = compose(a[0], a[1], 0); out[i + 1] = compose(2, b[1], b[2]); continue;
        }
        if (moved < 0 && remain === 8) { // ㅀ + ㅇ: ㅎ câm, ㄹ chuyển sang (싫어 → 시러)
            out[i] = compose(a[0], a[1], 0); out[i + 1] = compose(5, b[1], b[2]); continue;
        }
        out[i] = compose(a[0], a[1], remain);
        if (moved >= 0) out[i + 1] = compose(moved, b[1], b[2]); // ㅎ (-1) thì câm: 좋아 → 조아
    }
    return out;
}

function scoreTranscript(target, transcript) {
    const tOrig = target.replace(/[\s.,!?~…"'“”]/g, '').split('');
    const t = applyLiaison(tOrig);
    const h = applyLiaison(String(transcript || '').replace(/[\s.,!?~…"'“”]/g, '').split(''));
    if (!t.length) return { score: 0, items: [], extra: 0 };
    const al = alignSyllables(t, h);
    // Hiển thị lại chữ gốc (먹어요) thay vì dạng đã nối âm (머거요)
    let k = 0;
    al.items.forEach(x => { x.t = tOrig[k++]; });
    const sum = al.items.reduce((s, x) => s + x.s, 0);
    const penalty = Math.min(0.3, al.extra * 0.1);
    const score = Math.max(0, Math.round((sum / t.length - penalty) * 100));
    return { score, items: al.items, extra: al.extra, transcript };
}

// Gợi ý sửa phát âm từ các lỗi
function pronunciationTips(items) {
    const tips = [];
    items.forEach(x => {
        if (tips.length >= 3) return;
        const e = decompose(x.t), a = x.h ? decompose(x.h) : null;
        if (x.kind === 'missing') tips.push(`Thiếu âm <b>${spkEsc(x.t)}</b> — đọc rõ, đừng nuốt âm.`);
        else if (x.kind === 'jong' && e && a) {
            tips.push(e[2] ? `받침 <b>${JONG[e[2]]}</b> trong <b>${spkEsc(x.t)}</b> chưa rõ (máy nghe thành “${spkEsc(x.h)}”).`
                : `<b>${spkEsc(x.t)}</b> không có 받침, nhưng máy nghe thành “${spkEsc(x.h)}”.`);
        } else if (x.kind === 'cho' && e && a) tips.push(`Phụ âm đầu <b>${CHO[e[0]]}</b> trong <b>${spkEsc(x.t)}</b> (máy nghe thành ${CHO[a[0]]}) — chú ý âm căng / bật hơi.`);
        else if (x.kind === 'jung' && e && a) tips.push(`Nguyên âm <b>${JUNG[e[1]]}</b> trong <b>${spkEsc(x.t)}</b> (máy nghe thành ${JUNG[a[1]]}).`);
        else if (x.kind === 'wrong' || x.kind === 'mixed') tips.push(`Âm <b>${spkEsc(x.t)}</b> chưa đúng (máy nghe thành “${spkEsc(x.h)}”).`);
    });
    return tips;
}

function currentTarget() {
    const it = speakList[speakIdx] || {};
    return speakMode === 'sentence' && it.ex_kr ? it.ex_kr : it.word;
}

function speakTarget(rate) {
    const text = currentTarget();
    if (!text) return;
    if (window.readKorean) { window.readKorean(text, rate || 0.9); return; }
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'ko-KR'; u.rate = rate || 0.85;
    window.speechSynthesis.speak(u);
}

function initSpeaking(list) {
    speakList = [...list].sort(() => Math.random() - 0.5);
    speakIdx = 0;
    speakResults = {};
    const hasSentences = speakList.some(w => w.ex_kr);
    speakMode = 'word';

    document.getElementById('gameSpeakingWrapper').innerHTML = `
        <style>
            .spk-top { display:flex; justify-content:space-between; align-items:center; gap:8px; margin-bottom:12px; flex-wrap:wrap; }
            .spk-mode { display:flex; background:#f1f5f9; border-radius:10px; padding:3px; }
            .spk-mode button { border:none; background:none; padding:6px 12px; border-radius:8px; font-weight:700; color:#64748b; cursor:pointer; font-size:0.85em; }
            .spk-mode button.on { background:#fff; color:#2563eb; box-shadow:0 1px 4px rgba(0,0,0,0.08); }
            .spk-target { font-size:2.4em; font-weight:900; text-align:center; color:#2563eb; line-height:1.3; word-break:keep-all; }
            .spk-target.sentence { font-size:1.45em; }
            .spk-meaning { text-align:center; color:var(--text-sub, #64748b); margin:6px 0 18px; }
            .spk-row { display:flex; justify-content:center; align-items:center; gap:14px; margin-bottom:16px; }
            .spk-mic { background:#fef2f2; color:#ef4444; border:2px solid #fca5a5; border-radius:50%; width:82px; height:82px; font-size:2em; cursor:pointer; transition:0.2s; }
            .spk-mic.rec { background:#ef4444; color:#fff; border-color:#ef4444; animation: spkPulse 1s infinite; }
            @keyframes spkPulse { 0%,100% { box-shadow:0 0 0 0 rgba(239,68,68,0.5);} 50% { box-shadow:0 0 0 14px rgba(239,68,68,0);} }
            .spk-listen { background:#eff6ff; color:#2563eb; border:1.5px solid #bfdbfe; border-radius:50%; width:52px; height:52px; font-size:1.3em; cursor:pointer; }
            .spk-result { text-align:center; min-height:46px; display:flex; justify-content:center; flex-wrap:wrap; gap:2px; font-size:1.9em; font-weight:800; }
            .spk-result.sentence { font-size:1.3em; }
            .spk-syl { position:relative; padding:0 1px; border-bottom:3px solid transparent; }
            .spk-syl.ok { color:#10b981; } .spk-syl.near { color:#f59e0b; border-color:#fcd34d; } .spk-syl.bad { color:#ef4444; border-color:#fca5a5; }
            .spk-syl.miss { color:#cbd5e1; border-color:#ef4444; border-bottom-style:dashed; }
            .spk-heard { text-align:center; font-size:0.9em; color:#64748b; margin-top:6px; min-height:20px; }
            .spk-score { text-align:center; font-size:1.25em; font-weight:900; margin:8px 0; min-height:28px; }
            .spk-tips { max-width:520px; margin:0 auto 12px; display:flex; flex-direction:column; gap:5px; }
            .spk-tip { background:#fffbeb; border-left:3px solid #f59e0b; border-radius:8px; padding:6px 10px; font-size:0.88em; color:#78350f; }
            .spk-legend { text-align:center; font-size:0.75em; color:#94a3b8; margin-bottom:10px; }
            .spk-legend b { font-weight:800; }
            .spk-actions { display:flex; justify-content:center; gap:10px; flex-wrap:wrap; }
            .spk-btn { background:#f1f5f9; color:#334155; border:none; padding:10px 20px; border-radius:8px; font-weight:700; cursor:pointer; }
            .spk-btn.primary { background:#2563eb; color:#fff; }
            .spk-sum-row { display:flex; justify-content:space-between; gap:10px; padding:8px 12px; border-bottom:1px solid #f1f5f9; }
        </style>
        <div class="spk-top">
            <div id="speakCount" style="color:var(--text-sub,#64748b);font-weight:700;">1/${speakList.length}</div>
            ${hasSentences ? `<div class="spk-mode"><button class="on" data-m="word">Từ</button><button data-m="sentence">Câu ví dụ</button></div>` : ''}
        </div>
        <div id="speakArea">
            <div class="spk-target" id="speakWord"></div>
            <div class="spk-meaning" id="speakMeaning"></div>
            <div class="spk-row">
                <button class="spk-listen" onclick="speakTarget(0.85)" title="Nghe phát âm mẫu">🔊</button>
                <button id="micBtn" class="spk-mic" onclick="toggleMic()" title="Nhấn để nói">🎤</button>
                <button class="spk-listen" onclick="speakTarget(0.6)" title="Nghe chậm">🐢</button>
            </div>
            <div class="spk-result" id="speakTranscriptWrapper"></div>
            <div class="spk-heard" id="speakHeard"></div>
            <div class="spk-score" id="speakScore"></div>
            <div class="spk-tips" id="speakTips"></div>
            <div class="spk-legend"><b style="color:#10b981;">xanh</b> = chuẩn · <b style="color:#f59e0b;">vàng</b> = gần đúng · <b style="color:#ef4444;">đỏ</b> = sai / thiếu</div>
            <div class="spk-actions">
                <button class="spk-btn" onclick="skipSpeak()">Bỏ qua →</button>
            </div>
        </div>`;

    const modeBox = document.querySelector('#gameSpeakingWrapper .spk-mode');
    if (modeBox) modeBox.addEventListener('click', e => {
        const b = e.target.closest('button[data-m]');
        if (!b) return;
        speakMode = b.dataset.m;
        modeBox.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
        nextSpeak();
    });

    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        Swal.fire("Không hỗ trợ", "Trình duyệt của bạn không hỗ trợ nhận diện giọng nói. Vui lòng dùng Google Chrome, Safari hoặc Edge phiên bản mới.", "error");
        nextSpeak();
        return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    window.speakingRecognition = new SpeechRecognition();
    window.speakingRecognition.lang = 'ko-KR';
    window.speakingRecognition.continuous = false;
    window.speakingRecognition.interimResults = false;
    window.speakingRecognition.maxAlternatives = 5;

    window.speakingRecognition.onstart = function () {
        const btn = document.getElementById('micBtn');
        if (btn) btn.classList.add('rec');
        const sc = document.getElementById('speakScore');
        sc.innerText = "Đang nghe...";
        sc.style.color = "#8b5cf6";
        document.getElementById('speakTranscriptWrapper').innerHTML = '';
        document.getElementById('speakHeard').innerText = '';
        document.getElementById('speakTips').innerHTML = '';
    };

    window.speakingRecognition.onresult = function (event) {
        const alts = [];
        const r = event.results[0];
        for (let k = 0; k < r.length; k++) alts.push(r[k].transcript.trim());
        evalSpeakResult(alts);
        resetMicUI();
    };

    window.speakingRecognition.onerror = function (event) {
        const sc = document.getElementById('speakScore');
        if (!sc) return;
        sc.innerText = event.error === 'not-allowed' ? "Chưa cho phép dùng micro." : "Không nghe rõ. Hãy thử lại!";
        sc.style.color = "#ef4444";
        resetMicUI();
    };

    window.speakingRecognition.onend = function () { resetMicUI(); };

    nextSpeak();
}

function resetMicUI() {
    const btn = document.getElementById('micBtn');
    if (btn) btn.classList.remove('rec');
}

function nextSpeak() {
    if (speakIdx >= speakList.length) { showSpeakSummary(); return; }
    const it = speakList[speakIdx];
    const isSentence = speakMode === 'sentence' && it.ex_kr;
    document.getElementById('speakCount').innerText = `${speakIdx + 1} / ${speakList.length}`;
    const tg = document.getElementById('speakWord');
    tg.innerText = currentTarget();
    tg.classList.toggle('sentence', !!isSentence);
    document.getElementById('speakMeaning').innerText = isSentence ? (it.ex_vn || it.meaning || '') : (it.meaning || '');
    const tw = document.getElementById('speakTranscriptWrapper');
    tw.innerHTML = '';
    tw.classList.toggle('sentence', !!isSentence);
    document.getElementById('speakHeard').innerText = '';
    document.getElementById('speakScore').innerText = '';
    document.getElementById('speakTips').innerHTML = '';
}

function skipSpeak() {
    speakIdx++;
    nextSpeak();
}

function toggleMic() {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    if (window.speakingRecognition) {
        try { window.speakingRecognition.start(); }
        catch (e) { window.speakingRecognition.stop(); }
    }
}

function recordSpeakPass() {
    try {
        if (typeof firebase === 'undefined' || !firebase.auth().currentUser) return;
        const d = new Date();
        const key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
        firebase.firestore().collection('users').doc(firebase.auth().currentUser.uid)
            .set({ dailySpeakData: { [key]: firebase.firestore.FieldValue.increment(1) } }, { merge: true }).catch(() => {});
    } catch (e) {}
}

// alternatives: mảng các phương án nhận dạng → chấm phương án tốt nhất
function evalSpeakResult(alternatives) {
    if (typeof alternatives === 'string') alternatives = [alternatives];
    const target = currentTarget();
    let best = null;
    alternatives.forEach(a => {
        const r = scoreTranscript(target, a);
        if (!best || r.score > best.score) best = r;
    });
    if (!best) return;

    document.getElementById('speakTranscriptWrapper').innerHTML = best.items.map(x => {
        const cls = x.kind === 'ok' ? 'ok' : x.kind === 'missing' ? 'miss' : x.s >= 0.5 ? 'near' : 'bad';
        return `<span class="spk-syl ${cls}" title="${x.h ? 'Máy nghe: ' + spkEsc(x.h) : 'Thiếu âm'}">${spkEsc(x.t)}</span>`;
    }).join('');
    document.getElementById('speakHeard').innerHTML = `Máy nghe được: “${spkEsc(best.transcript)}”`;

    const sc = document.getElementById('speakScore');
    const prevBest = speakResults[speakIdx] || 0;
    speakResults[speakIdx] = Math.max(prevBest, best.score);

    const tips = best.score < 100 ? pronunciationTips(best.items) : [];
    if (best.extra) tips.push('Có âm thừa — hãy đọc gọn, không thêm âm.');
    document.getElementById('speakTips').innerHTML = tips.map(t => `<div class="spk-tip">💡 ${t}</div>`).join('');

    if (best.score >= PASS_SCORE) {
        sc.innerText = (best.score === 100 ? '🎉 Hoàn hảo! ' : '👍 Tốt lắm! ') + best.score + '/100';
        sc.style.color = "#10b981";
        if (prevBest < PASS_SCORE) recordSpeakPass();
        setTimeout(() => { if (speakList[speakIdx] && speakResults[speakIdx] >= PASS_SCORE) { speakIdx++; nextSpeak(); } }, 2200);
    } else {
        sc.innerText = `${best.score}/100 — Thử lại nhé!`;
        sc.style.color = best.score >= 50 ? "#f59e0b" : "#ef4444";
    }
}

function showSpeakSummary() {
    const done = Object.keys(speakResults).map(Number);
    const avg = done.length ? Math.round(done.reduce((s, i) => s + speakResults[i], 0) / done.length) : 0;
    const passed = done.filter(i => speakResults[i] >= PASS_SCORE).length;
    const weak = speakList.map((w, i) => ({ w, s: speakResults[i] })).filter(x => x.s === undefined || x.s < PASS_SCORE);
    const area = document.getElementById('speakArea');
    if (!area) return;
    area.innerHTML = `
        <div style="text-align:center;font-size:3em;">${avg >= 80 ? '🏆' : avg >= 50 ? '👍' : '💪'}</div>
        <div style="text-align:center;font-size:1.4em;font-weight:900;margin:6px 0;">Điểm phát âm trung bình: <span style="color:#2563eb;">${avg}/100</span></div>
        <div style="text-align:center;color:#64748b;margin-bottom:14px;">Đạt chuẩn ${passed}/${speakList.length} ${speakMode === 'sentence' ? 'câu' : 'từ'}</div>
        ${weak.length ? `<div style="max-width:460px;margin:0 auto 14px;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
            <div style="background:#f8fafc;padding:8px 12px;font-weight:800;">Cần luyện thêm</div>
            ${weak.slice(0, 10).map(x => `<div class="spk-sum-row"><span style="font-weight:700;">${spkEsc(x.w.word)}</span><span style="color:${x.s === undefined ? '#94a3b8' : '#ef4444'};">${x.s === undefined ? 'bỏ qua' : x.s + 'đ'}</span></div>`).join('')}
        </div>` : ''}
        <div class="spk-actions">
            ${weak.length ? `<button class="spk-btn primary" id="spkRetryWeak">🔁 Luyện lại ${weak.length} ${speakMode === 'sentence' ? 'câu' : 'từ'} chưa đạt</button>` : ''}
            <button class="spk-btn" id="spkRestart">Làm lại từ đầu</button>
        </div>`;
    if (avg >= 80 && typeof confetti === 'function') confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 }, zIndex: 99999999 });
    const all = speakList.slice();
    const mode = speakMode;
    const restart = list => {
        initSpeaking(list);
        if (mode === 'sentence') { const b = document.querySelector('#gameSpeakingWrapper .spk-mode button[data-m="sentence"]'); if (b) b.click(); }
    };
    const rw = document.getElementById('spkRetryWeak');
    if (rw) rw.onclick = () => restart(weak.map(x => x.w));
    document.getElementById('spkRestart').onclick = () => restart(all);
    if (window.Badges && typeof window.Badges.check === 'function') window.Badges.check();
}

// Dùng cho test / module khác
window.SpeakScoring = { scoreTranscript, alignSyllables, syllableSim, decompose, pronunciationTips };
