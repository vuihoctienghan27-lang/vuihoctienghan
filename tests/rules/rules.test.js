/* Test firestore.rules bằng emulator (cần Java 11+).
   Chạy:  cd tests/rules && npm install && npm test
   Mỗi test mô phỏng đúng payload mà client hiện tại gửi (auth.js, activity-tracker.js,
   korean-chat-widget.js, forum.js...) để chắc chắn rules không chặn nhầm. */
'use strict';

const fs = require('fs');
const path = require('path');
const { test, before, after, beforeEach } = require('node:test');
const {
  initializeTestEnvironment, assertSucceeds, assertFails,
} = require('@firebase/rules-unit-testing');
const {
  doc, setDoc, updateDoc, getDoc, getDocs, deleteDoc, query, where, collection, addDoc, writeBatch,
  serverTimestamp, increment, Timestamp,
} = require('firebase/firestore');

let env;
const ALICE = 'alice';
const BOB = 'bob';
const aliceEmail = 'alice@example.com';

function today(offsetDays = 0) {
  const d = new Date(Date.now() + offsetDays * 86400000);
  return d.toISOString().slice(0, 10);
}
const db = (uid, email) => env.authenticatedContext(uid, { email: email || uid + '@example.com' }).firestore();
const anon = () => env.unauthenticatedContext().firestore();
const seed = (p, data) => env.withSecurityRulesDisabled((ctx) => setDoc(doc(ctx.firestore(), p), data));

before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-vuihoc',
    firestore: { rules: fs.readFileSync(path.join(__dirname, '../../firestore.rules'), 'utf8') },
  });
});
after(() => env.cleanup());
beforeEach(() => env.clearFirestore());

// ───────── USERS ─────────
test('đăng nhập lần đầu (auth.js) tạo hồ sơ được', async () => {
  await assertSucceeds(setDoc(doc(db(ALICE, aliceEmail), 'users', ALICE),
    { fullName: 'Alice', lastLoginAt: new Date().toISOString() }, { merge: true }));
  // email KHÔNG được lưu trong users (đọc công khai) — auth.js ghi vào user_private
  await assertFails(setDoc(doc(db(BOB), 'users', BOB), { email: 'bob@example.com' }, { merge: true }));
});

test('không thể tạo hồ sơ với EXP / role admin', async () => {
  await assertFails(setDoc(doc(db(ALICE, aliceEmail), 'users', ALICE), { bonusEXP: 99999 }));
  await assertFails(setDoc(doc(db(ALICE, aliceEmail), 'users', ALICE), { role: 'admin' }));
});

test('activity-tracker: +1 phút kèm studyTickAt được; ghi liền lần 2 bị chặn', async () => {
  await seed(`users/${ALICE}`, { totalStudyMinutes: 10 });
  const ref = doc(db(ALICE), 'users', ALICE);
  const tick = { totalStudyMinutes: increment(1), studyTickAt: serverTimestamp(), [`dailyStudyData.${today()}`]: increment(1) };
  await assertSucceeds(setDoc(ref, tick, { merge: true }));
  await assertFails(setDoc(ref, tick, { merge: true })); // < 50 giây
});

test('không thể tự cộng phút học mà không có studyTickAt, hoặc +100 phút', async () => {
  await seed(`users/${ALICE}`, { totalStudyMinutes: 10 });
  const ref = doc(db(ALICE), 'users', ALICE);
  await assertFails(updateDoc(ref, { totalStudyMinutes: 11 }));
  await assertFails(updateDoc(ref, { totalStudyMinutes: 110, studyTickAt: serverTimestamp() }));
});

test('bonusEXP: +100 kèm bonusEXPAt được; 999999 bị chặn; giảm bị chặn', async () => {
  await seed(`users/${ALICE}`, { bonusEXP: 50 });
  const ref = doc(db(ALICE), 'users', ALICE);
  await assertFails(updateDoc(ref, { bonusEXP: 999999, bonusEXPAt: serverTimestamp() }));
  await assertFails(updateDoc(ref, { bonusEXP: increment(10) })); // thiếu bonusEXPAt
  await assertSucceeds(updateDoc(ref, { bonusEXP: increment(100), bonusEXPAt: serverTimestamp() }));
  await assertFails(updateDoc(ref, { bonusEXP: increment(10), bonusEXPAt: serverTimestamp() })); // < 20 giây
});

test('bonusEXP giảm bị chặn', async () => {
  await seed(`users/${ALICE}`, { bonusEXP: 50 });
  await assertFails(updateDoc(doc(db(ALICE), 'users', ALICE), { bonusEXP: 0, bonusEXPAt: serverTimestamp() }));
});

