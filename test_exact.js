const fs = require('fs');

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

function normalizeKorean(text) {
    return text
        .trim()
        .replace(/\s+/g, ' ')
        .replace(/[.。,，!！?？~～]+$/g, '')
        .trim();
}

function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function hasWord(text, word) {
    var decText = decomposeHangul(text);
    var decWord = decomposeHangul(word);
    return new RegExp(escapeRegex(decWord)).test(decText);
}

function hasAnyWord(text, wordList) {
    return wordList.some(function(w) { return hasWord(text, w); });
}

function matchExact(text, answerList) {
    var norm = normalizeKorean(text);
    console.log("Input Normalized:", norm);
    return answerList.some(function(ans) {
        let a = normalizeKorean(ans);
        console.log("Checking vs:", a, "Equal?", a === norm);
        return a === norm;
    });
}

function matchStems(text, stemList) {
    return hasAnyWord(text, stemList);
}

function matchGrammar(text, grammarList) {
    return grammarList.some(function(g) {
        if (g.pattern.test(text)) return true;
        var expanded = g.pattern.source.replace(/하/g, '[하합해했할한함]');
        if (expanded !== g.pattern.source) {
            return new RegExp(expanded, g.pattern.flags).test(text);
        }
        return false;
    });
}

function gradeByConfig(text, config) {
    if (config.exactAnswers && matchExact(text, config.exactAnswers)) {
        return '5/5';
    }

    var hasStems = false;
    if (config.stems && matchStems(text, config.stems)) {
        hasStems = true;
    }

    var hasGrammar = config.grammar && matchGrammar(text, config.grammar);

    var hasContext = true;
    if (config.context && config.context.length > 0) {
        hasContext = matchStems(text, config.context);
    }

    console.log({hasStems, hasGrammar, hasContext});

    if (hasStems && hasGrammar && hasContext) {
        return '4/5';
    } else if (hasStems && hasGrammar) {
        return '3/5';
    } else if (hasStems) {
        return '2/5';
    } else if (hasGrammar) {
        return '1/5';
    } else {
        return '0/5';
    }
}

const config = {
    exactAnswers: [
        '금요일에 뵙기 어려울 거 같습니다.',
        '금요일에 다른 일이 생겼습니다.',
        '금요일에 사정이 생겨서 찾아뵙기가 어려울 거 같습니다.',
        '금요일에 못 갈 것 같습니다.',
        '금요일 약속을 취소해야 할 것 같습니다.'
    ],
    context: ['금요일'],
    stems: ['어렵', '어려우', '못 가', '생겼', '생겨서', '취소'],
    grammar: [
        { pattern: /것\s*같[가-힣]*/, label: 'suy đoán' },
        { pattern: /겠습[가-힣]*/, label: 'tương lai lịch sự' }
    ]
};

console.log('Result for Exact Match:', gradeByConfig('금요일에 뵙기 어려울 거 같습니다.', config));
