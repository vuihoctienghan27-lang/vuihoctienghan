/* ==========================================================================
   WEB-TELEX.JS — Bộ gõ Telex tích hợp + chống xung đột EVKey/UniKey với tiếng Hàn
   Tách ra từ shared-vocab.js để dùng chung (vocab.html, Sổ tay nháp ở trang giáo trình).
   - window.toggleWebTelex(), window.updateAllTelexUI(): bật/tắt + cập nhật nút .gfm-telex-toggle-btn
   - window.WEB_TELEX_SCOPE (tùy chọn): CSS selector — chỉ gõ Telex trong vùng này.
     Không đặt (vocab.html) = áp dụng mọi ô nhập như trước.
   ========================================================================== */
(function () {
    if (window._webTelexLoaded) return;
    window._webTelexLoaded = true;

    // Giới hạn vùng gõ Telex (nếu trang đặt WEB_TELEX_SCOPE)
    function _inTelexScope(target) {
        const scope = window.WEB_TELEX_SCOPE;
        if (!scope) return true;
        return !!(target && target.closest && target.closest(scope));
    }

    /* =========================================================================
       BỘ GÕ TIẾNG VIỆT TELEX TÍCH HỢP & BẢO VỆ CHỐNG XUNG ĐỘT TIẾNG HÀN / TIẾNG VIỆT
       Cho phép người dùng để EVKey/UniKey ở chế độ E, chỉ cần bấm Alt để đổi giữa
       가 (Hàn) và A (Việt) mà không cần ấn Ctrl + Shift.
       Đồng thời có lớp bảo vệ chặn EVKey tự ý chèn dấu tiếng Việt vào chữ tiếng Hàn.
       ========================================================================= */
    const _TELEX_VOWEL_TABLE = {
        'a': ['a', 'á', 'à', 'ả', 'ã', 'ạ'],
        'ă': ['ă', 'ắ', 'ằ', 'ẳ', 'ẵ', 'ặ'],
        'â': ['â', 'ấ', 'ầ', 'ẩ', 'ẫ', 'ậ'],
        'e': ['e', 'é', 'è', 'ẻ', 'ẽ', 'ẹ'],
        'ê': ['ê', 'ế', 'ề', 'ể', 'ễ', 'ệ'],
        'i': ['i', 'í', 'ì', 'ỉ', 'ĩ', 'ị'],
        'o': ['o', 'ó', 'ò', 'ỏ', 'õ', 'ọ'],
        'ô': ['ô', 'ố', 'ồ', 'ổ', 'ỗ', 'ộ'],
        'ơ': ['ơ', 'ớ', 'ờ', 'ở', 'ỡ', 'ợ'],
        'u': ['u', 'ú', 'ù', 'ủ', 'ũ', 'ụ'],
        'ư': ['ư', 'ứ', 'ừ', 'ử', 'ữ', 'ự'],
        'y': ['y', 'ý', 'ỳ', 'ỷ', 'ỹ', 'ỵ']
    };

    const _TELEX_CHAR_MAP = {};
    for (const [base, row] of Object.entries(_TELEX_VOWEL_TABLE)) {
        row.forEach((ch, tone) => {
            _TELEX_CHAR_MAP[ch] = { base, tone, upper: false };
            _TELEX_CHAR_MAP[ch.toUpperCase()] = { base, tone, upper: true };
        });
    }

    const _TELEX_TONE_KEYS = {
        's': 1, 'S': 1,
        'f': 2, 'F': 2,
        'r': 3, 'R': 3,
        'x': 4, 'X': 4,
        'j': 5, 'J': 5,
        'z': 0, 'Z': 0
    };

    function _isVowel(c) {
        return !!_TELEX_CHAR_MAP[c];
    }
    function _getBase(c) {
        return _TELEX_CHAR_MAP[c] ? _TELEX_CHAR_MAP[c].base : c.toLowerCase();
    }
    function _getTone(c) {
        return _TELEX_CHAR_MAP[c] ? _TELEX_CHAR_MAP[c].tone : 0;
    }
    function _makeChar(base, tone, upper) {
        if (!_TELEX_VOWEL_TABLE[base]) return base;
        const res = _TELEX_VOWEL_TABLE[base][tone] || base;
        return upper ? res.toUpperCase() : res;
    }

    function _findToneVowelIndex(word) {
        const vowelIndices = [];
        for (let i = 0; i < word.length; i++) {
            if (_isVowel(word[i])) vowelIndices.push(i);
        }
        if (vowelIndices.length === 0) return -1;
        if (vowelIndices.length === 1) return vowelIndices[0];

        const vStr = vowelIndices.map(i => _getBase(word[i])).join('');
        const lastVowelIdx = vowelIndices[vowelIndices.length - 1];
        const hasEndingConsonant = lastVowelIdx < word.length - 1;

        if (vowelIndices.length >= 3) {
            if (vStr.startsWith('uye') || vStr.startsWith('uyê')) {
                return vowelIndices[2];
            }
            return vowelIndices[1];
        }

        if (vowelIndices.length === 2) {
            const v1 = _getBase(word[vowelIndices[0]]);
            const v2 = _getBase(word[vowelIndices[1]]);

            if (hasEndingConsonant) {
                return vowelIndices[1];
            } else {
                if ((v1 === 'o' && (v2 === 'a' || v2 === 'e')) || (v1 === 'u' && v2 === 'y')) {
                    return vowelIndices[1];
                }
                if (v2 === 'ê' || v2 === 'ô' || v2 === 'ơ') {
                    return vowelIndices[1];
                }
                if (v2 === 'a') {
                    return vowelIndices[0];
                }
                return vowelIndices[0];
            }
        }
        return vowelIndices[0];
    }

    function _processVietnameseTelex(word, key) {
        if (!word) return null;
        if (/[\uac00-\ud7a3\u1100-\u11ff\u3130-\u318f]/.test(word)) return null;

        const lowerKey = key.toLowerCase();
        const lastChar = word[word.length - 1];
        const lastBase = _getBase(lastChar);
        const isUpper = lastChar === lastChar.toUpperCase() && lastChar !== lastChar.toLowerCase();

        // 1. Dấu thanh: s, f, r, x, j, z
        if (_TELEX_TONE_KEYS[lowerKey] !== undefined) {
            const targetTone = _TELEX_TONE_KEYS[lowerKey];
            const toneVowelIdx = _findToneVowelIndex(word);

            if (toneVowelIdx !== -1) {
                let existingTone = 0;
                for (let i = 0; i < word.length; i++) {
                    const t = _getTone(word[i]);
                    if (t > 0) { existingTone = t; break; }
                }

                if (existingTone === targetTone && targetTone !== 0) {
                    let clean = '';
                    for (let i = 0; i < word.length; i++) {
                        if (_isVowel(word[i])) {
                            const info = _TELEX_CHAR_MAP[word[i]];
                            clean += _makeChar(info.base, 0, info.upper);
                        } else {
                            clean += word[i];
                        }
                    }
                    return clean + key;
                }

                let newWord = '';
                for (let i = 0; i < word.length; i++) {
                    if (i === toneVowelIdx) {
                        const info = _TELEX_CHAR_MAP[word[i]];
                        newWord += _makeChar(info.base, targetTone, info.upper);
                    } else if (_isVowel(word[i])) {
                        const info = _TELEX_CHAR_MAP[word[i]];
                        newWord += _makeChar(info.base, 0, info.upper);
                    } else {
                        newWord += word[i];
                    }
                }
                return newWord;
            }
        }

        // 2. dd -> đ
        if (lowerKey === 'd') {
            if (lastBase === 'd') {
                return word.slice(0, -1) + (isUpper ? 'Đ' : 'đ');
            } else if (lastChar === 'đ' || lastChar === 'Đ') {
                return word.slice(0, -1) + (isUpper ? 'DD' : 'dd');
            }
        }

        // aa -> â, ee -> ê, oo -> ô
        if (lowerKey === 'a') {
            const tone = _getTone(lastChar);
            if (lastBase === 'a') {
                return word.slice(0, -1) + _makeChar('â', tone, isUpper);
            } else if (lastBase === 'â') {
                return word.slice(0, -1) + _makeChar('a', tone, isUpper) + key;
            }
        }

        if (lowerKey === 'e') {
            const tone = _getTone(lastChar);
            if (lastBase === 'e') {
                return word.slice(0, -1) + _makeChar('ê', tone, isUpper);
            } else if (lastBase === 'ê') {
                return word.slice(0, -1) + _makeChar('e', tone, isUpper) + key;
            }
        }

        if (lowerKey === 'o') {
            if (lastBase === 'ư') {
                const tone = _getTone(lastChar);
                return word.slice(0, -1) + _makeChar('ư', 0, isUpper) + _makeChar('ơ', tone, key === 'O');
            }
            const tone = _getTone(lastChar);
            if (lastBase === 'o') {
                return word.slice(0, -1) + _makeChar('ô', tone, isUpper);
            } else if (lastBase === 'ô') {
                return word.slice(0, -1) + _makeChar('o', tone, isUpper) + key;
            }
        }

        // 'w' transformations:
        if (lowerKey === 'w') {
            if (word.length >= 3) {
                const p3 = _getBase(word[word.length - 3]);
                const p2 = _getBase(word[word.length - 2]);
                const p1 = _getBase(word[word.length - 1]);
                if ((p3 === 'u' || p3 === 'ư') && (p2 === 'o' || p2 === 'ơ') && (p1 === 'i')) {
                    const u3 = word[word.length - 3] === word[word.length - 3].toUpperCase();
                    const u2 = word[word.length - 2] === word[word.length - 2].toUpperCase();
                    const t = _getTone(word[word.length - 2]) || _getTone(word[word.length - 3]);
                    return word.slice(0, -3) + _makeChar('ư', 0, u3) + _makeChar('ơ', t, u2) + word[word.length - 1];
                }
            }
            if (word.length >= 2) {
                const prev2 = _getBase(word[word.length - 2]);
                const prev1 = _getBase(word[word.length - 1]);
                if ((prev2 === 'u' && (prev1 === 'o' || prev1 === 'ơ')) || (prev2 === 'ư' && (prev1 === 'o' || prev1 === 'ơ'))) {
                    const t1 = _getTone(word[word.length - 2]);
                    const t2 = _getTone(word[word.length - 1]);
                    const u1 = word[word.length - 2] === word[word.length - 2].toUpperCase();
                    const u2 = word[word.length - 1] === word[word.length - 1].toUpperCase();
                    return word.slice(0, -2) + _makeChar('ư', t1, u1) + _makeChar('ơ', t2, u2);
                }
                if (prev2 === 'u' && prev1 === 'a') {
                    const t = _getTone(word[word.length - 1]);
                    const u1 = word[word.length - 2] === word[word.length - 2].toUpperCase();
                    return word.slice(0, -2) + _makeChar('ư', 0, u1) + _makeChar('a', t, isUpper);
                }
            }

            const tone = _getTone(lastChar);
            if (lastBase === 'a') {
                return word.slice(0, -1) + _makeChar('ă', tone, isUpper);
            } else if (lastBase === 'ă') {
                return word.slice(0, -1) + _makeChar('a', tone, isUpper) + key;
            } else if (lastBase === 'o') {
                return word.slice(0, -1) + _makeChar('ơ', tone, isUpper);
            } else if (lastBase === 'ơ') {
                return word.slice(0, -1) + _makeChar('o', tone, isUpper) + key;
            } else if (lastBase === 'u') {
                return word.slice(0, -1) + _makeChar('ư', tone, isUpper);
            } else if (lastBase === 'ư') {
                return word.slice(0, -1) + _makeChar('u', tone, isUpper) + key;
            } else {
                return word + (key === 'W' ? 'Ư' : 'ư');
            }
        }

        return null;
    }

    // Trạng thái bật/tắt bộ gõ Telex tích hợp
    window._webTelexEnabled = localStorage.getItem('web_telex_enabled') !== 'false';
    window._isKoreanComposing = false;
    window._lastKoreanTime = 0;

    window.toggleWebTelex = function () {
        window._webTelexEnabled = !window._webTelexEnabled;
        try {
            localStorage.setItem('web_telex_enabled', window._webTelexEnabled ? 'true' : 'false');
        } catch (e) {}
        updateAllTelexUI();
        if (typeof Swal !== 'undefined' && Swal.fire) {
            const toast = Swal.mixin({
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 2800,
                timerProgressBar: true
            });
            toast.fire({
                icon: window._webTelexEnabled ? 'success' : 'info',
                title: window._webTelexEnabled 
                    ? '🇻🇳 Đã bật Telex tích hợp! Bạn có thể để EVKey ở chữ E và dùng Alt để đổi Hàn - Việt' 
                    : '⚪ Đã tắt Telex tích hợp. Hãy dùng EVKey/UniKey bên ngoài.'
            });
        }
    };

    function updateAllTelexUI() {
        const btns = document.querySelectorAll('.gfm-telex-toggle-btn');
        btns.forEach(btn => {
            if (window._webTelexEnabled) {
                btn.style.background = '#eff6ff';
                btn.style.borderColor = '#3b82f6';
                btn.style.color = '#1d4ed8';
                btn.innerHTML = `<span class="telex-status-icon">🇻🇳</span><span class="telex-status-text">Telex: BẬT</span>`;
                btn.title = "Bộ gõ Telex tích hợp đang BẬT: Bạn có thể để EVKey ở chữ E, chỉ cần bấm Alt để đổi giữa gõ tiếng Hàn (가) và tiếng Việt (A)!";
            } else {
                btn.style.background = '#f1f5f9';
                btn.style.borderColor = '#cbd5e1';
                btn.style.color = '#64748b';
                btn.innerHTML = `<span class="telex-status-icon">⚪</span><span class="telex-status-text">Telex: TẮT</span>`;
                btn.title = "Bộ gõ Telex tích hợp đang TẮT. Bấm để bật lại.";
            }
        });
    }
    window.updateAllTelexUI = updateAllTelexUI;

    document.addEventListener('keydown', function (e) {
        // 1. Phím Escape đã được xử lý bởi handleGlobalEscape
        if (e.key === 'Escape' || e.key === 'Esc' || e.keyCode === 27) return;

        // 2. Bộ gõ Telex thông minh trong trình soạn thảo
        if (!window._webTelexEnabled) return;
        if (e.ctrlKey || e.altKey || e.metaKey) return;
        if (e.isComposing || e.key === 'Process' || e.keyCode === 229) return;
        if (e.key.length !== 1) return;
        if (!/^[a-zA-Z]$/.test(e.key)) return;

        const target = e.target;
        if (!target) return;
        if (!_inTelexScope(target)) return;

        // Nếu đang gõ trong input text hoặc textarea
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
            if (target.tagName === 'INPUT' && target.type !== 'text' && target.type !== 'search') return;
            const pos = target.selectionStart;
            if (pos === null || pos !== target.selectionEnd) return;
            const text = target.value;
            const textBefore = text.slice(0, pos);
            const match = textBefore.match(/([a-zA-Z\u00C0-\u024F\u1EA0-\u1EF9]+)$/);
            if (!match) return;
            const currentWord = match[1];
            const transformed = _processVietnameseTelex(currentWord, e.key);
            if (transformed !== null && transformed !== currentWord + e.key) {
                e.preventDefault();
                const wordStart = pos - currentWord.length;
                target.value = text.slice(0, wordStart) + transformed + text.slice(pos);
                const newPos = wordStart + transformed.length;
                target.setSelectionRange(newPos, newPos);
                target.dispatchEvent(new Event('input', { bubbles: true }));
            }
            return;
        }

        // Nếu đang gõ trong contenteditable
        const editable = target.closest('[contenteditable="true"]');
        if (editable) {
            const sel = window.getSelection();
            if (!sel || !sel.rangeCount || !sel.isCollapsed) return;
            const node = sel.anchorNode;
            if (!node || node.nodeType !== Node.TEXT_NODE) return;

            const text = node.textContent;
            const offset = sel.anchorOffset;
            const textBefore = text.slice(0, offset);
            const match = textBefore.match(/([a-zA-Z\u00C0-\u024F\u1EA0-\u1EF9]+)$/);
            if (!match) return;

            const currentWord = match[1];
            const transformed = _processVietnameseTelex(currentWord, e.key);
            if (transformed !== null && transformed !== currentWord + e.key) {
                e.preventDefault();
                const wordStart = offset - currentWord.length;
                const newText = text.slice(0, wordStart) + transformed + text.slice(offset);
                node.textContent = newText;

                const newCaretPos = wordStart + transformed.length;
                const range = document.createRange();
                range.setStart(node, newCaretPos);
                range.setEnd(node, newCaretPos);
                sel.removeAllRanges();
                sel.addRange(range);

                editable.dispatchEvent(new Event('input', { bubbles: true }));
            }
        }
    }, true);

    // --- 3. KOREAN IME & EVKEY COLLISION GUARD ---
    const _HANGUL_CHARS_REGEX = /[\uac00-\ud7a3\u1100-\u11ff\u3130-\u318f]/;
    const _VIETNAMESE_ACCENTS_REGEX = /[áàảãạăắằẳẵặâấầẩẫậéèẻẽẹêếềểễệíìỉĩịóòỏõọôốồổỗộơớờởỡợúùủũụưứừửữựýỳỷỹỵđĐ]/i;

    document.addEventListener('compositionstart', function (e) {
        window._isKoreanComposing = true;
        window._lastKoreanTime = Date.now();
    }, true);

    document.addEventListener('compositionupdate', function (e) {
        window._isKoreanComposing = true;
        if (_HANGUL_CHARS_REGEX.test(e.data || '')) {
            window._lastKoreanTime = Date.now();
        }
    }, true);

    document.addEventListener('compositionend', function (e) {
        window._isKoreanComposing = false;
        if (_HANGUL_CHARS_REGEX.test(e.data || '')) {
            window._lastKoreanTime = Date.now();
        }
    }, true);

    document.addEventListener('beforeinput', function (e) {
        if (!e.data) return;
        if (!_inTelexScope(e.target)) return;
        if (_VIETNAMESE_ACCENTS_REGEX.test(e.data)) {
            const isRecentKorean = (Date.now() - (window._lastKoreanTime || 0)) < 700;
            if (window._isKoreanComposing || isRecentKorean) {
                e.preventDefault();
                return;
            }

            const sel = window.getSelection();
            if (sel && sel.rangeCount > 0) {
                const node = sel.anchorNode;
                if (node && node.nodeType === Node.TEXT_NODE) {
                    const textBefore = node.textContent.slice(0, sel.anchorOffset);
                    if (textBefore.length > 0 && _HANGUL_CHARS_REGEX.test(textBefore.slice(-1))) {
                        e.preventDefault();
                        return;
                    }
                }
            }
            if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) {
                const el = e.target;
                const pos = el.selectionStart;
                if (pos !== null && pos > 0) {
                    const charBefore = el.value.charAt(pos - 1);
                    if (_HANGUL_CHARS_REGEX.test(charBefore)) {
                        e.preventDefault();
                        return;
                    }
                }
            }
        }
    }, true);
})();
