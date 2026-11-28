#!/usr/bin/env node
/* =====================================================================
   tools/build.js  -  makes the Career Library pages
   ---------------------------------------------------------------------
   The AI tool lives on ONE page, so search engines could only find us for
   one thing. This script turns tools/careers.js into real pages:

     /careers/                        every career, with a filter
     /careers/<slug>/                 "How to become a ___ in Nigeria"
     /careers/university/  ...        careers by route
     /subjects/                       "What can I become with my subjects?"
     /subjects/<subject>/             careers for one subject
     sitemap.xml and llms.txt

   Run:  node tools/build.js      The address comes from tools/site.json.
   ===================================================================== */
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const SITE = JSON.parse(fs.readFileSync(path.join(__dirname, 'site.json'), 'utf8'));
const URL_ = SITE.url.replace(/\/$/, '');
const TODAY = new Date().toISOString().slice(0, 10);
const { CAREERS } = require('./careers');
const Ape = require('../ape-links.js');

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const json = o => JSON.stringify(o).replace(/</g, '\\u003c');
const an = w => /^[aeiou]/i.test(w) ? 'an' : 'a';
const short = s => s.length > 155 ? s.slice(0, 150).replace(/\s\S*$/, '') + '…' : s;
const pages = [{ loc: '/', pri: '1.0' }];
const write = (rel, text) => { const f = path.join(ROOT, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, text); };
const VERIFY = (SITE.googleVerify ? `\n<meta name="google-site-verification" content="${SITE.googleVerify}">` : '') + (SITE.bingVerify ? `\n<meta name="msvalidate.01" content="${SITE.bingVerify}">` : '');
const ROUTES = { uni: ['University', 'university', 'uni'], poly: ['Polytechnic or College', 'polytechnic-and-college', 'poly'], trade: ['Skilled trade', 'skilled-trades', 'trade'] };
const C = CAREERS.map(c => ({ slug: c[0], title: c[1], pic: c[2], route: c[3], does: c[4], fits: c[5], utme: c[6], routes: c[7], time: c[8], body: c[9], start: c[10], ape: c[11] ? Ape.find(c[11]) : null }));
const ORG = { '@type': 'EducationalOrganization', '@id': URL_ + '/#org', name: SITE.publisher, url: URL_ + '/' };
// ---------- version 5 data: JAMB helper, scholarships, a day in the life ----------
const X = require('./extras');
const SCIENCE = /Physics|Chemistry|Biology|Mathematics|Agricultural/;
const scholarshipsFor = c => X.SCHOLARSHIPS.filter(s => Array.isArray(s.careers) ? s.careers.includes(c.slug)
  : s.careers === 'uni' ? c.route === 'uni' : s.careers === 'tertiary' ? c.route !== 'trade' : s.careers === 'science' ? c.route !== 'trade' && (c.utme || []).some(u => SCIENCE.test(u)) : false);
const jambFor = c => X.JAMB.filter(j => j[1] === c.slug);
const dayFor = c => X.DAYS.find(d => d[0] === c.slug);

function page({ rel, title, description, h1, crumbs, body, schema }) {
  const url = URL_ + '/' + rel.replace(/index\.html$/, '');
  // Google shows about 60 letters of a title
  if (title.length > 60) title = title.replace(/ \| Naija Career Compass$/, '');
  if (title.length > 60) title = title.replace(/\s*\([^)]*\)/g, '');
  if (title.length > 60) title = title.replace(/^(How to become .*) in Nigeria$/, '$1');
  for (let n = 58; title.length > 60 && n > 30; n -= 4) title = title.replace(/…$/, '').slice(0, n).replace(/\s\S*$/, '') + '…';
  description = short(description);
  return `<!doctype html>
<html lang="en-NG">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${url}">${VERIFY}
<meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large">
<meta property="og:type" content="article">
<meta property="og:site_name" content="Naija Career Compass AI">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${URL_}/images/og-image.png">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${URL_}/images/og-image.png">
<meta name="theme-color" content="#2A1B6E">
<link rel="icon" href="/images/logo.svg">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@600;700;800;900&family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/style.css">
<script>try { var t = localStorage.getItem("cc-theme"); if (t) document.documentElement.dataset.theme = t; } catch (e) {}</script>
<script type="application/ld+json">${json({ '@context': 'https://schema.org', '@graph': [ORG, { '@type': 'BreadcrumbList', itemListElement: crumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c[0], item: URL_ + c[1] })) }].concat(schema || []) })}</script>
</head>
<body>
<header class="bar"><a class="brand" href="/"><img src="/images/logo.svg" alt="" width="46" height="46"><span>NAIJA CAREER COMPASS <b>AI</b></span></a></header>
<nav class="gnav" aria-label="Main"><a href="/careers/">All careers</a><a href="/subjects/">My subjects</a><a href="/careers/university/">University</a><a href="/careers/polytechnic-and-college/">Polytechnic</a><a href="/careers/skilled-trades/">Trades</a><a href="/jamb-subjects/">JAMB subjects</a><a href="/scholarships/">Scholarships</a><a href="/day-in-the-life/">A day in the life</a><a href="/#start">Ask the AI</a></nav>
<main class="guide">
  <nav class="crumbs" aria-label="Breadcrumb">${crumbs.map((c, i) => i < crumbs.length - 1 ? `<a href="${c[1]}">${esc(c[0])}</a> › ` : esc(c[0])).join('')}</nav>
  <h1>${esc(h1)}</h1>
${body}
  <p class="updated">Written by ${esc(SITE.publisher)}. Last updated <time datetime="${TODAY}">${TODAY}</time>. Subject and admission rules can change: always confirm in the current JAMB brochure and on the school's own website. These are ideas to explore, not decisions; talk to a parent or teacher.</p>
</main>
<footer>
  <p class="made">Built with AI by ${esc(SITE.publisher)}</p>
  <p><a href="/careers/">All careers</a> · <a href="/subjects/">What can I become with my subjects?</a> · <a href="/">Get 3 careers that fit you</a> · <a href="/faq/">FAQ</a> · <a href="/about/">About / who built this</a> · <a href="/whats-new/">What's new</a> · <a href="https://apprentice-pathway-explorer.vercel.app/">Apprentice Pathways Explorer</a></p>
</footer>
</body>
</html>
`;
}

const card = c => `<li data-route="${c.route}"><a href="/careers/${c.slug}/"><img src="/images/careers/${c.pic}.svg" alt="" loading="lazy" width="64" height="64"><span><b>${esc(c.title)}</b><small>${esc(ROUTES[c.route][0])} · ${esc(c.time)}</small></span></a></li>`;
const cards = list => `<ul class="clist">${list.map(card).join('')}</ul>`;
const cta = `<div class="cta"><a class="btn" href="/#start">Not sure? Answer 9 questions and get 3 careers ✨</a><a class="btn line" href="/subjects/">What can I become with my subjects?</a></div>`;