test('streak (auth.js): +1 khi sang ngày mới được; nhảy 100 bị chặn', async () => {
  await seed(`users/${ALICE}`, { streakDays: 3, lastLoginDate: today(-1), streakBonusDays: 3 });
  const ref = doc(db(ALICE), 'users', ALICE);
  await assertFails(updateDoc(ref, { streakDays: 100, lastLoginDate: today() }));
  await assertFails(updateDoc(ref, { streakDays: 4, lastLoginDate: today(5) })); // ngày tương lai
  await assertSucceeds(setDoc(ref, { lastLoginDate: today(), streakDays: 4, streakBonusDays: 4 }, { merge: true }));
  await assertSucceeds(updateDoc(ref, { streakDays: 1 })); // reset luôn được
});

test('không tự phong admin; widget chat ghi role member được', async () => {
  await seed(`users/${ALICE}`, { fullName: 'Alice' });
  const ref = doc(db(ALICE, aliceEmail), 'users', ALICE);
  await assertFails(updateDoc(ref, { role: 'admin' }));
  await assertFails(updateDoc(ref, { roleTitle: '👑 Quản Trị Viên (Admin)' }));
  await assertSucceeds(setDoc(ref, {
    name: 'Alice', avatar: 'https://lh3.googleusercontent.com/a.png', role: 'member',
    roleTitle: 'Thành viên cộng đồng', joinedDate: '1/1/2026', lastSeen: Date.now(),
  }, { merge: true }));
});

test('avatar javascript:/tên quá dài bị chặn; sửa hồ sơ mypage được', async () => {
  await seed(`users/${ALICE}`, { fullName: 'Alice' });
  const ref = doc(db(ALICE), 'users', ALICE);
  await assertFails(updateDoc(ref, { avatar: 'javascript:alert(1)' }));
  await assertFails(updateDoc(ref, { fullName: 'x'.repeat(500) }));
  await assertSucceeds(setDoc(ref, { fullName: 'Alice B', dob: '2000-01-01', studyPurpose: 'TOPIK', studyDuration: '6 tháng' }, { merge: true }));
});

test('ghi vocabLists / điểm game / bio vẫn được', async () => {
  await seed(`users/${ALICE}`, { fullName: 'Alice' });
  const ref = doc(db(ALICE), 'users', ALICE);
  await assertSucceeds(setDoc(ref, { vocabLists: ['Đã lưu', 'Daily Vocab'] }, { merge: true }));
  await assertSucceeds(setDoc(ref, { gameStarshipScore: 1200 }, { merge: true }));
  await assertSucceeds(setDoc(ref, { bio: 'Fighting!' }, { merge: true }));
});

test('người khác không sửa được hồ sơ; ai cũng đọc được (bảng xếp hạng)', async () => {
  await seed(`users/${ALICE}`, { fullName: 'Alice' });
  await assertFails(updateDoc(doc(db(BOB), 'users', ALICE), { fullName: 'hacked' }));
  await assertSucceeds(getDoc(doc(anon(), 'users', ALICE)));
});

test('admin vẫn chỉnh EXP được (admin-fix-exp.html)', async () => {
  await seed(`users/${ALICE}`, { bonusEXP: 5000 });
  await assertSucceeds(updateDoc(doc(db('admin', 'vuihoctienghan27@gmail.com'), 'users', ALICE), { bonusEXP: 100 }));
});

// ───────── SOCIAL ─────────
test('chat công khai: tin hợp lệ được, tin 10k ký tự bị chặn', async () => {
  const c = collection(db(ALICE), 'public_messages');
  const base = { userId: ALICE, userName: 'Alice', userAvatar: '', createdAt: Date.now(), timestamp: '10:00' };
  await assertSucceeds(addDoc(c, { ...base, content: 'Xin chào 안녕' }));
  await assertFails(addDoc(c, { ...base, content: 'x'.repeat(10000) }));
  await assertFails(addDoc(c, { ...base, userId: BOB, content: 'giả danh' }));
});

test('forum: người khác trả lời + tăng replyCount + gửi thông báo trong 1 batch', async () => {
  await seed('forum_posts/p1', { userId: BOB, title: 'Hỏi', content: '...', replyCount: 0 });
  const d = db(ALICE);
  const b = writeBatch(d);
  b.set(doc(collection(d, 'forum_replies')), { postId: 'p1', userId: ALICE, userName: 'Alice', text: 'Trả lời', createdAt: serverTimestamp() });
  b.update(doc(d, 'forum_posts', 'p1'), { replyCount: increment(1) });
  b.set(doc(collection(d, 'notifications')), { userId: BOB, type: 'reply', postId: 'p1', postTitle: 'Hỏi', fromUserId: ALICE, fromUserName: 'Alice', read: false, createdAt: serverTimestamp() });
  await assertSucceeds(b.commit());
});

