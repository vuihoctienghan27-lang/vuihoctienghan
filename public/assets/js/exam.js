/* ==========================================================================
   EXAM.JS — Logic Game Đề Thi TOPIK II (70 phút) với SweetAlert2
   ========================================================================== */

document.addEventListener("DOMContentLoaded", function() {
    const walker1 = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
    let node;
    const citeRegex = /\s*\+\]/gi;
    while (node = walker1.nextNode()) {
        if (citeRegex.test(node.nodeValue)) {
            node.nodeValue = node.nodeValue.replace(citeRegex, "");
        }
    }

    const walker2 = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
    const garbageRegex = /\[?(cite|source)[:\s]*\d+\]?/gi;
    while (node = walker2.nextNode()) {
        if (garbageRegex.test(node.nodeValue)) {
            node.nodeValue = node.nodeValue.replace(garbageRegex, "");
        }
    }
    document.querySelectorAll('cite').forEach(el => el.remove());

    // Move speaker icon right next to question number
    document.querySelectorAll('.question-text').forEach(qText => {
        let qNum = qText.querySelector('.q-number');
        let spk = qText.querySelector('.speaker-icon');
        if (qNum && spk) {
            qNum.insertAdjacentElement('afterend', spk);
        }
    });
});

// ===== KHỞI TẠO MÀN HÌNH CHỌN CHẾ ĐỘ DỰA THEO TOPIC THI =====
document.addEventListener("DOMContentLoaded", function() {
    if (document.getElementById('startScreen')) return; 
    
    const path = window.location.pathname;
    if (path.includes('mypage.html') || path.includes('forum.html') || path.endsWith('index.html') || path === '/' || path.endsWith('.com/')) return;
    if (path.includes('type_')) return; // Không hiển thị màn hình chọn chế độ cho trang luyện theo dạng câu
    // Chế độ xem lại lịch sử: không hiện khung chọn chế độ + examControls (vẫn chạy auth-check để gọi applyReview)
    const reviewMode = !!new URLSearchParams(window.location.search).get('review');

    let isTopikI = path.includes('/topik_i/');
    let isTopikII = path.includes('/topik_ii/');
    let isReading = path.includes('/reading/');
    let isListening = path.includes('/listening/');
    
    let examNumMatch = path.match(/topik(\d+)\.html/);
    let examNumber = examNumMatch ? examNumMatch[1] : 'XX';

    let levelStr = isTopikI ? "TOPIK I" : (isTopikII ? "TOPIK II" : "TOPIK");
    let skillStr = isListening ? "듣기" : "읽기";
    let titleStr = `${levelStr} ${skillStr}`;
    let subtitleStr = `제${examNumber}회 • Hệ thống ôn luyện đa nhiệm`;

    let timeLimit = 70;
    if (isTopikII && isReading) timeLimit = 70;
    else if (isTopikI && isReading) timeLimit = 60;
    else if (isTopikII && isListening) timeLimit = 60;
    else if (isTopikI && isListening) timeLimit = 40;

    window.examTimeLimit = timeLimit;

    const startScreenHTML = `
    <div id="startScreen" style="display: flex; justify-content: center; align-items: flex-start; padding-top: 30px; padding-bottom: 30px; position: relative; z-index: 10;">
        <div class="modal-content" style="text-align: center; padding: 50px 30px; border: 1px solid rgba(255, 255, 255, 0.6); border-radius: 24px; box-shadow: 0 15px 35px rgba(0,0,0,0.05); max-width: 480px; width: 90%; background: rgba(255, 255, 255, 0.85); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);">
            <h2 style="color: #1a202c; font-size: 2.2em; font-weight: 800; margin-bottom: 8px; margin-top: 0; letter-spacing: -0.5px;">${titleStr}</h2>
            <p style="color: #718096; font-size: 1.1em; margin-bottom: 35px;">${subtitleStr}</p>
            
            <div id="startScreenContent" style="display: flex; flex-direction: column; gap: 15px; align-items: center;">
                <div id="authLoadingMsg" style="color:#94a3b8;font-size:1em;font-weight:600;padding:20px 0;">⏳ Đang kiểm tra...</div>
            </div>
        </div>
    </div>
    `;
    if (!reviewMode) {
        const container = document.querySelector('.container');
        if (container) {
            container.insertAdjacentHTML('beforebegin', startScreenHTML);
        } else {
            document.body.insertAdjacentHTML('afterbegin', startScreenHTML);
        }
    }

    // === AUTH GUARD: Chỉ cho phép làm bài khi đã đăng nhập ===
    function showExamModeButtons() {
        const content = document.getElementById('startScreenContent');
        if (!content) return;
        content.innerHTML = `
            <button class="mode-btn practice" onclick="selectMode('practice')" style="background: #fff; color: #2d3748; border: 1px solid #e2e8f0; border-left: 4px solid #3182ce; padding: 20px; text-align: left; width: 100%; border-radius: 8px; display: flex; flex-direction: column; gap: 5px; cursor: pointer; transition: 0.2s;">
                <span style="font-size: 1.1em; font-weight: bold; color: #2b6cb0;">📖 Chế độ Luyện Tập</span>
                <span style="font-size: 0.85em; color: #718096; font-weight: normal;">Chữa ngay từng câu, xem giải thích chi tiết</span>
            </button>
            <button class="mode-btn exam" onclick="selectMode('exam')" style="background: #fff; color: #2d3748; border: 1px solid #e2e8f0; border-left: 4px solid #e53e3e; padding: 20px; text-align: left; width: 100%; border-radius: 8px; display: flex; flex-direction: column; gap: 5px; cursor: pointer; transition: 0.2s;">
                <span style="font-size: 1.1em; font-weight: bold; color: #c53030;">⏱️ Chế độ Thi Thử</span>
                <span style="font-size: 0.85em; color: #718096; font-weight: normal;">Đếm ngược ${timeLimit} phút, nộp bài mới chấm điểm</span>
            </button>
        `;
    }

    function showLoginRequired() {
        const content = document.getElementById('startScreenContent');
        if (!content) return;
        content.innerHTML = `
            <div style="text-align:center;padding:10px 0;">
                <div style="font-size:3em;margin-bottom:15px;">🔒</div>
                <div style="font-weight:800;font-size:1.15em;color:#1a202c;margin-bottom:8px;">Yêu cầu đăng nhập</div>
                <div style="color:#718096;font-size:0.95em;margin-bottom:25px;">Bạn cần đăng nhập để làm đề thi và lưu kết quả.</div>
                <button id="examLoginBtn" onclick="doExamGoogleLogin()" style="background:#fff;color:#1f2937;border:1.5px solid #e2e8f0;padding:13px 28px;border-radius:10px;font-weight:700;font-size:1em;cursor:pointer;transition:0.2s;display:inline-flex;align-items:center;gap:10px;box-shadow:0 2px 8px rgba(0,0,0,0.08);" onmouseover="this.style.boxShadow='0 4px 16px rgba(0,0,0,0.13)'" onmouseout="this.style.boxShadow='0 2px 8px rgba(0,0,0,0.08)'">
                    <svg width="20" height="20" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
                    Đăng nhập bằng Google
                </button>
            </div>
        `;
    }

    // Wait for Firebase auth to resolve
    const _authCheck = setInterval(() => {
        if (typeof firebase !== 'undefined' && firebase.auth) {
            clearInterval(_authCheck);
            firebase.auth().onAuthStateChanged(user => {
                if (user) {
                    // Deep-link xem lại lịch sử làm đề: topikXX.html?review=<attemptId>
                    const reviewId = new URLSearchParams(window.location.search).get('review');
                    if (reviewId) {
                        // Không hiện màn hình chọn chế độ — vào thẳng trạng thái xem lại
                        const ss = document.getElementById('startScreen');
                        if (ss) ss.style.display = 'none';
                        setTimeout(() => { applyReview(reviewId); }, 300);
                    } else {
                        showExamModeButtons();
                    }
                } else {
                    // Xem lại lịch sử bắt buộc đăng nhập — chưa đăng nhập thì về trang chủ
                    if (new URLSearchParams(window.location.search).get('review')) {
                        window.location.href = '/index.html';
                    } else {
                        showLoginRequired();
                    }
                }
            });
        }
    }, 100);

    // Fallback: nếu sau 3s vẫn chưa có firebase, show login button
    setTimeout(() => {
        const msg = document.getElementById('authLoadingMsg');
        if (msg) showLoginRequired();
    }, 3000);


    // Tự động tạo examControls (timer + nút nộp bài) nếu chưa tồn tại trong HTML
    if (!reviewMode && !document.getElementById('examControls')) {
        const timerStr = (timeLimit < 10 ? '0' + timeLimit : timeLimit) + ':00';
        const examControlsHTML = `
        <div id="examControls">
            <div id="timerDisplay" class="timer-display">${timerStr}</div>
            <button class="btn-submit" onclick="submitExam()">📝 NỘP BÀI</button>
        </div>`;
        document.body.insertAdjacentHTML('afterbegin', examControlsHTML);
    }
});