// ---------- /careers/<slug>/ ----------
C.forEach(c => {
  const loc = `/careers/${c.slug}/`, name = c.title.replace(/ \(.*\)$/, ''), lower = name.toLowerCase();
  const h1 = `How to become ${an(name)} ${name} in Nigeria`;
  const subj = c.utme ? `For UTME (JAMB), the usual subjects are English plus ${c.utme.join(', ')}.` : (c.route === 'trade' ? 'You do not need UTME. English, Maths and a science or technical subject help you learn faster.' : 'Check the school\'s own requirements; English and Maths credits are almost always needed.');
  const needUni = c.route === 'uni' ? `The usual route is a university degree${/polytechnic|College/.test(c.routes.join(' ')) ? ', but there is also a polytechnic or college route' : ''}.` : c.route === 'poly' ? 'No. The usual route is a polytechnic, college or specialised school.' : 'No. This is a skilled trade: you learn through an apprenticeship, a technical college or a skills centre.';
  const step = (c.routes[1] || c.routes[0]).replace(/\.$/, '');
  const answer = `${c.does} To become one in Nigeria: ${step.charAt(0).toLowerCase() + step.slice(1)}. It takes ${c.time.charAt(0).toLowerCase() + c.time.slice(1)}.`;
  const faq = [[`How do I become ${an(name)} ${lower} in Nigeria?`, c.routes.join(' ')], [`What subjects do I need to become ${an(name)} ${lower}?`, subj],
    [`How long does it take to become ${an(name)} ${lower}?`, c.time + '.'], [`Do I need to go to university to become ${an(name)} ${lower}?`, needUni]];
  const related = C.filter(x => x.slug !== c.slug && (x.pic === c.pic || x.route === c.route)).sort((a, b) => (b.pic === c.pic) - (a.pic === c.pic)).slice(0, 6);
  write(`careers/${c.slug}/index.html`, page({
    rel: `careers/${c.slug}/index.html`, title: `${h1} | Naija Career Compass`, description: short(answer), h1,
    crumbs: [['Home', '/'], ['Careers', '/careers/'], [name, loc]],
    body: `
  <p class="answer-box"><b>Quick answer:</b> ${esc(answer)}</p>
  <div class="facts"><div><small>Route</small><b>${esc(ROUTES[c.route][0])}</b></div><div><small>How long</small><b>${esc(c.time)}</b></div><div><small>Professional body</small><b>${esc(c.body)}</b></div></div>
  <h2>What does ${an(name)} ${esc(lower)} do?</h2>
  <p>${esc(c.does)}</p>
  <h2>It may fit you if…</h2>
  <ul class="ticks">${c.fits.map(x => `<li>${esc(x)}</li>`).join('')}</ul>
  <h2>Subjects to focus on</h2>
  <p>${esc(subj)}</p>
  ${c.utme ? `<div class="chips">${['English Language'].concat(c.utme).map(s => `<span>${esc(s)}</span>`).join('')}</div>` : ''}
  <h2>The route, step by step</h2>
  <ol class="routes">${c.routes.map(r => `<li>${esc(r)}</li>`).join('')}</ol>
  ${c.ape ? `<p><a class="ape" href="${c.ape.url}" rel="noopener">🛠️ See the full training path, tools and starter kit for ${esc(c.ape.title)} on Apprentice Pathways →</a></p>` : ''}
  ${(() => { const j = jambFor(c), sc = scholarshipsFor(c), d = dayFor(c); if (!j.length && !sc.length && !d) return '';
    return `<h2>Exams, scholarships and a real day</h2><ul class="ticks">` +
      j.map(x => `<li><a href="/jamb-subjects/#${c.slug}">JAMB subjects for ${esc(x[0])}</a>${x[2] === 'varies' ? ' <span class="badge-check">varies: check</span>' : ''}</li>`).join('') +
      (sc.length ? `<li>Scholarships people on this route can look out for: ${sc.map(x => `<a href="/scholarships/#${x.id}">${esc(x.name.replace(/ \(.*\)$/, ''))}</a>`).join(', ')} <small>(check current dates)</small></li>` : '') +
      (d ? `<li><a href="/day-in-the-life/#${c.slug}">A day in the life of ${an(name)} ${esc(lower)}</a> <small>(illustrative)</small></li>` : '') + `</ul>`; })()}
  <h2>Try this week</h2>
  <p class="start">${esc(c.start)}</p>
  <h2>Questions students and parents ask</h2>
  ${faq.map(([q, a]) => `<details class="card"><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}
  ${cta}
  <h2>Careers like this</h2>${cards(related)}`,
    schema: [{ '@type': 'Article', headline: h1, description: answer, inLanguage: 'en-NG', datePublished: '2026-11-13', dateModified: TODAY, author: { '@id': URL_ + '/#org' }, publisher: { '@id': URL_ + '/#org' }, mainEntityOfPage: URL_ + loc, image: URL_ + '/images/og-image.png' },
      { '@type': 'FAQPage', mainEntity: faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) },
      { '@type': 'HowTo', name: h1, totalTime: undefined, step: c.routes.map((r, i) => ({ '@type': 'HowToStep', position: i + 1, text: r })) }]
  }));
  pages.push({ loc, pri: '0.8' });
});

// ---------- /careers/ and the three route pages ----------
write('careers/index.html', page({
  rel: 'careers/index.html', title: `${C.length} careers in Nigeria and how to get into each one | Naija Career Compass`,
  description: `Simple guides to ${C.length} careers for Nigerian students: what they do, subjects to take, and the real route through university, polytechnic or a skilled trade.`,
  h1: `${C.length} careers and the real Nigerian route into each`, crumbs: [['Home', '/'], ['Careers', '/careers/']],
  body: `
  <p class="answer-box"><b>Quick answer:</b> There are three main routes into a career in Nigeria: university (through JAMB/UTME), polytechnic or college (ND/HND, NCE, health and specialised colleges), and skilled trades (apprenticeship, technical college, NABTEB or NSQ). All three lead to good work.</p>
  <div class="filter" role="group" aria-label="Filter by route"><button class="on" data-f="all" type="button">All</button><button data-f="uni" type="button">University</button><button data-f="poly" type="button">Polytechnic or College</button><button data-f="trade" type="button">Skilled trade</button></div>
  ${cards(C)}
  ${cta}
  <script>document.querySelectorAll(".filter button").forEach(function (b) { b.onclick = function () { document.querySelectorAll(".filter button").forEach(function (x) { x.classList.toggle("on", x === b); }); document.querySelectorAll(".clist li").forEach(function (li) { li.hidden = b.dataset.f !== "all" && li.dataset.route !== b.dataset.f; }); }; });</script>`,
  schema: [{ '@type': 'CollectionPage', name: 'Careers in Nigeria', inLanguage: 'en-NG', dateModified: TODAY, hasPart: C.map(c => ({ '@type': 'Article', headline: c.title, url: URL_ + `/careers/${c.slug}/` })) }]
}));
pages.push({ loc: '/careers/', pri: '0.9' });
const ROUTE_TEXT = {
  uni: ['Careers you study for at university in Nigeria', 'University careers need 5 credits in WAEC or NECO, a UTME (JAMB) score and the university\'s own screening. Most degrees take 4 to 6 years, followed by NYSC.'],
  poly: ['Careers through polytechnic, college and specialised schools', 'Polytechnics award the ND (2 years) and HND (2 more years). Colleges of Education award the NCE. Colleges of health technology, aviation and maritime schools train for specific careers. Many are shorter and more practical than university.'],
  trade: ['Skilled trade careers in Nigeria', 'A skilled trade is learned through an apprenticeship, a technical college or a skills centre, and proved with a NABTEB certificate, Trade Test or National Skills Qualification (NSQ). You can start earning sooner and later own your business.']
};
Object.keys(ROUTES).forEach(k => {
  const [label, slug] = ROUTES[k], [h1, text] = ROUTE_TEXT[k], list = C.filter(c => c.route === k), loc = `/careers/${slug}/`;
  write(`careers/${slug}/index.html`, page({ rel: `careers/${slug}/index.html`, title: `${h1} | Naija Career Compass`, description: short(text), h1, crumbs: [['Home', '/'], ['Careers', '/careers/'], [label, loc]],
    body: `<p class="answer-box"><b>Quick answer:</b> ${esc(text)}</p>${cards(list)}${cta}`,
    schema: [{ '@type': 'FAQPage', mainEntity: [{ '@type': 'Question', name: h1 + ': how does this route work?', acceptedAnswer: { '@type': 'Answer', text: text + ' Examples: ' + list.slice(0, 8).map(c => c.title).join(', ') + '.' } }] }] }));
  pages.push({ loc, pri: '0.8' });
});

// ---------- /subjects/ ----------
const SUBJECTS = [['mathematics', 'Mathematics'], ['physics', 'Physics'], ['chemistry', 'Chemistry'], ['biology', 'Biology'], ['economics', 'Economics'], ['literature-in-english', 'Literature in English'],
  ['government', 'Government'], ['geography', 'Geography'], ['agricultural-science', 'Agricultural Science'], ['fine-art', 'Fine Art']];
const uses = (c, s) => (c.utme || []).some(u => u.includes(s));
SUBJECTS.forEach(([slug, s]) => {
  const list = C.filter(c => uses(c, s)), loc = `/subjects/${slug}/`;
  const text = `With ${s} you can study for careers such as ${list.slice(0, 6).map(c => c.title).join(', ')}${list.length > 6 ? ' and more' : ''}. ${s} is one of the usual UTME subjects for these courses.`;
  write(`subjects/${slug}/index.html`, page({ rel: `subjects/${slug}/index.html`, title: `Careers you can do with ${s} in Nigeria | Naija Career Compass`, description: short(text), h1: `Careers you can do with ${s}`,
    crumbs: [['Home', '/'], ['My subjects', '/subjects/'], [s, loc]],
    body: `<p class="answer-box"><b>Quick answer:</b> ${esc(text)}</p>${cards(list)}
  <p>Skilled trades do not need UTME subjects at all: see <a href="/careers/skilled-trades/">skilled trade careers</a>.</p>${cta}`,
    schema: [{ '@type': 'FAQPage', mainEntity: [{ '@type': 'Question', name: `What can I become if I am good at ${s}?`, acceptedAnswer: { '@type': 'Answer', text } }] }] }));
  pages.push({ loc, pri: '0.7' });
});
const finder = C.filter(c => c.utme).map(c => ({ s: c.slug, t: c.title, u: c.utme }));
write('subjects/index.html', page({
  rel: 'subjects/index.html', title: 'What can I become with my subjects? Subject-to-career finder | Naija Career Compass',
  description: 'Tick the subjects you are taking and see which careers they open in Nigeria, with the usual UTME (JAMB) subject combination for each.',
  h1: 'What can I become with my subjects?', crumbs: [['Home', '/'], ['My subjects', '/subjects/']],
  body: `
  <p class="answer-box"><b>How it works:</b> tick the subjects you take. We show the careers whose usual UTME subjects you already have. English is counted for everyone.</p>
  <div class="picker" id="picker">${SUBJECTS.map(([slug, s]) => `<label><input type="checkbox" value="${esc(s)}"> ${esc(s)}</label>`).join('')}</div>
  <p id="found" class="found" aria-live="polite">Tick at least two subjects.</p>
  <ul class="clist" id="results"></ul>
  <h2>Or pick one subject</h2>
  <p class="chiplinks">${SUBJECTS.map(([slug, s]) => `<a href="/subjects/${slug}/">${esc(s)}</a>`).join('')}</p>
  ${cta}
  <script>
  var DATA = ${json(finder)};
  var box = document.getElementById("picker"), out = document.getElementById("results"), found = document.getElementById("found");
  box.onchange = function () {
    var have = [].slice.call(box.querySelectorAll("input:checked")).map(function (i) { return i.value; });
    // A requirement like "Mathematics or Physics" is met if you take ANY subject named in it
    var ok = function (need) { return /^(Any|One other|Two subjects)/.test(need) || have.some(function (h) { return need.indexOf(h) > -1; }); };
    var hits = have.length < 2 ? [] : DATA.filter(function (c) { return c.u.every(ok) && c.u.some(function (n) { return have.some(function (h) { return n.indexOf(h) > -1; }); }); });
    found.textContent = have.length < 2 ? "Tick at least two subjects." : hits.length + " career" + (hits.length === 1 ? "" : "s") + " match your subjects. Skilled trades are open to everyone.";
    out.innerHTML = hits.map(function (c) { return '<li><a href="/careers/' + c.s + '/"><span><b>' + c.t + '</b><small>UTME: English, ' + c.u.join(", ") + '</small></span></a></li>'; }).join("");
  };
  </script>`,
  schema: [{ '@type': 'WebApplication', name: 'Subject-to-career finder', applicationCategory: 'EducationalApplication', operatingSystem: 'Any (web browser)', url: URL_ + '/subjects/', offers: { '@type': 'Offer', price: '0', priceCurrency: 'NGN' } }]
}));
pages.push({ loc: '/subjects/', pri: '0.9' });


// ---------- /class/ : Class Mode for teachers ----------
const EXAMPLES = {};
C.forEach(c => { (EXAMPLES[c.pic] = EXAMPLES[c.pic] || []).push([c.slug, c.title]); });
Object.keys(EXAMPLES).forEach(k => { EXAMPLES[k] = EXAMPLES[k].slice(0, 4); });
write('class/index.html', page({
  rel: 'class/index.html', title: 'Class Mode: see what careers your students are drawn to | Naija Career Compass',
  description: 'A free tool for Nigerian teachers and career masters. Make a class code, let students use Naija Career Compass, and see anonymous totals of the career families, routes and subjects your class is drawn to.',
  h1: 'Class Mode for teachers and career masters', crumbs: [['Home', '/'], ['Class Mode', '/class/']],
  body: `
  <p class="answer-box"><b>How it works:</b> make a class code (free, no sign-up). Write it on the board. Students type it in the Career Compass form. You see <b>anonymous totals only</b>: career families, routes and favourite subjects. No names. No answers. Nothing shows until 5 students have joined.</p>
  <div id="cm"><p>Loading…</p></div>
  <h2>Ideas for a career lesson</h2>
  <ol><li>Ask each student to pick their favourite subject and use Career Compass on a phone (pairs can share).</li><li>Show the class totals. Ask: <i>which family surprised you?</i></li><li>Pick the top three families. Open the example career pages below and read "how to get in" together.</li><li>Talk about trades as well as university. Both are real routes.</li></ol>
  <p class="note">Your class code works for ${60} days after it was last used. Students never see other students' choices.</p>
  ${cta}
  <script>
  (function () {
    var EX = ${json(EXAMPLES)}, box = document.getElementById("cm"), timer = null;
    var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };
    var api = "/api/class";
    function start() {
      box.innerHTML = '<p><button class="btn" id="mk" type="button">Make a class code</button></p><p>Already have one?</p><p><input id="have" maxlength="6" placeholder="Class code" autocapitalize="characters" style="padding:10px;border-radius:10px;border:1px solid #ccc;font:inherit;text-transform:uppercase"> <button class="btn line" id="go" type="button">Open my class</button></p><p id="msg" class="note"></p>';
      document.getElementById("mk").onclick = function () {
        fetch(api, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "create" }) }).then(function (r) { return r.json(); }).then(function (d) {
          if (!d.live) { document.getElementById("msg").textContent = "Class Mode is not switched on yet."; return; }
          if (!d.code) { document.getElementById("msg").textContent = d.error || "Please try again."; return; }
          history.replaceState(null, "", "?c=" + d.code); show(d.code);
        }).catch(function () { document.getElementById("msg").textContent = "Could not reach the server. Check your internet."; });
      };
      document.getElementById("go").onclick = function () { var c = document.getElementById("have").value.toUpperCase().replace(/[^A-Z0-9]/g, ""); if (c.length === 6) { history.replaceState(null, "", "?c=" + c); show(c); } else document.getElementById("msg").textContent = "A class code has 6 letters or numbers."; };
    }
    function bars(rows) { var max = Math.max.apply(null, rows.map(function (r) { return r.count; }).concat(1));
      return rows.map(function (r) { return '<div class="cbar"><span>' + esc(r.id) + '</span><i style="width:' + Math.max(4, Math.round(r.count / max * 100)) + '%"></i><b>' + r.count + '</b></div>'; }).join(""); }
    function show(code) {
      clearTimeout(timer);
      fetch(api + "?c=" + code).then(function (r) { return r.json(); }).then(function (d) {
        if (!d.live) { box.innerHTML = '<p class="note">Class Mode is not switched on yet.</p>'; return; }
        if (d.error) { box.innerHTML = '<p class="note">' + esc(d.error) + '</p><p><a href="/class/">Back</a></p>'; return; }
        if (!d.found) { box.innerHTML = '<p class="note">No class with code <b>' + esc(code) + '</b> was found. It may have expired after ' + 60 + ' days.</p><p><a href="/class/">Make a new class</a></p>'; return; }
        var link = location.origin + "/?class=" + d.code;
        var html = '<div class="ccode"><small>Your class code</small><b>' + d.code + '</b></div><p>Students open <b>' + esc(location.host) + '</b>, then type the code in the form (or open <a href="' + link + '">this link</a>, which fills it in).</p><p><b>' + d.joined + '</b> student' + (d.joined === 1 ? "" : "s") + ' joined so far.</p>';
        if (d.joined < d.minClass) html += '<p class="note">Totals appear when ' + d.minClass + ' students have joined, so nobody can be picked out. ' + (d.minClass - d.joined) + ' more to go.</p>';
        else {
          html += '<h2>Career families your class is drawn to</h2>' + bars(d.categories) + '<h2>Routes</h2>' + bars(d.routes) + '<h2>Favourite subjects</h2>' + bars(d.subjects);
          var top = d.categories.slice(0, 3);
          if (top.length) html += '<h2>Read about these together</h2>' + top.map(function (t) { return '<p><b>' + esc(t.id) + '</b>: ' + (EX[t.id] || []).map(function (e) { return '<a href="/careers/' + e[0] + '/">' + esc(e[1]) + '</a>'; }).join(", ") + '</p>'; }).join("");
        }
        box.innerHTML = html + '<p><button class="btn ghost" id="rf" type="button">Refresh</button> <a href="/class/">Different class</a></p>';
        document.getElementById("rf").onclick = function () { show(code); };
        timer = setTimeout(function () { show(code); }, 30000);
      }).catch(function () { box.innerHTML = '<p class="note">Could not load. Check your internet and <a href="">try again</a>.</p>'; });
    }
    var q = (location.search.match(/[?&]c=([A-Za-z0-9]{6})/) || [])[1];
    if (q) show(q.toUpperCase()); else start();
  })();
  </script>`,
  schema: [{ '@type': 'WebApplication', name: 'Class Mode: anonymous career totals for a class', applicationCategory: 'EducationalApplication', operatingSystem: 'Any', url: URL_ + '/class/', isAccessibleForFree: true, offers: { '@type': 'Offer', price: '0', priceCurrency: 'NGN' }, publisher: { '@id': URL_ + '/#org' } }]
}));
pages.push({ loc: '/class/', pri: '0.8' });

// ---------- /jamb-subjects/ : JAMB subject-combination helper (version 5) ----------
const JROWS = X.JAMB.map(([course, slug, status, note]) => { const c = C.find(x => x.slug === slug); if (!c || !c.utme) throw new Error('JAMB course without UTME subjects: ' + slug); return { course, slug, status, note, c }; });
const JAMB_NOTE = `<div class="confirm-box" role="note"><b>⚠️ Always confirm before you register.</b> Universities can change their rules, and some ask for a different third subject. Check the course in the official <a href="${X.JAMB_LINKS.ibass}" rel="noopener">JAMB brochure (IBASS)</a> on <a href="${X.JAMB_LINKS.site}" rel="noopener">jamb.gov.ng</a> <b>and</b> on the university's own admissions page.</div>`;
write('jamb-subjects/index.html', page({
  rel: 'jamb-subjects/index.html', title: 'JAMB subject combinations for popular courses | Naija Career Compass',
  description: `The usual UTME (JAMB) subjects for ${JROWS.length} popular courses in Nigeria: Medicine, Nursing, Law, Engineering, Computer Science, Accounting and more. Always confirm in the JAMB brochure.`,
  h1: 'JAMB subject combinations for popular courses', crumbs: [['Home', '/'], ['JAMB subjects', '/jamb-subjects/']],
  body: `
  <p class="answer-box"><b>Quick answer:</b> every UTME candidate writes <b>Use of English</b> plus <b>three subjects</b> that match the course. Below are the usual three for ${JROWS.length} popular courses. Courses marked <span class="badge-ok">well established</span> are the same in almost every university. Courses marked <span class="badge-check">varies: check</span> differ between universities.</p>
  ${JAMB_NOTE}
  <h2>Check my combination</h2>
  <p>Pick the three subjects you plan to write (English is counted for everyone). We show the courses below whose usual subjects you have.</p>
  <div class="combo"><label>Subject 1<select class="jsub"><option value="">Choose</option>${SUBJECTS.map(([, s]) => `<option>${esc(s)}</option>`).join('')}<option>Agricultural Science</option><option>CRS/IRS</option><option>History</option></select></label><label>Subject 2<select class="jsub"><option value="">Choose</option>${SUBJECTS.map(([, s]) => `<option>${esc(s)}</option>`).join('')}<option>Agricultural Science</option><option>CRS/IRS</option><option>History</option></select></label><label>Subject 3<select class="jsub"><option value="">Choose</option>${SUBJECTS.map(([, s]) => `<option>${esc(s)}</option>`).join('')}<option>Agricultural Science</option><option>CRS/IRS</option><option>History</option></select></label></div>
  <p id="jfound" class="found" aria-live="polite">Choose three subjects.</p>
  <h2>Find a course</h2>
  <label class="jsearch">Type a course<input id="jq" type="search" placeholder="e.g. Nursing, Law, Computer" autocomplete="off"></label>
  <div id="jlist">
  ${JROWS.map(r => `<details class="card jcourse" id="${r.slug}" data-course="${esc(r.course.toLowerCase())}" data-utme="${esc(JSON.stringify(r.c.utme))}">
    <summary><b>${esc(r.course)}</b> ${r.status === 'established' ? '<span class="badge-ok">well established</span>' : '<span class="badge-check">varies: check</span>'}</summary>
    <div class="chips">${['Use of English'].concat(r.c.utme).map(s => `<span>${esc(s)}</span>`).join('')}</div>
    ${r.note ? `<p>${esc(r.note)}</p>` : ''}
    ${r.status === 'varies' ? '<p class="check-line"><b>Universities differ for this course.</b> Confirm the exact subjects for <b>your</b> university before you register.</p>' : ''}
    <p><a href="/careers/${r.slug}/">How to become ${an(r.c.title)} ${esc(r.c.title)} →</a></p>
    <label class="jlink">Link you checked (university admissions page or brochure)<input type="url" inputmode="url" placeholder="https://..." data-link="${r.slug}"></label>
    <small class="jlink-msg" aria-live="polite"></small>
  </details>`).join('\n  ')}
  </div>
  <p class="note">Links you paste are saved on <b>this phone only</b>, so you can find what you checked later.</p>
  ${cta}
  <script>
  (function () {
    var rows = [].slice.call(document.querySelectorAll(".jcourse")), sels = [].slice.call(document.querySelectorAll(".jsub")), found = document.getElementById("jfound");
    var KEY = "cc-jamb-links", links = {}; try { links = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) {}
    var ARTS = ["Literature in English", "Government", "History", "Economics", "CRS/IRS", "Geography", "Fine Art"];
    function ok(need, have) {
      if (/^Any three Arts or Social Science/.test(need)) return have.every(function (h) { return ARTS.indexOf(h) > -1; });   // all three must be Arts or Social Science
      return /^(Any three subjects|One other|Two subjects)/.test(need) || have.some(function (h) { return need.indexOf(h) > -1; }) || (/^Two of/.test(need) && need.replace("Two of ", "").split(/,| and /).filter(function (x) { return have.some(function (h) { return x.indexOf(h) > -1; }); }).length >= 2); }
    function combo() {
      var have = sels.map(function (s) { return s.value; }).filter(Boolean);
      if (have.length < 3 || new Set(have).size < 3) { found.textContent = have.length < 3 ? "Choose three different subjects." : "Choose three different subjects."; rows.forEach(function (r) { r.classList.remove("match"); }); return; }
      var hits = rows.filter(function (r) { return JSON.parse(r.getAttribute("data-utme")).every(function (n) { return ok(n, have); }); });
      rows.forEach(function (r) { r.classList.toggle("match", hits.indexOf(r) > -1); });
      found.innerHTML = hits.length ? "✅ Your subjects usually fit: <b>" + hits.map(function (r) { return r.querySelector("summary b").textContent; }).join(", ") + "</b>. Confirm in the JAMB brochure." : "None of these courses usually matches. Check the brochure, or look at skilled trades and polytechnic routes.";
    }
    sels.forEach(function (s) { s.addEventListener("change", combo); });
    document.getElementById("jq").addEventListener("input", function () {
      var q = this.value.trim().toLowerCase();
      rows.forEach(function (r) { r.hidden = q && r.getAttribute("data-course").indexOf(q) === -1; });
    });
    document.querySelectorAll("[data-link]").forEach(function (i) {
      var k = i.getAttribute("data-link"); i.value = links[k] || "";
      i.addEventListener("change", function () {
        var v = i.value.trim(), msg = i.parentNode.nextElementSibling;
        if (v && !/^https:\\/\\/[^\\s<>"]+$/.test(v)) { msg.textContent = "Paste a full link that starts with https://"; return; }
        if (v) links[k] = v.slice(0, 300); else delete links[k];
        try { localStorage.setItem(KEY, JSON.stringify(links)); } catch (e) {}
        msg.innerHTML = v ? 'Saved on this phone. <a href="' + v.replace(/"/g, "%22") + '" target="_blank" rel="noopener noreferrer">Open it</a>' : "Removed.";
      });
    });
    function openHash() { if (!location.hash) return; var d = document.getElementById(location.hash.slice(1)); if (d && d.tagName === "DETAILS") { d.open = true; d.hidden = false; } }
    openHash(); window.addEventListener("hashchange", openHash);
  })();
  </script>`,
  schema: [{ '@type': 'FAQPage', mainEntity: JROWS.slice(0, 12).map(r => ({ '@type': 'Question', name: `What JAMB subjects do I need for ${r.course}?`, acceptedAnswer: { '@type': 'Answer', text: `Use of English plus ${r.c.utme.join(', ')}. ${r.status === 'varies' ? 'Universities differ for this course. ' : ''}Always confirm in the current JAMB brochure (IBASS) and on the university's website.` } })) }]
}));
pages.push({ loc: '/jamb-subjects/', pri: '0.9' });

