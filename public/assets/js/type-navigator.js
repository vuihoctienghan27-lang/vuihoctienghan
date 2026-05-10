(function () {
    'use strict';

    let navPanel = null;
    let navToggle = null;
    let isOpen = false;

    document.addEventListener('typeQuestionsLoaded', function () {
        buildNavigator();
        hookAnswerEvents();
    });

    function buildNavigator() {
        if (document.getElementById('question-nav-panel')) return;

        // Bỏ qua tạo navigator ở các trang không phải luyện dạng câu (hỗ trợ cả reading type_xx và writing type5x)
        if (!window.location.pathname.includes('type_') && !window.location.pathname.includes('type5')) return;

        // Tạo nút Toggle Navigator
        navToggle = document.createElement('button');
        navToggle.id = 'nav-toggle-btn';
        navToggle.className = 'nav-toggle-btn';
        navToggle.title = 'Danh sách câu hỏi';
        navToggle.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                <path d="M21 5c-1.11-.35-2.33-.5-3.5-.5-1.95 0-4.05.4-5.5 1.5-1.45-1.1-3.55-1.5-5.5-1.5S2.45 4.9 1 6v14.65c0 .25.25.5.5.5.1 0 .15-.05.25-.05C3.1 20.45 5.05 20 6.5 20c1.95 0 4.05.4 5.5 1.5 1.35-.85 3.8-1.5 5.5-1.5 1.65 0 3.35.3 4.75 1.05.1.05.15.05.25.05.25 0 .5-.25.5-.5V6c-.6-.45-1.25-.75-2-1zm0 13.5c-1.1-.35-2.3-.5-3.5-.5-1.7 0-4.15.65-5.5 1.5V8c1.35-.85 3.8-1.5 5.5-1.5 1.2 0 2.4.15 3.5.5v11.5z"/>
            </svg>
            <span class="nav-toggle-label">Câu hỏi</span>`;
        navToggle.addEventListener('click', togglePanel);
        document.body.appendChild(navToggle);

        // Tạo Panel khung chứa danh sách
        navPanel = document.createElement('div');
        navPanel.id = 'question-nav-panel';
        navPanel.className = 'question-nav-panel';
        navPanel.innerHTML = `
            <div class="nav-panel-header">
                <span class="nav-panel-title">📋 Luyện Dạng Câu</span>
                <button class="nav-panel-close" id="nav-close-btn" title="Đóng">✕</button>
            </div>
            <div id="nav-type-content" class="type-nav-content" style="padding: 10px 15px; height: calc(100% - 60px);"></div>`;
        document.body.appendChild(navPanel);

        document.getElementById('nav-close-btn').addEventListener('click', closePanel);

        renderList();
        
        // Mặc định cho hiện nút ghim ở luyện thi theo dạng
        navToggle.style.display = 'flex';
    }

    function renderList() {
        const content = document.getElementById('nav-type-content');
        if (!content) return;

        const container = document.getElementById('dynamic-questions-container');
        if (!container) return;
        
        // Trích xuất các nhãn ĐỀ và các khối CÂU HỎI
        const els = container.querySelectorAll('.exam-source-badge, .question-block');
        
        let groups = [];
        let currentGroup = null;
        let examCode = 'khac';

        els.forEach((el, index) => {
            if (el.classList.contains('exam-source-badge')) {
                // Nhãn đề có dạng: 📚 Trích từ: ĐỀ 35
                let text = el.innerText.replace('📚 Trích từ:', '').trim();
                currentGroup = { name: text, questions: [] };
                examCode = text.replace(/[^\w\d]/g, '').toLowerCase() || 'de';
                groups.push(currentGroup);
            } else if (el.classList.contains('question-block')) {
                if (!currentGroup) {
                    currentGroup = { name: 'V.Trí Chung', questions: [] };
                    examCode = 'chung';
                    groups.push(currentGroup);
                }
                const qNumEl = el.querySelector('.q-number');
                const qNum = qNumEl ? qNumEl.innerText.replace(/[^0-9]/g, '').trim() : '?';
                
                // Force unique ID to avoid scroll collision between identical question numbers
                let uniqueId = `q${qNum}-${examCode}-${index}`;
                el.id = uniqueId;

                currentGroup.questions.push({ id: uniqueId, num: qNum });
            }
        });

        let html = '';
        groups.forEach(g => {
            if (g.questions.length === 0) return;
            html += `<div class="nav-type-row" style="display: flex; align-items: center; border-bottom: 1px solid #f1f5f9;">`;
            html += `  <div style="width: 65px; font-weight: 800; color: #1e293b; font-size: 0.85em; text-transform: uppercase;">${g.name}</div>`;
            html += `  <div class="nav-type-qlist" style="display: flex; gap: 8px; flex-wrap: wrap; flex: 1;">`;
            g.questions.forEach(q => {
                html += `<button class="nav-q-btn" data-block-id="${q.id}" title="Câu ${q.num}">${q.num}</button>`;
            });
            html += `  </div>`;
            html += `</div>`;
        });

        content.innerHTML = html;

        // Xử lý sự kiện click câu hỏi
        content.querySelectorAll('.nav-q-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                scrollToBlock(btn.dataset.blockId);
                if (window.innerWidth < 768) closePanel();
            });
        });
        
        refreshGridColors();
    }

    function scrollToBlock(blockId) {
        let el = document.getElementById(blockId);
        if (!el) return;

        let parent = el.parentElement;
        if (parent && parent.firstElementChild && parent.firstElementChild.classList.contains('exam-source-badge')) {
            el = parent;
        }

        const navEl = document.getElementById('globalNavbar');
        const navH = navEl ? (navEl.offsetHeight + 30) : 85;
        const top = el.getBoundingClientRect().top + window.pageYOffset - navH;
        window.scrollTo({ top: top, behavior: 'smooth' });
    }

    function togglePanel() {
        if (isOpen) closePanel();
        else openPanel();
    }

    function openPanel() {
        isOpen = true;
        navPanel.classList.add('open');
        navToggle.classList.add('active');
        refreshGridColors();
    }

    function closePanel() {
        isOpen = false;
        navPanel.classList.remove('open');
        navToggle.classList.remove('active');
    }

    function refreshGridColors() {
        const content = document.getElementById('nav-type-content');
        if (!content) return;
        content.querySelectorAll('.nav-q-btn').forEach(btn => {
            const block = document.getElementById(btn.dataset.blockId);
            if (!block) return;
            const opts = block.querySelector('.options');
            if (!opts) return;
            
            btn.classList.remove('nav-q-correct', 'nav-q-wrong', 'nav-q-answered');
            if (opts.querySelector('.option.correct')) {
                btn.classList.add('nav-q-correct');
            } else if (opts.querySelector('.option.wrong')) {
                btn.classList.add('nav-q-wrong');
            } else if (opts.querySelector('.option.selected')) {
                btn.classList.add('nav-q-answered');
            }
        });
    }

    function hookAnswerEvents() {
        document.addEventListener('click', function (e) {
            if (!e.target.closest('.option')) return;
            setTimeout(refreshGridColors, 150);
        });
    }
})();