// ===== TỰ ĐỘNG TẠO BẢNG ĐIỂM (MODAL KẾT QUẢ) VÀO CUỐI TRANG =====
document.addEventListener("DOMContentLoaded", function() {
    if (!document.getElementById('examResultModal')) {
        const resultModalHTML = `
        <div id="examResultModal" class="modal-overlay" style="z-index: 100000; display: none;">
            <div class="modal-content" style="text-align: center; min-height: auto; max-height: 95vh; padding: 35px 20px; justify-content: flex-start; max-width: 600px; overflow-y: auto; background: #fff; border-radius: 16px; position: relative;">
                <h2 id="resultTitleText" style="color: #2b6cb0; margin-top: 0; margin-bottom: 15px; font-size: 1.6em; font-weight: 800;">KẾT QUẢ BÀI LÀM!</h2>
                
                <div class="score-circle">
                    <div class="score-circle-content">
                        <span class="score-text" id="finalScoreText">0</span>
                        <span class="score-sub">/ 100</span>
                    </div>
                </div>
                
                <p style="font-size: 1.1em; color: #4a5568; font-weight: bold; margin-top: 0; margin-bottom: 25px;">
                    Bạn làm đúng <span id="correctCountText" style="color: #e53e3e; font-size: 1.2em;">0</span> / <span id="totalCountText">50</span> câu.
                </p>
                <div id="questionStatusGrid"></div>
                <button class="btn-submit" style="background: #48bb78; color: white; width: 100%; max-width: 250px; margin: 0 auto; padding: 12px; border-radius: 10px; border: none; font-weight: 800; cursor: pointer; font-size: 1.05em; transition: 0.2s;" onclick="closeResultAndReview()" onmouseover="this.style.filter='brightness(0.9)'" onmouseout="this.style.filter='brightness(1)'">👀 XEM ĐÁP ÁN CHI TIẾT</button>
            </div>
        </div>
        `;
        document.body.insertAdjacentHTML('beforeend', resultModalHTML);
    }
});

