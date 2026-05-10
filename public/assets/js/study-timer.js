/* ==========================================================================
   STUDY-TIMER.JS — Widget Khinh Khí Cầu (Đếm giờ & Truyền Động Lực)
   ========================================================================== */
(function () {
    'use strict';

    const IDLE_THRESHOLD_MS = 10 * 60 * 1000; // 10 phút idle → dừng đếm
    let lastActivity   = Date.now();
    let tabVisible     = !document.hidden;
    let timerInterval  = null;
    let timerEl        = null;
    let quoteEl        = null;
    let timeDisplay    = null;

    // Các câu nói truyền động lực (Việt & Hàn)
    const QUOTES = [
        "Cố lên! Bạn làm được mà! 🌟",
        "포기하지 마세요! (Đừng bỏ cuộc!) 💪",
        "Mỗi ngày một chút nỗ lực! 📚",
        "할 수 있어요! (Bạn có thể làm được!) ✨",
        "Tương lai đang chờ bạn! 🚀",
        "조금만 더 힘내요! (Cố thêm chút nữa nhé!) 🍀",
        "Học tập là con đường ngắn nhất! 🛤️",
        "잘하고 있어요! (Bạn đang làm rất tốt!) 👏",
        "Đừng nản lòng nhé! ❤️",
        "최선을 다합시다! (Hãy cố gắng hết sức!) 🔥"
    ];

    // Các avatar động vật
    const AVATARS = ["🐻", "🐰", "🐶", "🐱", "🐼", "🦊", "🐯"];
    const currentAvatar = AVATARS[Math.floor(Math.random() * AVATARS.length)];

    /* ---------- Quản lý Thời Gian (LocalStorage) ---------- */
    function getTodayKey() {
        const d = new Date();
        // Cố định múi giờ hoặc lấy ngày hiện tại chính xác
        return `study_time_v2_${d.getFullYear()}_${d.getMonth()+1}_${d.getDate()}`;
    }

    function cleanOldKeys(currentKey) {
        let keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('study_time_v2_') && key !== currentKey) {
                keysToRemove.push(key);
            }
        }
        keysToRemove.forEach(k => localStorage.removeItem(k));
    }

    let todayKey = getTodayKey();
    cleanOldKeys(todayKey);
    
    // Đọc an toàn
    let storedVal = localStorage.getItem(todayKey);
    let sessionSeconds = 0;
    if (storedVal && !isNaN(parseInt(storedVal))) {
        sessionSeconds = parseInt(storedVal);
    }

    // Kích hoạt tính điểm EXP cho activity-tracker.js
    window.learningActive = true;

    /* ---------- Theo dõi tương tác (Idle) ---------- */
    ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'].forEach(evt => {
        document.addEventListener(evt, () => { lastActivity = Date.now(); }, { passive: true });
    });

    document.addEventListener('visibilitychange', () => {
        tabVisible = !document.hidden;
        if (!document.hidden) lastActivity = Date.now();
    });

    function isIdle() {
        return (Date.now() - lastActivity) > IDLE_THRESHOLD_MS;
    }

    function formatTime(totalSeconds) {
        const h = Math.floor(totalSeconds / 3600);
        const m = Math.floor((totalSeconds % 3600) / 60);
        const s = totalSeconds % 60;
        if (h > 0) {
            return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
        }
        return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }

    /* ---------- Cập nhật mỗi giây ---------- */
    function tick() {
        // Kiểm tra qua ngày mới
        const currentTodayKey = getTodayKey();
        if (currentTodayKey !== todayKey) {
            todayKey = currentTodayKey;
            sessionSeconds = 0;
            cleanOldKeys(todayKey);
        }

        if (!tabVisible || isIdle()) {
            if (timerEl) timerEl.style.opacity = '0.4';
            return;
        }

        if (timerEl) timerEl.style.opacity = '1';
        sessionSeconds++;
        
        // Lưu an toàn
        try {
            localStorage.setItem(todayKey, sessionSeconds.toString());
        } catch (e) {
            console.warn("Storage quota exceeded", e);
        }
        
        if (timeDisplay) {
            timeDisplay.textContent = formatTime(sessionSeconds);
        }
    }

    /* ---------- Thay đổi câu nói ---------- */
    function changeQuote() {
        if (!quoteEl) return;
        const randomQuote = QUOTES[Math.floor(Math.random() * QUOTES.length)];
        quoteEl.style.opacity = '0';
        setTimeout(() => {
            quoteEl.textContent = randomQuote;
            quoteEl.style.opacity = '1';
        }, 300);
    }

    /* ---------- Tạo Giao Diện DOM ---------- */
    function buildWidget() {
        if (document.getElementById('study-balloon-widget')) return;

        // Random vị trí từ 15% đến 75% chiều cao màn hình (cố định bên trái)
        const randomTop = Math.floor(Math.random() * 60) + 15;

        timerEl = document.createElement('div');
        timerEl.id = 'study-balloon-widget';
        timerEl.style.cssText = `
            position: fixed;
            top: ${randomTop}%;
            left: 20px;
            z-index: 9990;
            display: flex;
            flex-direction: column;
            align-items: center;
            font-family: 'Pretendard', 'Inter', sans-serif;
            pointer-events: none;
            animation: floatBalloon 4s ease-in-out infinite;
        `;

        // Bóng thoại
        const speechBubble = document.createElement('div');
        speechBubble.style.cssText = `
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
            border: 2px solid #3b82f6;
            color: #1e3a8a;
            padding: 8px 14px;
            border-radius: 16px 16px 16px 4px;
            font-size: 0.85rem;
            font-weight: 700;
            margin-bottom: 10px;
            margin-left: 60px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            transition: opacity 0.3s ease;
            max-width: 180px;
            text-align: center;
            pointer-events: auto;
        `;
        speechBubble.id = 'balloon-quote';
        speechBubble.textContent = "Chào bạn! Bắt đầu học nào!";
        quoteEl = speechBubble;

        const balloonBody = document.createElement('div');
        balloonBody.style.cssText = `
            position: relative;
            display: flex;
            flex-direction: column;
            align-items: center;
            pointer-events: auto;
            cursor: pointer;
        `;

        balloonBody.innerHTML = `
            <div style="
                width: 70px; height: 80px;
                background: radial-gradient(circle at 30% 30%, #fca5a5, #ef4444);
                border-radius: 50% 50% 50% 50% / 40% 40% 60% 60%;
                box-shadow: inset -5px -5px 15px rgba(0,0,0,0.2), 0 5px 15px rgba(239, 68, 68, 0.4);
                position: relative;
                z-index: 2;
                display: flex;
                align-items: center;
                justify-content: center;
            ">
                <div id="balloon-time" style="
                    color: white; font-weight: 800; font-size: 0.9rem;
                    text-shadow: 1px 1px 2px rgba(0,0,0,0.5);
                    margin-top: -10px;
                ">00:00</div>
            </div>
            
            <div style="
                width: 30px; height: 20px;
                border-left: 2px solid #8b5cf6;
                border-right: 2px solid #8b5cf6;
                margin-top: -5px;
                position: relative;
                z-index: 1;
            "></div>
            
            <div style="
                width: 40px; height: 35px;
                background: linear-gradient(135deg, #d97706, #b45309);
                border-radius: 4px 4px 10px 10px;
                box-shadow: inset 0 -3px 5px rgba(0,0,0,0.3), 0 4px 8px rgba(0,0,0,0.2);
                position: relative;
                z-index: 3;
                display: flex;
                justify-content: center;
            ">
                <span style="font-size: 1.8rem; margin-top: -20px; filter: drop-shadow(0 2px 2px rgba(0,0,0,0.2));">${currentAvatar}</span>
            </div>
        `;

        timerEl.appendChild(speechBubble);
        timerEl.appendChild(balloonBody);

        if (!document.getElementById('study-timer-style')) {
            const style = document.createElement('style');
            style.id = 'study-timer-style';
            style.textContent = `
                @keyframes floatBalloon {
                    0%, 100% { transform: translateY(0) rotate(0deg); }
                    33% { transform: translateY(-8px) rotate(-2deg); }
                    66% { transform: translateY(4px) rotate(2deg); }
                }
                body.dark-mode #balloon-quote {
                    background: rgba(15, 23, 42, 0.9);
                    border-color: #60a5fa;
                    color: #93c5fd;
                }
                /* Không hiển thị trên điện thoại (màn hình < 768px) */
                @media (max-width: 768px) { 
                    #study-balloon-widget { display: none !important; } 
                }
                @media print { #study-balloon-widget { display: none !important; } }
            `;
            document.head.appendChild(style);
        }

        document.body.appendChild(timerEl);
        timeDisplay = document.getElementById('balloon-time');
        
        if (timeDisplay) timeDisplay.textContent = formatTime(sessionSeconds);
        setInterval(changeQuote, 15000);
    }

    function start() {
        buildWidget();
        timerInterval = setInterval(tick, 1000);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start);
    } else {
        start();
    }

})();
