const fs = require('fs');
const path = require('path');
const dir = './public/writing/topik_ii/';
const files = fs.readdirSync(dir).filter(f => f.startsWith('topik') && f.endsWith('.html'));

files.forEach(f => {
    let content = fs.readFileSync(path.join(dir, f), 'utf-8');
    
    const blocks = ['51-a', '51-b', '52-a', '52-b'];
    const newExactAnswersMap = {};
    
    blocks.forEach(block => {
        const expRegex = new RegExp(`id="exp-${block}"[\\s\\S]*?</div>\\s*</div>`, 'i');
        const expMatch = expRegex.exec(content);
        if (expMatch) {
            let expBlock = expMatch[0];
            let answers = [];
            
            // Extract NIIED answers (multiline)
            const niiedRegex = /✅ Đáp án chuẩn NIIED:(?:.*?<\/span>)?\s*([\s\S]*?)(?:<br>|<\/div>)/g;
            let nMatch;
            while ((nMatch = niiedRegex.exec(expBlock)) !== null) {
                let text = nMatch[1].trim();
                // Replace internal newlines with space
                text = text.replace(/\n\s*/g, ' ');
                if (text.endsWith('.')) text = text.slice(0, -1).trim();
                text.split('/').forEach(t => {
                    if(t.trim()) answers.push(t.trim());
                });
            }
            
            // Extract expanded answers
            const extRegex = /🔸 Đáp án mở rộng:(?:.*?<\/span>)?\s*([\s\S]*?)(?:<br>|<\/div>)/g;
            let eMatch;
            while ((eMatch = extRegex.exec(expBlock)) !== null) {
                let text = eMatch[1].trim();
                text = text.replace(/\n\s*/g, ' ');
                if (text.endsWith('.')) text = text.slice(0, -1).trim();
                text.split('/').forEach(t => {
                    if(t.trim()) answers.push(t.trim());
                });
            }
            
            answers = [...new Set(answers)].map(a => `'${a}.'`);
            if (answers.length > 0) {
                newExactAnswersMap[block] = answers;
            }
        }
    });

    blocks.forEach(block => {
        if (newExactAnswersMap[block]) {
            const blockName = block.toUpperCase().replace('-', '');
            const gradeFuncRegex = new RegExp(`function grade${blockName}\\(\\) {[\\s\\S]*?gradeByConfig\\([\\s\\S]*?exactAnswers:\\s*\\[([\\s\\S]*?)\\]`, 'i');
            const match = gradeFuncRegex.exec(content);
            if (match) {
                const oldExactAnswers = match[1];
                const newExactAnswersStr = '\\n                        ' + newExactAnswersMap[block].join(',\\n                        ') + '\\n                    ';
                
                content = content.replace(match[0], match[0].replace(oldExactAnswers, newExactAnswersStr));
                console.log(`Updated ${f} block ${block} with ${newExactAnswersMap[block].length} exact answers.`);
            }
        }
    });
    
    fs.writeFileSync(path.join(dir, f), content);
});
