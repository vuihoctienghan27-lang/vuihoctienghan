/* Cloud Function chấm bài viết TOPIK bằng AI.
   - Khoá AI nằm trong Secret Manager, KHÔNG bao giờ gửi xuống trình duyệt.
   - Chỉ người đã đăng nhập (Firebase ID token) mới gọi được.
   - Prompt được dựng ở server → endpoint không thể bị dùng làm proxy AI tuỳ ý.
   - Giới hạn số lượt chấm / người / ngày (collection ai_usage, client không đọc/ghi được).

   Thiết lập khoá (mỗi secret: nhiều key thì ngăn cách bằng dấu phẩy):
     firebase functions:secrets:set GROQ_KEYS
     firebase functions:secrets:set GEMINI_KEYS
     firebase functions:secrets:set OPENROUTER_KEY
*/
'use strict';

const { onRequest, onCall, HttpsError } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const logger = require('firebase-functions/logger');
const admin = require('firebase-admin');

admin.initializeApp();

const GROQ_KEYS = defineSecret('GROQ_KEYS');
const GEMINI_KEYS = defineSecret('GEMINI_KEYS');
const OPENROUTER_KEY = defineSecret('OPENROUTER_KEY');

const DAILY_LIMIT = 60;          // lượt chấm tối đa / người / ngày
const DEADLINE_MS = 50000;       // Firebase Hosting rewrite cắt request sau 60s

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'openai/gpt-oss-120b';
const GEMINI_MODEL = 'gemini-2.0-flash';
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/' + GEMINI_MODEL + ':generateContent';
const OR_URL = 'https://openrouter.ai/api/v1/chat/completions';
const OR_MODEL = 'google/gemini-2.5-flash';

// ── Tiện ích ──
function splitKeys(secret) {
  try {
    return (secret.value() || '').split(',').map((s) => s.trim()).filter(Boolean);
  } catch (e) {
    return [];
  }
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function cleanStr(v, max) {
  return typeof v === 'string' ? v.slice(0, max) : '';
}

function cleanList(v, maxItems, maxLen) {
  if (!Array.isArray(v)) return [];
  return v.filter((x) => typeof x === 'string' && x.trim())
    .slice(0, maxItems)
    .map((x) => x.slice(0, maxLen));
}

function sanitizeConfig(c) {
  c = c && typeof c === 'object' ? c : {};
  const grammar = Array.isArray(c.grammar)
    ? c.grammar.slice(0, 10).map((g) => ({ label: cleanStr(g && g.label, 100) })).filter((g) => g.label)
    : [];
  return {
    exactAnswers: cleanList(c.exactAnswers, 5, 300),
    stems: cleanList(c.stems, 10, 50),
    grammar,
    context: cleanList(c.context, 15, 50),
    questionPrompt: cleanStr(c.questionPrompt, 1500),
  };
}

async function fetchWithTimeout(url, opts, ms) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...opts, signal: controller.signal });
  } finally {
    clearTimeout(t);
  }
}

