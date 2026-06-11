// grading-engine.test.js
// Unit tests for grading-engine.js — Node.js + assert (no framework)
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

// Load source code into global scope (dùng vm.runInThisContext để chạy như <script>)
const sourcePath = path.join(__dirname, 'grading-engine.js');
const source = fs.readFileSync(sourcePath, 'utf-8');
vm.runInThisContext(source);

// Test runner
let passed = 0;
let failed = 0;
const failures = [];

function runTest(name, fn) {
    try {
        fn();
        passed++;
        console.log('  PASS  ' + name);
    } catch (e) {
        failed++;
        failures.push(name + ' — ' + e.message);
        console.log('  FAIL  ' + name + ' — ' + e.message);
    }
}

function assertEqual(actual, expected, msg) {
    assert.strictEqual(actual, expected, msg);
}

function assertContains(haystack, needle, msg) {
    if (!haystack.includes(needle)) {
        throw new Error(msg || ('Expected "' + haystack + '" to contain "' + needle + '"'));
    }
}

function assertNotContains(haystack, needle, msg) {
    if (haystack.includes(needle)) {
        throw new Error(msg || ('Expected "' + haystack + '" to NOT contain "' + needle + '"'));
    }
}

// ========================================
//  CONFIG MẪU (topik35 51A) dùng cho nhóm E
// ========================================
const CONFIG = {
    exactAnswers: [
        '그동안 사용했던 제 물건들을 정리하려고 합니다.',
        '제 물건들을 무료로 드리려고 합니다.',
        '제 물건을 정리하고 있습니다.'
    ],
    stems: ['정리하', '처분하'],
    altStems: ['주', '드리', '나누'],
    altRequire: ['물건', '짐', '것'],
    grammar: [
        { pattern: /려고\s*하[가-힣]*/, label: 'ý định' },
        { pattern: /고\s*있[가-힣]*/, label: 'tiếp diễn' },
        { pattern: /ㄹ\s*거[가-힣]*/, label: 'tương lai' }
    ]
};

// ========================================
//  NHÓM A: normalizeKorean (6 ca)
// ========================================
runTest('A.1 normalizeKorean — trim khoảng trắng đầu cuối', () => {
    assertEqual(normalizeKorean('  안녕하세요  '), '안녕하세요');
});

runTest('A.2 normalizeKorean — collapse nhiều spaces thành 1', () => {
    assertEqual(normalizeKorean('안녕   하세요'), '안녕 하세요');
});

runTest('A.3 normalizeKorean — xóa dấu chấm cuối câu', () => {
    assertEqual(normalizeKorean('감사합니다.'), '감사합니다');
});

runTest('A.4 normalizeKorean — xóa dấu ? ! cuối câu', () => {
    assertEqual(normalizeKorean('진짜요?'), '진짜요');
    assertEqual(normalizeKorean('안돼!'), '안돼');
});

runTest('A.5 normalizeKorean — xóa dấu câu tiếng Hàn 。', () => {
    assertEqual(normalizeKorean('네。'), '네');
});

runTest('A.6 normalizeKorean — text đã sạch giữ nguyên', () => {
    assertEqual(normalizeKorean('안녕하세요'), '안녕하세요');
});

// ========================================
//  NHÓM B: hasWord & hasAnyWord (5 ca)
// ========================================
runTest('B.1 hasWord — tìm thấy từ trong text', () => {
    assertEqual(hasWord('안녕하세요', '안녕'), true);
});

runTest('B.2 hasWord — không tìm thấy từ', () => {
    assertEqual(hasWord('안녕하세요', '감사'), false);
});

runTest('B.3 hasWord — escape ký tự regex đặc biệt (dấu .)', () => {
    assertEqual(hasWord('3.5점', '3.5'), true);
    assertEqual(hasWord('3x5점', '.5'), false);
});

runTest('B.4 hasAnyWord — ít nhất 1 từ khớp', () => {
    assertEqual(hasAnyWord('저는 학생입니다', ['선생', '학생']), true);
});

runTest('B.5 hasAnyWord — không từ nào khớp', () => {
    assertEqual(hasAnyWord('저는 학생입니다', ['선생', '교수']), false);
});

// ========================================
//  NHÓM C: matchExact (5 ca)
// ========================================
runTest('C.1 matchExact — khớp chính xác đáp án', () => {
    assertEqual(matchExact('정리하려고 합니다.', ['정리하려고 합니다.', '드리려고 합니다.']), true);
});

runTest('C.2 matchExact — khớp sau khi normalize (spacing khác nhau)', () => {
    assertEqual(matchExact('정리하려고   합니다.', ['정리하려고 합니다.']), true);
});

runTest('C.3 matchExact — không khớp', () => {
    assertEqual(matchExact('공부했습니다.', ['정리했습니다.']), false);
});

runTest('C.4 matchExact — text rỗng', () => {
    assertEqual(matchExact('', ['답']), false);
    assertEqual(matchExact('  ', ['답']), false);
});

runTest('C.5 matchExact — danh sách đáp án rỗng', () => {
    assertEqual(matchExact('답', []), false);
});