test('forum: người khác không sửa được nội dung / replyCount +100', async () => {
  await seed('forum_posts/p1', { userId: BOB, title: 'Hỏi', content: '...', replyCount: 0 });
  await assertFails(updateDoc(doc(db(ALICE), 'forum_posts', 'p1'), { content: 'hacked' }));
  await assertFails(updateDoc(doc(db(ALICE), 'forum_posts', 'p1'), { replyCount: 100 }));
});

test('thông báo: người nhận chỉ đánh dấu đã đọc', async () => {
  await seed('notifications/n1', { userId: ALICE, fromUserId: BOB, type: 'reply', read: false });
  await assertSucceeds(updateDoc(doc(db(ALICE), 'notifications', 'n1'), { read: true }));
  await assertFails(updateDoc(doc(db(ALICE), 'notifications', 'n1'), { userId: BOB }));
});

test('feedback: gửi bình thường được, tự đặt status=done bị chặn', async () => {
  const c = collection(db(ALICE, aliceEmail), 'feedback');
  const base = { email: aliceEmail, name: 'Alice', message: 'Góp ý', uid: ALICE, createdAt: serverTimestamp() };
  await assertSucceeds(addDoc(c, { ...base, status: 'new' }));
  await assertFails(addDoc(c, { ...base, status: 'done' }));
});

test('daily-articles: tăng viewCount +1 được, đặt 1 triệu bị chặn', async () => {
  await seed('daily-articles/a1', { title: 'x', viewCount: 5 });
  await assertSucceeds(updateDoc(doc(anon(), 'daily-articles', 'a1'), { viewCount: increment(1) }));
  await assertFails(updateDoc(doc(anon(), 'daily-articles', 'a1'), { viewCount: 1000000 }));
});

test('lời mời kết bạn: hợp lệ được, tự gửi cho mình bị chặn', async () => {
  const c = collection(db(ALICE), 'friend_requests');
  const base = { senderId: ALICE, senderName: 'Alice', senderAvatar: '', receiverName: 'Bob', createdAt: Date.now() };
  await assertSucceeds(addDoc(c, { ...base, receiverId: BOB }));
  await assertFails(addDoc(c, { ...base, receiverId: ALICE }));
});

test('học viên ghi danh lớp (shared-vocab.js) được, tên 1000 ký tự bị chặn', async () => {
  await seed('shared_folders/f1', { name: 'Lớp 1', keyCode: 'CLASS-AB12' });
  const ref = doc(db(ALICE, aliceEmail), 'shared_folders/f1/students', ALICE);
  const base = { uid: ALICE, keyCode: 'CLASS-AB12', email: aliceEmail, photoURL: '', joinedAt: serverTimestamp(), lastActiveAt: serverTimestamp() };
  await assertFails(setDoc(ref, { ...base, displayName: 'x'.repeat(1000) }, { merge: true }));
  await assertSucceeds(setDoc(ref, { ...base, displayName: 'Alice' }, { merge: true }));
});

// ───────── LỚP HỌC: KEY CODE / BÀI NỘP ─────────
test('Key Code: tra đúng 1 mã được, liệt kê mã bị chặn; sai mã không ghi danh được', async () => {
  await seed('shared_folders/f1', { name: 'Lớp 1', keyCode: 'CLASS-AB12' });
  await seed('shared_folders/f1/words/w1', { word: '학교' });
  await seed('folder_keys/CLASS-AB12', { folderId: 'f1' });
  const bob = db(BOB);
  await assertSucceeds(getDoc(doc(bob, 'folder_keys', 'CLASS-AB12')));
  await assertFails(getDocs(collection(bob, 'folder_keys')));
  await assertFails(getDocs(query(collection(bob, 'shared_folders'), where('keyCode', '==', 'CLASS-AB12'))));
  // Chưa ghi danh → không đọc được lớp
  await assertFails(getDoc(doc(bob, 'shared_folders', 'f1')));
  await assertFails(getDocs(collection(bob, 'shared_folders/f1/words')));
  // Sai mã / thiếu mã → không ghi danh được
  const st = doc(bob, 'shared_folders/f1/students', BOB);
  await assertFails(setDoc(st, { uid: BOB, keyCode: 'WRONG', displayName: 'Bob' }, { merge: true }));
  await assertFails(setDoc(st, { uid: BOB, displayName: 'Bob' }, { merge: true }));
  // Đúng mã → ghi danh và đọc được nội dung lớp
  await assertSucceeds(setDoc(st, { uid: BOB, keyCode: 'CLASS-AB12', displayName: 'Bob' }, { merge: true }));
  await assertSucceeds(getDoc(doc(bob, 'shared_folders', 'f1')));
  await assertSucceeds(getDocs(collection(bob, 'shared_folders/f1/words')));
  // Đã ghi danh: cập nhật lastActiveAt không cần mã
  await assertSucceeds(setDoc(st, { uid: BOB, displayName: 'Bob', lastActiveAt: serverTimestamp() }, { merge: true }));
});

