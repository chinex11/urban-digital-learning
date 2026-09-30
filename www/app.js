/* Urban Digital Learning — app engine */
(function () {
  "use strict";

  const TRACKS = window.UDL_TRACKS.slice().sort((a, b) => a.num - b.num);
  const byId = Object.fromEntries(TRACKS.map((t) => [t.id, t]));
  const GROUPS = [
    { id: "design", label: "Design Studio", icon: "🎨" },
    { id: "office", label: "Office Pro", icon: "📊" },
    { id: "video", label: "Video Lab", icon: "🎬" },
  ];
  const DEFAULT_MODEL = "claude-sonnet-5-5";
  const KEY = "udl_state_v1";

  /* ---------------- State ---------------- */
  const blank = () => ({ name: "", apiKey: "", model: DEFAULT_MODEL, progress: {}, last: null, onboarded: false });
  let S;
  try { S = Object.assign(blank(), JSON.parse(localStorage.getItem(KEY) || "{}")); } catch (e) { S = blank(); }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { toast("Storage full — progress not saved"); } };
  const prog = (tid) => (S.progress[tid] = S.progress[tid] || { done: {}, results: {}, feedback: {} });
  const lkey = (m, l) => m + "-" + l;

  function flatLessons(t) {
    const out = [];
    t.modules.forEach((mod, mi) => mod.lessons.forEach((les, li) => out.push({ mi, li, les, mod })));
    return out;
  }
  function trackStats(t) {
    const all = flatLessons(t);
    const p = prog(t.id);
    const done = all.filter((x) => p.done[lkey(x.mi, x.li)]).length;
    const nextIdx = all.findIndex((x) => !p.done[lkey(x.mi, x.li)]);
    return { total: all.length, done, pct: all.length ? Math.round((done / all.length) * 100) : 0, next: nextIdx === -1 ? null : all[nextIdx], all };
  }
  function isUnlocked(t, mi, li) {
    const all = flatLessons(t);
    const idx = all.findIndex((x) => x.mi === mi && x.li === li);
    if (idx <= 0) return true;
    const prev = all[idx - 1];
    return !!prog(t.id).done[lkey(prev.mi, prev.li)];
  }

  /* ---------------- Utils ---------------- */
  const $app = document.getElementById("app");
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  // inline: **bold**, `kbd`
  const inl = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/`(.+?)`/g, "<kbd>$1</kbd>");
  function md(text) {
    const lines = String(text || "").split(/\r?\n/);
    let html = "", inList = false;
    for (const raw of lines) {
      const line = raw.trim();
      const li = line.match(/^[-*•▸]\s+(.*)/) || line.match(/^\d+[.)]\s+(.*)/);
      if (li) { if (!inList) { html += "<ul>"; inList = true; } html += "<li>" + inl(li[1]) + "</li>"; continue; }
      if (inList) { html += "</ul>"; inList = false; }
      if (!line) continue;
      const h = line.match(/^#{1,4}\s+(.*)/);
      if (h) html += "<h4>" + inl(h[1]) + "</h4>";
      else html += "<p>" + inl(line) + "</p>";
    }
    if (inList) html += "</ul>";
    return html;
  }
  let toastTimer;
  function toast(msg) {
    const el = document.getElementById("toast");
    el.textContent = msg; el.classList.add("show");
    clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove("show"), 2200);
  }
  const go = (hash) => { location.hash = hash; };
  const icon = (t, cls = "ico") => `<div class="${cls}" style="background:${t.color}">${esc(t.abbr)}</div>`;
  function dock(buttons) {
    return `<div class="dock"><div class="dock-inner">${buttons}</div></div>`;
  }
  function greeting() {
    const h = new Date().getHours();
    return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  }

  /* ---------------- Screens ---------------- */
  function renderHome() {
    const name = S.name ? esc(S.name.split(" ")[0]) : "Creator";
    let cont = "";
    if (S.last && byId[S.last.t]) {
      const t = byId[S.last.t];
      const st = trackStats(t);
      if (st.next) {
        cont = `
        <h2>Continue</h2>
        <button class="card continue" style="width:100%;text-align:left" data-go="#/lesson/${t.id}/${st.next.mi}/${st.next.li}">
          ${icon(t)}
          <div class="meta"><small>${esc(t.name)} · M${st.next.mi + 1} · L${st.next.li + 1}</small><div>${esc(st.next.les.title)}</div></div>
          <div class="big">▶</div>
        </button>`;
      }
    }
    const groups = GROUPS.map((g) => {
      const tiles = TRACKS.filter((t) => t.group === g.id).map((t) => {
        const st = trackStats(t);
        return `<button class="track-tile" data-go="#/track/${t.id}">
          <div class="row" style="justify-content:space-between;align-items:center">${icon(t)}<span class="num">${String(t.num).padStart(2, "0")}</span></div>
          <div><div class="nm">${esc(t.name)}</div><div class="fc">${esc(t.focus)}</div></div>
          <div class="bar"><i style="width:${st.pct}%"></i></div>
        </button>`;
      }).join("");
      return `<h2 class="group-label">${g.icon} ${esc(g.label)}</h2><div class="grid">${tiles}</div>`;
    }).join("");

    const totals = TRACKS.reduce((a, t) => { const s = trackStats(t); a.d += s.done; a.t += s.total; return a; }, { d: 0, t: 0 });

    $app.innerHTML = `
    <div class="screen">
      <div class="topbar">
        <div class="brand"><div class="brand-mark">U</div><div class="brand-name">Urban Digital<small>Learning</small></div></div>
        <button class="icon-btn" data-go="#/settings" aria-label="Settings">⚙</button>
      </div>
      <p class="lead">${greeting()}, <b style="color:var(--text)">${name}</b> 👋</p>
      <h1>Beginner <span class="hl">→</span> Industry Pro.</h1>
      <p class="lead">One screen. One skill. One real task.</p>

      <div class="value-list">
        <div class="value"><div class="dot">✦</div><div><b>Build real assets</b><span>Every module ends in a logo, flier, poster or pro project.</span></div></div>
        <div class="value"><div class="dot">⌨</div><div><b>Work at pro speed</b><span>Shortcuts + industry tips on every tool.</span></div></div>
        <div class="value"><div class="dot">⚡</div><div><b>Learn by doing</b><span>Hands-on lab each lesson. Submit it to unlock the next.</span></div></div>
      </div>

      ${cont}

      <div class="stats" style="margin-top:22px">
        <div class="stat"><b>${TRACKS.length}</b><span>Tracks</span></div>
        <div class="stat"><b>${totals.t}</b><span>Lessons</span></div>
        <div class="stat"><b class="hl">${totals.d}</b><span>Done</span></div>
      </div>

      ${groups}
    </div>`;
  }

  function renderTrack(tid) {
    const t = byId[tid];
    if (!t) return go("#/");
    const st = trackStats(t);
    const p = prog(t.id);
    const mods = t.modules.map((mod, mi) => {
      const rows = mod.lessons.map((les, li) => {
        const done = !!p.done[lkey(mi, li)];
        const unlocked = isUnlocked(t, mi, li);
        const current = !done && unlocked;
        const cls = done ? "done" : current ? "current" : "locked";
        const mark = done ? "✓" : current ? "▶" : "🔒";
        return `<button class="lesson-row ${cls}" ${unlocked ? `data-go="#/lesson/${t.id}/${mi}/${li}"` : `data-locked="1"`}>
          <span class="st">${mark}</span><span class="lt">${esc(les.title)}</span><span class="go">›</span></button>`;
      }).join("");
      return `<div class="module"><div class="module-head"><span class="m">M${mi + 1}</span><span class="t">${esc(mod.title)}</span>${mod.tag ? `<span class="tag ${mod.tag === "Project" || mod.tag === "Pro" ? "pro" : ""}">${esc(mod.tag)}</span>` : ""}</div>${rows}</div>`;
    }).join("");

    $app.innerHTML = `
    <div class="screen">
      <div class="topbar"><button class="icon-btn" data-go="#/" aria-label="Back">←</button><span class="title">Roadmap</span><button class="icon-btn" data-go="#/settings" aria-label="Settings">⚙</button></div>
      <div class="track-hero">${icon(t)}<div><h1>${esc(t.name)}</h1><p>${esc(t.focus)}</p></div></div>
      <p class="lead" style="margin-bottom:14px">${esc(t.intro)}</p>
      <div class="stats">
        <div class="stat"><b>${t.modules.length}</b><span>Modules</span></div>
        <div class="stat"><b>${st.total}</b><span>Lessons</span></div>
        <div class="stat"><b class="hl">${st.pct}%</b><span>Complete</span></div>
      </div>
      <h2>Your Path</h2>
      ${mods}
    </div>
    ${dock(st.next
      ? `<button class="btn btn-primary" data-go="#/lesson/${t.id}/${st.next.mi}/${st.next.li}">${st.done ? "▶ Continue Lesson" : "▶ Start Lesson"}</button>`
      : `<button class="btn btn-primary" data-go="#/">🏆 Track Complete · Switch Track</button>`)}`;
  }

  function renderLesson(tid, mi, li) {
    const t = byId[tid];
    if (!t || !t.modules[mi] || !t.modules[mi].lessons[li]) return go("#/");
    if (!isUnlocked(t, mi, li)) { toast("🔒 Finish the previous lab first"); return go("#/track/" + tid); }
    const mod = t.modules[mi];
    const les = mod.lessons[li];
    const p = prog(t.id);
    const k = lkey(mi, li);
    const done = !!p.done[k];
    S.last = { t: t.id, m: mi, l: li }; save();

    const all = flatLessons(t);
    const idx = all.findIndex((x) => x.mi === mi && x.li === li);
    const next = all[idx + 1];
    const bars = mod.lessons.map((_, i) => `<i class="${i <= li ? "on" : ""}"></i>`).join("");

    const keys = (les.shortcuts || []).map(([k2, a]) => `<div class="key-row"><span>${esc(a)}</span><kbd>${esc(k2)}</kbd></div>`).join("");
    const lab = les.lab || {};

    const feedbackBlock = done ? renderFeedback(t, mi, li) : "";

    $app.innerHTML = `
    <div class="screen">
      <div class="topbar"><button class="icon-btn" data-go="#/track/${t.id}" aria-label="Back">←</button><span class="title">${esc(t.name)}</span><button class="icon-btn" data-go="#/" aria-label="Home">⌂</button></div>
      <div class="crumb">M${mi + 1} · L${li + 1} — ${esc(mod.title)}</div>
      <h1 class="lesson-title">${esc(les.title)}</h1>
      <div class="progress-line">${bars}</div>

      <div class="card section"><div class="section-h">🧠 Concept</div><p class="concept">${inl(les.concept)}</p></div>

      ${les.points && les.points.length ? `<div class="card section"><div class="section-h">🧭 Key Points</div><ul class="points">${les.points.map((x) => `<li><span>${inl(x)}</span></li>`).join("")}</ul></div>` : ""}

      ${keys ? `<div class="card section"><div class="section-h">⌨️ Shortcuts</div><div class="keys">${keys}</div></div>` : ""}

      ${les.tip ? `<div class="card section tip"><div class="section-h" style="color:#c3b3ff">💡 Pro Tip</div><p>${inl(les.tip)}</p></div>` : ""}

      <div class="card section lab">
        <div class="section-h" style="color:var(--accent)">🛠 Hands-On Lab</div>
        ${lab.scenario ? `<div class="scenario"><b>Real-world:</b> ${inl(lab.scenario)}</div>` : ""}
        <ol>${(lab.steps || []).map((s) => `<li><span>${inl(s)}</span></li>`).join("")}</ol>
        ${lab.report && lab.report.length ? `<div class="report"><div class="section-h">📤 Report back</div><ul>${lab.report.map((r) => `<li>${inl(r)}</li>`).join("")}</ul></div>` : ""}
      </div>

      <div id="hint-slot"></div>

      ${done ? feedbackBlock : `
      <div class="card section submit-box">
        <div class="section-h">✅ Submit Your Results</div>
        <textarea id="result" placeholder="What did you do? Answer the report-back questions. Where did you get stuck?">${esc(p.results[k] || "")}</textarea>
        <div class="attach">
          <label>📎 Attach screenshot<input type="file" id="shot" accept="image/*" /></label>
          <span id="shot-prev" class="x">Optional — AI can review your work</span>
        </div>
      </div>
      <div class="lock-note">🔒 Next lesson unlocks after you submit</div>`}
    </div>
    ${done
      ? dock(next
          ? `<button class="btn btn-ghost btn-small" data-go="#/track/${t.id}">🗺</button><button class="btn btn-primary" data-go="#/lesson/${t.id}/${next.mi}/${next.li}">Next Lesson →</button>`
          : `<button class="btn btn-primary" data-go="#/track/${t.id}">🏆 Track Complete</button>`)
      : dock(`<button class="btn btn-ghost" id="stuck">❓ I'm Stuck</button><button class="btn btn-primary" id="submit">Submit Results</button>`)}`;

    if (!done) wireSubmit(t, mi, li);
  }

  function renderFeedback(t, mi, li) {
    const p = prog(t.id);
    const k = lkey(mi, li);
    const fb = p.feedback[k];
    const res = p.results[k];
    const les = t.modules[mi].lessons[li];
    let body;
    if (fb) {
      body = `<div class="feedback">${md(fb)}</div>`;
    } else {
      const checks = (les.lab && les.lab.steps ? les.lab.steps : []).map((s, i) => `<label class="check"><input type="checkbox" ${i < 99 ? "" : ""}/> <span>${inl(s)}</span></label>`).join("");
      body = `<p class="help" style="margin-bottom:10px">Self-check: tick each step you nailed. Add an API key in ⚙ Settings to get AI coaching on your labs.</p><div class="checklist">${checks}</div>`;
    }
    return `
      ${res ? `<div class="card section"><div class="section-h">📝 Your Submission</div><p style="white-space:pre-wrap;font-size:14px;color:var(--muted)">${esc(res)}</p></div>` : ""}
      <div class="card section" style="border-color:#1f5a41"><div class="section-h" style="color:var(--ok)">🎯 Coach Review</div>${body}</div>`;
  }

  function wireSubmit(t, mi, li) {
    const ta = document.getElementById("result");
    const file = document.getElementById("shot");
    const prev = document.getElementById("shot-prev");
    let image = null;
    const k = lkey(mi, li);
    const p = prog(t.id);

    ta.addEventListener("input", () => { p.results[k] = ta.value; save(); });

    file.addEventListener("change", async () => {
      const f = file.files && file.files[0];
      if (!f) return;
      try {
        image = await compressImage(f);
        prev.innerHTML = `<img class="thumb" src="data:${image.type};base64,${image.data}" alt=""/> <span class="x">Attached ✓</span>`;
      } catch (e) { toast("Couldn't read that image"); }
    });

    document.getElementById("stuck").addEventListener("click", async (ev) => {
      const slot = document.getElementById("hint-slot");
      const les = t.modules[mi].lessons[li];
      if (!S.apiKey) {
        slot.innerHTML = `<div class="card section tip"><div class="section-h" style="color:#c3b3ff">🆘 Unstick</div>
          ${les.hint ? `<p style="margin-bottom:10px">${inl(les.hint)}</p>` : ""}
          <ul class="points">
            <li><span>Re-read the <b>Key Points</b>, then redo one lab step at a time.</span></li>
            <li><span>Tool not doing anything? Check you've <b>selected</b> the right object or layer first.</span></li>
            <li><span>Wrong result? <kbd>Ctrl + Z</kbd> to undo and try again.</span></li>
            <li><span>Add an API key in ⚙ Settings for a personal AI hint.</span></li>
          </ul></div>`;
        slot.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
      const btn = ev.currentTarget; const old = btn.innerHTML;
      btn.innerHTML = `<span class="spinner"></span>`; btn.disabled = true;
      try {
        const text = await askAI(t, mi, li, ta.value, image, "hint");
        slot.innerHTML = `<div class="card section tip"><div class="section-h" style="color:#c3b3ff">🆘 Coach Hint</div><div class="feedback">${md(text)}</div></div>`;
        slot.scrollIntoView({ behavior: "smooth", block: "start" });
      } catch (e) { toast(e.message); }
      btn.innerHTML = old; btn.disabled = false;
    });

    document.getElementById("submit").addEventListener("click", async (ev) => {
      const val = ta.value.trim();
      if (!val && !image) { toast("Tell me what you did first ✍️"); ta.focus(); return; }
      p.results[k] = val || "(screenshot submitted)";
      const btn = ev.currentTarget;
      if (S.apiKey) {
        btn.innerHTML = `<span class="spinner"></span> Reviewing…`; btn.disabled = true;
        try {
          p.feedback[k] = await askAI(t, mi, li, val, image, "review");
        } catch (e) {
          toast(e.message);
          btn.innerHTML = "Submit Results"; btn.disabled = false;
          return;
        }
      }
      p.done[k] = Date.now();
      save();
      toast("✅ Lab complete — next lesson unlocked");
      renderLesson(t.id, mi, li);
      window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
    });
  }

  function compressImage(f) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onerror = reject;
      r.onload = () => {
        const img = new Image();
        img.onerror = reject;
        img.onload = () => {
          const max = 1280;
          const sc = Math.min(1, max / Math.max(img.width, img.height));
          const c = document.createElement("canvas");
          c.width = Math.round(img.width * sc); c.height = Math.round(img.height * sc);
          c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
          const url = c.toDataURL("image/jpeg", 0.82);
          resolve({ type: "image/jpeg", data: url.split(",")[1] });
        };
        img.src = r.result;
      };
      r.readAsDataURL(f);
    });
  }

  /* ---------------- AI coach ---------------- */
  async function askAI(t, mi, li, text, image, mode) {
    const mod = t.modules[mi];
    const les = mod.lessons[li];
    const lesson = [
      `Track: ${t.name} (${t.focus})`,
      `Module ${mi + 1}: ${mod.title} · Lesson ${li + 1}: ${les.title}`,
      `Concept: ${les.concept}`,
      les.points ? `Key points: ${les.points.join(" | ")}` : "",
      les.shortcuts ? `Shortcuts: ${les.shortcuts.map((s) => s[0] + " = " + s[1]).join("; ")}` : "",
      `Lab scenario: ${les.lab.scenario || ""}`,
      `Lab steps: ${les.lab.steps.map((s, i) => i + 1 + ". " + s).join(" ")}`,
      les.lab.report ? `Report-back questions: ${les.lab.report.join(" | ")}` : "",
    ].filter(Boolean).join("\n");

    const system = mode === "review"
      ? `You are the AI coach inside "Urban Digital Learning", a premium mobile app that takes absolute beginners to industry-pro level in design, office and video software. The student just submitted a hands-on lab. Review it like a sharp, encouraging senior designer/mentor.
Format for a phone screen, under 170 words, using exactly these sections as markdown headers:
## Verdict  (one line, e.g. "Solid pass ✅" or "Almost — one fix 🔧")
## What worked  (1-3 bullets)
## Fix this  (1-3 concrete bullets; if nothing, give a stretch challenge)
## Pro move  (one industry tip or shortcut related to this lesson)
Also correct any wrong answers to the report-back questions. If a screenshot is attached, critique what you actually see in it. Be honest: don't praise work that's incomplete. No long paragraphs.`
      : `You are the AI coach inside "Urban Digital Learning", a mobile learning app. The student is stuck on a hands-on lab. Give a short, practical unblock for a phone screen: under 110 words, 3-5 bullets, exact menu paths and shortcuts for the software, and one question to check their setup (e.g. software version). Don't just redo the lab for them.`;

    const content = [];
    if (image) content.push({ type: "image", source: { type: "base64", media_type: image.type, data: image.data } });
    content.push({ type: "text", text: `LESSON\n${lesson}\n\nSTUDENT ${mode === "review" ? "SUBMISSION" : "MESSAGE"}\n${text || "(no text — see screenshot)"}` });

    let res;
    try {
      res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": S.apiKey,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({ model: S.model || DEFAULT_MODEL, max_tokens: 700, system, messages: [{ role: "user", content }] }),
      });
    } catch (e) {
      throw new Error("No connection — check your internet");
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = (data.error && data.error.message) || "AI error " + res.status;
      if (res.status === 401) throw new Error("API key rejected — check ⚙ Settings");
      throw new Error(msg.slice(0, 120));
    }
    return (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("\n").trim() || "No feedback returned.";
  }

  /* ---------------- Settings ---------------- */
  function renderSettings() {
    $app.innerHTML = `
    <div class="screen">
      <div class="topbar"><button class="icon-btn" data-back aria-label="Back">←</button><span class="title">Settings</span><span style="width:40px"></span></div>
      <h1>Settings</h1>

      <div class="card section">
        <div class="section-h">👤 Profile</div>
        <div class="field"><label for="nm">Your name</label><input id="nm" value="${esc(S.name)}" placeholder="e.g. Urbankalu" autocomplete="off"/></div>
      </div>

      <div class="card section">
        <div class="section-h">🤖 AI Coach (optional)</div>
        <p class="help">Paste your Anthropic API key to get AI reviews of your lab results and screenshots. It's stored only on this phone and sent only to Anthropic. Get one at console.anthropic.com. Usage is billed to your account.</p>
        <div class="field"><label for="key">API key</label><input id="key" type="password" value="${esc(S.apiKey)}" placeholder="sk-ant-…" autocomplete="off" autocapitalize="off" spellcheck="false"/></div>
        <div class="field"><label for="model">Model</label><input id="model" value="${esc(S.model || DEFAULT_MODEL)}" autocapitalize="off" spellcheck="false"/></div>
        <div class="row" style="margin-top:12px"><button class="btn btn-ghost" id="test">Test connection</button></div>
      </div>

      <div class="card section">
        <div class="section-h">🗂 Progress</div>
        <p class="help">Reset clears completed lessons and lab submissions for every track.</p>
        <div class="row" style="margin-top:12px"><button class="btn btn-ghost" id="reset" style="color:var(--danger)">Reset all progress</button></div>
      </div>

      <p class="help" style="text-align:center;margin-top:22px">Urban Digital Learning · v1.0 · Urban Enterprise</p>
    </div>
    ${dock(`<button class="btn btn-primary" id="save">Save</button>`)}`;

    const persist = () => {
      S.name = document.getElementById("nm").value.trim();
      S.apiKey = document.getElementById("key").value.trim();
      S.model = document.getElementById("model").value.trim() || DEFAULT_MODEL;
      save();
    };
    document.getElementById("save").onclick = () => { persist(); toast("Saved ✓"); history.length > 1 ? history.back() : go("#/"); };
    document.getElementById("test").onclick = async (ev) => {
      persist();
      if (!S.apiKey) return toast("Paste a key first");
      const b = ev.currentTarget; b.innerHTML = `<span class="spinner"></span>`; b.disabled = true;
      try {
        const r = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: { "content-type": "application/json", "x-api-key": S.apiKey, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" },
          body: JSON.stringify({ model: S.model, max_tokens: 10, messages: [{ role: "user", content: "Say OK" }] }),
        });
        const d = await r.json().catch(() => ({}));
        toast(r.ok ? "✅ AI Coach connected" : "❌ " + ((d.error && d.error.message) || r.status).toString().slice(0, 80));
      } catch (e) { toast("❌ No connection"); }
      b.innerHTML = "Test connection"; b.disabled = false;
    };
    document.getElementById("reset").onclick = () => {
      if (confirm("Reset ALL progress? This can't be undone.")) { S.progress = {}; S.last = null; save(); toast("Progress reset"); }
    };
  }

  /* ---------------- Onboarding (first launch) ---------------- */
  function renderOnboard() {
    $app.innerHTML = `
    <div class="screen" style="padding-top:calc(var(--safe-top) + 48px)">
      <div class="brand-mark" style="width:64px;height:64px;border-radius:20px;font-size:30px">U</div>
      <h1 style="margin-top:22px">Welcome to<br/><span class="hl">Urban Digital Learning</span></h1>
      <p class="lead">9 software tracks. 189 micro-lessons. Every one ends with a real task.</p>
      <div class="value-list">
        <div class="value"><div class="dot">🎨</div><div><b>Design Studio</b><span>CorelDRAW · Photoshop · Illustrator · InDesign</span></div></div>
        <div class="value"><div class="dot">📊</div><div><b>Office Pro</b><span>Word · Excel · PowerPoint</span></div></div>
        <div class="value"><div class="dot">🎬</div><div><b>Video Lab</b><span>Premiere Pro · CapCut</span></div></div>
      </div>
      <div class="field" style="margin-top:22px"><label for="on-nm">What should we call you?</label><input id="on-nm" placeholder="Your name" autocomplete="off"/></div>
    </div>
    ${dock(`<button class="btn btn-primary" id="start">Start My Journey →</button>`)}`;
    document.getElementById("start").onclick = () => {
      S.name = document.getElementById("on-nm").value.trim();
      S.onboarded = true; save(); go("#/");
    };
  }

  /* ---------------- Router ---------------- */
  function route() {
    const h = location.hash.replace(/^#\/?/, "");
    const parts = h.split("/").filter(Boolean);
    window.scrollTo(0, 0);
    if (!S.onboarded) return renderOnboard();
    if (parts[0] === "track") return renderTrack(parts[1]);
    if (parts[0] === "lesson") return renderLesson(parts[1], +parts[2], +parts[3]);
    if (parts[0] === "settings") return renderSettings();
    return renderHome();
  }

  document.addEventListener("click", (e) => {
    const el = e.target.closest("[data-go],[data-back],[data-locked]");
    if (!el) return;
    if (el.hasAttribute("data-locked")) return toast("🔒 Finish the previous lab first");
    if (el.hasAttribute("data-back")) { history.length > 1 ? history.back() : go("#/"); return; }
    go(el.getAttribute("data-go"));
  });
  window.addEventListener("hashchange", route);

  // Android hardware back button (Capacitor App plugin)
  try {
    const CapApp = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App;
    if (CapApp) {
      CapApp.addListener("backButton", () => {
        const h = location.hash.replace(/^#\/?/, "");
        if (!h) CapApp.exitApp();
        else if (h.startsWith("lesson/")) go("#/track/" + h.split("/")[1]);
        else go("#/");
      });
    }
  } catch (e) {}

  // Splash
  const splash = document.createElement("div");
  splash.className = "splash";
  splash.innerHTML = `<div class="splash-inner"><div class="brand-mark">U</div><h3>Urban Digital Learning</h3><p>Beginner → Industry Pro</p></div>`;
  document.body.appendChild(splash);
  route();
  setTimeout(() => { splash.classList.add("out"); setTimeout(() => splash.remove(), 500); }, 1300);
})();
