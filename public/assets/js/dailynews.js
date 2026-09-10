var dnArticles = [];
var dnHotArticles = [];
var dnIsAdmin = false;
var dnSearchKeyword = '';
var dnSearchDate = '';
var dnSearchTopic = '';
var dnCurrentPage = 0;
var dnPageSize = 9;

function updatePageSize() {
    dnPageSize = window.innerWidth >= 769 ? 9 : 6;
}

var DN_TOPICS = ['Kinh tế','Xã hội','Văn hóa','Khoa học - Công nghệ','Giải trí','Thể thao','Giáo dục','Sức khỏe','Du lịch','Ẩm thực','Chính trị','Môi trường','Pháp luật','Quốc tế','Đời sống'];

window.toggleGlobalVocab = function() {
    document.body.classList.toggle('vocab-disabled');
    localStorage.setItem('vocabEnabled', !document.body.classList.contains('vocab-disabled'));
};

// =============================
// Word lookup popup (global, called from inline ondblclick)
// =============================
window._dnLookupOverlay = null;
window.dnCloseLookup = function() {
    if (window._dnLookupOverlay) { window._dnLookupOverlay.remove(); window._dnLookupOverlay = null; }
};
// =============================
// Word lookup popup using 49K dictionary
// =============================
window._dnLookupWord = function(text) {
    var word = text.replace(/^[^\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F]+/, '')
                   .replace(/[^\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F]+$/, '')
                   .trim();
    if (!word) return;

    var q = word.toLowerCase();
    var entry = null;
    if (window.AutoVocabDict) {
        for (var j = 0; j < window.AutoVocabDict.length; j++) {
            var e = window.AutoVocabDict[j];
            if (e.base.toLowerCase() === q) { entry = e; break; }
            if (e.variants) {
                for (var k = 0; k < e.variants.length; k++) {
                    if (e.variants[k].toLowerCase() === q) { entry = e; break; }
                }
                if (entry) break;
            }
        }
    }
    if (!entry) {
        var endings = ['하다','되다','시키다','스럽다','롭다','지다','나다','들다','보다','주다','오다','가다','받다','내다','쓰다'];
        for (var e2 = 0; e2 < endings.length && !entry; e2++) {
            if (q.endsWith(endings[e2]) && q.length > endings[e2].length) {
                var stem = q.slice(0, -endings[e2].length);
                for (var j2 = 0; j2 < (window.AutoVocabDict||[]).length; j2++) {
                    if (window.AutoVocabDict[j2].base.toLowerCase() === stem + '다') { entry = window.AutoVocabDict[j2]; break; }
                }
            }
        }
    }

    if (!entry) return;

    window.dnCloseLookup();
    var overlay = document.createElement('div');
    window._dnLookupOverlay = overlay;
    overlay.style.cssText = 'position:fixed;inset:0;z-index:999999;background:rgba(0,0,0,0.2);display:flex;align-items:center;justify-content:center;';
    overlay.onclick = window.dnCloseLookup;

    var popup = document.createElement('div');
    popup.style.cssText = 'width:420px;max-width:94vw;background:#fff;border-radius:16px;box-shadow:0 20px 60px rgba(0,0,0,0.35);padding:24px 20px 20px;font-family:Pretendard,Inter,sans-serif;text-align:left;position:relative;';
    popup.onclick = function(ev) { ev.stopPropagation(); };

    var h = '<div style="font-size:1.3em;font-weight:800;color:#2563eb;margin-bottom:8px;padding-right:56px;">' + entry.base + '</div>';
    h += '<div style="font-size:1.1em;color:#1e293b;font-weight:500;margin-bottom:4px;">🇻🇳 ' + (entry.meaning || '') + '</div>';

    if (entry.examples && entry.examples.length) {
        h += '<div style="text-align:left;margin-top:12px;border-top:1px solid #e2e8f0;padding-top:10px;">';
        h += '<small style="color:#94a3b8;font-weight:600;">VÍ DỤ</small>';
        for (var x = 0; x < Math.min(entry.examples.length, 4); x++) {
            var ex = typeof entry.examples[x] === 'string' ? entry.examples[x] : (entry.examples[x].ko || '');
            h += '<div style="margin-top:6px;padding:8px 12px;background:#f8fafc;border-radius:8px;font-size:0.9em;color:#334155;line-height:1.5;">' + ex + '</div>';
        }
        h += '</div>';
    }
    popup.innerHTML = h;

    var cb = document.createElement('button');
    cb.innerHTML = '×'; cb.style.cssText = 'position:absolute;top:8px;right:12px;background:none;border:none;font-size:1.5em;cursor:pointer;color:#94a3b8;line-height:1;';
    cb.onclick = window.dnCloseLookup; popup.appendChild(cb);

    var sb = document.createElement('button');
    sb.innerHTML = '🔊'; sb.style.cssText = 'position:absolute;top:12px;right:44px;background:none;border:none;font-size:1.2em;cursor:pointer;';
    sb.onclick = function(ev) { ev.stopPropagation(); if ('speechSynthesis' in window) { window.speechSynthesis.cancel(); var u = new SpeechSynthesisUtterance(entry.base); u.lang = 'ko-KR'; u.rate = 0.85; window.speechSynthesis.speak(u); } };
    popup.appendChild(sb);

    overlay.appendChild(popup);
    document.body.appendChild(overlay);
};

