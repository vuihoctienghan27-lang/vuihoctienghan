/* ==========================================================================
   HERO-RAIN.JS — Hiệu ứng mưa chữ Hàn cho hero banner (dùng chung)
   - Tìm tất cả canvas có class .hero-rain-canvas bên trong .hero-section
   - Vẽ các ký tự Hàn rơi xuống như dailynews (mưa chữ chạy)
   ========================================================================== */
(function () {
    'use strict';

    var RAIN_CHARS = 'ㄱㄴㄷㄹㅁㅂㅅㅇㅈㅊㅋㅌㅍㅎㅏㅑㅓㅕㅗㅛㅜㅠㅡㅣ가나다라마바사아자차카타파하국문한글공부읽기쓰기말하기듣기배움지혜'.split('');

    function startRain(canvas) {
        if (!canvas || !canvas.getContext) return;
        var ctx = canvas.getContext('2d');
        var particles = [];
        var animId = null;

        function sizeCanvas() {
            var hero = canvas.closest('.hero-section');
            var w = hero ? hero.offsetWidth : canvas.parentElement ? canvas.parentElement.offsetWidth : canvas.width;
            var h = hero ? hero.offsetHeight : canvas.parentElement ? canvas.parentElement.offsetHeight : canvas.height;
            canvas.width = w;
            canvas.height = h;
        }

        function animate() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            for (var i = 0; i < particles.length; i++) {
                var p = particles[i];
                p.y += p.speed;
                p.x += Math.sin(p.y * p.wobbleSpeed) * p.wobble;
                if (p.y > canvas.height + 40) {
                    p.y = -20;
                    p.x = Math.random() * canvas.width;
                    p.char = RAIN_CHARS[Math.floor(Math.random() * RAIN_CHARS.length)];
                }
                ctx.font = p.size + 'px "Pretendard","Inter",sans-serif';
                ctx.fillStyle = 'rgba(255,255,255,' + p.opacity + ')';
                ctx.fillText(p.char, p.x, p.y);
            }
            animId = requestAnimationFrame(animate);
        }

        function init() {
            sizeCanvas();
            var count = 45;
            for (var i = 0; i < count; i++) {
                particles.push({
                    x: Math.random() * canvas.width,
                    y: Math.random() * canvas.height,
                    char: RAIN_CHARS[Math.floor(Math.random() * RAIN_CHARS.length)],
                    size: 13 + Math.random() * 18,
                    speed: 0.3 + Math.random() * 0.8,
                    opacity: 0.07 + Math.random() * 0.22,
                    wobble: Math.random() * 0.5,
                    wobbleSpeed: 0.01 + Math.random() * 0.03
                });
            }
            animate();
        }

        window.addEventListener('resize', sizeCanvas);
        init();
    }

    function initAll() {
        // CSS cho canvas (fill hero-bg, không chặn click)
        if (!document.getElementById('hero-rain-style')) {
            var st = document.createElement('style');
            st.id = 'hero-rain-style';
            st.textContent = '.hero-rain-canvas{position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;opacity:.5}';
            document.head.appendChild(st);
        }
        var canvases = document.querySelectorAll('.hero-rain-canvas');
        for (var i = 0; i < canvases.length; i++) startRain(canvases[i]);
    }

    // Chờ DOM sẵn sàng rồi chạy (hero là HTML tĩnh)
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initAll);
    } else {
        setTimeout(initAll, 100);
    }
})();
