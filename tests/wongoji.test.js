// Test wongoji.js (원고지 câu 53): node tests/wongoji.test.js
const assert = require('assert');
const W = require(require('path').join(__dirname, '../public/assets/js/wongoji.js'));
const row = t => W.layout(t).cells.map(c => c ? (c.kind === 'space' ? '_' : c.kind === 'indent' ? '^' : c.text) : '∅').join('|');
let pass = 0, fail = 0;
function eq(name, a, b) { try { assert.deepStrictEqual(a, b); pass++; } catch (e) { fail++; console.log('FAIL', name, '\n  got ', a, '\n  want', b); } }

// --- Layout: dấu cách sau dấu chấm/phẩy ---
eq('dot space', row('다. 또'), '^|다|.|또');
eq('comma space', row('고, 또'), '^|고|,|또');
eq('dot curly single quote', row("‘좋다.’ 또"), '^|‘|좋|다|.’|또');
eq('dot curly double quote', row('“좋다.” 그'), '^|“|좋|다|.”|그');
eq('dot straight quote', row('"좋다." 그'), '^|"|좋|다|."|그');
eq('comma quote', row("‘마련’, 또"), '^|‘|마|련|’|,|또');
eq('question keeps blank', row('까? 그'), '^|까|?|_|그');
eq('two spaces after dot', row('다.  또'), '^|다|.|또');
eq('decimal', row('15.5% 이상'), '^|15|.5|%|_|이|상');
eq('closing quote no dot keeps blank', row("‘마련’ 이"), '^|‘|마|련|’|_|이');
eq('used count', W.layout('증가하였다. 또한 감소하였다.').used, 16);
// dấu chấm rơi đầu dòng → dồn lên ô cuối dòng trên; dấu cách sau đó cũng bỏ
eq('dot at line start', W.layout('가'.repeat(23) + '다. 또').used, 26);

// --- quickCheck + fix ---
function fixes(t) { const q = W.quickCheck(t); return W.applyFixes(t, q.issues).text; }
eq('polite past', fixes('인구가 증가했습니다.'), '인구가 증가했다.');
eq('polite yo', fixes('비율이 높아요.'), '비율이 높다.');
eq('decimal comma', fixes('비율은 15,5%이다.'), '비율은 15.5%이다.');
eq('1,000 not decimal', W.quickCheck('1,000명을 대상으로 조사하였다.').issues.filter(i => /thập phân/.test(i.msg)).length, 0);
eq('spacing', fixes('할수 있다. 2020년이후 증가하였다. 이것에대해 조사했다.'), '할 수 있다. 2020년 이후 증가하였다. 이것에 대해 조사했다.');
eq('spoken', fixes('그래서 너무 증가하였다.'), '따라서 매우 증가하였다.');
eq('증가되었다', fixes('인구가 증가되었다.'), '인구가 증가하였다.');
eq('이였다', fixes('학생이였다.'), '학생이었다.');
eq('missing period', fixes('증가하였다\n또한 감소하였다.'), '증가하였다.\n또한 감소하였다.');
eq('있는다', fixes('관심이 많는다.'), '관심이 많다.');
eq('적는다 ok', W.quickCheck('이름을 적는다.').issues.length, 0);
eq('할때', fixes('조사할때 나타났다.'), '조사할 때 나타났다.');
eq('space before dot', fixes('증가하였다 .'), '증가하였다.');

// --- assess ---
const model = '한국사회연구소의 조사에 따르면 전체 가구 중 1인 가구가 차지하는 비율은 2000년 15.5%에서 2010년 23.9%로 증가하였고, 2020년에는 31.7%에 달하여 20년 사이에 두 배 이상 늘어난 것으로 나타났다. 이와 같이 1인 가구가 증가한 원인으로는 먼저 결혼에 대한 인식이 변화한 것을 들 수 있다. 또한 고령화로 인해 혼자 사는 노인이 많아진 것도 원인이 되었다. 이러한 추세가 계속된다면 2040년에는 1인 가구의 비율이 40%에 이를 것으로 전망된다.';
const p = { keyNumbers: ['15.5', '23.9', '31.7', '40'], keyTerms: ['결혼', '고령화|노인', '전망|예상'] };
const a = W.assess(W.quickCheck(model, p), model, p);
console.log('model:', a.total, a.criteria.map(c => c.score + '/' + c.max + c.band).join(' '));
eq('model scores high', a.total >= 26, true);
const bad = '저는 1인 가구가 많아요. 그래서 너무 증가했습니다. 제 생각에는 좋은 것 같아요.';
const b = W.assess(W.quickCheck(bad, p), bad, p);
console.log('bad:', b.total, b.criteria.map(c => c.score + '/' + c.max + c.band).join(' '));
b.criteria.forEach(c => c.notes.forEach(n => console.log('   ', n[0] ? '✅' : '⚠️', n[1])));
eq('bad scores low', b.total <= 10, true);
eq('lang even', a.criteria[2].score % 2, 0);
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
