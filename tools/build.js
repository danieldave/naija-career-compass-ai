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

function page({ rel, title, description, h1, crumbs, body, schema }) {
  const url = URL_ + '/' + rel.replace(/index\.html$/, '');
  if (title.length > 68) title = title.replace(/ \| Naija Career Compass$/, '');
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
<nav class="gnav" aria-label="Main"><a href="/careers/">All careers</a><a href="/subjects/">My subjects</a><a href="/careers/university/">University</a><a href="/careers/polytechnic-and-college/">Polytechnic</a><a href="/careers/skilled-trades/">Trades</a><a href="/#start">Ask the AI</a></nav>
<main class="guide">
  <nav class="crumbs" aria-label="Breadcrumb">${crumbs.map((c, i) => i < crumbs.length - 1 ? `<a href="${c[1]}">${esc(c[0])}</a> › ` : esc(c[0])).join('')}</nav>
  <h1>${esc(h1)}</h1>
${body}
  <p class="updated">Written by ${esc(SITE.publisher)}. Last updated <time datetime="${TODAY}">${TODAY}</time>. Subject and admission rules can change: always confirm in the current JAMB brochure and on the school's own website. These are ideas to explore, not decisions; talk to a parent or teacher.</p>
</main>
<footer>
  <p class="made">Built with AI by ${esc(SITE.publisher)}</p>
  <p><a href="/careers/">All careers</a> · <a href="/subjects/">What can I become with my subjects?</a> · <a href="/">Get 3 careers that fit you</a> · <a href="https://apprentice-pathway-explorer.vercel.app/">Apprentice Pathways Explorer</a></p>
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

// ---------- sitemap.xml, llms.txt, verification codes ----------
write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages.map(p => `  <url><loc>${URL_}${p.loc}</loc><lastmod>${TODAY}</lastmod><priority>${p.pri}</priority></url>`).join('\n')}\n</urlset>\n`);
const llms = fs.readFileSync(path.join(ROOT, 'llms.txt'), 'utf8').split('\n## Career guides')[0].trimEnd();
write('llms.txt', llms + `\n\n## Career guides (one page each: what they do, subjects, route, how long)\n${C.map(c => `- [How to become ${an(c.title)} ${c.title} in Nigeria](${URL_}/careers/${c.slug}/): ${c.does} Route: ${ROUTES[c.route][0]}. Time: ${c.time}.${c.utme ? ' UTME: English, ' + c.utme.join(', ') + '.' : ''}`).join('\n')}\n\n## Tools\n- [What can I become with my subjects?](${URL_}/subjects/): tick your subjects, see matching careers\n- [All careers by route](${URL_}/careers/)\n`);
let index = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').replace(/\n<meta name="(google-site-verification|msvalidate\.01)"[^>]*>/g, '');
if (VERIFY) index = index.replace(/(<link rel="canonical"[^>]*>)/, '$1' + VERIFY);
fs.writeFileSync(path.join(ROOT, 'index.html'), index);
console.log('Done:', pages.length, 'pages in the sitemap (' + C.length + ' careers).');
