/* ==========================================================================
   AUDIO.JS — Hệ Thống Phát Âm Thanh TOPIK (YouTube IFrame API)
   
   CHẾ ĐỘ LUYỆN TẬP:
     - Vào trang → CHỜ người dùng chọn chế độ, KHÔNG tự phát
     - Ấn icon 🔊 từng câu → phát đoạn đó, bộ đếm tính từ 0
       • Nếu hết audio mà chưa chọn đáp án → tự lặp lại câu đó
       • Sau khi chọn đáp án → audio phát hết rồi DỪNG (không sang câu sau)
   
   CHẾ ĐỘ THI THỬ:
     - Phát TOÀN BỘ file audio từ đầu đến cuối (không dùng timestamp)
     - Nút Play/Pause, tua, icon 🔊 từng câu đều BỊ VÔ HIỆU HÓA
     - Mở khóa lại hoàn toàn sau khi nộp bài & xem đáp án
   ========================================================================== */

// ===== BIẾN TRẠNG THÁI =====
let ytPlayer;
let isAudioPlaying = false;
let autoStopTimer;
let progressInterval;

// Snippet cho câu hỏi luyện tập (hiển thị thời gian tương đối)
let practiceSnippetStart = 0;
let practiceSnippetEnd   = 0;
let isPracticeLocked     = false; // true = đang phát đoạn câu hỏi riêng lẻ

// Trạng thái chế độ thi
let isExamModeLocked = false;  // true = đang ở chế độ thi (lock controls)
let isExamFinished   = false;  // true = đã nộp bài xong

// Hệ thống phát tuần tự từng câu (chế độ thi)
let questionAudioRanges    = [];
let currentExamQIdx        = -1;
let waitingForAnswer       = false;
let waitingQuestionBlockId = null;

// Hệ thống phát luyện tập (lặp nếu chưa trả lời)
let practiceCurrentBlock   = null; // block đang phát trong luyện tập
let practiceLoopActive     = false;
let isLoopEnabled          = false; // Nút Loop do người dùng điều khiển

// ===== 1. TẢI YOUTUBE API =====
(function loadYouTubeAPI() {
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    const first = document.getElementsByTagName('script')[0];
    first.parentNode.insertBefore(tag, first);
})();

// ===== 2. KHỞI TẠO PLAYER =====
function onYouTubeIframeAPIReady() {
    const container = document.getElementById('sticky-audio-player');
    const videoId   = container ? container.getAttribute('data-video-id') : '';
    if (!videoId) return;

    ytPlayer = new YT.Player('youtube-player-hidden', {
        height: '0',
        width:  '0',
        videoId: videoId,
        playerVars: { autoplay: 0, controls: 0, playsinline: 1, rel: 0 },
        events: {
            onReady:       onPlayerReady,
            onStateChange: onPlayerStateChange
        }
    });
}

function onPlayerReady(event) {
    const progressBar = document.getElementById('progress-bar');

    // Cập nhật tổng thời gian
    setTimeout(() => {
        const dur = ytPlayer.getDuration();
        progressBar.max = dur;
        document.getElementById('time-total').innerText = formatTime(dur);
    }, 1000);

    // Kéo thanh tiến trình → cập nhật số
    progressBar.addEventListener('input', function () {
        document.getElementById('time-current').innerText = formatTime(this.value);
    });

    // Khi thả thanh tiến trình → tua (trong phạm vi snippet nếu đang khóa)
    progressBar.addEventListener('change', function () {
        if (isExamModeLocked) return;
        let seekTo;
        if (isPracticeLocked) {
            // Khóa trong snippet: giá trị thanh là thời gian tương đối 0..dur
            const clampedVal = Math.min(Math.max(parseFloat(this.value), 0),
                practiceSnippetEnd - practiceSnippetStart - 0.2);
            seekTo = practiceSnippetStart + clampedVal;
        } else {
            seekTo = parseFloat(this.value);
        }
        ytPlayer.seekTo(seekTo, true);
        if (!isAudioPlaying) {
            if (isPracticeLocked) {
                ytPlayer.playVideo();
                startPracticePoller();
            } else {
                ytPlayer.playVideo();
            }
        } else if (isPracticeLocked) {
            // Đang phát, restart poller sau seek
            startPracticePoller();
        }
    });

    // KHÔNG tự phát khi player sẵn sàng — chờ người dùng chọn chế độ
    // Audio sẽ được kích hoạt bởi window.startPracticeAudio() sau khi selectMode()
}

