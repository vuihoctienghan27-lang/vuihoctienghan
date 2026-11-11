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
    // Icon nét (24×24)
    // Icon duotone dùng chung (assets/js/ui-icons.js)
    const IC_ALIAS = { focus: 'target', book: 'notebook' };
    function ic(n) { return window.UIIcons ? window.UIIcons.svg(IC_ALIAS[n] || n, 'wr-i') : ''; }
    function tile(n, tone, size) { return window.UIIcons ? window.UIIcons.tile(IC_ALIAS[n] || n, tone, size) : ''; }
    function fmtRangeLong(start) {
        const end = new Date(start); end.setDate(start.getDate() + 6);
        return start.getMonth() === end.getMonth()
            ? start.getDate() + ' – ' + end.getDate() + ' tháng ' + (end.getMonth() + 1)
            : start.getDate() + '/' + (start.getMonth() + 1) + ' – ' + end.getDate() + '/' + (end.getMonth() + 1);
    }
    // Chênh lệch so với tuần trước
    function delta(cur, prev, unit) {
        if (!prev && !cur) return '<span class="wr-d wr-flat">—</span>';
        if (!prev) return '<span class="wr-d wr-up">' + ic('up') + 'Mới</span>';
        const p = Math.round((cur - prev) / prev * 100);
        if (Math.abs(p) < 5) return '<span class="wr-d wr-flat">' + ic('flat') + 'Không đổi</span>';
        return '<span class="wr-d ' + (p > 0 ? 'wr-up' : 'wr-down') + '">' + ic(p > 0 ? 'up' : 'down') + Math.abs(p) + '%' + (unit || '') + '</span>';
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
    async function loadStudentData(uid, onUser) {
        const db = firebase.firestore();
        const userRef = db.collection('users').doc(uid);
        const lastStart = weekStart(1);
        const userP = userRef.get();
        if (onUser) userP.then(d => onUser({ user: d.exists ? d.data() : {}, attempts: null, mistakes: null, vocab: null })).catch(() => {});
        const [userDoc, attemptsSnap, mistakesSnap, vocabSnap] = await Promise.all([
            userP,
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
        const user = data.user || {};
        const at = (data.attempts || []).filter(a => inWeek(ms(a.submittedAt)));
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
            minutes: sumDays(user.dailyStudyData, days),
            perDay: allDays.map(d => Number((user.dailyStudyData || {})[dateKey(d)]) || 0),
            activeDays: activeDays(user.dailyStudyData, days),
            reviews: sumDays(user.dailyReviewData, days),
            exams: at.length, correct, answered, accuracy: pct(correct, answered), bySkill,
            newWords: (data.vocab || []).filter(v => inWeek(v.srsFirstAt || 0)).length,
            mistakesNew: (data.mistakes || []).filter(m => inWeek(ms(m.createdAt))).length,
            mistakesFixed: (data.mistakes || []).filter(m => m.mastered && inWeek(ms(m.masteredAt))).length
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
            if (b.p - w.p >= 10) out.push({ i: 'focus', h: `Kỹ năng <b>${SK[w.k] || w.k}</b> đang yếu hơn ${SK[b.k] || b.k} (${w.p}% so với ${b.p}%). Tuần tới nên làm thêm đề ${SK[w.k] || w.k}.` });
        } else if (skills.length === 1 && skills[0].p < 60) {
            out.push({ i: 'focus', h: `Độ chính xác phần <b>${SK[skills[0].k] || skills[0].k}</b> tuần này là ${skills[0].p}% — hãy xem lại lời giải các câu sai.` });
        }
        if (prev.minutes >= 30 && cur.minutes < prev.minutes * 0.7) {
            out.push({ i: 'trendDown', t: 'neg', h: `Thời gian học giảm ${Math.round((1 - cur.minutes / prev.minutes) * 100)}% so với tuần trước. Chỉ cần 15 phút mỗi ngày là đủ giữ nhịp.` });
        } else if (cur.minutes > prev.minutes * 1.2 && cur.minutes >= 30) {
            out.push({ i: 'trendUp', t: 'pos', h: prev.minutes
                ? `Bạn học nhiều hơn cùng kỳ tuần trước <b>${Math.round((cur.minutes / prev.minutes - 1) * 100)}%</b>. Giữ vững phong độ nhé.`
                : 'Tuần này bạn đã bắt đầu học đều đặn. Giữ vững phong độ nhé.' });
        }
        if (cur.accuracy !== null && prev.accuracy !== null && cur.accuracy - prev.accuracy >= 5) {
            out.push({ i: 'trendUp', t: 'pos', h: `Độ chính xác khi làm đề tăng từ ${prev.accuracy}% lên <b>${cur.accuracy}%</b>.` });
        }
        const need = data.mistakes.filter(m => !m.mastered).length;
        if (need) out.push({ i: 'book', h: `Còn <b>${need}</b> câu sai chưa thuộc.`, a: ['mistakes.html', 'Ôn câu sai'] });
        if (window.SRS && data.vocab.length) {
            const words = data.vocab.map(v => v);
            const due = words.filter(v => { const d = window.SRS.virtualDue(v); return d !== null && d <= Date.now(); }).length;
            if (due) out.push({ i: 'repeat', h: `Có <b>${due}</b> từ vựng đến hạn ôn.`, a: ['vocab.html?review=1', 'Ôn từ vựng'] });
        }
        if (!cur.minutes && !cur.exams && !cur.reviews) out.push({ i: 'sprout', h: 'Tuần này bạn chưa học — bắt đầu bằng một buổi ôn từ vựng 5 phút nhé.' });
        return out;
    }

    // Khung xương (skeleton) cho số liệu chưa tải xong
    function SK(w, h) { return '<span class="wr-sk" style="width:' + (w || '3em') + (h ? ';height:' + h : '') + '"></span>'; }

    // ---- Biểu đồ thời gian học: 7 ngày (tuần này) / 30 ngày gần đây ----
    function chartRange() { try { return localStorage.getItem('wrChartRange') === '30' ? 30 : 7; } catch (e) { return 7; } }
    function setChartRange(v) { try { localStorage.setItem('wrChartRange', String(v)); } catch (e) { } }

    function studyPanel(data, cur, range) {
        const map = (data.user && data.user.dailyStudyData) || {};
        const sk = !data.user;
        const seg = `<div class="wr-seg" role="tablist">
            <button type="button" data-wr-range="7" class="${range === 7 ? 'on' : ''}">Tuần này</button>
            <button type="button" data-wr-range="30" class="${range === 30 ? 'on' : ''}">30 ngày</button></div>`;
        let cols, avg, total, active, cls = '';
        if (range === 30) {
            const today = new Date(); today.setHours(0, 0, 0, 0);
            const days = Array.from({ length: 30 }, (_, i) => { const d = new Date(today); d.setDate(d.getDate() - (29 - i)); return d; });
            const vals = days.map(d => Number(map[dateKey(d)]) || 0);
            const max = Math.max(30, ...vals);
            total = vals.reduce((a, b) => a + b, 0);
            active = vals.filter(v => v > 0).length;
            avg = active ? total / active : 0;
            cls = ' wr-chart-30';
            cols = days.map((d, i) => {
                const m = vals[i], isToday = i === 29, lbl = d.getDate() + '/' + (d.getMonth() + 1);
                const showLbl = isToday || (29 - i) % 5 === 0;
                return `<div class="wr-col${isToday ? ' today' : ''}" title="${DOW[(d.getDay() + 6) % 7]} ${lbl}: ${fmtMin(m)}">
                    <div class="wr-bar-wrap">${sk ? '' : `<div class="wr-bar" style="height:${m ? Math.max(3, Math.round(m / max * 100)) : 0}%"></div>`}</div>
                    <div class="wr-dow">${showLbl ? (isToday ? 'Nay' : lbl) : ''}</div></div>`;
            }).join('');
        } else {
            const maxMin = Math.max(30, ...cur.perDay);
            const todayIdx = (new Date().getDay() + 6) % 7;
            total = cur.minutes; active = cur.activeDays;
            avg = active ? total / active : 0;
            cols = cur.perDay.map((m, i) => `
                <div class="wr-col${i === todayIdx ? ' today' : ''}${i > todayIdx ? ' future' : ''}" title="${DOW[i]}: ${fmtMin(m)}">
                    <div class="wr-bar-wrap">${sk ? '' : `<div class="wr-val">${m ? Math.round(m) + "'" : ''}</div><div class="wr-bar" style="height:${m ? Math.max(4, Math.round(m / maxMin * 100)) : 0}%"></div>`}</div>
                    <div class="wr-dow">${i === todayIdx ? 'Hôm nay' : DOW[i]}</div>
                </div>`).join('');
        }
        return `<div class="wr-panel-h"><span>${ic('chart')}Thời gian học mỗi ngày</span>${seg}</div>
            <div class="wr-chart${cls}${sk ? ' wr-chart-sk' : ''}">${cols}</div>
            <div class="wr-chart-foot">${sk ? SK('16em') : `<span>Tổng <b>${fmtMin(total)}</b></span><span><b>${active}</b>/${range === 30 ? 30 : 7} ngày có học</span><span>TB <b>${fmtMin(avg)}</b> / ngày học</span>`}</div>`;
    }

    function renderStudent(box, data) {
        const cur = weekStats(data, weekStart(0));
        const prev = weekStats(data, weekStart(1), elapsedDays());
        const has = { u: !!data.user, at: !!data.attempts, mk: !!data.mistakes, vc: !!data.vocab };
        const ready = has.u && has.at && has.mk && has.vc;
        const tips = ready ? insights(cur, prev, data) : [];
        const kpi = (icon, tone, label, value, cls, sub, d) => `<div class="wr-kpi">
            <div class="wr-kpi-top">${tile(icon, tone, 'sm')}<span class="wr-kpi-l">${label}</span></div>
            <div class="wr-kpi-v ${cls}">${value === null ? SK('2.6em', '1em') : value}</div>
            <div class="wr-kpi-s">${value === null ? SK('5em') : (d || '') + (sub ? '<span>' + sub + '</span>' : '')}</div></div>`;
        const TIP_TONE = { focus: 'amber', trendDown: 'coral', trendUp: 'green', book: 'coral', repeat: 'violet', sprout: 'green' };
        const fixRate = cur.mistakesNew + cur.mistakesFixed ? Math.round(cur.mistakesFixed / (cur.mistakesNew + cur.mistakesFixed) * 100) : 0;

        box.classList.add('wr-scope');
        box.innerHTML = `
            <div class="wr-head">
                <div class="wr-head-l">${tile('calendar', 'blue')}
                    <div><div class="wr-title">Báo cáo tuần này</div><div class="wr-range">${fmtRangeLong(weekStart(0))} · ${spanLabel()}</div></div></div>
            </div>
            <div class="wr-kpis">
                ${kpi('clock', 'cyan', 'Thời gian học', has.u ? fmtMin(cur.minutes) : null, 'c-cyan', '', delta(cur.minutes, prev.minutes))}
                ${kpi('flame', 'orange', 'Ngày có học', has.u ? cur.activeDays + '<small>/7</small>' : null, 'c-orange', '', delta(cur.activeDays, prev.activeDays))}
                ${kpi('exam', 'blue', 'Đề đã làm', has.at ? cur.exams : null, 'c-blue', cur.accuracy !== null ? 'đúng ' + cur.accuracy + '%' : '', delta(cur.exams, prev.exams))}
                ${kpi('repeat', 'violet', 'Thẻ từ đã ôn', has.u ? cur.reviews : null, 'c-violet', has.vc && cur.newWords ? '+' + cur.newWords + ' từ mới' : '', delta(cur.reviews, prev.reviews))}
            </div>
            <div class="wr-body">
                <div class="wr-panel wr-study">${studyPanel(data, cur, chartRange())}</div>
                <div class="wr-panel wr-side">
                    <div class="wr-panel-h"><span>${ic('notebook')}Sổ câu sai</span><a href="mistakes.html" class="wr-link">Mở sổ ${ic('arrow')}</a></div>
                    <div class="wr-pair">
                        <div class="wr-pair-box red"><div class="wr-pair-v">${has.mk ? '+' + cur.mistakesNew : SK('1.6em', '1em')}</div><div class="wr-pair-l">câu sai mới</div></div>
                        <div class="wr-pair-box green"><div class="wr-pair-v">${has.mk ? cur.mistakesFixed : SK('1.6em', '1em')}</div><div class="wr-pair-l">câu đã thuộc</div></div>
                    </div>
                    <div class="wr-pair-cap"><span>Tỉ lệ khắc phục</span><b>${has.mk ? fixRate + '%' : SK('2.4em')}</b></div>
                    <div class="wr-pair-bar"><div style="width:${fixRate}%"></div></div>
                </div>
            </div>
            ${!ready ? `<div class="wr-tips"><div class="wr-panel-h"><span>${ic('sparkle')}Nhận xét & gợi ý</span></div>
                <div class="wr-tip wr-tip-sk"><span class="wr-sk wr-sk-tile"></span>${SK('70%')}</div>
                <div class="wr-tip wr-tip-sk"><span class="wr-sk wr-sk-tile"></span>${SK('50%')}</div></div>` : ''}
            ${tips.length ? `<div class="wr-tips"><div class="wr-panel-h"><span>${ic('sparkle')}Nhận xét & gợi ý</span></div>${tips.map(t => `
                <div class="wr-tip">${tile(t.i, TIP_TONE[t.i] || 'blue', 'sm')}<div class="wr-tip-t">${t.h}</div>
                ${t.a ? `<a class="wr-tip-a" href="${t.a[0]}">${t.a[1]} ${ic('arrow')}</a>` : ''}</div>`).join('')}</div>` : ''}`;
        const panel = box.querySelector('.wr-study');
        if (panel) panel.addEventListener('click', e => {
            const b = e.target.closest('[data-wr-range]');
            if (!b) return;
            const r = Number(b.dataset.wrRange);
            setChartRange(r);
            panel.innerHTML = studyPanel(data, cur, r);
        });
    }

    async function initStudent() {
        const box = document.getElementById('weeklyReportBox');
        if (!box || typeof firebase === 'undefined') return;
        const EMPTY = { user: null, attempts: null, mistakes: null, vocab: null };
        // Hiện ngay phần cố định (tiêu đề, nhãn, icon) — số liệu Firebase điền sau
        box.style.display = 'block';
        renderStudent(box, EMPTY);
        firebase.auth().onAuthStateChanged(async user => {
            if (!user) { box.style.display = 'none'; return; }
            box.style.display = 'block';
            let done = false;
            try {
                const full = await loadStudentData(user.uid, partial => { if (!done) renderStudent(box, partial); });
                done = true;
                renderStudent(box, full);
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
        if (!r.minutes && !r.words && !r.quizEx && !r.subs) f.push({ t: 'Chưa học tuần này', c: 'bad', w: 3 });
        else if (r.minutesPrev >= 30 && r.minutes < r.minutesPrev * 0.5) f.push({ t: 'Giảm ' + Math.round((1 - r.minutes / r.minutesPrev) * 100) + '%', c: 'warn', w: 2 });
        if (idleDays !== null && idleDays >= 7) f.push({ t: idleDays + ' ngày không vào', c: 'bad', w: 3 });
        if (r.quizAcc !== null && r.quizAnswered >= 5 && r.quizAcc < 50) f.push({ t: 'Bài tập đúng ' + r.quizAcc + '%', c: 'warn', w: 1 });
        if (r.days >= 5) f.push({ t: 'Chăm chỉ', c: 'good', w: -1 });
        return f;
    }

    async function openTeacherReport(folderId, folderName) {
        folderId = folderId || window.currentSharedFolderId;
        if (!folderId) return;
        const old = document.getElementById('_wrClassModal');
        if (old) old.remove();
        const ov = document.createElement('div');
        ov.id = '_wrClassModal';
        ov.className = 'wr-modal-ov wr-scope';
        ov.innerHTML = `<div class="wr-modal">
            <div class="wr-modal-head">
                <div class="wr-head-l">${tile('chart', 'navy')}<div><div class="wr-title">Báo cáo tuần · ${esc(folderName || 'Lớp học')}</div>
                <div class="wr-range">${fmtRangeLong(weekStart(0))} · ${spanLabel()}</div></div></div>
                <button class="wr-close" title="Đóng (Esc)">${ic('x')}</button>
            </div>
            <div class="wr-modal-body"><div class="wr-loading"><div class="wr-spin"></div>Đang tổng hợp dữ liệu học viên…</div></div>
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
        if (!rows.length) { body.innerHTML = '<div class="wr-loading">' + tile('users', 'slate', 'lg') + 'Lớp chưa có học viên nào.</div>'; return; }

        rows.forEach(r => { r.flags = flagsFor(r); r.weight = r.flags.reduce((s, f) => s + f.w, 0); });
        rows.sort((a, b) => b.weight - a.weight || a.minutes - b.minutes);

        const active = rows.filter(r => r.minutes || r.words || r.quizEx || r.subs).length;
        const totalMin = rows.reduce((s, r) => s + r.minutes, 0);
        const attention = rows.filter(r => r.weight >= 2).length;

        const initials = n => String(n || '?').trim().split(/\s+/).slice(-2).map(w => w[0] || '').join('').toUpperCase() || '?';
        const dash = '<span class="wr-muted">—</span>';
        body.innerHTML = `
            <div class="wr-kpis wr-kpis-3">
                <div class="wr-kpi"><div class="wr-kpi-top">${tile('users', 'blue', 'sm')}<span class="wr-kpi-l">Học viên có học</span></div><div class="wr-kpi-v c-blue">${active}<small>/${rows.length}</small></div></div>
                <div class="wr-kpi"><div class="wr-kpi-top">${tile('clock', 'cyan', 'sm')}<span class="wr-kpi-l">Thời gian TB / học viên</span></div><div class="wr-kpi-v c-cyan">${fmtMin(rows.length ? totalMin / rows.length : 0)}</div></div>
                <div class="wr-kpi"><div class="wr-kpi-top">${tile('alert', 'coral', 'sm')}<span class="wr-kpi-l">Cần chú ý</span></div><div class="wr-kpi-v ${attention ? 'wr-neg' : 'wr-pos'}">${attention}</div></div>
            </div>
            <div class="wr-table-wrap"><table class="wr-table">
                <thead><tr><th>Học viên</th><th>Thời gian học</th><th>Ngày học</th><th>Từ vựng lớp</th><th>Bài tập</th><th>Gần nhất</th><th>Ghi chú</th></tr></thead>
                <tbody>${rows.map(r => `
                    <tr>
                        <td><div class="wr-who"><span class="wr-av">${esc(initials(r.name))}</span><div style="min-width:0;"><div class="wr-name">${esc(r.name)}</div><div class="wr-email">${esc(r.email)}</div></div></div></td>
                        <td data-l="Thời gian học"><div class="wr-cell-v">${fmtMin(r.minutes)}</div>${delta(r.minutes, r.minutesPrev)}</td>
                        <td data-l="Ngày học"><div class="wr-days">${[0, 1, 2, 3, 4, 5, 6].map(i => `<i class="${i < r.days ? 'on' : ''}"></i>`).join('')}</div><span class="wr-muted wr-num">${r.days}/7</span></td>
                        <td data-l="Từ vựng lớp" class="wr-num">${r.words ? r.words + ' từ' : dash}</td>
                        <td data-l="Bài tập">${r.quizEx || r.subs ? `${r.quizEx ? r.quizEx + ' bài tương tác' + (r.quizAcc !== null ? ' <span class="wr-muted">· đúng ' + r.quizAcc + '%</span>' : '') : ''}${r.quizEx && r.subs ? '<br>' : ''}${r.subs ? r.subs + ' bài nộp' : ''}` : dash}</td>
                        <td data-l="Gần nhất" class="wr-num">${r.lastActive ? new Date(r.lastActive).toLocaleDateString('vi-VN') : dash}</td>
                        <td data-l="Ghi chú">${r.flags.map(f => `<span class="wr-flag ${f.c}"><span class="wr-flag-dot"></span>${f.t}</span>`).join('') || dash}</td>
                    </tr>`).join('')}
                </tbody>
            </table></div>
            <div class="wr-note">“Thời gian học” là tổng thời gian học trên toàn website (đề thi, bài học…). “Từ vựng lớp” đếm số từ trong thư mục này mà học viên đã đánh giá trong tuần.</div>`;
    }

    // ── CSS dùng chung (chèn 1 lần) ──
    function injectCss() {
        if (document.getElementById('wr-css')) return;
        const st = document.createElement('style');
        st.id = 'wr-css';
        st.textContent = `
            .wr-scope { --tx:#1f2937; --sub:#6b7280; --mute:#9ca3af; --bd:#e5e7eb; --soft:#f8fafc; --card:#fff;
                --pos:#059669; --pos-soft:#ecfdf5; --neg:#e11d48; --neg-soft:#fff1f2; --warn:#b45309; --warn-soft:#fffbeb;
                font-family: 'Pretendard','Inter',sans-serif; color: var(--tx); }
            body.dark-mode .wr-scope { --tx:#f1f5f9; --sub:#94a3b8; --mute:#64748b; --bd:#334155; --soft:#0f172a; --card:#1e293b;
                --pos:#34d399; --pos-soft:#052e22; --neg:#fb7185; --neg-soft:#3b0d18; --warn:#fbbf24; --warn-soft:#2d1f05; }
            .wr-i { width: 1em; height: 1em; flex-shrink: 0; }
            #weeklyReportBox { background: var(--card); border: 1px solid var(--bd); border-radius: 16px; padding: 22px; margin-bottom: 20px; }
            .wr-head { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 18px; flex-wrap: wrap; }
            .wr-head-l { display: flex; align-items: center; gap: 12px; min-width: 0; }
            .wr-title { font-size: 1.15em; font-weight: 800; color: var(--tx); }
            .wr-range { font-size: .84em; color: var(--sub); font-weight: 500; margin-top: 1px; }
            .wr-muted { color: var(--mute); }
            .wr-num { font-variant-numeric: tabular-nums; }
            .wr-pos { color: var(--pos) !important; } .wr-neg { color: var(--neg) !important; }
            .c-cyan { color: #0891b2; } .c-orange { color: #ea580c; } .c-blue { color: #1d4ed8; } .c-violet { color: #7c3aed; }
            body.dark-mode .c-cyan { color: #67e8f9; } body.dark-mode .c-orange { color: #fdba74; } body.dark-mode .c-blue { color: #93c5fd; } body.dark-mode .c-violet { color: #c4b5fd; }

            /* KPI (giống .ach-score-card) */
            .wr-kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
            .wr-kpis-3 { grid-template-columns: repeat(3, 1fr); margin-bottom: 18px; }
            .wr-kpi { background: var(--card); border: 1px solid var(--bd); border-radius: 16px; padding: 14px; min-width: 0; transition: .2s; }
            .wr-kpi:hover { border-color: #93c5fd; box-shadow: 0 8px 20px rgba(37,99,235,.10); transform: translateY(-2px); }
            .wr-kpi-top { display: flex; align-items: center; gap: 10px; }
            .wr-kpi-l { font-size: .82em; color: var(--sub); font-weight: 700; line-height: 1.25; }
            .wr-kpi-v { font-size: 1.75em; font-weight: 900; line-height: 1.1; margin-top: 12px; font-variant-numeric: tabular-nums; white-space: nowrap; }
            .wr-kpi-v small { font-size: .5em; color: var(--mute); font-weight: 700; margin-left: 1px; }
            .wr-kpi-s { display: flex; align-items: center; gap: 6px; margin-top: 8px; min-height: 22px; flex-wrap: wrap; }
            .wr-kpi-s > span:not(.wr-d) { font-size: .76em; color: var(--sub); font-weight: 600; }
            .wr-d { display: inline-flex; align-items: center; gap: 3px; font-size: .74em; font-weight: 800; padding: 3px 8px; border-radius: 999px; font-variant-numeric: tabular-nums; }
            .wr-d .wr-i { width: 11px; height: 11px; }
            .wr-up { color: var(--pos); background: var(--pos-soft); } .wr-down { color: var(--neg); background: var(--neg-soft); } .wr-flat { color: var(--sub); background: var(--soft); }

            /* Biểu đồ + panel */
            .wr-body { display: grid; grid-template-columns: 1fr 250px; gap: 12px; margin-top: 12px; }
            .wr-panel { background: var(--card); border: 1px solid var(--bd); border-radius: 16px; padding: 16px; }
            .wr-panel-h { display: flex; justify-content: space-between; align-items: center; gap: 10px; font-size: .95em; font-weight: 800; color: var(--tx); margin-bottom: 14px; }
            .wr-panel-h > span:first-child { display: inline-flex; align-items: center; gap: 7px; }
            .wr-panel-h > span:first-child .wr-i { color: #2563eb; font-size: 1.15em; }
            .wr-panel-h .wr-muted { font-weight: 600; font-size: .85em; }
            .wr-link { display: inline-flex; align-items: center; gap: 4px; font-size: .85em; font-weight: 800; color: #2563eb; text-decoration: none; }
            .wr-link:hover { text-decoration: underline; }
            .wr-chart { display: flex; gap: 8px; align-items: stretch; height: 160px; }
            .wr-col { flex: 1; display: flex; flex-direction: column; align-items: center; min-width: 0; }
            .wr-bar-wrap { flex: 1; width: 100%; display: flex; flex-direction: column; justify-content: flex-end; align-items: center; background: var(--soft); border-radius: 10px; padding: 0 4px; }
            .wr-bar { width: 100%; max-width: 34px; background: linear-gradient(180deg, #93c5fd, #3b82f6); border-radius: 8px 8px 4px 4px; box-shadow: 0 4px 10px -4px rgba(37,99,235,.5); }
            .wr-col.today .wr-bar { background: linear-gradient(180deg, #fdba74, #f97316); box-shadow: 0 4px 10px -4px rgba(249,115,22,.55); }
            .wr-col.future .wr-bar-wrap { background: repeating-linear-gradient(-45deg, var(--soft), var(--soft) 6px, transparent 6px, transparent 12px); }
            .wr-val { font-size: .72em; color: var(--sub); font-weight: 800; margin-bottom: 4px; font-variant-numeric: tabular-nums; min-height: 14px; }
            .wr-dow { font-size: .76em; color: var(--sub); font-weight: 700; height: 24px; line-height: 24px; white-space: nowrap; }
            .wr-col.today .wr-dow { color: #ea580c; font-weight: 900; }
            .wr-col.future .wr-dow { color: var(--mute); }
            .wr-seg { display: inline-flex; background: var(--soft); border: 1px solid var(--bd); border-radius: 10px; padding: 3px; gap: 2px; }
            .wr-seg button { border: 0; background: transparent; font: inherit; font-size: .8em; font-weight: 700; color: var(--sub); padding: 5px 11px; border-radius: 7px; cursor: pointer; transition: .15s; }
            .wr-seg button:hover { color: var(--tx); }
            .wr-seg button.on { background: var(--card); color: #2563eb; box-shadow: 0 1px 3px rgba(15,23,42,.12); }
            body.dark-mode .wr-seg button.on { color: #93c5fd; }
            .wr-chart-30 { gap: 3px; }
            .wr-chart-30 .wr-bar-wrap { border-radius: 6px; padding: 0 1px; }
            .wr-chart-30 .wr-bar { border-radius: 4px 4px 2px 2px; box-shadow: none; }
            .wr-chart-30 .wr-dow { font-size: .68em; overflow: visible; }
            .wr-chart-foot { display: flex; flex-wrap: wrap; gap: 6px 16px; margin-top: 10px; font-size: .8em; color: var(--sub); font-weight: 600; }
            .wr-chart-foot b { color: var(--tx); font-weight: 800; }
            .wr-pair { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
            .wr-pair-box { border-radius: 12px; padding: 12px 10px; text-align: center; }
            .wr-pair-box.red { background: var(--neg-soft); color: var(--neg); } .wr-pair-box.green { background: var(--pos-soft); color: var(--pos); }
            .wr-pair-v { font-size: 1.7em; font-weight: 900; line-height: 1.1; font-variant-numeric: tabular-nums; }
            .wr-pair-l { font-size: .76em; font-weight: 700; margin-top: 3px; opacity: .85; }
            .wr-pair-cap { display: flex; justify-content: space-between; font-size: .8em; color: var(--sub); font-weight: 700; margin-top: 16px; }
            .wr-pair-cap b { color: var(--pos); font-weight: 900; }
            .wr-pair-bar { height: 8px; border-radius: 999px; background: #e5e7eb; margin-top: 6px; overflow: hidden; }
            body.dark-mode .wr-pair-bar { background: #334155; }
            .wr-pair-bar div { height: 100%; background: linear-gradient(90deg, #34d399, #059669); border-radius: 999px; }

            /* Nhận xét */
            .wr-tips { margin-top: 12px; background: linear-gradient(135deg, #eff6ff, #f5f3ff); border: 1px solid #dbeafe; border-radius: 16px; padding: 16px; }
            body.dark-mode .wr-tips { background: linear-gradient(135deg, #172554, #2e1065); border-color: #1e3a8a; }
            .wr-tips .wr-panel-h { margin-bottom: 8px; }
            .wr-tip { display: flex; align-items: center; gap: 12px; padding: 10px 12px; margin-top: 8px; background: var(--card); border-radius: 12px; font-size: .92em; line-height: 1.5; color: var(--tx);
                box-shadow: 0 1px 3px rgba(15,23,42,.06); }
            .wr-tip b { font-weight: 800; }
            .wr-tip-t { flex: 1; min-width: 0; }
            .wr-tip-a { display: inline-flex; align-items: center; gap: 6px; flex-shrink: 0; height: 34px; padding: 0 14px; border-radius: 10px;
                font-size: .86em; font-weight: 800; color: #fff; text-decoration: none; background: linear-gradient(135deg, #3b82f6, #2563eb); box-shadow: 0 6px 14px -6px rgba(37,99,235,.55); transition: .15s; }
            .wr-tip-a:hover { transform: translateY(-1px); }
            .wr-sk { display: inline-block; vertical-align: middle; height: .85em; width: 3em; max-width: 100%; border-radius: 6px;
                background: linear-gradient(90deg, #eef2f7 25%, #f8fafc 50%, #eef2f7 75%); background-size: 200% 100%; animation: wrSk 1.3s ease-in-out infinite; }
            body.dark-mode .wr-sk { background: linear-gradient(90deg, #273449 25%, #334155 50%, #273449 75%); background-size: 200% 100%; }
            .wr-sk-tile { width: 34px; height: 34px; border-radius: 10px; flex-shrink: 0; }
            .wr-tip-sk { align-items: center; }
            .wr-chart-sk .wr-bar-wrap { background: linear-gradient(90deg, #eef2f7 25%, #f8fafc 50%, #eef2f7 75%); background-size: 200% 100%; animation: wrSk 1.3s ease-in-out infinite; }
            body.dark-mode .wr-chart-sk .wr-bar-wrap { background: linear-gradient(90deg, #273449 25%, #334155 50%, #273449 75%); background-size: 200% 100%; }
            @keyframes wrSk { 0% { background-position: 100% 0; } 100% { background-position: -100% 0; } }
            .wr-loading { display: flex; flex-direction: column; align-items: center; gap: 12px; text-align: center; color: var(--sub); font-weight: 600; padding: 30px 20px; }
            .wr-spin { width: 36px; height: 36px; border: 4px solid #dbeafe; border-top-color: #2563eb; border-radius: 50%; animation: wrSpin .9s linear infinite; }
            @keyframes wrSpin { to { transform: rotate(360deg); } }

            /* Modal giáo viên */
            .wr-modal-ov { position: fixed; inset: 0; background: rgba(15,23,42,.55); z-index: 100000; display: flex; align-items: center; justify-content: center; padding: 18px;
                backdrop-filter: blur(5px); -webkit-backdrop-filter: blur(5px); animation: wrFade .2s both; }
            @keyframes wrFade { from { opacity: 0; } to { opacity: 1; } }
            @keyframes wrIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
            .wr-modal { background: var(--card); border-radius: 22px; width: 100%; max-width: 1040px; max-height: 92vh; display: flex; flex-direction: column; overflow: hidden;
                box-shadow: 0 30px 70px -20px rgba(0,0,0,.45); animation: wrIn .3s both; }
            .wr-modal-head { display: flex; justify-content: space-between; align-items: center; gap: 14px; padding: 18px 22px; border-bottom: 1px solid var(--bd); background: var(--soft); }
            .wr-modal-body { padding: 18px 22px 22px; overflow-y: auto; }
            .wr-close { border: 1.5px solid var(--bd); background: var(--card); border-radius: 11px; width: 38px; height: 38px; cursor: pointer; color: var(--sub); flex-shrink: 0;
                display: flex; align-items: center; justify-content: center; font-size: 16px; transition: .15s; }
            .wr-close:hover { color: var(--neg); border-color: #fecdd3; background: var(--neg-soft); }
            .wr-table-wrap { overflow-x: auto; border: 1px solid var(--bd); border-radius: 16px; }
            .wr-table { width: 100%; border-collapse: collapse; font-size: .9em; }
            .wr-table th { text-align: left; background: var(--soft); color: var(--sub); font-weight: 800; font-size: .82em; padding: 11px 14px; white-space: nowrap; border-bottom: 1px solid var(--bd); }
            .wr-table td { padding: 12px 14px; border-bottom: 1px solid var(--bd); vertical-align: middle; color: var(--tx); }
            .wr-table tbody tr:last-child td { border-bottom: 0; }
            .wr-table tbody tr:hover { background: #f8fbff; }
            body.dark-mode .wr-table tbody tr:hover { background: #172036; }
            .wr-who { display: flex; align-items: center; gap: 11px; }
            .wr-av { width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: .8em; font-weight: 900; color: #fff; flex-shrink: 0;
                background: linear-gradient(135deg, #60a5fa, #2563eb); box-shadow: 0 4px 10px -4px rgba(37,99,235,.55); }
            .wr-table tr:nth-child(4n+2) .wr-av { background: linear-gradient(135deg, #a78bfa, #7c3aed); box-shadow: 0 4px 10px -4px rgba(124,58,237,.55); }
            .wr-table tr:nth-child(4n+3) .wr-av { background: linear-gradient(135deg, #34d399, #059669); box-shadow: 0 4px 10px -4px rgba(5,150,105,.55); }
            .wr-table tr:nth-child(4n+4) .wr-av { background: linear-gradient(135deg, #fb7185, #f95052); box-shadow: 0 4px 10px -4px rgba(249,80,82,.55); }
            .wr-name { font-weight: 800; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; } .wr-email { font-size: .8em; color: var(--mute); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
            .wr-cell-v { font-weight: 800; font-variant-numeric: tabular-nums; margin-bottom: 3px; }
            .wr-days { display: inline-flex; gap: 3px; margin-right: 8px; vertical-align: middle; }
            .wr-days i { width: 7px; height: 16px; border-radius: 3px; background: #e5e7eb; }
            body.dark-mode .wr-days i { background: #334155; }
            .wr-days i.on { background: linear-gradient(180deg, #60a5fa, #2563eb); }
            .wr-flag { display: inline-flex; align-items: center; gap: 6px; font-size: .78em; font-weight: 800; padding: 4px 10px 4px 8px; border-radius: 999px; margin: 2px 4px 2px 0; white-space: nowrap; }
            .wr-flag-dot { width: 7px; height: 7px; border-radius: 50%; background: currentColor; box-shadow: 0 0 0 3px rgba(255,255,255,.6); }
            .wr-flag.bad { background: var(--neg-soft); color: var(--neg); } .wr-flag.warn { background: var(--warn-soft); color: var(--warn); } .wr-flag.good { background: var(--pos-soft); color: var(--pos); }
            .wr-note { font-size: .8em; color: var(--mute); margin-top: 12px; line-height: 1.55; }

            @media (max-width: 860px) {
                .wr-body { grid-template-columns: 1fr; }
                .wr-kpis { grid-template-columns: repeat(2, 1fr); }
            }
            @media (max-width: 640px) {
                #weeklyReportBox { padding: 16px 12px; }
                .wr-kpis { gap: 8px; }
                .wr-kpi { padding: 12px; }
                .wr-kpi-v { font-size: 1.45em; }
                .wr-kpis-3 { grid-template-columns: 1fr; }
                .wr-chart { gap: 4px; height: 140px; }
                .wr-chart-30 { gap: 2px; }
                .wr-chart-30 .wr-dow { font-size: .6em; }
                .wr-dow { font-size: .68em; }
                .wr-tip { flex-wrap: wrap; }
                .wr-tip-t { flex: 1 1 calc(100% - 46px); }
                .wr-tip-a { margin-left: 46px; }
                .wr-modal-ov { padding: 0; align-items: stretch; }
                .wr-modal { max-height: 100vh; border-radius: 0; }
                .wr-modal-head { padding: 14px; } .wr-modal-body { padding: 14px; }
                .wr-table-wrap { border: 0; }
                .wr-table thead { display: none; }
                .wr-table, .wr-table tbody, .wr-table tr, .wr-table td { display: block; width: 100%; }
                .wr-table tr { border: 1px solid var(--bd); border-radius: 14px; margin-bottom: 10px; padding: 8px 2px; }
                .wr-table td, .wr-table tbody tr:last-child td { border: none; padding: 5px 12px; }
                .wr-table td[data-l] { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; }
                .wr-table td[data-l]::before { content: attr(data-l); color: var(--sub); font-size: .85em; font-weight: 700; }
                .wr-table td[data-l] br { display: none; }
                .wr-table td[data-l] .wr-cell-v { margin: 0 6px 0 auto; }
            }`;
        document.head.appendChild(st);
    }

    injectCss();
    window.WeeklyReport = { initStudent, openTeacherReport, weekStats, loadStudentData };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initStudent);
    else initStudent();
})();