// ========================================
//  NHÓM D: matchGrammar (4 ca)
// ========================================
runTest('D.1 matchGrammar — regex pattern khớp', () => {
    assertEqual(matchGrammar('정리하려고 합니다', [
        { pattern: /려고\s*하[가-힣]*/ }
    ]), true);
});

runTest('D.2 matchGrammar — regex pattern không khớp', () => {
    assertEqual(matchGrammar('공부합니다', [
        { pattern: /려고\s*하[가-힣]*/ }
    ]), false);
});

runTest('D.3 matchGrammar — nhiều pattern, 1 cái khớp', () => {
    assertEqual(matchGrammar('하고 있습니다', [
        { pattern: /려고\s*하[가-힣]*/ },
        { pattern: /고\s*있[가-힣]*/ }
    ]), true);
});

runTest('D.4 matchGrammar — danh sách grammar rỗng', () => {
    assertEqual(matchGrammar('합니다', []), false);
});

// ========================================
//  NHÓM E: gradeByConfig (10 ca — QUAN TRỌNG NHẤT)
// ========================================
runTest('E.1 gradeByConfig — input rỗng → 0 điểm', () => {
    let r = gradeByConfig('', CONFIG, 'Cần dọn dẹp');
    assertEqual(r.score, 0);
    assertContains(r.feedback[0], 'chưa nhập');
    assertContains(r.display, '0/5');
});

runTest('E.2 gradeByConfig — exact match đáp án NIIED → 5 điểm', () => {
    let r = gradeByConfig('그동안 사용했던 제 물건들을 정리하려고 합니다.', CONFIG, '');
    assertEqual(r.score, 5);
    assertContains(r.feedback[0], 'trùng khớp');
});

runTest('E.3 gradeByConfig — exact match đáp án mở rộng → 5 điểm', () => {
    let r = gradeByConfig('제 물건을 정리하고 있습니다.', CONFIG, '');
    assertEqual(r.score, 5);
});

runTest('E.4 gradeByConfig — đúng stems + grammar → 5 điểm', () => {
    let r = gradeByConfig('제 물건들을 정리하려고 해요.', CONFIG, '');
    assertEqual(r.score, 5);
    assertContains(r.feedback[0], 'Đúng động từ');
});

runTest('E.5 gradeByConfig — chỉ đúng grammar → 3 điểm', () => {
    let r = gradeByConfig('공부하려고 합니다.', CONFIG, '');
    assertEqual(r.score, 3);
    assertContains(r.feedback[0], 'Đúng ngữ pháp');
});

runTest('E.6 gradeByConfig — chỉ đúng stems → 2 điểm', () => {
    let r = gradeByConfig('물건을 정리합니다.', CONFIG, '');
    assertEqual(r.score, 2);
    assertContains(r.feedback[0], 'Đúng động từ chính');
});

runTest('E.7 gradeByConfig — không match gì → 0 điểm', () => {
    let r = gradeByConfig('저는 학생입니다.', CONFIG, 'Học sinh không liên quan');
    assertEqual(r.score, 0);
    assertContains(r.feedback[0], 'Học sinh không liên quan');
});

runTest('E.8 gradeByConfig — altStems + altRequire → stems được tính', () => {
    let r = gradeByConfig('제 물건을 드리려고 합니다.', CONFIG, '');
    assertEqual(r.score, 5);
});

runTest('E.9 gradeByConfig — altStems thiếu altRequire → chỉ grammar (3đ)', () => {
    let r = gradeByConfig('드리려고 합니다.', CONFIG, '');
    assertEqual(r.score, 3);
});

runTest('E.10 gradeByConfig — config thiếu grammar (edge case)', () => {
    let noGrammarConfig = {
        stems: ['정리하'],
        grammar: []
    };
    let r = gradeByConfig('물건을 정리합니다.', noGrammarConfig, '');
    assertEqual(r.score, 2);
});

// ========================================
//  NHÓM F: makeDisplay (3 ca)
// ========================================
runTest('F.1 makeDisplay — score 5 + 1 feedback', () => {
    let html = makeDisplay(5, ['Đạt 5/5']);
    assertContains(html, '5/5');
    assertContains(html, 'Đạt 5/5');
});

runTest('F.2 makeDisplay — score 0 + feedback', () => {
    let html = makeDisplay(0, ['Sai']);
    assertContains(html, '0/5');
    assertContains(html, 'Sai');
});

runTest('F.3 makeDisplay — không có feedback (chỉ hiển thị điểm)', () => {
    let html = makeDisplay(3, []);
    assertContains(html, '3/5');
    assertNotContains(html, '<br>');
});

// ========================================
//  KẾT QUẢ
// ========================================
console.log('\n========================================');
console.log('  KẾT QUẢ: ' + passed + ' passed, ' + failed + ' failed');
console.log('========================================');

if (failed > 0) {
    console.log('\nChi tiết FAIL:');
    failures.forEach(function(f) { console.log('  - ' + f); });
}

process.exit(failed > 0 ? 1 : 0);
