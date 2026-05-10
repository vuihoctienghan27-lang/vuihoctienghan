const fs = require('fs');
const path = require('path');
const https = require('https');

const baseDir = path.join(__dirname, 'reading');
const baseUrl = 'https://vuihoctienghan2027.web.app/reading';

let successCount = 0;
let failCount = 0;
let pending = 0;

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

function downloadFile(localPath, relPath) {
    const url = baseUrl + '/' + relPath.replace(/\\/g, '/');
    pending++;
    https.get(url, (res) => {
        if (res.statusCode !== 200) {
            console.error('Failed: ' + relPath + ' (' + res.statusCode + ')');
            failCount++;
            checkDone();
            return;
        }
        
        let file = fs.createWriteStream(localPath);
        res.pipe(file);
        
        file.on('finish', () => {
            file.close();
            console.log('Restored: ' + relPath);
            successCount++;
            checkDone();
        });
    }).on('error', (err) => {
        console.error('Error on ' + relPath + ': ' + err.message);
        failCount++;
        checkDone();
    });
}

function checkDone() {
    pending--;
    if (pending === 0) {
        console.log('\nRestore complete. Success: ' + successCount + ', Failed: ' + failCount);
    }
}

walk(baseDir, function(err, files) {
    if (err) throw err;
    console.log('Found ' + files.length + ' html files. Starting download...');
    files.forEach(file => {
        const relPath = path.relative(baseDir, file);
        downloadFile(file, relPath);
    });
});
