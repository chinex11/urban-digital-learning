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
- **Student accounts** (Firebase): register with name, email and password, verify the email by link, then log in on any phone
- **Profile**: photo, bio, city, career goal, level and XP, day streak, badges, tracks in progress; change password, log out, delete account
- **Progress sync**: lessons, quizzes, review cards and streaks save to the account; lessons still work offline and sync when back online
- **Optional AI Coach**: add your Anthropic API key in Settings
- Without a Firebase config the app runs in local mode (no login, progress on the phone)

## Install on Android

1. Open the repo's **Releases** page on your phone and download the latest `UrbanDigitalLearning-*.apk`
2. Open it and allow "Install unknown apps" for your browser when prompted
3. New releases install over the old one and keep your progress

Every push to `main` builds a new APK automatically (GitHub Actions → *Build Android APK*).

## Turning on student accounts (Firebase, free plan)

1. Go to console.firebase.google.com → **Add project** (Analytics can be off).
2. **Build → Authentication → Get started → Sign-in method → Email/Password → Enable → Save.**
3. **Project settings → General → Public-facing name:** `Urban Digital Learning` (shown in the verification email).
4. **Build → Firestore Database → Create database** (production mode, location close to your students, e.g. `eur3`). Open **Rules**, paste the contents of `firestore.rules`, **Publish**.
5. **Project settings → General → Your apps → Web (</>)** → register the app → copy the `firebaseConfig` object into `www/data/firebase-config.js`.
6. Push to `main`; the next APK requires every student to register and verify their email.

Progress made on a phone before accounts were switched on is moved into the first account that signs in on that phone. Portfolio screenshots stay on the phone.

## Editing lessons

Lessons live in `www/tracks/*.js`, one file per track; the schema is documented in `www/data/catalog.js`.
Shortcuts are referenced by id from `www/data/shortcuts.js` (✓ official vendor list, ◐ cross-checked).
Visuals come from `www/data/visuals.js`; starter files live in `starter/`.

Run `node tools/validate.js` before pushing — CI runs it too and fails the build on any uneven or invalid lesson.

Preview in a browser: `npm run serve`, then open http://localhost:8080.

## Project layout

- `www/` app (HTML/CSS/JS, no build step; Firebase SDK vendored in `www/vendor/`)
- `firestore.rules` database security rules (students can only touch their own data)
- `android/` Capacitor Android project
- `assets/` icon and splash sources
- `.github/workflows/build-apk.yml` cloud APK build