let isExamMode = false, isExamSubmitted = false, timeLeft = 70 * 60, examTimer = null;
let globalExamSeconds = 0, globalExamInterval = null;
let _savedVocabPref = null;

// ===== ĐĂNG NHẬP GOOGLE TỪ TRANG ĐỀ THI =====
window.doExamGoogleLogin = function() {
    const btn = document.getElementById('examLoginBtn');
    if (btn) { btn.disabled = true; btn.style.opacity = '0.6'; btn.innerHTML = '⏳ Đang đăng nhập...'; }
    if (typeof firebase === 'undefined' || !firebase.auth) {
        alert('Firebase chưa tải xong. Vui lòng thử lại sau vài giây.');
        if (btn) { btn.disabled = false; btn.style.opacity = '1'; }
        return;
    }
    const provider = new firebase.auth.GoogleAuthProvider();
    firebase.auth().signInWithPopup(provider)
        .then(() => {
            // onAuthStateChanged sẽ tự động gọi showExamModeButtons()
        })
        .catch(err => {
            console.error('Google login error:', err);
            if (btn) {
                btn.disabled = false;
                btn.style.opacity = '1';
                btn.innerHTML = '<svg width="20" height="20" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg> Đăng nhập bằng Google';
            }
            if (err.code !== 'auth/popup-closed-by-user') {
                alert('Đăng nhập thất bại. Vui lòng thử lại.');
            }
        });
};

