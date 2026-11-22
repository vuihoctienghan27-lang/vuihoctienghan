/*
 * Chuyển file soạn bài nghe (.txt) → file nhập "vht-curriculum-listening" cho nút "🎧 Nhập bài nghe".
 *
 *   node tools/curriculum-listening/build.js <bai-nghe.txt> <giao-trinh.json> <ra.json> [--tag 1a] [--merge cu.json ...]
 *
 * - <giao-trinh.json>: bản xuất "vht-curriculum" — dùng để lấy đúng tên bài ("Bài N. …").
 * - --merge: giữ lại bài nghe trong các file nghe khác (VD bài tự soạn), ghép theo số bài;
 *   bài nghe trong file .txt đứng trước.
 *
 * Định dạng .txt:
 *   ## 1                         ← số bài
 *   ### 듣기 1 — tiêu đề          ← một bài nghe
 *   A: câu thoại
 *   = bản dịch (tùy chọn)
 *   ---                          ← hết lời thoại, bắt đầu câu hỏi
 *   ? câu hỏi
 *   = dịch câu hỏi (tùy chọn)
 *   - đáp án sai
 *   * đáp án đúng
 *   > giải thích (tùy chọn)
 * Dòng bắt đầu bằng "//" là ghi chú; dòng mẫu còn "<…>" chưa điền bị bỏ qua; bài nghe chưa điền gì cũng bị bỏ qua.
 *
 * Bộ đọc lời thoại / câu hỏi lấy trực tiếp từ public/assets/js/curriculum-admin.js nên luôn
 * khớp với trang soạn giáo trình.
 */
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const opt = (name) => { const i = args.indexOf(name); if (i < 0) return null; const v = args[i + 1]; args.splice(i, 2); return v; };
const merges = []; let m; while ((m = opt('--merge'))) merges.push(m);
const tag = opt('--tag') || 'x';
const [txt, curJson, out] = args;
if (!txt || !curJson || !out) { console.error('Cách dùng: node build.js <bai-nghe.txt> <giao-trinh.json> <ra.json> [--tag 1a] [--merge cu.json]'); process.exit(1); }

const src = fs.readFileSync(path.join(__dirname, '../../public/assets/js/curriculum-admin.js'), 'utf8');
const grab = (name) => {
    const i = src.indexOf('function ' + name + '(');
    let d = 0;
    for (let k = src.indexOf('{', i); k < src.length; k++) {
        if (src[k] === '{') d++;
        else if (src[k] === '}' && --d === 0) return src.slice(i, k + 1);
    }
    throw new Error('Không tìm thấy ' + name);
};
const parseScript = eval('(' + grab('parseScript') + ')');
const parseQuestions = eval('(' + grab('parseQuestions') + ')');

const cur = JSON.parse(fs.readFileSync(curJson, 'utf8'));
const titleOf = {};
cur.lessons.forEach(l => { const mm = String(l.title).match(/^\s*(?:Bài|Lesson|제)?\s*(\d+)/i); if (mm) titleOf[mm[1]] = l.title; });

const byNo = {}; const problems = [];
// bỏ ghi chú "//" và các dòng mẫu còn chỗ trống "<…>" chưa điền
const text = fs.readFileSync(txt, 'utf8').split(/\r?\n/)
    .filter(l => !/^\s*\/\//.test(l) && !/<[^<>]*>/.test(l) && !/^\s*[=＝]\s*$/.test(l)).join('\n');
text.split(/^## /m).filter(s => s.trim()).forEach(block => {
    const no = block.split('\n')[0].trim();
    if (!titleOf[no]) { problems.push(`Bài ${no}: không có trong giáo trình`); return; }
    block.split(/^### /m).slice(1).forEach((it, i) => {
        const [head, ...rest] = it.split('\n');
        const [script, qs] = rest.join('\n').split(/^---\s*$/m);
        const d = { id: `ls_${tag}_${no}_${i + 1}`, title: head.trim(), audio: '', lines: parseScript(script || ''), questions: parseQuestions(qs || '') };
        if (!d.lines.length && !d.questions.length) return; // chưa điền
        d.questions.forEach((q, qi) => { if (q.answer < 0 || q.options.length < 2) problems.push(`Bài ${no} · ${d.title} · câu ${qi + 1}: thiếu đáp án (cần ≥ 2 lựa chọn và 1 dòng *)`); });
        d.lines.forEach((l, li) => { if (!l.s && !/^\(.*\)$/.test(l.kr)) problems.push(`Bài ${no} · ${d.title} · dòng ${li + 1}: chưa có tên nhân vật "Tên: …"`); });
        (byNo[no] = byNo[no] || []).push(d);
    });
});
merges.forEach(f => {
    JSON.parse(fs.readFileSync(f, 'utf8')).lessons.forEach(l => {
        const mm = String(l.title).match(/^\s*(?:Bài|Lesson|제)?\s*(\d+)/i); if (!mm) return;
        (byNo[mm[1]] = byNo[mm[1]] || []).push(...(l.listening || []));
    });
});
// ID bài nghe phải khác nhau trong cùng bài (file ghép có thể trùng) → thêm hậu tố
const seen = new Set();
Object.values(byNo).flat().forEach(d => { let id = d.id, k = 2; while (seen.has(id)) id = d.id + '_' + k++; d.id = id; seen.add(id); });
const lessons = Object.keys(byNo).sort((a, b) => a - b).map(no => ({ title: titleOf[no], listening: byNo[no] }));
fs.writeFileSync(out, JSON.stringify({ format: 'vht-curriculum-listening', formatVersion: 1, lessons }, null, 1));
const items = lessons.flatMap(l => l.listening);
console.log(`Đã ghi ${out}: ${lessons.length} bài, ${items.length} bài nghe, ${items.reduce((n, d) => n + d.questions.length, 0)} câu hỏi`);
if (problems.length) { console.log('Cần sửa:'); problems.forEach(p => console.log('  - ' + p)); }
