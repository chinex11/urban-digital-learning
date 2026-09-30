# Urban Digital Learning

A premium, dark-mode micro-learning app that takes beginners to industry-pro level across 9 software tracks.

| Design Studio | Office Pro | Video Lab |
|---|---|---|
| CorelDRAW · Photoshop · Illustrator · InDesign | Word · Excel · PowerPoint | Premiere Pro · CapCut |

- **189 micro-lessons** (9 tracks × 7 modules × 3 lessons), each with concept, key points, shortcuts, pro tip and a Hands-On Lab
- **Gated progression**: submit your lab results to unlock the next lesson
- **Projects**: logos, fliers, posters, pitch decks, dashboards, ads
- **Optional AI Coach**: add your Anthropic API key in Settings for reviews of your lab results and screenshots
- Works offline; progress is saved on the phone

## Install on Android

1. Open the repo's **Releases** page on your phone and download the latest `UrbanDigitalLearning-*.apk`
2. Open it and allow "Install unknown apps" for your browser when prompted
3. New releases install over the old one and keep your progress

Every push to `main` builds a new APK automatically (GitHub Actions → *Build Android APK*).

## Editing lessons

Lessons live in `www/tracks/*.js`, one file per track. Each lesson is:

```js
L(title, concept, [points], [[shortcut, action]], tip, scenario, [lab steps], [report questions], hint?)
```

Preview in a browser: `npm run serve`, then open http://localhost:8080.

## Project layout

- `www/` app (HTML/CSS/JS, no build step)
- `android/` Capacitor Android project
- `assets/` icon and splash sources
- `.github/workflows/build-apk.yml` cloud APK build