// ---------- /scholarships/ : long-running scholarships linked to careers (version 5) ----------
const schCareers = C.filter(c => scholarshipsFor(c).length).map(c => ({ s: c.slug, t: c.title, ids: scholarshipsFor(c).map(x => x.id) }));
write('scholarships/index.html', page({
  rel: 'scholarships/index.html', title: 'Scholarships for Nigerian students by career | Naija Career Compass',
  description: 'Long-running Nigerian scholarships for university, polytechnic and college students, linked to the careers they suit, with official links. Always check current dates.',
  h1: 'Scholarships linked to careers', crumbs: [['Home', '/'], ['Scholarships', '/scholarships/']],
  body: `
  <p class="answer-box"><b>Quick answer:</b> most Nigerian scholarships are for students who are <b>already in</b> university, polytechnic or college, so the best thing you can do now is get strong WAEC/NECO results and the right UTME subjects. Below are long-running programmes that have run for many years. <b>Dates, amounts and rules change every year: check current dates on the official page.</b></p>
  <div class="confirm-box" role="note"><b>🚫 Never pay anyone to apply.</b> Real scholarship applications are free. Apply only through the official page, and ignore people on WhatsApp or social media who ask for money or your bank details.</div>
  <h2>Show scholarships for a career</h2>
  <label class="jsearch">Career<select id="scar"><option value="">All careers</option>${schCareers.map(c => `<option value="${c.s}">${esc(c.t)}</option>`).join('')}</select></label>
  <p id="sfound" class="found" aria-live="polite"></p>
  <div id="slist">
  ${X.SCHOLARSHIPS.map(x => `<article class="card sch" id="${x.id}">
    <h3>${esc(x.name)}</h3>
    <p class="sch-by">${esc(x.by)} · ${esc(x.since)}</p>
    <dl class="sch-dl"><dt>Who it is for</dt><dd>${esc(x.who)}</dd><dt>Level</dt><dd>${esc(x.level)}</dd>
    <dt>Deadline</dt><dd><b class="badge-check">Check current dates</b> It usually opens once a year; the date changes each year.</dd>
    <dt>Official link</dt><dd>${x.official ? `<a href="${x.official}" rel="noopener" target="_blank">${esc(x.official.replace('https://', ''))}</a>` : 'Not listed: we could not confirm one official page. Look for the current advert from the sponsor\'s own website or your university\'s notice board.'}</dd></dl>
    <p class="sch-careers"><b>Careers it can suit:</b> ${C.filter(c => scholarshipsFor(c).some(s => s.id === x.id)).slice(0, 12).map(c => `<a href="/careers/${c.slug}/">${esc(c.title)}</a>`).join(', ')}${C.filter(c => scholarshipsFor(c).some(s => s.id === x.id)).length > 12 ? ' and more' : ''}</p>
  </article>`).join('\n  ')}
  </div>
  <h2>Not listed here</h2>
  <p>State governments, Local Governments, companies and religious groups also give scholarships and bursaries, but their rules change often. Ask your school, your state's scholarship or bursary board, and your Local Government's education office. We only list programmes we could confirm have run for several years (checked ${esc(X.SCHOLARSHIPS_CHECKED)}).</p>
  ${cta}
  <script>
  (function () {
    var MAP = ${json(schCareers)}, sel = document.getElementById("scar"), cards = [].slice.call(document.querySelectorAll(".sch")), found = document.getElementById("sfound");
    sel.addEventListener("change", function () {
      var c = MAP.filter(function (x) { return x.s === sel.value; })[0];
      cards.forEach(function (k) { k.hidden = !!c && c.ids.indexOf(k.id) === -1; });
      found.textContent = c ? c.ids.length + " programme" + (c.ids.length === 1 ? "" : "s") + " can suit a " + c.t + ". Check current dates and rules." : "";
    });
    var q = new URLSearchParams(location.search).get("career"); if (q && MAP.some(function (x) { return x.s === q; })) { sel.value = q; sel.dispatchEvent(new Event("change")); }
  })();
  </script>`,
  schema: [{ '@type': 'ItemList', name: 'Long-running scholarships for Nigerian students', itemListElement: X.SCHOLARSHIPS.map((x, i) => ({ '@type': 'ListItem', position: i + 1, name: x.name, url: URL_ + '/scholarships/#' + x.id })) }]
}));
pages.push({ loc: '/scholarships/', pri: '0.8' });

