const fs = require('fs');

const examJsPath = 'C:/Users/Minh Hieu/Desktop/TOPIK ED 3/public/assets/js/exam.js';
let content = fs.readFileSync(examJsPath, 'utf-8');

// The line is: if (path.includes('mypage.html') || path.includes('forum.html') || path.endsWith('index.html') || path === '/' || path.endsWith('.com/')) return;
let targetLine = "if (path.includes('mypage.html') || path.includes('forum.html') || path.endsWith('index.html') || path === '/' || path.endsWith('.com/')) return;";
let replacement = targetLine + "\n    if (path.includes('type_')) return; // Không hiển thị màn hình chọn chế độ cho trang luyện theo dạng câu";

if (content.includes(targetLine) && !content.includes("path.includes('type_')")) {
    content = content.replace(targetLine, replacement);
    fs.writeFileSync(examJsPath, content, 'utf-8');
    console.log("Updated exam.js successfully");
} else {
    console.log("exam.js already updated or could not find target line.");
}
