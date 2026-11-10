/* gemini-grader.js — AI grading cho TOPIK writing
   Gọi Cloud Function `gradeWriting` qua Firebase Hosting rewrite (/api/grade).
   Khoá AI nằm ở server (Secret Manager) — trình duyệt KHÔNG bao giờ thấy khoá.
   Mã server: functions/index.js */

(function() {
    'use strict';

    var GRADE_ENDPOINT = '/api/grade';

    function escapeHTML(str) {
        return String(str == null ? '' : str)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    function getCurrentUser() {
        try {
            return (window.auth || (window.firebase && firebase.auth && firebase.auth())).currentUser;
        } catch (e) {
            return null;
        }
    }

    // Chỉ gửi dữ liệu cần thiết — server tự dựng prompt và kiểm tra độ dài
    function pickConfig(c) {
        c = c || {};
        return {
            exactAnswers: c.exactAnswers || [],
            stems: c.stems || [],
            grammar: (c.grammar || []).map(function(g) { return { label: g && g.label }; }),
            context: c.context || [],
            questionPrompt: c.questionPrompt || ''
        };
    }

    async function requestGrade(text, config) {
        var user = getCurrentUser();
        if (!user) throw new Error('Bạn cần đăng nhập để dùng AI chấm điểm.');
        var token = await user.getIdToken();

        var controller = new AbortController();
        var timer = setTimeout(function() { controller.abort(); }, 65000);
        var resp;
        try {
            resp = await fetch(GRADE_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
                body: JSON.stringify({ text: text, config: pickConfig(config) }),
                signal: controller.signal
            });
        } catch (err) {
            if (err && err.name === 'AbortError') throw new Error('AI phản hồi quá lâu, vui lòng thử lại.');
            throw new Error('Không kết nối được máy chủ chấm điểm.');
        } finally {
            clearTimeout(timer);
        }

        var data = null;
        try { data = await resp.json(); } catch (e) {}
        if (!resp.ok) {
            throw new Error((data && data.error) || ('Lỗi máy chủ (HTTP ' + resp.status + ').'));
        }
        return data || { score: null, feedback: '' };
    }

    // ═══════════════════════════════════════════════════════
    // PUBLIC API (giữ nguyên chữ ký để các trang writing không phải sửa)
    // ═══════════════════════════════════════════════════════

    window.gradeWriting = function(text, config, fallbackMsg, scoreElId, btnExpId) {
        var sc = document.getElementById(scoreElId);
        var expElId = scoreElId.replace('score-', 'exp-');
        var exp = document.getElementById(expElId);

        if (sc) sc.innerHTML = '<strong style="color:#2563eb;">⏳ AI đang chấm điểm...</strong>';
        if (exp) exp.style.display = 'block';

        // Khớp chính xác đáp án chuẩn → trả 5/5 ngay, không cần gọi AI (tránh AI trừ điểm oan)
        if (isExactAnswer(text, config && config.exactAnswers)) {
            if (sc) sc.innerHTML = exactResult();
            return;
        }

        requestGrade(text, config).then(function(result) {
            showResult(sc, result);
        }).catch(function(err) {
            console.warn('[AI] Thất bại:', err.message);
            if (sc) sc.innerHTML = '<strong style="color:#ef4444;">⚠ ' + escapeHTML(err.message) + '</strong>';
        });
    };

    window.gradeAIAppend = function(text, context, scoreElId) {
        var sc = document.getElementById(scoreElId);
        if (!sc) return;
        var expElId = scoreElId.replace('score-', 'exp-');
        var exp = document.getElementById(expElId);
        if (exp) exp.style.display = 'block';
        sc.innerHTML = '<strong style="color:#2563eb;">⏳ AI đang chấm điểm...</strong>';

        requestGrade(text, context).then(function(result) {
            showResult(sc, result);
        }).catch(function(err) {
            console.warn('[AI] Thất bại:', err.message);
            sc.innerHTML = '<strong style="color:#ef4444;">⚠ ' + escapeHTML(err.message) + '</strong>';
        });
    };

    function showResult(sc, ai) {
        var score = (ai && typeof ai.score === 'number') ? ai.score : null;
        var feedback = (ai && ai.feedback) || '';
        var html = '<div style="font-size:1.15em;font-weight:800;color:#dc2626;margin-bottom:4px;">Điểm: ' +
            (score !== null ? score + '/5' : '—') + '</div>';
        if (feedback) {
            html += '<div style="font-size:0.95em;color:#334155;padding:10px 14px;background:#f0f9ff;border-radius:8px;border-left:3px solid #3b82f6;line-height:1.6;">' +
                '<span style="font-weight:600;color:#2563eb;">AI nhận xét:</span><br>' +
                escapeHTML(feedback).replace(/\n/g, '<br>') + '</div>';
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
        return '<div style="font-size:1.15em;font-weight:800;color:#059669;margin-bottom:4px;">Điểm: 5/5</div>' +
            '<div style="font-size:0.95em;color:#334155;padding:10px 14px;background:#ecfdf5;border-radius:8px;border-left:3px solid #10b981;line-height:1.6;">' +
            '<span style="font-weight:600;color:#047857;">Kết quả:</span> Đáp án trùng khớp chính xác với đáp án chuẩn.</div>';
    }

})();
