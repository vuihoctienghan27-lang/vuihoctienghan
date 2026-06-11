var dnArticles = [];
var dnIsAdmin = false;
var dnSearchKeyword = '';
var dnSearchDate = '';

window.toggleGlobalVocab = function() {
    document.body.classList.toggle('vocab-disabled');
};

document.addEventListener('DOMContentLoaded', function() {
    var container = document.getElementById('dnList');
    var heroGrid = document.getElementById('dnHeroGrid');
    var heroWrap = document.getElementById('dnHeroWrap');
    var fab = document.getElementById('dnFab');
    var searchInput = document.getElementById('dnSearchInput');
    var datePicker = document.getElementById('dnDatePicker');
    var dateBtn = document.getElementById('dnDateBtn');
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
            return true;
        });
    }

    function updateFilterInfo() {
        var filtered = getFilteredArticles();
        var hasFilter = dnSearchKeyword || dnSearchDate;
        if (hasFilter) {
            var parts = [];
            if (dnSearchKeyword) parts.push('"' + dnSearchKeyword + '"');
            if (dnSearchDate) {
                var d = new Date(dnSearchDate);
                parts.push(d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }));
            }
            filterText.innerHTML = '🔎 Lọc: <span class="dn-filter-tag" onclick="dnClearFilter()">' + parts.join(' + ') + ' ✕</span>';
            resultCount.textContent = filtered.length + ' bài viết';
            filterInfo.classList.add('visible');
            clearBtn.classList.add('visible');
        } else {
            filterInfo.classList.remove('visible');
            clearBtn.classList.remove('visible');
        }
        if (dnSearchDate) { dateBtn.classList.add('active'); } else { dateBtn.classList.remove('active'); }
    }

    window.dnClearFilter = function() {
        dnSearchKeyword = '';
        dnSearchDate = '';
        if (searchInput) searchInput.value = '';
        if (datePicker) datePicker.value = '';
        updateFilterInfo();
        renderArticles();
    };

    // =============================
    // Render
    // =============================
    function renderCard(a, isHero, idx) {
        var dateStr = formatDate(a);
        var thumbHtml = a.thumbnailUrl
            ? '<img class="dn-card-thumb" src="' + escapeHtml(a.thumbnailUrl) + '" alt="" loading="lazy" onerror="this.classList.add(\'no-img\');this.innerHTML=\'\';">'
            : '<div class="dn-card-thumb no-img"></div>';

        var aId = a.id.replace(/'/g, "\\'");

        var badgeHtml = (!dnSearchKeyword && !dnSearchDate && idx === 0)
            ? '<span class="dn-card-badge">🔥 Mới nhất</span>'
            : '';

        var adminBar = dnIsAdmin
            ? '<div class="dn-admin-bar" onclick="event.stopPropagation()"><button onclick="dnEditArticle(\'' + aId + '\')" title="Sửa">✏️</button><button class="btn-del" onclick="dnDeleteArticle(\'' + aId + '\')" title="Xoá">🗑️</button></div>'
            : '';

        var cls = isHero ? ' dn-hero-main' : '';
        var delay = ' animation-delay:' + (idx * 0.06) + 's;';
        return '<div class="dn-card' + cls + '" data-id="' + a.id + '" onclick="dnOpenArticle(\'' + aId + '\')" style="' + delay + '">' + badgeHtml + adminBar + thumbHtml + '<div class="dn-card-body"><h3 class="dn-card-title">' + escapeHtml(a.title) + '</h3><div class="dn-card-meta"><span>' + escapeHtml(a.source || '') + '</span>' + (dateStr ? '<span>' + dateStr + '</span>' : '') + '</div></div></div>';
    }

    function renderArticles() {
        if (!container) return;

        var filtered = getFilteredArticles();
        updateFilterInfo();

        // Build hero grid
        var heroHtml = '';
        if (filtered.length >= 1) {
            heroHtml = '<div class="dn-hero">';
            heroHtml += renderCard(filtered[0], true, 0);
            var sideCount = Math.min(filtered.length - 1, 4);
            for (var i = 1; i <= sideCount; i++) {
                heroHtml += renderCard(filtered[i], false, i);
            }
            heroHtml += '</div>';
        } else {
            heroHtml = '';
        }
        if (heroGrid) heroGrid.innerHTML = heroHtml;

        // Below-grid content
        var belowHtml = '';
        var startIdx = filtered.length >= 1 ? Math.min(filtered.length, 5) : 0;
        if (startIdx < filtered.length) {
            belowHtml += '<div class="dn-grid-below"><h3>Bài viết trước</h3><div class="dn-grid">';
            for (var j = startIdx; j < filtered.length; j++) {
                belowHtml += renderCard(filtered[j], false, j);
            }
            belowHtml += '</div></div>';
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
        showSkeleton();
        try {
            var snap = await window.db.collection('daily-articles').orderBy('order', 'asc').get();
            dnArticles = [];
            snap.forEach(function(doc) { dnArticles.push({ id: doc.id, ...doc.data() }); });
            dnArticles.reverse();
            renderArticles();
        } catch (e) {
            if (container) container.innerHTML = '<div class="dn-empty"><div class="dn-empty-icon">⚠️</div><h3>Lỗi tải dữ liệu</h3><p>' + escapeHtml(e.message) + '</p></div>';
        }
    }

    // =============================
    // Article Detail Modal
    // =============================
    window.dnOpenArticle = function(id) {
        var article = dnArticles.find(function(a) { return a.id === id; });
        if (!article) return;

        var dateStr = formatDate(article);
        var vocabList = article.vocabList || [];
        var grammarRaw = article.grammarNote || '';
        var koContent = article.contentKorean || '';
        var viContent = article.contentVietnamese || '';
        var thumbHtml = article.thumbnailUrl
            ? '<img class="dn-modal-thumb" src="' + escapeHtml(article.thumbnailUrl) + '" alt="" onerror="this.style.display=\'none\'">'
            : '';

        // KR tab
        var krHtml = '<div class="kr-text">' + koContent + '</div>';

        // VN tab — sentence pairs
        var vnHtml = '';
        var koLines = koContent.split('\n').filter(function(l) { return l.trim(); });
        var viLines = viContent.split('\n').filter(function(l) { return l.trim(); });
        var maxLines = Math.max(koLines.length, viLines.length);
        if (maxLines > 0) {
            for (var i = 0; i < maxLines; i++) {
                var koLine = koLines[i] || '';
                var viLine = viLines[i] || '';
                vnHtml += '<div class="dn-sentence-pair"><div class="dn-sentence-ko">' + koLine + '</div>' + (viLine ? '<div class="dn-sentence-vi">' + viLine + '</div>' : '') + '</div>';
            }
        } else {
            vnHtml = '<div style="color:#94a3b8;text-align:center;padding:20px;">Chưa có bản dịch</div>';
        }

        // Vocab tab — 2-column grid, format word:meaning
        var vocabHtml = '';
        if (vocabList.length > 0) {
            vocabHtml = '<div class="dn-vocab-grid">';
            vocabList.forEach(function(v) {
                var colonIdx = v.indexOf(':');
                var word, meaning;
                if (colonIdx !== -1) {
                    word = v.substring(0, colonIdx).trim();
                    meaning = v.substring(colonIdx + 1).trim();
                } else {
                    // fallback for old pipe format
                    var parts = v.split('|');
                    word = (parts[0] || v).trim();
                    meaning = parts[1] ? parts[1].trim() : '';
                }
                vocabHtml += '<div class="dn-vocab-card"><div class="vc-word">' + escapeHtml(word) + '</div>' + (meaning ? '<div class="vc-mean">' + escapeHtml(meaning) + '</div>' : '') + '</div>';
            });
            vocabHtml += '</div>';
        } else {
            vocabHtml = '<div style="color:#94a3b8;text-align:center;padding:20px;">Chưa có từ vựng</div>';
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
                    '<div id="dnTab-vocab" class="dn-tab-panel" style="display:none;">' + vocabHtml + '</div>' +
                    '<div id="dnTab-grammar" class="dn-tab-panel" style="display:none;">' + grammarHtml + '</div>' +
                '</div>' +
                '<div class="dn-tab-bar">' +
                    '<button class="dn-tab-btn active" data-tab="kr" onclick="dnSwitchTab(\'kr\')"><span class="tab-label">🇰🇷 KR</span><span class="tab-icon">🇰🇷</span></button>' +
                    '<button class="dn-tab-btn" data-tab="vn" onclick="dnSwitchTab(\'vn\')"><span class="tab-label">🇻🇳 VN</span><span class="tab-icon">🇻🇳</span></button>' +
                    '<button class="dn-tab-btn" data-tab="vocab" onclick="dnSwitchTab(\'vocab\')"><span class="tab-label">📖 Từ vựng</span><span class="tab-icon">📖</span></button>' +
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
                if (typeof window.attachVocabTooltips === 'function') {
                    window.attachVocabTooltips();
                }
            },
            willClose: function() { delete window._dnActiveTab; }
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
    // Admin
    // =============================
    function buildFormHtml(article) {
        var t = article || {};
        return '<div style="text-align:left;">' +
            '<label style="font-weight:700;font-size:0.85em;color:#64748b;">Tiêu đề *</label>' +
            '<input id="swal-title" class="swal2-input" style="width:100%;margin-bottom:10px;" value="' + escapeHtml(t.title || '') + '" placeholder="Nhập tiêu đề bài báo">' +
            '<label style="font-weight:700;font-size:0.85em;color:#64748b;">Nguồn</label>' +
            '<input id="swal-source" class="swal2-input" style="width:100%;margin-bottom:10px;" value="' + escapeHtml(t.source || '') + '" placeholder="Ví dụ: Naver News, Yonhap...">' +
            '<label style="font-weight:700;font-size:0.85em;color:#64748b;">Link ảnh thumbnail</label>' +
            '<input id="swal-thumb" class="swal2-input" style="width:100%;margin-bottom:10px;" value="' + escapeHtml(t.thumbnailUrl || '') + '" placeholder="https://example.com/image.jpg">' +
            '<label style="font-weight:700;font-size:0.85em;color:#64748b;">Nội dung tiếng Hàn *</label>' +
            '<textarea id="swal-ko" class="swal2-textarea" style="width:100%;min-height:120px;margin-bottom:10px;" placeholder="Dán nội dung tiếng Hàn vào đây">' + escapeHtml(t.contentKorean || '') + '</textarea>' +
            '<label style="font-weight:700;font-size:0.85em;color:#64748b;">Nội dung tiếng Việt</label>' +
            '<textarea id="swal-vi" class="swal2-textarea" style="width:100%;min-height:80px;margin-bottom:10px;" placeholder="Dịch sang tiếng Việt (tuỳ chọn)">' + escapeHtml(t.contentVietnamese || '') + '</textarea>' +
            '<label style="font-weight:700;font-size:0.85em;color:#64748b;">Từ vựng (mỗi dòng: từ: nghĩa)</label>' +
            '<textarea id="swal-vocab" class="swal2-textarea" style="width:100%;min-height:60px;margin-bottom:10px;" placeholder="예를들다: ví dụ, làm mẫu\n주장하다: khẳng định, chủ trương">' + escapeHtml((t.vocabList || []).join('\n')) + '</textarea>' +
            '<label style="font-weight:700;font-size:0.85em;color:#64748b;">Ngữ pháp (mỗi dòng: Tiêu đề|Nội dung)</label>' +
            '<textarea id="swal-grammar" class="swal2-textarea" style="width:100%;min-height:60px;" placeholder="-도록|Dùng để diễn tả mục đích, kết quả mong muốn đạt được\n-기 때문에|Dùng để diễn tả nguyên nhân, lý do">' + escapeHtml(t.grammarNote || '') + '</textarea>' +
            '</div>';
    }

    function gatherFormData() {
        var title = (document.getElementById('swal-title').value || '').trim();
        var ko = (document.getElementById('swal-ko').value || '').trim();
        if (!title) { Swal.showValidationMessage('Vui lòng nhập tiêu đề'); return false; }
        if (!ko) { Swal.showValidationMessage('Vui lòng nhập nội dung tiếng Hàn'); return false; }
        var vi = (document.getElementById('swal-vi').value || '').trim();
        var source = (document.getElementById('swal-source').value || '').trim();
        var thumb = (document.getElementById('swal-thumb').value || '').trim();
        var rawVocab = (document.getElementById('swal-vocab').value || '').trim();
        var grammarNote = (document.getElementById('swal-grammar').value || '').trim();
        var vocabList = rawVocab ? rawVocab.split('\n').filter(function(l) { return l.trim(); }).map(function(l) { return l.trim(); }) : [];
        return { title: title, source: source, thumbnailUrl: thumb, contentKorean: ko, contentVietnamese: vi, vocabList: vocabList, grammarNote: grammarNote };
    }

    window.openCreateModal = function() {
        if (!dnIsAdmin) { Swal.fire({ icon: 'warning', title: 'Không có quyền' }); return; }
        Swal.fire({
            title: '➕ Thêm bài báo mới',
            width: 650, showCancelButton: true,
            confirmButtonText: 'Đăng bài', cancelButtonText: 'Huỷ',
            confirmButtonColor: '#4f46e5',
            html: buildFormHtml(), preConfirm: function() { return gatherFormData(); }
        }).then(async function(result) {
            if (!result.isConfirmed) return;
            try {
                var data = result.value;
                data.order = dnArticles.length;
                data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
                await window.db.collection('daily-articles').add(data);
                Swal.fire({ icon: 'success', title: 'Đã đăng!', timer: 1500, showConfirmButton: false });
                loadArticles();
            } catch (e) { Swal.fire({ icon: 'error', title: 'Lỗi', text: e.message }); }
        });
    };

    window.dnEditArticle = function(id) {
        var article = dnArticles.find(function(a) { return a.id === id; });
        if (!article) return;
        Swal.fire({
            title: '✏️ Chỉnh sửa bài báo',
            width: 650, showCancelButton: true,
            confirmButtonText: 'Lưu', cancelButtonText: 'Huỷ',
            confirmButtonColor: '#4f46e5',
            html: buildFormHtml(article), preConfirm: function() { return gatherFormData(); }
        }).then(async function(result) {
            if (!result.isConfirmed) return;
            try {
                await window.db.collection('daily-articles').doc(id).update(result.value);
                Swal.fire({ icon: 'success', title: 'Đã lưu!', timer: 1500, showConfirmButton: false });
                loadArticles();
            } catch (e) { Swal.fire({ icon: 'error', title: 'Lỗi', text: e.message }); }
        });
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
        datePicker.addEventListener('change', function() { dnSearchDate = datePicker.value; renderArticles(); });
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
            loadArticles();
        });
    }

    setTimeout(function() { initRain(); init(); }, 200);
});
