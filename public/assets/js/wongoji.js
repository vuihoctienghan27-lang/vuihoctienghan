/* wongoji.js — Bộ xếp chữ 원고지 + kiểm tra nhanh + nhận xét theo tiêu chí chấm TOPIK II (câu 53)
   - layout(text): xếp văn bản vào ô theo quy tắc 원고지 của TOPIK
   - quickCheck(text, prompt): bắt lỗi hình thức (độ dài, đuôi câu, văn nói, ngôi thứ nhất, 띄어쓰기…),
     mỗi lỗi có thể kèm `fix` (chuỗi thay thế) để sửa bằng 1 cú bấm
   - assess(check, text, prompt): ước lượng điểm + nhận xét theo thang chấm chính thức câu 53
     (국립국제교육원 「TOPIK Ⅱ 쓰기 답안 작성 방법」: 내용 및 과제 수행 7 · 글의 전개 구조 7 · 언어 사용 8×2)
   - applyFixes(text, issues): áp dụng các bản sửa (từ cuối lên đầu, bỏ qua bản sửa chồng lấn)
   Dùng được cả trong trình duyệt (window.Wongoji) lẫn Node (module.exports) để kiểm thử. */
(function (root) {
    'use strict';

    var COLS = 25;

    var CLOSE_PUNCT = '.,?!)]}”’…';          // dấu không được đứng đầu dòng
    var STOP_PUNCT = '.,';                    // sau dấu chấm/phẩy không để trống ô
    var CLOSERS = '"\'”’)]}';                 // ngoặc đóng viết liền sau dấu chấm/phẩy (vd .’ ,” .)) vẫn không để trống ô sau đó

    function isSpace(ch) { return ch === ' ' || ch === '\t' || ch === '　'; }
    function isHangul(ch) { var c = ch.charCodeAt(0); return c >= 0xAC00 && c <= 0xD7A3; }
    function isDigit(ch) { return ch >= '0' && ch <= '9'; }
    function isLower(ch) { return ch >= 'a' && ch <= 'z'; }
    function isUpper(ch) { return ch >= 'A' && ch <= 'Z'; }
    function jong(ch) { return ch && isHangul(ch) ? (ch.charCodeAt(0) - 0xAC00) % 28 : -1; }

    /* Xếp chữ vào ô.
       Trả về { cells: [{text, src:[i...], kind}], map: [cellIndex | -1 cho mỗi ký tự], used, end, notes, cols } */
    function layout(text, cols) {
        cols = cols || COLS;
        text = (text || '').replace(/\r\n?/g, '\n');
        var cells = [];
        var map = new Array(text.length).fill(-1);
        var notes = { droppedLineStartSpace: 0, droppedSpaceAfterPunct: 0, attachedPunct: 0, doubleSpace: 0 };
        var pos = 0;
        var paraStart = true;
        var quoteOpen = { '"': false, "'": false };
        var lastDrawn = '';      // ký tự cuối cùng đã vẽ (bỏ qua ô trống)
        // true ngay sau dấu . hoặc , (kể cả khi tiếp theo là ngoặc đóng viết liền: .’ .” ."):
        // dấu cách ngay sau đó KHÔNG thành ô trống — dấu chấm/phẩy đã đóng vai trò khoảng cách.
        var afterStop = false;

        function put(str, srcIdx, kind) {
            cells[pos] = { text: str, src: srcIdx, kind: kind || '' };
            srcIdx.forEach(function (k) { map[k] = pos; });
            pos++;
        }
        function attachPrev(ch, i) {
            var p = pos - 1;
            while (p >= 0 && (!cells[p] || cells[p].kind === 'space' || cells[p].kind === 'indent')) p--;
            if (p < 0) return false;
            cells[p].text += ch;
            cells[p].src.push(i);
            cells[p].kind = 'shared';
            map[i] = p;
            notes.attachedPunct++;
            return true;
        }
        function atLineStart() { return pos % cols === 0 && pos > 0; }

        var i = 0;
        while (i < text.length) {
            var ch = text[i];

            if (ch === '\n') {
                if (pos % cols !== 0) pos = (Math.floor(pos / cols) + 1) * cols;
                paraStart = true;
                lastDrawn = '';
                afterStop = false;
                i++;
                continue;
            }

            if (paraStart) {
                // Đầu đoạn: lùi 1 ô. Nếu người viết đã gõ dấu cách thì dùng nó làm ô lùi đầu dòng.
                cells[pos] = { text: '', src: [], kind: 'indent' };
                pos++;
                paraStart = false;
                if (isSpace(ch)) {
                    map[i] = pos - 1;
                    cells[pos - 1].src.push(i);
                    i++;
                    while (i < text.length && isSpace(text[i])) i++;
                    continue;
                }
            }

            if (isSpace(ch)) {
                if (afterStop) { notes.droppedSpaceAfterPunct++; i++; continue; }
                if (pos % cols === 0) { notes.droppedLineStartSpace++; i++; continue; }
                if (cells[pos - 1] && cells[pos - 1].kind === 'space') notes.doubleSpace++;
                put('', [i], 'space');
                lastDrawn = ' ';
                i++;
                continue;
            }

            // Dấu ngoặc kép thẳng: phân biệt mở / đóng
            if (ch === '"' || ch === "'") {
                if (quoteOpen[ch]) {
                    quoteOpen[ch] = false;
                    // đóng ngoặc: giữ nguyên trạng thái afterStop (."  → vẫn không để trống ô phía sau)
                    if ((STOP_PUNCT.indexOf(lastDrawn) !== -1 && lastDrawn !== '') || atLineStart()) {
                        if (attachPrev(ch, i)) { lastDrawn = ch; i++; continue; }
                    }
                    put(ch, [i], 'punct');
                } else {
                    quoteOpen[ch] = true;
                    afterStop = false;
                    put(ch, [i], 'punct');
                }
                lastDrawn = ch;
                i++;
                continue;
            }
            if (ch === '“' || ch === '‘' || ch === '(' || ch === '[' || ch === '{') {
                afterStop = false;
                put(ch, [i], 'punct'); lastDrawn = ch; i++; continue;
            }

            if (CLOSE_PUNCT.indexOf(ch) !== -1) {
                var isStop = STOP_PUNCT.indexOf(ch) !== -1;
                // Ngoặc đóng ngay sau dấu chấm/phẩy → chung 1 ô; dấu câu rơi vào đầu dòng → dồn vào ô cuối dòng trên
                var attached = false;
                if (CLOSERS.indexOf(ch) !== -1 && STOP_PUNCT.indexOf(lastDrawn) !== -1 && lastDrawn !== '') attached = attachPrev(ch, i);
                if (!attached && atLineStart()) attached = attachPrev(ch, i);
                if (!attached) put(ch, [i], isStop ? 'dot' : 'punct');
                if (isStop) afterStop = true;
                else if (CLOSERS.indexOf(ch) === -1) afterStop = false;   // ? ! … : sau đó vẫn để trống 1 ô
                lastDrawn = ch;
                i++;
                continue;
            }

            afterStop = false;

            // Số: 2 chữ số / ô (dấu . hoặc , nằm giữa hai chữ số được tính như một ký tự của số)
            if (isDigit(ch)) {
                var j = i, run = [];
                while (j < text.length && (isDigit(text[j]) || ((text[j] === '.' || text[j] === ',') && isDigit(text[j - 1] || '') && isDigit(text[j + 1] || '')))) { run.push(j); j++; }
                for (var k = 0; k < run.length; k += 2) {
                    var idxs = run.slice(k, k + 2);
                    put(idxs.map(function (q) { return text[q]; }).join(''), idxs, 'num');
                }
                lastDrawn = text[j - 1];
                i = j;
                continue;
            }

            // Chữ Latinh thường: 2 chữ / ô; chữ in hoa: 1 chữ / ô
            if (isLower(ch)) {
                var a = i, lrun = [];
                while (a < text.length && isLower(text[a])) { lrun.push(a); a++; }
                for (var b = 0; b < lrun.length; b += 2) {
                    var li = lrun.slice(b, b + 2);
                    put(li.map(function (q) { return text[q]; }).join(''), li, 'latin');
                }
                lastDrawn = text[a - 1];
                i = a;
                continue;
            }

            put(ch, [i], isUpper(ch) ? 'latin' : '');
            lastDrawn = ch;
            i++;
        }

        // Số ô đã dùng = vị trí ô có nội dung cuối cùng + 1
        var used = 0;
        for (var c = cells.length - 1; c >= 0; c--) {
            if (cells[c] && cells[c].kind !== 'space' && cells[c].kind !== 'indent') { used = c + 1; break; }
        }
        return { cells: cells, map: map, used: used, end: pos, notes: notes, cols: cols };
    }

    /* ================= Kiểm tra nhanh ================= */
    function findAll(text, re) {
        var out = [], m;
        var g = new RegExp(re.source, re.flags.indexOf('g') === -1 ? re.flags + 'g' : re.flags);
        while ((m = g.exec(text)) !== null) {
            out.push({ start: m.index, end: m.index + m[0].length, match: m[0], groups: m });
            if (m[0].length === 0) g.lastIndex++;
        }
        return out;
    }

    function splitSentences(text) {
        // Che dấu chấm/phẩy thập phân (15.5%) để không bị coi là hết câu; độ dài chuỗi giữ nguyên nên chỉ số vẫn khớp
        var masked = text.replace(/(\d)\.(?=\d)/g, '$1․');
        var out = [], re = /[^.?!\n]+([.?!]+["'”’)]?)?/g, m;
        while ((m = re.exec(masked)) !== null) {
            var raw = text.substr(m.index, m[0].length);
            var lead = raw.length - raw.replace(/^\s+/, '').length;
            var s = raw.trim();
            if (!s) continue;
            out.push({ text: s, start: m.index + lead, end: m.index + lead + s.length, punct: m[1] || '' });
        }
        return out;
    }

    var H = '가-힣';
    var NB = '(?<![' + H + '])';   // không dính chữ Hàn phía trước
    var NA = '(?![' + H + '])';    // không dính chữ Hàn phía sau

    // Văn nói → văn viết (có gợi ý thay thế để sửa 1 chạm)
    var SPOKEN = {
        '근데': '그런데', '되게': '매우', '엄청': '매우', '완전': '매우', '진짜': '매우', '정말로': '매우', '무지': '매우',
        '너무': '매우', '제일': '가장', '좀': '조금', '이건': '이것은', '그건': '그것은', '저건': '저것은',
        '이게': '이것이', '그게': '그것이', '이걸': '이것을', '그걸': '그것을', '건': '것은', '걸': '것을',
        '거다': '것이다', '거예요': '것이다', '거야': '것이다', '그래서': '따라서', '하지만': '그러나',
        '이런': '이러한', '그런': '그러한', '요즘': '최근', '애들': '아이들', '짱': '', '뭐': ''
    };
    var SPOKEN_RE = new RegExp(NB + '(' + Object.keys(SPOKEN).sort(function (a, b) { return b.length - a.length; }).join('|') + ')' + NA);
    var UNITS = '%명배년개월회시간세원만억가구점살번개국곳권대';

    var WORD_RULES = [
        { re: SPOKEN_RE, type: 'style',
          fix: function (m) { return SPOKEN[m] || null; },
          msg: function (m) {
              var to = SPOKEN[m];
              return '“' + m + '” là văn nói / dạng rút gọn. Câu 53 dùng văn viết' + (to ? ': nên viết “' + to + '”.' : '.');
          } },
        { re: new RegExp(NB + '(저는|제가|저의|저도|저희|나는|내가|나의|나도|우리는|우리가|우리의|우리)' + NA), type: 'content',
          msg: function (m) { return '“' + m + '”: câu 53 là văn mô tả khách quan, không dùng ngôi thứ nhất.'; } },
        { re: /(제|내) 생각(에는|에|으로는)|것 ?같다|생각(한다|해|합니다)|라고 생각|고 본다/, type: 'content',
          msg: function (m) { return '“' + m + '”: câu 53 chỉ trình bày thông tin của đề, không nêu ý kiến cá nhân hay phỏng đoán chủ quan. Dự báo thì dùng ~(으)ㄹ 것으로 전망된다/예상된다.'; } },
        { re: /(있|없|많|좋|크|작|높|낮|같|짧|넓|좁|어렵|쉽)는다/, type: 'grammar',
          fix: function (m) { return m.replace('는다', '다'); },
          msg: function (m) { return '“' + m + '”: tính từ và 있다/없다 không chia -는다. Giữ nguyên dạng -다 (vd. 많다, 높다, 있다).'; } },
        { re: /읍니다/, type: 'spelling', fix: function () { return '습니다'; },
          msg: function () { return '“-읍니다” là chính tả cũ, nay viết -습니다 (và câu 53 cũng không dùng đuôi -습니다).'; } },
        { re: /([가-힣])이였/, type: 'spelling', fix: function (m) { return m[0] + '이었'; },
          msg: function (m) { return '“' + m + '”: viết đúng là “' + m[0] + '이었-” (danh từ có patchim + 이었다; không có patchim + 였다).'; } },
        { re: /됬/, type: 'spelling', fix: function () { return '됐'; }, msg: function () { return '“됬” sai chính tả → “됐” (= 되었).'; } },
        { re: /몇일/, type: 'spelling', fix: function () { return '며칠'; }, msg: function () { return '“몇일” sai chính tả → “며칠”.'; } },
        { re: /갯수/, type: 'spelling', fix: function () { return '개수'; }, msg: function () { return '“갯수” sai chính tả → “개수”.'; } },
        { re: /(증가|감소|상승|하락)되(었|는|고|며)/, type: 'style',
          fix: function (m) { return m.replace(/되었/, '하였').replace(/되(?=[는고며어])/, '하'); },
          msg: function (m) { return '“' + m + '”: ' + m.slice(0, 2) + ' tự nó đã là nội động từ, viết “' + m.slice(0, 2) + '하였다/' + m.slice(0, 2) + '했다” tự nhiên hơn.'; } },
        // Số thập phân viết bằng dấu phẩy (thói quen tiếng Việt): 15,5% → 15.5%
        { re: /(?<![\d,])(\d+),(\d{1,2})(?!\d)/, type: 'spelling',
          fix: function (m) { return m.replace(',', '.'); },
          msg: function (m) { return '“' + m + '”: số thập phân trong tiếng Hàn dùng dấu chấm → “' + m.replace(',', '.') + '”. Dấu phẩy chỉ dùng tách hàng nghìn (1,000).'; } },
        { re: /(\d) +%/, type: 'spacing', fix: function (m) { return m.replace(/ +/, ''); },
          msg: function () { return 'Ký hiệu % viết liền với số (vd. 20%).'; } },
        { re: new RegExp('[0-9' + UNITS + '](이상|이하|미만|정도|동안|가량|이후|이전)' + NA), type: 'spacing',
          fix: function (m) { return m[0] + ' ' + m.slice(1); },
          msg: function (m) { return '띄어쓰기: “' + m + '” → “' + m[0] + ' ' + m.slice(1) + '” (vd. 20% 이상, 10년 동안).'; } },
        { re: /에(대한|대해|대하여|따라|따른|비해|비하여|의해|의한|관한|관해|불과|달해|달하|이르)/, type: 'spacing',
          fix: function (m) { return '에 ' + m.slice(1); },
          msg: function (m) { return '띄어쓰기: “' + m + '” → “에 ' + m.slice(1) + '”.'; } },
        { re: /([가-힣])(때문)/, type: 'spacing',
          fix: function (m) { return m[0] + ' 때문'; },
          msg: function (m) { return '띄어쓰기: “' + m + '” → “' + m[0] + ' 때문”.'; } },
        { re: /([가-힣])고(있|싶)/, type: 'spacing',
          fix: function (m) { return m.slice(0, 2) + ' ' + m.slice(2); },
          msg: function (m) { return '띄어쓰기: “' + m + '” → “' + m.slice(0, 2) + ' ' + m.slice(2) + '” (động từ phụ trợ viết cách).'; } },
        { re: /것같/, type: 'spacing', fix: function () { return '것 같'; },
          msg: function () { return '띄어쓰기: “것같-” → “것 같-”.'; } },
        { re: / {2,}/, type: 'spacing', fix: function () { return ' '; },
          msg: function () { return 'Có 2 dấu cách liền nhau — trên 원고지 mỗi chỗ chỉ để trống 1 ô.'; } },
        { re: / +[.,?!]/, type: 'spacing', fix: function (m) { return m.trim(); },
          msg: function () { return 'Có dấu cách trước dấu câu — dấu câu viết liền với chữ trước nó.'; } }
    ];

    // Lỗi "ㄹ수 있다", "~는것", "할때": cần xét patchim của âm tiết trước
    function batchimRules(text) {
        var out = [];
        findAll(text, /([가-힣])수 ?(있|없)/).forEach(function (r) {
            var prev = r.match[0];
            if (jong(prev) === 8) {
                out.push({ start: r.start, end: r.end, type: 'spacing', fix: prev + ' 수 ' + r.match.slice(-1),
                    msg: '띄어쓰기: “' + r.match + '” → “' + prev + ' 수 ' + r.match.slice(-1) + '…” (-(으)ㄹ 수 있다/없다).' });
            }
        });
        findAll(text, / 수(있|없)/).forEach(function (r) {
            out.push({ start: r.start + 1, end: r.end, type: 'spacing', fix: '수 ' + r.match.slice(-1),
                msg: '띄어쓰기: “' + r.match.trim() + '” → “수 ' + r.match.slice(-1) + '…”.' });
        });
        findAll(text, /([가-힣])(것)/).forEach(function (r) {
            var prev = r.match[0], jg = jong(prev);
            if ((jg === 4 || jg === 8) && '그이저무'.indexOf(prev) === -1) {
                out.push({ start: r.start, end: r.end, type: 'spacing', fix: prev + ' 것',
                    msg: '띄어쓰기: “' + r.match + '” → “' + prev + ' 것” (danh từ phụ thuộc 것 viết cách).' });
            }
        });
        findAll(text, /([가-힣])때/).forEach(function (r) {
            var prev = r.match[0];
            if (jong(prev) === 8 && '그이저'.indexOf(prev) === -1) {
                out.push({ start: r.start, end: r.end, type: 'spacing', fix: prev + ' 때',
                    msg: '띄어쓰기: “' + r.match + '” → “' + prev + ' 때” (-(으)ㄹ 때).' });
            }
        });
        return out;
    }

    // Đổi đuôi -습니다 / -아요 sang -다 (chỉ những dạng chắc chắn đổi đúng)
    var ENDING_FIXES = [
        [/(았|었|였|했|겠)습니다$/, '$1다'], [/(았|었|였|했|겠)어요$/, '$1다'],
        [/(있|없)습니다$/, '$1다'], [/(있|없)어요$/, '$1다'],
        [/합니다$/, '한다'], [/해요$/, '한다'], [/됩니다$/, '된다'], [/돼요$/, '된다'],
        [/입니다$/, '이다'], [/(이에요|예요)$/, '이다'],
        [/(많|높|낮|적|크|작|좋|같|길|넓|좁)습니다$/, '$1다'],
        [/(많|높|낮|적|좋|같|넓|좁)아요$/, '$1다'], [/(많|높|낮|적|좋|같|넓|좁)어요$/, '$1다']
    ];
    function endingFix(body) {
        for (var i = 0; i < ENDING_FIXES.length; i++) {
            var m = body.match(ENDING_FIXES[i][0]);
            if (m) return { from: m[0], to: m[0].replace(ENDING_FIXES[i][0], ENDING_FIXES[i][1]) };
        }
        return null;
    }

    var MARKERS = ['먼저', '우선', '첫째', '둘째', '다음으로', '또한', '게다가', '뿐만 아니라', '반면', '그러나', '한편',
        '이에 비해', '이와 달리', '그 결과', '따라서', '그러므로', '이처럼', '이와 같이', '이를 통해', '이러한', '특히',
        '그 뒤를 이어', '그 다음으로', '마지막으로', '결론적으로', '그리고'];
    var PATTERNS = [
        [/에 따르면/, '~에 따르면'], [/(을|를) 대상으로/, '~을/를 대상으로'], [/것으로 (나타났|조사되었|조사됐|밝혀졌|드러났)/, '~(으)ㄴ 것으로 나타났다'],
        [/(으로|로) (증가|감소|늘어|줄어|상승|하락)/, 'A에서 B(으)로 증가/감소하다'], [/에 비해|에 비하여/, '~에 비해'],
        [/반면/, '~(으)ㄴ 반면'], [/(으로|로) 인해|(으로|로) 인하여/, '~(으)로 인해'], [/기 때문이다/, '~기 때문이다'],
        [/에 (달하|달했|이르|이르렀|그쳤|불과)/, '~에 달하다/이르다/불과하다'], [/(을|를) 차지/, '~을/를 차지하다'],
        [/순으로/, '~ 순으로'], [/(ㄹ|을|할|될|날) 것으로 (전망|예상|보인|예측)/, '~(으)ㄹ 것으로 전망된다'],
        [/추세/, '~는 추세이다'], [/(을|를) 알 수 있다/, '~을/를 알 수 있다'], [/(배|절반)/, 'so sánh bội số (두 배, 절반)'],
        [/(을|를) 들 수 있다/, '~을/를 들 수 있다'], [/가장 (높|많|낮|적|크)/, '가장 높다/많다']
    ];

    function quickCheck(text, prompt) {
        text = (text || '').replace(/\r\n?/g, '\n');
        var L = layout(text);
        var issues = [];
        var info = [];

        // 1) Độ dài (tính theo số ô 원고지, gồm cả ô trống)
        var n = L.used;
        var length = { count: n, status: n < 200 ? 'short' : (n > 300 ? 'long' : 'ok') };

        if (!text.trim()) return { layout: L, length: length, issues: [], info: [], structure: [], coverage: null, termsMissing: [], sentences: [], markers: [], patterns: [] };

        // 2) Tiêu đề
        var firstLine = text.split('\n')[0].trim();
        var titleEnd = -1;
        if (text.indexOf('\n') !== -1 && firstLine.length > 0 && firstLine.length <= 30 && !/[.?!]["'”’]?$/.test(firstLine) && !/다$/.test(firstLine)) {
            var fs = text.indexOf(firstLine);
            titleEnd = fs + firstLine.length;
            issues.push({ start: fs, end: titleEnd, type: 'content', fix: '', manual: true, fixLabel: 'Xoá tiêu đề',
                msg: 'Dòng đầu có vẻ là tiêu đề. Đề câu 53 ghi rõ “글의 제목을 쓰지 마십시오” — không viết tiêu đề.' });
        }

        // 2b) Viết kiểu gạch đầu dòng (개조식) — tài liệu chấm chính thức yêu cầu không viết 개조식
        findAll(text, /^[ \t]*([-•·*▶]|\d+[.)](?!\d)|[①-⑩])/m).forEach(function (r) {
            issues.push({ start: r.start, end: r.end, type: 'content', msg: 'Viết kiểu gạch đầu dòng / đánh số (개조식). Câu 53 phải viết thành đoạn văn liền mạch.' });
        });

        // 2c) Chép câu chỉ thị của đề
        findAll(text, /200 ?~ ?300 ?자|쓰십시오|글의 제목|다음을 참고하여/).forEach(function (r) {
            issues.push({ start: r.start, end: r.end, type: 'content', msg: 'Có vẻ đang chép câu chỉ thị của đề. Không chép đề — chỉ viết nội dung trả lời.' });
        });

        // 3) Đuôi câu: phải là -다 (한다체); câu thiếu dấu chấm
        var sentences = splitSentences(text);
        var politeCount = 0;
        sentences.forEach(function (s) {
            if (s.end <= titleEnd) return;   // dòng tiêu đề đã báo ở trên
            var body = s.text.replace(/[.?!"'”’)\s]+$/, '');
            var tailStart = s.start + Math.max(0, body.length - 3);
            var tailEnd = s.start + body.length;
            var ef = endingFix(body);
            if (/요$/.test(body) || /니다$/.test(body)) {
                politeCount++;
                var polite = /요$/.test(body);
                var it = { start: tailStart, end: tailEnd, type: 'style',
                    msg: polite ? 'Đuôi “-아/어요” (해요체) không dùng trong câu 53 — tài liệu chấm chính thức ghi rõ bị trừ điểm. Đổi sang đuôi -다.'
                                : 'Đuôi “-ㅂ/습니다” không dùng trong câu 53 — tài liệu chấm chính thức ghi rõ bị trừ điểm. Đổi sang đuôi -다.' };
                if (ef) { it.start = tailEnd - ef.from.length; it.fix = ef.to; }
                issues.push(it);
            } else if (/까$/.test(body) || s.punct.indexOf('?') !== -1) {
                issues.push({ start: s.start, end: tailEnd, type: 'style', msg: 'Câu hỏi không phù hợp với văn mô tả số liệu. Viết thành câu trần thuật kết thúc bằng -다.' });
            } else if (/(음|함|됨|임)$/.test(body)) {
                issues.push({ start: tailEnd - 1, end: tailEnd, type: 'grammar', msg: 'Câu kết thúc bằng danh từ hoá -음/-함 (kiểu ghi chú, 개조식). Viết trọn câu với đuôi -다.' });
            } else if (!/다$/.test(body)) {
                issues.push({ start: tailStart, end: tailEnd, type: 'grammar', msg: 'Câu này không kết thúc bằng đuôi -다. Câu 53 phải viết trọn câu theo 한다체 (-ㄴ다/-는다/-다/-였다).' });
            }
            if (!s.punct && /다$/.test(body)) {
                issues.push({ start: tailEnd - 1, end: tailEnd, type: 'spelling', fix: body.slice(-1) + '.', msg: 'Thiếu dấu chấm cuối câu.' });
            }
        });

        // 4) Từ ngữ / ngữ pháp / chính tả / 띄어쓰기
        WORD_RULES.forEach(function (rule) {
            findAll(text, rule.re).forEach(function (r) {
                var it = { start: r.start, end: r.end, type: rule.type, msg: rule.msg(r.match) };
                if (rule.fix) { var f = rule.fix(r.match); if (f != null && f !== r.match) it.fix = f; }
                issues.push(it);
            });
        });
        batchimRules(text).forEach(function (x) { issues.push(x); });

        // Gộp lỗi trùng: cùng vị trí → giữ 1 (ưu tiên lỗi có bản sửa), cùng thông báo ở cùng chỗ → bỏ
        var byKey = {};
        issues.forEach(function (x) {
            var k = x.start + ':' + x.end + ':' + x.type;
            var prev = byKey[k];
            if (!prev) { byKey[k] = x; return; }
            if (prev.msg !== x.msg && prev.msg.indexOf(x.msg) === -1) prev.msg += ' · ' + x.msg;
            if (prev.fix == null && x.fix != null) prev.fix = x.fix;
        });
        issues = Object.keys(byKey).map(function (k) { return byKey[k]; })
            .sort(function (a, b) { return a.start - b.start || a.end - b.end; });

        // 5) Ghi chú về 원고지 (không phải lỗi)
        if (L.notes.droppedSpaceAfterPunct) info.push('Trên 원고지, sau dấu chấm/dấu phẩy (kể cả .’ .”) không để trống ô — ' + L.notes.droppedSpaceAfterPunct + ' dấu cách đó không được tính vào số ô.');
        if (L.notes.droppedLineStartSpace) info.push('Dấu cách rơi vào đầu dòng thì không viết ra (bỏ ô trống ở đầu dòng).');
        if (L.notes.attachedPunct) info.push('Dấu câu rơi vào đầu dòng hoặc ngoặc đóng sau dấu chấm được viết chung vào 1 ô (đúng quy tắc 원고지).');

        // 6) Bố cục
        var structure = [
            { key: 'intro', label: 'Mở bài: giới thiệu cuộc khảo sát (cơ quan/đối tượng/chủ đề)', ok: /조사|대상으로|에 따르면|결과|자료/.test(text) },
            { key: 'body', label: 'Thân bài: mô tả số liệu, xu hướng tăng/giảm, so sánh', ok: /(증가|감소|늘어|늘었|줄어|줄었|상승|하락|높|낮|차지|많|적|배)/.test(text) && /[0-9]/.test(text) },
            { key: 'end', label: 'Kết bài: tóm lại / nguyên nhân / triển vọng', ok: /(전망|예상|기대|이처럼|이와 같이|이를 통해|이러한|따라서|앞으로|알 수 있다)/.test(text) }
        ];

        // 7) Bao phủ số liệu của đề
        var coverage = null;
        if (prompt && prompt.keyNumbers && prompt.keyNumbers.length) {
            var plain = text.replace(/,(?=\d{3})/g, '').replace(/(\d),(\d{1,2})(?!\d)/g, '$1.$2');
            var miss = prompt.keyNumbers.filter(function (k) { return plain.indexOf(String(k).replace(/,/g, '')) === -1; });
            coverage = { total: prompt.keyNumbers.length, missing: miss };
        }
        var termsMissing = [];
        if (prompt && prompt.keyTerms) {
            termsMissing = prompt.keyTerms.filter(function (t) {
                return !t.split('|').some(function (alt) { return text.indexOf(alt) !== -1; });
            }).map(function (t) { return t.split('|')[0]; });
        }

        var markers = MARKERS.filter(function (m) { return new RegExp(NB + m.replace(/ /g, ' ?')).test(text); });
        var patterns = PATTERNS.filter(function (p) { return p[0].test(text); }).map(function (p) { return p[1]; });

        return { layout: L, length: length, issues: issues, info: info, structure: structure, coverage: coverage,
                 termsMissing: termsMissing, sentences: sentences, politeCount: politeCount, markers: markers, patterns: patterns };
    }

    /* ================= Nhận xét theo tiêu chí chấm (ước lượng, không cần AI) =================
       Thang chính thức câu 53 (국립국제교육원):
         내용 및 과제 수행 7: 상 6–7 · 중 3–5 · 하 0–2
         글의 전개 구조   7: 상 6–7 · 중 3–5 · 하 0–2
         언어 사용  8×2=16: 상 7–8 · 중 4–6 · 하 0–3 (×2) */
    function band7(v) { return v >= 6 ? '상' : v >= 3 ? '중' : '하'; }
    function band8(v) { return v >= 7 ? '상' : v >= 4 ? '중' : '하'; }
    function clampN(v, max) { return Math.max(0, Math.min(max, Math.round(v))); }

    function assess(check, text, prompt) {
        text = text || '';
        if (!check || !text.trim()) return null;
        var n = check.length.count;
        var byType = { grammar: 0, spelling: 0, spacing: 0, style: 0, content: 0 };
        check.issues.forEach(function (x) { if (byType[x.type] != null) byType[x.type]++; });
        var st = {}; check.structure.forEach(function (x) { st[x.key] = x.ok; });
        var sentCount = check.sentences.length;
        var hasTitle = check.issues.some(function (x) { return /tiêu đề/.test(x.msg); });
        var bullet = check.issues.some(function (x) { return /개조식/.test(x.msg); });
        var copied = check.issues.some(function (x) { return /chép câu chỉ thị/.test(x.msg); });
        var subjective = check.issues.filter(function (x) { return x.type === 'content' && /ngôi thứ nhất|ý kiến cá nhân/.test(x.msg); }).length;

        /* --- 1. 내용 및 과제 수행 (7) --- */
        var c = 7, cn = [];
        if (n < 100) { c = Math.min(c, 2); cn.push([false, 'Bài mới ' + n + ' ô — quá ngắn so với yêu cầu 200–300 ký tự, chưa thể hiện đủ nội dung của đề.']); }
        else if (n < 150) { c = Math.min(c, 3); cn.push([false, 'Bài mới ' + n + ' ô (dưới 150) — thiếu nhiều nội dung; cần đạt tối thiểu 200 ô.']); }
        else if (n < 200) { c -= 2; cn.push([false, 'Bài ' + n + ' ô, còn thiếu ' + (200 - n) + ' ô để đạt 200 — chưa đáp ứng yêu cầu độ dài của đề (200~300자).']); }
        else if (n > 300) { c -= 1; cn.push([false, 'Bài ' + n + ' ô, vượt quá 300 — cần cô đọng lại.']); }
        else cn.push([true, 'Độ dài ' + n + ' ô, nằm trong khoảng 200–300.']);
        if (check.coverage && check.coverage.total) {
            var got = check.coverage.total - check.coverage.missing.length, ratio = got / check.coverage.total;
            if (ratio >= 0.9) cn.push([true, 'Nêu đủ số liệu quan trọng của đề (' + got + '/' + check.coverage.total + ').']);
            else {
                c -= ratio >= 0.7 ? 1 : ratio >= 0.4 ? 2 : 3;
                cn.push([false, 'Mới nêu ' + got + '/' + check.coverage.total + ' số liệu của đề; còn thiếu ' + check.coverage.missing.slice(0, 6).join(', ') + '. Giám khảo xét “주어진 과제를 충실히 수행하였는가?” — phải trình bày đủ thông tin được cho.']);
            }
        }
        if (check.termsMissing && check.termsMissing.length) {
            c -= Math.min(2, check.termsMissing.length);
            cn.push([false, 'Chưa nhắc tới ý: ' + check.termsMissing.join(', ') + ' (nguyên nhân / triển vọng / phân loại có trong đề).']);
        } else if (prompt && prompt.keyTerms && prompt.keyTerms.length) cn.push([true, 'Đã đề cập các ý chính trong đề (nguyên nhân, triển vọng…).']);
        if (!st.intro) { c -= 1; cn.push([false, 'Chưa giới thiệu cuộc khảo sát (cơ quan nào, khảo sát ai, về vấn đề gì).']); }
        if (subjective) { c -= subjective >= 3 ? 2 : 1; cn.push([false, 'Có ngôi thứ nhất / ý kiến cá nhân — câu 53 chỉ trình bày khách quan dữ liệu của đề, không thêm chủ kiến.']); }
        if (hasTitle) { c -= 1; cn.push([false, 'Có viết tiêu đề dù đề yêu cầu không viết.']); }
        if (copied) { c -= 2; cn.push([false, 'Có chép lại câu chỉ thị của đề.']); }
        c = clampN(c, 7);

        /* --- 2. 글의 전개 구조 (7) --- */
        var s = 7, sn = [];
        var parts = (st.intro ? 1 : 0) + (st.body ? 1 : 0) + (st.end ? 1 : 0);
        if (parts === 3) sn.push([true, 'Có đủ bố cục 도입 – 전개 – 마무리 (mở – thân – kết).']);
        else {
            if (!st.body) s -= 2;
            if (!st.intro) s -= 1;
            if (!st.end) s -= 1;
            sn.push([false, 'Bố cục chưa đủ: ' + [!st.intro && 'thiếu mở bài', !st.body && 'thiếu phần mô tả số liệu', !st.end && 'thiếu câu kết (이처럼… / 앞으로 …(으)ㄹ 것으로 전망된다)'].filter(Boolean).join(', ') + '.']);
        }
        var mk = check.markers || [];
        if (mk.length >= 3) sn.push([true, 'Dùng từ nối (담화 표지) để liên kết ý: ' + mk.slice(0, 6).join(', ') + '.']);
        else {
            s -= mk.length === 0 ? 3 : mk.length === 1 ? 2 : 1;
            sn.push([false, (mk.length ? 'Mới dùng ' + mk.length + ' từ nối (' + mk.join(', ') + ')' : 'Chưa dùng từ nối (담화 표지)') + '. Nên dùng: 먼저, 또한, 반면, 한편, 그 결과, 이처럼, 따라서… để nối các ý cho mạch lạc.']);
        }
        if (n < 150) { s -= 2; sn.push([false, 'Bài quá ngắn nên chưa triển khai được đủ các phần của đoạn văn.']); }
        if (bullet) { s -= 3; sn.push([false, 'Viết kiểu gạch đầu dòng (개조식) — tài liệu chấm chính thức yêu cầu viết thành đoạn văn.']); }
        if (sentCount && n >= 150) {
            var avg = n / sentCount;
            if (sentCount < 3) { s -= 1; sn.push([false, 'Cả bài chỉ có ' + sentCount + ' câu — câu quá dài, khó theo dõi. Nên tách thành 4–6 câu.']); }
            else if (avg > 110) { s -= 1; sn.push([false, 'Câu trung bình dài ~' + Math.round(avg) + ' ô — nên tách bớt cho rõ ý.']); }
            else if (sentCount > 10) { s -= 1; sn.push([false, 'Có ' + sentCount + ' câu, nhiều câu ngắn rời rạc — nên nối ý bằng -고, -(으)며, -(으)나.']); }
            else sn.push([true, 'Số câu (' + sentCount + ') và độ dài câu hợp lý.']);
        }
        s = clampN(s, 7);

        /* --- 3. 언어 사용 (8 × 2) --- */
        var l = 8, ln = [];
        if (check.politeCount) {
            l = Math.min(l, check.politeCount >= sentCount / 2 ? 4 : 5);
            ln.push([false, check.politeCount + ' câu dùng đuôi -습니다/-아요. Theo tài liệu chấm chính thức, dùng các đuôi này là bị trừ điểm — câu 53 phải viết đuôi -다 (한다체).']);
        } else if (sentCount) ln.push([true, 'Đuôi câu đúng văn viết -다 (한다체).']);
        var gram = byType.grammar + byType.spelling;
        if (gram) { l -= Math.min(3, gram); ln.push([false, gram + ' lỗi ngữ pháp/chính tả (문법·맞춤법) — mỗi lỗi làm giảm độ chính xác.']); }
        if (byType.spacing) { l -= Math.min(2, Math.ceil(byType.spacing / 2)); ln.push([false, byType.spacing + ' lỗi 띄어쓰기.']); }
        if (byType.style) {
            var spoken = check.issues.filter(function (x) { return x.type === 'style' && /văn nói|rút gọn|nội động từ/.test(x.msg); }).length;
            if (spoken) { l -= Math.min(2, Math.ceil(spoken / 2)); ln.push([false, spoken + ' chỗ dùng văn nói / từ chưa trang trọng (구어적 표현) — cần thay bằng văn viết.']); }
        }
        if (!gram && !byType.spacing) ln.push([true, 'Không thấy lỗi ngữ pháp, chính tả, 띄어쓰기 phổ biến (kiểm tra tự động).']);
        var pt = check.patterns || [];
        if (pt.length >= 5) ln.push([true, 'Dùng đa dạng cấu trúc trung–cao cấp: ' + pt.slice(0, 5).join(', ') + '.']);
        else {
            l -= pt.length >= 3 ? 1 : 2;
            ln.push([false, 'Cấu trúc câu còn đơn điệu' + (pt.length ? ' (mới có: ' + pt.join(', ') + ')' : '') + '. Thử thêm: ~에 따르면, ~(으)ㄴ 것으로 나타났다, ~에 비해, ~(으)로 인해, ~에 달하다, ~(으)ㄹ 것으로 전망된다.']);
        }
        // Bài ngắn: lượng ngôn ngữ ít, chưa đủ cơ sở cho mức 상
        if (n < 150) l = Math.min(l, 4);
        else if (n < 200) l = Math.min(l, 6);
        l = clampN(l, 8);

        var total = c + s + l * 2;
        var lvl = total >= 24 ? '상' : total >= 15 ? '중' : '하';
        var weakest = [['nội dung', c / 7], ['bố cục', s / 7], ['ngôn ngữ', l / 8]].sort(function (a, b) { return a[1] - b[1]; })[0][0];
        var summary = 'Ước lượng khoảng ' + total + '/30 điểm (mức ' + lvl + '). ' +
            (total >= 24 ? 'Bài đáp ứng tốt yêu cầu câu 53; hãy rà lại các lỗi nhỏ để đạt điểm tối đa.'
             : 'Phần cần cải thiện nhất là ' + weakest + ' — xem các gạch đầu dòng ⚠️ bên dưới.');

        return {
            total: total, level: lvl, summary: summary,
            criteria: [
                { key: 'content', name: '내용 및 과제 수행', vi: 'Nội dung & thực hiện yêu cầu', score: c, max: 7, band: band7(c), notes: cn,
                  ask: ['주어진 과제를 충실히 수행하였는가?', '주제와 관련된 내용으로 구성하였는가?', '주어진 내용을 풍부하고 다양하게 표현하였는가?'] },
                { key: 'structure', name: '글의 전개 구조', vi: 'Bố cục, mạch văn', score: s, max: 7, band: band7(s), notes: sn,
                  ask: ['글의 구성이 명확하고 논리적인가?', '글의 내용에 따라 단락 구성이 잘 이루어졌는가?', '논리 전개에 도움이 되는 담화 표지를 적절하게 사용하였는가?'] },
                { key: 'language', name: '언어 사용', vi: 'Sử dụng ngôn ngữ', score: l * 2, sub: l, max: 16, band: band8(l), notes: ln,
                  ask: ['문법과 어휘를 다양하고 풍부하게 사용하였는가?', '문법, 어휘, 맞춤법 등의 사용이 정확한가?', '글의 목적과 기능에 따라 격식에 맞게 글을 썼는가?'] }
            ]
        };
    }

    /* Áp dụng các bản sửa: từ cuối lên đầu, bỏ qua bản sửa chồng lấn → trả về văn bản mới + số chỗ đã sửa */
    function applyFixes(text, issues, opts) {
        opts = opts || {};
        var list = issues.filter(function (x) { return x.fix != null && !(opts.auto && x.manual); }).slice().sort(function (a, b) { return b.start - a.start || b.end - a.end; });
        var out = text, lastStart = Infinity, count = 0;
        list.forEach(function (x) {
            if (x.end > lastStart) return;                       // chồng lấn với bản sửa đã áp dụng
            if (x.start < 0 || x.end > out.length) return;
            out = out.slice(0, x.start) + x.fix + out.slice(x.end);
            lastStart = x.start;
            count++;
        });
        return { text: out, count: count };
    }

    var api = { COLS: COLS, layout: layout, quickCheck: quickCheck, splitSentences: splitSentences, assess: assess, applyFixes: applyFixes };
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    else root.Wongoji = api;
})(typeof window !== 'undefined' ? window : this);
