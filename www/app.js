/* Urban Digital Learning — app engine v2 */
(function () {
  "use strict";

  const TRACKS = window.UDL_TRACKS.slice().sort((a, b) => a.num - b.num);
  const byId = Object.fromEntries(TRACKS.map((t) => [t.id, t]));
  const SC = window.UDL_SHORTCUTS || {};
  const GROUPS = [
    { id: "core", label: "Start Here", icon: "🧭" },
    { id: "design", label: "Design Studio", icon: "🎨" },
    { id: "office", label: "Office Pro", icon: "📊" },
    { id: "video", label: "Video Lab", icon: "🎬" },
  ];
  const TIER_NAMES = ["Beginner", "Intermediate", "Pro"];
  const DEFAULT_MODEL = "claude-sonnet-5-5";
  const KEY = "udl_state_v2";
  const REPO_RAW = "https://github.com/chinex11/urban-digital-learning/raw/main/starter/";
  const PASS_QUIZ = 2;          // of 3
  const PASS_RUBRIC = 0.7;      // 70%
  const MIN_ANSWER = 12;        // chars per report answer
  const INTERVALS = [0, 1, 3, 7, 16, 35]; // review days by box

  /* ---------------- State ---------------- */
  const blank = () => ({ v: 2, name: "", apiKey: "", model: DEFAULT_MODEL, prog: {}, last: null, onboarded: false, review: {}, act: { last: 0, streak: 0, best: 0 }, seenLevel: 1, profile: {} });
  // Firebase accounts are on when www/data/firebase-config.js holds a config; otherwise the app runs in local mode.
  const FBC = window.UDL_FIREBASE_CONFIG || null;
  const CLOUD = !!(FBC && FBC.apiKey && FBC.projectId && window.firebase && window.firebase.auth);
  let S = blank(); let stateKey = KEY;
  function loadState(uid) {
    stateKey = uid ? KEY + ":" + uid : KEY;
    try { S = Object.assign(blank(), JSON.parse(localStorage.getItem(stateKey) || "{}")); } catch (e) { S = blank(); }
    if (!S.act) S.act = { last: 0, streak: 0, best: 0 };
    if (!S.profile) S.profile = {};
    if (window.UDL_APP) window.UDL_APP.S = S;
  }
  if (!CLOUD) loadState(null);
  const save = () => {
    try { localStorage.setItem(stateKey, JSON.stringify(S)); } catch (e) { toast("Storage full — progress not saved"); }
    if (CLOUD) queueSync();
  };
  const P = (tid) => (S.prog[tid] = S.prog[tid] || { done: {}, quiz: {}, ans: {}, rub: {}, fb: {} });

  /* ---------------- Evidence store (IndexedDB) ---------------- */
  const DB = (() => {
    let dbp;
    const open = () => dbp || (dbp = new Promise((res, rej) => {
      try {
        const rq = indexedDB.open("udl", 1);
        rq.onupgradeneeded = () => rq.result.createObjectStore("evidence");
        rq.onsuccess = () => res(rq.result);
        rq.onerror = () => rej(rq.error);
      } catch (e) { rej(e); }
    }));
    const tx = (mode, fn) => open().then((db) => new Promise((res, rej) => {
      const t = db.transaction("evidence", mode); const st = t.objectStore("evidence");
      const r = fn(st); t.oncomplete = () => res(r && r.result); t.onerror = () => rej(t.error);
    }));
    return {
      put: (k, v) => tx("readwrite", (s) => s.put(v, k)),
      get: (k) => tx("readonly", (s) => s.get(k)),
      del: (k) => tx("readwrite", (s) => s.delete(k)),
      all: () => open().then((db) => new Promise((res) => {
        const out = []; const c = db.transaction("evidence").objectStore("evidence").openCursor();
        c.onsuccess = () => { const cur = c.result; if (cur) { out.push([cur.key, cur.value]); cur.continue(); } else res(out); };
        c.onerror = () => res(out);
      })).catch(() => []),
      clear: () => tx("readwrite", (s) => s.clear()),
    };
  })();

  /* ---------------- Curriculum helpers ---------------- */
  const lid = (ti, mi, li) => `${ti}-${mi}-${li}`;
  const flatCache = {};
  function flat(t) {
    if (flatCache[t.id]) return flatCache[t.id];
    const out = [];
    (t.tiers || []).forEach((tier, ti) => tier.modules.forEach((mod, mi) => mod.lessons.forEach((les, li) => out.push({ ti, mi, li, les, mod, tier, id: lid(ti, mi, li) }))));
    return (flatCache[t.id] = out);
  }
  function tierDone(tid, ti) {
    const t = byId[tid]; if (!t) return true;
    const p = P(tid);
    return flat(t).filter((x) => x.ti === ti).every((x) => p.done[x.id]);
  }
  function stats(t) {
    const all = flat(t); const p = P(t.id);
    const done = all.filter((x) => p.done[x.id]).length;
    const next = all.find((x) => !p.done[x.id]) || null;
    return { total: all.length, done, pct: all.length ? Math.round((done / all.length) * 100) : 0, next, all };
  }
  // returns null if unlocked, else a reason string
  function lockReason(t, x) {
    const all = flat(t);
    const idx = all.findIndex((y) => y.id === x.id);
    if (idx > 0 && !P(t.id).done[all[idx - 1].id]) return "Finish the previous lesson first";
    if (t.id !== "fundamentals" && x.ti >= 1 && byId.fundamentals && !tierDone("fundamentals", 0))
      return "Complete Design Fundamentals · Beginner to unlock Intermediate";
    return null;
  }
  const isProject = (les) => !!les.rub;
  function shortcutRows(t, les) {
    const table = (SC[t.id] && SC[t.id].keys) || {};
    return (les.k || []).map((k) => Array.isArray(k) ? { term: k[0], def: k[1] } : (table[k] ? { keys: table[k][0], act: table[k][1], st: table[k][2], id: k } : null)).filter(Boolean);
  }

  /* ---------------- Utils ---------------- */
  const $app = document.getElementById("app");
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const inl = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/`(.+?)`/g, "<kbd>$1</kbd>");
  function md(text) {
    const lines = String(text || "").split(/\r?\n/); let html = "", inList = false;
    for (const raw of lines) {
      const line = raw.trim();
      const li = line.match(/^[-*•▸]\s+(.*)/) || line.match(/^\d+[.)]\s+(.*)/);
      if (li) { if (!inList) { html += "<ul>"; inList = true; } html += "<li>" + inl(li[1]) + "</li>"; continue; }
      if (inList) { html += "</ul>"; inList = false; }
      if (!line) continue;
      const h = line.match(/^#{1,4}\s+(.*)/);
      html += h ? "<h4>" + inl(h[1]) + "</h4>" : "<p>" + inl(line) + "</p>";
    }
    return html + (inList ? "</ul>" : "");
  }
  let toastTimer;
  function toast(msg) {
    const el = document.getElementById("toast"); el.textContent = msg; el.classList.add("show");
    clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove("show"), 2400);
  }
  const go = (h) => { location.hash = h; };
  const icon = (t, cls = "ico") => `<div class="${cls}" style="background:${t.color}">${esc(t.abbr)}</div>`;
  const dock = (b) => `<div class="dock"><div class="dock-inner">${b}</div></div>`;
  const greeting = () => { const h = new Date().getHours(); return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening"; };
  const today = () => Math.floor((Date.now() - new Date().getTimezoneOffset() * 60000) / 86400000); // local calendar day
  function shuffleIdx(n, seed) { const a = [...Array(n).keys()]; let s = seed; for (let i = n - 1; i > 0; i--) { s = (s * 9301 + 49297) % 233280; const j = Math.floor((s / 233280) * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  const hash = (s) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

  /* ---------------- Review (spaced repetition) ---------------- */
  function addCards(t, x) {
    const les = x.les;
    shortcutRows(t, les).forEach((row) => {
      const id = row.id ? `k:${t.id}:${row.id}` : `t:${t.id}:${x.id}:${row.term}`;
      if (!S.review[id]) S.review[id] = { b: 0, due: today() + 1 };
    });
  }
  function addMissed(t, x, qi) { const id = `q:${t.id}:${x.id}:${qi}`; S.review[id] = { b: 0, due: today() }; }
  function cardContent(id) {
    const [kind, tid, a, b] = id.split(":");
    const t = byId[tid]; if (!t) return null;
    if (kind === "k") { const e = SC[tid] && SC[tid].keys[a]; return e ? { app: t.name, front: e[1], back: `<kbd>${esc(e[0])}</kbd>` } : null; }
    const x = flat(t).find((y) => y.id === a); if (!x) return null;
    if (kind === "t") { const row = (x.les.k || []).find((k) => Array.isArray(k) && k[0] === b); return row ? { app: t.name, front: `Define: <b>${esc(row[0])}</b>`, back: esc(row[1]) } : null; }
    if (kind === "q") { const q = x.les.q[+b]; return q ? { app: t.name, front: esc(q[0]), back: `<b>${esc(q[1][q[2]])}</b><br><span class="help">${esc(q[3])}</span>` } : null; }
    return null;
  }
  const dueCards = () => Object.keys(S.review).filter((k) => S.review[k].due <= today() && cardContent(k));

  /* ---------------- Screens ---------------- */
  function renderHome() {
    const name = S.name ? esc(S.name.split(" ")[0]) : "Creator";
    const xi = xpInfo();
    if (!S.lvInit) { S.seenLevel = Math.max(S.seenLevel || 1, xi.level); S.lvInit = 1; save(); }
    let cont = "";
    if (S.last && byId[S.last.t]) {
      const t = byId[S.last.t]; const st = stats(t);
      if (st.next) cont = `<h2>Continue</h2>
        <button class="card continue" style="width:100%;text-align:left" data-go="${lockReason(t, st.next) ? "#/track/fundamentals" : `#/lesson/${t.id}/${st.next.id}`}">
          ${icon(t)}<div class="meta"><small>${esc(t.name)} · ${TIER_NAMES[st.next.ti]} · M${st.next.mi + 1}</small><div>${esc(st.next.les.t)}</div></div><div class="big">▶</div></button>`;
    }
    const due = dueCards().length;
    const reviewCard = Object.keys(S.review).length ? `<button class="card review-card" data-go="#/review" style="width:100%;text-align:left;margin-top:10px">
        <div class="big">🔁</div><div class="meta"><small>Daily review</small><div>${due ? `${due} card${due > 1 ? "s" : ""} due` : "All caught up"}</div></div><div class="big">›</div></button>` : "";

    const groups = GROUPS.map((g) => {
      const list = TRACKS.filter((t) => t.group === g.id);
      if (!list.length) return "";
      const tiles = list.map((t) => {
        const st = stats(t);
        const wide = g.id === "core" ? " wide" : "";
        if (!t.tiers) return `<button class="track-tile soon${wide}" data-locked="${esc(t.name)} is being upgraded to 60 lessons — arrives in the next app update">
          <div class="row" style="justify-content:space-between;align-items:center">${icon(t)}<span class="num">${String(t.num).padStart(2, "0")}</span></div>
          <div><div class="nm">${esc(t.name)}</div><div class="fc">${esc(t.focus)}</div></div><div class="pct">⏳ Upgrading</div></button>`;
        return `<button class="track-tile${wide}" data-go="#/track/${t.id}">
          <div class="row" style="justify-content:space-between;align-items:center">${icon(t)}<span class="num">${String(t.num).padStart(2, "0")}</span></div>
          <div><div class="nm">${esc(t.name)}</div><div class="fc">${esc(t.focus)}</div></div>
          <div class="bar"><i style="width:${st.pct}%"></i></div><div class="pct">${st.done}/${st.total}</div></button>`;
      }).join("");
      return `<h2 class="group-label">${g.icon} ${esc(g.label)}</h2><div class="grid">${tiles}</div>`;
    }).join("");
    const totals = TRACKS.reduce((a, t) => { const s = stats(t); a.d += s.done; a.t += s.total; return a; }, { d: 0, t: 0 });

    $app.innerHTML = `
    <div class="screen">
      <div class="topbar">
        <div class="brand"><div class="brand-mark">U</div><div class="brand-name">Urban Digital<small>Learning</small></div></div>
        <div class="row" style="gap:8px"><span class="streak-chip ${streakNow() ? "on" : ""}" title="Day streak">🔥 ${streakNow()}</span><button class="avatar-btn" data-go="#/profile" aria-label="Your profile">${avatar(36)}</button></div>
      </div>
      <p class="lead">${greeting()}, <b style="color:var(--text)">${name}</b> 👋</p>
      <h1>Beginner <span class="hl">→</span> Industry Pro.</h1>
      <button class="card level-card" data-go="#/profile" style="width:100%;text-align:left">
        <div class="lv-badge">${xi.level}</div>
        <div class="meta"><small>Level ${xi.level} · ${esc(xi.title)}</small><div class="bar"><i style="width:${xi.pct}%"></i></div><span class="help">${xi.xp} XP · ${xi.toNext} XP to level ${xi.level + 1}</span></div></button>
      ${cont || `<button class="card continue" style="width:100%;text-align:left;margin-top:10px" data-go="#/track/fundamentals"><div class="big">🧭</div><div class="meta"><small>Start here</small><div>Design Fundamentals · Lesson 1</div></div><div class="big">▶</div></button>`}${reviewCard}
      <div class="stats" style="margin-top:18px">
        <div class="stat"><b>${TRACKS.length}</b><span>Tracks</span></div>
        <div class="stat"><b>${totals.t}</b><span>Lessons</span></div>
        <div class="stat"><b class="hl">${totals.d}</b><span>Done</span></div>
      </div>
      ${groups}
    </div>${tabbar("home")}`;
  }

  function renderTrack(tid, tierSel) {
    const t = byId[tid]; if (!t || !t.tiers) return go("#/");
    const st = stats(t); const p = P(t.id);
    const ti = tierSel != null && !isNaN(tierSel) ? tierSel : (st.next ? st.next.ti : 2);
    const tier = t.tiers[ti];
    const gate = t.id !== "fundamentals" && ti >= 1 && byId.fundamentals && !tierDone("fundamentals", 0);
    const tabs = t.tiers.map((tr, i) => {
      const tDone = tierDone(t.id, i);
      return `<button class="tier-tab ${i === ti ? "on" : ""}" data-go="#/track/${t.id}/${i}">${tDone ? "✓ " : ""}${TIER_NAMES[i]}</button>`;
    }).join("");
    const mods = tier.modules.map((mod, mi) => {
      const rows = mod.lessons.map((les, li) => {
        const x = flat(t).find((y) => y.id === lid(ti, mi, li));
        const done = !!p.done[x.id]; const reason = done ? null : lockReason(t, x);
        const cls = done ? "done" : !reason ? "current" : "locked";
        const mark = done ? "✓" : !reason ? "▶" : "🔒";
        const badge = les.rub ? `<span class="mini-tag">${les.client ? "CLIENT" : "GRADED"}</span>` : "";
        return `<button class="lesson-row ${cls}" ${!reason || done ? `data-go="#/lesson/${t.id}/${x.id}"` : `data-locked="${esc(reason)}"`}>
          <span class="st">${mark}</span><span class="lt">${esc(les.t)}</span>${badge}<span class="go">›</span></button>`;
      }).join("");
      return `<div class="module"><div class="module-head"><span class="m">M${mi + 1}</span><span class="t">${esc(mod.title)}</span>${mod.tag ? `<span class="tag ${/Project|Capstone/.test(mod.tag) ? "pro" : ""}">${esc(mod.tag)}</span>` : ""}</div>${rows}</div>`;
    }).join("");
    const src = SC[t.id] && SC[t.id].url ? `<p class="help" style="margin-top:14px">Shortcuts: ✓ = in the official list (${esc(SC[t.id].source)}); ◐ = cross-checked, confirm via ${esc(SC[t.id].confirm)}.</p>` : "";

    $app.innerHTML = `
    <div class="screen">
      <div class="topbar"><button class="icon-btn" data-go="#/" aria-label="Back">←</button><span class="title">Roadmap</span><button class="icon-btn" data-go="#/settings" aria-label="Settings">⚙</button></div>
      <div class="track-hero">${icon(t)}<div><h1>${esc(t.name)}</h1><p>${esc(t.focus)}</p></div></div>
      <p class="lead" style="margin-bottom:14px">${esc(t.intro)}</p>
      <div class="stats">
        <div class="stat"><b>3</b><span>Tiers</span></div>
        <div class="stat"><b>${st.total}</b><span>Lessons</span></div>
        <div class="stat"><b class="hl">${st.pct}%</b><span>Complete</span></div>
      </div>
      <div class="tier-tabs">${tabs}</div>
      ${gate ? `<div class="card gate">🔒 <b>Design Fundamentals · Beginner</b> unlocks this tier. Pros learn the principles before the tools. <button class="btn btn-ghost btn-small" data-go="#/track/fundamentals">Go to Fundamentals</button></div>` : ""}
      <p class="help" style="margin:10px 2px 0">${esc(tier.goal || "")}</p>
      ${mods}${src}
    </div>
    ${dock(!st.next ? `<button class="btn btn-primary" data-go="#/portfolio">🏆 Track Complete · View Portfolio</button>`
      : lockReason(t, st.next) ? `<button class="btn btn-primary" data-go="#/track/fundamentals">🧭 Unlock via Design Fundamentals</button>`
      : `<button class="btn btn-primary" data-go="#/lesson/${t.id}/${st.next.id}">${st.done ? "▶ Continue" : "▶ Start Lesson 1"}</button>`)}`;
  }

  function renderLesson(tid, id) {
    const t = byId[tid]; if (!t) return go("#/");
    const all = flat(t); const idx = all.findIndex((y) => y.id === id); const x = all[idx];
    if (!x) return go("#/track/" + tid);
    const p = P(t.id); const done = !!p.done[x.id];
    const reason = done ? null : lockReason(t, x);
    if (reason) { toast("🔒 " + reason); return go("#/track/" + tid + "/" + x.ti); }
    const les = x.les; const next = all[idx + 1];
    S.last = { t: t.id, id: x.id }; save();

    const bars = x.mod.lessons.map((_, i) => `<i class="${i <= x.li ? "on" : ""}"></i>`).join("");
    const rows = shortcutRows(t, les);
    const keysHtml = rows.length ? (rows[0].term
      ? `<div class="card section"><div class="section-h">📖 Key Terms</div><div class="keys">${rows.map((r) => `<div class="term"><b>${esc(r.term)}</b><span>${esc(r.def)}</span></div>`).join("")}</div></div>`
      : `<div class="card section"><div class="section-h">⌨️ Shortcuts <span class="src-note">Windows</span></div><div class="keys">${rows.map((r) => `<div class="key-row"><span>${esc(r.act)} <i class="vbadge ${r.st === "o" ? "ok" : "x"}" title="${r.st === "o" ? "Official list" : "Cross-checked"}">${r.st === "o" ? "✓" : "◐"}</i></span><kbd>${esc(r.keys)}</kbd></div>`).join("")}</div></div>`) : "";
    const viz = les.v && window.UDL_renderVisual ? `<div class="card section"><div class="section-h">👁 See It</div>${window.UDL_renderVisual(les.v)}${les.cap ? `<p class="viz-cap">${inl(les.cap)}</p>` : ""}</div>` : "";

    const quizPassed = (p.quiz[x.id] || 0) >= PASS_QUIZ;
    $app.innerHTML = `
    <div class="screen">
      <div class="topbar"><button class="icon-btn" data-go="#/track/${t.id}/${x.ti}" aria-label="Back">←</button><span class="title">${esc(t.name)} · ${TIER_NAMES[x.ti]}</span><button class="icon-btn" data-go="#/" aria-label="Home">⌂</button></div>
      <div class="crumb">M${x.mi + 1} · L${x.li + 1} — ${esc(x.mod.title)}</div>
      <h1 class="lesson-title">${esc(les.t)}</h1>
      <div class="progress-line">${bars}</div>
      <div class="card section"><div class="section-h">🧠 Concept</div><p class="concept">${inl(les.c)}</p></div>
      ${viz}
      <div class="card section"><div class="section-h">🧭 Key Points</div><ul class="points">${les.p.map((s) => `<li><span>${inl(s)}</span></li>`).join("")}</ul></div>
      ${keysHtml}
      <div class="card section tip"><div class="section-h" style="color:#c3b3ff">💡 Pro Tip</div><p>${inl(les.tip)}</p></div>
      <div id="quiz-slot"></div>
      <div id="lab-slot"></div>
    </div>
    <div id="dock-slot"></div>`;

    renderQuiz(t, x, done || quizPassed);
    renderLab(t, x, next);
  }

  /* ---------- Quiz ---------- */
  function renderQuiz(t, x, passed) {
    const slot = document.getElementById("quiz-slot"); const p = P(t.id);
    const les = x.les;
    if (passed) {
      slot.innerHTML = `<div class="card section quiz passed"><div class="section-h" style="color:var(--ok)">✅ Quick Check · passed ${p.quiz[x.id] || 3}/3</div><button class="btn btn-ghost btn-small" id="retake">Retake quiz</button></div>`;
      document.getElementById("retake").onclick = () => { slot.innerHTML = ""; drawQuiz(t, x); };
      return;
    }
    drawQuiz(t, x);
  }
  function drawQuiz(t, x) {
    const slot = document.getElementById("quiz-slot"); const les = x.les; const p = P(t.id);
    const seed = hash(t.id + x.id) + (p.quizTries = (p.quizTries || 0));
    const orders = les.q.map((q, qi) => shuffleIdx(q[1].length, seed + qi));
    slot.innerHTML = `<div class="card section quiz"><div class="section-h">🎯 Quick Check · ${PASS_QUIZ}/3 to unlock the lab</div>
      ${les.q.map((q, qi) => `<div class="q" data-q="${qi}"><p class="qt">${qi + 1}. ${inl(q[0])}</p>
        ${orders[qi].map((oi) => `<button class="opt" data-q="${qi}" data-o="${oi}">${inl(q[1][oi])}</button>`).join("")}
        <div class="why" hidden></div></div>`).join("")}
      <button class="btn btn-primary full" id="check" disabled>Check answers</button></div>`;
    const picks = {};
    slot.querySelectorAll(".opt").forEach((b) => b.onclick = () => {
      const qi = +b.dataset.q; picks[qi] = +b.dataset.o;
      slot.querySelectorAll(`.opt[data-q="${qi}"]`).forEach((o) => o.classList.toggle("sel", o === b));
      document.getElementById("check").disabled = Object.keys(picks).length < les.q.length;
    });
    document.getElementById("check").onclick = () => {
      let score = 0;
      les.q.forEach((q, qi) => {
        const ok = picks[qi] === q[2]; if (ok) score++; else addMissed(t, x, qi);
        slot.querySelectorAll(`.opt[data-q="${qi}"]`).forEach((o) => { o.disabled = true; const oi = +o.dataset.o; if (oi === q[2]) o.classList.add("right"); else if (oi === picks[qi]) o.classList.add("wrong"); });
        const w = slot.querySelector(`.q[data-q="${qi}"] .why`); w.hidden = false; w.innerHTML = (ok ? "✓ " : "✗ ") + inl(q[3]);
      });
      p.quiz[x.id] = Math.max(p.quiz[x.id] || 0, score); p.quizTries = (p.quizTries || 0) + 1; markActive(); save();
      const btn = document.getElementById("check");
      if (score >= PASS_QUIZ) { btn.outerHTML = `<div class="result ok">✅ ${score}/3 — lab unlocked</div>`; renderLab(t, x, flat(t)[flat(t).findIndex((y) => y.id === x.id) + 1]); }
      else { btn.outerHTML = `<div class="result bad">${score}/3 — review the lesson above and try again</div><button class="btn btn-ghost full" id="retry">Retry quiz</button>`; document.getElementById("retry").onclick = () => drawQuiz(t, x); }
    };
  }

  /* ---------- Lab ---------- */
  function renderLab(t, x, next) {
    const slot = document.getElementById("lab-slot"); const dockSlot = document.getElementById("dock-slot");
    const p = P(t.id); const les = x.les; const lab = les.lab; const done = !!p.done[x.id];
    const unlocked = done || (p.quiz[x.id] || 0) >= PASS_QUIZ;
    const rubric = les.rub ? (t.rubrics || {})[les.rub] : null;
    const starter = [lab.file ? `<a class="chip" href="${REPO_RAW}${esc(lab.file)}" target="_blank" rel="noopener">⬇ Starter file</a>` : "", lab.photo ? `<a class="chip" href="https://www.pexels.com/search/${encodeURIComponent(lab.photo)}/" target="_blank" rel="noopener">📷 Free photos: ${esc(lab.photo)}</a>` : ""].join("");
    const client = les.client ? `<div class="client"><div class="section-h" style="color:var(--org)">💬 Client feedback</div><p>${inl(les.client)}</p></div>` : "";
    const labBody = `
      ${client}
      <div class="scenario"><b>Real-world:</b> ${inl(lab.s)}</div>
      ${starter ? `<div class="chips">${starter}</div>` : ""}
      <ol>${lab.do.map((s) => `<li><span>${inl(s)}</span></li>`).join("")}</ol>`;

    if (!unlocked) {
      slot.innerHTML = `<div class="card section lab locked-lab"><div class="section-h" style="color:var(--accent)">🛠 Hands-On Lab</div>${labBody}<div class="lock-over">🔒 Pass the Quick Check to submit this lab</div></div>`;
      dockSlot.innerHTML = dock(`<button class="btn btn-ghost" data-go="#/track/${t.id}/${x.ti}">🗺 Roadmap</button><button class="btn btn-primary" onclick="document.getElementById('quiz-slot').scrollIntoView({behavior:'smooth'})">Take Quick Check ↑</button>`);
      return;
    }
    if (done) {
      const ans = p.ans[x.id] || []; const r = p.rub[x.id]; const fb = p.fb[x.id];
      slot.innerHTML = `<div class="card section lab"><div class="section-h" style="color:var(--accent)">🛠 Hands-On Lab · completed</div>${labBody}</div>
        <div class="card section"><div class="section-h">📝 Your answers</div>${lab.r.map((q, i) => `<p class="help"><b>${inl(q)}</b></p><p class="ans">${esc(ans[i] || "")}</p>`).join("")}<div id="ev-prev"></div></div>
        ${r ? `<div class="card section" style="border-color:#1f5a41"><div class="section-h" style="color:var(--ok)">📊 Rubric · ${Math.round(r.total * 100)}% (${r.by === "ai" ? "AI graded" : "self-assessed"})</div>${rubric.map((c, i) => `<div class="rub-line"><span>${inl(c)}</span><b class="s${r.scores[i]}">${["Missing", "Partly", "Nailed"][r.scores[i]]}</b></div>`).join("")}</div>` : ""}
        ${fb ? `<div class="card section" style="border-color:#1f5a41"><div class="section-h" style="color:var(--ok)">🎯 Coach Review</div><div class="feedback">${md(fb)}</div></div>` : ""}`;
      if (les.rub) DB.get(evKey(`${t.id}/${x.id}`)).then((ev) => { if (ev && document.getElementById("ev-prev")) document.getElementById("ev-prev").innerHTML = `<img class="evidence" src="${ev.img}" alt="Your submitted work"/>`; }).catch(() => {});
      dockSlot.innerHTML = dock(next
        ? `<button class="btn btn-ghost btn-small" data-go="#/track/${t.id}/${x.ti}">🗺</button><button class="btn btn-primary" data-go="#/lesson/${t.id}/${next.id}">Next Lesson →</button>`
        : `<button class="btn btn-primary" data-go="#/portfolio">🏆 Track Complete</button>`);
      return;
    }

    const saved = p.ans[x.id] || [];
    slot.innerHTML = `<div class="card section lab"><div class="section-h" style="color:var(--accent)">🛠 Hands-On Lab</div>${labBody}</div>
      <div id="hint-slot"></div>
      <div class="card section submit-box">
        <div class="section-h">📤 Report Back</div>
        ${lab.r.map((q, i) => `<label class="rq">${inl(q)}<textarea data-i="${i}" rows="2" placeholder="Your answer">${esc(saved[i] || "")}</textarea></label>`).join("")}
        <div class="attach">
          <label>📎 ${les.rub ? "Attach screenshot (required)" : "Attach screenshot"}<input type="file" id="shot" accept="image/*" /></label>
          <span id="shot-prev" class="x">${les.rub ? "Proof of your work" : S.apiKey ? "Optional — AI will review it" : "Optional"}</span>
        </div>
        ${rubric ? `<div class="rubric"><div class="section-h" style="margin-top:14px">📊 Rubric ${S.apiKey ? "(AI grades this)" : "(score yourself honestly)"}</div>
          ${rubric.map((c, i) => `<div class="rub-item"><p>${inl(c)}</p>${S.apiKey ? "" : `<div class="seg" data-i="${i}">${["Missing", "Partly", "Nailed"].map((n, s) => `<button data-s="${s}">${n}</button>`).join("")}</div>`}</div>`).join("")}
          <p class="help">Pass mark: ${Math.round(PASS_RUBRIC * 100)}%. Below that, revise and resubmit.</p></div>` : ""}
      </div>`;
    dockSlot.innerHTML = dock(`<button class="btn btn-ghost" id="stuck">❓ Stuck</button><button class="btn btn-primary" id="submit">Submit Lab</button>`);

    let image = null; const selfScores = rubric ? rubric.map(() => null) : null;
    slot.querySelectorAll("textarea").forEach((ta) => ta.addEventListener("input", () => { const a = p.ans[x.id] = p.ans[x.id] || []; a[+ta.dataset.i] = ta.value; save(); }));
    const file = document.getElementById("shot"); const prev = document.getElementById("shot-prev");
    file.addEventListener("change", async () => {
      const f = file.files && file.files[0]; if (!f) return;
      try { image = await compressImage(f); prev.innerHTML = `<img class="thumb" src="data:${image.type};base64,${image.data}" alt=""/> <span class="x">Attached ✓</span>`; }
      catch (e) { toast("Couldn't read that image"); }
    });
    slot.querySelectorAll(".seg").forEach((seg) => seg.querySelectorAll("button").forEach((b) => b.onclick = () => {
      selfScores[+seg.dataset.i] = +b.dataset.s; seg.querySelectorAll("button").forEach((o) => o.classList.toggle("on", o === b));
    }));

    document.getElementById("stuck").onclick = async (ev) => {
      const hs = document.getElementById("hint-slot");
      if (!S.apiKey) {
        hs.innerHTML = `<div class="card section tip"><div class="section-h" style="color:#c3b3ff">🆘 Unstick</div>${les.hint ? `<p style="margin-bottom:10px">${inl(les.hint)}</p>` : ""}
          <ul class="points"><li><span>Re-read <b>Key Points</b> and redo one step at a time.</span></li><li><span>Tool not responding? Check the right object or layer is <b>selected</b>.</span></li><li><span>Shortcut not working? Confirm it in the app: ${esc((SC[t.id] && SC[t.id].confirm) || "the app's shortcut settings")}.</span></li><li><span>Add an API key in ⚙ Settings for a personal AI hint.</span></li></ul></div>`;
        hs.scrollIntoView({ behavior: "smooth", block: "start" }); return;
      }
      const b = ev.currentTarget; const old = b.innerHTML; b.innerHTML = `<span class="spinner"></span>`; b.disabled = true;
      try { const txt = await askAI(t, x, collectAnswers(), image, "hint"); hs.innerHTML = `<div class="card section tip"><div class="section-h" style="color:#c3b3ff">🆘 Coach Hint</div><div class="feedback">${md(txt)}</div></div>`; hs.scrollIntoView({ behavior: "smooth", block: "start" }); }
      catch (e) { toast(e.message); }
      b.innerHTML = old; b.disabled = false;
    };
    function collectAnswers() { return [...slot.querySelectorAll("textarea")].map((ta) => ta.value.trim()); }

    document.getElementById("submit").onclick = async (ev) => {
      const ans = collectAnswers();
      const short = ans.findIndex((a) => a.length < MIN_ANSWER);
      if (short !== -1) { toast(`Answer question ${short + 1} properly (a sentence, not a word)`); slot.querySelectorAll("textarea")[short].focus(); return; }
      if (les.rub && !image) { toast("Graded projects need a screenshot of your work 📎"); return; }
      if (rubric && !S.apiKey && selfScores.some((s) => s == null)) { toast("Score every rubric line first"); return; }
      const b = ev.currentTarget; b.innerHTML = `<span class="spinner"></span> ${S.apiKey ? "Grading…" : "Saving…"}`; b.disabled = true;
      p.ans[x.id] = ans;
      let rub = null;
      try {
        if (S.apiKey && rubric) {
          const g = await askAI(t, x, ans, image, "grade", rubric);
          rub = { scores: g.scores, total: g.scores.reduce((a, c) => a + c, 0) / (rubric.length * 2), by: "ai" };
          p.fb[x.id] = g.feedback;
        } else if (S.apiKey) {
          p.fb[x.id] = await askAI(t, x, ans, image, "review");
        }
      } catch (e) { toast(e.message); b.innerHTML = "Submit Lab"; b.disabled = false; return; }
      if (rubric && !rub) rub = { scores: selfScores, total: selfScores.reduce((a, c) => a + c, 0) / (rubric.length * 2), by: "self" };
      if (rub) {
        p.rub[x.id] = rub;
        if (rub.total < PASS_RUBRIC || rub.scores.some((s) => s === 0)) {
          save(); b.innerHTML = "Resubmit"; b.disabled = false;
          const hs = document.getElementById("hint-slot");
          hs.innerHTML = `<div class="card section" style="border-color:var(--danger)"><div class="section-h" style="color:var(--danger)">🔧 Not yet — ${Math.round(rub.total * 100)}%</div>
            <p class="help">Every line needs at least "Partly" and the total must reach ${Math.round(PASS_RUBRIC * 100)}%. Fix the weak lines and resubmit.</p>
            ${rubric.map((c, i) => `<div class="rub-line"><span>${inl(c)}</span><b class="s${rub.scores[i]}">${["Missing", "Partly", "Nailed"][rub.scores[i]]}</b></div>`).join("")}
            ${p.fb[x.id] ? `<div class="feedback" style="margin-top:10px">${md(p.fb[x.id])}</div>` : ""}</div>`;
          hs.scrollIntoView({ behavior: "smooth", block: "start" });
          return;
        }
      }
      if (image && les.rub) { try { await DB.put(evKey(`${t.id}/${x.id}`), { img: `data:${image.type};base64,${image.data}`, title: les.t, track: t.name, ts: Date.now() }); } catch (e) {} }
      p.done[x.id] = Date.now(); addCards(t, x); markActive(); save();
      const gained = 10 + (les.rub ? 40 : 0) + (tierDone(t.id, x.ti) ? 100 : 0);
      toast(`✅ +${gained} XP · next lesson unlocked`);
      checkLevelUp();
      renderLesson(t.id, x.id);
      setTimeout(() => { const el = document.getElementById("lab-slot"); el && el.scrollIntoView({ behavior: "smooth" }); }, 50);
    };
  }

  function compressImage(f) {
    return new Promise((resolve, reject) => {
      const r = new FileReader(); r.onerror = reject;
      r.onload = () => { const img = new Image(); img.onerror = reject; img.onload = () => {
        const max = 1280; const sc = Math.min(1, max / Math.max(img.width, img.height));
        const cv = document.createElement("canvas"); cv.width = Math.round(img.width * sc); cv.height = Math.round(img.height * sc);
        cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height);
        resolve({ type: "image/jpeg", data: cv.toDataURL("image/jpeg", 0.8).split(",")[1] });
      }; img.src = r.result; };
      r.readAsDataURL(f);
    });
  }

  /* ---------------- AI coach ---------------- */
  async function callAI(system, content, maxTokens) {
    let res;
    try {
      res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "content-type": "application/json", "x-api-key": S.apiKey, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" },
        body: JSON.stringify({ model: S.model || DEFAULT_MODEL, max_tokens: maxTokens, system, messages: [{ role: "user", content }] }),
      });
    } catch (e) { throw new Error("No connection — check your internet"); }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { if (res.status === 401) throw new Error("API key rejected — check ⚙ Settings"); throw new Error(((data.error && data.error.message) || "AI error " + res.status).slice(0, 120)); }
    return (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("\n").trim();
  }
  async function askAI(t, x, answers, image, mode, rubric) {
    const les = x.les;
    const lesson = [
      `Track: ${t.name} · Tier: ${TIER_NAMES[x.ti]} · Module ${x.mi + 1}: ${x.mod.title} · Lesson: ${les.t}`,
      `Concept: ${les.c}`, `Key points: ${les.p.join(" | ")}`,
      `Lab scenario: ${les.lab.s}`, `Lab steps: ${les.lab.do.map((s, i) => i + 1 + ". " + s).join(" ")}`,
      les.client ? `Client feedback to address: ${les.client}` : "",
      `Report questions and student answers:\n${les.lab.r.map((q, i) => `Q: ${q}\nA: ${answers[i] || "(blank)"}`).join("\n")}`,
    ].filter(Boolean).join("\n");
    const content = [];
    if (image) content.push({ type: "image", source: { type: "base64", media_type: image.type, data: image.data } });
    const base = `You are the senior mentor inside "Urban Digital Learning", a mobile app that trains beginners to industry-professional level. Be honest and specific; never praise incomplete or careless work.`;
    if (mode === "grade") {
      content.push({ type: "text", text: `${lesson}\n\nRUBRIC (score each 0=Missing, 1=Partly, 2=Nailed):\n${rubric.map((c, i) => `${i + 1}. ${c}`).join("\n")}\n\nReturn ONLY JSON: {"scores":[n,...${rubric.length} ints],"feedback":"markdown under 150 words with sections ## Verdict, ## Fix this, ## Pro move"}. Judge from the screenshot and answers; if the screenshot does not show the criterion, score it 0 or 1.` });
      const raw = await callAI(base, content, 900);
      const m = raw.match(/\{[\s\S]*\}/);
      let g; try { g = JSON.parse(m ? m[0] : raw); } catch (e) { throw new Error("AI grade unreadable — try again"); }
      const scores = rubric.map((_, i) => Math.max(0, Math.min(2, Math.round(+((g.scores || [])[i]) || 0))));
      return { scores, feedback: String(g.feedback || "") };
    }
    if (mode === "review") {
      content.push({ type: "text", text: `${lesson}\n\nReview this submission for a phone screen, under 160 words, with sections ## Verdict, ## What worked, ## Fix this, ## Pro move. Correct any wrong answers. If a screenshot is attached, critique what you actually see.` });
      return callAI(base, content, 700);
    }
    content.push({ type: "text", text: `${lesson}\n\nThe student is stuck. Give a short unblock (under 110 words, 3-5 bullets) with exact menu paths and shortcuts for ${t.name}, plus one question to check their setup. Don't do the lab for them.` });
    return callAI(base, content, 500);
  }

  /* ---------------- Review screen ---------------- */
  function renderReview() {
    const due = dueCards();
    const total = Object.keys(S.review).length;
    if (!due.length) {
      $app.innerHTML = `<div class="screen"><div class="topbar"><span style="width:40px"></span><span class="title">Review</span><span style="width:40px"></span></div>
        <div class="celebrate"><div class="big">🧠</div><h1>All caught up</h1><p class="lead">${total ? `${total} card${total === 1 ? "" : "s"} in your deck. Shortcuts and missed quiz questions come back just before you'd forget them.` : "Finish a lesson and its shortcuts land here. A few minutes a day keeps them in your head."}</p>
        <button class="btn btn-primary" style="margin-top:18px;width:auto" data-go="#/">Keep learning →</button></div></div>
        ${tabbar("review")}`;
      return;
    }
    const id = due[0]; const cc = cardContent(id);
    $app.innerHTML = `<div class="screen"><div class="topbar"><button class="icon-btn" data-go="#/" aria-label="Back">←</button><span class="title">Review · ${due.length} due</span><span style="width:40px"></span></div>
      <div class="flash" id="flash"><small>${esc(cc.app)}</small><div class="front">${cc.front}</div><div class="back" hidden>${cc.back}</div><p class="help tap">Tap to reveal</p></div></div>
      ${dock(`<button class="btn btn-ghost" id="miss" disabled>✗ Missed</button><button class="btn btn-primary" id="knew" disabled>✓ Knew it</button>`)}`;
    const reveal = () => { document.querySelector("#flash .back").hidden = false; document.querySelector("#flash .tap").hidden = true; document.getElementById("miss").disabled = false; document.getElementById("knew").disabled = false; };
    document.getElementById("flash").onclick = reveal;
    const grade = (ok) => { const c = S.review[id]; c.b = ok ? Math.min(c.b + 1, INTERVALS.length - 1) : 0; c.due = today() + (ok ? INTERVALS[c.b] : 0) + (ok ? 0 : 0); if (!ok) c.due = today() + 1; markActive(); save(); renderReview(); };
    document.getElementById("knew").onclick = () => grade(true);
    document.getElementById("miss").onclick = () => grade(false);
  }

  /* ---------------- Portfolio ---------------- */
  async function renderPortfolio() {
    $app.innerHTML = `<div class="screen"><div class="topbar"><span style="width:40px"></span><span class="title">Portfolio</span><span style="width:40px"></span></div>
      <h1>Your Work</h1><p class="lead">Every graded project you pass lands here.</p><div id="pf" class="pf-grid"><p class="help">Loading…</p></div></div>${tabbar("portfolio")}`;
    const items = (await myEvidence()).sort((a, b) => b[1].ts - a[1].ts);
    const el = document.getElementById("pf"); if (!el) return;
    el.innerHTML = items.length ? items.map(([k, v]) => `<figure class="pf"><img src="${v.img}" alt=""/><figcaption><b>${esc(v.title)}</b><span>${esc(v.track)}</span></figcaption></figure>`).join("")
      : `<div class="card"><p class="help">No projects yet. Finish a graded project lesson (marked GRADED) to add your first piece.</p></div>`;
  }

  /* ---------------- Settings ---------------- */
  function renderSettings() {
    $app.innerHTML = `
    <div class="screen">
      <div class="topbar"><button class="icon-btn" data-back aria-label="Back">←</button><span class="title">Settings</span><span style="width:40px"></span></div>
      <h1>Settings</h1>
      <div class="card section"><div class="section-h">🤖 AI Coach & Grader (optional)</div>
        <p class="help">With an Anthropic API key, the AI grades graded projects against their rubric, reviews every lab, and gives personal hints. The key stays on this phone and is only sent to Anthropic. Get one at console.anthropic.com; usage is billed to your account.</p>
        <div class="field"><label for="key">API key</label><input id="key" type="password" value="${esc(S.apiKey)}" placeholder="sk-ant-…" autocomplete="off" autocapitalize="off" spellcheck="false"/></div>
        <div class="field"><label for="model">Model</label><input id="model" value="${esc(S.model || DEFAULT_MODEL)}" autocapitalize="off" spellcheck="false"/></div>
        <div class="row" style="margin-top:12px"><button class="btn btn-ghost" id="test">Test connection</button></div></div>
      <div class="card section"><div class="section-h">🗂 Progress</div>
        <p class="help">Reset clears lessons, quiz scores, review cards and portfolio images.</p>
        <div class="row" style="margin-top:12px"><button class="btn btn-ghost" id="reset" style="color:var(--danger)">Reset all progress</button></div></div>
      <p class="help" style="text-align:center;margin-top:22px">Urban Digital Learning · v2 · Urban Enterprise</p>
    </div>${dock(`<button class="btn btn-primary" id="save">Save</button>`)}`;
    const persist = () => { S.apiKey = document.getElementById("key").value.trim(); S.model = document.getElementById("model").value.trim() || DEFAULT_MODEL; save(); };
    document.getElementById("save").onclick = () => { persist(); toast("Saved ✓"); history.length > 1 ? history.back() : go("#/"); };
    document.getElementById("test").onclick = async (ev) => {
      persist(); if (!S.apiKey) return toast("Paste a key first");
      const b = ev.currentTarget; b.innerHTML = `<span class="spinner"></span>`; b.disabled = true;
      try { await callAI("Reply with OK.", [{ type: "text", text: "Say OK" }], 10); toast("✅ AI Coach connected"); } catch (e) { toast("❌ " + e.message); }
      b.innerHTML = "Test connection"; b.disabled = false;
    };
    document.getElementById("reset").onclick = async () => {
      if (confirm("Reset ALL progress? This can't be undone.")) { S.prog = {}; S.last = null; S.review = {}; save(); try { for (const [k] of await myEvidence()) await DB.del(k); } catch (e) {} toast("Progress reset"); }
    };
  }

  /* ---------------- XP, levels & streaks ---------------- */
  const LEVEL_TITLES = [[14, "Legend"], [11, "Pro"], [8, "Designer"], [5, "Maker"], [3, "Explorer"], [1, "Rookie"]];
  function xpInfo() {
    let xp = 0, lessons = 0, projects = 0, tiers = 0;
    TRACKS.forEach((t) => {
      const p = P(t.id);
      flat(t).forEach((x) => { if (p.done[x.id]) { lessons++; xp += 10; if (x.les.rub) { projects++; xp += 40; } } });
      (t.tiers || []).forEach((_, i) => { if (tierDone(t.id, i)) { tiers++; xp += 100; } });
    });
    const level = Math.floor(Math.sqrt(xp / 50)) + 1;
    const cur = 50 * (level - 1) ** 2, nxt = 50 * level ** 2;
    return { xp, lessons, projects, tiers, level, pct: Math.round(((xp - cur) / (nxt - cur)) * 100), toNext: nxt - xp, title: LEVEL_TITLES.find(([l]) => level >= l)[1] };
  }
  function markActive() {
    const d = today(); const a = S.act || (S.act = { last: 0, streak: 0, best: 0 });
    if (a.last === d) return;
    a.streak = a.last === d - 1 ? (a.streak || 0) + 1 : 1; a.last = d; a.best = Math.max(a.best || 0, a.streak);
  }
  const streakNow = () => { const a = S.act || {}; return a.last >= today() - 1 ? a.streak || 0 : 0; };
  function checkLevelUp() {
    const xi = xpInfo();
    if (xi.level <= (S.seenLevel || 1)) return;
    S.seenLevel = xi.level; save();
    const el = document.createElement("div"); el.className = "overlay";
    el.innerHTML = `<div class="overlay-card" role="dialog" aria-label="Level up"><div class="confetti">🎉✨🏆✨🎉</div><div class="lv-badge big">${xi.level}</div>
      <h1>Level ${xi.level}!</h1><p class="lead">You're now a <b class="hl">${esc(xi.title)}</b>. Keep the streak going.</p>
      <button class="btn btn-primary full" style="margin-top:18px">Keep going →</button></div>`;
    el.querySelector("button").onclick = () => el.remove();
    document.body.appendChild(el);
  }
  function badges() {
    const xi = xpInfo(); const a = S.act || {};
    const fundDone = byId.fundamentals && tierDone("fundamentals", 0);
    const capstone = TRACKS.some((t) => t.tiers && tierDone(t.id, 2));
    return [
      { ic: "🌱", nm: "First Step", d: "Finish your first lesson", on: xi.lessons >= 1 },
      { ic: "🧭", nm: "Fundamentals Grad", d: "Finish Design Fundamentals · Beginner", on: !!fundDone },
      { ic: "🏅", nm: "First Project", d: "Pass a graded project", on: xi.projects >= 1 },
      { ic: "🔥", nm: "On Fire", d: "Reach a 7-day streak", on: (a.best || 0) >= 7 },
      { ic: "📚", nm: "Bookworm", d: "Finish 50 lessons", on: xi.lessons >= 50 },
      { ic: "⭐", nm: "Level 5", d: "Reach level 5", on: xi.level >= 5 },
      { ic: "💼", nm: "Client Ready", d: "Finish a Pro tier capstone", on: capstone },
      { ic: "👑", nm: "Legend", d: "Reach level 14", on: xi.level >= 14 },
    ];
  }

  /* ---------------- Shared chrome ---------------- */
  function tabbar(on) {
    const due = dueCards().length;
    const tabs = [["home", "#/", "🏠", "Learn"], ["review", "#/review", "🔁", "Review"], ["portfolio", "#/portfolio", "🗂", "Portfolio"], ["profile", "#/profile", "👤", "Profile"]];
    return `<nav class="tabbar" aria-label="Main"><div class="tabbar-inner">${tabs.map(([id, h, ic, lb]) =>
      `<button class="tab ${on === id ? "on" : ""}" data-go="${h}" ${on === id ? 'aria-current="page"' : ""}><span class="ti">${ic}${id === "review" && due ? `<i class="badge">${due > 9 ? "9+" : due}</i>` : ""}</span><span class="tl">${lb}</span></button>`).join("")}</div></nav>`;
  }
  const prof = () => (CLOUD ? profile : S.profile || (S.profile = {}));
  function avatar(size, photoOverride) {
    const pr = prof(); const nm = (pr.name || S.name || "").trim();
    const photo = photoOverride !== undefined ? photoOverride : pr.photo;
    if (photo) return `<img class="avatar" style="width:${size}px;height:${size}px" src="${esc(photo)}" alt=""/>`;
    if (false) return `<img class="avatar" style="width:${size}px;height:${size}px" src="${esc(pr.photo)}" alt=""/>`;
    const ini = nm ? nm.split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase() : "🙂";
    const hue = hash(nm || "x") % 360;
    return `<span class="avatar ini" style="width:${size}px;height:${size}px;font-size:${Math.round(size * 0.4)}px;background:linear-gradient(135deg,hsl(${hue} 80% 60%),hsl(${(hue + 60) % 360} 80% 45%))">${esc(ini)}</span>`;
  }
  function busy(btn, on, label) { if (on) { btn.dataset.l = btn.innerHTML; btn.innerHTML = `<span class="spinner"></span> ${label || ""}`; btn.disabled = true; } else { btn.innerHTML = btn.dataset.l || label || ""; btn.disabled = false; } }
  function showErr(msg) { const e = document.getElementById("err"); if (!e) return toast(msg); e.textContent = msg; e.hidden = !msg; }
  const emailOk = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);
  function eyeToggles() {
    document.querySelectorAll(".pw .eye").forEach((b) => b.onclick = () => {
      const i = b.parentElement.querySelector("input"); const show = i.type === "password";
      i.type = show ? "text" : "password"; b.textContent = show ? "🙈" : "👁"; b.setAttribute("aria-label", show ? "Hide password" : "Show password");
    });
  }

  /* ---------------- Firebase: auth + sync ---------------- */
  let fbAuth = null, fdb = null, user = null, authReady = !CLOUD, profile = {}, syncState = "";
  const pushed = {}; let syncTimer = null;
  const AUTH_ERR = {
    "auth/email-already-in-use": "That email already has an account. Log in instead.",
    "auth/invalid-email": "That email address doesn't look right.",
    "auth/weak-password": "Pick a stronger password (8+ characters with a number).",
    "auth/missing-password": "Enter your password.",
    "auth/invalid-credential": "Email or password is wrong.",
    "auth/invalid-login-credentials": "Email or password is wrong.",
    "auth/wrong-password": "Email or password is wrong.",
    "auth/user-not-found": "No account with that email yet. Create one?",
    "auth/too-many-requests": "Too many tries. Wait a few minutes, then try again.",
    "auth/network-request-failed": "No internet. Check your data or Wi-Fi and try again.",
    "auth/requires-recent-login": "For safety, enter your password again.",
    "auth/user-disabled": "This account has been switched off. Contact support.",
  };
  const authMsg = (e) => AUTH_ERR[e && e.code] || "Something went wrong. Please try again.";
  const clean = (o) => JSON.parse(JSON.stringify(o == null ? {} : o));
  const uref = () => fdb.collection("users").doc(user.uid);
  function setSync(st) { syncState = st; const el = document.getElementById("sync"); if (el) el.innerHTML = syncLabel(); }
  const syncLabel = () => (!CLOUD ? "📱 Saved on this phone" : syncState === "ok" ? "☁️ Synced to your account" : syncState === "off" ? "📴 Offline · syncs when you're back online" : "☁️ Syncing…");

  function mergeTrack(a, b) {
    a = a || {}; b = b || {};
    ["done", "quiz", "ans", "rub", "fb"].forEach((k) => { a[k] = a[k] || {}; });
    Object.entries(b.done || {}).forEach(([k, v]) => { a.done[k] = a.done[k] ? Math.min(a.done[k], v) : v; });
    Object.entries(b.quiz || {}).forEach(([k, v]) => { a.quiz[k] = Math.max(a.quiz[k] || 0, v || 0); });
    Object.entries(b.ans || {}).forEach(([k, v]) => { const cur = a.ans[k]; if (!cur || !cur.some((x) => x && String(x).trim())) a.ans[k] = v; });
    Object.entries(b.rub || {}).forEach(([k, v]) => { if (v && (!a.rub[k] || v.total > a.rub[k].total)) a.rub[k] = v; });
    Object.entries(b.fb || {}).forEach(([k, v]) => { if (!a.fb[k]) a.fb[k] = v; });
    a.quizTries = Math.max(a.quizTries || 0, b.quizTries || 0);
    return a;
  }
  function mergeInto(s, r) {
    Object.keys(r.prog || {}).forEach((tid) => { s.prog[tid] = mergeTrack(s.prog[tid], r.prog[tid]); });
    Object.entries(r.review || {}).forEach(([k, v]) => { if (!s.review[k]) s.review[k] = v; });
    if (!s.last && r.last) s.last = r.last;
    const ra = r.act || {}; s.act = s.act || { last: 0, streak: 0, best: 0 };
    if ((ra.last || 0) > (s.act.last || 0)) s.act = Object.assign({}, s.act, ra);
    s.act.best = Math.max(s.act.best || 0, ra.best || 0);
    s.seenLevel = Math.max(s.seenLevel || 1, r.seenLevel || 1);
    if (!s.apiKey && r.apiKey) s.apiKey = r.apiKey; // only present in pre-account local data
  }
  // Progress made on this phone before accounts existed goes to the first account that signs in here.
  function adoptLegacy(uid) {
    try {
      if (localStorage.getItem("udl_legacy_owner")) return;
      const raw = localStorage.getItem(KEY);
      if (raw) mergeInto(S, JSON.parse(raw));
      localStorage.setItem("udl_legacy_owner", uid);
    } catch (e) {}
  }
  const evKey = (k) => (CLOUD && user ? user.uid + "|" + k : k);
  async function myEvidence() {
    const all = await DB.all();
    if (!CLOUD || !user) return all.filter(([k]) => !String(k).includes("|"));
    const legacy = localStorage.getItem("udl_legacy_owner") === user.uid;
    return all.filter(([k]) => String(k).startsWith(user.uid + "|") || (legacy && !String(k).includes("|")));
  }

  function queueSync() { if (!user || !user.emailVerified || !fdb) return; clearTimeout(syncTimer); syncTimer = setTimeout(pushCloud, 1500); }
  async function pushCloud() {
    if (!user || !fdb) return;
    const u = user; const jobs = [];
    const meta = clean({ last: S.last, review: S.review, act: S.act, seenLevel: S.seenLevel, model: S.model });
    const mj = JSON.stringify(meta);
    if (pushed._meta !== mj) jobs.push(uref().collection("state").doc("meta").set(Object.assign({ updatedAt: Date.now() }, meta)).then(() => { pushed._meta = mj; }));
    Object.keys(S.prog).forEach((tid) => {
      const j = JSON.stringify(S.prog[tid]);
      if (pushed[tid] !== j) jobs.push(uref().collection("progress").doc(tid).set(clean(S.prog[tid])).then(() => { pushed[tid] = j; }));
    });
    if (!jobs.length) return setSync("ok");
    setSync(navigator.onLine === false ? "off" : "");
    try { await Promise.all(jobs); if (user === u) setSync("ok"); } catch (e) { setSync("off"); }
  }
  async function pullCloud() {
    const [pdoc, mdoc, ps] = await Promise.all([uref().get(), uref().collection("state").doc("meta").get(), uref().collection("progress").get()]);
    if (pdoc.exists) profile = pdoc.data();
    else {
      profile = { name: user.displayName || "", email: user.email, bio: "", city: "", goal: "", photo: "", createdAt: Date.now() };
      await uref().set(profile);
    }
    const remote = Object.assign({ prog: {} }, mdoc.exists ? mdoc.data() : {});
    ps.forEach((d) => { remote.prog[d.id] = d.data(); pushed[d.id] = JSON.stringify(d.data()); });
    mergeInto(S, remote);
  }
  async function enterApp(u) {
    user = u;
    try { await u.getIdToken(true); } catch (e) {} // fresh token carries email_verified for the database rules
    loadState(u.uid); adoptLegacy(u.uid);
    profile = { name: u.displayName || S.name || "", email: u.email };
    try { await pullCloud(); setSync("ok"); } catch (e) { setSync("off"); }
    S.name = profile.name || S.name; S.onboarded = true; save();
  }
  function bootCloud() {
    firebase.initializeApp(FBC);
    fbAuth = firebase.auth(); fdb = firebase.firestore();
    if (FBC.emulator) { fbAuth.useEmulator("http://" + FBC.emulator + ":9099", { disableWarnings: true }); fdb.useEmulator(FBC.emulator, 8080); }
    try { fbAuth.useDeviceLanguage(); } catch (e) {}
    fbAuth.onAuthStateChanged(async (u) => {
      if (u && u.emailVerified) await enterApp(u);
      else { user = u; S = blank(); stateKey = KEY + ":anon"; profile = {}; }
      authReady = true;
      if (u && u.emailVerified && /^#\/(welcome|login|register|verify|forgot)/.test(location.hash)) go("#/");
      route(); hideSplash();
    });
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState !== "visible" || !user) return;
      if (!user.emailVerified) checkVerified(true);
      else pushCloud();
    });
    window.addEventListener("online", () => { if (user && user.emailVerified) pushCloud(); });
  }

  /* ---------------- Auth screens ---------------- */
  const authShell = (body, back) => `<div class="screen auth">
    <div class="topbar">${back ? `<button class="icon-btn" data-go="${back}" aria-label="Back">←</button>` : `<span style="width:40px"></span>`}<span class="title"></span><span style="width:40px"></span></div>${body}</div>`;

  function renderWelcome() {
    const n = TRACKS.reduce((a, t) => a + flat(t).length, 0);
    $app.innerHTML = `<div class="screen auth welcome">
      <div class="brand-mark hero-mark">U</div>
      <h1>Learn the tools.<br/><span class="hl">Get paid for your skills.</span></h1>
      <p class="lead">${TRACKS.length} tracks · ${n} bite-size lessons · from total beginner to pro.</p>
      <div class="value-list">
        <div class="value"><div class="dot">🎨</div><div><b>Design, office & video</b><span>Photoshop, CorelDRAW, Excel, Premiere, CapCut and more.</span></div></div>
        <div class="value"><div class="dot">⚡</div><div><b>5-minute lessons</b><span>One screen at a time, with a hands-on task every lesson.</span></div></div>
        <div class="value"><div class="dot">🏆</div><div><b>Level up</b><span>Earn XP, keep your streak, unlock badges and build a portfolio.</span></div></div>
      </div>
      <button class="btn btn-primary full" style="margin-top:24px" data-go="#/register">Create free account</button>
      <button class="btn btn-ghost full" style="margin-top:10px" data-go="#/login">I already have an account</button>
    </div>`;
  }

  function renderRegister() {
    $app.innerHTML = authShell(`
      <h1>Create your <span class="hl">account</span> 🚀</h1>
      <p class="lead">It's free. Your progress saves to your account, so you never lose it.</p>
      <form id="f" class="auth-form" novalidate>
        <div class="field"><label for="nm">Full name</label><input id="nm" autocomplete="name" placeholder="e.g. Ada Okafor" maxlength="60"/></div>
        <div class="field"><label for="em">Email</label><input id="em" type="email" inputmode="email" autocomplete="email" autocapitalize="off" spellcheck="false" placeholder="you@example.com"/></div>
        <div class="field"><label for="pw">Password</label><div class="pw"><input id="pw" type="password" autocomplete="new-password" placeholder="8+ characters with a number"/><button type="button" class="eye" aria-label="Show password">👁</button></div>
          <div class="meter" aria-hidden="true"><i id="pm"></i></div><p class="help" id="ph">Use 8+ characters, mixing letters and numbers.</p></div>
        <p class="form-err" id="err" role="alert" hidden></p>
        <button class="btn btn-primary full" id="go" type="submit">Create account</button>
        <p class="help" style="text-align:center;margin-top:10px">We'll email you a link to confirm it's really you.</p>
      </form>
      <p class="switch">Already have an account? <a href="#/login">Log in</a></p>`, "#/welcome");
    eyeToggles();
    const pw = document.getElementById("pw");
    pw.addEventListener("input", () => {
      const v = pw.value; const sc = (v.length >= 8) + /[0-9]/.test(v) + /[a-zA-Z]/.test(v) + (v.length >= 12 || /[^a-zA-Z0-9]/.test(v));
      const m = document.getElementById("pm"); m.style.width = sc * 25 + "%"; m.className = sc >= 3 ? "good" : sc >= 2 ? "ok" : "";
      document.getElementById("ph").textContent = !v ? "Use 8+ characters, mixing letters and numbers." : sc >= 4 ? "Strong password 💪" : sc >= 3 ? "Good password" : "Add more characters and a number";
    });
    document.getElementById("f").onsubmit = async (ev) => {
      ev.preventDefault(); showErr("");
      const nm = document.getElementById("nm").value.trim().replace(/\s+/g, " ");
      const em = document.getElementById("em").value.trim().toLowerCase(); const pv = pw.value;
      if (nm.length < 2) return showErr("Enter your name.");
      if (!emailOk(em)) return showErr("That email address doesn't look right.");
      if (pv.length < 8 || !/[0-9]/.test(pv) || !/[a-zA-Z]/.test(pv)) return showErr("Password needs 8+ characters with letters and a number.");
      const b = document.getElementById("go"); busy(b, true, "Creating…");
      try {
        const cred = await fbAuth.createUserWithEmailAndPassword(em, pv);
        await cred.user.updateProfile({ displayName: nm });
        await cred.user.sendEmailVerification();
        localStorage.setItem("udl_verify_sent", String(Date.now()));
        user = cred.user; go("#/verify"); route();
      } catch (e) { busy(b, false); showErr(authMsg(e)); }
    };
  }

  function renderLogin() {
    $app.innerHTML = authShell(`
      <h1>Welcome <span class="hl">back</span> 👋</h1>
      <p class="lead">Log in to continue where you stopped.</p>
      <form id="f" class="auth-form" novalidate>
        <div class="field"><label for="em">Email</label><input id="em" type="email" inputmode="email" autocomplete="email" autocapitalize="off" spellcheck="false" placeholder="you@example.com"/></div>
        <div class="field"><label for="pw">Password</label><div class="pw"><input id="pw" type="password" autocomplete="current-password" placeholder="Your password"/><button type="button" class="eye" aria-label="Show password">👁</button></div></div>
        <p style="text-align:right;margin-top:8px"><a href="#/forgot" class="link">Forgot password?</a></p>
        <p class="form-err" id="err" role="alert" hidden></p>
        <button class="btn btn-primary full" id="go" type="submit">Log in</button>
      </form>
      <p class="switch">New here? <a href="#/register">Create an account</a></p>`, "#/welcome");
    eyeToggles();
    document.getElementById("f").onsubmit = async (ev) => {
      ev.preventDefault(); showErr("");
      const em = document.getElementById("em").value.trim().toLowerCase(); const pv = document.getElementById("pw").value;
      if (!emailOk(em)) return showErr("That email address doesn't look right.");
      if (!pv) return showErr("Enter your password.");
      const b = document.getElementById("go"); busy(b, true, "Logging in…");
      try { await fbAuth.signInWithEmailAndPassword(em, pv); } // onAuthStateChanged routes on
      catch (e) { busy(b, false); showErr(authMsg(e)); }
    };
  }

  function renderForgot() {
    $app.innerHTML = authShell(`
      <h1>Reset your <span class="hl">password</span></h1>
      <p class="lead">Enter your email and we'll send you a link to choose a new password.</p>
      <form id="f" class="auth-form" novalidate>
        <div class="field"><label for="em">Email</label><input id="em" type="email" inputmode="email" autocomplete="email" autocapitalize="off" spellcheck="false" placeholder="you@example.com"/></div>
        <p class="form-err" id="err" role="alert" hidden></p>
        <div id="ok"></div>
        <button class="btn btn-primary full" id="go" type="submit">Send reset link</button>
      </form>
      <p class="switch">Remembered it? <a href="#/login">Log in</a></p>`, "#/login");
    document.getElementById("f").onsubmit = async (ev) => {
      ev.preventDefault(); showErr("");
      const em = document.getElementById("em").value.trim().toLowerCase();
      if (!emailOk(em)) return showErr("That email address doesn't look right.");
      const b = document.getElementById("go"); busy(b, true, "Sending…");
      try { await fbAuth.sendPasswordResetEmail(em); } catch (e) { if (e && e.code !== "auth/user-not-found") { busy(b, false); return showErr(authMsg(e)); } }
      busy(b, false, "Send again");
      document.getElementById("ok").innerHTML = `<div class="notice ok">📧 If <b>${esc(em)}</b> has an account, a reset link is on its way. Check Spam too.</div>`;
    };
  }

  async function checkVerified(silent) {
    if (!user) return;
    try { await user.reload(); } catch (e) { if (!silent) showErr(authMsg(e)); return; }
    user = fbAuth.currentUser;
    if (user && user.emailVerified) {
      await enterApp(user); toast("🎉 Email verified · welcome!"); go("#/"); route();
    } else if (!silent) showErr("Not verified yet. Tap the link in the email first, then try again.");
  }
  function renderVerify() {
    const em = user && user.email;
    $app.innerHTML = `<div class="screen auth center">
      <div class="mail-ico">📧</div>
      <h1>Check your email</h1>
      <p class="lead">We sent a verification link to<br/><b class="em">${esc(em)}</b></p>
      <ol class="steps"><li>Open the email from <b>Urban Digital Learning</b></li><li>Tap the <b>verification link</b></li><li>Come back here and tap the button below</li></ol>
      <p class="help">Can't find it? Look in <b>Spam</b> or <b>Promotions</b>. It can take a minute.</p>
      <p class="form-err" id="err" role="alert" hidden></p>
      <button class="btn btn-primary full" id="done" style="margin-top:16px">I've verified my email</button>
      <button class="btn btn-ghost full" id="resend" style="margin-top:10px">Resend email</button>
      <p class="switch">Wrong email? <a href="#/welcome" id="out">Log out and start again</a></p></div>`;
    const done = document.getElementById("done"); const rs = document.getElementById("resend");
    done.onclick = async () => { busy(done, true, "Checking…"); await checkVerified(false); if (document.body.contains(done)) busy(done, false); };
    let tick;
    const cool = () => {
      const left = 60 - Math.floor((Date.now() - +(localStorage.getItem("udl_verify_sent") || 0)) / 1000);
      if (left > 0) { rs.disabled = true; rs.textContent = `Resend email (${left}s)`; tick = setTimeout(cool, 1000); }
      else { rs.disabled = false; rs.textContent = "Resend email"; }
    };
    cool();
    rs.onclick = async () => {
      showErr(""); busy(rs, true);
      try { await user.sendEmailVerification(); localStorage.setItem("udl_verify_sent", String(Date.now())); toast("📧 Sent again"); }
      catch (e) { showErr(authMsg(e)); }
      busy(rs, false, "Resend email"); clearTimeout(tick); cool();
    };
    document.getElementById("out").onclick = async (e) => { e.preventDefault(); clearTimeout(tick); await fbAuth.signOut(); go("#/welcome"); };
  }

  /* ---------------- Profile ---------------- */
  const GOALS = ["Graphic designer", "Video editor", "Content creator", "Office & admin pro", "Freelancer / own business", "Not sure yet"];
  function renderProfile() {
    const pr = prof(); const xi = xpInfo(); const a = S.act || {};
    const nm = pr.name || S.name || "Your name";
    const since = CLOUD && user && user.metadata && user.metadata.creationTime ? new Date(user.metadata.creationTime) : pr.createdAt ? new Date(pr.createdAt) : null;
    const tracks = TRACKS.filter((t) => t.tiers).map((t) => ({ t, st: stats(t) })).filter((o) => o.st.done > 0);
    const bd = badges();
    $app.innerHTML = `<div class="screen">
      <div class="topbar"><span style="width:40px"></span><span class="title">Profile</span><button class="icon-btn" data-go="#/settings" aria-label="Settings">⚙</button></div>
      <div class="profile-head">
        <div class="ph-av">${avatar(88)}<span class="lv-badge sm">${xi.level}</span></div>
        <h1 class="pf-name">${esc(nm)}</h1>
        <p class="pf-sub"><span class="hl">Level ${xi.level} · ${esc(xi.title)}</span>${pr.goal ? ` · ${esc(pr.goal)}` : ""}${pr.city ? ` · 📍${esc(pr.city)}` : ""}</p>
        ${pr.bio ? `<p class="pf-bio">${esc(pr.bio)}</p>` : `<button class="link" data-go="#/profile/edit">+ Add a short bio</button>`}
        <button class="btn btn-ghost btn-small" style="margin-top:12px" data-go="#/profile/edit">✏️ Edit profile</button>
      </div>
      <div class="card level-card static"><div class="lv-badge">${xi.level}</div><div class="meta"><small>${xi.xp} XP</small><div class="bar"><i style="width:${xi.pct}%"></i></div><span class="help">${xi.toNext} XP to level ${xi.level + 1}</span></div></div>
      <div class="stats" style="margin-top:10px">
        <div class="stat"><b class="hl">🔥 ${streakNow()}</b><span>Day streak</span></div>
        <div class="stat"><b>${xi.lessons}</b><span>Lessons</span></div>
        <div class="stat"><b>${xi.projects}</b><span>Projects</span></div>
      </div>
      <p class="help" style="margin:8px 2px 0">Best streak: ${a.best || 0} day${(a.best || 0) === 1 ? "" : "s"}. Do one lesson or review a day to keep it alive.</p>
      <h2>🏅 Badges · ${bd.filter((b) => b.on).length}/${bd.length}</h2>
      <div class="badge-grid">${bd.map((b) => `<div class="bdg ${b.on ? "on" : ""}" title="${esc(b.d)}"><div class="bi">${b.on ? b.ic : "🔒"}</div><b>${esc(b.nm)}</b><span>${esc(b.d)}</span></div>`).join("")}</div>
      <h2>📚 My tracks</h2>
      ${tracks.length ? `<div class="card">${tracks.map(({ t, st }) => `<button class="mt-row" data-go="#/track/${t.id}">${icon(t)}<div class="meta"><b>${esc(t.name)}</b><div class="bar"><i style="width:${st.pct}%"></i></div></div><span class="pct">${st.pct}%</span></button>`).join("")}</div>`
        : `<div class="card"><p class="help">No tracks started yet. <a class="link" href="#/track/fundamentals">Start with Design Fundamentals →</a></p></div>`}
      <h2>🔐 Account</h2>
      <div class="card acct">
        ${CLOUD && user ? `<div class="acct-row"><span>Email</span><b>${esc(user.email)} <i class="vchip">✓ Verified</i></b></div>` : `<div class="acct-row"><span>Mode</span><b>Local · accounts not set up</b></div>`}
        ${since ? `<div class="acct-row"><span>Member since</span><b>${since.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</b></div>` : ""}
        <div class="acct-row"><span>Progress</span><b id="sync">${syncLabel()}</b></div>
        ${CLOUD && user ? `<div class="row" style="margin-top:14px;gap:8px;flex-wrap:wrap"><button class="btn btn-ghost btn-small" id="chpw">🔑 Change password</button><button class="btn btn-ghost btn-small" id="logout">↪ Log out</button></div>
        <button class="link danger" id="del" style="margin-top:14px">Delete my account</button>` : ""}
      </div>
    </div>${tabbar("profile")}`;
    if (!(CLOUD && user)) return;
    document.getElementById("chpw").onclick = async (ev) => {
      const b = ev.currentTarget; busy(b, true);
      try { await fbAuth.sendPasswordResetEmail(user.email); toast("📧 Check your email for a link to change your password"); } catch (e) { toast(authMsg(e)); }
      busy(b, false);
    };
    document.getElementById("logout").onclick = async () => {
      if (!confirm("Log out of Urban Digital Learning?")) return;
      clearTimeout(syncTimer); try { await pushCloud(); } catch (e) {}
      await fbAuth.signOut(); go("#/welcome");
    };
    document.getElementById("del").onclick = () => go("#/profile/delete");
  }

  function avatarImage(f) {
    return new Promise((resolve, reject) => {
      const r = new FileReader(); r.onerror = reject;
      r.onload = () => { const img = new Image(); img.onerror = reject; img.onload = () => {
        const side = Math.min(img.width, img.height); const cv = document.createElement("canvas"); cv.width = cv.height = 240;
        cv.getContext("2d").drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, 240, 240);
        resolve(cv.toDataURL("image/jpeg", 0.82));
      }; img.src = r.result; };
      r.readAsDataURL(f);
    });
  }
  function renderProfileEdit() {
    const pr = prof(); let photo = pr.photo || "";
    $app.innerHTML = `<div class="screen">
      <div class="topbar"><button class="icon-btn" data-go="#/profile" aria-label="Back">←</button><span class="title">Edit profile</span><span style="width:40px"></span></div>
      <div class="profile-head"><label class="ph-av pick">${avatar(96)}<span class="cam">📷</span><input type="file" id="ph" accept="image/*" hidden/></label>
        <button class="link" id="rmph" ${photo ? "" : "hidden"}>Remove photo</button></div>
      <form id="f" novalidate>
        <div class="field"><label for="nm">Full name</label><input id="nm" value="${esc(pr.name || S.name)}" maxlength="60" autocomplete="name"/></div>
        <div class="field"><label for="bio">Short bio <span class="cnt" id="bc"></span></label><textarea id="bio" class="ta" rows="3" maxlength="140" placeholder="e.g. Aspiring graphic designer from Benin. I love bold posters.">${esc(pr.bio || "")}</textarea></div>
        <div class="field"><label for="city">City</label><input id="city" value="${esc(pr.city || "")}" maxlength="40" placeholder="e.g. Benin City"/></div>
        <div class="field"><label for="goal">I want to become a…</label><select id="goal"><option value="">Choose one</option>${GOALS.map((g) => `<option ${pr.goal === g ? "selected" : ""}>${esc(g)}</option>`).join("")}</select></div>
        <p class="form-err" id="err" role="alert" hidden></p>
        <button class="btn btn-primary full" id="go" type="submit" style="margin-top:18px">Save profile</button>
      </form></div>`;
    const bio = document.getElementById("bio"); const bc = () => { document.getElementById("bc").textContent = `${bio.value.length}/140`; }; bio.oninput = bc; bc();
    const setAv = () => { document.querySelector(".ph-av.pick").firstElementChild.outerHTML = avatar(96, photo); document.getElementById("rmph").hidden = !photo; };
    document.getElementById("ph").onchange = async (e) => {
      const f = e.target.files && e.target.files[0]; if (!f) return;
      try { photo = await avatarImage(f); setAv(); } catch (er) { toast("Couldn't read that image"); }
    };
    document.getElementById("rmph").onclick = (e) => { e.preventDefault(); photo = ""; setAv(); };
    document.getElementById("f").onsubmit = async (ev) => {
      ev.preventDefault(); showErr("");
      const nm = document.getElementById("nm").value.trim().replace(/\s+/g, " ");
      if (nm.length < 2) return showErr("Enter your name.");
      const upd = { name: nm, bio: bio.value.trim(), city: document.getElementById("city").value.trim(), goal: document.getElementById("goal").value, photo, updatedAt: Date.now() };
      const b = document.getElementById("go"); busy(b, true, "Saving…");
      if (CLOUD && user) {
        try {
          await Promise.race([uref().set(upd, { merge: true }), new Promise((_, rj) => setTimeout(() => rj(new Error("offline")), 8000))]);
          if (user.displayName !== nm) await user.updateProfile({ displayName: nm });
        } catch (e) { busy(b, false); return showErr("Couldn't save. Check your internet and try again."); }
      }
      Object.assign(prof(), upd); S.name = nm; save();
      toast("Profile saved ✓"); go("#/profile");
    };
  }

  function renderDeleteAccount() {
    $app.innerHTML = authShell(`
      <h1>Delete your <span style="color:var(--danger)">account</span>?</h1>
      <p class="lead">This permanently deletes your account, profile and synced progress. It can't be undone.</p>
      <form id="f" class="auth-form" novalidate>
        <div class="field"><label for="pw">Enter your password to confirm</label><div class="pw"><input id="pw" type="password" autocomplete="current-password"/><button type="button" class="eye" aria-label="Show password">👁</button></div></div>
        <p class="form-err" id="err" role="alert" hidden></p>
        <button class="btn full danger-btn" id="go" type="submit">Delete my account forever</button>
        <button class="btn btn-ghost full" type="button" data-go="#/profile" style="margin-top:10px">Keep my account</button>
      </form>`, "#/profile");
    eyeToggles();
    document.getElementById("f").onsubmit = async (ev) => {
      ev.preventDefault(); showErr("");
      const pv = document.getElementById("pw").value; if (!pv) return showErr("Enter your password.");
      const b = document.getElementById("go"); busy(b, true, "Deleting…");
      try {
        await user.reauthenticateWithCredential(firebase.auth.EmailAuthProvider.credential(user.email, pv));
        clearTimeout(syncTimer);
        const ps = await uref().collection("progress").get();
        await Promise.all(ps.docs.map((d) => d.ref.delete()));
        await uref().collection("state").doc("meta").delete();
        await uref().delete();
        try { for (const [k] of await myEvidence()) if (String(k).includes("|")) await DB.del(k); } catch (e) {}
        try { localStorage.removeItem(stateKey); } catch (e) {}
        await user.delete();
        toast("Your account was deleted"); go("#/welcome");
      } catch (e) { busy(b, false); showErr(authMsg(e)); }
    };
  }

  /* ---------------- Onboarding (local mode only) ---------------- */
  function renderOnboard() {
    const n = TRACKS.reduce((a, t) => a + flat(t).length, 0);
    $app.innerHTML = `
    <div class="screen" style="padding-top:calc(var(--safe-top) + 48px)">
      <div class="brand-mark" style="width:64px;height:64px;border-radius:20px;font-size:30px">U</div>
      <h1 style="margin-top:22px">Welcome to<br/><span class="hl">Urban Digital Learning</span></h1>
      <p class="lead">${TRACKS.length} tracks · ${n} lessons · Beginner → Intermediate → Pro.</p>
      <div class="value-list">
        <div class="value"><div class="dot">🧭</div><div><b>Start with Design Fundamentals</b><span>Type, color, grids and hierarchy. It unlocks every Intermediate tier.</span></div></div>
        <div class="value"><div class="dot">🎯</div><div><b>Earn every unlock</b><span>Pass a 3-question check, then submit a real lab.</span></div></div>
        <div class="value"><div class="dot">📊</div><div><b>Graded projects & client capstones</b><span>Rubric-scored work that builds your portfolio.</span></div></div>
        <div class="value"><div class="dot">🔁</div><div><b>Never forget a shortcut</b><span>Daily review brings them back at the right time.</span></div></div>
      </div>
      <div class="field" style="margin-top:22px"><label for="on-nm">What should we call you?</label><input id="on-nm" placeholder="Your name" autocomplete="off"/></div>
    </div>${dock(`<button class="btn btn-primary" id="start">Start My Journey →</button>`)}`;
    document.getElementById("start").onclick = () => { S.name = document.getElementById("on-nm").value.trim(); S.profile.name = S.name; S.profile.createdAt = Date.now(); S.onboarded = true; save(); go("#/"); };
  }

  /* ---------------- Router ---------------- */
  function route() {
    const parts = location.hash.replace(/^#\/?/, "").split("/").filter(Boolean);
    window.scrollTo(0, 0);
    document.querySelectorAll(".overlay").forEach((o) => o.remove());
    if (CLOUD) {
      if (!authReady) return;
      if (!user) {
        if (parts[0] === "login") return renderLogin();
        if (parts[0] === "register") return renderRegister();
        if (parts[0] === "forgot") return renderForgot();
        return renderWelcome();
      }
      if (!user.emailVerified) return renderVerify();
    } else if (!S.onboarded) return renderOnboard();
    if (parts[0] === "track") return renderTrack(parts[1], parts[2] != null ? +parts[2] : null);
    if (parts[0] === "lesson") return renderLesson(parts[1], parts[2]);
    if (parts[0] === "settings") return renderSettings();
    if (parts[0] === "review") return renderReview();
    if (parts[0] === "portfolio") return renderPortfolio();
    if (parts[0] === "profile") return parts[1] === "edit" ? renderProfileEdit() : parts[1] === "delete" && CLOUD ? renderDeleteAccount() : renderProfile();
    return renderHome();
  }
  document.addEventListener("click", (e) => {
    const el = e.target.closest("[data-go],[data-back],[data-locked]"); if (!el) return;
    if (el.hasAttribute("data-locked")) return toast("🔒 " + el.getAttribute("data-locked"));
    if (el.hasAttribute("data-back")) { history.length > 1 ? history.back() : go("#/"); return; }
    const h = el.getAttribute("data-go"); if (location.hash === h) route(); else go(h);
  });
  window.addEventListener("hashchange", route);
  document.addEventListener("input", (e) => { const er = document.getElementById("err"); if (er && !er.hidden && e.target.closest("form")) er.hidden = true; });
  try {
    const CapApp = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App;
    if (CapApp) CapApp.addListener("backButton", () => {
      const parts = location.hash.replace(/^#\/?/, "").split("/").filter(Boolean);
      if (document.querySelector(".overlay")) { document.querySelectorAll(".overlay").forEach((o) => o.remove()); return; }
      if (!parts.length || ["welcome", "verify"].includes(parts[0])) CapApp.exitApp();
      else if (["login", "register"].includes(parts[0])) go("#/welcome");
      else if (parts[0] === "forgot") go("#/login");
      else if (parts[0] === "profile" && parts[1]) go("#/profile");
      else if (parts[0] === "lesson") { const x = flat(byId[parts[1]] || { tiers: [] }).find((y) => y.id === parts[2]); go("#/track/" + parts[1] + (x ? "/" + x.ti : "")); }
      else go("#/");
    });
  } catch (e) {}

  window.UDL_APP = { flat, stats, S, byId, xpInfo, CLOUD }; // for tests
  const splash = document.createElement("div"); splash.className = "splash";
  splash.innerHTML = `<div class="splash-inner"><div class="brand-mark">U</div><h3>Urban Digital Learning</h3><p>Beginner → Industry Pro</p></div>`;
  document.body.appendChild(splash);
  let splashMin = false, splashGone = false;
  function hideSplash() {
    if (splashGone || !splashMin || !authReady) return; splashGone = true;
    splash.classList.add("out"); setTimeout(() => splash.remove(), 500);
  }
  setTimeout(() => { splashMin = true; hideSplash(); }, 1200);
  if (CLOUD) { try { bootCloud(); } catch (e) { authReady = true; console.error(e); route(); hideSplash(); } }
  else route();
})();