// ── Prompt (chuyển nguyên văn từ gemini-grader.js cũ) ──
function buildSystemPrompt(config) {
  const parts = ['Bạn chấm bài viết TOPIK II tiếng Hàn câu 51-52. LUÔN trả lời bằng tiếng Việt, định dạng JSON.'];
  parts.push('');
  parts.push('=== QUY TẮC VÀNG ===');
  parts.push('');
  parts.push('• Nếu bài làm KHỚP ĐÚNG hoặc đồng nghĩa với đáp án chuẩn được cung cấp → cho ĐIỂM TỐI ĐA 5/5. KHÔNG được bịa lỗi hoặc trừ điểm oan.');
  parts.push('• Các đuôi câu kính ngữ trang trọng ĐỀU HỢP LỆ như nhau: -습니다, -ㅂ니다, -십시오, -(으)십시오, -기 바랍니다, -아/어 주시기 바랍니다, -겠습니다.');
  parts.push('• -ㅂ니다 dùng sau gốc từ kết thúc bằng NGUYÊN ÂM (ví dụ: 바라다 → 바랍니다, 하다 → 합니다, 보다 → 봅니다). KHÔNG bao giờ coi -ㅂ니다 là sai.');
  parts.push('• ~기 바랍니다, ~아/어 주시기 바랍니다 là đuôi câu chuẩn rất phổ biến trong thông báo. Nếu đáp án chuẩn là dạng này mà học sinh viết đúng thì phải 5/5.');
  parts.push('• Chỉ trừ điểm khi học sinh dùng đuôi không hợp văn cảnh (vd -아/어요 thân mật trong thông báo trang trọng, hoặc sai ý), chứ KHÔNG phạt các dạng kính ngữ hợp lệ khác nhau.');
  parts.push('');
  parts.push('=== THANG ĐIỂM CHI TIẾT ===');
  parts.push('');
  parts.push('CÂU 51 (điền vào chỗ trống — thường là thông báo/tuyển dụng):');
  parts.push('1. Phải dùng từ khóa trong bài đọc — nếu bỏ từ khóa hoặc thay từ khác, trừ 1-2 điểm.');
  parts.push('2. Văn bản thông báo cần đuôi trang trọng. Đuôi -습니다/-ㅂ니다/-(으)십시오/기 바랍니다 ĐỀU ĐÚNG. Chỉ trừ điểm khi dùng -아/어요 hoặc -는다 (không hợp thông báo trang trọng).');
  parts.push('');
  parts.push('CÂU 52 (viết tiếp câu — thường có đối lập/liệt kê):');
  parts.push('1. Phải dùng từ nối liệt kê/đối lập: 첫째/둘째/셋째, 먼저/다음으로/끝으로, 하나는/다른 하나는, 긍정적인 것은/부정적인 것은.');
  parts.push('   Thiếu từ nối → thiếu format → trừ 2 điểm.');
  parts.push('2. Phải suy luận đúng ý đối lập với vế trước.');
  parts.push('3. Đuôi câu phải khớp văn phong của bài (chấp nhận cả -습니다 lẫn -ㅂ니다).');
  parts.push('');
  parts.push('QUY TẮC CHÍNH TẢ (chỉ trừ khi SAI THẬT):');
  parts.push('• Chỉ trừ điểm chính tả khi chắc chắn sai (kiểm tra kỹ từng âm tiết). Nếu không chắc, đừng bịa lỗi.');
  parts.push('• Ví dụ đúng: 정리하려고, 드리겠습니다, 있습니다. Sai: 정리하겨고, 드리겟습니다, 있읍니다.');
  parts.push('• Phân biệt: ㅐ vs ㅔ, ㅒ vs ㅖ, ㅘ vs ㅙ, ㅚ vs ㅟ — sai 1 nguyên âm là SAI.');
  parts.push('• Phân biệt: ㄱ/ㄲ/ㅋ, ㄷ/ㄸ/ㅌ, ㅂ/ㅃ/ㅍ, ㅅ/ㅆ, ㅈ/ㅉ/ㅊ — sai phụ âm căng/bật hơi là SAI.');
  parts.push('• Thiếu patchim (받침) hoặc sai patchim → SAI.');
  parts.push('• Nếu câu đúng ý + đúng ngữ pháp nhưng SAI CHÍNH TẢ → tối đa 3/5, phải ghi rõ lỗi chính tả trong nhận xét.');

  if (config.exactAnswers.length) {
    parts.push('');
    parts.push('Đáp án chuẩn (đúng cả ý + ngữ pháp + đuôi câu = 5đ):');
    parts.push(config.exactAnswers.slice(0, 3).join(' | '));
  }
  if (config.stems.length) parts.push('Động từ chính: ' + config.stems.join(', '));
  if (config.grammar.length) parts.push('Ngữ pháp: ' + config.grammar.map((g) => g.label).join(', '));
  if (config.context.length) parts.push('Từ vựng bối cảnh: ' + config.context.join(', '));
  if (config.questionPrompt) parts.push('Bối cảnh: ' + config.questionPrompt);
  return parts.join('\n');
}

