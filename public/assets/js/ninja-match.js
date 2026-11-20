/* ninja-match.js — So khớp đáp án cho trò "Ninja phi tiêu" (duel.html).
   Dùng được cả trên trình duyệt (window.NinjaMatch) và Node (require) để test:
   node tests/ninja-match.test.js */
(function (root) {
    'use strict';
    const PUNCT = /[.,!?;:"'“”‘’()\[\]{}<>…~\-–—_/\\|*+=#@%^&`·。、，！？「」『』]/g;

    // Chuẩn hoá chung: NFC, chữ thường, dấu câu → khoảng trắng, gộp khoảng trắng
    function norm(s) {
        let t = String(s == null ? '' : s).normalize('NFC').toLowerCase().replace(PUNCT, ' ').replace(/\s+/g, ' ').trim();
        // Kiểu bỏ dấu cũ / mới (hoà ↔ hòa, thuý ↔ thúy): đưa về một kiểu (áp dụng cho cả 2 phía)
        const OLD = { 'à': 'ò', 'á': 'ó', 'ả': 'ỏ', 'ã': 'õ', 'ạ': 'ọ' };
        t = t.replace(/o([àáảãạ])(?=$|[^a-zăâêôơưđÀ-ỹ])/g, (m, v) => OLD[v] + 'a')
             .replace(/o([èéẻẽẹ])(?=$|[^a-zăâêôơưđÀ-ỹ])/g, (m, v) => ({ 'è': 'ò', 'é': 'ó', 'ẻ': 'ỏ', 'ẽ': 'õ', 'ẹ': 'ọ' })[v] + 'e')
             .replace(/u([ỳýỷỹỵ])(?=$|[^a-zăâêôơưđÀ-ỹ])/g, (m, v) => ({ 'ỳ': 'ù', 'ý': 'ú', 'ỷ': 'ủ', 'ỹ': 'ũ', 'ỵ': 'ụ' })[v] + 'y');
        return t;
    }
    // Bỏ dấu tiếng Việt (đ → d)
    function strip(s) { return String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D'); }
    function hasViMarks(s) { return /[À-ɏḀ-ỹ]/.test(String(s).normalize('NFC')); }

    // Các nghĩa chấp nhận được từ chuỗi nghĩa "giải tỏa, giải quyết; (sự) giúp đỡ"
    function viCandidates(meaning) {
        const raw = String(meaning || '');
        const set = new Set();
        const add = x => { const n = norm(x); if (n) { set.add(n); const k = n.replace(/^(sự|việc) /, ''); if (k.length >= 2) set.add(k); } };
        add(raw);
        const noParen = raw.replace(/\([^)]*\)/g, ' ');
        noParen.split(/[,;/]|\s+hoặc\s+/).forEach(add);
        // giữ nội dung trong ngoặc: "(sự) giúp đỡ" → "sự giúp đỡ"
        raw.replace(/[()]/g, ' ').split(/[,;/]/).forEach(add);
        return Array.from(set);
    }

    // Tiếng Hàn: bỏ hết khoảng trắng; "해소하다" chấp nhận cả "해소"
    function koKey(s) { return norm(s).replace(/\s+/g, ''); }
    function koCandidates(word) {
        const k = koKey(word), out = [k];
        if (/하다$/.test(k) && k.length >= 4) out.push(k.slice(0, -2));
        return out;
    }

    /* check(input, q, loose)
       q = { w: từ tiếng Hàn, m: nghĩa tiếng Việt, d: 'k' (hiện tiếng Hàn → nhập nghĩa Việt) | 'v' (hiện tiếng Việt → nhập tiếng Hàn) }
       loose = true: chấp nhận gõ tiếng Việt không dấu (chỉ khi người chơi gõ hoàn toàn không dấu
       và đáp án dài ≥ 4 ký tự, tránh nhầm "ban" ↔ "bán/bạn"). */
    function check(input, q, loose) {
        if (!q) return false;
        if (q.d === 'v') {
            const k = koKey(input);
            return !!k && koCandidates(q.w).includes(k);
        }
        const n = norm(input);
        if (!n) return false;
        const cands = viCandidates(q.m);
        if (cands.includes(n)) return true;
        if (loose && !hasViMarks(n)) {
            const sn = strip(n);
            return cands.some(c => c.replace(/\s/g, '').length >= 4 && strip(c) === sn);
        }
        return false;
    }

    const api = { norm, strip, viCandidates, koCandidates, check };
    if (typeof module === 'object' && module.exports) module.exports = api;
    else root.NinjaMatch = api;
})(typeof window !== 'undefined' ? window : this);
