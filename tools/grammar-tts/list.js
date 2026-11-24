// In ra (JSON) mọi kết quả máy chia sinh từ các từ gợi ý trong grammar-conjugator-rules.js — đầu vào cho gen.py
const path = require('path');
const JS = path.join(__dirname, '..', '..', 'public', 'assets', 'js');
const G = require(path.join(JS, 'grammar-conjugator.js'));
require(path.join(JS, 'grammar-conjugator-rules.js'));
const out = new Set();
for (const rule of Object.values(globalThis.GRAMMAR_CONJ_RULES)) {
    for (const v of rule.variants || [{ forms: rule.forms }]) {
        for (const ex of rule.examples) {
            const [w, p] = ex.split('|');
            const spec = G.formFor(v.forms, w, p);
            if (!spec) continue;
            const r = G.conjugate(w, spec, { pos: p });
            if (r.ok) out.add(r.result.replace(/\s+/g, ' ').trim());
        }
    }
}
process.stdout.write(JSON.stringify([...out]));
