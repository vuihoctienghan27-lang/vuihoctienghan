const fs = require('fs');
const path = require('path');

const dir = './public/writing/topik_ii/';
const files = fs.readdirSync(dir).filter(f => f.startsWith('topik') && f.endsWith('.html'));

const contexts = {
    'topik102.html': [ ['기숙사', '짐'], ['언제', '입주'], ['도움'], ['수', '새', '이동'] ],
    'topik35.html': [ ['물건', '짐'], ['금요일'], ['제', '퍼즐'], ['하나'] ],
    'topik36.html': [ ['금요일'], ['언제', '시간', '다음 주'], ['가난', '사람'], ['기회'] ],
    'topik37.html': [ ['신입', '회원'], ['분', '사람'], ['하나'], ['사람'] ],
    'topik41.html': [ ['저녁', '식사'], ['시간'], ['물', '주'], ['후'] ],
    'topik47.html': [ ['가방', '하나'], ['언제'], ['자주'], ['사용'] ],
    'topik52.html': [ ['노트북'], ['금요일'], ['마음'], ['표정'] ],
    'topik60.html': [ ['물건'], ['어떻게'], ['음악'], ['안정감'] ],
    'topik64.html': [ ['특강'], ['마음'], ['달의'], ['시간'] ],
    'topik83.html': [ ['사람'], ['분'], ['포식자', '천적'], ['다르'] ],
    'topik91.html': [ ['시간'], ['시간', '변경'], ['쇼츠', '영상'], ['영양소', '채소'] ],
    'topik96.html': [ ['이사'], ['어떤'], ['잠'], ['깊이', '자'] ]
};

files.forEach(f => {
    if (!contexts[f]) return;
    let content = fs.readFileSync(path.join(dir, f), 'utf-8');
    const ctxArray = contexts[f];
    let matchIndex = 0;
    
    content = content.replace(/(exactAnswers:\s*\[[\s\S]*?\],)(\s*)(?:context:\s*\[.*?\],\s*)?stems:\s*\[/g, (match, exactBlock, spacing) => {
        if (matchIndex >= 4) return match;
        const ctxList = ctxArray[matchIndex];
        matchIndex++;
        const ctxStr = 'context: [' + ctxList.map(w => `'${w}'`).join(', ') + '],';
        return exactBlock + spacing + ctxStr + spacing + 'stems: [';
    });
    
    fs.writeFileSync(path.join(dir, f), content);
    console.log('Updated ' + f + ' with ' + matchIndex + ' contexts.');
});
