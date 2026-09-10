/* ==========================================================================
   HOME-PROGRESS.JS — Tiến độ cá nhân + thẻ đề hiện đại cho trang home
   (reading / listening / writing)
   - Đọc stats.exams (điểm cao nhất, câu đã làm, câu đúng) của user từ Firestore
   - Dựng thẻ đề hiện đại: cover gradient, trạng thái, thanh tiến độ, badge điểm
   ========================================================================== */
(function () {
    'use strict';

    var MAP = {};   // examKey -> { best, answered[], correct[], attempted }
    var USER = null;

    // Bảng màu cover gradient cho thẻ
    var COVERS = [
        ['#6366f1', '#8b5cf6'],
        ['#2563eb', '#06b6d4'],
        ['#0ea5e9', '#22d3ee'],
        ['#8b5cf6', '#ec4899'],
        ['#f59e0b', '#ef4444'],
        ['#10b981', '#3b82f6'],
        ['#ef4444', '#f97316'],
        ['#14b8a6', '#6366f1']
    ];

    function keyFor(skill, folder, num) {
        return skill + '_' + (folder || 'topik_ii') + '_topik' + num;
    }

    function load(skill, cb) {
        var tries = 0;
        (function wait() {
            tries++;
            // Chờ Firebase app được khởi tạo (auth.js load sau script inline)
            if (typeof firebase === 'undefined' || !firebase.auth || !firebase.apps || firebase.apps.length === 0) {
                if (tries < 80) setTimeout(wait, 250);
                return;
            }
            try {
                firebase.auth().onAuthStateChanged(function (user) {
                    if (!user) { if (cb) cb(); return; }
                    firebase.firestore().collection('users').doc(user.uid).get().then(function (doc) {
                        var d = doc.data() || {};
                        USER = d;
                        var exams = (d.stats && d.stats.exams) || {};
                        MAP = {};
                        Object.keys(exams).forEach(function (k) {
                            var e = exams[k] || {};
                            MAP[k] = {
                                best: e.best || 0,
                                answered: e.answered || [],
                                correct: e.correct || [],
                                attempted: (e.answered || []).length
                            };
                        });
                        if (cb) cb();
                    }).catch(function () { if (cb) cb(); });
                });
            } catch (e) {
                if (tries < 80) setTimeout(wait, 250);
            }
        })();
    }

    function getExam(key) { return MAP[key] || null; }

    // 'todo' = chưa làm | 'done' = đã làm | 'high' = điểm cao (>=60)
    function status(exam) {
        if (!exam || exam.attempted === 0) return 'todo';
        if (exam.best >= 60) return 'high';
        return 'done';
    }

    // totals(skill): nếu truyền skill ('reading'|'listening'|'writing') chỉ tính đề của kỹ năng đó
    // Công thức điểm trung bình đồng bộ với mypage: Tổng(best) / Tổng số đề đã làm
    function totals(skill) {
        var keys = Object.keys(MAP).filter(function (k) {
            if (!skill) return true;
            return k.indexOf(skill + '_') === 0;
        });
        var correct = 0, bestSum = 0;
        keys.forEach(function (k) {
            correct += (MAP[k].correct || []).length;
            bestSum += MAP[k].best || 0;
        });
        return {
            exams: keys.length,
            correct: correct,
            avg: keys.length ? Math.round(bestSum / keys.length) : 0,
            streak: (USER && USER.streakDays) || 0
        };
    }

    function escHtml(str) {
        if (!str) return '';
        return String(str).replace(/[&<>"']/g, function (t) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[t];
        });
    }

    function formatAttemptTime(ts) {
        if (!ts) return '';
        var d = ts.toDate ? ts.toDate() : new Date(ts);
        return d.getDate() + '/' + (d.getMonth() + 1) + '/' + d.getFullYear() + ' ' +
            String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
    }

    function formatDurationSec(secs) {
        secs = secs || 0;
        var m = Math.floor(secs / 60);
        var s = secs % 60;
        return m > 0 ? (m + ' phút' + (s ? ' ' + s + ' giây' : '')) : (s + ' giây');
    }

    // Mở modal danh sách đề đã làm (lọc theo kỹ năng), ấn vào để xem lại bài
    function openHistory(skill) {
        if (typeof Swal === 'undefined') return;
        if (typeof firebase === 'undefined' || !firebase.auth().currentUser) {
            Swal.fire({ icon: 'warning', title: 'Yêu cầu đăng nhập', text: 'Bạn cần đăng nhập để xem lịch sử làm đề!', confirmButtonColor: '#2563eb' });
            return;
        }
        var uid = firebase.auth().currentUser.uid;
        var db = firebase.firestore();
        var skillName = skill === 'listening' ? ' Nghe' : (skill === 'writing' ? ' Viết' : ' Đọc');

        Swal.fire({
            title: '📋 Lịch sử làm đề' + skillName,
            html: '<div style="text-align:center; color:#64748b; padding:20px;">Đang tải...</div>',
            showConfirmButton: false,
            showCloseButton: true,
            width: '640px',
            didOpen: function () {
                db.collection('users').doc(uid).collection('examAttempts')
                    .orderBy('submittedAt', 'desc').limit(50).get().then(function (snap) {
                    var modalBody = Swal.getHtmlContainer();
                    if (!modalBody) return;
                    if (snap.empty) {
                        modalBody.innerHTML = '<div style="text-align:center; color:#64748b; padding:24px;">Bạn chưa làm đề nào. Hãy chọn một bộ đề để bắt đầu nhé! 📚</div>';
                        return;
                    }
                    var rows = '';
                    snap.forEach(function (doc) {
                        var d = doc.data();
                        var examId = d.examId || '';
                        if (skill && examId.indexOf(skill + '/') !== 0) return;
                        var parts = examId.split('/');
                        var base = parts[2] || '';
                        var url = (parts[1] ? parts[1] + '/' + base : base) + '.html?review=' + doc.id;
                        var total = d.totalQuestions || 0;
                        rows += '' +
                            '<div onclick="window.location.href=\'' + url + '\'" style="display:flex; justify-content:space-between; align-items:center; gap:10px; background:#fff; border:1px solid #e2e8f0; border-radius:14px; padding:12px 14px; margin-bottom:8px; cursor:pointer; transition:0.15s;">' +
                                '<div style="min-width:0; flex:1;">' +
                                    '<div style="font-weight:800; color:#1e293b; font-size:0.98em; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">📝 ' + escHtml(d.examName || 'Đề thi') + '</div>' +
                                    '<div style="font-size:0.8em; color:#64748b; margin-top:3px;">🕒 Nộp lúc ' + formatAttemptTime(d.submittedAt) + ' · ⏱ ' + formatDurationSec(d.durationSeconds) + '</div>' +
                                '</div>' +
                                '<div style="text-align:right; flex-shrink:0; border-left:1px solid #e2e8f0; padding-left:12px;">' +
                                    '<div style="font-weight:900; color:#8b5cf6; font-size:1.1em;">' + (d.score || 0) + ' <span style="font-size:0.75em;">⭐</span></div>' +
                                    '<div style="font-size:0.78em; color:#10b981; font-weight:700; margin-top:2px;">Đúng ' + (d.correctCount || 0) + '/' + total + '</div>' +
                                    '<div style="font-size:0.75em; color:#94a3b8; font-weight:600;">' + (d.answeredCount || 0) + ' câu đã làm</div>' +
                                '</div>' +
                            '</div>';
                    });
                    modalBody.innerHTML = rows
                        ? '<div style="max-height:62vh; overflow-y:auto;">' + rows + '</div>'
                        : '<div style="text-align:center; color:#64748b; padding:24px;">Bạn chưa làm đề ' + skillName.trim() + ' nào.</div>';
                }).catch(function () {
                    var modalBody = Swal.getHtmlContainer();
                    if (modalBody) modalBody.innerHTML = '<div style="text-align:center; color:#ef4444; padding:20px;">⚠️ Lỗi tải dữ liệu.</div>';
                });
            }
        });
    }

    function cover(i) {
        var c = COVERS[i % COVERS.length];
        return 'linear-gradient(135deg,' + c[0] + ' 0%,' + c[1] + ' 100%)';
    }

    function badgeInfo(exam) {
        var st = status(exam);
        if (st === 'todo') return { cls: 'badge-todo', text: 'Chưa làm' };
        if (st === 'high') return { cls: 'badge-high', text: exam.best + ' ⭐' };
        return { cls: 'badge-done', text: exam.best > 0 ? (exam.best + 'đ') : 'Đã làm' };
    }

    // Thẻ đề thi (có tiến độ cá nhân)
    function buildExamCard(opts) {
        var exam = opts.exam || null;
        var st = exam ? status(exam) : 'todo';
        var b = badgeInfo(exam);
        var pct = 0, progText = '';
        if (exam && exam.attempted > 0) {
            var correct = (exam.correct || []).length;
            var total = opts.total || 50;
            pct = Math.min(100, Math.round(correct / total * 100));
            progText = 'Đúng ' + correct + '/' + total;
        }
        return '' +
            '<a href="' + opts.href + '" class="exam-card st-' + st + (opts.comingSoon ? ' coming-soon' : '') + '">' +
                '<div class="exam-cover" style="background:' + cover(opts.index) + ';">' + (opts.coverNum || '') + '</div>' +
                '<div class="exam-body">' +
                    '<div class="exam-title">' + opts.title + '</div>' +
                    '<div class="exam-sub">' + (opts.sub || '') + '</div>' +
                    // Luôn có dòng tiến độ (cùng chiều cao cho cả đề chưa làm) để thẻ bằng nhau
                    '<div class="exam-progress"><div class="pbar"><i style="width:' + pct + '%"></i></div><span>' + progText + '</span></div>' +
                '</div>' +
                '<div class="exam-right">' +
                    '<span class="exam-badge ' + b.cls + '">' + b.text + '</span>' +
                    '<svg class="exam-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="18" height="18"><path d="M9 18l6-6-6-6"/></svg>' +
                '</div>' +
            '</a>';
    }

    // Thẻ dạng câu (luyện theo dạng)
    function buildTypeCard(opts) {
        return '' +
            '<a href="' + opts.href + '" class="exam-card st-type' + (opts.comingSoon ? ' coming-soon' : '') + '">' +
                '<div class="exam-cover cover-type" style="background:' + cover(opts.index) + ';">' + (opts.coverText || '✏️') + '</div>' +
                '<div class="exam-body">' +
                    '<div class="exam-title">' + opts.title + '</div>' +
                    '<div class="exam-sub">' + (opts.sub || '') + '</div>' +
                    (opts.badgeHtml || '') +
                '</div>' +
                '<div class="exam-right">' +
                    (opts.comingSoon
                        ? '<span class="exam-badge badge-todo">Sắp ra mắt</span>'
                        : '<svg class="exam-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="18" height="18"><path d="M9 18l6-6-6-6"/></svg>') +
                '</div>' +
            '</a>';
    }

    window.HomeProgress = {
        load: load,
        getExam: getExam,
        status: status,
        totals: totals,
        keyFor: keyFor,
        openHistory: openHistory,
        buildExamCard: buildExamCard,
        buildTypeCard: buildTypeCard
    };
})();