window.selectMode = (mode) => {
    document.body.classList.add('app-started');
    const startScreen = document.getElementById('startScreen');
    if (startScreen) startScreen.style.display = 'none';
    window.learningActive = true;

    if (mode === 'exam') {
        isExamMode = true;
        window.isExamModeActive = true;
        // Giữ nguyên lockAudioForExam đã chạy: player bị khóa, speaker icons bị khóa
        const ec = document.getElementById('examControls');
        if (ec) {
            ec.style.display = 'block';
            const timerEl = document.getElementById('timerDisplay');
            if (timerEl) timerEl.style.display = '';
            const submitBtn = ec.querySelector('.btn-submit');
            if (submitBtn) { submitBtn.innerHTML = '📝 NỘP BÀI'; submitBtn.setAttribute('onclick', 'submitExam()'); }
        }

        // Chế độ THI THỬ nghe: phát TOÀN BỘ file audio từ đầu, không dùng timestamp
        if (window.location.pathname.includes('/listening/') && typeof window.startExamFullAudio === 'function') {
            setTimeout(() => window.startExamFullAudio(), 1500);
        }
        // Hiện navigator trong chế độ thi (nút danh sách câu hỏi + mở sẵn trên desktop)
        if (typeof window.showPracticeNavigator === 'function') {
            window.showPracticeNavigator();
        }
        
        // Khóa công tắc từ vựng trong chế độ thi
        _savedVocabPref = localStorage.getItem('vocabEnabled');
        const vocabBtn = document.getElementById('globalVocabBtn');
        if (vocabBtn) {
            vocabBtn.disabled = true;
            vocabBtn.style.opacity = '0.45';
            vocabBtn.style.cursor = 'not-allowed';
            vocabBtn.title = 'Tắt từ vựng trong chế độ thi';
        }
        document.body.classList.add('vocab-disabled');
        // Legacy fallback cho trang cũ dùng checkbox
        const tog = document.getElementById('globalVocabToggle');
        if (tog) { tog.checked = false; tog.disabled = true; tog.parentElement.style.opacity = '0.5'; tog.parentElement.style.pointerEvents = 'none'; if (typeof window.toggleGlobalVocab === 'function') window.toggleGlobalVocab(); }
        startTimer();
    } else {
        isExamMode = false;
        window.isExamModeActive = false; // Publish globally

        // Hiện nút LƯU KẾT QUẢ (ẩn đồng hồ đếm ngược)
        const ec = document.getElementById('examControls');
        if (ec) {
            ec.style.display = 'block';
            const timerEl = document.getElementById('timerDisplay');
            if (timerEl) timerEl.style.display = 'none';
            const submitBtn = ec.querySelector('.btn-submit');
            if (submitBtn) { submitBtn.innerHTML = '💾 LƯU KẾT QUẢ'; submitBtn.setAttribute('onclick', 'submitPractice()'); }
        }

        // Mở khóa toàn bộ audio controls cho chế độ luyện tập
        if (typeof window.unlockAudioAfterExam === 'function') {
            window.unlockAudioAfterExam();
        }
        // Chế độ LUYỆN TẬP: bắt đầu phát file audio tổng
        if (typeof window.startPracticeAudio === 'function') {
            window.startPracticeAudio();
        }
        // Hiện navigator
        if (typeof window.showPracticeNavigator === 'function') {
            window.showPracticeNavigator();
        }
    }

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
    // (chạy song song trên mọi trang đề thi) — không cộng lại ở đây để tránh đếm x2.

    let sessionMins = parseInt(sessionStorage.getItem('studySessionMins') || '0');
    sessionMins++;
    sessionStorage.setItem('studySessionMins', sessionMins);

    let updates = {};

    if (sessionMins === 60) {
        updates.bonusEXP = firebase.firestore.FieldValue.increment(10);
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                title: "Tuyệt vời!",
                text: "🎉 Chúc mừng! Bạn đã giải đề liên tục 1 giờ và nhận được 10 EXP!",
                icon: "success",
                confirmButtonColor: "#2563eb",
                confirmButtonText: "Đóng"
            });
        }
    }
    if (Object.keys(updates).length > 0) {
        firebase.firestore().collection("users").doc(firebase.auth().currentUser.uid).set(updates, { merge: true });
    }
}

