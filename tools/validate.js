#!/usr/bin/env node
/* Curriculum validator: enforces even, complete lessons and verified shortcuts.
   Usage: node tools/validate.js [trackId ...]   (exit 1 on any error) */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.join(__dirname, "..");
const www = path.join(root, "www");
const ctx = { window: {}, console };
ctx.window.window = ctx.window;
vm.createContext(ctx);
const load = (f) => vm.runInContext(fs.readFileSync(path.join(www, f), "utf8"), ctx, { filename: f });
load("data/catalog.js");
ctx.UDL_T = ctx.window.UDL_T; ctx.UDL_TRACKS = ctx.window.UDL_TRACKS;
load("data/shortcuts.js");
load("data/visuals.js");
for (const f of fs.readdirSync(path.join(www, "tracks"))) {
  vm.runInContext(`var UDL_T = window.UDL_T;`, ctx);
  load("tracks/" + f);
}
const W = ctx.window;
const only = process.argv.slice(2);
const errors = [];
const warn = [];
const len = (s) => (s || "").length;
let lessonsTotal = 0;

for (const t of W.UDL_TRACKS) {
  if (only.length && !only.includes(t.id)) continue;
  if (!t.tiers) { warn.push(`${t.id}: no content yet`); continue; }
  const E = (where, msg) => errors.push(`${t.id} ${where}: ${msg}`);
  const table = (W.UDL_SHORTCUTS[t.id] || {}).keys || {};
  const titles = new Set();
  const ansCount = [0, 0, 0, 0];
  const usedKeys = new Set();
  if (t.tiers.length !== 3) E("", `needs 3 tiers, has ${t.tiers.length}`);
  t.tiers.forEach((tier, ti) => {
    if (!tier.goal || len(tier.goal) < 30) E(`T${ti}`, "tier needs a goal (30+ chars)");
    if (tier.modules.length !== 4) E(`T${ti}`, `needs 4 modules, has ${tier.modules.length}`);
    tier.modules.forEach((mod, mi) => {
      const W_ = `T${ti}M${mi}`;
      if (!mod.title) E(W_, "module title missing");
      if (mod.lessons.length !== 5) E(W_, `needs 5 lessons, has ${mod.lessons.length}`);
      const isLast = mi === 3;
      if (isLast) {
        const want = ti === 2 ? "Capstone" : "Project";
        if (!new RegExp(want).test(mod.tag || "")) E(W_, `last module tag must include "${want}"`);
        const graded = mod.lessons.filter((l) => l.rub).length;
        if (graded < 2) E(W_, `project module needs ≥2 graded (rub) lessons, has ${graded}`);
        if (ti === 2 && mod.lessons.filter((l) => l.client).length < 2) E(W_, "capstone needs ≥2 client revision lessons");
      }
      mod.lessons.forEach((l, li) => {
        lessonsTotal++;
        const w = `${W_}L${li} "${l.t}"`;
        if (!l.t || len(l.t) > 48) E(w, "title missing or > 48 chars");
        if (titles.has(l.t)) E(w, "duplicate title"); titles.add(l.t);
        if (len(l.c) < 140 || len(l.c) > 340) E(w, `concept length ${len(l.c)} (140-340)`);
        if (!Array.isArray(l.p) || l.p.length !== 4) E(w, "needs exactly 4 key points");
        else l.p.forEach((x, i) => { if (len(x) < 15 || len(x) > 130) E(w, `point ${i + 1} length ${len(x)} (15-130)`); });
        if (t.id === "fundamentals") {
          if (!Array.isArray(l.k) || l.k.length !== 3 || l.k.some((k) => !Array.isArray(k) || k.length !== 2 || len(k[1]) < 15)) E(w, "fundamentals needs exactly 3 [term, definition] pairs");
        } else {
          if (!Array.isArray(l.k) || l.k.length < 3 || l.k.length > 5) E(w, `needs 3-5 shortcuts, has ${l.k ? l.k.length : 0}`);
          else l.k.forEach((k) => { if (!table[k]) E(w, `shortcut id "${k}" not in verified table`); else usedKeys.add(k); });
        }
        if (len(l.tip) < 60 || len(l.tip) > 230) E(w, `tip length ${len(l.tip)} (60-230)`);
        if (!W.UDL_VISUALS[l.v]) E(w, `visual "${l.v}" not in library`);
        if (len(l.cap) < 30 || len(l.cap) > 190) E(w, `caption length ${len(l.cap)} (30-190)`);
        const lab = l.lab || {};
        if (len(lab.s) < 30 || len(lab.s) > 240) E(w, `scenario length ${len(lab.s)} (30-240)`);
        if (!Array.isArray(lab.do) || lab.do.length < 5 || lab.do.length > 6) E(w, `lab needs 5-6 steps, has ${lab.do ? lab.do.length : 0}`);
        else lab.do.forEach((s, i) => { if (len(s) < 12 || len(s) > 160) E(w, `step ${i + 1} length ${len(s)} (12-160)`); });
        if (!Array.isArray(lab.r) || lab.r.length !== 3) E(w, "needs exactly 3 report questions");
        if (lab.file && !fs.existsSync(path.join(root, "starter", lab.file))) E(w, `starter file missing: starter/${lab.file}`);
        if (!Array.isArray(l.q) || l.q.length !== 3) E(w, "needs exactly 3 quiz questions");
        else l.q.forEach((q, qi) => {
          if (!Array.isArray(q) || q.length !== 4) return E(w, `quiz ${qi + 1} malformed`);
          if (!Array.isArray(q[1]) || q[1].length !== 4) E(w, `quiz ${qi + 1} needs 4 options`);
          if (!(q[2] >= 0 && q[2] <= 3)) E(w, `quiz ${qi + 1} answer index invalid`);
          if (new Set(q[1]).size !== q[1].length) E(w, `quiz ${qi + 1} duplicate options`);
          if (len(q[3]) < 20) E(w, `quiz ${qi + 1} explanation too short`);
          ansCount[q[2]]++;
        });
        if (l.rub) { const r = (t.rubrics || {})[l.rub]; if (!r) E(w, `rubric "${l.rub}" missing`); else if (r.length !== 5) E(w, `rubric "${l.rub}" needs 5 criteria`); }
        if (l.client && len(l.client) < 60) E(w, "client feedback too short");
      });
    });
  });
  const tot = ansCount.reduce((a, b) => a + b, 0);
  // answer positions are shuffled at runtime, so source index skew is harmless
  const n = t.tiers.reduce((a, tr) => a + tr.modules.reduce((b, m) => b + m.lessons.length, 0), 0);
  console.log(`✓ ${t.id.padEnd(12)} ${n} lessons · answers A/B/C/D ${ansCount.join("/")} · ${usedKeys.size} distinct shortcuts`);
}
warn.forEach((w) => console.log("⚠ " + w));
if (errors.length) { console.log(`\n✗ ${errors.length} error(s):`); errors.slice(0, 80).forEach((e) => console.log("  " + e)); process.exit(1); }
console.log(`\nAll checks passed · ${lessonsTotal} lessons`);
