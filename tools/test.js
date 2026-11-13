/* tools/test.js - checks the kitchen without a real key or real money.
   Run: node tools/test.js  (it fakes the AI with a pretend fetch) */
const assert = require("assert");
const Rules = require("../rules.js");
const Links = require("../ape-links.js");
let passed = 0;
const ok = (name, fn) => Promise.resolve().then(fn).then(() => { passed++; console.log("  ✓ " + name); }, e => { console.error("  ✗ " + name + "\n    " + e.message); process.exitCode = 1; });

const ANSWERS = { subject: "Physics", enjoy: "fixing things", loseTime: "taking things apart", curious: "electricity and solar power", natural: "good with my hands", game: "football", level: "Polytechnic (ND/HND)", workplace: "In a workshop, with my hands", extra: "" };
const CAREERS = { careers: [
  { title: "Solar Installer", category: "trade", routeType: "Skilled trade", why: "You love fixing things.", subjects: ["Physics", "Maths"], routes: ["NABTEB electrical installation", "Apprenticeship with a solar firm"], startNow: "Watch a solar panel being fitted." },
  { title: "Electrical Engineer", category: "engineering", routeType: "University", why: "You are curious about power.", subjects: ["Physics", "Maths"], routes: ["JAMB/UTME into B.Eng Electrical"], startNow: "Build a simple circuit." },
  { title: "Electrician", category: "trade", routeType: "Polytechnic or College", why: "Good with your hands.", subjects: ["Physics"], routes: ["ND Electrical at a polytechnic"], startNow: "Help wire a bulb safely with an adult." }] };

let calls = [], reply = CAREERS;
global.fetch = async (url, opt) => { calls.push(JSON.parse(opt.body)); return { ok: true, status: 200, json: async () => ({ output: [{ type: "message", content: [{ type: "output_text", text: JSON.stringify(reply) }] }] }) }; };

function run(body, headers = {}) {
  delete require.cache[require.resolve("../api/ask.js")];
  const handler = require("../api/ask.js");
  return new Promise(resolve => {
    const res = { code: 200, headers: {}, setHeader(k, v) { this.headers[k] = v; }, status(c) { this.code = c; return this; },
      json(o) { resolve({ code: this.code, body: o, headers: this.headers }); }, end() { resolve({ code: this.code, headers: this.headers }); } };
    handler({ method: "POST", headers: Object.assign({ host: "naija-career-compass-ai.vercel.app", "x-forwarded-for": "1.1.1." + Math.random() }, headers), body, socket: {} }, res);
  });
}