function buildUserText(text) {
  return 'Học sinh viết: "' + text + '"\n\n' +
    'Phân tích CHI TIẾT: đúng/sai ý chính? đúng/sai ngữ pháp? đúng/sai từ vựng? ' +
    'CÓ LỖI CHÍNH TẢ KHÔNG? (kiểm tra từng âm tiết) ' +
    'đuôi câu có khớp văn phong không? có dùng từ nối liệt kê/đối lập không? ' +
    'so với đáp án chuẩn khác gì?\n' +
    'Nếu có lỗi chính tả, GHI RÕ từ sai và từ đúng trong nhận xét.\n' +
    'Trả lời CHỈ 1 dòng JSON, không thêm gì khác:\n' +
    '{"score":<số 0-5>,"feedback":"<phân tích chi tiết bằng tiếng Việt 3-5 câu>"}';
}

// ── Nhà cung cấp AI: Groq (free) → Gemini (free) → OpenRouter (trả phí) ──
async function callOpenAICompatible(url, key, model, systemPrompt, userText, tokenField, ms) {
  const body = {
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userText },
    ],
    temperature: 0.3,
  };
  body[tokenField] = 1200;
  const resp = await fetchWithTimeout(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + key },
    body: JSON.stringify(body),
  }, ms);
  if (!resp.ok) throw new Error('HTTP_' + resp.status);
  const data = await resp.json();
  const msg = data.choices && data.choices[0] && data.choices[0].message;
  if (!msg || !msg.content) throw new Error('EMPTY');
  return msg.content;
}

async function callGemini(key, systemPrompt, userText, ms) {
  const resp = await fetchWithTimeout(GEMINI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify({
      contents: [{ parts: [{ text: systemPrompt + '\n\n' + userText }] }],
      generationConfig: { temperature: 0.3, maxOutputTokens: 800 },
    }),
  }, ms);
  if (!resp.ok) throw new Error('HTTP_' + resp.status);
  const data = await resp.json();
  const c = data.candidates && data.candidates[0] && data.candidates[0].content;
  if (!c || !c.parts || !c.parts[0] || !c.parts[0].text) throw new Error('EMPTY');
  return c.parts[0].text;
}

async function callAI(systemPrompt, userText) {
  const start = Date.now();
  const remaining = () => DEADLINE_MS - (Date.now() - start);

  const attempts = [];
  shuffle(splitKeys(GROQ_KEYS)).forEach((k) => attempts.push({
    name: 'groq',
    run: (ms) => callOpenAICompatible(GROQ_URL, k, GROQ_MODEL, systemPrompt, userText, 'max_completion_tokens', ms),
  }));
  shuffle(splitKeys(GEMINI_KEYS)).forEach((k) => attempts.push({
    name: 'gemini',
    run: (ms) => callGemini(k, systemPrompt, userText, ms),
  }));
  splitKeys(OPENROUTER_KEY).slice(0, 1).forEach((k) => attempts.push({
    name: 'openrouter',
    run: (ms) => callOpenAICompatible(OR_URL, k, OR_MODEL, systemPrompt, userText, 'max_tokens', ms),
  }));

  if (!attempts.length) throw new Error('NO_KEYS');

  let lastErr = null;
  for (const a of attempts) {
    const ms = Math.min(20000, remaining());
    if (ms < 3000) break;
    try {
      return await a.run(ms);
    } catch (e) {
      lastErr = e;
      logger.warn('[AI] ' + a.name + ' lỗi: ' + (e && e.message));
    }
  }
  throw lastErr || new Error('TIMEOUT');
}

function parseResult(raw) {
  const m = String(raw || '').match(/\{[\s\S]*\}/);
  if (m) {
    try {
      const p = JSON.parse(m[0]);
      return {
        score: typeof p.score === 'number' ? Math.min(5, Math.max(0, p.score)) : null,
        feedback: String(p.feedback || p.explanation || p.vietnamese || p.nhan_xet || ''),
      };
    } catch (e) { /* rơi xuống dưới */ }
  }
  return { score: null, feedback: String(raw || '').trim() };
}

