/* =====================================================================
   api/ask.js  -  THE KITCHEN (runs on the server, never in the page)
   The secret key lives ONLY in the server's settings (environment
   variables). It is never sent to the browser.

   Version 3 adds:
   - LANGUAGES: the careers can be written in 17 Nigerian languages
   - "Talk to my parents": { mode: "parents", career, lang } writes a
     respectful message from the student to their parents
   - a guest list: only our own websites may use the kitchen
   - saved answers: the same answers twice cost nothing
   - a 30-second timer, so a slow AI never freezes the page
   ===================================================================== */
const Rules = require("../rules.js");

const MODEL = process.env.OPENAI_MODEL || "gpt-6-luna";
const BASE = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";

const LANGUAGES = { en: "English", ha: "Hausa", yo: "Yoruba", ig: "Igbo", pcm: "Nigerian Pidgin English", ff: "Fulfulde (Fula, as spoken in northern Nigeria)",
  kr: "Kanuri", tiv: "Tiv", ibb: "Ibibio", efi: "Efik", ijc: "Izon (Ijaw)", bin: "Edo (Bini)", nup: "Nupe", urh: "Urhobo", igl: "Igala", idu: "Idoma", igb: "Ebira" };

// THE GUEST LIST: our Vercel site, our GitHub Pages copy, and a computer at home (for testing)
function allowedOrigin(origin, host) {
  if (!origin) return true;                                            // same-site requests send no origin
  if (origin === "https://" + host) return true;
  return /^https:\/\/(naija-career-compass[a-z0-9-]*\.vercel\.app|danieldave\.github\.io)$/.test(origin) ||
    /^http:\/\/localhost(:\d+)?$/.test(origin) ||
    (process.env.ALLOWED_ORIGINS || "").split(",").map(s => s.trim()).includes(origin);
}

// Speed limit: at most 20 questions a minute from one computer
const hits = new Map();
function tooMany(ip) {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter(t => now - t < 60000);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();
  return recent.length > 20;
}

// Saved answers (kept for 6 hours in this copy of the kitchen)
const saved = new Map();
function remember(key, value) { if (saved.size > 300) saved.delete(saved.keys().next().value); saved.set(key, { t: Date.now(), value }); }
function recall(key) { const s = saved.get(key); return s && Date.now() - s.t < 6 * 3600000 ? s.value : null; }

async function callAI(instructions, input, schema, name) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 30000);
  try {
    const r = await fetch(BASE + "/responses", {
      method: "POST", signal: ctrl.signal,
      headers: { "Authorization": "Bearer " + process.env.OPENAI_API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ model: MODEL, instructions, input, text: { format: { type: "json_schema", name, schema, strict: true } } })
    });
    const data = await r.json();
    if (!r.ok) throw new Error((data.error && data.error.message) || ("HTTP " + r.status));
    // Find the AI's words: output -> message -> output_text
    const msg = (data.output || []).find(o => o.type === "message");
    const part = msg && (msg.content || []).find(c => c.type === "output_text");
    if (!part) throw new Error("The AI did not send any text.");
    return JSON.parse(part.text);
  } finally { clearTimeout(timer); }
}

// The language rule is added to our 5-part prompt (the 5 parts themselves never change)
function languageRule(lang) {
  return lang === "en" ? "" : "\nLANGUAGE: Write 'why', 'subjects', 'routes' and 'startNow' in " + LANGUAGES[lang] +
    ", using simple everyday words. Keep 'title' in English. Keep exam and certificate names unchanged: WAEC, NECO, JAMB/UTME, ND, HND, NCE, NABTEB, NSQ.";
}

module.exports = async function handler(req, res) {
  const origin = req.headers.origin || "";
  if (!allowedOrigin(origin, req.headers.host || "")) return res.status(403).json({ error: "This website is not allowed to use our kitchen." });
  if (origin) res.setHeader("Access-Control-Allow-Origin", origin);   // let our GitHub Pages copy talk to this server too
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Use POST." });

  const ip = String(req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "x").split(",")[0];
  if (tooMany(ip)) return res.status(429).json({ error: "Too many questions. Wait one minute." });

  const body = req.body || {};
  const lang = LANGUAGES[body.lang] ? body.lang : "en";

  // ---------- "Talk to my parents" ----------
  if (body.mode === "parents") {
    const c = body.career || {};
    const career = {
      title: Rules.clean(String(c.title || "")).slice(0, 80), routeType: Rules.clean(String(c.routeType || "")).slice(0, 40),
      why: Rules.clean(String(c.why || "")).slice(0, 300),
      subjects: (Array.isArray(c.subjects) ? c.subjects : []).slice(0, 4).map(x => Rules.clean(String(x)).slice(0, 40)),
      routes: (Array.isArray(c.routes) ? c.routes : []).slice(0, 3).map(x => Rules.clean(String(x)).slice(0, 120))
    };
    if (career.title.length < 2) return res.status(400).json({ error: "Choose a career first." });
    const input = "PARENTS' LANGUAGE: " + LANGUAGES[lang] + "\nCAREER: " + JSON.stringify(career);
    const sent = { model: MODEL, instructions: Rules.PARENT_INSTRUCTIONS, input };
    if (!process.env.OPENAI_API_KEY) return res.status(200).json({ demo: true, sent, result: Rules.parentDemo(career) });
    const key = "p|" + input;
    const hit = recall(key);
    if (hit) return res.status(200).json({ demo: false, sent, result: hit, cached: true });
    try {
      const result = await callAI(Rules.PARENT_INSTRUCTIONS, input, Rules.PARENT_SCHEMA, "parent_message");
      result.points = (result.points || []).slice(0, 4);
      remember(key, result);
      return res.status(200).json({ demo: false, sent, result });
    } catch (err) {
      console.error("AI error:", err.message);
      return res.status(502).json({ error: "The AI could not write the message right now. Please try again." });
    }
  }

  // ---------- 3 careers ----------
  const answers = body.answers || {};
  const problem = Rules.validate(answers);                       // THE CHECK
  if (problem) return res.status(400).json({ error: problem });

  const input = Rules.buildInput(answers);                       // the privacy filter runs inside
  const instructions = Rules.INSTRUCTIONS + languageRule(lang);
  const sent = { model: MODEL, instructions, input };

  if (!process.env.OPENAI_API_KEY) {                             // no key: honest demo mode
    return res.status(200).json({ demo: true, sent, result: Rules.demo(answers) });
  }
  const key = "c|" + lang + "|" + input;
  const hit = recall(key);
  if (hit) return res.status(200).json({ demo: false, sent, result: hit, cached: true });
  try {
    let result = await callAI(instructions, input, Rules.SCHEMA, "career_ideas");
    let rule = Rules.check(result);                              // the guardrail check
    if (rule) { result = await callAI(instructions + "\nIMPORTANT: " + rule, input, Rules.SCHEMA, "career_ideas"); rule = Rules.check(result); }
    if (rule) return res.status(502).json({ error: "The AI's answer broke one of our rules. Please try again." });
    remember(key, result);
    return res.status(200).json({ demo: false, sent, result });
  } catch (err) {
    console.error("AI error:", err.message);
    return res.status(502).json({ error: "The AI could not answer. Check the key, the model name and the internet." });
  }
};

module.exports.allowedOrigin = allowedOrigin;
module.exports.LANGUAGES = LANGUAGES;
