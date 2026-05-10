const fs = require('fs');
const path = require('path');

const baseDir = path.join(__dirname, 'reading');

function walk(dir, done) {
    let results = [];
    fs.readdir(dir, function(err, list) {
        if (err) return done(err);
        let i = 0;
        (function next() {
            let file = list[i++];
            if (!file) return done(null, results);
            file = path.resolve(dir, file);
            fs.stat(file, function(err, stat) {
                if (stat && stat.isDirectory()) {
                    walk(file, function(err, res) {
                        results = results.concat(res);
                        next();
                    });
                } else {
                    if (file.endsWith('.html')) results.push(file);
                    next();
                }
            });
        })();
    });
}

walk(baseDir, function(err, files) {
    if (err) throw err;
    let modified = 0;
    files.forEach(file => {
        let content = fs.readFileSync(file, 'utf8');
        let newContent = content
            .replace(/src="\.\.\/\.\.\/assets\/js\/examreadingI\.js"/g, 'src="../../assets/js/exam.js"')
            .replace(/src="\.\.\/assets\/js\/examreadingI\.js"/g, 'src="../assets/js/exam.js"');
        
        if (content !== newContent) {
            fs.writeFileSync(file, newContent, 'utf8');
            modified++;
        }
    });
    console.log('Successfully updated exam.js references in ' + modified + ' files.');
});