// ---------- /day-in-the-life/ : illustrative profiles + "submit a real story" (version 5) ----------
const STORY_TEMPLATE = `My real story for Naija Career Compass (A day in the life)

Job title:
Town or state where I work (no home address):
How I trained (school, polytechnic, apprenticeship...):
My morning:
The middle of my day:
The end of my day:
The hard part of my job:
The best part of my job:
The school subject I use most:
One piece of advice for a JSS or SS student:

I agree that the ByteBusters team at Yewa College may publish this story on Naija Career Compass with my first name only. (Please do not include phone numbers, home addresses or photos of children.)`;
const mail = `mailto:${SITE.storyEmail || ''}?subject=${encodeURIComponent('My real story: A day in the life')}&body=${encodeURIComponent(STORY_TEMPLATE)}`;
write('day-in-the-life/index.html', page({
  rel: 'day-in-the-life/index.html', title: 'A day in the life: 8 careers in Nigeria | Naija Career Compass',
  description: 'What a normal working day can look like for a nurse, software developer, solar installer, civil engineer, fashion designer, teacher, agronomist and lab scientist.',
  h1: 'A day in the life: what the work feels like', crumbs: [['Home', '/'], ['A day in the life', '/day-in-the-life/']],
  body: `
  <p class="answer-box"><b>Please read:</b> these ${X.DAYS.length} stories are <b>illustrative examples</b> written by students to show what a normal day <i>can</i> look like. They are <b>not real people</b>, and real days differ from place to place. Do you work in one of these jobs? <a href="#real-story">Send us your real story</a>.</p>
  <p class="chiplinks">${X.DAYS.map(d => `<a href="#${d[0]}">${esc(C.find(c => c.slug === d[0]).title)}</a>`).join('')}</p>
  ${X.DAYS.map(([slug, intro, morning, midday, evening, hard, best, subject]) => { const c = C.find(x => x.slug === slug); if (!c) throw new Error('DAYS: unknown career ' + slug); return `<article class="card day" id="${slug}">
    <p class="illus">Illustrative example · not a real person</p>
    <h2>A day as ${an(c.title)} ${esc(c.title.toLowerCase())}</h2>
    <p class="day-intro">“${esc(intro)}”</p>
    <ol class="day-time"><li><b>Morning</b>${esc(morning)}</li><li><b>Middle of the day</b>${esc(midday)}</li><li><b>End of the day</b>${esc(evening)}</li></ol>
    <div class="facts"><div><small>The hard part</small><b>${esc(hard)}</b></div><div><small>The best part</small><b>${esc(best)}</b></div><div><small>Subject I use most</small><b>${esc(subject)}</b></div></div>
    <p><a href="/careers/${slug}/">How to become ${an(c.title)} ${esc(c.title)} →</a></p>
  </article>`; }).join('\n  ')}
  <h2 id="real-story">Are you a professional? Send a real story</h2>
  <p>We would love real stories from nurses, mechanics, tailors, engineers, teachers and others, especially in Ogun State. Copy the questions below, answer them, and send them by email or WhatsApp to the ByteBusters team at Yewa College (or to the teacher who shared this page). We will ask your permission before anything is published, and we publish first names only.</p>
  <textarea id="story" class="story" rows="14" readonly aria-label="Story template">${esc(STORY_TEMPLATE)}</textarea>
  <div class="cta"><button class="btn" type="button" id="copyStory">📋 Copy the questions</button><a class="btn line" href="${esc(mail)}">✉️ Send by email</a><a class="btn line" href="https://wa.me/?text=${encodeURIComponent(STORY_TEMPLATE)}" target="_blank" rel="noopener">💬 Send on WhatsApp</a></div>
  <p class="note">Students: please do not send your own phone number. Ask the professional to send their story themselves.</p>
  ${cta}
  <script>document.getElementById("copyStory").onclick = function () { var t = document.getElementById("story"); (navigator.clipboard ? navigator.clipboard.writeText(t.value) : Promise.reject()).catch(function () { t.select(); document.execCommand("copy"); }); this.textContent = "Copied ✓"; };</script>`,
  schema: [{ '@type': 'CollectionPage', name: 'A day in the life: illustrative career profiles', description: 'Illustrative first-person examples written by students; not real people.', hasPart: X.DAYS.map(d => ({ '@type': 'CreativeWork', name: 'A day as ' + C.find(c => c.slug === d[0]).title + ' (illustrative)', url: URL_ + '/day-in-the-life/#' + d[0] })) }]
}));
pages.push({ loc: '/day-in-the-life/', pri: '0.7' });