window.dnLookupSelectedWord = function() {
    var sel = window.getSelection();
    if (!sel) return;
    var text = sel.toString().trim();
    if (!text || text.length > 20) return;

    // Korean check
    var hasKorean = false;
    for (var i = 0; i < text.length; i++) {
        var c = text.charCodeAt(i);
        if ((c >= 0xAC00 && c <= 0xD7AF) || (c >= 0x1100 && c <= 0x11FF) || (c >= 0x3130 && c <= 0x318F)) {
            hasKorean = true; break;
        }
    }
    if (!hasKorean) return;

    // Clean
    var word = text.replace(/^[^\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F]+/, '')
                   .replace(/[^\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F]+$/, '')
                   .trim();
    if (!word) return;

    // Lookup
    var q = word.toLowerCase();
    var entry = null;
    if (window.AutoVocabDict) {
        for (var j = 0; j < window.AutoVocabDict.length; j++) {
            var e = window.AutoVocabDict[j];
            if (e.base.toLowerCase() === q) { entry = e; break; }
            if (e.variants) {
                for (var k = 0; k < e.variants.length; k++) {
                    if (e.variants[k].toLowerCase() === q) { entry = e; break; }
                }
                if (entry) break;
            }
        }
    }
    if (!entry) {
        // fuzzy: try stem+다
        var endings = ['하다','되다','시키다','스럽다','롭다','지다','나다','들다','보다','주다','오다','가다','받다','내다','쓰다'];
        for (var e2 = 0; e2 < endings.length && !entry; e2++) {
            if (q.endsWith(endings[e2]) && q.length > endings[e2].length) {
                var stem = q.slice(0, -endings[e2].length);
                for (var j2 = 0; j2 < (window.AutoVocabDict||[]).length; j2++) {
                    if (window.AutoVocabDict[j2].base.toLowerCase() === stem + '다') { entry = window.AutoVocabDict[j2]; break; }
                }
            }
        }
    }
    if (!entry) return;

    // Show popup
    window.dnCloseLookup();
    var overlay = document.createElement('div');
    window._dnLookupOverlay = overlay;
    overlay.style.cssText = 'position:fixed;inset:0;z-index:999999;background:rgba(0,0,0,0.2);display:flex;align-items:center;justify-content:center;';
    overlay.onclick = window.dnCloseLookup;

    var popup = document.createElement('div');
    popup.style.cssText = 'width:420px;max-width:94vw;background:#fff;border-radius:16px;box-shadow:0 20px 60px rgba(0,0,0,0.35);padding:24px 20px 20px;font-family:Pretendard,Inter,sans-serif;text-align:left;position:relative;';
    popup.onclick = function(ev) { ev.stopPropagation(); };

    var h = '<div style="font-size:1.3em;font-weight:800;color:#2563eb;margin-bottom:8px;padding-right:56px;">' + entry.base + '</div>';
    h += '<div style="font-size:1.1em;color:#1e293b;font-weight:500;margin-bottom:4px;">🇻🇳 ' + (entry.meaning || '') + '</div>';

    if (entry.examples && entry.examples.length) {
        h += '<div style="text-align:left;margin-top:12px;border-top:1px solid #e2e8f0;padding-top:10px;">';
        h += '<small style="color:#94a3b8;font-weight:600;">VÍ DỤ</small>';
        for (var x = 0; x < Math.min(entry.examples.length, 4); x++) {
            var ex = typeof entry.examples[x] === 'string' ? entry.examples[x] : (entry.examples[x].ko || '');
            h += '<div style="margin-top:6px;padding:8px 12px;background:#f8fafc;border-radius:8px;font-size:0.9em;color:#334155;line-height:1.5;">' + ex + '</div>';
        }
        h += '</div>';
    }
    popup.innerHTML = h;

    var cb = document.createElement('button');
    cb.innerHTML = '×'; cb.style.cssText = 'position:absolute;top:8px;right:12px;background:none;border:none;font-size:1.5em;cursor:pointer;color:#94a3b8;line-height:1;';
    cb.onclick = window.dnCloseLookup; popup.appendChild(cb);

    var sb = document.createElement('button');
    sb.innerHTML = '🔊'; sb.style.cssText = 'position:absolute;top:12px;right:44px;background:none;border:none;font-size:1.2em;cursor:pointer;';
    sb.onclick = function(ev) { ev.stopPropagation(); if ('speechSynthesis' in window) { window.speechSynthesis.cancel(); var u = new SpeechSynthesisUtterance(entry.base); u.lang = 'ko-KR'; u.rate = 0.85; window.speechSynthesis.speak(u); } };
    popup.appendChild(sb);

    overlay.appendChild(popup);
    document.body.appendChild(overlay);
};

