# AGENTS.md — vuihoctienghan

TOPIK exam prep platform (Vietnamese). Pure static HTML/CSS/JS, no framework, no build step, no package.json.

## Tech & hosting

- **Hosting**: Firebase Hosting (`firebase.json` serves `public/`)
- **Project**: `vuihoctienghan2027` (`.firebaserc`)
- **Auth / DB**: Firebase Auth (Google sign-in) + Firestore — loaded via CDN compat SDKs
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
  assets/js/                # 23 vanilla JS modules, no bundler
  assets/css/               # 8 CSS files
  grammar/home.html         # Single grammar page (⚠️ EMPTY — needs fix)
  listening/home.html       # Listening sub-home page
  listening/topik_ii/       # TOPIK II listening only (no topik_i)
  reading/topik_i/          # TOPIK I reading (type_* and topik* pages)
  reading/topik_ii/         # TOPIK II reading
  writing/topik_ii/         # TOPIK II writing only
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
| **Exam** | `study-timer.js` | Floating balloon study timer, idle after 10min |
| **Exam** | `audio.js` | YouTube IFrame API audio playback for listening pages |
| **Writing** | `writing.js` | Writing question keyword checking and scoring |
| **Leaderboard** | `leaderboard.js` | Leaderboard V2 display with confetti animation |
| **Vocab** | `mypage-vocab.js` | Vocab folder management (add/remove words) |
| **Vocab** | `vocab-autowrap.js` | Auto-wrapping vocab highlighting in text |
| **Vocab** | `vocab-dictionary.js` | Dictionary data array (Korean vocabulary) |
| **Vocab** | `vocab-external.js` | External dictionary API integration (Naver) |
| **Vocab** | `vocab-tooltip.js` | Smart vocab popup tooltip (SweetAlert2) |
| **Games** | `game-dictation.js` | Dictation minigame |
| **Games** | `game-speaking.js` | Speaking minigame |
| *(stale)* | `auth.js` (assets/js/) | ⚠️ EMPTY (0 bytes) — duplicate of root auth.js |

## Quirks & gotchas

- `auth.js` is at `public/auth.js` (not in assets/js) — loaded before all other scripts to ensure Firebase readiness
- All fix scripts in root (`fix.js`, `fix-exam.js`, `fix-type.js`) have **hardcoded absolute paths** to another machine — they will not work without editing
- `copy_script.js` duplicates `index.html` into `home/` with adjusted relative paths; `restore.js` fetches HTML from Firebase hosting to restore lost files
- `inject_timer.ps1` (in `public/`) injects `<script src=".../study-timer.js">` into all exam pages
- No test framework exists — all verification is manual
- `.github/`, `.cursor*`, and `opencode.json` do not exist; key instruction files: `AGENTS.md` (primary), `README.md` (project overview), `public/implementation_plan.md` (historical carousel spec)
- `grammar/home.html` is **empty (0 bytes)** despite being listed as a page — needs content
- `public/assets/js/auth.js` is **empty (0 bytes)** — stale duplicate of `public/auth.js`; should be removed
- `public/fix_narrow.js` and `public/temp_ref_navbar.js` are **empty (0 bytes)** — placeholder files
- `public/temp_navbar.js` is a variant of `navbar.js` used by exam pages

## Deployment

```bash
firebase serve    # local dev
firebase deploy   # production
firebase deploy --only hosting
```

## Page conventions

- Landing: `lang="vi"`, type-practice pages: `lang="vi"`, exam pages: `lang="ko"`
- Relative asset paths from content pages: `../../assets/js/`, `../../assets/css/`
- Random gradients via `--random-bg-gradient` CSS variable (set by `script.js`)
- Exam pages have `.container` → `exam.js` injects start screen before it
- `window.learningActive = true` must be set for activity tracking to work
