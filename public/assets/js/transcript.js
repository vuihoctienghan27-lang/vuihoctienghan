/* ==========================================================================
   TRANSCRIPT.JS — Phụ đề đồng bộ theo audio, tích hợp trong player (navbar)

   - Transcript nằm bên trong #sticky-audio-player (không còn thanh fixed riêng).
   - Nút CC bật/tắt phụ đề.
   - Karaoke tô màu theo TỪNG CHỮ CÁI: chưa đọc màu đen, đã/đang đọc màu đỏ
     (ngắt xuống dòng vẫn theo cụm giữa các dấu cách để chữ không vỡ).
     Ưu tiên dùng Web Speech/ASR để lấy nhịp thật; nếu không có thì
     nội suy đều theo timestamp của câu.
   ========================================================================== */

(function () {
    'use strict';

    // ===== 1. STYLE =====
    function injectStyles() {
        if (document.getElementById('transcript-style')) return;
        const style = document.createElement('style');
        style.id = 'transcript-style';
        style.textContent = `
            #sticky-audio-player .transcript-line {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 10px;
                margin-top: 8px;
                padding-top: 8px;
                border-top: 1px dashed rgba(100,116,139,0.25);
                font-size: 21px;
                line-height: 1.5;
                color: #111827;
                min-height: 22px;
            }
            #sticky-audio-player .transcript-line.hidden { display: none; }
            #sticky-audio-player .transcript-chapter {
                flex-shrink: 0;
                font-weight: 700;
                color: #2563eb;
                background: #eff6ff;
                padding: 2px 10px;
                border-radius: 999px;
                font-size: 12px;
                white-space: nowrap;
            }
            #sticky-audio-player .transcript-text {
                flex: 1;
                max-width: 760px;
                text-align: center;
            }
            #sticky-audio-player .tr-tok { display: inline-block; }
            #sticky-audio-player .tr-ch { color: #111827; transition: color .08s; }
            #sticky-audio-player .tr-ch.done,
            #sticky-audio-player .tr-ch.active { color: #dc2626; }
            #sticky-audio-player .transcript-font-btn {
                flex-shrink: 0;
                cursor: pointer;
                background: rgba(255,255,255,0.6);
                border: 1px solid rgba(100,116,139,0.3);
                color: #334155;
                border-radius: 6px;
                min-width: 32px;
                height: 32px;
                font-size: 17px;
                font-weight: 800;
                line-height: 1;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                padding: 0 6px;
            }
            #sticky-audio-player .transcript-font-btn:hover {
                background: #eff6ff;
                color: #2563eb;
            }
            #btn-cc {
                font-weight: 800;
                font-size: 11px;
                letter-spacing: .5px;
                color: #64748b;
                border: 1px solid rgba(100,116,139,.25);
                border-radius: 6px;
                min-width: 30px;
                height: 30px;
                padding: 0 6px;
                flex-shrink: 0;
            }
            #btn-cc.active {
                background: #eff6ff;
                color: #2563eb;
                border-color: rgba(37,99,235,.35);
                box-shadow: 0 0 0 2px rgba(37,99,235,.15);
            }
            body.dark-mode #sticky-audio-player .transcript-line { color: #e2e8f0; border-top-color: rgba(255,255,255,.12); }
            body.dark-mode #sticky-audio-player .transcript-chapter { color: #93c5fd; background: rgba(59,130,246,.15); }
            body.dark-mode #sticky-audio-player .tr-ch { color: #e5e7eb; }
            body.dark-mode #sticky-audio-player .tr-ch.done,
            body.dark-mode #sticky-audio-player .tr-ch.active { color: #f87171; }
            body.dark-mode #sticky-audio-player .transcript-font-btn { color: #cbd5e1; border-color: rgba(255,255,255,.2); background: rgba(255,255,255,.06); }
            body.dark-mode #btn-cc { color: #cbd5e1; border-color: rgba(255,255,255,.2); }
            body.dark-mode #btn-cc.active { background: rgba(59,130,246,.2); color: #93c5fd; border-color: rgba(147,197,253,.4); }
            @media (max-width: 600px) {
                #sticky-audio-player .transcript-chapter { display: none; }
            }
        `;
        document.head.appendChild(style);
    }

    // ===== 2. TÌM CUE KHỚP THỜI ĐIỂM (binary search) =====
    function findCue(data, t) {
        let lo = 0, hi = data.length - 1, result = null;
        while (lo <= hi) {
            const mid = (lo + hi) >> 1;
            if (data[mid].start <= t) { result = data[mid]; lo = mid + 1; }
            else hi = mid - 1;
        }
        return result;
    }

    // ===== 3. WEB SPEECH / ASR — lấy biên từ (best-effort) =====
    // SpeechRecognition chỉ nghe được microphone nên ta "nghe" tiếng phát ra từ
    // loa để lấy nhịp từ thật. Nếu không hỗ trợ / không cấp quyền thì tự rơi về
    // nội suy đều (không ảnh hưởng hiệu ứng karaoke).
    let asrWords = [];
    let asrBaseTime = 0;
    let asrDisabled = false;
    let asrStarted = false;

    function startASR() {
        if (asrStarted || asrDisabled) return;
        asrStarted = true;
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SR) { asrDisabled = true; return; }

        let rec;
        try {
            rec = new SR();
            rec.lang = 'ko-KR';
            rec.continuous = true;
            rec.interimResults = true;

            rec.onstart = function () {
                asrBaseTime = (window.ytPlayer && window.ytPlayer.getCurrentTime)
                    ? window.ytPlayer.getCurrentTime() : 0;
            };
            rec.onresult = function (ev) {
                for (let i = ev.resultIndex; i < ev.results.length; i++) {
                    const alt = ev.results[i][0];
                    if (alt && alt.words && alt.words.length) {
                        alt.words.forEach(function (w) {
                            asrWords.push({
                                start: asrBaseTime + (w.startTime || 0),
                                end: asrBaseTime + (w.endTime || 0)
                            });
                        });
                    }
                }
            };
            rec.onend = function () { if (!asrDisabled) { try { rec.start(); } catch (e) {} } };
            rec.onerror = function () { asrDisabled = true; };
            rec.start();
        } catch (e) {
            asrDisabled = true;
        }
    }

    // Trả về progress (0..1) trong câu nếu ASR có đủ dữ liệu, ngược lại null
    function asrProgressFor(cue, t) {
        if (!asrWords.length) return null;
        const seg = asrWords.filter(function (w) {
            return w.start >= cue.start - 0.1 && w.end <= cue.end + 0.3;
        });
        if (seg.length < 3) return null;
        const done = seg.filter(function (w) { return w.end <= t; }).length;
        return Math.max(0, Math.min(1, (done + 0.5) / seg.length));
    }

    // ===== 4. KARAOKE RENDER (theo từng chữ cái) =====
    function escCh(s) {
        return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    // Tổng số chữ cái của câu (không tính dấu cách)
    function countChars(cue) {
        const tokens = cue.text.split(/\s+/).filter(Boolean);
        let n = 0;
        tokens.forEach(function (tk) { n += tk.length; });
        return n;
    }

    // charIdx: chỉ số chữ cái đang được đọc (0-based trên toàn câu)
    // Mỗi cụm (giữa 2 dấu cách) được bọc trong .tr-tok để xuống dòng
    // vẫn diễn ra theo cụm — nhưng màu chạy từng chữ cái bên trong.
    function renderCueChars(cue, charIdx) {
        const tokens = cue.text.split(/\s+/).filter(Boolean);
        if (!tokens.length) return '';
        let g = 0, out = '';
        tokens.forEach(function (tk) {
            let inner = '';
            for (let k = 0; k < tk.length; k++) {
                let cls = 'tr-ch';
                if (g + k < charIdx) cls += ' done';
                else if (g + k === charIdx) cls += ' active';
                inner += '<span class="' + cls + '">' + escCh(tk[k]) + '</span>';
            }
            g += tk.length;
            out += '<span class="tr-tok">' + inner + '</span> ';
        });
        return out.trim();
    }

    let lastText = null;
    let lastCharIdx = -1;

    function updateTranscript() {
        requestAnimationFrame(updateTranscript);

        if (!window.ytPlayer || typeof window.ytPlayer.getCurrentTime !== 'function') return;
        if (!window.TRANSCRIPT_DATA || !window.TRANSCRIPT_DATA.length) return;

        let t;
        try { t = window.ytPlayer.getCurrentTime(); } catch (e) { return; }
        if (typeof t !== 'number' || isNaN(t)) return;

        const cue = findCue(window.TRANSCRIPT_DATA, t);
        const textEl = document.getElementById('transcript-text');
        const chapEl = document.getElementById('transcript-chapter');
        if (!textEl) return;

        // Dung sai 0.2s để không bị "trắng phụ đề" giữa 2 dòng liền kề
        if (cue && t <= cue.end + 0.2) {
            if (chapEl) chapEl.textContent = cue.chapter || '';

            // Tính chỉ số chữ cái đang được đọc theo tiến độ trong câu
            const totalChars = countChars(cue);
            let charIdx = 0;
            if (totalChars > 1) {
                let progress = asrProgressFor(cue, t);
                if (progress === null) {
                    const dur = Math.max(0.001, cue.end - cue.start);
                    progress = Math.max(0, Math.min(1, (t - cue.start) / dur));
                }
                charIdx = Math.min(totalChars - 1, Math.floor(progress * totalChars));
            }

            // Chỉ cập nhật DOM khi dòng hoặc chữ cái thay đổi (tránh giật)
            if (cue.text !== lastText || charIdx !== lastCharIdx) {
                lastText = cue.text;
                lastCharIdx = charIdx;
                textEl.innerHTML = renderCueChars(cue, charIdx);
            }
        } else {
            if (lastText !== null) {
                textEl.textContent = '🎧 ...';
                lastText = null;
                lastCharIdx = -1;
            }
            if (chapEl) chapEl.textContent = '';
        }
    }

    // ===== 4.5 CỠ CHỮ PHỤ ĐỀ =====
    const TRANSCRIPT_FONT_SIZES = [16, 21, 26];
    let transcriptFontIdx = 1;

    function applyTranscriptFont() {
        const textEl = document.getElementById('transcript-text');
        if (textEl) textEl.style.fontSize = TRANSCRIPT_FONT_SIZES[transcriptFontIdx] + 'px';
    }

    function cycleTranscriptFont() {
        transcriptFontIdx = (transcriptFontIdx + 1) % TRANSCRIPT_FONT_SIZES.length;
        applyTranscriptFont();
    }

    // ===== 5. KHỞI ĐỘNG =====
    document.addEventListener('DOMContentLoaded', function () {
        injectStyles();

        // Đảm bảo transcript-line + nút CC tồn tại (dự phòng nếu HTML chưa thêm)
        const player = document.getElementById('sticky-audio-player');
        if (player) {
            if (!document.getElementById('transcript-line')) {
                const line = document.createElement('div');
                line.className = 'transcript-line';
                line.id = 'transcript-line';
                line.innerHTML =
                    '<span class="transcript-chapter" id="transcript-chapter"></span>' +
                    '<span class="transcript-text" id="transcript-text">🎧 Phụ đề sẽ hiện khi audio phát...</span>';
                player.appendChild(line);
            }
            if (!document.getElementById('btn-cc')) {
                const cc = document.createElement('button');
                cc.id = 'btn-cc';
                cc.className = 'btn-ctrl btn-cc active';
                cc.title = 'Ẩn phụ đề (CC)';
                cc.textContent = 'CC';
                const inner = player.querySelector('.player-inner');
                if (inner) inner.appendChild(cc);
            }
        }

        // Toggle CC
        const cc = document.getElementById('btn-cc');
        const line = document.getElementById('transcript-line');
        if (cc && line) {
            cc.addEventListener('click', function () {
                const hidden = line.classList.toggle('hidden');
                cc.classList.toggle('active', !hidden);
                cc.title = hidden ? 'Hiện phụ đề (CC)' : 'Ẩn phụ đề (CC)';
            });
        }

        // Nút điều chỉnh cỡ chữ phụ đề (bên phải ngoài cùng)
        if (!document.getElementById('transcript-font-btn')) {
            const fb = document.createElement('button');
            fb.id = 'transcript-font-btn';
            fb.className = 'transcript-font-btn';
            fb.title = 'Tăng/Giảm cỡ chữ phụ đề';
            fb.textContent = 'A+';
            const tl = document.getElementById('transcript-line');
            if (tl) tl.appendChild(fb);
        }
        const fb = document.getElementById('transcript-font-btn');
        if (fb) fb.addEventListener('click', cycleTranscriptFont);
        applyTranscriptFont();

        requestAnimationFrame(updateTranscript);
    });

    // Khởi động ASR ở lần người dùng phát audio đầu tiên (thao tác chủ động)
    document.addEventListener('click', function onFirstPlay(e) {
        if (asrStarted) return;
        if (e.target.closest('#btn-play-pause') || e.target.closest('.speaker-icon')) {
            startASR();
        }
    });
})();
