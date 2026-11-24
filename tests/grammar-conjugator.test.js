// node tests/grammar-conjugator.test.js
const assert = require('assert');
const path = require('path');
const G = require(path.join(__dirname, '..', 'public', 'assets', 'js', 'grammar-conjugator.js'));
require(path.join(__dirname, '..', 'public', 'assets', 'js', 'grammar-conjugator-rules.js'));
const RULES = globalThis.GRAMMAR_CONJ_RULES;

let pass = 0, fail = 0;
function eq(word, spec, expected, pos) {
    const r = G.conjugate(word, spec, pos ? { pos } : {});
    try {
        assert.strictEqual(r.ok, true, r.error);
        assert.strictEqual(r.result, expected);
        pass++;
    } catch (e) {
        fail++;
        console.error(`✗ ${word} + ${spec} → ${r.result || r.error} (mong đợi ${expected})`);
    }
}

// ---- 아/어 ----
const AEO = [
    ['가다', '가요'], ['보다', '봐요'], ['오다', '와요'], ['먹다', '먹어요'], ['앉다', '앉아요'],
    ['마시다', '마셔요'], ['배우다', '배워요'], ['주다', '줘요'], ['되다', '돼요'], ['보내다', '보내요'],
    ['서다', '서요'], ['켜다', '켜요'], ['쉬다', '쉬어요'], ['공부하다', '공부해요'], ['하다', '해요'],
    ['살다', '살아요'], ['만들다', '만들어요'], ['좋다', '좋아요', 'A'], ['놓다', '놓아요'],
    // ㅡ 탈락
    ['쓰다', '써요'], ['크다', '커요', 'A'], ['바쁘다', '바빠요', 'A'], ['예쁘다', '예뻐요', 'A'], ['아프다', '아파요', 'A'],
    // ㅂ
    ['덥다', '더워요', 'A'], ['춥다', '추워요', 'A'], ['어렵다', '어려워요', 'A'], ['돕다', '도와요'], ['눕다', '누워요'],
    ['입다', '입어요'], ['좁다', '좁아요', 'A'], ['아름답다', '아름다워요', 'A'],
    // ㄷ
    ['듣다', '들어요'], ['걷다', '걸어요'], ['묻다', '물어요'], ['받다', '받아요'], ['닫다', '닫아요'], ['믿다', '믿어요'],
    // ㅅ
    ['낫다', '나아요'], ['짓다', '지어요'], ['붓다', '부어요'], ['웃다', '웃어요'], ['씻다', '씻어요'],
    // ㅎ
    ['그렇다', '그래요', 'A'], ['어떻다', '어때요', 'A'], ['빨갛다', '빨개요', 'A'], ['하얗다', '하얘요', 'A'],
    // 르 / 러 / 우
    ['모르다', '몰라요'], ['부르다', '불러요'], ['다르다', '달라요', 'A'], ['빠르다', '빨라요', 'A'], ['고르다', '골라요'],
    ['따르다', '따라요'], ['들르다', '들러요'], ['푸르다', '푸르러요', 'A'], ['푸다', '퍼요']
];
AEO.forEach(([w, e, p]) => eq(w, '아/어요', e, p));

// ---- 았/었 ----
[['가다', '갔어요'], ['먹다', '먹었어요'], ['하다', '했어요'], ['듣다', '들었어요'], ['모르다', '몰랐어요'],
 ['덥다', '더웠어요', 'A'], ['쓰다', '썼어요'], ['짓다', '지었어요'], ['그렇다', '그랬어요', 'A'], ['마시다', '마셨어요']]
    .forEach(([w, e, p]) => eq(w, '았/었어요', e, p));
eq('학생', '이었어요/였어요', '학생이었어요', 'N');
eq('의사', '이었어요/였어요', '의사였어요', 'N');