// ---------- /whats-new/ ----------
write('whats-new/index.html', page({
  rel: 'whats-new/index.html', title: "What's new in Naija Career Compass AI",
  description: 'New: a JAMB subject-combination helper, scholarships linked to each career, and "a day in the life" profiles with a way for professionals to send real stories.',
  h1: "What's new in Naija Career Compass AI", crumbs: [['Home', '/'], ["What's new", '/whats-new/']],
  body: `
  <p class="answer-box"><b>Version 5 (November 2026):</b> three new features, added by <b>the ByteBusters team at Yewa College</b>, Ilaro, Ogun State. They work on a basic phone, need no account and collect no personal details.</p>
  <h2>📝 JAMB subject-combination helper</h2>
  <p>The usual UTME subjects for ${JROWS.length} popular courses, each marked <b>well established</b> or <b>varies: check</b>. Pick your three subjects to see which courses usually fit, and save the brochure or university link you checked (on your phone only). Every page says to confirm in the official JAMB brochure.</p>
  <h2>🎓 Scholarships linked to careers</h2>
  <p>${X.SCHOLARSHIPS.length} long-running Nigerian programmes, each with who it is for, its official link (where we could confirm one) and a clear "check current dates" note, and a warning never to pay anyone. Every career page now lists the scholarships that can suit it.</p>
  <h2>🌅 A day in the life</h2>
  <p>${X.DAYS.length} short first-person profiles, clearly labelled <b>illustrative</b>, so students can picture the work. Professionals can send a real story by email or WhatsApp using a ready template.</p>
  <div class="cta"><a class="btn" href="/jamb-subjects/">JAMB subjects</a><a class="btn line" href="/scholarships/">Scholarships</a><a class="btn line" href="/day-in-the-life/">A day in the life</a></div>`,
  schema: [{ '@type': 'WebPage', name: "What's new in Naija Career Compass AI", url: URL_ + '/whats-new/', datePublished: '2026-11-28', dateModified: TODAY, publisher: { '@id': URL_ + '/#org' }, creator: { '@type': 'Organization', name: 'ByteBusters team at Yewa College, Ilaro' } }]
}));
pages.push({ loc: '/whats-new/', pri: '0.5' });