document.addEventListener('DOMContentLoaded', function() {
    var container = document.getElementById('dnList');
    var heroGrid = document.getElementById('dnHeroGrid');
    var heroWrap = document.getElementById('dnHeroWrap');
    var fab = document.getElementById('dnFab');
    var searchInput = document.getElementById('dnSearchInput');
    var datePicker = document.getElementById('dnDatePicker');
    var dateBtn = document.getElementById('dnDateBtn');
    var topicBtn = document.getElementById('dnTopicBtn');
    var topicDropdown = document.getElementById('dnTopicDropdown');
    var clearBtn = document.getElementById('dnClearBtn');
    var filterInfo = document.getElementById('dnFilterInfo');
    var filterText = document.getElementById('dnFilterText');
    var resultCount = document.getElementById('dnResultCount');

    // =============================
    // Korean Character Rain
    // =============================
    var rainCanvas = document.getElementById('dnRainCanvas');
    var rainCtx = null;
    var rainParticles = [];
    var rainAnimId = null;
    var rainChars = 'ㄱㄴㄷㄹㅁㅂㅅㅇㅈㅊㅋㅌㅍㅎㅏㅑㅓㅕㅗㅛㅜㅠㅡㅣ가나다라마바사아자차카타파하국문한글공부읽기쓰기말하기듣기배움지혜'.split('');

    function initRain() {
        if (!rainCanvas) return;
        var headerEl = document.querySelector('.dn-hero-header');
        if (!headerEl) return;
        rainCtx = rainCanvas.getContext('2d');
        resizeRain();
        window.addEventListener('resize', resizeRain);

        var count = 50;
        for (var i = 0; i < count; i++) {
            rainParticles.push({
                x: Math.random() * rainCanvas.width,
                y: Math.random() * rainCanvas.height,
                char: rainChars[Math.floor(Math.random() * rainChars.length)],
                size: 14 + Math.random() * 20,
                speed: 0.3 + Math.random() * 0.9,
                opacity: 0.08 + Math.random() * 0.25,
                wobble: Math.random() * 0.5,
                wobbleSpeed: 0.01 + Math.random() * 0.03
            });
        }
        animateRain();
    }

    function resizeRain() {
        if (!rainCanvas) return;
        var headerEl = document.querySelector('.dn-hero-header');
        if (!headerEl) return;
        rainCanvas.width = headerEl.offsetWidth;
        rainCanvas.height = headerEl.offsetHeight;
    }

    function animateRain() {
        if (!rainCtx || !rainCanvas) return;
        rainCtx.clearRect(0, 0, rainCanvas.width, rainCanvas.height);

        for (var i = 0; i < rainParticles.length; i++) {
            var p = rainParticles[i];
            p.y += p.speed;
            p.x += Math.sin(p.y * p.wobbleSpeed) * p.wobble;
            if (p.y > rainCanvas.height + 40) {
                p.y = -20;
                p.x = Math.random() * rainCanvas.width;
                p.char = rainChars[Math.floor(Math.random() * rainChars.length)];
            }
            rainCtx.font = p.size + 'px "Pretendard","Inter",sans-serif';
            rainCtx.fillStyle = 'rgba(255,255,255,' + p.opacity + ')';
            rainCtx.fillText(p.char, p.x, p.y);
        }
        rainAnimId = requestAnimationFrame(animateRain);
    }

    function stopRain() {
        if (rainAnimId) { cancelAnimationFrame(rainAnimId); rainAnimId = null; }
    }

    // =============================
    // Helpers
    // =============================
    function escapeHtml(text) {
        if (!text) return '';
        var d = document.createElement('div');
        d.textContent = text;
        return d.innerHTML;
    }

    function formatDate(a) {
        if (a.createdAt && a.createdAt.toDate) {
            return new Date(a.createdAt.toDate()).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
        }
        if (a.createdAt && a.createdAt.seconds) {
            return new Date(a.createdAt.seconds * 1000).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
        }
        return '';
    }


    function getFilteredArticles() {
        return dnArticles.filter(function(a) {
            if (dnSearchKeyword) {
                var kw = dnSearchKeyword.toLowerCase();
                var inTitle = (a.title || '').toLowerCase().indexOf(kw) !== -1;
                var inKo = (a.contentKorean || '').toLowerCase().indexOf(kw) !== -1;
                var inVi = (a.contentVietnamese || '').toLowerCase().indexOf(kw) !== -1;
                if (!inTitle && !inKo && !inVi) return false;
            }
            if (dnSearchDate) {
                var artDate = '';
                if (a.createdAt && a.createdAt.toDate) {
                    artDate = a.createdAt.toDate().toISOString().split('T')[0];
                }
                if (artDate !== dnSearchDate) return false;
            }
            if (dnSearchTopic) {
                if ((a.topic || '') !== dnSearchTopic) return false;
            }
            return true;
        });
    }

    function updateFilterInfo() {
        var filtered = getFilteredArticles();
        var hasFilter = dnSearchKeyword || dnSearchDate || dnSearchTopic;
        if (hasFilter) {
            var parts = [];
            if (dnSearchKeyword) parts.push('"' + dnSearchKeyword + '"');
            if (dnSearchDate) {
                var d = new Date(dnSearchDate + 'T00:00:00');
                parts.push(d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }));
            }
            if (dnSearchTopic) parts.push(dnSearchTopic);
            filterText.innerHTML = '🔎 Lọc: <span class="dn-filter-tag" onclick="dnClearFilter()">' + parts.join(' + ') + ' ✕</span>';
            resultCount.textContent = filtered.length + ' bài viết';
            filterInfo.classList.add('visible');
            clearBtn.classList.add('visible');
        } else {
            filterInfo.classList.remove('visible');
            clearBtn.classList.remove('visible');
        }
        if (dnSearchDate) { dateBtn.classList.add('active'); } else { dateBtn.classList.remove('active'); }
        if (dnSearchTopic) { document.getElementById('dnTopicBtn').classList.add('active'); } else { document.getElementById('dnTopicBtn').classList.remove('active'); }
    }

    window.dnClearFilter = function() {
        dnSearchKeyword = '';
        dnSearchDate = '';
        dnSearchTopic = '';
        dnCurrentPage = 0;
        if (searchInput) searchInput.value = '';
        if (datePicker) datePicker.value = '';
        updateFilterInfo();
        renderArticles();
    };

    // =============================
    // Render
    // =============================
    function renderCard(a, isHero, idx, badgeType, extraClass) {
        var dateStr = formatDate(a);
        var thumbHtml = a.thumbnailUrl
            ? '<img class="dn-card-thumb" src="' + escapeHtml(a.thumbnailUrl) + '" alt="" loading="lazy" onerror="this.classList.add(\'no-img\');this.innerHTML=\'\';">'
            : '<div class="dn-card-thumb no-img"></div>';

        var articleUrl = 'news-article.html?id=' + encodeURIComponent(a.id);

        var badgeHtml = '';
        if (badgeType === 'new') {
            badgeHtml = '<span class="dn-card-badge">🔥 Mới nhất</span>';
        } else if (badgeType === 'hot') {
            badgeHtml = '<span class="dn-card-hot">🔥 Hot</span>';
        }

        var topicHtml = a.topic ? '<span class="dn-card-topic">' + escapeHtml(a.topic) + '</span>' : '';

        var viewCount = a.viewCount || 0;
        var viewsHtml = '<span class="dn-card-views">👁 ' + viewCount + '</span>';

        var adminBar = dnIsAdmin
            ? '<div class="dn-admin-bar" onclick="event.stopPropagation()"><button onclick="dnEditArticle(\'' + a.id.replace(/'/g, "\\'") + '\')" title="Sửa">✏️</button><button class="btn-del" onclick="dnDeleteArticle(\'' + a.id.replace(/'/g, "\\'") + '\')" title="Xoá">🗑️</button></div>'
            : '';

        var cls = isHero ? ' dn-hero-main' : '';
        if (extraClass) cls += ' ' + extraClass;
        var delay = ' animation-delay:' + (idx * 0.06) + 's;';
        return '<div class="dn-card' + cls + '" data-id="' + a.id + '" onclick="window.location.href=\'' + articleUrl + '\'" style="cursor:pointer;' + delay + '" title="Đọc bài viết">' + badgeHtml + topicHtml + adminBar + thumbHtml + '<div class="dn-card-body"><h3 class="dn-card-title">' + escapeHtml(a.title) + '</h3><div class="dn-card-meta"><span>' + escapeHtml(a.source || '') + '</span>' + viewsHtml + (dateStr ? '<span>' + dateStr + '</span>' : '') + '</div></div></div>';
    }

    function renderArticles() {
        if (!container) return;
        updatePageSize();

        var filtered = getFilteredArticles();
        updateFilterInfo();

        // Determine hero: newest article (idx 0) + 2 hot articles
        var heroArticles = [];
        // Newest
        if (filtered.length >= 1) {
            heroArticles.push({ article: filtered[0], type: 'new' });
        }
        // Hot (top viewed, exclude newest if already included)
        var hotIds = new Set(heroArticles.map(function(h) { return h.article.id; }));
        for (var h = 0; h < dnHotArticles.length && heroArticles.length < 3; h++) {
            if (!hotIds.has(dnHotArticles[h].id)) {
                heroArticles.push({ article: dnHotArticles[h], type: 'hot' });
                hotIds.add(dnHotArticles[h].id);
            }
        }
        // Fill remaining with next filtered articles (up to 3 total)
        for (var f = 1; f < filtered.length && heroArticles.length < 3; f++) {
            if (!hotIds.has(filtered[f].id)) {
                heroArticles.push({ article: filtered[f], type: '' });
                hotIds.add(filtered[f].id);
            }
        }

        // Build hero: newest full-width + 2 hot side-by-side
        var heroHtml = '';
        if (heroArticles.length > 0) {
            heroHtml = '<div class="dn-hero">';
            // Newest: full-width
            heroHtml += renderCard(heroArticles[0].article, false, 0, heroArticles[0].type, 'dn-hero-newest');
            // Hot: 2-column grid
            if (heroArticles.length > 1) {
                heroHtml += '<div class="dn-hero-hot">';
                for (var hi = 1; hi < heroArticles.length; hi++) {
                    heroHtml += renderCard(heroArticles[hi].article, false, hi, heroArticles[hi].type);
                }
                heroHtml += '</div>';
            }
            heroHtml += '</div>';
        }
        if (heroGrid) heroGrid.innerHTML = heroHtml;

        // Below-grid: paginated articles that aren't in hero
        var heroIdSet = new Set(heroArticles.map(function(h) { return h.article.id; }));
        var belowArticles = filtered.filter(function(a) { return !heroIdSet.has(a.id); });

        var belowHtml = '';
        if (belowArticles.length > 0) {
            var totalPages = Math.ceil(belowArticles.length / dnPageSize);
            if (dnCurrentPage >= totalPages) dnCurrentPage = totalPages - 1;
            if (dnCurrentPage < 0) dnCurrentPage = 0;

            var start = dnCurrentPage * dnPageSize;
            var pageArticles = belowArticles.slice(start, start + dnPageSize);
            var endIdx = Math.min(start + dnPageSize, belowArticles.length);

            belowHtml += '<div class="dn-grid-below" id="dnGridBelow"><h3>Bài viết trước</h3><div class="dn-grid">';
            for (var j = 0; j < pageArticles.length; j++) {
                belowHtml += renderCard(pageArticles[j], false, j, '');
            }
            belowHtml += '</div>';

            // Pagination controls
            if (totalPages > 1) {
                belowHtml += '<div class="dn-pagination">';
                belowHtml += '<button class="dn-page-nav" onclick="dnGoPage(' + (dnCurrentPage - 1) + ')"' + (dnCurrentPage === 0 ? ' disabled' : '') + '>◀</button>';
                for (var p = 0; p < totalPages; p++) {
                    belowHtml += '<button class="dn-page-btn' + (p === dnCurrentPage ? ' active' : '') + '" onclick="dnGoPage(' + p + ')">' + (p + 1) + '</button>';
                }
                belowHtml += '<button class="dn-page-nav" onclick="dnGoPage(' + (dnCurrentPage + 1) + ')"' + (dnCurrentPage >= totalPages - 1 ? ' disabled' : '') + '>▶</button>';
                belowHtml += '</div>';
            }
            belowHtml += '</div>';
        }

        if (filtered.length === 0) {
            var hasFilter = dnSearchKeyword || dnSearchDate;
            if (hasFilter) {
                belowHtml = '<div class="dn-empty"><div class="dn-empty-icon">🔍</div><h3>Không tìm thấy bài viết</h3><p>Thử từ khoá khác hoặc thay đổi ngày lọc.</p></div>';
            } else {
                belowHtml = '<div class="dn-empty"><div class="dn-empty-icon">📭</div><h3>Chưa có bài báo nào</h3><p>Bài viết đầu tiên sẽ xuất hiện ở đây.</p></div>';
            }
        }
        container.innerHTML = belowHtml;
    }

    // ── Pagination ──────────────────────────────────────────────────
    window.dnGoPage = function(page) {
        dnCurrentPage = page;
        renderArticles();
        // Save page to sessionStorage
        try { sessionStorage.setItem('dnPage', page); } catch(e) {}
        document.getElementById('dnGridBelow').scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    // =============================
    // Load
    // =============================
    function showSkeleton() {
        if (!container) return;
        var skelHtml = '<div class="dn-skeleton"><div class="dn-skel-item pri"></div><div class="dn-skel-item"></div><div class="dn-skel-item"></div><div class="dn-skel-item"></div><div class="dn-skel-item"></div></div>';
        if (heroGrid) heroGrid.innerHTML = skelHtml;
        container.innerHTML = '<div class="dn-grid-below"><h3>Bài viết trước</h3><div class="dn-grid"><div class="dn-skel-item" style="height:200px;"></div><div class="dn-skel-item" style="height:200px;"></div><div class="dn-skel-item" style="height:200px;"></div></div></div>';
    }

    async function loadArticles() {
        // Restore page from sessionStorage
        try {
            var savedPage = sessionStorage.getItem('dnPage');
            if (savedPage !== null) dnCurrentPage = parseInt(savedPage);
        } catch(e) {}

        // Show cached data immediately if available
        var cacheKey = 'dnArticlesCache';
        var cached = null;
        try {
            var raw = sessionStorage.getItem(cacheKey);
            if (raw) { cached = JSON.parse(raw); }
        } catch (e) { /* ignore */ }

        if (cached && cached.length > 0) {
            dnArticles = cached;
            renderArticles();
        } else {
            showSkeleton();
        }

        try {
            var snap = await window.db.collection('daily-articles').orderBy('order', 'asc').get();
            dnArticles = [];
            snap.forEach(function(doc) { dnArticles.push({ id: doc.id, ...doc.data() }); });
            dnArticles.reverse();

            // Load top 2 hot articles (most viewed)
            try {
                var hotSnap = await window.db.collection('daily-articles').orderBy('viewCount', 'desc').limit(2).get();
                dnHotArticles = [];
                hotSnap.forEach(function(doc) { dnHotArticles.push({ id: doc.id, ...doc.data() }); });
            } catch(e) { dnHotArticles = []; }

            try { sessionStorage.setItem(cacheKey, JSON.stringify(dnArticles)); } catch (e) { /* ignore */ }
            renderArticles();
        } catch (e) {
            if (!cached || cached.length === 0) {
                if (container) container.innerHTML = '<div class="dn-empty"><div class="dn-empty-icon">⚠️</div><h3>Lỗi tải dữ liệu</h3><p>' + escapeHtml(e.message) + '</p></div>';
            }
        }
    }

    // =============================
    // Article Detail Modal
    // =============================
    window.dnOpenArticle = function(id) {
        var article = dnArticles.find(function(a) { return a.id === id; });
        if (!article) return;

        var dateStr = formatDate(article);
        var grammarRaw = article.grammarNote || '';
        var koContent = article.contentKorean || '';
        var viContent = article.contentVietnamese || '';
        var thumbHtml = article.thumbnailUrl
            ? '<img class="dn-modal-thumb" src="' + escapeHtml(article.thumbnailUrl) + '" alt="" onerror="this.style.display=\'none\'">'
            : '';

        // KR tab — plain text
        var krHtml = '<div class="kr-text">' + escapeHtml(koContent).replace(/\n/g, '<br>') + '</div>';

        // VN tab — sentence pairs
        var vnHtml = '';
        var koLines = koContent.split('\n').filter(function(l) { return l.trim(); });
        var viLines = viContent.split('\n').filter(function(l) { return l.trim(); });
        var maxLines = Math.max(koLines.length, viLines.length);
        if (maxLines > 0) {
            for (var i = 0; i < maxLines; i++) {
                var koLine = koLines[i] || '';
                var viLine = viLines[i] || '';
                vnHtml += '<div class="dn-sentence-pair"><div class="dn-sentence-ko">' + escapeHtml(koLine) + '</div>' + (viLine ? '<div class="dn-sentence-vi">' + escapeHtml(viLine) + '</div>' : '') + '</div>';
            }
        } else {
            vnHtml = '<div style="color:#94a3b8;text-align:center;padding:20px;">Chưa có bản dịch</div>';
        }

        // Grammar tab — structured cards, format title|content per line
        var grammarHtml = '';
        if (grammarRaw.trim()) {
            var blocks = grammarRaw.split('\n').filter(function(l) { return l.trim(); });
            grammarHtml = '<div class="dn-grammar-list">';
            blocks.forEach(function(block) {
                var pipeIdx = block.indexOf('|');
                if (pipeIdx !== -1) {
                    var gmTitle = block.substring(0, pipeIdx).trim();
                    var gmBody = block.substring(pipeIdx + 1).trim();
                    grammarHtml += '<div class="dn-grammar-card"><div class="gm-title">' + escapeHtml(gmTitle) + '</div><div class="gm-body">' + escapeHtml(gmBody) + '</div></div>';
                } else {
                    grammarHtml += '<div class="dn-grammar-card"><div class="gm-body">' + escapeHtml(block.trim()) + '</div></div>';
                }
            });
            grammarHtml += '</div>';
        } else {
            grammarHtml = '<div style="color:#94a3b8;text-align:center;padding:20px;">Chưa có giải thích ngữ pháp</div>';
        }

        var modalHtml =
            '<div class="dn-modal-wrap">' +
                '<button type="button" class="dn-custom-close" onclick="Swal.close()">×</button>' +
                '<div class="dn-modal-body" id="dnModalBody">' +
                    thumbHtml +
                    '<h2>' + escapeHtml(article.title) + '</h2>' +
                    '<div class="dn-meta">' + escapeHtml(article.source || '') + (dateStr ? ' · ' + dateStr : '') + '</div>' +
                    '<div id="dnTab-kr" class="dn-tab-panel">' + krHtml + '</div>' +
                    '<div id="dnTab-vn" class="dn-tab-panel" style="display:none;">' + vnHtml + '</div>' +
                    '<div id="dnTab-grammar" class="dn-tab-panel" style="display:none;">' + grammarHtml + '</div>' +
                '</div>' +
                '<div class="dn-tab-bar">' +
                    '<button class="dn-tab-btn active" data-tab="kr" onclick="dnSwitchTab(\'kr\')"><span class="tab-label">🇰🇷 KR</span><span class="tab-icon">🇰🇷</span></button>' +
                    '<button class="dn-tab-btn" data-tab="vn" onclick="dnSwitchTab(\'vn\')"><span class="tab-label">🇻🇳 VN</span><span class="tab-icon">🇻🇳</span></button>' +
                    '<button class="dn-tab-btn" data-tab="grammar" onclick="dnSwitchTab(\'grammar\')"><span class="tab-label">📝 Ngữ pháp</span><span class="tab-icon">✏️</span></button>' +
                '</div>' +
            '</div>';

        Swal.fire({
            title: '',
            width: 900,
            showCloseButton: false,
            showConfirmButton: false,
            customClass: { popup: 'dn-swal-wide' },
            html: modalHtml,
            didOpen: function() { 
                window._dnActiveTab = 'kr';
            },
            willClose: function() { window.dnCloseLookup(); delete window._dnActiveTab; }
        });
    };

    window.dnSwitchTab = function(tab) {
        var panels = document.querySelectorAll('.dn-tab-panel');
        var buttons = document.querySelectorAll('.dn-tab-btn');

        panels.forEach(function(p) { p.style.display = 'none'; });
        buttons.forEach(function(b) { b.classList.remove('active'); });

        var panel = document.getElementById('dnTab-' + tab);
        if (panel) panel.style.display = 'block';

        buttons.forEach(function(b) {
            if (b.getAttribute('data-tab') === tab) b.classList.add('active');
        });

        window._dnActiveTab = tab;
    };

    // =============================
    // Admin: Full-screen article form
    // =============================
    function openArticleForm(article) {
        var t = article || {};
        var isEdit = !!article;

        // Parse existing grammar notes into cards
        var grammarCards = [];
        if (t.grammarNote) {
            t.grammarNote.split('\n').filter(function(l) { return l.trim(); }).forEach(function(line) {
                var pipeIdx = line.indexOf('|');
                if (pipeIdx !== -1) {
                    grammarCards.push({ title: line.substring(0, pipeIdx).trim(), content: line.substring(pipeIdx + 1).trim() });
                }
            });
        }
        // Default: at least 2 empty grammar cards
        if (grammarCards.length < 2) {
            while (grammarCards.length < 2) grammarCards.push({ title: '', content: '' });
        }

        var overlay = document.createElement('div');
        overlay.id = 'dnFormOverlay';
        overlay.style.cssText = 'position:fixed;inset:0;z-index:2147483600;background:#f1f5f9;overflow-y:auto;font-family:Pretendard,Inter,sans-serif;';

        function renderGrammarCards() {
            var html = '';
            for (var i = 0; i < grammarCards.length; i++) {
                var gc = grammarCards[i];
                var cardId = 'dnGc' + i;
                html += '<div class="dn-grammar-card-form" style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:16px;margin-bottom:12px;">' +
                    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">' +
                    '<span style="font-weight:800;color:#4f46e5;font-size:0.88em;">Ngữ pháp ' + (i+1) + '</span>' +
                    (grammarCards.length > 2 ? '<button class="dn-grammar-remove" data-idx="' + i + '" style="padding:4px 10px;border:1px solid #fecaca;border-radius:6px;background:#fef2f2;color:#ef4444;cursor:pointer;font-size:0.78em;">✕ Xoá</button>' : '') +
                    '</div>' +
                    '<input class="dn-grammar-title" data-idx="' + i + '" value="' + escapeHtml(gc.title) + '" placeholder="Tiêu đề ngữ pháp (VD: -도록)" style="width:100%;padding:10px;border:1px solid #e2e8f0;border-radius:8px;font-size:0.9em;margin-bottom:8px;font-family:Pretendard,Inter,sans-serif;">' +
                    // Mini toolbar
                    '<div class="dn-gc-toolbar" data-for="' + cardId + '" style="display:flex;gap:1px;padding:4px 6px;background:#f8fafc;border:1px solid #e2e8f0;border-bottom:none;border-radius:8px 8px 0 0;align-items:center;">' +
                        '<button type="button" data-cmd="bold" title="Đậm" style="width:26px;height:26px;border:1px solid transparent;border-radius:4px;background:transparent;cursor:pointer;font-weight:800;font-size:0.75em;">B</button>' +
                        '<button type="button" data-cmd="italic" title="Nghiêng" style="width:26px;height:26px;border:1px solid transparent;border-radius:4px;background:transparent;cursor:pointer;font-style:italic;font-size:0.75em;">I</button>' +
                        '<button type="button" data-cmd="underline" title="Gạch chân" style="width:26px;height:26px;border:1px solid transparent;border-radius:4px;background:transparent;cursor:pointer;text-decoration:underline;font-size:0.75em;">U</button>' +
                        '<span style="width:1px;height:16px;background:#e2e8f0;margin:0 3px;"></span>' +
                        '<input type="color" class="dn-gc-fg" data-for="' + cardId + '" value="#475569" title="Màu chữ" style="width:22px;height:22px;border:1px solid #e2e8f0;border-radius:3px;padding:1px;cursor:pointer;">' +
                        '<input type="color" class="dn-gc-bg" data-for="' + cardId + '" value="#ffffff" title="Màu nền" style="width:22px;height:22px;border:1px solid #e2e8f0;border-radius:3px;padding:1px;cursor:pointer;">' +
                    '</div>' +
                    '<div id="' + cardId + '" class="dn-grammar-content" data-idx="' + i + '" contenteditable="true" style="min-height:70px;padding:10px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 8px 8px;font-size:0.9em;font-family:Pretendard,Inter,sans-serif;line-height:1.6;outline:none;background:#fff;">' + (gc.content || '') + '</div>' +
                    '</div>';
            }
            html += '<button id="dnAddGrammarBtn" style="width:100%;padding:10px;border:2px dashed #cbd5e1;border-radius:10px;background:transparent;color:#64748b;cursor:pointer;font-weight:700;font-size:0.85em;">＋ Thêm ngữ pháp</button>';
            return html;
        }

        var formHtml = '<div style="max-width:800px;margin:0 auto;padding:24px 20px 60px;">' +
            // Header
            '<div style="display:flex;align-items:center;justify-content:space-between;padding:16px 0;position:sticky;top:0;background:#f1f5f9;z-index:10;border-bottom:2px solid #e2e8f0;margin-bottom:24px;">' +
            '<h2 style="margin:0;font-size:1.3em;color:#1e293b;">' + (isEdit ? '✏️ Chỉnh sửa bài báo' : '➕ Thêm bài báo mới') + '</h2>' +
            '<div style="display:flex;gap:8px;">' +
            '<button id="dnFormSave" style="padding:10px 24px;border:none;border-radius:10px;background:#4f46e5;color:#fff;font-weight:700;cursor:pointer;font-size:0.95em;">' + (isEdit ? '💾 Lưu' : '📝 Đăng bài') + '</button>' +
            '<button id="dnFormClose" style="padding:10px 20px;border:1.5px solid #e2e8f0;border-radius:10px;background:#fff;color:#64748b;font-weight:700;cursor:pointer;font-size:0.95em;">✕ Đóng</button>' +
            '</div></div>' +

            // Title
            '<label style="font-weight:700;font-size:0.88em;color:#475569;display:block;margin-bottom:6px;">Tiêu đề *</label>' +
            '<input id="dnFormTitle" style="width:100%;padding:12px;border:1.5px solid #e2e8f0;border-radius:10px;font-size:0.95em;margin-bottom:16px;font-family:Pretendard,Inter,sans-serif;" value="' + escapeHtml(t.title || '') + '" placeholder="Nhập tiêu đề bài báo">' +

            // Source + Thumbnail row
            '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;">' +
            '<div><label style="font-weight:700;font-size:0.88em;color:#475569;display:block;margin-bottom:6px;">Nguồn</label>' +
            '<input id="dnFormSource" style="width:100%;padding:12px;border:1.5px solid #e2e8f0;border-radius:10px;font-size:0.95em;font-family:Pretendard,Inter,sans-serif;" value="' + escapeHtml(t.source || '') + '" placeholder="Naver News, Yonhap..."></div>' +
            '<div><label style="font-weight:700;font-size:0.88em;color:#475569;display:block;margin-bottom:6px;">Link ảnh</label>' +
            '<input id="dnFormThumb" style="width:100%;padding:12px;border:1.5px solid #e2e8f0;border-radius:10px;font-size:0.95em;font-family:Pretendard,Inter,sans-serif;" value="' + escapeHtml(t.thumbnailUrl || '') + '" placeholder="https://..."></div>' +
            '</div>' +

            // Topic
            '<div style="margin-bottom:16px;">' +
            '<label style="font-weight:700;font-size:0.88em;color:#475569;display:block;margin-bottom:6px;">Chủ đề</label>' +
            '<select id="dnFormTopic" style="width:100%;padding:12px;border:1.5px solid #e2e8f0;border-radius:10px;font-size:0.95em;font-family:Pretendard,Inter,sans-serif;background:#fff;cursor:pointer;">' +
                '<option value="">-- Chọn chủ đề --</option>';
            DN_TOPICS.forEach(function(tp) {
                formHtml += '<option value="' + tp + '"' + (t.topic === tp ? ' selected' : '') + '>' + tp + '</option>';
            });
            formHtml += '</select></div>' +

            // Korean content - Rich Text Editor
            '<label style="font-weight:700;font-size:0.88em;color:#475569;display:block;margin-bottom:6px;">Nội dung tiếng Hàn *</label>' +
            '<div id="dnRteToolbar" style="display:flex;flex-wrap:wrap;gap:2px;padding:6px 8px;background:#f8fafc;border:1.5px solid #e2e8f0;border-bottom:none;border-radius:10px 10px 0 0;align-items:center;">' +
                '<select id="dnRteFontSize" style="padding:4px 6px;border:1px solid #e2e8f0;border-radius:6px;font-size:0.8em;background:#fff;cursor:pointer;">' +
                    '<option value="1">Nhỏ</option><option value="3" selected>Vừa</option><option value="5">Lớn</option><option value="7">Rất lớn</option>' +
                '</select>' +
                '<input type="color" id="dnRteFg" value="#1e293b" title="Màu chữ" style="width:28px;height:28px;border:1px solid #e2e8f0;border-radius:4px;padding:2px;cursor:pointer;">' +
                '<input type="color" id="dnRteBg" value="#ffffff" title="Màu nền" style="width:28px;height:28px;border:1px solid #e2e8f0;border-radius:4px;padding:2px;cursor:pointer;">' +
                '<span style="width:1px;height:20px;background:#e2e8f0;margin:0 4px;"></span>' +
                '<button type="button" data-cmd="bold" title="In đậm (Ctrl+B)" style="width:30px;height:30px;border:1px solid #e2e8f0;border-radius:5px;background:#fff;cursor:pointer;font-weight:800;font-size:0.85em;">B</button>' +
                '<button type="button" data-cmd="italic" title="Nghiêng (Ctrl+I)" style="width:30px;height:30px;border:1px solid #e2e8f0;border-radius:5px;background:#fff;cursor:pointer;font-style:italic;font-size:0.85em;">I</button>' +
                '<button type="button" data-cmd="underline" title="Gạch chân (Ctrl+U)" style="width:30px;height:30px;border:1px solid #e2e8f0;border-radius:5px;background:#fff;cursor:pointer;text-decoration:underline;font-size:0.85em;">U</button>' +
                '<button type="button" data-cmd="strikeThrough" title="Gạch ngang" style="width:30px;height:30px;border:1px solid #e2e8f0;border-radius:5px;background:#fff;cursor:pointer;text-decoration:line-through;font-size:0.85em;">S</button>' +
                '<span style="width:1px;height:20px;background:#e2e8f0;margin:0 4px;"></span>' +
                '<button type="button" data-cmd="insertUnorderedList" title="Danh sách" style="width:30px;height:30px;border:1px solid #e2e8f0;border-radius:5px;background:#fff;cursor:pointer;font-size:0.85em;">•≡</button>' +
                '<button type="button" data-cmd="insertOrderedList" title="Đánh số" style="width:30px;height:30px;border:1px solid #e2e8f0;border-radius:5px;background:#fff;cursor:pointer;font-size:0.85em;">1.</button>' +
            '</div>' +
            '<div id="dnFormKo" contenteditable="true" style="width:100%;min-height:220px;padding:14px;border:1.5px solid #e2e8f0;border-top:none;border-radius:0 0 10px 10px;font-size:1.05em;font-family:Pretendard,Inter,sans-serif;line-height:1.8;outline:none;background:#fff;margin-bottom:16px;overflow-y:auto;">' + (t.contentKorean || '') + '</div>' +

            // Vietnamese content (optional)
            '<label style="font-weight:700;font-size:0.88em;color:#475569;display:block;margin-bottom:6px;">Nội dung tiếng Việt <span style="color:#94a3b8;font-weight:400;">(tuỳ chọn — để trống sẽ tự dịch)</span></label>' +
            '<textarea id="dnFormVi" style="width:100%;min-height:100px;padding:12px;border:1.5px solid #e2e8f0;border-radius:10px;font-size:0.95em;font-family:Pretendard,Inter,sans-serif;line-height:1.6;resize:vertical;margin-bottom:20px;" placeholder="Dịch sang tiếng Việt (tuỳ chọn)">' + escapeHtml(t.contentVietnamese || '') + '</textarea>' +

            // Grammar section
            '<div style="border-top:2px solid #e2e8f0;padding-top:20px;margin-bottom:16px;">' +
            '<h3 style="font-size:1.1em;font-weight:800;color:#1e293b;margin:0 0 16px 0;">📝 Ngữ pháp</h3>' +
            '<div id="dnGrammarCards">' + renderGrammarCards() + '</div>' +
            '</div>' +

            '</div>'; // container

        overlay.innerHTML = formHtml;
        document.body.appendChild(overlay);
        document.body.style.overflow = 'hidden';

        // ── Event: Add grammar card ──────────────────────────────────
        function bindGrammarEvents() {
            var addBtn = document.getElementById('dnAddGrammarBtn');
            if (addBtn) {
                addBtn.onclick = function() {
                    grammarCards.push({ title: '', content: '' });
                    document.getElementById('dnGrammarCards').innerHTML = renderGrammarCards();
                    bindGrammarEvents();
                };
            }

            // Remove buttons
            overlay.querySelectorAll('.dn-grammar-remove').forEach(function(btn) {
                btn.onclick = function() {
                    var idx = parseInt(btn.getAttribute('data-idx'));
                    grammarCards.splice(idx, 1);
                    document.getElementById('dnGrammarCards').innerHTML = renderGrammarCards();
                    bindGrammarEvents();
                };
            });

            // Title inputs
            overlay.querySelectorAll('.dn-grammar-title').forEach(function(inp) {
                inp.addEventListener('input', function() {
                    var idx = parseInt(inp.getAttribute('data-idx'));
                    grammarCards[idx].title = inp.value;
                });
            });

            // Content editable divs — track content
            overlay.querySelectorAll('.dn-grammar-content').forEach(function(div) {
                div.addEventListener('input', function() {
                    var idx = parseInt(div.getAttribute('data-idx'));
                    grammarCards[idx].content = div.innerHTML;
                });
            });

            // Mini toolbar buttons
            overlay.querySelectorAll('.dn-gc-toolbar [data-cmd]').forEach(function(btn) {
                btn.addEventListener('click', function() {
                    var cmd = btn.getAttribute('data-cmd');
                    var cardId = btn.parentElement.getAttribute('data-for');
                    var editor = document.getElementById(cardId);
                    document.execCommand(cmd, false, null);
                    if (editor) { editor.focus(); editor.dispatchEvent(new Event('input', {bubbles:true})); }
                });
            });

            // Color pickers
            overlay.querySelectorAll('.dn-gc-fg').forEach(function(picker) {
                picker.addEventListener('input', function() {
                    var cardId = picker.getAttribute('data-for');
                    var editor = document.getElementById(cardId);
                    document.execCommand('foreColor', false, picker.value);
                    if (editor) { editor.focus(); editor.dispatchEvent(new Event('input', {bubbles:true})); }
                });
            });
            overlay.querySelectorAll('.dn-gc-bg').forEach(function(picker) {
                picker.addEventListener('input', function() {
                    var cardId = picker.getAttribute('data-for');
                    var editor = document.getElementById(cardId);
                    document.execCommand('hiliteColor', false, picker.value);
                    if (editor) { editor.focus(); editor.dispatchEvent(new Event('input', {bubbles:true})); }
                });
            });
        }
        bindGrammarEvents();

        // ── Rich Text Editor toolbar ─────────────────────────────────
        var koEditor = document.getElementById('dnFormKo');
        overlay.querySelectorAll('#dnRteToolbar [data-cmd]').forEach(function(btn) {
            btn.addEventListener('click', function() {
                var cmd = btn.getAttribute('data-cmd');
                document.execCommand(cmd, false, null);
                koEditor.focus();
            });
        });
        var fontSizeSel = document.getElementById('dnRteFontSize');
        if (fontSizeSel) {
            fontSizeSel.addEventListener('change', function() {
                document.execCommand('fontSize', false, fontSizeSel.value);
                koEditor.focus();
            });
        }
        var fgPicker = document.getElementById('dnRteFg');
        if (fgPicker) {
            fgPicker.addEventListener('input', function() {
                document.execCommand('foreColor', false, fgPicker.value);
                koEditor.focus();
            });
        }
        var bgPicker = document.getElementById('dnRteBg');
        if (bgPicker) {
            bgPicker.addEventListener('input', function() {
                document.execCommand('hiliteColor', false, bgPicker.value);
                koEditor.focus();
            });
        }

        // ── Collect grammar ─────────────────────────────────────────
        function collectGrammarNote() {
            var lines = [];
            grammarCards.forEach(function(gc) {
                var title = gc.title.trim();
                var content = gc.content.trim().replace(/\n/g, '\\n');
                if (title || (content && content !== '<br>')) {
                    lines.push((title || '') + '|' + (content || ''));
                }
            });
            return lines.join('\n');
        }

        // ── Gather form data ────────────────────────────────────────
        function gatherAll() {
            var title = (document.getElementById('dnFormTitle').value || '').trim();
            if (!title) { alert('Vui lòng nhập tiêu đề'); return null; }
            var koEl = document.getElementById('dnFormKo');
            var ko = (koEl ? koEl.innerHTML : '').trim();
            if (!ko || ko === '<br>') { alert('Vui lòng nhập nội dung tiếng Hàn'); return null; }
            return {
                title: title,
                source: (document.getElementById('dnFormSource').value || '').trim(),
                thumbnailUrl: (document.getElementById('dnFormThumb').value || '').trim(),
                topic: (document.getElementById('dnFormTopic').value || '').trim(),
                contentKorean: ko,
                contentVietnamese: (document.getElementById('dnFormVi').value || '').trim(),
                grammarNote: collectGrammarNote()
            };
        }

        // ── Close ──────────────────────────────────────────────────
        function closeForm() {
            overlay.remove();
            document.body.style.overflow = '';
        }
        document.getElementById('dnFormClose').addEventListener('click', closeForm);
        overlay.addEventListener('click', function(ev) { if (ev.target === overlay) closeForm(); });
        document.addEventListener('keydown', function escHandler(ev) {
            if (ev.key === 'Escape') { closeForm(); document.removeEventListener('keydown', escHandler); }
        });

        // ── Save ───────────────────────────────────────────────────
        document.getElementById('dnFormSave').addEventListener('click', async function() {
            var data = gatherAll();
            if (!data) return;
            try {
                if (isEdit) {
                    await window.db.collection('daily-articles').doc(article.id).update(data);
                    closeForm();
                    var articleUrl = window.location.origin + window.location.pathname.replace(/[^/]*$/, '') + 'news-article.html?id=' + encodeURIComponent(article.id);
                    Swal.fire({
                        title: 'Đã lưu!',
                        html: '<input value="' + articleUrl.replace(/"/g, '&quot;') + '" style="width:100%;padding:10px;border:1px solid #e2e8f0;border-radius:8px;font-size:0.82em;text-align:center;" readonly onclick="this.select();navigator.clipboard.writeText(this.value);">',
                        icon: 'success', confirmButtonText: 'Mở bài viết', showCancelButton: true, cancelButtonText: 'Đóng',
                        preConfirm: function() { window.open(articleUrl, '_blank'); }
                    });
                } else {
                    data.order = dnArticles.length;
                    data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
                    var docRef = await window.db.collection('daily-articles').add(data);
                    closeForm();
                    var articleUrl = window.location.origin + window.location.pathname.replace(/[^/]*$/, '') + 'news-article.html?id=' + encodeURIComponent(docRef.id);
                    Swal.fire({
                        title: 'Đã đăng!',
                        html: '<input value="' + articleUrl.replace(/"/g, '&quot;') + '" style="width:100%;padding:10px;border:1px solid #e2e8f0;border-radius:8px;font-size:0.82em;text-align:center;" readonly onclick="this.select();navigator.clipboard.writeText(this.value);">',
                        icon: 'success', confirmButtonText: 'Mở bài viết', showCancelButton: true, cancelButtonText: 'Đóng',
                        preConfirm: function() { window.open(articleUrl, '_blank'); }
                    });
                }
                loadArticles();
            } catch (e) { alert('Lỗi: ' + e.message); }
        });
    }

    window.openCreateModal = function() {
        if (!dnIsAdmin) { Swal.fire({ icon: 'warning', title: 'Không có quyền' }); return; }
        openArticleForm(null);
    };

    window.dnEditArticle = function(id) {
        var article = dnArticles.find(function(a) { return a.id === id; });
        if (!article) return;
        openArticleForm(article);
    };

    window.dnDeleteArticle = function(id) {
        Swal.fire({
            title: 'Xoá bài báo?', text: 'Hành động này không thể hoàn tác!',
            icon: 'warning', showCancelButton: true,
            confirmButtonColor: '#ef4444', confirmButtonText: 'Xoá', cancelButtonText: 'Huỷ'
        }).then(async function(result) {
            if (!result.isConfirmed) return;
            try {
                await window.db.collection('daily-articles').doc(id).delete();
                Swal.fire({ icon: 'success', title: 'Đã xoá!', timer: 1200, showConfirmButton: false });
                loadArticles();
            } catch (e) { Swal.fire({ icon: 'error', title: 'Lỗi', text: e.message }); }
        });
    };

    // =============================
    // Search / Filter Events
    // =============================
    var searchTimer;
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            clearTimeout(searchTimer);
            searchTimer = setTimeout(function() {
                dnSearchKeyword = searchInput.value.trim();
                dnCurrentPage = 0;
                renderArticles();
            }, 300);
        });
    }
    if (dateBtn && datePicker) {
        dateBtn.addEventListener('click', function() {
            if (dnSearchDate) {
                dnSearchDate = ''; datePicker.value = ''; updateFilterInfo(); renderArticles();
            } else {
                datePicker.showPicker ? datePicker.showPicker() : datePicker.focus();
            }
        });
        datePicker.addEventListener('change', function() { dnSearchDate = datePicker.value; dnCurrentPage = 0; renderArticles(); });
    }

    // Topic filter funnel
    if (topicBtn && topicDropdown) {
        // Build dropdown items
        topicDropdown.innerHTML = DN_TOPICS.map(function(tp) {
            return '<button class="dn-topic-item' + (dnSearchTopic === tp ? ' active' : '') + '" data-topic="' + tp + '">' + tp + '</button>';
        }).join('');

        topicBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            topicDropdown.classList.toggle('visible');
        });

        topicDropdown.addEventListener('click', function(e) {
            var item = e.target.closest('.dn-topic-item');
            if (!item) return;
            var topic = item.getAttribute('data-topic');
            if (dnSearchTopic === topic) {
                dnSearchTopic = '';
            } else {
                dnSearchTopic = topic;
            }
            dnCurrentPage = 0;
            updateFilterInfo();
            renderArticles();
            // Rebuild dropdown to reflect active state
            topicDropdown.innerHTML = DN_TOPICS.map(function(tp) {
                return '<button class="dn-topic-item' + (dnSearchTopic === tp ? ' active' : '') + '" data-topic="' + tp + '">' + tp + '</button>';
            }).join('');
            topicDropdown.classList.remove('visible');
        });

        document.addEventListener('click', function(e) {
            if (!topicDropdown.contains(e.target) && e.target !== topicBtn) {
                topicDropdown.classList.remove('visible');
            }
        });
    }

    if (clearBtn) { clearBtn.addEventListener('click', function() { dnClearFilter(); }); }

    // =============================
    // Init
    // =============================
    function measureScrollbar() {
        var sbw = window.innerWidth - document.documentElement.clientWidth;
        document.documentElement.style.setProperty('--dn-sbw', sbw + 'px');
    }
    measureScrollbar();
    window.addEventListener('resize', measureScrollbar);

    // Re-render on breakpoint change (desktop ↔ mobile pagination)
    var dnLastWidth = window.innerWidth;
    window.addEventListener('resize', function() {
        var w = window.innerWidth;
        if ((dnLastWidth >= 769 && w < 769) || (dnLastWidth < 769 && w >= 769)) {
            dnCurrentPage = 0;
            renderArticles();
        }
        dnLastWidth = w;
    });


    function init() {
        if (typeof firebase === 'undefined' || !firebase.auth) {
            if (container) container.innerHTML = '<div class="dn-empty"><div class="dn-empty-icon">⏳</div><h3>Đang khởi tạo...</h3></div>';
            setTimeout(init, 300);
            return;
        }
        firebase.auth().onAuthStateChanged(function(user) {
            if (user) {
                var ADMIN_EMAILS = ['nmhieu2526@gmail.com', 'vuihoctienghan27@gmail.com'];
                dnIsAdmin = ADMIN_EMAILS.includes(user.email);
            } else { dnIsAdmin = false; }
            if (fab) fab.style.display = dnIsAdmin ? 'block' : 'none';
            loadArticles().then(function() {
                // Handle #edit=<id> from news-article admin bar
                var hash = window.location.hash;
                if (hash && hash.indexOf('#edit=') === 0) {
                    var editId = decodeURIComponent(hash.substring(6));
                    var article = dnArticles.find(function(a) { return a.id === editId; });
                    if (article) { openArticleForm(article); }
                    window.location.hash = '';
                }
            });
        });
    }

    setTimeout(function() { initRain(); init(); }, 200);
});
