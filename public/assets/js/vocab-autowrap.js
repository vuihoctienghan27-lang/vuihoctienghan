(function () {
    'use strict';

    window.initAutoVocab = function() {
        if (!window.AutoVocabDict) {
            console.warn("AutoVocabDict chưa được tải.");
            return;
        }

        const dict = window.AutoVocabDict;
        let allTokens = [];

        dict.forEach(item => {
            let words = [item.base];
            if (item.variants && item.variants.length > 0) {
                words = words.concat(item.variants);
            } else if (item.base.endsWith('하다')) {
                const r = item.base.slice(0, -2); // root: e.g. 원 from 원하다
                words.push(
                    // ── Hiện tại / Kết nối ───────────────────────────────────
                    r+'하는', r+'할', r+'하고', r+'하기',
                    r+'하며', r+'하면', r+'하면서', r+'하여',
                    r+'하여서', r+'하니', r+'하니까', r+'하지',
                    r+'하지만', r+'하지 않다', r+'하지 않는', r+'하지 않아',
                    r+'하지만', r+'하도록', r+'하려', r+'하려고',
                    r+'하러', r+'하거나', r+'하거든', r+'하더라도',
                    r+'하든', r+'하든지', r+'하더니', r+'하다가',
                    r+'하다면', r+'하다 보면', r+'하자마자',
                    // ── Hoàn thành (quá khứ) ─────────────────────────────────
                    r+'해', r+'해서', r+'했다', r+'했고', r+'했는데',
                    r+'했으며', r+'했으면', r+'했으니', r+'했으나',
                    r+'했지만', r+'했더니', r+'해야', r+'해야만',
                    r+'해도', r+'해야 한다', r+'해야 하는',
                    // ── Kính ngữ (honorific -시-) ─────────────────────────────
                    r+'하시다', r+'하시는', r+'하실', r+'하셔서',
                    r+'하시면', r+'하시고', r+'하시며', r+'하시니',
                    r+'하십시오', r+'하세요', r+'하셨다', r+'하셨으며',
                    r+'하셨으니', r+'하셨는데', r+'하셨고', r+'하신',
                    r+'하셨으면', r+'하시기',
                    // ── Thể bị động / Danh từ hóa ───────────────────────────
                    r+'됩니다', r+'됩니까', r+'되다', r+'되는', r+'됩니다',
                    r+'된', r+'될', r+'되어', r+'되어서', r+'되었다',
                    r+'되고', r+'되면', r+'되면서', r+'되니', r+'되니까',
                    r+'되지만', r+'되어도', r+'되도록', r+'되던',
                    r+'되었으며', r+'되었으니', r+'되어야',
                    r+'하게', r+'하게 되다', r+'하게 됩니다',
                    // ── Hình thức lịch sự / Câu hỏi ─────────────────────────
                    r+'합니다', r+'합니까', r+'했습니다', r+'했습니까',
                    r+'해요', r+'했어요', r+'할 수 있다', r+'할 수 없다',
                    r+'할 것', r+'할 것이다', r+'하고 있다', r+'하고 있는',
                    r+'함으로써', r+'함으로', r+'하기 위해', r+'하기 위한'
                );
            } else if (item.base.endsWith('다')) {
                const r = item.base.slice(0, -1); // e.g. 듣 từ 듣다
                
                // CÁC ĐUÔI CƠ BẢN NHẤT
                const common = [
                    '고', '기', '는', '은', '을', '지', 
                    '며', '면', '면서', '니', '니까', 
                    '더라도', '든지', '거나', '거든', '게',
                    '도록', '다가', '자마자', '지만',
                    '습니다', '습니까', '을 것', '을 수', '은데', '는데'
                ];
                common.forEach(e => words.push(r + e));

                // ── AI SHOTGUN CONJUGATOR TỰ ĐỘNG CHIA BẤT QUY TẮC ──
                let lastChar = r.charCodeAt(r.length - 1);
                // Hệ thống chữ Hàn bắt đầu từ 0xAC00. Khối 받침 có 28 ký tự (0 là không có).
                let batchimCode = (lastChar - 0xAC00) % 28;
                let rootNoBatchim = r.slice(0, -1) + String.fromCharCode(lastChar - batchimCode);

                // 1. Nếu không có patchim -> thêm ㄴ/ㄹ/ㅂ trực tiếp
                if (batchimCode === 0) {
                    words.push(
                        r.slice(0, -1) + String.fromCharCode(lastChar + 4), // thêm ㄴ
                        r.slice(0, -1) + String.fromCharCode(lastChar + 8), // thêm ㄹ
                        r.slice(0, -1) + String.fromCharCode(lastChar + 17),// thêm ㅂ
                        r+'시', r+'셔', r+'신', r+'실', r+'셨'
                    );
                } 
                // 2. Bất quy tắc ㄷ -> ㄹ (VD: 듣다 -> 들어)
                else if (batchimCode === 7) { 
                    let r_rieul = r.slice(0, -1) + String.fromCharCode(lastChar - 7 + 8);
                    words.push(r_rieul+'어', r_rieul+'어서', r_rieul+'었', r_rieul+'으', r_rieul+'은', r_rieul+'을', r_rieul+'으니');
                }
                // 3. Bất quy tắc ㅂ -> 우/오 (VD: 춥다 -> 추워, 돕다 -> 도와)
                else if (batchimCode === 17) {
                    words.push(rootNoBatchim+'워', rootNoBatchim+'와', rootNoBatchim+'운', rootNoBatchim+'울', rootNoBatchim+'웠', rootNoBatchim+'왔', rootNoBatchim+'우');
                }
                // 4. Bất quy tắc ㅅ rụng (VD: 낫다 -> 나아)
                else if (batchimCode === 19) {
                    words.push(rootNoBatchim+'아', rootNoBatchim+'어', rootNoBatchim+'았', rootNoBatchim+'었', rootNoBatchim+'은', rootNoBatchim+'을', rootNoBatchim+'으');
                }
                // 5. Bất quy tắc ㄹ rụng (VD: 살다 -> 사는, 사시)
                else if (batchimCode === 8) {
                    words.push(rootNoBatchim+'는', rootNoBatchim+'시', rootNoBatchim+'세', rootNoBatchim+'닙', rootNoBatchim+'니');
                }

                // 6. Xử lý chung đuôi A / EO / YEO (아/어/여) và Quá khứ
                words.push(r+'아', r+'어', r+'여', r+'아서', r+'어서', r+'여서', r+'아도', r+'어도', r+'았', r+'었', r+'였');

                // 7. Bất quy tắc 으/르 (VD: 바쁘다 -> 바빠, 모르다 -> 몰라)
                if (r.endsWith('르')) {
                    let rPrev = r.slice(0, -2);
                    if (r.length >= 2) {
                        let prevChar = r.charCodeAt(r.length - 2);
                        let prevNoBatchim = prevChar - ((prevChar - 0xAC00) % 28);
                        let prevWithR = String.fromCharCode(prevNoBatchim + 8); // Thêm 받침 ㄹ vào chữ trước
                        words.push(rPrev + prevWithR + '라', rPrev + prevWithR + '러');
                    }
                } else if (r.endsWith('으')) {
                    let rPrev = r.slice(0, -2);
                    words.push(rootNoBatchim + '어', rootNoBatchim + '아');
                }
            }
            words = [...new Set(words)]; // Lọc trùng
            words.forEach(w => {
                // Sắp xếp các biến thể an toàn
                if (w && w.trim()) {
                    allTokens.push({
                        text: w.trim(),
                        base: item.base,
                        meaning: item.meaning,
                        level: item.level,
                        ex: item.examples || []
                    });
                }
            });
        });

        // Ưu tiên TỪ DÀI NHẤT để tránh bị bắt nhầm chuỗi con (VD: "해소하다" bắt trước "해소")
        allTokens.sort((a, b) => b.text.length - a.text.length);

        // Bọc từ vựng cho từng khối câu hỏi (bao gồm cả đáp án bên trong nó)
        // Set usedBases được tạo mới cho mỗi block để mỗi từ chỉ được bọc 1 LẦN DUY NHẤT trong 1 câu hỏi
        document.querySelectorAll('.question-block').forEach(block => {
            let usedBases = new Set();
            wrapNode(block, allTokens, usedBases);
        });

        // Gắn lại sự kiện Tooltip cho các thẻ vừa được tạo mới nếu file vocab-tooltip.js đã tải xong
        if (typeof window.attachVocabTooltips === 'function') {
            window.attachVocabTooltips();
        }
    };

    function wrapNode(node, allTokens, usedBases) {
        if (node.nodeType === Node.ELEMENT_NODE) {
            // Không bọc lại những từ đã bọc, không bọc script, css, nút bấm...
            if (['SCRIPT', 'STYLE', 'BUTTON'].includes(node.tagName)) return;
            if (node.classList.contains('vocab-word') || node.classList.contains('speaker-icon')) return;
            // Bỏ qua thanh option bar bị ẩn
            if (node.classList.contains('action-area') || node.classList.contains('nav-toggle-btn')) return;

            let child = node.firstChild;
            while (child) {
                let next = child.nextSibling;
                wrapNode(child, allTokens, usedBases);
                child = next;
            }
        } else if (node.nodeType === Node.TEXT_NODE) {
            let text = node.nodeValue;
            if (!text.trim()) return;

            let bestMatch = null;
            let bestIndex = -1;

            // Tìm từ xuất hiện SỚM NHẤT trong văn bản
            for (let i = 0; i < allTokens.length; i++) {
                let token = allTokens[i];
                if (usedBases.has(token.base)) continue;

                let idx = text.indexOf(token.text);
                if (idx !== -1) {
                    if (bestIndex === -1 || idx < bestIndex) {
                        bestIndex = idx;
                        bestMatch = token;
                        if (bestIndex === 0) break; 
                    }
                }
            }

            if (bestMatch) {
                let beforeText = text.substring(0, bestIndex);
                let matchText = text.substring(bestIndex, bestIndex + bestMatch.text.length);
                let afterText = text.substring(bestIndex + bestMatch.text.length);

                let parent = node.parentNode;
                
                if (beforeText) {
                    parent.insertBefore(document.createTextNode(beforeText), node);
                }
                
                let span = document.createElement('span');
                span.className = 'vocab-word';
                span.setAttribute('data-base', bestMatch.base);
                span.setAttribute('data-meaning', bestMatch.meaning);
                span.setAttribute('data-vocab-level', bestMatch.level);
                span.setAttribute('data-examples', encodeURIComponent(JSON.stringify(bestMatch.ex)));
                span.textContent = matchText;
                
                parent.insertBefore(span, node);
                
                let afterNode = document.createTextNode(afterText);
                parent.insertBefore(afterNode, node);
                
                parent.removeChild(node);
                
                usedBases.add(bestMatch.base);
                
                // Đệ quy phần text còn sót lại
                wrapNode(afterNode, allTokens, usedBases);
            }
        }
    }

    // Tự động gọi khởi tạo
    function runStaticInit() {
        if (!window.location.pathname.includes('type_')) {
            setTimeout(() => { window.initAutoVocab(); }, 300);
        }
    }
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', runStaticInit);
    } else {
        runStaticInit(); // Chạy ngay lập tức nếu Script được tiêm (inject) vào sau khi DOM quá trình load
    }

    document.addEventListener('typeQuestionsLoaded', () => {
        const tryWrap = (attempts) => {
            if (window.AutoVocabDict && window.AutoVocabDict.length > 0) {
                setTimeout(() => { window.initAutoVocab(); }, 100);
            } else if (attempts < 15) {
                setTimeout(() => tryWrap(attempts + 1), 200);
            }
        };
        tryWrap(0);
    });

    const style = document.createElement('style');
    style.innerHTML = `
        body.vocab-disabled .vocab-word { color: inherit !important; border-bottom: none !important; pointer-events: none !important; font-weight: inherit !important; background: transparent !important; }
        body.vocab-level-1 .vocab-word[data-vocab-level="2"] { color: inherit !important; border-bottom: none !important; pointer-events: none !important; font-weight: inherit !important; background: transparent !important; }
    `;
    document.head.appendChild(style);

    window.setVocabLevel = function(level) {
        const btn = document.getElementById('globalVocabBtn');
        if (!btn) return;
        btn.setAttribute('data-level', level);
        
        if (level === 0) {
            btn.style.background = '#94a3b8';
            btn.style.color = 'white';
            btn.innerText = 'Tắt';
        } else if (level === 1) {
            btn.style.background = '#3b82f6';
            btn.style.color = 'white';
            btn.innerText = 'Mức 1';
        } else {
            btn.style.background = '#10b981';
            btn.style.color = 'white';
            btn.innerText = 'Mức 2';
        }

        document.body.classList.remove('vocab-disabled', 'vocab-level-1', 'vocab-level-2');
        if (level === 0) {
            document.body.classList.add('vocab-disabled');
        } else if (level === 1) {
            document.body.classList.add('vocab-level-1');
        } else {
            document.body.classList.add('vocab-level-2');
        }
    };

    window.cycleVocabLevel = function() {
        const btn = document.getElementById('globalVocabBtn');
        if (!btn) return;
        
        let currentLevel = parseInt(btn.getAttribute('data-level')) || 0;
        let nextLevel = 2; // fallthrough
        if (currentLevel === 2) nextLevel = 0;
        else if (currentLevel === 0) nextLevel = 1;
        else if (currentLevel === 1) nextLevel = 2;
        
        window.setVocabLevel(nextLevel);
    };

    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
            window.setVocabLevel(2); // Mặc định bật ở Mức 2
        }, 100);
    });

})();