test('Bài nộp: học viên nộp / nộp lại được nhưng không tự chấm điểm', async () => {
  const p = `shared_folders/f1/exercises/e1/submissions/${ALICE}`;
  const sub = { studentUid: ALICE, studentName: 'Alice', studentWorksheetHtml: '<p>bài</p>', originalText: 'bài', status: 'submitted', submittedAt: serverTimestamp() };
  await assertSucceeds(setDoc(doc(db(ALICE), p), sub, { merge: true }));
  await assertFails(setDoc(doc(db(ALICE), p), { score: '10', status: 'graded' }, { merge: true }));
  await assertFails(setDoc(doc(db(ALICE), p), { teacherFeedback: 'Giỏi' }, { merge: true }));
  await assertFails(setDoc(doc(db(BOB), `shared_folders/f1/exercises/e1/submissions/${ALICE}`), sub, { merge: true }));
  // Giáo viên chấm
  await assertSucceeds(setDoc(doc(db('admin', 'vuihoctienghan27@gmail.com'), p),
    { correctedHtml: '<p>sửa</p>', score: '8', teacherFeedback: 'Tốt', status: 'graded', gradedAt: serverTimestamp() }, { merge: true }));
  // Học viên nộp lại (giữ nguyên điểm cũ) được, sửa điểm thì không
  await assertSucceeds(setDoc(doc(db(ALICE), p), sub, { merge: true }));
  await assertFails(setDoc(doc(db(ALICE), p), { ...sub, score: '10' }, { merge: true }));
});

// ───────── BẠN BÈ / NHẮN TIN RIÊNG ─────────
test('Kết bạn (chatbox): phải có lời mời từ bạn kia mới tạo được friendship', async () => {
  const fid = [ALICE, BOB].sort().join('_');
  const data = (extra) => ({ id: fid, users: [BOB, ALICE], userNames: {}, userAvatars: {}, createdAt: Date.now(), ...extra });
  // Không có lời mời → bị chặn
  await assertFails(setDoc(doc(db(BOB), 'friendships', fid), data({}), { merge: true }));
  await seed('friend_requests/r1', { senderId: ALICE, receiverId: BOB });
  // Người gửi tự chấp nhận lời mời của mình → bị chặn
  await assertFails(setDoc(doc(db(ALICE), 'friendships', fid), data({ fromRequest: 'r1' }), { merge: true }));
  // Người nhận chấp nhận → được
  await assertSucceeds(setDoc(doc(db(BOB), 'friendships', fid), data({ fromRequest: 'r1' }), { merge: true }));
});

test('Kết bạn (forum): lời mời pending; chỉ người được mời chấp nhận; chưa là bạn thì không nhắn direct_messages', async () => {
  const pending = { users: [ALICE, BOB], user1Id: ALICE, user1Name: 'Alice', user2Id: BOB, user2Name: 'Bob', status: 'pending', createdAt: serverTimestamp() };
  await assertSucceeds(setDoc(doc(db(ALICE), 'friendships', 'p1'), pending));
  await assertFails(setDoc(doc(db(ALICE), 'friendships', 'p2'), { ...pending, status: 'accepted' }));
  const msg = { friendshipId: 'p1', senderId: ALICE, text: 'hi', createdAt: serverTimestamp() };
  await assertFails(addDoc(collection(db(ALICE), 'direct_messages'), msg));
  await assertFails(updateDoc(doc(db(ALICE), 'friendships', 'p1'), { status: 'accepted' }));
  await assertSucceeds(updateDoc(doc(db(BOB), 'friendships', 'p1'), { status: 'accepted' }));
  await assertSucceeds(addDoc(collection(db(ALICE), 'direct_messages'), msg));
});

test('direct_chats: đúng cặp 2 người theo id, không đổi được thành viên', async () => {
  const pair = [ALICE, BOB].sort().join('_');
  await assertSucceeds(setDoc(doc(db(ALICE), 'direct_chats', pair), { participants: [ALICE, BOB], lastUpdated: Date.now() }, { merge: true }));
  await assertFails(setDoc(doc(db(ALICE), 'direct_chats', 'xyz'), { participants: [ALICE, 'carol'], lastUpdated: Date.now() }));
  await assertFails(setDoc(doc(db(ALICE), 'direct_chats', 'alice_carol_dave'), { participants: [ALICE, 'carol', 'dave'] }));
  await assertFails(updateDoc(doc(db(ALICE), 'direct_chats', pair), { participants: [ALICE, 'carol'] }));
  await assertSucceeds(setDoc(doc(db(BOB), 'direct_chats', pair), { participants: [BOB, ALICE], lastUpdated: Date.now() }, { merge: true }));
});

