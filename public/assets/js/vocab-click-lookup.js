/* ==========================================================================
   VOCAB-CLICK-LOOKUP.JS — Double-click bất kỳ từ Hàn nào → Popup nghĩa + ví dụ
   ========================================================================== */
(function () {
    'use strict';

    console.log('[Vocab] Click-lookup loaded');

    let fullDictMap = null;
    let fullDictLoaded = false;
    let fullDictLoading = false;
    let fullDictFailed = false;
    let pendingCallbacks = [];

    // ── Build lookup map from full dict if available ────────────────
    function buildFullDictMap() {
        if (fullDictMap) return;
        if (!window.AutoVocabDictFull || !Array.isArray(window.AutoVocabDictFull)) return;
        fullDictMap = new Map();
        for (const e of window.AutoVocabDictFull) {
            const key = e.w.toLowerCase();
            if (!fullDictMap.has(key)) fullDictMap.set(key, e);
        }
        fullDictLoaded = true;
        console.log('[Vocab] Full dict indexed:', fullDictMap.size, 'entries');
        const cbs = pendingCallbacks;
        pendingCallbacks = [];
        cbs.forEach(cb => cb());
    }

    // Lazy-load full dict on demand
    function loadFullDict() {
        return new Promise(resolve => {
            if (fullDictLoaded || fullDictFailed) { resolve(); return; }
            if (fullDictLoading) { pendingCallbacks.push(resolve); return; }

            fullDictLoading = true;
            pendingCallbacks.push(resolve);

            function done() {
                fullDictLoading = false;
                const cbs = pendingCallbacks;
                pendingCallbacks = [];
                cbs.forEach(cb => cb());
            }

            function tryPath(src) {
                return new Promise(ok => {
                    const s = document.createElement('script');
                    s.onload = () => { ok(true); };
                    s.onerror = () => { ok(false); };
                    s.src = src;
                    document.body.appendChild(s);
                });
            }

            (async () => {
                const pathParts = window.location.pathname.replace(/\/+$/, '').split('/');
                const dir = pathParts.slice(0, -1).join('/');
                const depth = dir.split('/').filter(Boolean).length;

                let prefix = '';
                if (depth === 0) prefix = '.';
                else if (depth === 1) prefix = '..';
                else if (depth === 2) prefix = '../..';
                else prefix = '../../..';

                const paths = [
                    `${prefix}/assets/js/vocab-dictionary-full.js`,
                    '/assets/js/vocab-dictionary-full.js'
                ];

                for (const p of paths) {
                    const ok = await tryPath(p);
                    if (ok && window.AutoVocabDictFull) {
                        buildFullDictMap();
                        done();
                        return;
                    }
                }
                fullDictFailed = true;
                done();
            })();
        });
    }

    // Listen for full dict ready event
    window.addEventListener('fulldictready', () => { buildFullDictMap(); });
    if (window.AutoVocabDictFull) buildFullDictMap();

    // ── Korean detection ────────────────────────────────────────────
    function isKoreanChar(ch) {
        const code = ch.charCodeAt(0);
        return (code >= 0xAC00 && code <= 0xD7AF) ||
               (code >= 0x1100 && code <= 0x11FF) ||
               (code >= 0x3130 && code <= 0x318F);
    }

    function hasKorean(text) {
        if (!text) return false;
        for (let i = 0; i < text.length; i++) {
            if (isKoreanChar(text[i])) return true;
        }
        return false;
    }

    function cleanWord(text) {
        return text.replace(/^[^\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F]+/, '')
                   .replace(/[^\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F]+$/, '')
                   .trim();
    }

    // ── Lookup ──────────────────────────────────────────────────────
    function lookupLocal(word) {
        const q = word.toLowerCase().trim();

        if (window.AutoVocabDict) {
            for (const entry of window.AutoVocabDict) {
                if (entry.base.toLowerCase() === q) return entry;
                if (entry.variants) {
                    for (const v of entry.variants) {
                        if (v.toLowerCase() === q) return entry;
                    }
                }
            }
        }

        if (fullDictMap) {
            const e = fullDictMap.get(q);
            if (e) return e;
        }

        return fuzzyLookup(q);
    }

    function fuzzyLookup(q) {
        const endings = ['하다','되다','시키다','스럽다','롭다','지다','나다','들다','보다','주다','오다','가다','받다','내다','쓰다'];
        for (const end of endings) {
            if (q.endsWith(end) && q.length > end.length) {
                const stem = q.slice(0, -end.length);
                const target = stem + '다';
                if (window.AutoVocabDict) {
                    const found = window.AutoVocabDict.find(e => e.base.toLowerCase() === target);
                    if (found) return found;
                }
                if (fullDictMap) {
                    const found = fullDictMap.get(target);
                    if (found) return found;
                }
            }
        }
        if (q.endsWith('다') && q.length > 1) {
            const stem = q.slice(0, -1);
            if (fullDictMap) {
                const found = fullDictMap.get(stem);
                if (found) return found;
            }
        }
        return null;
    }

    function formatEntry(entry) {
        if (entry.base) {
            return { word: entry.base, meaning: entry.meaning || '', pos: entry.pos || '', examples: entry.examples || [] };
        }
        if (entry.w) {
            return { word: entry.w, meaning: entry.m || '', pos: entry.t || '', examples: entry.x || [] };
        }
        return null;
    }

    // ── API fallback ─────────────────────────────────────────────────
    async function lookupAPI(word) {
        if (typeof VocabExternal === 'undefined') return null;
        try {
            if (typeof VocabExternal._naverKoViSearch === 'function') {
                const naver = await VocabExternal._naverKoViSearch(word);
                if (naver) {
                    return {
                        word: naver.word || word,
                        meaning: naver.viMeaning || '',
                        pos: naver.pos || '',
                        examples: (naver.examples || []).map(e => typeof e === 'string' ? e : e.ko + (e.vi ? '\n→ ' + e.vi : ''))
                    };
                }
            }
            const results = await VocabExternal.fetchExamples(word, word);
            if (results && results.status === 'ok' && results.examples && results.examples.length > 0) {
                return {
                    word: word,
                    meaning: '',
                    pos: '',
                    examples: results.examples.map(e => typeof e === 'string' ? e : e.ko + (e.vi ? '\n→ ' + e.vi : ''))
                };
            }
        } catch (_) {}
        return null;
    }

    // ── Show popup ───────────────────────────────────────────────────
    function showPopupNative(data) {
        // Fallback if SweetAlert2 not available
        const { word, meaning, pos, examples } = data;
        let msg = `${word}\n${pos ? '(' + pos + ') ' : ''}→ ${meaning || '(không có nghĩa)'}`;
        if (examples && examples.length > 0) {
            msg += '\n\nVí dụ:\n' + examples.slice(0, 3).map(e => '• ' + (typeof e === 'string' ? e : e.ko || '')).join('\n');
        }
        alert(msg);
    }

    // DOM-based popup — dùng khi đang ở trong Swal modal (tránh đóng popup cha)
    var _domPopupEl = null;
    function closeDomPopup() {
        if (_domPopupEl) { _domPopupEl.remove(); _domPopupEl = null; }
        var overlay = document.getElementById('vocab-dom-overlay');
        if (overlay) overlay.remove();
    }
    function showPopupDOM(formatted, source) {
        closeDomPopup();
        var word = formatted.word, meaning = formatted.meaning, pos = formatted.pos;
        var examples = formatted.examples;

        var posBadge = pos ? '<span style="display:inline-block;background:#eff6ff;color:#2563eb;padding:2px 8px;border-radius:6px;font-size:0.75em;margin-left:8px;">' + pos + '</span>' : '';
        var sourceBadge = source ? '<div style="margin-top:8px;font-size:0.7em;color:#94a3b8;">' + source + '</div>' : '';
        var exampleHtml = '';
        if (examples && examples.length > 0) {
            exampleHtml = '<div style="text-align:left;margin-top:12px;border-top:1px solid #e2e8f0;padding-top:10px;">';
            exampleHtml += '<small style="color:#94a3b8;font-weight:600;">VÍ DỤ</small>';
            examples.slice(0, 4).forEach(function(ex) {
                var text = typeof ex === 'string' ? ex : (ex.ko || '');
                if (text) {
                    exampleHtml += '<div style="margin-top:6px;padding:8px 12px;background:#f8fafc;border-radius:8px;font-size:0.9em;color:#334155;">' + text + '</div>';
                }
            });
            exampleHtml += '</div>';
        }

        // backdrop overlay
        var overlay = document.createElement('div');
        overlay.id = 'vocab-dom-overlay';
        overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.2);';
        overlay.onclick = closeDomPopup;

        // popup — build full innerHTML first, then attach buttons
        var popup = document.createElement('div');
        _domPopupEl = popup;
        popup.className = 'vocab-lookup-popup';
        popup.style.cssText = 'position:fixed;z-index:100000;top:50%;left:50%;transform:translate(-50%,-50%);width:420px;max-width:94vw;background:#fff;border-radius:16px;box-shadow:0 20px 60px rgba(0,0,0,0.3);padding:24px 20px 20px;font-family:Pretendard,Inter,sans-serif;text-align:left;';
        popup.onclick = function(e) { e.stopPropagation(); };
        popup.innerHTML =
            '<div style="font-size:1.3em;font-weight:800;color:#2563eb;margin-bottom:8px;padding-right:56px;">' + word + posBadge + '</div>' +
            '<div style="font-size:1.1em;color:#1e293b;font-weight:500;margin-bottom:4px;">🇻🇳 ' + (meaning || '(không có nghĩa)') + '</div>' +
            sourceBadge + exampleHtml;

        var closeBtn = document.createElement('button');
        closeBtn.innerHTML = '×';
        closeBtn.style.cssText = 'position:absolute;top:8px;right:12px;background:none;border:none;font-size:1.5em;cursor:pointer;color:#94a3b8;line-height:1;';
        closeBtn.onclick = closeDomPopup;
        popup.appendChild(closeBtn);

        var speakBtn = document.createElement('button');
        speakBtn.innerHTML = '🔊';
        speakBtn.style.cssText = 'position:absolute;top:12px;right:44px;background:none;border:none;font-size:1.2em;cursor:pointer;';
        speakBtn.onclick = function(e) {
            e.stopPropagation();
            if ('speechSynthesis' in window) {
                window.speechSynthesis.cancel();
                var u = new SpeechSynthesisUtterance(word);
                u.lang = 'ko-KR'; u.rate = 0.85;
                window.speechSynthesis.speak(u);
            }
        };
        popup.appendChild(speakBtn);

        overlay.appendChild(popup);
        document.body.appendChild(overlay);
    }

    function isInsideSwal() {
        return !!document.querySelector('.swal2-container');
    }

    async function showPopup(formatted, source) {
        const { word, meaning, pos, examples } = formatted;

        if (typeof Swal === 'undefined' || isInsideSwal()) {
            showPopupDOM(formatted, source);
            return;
        }

        let exampleHtml = '';
        if (examples && examples.length > 0) {
            exampleHtml = '<div style="text-align:left;margin-top:12px;border-top:1px solid #e2e8f0;padding-top:10px;">';
            exampleHtml += '<small style="color:#94a3b8;font-weight:600;">VÍ DỤ</small>';
            examples.slice(0, 4).forEach(ex => {
                const text = typeof ex === 'string' ? ex : ex.ko || '';
                if (text) {
                    exampleHtml += `<div style="margin-top:6px;padding:8px 12px;background:#f8fafc;border-radius:8px;font-size:0.9em;color:#334155;">${text}</div>`;
                }
            });
            exampleHtml += '</div>';
        }

        const posBadge = pos ? `<span style="display:inline-block;background:#eff6ff;color:#2563eb;padding:2px 8px;border-radius:6px;font-size:0.75em;margin-left:8px;">${pos}</span>` : '';
        const sourceBadge = source ? `<div style="margin-top:8px;font-size:0.7em;color:#94a3b8;">${source}</div>` : '';

        await Swal.fire({
            title: `<span style="font-family:'Pretendard',sans-serif;">${word}${posBadge}</span>`,
            html: `
                <div style="font-size:1.1em;color:#1e293b;font-weight:500;margin-bottom:4px;">🇻🇳 ${meaning || '(không có nghĩa)'}</div>
                ${sourceBadge}
                ${exampleHtml}
            `,
            showCloseButton: true,
            showConfirmButton: false,
            width: '420px',
            customClass: { popup: 'vocab-lookup-popup', title: 'vocab-lookup-title' },
            didOpen: () => {
                const speakBtn = document.createElement('button');
                speakBtn.innerHTML = '🔊';
                speakBtn.style.cssText = 'position:absolute;top:12px;right:48px;background:none;border:none;font-size:1.2em;cursor:pointer;';
                speakBtn.onclick = (e) => {
                    e.stopPropagation();
                    if ('speechSynthesis' in window) {
                        window.speechSynthesis.cancel();
                        const u = new SpeechSynthesisUtterance(word);
                        u.lang = 'ko-KR'; u.rate = 0.85;
                        window.speechSynthesis.speak(u);
                    }
                };
                const popup = Swal.getPopup();
                if (popup) popup.appendChild(speakBtn);
            }
        });
    }

    // ── Main lookup ──────────────────────────────────────────────────
    async function lookupAndShow(word) {
        console.log('[Vocab] Lookup:', word);
        const local = lookupLocal(word);
        if (local) {
            const formatted = formatEntry(local);
            if (formatted) {
                const source = local.base ? '📖 Từ điển nội bộ' : '📚 KRDict';
                await showPopup(formatted, source);
                return;
            }
        }

        if (!fullDictLoaded) {
            if (typeof Swal !== 'undefined' && !isInsideSwal()) {
                Swal.fire({
                    title: 'Đang tải từ điển...',
                    html: '<div style="padding:10px;">Đang tải cơ sở dữ liệu từ điển (49K từ)...</div>',
                    allowOutsideClick: false,
                    didOpen: async () => {
                        await loadFullDict();
                        Swal.close();
                        const retry = lookupLocal(word);
                        if (retry) {
                            const formatted = formatEntry(retry);
                            if (formatted) { await showPopup(formatted, '📚 KRDict'); return; }
                        }
                        const apiResult = await lookupAPI(word);
                        if (apiResult) { await showPopup(apiResult, '🌐 API'); }
                        else {
                            Swal.fire({ icon: 'info', title: 'Không tìm thấy', text: `Không tìm thấy "${word}" trong từ điển.`, confirmButtonText: 'OK' });
                        }
                    }
                });
            } else {
                // Inside Swal modal or Swal not available — use DOM approach
                if (isInsideSwal()) {
                    // Show a mini loading overlay without closing the parent modal
                    closeDomPopup();
                    var loadOverlay = document.createElement('div');
                    loadOverlay.id = 'vocab-dom-overlay';
                    loadOverlay.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.2);display:flex;align-items:center;justify-content:center;';
                    loadOverlay.innerHTML = '<div style="background:#fff;border-radius:16px;padding:24px 32px;box-shadow:0 20px 60px rgba(0,0,0,0.3);font-family:Pretendard,Inter,sans-serif;font-size:1.1em;color:#1e293b;text-align:center;">⏳ Đang tải từ điển (49K từ)...</div>';
                    document.body.appendChild(loadOverlay);

                    await loadFullDict();
                    loadOverlay.remove();

                    const retry = lookupLocal(word);
                    if (retry) {
                        const formatted = formatEntry(retry);
                        if (formatted) { await showPopup(formatted, '📚 KRDict'); return; }
                    }
                    const apiResult = await lookupAPI(word);
                    if (apiResult) { await showPopup(apiResult, '🌐 API'); }
                    else { await showPopup({ word: word, meaning: 'Không tìm thấy trong từ điển.', pos: '', examples: [] }, ''); }
                } else {
                    await loadFullDict();
                    const retry = lookupLocal(word);
                    if (retry) {
                        const formatted = formatEntry(retry);
                        if (formatted) { showPopupNative(formatted); return; }
                    }
                    showPopupNative({ word, meaning: '(đang tải từ điển, thử lại sau)', pos: '', examples: [] });
                }
            }
            return;
        }

        if (typeof Swal !== 'undefined' && !isInsideSwal()) {
            Swal.fire({
                title: 'Đang tra từ...',
                html: `Tìm "${word}" qua API...`,
                allowOutsideClick: true,
                didOpen: async () => {
                    const result = await lookupAPI(word);
                    Swal.close();
                    if (result) { await showPopup(result, '🌐 API'); }
                    else {
                        Swal.fire({ icon: 'info', title: 'Không tìm thấy', text: `Không tìm thấy "${word}" trong từ điển.`, confirmButtonText: 'OK' });
                    }
                }
            });
        } else {
            const result = await lookupAPI(word);
            if (result) { await showPopup(result, '🌐 API'); }
            else { await showPopup({ word: word, meaning: 'Không tìm thấy trong từ điển.', pos: '', examples: [] }, ''); }
        }
    }

    // ── Selection handler ────────────────────────────────────────────
    function handleSelection() {
        const sel = window.getSelection();
        if (!sel) return;
        const text = sel.toString().trim();
        if (!text || text.length < 1) return;
        if (!hasKorean(text)) return;

        const word = cleanWord(text);
        if (!word || word.length < 1) return;

        // Clear selection to prevent mouseup on overlay from retriggering this
        sel.removeAllRanges();

        lookupAndShow(word);
    }

    // ── Events: dblclick + mouseup (covers both double-click and drag-select) ──
    document.addEventListener('dblclick', function (e) {
        var tag = e.target.tagName;
        if (['INPUT', 'TEXTAREA', 'BUTTON', 'SELECT'].includes(tag)) return;
        if (e.target.closest('.vocab-lookup-popup')) return;
        // Small delay to let browser finish word selection
        setTimeout(handleSelection, 50);
    });

    // Also trigger on mouseup when there's a valid selection (covers drag-select)
    document.addEventListener('mouseup', function (e) {
        var tag = e.target.tagName;
        if (['INPUT', 'TEXTAREA', 'BUTTON', 'SELECT'].includes(tag)) return;
        if (e.target.closest('.vocab-lookup-popup')) return;
        // Only handle if selection exists and isn't too long (avoid triggering on large text selections)
        const sel = window.getSelection();
        if (!sel || !sel.toString().trim()) return;
        if (sel.toString().trim().length > 30) return; // ignore large selections
        // Don't trigger on single clicks without selection change
        if (!hasKorean(sel.toString().trim())) return;
        // Use a flag to prevent double-fire with dblclick
        if (e.detail >= 2) return; // skip if part of dblclick
        handleSelection();
    });

})();