// ---- (으) ----
const EU = [
    ['가다', '(으)면', '가면'], ['먹다', '(으)면', '먹으면'], ['살다', '(으)면', '살면'], ['듣다', '(으)면', '들으면'],
    ['덥다', '(으)면', '더우면', 'A'], ['돕다', '(으)면', '도우면'], ['낫다', '(으)면', '나으면'], ['그렇다', '(으)면', '그러면', 'A'],
    ['모르다', '(으)면', '모르면'], ['입다', '(으)면', '입으면'], ['웃다', '(으)면', '웃으면'],
    ['살다', '(으)세요', '사세요'], ['만들다', '(으)니까', '만드니까'], ['알다', '(으)ㅂ시다', '압시다'], ['먹다', '(으)ㅂ시다', '먹읍시다'],
    ['가다', '(으)ㄴ', '간'], ['먹다', '(으)ㄴ', '먹은'], ['만들다', '(으)ㄴ', '만든'], ['듣다', '(으)ㄴ', '들은'],
    ['덥다', '(으)ㄴ', '더운', 'A'], ['하얗다', '(으)ㄴ', '하얀', 'A'], ['짓다', '(으)ㄴ', '지은'],
    ['가다', '(으)ㄹ 거예요', '갈 거예요'], ['살다', '(으)ㄹ 거예요', '살 거예요'], ['듣다', '(으)ㄹ 거예요', '들을 거예요'],
    ['춥다', '(으)ㄹ 거예요', '추울 거예요', 'A'], ['그렇다', '(으)ㄹ 거예요', '그럴 거예요', 'A'],
    ['놀다', '(으)러 가요', '놀러 가요'], ['먹다', '(으)러 가요', '먹으러 가요'], ['만들다', '(으)려고', '만들려고'],
    ['걷다', '(으)ㄹ까요', '걸을까요'], ['돕다', '(으)ㄹ게요', '도울게요'], ['공부하다', '(으)면서', '공부하면서']
];
EU.forEach(([w, s, e, p]) => eq(w, s, e, p));

// ---- vc / gắn thẳng ----
[['가다', 'ㅂ/습니다', '갑니다'], ['먹다', 'ㅂ/습니다', '먹습니다'], ['살다', 'ㅂ/습니다', '삽니다'], ['듣다', 'ㅂ/습니다', '듣습니다'],
 ['가다', 'ㄴ/는다고 해요', '간다고 해요'], ['먹다', 'ㄴ/는다고 해요', '먹는다고 해요'], ['살다', 'ㄴ/는다고 해요', '산다고 해요'],
 ['살다', '는데', '사는데'], ['먹다', '는데', '먹는데'], ['살다', '네요', '사네요'], ['살다', '고', '살고'], ['듣다', '고', '듣고'],
 ['덥다', '지만', '덥지만', 'A'], ['만들다', '는', '만드는'], ['살다', '지 마세요', '살지 마세요']]
    .forEach(([w, s, e, p]) => eq(w, s, e, p));

// ---- Danh từ ----
[['학생', '이에요/예요', '학생이에요'], ['의사', '이에요/예요', '의사예요'], ['학생', '(이)라고 해요', '학생이라고 해요'],
 ['의사', '(이)라고 해요', '의사라고 해요'], ['집', '(으)로', '집으로'], ['학교', '(으)로', '학교로'], ['서울', '(으)로', '서울로'],
 ['책', '은/는', '책은'], ['저', '은/는', '저는'], ['밥', '을/를', '밥을'], ['커피', '을/를', '커피를'], ['빵', '과/와', '빵과'],
 ['우유', '과/와', '우유와'], ['가방', '이/가 아니에요', '가방이 아니에요'], ['수업', ' 후에', '수업 후에'], ['세 시간', '(이)나', '세 시간이나'],
 ['학생', '인데', '학생인데'], ['학생', '일 거예요', '학생일 거예요']]
    .forEach(([w, s, e]) => eq(w, s, e, 'N'));

