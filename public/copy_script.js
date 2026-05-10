const fs = require('fs');
const content = fs.readFileSync('index.html', 'utf8');
const newContent = content.replace(/(href|src)="((?!http|mailto|tel)[^"]+)"/g, (match, attr, path) => {
    if (path.startsWith('../') || path.startsWith('/') || path.startsWith('#')) return match;
    return `${attr}="../${path}"`;
});
fs.mkdirSync('home', {recursive: true});
['reading.html', 'listening.html', 'writing.html', 'grammar.html'].forEach(f => {
    fs.writeFileSync('home/' + f, newContent);
});
console.log('Done copying files');
