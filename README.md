# Urban Digital Learning

A premium, dark-mode micro-learning app that takes beginners to industry-pro level across 9 software tracks.

| Design Studio | Office Pro | Video Lab |
|---|---|---|
| CorelDRAW · Photoshop · Illustrator · InDesign | Word · Excel · PowerPoint | Premiere Pro · CapCut |

- **10 tracks** incl. **Design Fundamentals** (required before any Intermediate tier)
- Each track: **3 tiers × 4 modules × 5 lessons = 60 lessons**; last module of each tier is a rubric-graded project, Pro ends in a **client capstone** with two revision rounds
- Every lesson: concept, offline **Don't/Do visual**, 4 key points, **verified shortcuts**, pro tip, **3-question quiz** (2/3 to unlock the lab), Hands-On Lab with starter files
- **Assessment**: written answers to every report question; graded projects need a screenshot and pass a 70% rubric (AI-graded with an API key)
- **Spaced-repetition review** of shortcuts and missed questions; **portfolio** of passed projects
- **Optional AI Coach**: add your Anthropic API key in Settings
- Works offline; progress is saved on the phone

## Install on Android

1. Open the repo's **Releases** page on your phone and download the latest `UrbanDigitalLearning-*.apk`
2. Open it and allow "Install unknown apps" for your browser when prompted
3. New releases install over the old one and keep your progress

Every push to `main` builds a new APK automatically (GitHub Actions → *Build Android APK*).

## Editing lessons

Lessons live in `www/tracks/*.js`, one file per track; the schema is documented in `www/data/catalog.js`.
Shortcuts are referenced by id from `www/data/shortcuts.js` (✓ official vendor list, ◐ cross-checked).
Visuals come from `www/data/visuals.js`; starter files live in `starter/`.

Run `node tools/validate.js` before pushing — CI runs it too and fails the build on any uneven or invalid lesson.

Preview in a browser: `npm run serve`, then open http://localhost:8080.

## Project layout

- `www/` app (HTML/CSS/JS, no build step)
- `android/` Capacitor Android project
- `assets/` icon and splash sources
- `.github/workflows/build-apk.yml` cloud APK build