function saveExamResult(score, correctCount, answeredCount, totalQuestions, answeredQuestions, correctQuestions, answers) {
    if (typeof firebase === 'undefined' || !firebase.auth().currentUser) {
        console.warn('[Exam] Không lưu kết quả: chưa đăng nhập hoặc Firebase chưa sẵn sàng.');
        return;
    }
    const uid = firebase.auth().currentUser.uid;
    const db = firebase.firestore();
    const userRef = db.collection('users').doc(uid);

    const path = window.location.pathname;
    let skill = 'reading';
    if (path.includes('/listening/')) skill = 'listening';
    else if (path.includes('/writing/')) skill = 'writing';

    let level = 'topik_ii';
    if (path.includes('/topik_i/')) level = 'topik_i';

    const numMatch = path.match(/topik(\d+)\.html/);
    const examId = `${skill}/${level}/topik${numMatch ? numMatch[1] : 'XX'}`;
    // Key an toàn cho field path (bỏ / và .)
    const examKey = examId.replace(/[^a-zA-Z0-9_]/g, '_');

    const headerEl = document.querySelector('.header');
    const examName = headerEl ? headerEl.innerText.trim() : examId;

    const totalSecs = window.examTimeLimit ? window.examTimeLimit * 60 : 0;
    const durationSeconds = Math.max(0, totalSecs - timeLeft);

    const attemptData = {
        examId: examId,
        examName: examName,
        skill: skill,
        level: level,
        mode: isExamMode ? 'exam' : 'practice',
        score: score,
        correctCount: correctCount,
        answeredCount: answeredCount,
        totalQuestions: totalQuestions,
        durationSeconds: durationSeconds,
        answered: answeredQuestions || [],
        correct: correctQuestions || [],
        answers: answers || [],
        submittedAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    const pAttempt = userRef.collection('examAttempts').add(attemptData);

    // Gộp theo đề: mỗi đề chỉ tính 1 lần, mỗi câu đã làm chỉ tính 1 lần (union, không cộng lũy tiến)
    const pStats = userRef.set({}, { merge: true }).then(() =>
        userRef.get().then(snap => {
            const d = snap.data() || {};
            const exams = (d.stats && d.stats.exams) || {};
            const cur = exams[examKey] || {};

            const answeredSet = new Set([...(cur.answered || []), ...(answeredQuestions || [])]);
            const correctSet = new Set([...(cur.correct || []), ...(correctQuestions || [])]);
            const best = Math.max(cur.best || 0, score);

            return userRef.update({
                [`stats.exams.${examKey}.id`]: examId,
                [`stats.exams.${examKey}.name`]: examName,
                [`stats.exams.${examKey}.answered`]: Array.from(answeredSet),
                [`stats.exams.${examKey}.correct`]: Array.from(correctSet),
                [`stats.exams.${examKey}.best`]: best
            });
        })
    );

    Promise.allSettled([pAttempt, pStats]).then(results => {
        const errors = results.filter(r => r.status === 'rejected').map(r => r.reason);
        if (errors.length) {
            console.error('[Exam] Lỗi lưu kết quả:', errors);
            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    icon: 'error',
                    title: 'Chưa lưu được kết quả',
                    text: 'Lỗi: ' + (errors[0]?.message || errors[0]?.code || 'không rõ') + '. Kiểm tra Firestore rules và đăng nhập.',
                    confirmButtonColor: '#2563eb'
                });
            }
        } else {
            console.log('[Exam] Đã lưu kết quả thành công.', attemptData);
        }
    });
}

function startTimer() {
    if (examTimer) clearInterval(examTimer);
    let initialMins = window.examTimeLimit ? window.examTimeLimit : 70;
    timeLeft = initialMins * 60;
    
    // Gắn giá trị hiển thị ban đầu cho đồng hồ trước khi interval chạy
    const timerEl = document.getElementById('timerDisplay');
    if(timerEl) timerEl.innerText = (initialMins < 10 ? '0' + initialMins : initialMins) + ':00';
    
    updateTimerDisplay();
    examTimer = setInterval(() => {
        timeLeft--;
        updateTimerDisplay();
        if (timeLeft <= 0) { 
            clearInterval(examTimer); 
            processSubmitExam(); 
        }
    }, 1000);
}

function updateTimerDisplay() {
    const m = Math.floor(timeLeft / 60), s = timeLeft % 60;
    const el = document.getElementById('timerDisplay');
    if (el) el.innerText = (m < 10 ? '0' + m : m) + ':' + (s < 10 ? '0' + s : s);
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
    // Không đóng nếu click vào nút mở giải thích
    if (e.target.closest('.btn-explain')) return;
    // Không đóng nếu click vào từ vựng / review link
    if (e.target.closest('.vocab-word') || e.target.closest('.review-link')) return;
    // Không đóng nếu click BÊN TRONG panel giải thích (trừ nút đóng)
    if (e.target.closest('.explanation-content') && !e.target.closest('.btn-close-explain-injected')) return;

    const isCloseBtn = e.target.closest('.btn-close-explain-injected');

    const openExplains = document.querySelectorAll('.explanation-content[style*="display: block"]');
    if (openExplains.length > 0) {
        openExplains.forEach(el => el.style.display = 'none');
        // Chỉ scroll về vị trí cũ khi bấm nút X
        if (isCloseBtn) {
            window.scrollTo({ top: window.lastScrollPositionBeforeExplain, behavior: 'instant' });
        }
    }
});


window.toggleGlobalVocab = () => {
    const tog = document.getElementById('globalVocabToggle');
    if (tog) {
        // Legacy checkbox mode
        if (tog.checked) {
            document.body.classList.remove('vocab-disabled');
        } else {
            document.body.classList.add('vocab-disabled');
        }
    } else {
        // Icon button mode - simple toggle
        document.body.classList.toggle('vocab-disabled');
    }
    localStorage.setItem('vocabEnabled', !document.body.classList.contains('vocab-disabled'));
};

