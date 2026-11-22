# AGENTS.md — vuihoctienghan

TOPIK exam prep platform (Vietnamese). Pure static HTML/CSS/JS, no framework, no build step, no package.json.

## Tech & hosting

- **Hosting**: Firebase Hosting (`firebase.json` serves `public/`)
- **Project**: `vuihoctienghan2027` (`.firebaserc`)
- **Auth / DB**: Firebase Auth (Google sign-in) + Firestore — loaded via CDN compat SDKs, **all pages pinned to `firebasejs/10.8.1`** (keep one version when adding pages)
- **CDN deps**: SweetAlert2, canvas-confetti, Pretendard/Inter fonts

## Project layout

```
public/
  index.html                # Landing page
  404.html                  # Custom error page
  auth.js                   # Firebase init & Google Auth (in root, not assets/js/)
  dict.html                 # Dictionary lookup
  forum.html                # Forum / community
  leaderboard.html          # Leaderboard / xếp hạng
  mypage.html               # User profile / My Page
  vocab.html                # Vocabulary management
  duel.html                 # Thi đấu 1-1 (trắc nghiệm, Ninja phi tiêu, kéo co, đấu bot)
  assets/js/                # ~85 vanilla JS modules, no bundler
  assets/css/               # 13 CSS files
  grammar/                  # Grammar home + socap/trungcap/caocap pages, admin.html
  listening/home.html       # Listening sub-home page
  listening/topik_i/        # TOPIK I listening (topik*.html + transcript .txt)
  listening/topik_ii/       # TOPIK II listening
  reading/topik_i/          # TOPIK I reading (type_* and topik* pages)
  reading/topik_ii/         # TOPIK II reading
  writing/topik_ii/         # TOPIK II writing (topik*, type51–54, wongoji53.html = 원고지 câu 53)
  lesson/, video/, games/   # Bài giảng, học qua video, minigame từ vựng
  lesson/index.html, lesson.html, admin.html  # Kho giáo trình: học theo giáo trình + trang soạn (curriculum-*.js); /curriculum/* chuyển hướng về đây
  lesson/audio/             # MP3 đọc sẵn (tools/curriculum-tts/gen.py) + bảng tra index.json
  home/                     # Copied index.html for sub-skill home pages
  implementation_plan.md    # Historical carousel implementation spec
```

## Key JS modules (how the app wires together)

| Category | File | Role |
|----------|------|------|
| **Core** | `auth.js` (root) | Firebase `initializeApp`, Google sign-in, streak tracking |
| **Core** | `navbar.js` | Auto-injects sticky glassmorphism navbar + side drawer into every page |
| **Core** | `script.js` | Global state, dark mode, text cleanup, vocab folders |
| **Core** | `menu.js` | Drawer toggle for navbar |
| **Core** | `theme-picker.js` | 30+ gradient backgrounds, user pickable via `window.THEME` |
| **Core** | `theme.js` | Auto-injects footer into every page |
| **Exam** | `exam.js` | Exam start screen (practice/exam mode), timer, scoring, auth guard |
| **Exam** | `navigator.js` | Question navigator panel for full exam pages |
| **Exam** | `type-navigator.js` | Question navigator for type-practice pages (listens to `typeQuestionsLoaded`) |
| **Exam** | `block1.js` / `block2.js` | Question block rendering for type-practice pages |
| **Exam** | `activity-tracker.js` | Study time tracking → Firestore (10min blocks → +5 EXP) |
| **Exam** | `audio.js` | YouTube IFrame API audio playback for listening pages |
| **Writing** | `writing.js` | Writing question keyword checking and scoring |
| **Writing** | `grading-engine.js` | Chấm câu 51/52 theo cấu hình (exact = 5, khớp ý = 4, stems+grammar = 3, stems = 2, grammar = 1) |
| **Writing** | `wongoji.js` | Xếp chữ 원고지, kiểm tra nhanh + bản sửa 1 chạm, ước lượng điểm câu 53 theo thang NIIED |
| **Writing** | `gemini-grader.js` | `callWritingAI()` — gọi AI chấm bài (khoá đọc từ Firestore `app_config` cho tới khi bật Blaze) |
| **Duel** | `duel-ninja.js` / `ninja-match.js` | Trò Ninja phi tiêu (claims/{i} chỉ tạo 1 lần) và so khớp đáp án |
| **Classes** | `shared-vocab.js` | Thư mục lớp học 1:1 (Key Code qua `folder_keys`, bài tập, bài nộp) |
| **Leaderboard** | `leaderboard.js` | Leaderboard V2 display with confetti animation |
| **Vocab** | `mypage-vocab.js` | Vocab folder management (add/remove words) |
| **Vocab** | `vocab-autowrap.js` | Auto-wrapping vocab highlighting in text |
| **Vocab** | `vocab-dictionary.js` | Dictionary data array (Korean vocabulary) |
| **Vocab** | `home-progress.js` | User exam progress for home pages (reading/listening/writing) |
| **Vocab** | `vocab-external.js` | External dictionary API integration (Naver) |
| **Vocab** | `vocab-tooltip.js` | Smart vocab popup tooltip (SweetAlert2) |
| **Games** | `game-dictation.js` | Dictation minigame |
| **Games** | `game-speaking.js` | Speaking minigame |