// ── Giới hạn lượt / ngày (giờ Việt Nam) ──
async function consumeQuota(uid) {
  const day = new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10);
  const ref = admin.firestore().collection('ai_usage').doc(uid);
  return admin.firestore().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const d = snap.exists ? snap.data() : {};
    const used = d.day === day ? (d.count || 0) : 0;
    if (used >= DAILY_LIMIT) return false;
    tx.set(ref, { day, count: used + 1, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
    return true;
  });
}

// ── Endpoint: POST /api/grade  { text, config }  (Authorization: Bearer <ID token>) ──
exports.gradeWriting = onRequest({
  region: 'asia-southeast1',
  secrets: [GROQ_KEYS, GEMINI_KEYS, OPENROUTER_KEY],
  timeoutSeconds: 60,
  memory: '256MiB',
  maxInstances: 10,
}, async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const m = (req.get('Authorization') || '').match(/^Bearer (.+)$/);
  if (!m) {
    res.status(401).json({ error: 'Bạn cần đăng nhập để dùng AI chấm điểm.' });
    return;
  }
  let uid;
  try {
    uid = (await admin.auth().verifyIdToken(m[1])).uid;
  } catch (e) {
    res.status(401).json({ error: 'Phiên đăng nhập hết hạn, vui lòng đăng nhập lại.' });
    return;
  }

  const body = req.body || {};
  const text = typeof body.text === 'string' ? body.text.trim() : '';
  if (!text) {
    res.status(400).json({ error: 'Bài làm trống.' });
    return;
  }
  if (text.length > 1000) {
    res.status(400).json({ error: 'Bài làm quá dài (tối đa 1000 ký tự).' });
    return;
  }

  try {
    if (!(await consumeQuota(uid))) {
      res.status(429).json({ error: 'Bạn đã dùng hết ' + DAILY_LIMIT + ' lượt chấm AI hôm nay. Hãy quay lại vào ngày mai nhé!' });
      return;
    }
  } catch (e) {
    logger.error('[AI] Lỗi quota', e);
    res.status(500).json({ error: 'Lỗi máy chủ, thử lại sau.' });
    return;
  }

  try {
    const config = sanitizeConfig(body.config);
    const raw = await callAI(buildSystemPrompt(config), buildUserText(text));
    res.json(parseResult(raw));
  } catch (e) {
    logger.error('[AI] Tất cả nhà cung cấp lỗi', e && e.message);
    res.status(502).json({ error: 'AI đang quá tải, vui lòng thử lại sau ít phút.' });
  }
});


/* ── Danh sách TẤT CẢ tài khoản đã đăng nhập (Firebase Authentication) cho trang Admin (data.html) ──
   Trình duyệt không liệt kê được tài khoản Auth → hàm chạy bằng quyền Admin SDK ở server.
   Chỉ email admin mới gọi được; trả về dữ liệu trực tiếp, không lưu thêm vào Firestore. */
const ADMIN_EMAILS = ['nmhieu2526@gmail.com', 'vuihoctienghan27@gmail.com'];

exports.listAuthUsers = onCall({ region: 'asia-southeast1', timeoutSeconds: 120, memory: '256MiB' }, async (request) => {
  const email = request.auth && request.auth.token && request.auth.token.email;
  if (!email || !ADMIN_EMAILS.includes(String(email).toLowerCase())) {
    throw new HttpsError('permission-denied', 'Chỉ admin mới xem được danh sách tài khoản.');
  }
  const users = [];
  let pageToken;
  do {
    const res = await admin.auth().listUsers(1000, pageToken);
    res.users.forEach((u) => {
      users.push({
        uid: u.uid,
        email: u.email || '',
        displayName: u.displayName || '',
        disabled: !!u.disabled,
        providers: (u.providerData || []).map((p) => p.providerId),
        createdAt: u.metadata.creationTime ? new Date(u.metadata.creationTime).toISOString() : '',
        lastSignInAt: u.metadata.lastSignInTime ? new Date(u.metadata.lastSignInTime).toISOString() : '',
      });
    });
    pageToken = res.pageToken;
  } while (pageToken && users.length < 50000);
  logger.info('listAuthUsers', { by: email, count: users.length });
  return { users, total: users.length };
});