test('app_config: chỉ người đã đăng nhập đọc được (tạm thời, chờ Blaze)', async () => {
  await seed('app_config/ai_grader', { geminiKeys: ['secret'] });
  await assertFails(getDoc(doc(anon(), 'app_config', 'ai_grader')));
  await assertSucceeds(getDoc(doc(db(ALICE), 'app_config', 'ai_grader')));
  await assertFails(setDoc(doc(db(ALICE), 'app_config', 'ai_grader'), { geminiKeys: [] }));
});

// ───────── SỔ CÂU SAI / SRS / BÁO CÁO TUẦN ─────────
test('Sổ câu sai: chủ sở hữu ghi/đọc được, người khác thì không', async () => {
  const data = { source: 'exam', refId: 'reading/topik_ii/topik102', qNum: '3', options: ['a', 'b', 'c', 'd'],
    correctIndex: 3, userIndex: 0, questionHtml: '<b>câu hỏi</b>', explanationHtml: 'lời giải', wrongCount: increment(1), streak: 0, mastered: false };
  await assertSucceeds(setDoc(doc(db(ALICE), 'users', ALICE, 'mistakes', 'ex_q3'), data, { merge: true }));
  await assertSucceeds(updateDoc(doc(db(ALICE), 'users', ALICE, 'mistakes', 'ex_q3'), { streak: 2, mastered: true }));
  await assertFails(getDoc(doc(db(BOB), 'users', ALICE, 'mistakes', 'ex_q3')));
  await assertFails(setDoc(doc(db(BOB), 'users', ALICE, 'mistakes', 'x'), data));
});

test('Sổ câu sai: chặn HTML quá lớn / thiếu mastered', async () => {
  const ref = doc(db(ALICE), 'users', ALICE, 'mistakes', 'big');
  await assertFails(setDoc(ref, { mastered: false, explanationHtml: 'x'.repeat(30000) }));
  await assertFails(setDoc(ref, { streak: 0 }));
});

test('SRS: ghi dailyReviewData (đếm thẻ đã ôn) và lịch ôn từ vựng được', async () => {
  await seed(`users/${ALICE}`, { fullName: 'Alice' });
  await assertSucceeds(setDoc(doc(db(ALICE), 'users', ALICE), { dailyReviewData: { [today()]: increment(1) } }, { merge: true }));
  await seed(`users/${ALICE}/vocabulary/w1`, { word: '학교', meaning: 'trường', status: 0 });
  await assertSucceeds(updateDoc(doc(db(ALICE), 'users', ALICE, 'vocabulary', 'w1'),
    { status: 3, srsDue: Date.now() + 3 * 86400000, srsInt: 3, srsEase: 2.6, srsReps: 1, srsLapses: 0, srsLastAt: Date.now() }));
});

test('Báo cáo tuần (giáo viên): admin đọc được tiến độ từ vựng lớp của học viên', async () => {
  await seed(`shared_folders/f1/students/${ALICE}/progress/w1`, { status: 2, updatedAt: Timestamp.now() });
  await assertSucceeds(getDoc(doc(db('admin', 'vuihoctienghan27@gmail.com'), `shared_folders/f1/students/${ALICE}/progress/w1`)));
  await assertFails(getDoc(doc(db(BOB), `shared_folders/f1/students/${ALICE}/progress/w1`)));
});

// ───────── THI ĐẤU 1-1 / NHẮC NỘP BÀI ─────────
const duelQs = Array.from({ length: 10 }, (_, i) => ({ w: 'w' + i, o: ['a', 'b', 'c', 'd'], a: 0 }));

test('Thi đấu: tạo phòng, khách vào, mỗi người chỉ ghi phần của mình', async () => {
  const ref = (u) => doc(db(u), 'duels', 'ABC123');
  await assertSucceeds(setDoc(ref(ALICE), { hostId: ALICE, hostName: 'Alice', guestId: null, guestName: '', status: 'waiting', open: false, questions: duelQs, ['s_' + ALICE]: { answers: [], score: 0, done: false } }));
  await assertFails(setDoc(doc(db(BOB), 'duels', 'XYZ999'), { hostId: ALICE, guestId: null, status: 'waiting', questions: duelQs }));
  await assertSucceeds(updateDoc(ref(BOB), { guestId: BOB, guestName: 'Bob', status: 'playing', startAt: serverTimestamp(), ['s_' + BOB]: { answers: [], score: 0, done: false } }));
  await assertSucceeds(updateDoc(ref(BOB), { ['s_' + BOB]: { answers: [{ c: 0, ok: true, t: 900 }], score: 145, done: false } }));
  await assertFails(updateDoc(ref(BOB), { ['s_' + ALICE]: { answers: [], score: 0, done: true } }));   // sửa điểm đối thủ
  await assertFails(updateDoc(ref('carol'), { guestId: 'carol', status: 'playing' }));                  // người thứ 3
  await assertSucceeds(updateDoc(ref(ALICE), { status: 'finished', endedAt: serverTimestamp() }));
});

