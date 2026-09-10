
    // grading-engine.js — TOPIK Writing Grading Engine (Câu 51 & 52)
// Thay thế checkKeywords() thô sơ bằng regex + exact matching

/** Phân rã âm tiết Hangul thành Jamo (초성+중성+종성) để so khớp chính xác dạng chia */
function decomposeHangul(str) {
    var result = '';
    for (var i = 0; i < str.length; i++) {
        var code = str.charCodeAt(i);
        if (code >= 0xAC00 && code <= 0xD7A3) {
            var base = code - 0xAC00;
            var jong = base % 28;
            var jung = Math.floor((base % 588) / 28);
            var cho = Math.floor(base / 588);
            result += String.fromCharCode(0x1100 + cho);
            result += String.fromCharCode(0x1161 + jung);
            if (jong > 0) result += String.fromCharCode(0x11A8 + jong - 1);
        } else {
            result += str[i];
        }
    }
    return result;
}

/** Chuẩn hóa text tiếng Hàn: trim, nén spaces, xóa dấu câu cuối */
function normalizeKorean(text) {
    return text
        .trim()
        .replace(/\s+/g, ' ')
        .replace(/[.。,，!！?？~～]+$/g, '')
        .trim();
}

/** Escape ký tự đặc biệt regex */
function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Kiểm tra text chứa từ/cụm từ (dùng phân rã Jamo để xử lý chia động từ) */
function hasWord(text, word) {
    var decText = decomposeHangul(text);
    var decWord = decomposeHangul(word);
    return new RegExp(escapeRegex(decWord)).test(decText);
}

/** Kiểm tra text chứa ít nhất 1 từ trong danh sách */
function hasAnyWord(text, wordList) {
    return wordList.some(function(w) { return hasWord(text, w); });
}

/** So khớp gần chính xác với danh sách đáp án chuẩn */
function matchExact(text, answerList) {
    var norm = normalizeKorean(text);
    return answerList.some(function(ans) {
        return normalizeKorean(ans) === norm;
    });
}

/** Kiểm tra ít nhất 1 stem trong text */
function matchStems(text, stemList) {
    return hasAnyWord(text, stemList);
}

/** Kiểm tra ít nhất 1 mẫu ngữ pháp khớp (tự động mở rộng chia động từ 하다) */
function matchGrammar(text, grammarList) {
    return grammarList.some(function(g) {
        // Thử pattern gốc trước
        if (g.pattern.test(text)) return true;
        // Mở rộng 하 để khớp dạng chia: 하 → 합, 해, 했, 한, 할, 함
        var expanded = g.pattern.source.replace(/하/g, '[하합해했할한함]');
        if (expanded !== g.pattern.source) {
            return new RegExp(expanded, g.pattern.flags).test(text);
        }
        return false;
    });
}

/** Tạo HTML hiển thị điểm */
function makeDisplay(score, feedback) {
    var html = 'Điểm: ' + score + '/5';
    if (feedback.length > 0) {
        html += '<br><span style="font-size:0.95rem; font-weight:normal;">' + feedback.join('<br>') + '</span>';
    }
    return html;
}

/**
 * Engine chấm điểm chính
 * @param {string} text - Bài làm của người dùng
 * @param {object} config - Cấu hình chấm điểm
 * @param {string[]} config.exactAnswers - Danh sách đáp án chuẩn NIIED + mở rộng
 * @param {string[]} [config.context] - Từ khóa bối cảnh (tân ngữ, trạng từ chỉ thời gian...)
 * @param {string[]} config.stems - Gốc động từ chính cần có (ít nhất 1)
 * @param {string[]} [config.altStems] - Gốc động từ phụ (cần context words đi kèm)
 * @param {string[]} [config.altRequire] - Từ vựng ngữ cảnh bắt buộc nếu dùng altStems
 * @param {object[]} config.grammar - Mẫu ngữ pháp regex cần kiểm tra
 * @param {string} fallbackMsg - Thông báo khi 0 điểm
 * @returns {{score: number, feedback: string[], display: string}}
 */
function gradeByConfig(text, config, fallbackMsg) {
    try {
        var score = 0;
        var feedback = [];

        if (!text || text.trim() === '') {
            feedback.push('❌ Bạn chưa nhập đáp án.');
            return { score: 0, feedback: feedback, display: makeDisplay(0, feedback) };
        }

        // 1. Ưu tiên cao nhất: exact match với đáp án chuẩn + mở rộng
        if (config.exactAnswers && matchExact(text, config.exactAnswers)) {
            score = 5;
            feedback.push('Đạt 5/5 Điểm: Đáp án chính xác 100%, trùng khớp với đáp án chuẩn/mở rộng.');
            return { score: score, feedback: feedback, display: makeDisplay(score, feedback) };
        }

        // 2. Kiểm tra stems
        var hasStems = false;
        if (config.stems && matchStems(text, config.stems)) {
            hasStems = true;
        }
        // Kiểm tra alt stems (cần context words đi kèm)
        if (!hasStems && config.altStems && matchStems(text, config.altStems)) {
            if (config.altRequire && hasAnyWord(text, config.altRequire)) {
                hasStems = true;
            }
        }

        // 3. Kiểm tra grammar
        var hasGrammar = config.grammar && matchGrammar(text, config.grammar);

        // 4. Kiểm tra context
        var hasContext = true; // Mặc định là true nếu không cấu hình (vd: câu chỉ có động từ)
        if (config.context && config.context.length > 0) {
            hasContext = matchStems(text, config.context);
        }

        // 5. Chấm điểm
        if (hasStems && hasGrammar && hasContext) {
            score = 4;
            feedback.push('Đạt 4/5 Điểm: Khớp với ý của đáp án nhưng chưa giống 100% đáp án chuẩn.');
        } else if (hasStems && hasGrammar) {
            score = 3;
            feedback.push('Đạt 3/5 Điểm: Đúng động từ kèm ngữ pháp chuẩn (nhưng thiếu/sai tân ngữ hoặc bối cảnh).');
        } else if (hasStems) {
            score = 2;
            feedback.push('Đạt 2/5 Điểm: Chỉ đúng trạng từ hoặc động từ.');
        } else if (hasGrammar) {
            score = 1;
            feedback.push('Đạt 1/5 Điểm: Chỉ đúng ngữ pháp nhưng sai hoàn toàn/thiếu động từ chính.');
        } else {
            score = 0;
            feedback.push('Đạt 0/5 Điểm: ' + (fallbackMsg || 'Đáp án chưa chính xác.'));
        }

        return { score: score, feedback: feedback, display: makeDisplay(score, feedback) };
    } catch(e) {
        console.error('Lỗi chấm điểm:', e);
        return {
            score: 0,
            feedback: ['Lỗi hệ thống khi chấm điểm. Vui lòng thử lại.'],
            display: makeDisplay(0, ['Lỗi hệ thống khi chấm điểm. Vui lòng thử lại.'])
        };
    }
}