## Quirks & gotchas

- `auth.js` is at `public/auth.js` (not in assets/js) — loaded before all other scripts to ensure Firebase readiness
- All fix scripts in root (`fix.js`, `fix-exam.js`, `fix-type.js`) have **hardcoded absolute paths** to another machine — they will not work without editing
- `copy_script.js` duplicates `index.html` into `home/` with adjusted relative paths; `restore.js` fetches HTML from Firebase hosting to restore lost files
- `.github/`, `.cursor*`, and `opencode.json` do not exist; key instruction files: `AGENTS.md` (primary), `README.md` (project overview), `public/implementation_plan.md` (historical carousel spec)
- `public/temp_navbar.js` is a variant of `navbar.js` used by exam pages
- Everything in `public/` is deployed publicly — keep tests, logs, `.env` and other apps out of it. `topik-writing-app/` (Next.js, not deployed) lives at the repo root.
- `public/assets/js/vocab-dictionary-full.js` is ~24 MB (lazy-loaded by hover/click lookup) — avoid loading it eagerly.
- Firestore rules: users can only read a class (`shared_folders`) after enrolling with the right Key Code; teachers' folder list keeps `folder_keys/{code}` in sync automatically.

## Tests

No bundler/test runner in the app itself; tests are plain Node scripts:

```bash
node tests/wongoji.test.js          # 원고지 layout / quick check / câu 53 assessment
node tests/ninja-match.test.js      # Ninja answer matching
node tests/grading-engine.test.js   # câu 51/52 grading
cd tests/rules && npm install && npm test   # Firestore rules (emulator, needs Java 11+)
```

On this machine port 8080 is often taken: run the emulator with a config file that sets another port (`firebase emulators:exec --config <file> ...`) and, if Java fails with a Unix-socket error, set `JAVA_TOOL_OPTIONS=-Djdk.net.unixdomain.tmpdir=<temp dir>`.

## Deployment

```bash
firebase serve    # local dev (or the "hosting" entry in .claude/launch.json, port 5053)
firebase deploy --only hosting,firestore:rules   # production
```

- Project đang ở gói **Spark** (miễn phí): `functions/` (gradeWriting, listAuthUsers) **không** được khai báo trong `firebase.json` vì deploy functions cần Secret Manager → bắt buộc gói Blaze. Khi bật Blaze, thêm lại mục `"functions": [{ "source": "functions", "codebase": "default" }]` rồi làm theo hướng dẫn ở đầu `functions/index.js` và `server-mode/README.md`.

## Page conventions

- Landing: `lang="vi"`, type-practice pages: `lang="vi"`, exam pages: `lang="ko"`
- Relative asset paths from content pages: `../../assets/js/`, `../../assets/css/`
- Random gradients via `--random-bg-gradient` CSS variable (set by `script.js`)
- Exam pages have `.container` → `exam.js` injects start screen before it
- `window.learningActive = true` must be set for activity tracking to work