// ───────── NINJA PHI TIÊU (claims: ai phá từ trước) ─────────
const ninjaQs = Array.from({ length: 20 }, (_, i) => ({ w: '단어' + i, m: 'nghĩa ' + i, d: i % 2 ? 'v' : 'k', x: 0.5 }));
const ninjaRoom = (extra = {}) => ({ hostId: ALICE, hostName: 'Alice', guestId: null, guestName: '', status: 'waiting', open: false,
  game: 'ninja', ninjaMode: 'mix', questions: ninjaQs, ['s_' + ALICE]: { score: 0, done: false }, ...extra });
const claimRef = (u, i, room = 'NIN123') => doc(db(u), 'duels', room, 'claims', String(i));
const claim = (u) => ({ uid: u, at: serverTimestamp() });

test('Ninja: tạo phòng ninja ≤ 30 từ, chế độ hợp lệ; trắc nghiệm vẫn ≤ 15 câu', async () => {
  await assertSucceeds(setDoc(doc(db(ALICE), 'duels', 'NIN123'), ninjaRoom()));
  await assertFails(setDoc(doc(db(ALICE), 'duels', 'NIN124'), ninjaRoom({ ninjaMode: 'hack' })));
  await assertFails(setDoc(doc(db(ALICE), 'duels', 'NIN125'), ninjaRoom({ questions: Array(31).fill(ninjaQs[0]) })));
  await assertFails(setDoc(doc(db(ALICE), 'duels', 'NIN126'), ninjaRoom({ game: 'chess' })));
  await assertFails(setDoc(doc(db(ALICE), 'duels', 'QUZ127'), { hostId: ALICE, guestId: null, status: 'waiting', questions: Array(16).fill(duelQs[0]) }));
});

test('Ninja: chỉ người claim đầu tiên ăn điểm từ đó', async () => {
  await seed('duels/NIN123', ninjaRoom({ guestId: BOB, guestName: 'Bob', status: 'playing', startAt: Timestamp.now() }));
  await assertSucceeds(setDoc(claimRef(BOB, 3), claim(BOB)));
  await assertFails(setDoc(claimRef(ALICE, 3), claim(ALICE)));          // Bob đã phá từ 3
  await assertFails(setDoc(claimRef(BOB, 3), claim(BOB)));              // ghi đè chính mình cũng không được
  await assertFails(updateDoc(claimRef(BOB, 3), { uid: ALICE }));       // không sửa
  await assertSucceeds(setDoc(claimRef(ALICE, 4), claim(ALICE)));
  const c3 = await getDoc(claimRef(ALICE, 3));
  if (c3.data().uid !== BOB) throw new Error('claim 3 phải thuộc Bob');
});

test('Ninja: chặn claim giả mạo / sai chỉ số / ngoài người chơi / khi chưa chơi', async () => {
  await seed('duels/NIN123', ninjaRoom({ guestId: BOB, guestName: 'Bob', status: 'playing', startAt: Timestamp.now() }));
  await assertFails(setDoc(claimRef(BOB, 1), claim(ALICE)));                       // claim hộ người khác
  await assertFails(setDoc(claimRef('carol', 1), claim('carol')));                 // không phải người chơi
  await assertFails(setDoc(claimRef(BOB, 20), claim(BOB)));                        // ngoài số từ
  await assertFails(setDoc(claimRef(BOB, 'abc'), claim(BOB)));                     // id không phải số
  await assertFails(setDoc(claimRef(BOB, 2), { uid: BOB, at: serverTimestamp(), pts: 999 })); // thêm trường
  await assertFails(setDoc(claimRef(BOB, 2), { uid: BOB, at: Timestamp.fromMillis(0) }));     // giả thời gian
  // Phòng chưa bắt đầu / đã kết thúc / quá giờ / phòng trắc nghiệm
  await seed('duels/NIN200', ninjaRoom());
  await assertFails(setDoc(claimRef(ALICE, 0, 'NIN200'), claim(ALICE)));
  await seed('duels/NIN201', ninjaRoom({ guestId: BOB, status: 'finished', startAt: Timestamp.now() }));
  await assertFails(setDoc(claimRef(BOB, 0, 'NIN201'), claim(BOB)));
  await seed('duels/NIN202', ninjaRoom({ guestId: BOB, status: 'playing', startAt: Timestamp.fromMillis(Date.now() - 10 * 60 * 1000) }));
  await assertFails(setDoc(claimRef(BOB, 0, 'NIN202'), claim(BOB)));
  await seed('duels/QUZ203', { hostId: ALICE, guestId: BOB, status: 'playing', questions: duelQs, startAt: Timestamp.now() });
  await assertFails(setDoc(claimRef(BOB, 0, 'QUZ203'), claim(BOB)));
});

