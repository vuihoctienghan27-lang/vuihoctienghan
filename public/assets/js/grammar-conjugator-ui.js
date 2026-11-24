/* grammar-conjugator-ui.js — "Máy chia ngữ pháp" trong cửa sổ chi tiết ở trang Luyện ngữ pháp (/grammar/home.html).
 * Cần: grammar-conjugator.js (engine) + grammar-conjugator-rules.js (bảng cấu hình theo id ngữ pháp).
 * Dùng: GrammarConjugatorUI.mount(khungNộiDung, idNgữPháp) — chèn ngay sau mục "Quy tắc chia / Kết hợp", mặc định ẩn.
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
        else container.insertBefore(ui, container.firstChild);
        return ui;
    }
    window.GrammarConjugatorUI = { mount: mount, has: has, speak: speak };
})();