// ---------- /faq/ : what Nigerian students search about careers (AEO) ----------
const HOME_FAQ = (() => { try {
  const h = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  for (const m of h.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    const g = JSON.parse(m[1])['@graph'] || []; const f = g.find(x => x['@type'] === 'FAQPage');
    if (f) return Object.fromEntries(f.mainEntity.map(q => [q.name, q.acceptedAnswer.text]));
  } } catch (e) {} return {}; })();
const CR = slug => C.find(c => c.slug === slug);
const utmeQ = (slug, label) => { const c = CR(slug); return [`What JAMB (UTME) subjects do I need for ${label}?`, `English is always one of the four UTME subjects. For ${label}, the other three are usually ${c.utme.join(', ')}. ${c.time.charAt(0).toUpperCase() + c.time.slice(1)}. Always confirm in the current JAMB brochure.`, `/careers/${slug}/`]; };
const fromHome = (q, href) => HOME_FAQ[q] ? [q, HOME_FAQ[q], href] : null;
const SITE_FAQ = [
  fromHome('How do I choose a career in Nigeria as a secondary school student?', '/#start'),
  utmeQ('medical-doctor', 'Medicine (to become a doctor)'),
  utmeQ('nurse', 'Nursing'),
  ['What JAMB (UTME) subjects do I need for Law?', `English is always one of the four UTME subjects. For Law, the other three are usually ${CR('lawyer').utme.join(', ')}. Always confirm in the current JAMB brochure.`, '/careers/lawyer/'],
  utmeQ('software-developer', 'Computer Science (to become a software developer)'),
  ['What is the difference between university, polytechnic and college of education?', 'Universities award degrees such as BSc or BEng. Polytechnics award the National Diploma (ND) and Higher National Diploma (HND), with more hands-on training. Colleges of education award the NCE, mainly for people who want to teach. Admission into all three is through JAMB.', '/careers/polytechnic-and-college/'],
  ['Can I go to university after ND or NCE?', 'Yes. Holders of ND, NCE and some other certificates can apply to university through JAMB Direct Entry, often into 200 level. Each university sets its own grade and subject rules, so check the current JAMB brochure and the university\'s website.', '/careers/university/'],
  ['What can I become if I am in the Arts or Commercial class?', 'Many careers welcome Arts and Commercial students, for example lawyer, journalist, accountant, banker, economist, teacher and entrepreneur. Use "What can I become with my subjects?" to see careers that match the subjects you take.', '/subjects/'],
  ['What is NABTEB?', 'NABTEB is the National Business and Technical Examinations Board. It runs exams for technical and business subjects, and its certificates (including Modular Trade Certificates) are a recognised route into skilled trades and further study.', '/careers/skilled-trades/'],
  fromHome('Are skilled trades a good career in Nigeria?', '/careers/skilled-trades/'),
  fromHome('How do I talk to my parents about a career?', '/'),
  fromHome('Is Naija Career Compass AI free and private?', '/'),
  ['Who built Naija Career Compass AI?', "Students of the ByteBusters coding club (Generative AI Team) at Yewa College, Ilaro, Ogun State, built it. ByteBusters is a programme of Odu'a Investment Foundation.", '/about/']
].filter(Boolean);
write('faq/index.html', page({
  rel: 'faq/index.html', title: 'Career questions for Nigerian students | Naija Career Compass',
  description: 'Simple answers for Nigerian students: choosing a career, JAMB subjects for medicine, law and computer science, polytechnic vs university, NABTEB.',
  h1: 'Career questions and answers', crumbs: [['Home', '/'], ['FAQ', '/faq/']],
  body: `
  <p class="answer-box"><b>Quick answer:</b> start with what you enjoy and are good at, pick 2 or 3 careers to explore, check the subjects each one needs, and talk to a parent or teacher. University, polytechnic, college and skilled trades are all real routes.</p>
  ${SITE_FAQ.map(([q, a, href]) => `<h2>${esc(q)}</h2>\n  <p>${esc(a)} <a href="${href}">Read more</a></p>`).join('\n  ')}
  ${cta}`,
  schema: [{ '@type': 'FAQPage', mainEntity: SITE_FAQ.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) }]
}));
pages.push({ loc: '/faq/', pri: '0.8' });