test('Ninja: khách vào phòng ninja và ghi điểm/lượt trượt của mình', async () => {
  await seed('duels/NIN123', ninjaRoom());
  const ref = (u) => doc(db(u), 'duels', 'NIN123');
  await assertSucceeds(updateDoc(ref(BOB), { guestId: BOB, guestName: 'Bob', status: 'playing', startAt: serverTimestamp(), ['s_' + BOB]: { score: 0, done: false } }));
  await assertSucceeds(updateDoc(ref(BOB), { ['s_' + BOB]: { score: 100, miss: { n: 1, i: 2 }, done: false } }));
  await assertFails(updateDoc(ref(BOB), { game: 'quiz' }));
});

// ───────── KÉO CO TRẮC NGHIỆM (claims: ai đúng trước, phải đúng đáp án) ─────────
const tugQs = Array.from({ length: 10 }, (_, i) => ({ w: 'w' + i, o: ['a', 'b', 'c', 'd'], a: i % 4 }));
const tugRoom = (extra = {}) => ({ hostId: ALICE, hostName: 'Alice', guestId: null, guestName: '', status: 'waiting', open: true,
  game: 'tug', questions: tugQs, ['s_' + ALICE]: { answers: [], score: 0, done: false }, ...extra });

test('Kéo co: tạo phòng tug ≤ 15 câu', async () => {
  await assertSucceeds(setDoc(doc(db(ALICE), 'duels', 'TUG100'), tugRoom()));
  await assertFails(setDoc(doc(db(ALICE), 'duels', 'TUG101'), tugRoom({ questions: Array(16).fill(tugQs[0]) })));
});

test('Kéo co: chỉ người đúng trước giành được câu; sai đáp án / thiếu đáp án bị chặn', async () => {
  await seed('duels/TUG100', tugRoom({ guestId: BOB, guestName: 'Bob', status: 'playing', startAt: Timestamp.now() }));
  const cref = (u, i) => doc(db(u), 'duels', 'TUG100', 'claims', String(i));
  await assertFails(setDoc(cref(BOB, 1), { uid: BOB, at: serverTimestamp(), c: 0 }));   // câu 1 đáp án là 1
  await assertFails(setDoc(cref(BOB, 1), { uid: BOB, at: serverTimestamp() }));         // thiếu đáp án
  await assertSucceeds(setDoc(cref(BOB, 1), { uid: BOB, at: serverTimestamp(), c: 1 }));
  await assertFails(setDoc(cref(ALICE, 1), { uid: ALICE, at: serverTimestamp(), c: 1 })); // Bob đã giành trước
  await assertSucceeds(setDoc(cref(ALICE, 2), { uid: ALICE, at: serverTimestamp(), c: 2 }));
  await assertFails(setDoc(cref('carol', 3), { uid: 'carol', at: serverTimestamp(), c: 3 })); // không phải người chơi
});

test('Kéo co: ghi câu trả lời sai của mình (s_<uid>.w.k) được, sửa của đối thủ bị chặn', async () => {
  await seed('duels/TUG100', tugRoom({ guestId: BOB, guestName: 'Bob', status: 'playing', startAt: Timestamp.now(), ['s_' + BOB]: { score: 0, done: false } }));
  const ref = (u) => doc(db(u), 'duels', 'TUG100');
  await assertSucceeds(updateDoc(ref(BOB), { ['s_' + BOB + '.w.3']: 5120 }));
  await assertSucceeds(updateDoc(ref(BOB), { ['s_' + BOB + '.done']: true, ['s_' + BOB + '.score']: 4 }));
  await assertFails(updateDoc(ref(BOB), { ['s_' + ALICE + '.w.3']: 1 }));
});

// ───────── ĐIỂM GAME (games/*.html) ─────────
test('Điểm game: chỉ tăng, là số, không vượt trần; người khác không sửa được', async () => {
  await seed(`users/${ALICE}`, { fullName: 'Alice', gameBansungScore: 500, gameMugonghwaScore: 40 });
  const ref = doc(db(ALICE), 'users', ALICE);
  await assertSucceeds(setDoc(ref, { gameBansungScore: 820 }, { merge: true }));        // kỷ lục mới
  await assertFails(setDoc(ref, { gameBansungScore: 100 }, { merge: true }));           // giảm điểm
  await assertFails(setDoc(ref, { gameBansungScore: 999999999 }, { merge: true }));     // vượt trần
  await assertFails(setDoc(ref, { gameBansungScore: '9999' }, { merge: true }));        // không phải số
  await assertSucceeds(setDoc(ref, { gameMugonghwaScore: 100 }, { merge: true }));       // 100% = về đích
  await assertFails(setDoc(ref, { gameMugonghwaScore: 101 }, { merge: true }));          // quá 100%
  await assertSucceeds(setDoc(ref, { gameFroggameScore: 300, gameStarshipScore: 1500 }, { merge: true }));
  await assertFails(setDoc(doc(db(BOB), 'users', ALICE), { gameFroggameScore: 99999 }, { merge: true }));
});

