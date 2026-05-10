const fs = require('fs');
const path = require('path');

const directory = 'C:/Users/Minh Hieu/Desktop/TOPIK ED 3/public/reading';

function processFile(filepath) {
    let content = fs.readFileSync(filepath, 'utf-8');

    const regex = /(if\s*\(\s*targetQuestions\.includes\(qNum\)\s*\)\s*\{)([\s\S]*?)(totalQuestions\+\+;\s*\})/g;

    let modified = content.replace(regex, (match, prefix, body, suffix) => {
        let hasReplace = body.includes('.replace(');

        let newBody = `
                                // XÓA TRIỆT ĐỂ nút "Ôn tập từ vựng câu này"
                                block.querySelectorAll('button, a').forEach(el => {
                                    if (el.innerText && el.innerText.toLowerCase().includes('ôn tập từ vựng')) {
                                        el.remove();
                                    }
                                });

                                let contentHTML = block.outerHTML;
`;
        if (hasReplace) {
            newBody += `                                contentHTML = contentHTML.replace(/\\(\\d+점\\)/g, '').replace(/<span[^>]*>\\s*\\(?\\d+점\\)?\\s*<\\/span>/g, '');\n`;
        }

        newBody += `
                                if (qNum === targetQuestions[0]) {
                                    let badge = \`<div class="exam-source-badge">📚 Trích từ: \${examName.toUpperCase()}</div>\`;
                                    let prepends = [];
                                    let prev = block.previousElementSibling;
                                    let count = 0;
                                    while (prev && !prev.classList.contains('question-block') && !prev.classList.contains('header-wrapper') && count < 5) {
                                        if (prev.tagName !== 'SCRIPT' && prev.tagName !== 'STYLE') {
                                            prepends.unshift(prev.outerHTML);
                                        }
                                        prev = prev.previousElementSibling;
                                        count++;
                                    }
                                    tempHTML += '<div style="margin-top: 30px;">' + badge + prepends.join('') + contentHTML + '</div>';
                                } else {
                                    tempHTML += contentHTML;
                                }
                                `;

        return prefix + newBody + suffix;
    });

    if (modified !== content) {
        fs.writeFileSync(filepath, modified, 'utf-8');
        console.log('Updated ' + filepath);
    }
}

function walkSync(dir, callback) {
    fs.readdirSync(dir).forEach(file => {
        let filepath = path.join(dir, file);
        if (fs.statSync(filepath).isDirectory()) {
            walkSync(filepath, callback);
        } else {
            callback(filepath);
        }
    });
}

walkSync(directory, filepath => {
    let basename = path.basename(filepath);
    if (basename.startsWith('type_') && basename.endsWith('.html')) {
        processFile(filepath);
    }
});
