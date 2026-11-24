/* grammar-conjugator.js — Engine chia ngữ pháp dùng chung (không phụ thuộc DOM).
 *
 * Một ngữ pháp khai báo đuôi theo từng loại từ (xem grammar-conjugator-rules.js):
 *   "(으)면"          → đuôi có 으 xen kẽ (먹으면 / 가면 / 살면 / 들으면 / 더우면 ...)
 *   "(이)라고 해요"    → danh từ: có patchim + 이 (학생이라고 / 의사라고)
 *   "아/어서"          → đuôi 아/어 (가서 / 먹어서 / 해서 / 몰라서 / 더워서 ...)
 *   "았/었어요"        → quá khứ (갔어요 / 먹었어요 / 했어요)
 *   "ㄴ/는다고 해요"   → dạng sau nguyên âm / sau patchim (간다고 / 먹는다고)
 *   "이에요/예요", "은/는" ... → dạng sau patchim / sau nguyên âm (nếu vế đầu là chữ trọn)
 *   "고 싶어요"        → gắn thẳng (ㄹ rụng trước ㄴ/ㅂ/ㅅ: 사는데, 사네요)
 * Có thể dùng object thay cho chuỗi: {kind:'eu'|'aeo'|'vc'|'plain', ...}.
 *
 * Dùng: GrammarConjugator.conjugate('듣다', '(으)면', {pos:'V'})
 *   → { ok, result, steps:[{key,title,main,sub}], pos, stem, irregular }
 * main là mảng mảnh [{t:'들', c:'stem'|'end'|'mut'|'chg'}] để giao diện tô màu.
 */