// Được gọi từ exam.js sau khi chọn chế độ Luyện tập
window.startPracticeAudio = function() {
    setTimeout(() => {
        if (!isExamModeLocked) startFullAudioPractice();
    }, 500);
};

// ===== 3. SỰ KIỆN THAY ĐỔI TRẠNG THÁI PLAYER =====
function onPlayerStateChange(event) {
    const iconPlay  = document.getElementById('icon-play');
    const iconPause = document.getElementById('icon-pause');

    if (event.data === YT.PlayerState.PLAYING) {
        isAudioPlaying = true;
        if (iconPlay)  iconPlay.style.display  = 'none';
        if (iconPause) iconPause.style.display = 'block';

        // Cập nhật max / total trên thanh
        if (isPracticeLocked) {
            const dur = practiceSnippetEnd - practiceSnippetStart;
            document.getElementById('progress-bar').max = dur;
            document.getElementById('time-total').innerText = formatTime(dur);
        } else {
            const dur = ytPlayer.getDuration();
            if (dur > 0) {
                document.getElementById('progress-bar').max = dur;
                document.getElementById('time-total').innerText = formatTime(dur);
            }
        }

        progressInterval = setInterval(updateProgressBar, 500);

    } else {
        isAudioPlaying = false;
        if (iconPlay)  iconPlay.style.display  = 'block';
        if (iconPause) iconPause.style.display = 'none';
        clearInterval(progressInterval);
    }
}

// ===== 4. CẬP NHẬT THANH TIẾN TRÌNH =====
function updateProgressBar() {
    if (!ytPlayer || !isAudioPlaying) return;
    const cur = ytPlayer.getCurrentTime();
    if (isPracticeLocked) {
        let rel = cur - practiceSnippetStart;
        if (rel < 0) rel = 0;
        document.getElementById('progress-bar').value = rel;
        document.getElementById('time-current').innerText = formatTime(rel);
    } else {
        document.getElementById('progress-bar').value = cur;
        document.getElementById('time-current').innerText = formatTime(cur);
    }
}

// ===== 5. PHÁT FILE TỔNG (Chế độ Luyện tập khi chọn mode) =====
function startFullAudioPractice() {
    if (!ytPlayer || !ytPlayer.playVideo) return;
    isPracticeLocked     = false;
    practiceLoopActive   = false;
    practiceCurrentBlock = null;
    stopPracticePoller(); // Dừng bất kỳ poller nào đang chạy
    clearTimeout(autoStopTimer);

    // Khôi phục thanh tiến trình về toàn bộ thời lượng
    const dur = ytPlayer.getDuration();
    const bar = document.getElementById('progress-bar');
    if (bar) {
        bar.max   = dur || 0;
        bar.value = 0;
    }
    document.getElementById('time-current').innerText = '00:00';
    document.getElementById('time-total').innerText   = formatTime(dur);

    ytPlayer.seekTo(0, true);
    ytPlayer.playVideo();
}

// ===== 6. CONTROLS: Play/Pause, Tua, Dừng =====
window.togglePlayPause = function togglePlayPause() {
    if (isExamModeLocked) return;
    if (!ytPlayer || !ytPlayer.playVideo) return;

    if (isAudioPlaying) {
        // Tạm dừng
        ytPlayer.pauseVideo();
        clearTimeout(autoStopTimer);
        // Không dừng poller — để nó tiếp tục giám sát khi resume
    } else {
        if (isPracticeLocked && practiceSnippetEnd > 0) {
            // Snippet mode: luôn phát lại từ đầu timestamp của câu
            ytPlayer.seekTo(practiceSnippetStart, true);
            ytPlayer.playVideo();
            startPracticePoller();
        } else {
            ytPlayer.playVideo();
        }
    }
}

window.seekAudio = function seekAudio(seconds) {
    if (isExamModeLocked) return; // Khóa khi thi
    if (!ytPlayer || !ytPlayer.seekTo) return;

    const cur     = ytPlayer.getCurrentTime();
    let newTime   = cur + seconds;

    if (isPracticeLocked) {
        // Khời động lại poller sau khi tua (tránh timer cũ sai lệch)
        if (newTime < practiceSnippetStart) newTime = practiceSnippetStart;
        if (newTime > practiceSnippetEnd - 0.2) newTime = practiceSnippetEnd - 0.2;
        ytPlayer.seekTo(newTime, true);
        if (!isAudioPlaying) ytPlayer.playVideo();
        // Khởi động lại poller để đảm bảo biên được kiểm tra chính xác sau seek
        startPracticePoller();
    } else {
        const total = ytPlayer.getDuration();
        if (newTime < 0)     newTime = 0;
        if (newTime > total) newTime = total;
        ytPlayer.seekTo(newTime, true);
        if (!isAudioPlaying) ytPlayer.playVideo();
    }
}

