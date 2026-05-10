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
  auth.js                   # Firebase init & Google Auth (in root, not assets/js/)
  assets/js/                # 23 vanilla JS modules, no bundler
  assets/css/               # 8 CSS files
  reading/topik_i/          # TOPIK I reading (type_* and topik* pages)
  reading/topik_ii/         # TOPIK II reading
  listening/topik_ii/       # TOPIK II listening only (no topik_i)
  writing/topik_ii/         # TOPIK II writing only
  grammar/home.html         # Single grammar page
  home/                     # Copied index.html for sub-skill home pages
```

## Key JS modules (how the app wires together)

| File | Role |
|------|------|
| `auth.js` (root) | Firebase `initializeApp`, Google sign-in, streak tracking |
| `navbar.js` | Auto-injects sticky glassmorphism navbar + side drawer into every page |
| `exam.js` | Exam start screen (practice/exam mode), timer, scoring, auth guard |
| `navigator.js` | Question navigator panel for full exam pages |
| `type-navigator.js` | Question navigator for type-practice pages (listens to `typeQuestionsLoaded`) |
| `script.js` | Global state, dark mode, text cleanup, vocab folders |
| `theme-picker.js` | 30+ gradient backgrounds, user pickable via `window.THEME` |
| `activity-tracker.js` | Study time tracking → Firestore (10min blocks → +5 EXP) |
| `study-timer.js` | Floating balloon study timer, idle after 10min |
| `block1.js` / `block2.js` | Question block rendering for type-practice pages |

## Quirks & gotchas

- `auth.js` is at `public/auth.js` (not in assets/js) — loaded before all other scripts to ensure Firebase readiness
- All fix scripts in root (`fix.js`, `fix-exam.js`, `fix-type.js`) have **hardcoded absolute paths** to another machine — they will not work without editing
- `copy_script.js` duplicates `index.html` into `home/` with adjusted relative paths; `restore.js` fetches HTML from Firebase hosting to restore lost files
- `inject_timer.ps1` injects `<script src=".../study-timer.js">` into all exam pages
- No test framework exists — all verification is manual
- `.github/`, `.cursor*`, and `opencode.json` do not exist; this is the only instruction file

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
