/* ==========================================================================
   TOPIK EDTECH - JAVASCRIPT MASTER (BẢN FIX LỖI TẢI TRANG ĐỀ THI)
   ========================================================================== */

// RANDOM BACKGROUND GRADIENT CHO MỖI LẦN TRUY CẬP
(function() {
    const gradients = [
        'linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%)', // Tím nhạt - Xanh dương
        'linear-gradient(135deg, #fbc2eb 0%, #a6c1ee 100%)', // Hồng nhạt - Xanh lơ
        'linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%)', // Xanh biển - Xanh ngọc
        'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)', // Cam nhạt - Hồng đào
        'linear-gradient(135deg, #d4fc79 0%, #96e6a1 100%)', // Vàng chanh - Xanh lá nhạt
        'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)', // Hồng đào - Trắng hồng
        'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)', // Tím đậm - Hồng nhạt
        'linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%)', // Xanh mint - Xanh dương
        'linear-gradient(135deg, #fccb90 0%, #d57eeb 100%)', // Cam sữa - Tím môn
        'linear-gradient(135deg, #f8ffae 0%, #43c6ac 100%)', // Vàng nắng - Xanh ngọc
        'linear-gradient(135deg, #c3cfe2 0%, #f5f7fa 100%)', // Bạc sương - Trắng
        'linear-gradient(135deg, #fddb92 0%, #d1fdff 100%)'  // Vàng mật - Xanh băng
    ];
    const chosen = gradients[Math.floor(Math.random() * gradients.length)];
    // Ghi vào CSS variable VÀ trực tiếp vào body để tránh flash
    document.documentElement.style.setProperty('--random-bg-gradient', chosen);
    // Lưu vào sessionStorage để đồng bộ giữa các tab trong cùng phiên
    sessionStorage.setItem('bgGradient', chosen);
})();

document.addEventListener("DOMContentLoaded", function() {
    // Sử dụng TreeWalker để duyệt qua tất cả các nốt văn bản (Text Nodes) trên trang
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
    let node;
    
    // Regex tìm chuỗi có dạng hoặc và cả khoảng trắng dư thừa phía trước
    const citeRegex = /\s*\+\]/gi;
    
    while(node = walker.nextNode()) {
        // Nếu phát hiện đoạn text chứa mã rác, tiến hành xóa nó đi
        if (citeRegex.test(node.nodeValue)) {
            node.nodeValue = node.nodeValue.replace(citeRegex, "");
        }
    }
});

// 1. BIẾN TOÀN CỤC
let uid = null;
let myVocabList = [];
let examVocabList = [];
let currentStudyList = [];
let studyContext = '';

// Lưu trữ danh sách thư mục của user
window.userVocabLists = ['Đã lưu'];
window.savedVocabSet = new Set();

// ===== DARK MODE & GIAO DIỆN CHUNG (CHỜ TẢI TRANG XONG MỚI CHẠY) =====
document.addEventListener('DOMContentLoaded', () => {
    if (localStorage.getItem('darkMode') === 'true') document.body.classList.add('dark-mode');
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            document.body.classList.toggle('dark-mode');
            localStorage.setItem('darkMode', document.body.classList.contains('dark-mode'));
        });
    }

    // Navbar được quản lý bởi navbar.js (không inject ở đây)
});


// Đọc phát âm
function speakText(text) {
    if (!text || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text); u.lang = 'ko-KR'; u.rate = 0.85;
    window.speechSynthesis.speak(u);
}

// ========================================================
// ĐỒNG BỘ DỮ LIỆU USER & FOLDERS TỪ VỰNG
// ========================================================
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
                            
                            // Tự động chuyển Mặc định thành Đã lưu và ưu tiên hiển thị đầu
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

// ========================================================
// LOGIC GAME ĐỀ THI
// ========================================================
let isExamMode = false, isExamSubmitted = false, timeLeft = 70 * 60, examTimer = null;
let globalExamSeconds = 0; let globalExamInterval = null;

window.selectMode = (mode) => {
    document.body.classList.add('app-started');
    const startScreen = document.getElementById('startScreen');
    if (startScreen) startScreen.style.display = 'none';
    window.learningActive = true;
    if (mode === 'exam') {
        isExamMode = true;
        const ec = document.getElementById('examControls'); if (ec) ec.style.display = 'block';
        const tog = document.getElementById('globalVocabToggle');
        if (tog) { tog.checked = false; window.toggleGlobalVocab(); }
        startTimer();
    } else { isExamMode = false; }
    
    if (!globalExamInterval) {
        globalExamInterval = setInterval(() => {
            globalExamSeconds++;
            if (globalExamSeconds >= 60) {
                globalExamSeconds = 0;
                saveExamTime();
            }
        }, 1000);
    }
};

