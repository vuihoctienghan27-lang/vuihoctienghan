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
  doc, setDoc, updateDoc, getDoc, collection, addDoc, writeBatch,
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
    { email: aliceEmail, fullName: 'Alice', lastLoginAt: new Date().toISOString() }, { merge: true }));
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
  const ref = doc(db(ALICE, aliceEmail), 'shared_folders/f1/students', ALICE);
  const base = { uid: ALICE, email: aliceEmail, photoURL: '', joinedAt: serverTimestamp(), lastActiveAt: serverTimestamp() };
  await assertSucceeds(setDoc(ref, { ...base, displayName: 'Alice' }, { merge: true }));
  await assertFails(setDoc(ref, { ...base, displayName: 'x'.repeat(1000) }, { merge: true }));
});

test('app_config (khoá AI cũ) không ai đọc được ngoài admin', async () => {
  await seed('app_config/ai_grader', { geminiKeys: ['secret'] });
  await assertFails(getDoc(doc(anon(), 'app_config', 'ai_grader')));
  await assertFails(getDoc(doc(db(ALICE), 'app_config', 'ai_grader')));
});