// ===== HÀM TÍNH ĐIỂM THEO LOẠI CÂU HỎI TOPIK =====
// TOPIK I Đọc: câu 3 điểm và câu 2 điểm
const TOPIK_I_READING_3PT = [37, 38, 40, 41, 42, 43, 45, 46, 47, 51, 54, 56, 57, 60, 64, 66, 67, 68, 69, 70];

function getQuestionScore(qText) {
    const num = parseInt(String(qText).replace(/\D/g, ''));
    if (isNaN(num)) return 2;

    const path = window.location.pathname;
    const isTopikIReading = path.includes('/topik_i/') && path.includes('/reading/');

    if (isTopikIReading) {
        // TOPIK I Đọc: câu 31-70, mặc định 2 điểm, các câu trong mảng là 3 điểm
        return TOPIK_I_READING_3PT.includes(num) ? 3 : 2;
    }
    // Mặc định cho TOPIK II và các loại khác: 2 điểm
    return 2;
}

window.checkAnswer = (el, isCorrect_Original) => {
    if (isExamSubmitted) return;
    const opts = el.parentElement.querySelectorAll('.option');
    if (isExamMode) {
        opts.forEach(opt => opt.classList.remove('selected'));
        el.classList.add('selected');
    } else {
        if (Array.from(opts).some(opt => opt.classList.contains('correct')) || el.classList.contains('wrong')) return;
        
        // LUÔN HIỆN CHỖ XEM GIẢI THÍCH KHI ĐÃ CHỌN ĐÁP ÁN
        const actArea = el.closest('.question-block')?.querySelector('.action-area');
        if (actArea) actArea.style.display = 'block';

        if (el.dataset.isCorrect === 'true' || isCorrect_Original) {
            el.classList.add('correct');
        } else {
            el.classList.add('wrong');
        }
    }
    // Thông báo cho hệ thống audio khi đáp án được chọn (phát câu tiếp theo nếu đang chờ)
    const qBlock = el.closest('.question-block');
    if (qBlock && typeof onAnswerSelected === 'function') {
        onAnswerSelected(qBlock);
    }
};

window.submitExam = () => {
    if (isExamSubmitted) return;

    if (timeLeft > 0) {
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                title: "Xác nhận nộp bài?",
                text: "Bạn vẫn còn thời gian. Đáp án không thể thay đổi sau khi nộp!",
                icon: "warning",
                showCancelButton: true,
                confirmButtonColor: "#2563eb",
                cancelButtonColor: "#ef4444",
                confirmButtonText: "Nộp bài",
                cancelButtonText: "Hủy"
            }).then((result) => {
                if (result.isConfirmed) {
                    processSubmitExam();
                }
            });
        } else {
            if (confirm('Bạn có chắc muốn nộp bài không?')) processSubmitExam();
        }
    } else {
        processSubmitExam();
    }
};

window.submitPractice = () => {
    if (isExamSubmitted) return;
    if (typeof Swal !== 'undefined') {
        Swal.fire({
            title: "Lưu kết quả luyện tập?",
            text: "Số câu đã làm và điểm của bạn sẽ được ghi nhận.",
            icon: "question",
            showCancelButton: true,
            confirmButtonColor: "#2563eb",
            cancelButtonColor: "#ef4444",
            confirmButtonText: "Lưu kết quả",
            cancelButtonText: "Hủy"
        }).then((result) => {
            if (result.isConfirmed) processSubmitExam();
        });
    } else {
        if (confirm('Lưu kết quả luyện tập?')) processSubmitExam();
    }
};

