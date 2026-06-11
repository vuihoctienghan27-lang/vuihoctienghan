
    // grading-engine.js — TOPIK Writing Grading Engine (Câu 51 & 52)
// Thay thế checkKeywords() thô sơ bằng regex + exact matching

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

/** Kiểm tra text chứa từ/cụm từ */
function hasWord(text, word) {
    return new RegExp(escapeRegex(word)).test(text);
}

/** Kiểm tra text chứa ít nhất 1 từ trong danh sách */
function hasAnyWord(text, wordList) {
    return wordList.some(w => hasWord(text, w));
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

/** Kiểm tra ít nhất 1 mẫu ngữ pháp khớp */
function matchGrammar(text, grammarList) {
    return grammarList.some(function(g) {
        return g.pattern.test(text);
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
 * @param {string[]} config.stems - Gốc động từ chính cần có (ít nhất 1)
 * @param {string[]} [config.altStems] - Gốc động từ phụ (cần context words đi kèm)
 * @param {string[]} [config.altRequire] - Từ vựng ngữ cảnh bắt buộc nếu dùng altStems
 * @param {object[]} config.grammar - Mẫu ngữ pháp regex cần kiểm tra
 * @param {string} fallbackMsg - Thông báo khi 0 điểm
 * @returns {{score: number, feedback: string[], display: string}}
 */
function gradeByConfig(text, config, fallbackMsg) {
    var score = 0;
    var feedback = [];

    if (!text || text.trim() === '') {
        feedback.push('❌ Bạn chưa nhập đáp án.');
        return { score: 0, feedback: feedback, display: makeDisplay(0, feedback) };
    }

    // 1. Ưu tiên cao nhất: exact match với đáp án chuẩn + mở rộng
    if (config.exactAnswers && matchExact(text, config.exactAnswers)) {
        score = 5;
        feedback.push('Đạt 5/5 Điểm: Đáp án chính xác, trùng khớp với đáp án chuẩn.');
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

    // 4. Chấm điểm
    if (hasStems && hasGrammar) {
        score = 5;
        feedback.push('Đạt 5/5 Điểm: Đúng động từ và ngữ pháp.');
    } else if (hasGrammar) {
        score = 3;
        feedback.push('Đạt 3/5 Điểm: Đúng ngữ pháp, nhưng sai/thiếu động từ chính.');
    } else if (hasStems) {
        score = 2;
        feedback.push('Đạt 2/5 Điểm: Đúng động từ chính, nhưng sai/thiếu ngữ pháp.');
    } else {
        score = 0;
        feedback.push('Đạt 0/5 Điểm: ' + (fallbackMsg || 'Lệch hướng.'));
    }

    return { score: score, feedback: feedback, display: makeDisplay(score, feedback) };
}