// ---- Danh hoá -(으)ㅁ ----
[['살다', '삶'], ['만들다', '만듦'], ['먹다', '먹음'], ['가다', '감'], ['듣다', '들음'], ['돕다', '도움']].forEach(([w, e]) => eq(w, '(으)ㅁ', e, 'V'));
eq('기쁘다', '(으)ㅁ', '기쁨', 'A');
// ---- Trung cấp / TOPIK ----
[['가다', '냐고 물어요', '가냐고 물어요'], ['살다', '느라고', '사느라고'], ['먹다', 'ㄴ/는대요', '먹는대요'], ['가다', 'ㄴ/는대요', '간대요'],
 ['살다', '나 봐요', '사나 봐요'], ['먹다', '자마자', '먹자마자'], ['살다', '(으)라고 해요', '살라고 해요']].forEach(([w, s, e]) => eq(w, s, e, 'V'));
eq('작다', '(으)냐고 물어요', '작으냐고 물어요', 'A');
eq('학생', '(이)래요', '학생이래요', 'N');
eq('의사', '(이)래요', '의사래요', 'N');

// ---- Cụm từ ----
eq('비가 오다', '겠어요', '비가 오겠어요', 'V');

// ---- Đoán loại từ & 있다/없다 ----
assert.strictEqual(G.guessPos('학생'), 'N');
assert.strictEqual(G.guessPos('덥다'), 'A');
assert.strictEqual(G.guessPos('먹다'), 'V');
assert.strictEqual(G.guessPos('맛있다'), 'A');
assert.strictEqual(G.formFor(RULES['는데'].forms, '맛있다', 'A'), '는데');
assert.strictEqual(G.formFor(RULES['는데'].forms, '바쁘다', 'A'), '(으)ㄴ데');
eq('맛있다', '는데', '맛있는데', 'A');
eq('바쁘다', '(으)ㄴ데', '바쁜데', 'A');
pass += 6;

// ---- Các bước ----
const st = G.conjugate('듣다', '(으)면', { pos: 'V' }).steps.map(s => s.key);
assert.deepStrictEqual(st, ['root', 'stem', 'check', 'change', 'attach', 'result']);
const st2 = G.conjugate('먹다', '(으)면', { pos: 'V' }).steps.map(s => s.key);
assert.deepStrictEqual(st2, ['root', 'stem', 'check', 'attach', 'result']);
assert.strictEqual(G.conjugate('먹', '(으)면', { pos: 'V' }).ok, false);
assert.strictEqual(G.conjugate('abc', '(으)면').ok, false);
pass += 4;

// ---- Khoá cấu hình phải trùng id trong thư viện ngữ pháp ----
globalThis.window = globalThis;
require(path.join(__dirname, '..', 'public', 'assets', 'js', 'grammar-library.js'));
const IDS = new Set((globalThis.GrammarLibrary || []).map(g => g.id));
for (const key of Object.keys(RULES)) {
    if (IDS.has(key)) pass++; else { fail++; console.error('✗ khoá cấu hình không có trong thư viện: ' + key); }
}

// ---- Mọi cấu hình đều chia được với ví dụ của nó ----
for (const [key, rule] of Object.entries(RULES)) {
    const variants = rule.variants || [{ forms: rule.forms }];
    assert.ok(rule.examples && rule.examples.length, key + ': thiếu examples');
    for (const v of variants) for (const ex of rule.examples) {
        const [w, p] = ex.split('|');
        const spec = G.formFor(v.forms, w, p);
        if (!spec) continue;
        const r = G.conjugate(w, spec, { pos: p });
        if (!r.ok || !r.result) { fail++; console.error(`✗ cấu hình ${key}: ${w} + ${spec} lỗi: ${r.error}`); } else pass++;
    }
}

console.log(`grammar-conjugator: ${pass} pass, ${fail} fail`);
if (fail) process.exit(1);
