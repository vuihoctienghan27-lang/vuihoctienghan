/* ==========================================================================
   NEWS-ARTICLE.JS — Standalone article reader page
   URL: news-article.html?id=<docId>
   Double-click Korean word → lookup dictionary → popup
   ========================================================================== */

(function() {
    'use strict';

    // ── Lookup overlay ──────────────────────────────────────────────────
    window._naLookupOverlay = null;
    window.naCloseLookup = function() {
        if (window._naLookupOverlay) { window._naLookupOverlay.remove(); window._naLookupOverlay = null; }
    };

    function lookupWord(word) {
        var q = word.toLowerCase();
        var entry = null;

        if (window.AutoVocabDict) {
            for (var j = 0; j < window.AutoVocabDict.length; j++) {
                var e = window.AutoVocabDict[j];
                if (e.base.toLowerCase() === q) { entry = e; break; }
                if (e.variants) {
                    for (var k = 0; k < e.variants.length; k++) {
                        if (e.variants[k].toLowerCase() === q) { entry = e; break; }
                    }
                    if (entry) break;
                }
            }
        }
        if (!entry) {
            var endings = ['하다','되다','시키다','스럽다','롭다','지다','나다','들다','보다','주다','오다','가다','받다','내다','쓰다'];
            for (var e2 = 0; e2 < endings.length && !entry; e2++) {
                if (q.endsWith(endings[e2]) && q.length > endings[e2].length) {
                    var stem = q.slice(0, -endings[e2].length);
                    for (var j2 = 0; j2 < (window.AutoVocabDict||[]).length; j2++) {
                        if (window.AutoVocabDict[j2].base.toLowerCase() === stem + '다') { entry = window.AutoVocabDict[j2]; break; }
                    }
                }
            }
        }
        if (!entry) return;

        window.naCloseLookup();

        var overlay = document.createElement('div');
        window._naLookupOverlay = overlay;
        overlay.style.cssText = 'position:fixed;inset:0;z-index:2147483647;background:rgba(0,0,0,0.2);display:flex;align-items:center;justify-content:center;';
        overlay.addEventListener('click', window.naCloseLookup);

        var popup = document.createElement('div');
        popup.style.cssText = 'width:420px;max-width:94vw;background:#fff;border-radius:16px;box-shadow:0 20px 60px rgba(0,0,0,0.35);padding:24px 20px 20px;font-family:Pretendard,Inter,sans-serif;text-align:left;position:relative;';
        popup.addEventListener('click', function(ev) { ev.stopPropagation(); });

        var h = '<div style="font-size:1.3em;font-weight:800;color:#2563eb;margin-bottom:8px;padding-right:56px;">' + entry.base + '</div>';
        h += '<div style="font-size:1.1em;color:#1e293b;font-weight:500;margin-bottom:4px;">🇻🇳 ' + (entry.meaning || '') + '</div>';

        if (entry.examples && entry.examples.length) {
            h += '<div style="text-align:left;margin-top:12px;border-top:1px solid #e2e8f0;padding-top:10px;">';
            h += '<small style="color:#94a3b8;font-weight:600;">VÍ DỤ</small>';
            for (var x = 0; x < Math.min(entry.examples.length, 4); x++) {
                var ex = typeof entry.examples[x] === 'string' ? entry.examples[x] : (entry.examples[x].ko || '');
                h += '<div style="margin-top:6px;padding:8px 12px;background:#f8fafc;border-radius:8px;font-size:0.9em;color:#334155;line-height:1.5;">' + ex + '</div>';
            }
            h += '</div>';
        }
        popup.innerHTML = h;

        var cb = document.createElement('button');
        cb.innerHTML = '×';
        cb.style.cssText = 'position:absolute;top:8px;right:12px;background:none;border:none;font-size:1.5em;cursor:pointer;color:#94a3b8;line-height:1;';
        cb.addEventListener('click', window.naCloseLookup);
        popup.appendChild(cb);

        var sb = document.createElement('button');
        sb.innerHTML = '🔊';
        sb.style.cssText = 'position:absolute;top:12px;right:44px;background:none;border:none;font-size:1.2em;cursor:pointer;';
        sb.addEventListener('click', function(ev) {
            ev.stopPropagation();
            if ('speechSynthesis' in window) {
                window.speechSynthesis.cancel();
                var u = new SpeechSynthesisUtterance(entry.base);
                u.lang = 'ko-KR'; u.rate = 0.85;
                window.speechSynthesis.speak(u);
            }
        });
        popup.appendChild(sb);

        overlay.appendChild(popup);
        document.body.appendChild(overlay);
    }

    function escapeHtml(text) {
        if (!text) return '';
        var d = document.createElement('div');
        d.textContent = text;
        return d.innerHTML;
    }

    function isKorean(ch) {
        var c = ch.charCodeAt(0);
        return (c >= 0xAC00 && c <= 0xD7AF) || (c >= 0x1100 && c <= 0x11FF) || (c >= 0x3130 && c <= 0x318F);
    }

    function hasKorean(text) {
        for (var i = 0; i < text.length; i++) { if (isKorean(text[i])) return true; }
        return false;
    }

    function cleanWord(text) {
        return text.replace(/^[^\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F]+/, '')
                   .replace(/[^\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F]+$/, '')
                   .trim();
    }

    // ── Sentence splitter for Korean ──────────────────────────────────
    function splitKrSentences(text) {
        var sentences = [];
        var regex = /([^.!?\n]+[.!?]+)/g;
        var match;
        while ((match = regex.exec(text)) !== null) {
            sentences.push(match[1].trim());
        }
        if (sentences.length === 0 && text.trim()) {
            sentences = text.split('\n').filter(function(l) { return l.trim(); }).map(function(l) { return l.trim(); });
        }
        return sentences;
    }

    function buildVnTabHtml(koContent, legacyViContent, preTranslatedArr) {
        // Legacy: pre-translated content from Firestore
        if (legacyViContent) {
            var koLines = koContent.split('\n').filter(function(l) { return l.trim(); });
            var viLines = legacyViContent.split('\n').filter(function(l) { return l.trim(); });
            var html = '';
            for (var i = 0; i < Math.max(koLines.length, viLines.length); i++) {
                html += '<div class="na-sentence-pair" id="naPair' + i + '">' +
                    '<div class="na-sentence-ko">' + escapeHtml(koLines[i] || '') + '</div>' +
                    '<div class="na-sentence-vi" style="color:#64748b;">' + escapeHtml(viLines[i] || '') + '</div>' +
                    '</div>';
            }
            return (html || '<div style="color:#94a3b8;text-align:center;padding:30px;">Chưa có bản dịch</div>') +
                '<div id="naVnAdminBar" style="display:none;text-align:right;margin-top:16px;"><button id="naEditTranslationBtn" style="padding:8px 18px;border:1.5px solid #e2e8f0;border-radius:10px;background:#fff;cursor:pointer;font-weight:700;font-size:0.85em;color:#4f46e5;">✏️ Sửa bản dịch</button></div>';
        }

        var sentences = splitKrSentences(koContent);
        if (sentences.length === 0) {
            return '<div style="color:#94a3b8;text-align:center;padding:30px;">Chưa có nội dung</div>' +
                '<div id="naVnAdminBar" style="display:none;text-align:right;margin-top:16px;"><button id="naEditTranslationBtn" style="padding:8px 18px;border:1.5px solid #e2e8f0;border-radius:10px;background:#fff;cursor:pointer;font-weight:700;font-size:0.85em;color:#4f46e5;">✏️ Sửa bản dịch</button></div>';
        }

        // Pre-translated array available — build paired HTML immediately
        if (preTranslatedArr && preTranslatedArr.length === sentences.length) {
            var h2 = '';
            for (var i2 = 0; i2 < sentences.length; i2++) {
                h2 += '<div class="na-sentence-pair" id="naPair' + i2 + '">' +
                    '<div class="na-sentence-ko">' + escapeHtml(sentences[i2]) + '</div>' +
                    '<div class="na-sentence-vi" style="color:#64748b;">' + escapeHtml(preTranslatedArr[i2] || '(không dịch được)') + '</div>' +
                    '</div>';
            }
            return (h2 || '<div style="color:#94a3b8;text-align:center;padding:30px;">Chưa có bản dịch</div>') +
                '<div id="naVnAdminBar" style="display:none;text-align:right;margin-top:16px;"><button id="naEditTranslationBtn" style="padding:8px 18px;border:1.5px solid #e2e8f0;border-radius:10px;background:#fff;cursor:pointer;font-weight:700;font-size:0.85em;color:#4f46e5;">✏️ Sửa bản dịch</button></div>';
        }

        return '<div id="naVnLoading" style="text-align:center;padding:40px 20px;color:#64748b;">' +
            '<div style="font-size:2em;margin-bottom:8px;">📖</div>' +
            '<div>Đang dịch ' + sentences.length + ' câu...</div>' +
            '<div style="font-size:0.8em;margin-top:6px;color:#94a3b8;">(Google Translate)</div>' +
            '</div>' +
            '<div id="naVnContent" style="display:none;"></div>' +
            '<div id="naVnAdminBar" style="display:none;text-align:right;margin-top:16px;"><button id="naEditTranslationBtn" style="padding:8px 18px;border:1.5px solid #e2e8f0;border-radius:10px;background:#fff;cursor:pointer;font-weight:700;font-size:0.85em;color:#4f46e5;">✏️ Sửa bản dịch</button></div>';
    }

    async function preloadVNTranslation(sentences, contentNode) {
        var hasVocabExternal = typeof window.VocabExternal !== 'undefined';
        var translations = new Array(sentences.length);
        contentNode._vnTranslating = true;

        var promises = sentences.map(function(text, idx) {
            return (async function() {
                var translated = '';
                try {
                    if (hasVocabExternal) translated = await window.VocabExternal._translate(text);
                } catch(e) {}
                if (!translated) {
                    try {
                        var url = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=ko&tl=vi&dt=t&q=' + encodeURIComponent(text);
                        var resp = await fetch(url);
                        var data = await resp.json();
                        translated = (data[0] || []).map(function(s) { return s[0]; }).join('') || '';
                    } catch(e2) {}
                }
                translations[idx] = translated || '';
            })();
        });

        await Promise.all(promises);
        contentNode._vnTranslations = translations;
        contentNode._vnTranslating = false;
    }

    async function translateSentences(koContent, articleId) {
        var target = document.getElementById('naVnContent');
        var loading = document.getElementById('naVnLoading');
        if (!target || target.innerHTML) return;

        var sentences = splitKrSentences(koContent);
        if (sentences.length === 0) return;

        var html = '';
        for (var i = 0; i < sentences.length; i++) {
            html += '<div class="na-sentence-pair" id="naPair' + i + '">' +
                '<div class="na-sentence-ko">' + escapeHtml(sentences[i]) + '</div>' +
                '<div class="na-sentence-vi" style="color:#94a3b8;">⏳ Đang dịch...</div>' +
                '</div>';
        }
        target.innerHTML = html;
        if (loading) loading.style.display = 'none';
        target.style.display = 'block';

        var hasVocabExternal = typeof window.VocabExternal !== 'undefined';
        var translations = new Array(sentences.length);

        var promises = sentences.map(function(text, idx) {
            return (async function() {
                var translated = '';
                try {
                    if (hasVocabExternal) {
                        translated = await window.VocabExternal._translate(text);
                    }
                } catch (e) { /* ignore */ }
                if (!translated) {
                    try {
                        var url = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=ko&tl=vi&dt=t&q=' + encodeURIComponent(text);
                        var resp = await fetch(url);
                        var data = await resp.json();
                        translated = (data[0] || []).map(function(s) { return s[0]; }).join('') || '';
                    } catch (e2) { /* ignore */ }
                }
                translations[idx] = translated || '';
                var viEl = document.querySelector('#naPair' + idx + ' .na-sentence-vi');
                if (viEl) {
                    viEl.textContent = translated || '(không dịch được)';
                    viEl.style.color = translated ? '#64748b' : '#94a3b8';
                }
            })();
        });

        // After all translations complete, ensure admin bar is shown
        Promise.all(promises).then(function() {
            var content = document.getElementById('naContent');
            if (content) content._vnTranslations = translations;
            setupVnAdminBar(articleId);
        });
    }

    function setupVnAdminBar(articleId) {
        var bar = document.getElementById('naVnAdminBar');
        if (!bar) return;
        if (typeof firebase === 'undefined' || !firebase.auth) {
            setTimeout(function() { setupVnAdminBar(articleId); }, 500);
            return;
        }
        var user = firebase.auth().currentUser;
        if (!user) {
            firebase.auth().onAuthStateChanged(function(u) {
                if (u) setupVnAdminBar(articleId);
            });
            return;
        }
        var ADMIN_EMAILS = ['nmhieu2526@gmail.com', 'vuihoctienghan27@gmail.com'];
        if (!ADMIN_EMAILS.includes(user.email)) { bar.style.display = 'none'; return; }

        bar.style.display = 'block';
        // Ensure content has articleId for the delegated click handler
        var content = document.getElementById('naContent');
        if (content && !content._articleId) content._articleId = articleId;
    }

    function openFullscreenEditor(articleId) {
        // Collect KR + VI sentences from current DOM (both legacy & auto-translate)
        var content = document.getElementById('naContent');
        var koEls = content.querySelectorAll('.na-sentence-ko');
        var viEls = content.querySelectorAll('.na-sentence-vi');
        var krSentences = [];
        var viSentences = [];
        koEls.forEach(function(el) { krSentences.push(el.textContent.trim()); });
        viEls.forEach(function(el) { viSentences.push(el.textContent.trim()); });

        var overlay = document.createElement('div');
        overlay.id = 'naEditorOverlay';
        overlay.style.cssText = 'position:fixed;inset:0;z-index:2147483640;background:#f1f5f9;overflow-y:auto;font-family:Pretendard,Inter,sans-serif;';

        var html = '<div style="max-width:1000px;margin:0 auto;padding:20px;">';
        // Header
        html += '<div style="display:flex;align-items:center;justify-content:space-between;padding:16px 0;position:sticky;top:0;background:#f1f5f9;z-index:10;border-bottom:2px solid #e2e8f0;margin-bottom:20px;">';
        html += '<h2 style="margin:0;font-size:1.3em;color:#1e293b;">✏️ Sửa bản dịch (' + krSentences.length + ' câu)</h2>';
        html += '<div style="display:flex;gap:8px;">';
        html += '<button id="naEditorSave" style="padding:10px 24px;border:none;border-radius:10px;background:#4f46e5;color:#fff;font-weight:700;cursor:pointer;font-size:0.95em;">💾 Lưu tất cả</button>';
        html += '<button id="naEditorClose" style="padding:10px 20px;border:1.5px solid #e2e8f0;border-radius:10px;background:#fff;color:#64748b;font-weight:700;cursor:pointer;font-size:0.95em;">✕ Đóng</button>';
        html += '</div></div>';

        // Sentence cards
        html += '<div style="display:flex;flex-direction:column;gap:16px;">';
        for (var i = 0; i < krSentences.length; i++) {
            var viText = viSentences[i] || '';
            html += '<div style="background:#fff;border-radius:14px;padding:18px 20px;box-shadow:0 2px 8px rgba(0,0,0,0.04);border:1px solid #e2e8f0;">';
            html += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">';
            html += '<span style="background:#eef2ff;color:#4f46e5;font-weight:800;font-size:0.75em;padding:3px 10px;border-radius:20px;">Câu ' + (i+1) + '</span>';
            html += '</div>';
            html += '<div style="font-size:1em;color:#1e293b;font-weight:600;margin-bottom:10px;padding:10px 14px;background:#f8fafc;border-radius:8px;line-height:1.6;">' + escapeHtml(krSentences[i]) + '</div>';
            html += '<textarea class="na-editor-vi" data-idx="' + i + '" style="width:100%;min-height:70px;padding:10px 14px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:0.92em;font-family:Pretendard,Inter,sans-serif;line-height:1.55;color:#334155;resize:vertical;" placeholder="Nhập bản dịch...">' + escapeHtml(viText) + '</textarea>';
            html += '</div>';
        }
        html += '</div>';
        html += '</div>'; // max-width container

        overlay.innerHTML = html;
        document.body.appendChild(overlay);
        document.body.style.overflow = 'hidden';

        // Close
        document.getElementById('naEditorClose').addEventListener('click', function() {
            overlay.remove();
            document.body.style.overflow = '';
        });
        overlay.addEventListener('click', function(ev) {
            if (ev.target === overlay) { overlay.remove(); document.body.style.overflow = ''; }
        });

        // Save
        document.getElementById('naEditorSave').addEventListener('click', function() {
            var textareas = overlay.querySelectorAll('.na-editor-vi');
            var newLines = [];
            textareas.forEach(function(ta) { newLines.push(ta.value.trim()); });
            var newViText = newLines.join('\n');

            var db = firebase.firestore();
            db.collection('daily-articles').doc(articleId).update({ contentVietnamese: newViText }).then(function() {
                // Update main page VI sentences
                for (var j = 0; j < newLines.length; j++) {
                    var viEl = document.querySelector('#naPair' + j + ' .na-sentence-vi');
                    if (viEl) {
                        viEl.textContent = newLines[j] || '(trống)';
                        viEl.style.color = newLines[j] ? '#64748b' : '#94a3b8';
                    }
                }
                var content = document.getElementById('naContent');
                if (content) content._vnCached = content.innerHTML;
                overlay.remove();
                document.body.style.overflow = '';
            }).catch(function(e) {
                alert('Lỗi lưu: ' + e.message);
            });
        });

        // Escape key to close
        document.addEventListener('keydown', function handler(ev) {
            if (ev.key === 'Escape') {
                overlay.remove();
                document.body.style.overflow = '';
                document.removeEventListener('keydown', handler);
            }
        });
    }

    function buildVocabTabHtml(vocabList, articleId, isAdmin) {
        var html = '';
        if (vocabList.length > 0) {
            html += '<div class="na-vocab-grid">';
            vocabList.forEach(function(v, i) {
                var word = v.word || (typeof v === 'string' ? v : '');
                var meaning = v.meaning || '';
                var iconHtml = '';
                if (isAdmin) {
                    iconHtml = '<span class="na-vocab-del" onclick="event.stopPropagation();window.naDeleteArticleVocab(\'' + i + '\')" title="Xoá">×</span>';
                } else {
                    iconHtml = '<span class="na-vocab-star" onclick="event.stopPropagation();window.naSaveToMyVocab(this)" title="Lưu vào sổ từ vựng">☆</span>';
                }
                html += '<div class="na-vocab-card" data-idx="' + i + '" data-ex-kr="' + (v.ex_kr || '').replace(/"/g, '&quot;') + '" data-ex-vn="' + (v.ex_vn || '').replace(/"/g, '&quot;') + '" data-def="' + (v.definition || '').replace(/"/g, '&quot;') + '" style="cursor:pointer;" onclick="window.naOpenFlashcard(this)">' +
                    iconHtml +
                    '<div class="vw-word">' + escapeHtml(word) + '</div>' +
                    '<div class="vw-meaning">' + escapeHtml(meaning) + '</div>' +
                    '</div>';
            });
            html += '</div>';
        } else {
            html += '<div style="color:#94a3b8;text-align:center;padding:30px;">Chưa có từ vựng nào</div>';
        }

        // Admin section — same style as vocab.html
        html += '<div class="na-vocab-admin" id="naVocabAdmin" style="display:none;">' +
            '<h4 style="margin:0 0 10px;font-size:1em;font-weight:800;">➕ Thêm từ vựng cho bài báo</h4>' +
            '<div class="na-vocab-add-row">' +
                '<div class="na-vocab-input-wrap">' +
                    '<input type="text" id="naVocabWord" placeholder="Nhập từ vựng..." autocomplete="off">' +
                '</div>' +
                '<div class="na-vocab-input-wrap">' +
                    '<input type="text" id="naVocabMeaning" placeholder="Nghĩa dịch..." autocomplete="off">' +
                    '<div id="naVocabSuggestBox" class="na-vocab-suggest-box"></div>' +
                '</div>' +
                '<button id="naVocabAddBtn">Thêm từ</button>' +
            '</div>' +
            '<details style="margin-top:10px;">' +
                '<summary style="cursor:pointer;font-weight:700;font-size:0.85em;color:#64748b;">📋 Import hàng loạt</summary>' +
                '<textarea id="naVocabBulk" placeholder="Mỗi dòng: từ|nghĩa&#10;VD: 해소하다|giải tỏa" style="margin-top:8px;width:100%;min-height:80px;padding:10px;border:1.5px solid #e2e8f0;border-radius:10px;font-size:0.9em;resize:vertical;"></textarea>' +
                '<button id="naVocabBulkBtn" style="margin-top:6px;padding:8px 16px;border:none;border-radius:8px;background:#f59e0b;color:#fff;font-weight:700;cursor:pointer;">Import</button>' +
                '<button id="naVocabClearBtn" style="margin-top:6px;margin-left:6px;padding:8px 16px;border:1px solid #fecaca;border-radius:8px;background:#fef2f2;color:#ef4444;font-weight:700;cursor:pointer;">🗑 Xoá tất cả</button>' +
            '</details>' +
            '</div>';

        return html;
    }

    function setupVocabAdmin(articleId) {
        var adminSection = document.getElementById('naVocabAdmin');
        if (!adminSection) return;
        if (typeof firebase === 'undefined' || !firebase.auth) return;
        var user = firebase.auth().currentUser;
        if (!user) return;
        var ADMIN_EMAILS = ['nmhieu2526@gmail.com', 'vuihoctienghan27@gmail.com'];
        if (!ADMIN_EMAILS.includes(user.email)) return;

        adminSection.style.display = 'block';
        var db = firebase.firestore();

        // ── Translate helper ─────────────────────────────────────────
        async function translateKoVi(text) {
            if (!text) return '';
            try {
                var resp = await fetch('https://translate.googleapis.com/translate_a/single?client=gtx&sl=ko&tl=vi&dt=t&q=' + encodeURIComponent(text));
                var data = await resp.json();
                return (data[0] || []).map(function(s) { return s[0]; }).join('') || '';
            } catch(_) { return ''; }
        }

        // ── KRDict helpers ───────────────────────────────────────────
        function findInFullDict(word) {
            if (!window.AutoVocabDictFull) return null;
            var q = word.toLowerCase();
            for (var i = 0; i < window.AutoVocabDictFull.length; i++) {
                if (window.AutoVocabDictFull[i].w.toLowerCase() === q) return window.AutoVocabDictFull[i];
            }
            return null;
        }

        function enrichWordData(word, meaning) {
            return (async function() {
                var result = { ex_kr: '', ex_vn: '', definition: '' };
                // 1. Hand-edited dict
                if (window.AutoVocabDict) {
                    var hf = window.AutoVocabDict.find(function(e) { return e.base === word; });
                    if (hf) {
                        if (hf.examples && hf.examples.length) {
                            result.ex_kr = hf.examples[0];
                            result.ex_vn = await translateKoVi(result.ex_kr);
                        }
                        return result;
                    }
                }
                // 2. KRDict full
                var full = findInFullDict(word);
                if (full) {
                    var sense = full.s ? full.s[0] : full;
                    result.definition = sense.d || full.d || '';
                    if (sense.x && sense.x.length) {
                        result.ex_kr = typeof sense.x[0] === 'string' ? sense.x[0] : (sense.x[0].ko || '');
                        if (result.ex_kr) result.ex_vn = await translateKoVi(result.ex_kr);
                    }
                }
                return result;
            })();
        }

        // ── Suggest box ──────────────────────────────────────────────
        var suggestTimer;
        document.getElementById('naVocabWord').addEventListener('input', function() {
            var word = this.value.trim();
            var suggestBox = document.getElementById('naVocabSuggestBox');
            if (!word) { suggestBox.style.display = 'none'; return; }
            clearTimeout(suggestTimer);
            suggestTimer = setTimeout(function() {
                var html = '';
                // Hand-edited dict
                if (window.AutoVocabDict) {
                    var hf = window.AutoVocabDict.find(function(e) { return e.base === word; });
                    if (hf) {
                        html += '<div class="suggest-item" onclick="window.naSelectVocab(\'' + hf.meaning.replace(/'/g, "\\'") + '\')"><span class="src krdict">📖</span>' + hf.meaning + '</div>';
                    }
                }
                // KRDict full
                var full = findInFullDict(word);
                if (full) {
                    var senses = full.s || [full];
                    for (var i = 0; i < Math.min(senses.length, 5); i++) {
                        var s = senses[i];
                        html += '<div class="suggest-item" onclick="window.naSelectVocab(\'' + (s.m || full.m || '').replace(/'/g, "\\'") + '\')"><span class="src krdict">📖</span>' + (s.m || full.m) + ' <small style="color:#94a3b8;">' + ((s.d || full.d || '').substring(0, 50)) + '</small></div>';
                    }
                }
                // Google Translate fallback
                if (!html) {
                    html += '<div class="suggest-item" id="naGTransItem"><span class="src gtrans">🌐</span>Đang dịch...</div>';
                    translateKoVi(word).then(function(t) {
                        var gItem = document.getElementById('naGTransItem');
                        if (gItem) {
                            gItem.innerHTML = '<span class="src gtrans">🌐</span>' + (t || 'Không có kết quả');
                            gItem.setAttribute('onclick', 'window.naSelectVocab(\'' + (t || '').replace(/'/g, "\\'") + '\')');
                        }
                    });
                }
                suggestBox.innerHTML = html;
                suggestBox.style.display = html ? 'block' : 'none';
            }, 400);
        });

        // Click outside to close suggest box
        document.addEventListener('click', function(e) {
            var box = document.getElementById('naVocabSuggestBox');
            if (box && !box.contains(e.target) && e.target.id !== 'naVocabWord') {
                box.style.display = 'none';
            }
        });

        // ── Select suggestion ────────────────────────────────────────
        window.naSelectVocab = function(meaning) {
            document.getElementById('naVocabMeaning').value = meaning;
            document.getElementById('naVocabSuggestBox').style.display = 'none';
        };

        // ── Save helpers ─────────────────────────────────────────────
        function collectArticleVocab() {
            var content = document.getElementById('naContent');
            var cards = content.querySelectorAll('.na-vocab-card');
            var list = [];
            cards.forEach(function(c) {
                list.push({
                    word: (c.querySelector('.vw-word') || {}).textContent || '',
                    meaning: (c.querySelector('.vw-meaning') || {}).textContent || '',
                    ex_kr: c.getAttribute('data-ex-kr') || '',
                    ex_vn: c.getAttribute('data-ex-vn') || '',
                    definition: c.getAttribute('data-def') || ''
                });
            });
            return list;
        }

        function saveArticleVocab(newList) {
            return db.collection('daily-articles').doc(articleId).update({ vocabList: newList });
        }

        async function addWordToArticle(word, meaning) {
            var btn = document.getElementById('naVocabAddBtn');
            if (!btn) return;
            btn.disabled = true; btn.textContent = 'Đang thêm...';

            // Save immediately (word + meaning only, enrichment background)
            var currentList = collectArticleVocab();
            currentList.push({ word: word, meaning: meaning, ex_kr: '', ex_vn: '', definition: '' });
            try {
                await saveArticleVocab(currentList);
            } catch(e) { alert('Lỗi: ' + e.message); btn.disabled = false; btn.textContent = 'Thêm từ'; return; }

            _naVocabDataCache = currentList; naGameList = [];

            // Add card to DOM immediately
            var grid = document.querySelector('.na-vocab-grid');
            // Remove empty state if exists
            var emptyEl = grid.parentElement.querySelector(':scope > div[style]');
            if (emptyEl && emptyEl.textContent.indexOf('Chưa có') !== -1) emptyEl.remove();
            var idx = currentList.length - 1;
            var cardHtml = '<div class="na-vocab-card" data-idx="' + idx + '" data-ex-kr="" data-ex-vn="" data-def="" style="cursor:pointer;" onclick="window.naOpenFlashcard(this)">' +
                '<span class="na-vocab-del" onclick="event.stopPropagation();window.naDeleteArticleVocab(\'' + idx + '\')" title="Xoá">×</span>' +
                '<div class="vw-word">' + escapeHtml(word) + '</div>' +
                '<div class="vw-meaning">' + escapeHtml(meaning) + '</div>' +
                '</div>';
            grid.insertAdjacentHTML('beforeend', cardHtml);

            // Show FAB if on vocab tab
            var content = document.getElementById('naContent');
            content._hasVocab = true;
            content._tabContents.vocab = content.innerHTML;
            if (content._activeTab === 'vocab') {
                document.getElementById('naFabContainer').classList.remove('na-fab-hide');
            }

            // Enrich in background
            enrichWordData(word, meaning).then(function(enriched) {
                if (!enriched.ex_kr && !enriched.definition) return;
                // Update Firestore with enriched data
                var updatedList = collectArticleVocab();
                for (var i = 0; i < updatedList.length; i++) {
                    if (updatedList[i].word === word) {
                        updatedList[i] = { word: word, meaning: meaning, ex_kr: enriched.ex_kr, ex_vn: enriched.ex_vn, definition: enriched.definition };
                        break;
                    }
                }
                saveArticleVocab(updatedList).then(function() {
                    _naVocabDataCache = updatedList; naGameList = [];
                    // Update card data attributes
                    var newCard = grid.querySelector('.na-vocab-card[data-idx="' + idx + '"]');
                    if (newCard) {
                        newCard.setAttribute('data-ex-kr', enriched.ex_kr);
                        newCard.setAttribute('data-ex-vn', enriched.ex_vn);
                        newCard.setAttribute('data-def', enriched.definition);
                    }
                });
            }).catch(function() {});

            // Clear inputs
            document.getElementById('naVocabWord').value = '';
            document.getElementById('naVocabMeaning').value = '';
            document.getElementById('naVocabSuggestBox').style.display = 'none';
            document.getElementById('naVocabWord').focus();
            btn.disabled = false; btn.textContent = 'Thêm từ';
        }

        document.getElementById('naVocabAddBtn').addEventListener('click', function() {
            var word = document.getElementById('naVocabWord').value.trim();
            var meaning = document.getElementById('naVocabMeaning').value.trim();
            if (!word || !meaning) { alert('Vui lòng nhập từ và nghĩa!'); return; }
            addWordToArticle(word, meaning);
        });

        document.getElementById('naVocabBulkBtn').addEventListener('click', async function() {
            var raw = document.getElementById('naVocabBulk').value.trim();
            if (!raw) return;
            var btn = this;
            btn.disabled = true; btn.textContent = 'Đang import...';
            var currentList = collectArticleVocab();
            var lines = raw.split('\n');
            var newWords = [];
            for (var i = 0; i < lines.length; i++) {
                var line = lines[i].trim();
                if (!line) continue;
                var sep = line.indexOf('|');
                if (sep === -1) sep = line.indexOf(':');
                var w = '', m = '';
                if (sep !== -1) { w = line.substring(0, sep).trim(); m = line.substring(sep + 1).trim(); }
                else { w = line; m = ''; }
                if (!w) continue;
                currentList.push({ word: w, meaning: m, ex_kr: '', ex_vn: '', definition: '' });
                newWords.push({ word: w, meaning: m });
            }
            await saveArticleVocab(currentList);
            _naVocabDataCache = currentList; naGameList = [];
            // Rebuild DOM
            var content = document.getElementById('naContent');
            var isAdmin = content.querySelector('.na-vocab-del') !== null;
            var vocabHtml = buildVocabTabHtml(currentList, articleId, isAdmin);
            content._hasVocab = true;
            content._tabContents.vocab = vocabHtml;
            content.innerHTML = vocabHtml;
            if (content._activeTab === 'vocab') {
                document.getElementById('naFabContainer').classList.remove('na-fab-hide');
            }
            document.getElementById('naVocabBulk').value = '';
            btn.disabled = false; btn.textContent = 'Import';
        });

        document.getElementById('naVocabClearBtn').addEventListener('click', function() {
            if (confirm('Xoá tất cả từ vựng của bài này?')) {
                saveArticleVocab([]).then(function() {
                    _naVocabDataCache = []; naGameList = [];
                    var content = document.getElementById('naContent');
                    content.innerHTML = '<div style="color:#94a3b8;text-align:center;padding:30px;">Chưa có từ vựng nào</div><div class="na-vocab-admin" id="naVocabAdmin" style="display:none;"></div>';
                    content._hasVocab = false;
                    content._tabContents.vocab = content.innerHTML;
                    document.getElementById('naFabContainer').classList.add('na-fab-hide');
                });
            }
        });
    }
    function renderArticle(article) {
        var tabBar = document.getElementById('naTabBar');
        var content = document.getElementById('naContent');
        var shareBar = document.getElementById('naShareBar');
        var header = document.getElementById('naHeader');

        var dateStr = '';
        if (article.createdAt && article.createdAt.toDate) {
            dateStr = new Date(article.createdAt.toDate()).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
        }
        header.innerHTML =
            (article.thumbnailUrl
                ? '<img class="na-thumb" src="' + escapeHtml(article.thumbnailUrl) + '" alt="" onerror="this.classList.add(\'no-img\');this.innerHTML=\'\';">'
                : '<div class="na-thumb no-img"></div>') +
            '<div class="na-header-body">' +
                '<h1>' + escapeHtml(article.title || 'Không có tiêu đề') + '</h1>' +
                '<div class="na-meta">' +
                    (article.topic ? '<span>🏷 ' + escapeHtml(article.topic) + '</span>' : '') +
                    (article.source ? '<span>📰 ' + escapeHtml(article.source) + '</span>' : '') +
                    '<span>👁 ' + (article.viewCount || 0) + ' lượt xem</span>' +
                    (dateStr ? '<span>📅 ' + dateStr + '</span>' : '') +
                '</div>' +
            '</div>';

        var koContent = article.contentKorean || '';
        var grammarRaw = article.grammarNote || '';

        // Detect if content is HTML (from rich text editor)
        var isHtml = /<[a-z][\s\S]*>/i.test(koContent);

        // KR tab
        var krHtml;
        if (isHtml) {
            krHtml = '<div class="na-kr-text" style="line-height:1.9;">' + koContent + '</div>';
        } else {
            krHtml = '<div class="na-kr-text">' + escapeHtml(koContent).replace(/\n/g, '<br>') + '</div>';
        }

        // Strip HTML for auto-translate
        var koPlain = isHtml ? koContent.replace(/<[^>]*>/g, '') : koContent;

        // VN tab — auto-translate sentence by sentence
        var vnHtml = buildVnTabHtml(koContent, article.contentVietnamese);

        // Grammar
        var grammarHtml = '';
        if (grammarRaw.trim()) {
            var rawLines = grammarRaw.split('\n');
            // Merge continuation lines (no | separator) into previous card
            var cleaned = [];
            for (var li = 0; li < rawLines.length; li++) {
                var l = rawLines[li];
                if (l.indexOf('|') !== -1 || cleaned.length === 0) {
                    cleaned.push(l);
                } else {
                    cleaned[cleaned.length - 1] += '\\n' + l;
                }
            }
            var blocks = cleaned.filter(function(l) { return l.trim(); });
            grammarHtml = '<div class="na-grammar-list" id="naGrammarList">';
            blocks.forEach(function(block, idx) {
                var pipeIdx = block.indexOf('|');
                var isFirst = (idx === 0) ? ' open' : '';
                if (pipeIdx !== -1) {
                    var gmBody = block.substring(pipeIdx + 1).trim();
                    var bodyHtml;
                    if (/<[a-z][\s\S]*>/i.test(gmBody)) {
                        // Rich text content
                        bodyHtml = gmBody.replace(/\\n/g, '<br>');
                    } else {
                        bodyHtml = escapeHtml(gmBody).replace(/\\n/g, '<br>');
                    }
                    grammarHtml += '<div class="na-grammar-card' + isFirst + '"><div class="gm-title">' + escapeHtml(block.substring(0, pipeIdx).trim()) + '</div><div class="gm-body">' + bodyHtml + '</div></div>';
                } else {
                    grammarHtml += '<div class="na-grammar-card' + isFirst + '"><div class="gm-title" style="cursor:default;">' + escapeHtml(block.trim()) + '</div><div class="gm-body"></div></div>';
                }
            });
            grammarHtml += '</div>';
        } else {
            grammarHtml = '<div style="color:#94a3b8;text-align:center;padding:30px;">Chưa có giải thích ngữ pháp</div>';
        }

        // Bind accordion logic when grammar tab is shown
        function bindGrammarAccordion() {
            var list = document.getElementById('naGrammarList');
            if (!list) return;
            list.querySelectorAll('.gm-title').forEach(function(title) {
                title.addEventListener('click', function() {
                    var card = title.parentElement;
                    card.classList.toggle('open');
                });
            });
        }

        // Vocab
        var vocabList = article.vocabList || [];
        // Check admin for vocab icons
        var isAdmin = false;
        if (typeof firebase !== 'undefined' && firebase.auth) {
            var u = firebase.auth().currentUser;
            if (u) {
                var ADMIN_EMAILS = ['nmhieu2526@gmail.com', 'vuihoctienghan27@gmail.com'];
                isAdmin = ADMIN_EMAILS.includes(u.email);
            }
        }
        var vocabHtml = buildVocabTabHtml(vocabList, article.id, isAdmin);
        _naVocabDataCache = vocabList.slice(); // cache for cross-tab game access

        // Highlight article vocab in KR text
        if (vocabList.length > 0) {
            vocabList.forEach(function(v) {
                var word = v.word || v;
                if (!word) return;
                var escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                var regex = new RegExp('(' + escaped + ')', 'g');
                // For HTML content: wrap in span directly
                // For plain text: after escapeHtml, wrap in span
                if (isHtml) {
                    krHtml = krHtml.replace(regex, '<span class="kr-click-word" style="cursor:pointer;border-bottom:1px dashed #2563eb;" onclick="event.stopPropagation();window.naLookupWord(\'' + word.replace(/'/g, "\\'") + '\')">$1</span>');
                } else {
                    krHtml = krHtml.replace(regex, '<span class="kr-click-word" style="cursor:pointer;border-bottom:1px dashed #2563eb;" onclick="event.stopPropagation();window.naLookupWord(\'' + word.replace(/'/g, "\\'") + '\')" data-base="' + word.replace(/'/g, "\\'") + '">$1</span>');
                }
            });
        }

        content._tabContents = { kr: krHtml, vn: vnHtml, grammar: grammarHtml, vocab: vocabHtml };
        content._articleId = article.id;
        content.innerHTML = krHtml;

        // FAB shown only on vocab tab — store flag
        content._hasVocab = vocabList.length > 0;
        var fab = document.getElementById('naFabContainer');
        fab.classList.add('na-fab-hide');

        // Preload Vietnamese translation in background (not waiting for tab switch)
        if (!article.contentVietnamese) {
            var vnSentences = splitKrSentences(koPlain);
            if (vnSentences.length > 0) {
                content._vnTranslations = null;
                content._vnTranslating = false;
                preloadVNTranslation(vnSentences, content);
            }
        }

        // Check saved stars
        setTimeout(updateSavedStars, 500);

        // ── Dblclick lookup (disabled on vocab tab) ───────────────────
        content.addEventListener('dblclick', function(ev) {
            // Skip if inside vocab card
            if (ev.target.closest('.na-vocab-card') || ev.target.closest('#naVocabAdmin')) return;
            var sel = window.getSelection();
            if (!sel) return;
            var text = sel.toString().trim();
            if (!text || text.length > 30 || !hasKorean(text)) return;
            var word = cleanWord(text);
            if (word) lookupWord(word);
        });

        // ── Tab switching ────────────────────────────────────────────────
        var koContentForVn = koPlain;
        content._activeTab = 'kr';

        tabBar.querySelectorAll('.na-tab-btn').forEach(function(btn) {
            btn.addEventListener('click', function() {
                var prevTab = content._activeTab;
                var tab = btn.getAttribute('data-tab');
                if (prevTab === tab) return;

                tabBar.querySelectorAll('.na-tab-btn').forEach(function(b) { b.classList.remove('active'); });
                btn.classList.add('active');

                // Save current tab content before switching
                if (prevTab === 'vn') {
                    content._vnCached = content.innerHTML;
                }

                content._activeTab = tab;

                if (tab === 'vn') {
                    if (content._vnCached) {
                        content.innerHTML = content._vnCached;
                    } else if (content._vnTranslations && !content._vnTranslating) {
                        content.innerHTML = buildVnTabHtml(koContentForVn, article.contentVietnamese || '', content._vnTranslations);
                    } else {
                        content.innerHTML = buildVnTabHtml(koContentForVn, article.contentVietnamese || '');
                        if (!content._vnTranslating) {
                            translateSentences(koContentForVn, article.id);
                        }
                    }
                    setupVnAdminBar(article.id);
                } else {
                    content.innerHTML = content._tabContents[tab] || '';
                }

                // Show/hide FAB based on active tab
                var fab = document.getElementById('naFabContainer');
                if (tab === 'vocab' && content._hasVocab) {
                    fab.classList.remove('na-fab-hide');
                    setTimeout(function() {
                        var t = fab.querySelector('.na-fab-tooltip');
                        if (t) setTimeout(function() { t.style.display = 'none'; }, 8000);
                    }, 100);
                } else {
                    fab.classList.add('na-fab-hide');
                }

                // Re-bind accordion when switching to grammar tab
                if (tab === 'grammar') { setTimeout(bindGrammarAccordion, 10); }
                if (tab === 'vocab') { setTimeout(function() { setupVocabAdmin(article.id); updateSavedStars(); }, 10); }
            });
        });

        // Share bar
        var articleUrl = window.location.href;
        shareBar.innerHTML =
            '<button onclick="navigator.clipboard.writeText(\'' + articleUrl.replace(/'/g, "\\'") + '\');this.innerHTML=\'✅ Đã sao chép!\';setTimeout(function(){this.innerHTML=\'📋 Sao chép link\';}.bind(this),2000);">📋 Sao chép link</button>' +
            '<button onclick="window.open(\'https://www.facebook.com/sharer/sharer.php?u=\'+encodeURIComponent(\'' + articleUrl.replace(/'/g, "\\'") + '\'),\'_blank\')">📤 Chia sẻ</button>';

        document.title = (article.title || 'Đọc Báo') + ' - Vui Học Tiếng Hàn';
    }

    function showError(msg) {
        var content = document.getElementById('naContent');
        if (content) {
            content.innerHTML = '<div style="text-align:center;padding:60px 20px;color:#94a3b8;"><div style="font-size:3em;margin-bottom:12px;">⚠️</div><h3 style="color:#94a3b8;">' + escapeHtml(msg) + '</h3></div>';
        }
    }

    // ── Init ────────────────────────────────────────────────────────────
    function init() {
        var params = new URLSearchParams(window.location.search);
        var articleId = params.get('id');
        if (!articleId) { showError('Thiếu ID bài viết.'); return; }

        if (typeof firebase === 'undefined' || !firebase.firestore) {
            setTimeout(init, 300); return;
        }

        var db = firebase.firestore();
        db.collection('daily-articles').doc(articleId).get().then(function(doc) {
            if (!doc.exists) { showError('Không tìm thấy bài viết này.'); return; }
            var article = { id: doc.id, createdAt: doc.data().createdAt, ...doc.data() };
            renderArticle(article);
            setupAdminBar(article);
            // Increment view count
            db.collection('daily-articles').doc(articleId).update({
                viewCount: firebase.firestore.FieldValue.increment(1)
            }).catch(function() { /* ignore if field doesn't exist yet */ });
        }).catch(function(e) {
            showError('Lỗi tải dữ liệu: ' + e.message);
        });
    }

    function setupAdminBar(article) {
        if (typeof firebase === 'undefined' || !firebase.auth) {
            setTimeout(function() { setupAdminBar(article); }, 500);
            return;
        }
        var user = firebase.auth().currentUser;
        if (!user) {
            firebase.auth().onAuthStateChanged(function(u) {
                if (u) setupAdminBar(article);
            });
            return;
        }
        var ADMIN_EMAILS = ['nmhieu2526@gmail.com', 'vuihoctienghan27@gmail.com'];
        if (!ADMIN_EMAILS.includes(user.email)) return;

        var bar = document.getElementById('naAdminBar');
        if (!bar) return;
        bar.classList.add('visible');

        var editBtn = document.getElementById('naBtnEdit');
        if (editBtn) {
            editBtn.onclick = function(e) {
                e.preventDefault();
                window.location.href = 'dailynews.html#edit=' + encodeURIComponent(article.id);
            };
        }

        var delBtn = document.getElementById('naBtnDelete');
        if (delBtn) {
            delBtn.onclick = function(e) {
                e.preventDefault();
                Swal.fire({
                    title: 'Xoá bài viết?',
                    text: 'Hành động này không thể hoàn tác!',
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonColor: '#ef4444',
                    confirmButtonText: 'Xoá',
                    cancelButtonText: 'Huỷ'
                }).then(function(result) {
                    if (!result.isConfirmed) return;
                    var db = firebase.firestore();
                    db.collection('daily-articles').doc(article.id).delete().then(function() {
                        window.location.href = 'dailynews.html';
                    }).catch(function(e) {
                        Swal.fire({ icon: 'error', title: 'Lỗi', text: e.message });
                    });
                });
            };
        }
    }

    // ── Delete article vocab (admin) ────────────────────────────────
    window.naDeleteArticleVocab = function(idx) {
        var content = document.getElementById('naContent');
        var cards = content.querySelectorAll('.na-vocab-card');
        var card = cards[idx];
        if (!card) return;
        // Remove from DOM immediately
        card.style.transition = '0.2s';
        card.style.opacity = '0';
        card.style.transform = 'scale(0.8)';
        setTimeout(function() { card.remove(); }, 200);

        // Build updated list and save
        var newList = [];
        cards.forEach(function(c, j) {
            if (j !== idx) {
                newList.push({
                    word: (c.querySelector('.vw-word') || {}).textContent || '',
                    meaning: (c.querySelector('.vw-meaning') || {}).textContent || '',
                    ex_kr: c.getAttribute('data-ex-kr') || '',
                    ex_vn: c.getAttribute('data-ex-vn') || '',
                    definition: c.getAttribute('data-def') || ''
                });
            }
        });
        var params = new URLSearchParams(window.location.search);
        var articleId = params.get('id');
        firebase.firestore().collection('daily-articles').doc(articleId).update({ vocabList: newList }).then(function() {
            _naVocabDataCache = newList; naGameList = [];
            // Update count if empty
            var remaining = content.querySelectorAll('.na-vocab-card');
            if (remaining.length === 0) {
                content.querySelector('.na-vocab-grid').innerHTML = '<div style="color:#94a3b8;text-align:center;padding:30px;">Chưa có từ vựng nào</div>';
                content._hasVocab = false;
                content._tabContents.vocab = content.innerHTML;
                document.getElementById('naFabContainer').classList.add('na-fab-hide');
            } else {
                content._tabContents.vocab = content.innerHTML;
            }
            // Update cached content
            content._vnCached = null;
        });
    };

    // ── Save article vocab to personal collection (user) ────────────
    window.naSaveToMyVocab = function(starEl) {
        if (typeof firebase === 'undefined' || !firebase.auth) return;
        var user = firebase.auth().currentUser;
        if (!user) { Swal.fire({ icon: 'warning', title: 'Yêu cầu đăng nhập', text: 'Vui lòng đăng nhập để lưu từ vựng!', confirmButtonColor: '#2563eb' }); return; }
        var uid = user.uid;
        var db = firebase.firestore();

        // Read from card
        var card = starEl.closest('.na-vocab-card');
        var word = (card.querySelector('.vw-word') || {}).textContent || '';
        var meaning = (card.querySelector('.vw-meaning') || {}).textContent || '';
        var exKr = card.getAttribute('data-ex-kr') || '';
        var exVn = card.getAttribute('data-ex-vn') || '';
        var definition = card.getAttribute('data-def') || '';

        if (!word) return;

        // Quick save without folder picker — save to "Đã lưu" directly if already showing ★
        if (starEl.textContent === '★') return;

        // Load user's folder list
        db.collection('users').doc(uid).get().then(function(userDoc) {
            var folders = (userDoc.exists && userDoc.data().vocabLists) || ['Đã lưu'];
            if (!folders.includes('Đã lưu')) folders.unshift('Đã lưu');

            var folderHtml = '';
            folders.forEach(function(f) {
                folderHtml += '<button class="na-save-folder-btn" data-folder="' + f + '" style="display:block;width:100%;text-align:left;padding:10px 14px;border:none;background:#f8fafc;border-radius:8px;margin-bottom:5px;cursor:pointer;font-weight:600;color:#1e293b;transition:0.2s;">📁 ' + f + '</button>';
            });
            folderHtml += '<button class="na-save-new-folder-btn" style="display:block;width:100%;text-align:left;padding:10px 14px;border:none;background:#fef3c7;border-radius:8px;cursor:pointer;font-weight:600;color:#d97706;transition:0.2s;">＋ Tạo thư mục mới</button>';

            Swal.fire({
                title: '📁 Chọn thư mục',
                html: '<div style="font-size:0.9em;color:#64748b;margin-bottom:10px;">Lưu "' + word + '" vào:</div>' + folderHtml,
                showConfirmButton: false,
                showCloseButton: true,
                didOpen: function() {
                    Swal.getHtmlContainer().querySelectorAll('.na-save-folder-btn').forEach(function(btn) {
                        btn.onclick = function() { showLessonPicker(btn.getAttribute('data-folder')); };
                    });
                    Swal.getHtmlContainer().querySelector('.na-save-new-folder-btn').onclick = function() {
                        Swal.fire({
                            title: 'Tạo thư mục mới',
                            input: 'text', inputPlaceholder: 'Tên thư mục...',
                            showCancelButton: true, confirmButtonColor: '#3b82f6', confirmButtonText: 'Tạo'
                        }).then(function(r) {
                            if (!r.isConfirmed || !r.value.trim()) return;
                            var newName = r.value.trim();
                            db.collection('users').doc(uid).set({ vocabLists: firebase.firestore.FieldValue.arrayUnion(newName) }, { merge: true }).then(function() {
                                showLessonPicker(newName);
                            });
                        });
                    };
                }
            });

            function showLessonPicker(folder) {
                db.collection('users').doc(uid).collection('vocabulary')
                    .where('listName', '>=', folder + '/')
                    .where('listName', '<=', folder + '/\uf8ff')
                    .get().then(function(snap) {
                        var lessons = new Set();
                        snap.forEach(function(d) {
                            var ln = d.data().listName || '';
                            if (ln.startsWith(folder + '/')) lessons.add(ln);
                        });
                        var lessonArr = Array.from(lessons).sort();
                        if (lessonArr.length === 0) lessonArr = [folder + '/Đã lưu'];

                        var lessonHtml = '';
                        lessonArr.forEach(function(l) {
                            var sn = l.includes('/') ? l.split('/').slice(1).join('/') : l;
                            lessonHtml += '<button class="na-save-lesson-btn" data-list="' + l + '" style="display:block;width:100%;text-align:left;padding:10px 14px;border:none;background:#f0fdf4;border-radius:8px;margin-bottom:4px;cursor:pointer;font-weight:600;color:#059669;transition:0.2s;">📖 ' + sn + '</button>';
                        });
                        lessonHtml += '<button class="na-save-new-lesson-btn" data-folder="' + folder + '" style="display:block;width:100%;text-align:left;padding:10px 14px;border:none;background:#fef3c7;border-radius:8px;cursor:pointer;font-weight:600;color:#d97706;">＋ Tạo bài học mới</button>';
                        lessonHtml += '<button class="na-save-back-btn" style="display:block;width:100%;text-align:left;padding:8px 14px;border:none;background:#f1f5f9;border-radius:8px;cursor:pointer;font-weight:600;color:#64748b;">← Trở về</button>';

                        Swal.fire({
                            title: '📁 ' + folder,
                            html: '<div style="font-size:0.9em;color:#64748b;margin-bottom:10px;">Chọn bài học cho "' + word + '":</div>' + lessonHtml,
                            showConfirmButton: false, showCloseButton: true,
                            didOpen: function() {
                                Swal.getHtmlContainer().querySelectorAll('.na-save-lesson-btn').forEach(function(lb) {
                                    lb.onclick = function() { saveWord(lb.getAttribute('data-list')); };
                                });
                                Swal.getHtmlContainer().querySelector('.na-save-new-lesson-btn').onclick = function() {
                                    Swal.fire({
                                        title: 'Tạo bài học trong "' + folder + '"',
                                        input: 'text', inputPlaceholder: 'Tên bài học...',
                                        showCancelButton: true, confirmButtonColor: '#3b82f6', confirmButtonText: 'Tạo'
                                    }).then(function(r2) {
                                        if (!r2.isConfirmed || !r2.value.trim()) return;
                                        saveWord(folder + '/' + r2.value.trim());
                                    });
                                };
                                Swal.getHtmlContainer().querySelector('.na-save-back-btn').onclick = function() {
                                    window.naSaveToMyVocab(starEl);
                                };
                            }
                        });
                    });
            }

            function saveWord(listName) {
                Swal.close();
                var safeId = listName.replace(/[/\s]/g, '_') + '_' + word;
                db.collection('users').doc(uid).collection('vocabulary').doc(safeId).set({
                    word: word, meaning: meaning, listName: listName, status: 0, order: 0,
                    ex_kr: exKr, ex_vn: exVn, definition: definition,
                    savedAt: firebase.firestore.FieldValue.serverTimestamp()
                }).then(function() {
                    starEl.textContent = '★';
                    starEl.style.color = '#f59e0b';
                    Swal.fire({ icon: 'success', title: 'Đã lưu!', timer: 1200, showConfirmButton: false });
                }).catch(function(e) {
                    Swal.fire({ icon: 'error', title: 'Lỗi', text: e.message });
                });
            }
        });
    };

    // ── Check saved words on load ──────────────────────────────────
    function updateSavedStars() {
        if (typeof firebase === 'undefined' || !firebase.auth) return;
        var user = firebase.auth().currentUser;
        if (!user) return;
        var db = firebase.firestore();
        db.collection('users').doc(user.uid).collection('vocabulary').get().then(function(snap) {
            var savedWords = new Set();
            snap.forEach(function(d) { savedWords.add(d.id.replace(/^.*_([^_]+)$/, '$1')); });
            document.querySelectorAll('.na-vocab-card').forEach(function(card) {
                var word = (card.querySelector('.vw-word') || {}).textContent || '';
                if (savedWords.has(word)) {
                    var star = card.querySelector('.na-vocab-star');
                    if (star) { star.textContent = '★'; star.style.color = '#f59e0b'; }
                }
            });
        }).catch(function() {});
    }
    // ── Full study engine (flashcard + match + type + dictation + speaking) ──
    var naGameList = [], naFcIdx = 0, naFcFront = true, naFcAuto = false, naFcMuted = false, naFcTimer1 = null, naFcTimer2 = null;
    var naMatchFirst = null, naMatchScore = 0, naMatchPairs = 0;
    var naTypeMode = 'kr2vn', naTypeIdx = 0;
    var naDictIdx = 0;
    var naSpeakIdx = 0, naSpeakRec = null;
    var _naVocabDataCache = null; // cached vocab list for cross-tab game access

    function naSpeak(text) { if (!naFcMuted && 'speechSynthesis' in window) { speechSynthesis.cancel(); var u = new SpeechSynthesisUtterance(text); u.lang = 'ko-KR'; u.rate = 0.85; speechSynthesis.speak(u); } }

    // ── Shared: build game list from DOM ─────────────────────────
    function naBuildGameList() {
        var content = document.getElementById('naContent');
        var cards = content.querySelectorAll('.na-vocab-card');
        if (cards.length > 0) {
            var list = [];
            cards.forEach(function(c) {
                list.push({
                    word: (c.querySelector('.vw-word') || {}).textContent || '',
                    meaning: (c.querySelector('.vw-meaning') || {}).textContent || '',
                    ex_kr: c.getAttribute('data-ex-kr') || '',
                    ex_vn: c.getAttribute('data-ex-vn') || '',
                    definition: c.getAttribute('data-def') || ''
                });
            });
            _naVocabDataCache = list;
            return list;
        }
        if (_naVocabDataCache && _naVocabDataCache.length > 0) {
            return _naVocabDataCache.map(function(v) { return {
                word: v.word || '',
                meaning: v.meaning || '',
                ex_kr: v.ex_kr || '',
                ex_vn: v.ex_vn || '',
                definition: v.definition || ''
            }; });
        }
        return [];
    }

    // ── FAB toggle + open study ──────────────────────────────────
    window.naToggleFab = function() {
        document.getElementById('naFabContainer').classList.toggle('open');
    };
    window.naOpenStudy = function(mode) {
        document.getElementById('naFabContainer').classList.remove('open');
        if (naGameList.length === 0) naGameList = naBuildGameList();
        if (naGameList.length === 0) return;
        document.getElementById('naFcOverlay').style.display = 'flex';
        window._naGameMode = mode;
        document.getElementById('naFcBox').classList.remove('large');
        ['naFcFlashcard','naFcMatch','naFcType','naFcDictation','naFcSpeaking'].forEach(function(id) {
            var el = document.getElementById(id);
            if (el) { el.style.display = (id === 'naFc' + mode.charAt(0).toUpperCase() + mode.slice(1)) ? (mode === 'match' ? 'flex' : 'block') : 'none'; }
        });
        if (mode === 'match') document.getElementById('naFcBox').classList.add('large');
        if (mode === 'flashcard') { /* keep naFcIdx as-is */ naFcDraw(); }
        else if (mode === 'match') { naFcIdx = 0; naInitMatch(); }
        else {
            naFcIdx = 0;
            if (mode === 'type') { var btns = document.querySelectorAll('#naFcType .na-fc-mode-btn'); Array.from(btns).forEach(function(b){b.style.background='';b.style.color='';}); btns[0].style.background='#1f2937'; btns[0].style.color='#fff'; naSetupType('kr2vn', btns[0]); }
            else if (mode === 'dictation') naInitDictation();
            else if (mode === 'speaking') naInitSpeaking();
        }
    };

    // ── Flashcard ──────────────────────────────────────────────────
    function naFcDraw() {
        naFcFront = true; naFcAuto = false; clearTimeout(naFcTimer1); clearTimeout(naFcTimer2);
        document.getElementById('naBtnPlay').style.color = '';
        var w = naGameList[naFcIdx];
        document.getElementById('naFcCard').classList.remove('flipped');
        document.getElementById('naFcCount').innerText = (naFcIdx + 1) + '/' + naGameList.length;
        var el = document.getElementById('naFcTxt');
        el.innerHTML = ''; el.innerText = w.word; el.style.cssText = '';
        document.getElementById('naFcHint').style.display = '';
        document.getElementById('naFcHint').innerText = naFcIdx === 0 ? 'Chạm hoặc Space để lật' : '';
        naSpeak(w.word);
    }
    window.naFcFlip = function() {
        naFcFront = !naFcFront;
        document.getElementById('naFcCard').classList.toggle('flipped');
        var w = naGameList[naFcIdx], el = document.getElementById('naFcTxt');
        if (naFcFront) {
            el.innerHTML = ''; el.innerText = w.word; el.style.cssText = '';
            document.getElementById('naFcHint').style.display = '';
            naSpeak(w.word);
        } else {
            document.getElementById('naFcHint').style.display = 'none';
            el.style.cssText = 'display:flex;flex-direction:column;align-items:center;justify-content:center;padding:20px 16px;width:100%;height:100%;backface-visibility:hidden;';
            el.style.setProperty('font-weight', '400', 'important');
            var h = '<div style="font-size:24px;font-weight:400;color:#1e40af;margin-bottom:6px;">' + escapeHtml(w.meaning) + '</div>';
            if (w.definition) h += '<div style="font-size:15px;font-weight:400;color:#64748b;line-height:1.5;margin-bottom:8px;text-align:center;max-width:320px;">' + escapeHtml(w.definition) + '</div>';
            if (w.ex_kr) { h += '<div style="font-size:16px;font-weight:400;color:#374151;line-height:1.6;margin-bottom:4px;text-align:center;">' + escapeHtml(w.ex_kr) + '</div>';
                h += '<div style="font-size:15px;font-weight:400;color:#6b7280;font-style:italic;line-height:1.5;">→ ' + escapeHtml(w.ex_vn || '') + '</div>'; }
            el.innerHTML = h;
        }
    };
    window.naFcMove = function(step) { naFcIdx = (naFcIdx + step + naGameList.length) % naGameList.length; naFcDraw(); };
    window.naFcShuffle = function() { naGameList.sort(function() { return Math.random() - 0.5; }); naFcIdx = 0; naFcDraw(); };
    window.naFcTogglePlay = function() {
        naFcAuto = !naFcAuto;
        document.getElementById('naBtnPlay').style.color = naFcAuto ? '#3b82f6' : '';
        if (naFcAuto) { (function loop() { if (!naFcAuto) return; naFcTimer1 = setTimeout(function() { window.naFcFlip(); naFcTimer2 = setTimeout(function() { window.naFcMove(1); loop(); }, 2000); }, 2000); })(); }
        else { clearTimeout(naFcTimer1); clearTimeout(naFcTimer2); }
    };
    window.naFcToggleAudio = function() { naFcMuted = !naFcMuted; document.getElementById('naBtnAudio').style.color = naFcMuted ? '#ef4444' : ''; };

    // ── Match ──────────────────────────────────────────────────────
    function naInitMatch() {
        if (naGameList.length < 2) { Swal.fire('Lỗi','Cần ít nhất 2 từ để chơi!','error'); return; }
        naMatchScore = 0; naMatchFirst = null; naMatchPairs = naGameList.length;
        document.getElementById('naFcResult').style.display = 'none';
        var grid = document.getElementById('naFcMatchGrid'); grid.innerHTML = '';
        var arr = [];
        naGameList.forEach(function(w) { arr.push({ i: w.word, t: 'kr', tx: w.word }); arr.push({ i: w.word, t: 'vn', tx: w.meaning }); });
        arr.sort(function() { return Math.random() - 0.5; });
        arr.forEach(function(c) {
            var d = document.createElement('div'); d.className = 'mc' + (c.t === 'kr' ? ' kr' : ' vn');
            d.innerText = c.tx;
            d.onclick = function() {
                if (d.classList.contains('sel') || d.classList.contains('done')) return;
                d.classList.add('sel');
                if (c.t === 'kr') naSpeak(c.tx);
                if (!naMatchFirst) { naMatchFirst = { el: d, id: c.i, t: c.t }; }
                else {
                    var e1 = naMatchFirst.el, e2 = d;
                    if (naMatchFirst.id === c.i && naMatchFirst.t !== c.t) {
                        naMatchScore++;
                        naSpeak(c.t === 'kr' ? c.tx : e1.innerText);
                        naMatchFirst = null;
                        setTimeout(function() { e1.classList.add('done'); e2.classList.add('done'); naMatchPairs--; if (!naMatchPairs) naShowWin(); }, 300);
                    } else {
                        e1.classList.remove('sel'); e2.classList.remove('sel');
                        e1.classList.add('err'); e2.classList.add('err');
                        naMatchFirst = null;
                        setTimeout(function() { e1.classList.remove('err'); e2.classList.remove('err'); }, 600);
                    }
                }
            };
            grid.appendChild(d);
        });
    }

    // ── Type ───────────────────────────────────────────────────────
    window.naSetupType = function(mode, btn) {
        naTypeMode = mode; naTypeIdx = 0;
        var parent = btn.parentElement;
        Array.from(parent.children).forEach(function(b) { b.style.background = ''; b.style.color = ''; });
        btn.style.background = '#1f2937'; btn.style.color = '#fff';
        naNextType();
    };
    function naNextType() {
        if (naTypeIdx >= naGameList.length) { naShowWin(); return; }
        var w = naGameList[naTypeIdx];
        var isKr = naTypeMode === 'kr2vn' ? true : (naTypeMode === 'vn2kr' ? false : Math.random() > 0.5);
        document.getElementById('naTypeCount').innerText = (naTypeIdx + 1) + '/' + naGameList.length;
        document.getElementById('naTypeWord').innerText = isKr ? w.word : w.meaning;
        document.getElementById('naTypeWord').dataset.iskr = isKr;
        document.getElementById('naTypeInput').value = ''; document.getElementById('naTypeInput').focus();
        document.getElementById('naTypeRes').innerText = '';
        if (isKr) naSpeak(w.word);
    }
    function naRemoveTones(s) {
        s = s.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g,"a").replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g,"e").replace(/ì|í|ị|ỉ|ĩ/g,"i").replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g,"o").replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g,"u").replace(/ỳ|ý|ỵ|ỷ|ỹ/g,"y").replace(/đ/g,"d");
        return s;
    }
    window.naCheckType = function() {
        var inp = document.getElementById('naTypeInput').value.trim().toLowerCase();
        if (!inp) return;
        var w = naGameList[naTypeIdx];
        var isKr = document.getElementById('naTypeWord').dataset.iskr === 'true';
        var ans = isKr ? w.meaning.toLowerCase() : w.word.toLowerCase();
        var res = document.getElementById('naTypeRes');
        if (naRemoveTones(inp) === naRemoveTones(ans)) {
            res.innerText = '✅ Chính xác!'; res.style.color = '#10b981';
            if (!isKr) naSpeak(w.word);
            setTimeout(function() { naTypeIdx++; naNextType(); }, 1000);
        } else {
            res.innerText = '❌ Sai. Đáp án: ' + (isKr ? w.meaning : w.word); res.style.color = '#ef4444';
            document.getElementById('naTypeInput').value = '';
        }
    };

    // ── Dictation ──────────────────────────────────────────────────
    function naInitDictation() {
        naDictIdx = 0;
        naGameList.sort(function() { return Math.random() - 0.5; });
        naNextDict();
    }
    function naNextDict() {
        if (naDictIdx >= naGameList.length) { naShowWin(); return; }
        document.getElementById('naDictCount').innerText = (naDictIdx + 1) + '/' + naGameList.length;
        document.getElementById('naDictInput').value = '';
        document.getElementById('naDictRes').innerText = '';
        document.getElementById('naDictHint').innerText = '';
        setTimeout(function() { naPlayDictAudio(); }, 300);
    }
    window.naPlayDictAudio = function() { naSpeak(naGameList[naDictIdx].word); };
    window.naShowDictHint = function() { document.getElementById('naDictHint').innerText = naGameList[naDictIdx].meaning; };
    window.naCheckDict = function() {
        var inp = document.getElementById('naDictInput').value.trim().toLowerCase();
        if (!inp) return;
        var ans = naGameList[naDictIdx].word.toLowerCase();
        var res = document.getElementById('naDictRes');
        if (inp === ans) {
            res.innerText = '✅ Chính xác!'; res.style.color = '#10b981';
            setTimeout(function() { naDictIdx++; naNextDict(); }, 1000);
        } else {
            res.innerText = '❌ Sai. Đáp án: ' + naGameList[naDictIdx].word; res.style.color = '#ef4444';
            document.getElementById('naDictInput').value = '';
        }
    };

    // ── Speaking ───────────────────────────────────────────────────
    function naInitSpeaking() {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            Swal.fire('Không hỗ trợ','Trình duyệt không hỗ trợ nhận diện giọng nói.','error'); return;
        }
        naSpeakIdx = 0;
        naGameList.sort(function() { return Math.random() - 0.5; });
        var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        naSpeakRec = new SR();
        naSpeakRec.lang = 'ko-KR'; naSpeakRec.continuous = false; naSpeakRec.interimResults = false;
        naSpeakRec.onstart = function() { document.getElementById('naFcMicBtn').style.transform = 'scale(1.1)'; document.getElementById('naFcMicBtn').style.background = '#fee2e2'; };
        naSpeakRec.onresult = function(event) {
            var transcript = event.results[0][0].transcript.trim();
            naEvalSpeak(transcript);
            document.getElementById('naFcMicBtn').style.transform = ''; document.getElementById('naFcMicBtn').style.background = '';
        };
        naSpeakRec.onerror = function() {
            document.getElementById('naSpeakScore').innerText = 'Không nghe rõ. Thử lại!';
            document.getElementById('naSpeakScore').style.color = '#ef4444';
            document.getElementById('naFcMicBtn').style.transform = ''; document.getElementById('naFcMicBtn').style.background = '';
        };
        naSpeakRec.onend = function() { document.getElementById('naFcMicBtn').style.transform = ''; document.getElementById('naFcMicBtn').style.background = ''; };
        naNextSpeak();
    }
    function naNextSpeak() {
        if (naSpeakIdx >= naGameList.length) { naShowWin(); return; }
        document.getElementById('naSpeakCount').innerText = (naSpeakIdx + 1) + '/' + naGameList.length;
        document.getElementById('naSpeakWord').innerText = naGameList[naSpeakIdx].word;
        document.getElementById('naSpeakMeaning').innerText = naGameList[naSpeakIdx].meaning;
        document.getElementById('naSpeakTranscript').innerHTML = '';
        document.getElementById('naSpeakScore').innerText = '';
    }
    window.naSkipSpeak = function() { naSpeakIdx++; naNextSpeak(); };
    window.naToggleMic = function() {
        if (naSpeakRec) { try { naSpeakRec.start(); } catch(e) { naSpeakRec.stop(); } }
    };
    function naEvalSpeak(transcript) {
        var target = naGameList[naSpeakIdx].word;
        var tChars = target.replace(/\s+/g,'').split('');
        var rChars = transcript.replace(/\s+/g,'').split('');
        var html = '', correct = 0;
        for (var i = 0; i < tChars.length; i++) {
            var expected = tChars[i], actual = rChars[i] || '';
            var color = '#ef4444';
            if (expected === actual) { color = '#10b981'; correct++; }
            else if (expected.charCodeAt(0) >= 44032 && expected.charCodeAt(0) <= 55203 && actual.charCodeAt(0) >= 44032 && actual.charCodeAt(0) <= 55203) {
                if (Math.floor((expected.charCodeAt(0)-44032)/28) === Math.floor((actual.charCodeAt(0)-44032)/28)) { color = '#3b82f6'; correct += 0.5; }
            }
            html += '<span style="color:' + color + ';margin:0 1px;">' + escapeHtml(actual || expected) + '</span>';
        }
        document.getElementById('naSpeakTranscript').innerHTML = html + '<span style="width:100%;text-align:center;font-size:0.5em;color:#64748b;font-weight:normal;margin-top:8px;">(Bạn đọc: ' + escapeHtml(transcript) + ')</span>';
        var score = Math.round((correct / tChars.length) * 100);
        var scoreEl = document.getElementById('naSpeakScore');
        scoreEl.innerText = 'Điểm: ' + score + '/100';
        if (score >= 80) { scoreEl.style.color = '#10b981'; setTimeout(function() { naSpeakIdx++; naNextSpeak(); }, 2000); }
        else { scoreEl.style.color = '#ef4444'; scoreEl.innerText += ' - Thử lại!'; }
    }

    // ── Result ─────────────────────────────────────────────────────
    function naShowWin() {
        document.getElementById('naFcResult').style.display = 'flex';
    }

    // ── Close ──────────────────────────────────────────────────────
    window.naCloseStudy = function() {
        document.getElementById('naFcOverlay').style.display = 'none';
        document.getElementById('naFcResult').style.display = 'none';
        clearTimeout(naFcTimer1); clearTimeout(naFcTimer2); naFcAuto = false;
        document.getElementById('naBtnPlay').style.color = '';
        if (naSpeakRec) { try { naSpeakRec.stop(); } catch(e) {} }
    };

    // ── Open from vocab card ───────────────────────────────────────
    window.naOpenFlashcard = function(cardEl) {
        naGameList = naBuildGameList();
        if (naGameList.length === 0) return;
        var cards = document.getElementById('naContent').querySelectorAll('.na-vocab-card');
        naFcIdx = 0;
        for (var i = 0; i < cards.length; i++) { if (cards[i] === cardEl) { naFcIdx = i; break; } }
        naOpenStudy('flashcard');
    };

    // ── Keyboard ───────────────────────────────────────────────────
    document.addEventListener('keydown', function(e) {
        var ov = document.getElementById('naFcOverlay');
        if (!ov || ov.style.display !== 'flex') return;
        var fc = document.getElementById('naFcFlashcard');
        if (fc && fc.style.display !== 'none') {
            if (e.code === 'Space') { e.preventDefault(); window.naFcFlip(); }
            else if (e.code === 'ArrowLeft') window.naFcMove(-1);
            else if (e.code === 'ArrowRight') window.naFcMove(1);
            else if (e.code === 'Escape') window.naCloseStudy();
        } else if (e.code === 'Escape') { window.naCloseStudy(); }
    });

    // ── Delegated: edit translation button (survives innerHTML changes) ──
    document.addEventListener('click', function(ev) {
        var btn = ev.target.closest('#naEditTranslationBtn');
        if (!btn) return;
        var content = document.getElementById('naContent');
        var articleId = content && content._articleId;
        if (articleId) openFullscreenEditor(articleId);
    });

    document.addEventListener('DOMContentLoaded', function() { setTimeout(init, 200); });
})();