window.stopAudio = function stopAudio() {
    if (isExamModeLocked) return;
    if (!ytPlayer || !ytPlayer.pauseVideo) return;
    stopPracticePoller();
    clearTimeout(autoStopTimer);
    ytPlayer.pauseVideo();

    if (isPracticeLocked) {
        // Snippet mode: seek về đầu snippet, giữ isPracticeLocked để Play tiếp theo vẫn là snippet
        ytPlayer.seekTo(practiceSnippetStart, true);
    } else {
        ytPlayer.seekTo(0, true);
    }
    document.getElementById('progress-bar').value = 0;
    document.getElementById('time-current').innerText = '00:00';
    // Giữ isPracticeLocked để lần Play tiếp theo chạy snippet
}

// ===== 7. ICON LOA TỪNG CÂU — Chế độ Luyện tập =====
window.playQuestionAudio = function playQuestionAudio(startSeconds, endSeconds, blockEl) {
    if (isExamModeLocked) return; // Khóa khi thi
    if (!ytPlayer || !ytPlayer.seekTo) {
        if (typeof Swal !== 'undefined') {
            Swal.fire({icon: 'info', title: 'Đang kết nối', text: 'Hệ thống âm thanh đang kết nối, vui lòng đợi vài giây!', confirmButtonColor: '#2563eb', timer: 3000});
        } else {
            alert('Hệ thống âm thanh đang kết nối, vui lòng đợi vài giây!');
        }
        return;
    }

    clearTimeout(autoStopTimer);
    practiceLoopActive = false;

    // Nếu không có blockEl, tự detect từ event (khi gọi qua onclick HTML)
    if (!blockEl) {
        const activeEl = document.activeElement;
        const speakerClicked = document.querySelector('.speaker-icon:focus') || activeEl;
        if (speakerClicked && speakerClicked.classList && speakerClicked.classList.contains('speaker-icon')) {
            blockEl = speakerClicked.closest('.question-block');
        }
        // Fallback: tìm block có speaker-icon với cùng startSeconds
        if (!blockEl) {
            document.querySelectorAll('.question-block').forEach(b => {
                const icon = b.querySelector('.speaker-icon');
                if (!icon) return;
                const oc = icon.getAttribute('onclick') || '';
                const m  = oc.match(/playQuestionAudio\((\d+)/);
                if (m && parseInt(m[1]) === startSeconds) blockEl = b;
            });
        }
    }
    practiceCurrentBlock = blockEl || null; // Lưu block để kiểm tra đáp án

    // Khóa snippet: hiển thị thời gian tương đối 0 → duration
    isPracticeLocked     = true;
    practiceSnippetStart = startSeconds;
    practiceSnippetEnd   = endSeconds || ytPlayer.getDuration();

    const dur = practiceSnippetEnd - practiceSnippetStart;
    const bar = document.getElementById('progress-bar');
    if (bar) {
        bar.max   = dur;
        bar.value = 0;
    }
    document.getElementById('time-current').innerText = '00:00';
    document.getElementById('time-total').innerText   = formatTime(dur);

    ytPlayer.seekTo(startSeconds, true);
    ytPlayer.playVideo();

    // Bắt đầu poller kiểm tra biên (thay cho setTimeout cố định)
    if (endSeconds && endSeconds > startSeconds) {
        startPracticePoller();
    }
}; // end window.playQuestionAudio

// ===== POLLER: Kiểm tra biên timestamp mỗi 100ms — dừng cứng, không cho audio chảy qua =====
let practicePoller = null;

function startPracticePoller() {
    stopPracticePoller();
    practicePoller = setInterval(function () {
        if (!ytPlayer || !isPracticeLocked || practiceSnippetEnd <= 0) return;

        const state = (typeof YT !== 'undefined') ? YT.PlayerState.PLAYING : 1;
        if (ytPlayer.getPlayerState() !== state) return; // chỉ kiểm tra khi đang phát

        const cur = ytPlayer.getCurrentTime();

        if (cur >= practiceSnippetEnd - 0.12) {
            // Phần tâm điểm kết thúc: seek về đầu snippet rồi pause
            stopPracticePoller();
            ytPlayer.seekTo(practiceSnippetStart, true);
            ytPlayer.pauseVideo();

            // Reset bộ đếm về 0
            setTimeout(function () {
                document.getElementById('progress-bar').value = 0;
                document.getElementById('time-current').innerText = '00:00';
            }, 80);

            const answered = practiceCurrentBlock
                ? isBlockAnswered(practiceCurrentBlock)
                : false;

            if (!answered && isLoopEnabled) {
                // Loop bật và chưa trả lời → phát lại sau 400ms
                setTimeout(function () {
                    if (!isPracticeLocked) return;
                    ytPlayer.playVideo();
                    startPracticePoller();
                }, 450);
            }
            // Nếu đã trả lời hoặc loop tắt: dừng hẳn (isPracticeLocked vẫn true,
            // lần Play tiếp theo vẫn là snippet)
        }
    }, 100);
}

function stopPracticePoller() {
    if (practicePoller) {
        clearInterval(practicePoller);
        practicePoller = null;
    }
}

// Giữ tương thích ngược — bây giờ chỉ gọn redirect về startPracticePoller
function scheduleQuestionEnd(durationSec) { startPracticePoller(); }

// Kiểm tra block đã có đáp án được chọn chưa
function isBlockAnswered(block) {
    if (!block) return false;
    const opts = block.querySelector('.options');
    if (!opts) return false;
    return opts.querySelector('.option.selected') !== null
        || opts.querySelector('.option.correct')  !== null
        || opts.querySelector('.option.wrong')     !== null;
}

// ===== 8. GỌI KHI NGƯỜI DÙNG CHỌN ĐÁP ÁN — Dừng ngay và reset về đầu snippet =====
window.onAnswerSelected = function (questionBlockElement) {
    // [YÊU CẦU MỚI] Dù chọn đáp án rồi nhưng vẫn giữ nguyên để phát nốt toàn bộ timestamp của câu hiện tại.
    // Không force pauseVideo() hay clearTimeout() ở đây nữa.
    // Hệ thống sẽ tự dừng khi audio chạm practiceSnippetEnd nhờ vào bộ poller.
};

// ===== API: Toggle nút Loop =====
window.toggleLoop = function () {
    isLoopEnabled = !isLoopEnabled;
    const btn = document.getElementById('btn-loop');
    if (btn) {
        btn.classList.toggle('active', isLoopEnabled);
        btn.title = isLoopEnabled ? 'Tắt lặp lại câu' : 'Lặp lại câu';
    }
};

// ===== API: Phát lại toàn bộ file tổng từ đầu =====
window.resetToFullAudio = function () {
    if (isExamModeLocked) return;
    stopPracticePoller();
    clearTimeout(autoStopTimer);
    isPracticeLocked   = false;
    practiceCurrentBlock = null;
    isLoopEnabled      = false;
    const loopBtn = document.getElementById('btn-loop');
    if (loopBtn) loopBtn.classList.remove('active');
    startFullAudioPractice();
};

// ===== 9. HỆ THỐNG PHÁT TUẦN TỰ (Chế độ THI THỬ) =====
function collectQuestionAudioRanges() {
    questionAudioRanges = [];
    document.querySelectorAll('.question-block').forEach(block => {
        const icon = block.querySelector('.speaker-icon');
        if (!icon) return;
        const onclick = icon.getAttribute('onclick') || '';
        const match   = onclick.match(/playQuestionAudio\((\d+),\s*(\d+)/);
        if (match) {
            const s = parseInt(match[1]);
            const e = parseInt(match[2]);
            if (s > 0 || e > 0) {
                questionAudioRanges.push({ blockId: block.id, start: s, end: e, element: block });
            }
        }
    });
    questionAudioRanges.sort((a, b) => a.start - b.start);
}

// Phát toàn bộ file audio (chế độ THI THỬ) — không dùng timestamp
window.startExamFullAudio = function () {
    if (!ytPlayer || !ytPlayer.seekTo) {
        setTimeout(() => window.startExamFullAudio(), 1000);
        return;
    }
    isPracticeLocked     = false;
    practiceLoopActive   = false;
    practiceCurrentBlock = null;
    clearTimeout(autoStopTimer);

    // Khôi phục thanh progress về tổng thời lượng file
    const dur = ytPlayer.getDuration();
    const bar = document.getElementById('progress-bar');
    if (bar) { bar.max = dur || 0; bar.value = 0; }
    document.getElementById('time-current').innerText = '00:00';
    document.getElementById('time-total').innerText   = formatTime(dur);

    ytPlayer.seekTo(0, true);
    ytPlayer.playVideo();
};

// Giữ lại hàm cũ để không gây lỗi nếu còn chỗ nào gọi
window.startSequentialPlayback = window.startExamFullAudio;

function playNextExamQuestion() {
    currentExamQIdx++;
    if (currentExamQIdx >= questionAudioRanges.length) return; // Hết

    const q   = questionAudioRanges[currentExamQIdx];
    const dur = q.end - q.start;
    if (dur <= 0) { playNextExamQuestion(); return; }

    // Cập nhật progress bar (đếm từ 0 cho câu hiện tại)
    isPracticeLocked     = true;
    practiceSnippetStart = q.start;
    practiceSnippetEnd   = q.end;

    const bar = document.getElementById('progress-bar');
    if (bar) { bar.max = dur; bar.value = 0; }
    document.getElementById('time-current').innerText = '00:00';
    document.getElementById('time-total').innerText   = formatTime(dur);

    ytPlayer.seekTo(q.start, true);
    ytPlayer.playVideo();

    clearTimeout(autoStopTimer);
    autoStopTimer = setTimeout(() => {
        ytPlayer.pauseVideo();
        if (isBlockAnswered(q.element)) {
            setTimeout(() => playNextExamQuestion(), 800);
        } else {
            // Chờ người dùng chọn đáp án
            waitingForAnswer       = true;
            waitingQuestionBlockId = q.blockId;
        }
    }, dur * 1000);
}

// ===== 10. KHÓA / MỞ KHÓA CONTROLS KHI THI THỬ =====
// Khóa: gọi khi bắt đầu chế độ thi
window.lockAudioForExam = function () {
    isExamModeLocked = true;

    // Disable thanh tiến trình
    const bar = document.getElementById('progress-bar');
    if (bar) { bar.disabled = true; bar.style.opacity = '0.4'; bar.style.cursor = 'not-allowed'; }

    // Disable các nút điều khiển
    document.querySelectorAll('#sticky-audio-player .btn-ctrl').forEach(btn => {
        btn.disabled = true;
        btn.style.opacity = '0.4';
        btn.style.cursor  = 'not-allowed';
    });

    // Disable tất cả icon loa từng câu
    document.querySelectorAll('.speaker-icon').forEach(icon => {
        icon.style.opacity       = '0.4';
        icon.style.cursor        = 'not-allowed';
        icon.style.pointerEvents = 'none';
    });
};

// Mở khóa: gọi sau khi nộp bài xong
window.unlockAudioAfterExam = function () {
    isExamModeLocked = false;
    isExamFinished   = true;
    isPracticeLocked = false;
    practiceLoopActive = false;
    waitingForAnswer   = false;
    clearTimeout(autoStopTimer);

    // Enable thanh tiến trình
    const bar = document.getElementById('progress-bar');
    if (bar) { bar.disabled = false; bar.style.opacity = '1'; bar.style.cursor = 'pointer'; }

    // Enable các nút điều khiển
    document.querySelectorAll('#sticky-audio-player .btn-ctrl').forEach(btn => {
        btn.disabled = false;
        btn.style.opacity = '1';
        btn.style.cursor  = 'pointer';
    });

    // Enable lại icon loa từng câu
    document.querySelectorAll('.speaker-icon').forEach(icon => {
        icon.style.opacity       = '1';
        icon.style.cursor        = 'pointer';
        icon.style.pointerEvents = 'auto';
    });

    // Reset về đầu file và cho phép tua lại
    if (ytPlayer && ytPlayer.pauseVideo) {
        ytPlayer.pauseVideo();
        ytPlayer.seekTo(0, true);
        const total = ytPlayer.getDuration();
        if (bar) { bar.max = total; bar.value = 0; }
        document.getElementById('time-current').innerText = '00:00';
        document.getElementById('time-total').innerText   = formatTime(total);
    }
};

// ===== 11. PHÍM TẮT =====
document.addEventListener('keydown', function (event) {
    const tag = event.target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    if (!ytPlayer || !ytPlayer.seekTo) return;
    if (isExamModeLocked) return; // Không điều khiển khi đang thi

    switch (event.code) {
        case 'Space':
            event.preventDefault();
            togglePlayPause();
            break;
        case 'ArrowRight':
            event.preventDefault();
            seekAudio(5);
            break;
        case 'ArrowLeft':
            event.preventDefault();
            seekAudio(-5);
            break;
    }
});

// ===== 12. FORMAT THỜI GIAN =====
function formatTime(seconds) {
    if (!seconds || isNaN(seconds)) return '00:00';
    seconds = Math.round(seconds);
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return (m < 10 ? '0' + m : m) + ':' + (s < 10 ? '0' + s : s);
}

// KHÓA mặc định khi ở màn hình chào mừng
document.addEventListener('DOMContentLoaded', () => {
    if (typeof window.lockAudioForExam === 'function') {
        window.lockAudioForExam();
    }
});