test('Điểm game: tạo hồ sơ mới kèm điểm vượt trần bị chặn; bảng xếp hạng top 10 đọc được', async () => {
  await assertFails(setDoc(doc(db(BOB), 'users', BOB), { gameStarshipScore: 5000000 }, { merge: true }));
  await assertSucceeds(setDoc(doc(db(BOB), 'users', BOB), { gameStarshipScore: 4200 }, { merge: true }));
  await seed(`users/${ALICE}`, { fullName: 'Alice', gameStarshipScore: 9000 });
  const { orderBy, limit } = require('firebase/firestore');
  const top = await assertSucceeds(getDocs(query(collection(anon(), 'users'), orderBy('gameStarshipScore', 'desc'), limit(10))));
  if (top.docs[0].id !== ALICE) throw new Error('top 1 phải là Alice');
});

test('Nhắc nộp bài: link nội bộ hợp lệ, không gửi cho chính mình', async () => {
  const c = collection(db(ALICE), 'notifications');
  const base = { type: 'deadline', fromUserId: ALICE, fromUserName: 'Cô Alice', message: 'Nhắc làm bài tập', read: false };
  await assertSucceeds(addDoc(c, { ...base, userId: BOB, link: 'vocab.html?sf=f1&sl=Bai1' }));
  await assertFails(addDoc(c, { ...base, userId: ALICE }));
  await assertFails(addDoc(c, { ...base, userId: BOB, link: 'x'.repeat(400) }));
});

test('Huy hiệu / thống kê thi đấu / luyện nói: chủ tài khoản ghi được', async () => {
  await seed(`users/${ALICE}`, { fullName: 'Alice' });
  await assertSucceeds(setDoc(doc(db(ALICE), 'users', ALICE), { badges: { streak3: Date.now() }, duelPlayed: increment(1), duelWins: increment(1), dailySpeakData: { [today()]: increment(1) } }, { merge: true }));
});

// ───────── HỌC VIÊN NỘI BỘ (access-gate.js + data.html) ─────────
const ADMIN = () => db('admin', 'vuihoctienghan27@gmail.com');

test('approved_students: chỉ admin cấp quyền; học viên chỉ đọc đúng email của mình', async () => {
  await assertFails(setDoc(doc(db(ALICE, aliceEmail), 'approved_students', aliceEmail), { email: aliceEmail }));
  await assertSucceeds(setDoc(doc(ADMIN(), 'approved_students', aliceEmail), { email: aliceEmail, uid: ALICE }));
  await assertSucceeds(getDoc(doc(db(ALICE, aliceEmail), 'approved_students', aliceEmail)));
  await assertSucceeds(getDoc(doc(db(BOB), 'approved_students', 'bob@example.com')));   // doc chưa có vẫn GET được
  await assertFails(getDoc(doc(db(BOB), 'approved_students', aliceEmail)));
  await assertFails(getDocs(collection(db(ALICE, aliceEmail), 'approved_students')));
  await assertFails(getDoc(doc(anon(), 'approved_students', aliceEmail)));
  await assertSucceeds(getDocs(collection(ADMIN(), 'approved_students')));
  await assertSucceeds(deleteDoc(doc(ADMIN(), 'approved_students', aliceEmail)));
});

test('student_requests: tự gửi yêu cầu của mình, admin duyệt/xoá', async () => {
  const req = { email: aliceEmail, name: 'Alice', requestedAt: serverTimestamp() };
  await assertSucceeds(setDoc(doc(db(ALICE, aliceEmail), 'student_requests', ALICE), req));
  await assertFails(setDoc(doc(db(BOB), 'student_requests', ALICE), req));
  await assertFails(setDoc(doc(db(BOB), 'student_requests', BOB), req));                      // email giả
  await assertFails(setDoc(doc(db(ALICE, aliceEmail), 'student_requests', ALICE), { ...req, approved: true }));
  await assertSucceeds(getDoc(doc(db(ALICE, aliceEmail), 'student_requests', ALICE)));
  await assertFails(getDocs(collection(db(ALICE, aliceEmail), 'student_requests')));
  await assertSucceeds(getDocs(collection(ADMIN(), 'student_requests')));
  await assertSucceeds(deleteDoc(doc(ADMIN(), 'student_requests', ALICE)));
});
