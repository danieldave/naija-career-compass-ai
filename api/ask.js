/* =====================================================================
   api/ask.js  -  THE KITCHEN (runs on the server, never in the page)
   The secret key lives ONLY in the server's settings (environment
   variables). It is never sent to the browser.
   ===================================================================== */
const Rules = require("../rules.js");

const MODEL = process.env.OPENAI_MODEL || "gpt-6-luna";
const BASE = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";

// Speed limit: at most 20 questions a minute from one computer
const hits = new Map();
function tooMany(ip) {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter(t => now - t < 60000);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > 20;
}

async function callAI(input, extraRule) {
  const r = await fetch(BASE + "/responses", {
    method: "POST",
    headers: { "Authorization": "Bearer " + process.env.OPENAI_API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      instructions: Rules.INSTRUCTIONS + (extraRule ? "\nIMPORTANT: " + extraRule : ""),   // 1. our rules
      input: input,                                                                        // 2. the student's answers
      text: { format: { type: "json_schema", name: "career_ideas", schema: Rules.SCHEMA, strict: true } }
    })
  });
  const data = await r.json();
  if (!r.ok) throw new Error((data.error && data.error.message) || ("HTTP " + r.status));
  // Find the AI's words: output -> message -> output_text
  const msg = (data.output || []).find(o => o.type === "message");
  const part = msg && (msg.content || []).find(c => c.type === "output_text");
  if (!part) throw new Error("The AI did not send any text.");
  return JSON.parse(part.text);
}

module.exports = async function handler(req, res) {
  // Let our GitHub Pages copy of the site talk to this server too
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Use POST." });

  const ip = String(req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "x").split(",")[0];
  if (tooMany(ip)) return res.status(429).json({ error: "Too many questions. Wait one minute." });

  const answers = (req.body && req.body.answers) || {};
  const problem = Rules.validate(answers);                       // THE CHECK
  if (problem) return res.status(400).json({ error: problem });

  const input = Rules.buildInput(answers);                       // the privacy filter runs inside
  const sent = { model: MODEL, instructions: Rules.INSTRUCTIONS, input: input };

  if (!process.env.OPENAI_API_KEY) {                             // no key: honest demo mode
    return res.status(200).json({ demo: true, sent: sent, result: Rules.demo(answers) });
  }
  try {
    let result = await callAI(input);
    let rule = Rules.check(result);                              // the guardrail check
    if (rule) { result = await callAI(input, rule); rule = Rules.check(result); }
    if (rule) return res.status(502).json({ error: "The AI's answer broke one of our rules. Please try again." });
    return res.status(200).json({ demo: false, sent: sent, result: result });
  } catch (err) {
    console.error("AI error:", err.message);
    return res.status(502).json({ error: "The AI could not answer. Check the key, the model name and the internet." });
  }
};