function saveExamTime() {
    if (typeof firebase === 'undefined' || !firebase.auth().currentUser) return;

    // Thời gian học (totalStudyMinutes / dailyStudyData) do activity-tracker.js đếm
    // (chạy song song trên mọi trang có activity-tracker) — không cộng lại ở đây.

    let sessionMins = parseInt(sessionStorage.getItem('studySessionMins') || '0');
    sessionMins++;
    sessionStorage.setItem('studySessionMins', sessionMins);

    let updates = {};

    if (sessionMins === 60) {
        updates.bonusEXP = firebase.firestore.FieldValue.increment(10);
        if (typeof Swal !== 'undefined') {
            Swal.fire({icon: 'success', title: 'Tuyệt vời!', text: '🎉 Chúc mừng! Bạn đã giải đề liên tục 1 giờ và nhận được 10 EXP!', confirmButtonColor: '#2563eb'});
        } else {
            alert("🎉 Chúc mừng! Bạn đã giải đề liên tục 1 giờ và nhận được 10 EXP!");
        }
    }
    if (Object.keys(updates).length > 0) {
        firebase.firestore().collection("users").doc(firebase.auth().currentUser.uid).set(updates, {merge: true});
    }
}

function startTimer() {
    if (examTimer) clearInterval(examTimer);
    timeLeft = 70 * 60; updateTimerDisplay();
    examTimer = setInterval(() => {
        timeLeft--; updateTimerDisplay();
        if (timeLeft <= 0) { clearInterval(examTimer); window.submitExam(); }
    }, 1000);
}
function updateTimerDisplay() {
    const m = Math.floor(timeLeft / 60), s = timeLeft % 60;
    const el = document.getElementById('timerDisplay');
    if (el) el.innerText = (m < 10 ? '0'+m : m) + ':' + (s < 10 ? '0'+s : s);
}

window.lastScrollPositionBeforeExplain = window.lastScrollPositionBeforeExplain || 0;

window.toggleExplain = (btn) => {
    const content = btn.nextElementSibling;
    if (!content) return;
    if (typeof Swal === 'undefined') {
        content.style.display = (content.style.display === 'block') ? 'none' : 'block';
        return;
    }
    const html = content.innerHTML;
    Swal.fire({
        title: '📖 Giải thích chi tiết',
        html: `<div class="explain-popup-body" style="text-align:left;max-height:70vh;overflow-y:auto;line-height:1.7;padding-right:4px;">${html}</div>`,
        width: 'min(920px, 95vw)',
        showConfirmButton: false,
        showCloseButton: true,
        background: 'var(--bg-card)',
        color: 'var(--primary-text)',
        customClass: { popup: 'explain-popup' }
    });
};

document.addEventListener('click', function(e) {
    if (e.target.closest('.btn-explain')) return;
    if (e.target.closest('.vocab-word') || e.target.closest('.review-link')) return;

    // Check if clicked the injected close button
    const isCloseBtn = e.target.closest('.btn-close-explain-injected');

    const openExplains = document.querySelectorAll('.explanation-content[style*="display: block"]');
    if (openExplains.length > 0) {
        openExplains.forEach(el => el.style.display = 'none');
        // Only scroll back if the user explicitly clicked the close button
        if (isCloseBtn) {
            window.scrollTo({ top: window.lastScrollPositionBeforeExplain, behavior: 'instant' });
        }
    }
});

window.toggleGlobalVocab = () => { 
    const tog = document.getElementById('globalVocabToggle'); 
    if (tog) {
        if (tog.checked) {
            document.body.classList.remove('vocab-disabled'); 
        } else {
            document.body.classList.add('vocab-disabled'); 
        }
    } else {
        document.body.classList.toggle('vocab-disabled');
    }
    localStorage.setItem('vocabEnabled', !document.body.classList.contains('vocab-disabled'));
};

window.checkAnswer = (el, isCorrect_Original) => {
    if (isExamSubmitted) return;
    const opts = el.parentElement.querySelectorAll('.option');
    if (isExamMode) { opts.forEach(opt => opt.classList.remove('selected')); el.classList.add('selected'); } 
    else {
        if (Array.from(opts).some(opt => opt.classList.contains('correct')) || el.classList.contains('wrong')) return;
        if (el.dataset.isCorrect === 'true' || isCorrect_Original) {
            el.classList.add('correct');
            const actArea = el.closest('.question-block')?.querySelector('.action-area');
            if (actArea) actArea.style.display = 'block';
        } else { el.classList.add('wrong'); }
    }
};