// ---------- /about/ : who built this ----------
write('about/index.html', page({
  rel: 'about/index.html', title: 'About Naija Career Compass AI and who built it',
  description: "Naija Career Compass AI was built by students of the ByteBusters coding club at Yewa College, Ilaro, Ogun State, a programme of Odu'a Investment Foundation.",
  h1: 'About Naija Career Compass AI: who built this', crumbs: [['Home', '/'], ['About', '/about/']],
  body: `
  <p class="answer-box"><b>In short:</b> a free career guide for Nigerian secondary school students, made by students in the ByteBusters coding club at Yewa College, Ilaro, Ogun State. ByteBusters is run by Odu'a Investment Foundation.</p>
  <h2>Why we built it</h2>
  <p>Many of us choose subjects and careers without knowing what a job really involves, which UTME subjects it needs, or that polytechnics, colleges and skilled trades are good routes too. We wanted a free tool where any student can say what they enjoy and get three careers with real Nigerian routes.</p>
  <h2>Who built it</h2>
  <p>A team of students at the Yewa College ByteBusters centre, the Generative AI Team, planned the questions, wrote the career guides and coded the website, with guidance from the ByteBusters Centre Lead. We learned HTML, CSS, JavaScript, how to write safe and fair AI prompts, how to put a website online with Vercel, and how search engines read pages.</p>
  <h2>What it is, and is not</h2>
  <ul>
    <li>It is a free tool that gives ideas to explore, not decisions.</li>
    <li>It is <b>not</b> JAMB or a school. Subject and admission rules can change: always confirm in the current JAMB brochure and on the school's own website.</li>
  </ul>
  <p>Read the <a href="/faq/">questions and answers</a> or <a href="/#start">get 3 careers that fit you</a>.</p>`,
  schema: [{ '@type': 'AboutPage', name: 'About Naija Career Compass AI', url: URL_ + '/about/', publisher: { '@id': URL_ + '/#org' } }]
}));
pages.push({ loc: '/about/', pri: '0.5' });

