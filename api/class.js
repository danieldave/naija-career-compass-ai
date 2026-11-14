/* =====================================================================
   api/class.js  -  CLASS MODE (runs on the server)
   A teacher makes a class code. Students type it in. The teacher then
   sees anonymous TOTALS: which career families and routes the class is
   drawn to, and which favourite subjects.

   PRIVACY BY DESIGN
   - Only fixed-list labels are accepted (career family, route type, subject).
   - No names, no free text, no career titles, no answers are ever stored.
   - Nothing is shown until 5 students have joined, so no one can be picked out.
   - A class disappears 60 days after it was last used.
   - Without the database the feature says it is "not switched on".
   ===================================================================== */
const Rules = require("../rules.js");
const Ask = require("./ask.js");

const SUBJECTS = ["Mathematics", "English Language", "Biology", "Chemistry", "Physics", "Agricultural Science", "Computer Studies", "Basic Technology",
  "Technical Drawing", "Fine Art", "Music", "Literature in English", "Government", "Economics", "Commerce", "Geography", "Home Economics",
  "Food and Nutrition", "Clothing and Textiles", "Physical and Health Education", "Civic Education", "Yoruba", "Igbo", "Hausa", "Other"];
const ROUTES = ["University", "Polytechnic or College", "Skilled trade"];
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";          // no 0 O 1 I L: easy to read off a board
const MIN_CLASS = 5, DAYS = 60, TTL = DAYS * 86400;

const DB_URL = () => (process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || "").replace(/\/$/, "");
const DB_TOKEN = () => process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || "";
async function db(commands) {
  const ctrl = new AbortController(); const timer = setTimeout(() => ctrl.abort(), 5000);
  try {
    const r = await fetch(DB_URL() + "/pipeline", { method: "POST", signal: ctrl.signal,
      headers: { Authorization: "Bearer " + DB_TOKEN(), "Content-Type": "application/json" }, body: JSON.stringify(commands) });
    if (!r.ok) throw new Error("The database said " + r.status);
    return r.json();
  } finally { clearTimeout(timer); }
}

// a small fair-use counter (a whole school can share one internet address, so the limits are generous)
const hits = new Map();
function allowed(key, max) {
  const now = Date.now(), h = (hits.get(key) || []).filter(t => now - t < 3600000);
  if (h.length >= max) { hits.set(key, h); return false; }
  h.push(now); hits.set(key, h);
  if (hits.size > 5000) hits.clear();
  return true;
}
const who = req => String((req.headers["x-forwarded-for"] || "").split(",")[0] || "x").trim();
const newCode = () => Array.from({ length: 6 }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join("");
const cleanCode = c => String(c || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
const validCode = c => c.length === 6 && [...c].every(ch => ALPHABET.includes(ch));

module.exports = async function handler(req, res) {
  const origin = req.headers.origin || "";
  if (!Ask.allowedOrigin(origin, req.headers.host || "")) return res.status(403).json({ error: "This website is not allowed to use Class Mode." });
  if (origin) res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Cache-Control", "no-store");
  if (req.method === "OPTIONS") return res.status(204).end();
  const live = !!(DB_URL() && DB_TOKEN());

  // ---- the teacher looks at the class ----
  if (req.method === "GET") {
    const code = cleanCode(req.query && req.query.c);
    if (!live) return res.status(200).json({ live: false });
    if (!validCode(code)) return res.status(400).json({ error: "That class code does not look right." });
    if (!allowed(who(req) + ":look", 300)) return res.status(429).json({ error: "Too many." });
    try {
      const [mark, hash] = await db([["EXISTS", "classx:" + code], ["HGETALL", "class:" + code]]);
      if (!mark.result) return res.status(200).json({ live: true, found: false });
      const a = hash.result || [], sum = {};
      for (let i = 0; i < a.length; i += 2) sum[a[i]] = Number(a[i + 1] || 0);
      const n = sum.n || 0, out = { live: true, found: true, code, joined: n, minClass: MIN_CLASS, days: DAYS };
      if (n >= MIN_CLASS) {
        const rows = (list, p) => list.map(id => ({ id, count: sum[p + id] || 0 })).filter(x => x.count).sort((x, y) => y.count - x.count);
        out.categories = rows(Rules.CATEGORIES, "cat:"); out.routes = rows(ROUTES, "rt:"); out.subjects = rows(SUBJECTS, "sub:");
      }
      return res.status(200).json(out);
    } catch (e) { console.error("class read:", e.message); return res.status(200).json({ live: false }); }
  }

  if (req.method !== "POST") return res.status(405).json({ error: "Use GET or POST." });
  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  body = body || {};

  // ---- the teacher makes a class ----
  if (body.action === "create") {
    if (!live) return res.status(200).json({ live: false });
    if (!allowed(who(req) + ":create", 10)) return res.status(429).json({ error: "You made many classes. Please try again later." });
    try {
      for (let tries = 0; tries < 5; tries++) {
        const code = newCode();
        const [r] = await db([["SET", "classx:" + code, "1", "NX", "EX", TTL]]);
        if (r.result === "OK") return res.status(200).json({ live: true, code, days: DAYS });
      }
      return res.status(503).json({ error: "Could not make a class. Please try again." });
    } catch (e) { console.error("class create:", e.message); return res.status(200).json({ live: false }); }
  }

  // ---- a student adds their result (labels only) ----
  if (body.action === "submit") {
    const code = cleanCode(body.code);
    if (!validCode(code)) return res.status(400).json({ error: "That class code does not look right." });
    const subject = SUBJECTS.includes(body.subject) ? body.subject : "Other";
    const careers = (Array.isArray(body.careers) ? body.careers : []).slice(0, 3)
      .map(c => ({ cat: Rules.CATEGORIES.includes(c && c.category) ? c.category : null, rt: ROUTES.includes(c && c.routeType) ? c.routeType : null }));
    if (!careers.length || careers.some(c => !c.cat || !c.rt)) return res.status(400).json({ error: "Nothing to count." });
    if (!live) return res.status(200).json({ live: false, counted: false });
    if (!allowed(who(req) + ":submit", 400)) return res.status(429).json({ error: "Too many." });
    try {
      const [mark] = await db([["EXISTS", "classx:" + code]]);
      if (!mark.result) return res.status(200).json({ live: true, found: false, counted: false });
      const k = "class:" + code, cmds = [["HINCRBY", k, "n", 1], ["HINCRBY", k, "sub:" + subject, 1]];
      careers.forEach(c => { cmds.push(["HINCRBY", k, "cat:" + c.cat, 1]); cmds.push(["HINCRBY", k, "rt:" + c.rt, 1]); });
      cmds.push(["EXPIRE", k, TTL], ["EXPIRE", "classx:" + code, TTL]);
      await db(cmds);
      return res.status(200).json({ live: true, found: true, counted: true });
    } catch (e) { console.error("class write:", e.message); return res.status(200).json({ live: true, counted: false }); }
  }
  return res.status(400).json({ error: "Unknown action." });
};
module.exports.SUBJECTS = SUBJECTS; module.exports.ROUTES = ROUTES; module.exports.MIN_CLASS = MIN_CLASS;
