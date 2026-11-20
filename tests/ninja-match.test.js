// Test ninja-match.js (so khớp đáp án Ninja phi tiêu): node tests/ninja-match.test.js
const assert = require('assert');
const M = require(require('path').join(__dirname, '../public/assets/js/ninja-match.js'));
let pass = 0, fail = 0;
function ok(name, v, want = true) { try { assert.strictEqual(v, want); pass++; } catch (e) { fail++; console.log('FAIL', name, 'got', v, 'want', want); } }

const ko = { w: '해소하다', m: 'giải tỏa, giải quyết', d: 'k' };
ok('vi nghĩa 1', M.check('giải tỏa', ko));
ok('vi nghĩa 2', M.check('Giải Quyết', ko));
ok('vi cả chuỗi', M.check('giải tỏa, giải quyết', ko));
ok('vi khoảng trắng + dấu câu', M.check('  giải   quyết!! ', ko));
ok('vi kiểu dấu cũ', M.check('giải toả', ko));
ok('vi sai', M.check('giải trí', ko), false);
ok('vi rỗng', M.check('   ', ko), false);
ok('vi NFD', M.check('giải tỏa'.normalize('NFD'), ko));
ok('vi không dấu khi Enter', M.check('giai toa', ko, true));
ok('vi không dấu khi tự khớp → không', M.check('giai toa', ko, false), false);
ok('vi dấu sai không được nới', M.check('giài tỏa', ko, true), false);
ok('vi không dấu từ ngắn → không', M.check('ban', { w: '친구', m: 'bạn', d: 'k' }, true), false);
ok('vi bỏ "sự"', M.check('giúp đỡ', { w: '도움', m: 'sự giúp đỡ', d: 'k' }));
ok('vi giữ "sự"', M.check('sự giúp đỡ', { w: '도움', m: 'sự giúp đỡ', d: 'k' }));
ok('vi ngoặc', M.check('giúp đỡ', { w: '도움', m: '(sự) giúp đỡ', d: 'k' }));
ok('vi chấm phẩy', M.check('tiết kiệm', { w: '절감하다', m: 'cắt giảm; tiết kiệm', d: 'k' }));
ok('vi hoà/hòa', M.check('hoà bình', { w: '평화', m: 'hòa bình', d: 'k' }));
ok('vi hoàng giữ nguyên', M.check('hoàng gia', { w: '왕실', m: 'hoàng gia', d: 'k' }));

const vi = { w: '해소하다', m: 'giải tỏa, giải quyết', d: 'v' };
ok('ko đúng', M.check('해소하다', vi));
ok('ko có khoảng trắng', M.check(' 해소 하다 ', vi));
ok('ko bỏ 하다', M.check('해소', vi));
ok('ko sai', M.check('해결하다', vi), false);
ok('ko gõ nghĩa Việt → sai', M.check('giải tỏa', vi), false);
ok('ko NFD jamo', M.check('해소하다'.normalize('NFD'), vi));
ok('ko từ ngắn không bỏ 하다', M.check('', { w: '하다', m: 'làm', d: 'v' }), false);

console.log(`ninja-match: ${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);