// ---------- 404.html : friendly "page not found" (not in the sitemap) ----------
write('404.html', page({
  rel: '404.html', title: 'Page not found | Naija Career Compass',
  description: 'This page could not be found. Browse all careers, find careers for your subjects, or ask the AI for 3 careers that fit you.',
  h1: 'Sorry, we could not find that page', crumbs: [['Home', '/'], ['Page not found', '/404.html']],
  body: `
  <p>The link may be old or mistyped. Try one of these:</p>
  <ul><li><a href="/">Get 3 careers that fit you</a></li><li><a href="/careers/">All careers</a></li><li><a href="/subjects/">What can I become with my subjects?</a></li><li><a href="/faq/">FAQ</a></li></ul>`
}).replace('<meta name="robots" content="index, follow', '<meta name="robots" content="noindex, follow').replace(/\n<link rel="canonical"[^>]*>/, ''));

// ---------- sitemap.xml, llms.txt, verification codes ----------
write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages.map(p => `  <url><loc>${URL_}${p.loc}</loc><lastmod>${TODAY}</lastmod><priority>${p.pri}</priority></url>`).join('\n')}\n</urlset>\n`);
// keep only the hand-written top of llms.txt; the Tools and Career guides sections are made again here
const llms = fs.readFileSync(path.join(ROOT, 'llms.txt'), 'utf8').split(/\n## (?:Tools|Career guides)/)[0].trimEnd();
write('llms.txt', llms + `\n\n## Tools\n- [Class Mode](${URL_}/class/): free class codes for teachers; students use the career form and teachers see anonymous totals of career families, routes and subjects (no names or answers stored)\n\n## Career guides (one page each: what they do, subjects, route, how long)\n${C.map(c => `- [How to become ${an(c.title)} ${c.title} in Nigeria](${URL_}/careers/${c.slug}/): ${c.does} Route: ${ROUTES[c.route][0]}. Time: ${c.time}.${c.utme ? ' UTME: English, ' + c.utme.join(', ') + '.' : ''}`).join('\n')}\n\n## More tools\n- [What can I become with my subjects?](${URL_}/subjects/): tick your subjects, see matching careers\n- [JAMB subject combinations](${URL_}/jamb-subjects/): usual UTME subjects for ${X.JAMB.length} popular courses, marked "established" or "varies: check"; always confirm in the JAMB brochure\n- [Scholarships by career](${URL_}/scholarships/): long-running Nigerian scholarship programmes with official links; dates change every year\n- [A day in the life](${URL_}/day-in-the-life/): illustrative first-person profiles of ${X.DAYS.length} careers\n- [All careers by route](${URL_}/careers/)\n`);
let index = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').replace(/\n<meta name="(google-site-verification|msvalidate\.01)"[^>]*>/g, '');
if (VERIFY) index = index.replace(/(<link rel="canonical"[^>]*>)/, '$1' + VERIFY);
fs.writeFileSync(path.join(ROOT, 'index.html'), index);
// ---------- llms-full.txt (GEO): the summary plus every answer in full ----------
write('llms-full.txt', fs.readFileSync(path.join(ROOT, 'llms.txt'), 'utf8') + `
## About
Naija Career Compass AI was built by students of the ByteBusters coding club (Generative AI Team) at Yewa College, Ilaro, Ogun State, Nigeria, with guidance from the ByteBusters Centre Lead. ByteBusters is a programme of Odu'a Investment Foundation. Free, no sign-up. About page: ${URL_}/about/

## Questions and answers (also at ${URL_}/faq/)
${SITE_FAQ.map(([q, a]) => `### ${q}\n${a}\n`).join('\n')}
## Every career in full
${C.map(c => `### ${c.title}\n${c.does} Route: ${ROUTES[c.route][0]}. ${c.utme ? 'UTME subjects: English plus ' + c.utme.join(', ') + '. ' : ''}How long: ${c.time}. Ways in: ${c.routes.join(' ')}\nGuide: ${URL_}/careers/${c.slug}/\n`).join('\n')}`);
console.log('Done:', pages.length, 'pages in the sitemap (' + C.length + ' careers).');