window.submitExam = () => {
    if (timeLeft > 0 && !confirm('Bạn có chắc muốn nộp bài không?')) return;
    clearInterval(examTimer); isExamSubmitted = true;
    const ec = document.getElementById('examControls'); if (ec) ec.style.display = 'none';
    let correctCount = 0, gridHTML = '';
    const blocks = document.querySelectorAll('.question-block');
    blocks.forEach((block, index) => {
        const optCont = block.querySelector('.options'); if (!optCont) return;
        const selOpt = optCont.querySelector('.option.selected');
        const corOpt = optCont.querySelector('[data-is-correct="true"]') || optCont.querySelector('[onclick*="true"]');
        let isCor = false;
        if (selOpt) {
            if (selOpt.dataset.isCorrect === 'true' || (selOpt.getAttribute('onclick') || '').includes('true')) { selOpt.classList.add('correct'); correctCount++; isCor = true; } 
            else { selOpt.classList.add('wrong'); if (corOpt) corOpt.classList.add('correct'); }
        } else if (corOpt) corOpt.classList.add('correct');
        const actArea = block.querySelector('.action-area'); if (actArea) actArea.style.display = 'block';
        const qNum = block.querySelector('.q-number'); const qText = qNum ? qNum.innerText.replace('.','').trim() : (index + 1);
        gridHTML += `<div class="q-status-item ${isCor ? 'q-correct' : 'q-wrong'}">${qText}</div>`;
    });
    const score = correctCount * 2;
    const ccEl = document.getElementById('correctCountText'); const tcEl = document.getElementById('totalCountText'); const fsEl = document.getElementById('finalScoreText'); const qsEl = document.getElementById('questionStatusGrid');
    if (ccEl) ccEl.innerText = correctCount; if (tcEl) tcEl.innerText = blocks.length; if (fsEl) fsEl.innerText = score; if (qsEl) qsEl.innerHTML = gridHTML;
    
    const circle = document.querySelector('.score-circle');
    if (circle) {
        circle.style.setProperty('--progress', '0%');
        if (score > 0) {
            let p = 0;
            const iv = setInterval(() => {
                if (p >= score) clearInterval(iv);
                else { p++; circle.style.setProperty('--progress', p + '%'); }
            }, 15);
        }
    }

    const rm = document.getElementById('examResultModal'); if (rm) rm.style.display = 'flex';
    if (score >= 60 && typeof confetti === 'function') confetti({ particleCount: 200, spread: 100, zIndex: 999999 });
    
    const tg = document.getElementById('globalVocabToggle'); 
    if (tg) { tg.checked = true; window.toggleGlobalVocab(); }
};

window.closeResultAndReview = () => { document.getElementById('examResultModal').style.display = 'none'; window.scrollTo({ top: 0, behavior: 'smooth' }); };
document.addEventListener("DOMContentLoaded", function() {
    // 1. Xóa các node văn bản chứa từ khóa rác
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
    let node;
    const garbageRegex = /\[?(cite|source)[:\s]*\d+\]?/gi;
    
    while(node = walker.nextNode()) {
        if (garbageRegex.test(node.nodeValue)) {
            node.nodeValue = node.nodeValue.replace(garbageRegex, "");
        }
    }

    // 2. Xóa các thẻ <cite> vật lý nếu hệ thống tự render thẻ
    const physicalCites = document.querySelectorAll('cite');
    physicalCites.forEach(el => el.remove());
});


// ===== TỰ ĐỘNG BƠM FOOTER VÀO CUỐI MỌI TRANG =====
document.addEventListener("DOMContentLoaded", function() {
    // Kiểm tra xem trang đã có footer chưa để tránh bị nhân đôi
    if (!document.getElementById('global-auto-footer')) {
        const footerHTML = `
        <footer id="global-auto-footer" class="global-footer">
            <div class="footer-content">
                <div class="footer-logo"><img src="assets/img/logo-navbar.png" alt="Vui Học Tiếng Hàn" style="height:32px;width:auto;display:inline-block;vertical-align:middle"></div>
                <p class="footer-slogan">Hệ thống học và luyện thi tiếng Hàn</p>
                <div class="footer-contact">
                    <span>Liên hệ:</span>
                    <a href="https://www.facebook.com/groups/vuihoctienghan.online" target="_blank" rel="noopener noreferrer" class="social-icon" aria-label="Facebook Group">
                        <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
                            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                        </svg>
                    </a>
                </div>
            </div>
        </footer>
        `;
        // Bơm vào vị trí cuối cùng của thẻ body
        document.body.insertAdjacentHTML('beforeend', footerHTML);
    }
});