(function (root) {
    'use strict';

    var SB = 0xAC00;
    var L_LIST = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ';
    var V_LIST = 'ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ';
    var T_LIST = ' ㄱㄲㄳㄴㄵㄶㄷㄹㄺㄻㄼㄽㄾㄿㅀㅁㅂㅄㅅㅆㅇㅈㅊㅋㅌㅍㅎ';
    var V = {}; for (var vi = 0; vi < V_LIST.length; vi++) V[V_LIST[vi]] = vi;
    var T = {}; for (var ti = 1; ti < T_LIST.length; ti++) T[T_LIST[ti]] = ti;

    function isSyl(c) { if (!c) return false; var n = c.charCodeAt(0) - SB; return n >= 0 && n < 11172; }
    function isJamo(c) { if (!c) return false; var n = c.charCodeAt(0); return n >= 0x3131 && n <= 0x3163; }
    function dec(c) { var n = c.charCodeAt(0) - SB; return { l: Math.floor(n / 588), v: Math.floor((n % 588) / 28), t: n % 28 }; }
    function comp(l, v, t) { return String.fromCharCode(SB + l * 588 + v * 28 + (t || 0)); }
    function lastCh(s) { return s.charAt(s.length - 1); }
    function initOf(s) { return s.slice(0, -1); }
    function fin(c) { return isSyl(c) ? dec(c).t : -1; }
    function vowelOf(c) { return isSyl(c) ? V_LIST[dec(c).v] : ''; }
    function finJamo(c) { var t = fin(c); return t > 0 ? T_LIST[t] : ''; }
    function setFin(c, t) { var d = dec(c); return comp(d.l, d.v, t); }
    function setVowel(c, v) { var d = dec(c); return comp(d.l, V[v], d.t); }
    function lastSyl(s) { for (var i = s.length - 1; i >= 0; i--) if (isSyl(s[i])) return s[i]; return ''; }
    function hasBatchim(s) { return fin(lastSyl(s)) > 0; }

    /* Gắn phần đuôi: nếu đuôi bắt đầu bằng phụ âm rời (ㄴ, ㄹ, ㅂ, ㅆ, ㅁ) thì nhập vào âm tiết cuối. */
    function attach(base, tail) {
        if (!tail) return base;
        var j = tail.charAt(0);
        if (isJamo(j) && T[j] && base) {
            var lc = lastCh(base);
            if (isSyl(lc) && fin(lc) === 0) return initOf(base) + setFin(lc, T[j]) + tail.slice(1);
            if (isSyl(lc) && fin(lc) === T['ㄹ'] && j === 'ㅁ') return initOf(base) + setFin(lc, T['ㄻ']) + tail.slice(1); /* 살 + ㅁ → 삶 */
        }
        return base + tail;
    }
    /* Đuôi bắt đầu bằng ㄴ/ㅂ/ㅅ (hoặc ㄹ rời) → ㄹ của gốc rụng. */
    function dropsL(tail) {
        var j = tail.charAt(0);
        if (j === 'ㄴ' || j === 'ㄹ' || j === 'ㅂ') return true;
        if (isSyl(j)) { var l = L_LIST[dec(j).l]; return l === 'ㄴ' || l === 'ㅂ' || l === 'ㅅ'; }
        return false;
    }
    function bright(v) { return v === 'ㅏ' || v === 'ㅗ' || v === 'ㅑ'; }

    /* ---------------- Từ điển bất quy tắc ---------------- */
    function set(arr) { var o = {}; arr.forEach(function (w) { o[w] = 1; }); return o; }
    var IRR_D = set(['듣다', '걷다', '묻다', '싣다', '깨닫다', '일컫다', '붇다', '긷다', '알아듣다', '엿듣다']);
    var IRR_S = set(['낫다', '짓다', '붓다', '잇다', '긋다', '젓다', '잣다']);
    var IRR_B_VERB = set(['돕다', '굽다', '눕다', '줍다', '깁다']);
    var REG_B_ADJ = set(['좁다']);
    var WA_B = set(['돕다', '곱다']); /* ㅂ → 와 (thay vì 워) */
    var REG_REU = set(['따르다', '치르다', '들르다', '다다르다', '우러르다', '잇따르다']);
    var IRR_REO = set(['이르다', '푸르다', '누르다']); /* 러 bất quy tắc (이르다 = đến nơi) */
    var IRR_U = set(['푸다']);
    var ADJ = set(['좋다', '나쁘다', '크다', '작다', '많다', '적다', '바쁘다', '예쁘다', '기쁘다', '슬프다', '아프다',
        '고프다', '싸다', '비싸다', '짜다', '쓰다', '달다', '길다', '멀다', '높다', '낮다', '넓다', '좁다', '같다',
        '괜찮다', '싫다', '젊다', '늦다', '빠르다', '다르다', '부르다', '배부르다', '게으르다', '이르다', '푸르다',
        '시다', '희다', '차다', '느리다', '어리다', '맑다', '밝다', '어둡다', '깊다', '얕다', '굵다', '얇다', '짧다',
        '착하다', '친절하다', '피곤하다', '행복하다', '조용하다', '깨끗하다', '따뜻하다', '시원하다', '유명하다',
        '중요하다', '필요하다', '편하다', '불편하다', '건강하다', '똑똑하다', '복잡하다', '간단하다', '심심하다',
        '미안하다', '죄송하다', '힘들다', '어렵다', '쉽다', '덥다', '춥다', '맵다', '귀엽다', '고맙다', '반갑다',
        '가깝다', '무겁다', '가볍다', '즐겁다', '아름답다', '그렇다', '이렇다', '저렇다', '어떻다', '빨갛다', '노랗다',
        '파랗다', '하얗다', '까맣다', '동그랗다', '멋있다', '맛있다', '재미있다', '맛없다', '재미없다', '있다', '없다',
        '계시다', '이상하다', '비슷하다', '다양하다', '친하다', '급하다', '궁금하다', '어색하다', '못생기다']);

    /* Đoán loại từ: chưa chắc chắn thì trả 'V' */
    function guessPos(word) {
        var w = (word || '').trim();
        if (!/다$/.test(w)) return 'N';
        if (ADJ[w]) return 'A';
        if (/(있다|없다)$/.test(w)) return 'A';
        if (/(답다|롭다|스럽다)$/.test(w)) return 'A';
        var st = w.slice(0, -1), lc = lastCh(st);
        if (isSyl(lc) && finJamo(lc) === 'ㅎ' && w !== '놓다' && w !== '넣다' && w !== '낳다' && w !== '닿다' && w !== '쌓다') return 'A';
        return 'V';
    }
    function isIss(word) { return /(있다|없다)$/.test(word) && word !== '계시다'; }

    /* Xác định nhóm bất quy tắc của gốc động/tính từ */
    function irregularOf(word, pos, stem) {
        var lc = lastCh(stem), d = isSyl(lc) ? dec(lc) : null;
        if (!d) return null;
        var t = T_LIST[d.t];
        if (stem.slice(-1) === '하' ) return 'hada';
        if (IRR_U[word]) return 'u';
        if (t === 'ㅂ') {
            if (pos === 'A') return REG_B_ADJ[word] ? null : 'b';
            return IRR_B_VERB[word] ? 'b' : null;
        }
        if (t === 'ㄷ') return IRR_D[word] ? 'd' : null;
        if (t === 'ㅅ') return IRR_S[word] ? 's' : null;
        if (t === 'ㅎ') return (pos === 'A' && word !== '좋다') ? 'h' : null;
        if (t === 'ㄹ') return 'l';
        if (d.t === 0 && lc === '르' && stem.length >= 2) {
            if (IRR_REO[word]) return 'reo';
            if (REG_REU[word]) return 'eu';
            return 'reu';
        }
        if (d.t === 0 && V_LIST[d.v] === 'ㅡ') return 'eu';
        return null;
    }
    var IRR_NAME = {
        b: 'bất quy tắc ㅂ', d: 'bất quy tắc ㄷ', s: 'bất quy tắc ㅅ', h: 'bất quy tắc ㅎ', reu: 'bất quy tắc 르',
        reo: 'bất quy tắc 러', u: 'bất quy tắc 우', eu: 'nguyên âm ㅡ (ㅡ 탈락)', l: 'gốc ㄹ (ㄹ 탈락)', hada: 'gốc 하다'
    };

    /* ---------------- Phân tích chuỗi đuôi ---------------- */
    function parseSpec(spec) {
        if (spec && typeof spec === 'object') return spec;
        var lead = /^\s/.test(String(spec || '')) ? ' ' : '';
        var s = String(spec || '').trim().replace(/^[-~]\s*/, '');
        var m;
        if (s.indexOf('(으)') === 0) return { kind: 'eu', ins: '으', tail: s.slice(3), label: s };
        if (s.indexOf('(이)') === 0) return { kind: 'eu', ins: '이', tail: s.slice(3), label: s };
        if (s.indexOf('아/어') === 0) return { kind: 'aeo', tail: s.slice(3), label: s };
        if (s.indexOf('았/었') === 0) return { kind: 'aeo', tail: 'ㅆ' + s.slice(3), label: s };
        if ((m = s.match(/^([^\s\/]+)\/([^\s\/]+?)(\s.*)?$/))) {
            /* "ㄴ/는다고": vế đầu là phụ âm rời → (sau nguyên âm)/(sau patchim).
               "이에요/예요", "은/는": vế đầu là chữ trọn → (sau patchim)/(sau nguyên âm).
               Phần chung phía sau: "ㄴ/는다고" → a='ㄴ', b='는다고' ⇒ ghép đuôi của b vào a. */
            var a = m[1], b = m[2], rest = m[3] || '';
            var j = isJamo(a.charAt(0));
            if (j && a.length === 1) { var common = b.slice(1); a = a + common; }
            return j ? { kind: 'vc', v: a + rest, c: b + rest, label: s } : { kind: 'vc', c: a + rest, v: b + rest, label: s };
        }
        return { kind: 'plain', tail: lead + s, label: s };
    }

    function P(t, c) { return { t: t, c: c || '' }; }

    /* ---------------- Chia gốc + đuôi 아/어 ---------------- */
    function aeoBase(word, pos, stem, irr, notes) {
        var lc = lastCh(stem), pre = initOf(stem), d = dec(lc), v = V_LIST[d.v], t = d.t;
        var prevV = pre ? vowelOf(lastSyl(pre)) : '';
        var res, changed = stem;
        switch (irr) {
            case 'hada':
                notes.check = 'Gốc kết thúc bằng 하 → 하 + 여 = 해';
                return { changed: stem, joined: pre + '해', how: '하 + 여 → 해' };
            case 'b':
                changed = pre + setFin(lc, 0);
                var w = WA_B[word] ? '와' : '워';
                notes.change = 'ㅂ gặp nguyên âm → đổi thành 우 (' + lc + ' → ' + setFin(lc, 0) + '우)';
                return { changed: changed + '우', joined: changed + w, how: '우 + 어 → ' + w + (WA_B[word] ? ' (돕다/곱다 → 와)' : '') };
            case 'd':
                changed = pre + setFin(lc, T['ㄹ']);
                notes.change = 'ㄷ gặp nguyên âm → đổi thành ㄹ (' + lc + ' → ' + setFin(lc, T['ㄹ']) + ')';
                res = changed + (bright(v) ? '아' : '어');
                return { changed: changed, joined: res, how: 'nguyên âm ' + v + ' → ' + (bright(v) ? '아' : '어') };
            case 's':
                changed = pre + setFin(lc, 0);
                notes.change = 'ㅅ gặp nguyên âm → rụng ㅅ (' + lc + ' → ' + setFin(lc, 0) + '), không rút gọn';
                return { changed: changed, joined: changed + (bright(v) ? '아' : '어'), how: 'nguyên âm ' + v + ' → ' + (bright(v) ? '아' : '어') + ' (giữ nguyên, không gộp)' };
            case 'h':
                var nv = v === 'ㅑ' ? 'ㅒ' : (v === 'ㅕ' ? 'ㅖ' : 'ㅐ');
                changed = pre + setFin(lc, 0);
                notes.change = 'ㅎ rụng, nguyên âm ' + v + ' + 아/어 → ' + nv;
                return { changed: changed, joined: pre + setVowel(setFin(lc, 0), nv), how: lc + ' → ' + setVowel(setFin(lc, 0), nv) };
            case 'reu':
                var ps = lastCh(pre), ppre = initOf(pre), pv = vowelOf(ps);
                var e = bright(pv) ? '라' : '러';
                changed = ppre + setFin(ps, T['ㄹ']);
                notes.change = '르 gặp 아/어 → ㅡ rụng, thêm ㄹ vào âm trước (' + ps + ' → ' + setFin(ps, T['ㄹ']) + ')';
                return { changed: changed, joined: changed + e, how: 'nguyên âm trước là ' + pv + ' → ' + e };
            case 'reo':
                notes.change = '러 bất quy tắc: 르 + 어 → 르러';
                return { changed: stem, joined: stem + '러', how: '르 + 어 → 르러' };
            case 'u':
                notes.change = '우 bất quy tắc: ㅜ rụng (푸 → 퍼)';
                return { changed: stem, joined: pre + setVowel(lc, 'ㅓ'), how: 'ㅜ + 어 → ㅓ' };
            case 'eu':
                var e2 = (prevV && bright(prevV)) ? 'ㅏ' : 'ㅓ';
                notes.change = 'ㅡ gặp 아/어 → ㅡ rụng' + (prevV ? ' (nguyên âm trước là ' + prevV + ' → ' + (e2 === 'ㅏ' ? '아' : '어') + ')' : ' (1 âm tiết → 어)');
                return { changed: stem, joined: pre + setVowel(lc, e2), how: lc + ' → ' + setVowel(lc, e2) };
        }
        var e3 = bright(v) ? '아' : '어';
        if (t > 0) return { changed: stem, joined: stem + e3, how: 'nguyên âm ' + v + (bright(v) ? ' (ㅏ/ㅗ)' : ' (khác ㅏ/ㅗ)') + ' → ' + e3 };
        /* gốc tận cùng nguyên âm: rút gọn */
        var map = { 'ㅏ': 'ㅏ', 'ㅓ': 'ㅓ', 'ㅐ': 'ㅐ', 'ㅔ': 'ㅔ', 'ㅕ': 'ㅕ', 'ㅗ': 'ㅘ', 'ㅜ': 'ㅝ', 'ㅣ': 'ㅕ', 'ㅚ': 'ㅙ' };
        if (map[v]) {
            var j2 = setVowel(lc, map[v]);
            /* 이 (không phụ âm đầu ㅇ+ㅣ) → 여: 이기다 → 이겨 vẫn đúng với ㅕ */
            return { changed: stem, joined: pre + j2, how: lc + ' + ' + e3 + ' → ' + j2 + (j2 === lc ? ' (gộp, chỉ còn một)' : ' (rút gọn)') };
        }
        return { changed: stem, joined: stem + e3, how: 'nguyên âm ' + v + ' → ' + e3 };
    }

    /* ---------------- Hàm chính ---------------- */
    function conjugate(word, spec, opts) {
        opts = opts || {};
        var full = (word || '').trim().replace(/\s+/g, ' ');
        if (!full) return { ok: false, error: 'Hãy nhập một từ.' };
        if (/[^가-힣\s]/.test(full)) return { ok: false, error: 'Chỉ nhập chữ Hàn (vd: 먹다, 학생).' };
        var sp0 = full.lastIndexOf(' ');
        var pos = opts.pos || guessPos(full.slice(sp0 + 1));
        /* Cụm "비가 오다": chỉ chia từ cuối, phần trước giữ nguyên */
        var prefix = (pos !== 'N' && sp0 > 0) ? full.slice(0, sp0 + 1) : '';
        var raw = prefix ? full.slice(sp0 + 1) : full;
        var sp = parseSpec(spec);
        var steps = [];
        var posName = { V: 'Động từ', A: 'Tính từ', N: 'Danh từ' }[pos];

        steps.push({ key: 'root', title: 'Từ gốc', main: [P(full)], sub: posName + (prefix ? ' · chỉ chia "' + raw + '"' : '') });

        /* ---- Danh từ ---- */
        if (pos === 'N') {
            var n = raw.replace(/(이다)$/, '');
            if (n === '') n = raw;
            var ls = lastSyl(n), b = hasBatchim(n), fj = finJamo(ls);
            steps.push({ key: 'stem', title: 'Xác định danh từ', main: [P(n, 'stem')], sub: raw !== n ? 'Bỏ 이다 → ' + n : 'Danh từ giữ nguyên' });
            var check = b ? '"' + ls + '" có patchim ' + fj : '"' + ls + '" không có patchim';
            var end, why;
            if (sp.kind === 'eu') {
                var noIns = !b || (fj === 'ㄹ' && sp.tail.charAt(0) === '로');
                end = noIns ? sp.tail : sp.ins + sp.tail;
                why = noIns ? (b ? 'Patchim ㄹ + 로 → không thêm ' + sp.ins : 'Không patchim → bỏ (' + sp.ins + ')') : 'Có patchim → thêm ' + sp.ins;
                if (fj === 'ㄹ' && sp.tail.charAt(0) === '로') check += ' (ㄹ đặc biệt: dùng 로)';
            } else if (sp.kind === 'vc') {
                end = b ? sp.c : sp.v; why = b ? 'Có patchim → -' + sp.c : 'Không patchim → -' + sp.v;
            } else if (sp.kind === 'aeo') {
                end = (b ? '이어' : '여') + sp.tail; why = 'Danh từ + 이다 → ' + (b ? '이어' : '여');
            } else { end = sp.tail; why = 'Gắn thẳng vào danh từ'; }
            steps.push({ key: 'check', title: 'Kiểm tra patchim', main: [P(check)], sub: b ? 'Có patchim' : 'Không patchim', text: true });
            var resN = (end.charAt(0) === ' ' ? n + end : attach(n, end));
            steps.push({ key: 'attach', title: 'Gắn đuôi', main: [P(n, 'stem'), P(' + ', 'mut'), P('-' + end.trim(), 'end')], sub: why });
            steps.push({ key: 'result', title: 'Kết quả', main: split(resN, n), sub: sp.label ? 'Mẫu: ' + (sp.label) : '' });
            return { ok: true, pos: pos, stem: n, result: resN, steps: steps, irregular: null };
        }

        /* ---- Động từ / tính từ ---- */
        if (!/다$/.test(raw) || raw.length < 2) return { ok: false, error: 'Động từ/tính từ cần ở dạng nguyên mẫu kết thúc bằng 다 (vd: 먹다).' };
        var stem = raw.replace(/\s+/g, '').slice(0, -1);
        var lc = lastCh(stem);
        if (!isSyl(lc)) return { ok: false, error: 'Không đọc được gốc từ.' };
        var irr = opts.regular ? null : irregularOf(raw.replace(/\s+/g, ''), pos, stem);
        if (opts.regular && finJamo(lc) === 'ㄹ') irr = 'l';
        if (stem.slice(-1) === '하') irr = 'hada';
        steps.push({ key: 'stem', title: 'Tách gốc', main: [P(stem, 'stem'), P('|다', 'mut')], sub: 'Bỏ 다 → gốc "' + stem + '"' });

        var fj2 = finJamo(lc), vv = vowelOf(lc);
        var notes = {};
        var checkTxt = fj2 ? '"' + lc + '" có patchim ' + fj2 : '"' + lc + '" không có patchim (nguyên âm ' + vv + ')';
        var irrTxt = irr && irr !== 'hada' ? IRR_NAME[irr] : (irr === 'hada' ? 'gốc 하다' : 'có quy tắc');
        var result, attachMain, attachSub, change = null, finalBase = stem;

        if (sp.kind === 'aeo') {
            var r = aeoBase(raw.replace(/\s+/g, ''), pos, stem, irr, notes);
            if (!irr || irr === 'l') checkTxt = '"' + lc + '": nguyên âm ' + vv + (fj2 ? ', patchim ' + fj2 : ', không patchim');
            if (notes.change) change = { from: stem, to: r.changed, sub: notes.change };
            result = attach(r.joined, sp.tail); finalBase = r.changed;
            attachMain = [P(r.joined, 'stem'), P(' + ', 'mut'), P('-' + (sp.tail.charAt(0) === 'ㅆ' ? '았/었' + sp.tail.slice(1) : (sp.tail || '(kết thúc)')).trim(), 'end')];
            attachSub = r.how;
        } else if (sp.kind === 'eu') {
            var base = stem, ins = sp.ins, tail = sp.tail, useIns = fj2 !== '';
            if (irr === 'l') {
                useIns = false;
                if (dropsL(tail)) { base = initOf(stem) + setFin(lc, 0); notes.change = 'ㄹ gặp ㄴ/ㄹ/ㅂ/ㅅ → ㄹ rụng'; }
                attachSub = 'Gốc ㄹ: không thêm ' + ins;
            } else if (irr === 'b') {
                base = initOf(stem) + setFin(lc, 0) + '우'; useIns = false;
                notes.change = 'ㅂ gặp nguyên âm → đổi thành 우 (' + stem + ' → ' + base + ')';
                attachSub = 'Gốc mới tận cùng nguyên âm → bỏ (으)';
            } else if (irr === 'd') {
                base = initOf(stem) + setFin(lc, T['ㄹ']);
                notes.change = 'ㄷ gặp 으 → đổi thành ㄹ (' + lc + ' → ' + lastCh(base) + ')';
                attachSub = 'Vẫn tính là có patchim → thêm 으';
            } else if (irr === 's') {
                base = initOf(stem) + setFin(lc, 0);
                notes.change = 'ㅅ gặp 으 → ㅅ rụng (' + lc + ' → ' + lastCh(base) + '), vẫn giữ 으';
                attachSub = 'Giữ 으 dù ㅅ đã rụng';
            } else if (irr === 'h') {
                base = initOf(stem) + setFin(lc, 0); useIns = false;
                notes.change = 'ㅎ gặp 으 → ㅎ và 으 cùng rụng (' + lc + ' → ' + lastCh(base) + ')';
                attachSub = 'Không thêm 으';
            } else {
                attachSub = useIns ? 'Có patchim → thêm ' + ins : 'Không patchim → bỏ (' + ins + ')';
            }
            if (notes.change) change = { from: stem, to: base, sub: notes.change };
            var fullTail = useIns ? attach(ins, tail) : tail;
            result = attach(base, fullTail); finalBase = base;
            attachMain = [P(base, 'stem'), P(' + ', 'mut'), P('-' + fullTail.trim(), 'end')];
        } else if (sp.kind === 'vc') {
            var useV = fj2 === '', base2 = stem;
            if (irr === 'l' && (dropsL(sp.v) || isJamo(sp.v.charAt(0)))) {
                useV = true; base2 = initOf(stem) + setFin(lc, 0);
                notes.change = 'Gốc ㄹ gặp ' + sp.v.charAt(0) + ' → ㄹ rụng, dùng như gốc không patchim';
                change = { from: stem, to: base2, sub: notes.change };
            }
            var tl = useV ? sp.v : sp.c;
            result = attach(base2, tl); finalBase = base2;
            attachMain = [P(base2, 'stem'), P(' + ', 'mut'), P('-' + tl.trim(), 'end')];
            attachSub = useV ? (irr === 'l' ? 'Gốc ㄹ (đã rụng) → -' + sp.v : 'Không patchim → -' + sp.v) : 'Có patchim → -' + sp.c;
        } else {
            var base3 = stem, tl2 = sp.tail;
            if (irr === 'l' && dropsL(tl2)) {
                base3 = initOf(stem) + setFin(lc, 0);
                notes.change = 'ㄹ gặp ' + L_LIST[dec(tl2.charAt(0)).l] + ' → ㄹ rụng';
                change = { from: stem, to: base3, sub: notes.change };
            }
            result = attach(base3, tl2); finalBase = base3;
            attachMain = [P(base3, 'stem'), P(' + ', 'mut'), P('-' + tl2.trim(), 'end')];
            attachSub = 'Đuôi bắt đầu bằng phụ âm → gắn thẳng vào gốc';
        }

        if (irr === 'l' && !change) irrTxt = 'gốc ㄹ — đuôi này không làm ㄹ rụng';
        else if (irr && irr !== 'l' && irr !== 'hada' && !change) irrTxt += ' — nhưng đuôi này không làm gốc biến đổi';
        steps.push({ key: 'check', title: 'Kiểm tra patchim / bất quy tắc', main: [P(checkTxt)], sub: irrTxt.charAt(0).toUpperCase() + irrTxt.slice(1), text: true });
        if (change && change.from !== change.to) steps.push({ key: 'change', title: 'Biến đổi gốc', main: [P(change.from, 'stem'), P(' → ', 'mut'), P(change.to, 'chg')], sub: change.sub });
        else if (change) steps.push({ key: 'change', title: 'Biến đổi gốc', main: [P(change.from, 'stem')], sub: change.sub });
        steps.push({ key: 'attach', title: 'Gắn đuôi', main: attachMain, sub: attachSub });
        steps.push({ key: 'result', title: 'Kết quả', main: (prefix ? [P(prefix)] : []).concat(split(result, finalBase)), sub: sp.label ? 'Mẫu: ' + sp.label : '' });
        result = prefix + result;
        return { ok: true, pos: pos, stem: stem, result: result, steps: steps, irregular: irr };
    }

    /* Tách kết quả thành phần gốc (giữ nguyên) + phần đuôi để tô màu */
    function split(result, stem) {
        var i = 0;
        while (i < result.length && i < stem.length && result[i] === stem[i]) i++;
        if (i === stem.length && i > 0 && result.charAt(i - 1) === stem.charAt(i - 1)) { /* gốc nguyên vẹn */ }
        var out = [];
        if (i > 0) out.push(P(result.slice(0, i), 'stem'));
        if (i < result.length) out.push(P(result.slice(i), 'end'));
        return out;
    }

    /* Chọn đuôi cho từ theo cấu hình 1 ngữ pháp: forms = {V, A, N, iss} */
    function formFor(forms, word, pos) {
        if (pos !== 'N' && isIss((word || '').replace(/\s+/g, '')) && forms.iss) return forms.iss;
        return forms[pos] || null;
    }

    var API = {
        conjugate: conjugate, parseSpec: parseSpec, guessPos: guessPos, formFor: formFor, isIss: isIss,
        irregularOf: irregularOf, hasBatchim: hasBatchim, attach: attach, IRR_NAME: IRR_NAME
    };
    if (typeof module !== 'undefined' && module.exports) module.exports = API;
    root.GrammarConjugator = API;
})(typeof window !== 'undefined' ? window : globalThis);
