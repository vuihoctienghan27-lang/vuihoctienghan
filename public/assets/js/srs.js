/* ==========================================================================
   SRS.JS — Ôn tập lặp lại ngắt quãng (Spaced Repetition) cho Sổ từ vựng cá nhân
   --------------------------------------------------------------------------
   Lưu thêm các trường vào users/{uid}/vocabulary/{id}:
     srsDue    (ms)   thời điểm đến hạn ôn
     srsInt    (ngày) khoảng cách ôn hiện tại
     srsEase   hệ số dễ (1.3 – 3.0), mặc định 2.5
     srsReps   số lần nhớ liên tiếp
     srsLapses số lần quên
     srsLastAt (ms)   lần ôn gần nhất
     srsFirstAt(ms)   lần đầu đưa vào lịch ôn (để giới hạn số từ mới / ngày)
   Thang đánh giá dùng đúng 3 nút flashcard sẵn có:
     1 = Chưa thuộc · 2 = Quen thuộc · 3 = Đã thuộc
   Đếm số lượt ôn mỗi ngày vào users/{uid}.dailyReviewData.{YYYY-MM-DD} (dùng cho Báo cáo tuần).
   ========================================================================== */
(function () {
    'use strict';

    const DAY = 86400000;
    const MAX_DUE_PER_SESSION = 30;
    const NEW_PER_DAY = 10;
    const RELEARN_MS = 10 * 60 * 1000;

    function localDateStr(d) {
        d = d || new Date();
        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    }
    function startOfToday() { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); }
    function endOfToday() { return startOfToday() + DAY - 1; }
    function savedAtMs(w) {
        const s = w.savedAt;
        if (!s) return 0;
        if (typeof s.toMillis === 'function') return s.toMillis();
        if (typeof s === 'number') return s;
        return 0;
    }

    function isRealWord(w) {
        return w && w.word && w.word !== '__folder_marker__' && w.id;
    }

    // Từ chưa từng được lên lịch → ước lượng hạn ôn theo trạng thái cũ (để người dùng cũ không bị dồn hàng nghìn từ)
    function virtualDue(w) {
        if (typeof w.srsDue === 'number') return w.srsDue;
        const st = w.status || 0;
        if (st === 0) return null;                    // từ mới → không tính là "đến hạn"
        const base = savedAtMs(w);
        if (!base) return 0;                          // không rõ ngày lưu → đến hạn luôn
        return base + (st === 1 ? 0 : st === 2 ? 3 * DAY : 7 * DAY);
    }

    // Tính lịch ôn mới sau khi người học tự đánh giá (rating 1/2/3)
    function computeReview(w, rating) {
        const now = Date.now();
        let ease = typeof w.srsEase === 'number' ? w.srsEase : 2.5;
        let reps = typeof w.srsReps === 'number' ? w.srsReps : 0;
        let lapses = typeof w.srsLapses === 'number' ? w.srsLapses : 0;
        let interval = typeof w.srsInt === 'number' ? w.srsInt : 0;
        let due;

        if (rating <= 1) {
            reps = 0;
            lapses += 1;
            interval = 0;
            ease = Math.max(1.3, ease - 0.2);
            due = now + RELEARN_MS;
        } else if (rating === 2) {
            interval = reps === 0 ? 1 : Math.max(interval + 1, interval * 1.5);
            ease = Math.max(1.3, ease - 0.05);
            reps += 1;
        } else {
            interval = reps === 0 ? 3 : reps === 1 ? Math.max(7, interval * ease) : interval * ease;
            ease = Math.min(3.0, ease + 0.1);
            reps += 1;
        }
        interval = Math.min(365, Math.round(interval * 10) / 10);
        if (rating > 1) due = startOfToday() + Math.round(interval) * DAY + 4 * 3600000; // 4h sáng ngày đến hạn

        const fields = {
            srsDue: due, srsInt: interval, srsEase: Math.round(ease * 100) / 100,
            srsReps: reps, srsLapses: lapses, srsLastAt: now
        };
        if (typeof w.srsFirstAt !== 'number') fields.srsFirstAt = now;
        return fields;
    }

    // Đổi trạng thái thủ công (bấm chấm màu trên lưới từ) → đặt lại lịch cho khớp trạng thái
    function manualFields(w, status) {
        const now = Date.now();
        if (status === 0) {
            const del = firebase.firestore.FieldValue.delete();
            return { srsDue: del, srsInt: del, srsEase: del, srsReps: del, srsLapses: del, srsLastAt: del, srsFirstAt: del };
        }
        const map = { 1: [0, 0], 2: [3, 1], 3: [7, 2] };
        const m = map[status] || [0, 0];
        return {
            srsDue: m[0] === 0 ? now : startOfToday() + m[0] * DAY + 4 * 3600000,
            srsInt: m[0], srsReps: m[1],
            srsEase: typeof w.srsEase === 'number' ? w.srsEase : 2.5,
            srsLastAt: now,
            srsFirstAt: typeof w.srsFirstAt === 'number' ? w.srsFirstAt : now
        };
    }

    function getAllWords() {
        return (window._allVocabData || []).filter(isRealWord);
    }

    // Tình hình hôm nay: số từ đến hạn, số từ mới còn được học
    function todayStats(words) {
        words = words || getAllWords();
        const end = endOfToday();
        const today0 = startOfToday();
        let dueCount = 0, newTotal = 0, newDoneToday = 0, reviewedToday = 0;
        words.forEach(w => {
            const d = virtualDue(w);
            if (d === null) newTotal++;
            else if (d <= end) dueCount++;
            if (typeof w.srsFirstAt === 'number' && w.srsFirstAt >= today0) newDoneToday++;
            if (typeof w.srsLastAt === 'number' && w.srsLastAt >= today0) reviewedToday++;
        });
        const newAvail = Math.min(newTotal, Math.max(0, NEW_PER_DAY - newDoneToday));
        return { dueCount, newTotal, newAvail, newDoneToday, reviewedToday, total: words.length };
    }

    // Danh sách thẻ cho buổi ôn hôm nay: từ đến hạn (quá hạn lâu nhất trước) + một ít từ mới
    function buildSession(words) {
        words = words || getAllWords();
        const end = endOfToday();
        const due = words.filter(w => { const d = virtualDue(w); return d !== null && d <= end; })
            .sort((a, b) => virtualDue(a) - virtualDue(b))
            .slice(0, MAX_DUE_PER_SESSION);
        const stats = todayStats(words);
        const fresh = words.filter(w => virtualDue(w) === null)
            .sort((a, b) => savedAtMs(a) - savedAtMs(b))
            .slice(0, stats.newAvail);
        // Trộn từ mới vào giữa để không bị dồn cuối buổi
        const list = due.slice();
        fresh.forEach((w, i) => list.splice(Math.min(list.length, (i + 1) * 3), 0, w));
        return list;
    }

    // Ghi kết quả ôn 1 thẻ (gọi từ vocab-game.js → updateWordStatus)
    function recordReview(id, rating) {
        const uid = window.currentUserUid;
        if (!uid || !id) return null;
        const w = (window._allVocabData || []).find(x => x.id === id) || {};
        const fields = computeReview(w, rating);
        Object.assign(w, fields); // cập nhật ngay trên bộ nhớ để thẻ "Chưa thuộc" lặp lại đúng lịch
        const db = firebase.firestore();
        db.collection('users').doc(uid).set({
            ['dailyReviewData']: { [localDateStr()]: firebase.firestore.FieldValue.increment(1) }
        }, { merge: true }).catch(() => {});
        return fields;
    }

    function escapeHtml(s) {
        return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    // Đang mở một bài học / thư mục (cá nhân hoặc lớp) → ẩn thẻ cho đỡ rối
    function isInDetailView() {
        /* global currentListView, currentFolderName */
        const lv = (typeof currentListView !== 'undefined' && currentListView) || window.currentListView;
        const fn = (typeof currentFolderName !== 'undefined' && currentFolderName);
        return !!(lv || fn || window.currentSharedFolderId);
    }

    // ── Thẻ "Hôm nay" trên đầu Sổ từ vựng ──
    let _mistakeCount = null;
    function renderStudyHub() {
        const box = document.getElementById('studyHubCard');
        if (!box) return;
        // Dải "Bài tập cần làm" (shared-vocab.js) cũng chỉ hiện ở màn hình chính
        const strip = document.getElementById('deadlineStrip');
        if (strip) strip.style.display = (isInDetailView() || !strip.innerHTML.trim()) ? 'none' : 'block';
        // Đang mở một bài học / thư mục chung → ẩn để không rối mắt
        if (isInDetailView()) { box.style.display = 'none'; return; }
        const words = getAllWords();
        if (!window._allVocabData) { box.style.display = 'none'; return; }
        box.style.display = 'block';

        const s = todayStats(words);
        const sessionSize = Math.min(MAX_DUE_PER_SESSION, s.dueCount) + s.newAvail;
        const allDone = sessionSize === 0;
        const mistakesTxt = _mistakeCount === null ? '…' : _mistakeCount;

        box.innerHTML = `
            <div class="sh-head">
                <div>
                    <div class="sh-title">🔁 Ôn tập hôm nay</div>
                    <div class="sh-sub">${allDone
                        ? (s.reviewedToday ? `Tuyệt! Bạn đã ôn ${s.reviewedToday} thẻ hôm nay. Hẹn gặp lại ngày mai 🎉` : (words.length ? 'Không có từ nào đến hạn hôm nay 🎉' : 'Hãy lưu vài từ vựng để bắt đầu ôn tập nhé!'))
                        : `Ôn đúng lúc sắp quên giúp nhớ lâu hơn nhiều so với học dồn.`}</div>
                </div>
                <button class="sh-start" ${allDone ? 'disabled' : ''} onclick="SRS.startTodaySession()">
                    ${allDone ? '✓ Xong hôm nay' : `▶ Ôn ngay (${sessionSize})`}
                </button>
            </div>
            <div class="sh-stats">
                <div class="sh-stat"><b class="sh-due">${s.dueCount}</b><span>đến hạn</span></div>
                <div class="sh-stat"><b class="sh-new">${s.newAvail}</b><span>từ mới hôm nay</span></div>
                <div class="sh-stat"><b class="sh-done">${s.reviewedToday}</b><span>đã ôn hôm nay</span></div>
                <a class="sh-stat sh-link" href="mistakes.html"><b class="sh-mis">${escapeHtml(mistakesTxt)}</b><span>câu sai cần ôn →</span></a>
            </div>`;
    }

    function loadMistakeCount() {
        const uid = window.currentUserUid;
        if (!uid || typeof firebase === 'undefined') return;
        firebase.firestore().collection('users').doc(uid).collection('mistakes')
            .where('mastered', '==', false).onSnapshot(snap => {
                _mistakeCount = snap.size;
                renderStudyHub();
            }, () => { _mistakeCount = 0; renderStudyHub(); });
    }

    function startTodaySession() {
        const list = buildSession();
        if (!list.length) {
            if (typeof Swal !== 'undefined') Swal.fire('Hoàn thành!', 'Hôm nay không còn từ nào cần ôn 🎉', 'success');
            return;
        }
        window._srsSession = {
            total: list.length,
            onDone: function (stats) {
                window._srsSession = null;
                if (typeof closeStudy === 'function') closeStudy();
                if (typeof confetti === 'function') confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
                if (typeof Swal !== 'undefined') {
                    Swal.fire({
                        icon: 'success',
                        title: 'Hoàn thành buổi ôn!',
                        html: `Bạn đã ôn <b>${stats.reviewed}</b> thẻ` +
                            (stats.again ? ` · <span style="color:#ef4444;">${stats.again} lần "Chưa thuộc"</span>` : '') +
                            `<br><span style="color:#64748b;font-size:0.9em;">Các từ sẽ tự xuất hiện lại đúng lúc bạn sắp quên.</span>`,
                        confirmButtonColor: '#2563eb'
                    });
                }
                renderStudyHub();
                if (window.Badges) setTimeout(() => window.Badges.check({ force: true }), 1500);
            }
        };
        if (typeof startStudy === 'function') {
            startStudy('flashcard', list);
            const t = document.getElementById('studyTitle');
            if (t) t.innerText = '🔁 Ôn tập hôm nay';
        }
    }

    function init() {
        loadMistakeCount();
        renderStudyHub();
        // Theo dõi việc chuyển màn hình (có rất nhiều chỗ đổi view) → chỉ vẽ lại khi trạng thái đổi
        let lastHidden = isInDetailView();
        setInterval(() => {
            const h = isInDetailView();
            if (h !== lastHidden) { lastHidden = h; renderStudyHub(); }
        }, 700);
        // Mở từ link ?review=1 (vd. từ MyPage) → tự bắt đầu buổi ôn khi dữ liệu đã tải
        try {
            if (new URLSearchParams(location.search).get('review') === '1') {
                let tries = 0;
                const t = setInterval(() => {
                    tries++;
                    if (window._allVocabData && typeof startStudy === 'function') { clearInterval(t); startTodaySession(); }
                    else if (tries > 40) clearInterval(t);
                }, 250);
            }
        } catch (e) {}
    }

    window.SRS = {
        computeReview, manualFields, recordReview, buildSession, todayStats, virtualDue,
        renderStudyHub, startTodaySession, init, localDateStr,
        NEW_PER_DAY, MAX_DUE_PER_SESSION
    };
})();
