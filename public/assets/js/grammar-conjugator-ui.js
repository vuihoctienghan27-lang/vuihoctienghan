/* grammar-conjugator-ui.js — "Bảng quy tắc" + "Máy chia ngữ pháp", dùng ở: cửa sổ chi tiết trang Luyện ngữ pháp
 * (/grammar/home.html), tab Ngữ pháp của giáo trình (/lesson/lesson.html) và ngữ pháp lớp học (/vocab.html).
 * Cần: grammar-conjugator.js (engine) + grammar-conjugator-rules.js (bảng cấu hình theo id ngữ pháp).
 * Dùng: GrammarConjugatorUI.mount(khungNộiDung, idNgữPháp) — chèn ngay sau mục "Quy tắc chia / Kết hợp":
 * bảng quy tắc hiện sẵn, máy chia mặc định ẩn. GrammarConjugatorUI.keyFor({ libId, title }) tìm id ngữ pháp.
 * Âm thanh: MP3 giọng SunHi đọc sẵn (/grammar/audio/, tạo bằng tools/grammar-tts/gen.py — cùng giọng với hội thoại
 * giáo trình) → MP3 giáo trình / Google TTS qua window.readKorean (tts-read.js).
 */
(function () {
    'use strict';

    var POS_NAME = { V: 'Động từ', A: 'Tính từ', N: 'Danh từ' };
    var CSS = '' +
        '.gc-toggle{display:inline-flex;align-items:center;gap:.4em;margin:.6rem 0 .4rem;padding:.4em 1em;border-radius:99px;border:1px solid rgba(124,58,237,.35);background:rgba(237,233,254,.85);color:#5b21b6;font-weight:700;font-size:.92rem;cursor:pointer;font-family:inherit;transition:.15s}' +
        '.gc-toggle:hover{background:#ede9fe;transform:translateY(-1px)}' +
        '.gc-toggle[aria-expanded="true"]{background:#7c3aed;color:#fff;border-color:#7c3aed}' +
        '.gc-box{margin:.4rem 0 1.2rem;padding:1rem 1.1rem 1.1rem;border-radius:18px;background:linear-gradient(160deg,rgba(237,233,254,.92),rgba(204,251,241,.75));border:1px solid rgba(124,58,237,.25);box-shadow:0 8px 24px rgba(76,29,149,.08)}' +
        '.gc-box[hidden]{display:none}' +
        '.gc-head{display:flex;align-items:center;justify-content:space-between;gap:.5em;flex-wrap:wrap;margin-bottom:.6rem}' +
        '.gc-title{font-weight:800;color:#4c1d95;font-size:1.05rem}' +
        '.gc-title .ko{font-family:"Pretendard","Noto Sans KR",sans-serif}' +
        '.gc-hint{font-size:.82rem;color:#6b7280}' +
        '.gc-row{display:flex;flex-wrap:wrap;gap:.5em;align-items:center;margin:.45rem 0}' +
        '.gc-input{font:inherit;font-size:1.1rem;padding:.45em .75em;border-radius:12px;border:1px solid #c4b5fd;background:#fff;color:#111827;width:10em;max-width:100%;font-family:"Pretendard","Noto Sans KR",sans-serif}' +
        '.gc-input:focus{outline:2px solid #7c3aed;outline-offset:1px}' +
        '.gc-seg{display:inline-flex;background:rgba(255,255,255,.7);border:1px solid #ddd6fe;border-radius:99px;padding:3px;gap:2px;flex-wrap:wrap}' +
        '.gc-seg button{border:none;background:none;border-radius:99px;padding:.3em .85em;font:inherit;font-size:.88rem;color:#4c1d95;cursor:pointer}' +
        '.gc-seg button.on{background:#7c3aed;color:#fff;font-weight:700}' +
        '.gc-chips{display:flex;flex-wrap:wrap;gap:.4em}' +
        '.gc-chip{border:1px solid #ddd6fe;background:#fff;border-radius:12px;padding:.25em .75em;font-size:.95rem;cursor:pointer;font-family:"Pretendard","Noto Sans KR",sans-serif;color:#1f2937}' +
        '.gc-chip:hover{border-color:#7c3aed;color:#5b21b6}' +
        '.gc-chip.on{background:#fde68a;border-color:#f59e0b}' +
        '.gc-btn{border:1px solid #c4b5fd;background:#fff;color:#4c1d95;border-radius:12px;padding:.5em 1.05em;font:inherit;font-weight:700;font-size:.95rem;cursor:pointer;transition:.15s;white-space:nowrap}' +
        '.gc-btn:hover:not(:disabled){background:#f5f3ff}' +
        '.gc-btn:disabled{opacity:.45;cursor:not-allowed}' +
        '.gc-btn.pri{background:linear-gradient(135deg,#7c3aed,#0d9488);border-color:transparent;color:#fff}' +
        '.gc-btn.pri:hover:not(:disabled){filter:brightness(1.08);background:linear-gradient(135deg,#7c3aed,#0d9488)}' +
        '.gc-count{font-size:.85rem;color:#6b7280;margin-left:.2em}' +
        '.gc-msg{font-size:.9rem;color:#b91c1c;min-height:1.2em;margin:.2rem 0}' +
        '.gc-steps{display:flex;flex-wrap:wrap;gap:.5em;align-items:stretch;margin-top:.6rem}' +
        '.gc-step{flex:1 1 140px;min-width:0;background:rgba(255,255,255,.88);border:1px solid #e5e7eb;border-radius:14px;padding:.6em .65em;text-align:center;animation:gcIn .35s ease}' +
        '.gc-step .n{display:inline-block;font-size:.7rem;font-weight:800;color:#fff;background:#7c3aed;border-radius:99px;padding:.05em .55em;margin-bottom:.25em}' +
        '.gc-step .t{font-size:.75rem;color:#6b7280;font-weight:700;text-transform:uppercase;letter-spacing:.03em}' +
        '.gc-step .k{font-family:"Pretendard","Noto Sans KR",sans-serif;font-size:1.3rem;font-weight:800;color:#111827;margin:.15em 0;word-break:keep-all;overflow-wrap:anywhere}' +
        '.gc-step .k.txt{font-size:.98rem;font-weight:700}' +
        '.gc-step .s{font-size:.8rem;color:#4b5563;line-height:1.4}' +
        '.gc-step.result{background:linear-gradient(135deg,#fef3c7,#fde68a);border-color:#f59e0b}' +
        '.gc-step.result .k{font-size:1.5rem}' +
        '.gc-arrow{align-self:center;color:#7c3aed;font-weight:800;animation:gcIn .35s ease}' +
        '.gc-stem{color:#1d4ed8}.gc-end{color:#c2410c}.gc-chg{color:#047857;text-decoration:underline wavy rgba(4,120,87,.5)}.gc-mut{color:#9ca3af;font-weight:600}' +
        '.gc-say{border:none;background:none;cursor:pointer;font-size:1.1rem;padding:0 .2em;vertical-align:middle}' +
        '.gc-empty{font-size:.9rem;color:#6b7280;padding:.6rem 0}' +
        '.gc-table{margin:.7rem 0 .4rem;padding:.8rem .85rem .9rem;border-radius:18px;background:#f8fafc;border:1px solid #e2e8f0;line-height:1.45;text-align:left}' +
        '.gc-th{display:flex;align-items:center;gap:.5em;font-weight:800;font-size:1.02rem;color:#0f172a;margin-bottom:.45rem}' +
        '.gc-badge{font-size:.7rem;font-weight:800;color:#be185d;background:#fce7f3;border:1px solid #f9a8d4;border-radius:99px;padding:.05em .6em}' +
        '.gc-intro{font-size:.88rem;color:#475569;margin-bottom:.6rem}' +
        '.gc-cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(215px,1fr));gap:.6rem}' +
        '.gc-card{background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:.75em .75em .8em;text-align:center;min-width:0}' +
        '.gc-lb{display:inline-block;font-size:.8rem;font-weight:700;color:#334155;background:#f1f5f9;border:1px solid #e2e8f0;border-radius:99px;padding:.15em .75em}' +
        '.gc-rule{font-size:.88rem;color:#334155;background:#eef2ff;border-radius:10px;padding:.45em .6em;margin-top:.5em;word-break:keep-all;overflow-wrap:anywhere}' +
        '.gc-rule b{color:#c2410c;font-weight:800}' +
        '.gc-dv{margin-top:.55em;padding-top:.5em;border-top:1px dashed #cbd5e1}' +
        '.gc-lb+.gc-dv{border-top:none}' +
        '.gc-src{font-family:"Pretendard","Noto Sans KR",sans-serif;font-size:.98rem;font-weight:700;color:#475569;word-break:keep-all;overflow-wrap:anywhere}' +
        '.gc-ex{font-family:"Pretendard","Noto Sans KR",sans-serif;font-size:1.3rem;font-weight:800;color:#0f172a;margin-top:.1em;word-break:keep-all;overflow-wrap:anywhere}' +
        '.gc-table i{font-style:normal;color:#94a3b8;font-weight:700}' +
        '.gc-table .st{color:#0369a1}' +
        '.gc-table .en{color:#c2410c}' +
        '.gc-note{font-size:.78rem;color:#047857;margin-top:.15em;word-break:keep-all;overflow-wrap:anywhere}' +
        '.gc-warn{font-size:.8rem;font-weight:800;color:#b45309;margin-bottom:.3em}' +
        '.gc-irr{margin-top:.8rem}' +
        '.gc-irr .gc-cards{grid-template-columns:repeat(auto-fill,minmax(200px,1fr))}' +
        'body.dark-mode .gc-table{background:#0f172a;border-color:#1e293b}' +
        'body.dark-mode .gc-th{color:#e2e8f0}' +
        'body.dark-mode .gc-badge{color:#f9a8d4;background:#3b1030;border-color:#9d174d}' +
        'body.dark-mode .gc-intro{color:#94a3b8}' +
        'body.dark-mode .gc-card{background:#1b2335;border-color:#334155}' +
        'body.dark-mode .gc-lb{color:#e2e8f0;background:#273248;border-color:#3b475e}' +
        'body.dark-mode .gc-rule{color:#cbd5e1;background:#273248}' +
        'body.dark-mode .gc-rule b{color:#fcd34d}' +
        'body.dark-mode .gc-dv{border-top-color:#334155}' +
        'body.dark-mode .gc-src{color:#94a3b8}' +
        'body.dark-mode .gc-ex{color:#f1f5f9}' +
        'body.dark-mode .gc-table .st{color:#7dd3fc}' +
        'body.dark-mode .gc-table .en{color:#fcd34d}' +
        'body.dark-mode .gc-note{color:#6ee7b7}' +
        'body.dark-mode .gc-warn{color:#fbbf24}' +
        '@media (max-width:640px){.gc-cards,.gc-irr .gc-cards{grid-template-columns:minmax(0,1fr)}.gc-table{padding:.7rem .6rem}.gc-ex{font-size:1.2rem}}' +
        '@keyframes gcIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}' +
        '@media (max-width:640px){.gc-box{padding:.85rem .75rem}.gc-steps{flex-direction:column}.gc-step{flex:none}.gc-arrow{transform:rotate(90deg);margin:-.2em auto}.gc-input{width:100%;flex:1 1 100%}.gc-actions{width:100%}.gc-actions .gc-next{flex:1 1 100%}.gc-actions .gc-all{flex:1 1 auto}}';

    function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
    function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
    function parts(arr) {
        return arr.map(function (p) { return p.c ? '<span class="gc-' + p.c + '">' + esc(p.t) + '</span>' : esc(p.t); }).join('');
    }
    /* ---- Âm thanh ---- */
    var AUDIO_BASE = '/grammar/audio/';
    var audioIndex = null, audioReady = null, ttsLoading = null;
    function loadAudioIndex() {
        if (!audioReady) audioReady = fetch(AUDIO_BASE + 'index.json', { cache: 'no-cache' })
            .then(function (r) { return r.ok ? r.json() : {}; })
            .then(function (j) { audioIndex = (j && j.w) || {}; })
            .catch(function () { audioIndex = {}; });
        return audioReady;
    }
    function loadTts() {
        if (typeof window.readKorean === 'function') return Promise.resolve();
        if (!ttsLoading) ttsLoading = new Promise(function (res) {
            var sc = document.createElement('script'); sc.src = '/assets/js/tts-read.js';
            sc.onload = sc.onerror = function () { res(); }; document.head.appendChild(sc);
        });
        return ttsLoading;
    }
    var player = null;
    function speak(text) {
        text = String(text || '').replace(/\s+/g, ' ').trim();
        if (!text) return;
        loadAudioIndex().then(function () {
            var f = audioIndex[text];
            if (f) {
                if (window.stopKorean) window.stopKorean();
                player = player || new Audio();
                player.src = AUDIO_BASE + f;
                var p = player.play();
                if (p && p.catch) p.catch(function () { fallback(text); });
                return;
            }
            fallback(text);
        });
    }
    function fallback(text) { loadTts().then(function () { if (window.readKorean) window.readKorean(text); }); }

    /* Tìm chỗ chèn: sau mục h3 "Quy tắc chia / Kết hợp" (trước h3 kế tiếp) */
    function findAnchor(root) {
        var hs = Array.prototype.slice.call(root.querySelectorAll('h3'));
        var re = [/quy tắc chia/i, /cách chia/i, /kết hợp/i, /cấu trúc/i, /quy tắc/i];
        for (var i = 0; i < re.length; i++) {
            for (var j = 0; j < hs.length; j++) if (re[i].test(hs[j].textContent)) return hs[j];
        }
        return null;
    }
    function insertPoint(h3) {
        var n = h3.nextElementSibling;
        while (n && !/^H[123]$/.test(n.tagName)) {
            if (n.nextElementSibling == null) return { parent: h3.parentNode, before: null };
            n = n.nextElementSibling;
        }
        return { parent: h3.parentNode, before: n };
    }

    /* ---------------- Bảng quy tắc: mỗi nhóm từ một thẻ gồm quy tắc + các bước chia (do chính engine chia) ---------------- */
    var DEF = {
        V: { vowel: ['가다'], batchim: ['먹다'], bright: ['받다', '보다'], dark: ['먹다', '마시다'], hada: ['공부하다'], rieul: ['살다'] },
        A: { vowel: ['바쁘다', '크다', '싸다'], batchim: ['작다', '좋다'], bright: ['좋다', '작다'], dark: ['싫다', '적다'], hada: ['피곤하다'], rieul: ['멀다'] },
        N: { vowel: ['의사', '가수'], batchim: ['학생', '선생님'] },
        iss: ['맛있다', '재미없다']
    };
    /* mỗi kiểu bất quy tắc lấy một từ tiêu biểu (từ đầu tiên dùng được với ngữ pháp) */
    var IRREGULARS = [
        [['덥다', 'A'], ['돕다', 'V']], [['듣다', 'V']], [['짓다', 'V'], ['낫다', 'A']], [['그렇다', 'A']],
        [['바쁘다', 'A'], ['쓰다', 'V']], [['모르다', 'V'], ['빠르다', 'A']]
    ];
    function stemOf(w, pos) { return pos === 'N' ? w : w.replace(/다$/, ''); }
    function vowelIdx(c) { var n = c.charCodeAt(0) - 0xAC00; return (n >= 0 && n < 11172) ? Math.floor((n % 588) / 28) : -1; }
    /* từ thuộc nhóm nào (chỉ lấy từ có quy tắc để làm ví dụ) */
    function inGroup(w, pos, group) {
        var G = window.GrammarConjugator, st = stemOf(w, pos).replace(/\s+/g, '');
        if (!st) return false;
        if (pos === 'N') return group === 'batchim' ? G.hasBatchim(st) : !G.hasBatchim(st);
        if (!/다$/.test(w) || /\s/.test(w)) return false;
        if (group === 'hada') return /하$/.test(st);
        var irr = G.irregularOf(w, pos, st);
        if (group === 'rieul') return irr === 'l';
        if (irr || /하$/.test(st)) return false;
        var b = G.hasBatchim(st), v = vowelIdx(st.charAt(st.length - 1)), bright = v === 0 || v === 2 || v === 8;
        if (group === 'batchim') return b;
        if (group === 'vowel') return !b;
        return group === 'bright' ? bright : !bright;
    }
    function exampleWords(rule) {
        var G = window.GrammarConjugator;
        return (rule.examples || []).map(function (x) { var a = x.split('|'); return { w: a[0], p: a[1] || G.guessPos(a[0]) }; });
    }
    /* từ ví dụ: ưu tiên bộ từ gợi ý của ngữ pháp, thiếu thì lấy từ mặc định */
    function pick(rule, pos, group, forms) {
        var G = window.GrammarConjugator;
        var list = exampleWords(rule).filter(function (x) { return x.p === pos; }).map(function (x) { return x.w; }).concat(DEF[pos][group] || []);
        for (var i = 0; i < list.length; i++) {
            if (pos === 'A' && forms.iss && G.isIss(list[i])) continue;
            if (inGroup(list[i], pos, group)) return list[i];
        }
        return null;
    }
    function run(word, pos, forms) {
        var G = window.GrammarConjugator, spec = G.formFor(forms, word, pos);
        if (!word || !spec) return null;
        var r = G.conjugate(word, spec, { pos: pos });
        return r.ok ? r : null;
    }
    /* một ví dụ đã chia: { w, p, out, base, add, note, changed } */
    function item(word, pos, forms) {
        var r = run(word, pos, forms);
        if (!r) return null;
        function step(k) { for (var i = 0; i < r.steps.length; i++) if (r.steps[i].key === k) return r.steps[i]; return null; }
        var att = step('attach'), ch = step('change');
        var aeo = window.GrammarConjugator.parseSpec(window.GrammarConjugator.formFor(forms, word, pos)).kind === 'aeo';
        var merged = aeo && r.result !== att.base + att.add;   /* 보 + 아요 → 봐요 */
        var notes = [];
        if (ch) notes.push(ch.sub);
        if (merged && !(ch && att.sub === ch.sub)) notes.push(att.sub);
        return { w: word, p: pos, out: r.result, base: att.base, add: att.add, note: notes.join(' · '), how: att.sub, changed: !!ch };
    }
    /* tô màu: phần gốc (so theo phụ âm đầu + nguyên âm, nên 가 → 간 vẫn là gốc) và phần đuôi */
    function paint(word, pos, result) {
        var st = stemOf(word, pos), n = 0;
        function same(a, b) {
            if (a === b) return true;
            var x = a.charCodeAt(0) - 0xAC00, y = b.charCodeAt(0) - 0xAC00;
            return x >= 0 && y >= 0 && x < 11172 && y < 11172 && Math.floor(x / 28) === Math.floor(y / 28);
        }
        while (n < st.length && n < result.length && same(result.charAt(n), st.charAt(n))) n++;
        var end = result.slice(n), sp = end.indexOf(' ');
        var hot = sp > 0 ? end.slice(0, sp) : end, rest = sp > 0 ? end.slice(sp) : '';
        return '<span class="st">' + esc(result.slice(0, n)) + '</span><span class="en">' + esc(hot) + '</span>' + esc(rest);
    }
    /* "-면" trong câu quy tắc */
    function tag(s) { return '<b>-' + esc(String(s).trim()) + '</b>'; }
    function ruleCards(rule) {
        var G = window.GrammarConjugator, cards = [];
        function card(label, items, text, extra) {
            items = items.filter(Boolean);
            if (items.length) cards.push({ label: label, items: items, rule: text, rieul: extra || null });
        }

        /* Trang nhiều đuôi (bất quy tắc, nhiều dạng): mỗi đuôi một thẻ, luôn ghi rõ gốc biến đổi thế nào */
        if (rule.variants) {
            var ex = exampleWords(rule);
            rule.variants.forEach(function (v) {
                var items = [];
                for (var i = 0; i < ex.length && items.length < 2; i++) {
                    var it = item(ex[i].w, ex[i].p, v.forms);
                    if (it) { if (!it.note) it.note = it.how; items.push(it); }
                }
                card(v.label, items, '');
            });
            return cards;
        }

        var F = rule.forms || {};
        var NAME = { V: 'Động từ', A: 'Tính từ', VA: 'Động từ · tính từ' };
        var groups = [];
        if (F.A && F.V && JSON.stringify(F.A) === JSON.stringify(F.V)) groups.push({ key: 'VA', list: ['V', 'A'], spec: F.V });
        else {
            if (F.A) groups.push({ key: 'A', list: ['A'], spec: F.A });
            if (F.V) groups.push({ key: 'V', list: ['V'], spec: F.V });
        }
        groups.forEach(function (g) {
            var sp = G.parseSpec(g.spec), name = NAME[g.key];
            /* thẻ gộp động từ · tính từ: mỗi loại một ví dụ */
            function exs(group) {
                return g.list.map(function (p) { var w = pick(rule, p, group, F); return w ? item(w, p, F) : null; });
            }
            /* gốc ㄹ: chỉ nêu khi cách chia khác thường (rụng ㄹ, hoặc không thêm 으) */
            function rieul() {
                var it = exs('rieul').filter(Boolean)[0];
                if (!it || !(it.changed || sp.kind === 'eu')) return null;
                if (!it.note) it.note = it.how;
                return it;
            }
            if (sp.kind === 'aeo') {
                var past = sp.tail.charAt(0) === 'ㅆ', t = past ? sp.tail.slice(1) : sp.tail;
                var a1 = (past ? '았' : '아') + t, a2 = (past ? '었' : '어') + t, a3 = (past ? '였' : '여') + t;
                card(name + ' · ㅏ, ㅗ', exs('bright'), 'Nguyên âm cuối của gốc là <b>ㅏ, ㅗ</b> → thêm ' + tag(a1));
                card(name + ' · nguyên âm khác', exs('dark'), 'Nguyên âm cuối <b>khác ㅏ, ㅗ</b> → thêm ' + tag(a2));
                card(name + ' · 하다', exs('hada'), 'Gốc kết thúc bằng <b>하</b> → thêm ' + tag(a3) + ', 하 + 여 gộp thành <b>해</b>');
            } else if (sp.kind === 'eu') {
                card(name + ' không patchim', exs('vowel'), 'Gốc <b>không có patchim</b> → gắn thẳng ' + tag(sp.tail) + ' (không thêm ' + esc(sp.ins) + ')', rieul());
                card(name + ' có patchim', exs('batchim'), 'Gốc <b>có patchim</b> → thêm ' + tag(G.attach(sp.ins, sp.tail)));
            } else if (sp.kind === 'vc') {
                var j = /^[ㄱ-ㅎ]/.test(sp.v) ? ' (<b>' + esc(sp.v.charAt(0)) + '</b> viết xuống làm patchim)' : '';
                card(name + ' không patchim', exs('vowel'), 'Gốc <b>không có patchim</b> → ' + tag(sp.v) + j, rieul());
                card(name + ' có patchim', exs('batchim'), 'Gốc <b>có patchim</b> → ' + tag(sp.c));
            } else {
                var items = g.list.map(function (p) { var w = pick(rule, p, 'batchim', F) || pick(rule, p, 'vowel', F) || pick(rule, p, 'hada', F); return w ? item(w, p, F) : null; });
                card(name, items, 'Có hay không có patchim đều <b>gắn thẳng</b> ' + tag(sp.tail) + ' vào gốc', rieul());
            }
        });
        if (F.iss && F.iss !== F.A) {
            var list = exampleWords(rule).map(function (x) { return x.w; }).concat(DEF.iss).filter(function (w) { return G.isIss(w); });
            card('있다 · 없다', [item(list[0], 'A', F)], 'Từ kết thúc bằng <b>있다 / 없다</b> → gắn ' + tag(String(F.iss).replace(/^-/, '')));
        }
        if (F.N) {
            var a = pick(rule, 'N', 'batchim', F), b = pick(rule, 'N', 'vowel', F);
            var nitems = [a && item(a, 'N', F), b && item(b, 'N', F)].filter(Boolean);
            var n = G.parseSpec(F.N), text;
            if (n.kind === 'vc') text = 'Có patchim → ' + tag(n.c) + ' · không patchim → ' + tag(n.v);
            else if (n.kind === 'eu') text = 'Có patchim → ' + tag(n.ins + n.tail) + ' · không patchim → ' + tag(n.tail) + (n.tail.charAt(0) === '로' ? ' (patchim <b>ㄹ</b> cũng dùng -로)' : '');
            else if (n.kind === 'aeo') text = 'Có patchim → ' + tag(G.attach('이어', n.tail)) + ' · không patchim → ' + tag(G.attach('여', n.tail));
            else {
                text = 'Gắn ' + tag(n.tail) + ' sau danh từ' + (/^\s/.test(n.tail) ? ' (viết <b>cách ra</b>)' : ', có hay không patchim đều giống nhau');
                nitems.length = Math.min(nitems.length, 1);
            }
            card('Danh từ', nitems, text);
        }
        return cards;
    }
    /* các từ bất quy tắc làm gốc biến đổi trước đuôi này */
    function ruleIrregulars(rule) {
        if (rule.variants) return [];
        var out = [], F = rule.forms || {};
        IRREGULARS.forEach(function (group) {
            for (var i = 0; i < group.length; i++) {
                var w = group[i][0], p = group[i][1];
                var it = F[p] ? item(w, p, F) : null;
                if (it && it.changed) { out.push(it); return; }
            }
        });
        return out;
    }
    /* "가다 → 가 + 면" rồi kết quả */
    function stepsHtml(x) {
        return '<div class="gc-src" lang="ko">' + esc(x.w) + ' <i>→</i> <span class="st">' + esc(x.base) + '</span> <i>+</i> <span class="en">' + esc(x.add.trim()) + '</span></div>' +
            '<div class="gc-ex" lang="ko"><i>=</i> ' + paint(x.w, x.p, x.out) + '</div>' +
            (x.note ? '<div class="gc-note">' + esc(x.note) + '</div>' : '');
    }
    function ruleTable(rule) {
        var cards = ruleCards(rule);
        if (!cards.length) return null;
        var irr = ruleIrregulars(rule);
        var hasStem = cards.some(function (c) { return c.items.some(function (x) { return x.p !== 'N'; }); });
        var box = el('div', 'gc-table');
        box.innerHTML = '<div class="gc-th">📋 Bảng quy tắc <span class="gc-badge">Bổ sung</span></div>' +
            (hasStem ? '<div class="gc-intro">Cách chia: <b>bỏ 다</b> để lấy gốc từ → xét gốc → gắn đuôi.</div>' : '') +
            '<div class="gc-cards">' + cards.map(function (c) {
                return '<div class="gc-card"><span class="gc-lb">' + esc(c.label) + '</span>' +
                    (c.rule ? '<div class="gc-rule">' + c.rule + '</div>' : '') +
                    c.items.map(function (x) { return '<div class="gc-dv">' + stepsHtml(x) + '</div>'; }).join('') +
                    (c.rieul ? '<div class="gc-dv gc-rieul"><div class="gc-warn">⚠ Gốc có patchim ㄹ</div>' + stepsHtml(c.rieul) + '</div>' : '') +
                    '</div>';
            }).join('') + '</div>' +
            (irr.length ? '<div class="gc-irr"><div class="gc-warn">⚠ Bất quy tắc: gốc đổi trước khi gắn đuôi này</div><div class="gc-cards">' +
                irr.map(function (x) { return '<div class="gc-card">' + stepsHtml(x) + '</div>'; }).join('') + '</div></div>' : '');
        return box;
    }

    function build(rule) {
        var G = window.GrammarConjugator;
        var variants = rule.variants || [{ label: rule.title, forms: rule.forms }];
        var st = { v: 0, pos: null, steps: null, shown: 0, word: '' };

        var wrap = el('div', 'gc');
        wrap.setAttribute('data-no-vocab', '1');
        var tog = el('button', 'gc-toggle', '⚙️ Máy chia ngữ pháp <span style="font-weight:500;opacity:.8">— thử chia từ của bạn</span>');
        tog.type = 'button'; tog.setAttribute('aria-expanded', 'false');
        var box = el('div', 'gc-box'); box.hidden = true;
        var idBox = 'gc-box-' + Math.random().toString(36).slice(2, 8);
        box.id = idBox; tog.setAttribute('aria-controls', idBox);

        box.innerHTML =
            '<div class="gc-head"><div class="gc-title">⚙️ Máy chia <span class="ko">' + esc(rule.title) + '</span></div>' +
            '<div class="gc-hint">Nhập hoặc chọn một từ, rồi bấm <b>Từng bước</b> để xem lần lượt từng bước.</div></div>' +
            (variants.length > 1 ? '<div class="gc-row"><span class="gc-hint">Đuôi:</span><div class="gc-seg gc-var"></div></div>' : '') +
            '<div class="gc-row"><input class="gc-input" type="text" lang="ko" autocomplete="off" spellcheck="false" placeholder="vd: 먹다" aria-label="Từ cần chia">' +
            '<div class="gc-seg gc-pos" role="group" aria-label="Loại từ"></div></div>' +
            '<div class="gc-row gc-chips"></div>' +
            '<div class="gc-row gc-actions"><button type="button" class="gc-btn pri gc-next">▶ Từng bước</button>' +
            '<button type="button" class="gc-btn gc-all">⏩ Xem hết</button>' +
            '<button type="button" class="gc-btn gc-reset" title="Làm lại từ đầu">↺</button><span class="gc-count"></span></div>' +
            '<div class="gc-msg" aria-live="polite"></div>' +
            '<div class="gc-steps" aria-live="polite"></div>';

        var $ = function (s) { return box.querySelector(s); };
        var inp = $('.gc-input'), posBox = $('.gc-pos'), chips = $('.gc-chips'), stepsBox = $('.gc-steps');
        var msg = $('.gc-msg'), cnt = $('.gc-count'), bNext = $('.gc-next'), bAll = $('.gc-all'), bReset = $('.gc-reset');

        function forms() { return variants[st.v].forms; }
        function allowed() { return ['V', 'A', 'N'].filter(function (p) { return forms()[p] || (p === 'A' && forms().iss); }); }

        function renderVariants() {
            var vb = $('.gc-var'); if (!vb) return;
            vb.innerHTML = variants.map(function (v, i) { return '<button type="button" data-i="' + i + '" class="' + (i === st.v ? 'on' : '') + '">' + esc(v.label) + '</button>'; }).join('');
        }
        function renderPos() {
            var al = allowed();
            if (al.indexOf(st.pos) < 0) st.pos = al[0];
            posBox.innerHTML = al.map(function (p) { return '<button type="button" data-p="' + p + '" class="' + (p === st.pos ? 'on' : '') + '" aria-pressed="' + (p === st.pos) + '">' + POS_NAME[p] + '</button>'; }).join('');
            posBox.style.display = al.length > 1 ? '' : 'none';
        }
        function renderChips() {
            var al = allowed();
            chips.innerHTML = '<span class="gc-hint">Gợi ý:</span>' + (rule.examples || []).map(function (ex) {
                var a = ex.split('|'), p = a[1] || G.guessPos(a[0]);
                if (al.indexOf(p) < 0) return '';
                return '<button type="button" class="gc-chip' + (a[0] === inp.value.trim() ? ' on' : '') + '" data-w="' + esc(a[0]) + '" data-p="' + p + '">' + esc(a[0]) + '</button>';
            }).join('');
        }
        function reset(keepMsg) {
            st.steps = null; st.shown = 0; stepsBox.innerHTML = '';
            if (!keepMsg) msg.textContent = '';
            cnt.textContent = '';
            bNext.textContent = '▶ Từng bước'; bNext.disabled = false; bAll.disabled = false;
        }
        function compute() {
            var w = inp.value.trim();
            if (!w) { msg.textContent = 'Hãy nhập một từ hoặc chọn từ gợi ý.'; return false; }
            var spec = G.formFor(forms(), w, st.pos);
            if (!spec) { msg.textContent = 'Đuôi này không dùng với ' + POS_NAME[st.pos].toLowerCase() + '.'; return false; }
            var r = G.conjugate(w, spec, { pos: st.pos });
            if (!r.ok) { msg.textContent = r.error; return false; }
            msg.textContent = '';
            st.steps = r.steps; st.result = r.result; st.shown = 0; st.word = w;
            stepsBox.innerHTML = '';
            return true;
        }
        function showOne() {
            var i = st.shown, s = st.steps[i];
            if (i > 0) stepsBox.appendChild(el('div', 'gc-arrow', '→'));
            var isRes = s.key === 'result';
            var card = el('div', 'gc-step' + (isRes ? ' result' : ''));
            card.innerHTML = '<div class="n">Bước ' + (i + 1) + '</div><div class="t">' + esc(s.title) + '</div>' +
                '<div class="k' + (s.text ? ' txt' : '') + '">' + parts(s.main) +
                (isRes ? ' <button type="button" class="gc-say" title="Nghe" aria-label="Nghe">🔊</button>' : '') + '</div>' +
                (s.sub ? '<div class="s">' + esc(s.sub) + '</div>' : '');
            stepsBox.appendChild(card);
            st.shown++;
            if (isRes) speak(st.result);
            return card;
        }
        function updateButtons() {
            var total = st.steps ? st.steps.length : 0;
            cnt.textContent = total ? 'Bước ' + st.shown + '/' + total : '';
            var done = total && st.shown >= total;
            bNext.textContent = done ? '↻ Chia lại' : (st.shown ? '▶ Bước tiếp theo' : '▶ Từng bước');
            bAll.disabled = !!done;
        }
        function next() {
            if (!st.steps || st.shown >= st.steps.length || inp.value.trim() !== st.word) {
                if (!compute()) { updateButtons(); return; }
            }
            var c = showOne(); updateButtons();
            if (c && c.scrollIntoView && window.innerWidth < 641) c.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
        function all() {
            if (!st.steps || inp.value.trim() !== st.word) { if (!compute()) { updateButtons(); return; } }
            while (st.shown < st.steps.length) showOne();
            updateButtons();
        }

        inp.addEventListener('input', function () {
            var w = inp.value.trim();
            if (w) { var g = w.split(' ').pop(); var p = /다$/.test(g) ? G.guessPos(g) : 'N'; if (allowed().indexOf(p) >= 0) st.pos = p; }
            renderPos(); renderChips(); reset();
        });
        inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); next(); } });
        posBox.addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return; st.pos = b.getAttribute('data-p'); renderPos(); renderChips(); reset(); });
        chips.addEventListener('click', function (e) {
            var b = e.target.closest('.gc-chip'); if (!b) return;
            inp.value = b.getAttribute('data-w'); st.pos = b.getAttribute('data-p');
            renderPos(); renderChips(); reset(); next();
        });
        var vb = $('.gc-var');
        if (vb) vb.addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return; st.v = +b.getAttribute('data-i'); renderVariants(); renderPos(); renderChips(); reset(); });
        bNext.addEventListener('click', next);
        bAll.addEventListener('click', all);
        bReset.addEventListener('click', function () { reset(); updateButtons(); });
        stepsBox.addEventListener('click', function (e) { if (e.target.closest('.gc-say')) speak(st.result); });
        tog.addEventListener('click', function () {
            var open = box.hidden;
            box.hidden = !open; tog.setAttribute('aria-expanded', String(open));
            if (open && !inp.value) {
                var first = (rule.examples || [])[0];
                if (first) { var a = first.split('|'); inp.value = a[0]; st.pos = a[1] || G.guessPos(a[0]); renderPos(); renderChips(); }
            }
        });

        var first = (rule.examples || [])[0];
        st.pos = first ? (first.split('|')[1] || 'V') : allowed()[0];
        renderVariants(); renderPos(); renderChips();
        var table = ruleTable(rule);
        if (table) wrap.appendChild(table);
        wrap.appendChild(tog); wrap.appendChild(box);
        return wrap;
    }

    var styled = false;
    function has(key) { return !!(window.GrammarConjugator && window.GRAMMAR_CONJ_RULES && window.GRAMMAR_CONJ_RULES[key]); }
    function mount(container, key) {
        if (!container || !has(key) || container.querySelector('.gc')) return null;
        if (!styled) { var style = el('style'); style.textContent = CSS; document.head.appendChild(style); styled = true; }
        loadAudioIndex();
        var ui = build(window.GRAMMAR_CONJ_RULES[key]);
        var h3 = findAnchor(container);
        if (h3) { var p = insertPoint(h3); p.parent.insertBefore(ui, p.before); }
        else {
            /* nội dung tự soạn không có mục "Quy tắc chia": đặt ngay dưới dòng tiêu đề mở đầu (nếu có), không thì lên đầu */
            var f = container.firstElementChild;
            var isTitle = f && f.textContent.trim().length > 0 && f.textContent.trim().length < 120 && !f.querySelector('table,ul,ol');
            container.insertBefore(ui, isTitle ? f.nextSibling : container.firstChild);
        }
        return ui;
    }
    /* Ngữ pháp trong giáo trình có libId; ngữ pháp lớp học chỉ lưu tên → ghép theo tên với thư viện.
     * Tên trong lớp viết nhiều kiểu: "(으)면 - Nếu", "5. A/V-(으)면 (Nếu, Khi)", "1. Động từ + 아/어 주다 (…)". */
    function normTitle(t) { return String(t || '').normalize('NFC').toLowerCase().replace(/[?.!\s\-–—~]+/g, ''); }
    /* rút về phần mẫu tiếng Hàn: bỏ số thứ tự, phần giải nghĩa, [dạng phủ định], ký hiệu loại từ A/V/N */
    function pattern(t) {
        var s = String(t || '').normalize('NFC').trim();
        s = s.replace(/^\s*(?:cấu trúc\s*\d+[^:]*:|\d+(?:\.\d+)*(?:\s*&\s*\d+)?\s*[.)])\s*/i, '');
        s = s.split(/\s+[-–—]\s+/)[0];
        s = s.replace(/\s*\(\s*(?=(?:[A-ZÀ-ỸĐ][a-zà-ỹđ]|N\s*\.\.\.|\.\.\.))[\s\S]*$/, '');
        s = s.replace(/động từ\s*\+\s*/ig, 'V-').replace(/tính từ\s*\+\s*/ig, 'A-').replace(/danh từ\s*\+\s*/ig, 'N');
        s = s.replace(/\[[^\]]*\]/g, '');
        s = s.replace(/(^|[^A-Za-z])(?:a\s*\/\s*v|v\s*\/\s*a|n\d?|v|a)(?![A-Za-z])/gi, '$1');
        s = s.replace(/아서\s*\/\s*어서/g, '아/어서').replace(/아야\s*\/\s*어야/g, '아/어야').replace(/아요\s*\/\s*어요/g, '아/어요');
        s = s.toLowerCase().replace(/[?.!,…'‘’"\s\-–—~+]+/g, '').replace(/^\/+|\/+$/g, '');
        return s === '(으)탈락' ? 'ㅡ탈락' : s;
    }
    function keyFor(g) {
        if (!g) return null;
        if (g.libId) return has(g.libId) ? g.libId : null;
        var lib = window.GrammarLibrary || [], title = String(g.title || '');
        if (!title || !lib.length) return null;
        var full = normTitle(title), ko = normTitle(title.split(' - ')[0]), byKo = null;
        for (var i = 0; i < lib.length; i++) {
            var x = lib[i]; if (!x || !has(x.id)) continue;
            if (normTitle(x.korean + ' - ' + (x.vietnamese || '')) === full) return x.id;
            if (!byKo && normTitle(x.korean) === ko) byKo = x.id;
        }
        if (byKo) return byKo;
        var pat = pattern(title);
        if (!pat) return null;
        var near = lib.filter(function (x) { return x && has(x.id) && pattern(x.korean) === pat; });
        /* nhiều mục cùng mẫu chỉ nhận khi chia giống hệt nhau (tránh nhầm A-(으)ㄴ với V-(으)ㄴ) */
        var sig = function (x) { var r = window.GRAMMAR_CONJ_RULES[x.id]; return JSON.stringify([r.forms, r.variants]); };
        return near.length && near.every(function (x) { return sig(x) === sig(near[0]); }) ? near[0].id : null;
    }
    window.GrammarConjugatorUI = { mount: mount, has: has, keyFor: keyFor, speak: speak, ruleCards: ruleCards };
})();
