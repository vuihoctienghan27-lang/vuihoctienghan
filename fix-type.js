const fs = require('fs');
const path = require('path');

const directory = 'C:/Users/Minh Hieu/Desktop/TOPIK ED 3/public/reading';

function processFile(filepath) {
    let content = fs.readFileSync(filepath, 'utf-8');
    let modified = false;

    // Inject event dispatch
    const targetLine = "setTimeout(() => { document.addEventListener = ogAddEventListener; }, 500);";
    if (content.includes(targetLine) && !content.includes("typeQuestionsLoaded")) {
        content = content.replace(targetLine, targetLine + "\n                document.dispatchEvent(new Event('typeQuestionsLoaded'));");
        modified = true;
    }

    // Inject script tag
    const headTarget = "</head>";
    const newScriptTag = '    <script src="../../assets/js/type-navigator.js"></script>\n';
    if (content.includes(headTarget) && !content.includes("type-navigator.js")) {
        content = content.replace(headTarget, newScriptTag + headTarget);
        modified = true;
    }

    if (modified) {
        fs.writeFileSync(filepath, content, 'utf-8');
        console.log("Updated " + filepath);
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
