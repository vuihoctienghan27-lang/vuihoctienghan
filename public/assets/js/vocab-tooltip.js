/* ==========================================================================
   VOCAB-TOOLTIP.JS — Hệ thống Popup Tra Từ Thông Minh (Tích hợp SweetAlert2)
   ========================================================================== */

let uid = null;
window.userVocabLists = ['Đã lưu'];
window.savedVocabSet = new Set();

function speakText(text) {
    if (!text || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'ko-KR'; u.rate = 0.85;
    window.speechSynthesis.speak(u);
}

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if (typeof firebase !== 'undefined' && firebase.auth) {
            firebase.auth().onAuthStateChanged(user => {
                if (user && firebase.firestore) {
                    uid = user.uid;
                    const db = firebase.firestore();

                    db.collection('users').doc(uid).onSnapshot(doc => {
                        if (doc.exists) {
                            let data = doc.data();
                            let lists = data.vocabLists || [];
                            if (lists.includes('Mặc định')) lists[lists.indexOf('Mặc định')] = 'Đã lưu';
                            if (!lists.includes('Đã lưu')) lists.unshift('Đã lưu');
                            window.userVocabLists = lists;
                        } else {
                            window.userVocabLists = ['Đã lưu'];
                        }
                    });

                    db.collection('users').doc(uid).collection('vocabulary').onSnapshot(snap => {
                        window.savedVocabSet.clear();
                        snap.forEach(d => window.savedVocabSet.add(d.id));
                    });
                } else {
                    window.savedVocabSet.clear();
                    uid = null;
                }
            });
        }
    }, 500);
});