function processSubmitExam() {
    // Chống nộp bài 2 lần (bấm nút + đồng hồ hết giờ cùng lúc, double-click...)
    if (isExamSubmitted) return;
    clearInterval(examTimer);
    isExamSubmitted = true;
    window.learningActive = false;

    const ec = document.getElementById('examControls');
    if (ec) ec.style.display = 'none';

    let correctCount = 0, totalScore = 0, answeredCount = 0, gridHTML = '';
    const answeredQuestions = [];
    const correctQuestions = [];
    const answerDetails = [];
    const blocks = document.querySelectorAll('.question-block');

    blocks.forEach((block, index) => {
        const optCont = block.querySelector('.options');
        if (!optCont) return;
        const selOpt = optCont.querySelector('.option.selected');
        const corOpt = optCont.querySelector('[data-is-correct="true"]') || optCont.querySelector('[onclick*="true"]');
        // CHỤP LẠI đáp án người dùng ĐÃ CHỌN ngay tại đây (trước khi thêm class hiển thị .correct/.wrong
        // cho đáp án đúng — tránh nhầm câu chưa làm thành câu đã chọn)
        const userChoice = selOpt || optCont.querySelector('.option.correct') || optCont.querySelector('.option.wrong');
        let isCor = false;

        const qNum = block.querySelector('.q-number');
        const qText = qNum ? qNum.innerText.replace('.', '').trim() : (index + 1);
        const questionPoints = getQuestionScore(qText);

        if (selOpt) {
            answeredCount++;
            answeredQuestions.push(String(qText));
            if (selOpt.dataset.isCorrect === 'true' || (selOpt.getAttribute('onclick') || '').includes('true')) {
                selOpt.classList.add('correct');
                correctCount++;
                correctQuestions.push(String(qText));
                totalScore += questionPoints; // 2 hoặc 3 điểm tùy câu
                isCor = true;
            } else {
                selOpt.classList.add('wrong');
                if (corOpt) corOpt.classList.add('correct');
            }
        } else if (!isExamMode) {
            // Practice mode: đáp án đã tick được đánh .correct / .wrong ngay khi chọn
            const practiceCorrect = optCont.querySelector('.option.correct');
            const practiceWrong = optCont.querySelector('.option.wrong');
            if (practiceCorrect || practiceWrong) {
                answeredCount++;
                answeredQuestions.push(String(qText));
                if (practiceCorrect) {
                    correctCount++;
                    correctQuestions.push(String(qText));
                    totalScore += questionPoints;
                    isCor = true;
                } else if (corOpt) {
                    corOpt.classList.add('correct');
                }
            } else if (corOpt) {
                corOpt.classList.add('correct');
            }
        } else if (corOpt) {
            corOpt.classList.add('correct');
        }

        // Lưu chi tiết đáp án người dùng đã chọn — CHỈ cho câu thực sự đã trả lời
        if (userChoice && answeredQuestions.includes(String(qText))) {
            const answerIndex = Array.from(optCont.querySelectorAll('.option')).indexOf(userChoice);
            answerDetails.push({ q: String(qText), answerIndex: answerIndex, correct: isCor });
        }

        const actArea = block.querySelector('.action-area');
        if (actArea) actArea.style.display = 'block';

        // Xanh = đúng, đỏ = sai, xám = chưa làm
        const stateCls = isCor ? 'q-correct' : (answeredQuestions.includes(String(qText)) ? 'q-wrong' : 'q-skipped');
        gridHTML += `<div class="q-status-item ${stateCls}">${qText}</div>`;
    });

    const score = totalScore;
    // Không lưu lịch sử nếu chưa trả lời câu nào (tránh auto-submit khi hết giờ tạo dữ liệu rác)
    if (answeredCount > 0) {
        saveExamResult(score, correctCount, answeredCount, blocks.length, answeredQuestions, correctQuestions, answerDetails);
    }
    const ccEl = document.getElementById('correctCountText');
    const tcEl = document.getElementById('totalCountText');
    const fsEl = document.getElementById('finalScoreText');
    const qsEl = document.getElementById('questionStatusGrid');
    if (ccEl) ccEl.innerText = correctCount;
    if (tcEl) tcEl.innerText = blocks.length;
    if (fsEl) fsEl.innerText = score;
    if (qsEl) qsEl.innerHTML = gridHTML;

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

    const rm = document.getElementById('examResultModal');
    if (rm) rm.style.display = 'flex';
    if (score >= 60 && typeof confetti === 'function') {
        confetti({ particleCount: 200, spread: 100, zIndex: 999999 });
    }

    // Mở khóa công tắc từ vựng
    const vocabBtn = document.getElementById('globalVocabBtn');
    if (vocabBtn) {
        vocabBtn.disabled = false;
        vocabBtn.style.opacity = '1';
        vocabBtn.style.cursor = 'pointer';
        vocabBtn.title = 'Bật/Tắt tra từ điển';
    }
    // Restore user vocab preference
    if (_savedVocabPref === 'false') {
        document.body.classList.add('vocab-disabled');
    } else {
        document.body.classList.remove('vocab-disabled');
    }
    const tg = document.getElementById('globalVocabToggle');
    if (tg) { tg.disabled = false; tg.parentElement.style.opacity = '1'; tg.parentElement.style.pointerEvents = 'auto'; tg.checked = true; if (typeof window.toggleGlobalVocab === 'function') window.toggleGlobalVocab(); }

    // Mở khóa navigator sau khi nộp bài — hiện với kết quả đúng/sai
    setTimeout(() => {
        if (typeof window.showExamNavigator === 'function') {
            window.showExamNavigator();
        }
    }, 600);

    // MỞ KHÓA AUDIO sau khi nộp bài — cho phép nghe lại từng câu bình thường
    if (typeof window.unlockAudioAfterExam === 'function') {
        window.unlockAudioAfterExam();
    }
}

