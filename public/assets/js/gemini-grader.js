/* gemini-grader.js — AI grading cho TOPIK writing
   Dùng Gemini API trực tiếp (free tier). Fallback OpenRouter khi hết quota. */

(function() {
    'use strict';

    // ═══════════════════════════════════════════════════════
    // API KEYS — nạp động từ Firestore (app_config/ai_grader)
    // KHÔNG hardcode key trong mã nguồn để tránh lộ khi push GitHub.
    // Cấu trúc doc: { groqKeys: [...], geminiKeys: [...], openRouterKey: "..." }
    // ═══════════════════════════════════════════════════════
    var CONFIG_COLLECTION = 'app_config';
    var CONFIG_DOC = 'ai_grader';

    var GROQ_KEYS = [];
    var GEMINI_KEYS = [];
    var OR_KEY = '';

    var GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
    var GROQ_MODEL = 'openai/gpt-oss-120b';

    var GEMINI_MODEL = 'gemini-2.0-flash';
    var GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/' + GEMINI_MODEL + ':generateContent?key=';

    var OR_MODEL = 'google/gemini-2.5-flash';
    var OR_URL = 'https://openrouter.ai/api/v1/chat/completions';

    var _keysLoaded = false;
    var _keysPromise = null;

    // Đọc key cấu hình từ Firestore một lần duy nhất (cache trong phiên)
    function loadAiKeys() {
        if (_keysLoaded) return Promise.resolve();
        if (_keysPromise) return _keysPromise;
        _keysPromise = new Promise(function(resolve) {
            var db = window.db;
            if (!db) {
                console.warn('[AI] window.db chưa sẵn sàng — không nạp được key.');
                _keysLoaded = true;
                return resolve();
            }
            db.collection(CONFIG_COLLECTION).doc(CONFIG_DOC).get().then(function(doc) {
                var d = (doc.exists && doc.data()) || {};
                if (Array.isArray(d.groqKeys)) GROQ_KEYS = d.groqKeys.filter(Boolean);
                if (Array.isArray(d.geminiKeys)) GEMINI_KEYS = d.geminiKeys.filter(Boolean);
                if (typeof d.openRouterKey === 'string') OR_KEY = d.openRouterKey;
                _keysLoaded = true;
                resolve();
            }).catch(function(err) {
                console.warn('[AI] Lỗi nạp key cấu hình:', err && err.message);
                _keysLoaded = true;
                resolve();
            });
        });
        return _keysPromise;
    }

    var _keyIdx = 0;
    var _limitedKeys = {};

    function getNextKey() {
        var now = Date.now();
        Object.keys(_limitedKeys).forEach(function(k) {
            if (_limitedKeys[k] < now) delete _limitedKeys[k];
        });
        var start = _keyIdx;
        do {
            if (!(GEMINI_KEYS[_keyIdx] in _limitedKeys)) {
                var key = GEMINI_KEYS[_keyIdx];
                _keyIdx = (_keyIdx + 1) % GEMINI_KEYS.length;
                return key;
            }
            _keyIdx = (_keyIdx + 1) % GEMINI_KEYS.length;
        } while (_keyIdx !== start);
        return null;
    }

    function markLimited(idx) { _limitedKeys[idx] = Date.now() + 15000; }
    function sleep(ms) { return new Promise(function(r) { setTimeout(r, ms); }); }

    // ── Gọi Gemini trực tiếp ──
    async function callGemini(systemPrompt, userText) {
        if (!GEMINI_KEYS.length) throw new Error('NO_GEMINI_KEY');
        var fullText = systemPrompt + '\n\n' + userText;

        for (var attempt = 0; attempt < 5; attempt++) {
            var key = getNextKey();
            if (!key) {
                _limitedKeys = {};
                await sleep(10000);
                key = getNextKey();
                if (!key) throw new Error('ALL_KEYS_BUSY');
            }

            try {
                var controller = new AbortController();
                var timeout = setTimeout(function() { controller.abort(); }, 15000);

                var resp = await fetch(GEMINI_URL + key, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: fullText }] }],
                        generationConfig: { temperature: 0.3, maxOutputTokens: 800 }
                    }),
                    signal: controller.signal
                });
                clearTimeout(timeout);

                if (resp.status === 429) {
                    var idx = GEMINI_KEYS.indexOf(key);
                    if (idx >= 0) markLimited(idx);
                    if (attempt < 4) {
                        var waitSec = 6 + attempt * 4;
                        console.warn('[Gemini] 429. Đợi ' + waitSec + 's (lần ' + (attempt+1) + '/5)...');
                        await sleep(waitSec * 1000);
                    }
                    continue;
                }

                if (!resp.ok) {
                    if (resp.status >= 500) { await sleep(2000); continue; }
                    throw new Error('HTTP_' + resp.status);
                }

                var data = await resp.json();
                if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
                    throw new Error('EMPTY');
                }

                return data.candidates[0].content.parts[0].text;

            } catch (err) {
                if (err.name === 'AbortError') { await sleep(1000); continue; }
                if (err.message === 'ALL_KEYS_BUSY') { await sleep(5000); continue; }
                throw err;
            }
        }

        throw new Error('GEMINI_FAIL');
    }

    var _grqIdx = 0;
    var _grqLimited = {};

    function getGroqKey() {
        var now = Date.now();
        Object.keys(_grqLimited).forEach(function(k) {
            if (_grqLimited[k] < now) delete _grqLimited[k];
        });
        var start = _grqIdx;
        do {
            if (!(_grqIdx in _grqLimited) && GROQ_KEYS[_grqIdx]) {
                var key = GROQ_KEYS[_grqIdx];
                _grqIdx = (_grqIdx + 1) % GROQ_KEYS.length;
                return key;
            }
            _grqIdx = (_grqIdx + 1) % GROQ_KEYS.length;
        } while (_grqIdx !== start);
        return null;
    }

    // ── Gọi Groq (free) ──
    async function callGroq(systemPrompt, userText) {
        if (!GROQ_KEYS.length) throw new Error('NO_GROQ_KEY');
        for (var attempt = 0; attempt < 3; attempt++) {
            var key = getGroqKey();
            if (!key) { _grqLimited = {}; await sleep(5000); key = getGroqKey(); if (!key) throw new Error('GROQ_ALL_BUSY'); }
            try {
                var controller = new AbortController();
                var timeout = setTimeout(function() { controller.abort(); }, 20000);
                var resp = await fetch(GROQ_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
                    body: JSON.stringify({
                        model: GROQ_MODEL,
                        messages: [
                            { role: 'system', content: systemPrompt },
                            { role: 'user', content: userText }
                        ],
                        temperature: 0.3, max_completion_tokens: 1200
                    }),
                    signal: controller.signal
                });
                clearTimeout(timeout);
                if (resp.status === 429) {
                    var idx = GROQ_KEYS.indexOf(key);
                    if (idx >= 0) _grqLimited[idx] = Date.now() + 15000;
                    if (attempt < 2) { await sleep(4000); continue; }
                    throw new Error('GROQ_RATE_LIMITED');
                }
                if (!resp.ok) { if (resp.status >= 500) { await sleep(2000); continue; } throw new Error('GRQ_' + resp.status); }
                var data = await resp.json();
                if (!data.choices || !data.choices[0] || !data.choices[0].message) throw new Error('GRQ_EMPTY');
                return data.choices[0].message.content;
            } catch (err) {
                if (err.name === 'AbortError') { await sleep(1000); continue; }
                throw err;
            }
        }
        throw new Error('GROQ_FAIL');
    }

    // ── Gọi OpenRouter (fallback) ──
    async function callOpenRouter(systemPrompt, userText) {
        if (!OR_KEY || OR_KEY.indexOf('sk-or-v1-') !== 0) throw new Error('NO_OR_KEY');
        for (var attempt = 0; attempt < 2; attempt++) {
            try {
                var controller = new AbortController();
                var timeout = setTimeout(function() { controller.abort(); }, 20000);
                var resp = await fetch(OR_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + OR_KEY },
                    body: JSON.stringify({
                        model: OR_MODEL,
                        messages: [
                            { role: 'system', content: systemPrompt },
                            { role: 'user', content: userText }
                        ],
                        temperature: 0.3, max_tokens: 1200
                    }),
                    signal: controller.signal
                });
                clearTimeout(timeout);
                if (resp.status === 429) { await sleep(5000); continue; }
                if (!resp.ok) { if (resp.status >= 500) { await sleep(2000); continue; } throw new Error('OR_HTTP_' + resp.status); }
                var data = await resp.json();
                if (!data.choices || !data.choices[0] || !data.choices[0].message) throw new Error('OR_EMPTY');
                return data.choices[0].message.content;
            } catch (err) {
                if (err.name === 'AbortError') { await sleep(1000); continue; }
                throw err;
            }
        }
        throw new Error('OR_FAIL');
    }

    // ── Gọi AI: Groq (free) → Gemini (free) → OpenRouter (trả phí) ──
    async function callAI(systemPrompt, userText) {
        await loadAiKeys();
        if (!GROQ_KEYS.length && !GEMINI_KEYS.length && !OR_KEY) {
            throw new Error('Chưa cấu hình API key cho AI chấm điểm.');
        }
        try { return await callGroq(systemPrompt, userText); }
        catch(e) { console.warn('[AI] Groq lỗi, thử Gemini:', e.message); }
        try { return await callGemini(systemPrompt, userText); }
        catch(e) { console.warn('[AI] Gemini lỗi, thử OpenRouter:', e.message); }
        try { return await callOpenRouter(systemPrompt, userText); }
        catch(e) { throw new Error('Tất cả AI đều lỗi: ' + e.message); }
    }

    // ── Parse JSON response ──
    function parseResult(raw) {
        var jsonMatch = raw.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            try {
                var parsed = JSON.parse(jsonMatch[0]);
                return {
                    score: typeof parsed.score === 'number' ? Math.min(5, Math.max(0, parsed.score)) : null,
                    feedback: parsed.feedback || parsed.explanation || parsed.vietnamese || parsed.nhan_xet || '',
                };
            } catch(e) {}
        }
        return { score: null, feedback: raw.trim() };
    }

    // ── System prompt ──
    function buildSystemPrompt(config) {
        var parts = ['Bạn chấm bài viết TOPIK II tiếng Hàn câu 51-52. LUÔN trả lời bằng tiếng Việt, định dạng JSON.'];
        parts.push('');
        parts.push('=== QUY TẮC VÀNG ===');
        parts.push('');
        parts.push('• Nếu bài làm KHỚP ĐÚNG hoặc đồng nghĩa với đáp án chuẩn được cung cấp → cho ĐIỂM TỐI ĐA 5/5. KHÔNG được bịa lỗi hoặc trừ điểm oan.');
        parts.push('• Các đuôi câu kính ngữ trang trọng ĐỀU HỢP LỆ như nhau: -습니다, -ㅂ니다, -십시오, -(으)십시오, -기 바랍니다, -아/어 주시기 바랍니다, -겠습니다.');
        parts.push('• -ㅂ니다 dùng sau gốc từ kết thúc bằng NGUYÊN ÂM (ví dụ: 바라다 → 바랍니다, 하다 → 합니다, 보다 → 봅니다). KHÔNG bao giờ coi -ㅂ니다 là sai.');
        parts.push('• ~기 바랍니다, ~아/어 주시기 바랍니다 là đuôi câu chuẩn rất phổ biến trong thông báo. Nếu đáp án chuẩn là dạng này mà học sinh viết đúng thì phải 5/5.');
        parts.push('• Chỉ trừ điểm khi học sinh dùng đuôi không hợp văn cảnh (vd -아/어요 thân mật trong thông báo trang trọng, hoặc sai ý), chứ KHÔNG phạt các dạng kính ngữ hợp lệ khác nhau.');
        parts.push('');
        parts.push('=== THANG ĐIỂM CHI TIẾT ===');
        parts.push('');
        parts.push('CÂU 51 (điền vào chỗ trống — thường là thông báo/tuyển dụng):');
        parts.push('1. Phải dùng từ khóa trong bài đọc — nếu bỏ từ khóa hoặc thay từ khác, trừ 1-2 điểm.');
        parts.push('2. Văn bản thông báo cần đuôi trang trọng. Đuôi -습니다/-ㅂ니다/-(으)십시오/기 바랍니다 ĐỀU ĐÚNG. Chỉ trừ điểm khi dùng -아/어요 hoặc -는다 (không hợp thông báo trang trọng).');
        parts.push('');
        parts.push('CÂU 52 (viết tiếp câu — thường có đối lập/liệt kê):');
        parts.push('1. Phải dùng từ nối liệt kê/đối lập: 첫째/둘째/셋째, 먼저/다음으로/끝으로, 하나는/다른 하나는, 긍정적인 것은/부정적인 것은.');
        parts.push('   Thiếu từ nối → thiếu format → trừ 2 điểm.');
        parts.push('2. Phải suy luận đúng ý đối lập với vế trước.');
        parts.push('3. Đuôi câu phải khớp văn phong của bài (chấp nhận cả -습니다 lẫn -ㅂ니다).');
        parts.push('');
        parts.push('QUY TẮC CHÍNH TẢ (chỉ trừ khi SAI THẬT):');
        parts.push('• Chỉ trừ điểm chính tả khi chắc chắn sai (kiểm tra kỹ từng âm tiết). Nếu không chắc, đừng bịa lỗi.');
        parts.push('• Ví dụ đúng: 정리하려고, 드리겠습니다, 있습니다. Sai: 정리하겨고, 드리겟습니다, 있읍니다.');
        parts.push('• Phân biệt: ㅐ vs ㅔ, ㅒ vs ㅖ, ㅘ vs ㅙ, ㅚ vs ㅟ — sai 1 nguyên âm là SAI.');
        parts.push('• Phân biệt: ㄱ/ㄲ/ㅋ, ㄷ/ㄸ/ㅌ, ㅂ/ㅃ/ㅍ, ㅅ/ㅆ, ㅈ/ㅉ/ㅊ — sai phụ âm căng/bật hơi là SAI.');
        parts.push('• Thiếu patchim (받침) hoặc sai patchim → SAI.');
        parts.push('• Nếu câu đúng ý + đúng ngữ pháp nhưng SAI CHÍNH TẢ → tối đa 3/5, phải ghi rõ lỗi chính tả trong nhận xét.');

        if (config.exactAnswers && config.exactAnswers.length) {
            parts.push('');
            parts.push('Đáp án chuẩn (đúng cả ý + ngữ pháp + đuôi câu = 5đ):');
            parts.push(config.exactAnswers.slice(0, 3).join(' | '));
        }
        if (config.stems && config.stems.length) {
            parts.push('Động từ chính: ' + config.stems.join(', '));
        }
        if (config.grammar && config.grammar.length) {
            var labels = config.grammar.map(function(g) { return g.label; }).filter(Boolean);
            if (labels.length) parts.push('Ngữ pháp: ' + labels.join(', '));
        }
        if (config.context && config.context.length) {
            parts.push('Từ vựng bối cảnh: ' + config.context.join(', '));
        }
        if (config.questionPrompt) {
            parts.push('Bối cảnh: ' + config.questionPrompt);
        }
        return parts.join('\n');
    }

    var userTextTemplate = 'Học sinh viết: "' + '{TEXT}' + '"\n\n' +
        'Phân tích CHI TIẾT: đúng/sai ý chính? đúng/sai ngữ pháp? đúng/sai từ vựng? ' +
        'CÓ LỖI CHÍNH TẢ KHÔNG? (kiểm tra từng âm tiết) ' +
        'đuôi câu có khớp văn phong không? có dùng từ nối liệt kê/đối lập không? ' +
        'so với đáp án chuẩn khác gì?\n' +
        'Nếu có lỗi chính tả, GHI RÕ từ sai và từ đúng trong nhận xét.\n' +
        'Trả lời CHỈ 1 dòng JSON, không thêm gì khác:\n' +
        '{"score":<số 0-5>,"feedback":"<phân tích chi tiết bằng tiếng Việt 3-5 câu>"}';

    // ═══════════════════════════════════════════════════════
    // PUBLIC API
    // ═══════════════════════════════════════════════════════

    window.gradeWriting = function(text, config, fallbackMsg, scoreElId, btnExpId) {
        var sc = document.getElementById(scoreElId);
        var expElId = scoreElId.replace('score-', 'exp-');
        var exp = document.getElementById(expElId);

        if (sc) sc.innerHTML = '<strong style="color:#2563eb;">⏳ AI đang chấm điểm...</strong>';
        if (exp) exp.style.display = 'block';

        // Khớp chính xác đáp án chuẩn → trả 5/5 ngay, không cần gọi AI (tránh AI trừ điểm oan)
        if (isExactAnswer(text, config.exactAnswers)) {
            if (sc) sc.innerHTML = exactResult();
            return;
        }

        var systemPrompt = buildSystemPrompt(config);
        var userText = userTextTemplate.replace('{TEXT}', text);

        callAI(systemPrompt, userText).then(function(raw) {
            showResult(sc, raw);
        }).catch(function(err) {
            console.warn('[AI] Thất bại:', err.message);
            if (sc) sc.innerHTML = '<strong style="color:#ef4444;">⚠ ' + err.message + '</strong>';
        });
    };

    window.gradeAIAppend = function(text, context, scoreElId) {
        var sc = document.getElementById(scoreElId);
        if (!sc) return;
        var expElId = scoreElId.replace('score-', 'exp-');
        var exp = document.getElementById(expElId);
        if (exp) exp.style.display = 'block';
        sc.innerHTML = '<strong style="color:#2563eb;">⏳ AI đang chấm điểm...</strong>';

        var systemPrompt = buildSystemPrompt(context);
        var userText = userTextTemplate.replace('{TEXT}', text);

        callAI(systemPrompt, userText).then(function(raw) {
            showResult(sc, raw);
        }).catch(function(err) {
            console.warn('[Gemini] Thất bại:', err.message);
            sc.innerHTML = '<strong style="color:#ef4444;">⚠ Gemini lỗi: ' + err.message + '</strong>';
        });
    };

    function showResult(sc, raw) {
        var ai = parseResult(raw);
        var html = '<div style="font-size:1.15em;font-weight:800;color:#dc2626;margin-bottom:4px;">Điểm: ' +
            (ai.score !== null ? ai.score + '/5' : '—') + '</div>';
        if (ai.feedback) {
            html += '<div style="font-size:0.95em;color:#334155;padding:10px 14px;background:#f0f9ff;border-radius:8px;border-left:3px solid #3b82f6;line-height:1.6;">' +
                '<span style="font-weight:600;color:#2563eb;">AI nhận xét:</span><br>' + ai.feedback + '</div>';
        }
        if (sc) sc.innerHTML = html;
    }

    // ── Chuẩn hóa + so khớp đáp án chuẩn (trước khi gọi AI) ──
    function normalizeText(t) {
        return (t || '').trim().replace(/\s+/g, ' ').replace(/[.。,，!！?？~～…]+$/g, '').trim();
    }
    function isExactAnswer(text, list) {
        if (!list || !list.length) return false;
        var norm = normalizeText(text);
        return list.some(function(a) { return normalizeText(a) === norm; });
    }

    function exactResult() {
        var html = '<div style="font-size:1.15em;font-weight:800;color:#059669;margin-bottom:4px;">Điểm: 5/5</div>' +
            '<div style="font-size:0.95em;color:#334155;padding:10px 14px;background:#ecfdf5;border-radius:8px;border-left:3px solid #10b981;line-height:1.6;">' +
            '<span style="font-weight:600;color:#047857;">Kết quả:</span> Đáp án trùng khớp chính xác với đáp án chuẩn.</div>';
        return html;
    }

})();