document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('mypage.html')) return;

    const tooltip = document.createElement('div');
    tooltip.id = 'smart-vocab-tooltip';
    tooltip.style.cssText = `
        display: none; position: absolute; z-index: 10000; background: #ffffff; border: 1px solid #e2e8f0;
        border-radius: 12px; padding: 15px; width: max-content; min-width: 220px; max-width: 320px;
        box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1); font-family: 'Pretendard', sans-serif;
    `;
    document.body.appendChild(tooltip);
    let hideTimeout;

    const svgSpk = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>`;
    const svgSv = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#cbd5e1" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>`;
    const svgSvd = `<svg viewBox="0 0 24 24" width="20" height="20" fill="#f59e0b" stroke="#f59e0b" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>`;
    const svgBook = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#2563eb" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>`;

    function showTooltip(span) {
        clearTimeout(hideTimeout);
        const base = span.getAttribute('data-base') || span.innerText.trim();
        const mean = span.getAttribute('data-meaning') || 'Chưa có nghĩa';
        const isSaved = window.savedVocabSet && window.savedVocabSet.has(base);

        let examples = [];
        const exRaw = span.getAttribute('data-examples');
        if (exRaw) {
            try { examples = JSON.parse(decodeURIComponent(exRaw)); } catch (e) { }
        }
        // Luôn cố gắng tra từ điển nếu chưa có examples
        // Tìm kiếm rộng: khớp cả base lẫn bất kỳ variant nào trong bảng từ điển
        if ((!examples || examples.length === 0) && window.AutoVocabDict) {
            const rawWord = span.innerText.trim();
            const dataBase = base; // data-base attribute
            const pItem = window.AutoVocabDict.find(d => {
                if (d.base === dataBase || d.base === rawWord) return true;
                if (d.variants && (d.variants.includes(dataBase) || d.variants.includes(rawWord))) return true;
                return false;
            });
            if (pItem && pItem.examples) examples = pItem.examples;
        }

        const hasEx = examples && examples.length > 0;

        const renderDefaultTooltip = () => {
            tooltip.innerHTML = `
                <div style="display:flex;justify-content:space-between;border-bottom:1px solid #e2e8f0;padding-bottom:8px;margin-bottom:8px;align-items:center;">
                    <strong style="font-size:1.3em;color:#2563eb;line-height:1;">${base}</strong>
                    <div style="display:flex;gap:8px;">
                        <button class="flat-icon-btn ex-btn" style="padding:6px;width:auto;border:none;background:#eff6ff;border-radius:6px;cursor:pointer;opacity:1;" title="Xem ví dụ TOPIK">${svgBook}</button>
                        <button class="flat-icon-btn" style="padding:6px;width:auto;border:none;background:#f8fafc;border-radius:6px;cursor:pointer;color:#475569;" title="Nghe phát âm" onclick="speakText('${base}')">${svgSpk}</button>
                        <button class="flat-icon-btn save-btn" style="padding:6px;width:auto;border:none;background:#f8fafc;border-radius:6px;cursor:pointer;" title="Lưu từ vựng" data-w="${base}" data-m="${mean.replace(/"/g, '&quot;')}">${isSaved ? svgSvd : svgSv}</button>
                    </div>
                </div>
                <div style="font-weight:500; color:#334155; font-size:1.05em; line-height:1.4;">${mean}</div>`;

            const exBtn = tooltip.querySelector('.ex-btn');
            if (exBtn) {
                exBtn.onclick = async function (evt) {
                    evt.stopPropagation();
                    tooltip.style.display = 'none';

                    // Nếu VocabExternal chưa tải → fallback sang data cục bộ
                    if (typeof window.VocabExternal === 'undefined') {
                        _showExamplesModal(base, mean, examples);
                        return;
                    }

                    // Kiểm tra có API key chưa
                    if (!window.VocabExternal.getKey()) {
                        window.VocabExternal.promptForKey(() => {
                            // Gọi lại sau khi người dùng nhập key
                            exBtn.onclick(evt);
                        });
                        return;
                    }

                    // Hiển thị loading
                    if (typeof Swal !== 'undefined') {
                        Swal.fire({
                            title: `📖 Đang tra cứu <b>${base}</b>...`,
                            html: '<div style="color:#64748b;font-size:0.95em;">Đang tải ví dụ & dịch sang tiếng Việt...<br><small>(tối đa ~10 giây)</small></div>',
                            allowOutsideClick: true,
                            showCloseButton: true,
                            didOpen: () => Swal.showLoading()
                        });
                    }

                    const rawWord = span.innerText.trim();
                    let result;
                    try {
                        result = await window.VocabExternal.fetchExamples(base, rawWord);
                    } catch (e) {
                        result = { status: 'error', message: e.message };
                    } finally {
                        Swal.close();
                    }

                    if (result.status === 'ok') {
                        // Có ví dụ từ KRDict
                        let exHTML = '<div style="text-align:left;font-size:1em;line-height:1.7;color:#334155;margin-top:12px;">';
                        result.examples.forEach((ex, i) => {
                            const highlight = ex.ko.replace(new RegExp(base + '|' + rawWord, 'g'),
                                m => `<span style="color:#2563eb;font-weight:bold;">${m}</span>`);
                            exHTML += `
                                <div style="margin-bottom:16px;padding-bottom:14px;border-bottom:1px dashed #e2e8f0;">
                                    <div style="font-size:1.05em;">${i + 1}. ${highlight}</div>
                                    ${ex.vi ? `<div style="color:#10b981;font-size:0.92em;margin-top:4px;padding-left:16px;">→ ${ex.vi}</div>` : ''}
                                </div>`;
                        });
                        exHTML += '</div>';
                        Swal.fire({
                            title: `<div style="color:#2563eb;font-size:1.3em;">📖 ${base}</div><div style="font-size:0.65em;color:#64748b;font-weight:normal;margin-top:4px;">${mean} &nbsp;|&nbsp;</div>`,
                            html: exHTML,
                            width: 600,
                            confirmButtonColor: '#2563eb',
                            confirmButtonText: 'Đóng'
                        });
                    } else if (result.status === 'not_found' && examples.length > 0) {
                        // Không tìm thấy trên KRDict → dùng ví dụ nội bộ
                        _showExamplesModal(base, mean, examples);
                    } else if (result.status === 'not_found') {
                        Swal.fire({ title: 'Không tìm thấy', text: `Không có dữ liệu cho từ "${base}".`, icon: 'info', confirmButtonColor: '#2563eb' });
                    } else {
                        Swal.fire({ title: 'Lỗi kết nối', text: 'Không thể kết nối. Kiểm tra API key hoặc mạng.', icon: 'error', confirmButtonColor: '#e53e3e' });
                    }
                };
            }

            // Helper: hiển thị ví dụ từ local dictionary (fallback)
            function _showExamplesModal(base, mean, examples) {
                if (!examples || examples.length === 0) return;
                let exHTML = '<div style="text-align:left;font-size:1.05em;line-height:1.7;color:#334155;margin-top:12px;">';
                examples.forEach((e, i) => {
                    const text = typeof e === 'object' ? (e.ko || '') : e;
                    const vi = typeof e === 'object' ? (e.vi || '') : '';
                    const highlight = text.replace(new RegExp(base, 'g'), m => `<span style="color:#2563eb;font-weight:bold;">${m}</span>`);
                    exHTML += `<div style="margin-bottom:15px;padding-bottom:10px;border-bottom:1px dashed #e2e8f0;"><b>${i + 1}.</b> ${highlight}${vi ? `<div style="color:#10b981;font-size:0.9em;margin-top:3px;padding-left:14px;">→ ${vi}</div>` : ''}</div>`;
                });
                exHTML += '</div>';
                if (typeof Swal !== 'undefined') {
                    Swal.fire({
                        title: `<div style="color:#2563eb;font-size:1.3em;">📖 ${base}</div><div style="font-size:0.65em;color:#64748b;font-weight:normal;margin-top:4px;">${mean}</div>`,
                        html: exHTML, width: 600, confirmButtonColor: '#2563eb', confirmButtonText: 'Đóng'
                    });
                }
            }

            const sBtn = tooltip.querySelector('.save-btn');
            if (sBtn) {
                sBtn.onclick = async function (evt) {
                    evt.stopPropagation();
                    const cu = typeof firebase !== 'undefined' ? firebase.auth().currentUser : null;
                    if (!cu) {
                        if (typeof Swal !== 'undefined') {
                            Swal.fire({icon: 'warning', title: 'Yêu cầu đăng nhập', text: 'Vui lòng đăng nhập để lưu từ vựng!', confirmButtonColor: '#2563eb'});
                        } else {
                            alert("Vui lòng đăng nhập để lưu từ vựng!");
                        }
                        return;
                    }
                    const db = firebase.firestore();

                    if (window.savedVocabSet.has(base)) {
                        this.innerHTML = '⏳';
                        window.savedVocabSet.delete(base);
                        await db.collection('users').doc(cu.uid).collection('vocabulary').doc(base).delete();
                        this.innerHTML = svgSv;
                    } else {
                        if (window.userVocabLists && window.userVocabLists.length > 1) {
                            let listBtns = window.userVocabLists.map(l => `<button class="folder-list-btn" data-list="${l}" style="width: 100%; text-align: left; padding: 8px 12px; border: none; background: #f8fafc; border-radius: 6px; margin-bottom: 5px; cursor: pointer; font-weight: 600; color: #1e293b; transition: 0.2s;">📁 ${l}</button>`).join('');
                            tooltip.innerHTML = `
                                <div style="font-size:0.95em; font-weight:700; color:#64748b; margin-bottom:10px;">Lưu "${base}" vào:</div>
                                <div style="max-height: 150px; overflow-y: auto;">${listBtns}</div>
                            `;

                            tooltip.querySelectorAll('.folder-list-btn').forEach(btn => {
                                btn.onmouseenter = function () { this.style.background = '#e0f2fe'; this.style.color = '#2563eb'; };
                                btn.onmouseleave = function () { this.style.background = '#f8fafc'; this.style.color = '#1e293b'; };
                                btn.onclick = async function (e) {
                                    e.stopPropagation();
                                    const selectedList = this.getAttribute('data-list');
                                    tooltip.innerHTML = `<div style="text-align:center; padding:15px 10px; font-size:1.1em; font-weight:bold; color:#10b981;">Đã lưu vào ${selectedList}!</div>`;
                                    await db.collection('users').doc(cu.uid).collection('vocabulary').doc(base).set({
                                        word: base, meaning: mean, listName: selectedList, status: 0, savedAt: firebase.firestore.FieldValue.serverTimestamp()
                                    });
                                    window.savedVocabSet.add(base);
                                    setTimeout(() => { tooltip.style.display = 'none'; }, 1000);
                                };
                            });
                        } else {
                            this.innerHTML = '⏳';
                            window.savedVocabSet.add(base);
                            await db.collection('users').doc(cu.uid).collection('vocabulary').doc(base).set({
                                word: base, meaning: mean, listName: 'Đã lưu', status: 0, savedAt: firebase.firestore.FieldValue.serverTimestamp()
                            });
                            this.innerHTML = svgSvd;
                        }
                    }
                };
            }
        };

        renderDefaultTooltip();
        tooltip.style.display = 'block';
        const r = span.getBoundingClientRect();
        let topPos = r.bottom + window.scrollY + 10;
        let leftPos = r.left + window.scrollX;
        if (leftPos + tooltip.offsetWidth > window.innerWidth) leftPos = window.innerWidth - tooltip.offsetWidth - 20;
        tooltip.style.left = leftPos + 'px';
        tooltip.style.top = topPos + 'px';
    }

    let lastTouchTime = 0;

    // Hàm gắn sự kiện — dùng lại cho cả từ bọc tĩnh lẫn từ autowrap
    window.attachVocabTooltips = function () {
        document.querySelectorAll('.vocab-word').forEach(span => {
            if (span._vocabBound) return; // Tránh gắn 2 lần
            span._vocabBound = true;

            span.addEventListener('touchstart', () => { lastTouchTime = Date.now(); }, { passive: true });
            span.addEventListener('mouseenter', () => showTooltip(span));
            span.addEventListener('mouseleave', () => {
                // Bỏ qua mouseleave trong 600ms sau touch (fix lỗi mobile popup tắt ngay)
                if (Date.now() - lastTouchTime < 600) return;
                hideTimeout = setTimeout(() => { tooltip.style.display = 'none'; }, 250);
            });
            span.addEventListener('click', (e) => { e.stopPropagation(); lastTouchTime = Date.now(); showTooltip(span); });
        });
    };

    window.attachVocabTooltips(); // Gắn ngay lần đầu

    tooltip.addEventListener('mouseenter', () => clearTimeout(hideTimeout));
    tooltip.addEventListener('mouseleave', () => { hideTimeout = setTimeout(() => { tooltip.style.display = 'none'; }, 250); });
    tooltip.addEventListener('touchstart', (e) => { e.stopPropagation(); lastTouchTime = Date.now(); clearTimeout(hideTimeout); }, { passive: true });
    document.addEventListener('click', (e) => {
        if (!tooltip.contains(e.target) && !e.target.classList.contains('vocab-word')) tooltip.style.display = 'none';
    });
});