// ===== XEM LẠI LỊCH SỬ LÀM ĐỀ (trạng thái như vừa nộp bài) =====
window.applyReview = async function (attemptId) {
    if (typeof firebase === 'undefined' || !firebase.auth().currentUser) return;
    const uid = firebase.auth().currentUser.uid;
    const db = firebase.firestore();

    // Ẩn màn hình chọn chế độ NGAY (không chờ tải dữ liệu) để không bị lóe
    const startScreen = document.getElementById('startScreen');
    if (startScreen) startScreen.style.display = 'none';
    document.body.classList.add('app-started');
    isExamSubmitted = true;
    window.learningActive = false;
    const ec = document.getElementById('examControls');
    if (ec) ec.style.display = 'none';

    const docSnap = await db.collection('users').doc(uid).collection('examAttempts').doc(attemptId).get();
    if (!docSnap.exists) {
        if (typeof Swal !== 'undefined') Swal.fire({ icon: 'error', title: 'Không tìm thấy', text: 'Không tìm thấy lịch sử làm đề này.', confirmButtonColor: '#2563eb' });
        return;
    }
    const a = docSnap.data();

    const correctSet = new Set((a.correct || []).map(String));
    const answersMap = {};
    (a.answers || []).forEach(x => { answersMap[String(x.q)] = x; });
    // Bài làm cũ (trước khi có tính năng) không lưu chi tiết từng câu
    const hasDetail = Array.isArray(a.correct) && a.correct.length > 0;

    let gridHTML = '';
    document.querySelectorAll('.question-block').forEach(block => {
        const optCont = block.querySelector('.options');
        const qNum = block.querySelector('.q-number');
        const qText = qNum ? qNum.innerText.replace('.', '').trim() : '';
        const opts = optCont ? Array.from(optCont.querySelectorAll('.option')) : [];
        const corOpt = opts.find(o => o.dataset.isCorrect === 'true' || (o.getAttribute('onclick') || '').includes('true'));
        const isCor = hasDetail && correctSet.has(qText);

        const ans = answersMap[qText];
        if (ans && opts[ans.answerIndex]) {
            // Đã trả lời → hiện đúng/sai + đáp án + giải thích
            if (ans.correct) {
                opts[ans.answerIndex].classList.add('correct', 'selected');
            } else {
                opts[ans.answerIndex].classList.add('wrong', 'selected');
                if (corOpt) corOpt.classList.add('correct');
            }
            const actArea = block.querySelector('.action-area');
            if (actArea) actArea.style.display = 'block';
        }
        // Chưa trả lời → giữ nguyên trạng thái, KHÔNG hiện đáp án/giải thích
        // (tô xám, giữ bí mật để người dùng có thể làm lại đề sau này)

        if (hasDetail) {
            const answered = !!answersMap[qText];
            const stateCls = isCor ? 'q-correct' : (answered ? 'q-wrong' : 'q-skipped');
            gridHTML += `<div class="q-status-item ${stateCls}">${qText}</div>`;
        }
    });

    // Đổ kết quả vào modal
    const ccEl = document.getElementById('correctCountText');
    const tcEl = document.getElementById('totalCountText');
    const fsEl = document.getElementById('finalScoreText');
    const qsEl = document.getElementById('questionStatusGrid');
    if (ccEl) ccEl.innerText = a.correctCount || correctSet.size;
    if (tcEl) tcEl.innerText = a.totalQuestions || document.querySelectorAll('.question-block').length;
    if (fsEl) fsEl.innerText = a.score || 0;
    if (qsEl) qsEl.innerHTML = hasDetail
        ? gridHTML
        : '<div style="color:#94a3b8; font-size:0.9em; padding:10px;">⚠️ Bài làm cũ chưa lưu chi tiết từng câu nên không hiển thị ôn lại được.</div>';

    const rm = document.getElementById('examResultModal');
    if (rm) rm.style.display = 'flex';

    // Khôi phục nút "Câu hỏi" (navigator) với màu xanh/đỏ/xám theo từng câu + tự mở bảng
    if (typeof window.showExamNavigator === 'function') {
        window.showExamNavigator();
    }

    // Mở khóa audio (trang listening) để xem lại từng câu
    if (typeof window.unlockAudioAfterExam === 'function') {
        window.unlockAudioAfterExam();
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.closeResultAndReview = () => {
    document.getElementById('examResultModal').style.display = 'none';
    window.scrollTo({ top: 0, behavior: 'smooth' });
};