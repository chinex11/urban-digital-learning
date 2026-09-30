/* Visual library: offline SVG "Don't vs Do" comparisons and diagrams.
   Each entry: { kind: "compare", bad, good } or { kind: "diagram", svg }.
   Panels are 160 x 120 SVG fragments. */
(function () {
  const C = { bg: "#1B1B26", ink: "#F4F4F7", mut: "#5C5C70", dim: "#3a3a4a", acc: "#C8FF3D", vio: "#8B6CFF", red: "#FF5C7A", blu: "#4FB3FF", org: "#FF9A3D", grn: "#3DDC97", yel: "#FFD23D" };
  const r = (x, y, w, h, f, rx = 0, extra = "") => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${f}" ${extra}/>`;
  const t = (x, y, s, sz = 10, f = C.ink, w = 700, a = "start", extra = "") => `<text x="${x}" y="${y}" font-size="${sz}" fill="${f}" font-weight="${w}" text-anchor="${a}" font-family="Arial, sans-serif" ${extra}>${s}</text>`;
  const l = (x1, y1, x2, y2, s = C.mut, w = 1, extra = "") => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${s}" stroke-width="${w}" ${extra}/>`;
  const c = (x, y, rad, f, extra = "") => `<circle cx="${x}" cy="${y}" r="${rad}" fill="${f}" ${extra}/>`;
  const bars = (x, y, n, w, gap, f, h = 4) => Array.from({ length: n }, (_, i) => r(x, y + i * gap, w - (i % 3) * 12, h, f, 2)).join("");
  const V = {};

  /* ---------- Design fundamentals ---------- */
  V.hierarchy = { kind: "compare",
    bad: t(14, 30, "GRAND OPENING", 11) + t(14, 48, "20% OFF ALL MEALS", 11) + t(14, 66, "SATURDAY 10AM", 11) + t(14, 84, "RING ROAD, BENIN", 11) + t(14, 102, "CALL 0803 000 0000", 11),
    good: t(14, 40, "GRAND", 24) + t(14, 64, "OPENING", 24, C.acc) + r(14, 74, 62, 16, C.red, 8) + t(45, 86, "20% OFF", 9, C.ink, 800, "middle") + t(14, 104, "Sat 10am · Ring Road", 8, C.mut, 400) };
  V.alignment = { kind: "compare",
    bad: r(22, 20, 60, 8, C.ink, 2) + r(40, 36, 90, 5, C.mut, 2) + r(12, 48, 70, 5, C.mut, 2) + r(55, 60, 60, 5, C.mut, 2) + r(30, 82, 50, 14, C.acc, 4),
    good: l(18, 12, 18, 108, C.vio, 1, 'stroke-dasharray="3 3"') + r(18, 20, 60, 8, C.ink, 2) + r(18, 36, 110, 5, C.mut, 2) + r(18, 48, 96, 5, C.mut, 2) + r(18, 60, 104, 5, C.mut, 2) + r(18, 82, 50, 14, C.acc, 4) };
  V.contrast = { kind: "compare",
    bad: r(10, 10, 140, 100, "#6b6b7d", 8) + t(80, 58, "SALE", 26, "#8a8a9c", 900, "middle") + t(80, 78, "this weekend", 10, "#7a7a8c", 400, "middle"),
    good: r(10, 10, 140, 100, "#101018", 8) + t(80, 58, "SALE", 26, C.acc, 900, "middle") + t(80, 78, "this weekend", 10, C.ink, 400, "middle") };
  V.spacing = { kind: "compare",
    bad: r(6, 6, 148, 108, C.dim, 4) + t(10, 22, "BIG HEADLINE HERE", 12) + r(10, 26, 140, 30, C.blu) + bars(10, 58, 6, 140, 7, C.mut) + r(10, 100, 60, 12, C.acc),
    good: t(16, 30, "Headline", 14) + r(16, 40, 128, 30, C.blu, 4) + bars(16, 80, 2, 110, 8, C.mut) + r(16, 98, 50, 12, C.acc, 4) };
  V.kerning = { kind: "compare",
    bad: t(14, 55, "A V A T A R", 20, C.ink, 800) + t(14, 90, "W A V E", 20, C.ink, 800),
    good: t(14, 55, "AVATAR", 24, C.ink, 800, "start", 'letter-spacing="-1"') + t(14, 90, "WAVE", 24, C.acc, 800, "start", 'letter-spacing="-1"') };
  V.fontpair = { kind: "compare",
    bad: t(12, 30, "Youth Fest", 16, C.org, 400, "start", 'font-family="Georgia" font-style="italic"') + t(12, 52, "SUNDAY 4PM", 12, C.blu, 900, "start", 'font-family="Impact"') + t(12, 72, "Church Hall", 12, C.red, 400, "start", 'font-family="Courier New"') + t(12, 94, "free entry!!", 12, C.yel, 700, "start", 'font-family="Comic Sans MS"'),
    good: t(12, 40, "YOUTH FEST", 18, C.ink, 900) + t(12, 60, "Sunday · 4 PM", 11, C.mut, 400) + t(12, 76, "Church Hall", 11, C.mut, 400) + t(12, 98, "FREE ENTRY", 11, C.acc, 800) };
  V.color = { kind: "compare",
    bad: r(10, 10, 46, 100, "#ff00ff") + r(57, 10, 46, 100, "#00ff00") + r(104, 10, 46, 100, "#ff8800") + t(80, 64, "BUY", 18, "#0000ff", 900, "middle"),
    good: r(10, 10, 90, 100, "#0F3D2E") + r(100, 10, 30, 100, "#F2EAD3") + r(130, 10, 20, 100, "#E8A33D") + t(55, 64, "BUY", 18, "#F2EAD3", 900, "middle") };
  V.grid = { kind: "compare",
    bad: r(20, 14, 50, 30, C.blu, 3) + r(78, 30, 64, 20, C.org, 3) + r(10, 60, 40, 40, C.vio, 3) + r(62, 70, 80, 12, C.mut, 3) + r(90, 90, 40, 18, C.acc, 3),
    good: [0, 1, 2, 3].map(i => l(12 + i * 38, 8, 12 + i * 38, 112, C.dim, 1, 'stroke-dasharray="2 3"')).join("") + r(12, 14, 72, 34, C.blu, 3) + r(88, 14, 60, 34, C.org, 3) + r(12, 56, 136, 12, C.mut, 3) + r(12, 76, 72, 30, C.vio, 3) + r(88, 90, 60, 16, C.acc, 3) };
  V.thirds = { kind: "compare",
    bad: r(0, 0, 160, 120, "#1f2b3a") + c(80, 60, 18, C.org) + t(80, 104, "centered, static", 8, C.mut, 400, "middle"),
    good: r(0, 0, 160, 120, "#1f2b3a") + l(53, 0, 53, 120, C.dim) + l(107, 0, 107, 120, C.dim) + l(0, 40, 160, 40, C.dim) + l(0, 80, 160, 80, C.dim) + c(107, 40, 18, C.org) + t(20, 100, "on a third", 8, C.mut, 400) };
  V.balance = { kind: "compare",
    bad: r(10, 10, 80, 100, C.blu, 4) + r(96, 10, 10, 10, C.mut, 2),
    good: r(10, 10, 80, 100, C.blu, 4) + r(100, 20, 50, 8, C.ink, 2) + bars(100, 36, 4, 50, 8, C.mut) + r(100, 86, 40, 14, C.acc, 4) };
  V.proximity = { kind: "compare",
    bad: t(14, 20, "Name", 9, C.mut, 400) + t(14, 40, "Ada Obi", 11) + t(14, 60, "Phone", 9, C.mut, 400) + t(14, 80, "0803 111 2222", 11) + t(14, 100, "Email", 9, C.mut, 400),
    good: t(14, 24, "Name", 8, C.mut, 400) + t(14, 36, "Ada Obi", 11) + t(14, 62, "Phone", 8, C.mut, 400) + t(14, 74, "0803 111 2222", 11) + t(14, 100, "Email", 8, C.mut, 400) + t(14, 112, "ada@mail.com", 11) };
  V.repetition = { kind: "compare",
    bad: r(10, 12, 60, 40, C.blu, 12) + r(90, 12, 60, 40, C.org, 0) + r(10, 66, 60, 40, C.vio, 20) + r(90, 66, 60, 40, C.grn, 4, `transform="rotate(8 120 86)"`),
    good: [[10, 12], [90, 12], [10, 66], [90, 66]].map(([x, y]) => r(x, y, 60, 40, C.bg, 6, `stroke="${C.acc}" stroke-width="2"`) + r(x + 8, y + 8, 26, 5, C.ink, 2) + r(x + 8, y + 18, 40, 4, C.mut, 2)).join("") };
  V.leading = { kind: "compare",
    bad: [0, 1, 2, 3, 4, 5, 6, 7].map(i => r(14, 20 + i * 5, 130 - (i % 2) * 20, 3, C.ink, 1)).join("") + t(14, 100, "too tight", 8, C.mut, 400),
    good: [0, 1, 2, 3, 4].map(i => r(14, 20 + i * 12, 130 - (i % 2) * 20, 3, C.ink, 1)).join("") + t(14, 100, "~1.4× leading", 8, C.mut, 400) };
  V.linelength = { kind: "compare",
    bad: [0, 1, 2, 3].map(i => r(4, 28 + i * 10, 152, 3, C.ink, 1)).join("") + t(80, 100, "120+ characters per line", 8, C.mut, 400, "middle"),
    good: [0, 1, 2, 3, 4, 5].map(i => r(30, 20 + i * 10, 100 - (i % 3) * 8, 3, C.ink, 1)).join("") + t(80, 100, "45–75 characters", 8, C.mut, 400, "middle") };
  V.rag = { kind: "compare",
    bad: [130, 60, 138, 40, 128, 70].map((w, i) => r(14, 20 + i * 12, w, 3, C.ink, 1)).join(""),
    good: [130, 118, 126, 110, 124, 96].map((w, i) => r(14, 20 + i * 12, w, 3, C.ink, 1)).join("") };
  V.readability = { kind: "compare",
    bad: r(0, 0, 160, 120, "#7aa0c8") + t(80, 66, "Summer Jam", 20, "#c9dcef", 700, "middle"),
    good: r(0, 0, 160, 120, "#7aa0c8") + `<defs><linearGradient id="gtr" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".75"/></linearGradient></defs>` + r(0, 40, 160, 80, "url(#gtr)") + t(80, 96, "Summer Jam", 20, "#fff", 800, "middle") };
  V.dropshadow = { kind: "compare",
    bad: t(84, 70, "PROMO", 28, "#000", 900, "middle", 'opacity=".9"') + t(80, 64, "PROMO", 28, C.yel, 900, "middle", `stroke="${C.red}" stroke-width="2"`),
    good: t(81, 66, "PROMO", 28, "#000", 900, "middle", 'opacity=".35"') + t(80, 64, "PROMO", 28, C.ink, 900, "middle") };
  V.stretch = { kind: "compare",
    bad: `<g transform="translate(20 30) scale(2.4 0.9)">` + r(0, 0, 40, 40, C.acc, 10) + t(20, 29, "U", 26, "#0A0A0F", 900, "middle") + `</g>`,
    good: `<g transform="translate(52 22) scale(1.4)">` + r(0, 0, 40, 40, C.acc, 10) + t(20, 29, "U", 26, "#0A0A0F", 900, "middle") + `</g>` };
  V.logoScale = { kind: "compare",
    bad: `<g opacity=".95">` + c(40, 48, 26, C.org) + c(34, 42, 4, C.red) + c(46, 50, 3, C.yel) + l(20, 56, 60, 36, C.blu, 1) + t(40, 90, "tiny detail", 7, C.mut, 400, "middle") + `</g>` + c(120, 48, 7, C.org) + t(120, 90, "at 16px: mush", 7, C.mut, 400, "middle"),
    good: r(22, 26, 40, 40, C.acc, 10) + t(42, 55, "U", 26, "#0A0A0F", 900, "middle") + r(112, 40, 14, 14, C.acc, 4) + t(119, 51, "U", 10, "#0A0A0F", 900, "middle") + t(80, 96, "reads at every size", 8, C.mut, 400, "middle") };
  V.contrastRatio = { kind: "compare",
    bad: r(10, 20, 140, 80, "#EDEDED", 6) + t(80, 66, "1.6 : 1", 18, "#C9C9C9", 800, "middle"),
    good: r(10, 20, 140, 80, "#EDEDED", 6) + t(80, 66, "12 : 1", 18, "#1a1a1a", 800, "middle") };

  /* ---------- Print & files ---------- */
  V.bleed = { kind: "diagram", svg: `<svg viewBox="0 0 320 170" xmlns="http://www.w3.org/2000/svg">` + r(60, 12, 200, 146, "#e24a6a", 4, 'opacity=".25"') + r(72, 24, 176, 122, C.bg, 2, `stroke="${C.ink}" stroke-width="1.5"`) + r(86, 38, 148, 94, "none", 2, `stroke="${C.acc}" stroke-dasharray="4 3"`) + t(160, 90, "SAFE ZONE", 10, C.acc, 800, "middle") + t(66, 22, "BLEED 3mm", 8, C.red, 800) + t(250, 152, "TRIM", 8, C.ink, 800, "end") + t(8, 90, "bg extends", 7, C.mut, 400) + t(8, 100, "into bleed", 7, C.mut, 400) + `</svg>` };
  V.printMarks = { kind: "diagram", svg: `<svg viewBox="0 0 320 170" xmlns="http://www.w3.org/2000/svg">` + r(90, 30, 140, 110, C.bg, 0, `stroke="${C.mut}"`) + [[90, 30], [230, 30], [90, 140], [230, 140]].map(([x, y]) => l(x - 24 * (x < 160 ? 1 : -1), y, x - 6 * (x < 160 ? 1 : -1), y, C.ink, 1.5) + l(x, y - 24 * (y < 80 ? 1 : -1), x, y - 6 * (y < 80 ? 1 : -1), C.ink, 1.5)).join("") + t(160, 90, "crop marks sit OUTSIDE", 10, C.ink, 700, "middle") + t(160, 104, "the design", 10, C.ink, 700, "middle") + `</svg>` };
  V.rasterVector = { kind: "compare",
    bad: Array.from({ length: 8 }, (_, i) => Array.from({ length: 8 }, (_, j) => ((i - 3.5) ** 2 + (j - 3.5) ** 2 < 12) ? r(40 + j * 10, 20 + i * 10, 10, 10, C.org) : "").join("")).join("") + t(80, 112, "raster zoomed: pixels", 8, C.mut, 400, "middle"),
    good: c(80, 60, 36, C.org) + t(80, 112, "vector zoomed: smooth", 8, C.mut, 400, "middle") };
  V.cmykRgb = { kind: "compare",
    bad: r(14, 20, 40, 60, "#00FF66", 4) + r(60, 20, 40, 60, "#0066FF", 4) + r(106, 20, 40, 60, "#FF00CC", 4) + t(80, 100, "RGB on screen", 8, C.mut, 400, "middle"),
    good: r(14, 20, 40, 60, "#3DAA6A", 4) + r(60, 20, 40, 60, "#2F5DA8", 4) + r(106, 20, 40, 60, "#C23C94", 4) + t(80, 100, "same colors printed (CMYK)", 8, C.mut, 400, "middle") };
  V.resolution = { kind: "compare",
    bad: Array.from({ length: 5 }, (_, i) => Array.from({ length: 7 }, (_, j) => r(24 + j * 16, 18 + i * 16, 16, 16, ["#b56b3d", "#c98a55", "#8a4c2a", "#d9a06a"][(i + j * 3) % 4])).join("")).join("") + t(80, 112, "72 PPI printed", 8, C.mut, 400, "middle"),
    good: `<defs><radialGradient id="grs"><stop offset="0" stop-color="#e0a56e"/><stop offset="1" stop-color="#7a4222"/></radialGradient></defs>` + r(24, 18, 112, 80, "url(#grs)", 4) + t(80, 112, "300 PPI printed", 8, C.mut, 400, "middle") };
  V.aspect = { kind: "diagram", svg: `<svg viewBox="0 0 320 170" xmlns="http://www.w3.org/2000/svg">` + r(14, 40, 128, 72, C.bg, 4, `stroke="${C.blu}" stroke-width="2"`) + t(78, 80, "16:9", 14, C.blu, 800, "middle") + t(78, 128, "YouTube", 8, C.mut, 400, "middle") + r(156, 40, 72, 72, C.bg, 4, `stroke="${C.acc}" stroke-width="2"`) + t(192, 80, "1:1", 14, C.acc, 800, "middle") + t(192, 128, "Feed", 8, C.mut, 400, "middle") + r(244, 14, 62, 110, C.bg, 4, `stroke="${C.vio}" stroke-width="2"`) + t(275, 74, "9:16", 14, C.vio, 800, "middle") + t(275, 140, "Reels/Shorts", 8, C.mut, 400, "middle") + `</svg>` };
  V.safezone = { kind: "compare",
    bad: r(48, 4, 64, 112, "#26324a", 6) + t(80, 104, "CTA", 10, C.acc, 800, "middle") + r(100, 40, 10, 50, "#ffffff22", 3) + r(50, 92, 60, 22, "#ffffff22", 3) + t(80, 30, "hidden by UI", 7, C.red, 700, "middle"),
    good: r(48, 4, 64, 112, "#26324a", 6) + r(54, 18, 42, 64, "none", 3, `stroke="${C.acc}" stroke-dasharray="3 2"`) + t(75, 50, "CTA", 10, C.acc, 800, "middle") + r(100, 40, 10, 50, "#ffffff22", 3) + r(50, 92, 60, 22, "#ffffff22", 3) };

  /* ---------- Raster & vector tools ---------- */
  V.layers = { kind: "diagram", svg: `<svg viewBox="0 0 320 170" xmlns="http://www.w3.org/2000/svg">` + [["Text", C.acc, 20], ["Photo", C.blu, 55], ["Background", C.vio, 90]].map(([n, f, y], i) => `<g transform="translate(${60 + i * 16} ${y}) skewX(-30)">` + r(0, 0, 140, 40, f, 4, 'opacity=".8"') + `</g>` + t(250, y + 26, n, 11, f, 800)).join("") + t(20, 160, "Top layer covers the layers below", 9, C.mut, 400) + `</svg>` };
  V.mask = { kind: "diagram", svg: `<svg viewBox="0 0 320 170" xmlns="http://www.w3.org/2000/svg">` + r(20, 30, 110, 110, "#fff", 4) + `<ellipse cx="75" cy="85" rx="30" ry="40" fill="#000"/>` + t(75, 158, "Mask: black hides", 9, C.ink, 700, "middle") + t(160, 90, "→", 20, C.acc, 800, "middle") + r(190, 30, 110, 110, C.blu, 4) + `<ellipse cx="245" cy="85" rx="30" ry="40" fill="${C.bg}"/>` + t(245, 158, "Result: hole where black", 9, C.ink, 700, "middle") + `</svg>` };
  V.clipping = { kind: "diagram", svg: `<svg viewBox="0 0 320 170" xmlns="http://www.w3.org/2000/svg"><defs><clipPath id="cpc"><text x="160" y="110" font-size="72" font-weight="900" text-anchor="middle" font-family="Arial">FOOD</text></clipPath></defs>` + `<g clip-path="url(#cpc)">` + r(0, 0, 320, 170, "#c8642c") + c(120, 70, 40, "#f2b33d") + c(210, 100, 50, "#7a2e12") + `</g>` + t(160, 150, "Image clipped into the shape below it", 9, C.mut, 400, "middle") + `</svg>` };
  V.pen = { kind: "compare",
    bad: `<path d="M20 90 L30 70 L38 58 L48 48 L60 40 L74 36 L88 36 L102 40 L114 48 L124 58 L132 70 L140 90" fill="none" stroke="${C.ink}" stroke-width="2"/>` + [20, 30, 38, 48, 60, 74, 88, 102, 114, 124, 132, 140].map((x, i) => c(x, [90, 70, 58, 48, 40, 36, 36, 40, 48, 58, 70, 90][i], 3, C.red)).join(""),
    good: `<path d="M20 90 C20 40 140 40 140 90" fill="none" stroke="${C.ink}" stroke-width="2"/>` + c(20, 90, 3.5, C.acc) + c(140, 90, 3.5, C.acc) + l(20, 90, 20, 44, C.vio) + l(140, 90, 140, 44, C.vio) + c(20, 44, 2.5, C.vio) + c(140, 44, 2.5, C.vio) };
  V.boolean = { kind: "diagram", svg: `<svg viewBox="0 0 320 170" xmlns="http://www.w3.org/2000/svg">` + [["Weld / Unite", 0], ["Trim / Minus", 1], ["Intersect", 2]].map(([n, i]) => { const x = 20 + i * 100; const base = c(x + 30, 70, 26, i === 2 ? C.dim : C.blu) + c(x + 55, 70, 26, i === 1 ? C.bg : (i === 2 ? C.dim : C.blu), i === 1 ? `stroke="${C.mut}" stroke-dasharray="3 2"` : ""); const inter = i === 2 ? `<clipPath id="bc${i}"><circle cx="${x + 30}" cy="70" r="26"/></clipPath>` + c(x + 55, 70, 26, C.acc, `clip-path="url(#bc${i})"`) : ""; return base + inter + t(x + 42, 130, n, 10, C.ink, 700, "middle"); }).join("") + `</svg>` };
  V.nodes = { kind: "compare",
    bad: `<path d="M30 90 L50 30 L70 88 L90 32 L110 90 L130 30" fill="none" stroke="${C.ink}" stroke-width="2"/>` + t(80, 110, "jagged corners everywhere", 8, C.mut, 400, "middle"),
    good: `<path d="M30 90 Q50 10 70 60 T110 60 T140 40" fill="none" stroke="${C.acc}" stroke-width="2"/>` + t(80, 110, "smooth nodes, fewer points", 8, C.mut, 400, "middle") };
  V.cutout = { kind: "compare",
    bad: r(20, 14, 120, 92, "#2b3b2a", 4) + `<ellipse cx="80" cy="62" rx="26" ry="36" fill="${C.org}" stroke="#fff" stroke-width="3"/>` + t(80, 116, "white halo edge", 8, C.mut, 400, "middle"),
    good: r(20, 14, 120, 92, "#2b3b2a", 4) + `<ellipse cx="80" cy="62" rx="26" ry="36" fill="${C.org}"/>` + t(80, 116, "refined mask edge", 8, C.mut, 400, "middle") };
  V.contactShadow = { kind: "compare",
    bad: r(0, 80, 160, 40, "#2a2a36") + r(55, 30, 50, 40, C.red, 6) + t(80, 112, "floating", 8, C.mut, 400, "middle"),
    good: r(0, 80, 160, 40, "#2a2a36") + `<ellipse cx="80" cy="82" rx="30" ry="5" fill="#000" opacity=".6"/>` + r(55, 40, 50, 40, C.red, 6) + t(80, 112, "grounded", 8, C.mut, 400, "middle") };
  V.retouch = { kind: "compare",
    bad: `<ellipse cx="80" cy="60" rx="34" ry="42" fill="#c98a5a"/>` + c(68, 48, 3, "#7a3b1c") + c(92, 70, 2.5, "#7a3b1c") + c(76, 80, 2, "#7a3b1c") + t(80, 114, "blemishes left", 8, C.mut, 400, "middle"),
    good: `<ellipse cx="80" cy="60" rx="34" ry="42" fill="#c98a5a"/>` + t(80, 114, "clean, texture kept", 8, C.mut, 400, "middle") };
  V.colorGrade = { kind: "compare",
    bad: `<defs><linearGradient id="gcb" x1="0" x2="1"><stop offset="0" stop-color="#8a8a8a"/><stop offset="1" stop-color="#a5a5a5"/></linearGradient></defs>` + r(10, 14, 140, 86, "url(#gcb)", 4) + t(80, 112, "flat, grey", 8, C.mut, 400, "middle"),
    good: `<defs><linearGradient id="gcg" x1="0" x2="1"><stop offset="0" stop-color="#0c3b4a"/><stop offset=".6" stop-color="#d97a3a"/><stop offset="1" stop-color="#f4c27a"/></linearGradient></defs>` + r(10, 14, 140, 86, "url(#gcg)", 4) + t(80, 112, "teal shadows, warm highlights", 8, C.mut, 400, "middle") };
  V.blendModes = { kind: "diagram", svg: `<svg viewBox="0 0 320 170" xmlns="http://www.w3.org/2000/svg">` + [["Multiply", "multiply"], ["Screen", "screen"], ["Overlay", "overlay"]].map(([n, m], i) => { const x = 20 + i * 100; return r(x, 30, 80, 80, "#3d6ea8", 4) + c(x + 40, 70, 30, C.org, `style="mix-blend-mode:${m}"`) + t(x + 40, 130, n, 10, C.ink, 700, "middle"); }).join("") + `</svg>` };
  V.imageTrace = { kind: "compare",
    bad: Array.from({ length: 6 }, (_, i) => Array.from({ length: 6 }, (_, j) => ((i + j) % 5 && (i - 2.5) ** 2 + (j - 2.5) ** 2 < 8) ? r(50 + j * 10, 30 + i * 10, 10, 10, "#556") : "").join("")).join("") + t(80, 110, "blurry JPG logo", 8, C.mut, 400, "middle"),
    good: c(80, 60, 28, "#e8e8f0") + t(80, 110, "clean redrawn vector", 8, C.mut, 400, "middle") };

  /* ---------- Layout & publishing ---------- */
  V.frameFit = { kind: "diagram", svg: `<svg viewBox="0 0 320 170" xmlns="http://www.w3.org/2000/svg">` + r(20, 30, 120, 90, C.bg, 0, `stroke="${C.acc}" stroke-width="2"`) + r(40, 30, 80, 90, C.blu, 0) + t(80, 140, "Fit content: gaps", 9, C.ink, 700, "middle") + r(180, 30, 120, 90, C.blu, 0, `stroke="${C.acc}" stroke-width="2"`) + t(240, 140, "Fill frame: no gaps", 9, C.ink, 700, "middle") + `</svg>` };
  V.styles = { kind: "compare",
    bad: t(12, 26, "Heading", 14, C.ink, 800) + bars(12, 34, 2, 120, 7, C.mut) + t(12, 66, "Heading", 11, C.org, 400) + bars(12, 74, 2, 120, 7, C.mut) + t(12, 104, "HEADING", 13, C.blu, 900),
    good: [0, 1, 2].map(i => t(12, 26 + i * 36, "Heading", 13, C.acc, 800) + bars(12, 34 + i * 36, 2, 120, 7, C.mut)).join("") };
  V.wrap = { kind: "compare",
    bad: bars(10, 14, 12, 140, 8, C.mut) + r(50, 34, 60, 44, C.blu, 4),
    good: r(90, 20, 60, 50, C.blu, 4) + [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(i => r(10, 14 + i * 8, i < 8 ? 72 : 140, 3, C.mut, 1)).join("") };
  V.tabsLeader = { kind: "compare",
    bad: ["Jollof rice      ₦2,500", "Pepper soup   ₦3,000", "Suya ₦1,500"].map((s, i) => t(12, 36 + i * 24, s, 10, C.ink, 400, "start", 'xml:space="preserve"')).join(""),
    good: [["Jollof rice", "₦2,500"], ["Pepper soup", "₦3,000"], ["Suya", "₦1,500"]].map(([a, b], i) => t(12, 36 + i * 24, a, 10, C.ink, 400) + l(12 + a.length * 5.6, 33 + i * 24, 112, 33 + i * 24, C.mut, 1, 'stroke-dasharray="1 3"') + t(148, 36 + i * 24, b, 10, C.acc, 700, "end")).join("") };
  V.masterPage = { kind: "diagram", svg: `<svg viewBox="0 0 320 170" xmlns="http://www.w3.org/2000/svg">` + r(20, 20, 70, 100, C.bg, 3, `stroke="${C.vio}" stroke-width="2"`) + r(28, 106, 54, 6, C.vio, 2) + t(55, 140, "Parent / Master", 9, C.vio, 800, "middle") + [0, 1, 2].map(i => r(130 + i * 60, 20, 50, 72, C.bg, 3, `stroke="${C.mut}"`) + r(136 + i * 60, 80, 38, 5, C.vio, 2) + bars(136 + i * 60, 30, 4, 38, 9, C.mut, 3)).join("") + t(215, 112, "every page inherits the footer", 9, C.ink, 700, "middle") + `</svg>` };
  V.widow = { kind: "compare",
    bad: bars(12, 14, 5, 130, 8, C.mut) + r(12, 58, 30, 3, C.red, 1) + t(50, 62, "← lonely word", 8, C.red, 700) + bars(12, 76, 3, 130, 8, C.mut),
    good: bars(12, 14, 5, 130, 8, C.mut) + r(12, 58, 96, 3, C.mut, 1) + bars(12, 76, 3, 130, 8, C.mut) };

  /* ---------- Office ---------- */
  V.cells = { kind: "diagram", svg: `<svg viewBox="0 0 320 170" xmlns="http://www.w3.org/2000/svg">` + ["", "A", "B", "C", "D"].map((h, i) => r(10 + i * 60, 10, 60, 20, C.dim) + t(40 + i * 60, 24, h, 9, C.ink, 700, "middle")).join("") + [1, 2, 3, 4].map(n => r(10, 10 + n * 24, 60, 24, C.dim) + t(40, 26 + n * 24, n, 9, C.ink, 700, "middle")).join("") + r(130, 58, 60, 24, "none", 0, `stroke="${C.acc}" stroke-width="2.5"`) + t(160, 74, "B2", 10, C.acc, 800, "middle") + t(10, 150, "Cell address = column letter + row number", 9, C.mut, 400) + `</svg>` };
  V.absRef = { kind: "diagram", svg: `<svg viewBox="0 0 320 170" xmlns="http://www.w3.org/2000/svg">` + t(20, 34, "=C2*$H$2", 16, C.acc, 800) + t(20, 60, "=C3*$H$2", 16, C.ink, 800) + t(20, 86, "=C4*$H$2", 16, C.ink, 800) + t(170, 34, "C2 → C3 → C4 moves", 10, C.blu, 700) + t(170, 60, "$H$2 stays locked", 10, C.acc, 700) + t(20, 130, "Press F4 to add $ signs", 10, C.mut, 400) + `</svg>` };
  V.chartClutter = { kind: "compare",
    bad: [0, 1, 2, 3].map(i => l(10, 20 + i * 24, 150, 20 + i * 24, C.dim)).join("") + [50, 70, 40, 90, 60].map((h, i) => r(18 + i * 27, 100 - h, 18, h, [C.red, C.blu, C.yel, C.grn, C.vio][i], 0, 'stroke="#fff"')).join("") + t(80, 14, "3D SALES CHART!!!", 8, C.org, 800, "middle"),
    good: [50, 70, 40, 90, 60].map((h, i) => r(18 + i * 27, 100 - h, 18, h, i === 3 ? C.acc : C.dim, 2)).join("") + t(12, 14, "Q4 sales jumped 50%", 9, C.ink, 800) };
  V.pivot = { kind: "diagram", svg: `<svg viewBox="0 0 320 170" xmlns="http://www.w3.org/2000/svg">` + [0, 1, 2, 3, 4, 5, 6].map(i => r(14, 20 + i * 16, 110, 12, C.dim, 2) + r(18, 23 + i * 16, 40, 5, [C.blu, C.org, C.blu, C.grn, C.org, C.blu, C.grn][i], 2)).join("") + t(69, 150, "500 raw rows", 9, C.mut, 400, "middle") + t(150, 84, "→", 22, C.acc, 800, "middle") + [["Shoes", 3], ["Bags", 2], ["Caps", 2]].map(([n, v], i) => r(180, 40 + i * 26, 120, 20, C.bg, 3, `stroke="${C.mut}"`) + t(190, 54 + i * 26, n, 10, C.ink, 700) + t(290, 54 + i * 26, "₦" + v * 125 + "k", 10, C.acc, 800, "end")).join("") + t(240, 150, "PivotTable summary", 9, C.mut, 400, "middle") + `</svg>` };
  V.tableStyle = { kind: "compare",
    bad: [0, 1, 2, 3, 4].map(i => r(10, 14 + i * 20, 140, 20, "none", 0, 'stroke="#fff" stroke-width="2"') + l(60, 14 + i * 20, 60, 34 + i * 20, "#fff", 2) + l(105, 14 + i * 20, 105, 34 + i * 20, "#fff", 2)).join(""),
    good: [0, 1, 2, 3, 4].map(i => r(10, 14 + i * 20, 140, 20, i === 0 ? C.vio : (i % 2 ? C.bg : "#22222f"), 0) + r(16, 22 + i * 20, 30, 4, i === 0 ? "#fff" : C.mut, 2) + r(118, 22 + i * 20, 26, 4, i === 0 ? "#fff" : C.ink, 2)).join("") };
  V.slideText = { kind: "compare",
    bad: t(10, 18, "Our Company Overview", 9, C.ink, 700) + bars(10, 26, 11, 140, 8, C.mut, 3),
    good: t(80, 56, "3 hours", 26, C.acc, 900, "middle") + t(80, 78, "wasted weekly on manual invoices", 8, C.ink, 400, "middle") };
  V.masterSlide = { kind: "diagram", svg: `<svg viewBox="0 0 320 170" xmlns="http://www.w3.org/2000/svg">` + r(20, 30, 100, 60, C.bg, 3, `stroke="${C.vio}" stroke-width="2"`) + r(28, 38, 50, 6, C.ink, 2) + r(96, 78, 18, 8, C.acc, 2) + t(70, 110, "Slide Master", 9, C.vio, 800, "middle") + [0, 1, 2].map(i => r(150 + i * 55, 40, 48, 30, C.bg, 2, `stroke="${C.mut}"`) + r(154 + i * 55, 44, 24, 3, C.ink, 1) + r(186 + i * 55, 62, 8, 4, C.acc, 1)).join("") + t(230, 96, "logo + fonts everywhere", 9, C.ink, 700, "middle") + `</svg>` };
  V.docMarks = { kind: "diagram", svg: `<svg viewBox="0 0 320 170" xmlns="http://www.w3.org/2000/svg">` + t(20, 40, "Name·······Ada¶", 14, C.red, 700) + t(20, 66, "Name→Ada¶", 14, C.acc, 700) + t(210, 40, "spaces = dots", 10, C.red, 700) + t(210, 66, "tab = arrow", 10, C.acc, 700) + t(20, 110, "¶ reveals hidden spaces, tabs and breaks", 10, C.mut, 400) + `</svg>` };

  /* ---------- Video ---------- */
  V.timeline = { kind: "diagram", svg: `<svg viewBox="0 0 320 170" xmlns="http://www.w3.org/2000/svg">` + [["V2", C.vio, [[80, 60]]], ["V1", C.blu, [[20, 80], [104, 70], [178, 110]]], ["A1", C.grn, [[20, 80], [104, 70], [178, 110]]], ["A2", C.org, [[20, 268]]]].map(([n, f, clips], i) => t(8, 34 + i * 30, n, 9, C.mut, 700) + clips.map(([x, w]) => r(x + 10, 20 + i * 30, w, 22, f, 3, 'opacity=".85"')).join("")).join("") + l(150, 12, 150, 142, C.red, 2) + t(150, 160, "playhead", 8, C.red, 700, "middle") + `</svg>` };
  V.threePoint = { kind: "diagram", svg: `<svg viewBox="0 0 320 170" xmlns="http://www.w3.org/2000/svg">` + r(20, 40, 280, 30, C.dim, 4) + r(100, 40, 110, 30, C.acc, 0, 'opacity=".35"') + l(100, 30, 100, 80, C.acc, 2) + l(210, 30, 210, 80, C.acc, 2) + t(100, 24, "I (In)", 10, C.acc, 800, "middle") + t(210, 24, "O (Out)", 10, C.acc, 800, "middle") + t(160, 110, "Only the marked part goes to the timeline", 10, C.ink, 700, "middle") + `</svg>` };
  V.pacing = { kind: "compare",
    bad: r(10, 50, 140, 22, C.blu, 3) + t(80, 100, "one 40s take, pauses and all", 8, C.mut, 400, "middle"),
    good: [0, 1, 2, 3, 4, 5, 6].map(i => r(10 + i * 20, 50, 18, 22, i % 2 ? C.vio : C.blu, 3)).join("") + t(80, 100, "tight 2–3s cuts", 8, C.mut, 400, "middle") };
  V.audioLevels = { kind: "compare",
    bad: t(10, 20, "Voice", 8, C.mut, 400) + r(10, 26, 60, 10, C.grn, 2) + t(10, 56, "Music", 8, C.mut, 400) + r(10, 62, 140, 10, C.red, 2) + t(80, 100, "music drowns the voice", 8, C.mut, 400, "middle"),
    good: t(10, 20, "Voice", 8, C.mut, 400) + r(10, 26, 120, 10, C.grn, 2) + t(10, 56, "Music", 8, C.mut, 400) + r(10, 62, 40, 10, C.blu, 2) + t(80, 100, "voice leads, music ducks", 8, C.mut, 400, "middle") };
  V.captions = { kind: "compare",
    bad: r(48, 4, 64, 112, "#26324a", 6) + t(80, 108, "so today we are going to talk", 4, "#ccc", 400, "middle"),
    good: r(48, 4, 64, 112, "#26324a", 6) + t(80, 64, "3 APPS THAT", 8, "#fff", 900, "middle") + t(80, 76, "PAY YOU", 9, C.acc, 900, "middle") };
  V.hook = { kind: "diagram", svg: `<svg viewBox="0 0 320 170" xmlns="http://www.w3.org/2000/svg">` + l(30, 140, 300, 140, C.mut) + l(30, 20, 30, 140, C.mut) + `<path d="M30 30 C60 110 120 120 300 128" fill="none" stroke="${C.red}" stroke-width="2.5"/>` + `<path d="M30 30 C70 40 160 60 300 86" fill="none" stroke="${C.acc}" stroke-width="2.5"/>` + t(200, 76, "strong hook", 10, C.acc, 800) + t(200, 124, "slow start", 10, C.red, 800) + t(30, 158, "0s", 8, C.mut, 400) + t(300, 158, "end", 8, C.mut, 400, "end") + t(36, 16, "viewers still watching", 8, C.mut, 400) + `</svg>` };
  V.keyframes = { kind: "diagram", svg: `<svg viewBox="0 0 320 170" xmlns="http://www.w3.org/2000/svg">` + l(20, 120, 300, 120, C.mut) + `<path d="M40 110 C120 110 120 40 200 40 L280 40" fill="none" stroke="${C.acc}" stroke-width="2.5"/>` + `<rect x="34" y="104" width="12" height="12" transform="rotate(45 40 110)" fill="${C.vio}"/>` + `<rect x="194" y="34" width="12" height="12" transform="rotate(45 200 40)" fill="${C.vio}"/>` + t(40, 140, "100%", 9, C.ink, 700, "middle") + t(200, 140, "115%", 9, C.ink, 700, "middle") + t(160, 160, "Ease in/out = smooth motion between keyframes", 9, C.mut, 400, "middle") + `</svg>` };
  V.speedRamp = { kind: "diagram", svg: `<svg viewBox="0 0 320 170" xmlns="http://www.w3.org/2000/svg">` + l(20, 130, 300, 130, C.mut) + `<path d="M20 40 L110 40 C140 40 140 110 170 110 L200 110 C230 110 230 40 260 40 L300 40" fill="none" stroke="${C.org}" stroke-width="2.5"/>` + t(60, 32, "fast", 10, C.org, 800) + t(185, 124, "slow-mo on the beat", 9, C.ink, 700, "middle") + t(280, 32, "fast", 10, C.org, 800) + `</svg>` };
  V.transitions = { kind: "compare",
    bad: [0, 1, 2, 3, 4].map(i => r(8 + i * 30, 50, 26, 20, C.blu, 3) + (i < 4 ? t(35 + i * 30, 64, ["✦", "◎", "✺", "❖"][i], 12, [C.red, C.yel, C.vio, C.grn][i], 800, "middle") : "")).join(""),
    good: [0, 1, 2, 3, 4].map(i => r(8 + i * 30, 50, 28, 20, C.blu, 3)).join("") + t(80, 96, "mostly hard cuts", 8, C.mut, 400, "middle") };
  V.loudness = { kind: "diagram", svg: `<svg viewBox="0 0 320 170" xmlns="http://www.w3.org/2000/svg">` + r(40, 20, 30, 120, C.dim, 3) + r(40, 44, 30, 96, C.grn, 3) + r(40, 44, 30, 16, C.yel, 0) + l(30, 44, 80, 44, C.acc, 2) + t(90, 48, "-14 LUFS (YouTube/streaming target)", 10, C.acc, 800) + l(30, 30, 80, 30, C.red, 2) + t(90, 34, "-1 dBTP true peak ceiling", 10, C.red, 800) + t(90, 100, "Dialogue peaks around -6 to -3 dB", 10, C.ink, 700) + `</svg>` };

  /* ---------- UI maps ---------- */
  V.ui = { kind: "diagram", svg: `<svg viewBox="0 0 320 170" xmlns="http://www.w3.org/2000/svg">` + r(10, 10, 300, 18, C.dim, 3) + t(16, 23, "Menu / Property bar", 8, C.ink, 700) + r(10, 32, 30, 128, C.vio, 3, 'opacity=".6"') + t(25, 100, "Tools", 8, C.ink, 800, "middle", 'transform="rotate(-90 25 100)"') + r(46, 32, 190, 128, C.bg, 3, `stroke="${C.mut}"`) + t(141, 100, "Canvas / Page", 10, C.ink, 800, "middle") + r(242, 32, 68, 128, C.blu, 3, 'opacity=".45"') + t(276, 100, "Panels", 9, C.ink, 800, "middle") + `</svg>` };
  V.uiVideo = { kind: "diagram", svg: `<svg viewBox="0 0 320 170" xmlns="http://www.w3.org/2000/svg">` + r(10, 10, 96, 70, C.dim, 3) + t(58, 48, "Project", 9, C.ink, 800, "middle") + r(112, 10, 96, 70, C.bg, 3, `stroke="${C.mut}"`) + t(160, 48, "Source", 9, C.ink, 800, "middle") + r(214, 10, 96, 70, C.bg, 3, `stroke="${C.acc}"`) + t(262, 48, "Program", 9, C.acc, 800, "middle") + r(10, 86, 300, 74, C.vio, 3, 'opacity=".35"') + t(160, 128, "Timeline", 10, C.ink, 800, "middle") + `</svg>` };
  V.uiMobile = { kind: "diagram", svg: `<svg viewBox="0 0 320 170" xmlns="http://www.w3.org/2000/svg">` + r(110, 4, 100, 162, "#101018", 12, `stroke="${C.mut}"`) + r(118, 14, 84, 70, "#26324a", 4) + t(160, 52, "Preview", 9, C.ink, 800, "middle") + r(118, 90, 84, 40, C.vio, 3, 'opacity=".45"') + t(160, 114, "Timeline", 9, C.ink, 800, "middle") + r(118, 136, 84, 22, C.dim, 3) + t(160, 151, "Toolbar", 8, C.ink, 800, "middle") + `</svg>` };
  V.process = { kind: "diagram", svg: `<svg viewBox="0 0 320 170" xmlns="http://www.w3.org/2000/svg">` + ["Brief", "Sketch", "Build", "Review", "Deliver"].map((s, i) => r(8 + i * 62, 60, 54, 40, i === 4 ? C.acc : C.dim, 8) + t(35 + i * 62, 84, s, 9, i === 4 ? "#0A0A0F" : C.ink, 800, "middle") + (i < 4 ? t(62 + i * 62, 84, "›", 14, C.mut, 800, "middle") : "")).join("") + t(160, 130, "Every pro project follows this loop", 9, C.mut, 400, "middle") + `</svg>` };
  V.revision = { kind: "diagram", svg: `<svg viewBox="0 0 320 170" xmlns="http://www.w3.org/2000/svg">` + [["v1", C.dim], ["Client notes", C.org], ["v2", C.dim], ["Client notes", C.org], ["Final ✓", C.acc]].map(([s, f], i) => r(6 + i * 62, 60, 56, 40, f, 8) + t(34 + i * 62, 84, s, 8, i === 4 ? "#0A0A0F" : C.ink, 800, "middle")).join("") + t(160, 130, "Two revision rounds, then sign-off", 9, C.mut, 400, "middle") + `</svg>` };

  window.UDL_VISUALS = V;
  window.UDL_renderVisual = function (id) {
    const v = V[id];
    if (!v) return "";
    if (v.kind === "diagram") return `<div class="viz viz-diagram">${v.svg}</div>`;
    const panel = (inner, good) => `<figure class="viz-panel ${good ? "good" : "bad"}"><svg viewBox="0 0 160 120" xmlns="http://www.w3.org/2000/svg"><rect width="160" height="120" rx="10" fill="${C.bg}"/>${inner}</svg><figcaption>${good ? "✓ Do" : "✗ Don't"}</figcaption></figure>`;
    return `<div class="viz viz-compare">${panel(v.bad, false)}${panel(v.good, true)}</div>`;
  };
})();
