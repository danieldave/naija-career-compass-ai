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
  await ok("class mode: only labels are stored, small classes stay hidden, bad codes are refused", async () => {
    const cls = require("../api/class.js");
    const run = (method, body, query, origin) => new Promise(r => { const res = { h: {}, code: 200, setHeader() {}, status(c) { this.code = c; return this; }, json(d) { r({ code: this.code, data: d }); }, end() { r({ code: this.code }); } };
      cls({ method, body, query: query || {}, headers: { origin: origin === undefined ? "https://naija-career-compass-ai.vercel.app" : origin, host: "naija-career-compass-ai.vercel.app", "x-forwarded-for": "5.5.5." + Math.floor(Math.random() * 200) } }, res); });
    delete process.env.KV_REST_API_URL; delete process.env.KV_REST_API_TOKEN;
    assert.strictEqual((await run("POST", { action: "create" })).data.live, false);
    assert.strictEqual((await run("GET", null, { c: "ABCDEF" })).data.live, false);
    assert.strictEqual((await run("POST", { action: "create" }, null, "https://evil.example")).code, 403);
    process.env.KV_REST_API_URL = "https://db.example"; process.env.KV_REST_API_TOKEN = "t";
    const real = global.fetch; let store = {}, marks = {}, seen = [];
    global.fetch = async (u, o) => { const cmds = JSON.parse(o.body); seen.push(...cmds); return { ok: true, json: async () => cmds.map(c => {
      if (c[0] === "SET") { if (marks[c[1]]) return { result: null }; marks[c[1]] = 1; return { result: "OK" }; }
      if (c[0] === "EXISTS") return { result: marks[c[1]] ? 1 : 0 };
      if (c[0] === "HINCRBY") { store[c[1]] = store[c[1]] || {}; store[c[1]][c[2]] = (store[c[1]][c[2]] || 0) + c[3]; return { result: 1 }; }
      if (c[0] === "HGETALL") return { result: [].concat(...Object.entries(store[c[1]] || {}).map(([k, v]) => [k, String(v)])) };
      return { result: 1 }; }) }; };
    const code = (await run("POST", { action: "create" })).data.code;
    assert(/^[A-HJ-KM-NP-Z2-9]{6}$/.test(code), "code looks easy to read: " + code);
    const good = { action: "submit", code, subject: "Physics", careers: [{ category: "engineering", routeType: "University" }, { category: "electrical", routeType: "Skilled trade" }, { category: "computing", routeType: "Polytechnic or College" }] };
    assert.strictEqual((await run("POST", { ...good, careers: [{ category: "my school is X", routeType: "University" }] })).code, 400);
    assert.strictEqual((await run("POST", { ...good, code: "!!" })).code, 400);
    seen = []; assert.strictEqual((await run("POST", { ...good, name: "Ada", note: "private words" })).data.counted, true);
    assert(!JSON.stringify(seen).match(/Ada|private/), "no free text reaches the database");
    for (let i = 0; i < 3; i++) await run("POST", good);
    let d = (await run("GET", null, { c: code })).data; assert.strictEqual(d.joined, 4); assert(!d.categories, "hidden below 5 students");
    await run("POST", good); d = (await run("GET", null, { c: code })).data;
    assert.strictEqual(d.joined, 5); assert.strictEqual(d.categories[0].count, 5); assert.strictEqual(d.subjects[0].id, "Physics");
    const missing = (await run("POST", { ...good, code: "ZZZZZZ" })).data; assert.strictEqual(missing.found, false);
    global.fetch = real;
    const fs = require("fs"), path = require("path");
    assert(fs.readFileSync(path.join(__dirname, "../sitemap.xml"), "utf8").includes("/class/"));
  });
  await ok("version 5: JAMB helper uses the career library, marks uncertain courses and sends readers to JAMB", () => {
    const fs = require("fs"), path = require("path"), X = require("./extras"), { CAREERS } = require("./careers");
    const h = fs.readFileSync(path.join(__dirname, "../jamb-subjects/index.html"), "utf8");
    X.JAMB.forEach(j => { const c = CAREERS.find(x => x[0] === j[1]); assert(c && c[6], j[0] + " needs UTME subjects in careers.js"); assert(["established", "varies"].includes(j[2]), j[0]); assert(h.includes('id="' + j[1] + '"'), j[0]); });
    assert(X.JAMB.some(j => j[2] === "varies") && (h.match(/varies: check/g) || []).length >= X.JAMB.filter(j => j[2] === "varies").length);
    assert(h.includes("https://www.jamb.gov.ng") && h.includes("https://ibass.jamb.gov.ng") && /Always confirm before you register/.test(h));
  });
  await ok("version 5: scholarships have official https links or say so, and never print a deadline or amount", () => {
    const fs = require("fs"), path = require("path"), X = require("./extras");
    X.SCHOLARSHIPS.forEach(s => { assert(s.official === "" || /^https:\/\/[a-z0-9.-]+(\/[a-z0-9\/-]*)?$/.test(s.official), s.id); assert(!/₦|N\d|\b(19|20)\d\d\b(?! and earlier)/.test(s.who + s.level), s.id + " must not state amounts or dates"); });
    const h = fs.readFileSync(path.join(__dirname, "../scholarships/index.html"), "utf8");
    assert((h.match(/Check current dates/g) || []).length >= X.SCHOLARSHIPS.length && h.includes("Never pay anyone"));
    const doc = fs.readFileSync(path.join(__dirname, "../careers/medical-doctor/index.html"), "utf8");
    assert(doc.includes("/scholarships/#agbami-ameps") && doc.includes("/jamb-subjects/#medical-doctor"), "career pages link their scholarships and JAMB subjects");
    assert(fs.readFileSync(path.join(__dirname, "../careers/nurse/index.html"), "utf8").includes("/day-in-the-life/#nurse"));
  });
  await ok("version 5: 8 day-in-the-life profiles, each labelled illustrative, with a real-story template", () => {
    const fs = require("fs"), path = require("path"), X = require("./extras");
    const h = fs.readFileSync(path.join(__dirname, "../day-in-the-life/index.html"), "utf8");
    assert.strictEqual(X.DAYS.length, 8);
    assert((h.match(/Illustrative example · not a real person/g) || []).length === 8);
    assert(h.includes('id="real-story"') && h.includes("mailto:") && h.includes("https://wa.me/?text="));
    const sm = fs.readFileSync(path.join(__dirname, "../sitemap.xml"), "utf8");
    ["/jamb-subjects/", "/scholarships/", "/day-in-the-life/", "/whats-new/"].forEach(u => assert(sm.includes(u), u));
    assert(fs.readFileSync(path.join(__dirname, "../whats-new/index.html"), "utf8").includes("the ByteBusters team at Yewa College"));
    assert.strictEqual((fs.readFileSync(path.join(__dirname, "../llms.txt"), "utf8").match(/\n## Tools/g) || []).length, 1, "llms.txt is not repeated on every build");
    assert(fs.readdirSync(path.join(__dirname, "../api")).filter(f => f.endsWith(".js")).length <= 12);
  });
  console.log(passed + " checks passed");
})();
