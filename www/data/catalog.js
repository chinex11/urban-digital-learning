/* Track catalog. Content files call UDL_T(id, { tiers, rubrics }) to fill a track.
   Lesson schema (enforced by tools/validate.js):
   { t: title, c: concept, p: [4 key points], k: [3-5 shortcut ids] (Fundamentals: [[term, definition] x3]),
     tip, v: visual id, cap: visual caption,
     lab: { s: scenario, do: [5-6 steps], r: [3 report questions], file?: starter path, photo?: pexels query },
     q: [[question, [4 options], correctIndex, explanation] x3],
     rub?: rubric id (graded project), client?: client feedback (capstone revisions), hint?: string } */
window.UDL_TRACKS = [
  { id: "fundamentals", num: 0, name: "Design Fundamentals", abbr: "Df", color: "#C8FF3D", group: "core",
    focus: "Typography · Color · Grids · Hierarchy · Composition",
    intro: "The principles every pro uses in every tool. Finish the Beginner tier to unlock Intermediate in all other tracks." },
  { id: "coreldraw", num: 1, name: "CorelDRAW", abbr: "Cdr", color: "#3DDC97", group: "design",
    focus: "Logos · Fliers · Posters · Signage",
    intro: "The print-shop standard across Nigeria. Master vectors, print production and signage, then ship client-ready work." },
  { id: "photoshop", num: 2, name: "Photoshop", abbr: "Ps", color: "#4FB3FF", group: "design",
    focus: "Retouching · Compositing · Social & Print Graphics",
    intro: "The king of pixels. Retouch, composite and design graphics that stop the scroll and print sharp." },
  { id: "illustrator", num: 3, name: "Illustrator", abbr: "Ai", color: "#FF9A3D", group: "design",
    focus: "Vector Art · Icons · Brand Identity",
    intro: "The global brand-design standard. Build logos, icon systems and illustrations with perfect curves." },
  { id: "indesign", num: 4, name: "InDesign", abbr: "Id", color: "#FF4F8B", group: "design",
    focus: "Brochures · Magazines · Long Documents",
    intro: "The layout engine behind magazines and books. Master frames, styles, grids and print production." },
  { id: "word", num: 5, name: "Word", abbr: "W", color: "#5B8CFF", group: "office",
    focus: "Documents · Reports · Templates · Mail Merge",
    intro: "Everyone has Word; few use it like a pro. Build templates, long reports and automated documents." },
  { id: "excel", num: 6, name: "Excel", abbr: "X", color: "#2FCB6F", group: "office",
    focus: "Formulas · Data · Dashboards · Automation",
    intro: "The business brain. From clean data to dynamic-array formulas, Power Query and dashboards clients trust." },
  { id: "powerpoint", num: 7, name: "PowerPoint", abbr: "P", color: "#FF6A3D", group: "office",
    focus: "Pitch Decks · Presentations · Promo Motion",
    intro: "Decks that win pitches, plus PowerPoint as a fast design and motion tool." },
  { id: "premiere", num: 8, name: "Premiere Pro", abbr: "Pr", color: "#B784FF", group: "video",
    focus: "Editing · Color · Audio · Delivery",
    intro: "The editor behind channels, ads and films. Cut, grade, mix to broadcast standards and deliver." },
  { id: "capcut", num: 9, name: "CapCut", abbr: "Cc", color: "#F4F4F7", group: "video",
    focus: "Shorts · Reels · TikTok · Fast Edits",
    intro: "Short-form video on your phone. Hooks, captions, beats and formats that grow channels." }
];
window.UDL_T = function (id, content) {
  const t = window.UDL_TRACKS.find((x) => x.id === id);
  if (t) Object.assign(t, content);
};
