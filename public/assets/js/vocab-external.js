/* ==========================================================================
   VOCAB-EXTERNAL.JS — Từ điển Hai Chiều Hàn↔Việt
   Hàn → Việt : Naver Korean-Vietnamese (dict.naver.com/api3/kovi)
   Việt → Hàn : Naver Vietnamese-Korean (dict.naver.com/api3/viko)
   Dự phòng  : KRDict + Google Translate (nếu Naver kông tìm được)
   CORS      : Phát song song nhiều proxy, lấy cái phản hồi đầu tiên.
   ========================================================================== */
(function () {
    'use strict';

    const KRDICT_BASE  = 'https://krdict.korean.go.kr/api/search';
    const NAVER_KOVI   = 'https://dict.naver.com/api3/kovi/search'; // Hàn→Việt
    const NAVER_VIKO   = 'https://dict.naver.com/api3/viko/search'; // Việt→Hàn
    const NUM_RESULTS  = 10;

    window.VocabExternal = {

        // ─── Pool API key (mỗi key giới hạn 50,000 req/ngày → N key = N×50K) ───
        // Thêm key mới vào mảng bên dưới để tăng dung lượng
        _KEY_POOL: [
            'A4104D11D0DBA65D52E5CDA4C563C27C',
            'C4C44539674AC4FED98820F87DA47AED',
            'AB7CE4EF686B36D7A152CA3944AF5302',
        ],

        getKey() {
            // Ưu tiên key người dùng tự nhập (nếu có), ngược lại lấy ngẫu nhiên từ pool
            const custom = localStorage.getItem('krdict_api_key');
            if (custom) return custom;
            const pool = this._KEY_POOL.filter(k => k && k.length > 0);
            return pool[Math.floor(Math.random() * pool.length)] || '';
        },

        // ─── Hàn → Việt Search (Sử dụng API ẩn danh số 1) ───
        async _naverKoViSearch(word) {
            try {
                const url = `${NAVER_KOVI}?query=${encodeURIComponent(word)}&range=entry&page=1&count=3&sort=relevant&scope=all`;
                const data = await this._fetchJSON(url, 12000);
                if (!data) return null;

                const items = data?.searchResultMap?.searchResultListMap?.WORD?.items
                           || data?.searchResultMap?.searchResultListMap?.IDIOM?.items
                           || [];
                if (!items.length) return null;

                const item     = items[0];
                const wordText = item?.wordInfo?.entry || item?.wordInfo?.word || word;
                const pos      = item?.wordInfo?.pos   || item?.wordInfo?.partOfSpeech || '';

                const meansArr  = item?.meansCollector?.[0]?.means || [];
                const viMeaning = meansArr.map(m => m.value || m.meaning || '').filter(Boolean).slice(0, 3).join('; ');

                const rawExamples = item?.exampleCollector?.examples || item?.examplCollector?.examples || [];
                const examples = rawExamples.slice(0, 3)
                    .map(ex => ({ ko: ex.example || ex.kor || ex.text || '', vi: ex.translation || ex.vie || ex.transText || '' }))
                    .filter(ex => ex.ko);

                if (!viMeaning && !examples.length) return null;
                console.log('[Từ điển] Có kết quả:', wordText, '→', viMeaning);
                return { word: wordText, pos, viMeaning, examples };
            } catch (e) {
                console.warn('[Từ điển] Nguồn 1 lỗi kết nối:', e.message);
                return null;
            }
        },

        // ─── Entry point gọi từ tooltip (Thử Nguồn 1 -> Fallback Nguồn 2) ───
        async fetchExamples(base, rawWord) {
            try {
                // Thử Naver trước
                const naverRes = await this._naverKoViSearch(base);
                if (naverRes && naverRes.examples.length > 0) {
                    // Naver đã có tiếng Việt, không cần Google Translate
                    return { status: 'ok', examples: naverRes.examples };
                }

                // Fallback: KRDict
                const key = this.getKey();
                if (!key) return { status: 'no_key' };

                let result = await this._krdictSearch(base, key);
                if ((!result || result.length === 0) && rawWord && rawWord !== base) {
                    result = await this._krdictSearch(rawWord, key);
                }
                if (!result || result.length === 0) return { status: 'not_found' };

                const translated = await Promise.all(result.slice(0, 3).map(async ex => {
                    if (!ex.vi && ex.ko) ex.vi = await this._translate(ex.ko);
                    return ex;
                }));
                return { status: 'ok', examples: translated };
            } catch (e) {
                console.error('VocabExternal.fetchExamples error:', e);
                return { status: 'error', message: e.message };
            }
        },

        // ─── Helper: fetch với timeout ───
        _fetchWithTimeout(url, options = {}, ms = 8000) {
            return Promise.race([
                fetch(url, options),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), ms))
            ]);
        },

        // ─── Bước 1: Tìm target_code ─── Bước 2: Gọi View API để lấy ví dụ ───
        async _krdictSearch(word, key) {
            // Step 1: search để lấy target_code
            const searchUrl = `${KRDICT_BASE}?key=${key}&q=${encodeURIComponent(word)}&part=word&method=exact&num=${NUM_RESULTS}`;
            let searchXml = await this._fetchText(searchUrl);
            if (!searchXml) throw new Error('Dịch vụ từ điển tạm thời quá tải.');

            const parser = new DOMParser();
            const searchDoc = parser.parseFromString(searchXml, 'text/xml');
            const errTag = searchDoc.querySelector('error');
            if (errTag) throw new Error("Chưa tìm thấy hệ thống");

            // Lấy target_code của từ khớp nhất
            let targetCode = null;
            const items = searchDoc.querySelectorAll('item');
            items.forEach(item => {
                const w = item.querySelector('word')?.textContent?.trim();
                if (!targetCode && w && (w === word || w.includes(word))) {
                    targetCode = item.querySelector('target_code')?.textContent?.trim();
                }
            });
            if (!targetCode && items.length > 0) {
                targetCode = items[0].querySelector('target_code')?.textContent?.trim();
            }
            if (!targetCode) return [];

            console.log('[Từ điển] target:', targetCode);

            // Step 2: Gọi View API để lấy chi tiết + ví dụ
            const viewUrl = `https://krdict.korean.go.kr/api/view?key=${key}&q=${targetCode}&method=target_code`;
            const viewXml = await this._fetchText(viewUrl);
            if (!viewXml) return [];

            return this._parseViewXML(viewXml);
        },

        // ─── Fetch text: song song tất cả proxy, lấy cái nào thành công trước ───
        async _fetchText(url, timeoutMs = 15000) {
            const enc = encodeURIComponent(url);

            // Hàm thử 1 URL, resolve với text nếu OK, reject nếu fail
            const tryFetch = (fetchUrl, opts = {}) =>
                this._fetchWithTimeout(fetchUrl, opts, timeoutMs)
                    .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); })
                    .then(t => { if (!t || !t.trim()) throw new Error('empty'); return t; });

            const tryFetchJson = (fetchUrl) =>
                this._fetchWithTimeout(fetchUrl, {}, timeoutMs)
                    .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
                    .then(j => { if (!j?.contents) throw new Error('no contents'); return j.contents; });

            const candidates = [
                tryFetch(url, { mode: 'cors' }),
                tryFetch(`https://api.allorigins.win/raw?url=${enc}`),
                tryFetchJson(`https://api.allorigins.win/get?url=${enc}`),
                tryFetch(`https://corsproxy.io/?${enc}`)
            ];

            try {
                const result = await Promise.any(candidates);
                console.log('[Fetch] Text OK');
                return result;
            } catch (e) {
                console.warn('[Fetch] Text Fail');
                return null;
            }
        },

        // ─── Fetch JSON: giống _fetchText nhưng chỉ resolve khi response là JSON hợp lệ ───
        // Proxy error pages (HTML DOCTYPE) sẽ bị reject — không lắm vào JSON.parse
        async _fetchJSON(url, timeoutMs = 15000) {
            const enc = encodeURIComponent(url);

            const tryJSON = (fetchUrl, opts = {}) =>
                this._fetchWithTimeout(fetchUrl, opts, timeoutMs)
                    .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); })
                    .then(t => {
                        const s = (t || '').trim();
                        if (!s.startsWith('{') && !s.startsWith('[')) throw new Error('not JSON');
                        return JSON.parse(s);   // throw nếu JSON không hợp lệ
                    });

            const tryJSONFromMeta = (fetchUrl) =>
                this._fetchWithTimeout(fetchUrl, {}, timeoutMs)
                    .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
                    .then(j => {
                        const s = (j?.contents || '').trim();
                        if (!s.startsWith('{') && !s.startsWith('[')) throw new Error('not JSON in contents');
                        return JSON.parse(s);
                    });

            const candidates = [
                tryJSON(url, { mode: 'cors' }),
                tryJSON(`https://api.allorigins.win/raw?url=${enc}`),
                tryJSONFromMeta(`https://api.allorigins.win/get?url=${enc}`),
                tryJSON(`https://corsproxy.io/?${enc}`)
            ];

            try {
                const result = await Promise.any(candidates);
                console.log('[Fetch] JSON OK');
                return result;
            } catch (e) {
                console.warn('[Fetch] JSON Fail');
                return null;
            }
        },


        // ─── Phân tích View API XML ───
        _parseViewXML(text) {
            const parser = new DOMParser();
            const xml = parser.parseFromString(text, 'text/xml');
            console.log('[Từ điển] Data load success', text.length);

            // Dùng getElementsByTagName vì querySelectorAll không ổn trong XML mode
            const errTags = xml.getElementsByTagName('error');
            if (errTags.length > 0) throw new Error(errTags[0].textContent.trim());

            const allExInfos = Array.from(xml.getElementsByTagName('example_info'));
            console.log('[KRDict] example_info count:', allExInfos.length);

            const sentences = []; // type=문장 (full sentence)
            const phrases   = []; // type=구 (short phrase)
            const seen = new Set();

            allExInfos.forEach(exInfo => {
                const typeEl = exInfo.getElementsByTagName('type')[0];
                const exEl   = exInfo.getElementsByTagName('example')[0];
                const type   = typeEl?.textContent?.trim() || '';
                const ex     = exEl?.textContent?.trim()   || '';

                if (!ex || seen.has(ex)) return;
                seen.add(ex);

                if (type === '문장') sentences.push({ ko: ex, vi: '' });
                else                phrases.push({ ko: ex, vi: '' });
            });

            console.log('[Từ điển] loaded counts:', sentences.length, phrases.length);

            // Ưu tiên câu đầy đủ (문장), fallback sang cụm từ (구)
            const result = sentences.length > 0 ? sentences : phrases;
            return result.slice(0, 5);
        },

        // ─── Dịch với cặp ngôn ngữ tùy biến (mặc định ko→vi) ───
        async _translateLang(text, sl = 'ko', tl = 'vi') {
            if (!text || !text.trim()) return '';
            try {
                // Google Translate unofficial endpoint
                const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sl}&tl=${tl}&dt=t&q=${encodeURIComponent(text)}`;
                const resp = await fetch(url);
                if (!resp.ok) throw new Error('Google Translate HTTP ' + resp.status);
                const data = await resp.json();
                const translated = data[0]?.map(seg => seg[0]).filter(Boolean).join('') || '';
                if (translated) return translated;
            } catch (e) {
                // hide error
            }
            // Fallback: MyMemory
            try {
                const url  = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${sl}|${tl}`;
                const resp = await fetch(url);
                const data = await resp.json();
                return data.responseData?.translatedText || '';
            } catch (_) {
                return '';
            }
        },

        // ─── Tương thích ngược: Dịch Hàn → Việt ───
        async _translate(text) {
            return this._translateLang(text, 'ko', 'vi');
        },


        // ─── Hiển thị hộp thoại nhập API key ───
        promptForKey(onSuccess) {
            if (typeof Swal === 'undefined') {
                const key = prompt('Nhập API Key KRDict (miễn phí tại krdict.korean.go.kr):');
                if (key && key.trim()) {
                    localStorage.setItem('krdict_api_key', key.trim());
                    if (onSuccess) onSuccess();
                }
                return;
            }

            Swal.fire({
                title: '🔑 Kết nối từ điển KRDict',
                html: `
                    <div style="text-align:left;font-size:0.95em;color:#475569;line-height:1.7;">
                        <p>Để tra ví dụ chuẩn TOPIK trực tiếp từ <b>Viện Quốc Ngữ Hàn Quốc</b>, bạn cần 1 API key miễn phí.</p>
                        <p><b>Đăng ký nhanh (miễn phí, ~2 phút):</b></p>
                        <ol style="padding-left:18px;">
                            <li>Truy cập trang đăng ký:<br>
                                <a href="https://krdict.korean.go.kr/openApi/openApiRegister" target="_blank" style="color:#2563eb;font-weight:700;">🔗 krdict.korean.go.kr/openApi/openApiRegister</a>
                            </li>
                            <li>Nhập email → Nhận API Key qua email</li>
                            <li>Dán key vào bên dưới</li>
                        </ol>
                    </div>
                    <input id="swal-krdict-key" type="text" placeholder="Dán API Key vào đây..."
                           style="width:100%;padding:10px 14px;border:1.5px solid #e2e8f0;border-radius:10px;
                                  font-size:1em;margin-top:12px;box-sizing:border-box;outline:none;"
                           onfocus="this.style.borderColor='#2563eb'" onblur="this.style.borderColor='#e2e8f0'">
                `,
                confirmButtonText: '💾 Lưu & Tra cứu',
                confirmButtonColor: '#2563eb',
                showCancelButton: true,
                cancelButtonText: 'Để sau',
                preConfirm: () => {
                    const key = document.getElementById('swal-krdict-key').value.trim();
                    if (!key) { Swal.showValidationMessage('⚠️ Vui lòng nhập API key!'); return false; }
                    return key;
                }
            }).then(result => {
                if (result.isConfirmed && result.value) {
                    localStorage.setItem('krdict_api_key', result.value);
                    if (onSuccess) onSuccess();
                }
            });
        }
    };
})();
