/* ==========================================================================
   WEEKLY-REPORT.JS — Báo cáo tuần
   - Học viên (mypage.html → #weeklyReportBox): tuần này so với tuần trước
   - Giáo viên (vocab.html → thư mục lớp): WeeklyReport.openTeacherReport(folderId, folderName)
   Tuần tính từ Thứ Hai 00:00 (giờ máy).
   Nguồn dữ liệu (không tạo dữ liệu mới):
     users/{uid}.dailyStudyData / dailyReviewData   (phút học / số thẻ từ đã ôn mỗi ngày)
     users/{uid}/examAttempts                       (đề đã làm)
     users/{uid}/mistakes                           (Sổ câu sai)
     shared_folders/{f}/students, /exercises/{e}/quiz_attempts, /submissions, students/{uid}/progress
   ========================================================================== */
(function () {
    'use strict';
    const DAY = 86400000;
    const DOW = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

    function esc(s) {
        return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }
    function dateKey(d) {
        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    }
    function weekStart(offsetWeeks) {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        const dow = (d.getDay() + 6) % 7; // Thứ Hai = 0
        d.setDate(d.getDate() - dow - 7 * (offsetWeeks || 0));
        return d;
    }
    function weekDays(start) {
        const out = [];
        for (let i = 0; i < 7; i++) { const d = new Date(start); d.setDate(start.getDate() + i); out.push(d); }
        return out;
    }
    function ms(ts) { return ts && typeof ts.toMillis === 'function' ? ts.toMillis() : (typeof ts === 'number' ? ts : 0); }
    function sumDays(map, days) {
        map = map || {};
        return days.reduce((s, d) => s + (Number(map[dateKey(d)]) || 0), 0);
    }
    function activeDays(map, days) {
        map = map || {};
        return days.filter(d => (Number(map[dateKey(d)]) || 0) > 0).length;
    }
    function fmtMin(m) {
        m = Math.round(m || 0);
        if (m < 60) return m + ' phút';
        const h = Math.floor(m / 60), r = m % 60;
        return h + 'h' + (r ? String(r).padStart(2, '0') : '');
    }
    function fmtRange(start) {
        const end = new Date(start); end.setDate(start.getDate() + 6);
        const f = d => d.getDate() + '/' + (d.getMonth() + 1);
        return f(start) + ' – ' + f(end);
    }
    // Chênh lệch so với tuần trước
    function delta(cur, prev, unit) {
        if (!prev && !cur) return '<span class="wr-d wr-flat">—</span>';
        if (!prev) return '<span class="wr-d wr-up">mới</span>';
        const p = Math.round((cur - prev) / prev * 100);
        if (Math.abs(p) < 5) return '<span class="wr-d wr-flat">≈ tuần trước</span>';
        return '<span class="wr-d ' + (p > 0 ? 'wr-up' : 'wr-down') + '">' + (p > 0 ? '▲ ' : '▼ ') + Math.abs(p) + '%' + (unit || '') + '</span>';
    }
    function pct(c, a) { return a ? Math.round(c / a * 100) : null; }
    // Số ngày đã qua của tuần này (T2 = 1 … CN = 7) → so sánh CÙNG KỲ với tuần trước
    function elapsedDays() { return (new Date().getDay() + 6) % 7 + 1; }
    function spanLabel() {
        const n = elapsedDays();
        return n >= 7 ? 'so với tuần trước' : 'so với cùng kỳ tuần trước (' + DOW[0] + (n > 1 ? '–' + DOW[n - 1] : '') + ')';
    }

    // =====================================================================
    // HỌC VIÊN
    // =====================================================================
    async function loadStudentData(uid) {
        const db = firebase.firestore();
        const userRef = db.collection('users').doc(uid);
        const lastStart = weekStart(1);
        const [userDoc, attemptsSnap, mistakesSnap, vocabSnap] = await Promise.all([
            userRef.get(),
            userRef.collection('examAttempts').where('submittedAt', '>=', firebase.firestore.Timestamp.fromDate(lastStart)).get().catch(() => null),
            userRef.collection('mistakes').get().catch(() => null),
            userRef.collection('vocabulary').get().catch(() => null)
        ]);
        const attempts = [];
        if (attemptsSnap) attemptsSnap.forEach(d => attempts.push(d.data()));
        const mistakes = [];
        if (mistakesSnap) mistakesSnap.forEach(d => mistakes.push(d.data()));
        const vocab = [];
        if (vocabSnap) vocabSnap.forEach(d => { const v = d.data(); if (v.word && v.word !== '__folder_marker__') vocab.push(v); });
        return { user: userDoc.exists ? userDoc.data() : {}, attempts, mistakes, vocab };
    }

    // span: chỉ tính span ngày đầu tuần (để so cùng kỳ); biểu đồ perDay luôn đủ 7 ngày
    function weekStats(data, start, span) {
        span = span || 7;
        const allDays = weekDays(start);
        const days = allDays.slice(0, span);
        const from = start.getTime(), to = from + span * DAY;
        const inWeek = t => t >= from && t < to;
        const at = data.attempts.filter(a => inWeek(ms(a.submittedAt)));
        const bySkill = {};
        at.forEach(a => {
            const k = a.skill || 'reading';
            bySkill[k] = bySkill[k] || { c: 0, a: 0, n: 0 };
            bySkill[k].c += a.correctCount || 0;
            bySkill[k].a += a.answeredCount || 0;
            bySkill[k].n += 1;
        });
        const correct = at.reduce((s, a) => s + (a.correctCount || 0), 0);
        const answered = at.reduce((s, a) => s + (a.answeredCount || 0), 0);
        return {
            days,
            minutes: sumDays(data.user.dailyStudyData, days),
            perDay: allDays.map(d => Number((data.user.dailyStudyData || {})[dateKey(d)]) || 0),
            activeDays: activeDays(data.user.dailyStudyData, days),
            reviews: sumDays(data.user.dailyReviewData, days),
            exams: at.length, correct, answered, accuracy: pct(correct, answered), bySkill,
            newWords: data.vocab.filter(v => inWeek(v.srsFirstAt || 0)).length,
            mistakesNew: data.mistakes.filter(m => inWeek(ms(m.createdAt))).length,
            mistakesFixed: data.mistakes.filter(m => m.mastered && inWeek(ms(m.masteredAt))).length
        };
    }

    function insights(cur, prev, data) {
        const out = [];
        const SK = { reading: 'Đọc', listening: 'Nghe', writing: 'Viết' };
        // Kỹ năng yếu nhất (cần ít nhất 5 câu đã làm)
        const skills = Object.keys(cur.bySkill).filter(k => cur.bySkill[k].a >= 5)
            .map(k => ({ k, p: pct(cur.bySkill[k].c, cur.bySkill[k].a) }));
        if (skills.length >= 2) {
            skills.sort((a, b) => a.p - b.p);
            const w = skills[0], b = skills[skills.length - 1];
            if (b.p - w.p >= 10) out.push(`🎯 Kỹ năng <b>${SK[w.k] || w.k}</b> đang yếu hơn ${SK[b.k] || b.k} (${w.p}% so với ${b.p}%). Tuần tới nên làm thêm đề ${SK[w.k] || w.k}.`);
        } else if (skills.length === 1 && skills[0].p < 60) {
            out.push(`🎯 Độ chính xác phần <b>${SK[skills[0].k] || skills[0].k}</b> tuần này là ${skills[0].p}% — hãy xem lại lời giải các câu sai.`);
        }
        if (prev.minutes >= 30 && cur.minutes < prev.minutes * 0.7) {
            out.push(`📉 Thời gian học giảm ${Math.round((1 - cur.minutes / prev.minutes) * 100)}% so với tuần trước. Chỉ cần 15 phút mỗi ngày là đủ giữ nhịp!`);
        } else if (cur.minutes > prev.minutes * 1.2 && cur.minutes >= 30) {
            out.push(prev.minutes
                ? `🔥 Tuyệt vời! Bạn học nhiều hơn cùng kỳ tuần trước ${Math.round((cur.minutes / prev.minutes - 1) * 100)}%. Giữ vững phong độ nhé!`
                : '🔥 Tuyệt vời! Tuần này bạn đã bắt đầu học đều đặn. Giữ vững phong độ nhé!');
        }
        if (cur.accuracy !== null && prev.accuracy !== null && cur.accuracy - prev.accuracy >= 5) {
            out.push(`📈 Độ chính xác khi làm đề tăng từ ${prev.accuracy}% lên <b>${cur.accuracy}%</b>.`);
        }
        const need = data.mistakes.filter(m => !m.mastered).length;
        if (need) out.push(`📕 Còn <b>${need}</b> câu sai chưa thuộc. <a href="mistakes.html">Ôn ngay →</a>`);
        if (window.SRS && data.vocab.length) {
            const words = data.vocab.map(v => v);
            const due = words.filter(v => { const d = window.SRS.virtualDue(v); return d !== null && d <= Date.now(); }).length;
            if (due) out.push(`🔁 Có <b>${due}</b> từ vựng đến hạn ôn. <a href="vocab.html?review=1">Ôn từ vựng →</a>`);
        }
        if (!cur.minutes && !cur.exams && !cur.reviews) out.push('🌱 Tuần này bạn chưa học gì — bắt đầu bằng 1 buổi ôn từ vựng 5 phút nhé!');
        return out;
    }

    function renderStudent(box, data) {
        const cur = weekStats(data, weekStart(0));
        const prev = weekStats(data, weekStart(1), elapsedDays());
        const maxMin = Math.max(30, ...cur.perDay);
        const todayIdx = (new Date().getDay() + 6) % 7;
        const tips = insights(cur, prev, data);

        box.innerHTML = `
            <div class="wr-head">
                <div><div class="wr-title">📅 Báo cáo tuần này</div><div class="wr-range">${fmtRange(weekStart(0))} · ${spanLabel()}</div></div>
            </div>
            <div class="wr-grid">
                <div class="wr-tile"><span class="wr-ico">⏱️</span><b>${fmtMin(cur.minutes)}</b><span>thời gian học</span>${delta(cur.minutes, prev.minutes)}</div>
                <div class="wr-tile"><span class="wr-ico">📆</span><b>${cur.activeDays}/7</b><span>ngày có học</span>${delta(cur.activeDays, prev.activeDays)}</div>
                <div class="wr-tile"><span class="wr-ico">📝</span><b>${cur.exams}</b><span>đề đã làm${cur.accuracy !== null ? ' · đúng ' + cur.accuracy + '%' : ''}</span>${delta(cur.exams, prev.exams)}</div>
                <div class="wr-tile"><span class="wr-ico">🔁</span><b>${cur.reviews}</b><span>thẻ từ đã ôn${cur.newWords ? ' · ' + cur.newWords + ' từ mới' : ''}</span>${delta(cur.reviews, prev.reviews)}</div>
                <div class="wr-tile"><span class="wr-ico">📕</span><b>+${cur.mistakesNew} / ✓${cur.mistakesFixed}</b><span>câu sai mới / đã thuộc</span><span class="wr-d wr-flat">&nbsp;</span></div>
            </div>
            <div class="wr-chart">
                ${cur.perDay.map((m, i) => `
                    <div class="wr-col${i === todayIdx ? ' today' : ''}${i > todayIdx ? ' future' : ''}" title="${DOW[i]}: ${fmtMin(m)}">
                        <div class="wr-bar-wrap"><div class="wr-bar" style="height:${Math.round(m / maxMin * 100)}%"></div></div>
                        <div class="wr-val">${m ? Math.round(m) + "'" : ''}</div>
                        <div class="wr-dow">${DOW[i]}</div>
                    </div>`).join('')}
            </div>
            ${tips.length ? `<div class="wr-tips">${tips.map(t => `<div class="wr-tip">${t}</div>`).join('')}</div>` : ''}`;
    }

    async function initStudent() {
        const box = document.getElementById('weeklyReportBox');
        if (!box || typeof firebase === 'undefined') return;
        firebase.auth().onAuthStateChanged(async user => {
            if (!user) { box.style.display = 'none'; return; }
            box.style.display = 'block';
            box.innerHTML = '<div class="wr-loading">⏳ Đang tổng hợp báo cáo tuần...</div>';
            try {
                renderStudent(box, await loadStudentData(user.uid));
            } catch (e) {
                console.warn('[WeeklyReport]', e);
                box.innerHTML = '<div class="wr-loading">Không tải được báo cáo tuần.</div>';
            }
        });
    }

    // =====================================================================
    // GIÁO VIÊN — báo cáo tuần của cả lớp (thư mục chia sẻ)
    // =====================================================================
    async function loadClassData(folderId) {
        const db = firebase.firestore();
        const folderRef = db.collection('shared_folders').doc(folderId);
        const thisStart = weekStart(0), lastStart = weekStart(1);
        const fromTs = firebase.firestore.Timestamp.fromDate(thisStart);

        const [studentsSnap, exSnap] = await Promise.all([folderRef.collection('students').get(), folderRef.collection('exercises').get()]);
        const students = [];
        studentsSnap.forEach(d => { const s = d.data(); s.uid = d.id; students.push(s); });

        // Bài tập: tiến độ JSON + bài nộp kiểu Docs trong tuần
        const quizByStudent = {}, subsByStudent = {};
        await Promise.all(exSnap.docs.map(async ex => {
            const [qa, subs] = await Promise.all([
                ex.ref.collection('quiz_attempts').get().catch(() => null),
                ex.ref.collection('submissions').get().catch(() => null)
            ]);
            if (qa) qa.forEach(d => {
                const a = d.data();
                if (ms(a.updatedAt) < thisStart.getTime()) return;
                const o = quizByStudent[d.id] = quizByStudent[d.id] || { ex: 0, answered: 0, correct: 0 };
                o.ex++; o.answered += a.answered || 0; o.correct += a.correct || 0;
            });
            if (subs) subs.forEach(d => {
                if (ms(d.data().submittedAt) >= thisStart.getTime()) subsByStudent[d.id] = (subsByStudent[d.id] || 0) + 1;
            });
        }));

        // Mỗi học viên: thời gian học (users/{uid}) + từ vựng lớp đã ôn trong tuần (progress)
        const rows = await Promise.all(students.map(async s => {
            const [u, prog] = await Promise.all([
                db.collection('users').doc(s.uid).get().catch(() => null),
                folderRef.collection('students').doc(s.uid).collection('progress').where('updatedAt', '>=', fromTs).get().catch(() => null)
            ]);
            const ud = (u && u.exists) ? u.data() : {};
            const cur = weekDays(thisStart), prev = weekDays(lastStart).slice(0, elapsedDays());
            const q = quizByStudent[s.uid] || { ex: 0, answered: 0, correct: 0 };
            return {
                uid: s.uid,
                name: s.displayName || ud.fullName || ud.name || (s.email ? String(s.email).split('@')[0] : 'Học viên'),
                email: s.email || '',
                minutes: sumDays(ud.dailyStudyData, cur), minutesPrev: sumDays(ud.dailyStudyData, prev),
                days: activeDays(ud.dailyStudyData, cur),
                words: prog ? prog.size : 0,
                quizEx: q.ex, quizAcc: pct(q.correct, q.answered), quizAnswered: q.answered,
                subs: subsByStudent[s.uid] || 0,
                lastActive: Math.max(ms(s.lastActiveAt), ud.lastSeen || 0)
            };
        }));
        return rows;
    }

    function flagsFor(r) {
        const f = [];
        const idleDays = r.lastActive ? Math.floor((Date.now() - r.lastActive) / DAY) : null;
        if (!r.minutes && !r.words && !r.quizEx && !r.subs) f.push({ t: '⚠️ Chưa học tuần này', c: 'bad', w: 3 });
        else if (r.minutesPrev >= 30 && r.minutes < r.minutesPrev * 0.5) f.push({ t: '📉 Giảm ' + Math.round((1 - r.minutes / r.minutesPrev) * 100) + '%', c: 'warn', w: 2 });
        if (idleDays !== null && idleDays >= 7) f.push({ t: '💤 ' + idleDays + ' ngày không vào', c: 'bad', w: 3 });
        if (r.quizAcc !== null && r.quizAnswered >= 5 && r.quizAcc < 50) f.push({ t: '🎯 Bài tập đúng ' + r.quizAcc + '%', c: 'warn', w: 1 });
        if (r.days >= 5) f.push({ t: '🌟 Chăm chỉ', c: 'good', w: -1 });
        return f;
    }

    async function openTeacherReport(folderId, folderName) {
        folderId = folderId || window.currentSharedFolderId;
        if (!folderId) return;
        const old = document.getElementById('_wrClassModal');
        if (old) old.remove();
        const ov = document.createElement('div');
        ov.id = '_wrClassModal';
        ov.className = 'wr-modal-ov';
        ov.innerHTML = `<div class="wr-modal">
            <div class="wr-modal-head">
                <div><div style="font-weight:900;font-size:1.1em;color:#0f172a;">📈 Báo cáo tuần · ${esc(folderName || 'Lớp học')}</div>
                <div style="font-size:0.84em;color:#64748b;">${fmtRange(weekStart(0))} · ${spanLabel()}</div></div>
                <button class="wr-close" title="Đóng (Esc)">✕</button>
            </div>
            <div class="wr-modal-body"><div class="wr-loading">⏳ Đang tổng hợp dữ liệu học viên...</div></div>
        </div>`;
        document.body.appendChild(ov);
        const close = () => { ov.remove(); document.removeEventListener('keydown', onKey); };
        const onKey = e => { if (e.key === 'Escape') close(); };
        document.addEventListener('keydown', onKey);
        ov.querySelector('.wr-close').onclick = close;
        ov.addEventListener('click', e => { if (e.target === ov) close(); });
        const body = ov.querySelector('.wr-modal-body');

        let rows;
        try { rows = await loadClassData(folderId); }
        catch (e) {
            body.innerHTML = '<div class="wr-loading">Không tải được dữ liệu: ' + esc(e.message) + '</div>';
            return;
        }
        if (!rows.length) { body.innerHTML = '<div class="wr-loading">📭 Lớp chưa có học viên nào.</div>'; return; }

        rows.forEach(r => { r.flags = flagsFor(r); r.weight = r.flags.reduce((s, f) => s + f.w, 0); });
        rows.sort((a, b) => b.weight - a.weight || a.minutes - b.minutes);

        const active = rows.filter(r => r.minutes || r.words || r.quizEx || r.subs).length;
        const totalMin = rows.reduce((s, r) => s + r.minutes, 0);
        const attention = rows.filter(r => r.weight >= 2).length;

        body.innerHTML = `
            <div class="wr-grid wr-grid-3">
                <div class="wr-tile"><b>${active}/${rows.length}</b><span>học viên có học tuần này</span></div>
                <div class="wr-tile"><b>${fmtMin(rows.length ? totalMin / rows.length : 0)}</b><span>thời gian học TB / học viên</span></div>
                <div class="wr-tile"><b style="color:${attention ? '#dc2626' : '#059669'};">${attention}</b><span>học viên cần chú ý</span></div>
            </div>
            <div class="wr-table-wrap"><table class="wr-table">
                <thead><tr><th>Học viên</th><th>Thời gian học</th><th>Ngày học</th><th>Từ vựng lớp đã ôn</th><th>Bài tập</th><th>Gần nhất</th><th>Ghi chú</th></tr></thead>
                <tbody>${rows.map(r => `
                    <tr>
                        <td><div class="wr-name">${esc(r.name)}</div><div class="wr-email">${esc(r.email)}</div></td>
                        <td data-l="Thời gian học"><b>${fmtMin(r.minutes)}</b><br>${delta(r.minutes, r.minutesPrev)}</td>
                        <td data-l="Ngày học">${r.days}/7</td>
                        <td data-l="Từ vựng lớp">${r.words} từ</td>
                        <td data-l="Bài tập">${r.quizEx || r.subs ? `${r.quizEx ? r.quizEx + ' bài tương tác' + (r.quizAcc !== null ? ' · đúng ' + r.quizAcc + '%' : '') : ''}${r.quizEx && r.subs ? '<br>' : ''}${r.subs ? r.subs + ' bài nộp' : ''}` : '<span style="color:#94a3b8;">—</span>'}</td>
                        <td data-l="Gần nhất">${r.lastActive ? new Date(r.lastActive).toLocaleDateString('vi-VN') : '—'}</td>
                        <td data-l="Ghi chú">${r.flags.map(f => `<span class="wr-flag ${f.c}">${f.t}</span>`).join(' ') || '<span style="color:#94a3b8;">—</span>'}</td>
                    </tr>`).join('')}
                </tbody>
            </table></div>
            <div class="wr-note">“Thời gian học” là tổng thời gian học trên toàn website (đề thi, bài học...). “Từ vựng lớp đã ôn” đếm số từ trong thư mục này mà học viên đã đánh giá trong tuần.</div>`;
    }

    // ── CSS dùng chung (chèn 1 lần) ──
    function injectCss() {
        if (document.getElementById('wr-css')) return;
        const st = document.createElement('style');
        st.id = 'wr-css';
        st.textContent = `
            #weeklyReportBox { background: rgba(255,255,255,0.95); border-radius: 18px; padding: 18px 20px; margin-bottom: 20px; box-shadow: 0 4px 18px rgba(0,0,0,0.06); }
            .wr-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
            .wr-title { font-size: 1.15em; font-weight: 900; color: #0f172a; }
            .wr-range { font-size: 0.82em; color: #64748b; }
            .wr-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; }
            .wr-grid-3 { grid-template-columns: repeat(3, 1fr); margin-bottom: 14px; }
            .wr-tile { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 10px; display: flex; flex-direction: column; gap: 2px; text-align: center; }
            .wr-tile b { font-size: 1.3em; font-weight: 900; color: #1e293b; }
            .wr-tile > span:not(.wr-d):not(.wr-ico) { font-size: 0.76em; color: #64748b; font-weight: 600; }
            .wr-ico { font-size: 1.1em; }
            .wr-d { font-size: 0.72em; font-weight: 800; }
            .wr-up { color: #059669; } .wr-down { color: #dc2626; } .wr-flat { color: #94a3b8; }
            .wr-chart { display: flex; gap: 6px; align-items: flex-end; height: 120px; margin: 16px 0 6px; padding: 0 4px; }
            .wr-col { flex: 1; display: flex; flex-direction: column; align-items: center; height: 100%; }
            .wr-bar-wrap { flex: 1; width: 100%; max-width: 38px; display: flex; align-items: flex-end; background: #f1f5f9; border-radius: 8px; overflow: hidden; }
            .wr-bar { width: 100%; background: linear-gradient(180deg, #60a5fa, #2563eb); border-radius: 8px 8px 0 0; min-height: 2px; }
            .wr-col.today .wr-bar { background: linear-gradient(180deg, #fbbf24, #f97316); }
            .wr-col.future { opacity: 0.4; }
            .wr-val { font-size: 0.7em; color: #475569; font-weight: 700; height: 14px; }
            .wr-dow { font-size: 0.75em; color: #64748b; font-weight: 700; }
            .wr-col.today .wr-dow { color: #f97316; }
            .wr-tips { margin-top: 12px; display: flex; flex-direction: column; gap: 6px; }
            .wr-tip { background: #f0f9ff; border-left: 3px solid #3b82f6; border-radius: 8px; padding: 8px 12px; font-size: 0.9em; color: #1e293b; line-height: 1.5; }
            .wr-tip a { color: #2563eb; font-weight: 800; text-decoration: none; }
            .wr-loading { text-align: center; color: #64748b; padding: 20px; }
            .wr-modal-ov { position: fixed; inset: 0; background: rgba(15,23,42,0.6); z-index: 100000; display: flex; align-items: center; justify-content: center; padding: 16px; backdrop-filter: blur(3px); }
            .wr-modal { background: #fff; border-radius: 18px; width: 100%; max-width: 1000px; max-height: 92vh; display: flex; flex-direction: column; overflow: hidden; }
            .wr-modal-head { display: flex; justify-content: space-between; align-items: center; gap: 10px; padding: 16px 20px; border-bottom: 1px solid #e2e8f0; background: #f8fafc; }
            .wr-modal-body { padding: 16px 20px 20px; overflow-y: auto; }
            .wr-close { border: 1px solid #cbd5e1; background: #fff; border-radius: 8px; width: 32px; height: 32px; cursor: pointer; color: #64748b; flex-shrink: 0; }
            .wr-table-wrap { overflow-x: auto; }
            .wr-table { width: 100%; border-collapse: collapse; font-size: 0.88em; }
            .wr-table th { text-align: left; background: #f1f5f9; color: #475569; font-weight: 800; padding: 9px 10px; white-space: nowrap; }
            .wr-table td { padding: 10px; border-bottom: 1px solid #f1f5f9; vertical-align: top; color: #1e293b; }
            .wr-name { font-weight: 800; } .wr-email { font-size: 0.8em; color: #94a3b8; }
            .wr-flag { display: inline-block; font-size: 0.78em; font-weight: 700; padding: 2px 8px; border-radius: 10px; margin: 1px 0; white-space: nowrap; }
            .wr-flag.bad { background: #fee2e2; color: #b91c1c; } .wr-flag.warn { background: #fef3c7; color: #92400e; } .wr-flag.good { background: #dcfce7; color: #15803d; }
            .wr-note { font-size: 0.78em; color: #94a3b8; margin-top: 10px; }
            body.dark-mode #weeklyReportBox, body.dark-mode .wr-modal { background: #1e293b; }
            body.dark-mode .wr-title, body.dark-mode .wr-tile b, body.dark-mode .wr-tip { color: #f1f5f9; }
            body.dark-mode .wr-tile, body.dark-mode .wr-modal-head { background: #0f172a; border-color: #334155; }
            body.dark-mode .wr-tip { background: #0f172a; }
            @media (max-width: 760px) {
                .wr-grid { grid-template-columns: repeat(2, 1fr); }
                .wr-grid > .wr-tile:last-child:nth-child(odd) { grid-column: span 2; }
                .wr-grid-3 { grid-template-columns: repeat(3, 1fr); }
                .wr-modal-ov { padding: 0; align-items: stretch; }
                .wr-modal { max-height: 100vh; border-radius: 0; }
                .wr-table thead { display: none; }
                .wr-table, .wr-table tbody, .wr-table tr, .wr-table td { display: block; width: 100%; }
                .wr-table tr { border: 1px solid #e2e8f0; border-radius: 12px; margin-bottom: 10px; padding: 6px 4px; }
                .wr-table td { border: none; padding: 4px 10px; }
                .wr-table td[data-l]::before { content: attr(data-l) ': '; color: #64748b; font-weight: 600; }
                .wr-table td[data-l] br { display: none; }
            }`;
        document.head.appendChild(st);
    }

    injectCss();
    window.WeeklyReport = { initStudent, openTeacherReport, weekStats, loadStudentData };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initStudent);
    else initStudent();
})();