(async () => {
  console.log("Naija Career Compass AI tests");
  await ok("guest list: our sites are allowed, strangers are not", () => {
    const { allowedOrigin } = require("../api/ask.js");
    assert(allowedOrigin("https://naija-career-compass-ai.vercel.app", "x"));
    assert(allowedOrigin("https://danieldave.github.io", "x"));
    assert(allowedOrigin("", "x"));
    assert(!allowedOrigin("https://evil.example.com", "x"));
    assert(!allowedOrigin("https://danieldave.github.io.evil.com", "x"));
  });
  await ok("a stranger website gets 403", async () => { const r = await run({ answers: ANSWERS }, { origin: "https://evil.example.com" }); assert.strictEqual(r.code, 403); });
  await ok("no key: honest demo mode", async () => { delete process.env.OPENAI_API_KEY; const r = await run({ answers: ANSWERS }); assert(r.body.demo); assert.strictEqual(r.body.result.careers.length, 3); });
  process.env.OPENAI_API_KEY = "test";
  await ok("3 careers come back from the AI", async () => { calls = []; const r = await run({ answers: ANSWERS }); assert.strictEqual(r.code, 200); assert.strictEqual(r.body.result.careers.length, 3); assert.strictEqual(calls.length, 1); });
  await ok("Hausa: the language rule is added to the prompt", async () => { calls = []; await run({ answers: ANSWERS, lang: "ha" }); assert(/LANGUAGE: .*Hausa/.test(calls[0].instructions)); assert(/Keep 'title' in English/.test(calls[0].instructions)); });
  await ok("English: no language rule", async () => { calls = []; await run({ answers: Object.assign({}, ANSWERS, { game: "Ludo" }), lang: "en" }); assert(!/LANGUAGE:/.test(calls[0].instructions)); });
  await ok("an unknown language falls back to English", async () => { calls = []; await run({ answers: Object.assign({}, ANSWERS, { game: "chess" }), lang: "klingon" }); assert(!/LANGUAGE:/.test(calls[0].instructions)); });
  await ok("saved answers: the same question twice costs nothing", async () => {
    delete require.cache[require.resolve("../api/ask.js")]; const handler = require("../api/ask.js"); calls = [];
    const once = () => new Promise(r => handler({ method: "POST", headers: { host: "h" }, body: { answers: ANSWERS, lang: "yo" }, socket: {} }, { setHeader() {}, status() { return this; }, json: r }));
    await once(); const b = await once(); assert.strictEqual(calls.length, 1); assert(b.cached);
  });
  await ok("talk to my parents: message and points in the parents' language", async () => {
    calls = []; reply = { message: "Mama, Baba, mo fẹ́ di oníṣẹ́ iná...", points: ["Ó jẹ́ iṣẹ́ ọ̀wọ̀.", "Mo lè bẹ̀rẹ̀ kékeré.", "c", "d", "e"] };
    const r = await run({ mode: "parents", lang: "yo", career: CAREERS.careers[0] });
    assert.strictEqual(r.code, 200); assert(r.body.result.message); assert(r.body.result.points.length <= 4);
    assert(/PARENTS' LANGUAGE: Yoruba/.test(calls[0].input)); assert(/Never promise a salary/.test(calls[0].instructions));
    reply = CAREERS;
  });
  await ok("talk to my parents: personal details are filtered out", async () => {
    calls = []; reply = { message: "x", points: [] };
    await run({ mode: "parents", lang: "en", career: Object.assign({}, CAREERS.careers[1], { why: "my name is Tunde, call 08031234567" }) });
    assert(!/08031234567/.test(calls[0].input)); reply = CAREERS;
  });
  await ok("talk to my parents: no career gives 400", async () => { const r = await run({ mode: "parents", career: {} }); assert.strictEqual(r.code, 400); });
  await ok("talk to my parents without a key: demo message", async () => { delete process.env.OPENAI_API_KEY; const r = await run({ mode: "parents", career: CAREERS.careers[0] }); assert(r.body.demo); assert(/Solar Installer/.test(r.body.result.message)); process.env.OPENAI_API_KEY = "test"; });
  await ok("training links: trades match, degrees do not", () => {
    assert.strictEqual(Links.find("Electrician").id, "electrical");
    assert.strictEqual(Links.find("Welder").id, "welding");
    assert.strictEqual(Links.find("Civil Engineer"), null);
    assert.strictEqual(Links.find("Nurse"), null);
    assert(/^https:\/\/apprentice-pathway-explorer\.vercel\.app\/trade\//.test(Links.find("Plumber").url));
  });
  await ok("SEO files exist and point to the right site", () => {
    const fs = require("fs"), p = f => fs.readFileSync(require("path").join(__dirname, "..", f), "utf8");
    const html = p("index.html");
    assert(html.includes('rel="canonical" href="https://naija-career-compass-ai.vercel.app/"'));
    const ld = JSON.parse(html.split('<script type="application/ld+json">')[1].split("</script>")[0]);
    assert.strictEqual(ld["@graph"][1]["@type"], "FAQPage");
    assert(p("robots.txt").includes("Disallow: /api/")); assert(p("sitemap.xml").includes("<loc>")); assert(p("llms.txt").startsWith("# Naija Career Compass AI"));
    assert(fs.existsSync(require("path").join(__dirname, "../images/og-image.png")));
  });
  await ok("career library: every career has a page, a route and a real answer", () => {
    const fs = require("fs"), path = require("path"), { CAREERS } = require("./careers.js");
    assert(CAREERS.length >= 60); assert.strictEqual(new Set(CAREERS.map(c => c[0])).size, CAREERS.length);
    CAREERS.forEach(c => {
      assert(["uni", "poly", "trade"].includes(c[3]), c[0]); assert(c[7].length >= 3, c[0] + " needs a route");
      assert(Rules.CATEGORIES.includes(c[2]), c[0] + " picture"); assert(!/₦|salary|per month/i.test(c.join(" ")), c[0] + " must not promise pay");
      const h = fs.readFileSync(path.join(__dirname, "../careers", c[0], "index.html"), "utf8");
      assert(h.includes("Quick answer") && h.includes('"FAQPage"') && (h.match(/rel="canonical"/g) || []).length === 1 && (h.match(/<h1/g) || []).length === 1, c[0]);
    });
  });
  await ok("career library: the sitemap lists every page and trades link to real training pages", () => {
    const fs = require("fs"), path = require("path"), { CAREERS } = require("./careers.js");
    const sm = fs.readFileSync(path.join(__dirname, "../sitemap.xml"), "utf8");
    CAREERS.forEach(c => assert(sm.includes("/careers/" + c[0] + "/"), c[0]));
    assert(sm.includes("/subjects/biology/"));
    CAREERS.filter(c => c[3] === "trade" && c[11]).forEach(c => assert(c[11] === "shoe" || Links.find(c[11]), c[0] + " has no training page"));
    assert(!CAREERS.some(c => c[3] === "uni" && c[11] && c[0] !== "software-developer"));
  });
  console.log(passed + " checks passed");
})();
