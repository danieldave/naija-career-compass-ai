/* =====================================================================
   script.js  -  THE WAITER (runs in the browser)
   Reads the form, shows what we send, asks our server, draws the cards.
   ===================================================================== */

// PART 1: the boxes we use
const form = document.getElementById("form");
const output = document.getElementById("output");
const errorBox = document.getElementById("error");
const goButton = document.getElementById("go");
const printBtn = document.getElementById("printBtn");
const NAMES = { University: "University route", "Polytechnic or College": "Polytechnic / College route", "Skilled trade": "Skilled trade route" };

function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }

// PART 1b: A MOVING PICTURE-SIGN for each career family (no photos: quick to load, works with no internet)
const ICONS = { health: "🩺", engineering: "🏗️", computing: "💻", agriculture: "🌱", fashion: "🧵", food: "🍲", electrical: "⚡", mechanic: "🔧",
  building: "🧱", arts: "🎨", media: "🎥", teaching: "📚", law: "⚖️", business: "📈", science: "🔬", sports: "⚽", music: "🎵" };
function iconTag(cat) { return '<span class="big" aria-hidden="true">' + (ICONS[cat] || "🧭") + '</span><i></i><i></i><i></i>'; }

// PART 1c: NIGHT MODE. The button switches the colours and the page remembers the choice.
const themeBtn = document.getElementById("themeBtn");
function isDark() {
  const t = document.documentElement.dataset.theme;
  return t ? t === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
}
themeBtn.addEventListener("click", () => {
  const next = isDark() ? "light" : "dark";
  document.documentElement.dataset.theme = next;
  try { localStorage.setItem("cc-theme", next); } catch (e) {}
});

// PART 1d: the 3 subject boxes share one list, and the hero line changes its career every 2 seconds
const subjectBoxes = [1, 2, 3].map(n => document.getElementById("subject" + n));
subjectBoxes.slice(1).forEach(box => { box.innerHTML = box.innerHTML + subjectBoxes[0].innerHTML.replace(/<option value="">.*?<\/option>/, ""); });
const rot = document.getElementById("rot");
const IDEAS = ["software developer", "nurse", "solar installer", "lawyer", "fashion designer", "civil engineer", "chef", "teacher", "welder", "journalist"];
let idea = 0;
if (rot && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) setInterval(() => {
  rot.classList.add("out");
  setTimeout(() => { idea = (idea + 1) % IDEAS.length; rot.textContent = IDEAS[idea]; rot.classList.remove("out"); }, 300);
}, 2200);
// things slide in gently when you scroll to them
if ("IntersectionObserver" in window) {
  const seen = new IntersectionObserver(list => list.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in"); seen.unobserve(e.target); } }), { threshold: 0.12 });
  document.querySelectorAll(".section, .problem, .steps li, .tile, .faq details, .clist li").forEach(el => { el.classList.add("reveal"); seen.observe(el); });
}

// PART 2: collect the answers into one list (an object)
function readAnswers() {
  const answers = {};
  // the 3 subject boxes become one answer, for example "Physics, Mathematics and Biology"
  const picked = subjectBoxes.map(b => b.value).filter(Boolean);
  document.getElementById("subject").value = picked.length === 3 ? picked[0] + ", " + picked[1] + " and " + picked[2] : "";
  for (const q of Rules.QUESTIONS) answers[q.id] = document.getElementById(q.id).value.trim();
  return answers;
}

// PART 3: show exactly what the AI will receive
function showSent(sent) {
  if (!document.getElementById("sentInput")) return;   // only the students' learning page shows this
  document.getElementById("sentRules").textContent = sent.instructions;
  document.getElementById("sentInput").textContent = sent.input;
  document.getElementById("sentModel").textContent = sent.model ? "AI model: " + sent.model : "Demo mode: nothing was sent to an AI.";
}

// PART 4: turn the JSON into career cards with pictures

// VERSION 3: trade and polytechnic careers link to their training page on Apprentice Pathways
function apeLink(c) {
  if (c.routeType === "University" || !window.ApeLinks) return "";
  const t = ApeLinks.find(c.title);
  return t ? '<a class="ape" href="' + t.url + '" target="_blank" rel="noopener">🛠️ See the full training path for ' + esc(t.title) + ' on Apprentice Pathways →</a>' : "";
}

let lastResult = null;
function drawCards(result) {
  lastResult = result;
  output.innerHTML = "";
  result.careers.forEach((c, i) => {
    const pic = Rules.CATEGORIES.includes(c.category) ? c.category : "science";
    const card = document.createElement("article");
    card.className = "career";
    card.style.animationDelay = (i * 0.12) + "s";
    card.innerHTML =
      '<div class="pic p-' + pic + '">' + iconTag(pic) + '<span class="n">' + (i + 1) + '</span></div>' +
      '<div class="body">' +
      '<div class="row"><h3>' + esc(c.title) + '</h3><span class="badge ' + ({ "University": "uni", "Polytechnic or College": "poly", "Skilled trade": "trade" }[c.routeType] || "uni") + '">' + esc(NAMES[c.routeType] || c.routeType) + '</span></div>' +
      '<p class="why"><b>Why we suggest it:</b> ' + esc(c.why) + '</p>' +
      '<p class="label">Subjects to focus on</p><div class="chips">' + c.subjects.map(s => '<span>' + esc(s) + '</span>').join("") + '</div>' +
      '<p class="label">Nigerian routes into it</p><ol class="routes">' + c.routes.map(r => '<li>' + esc(r) + '</li>').join("") + '</ol>' +
      '<p class="start"><b>Try this week:</b> ' + esc(c.startNow) + '</p>' +
      apeLink(c) +
      '<button class="btn line parentsBtn" type="button" data-i="' + i + '">💬 Talk to my parents</button>' +
      '<div class="parents" hidden></div>' +
      '</div>';
    output.appendChild(card);
  });
  printBtn.hidden = false;
}

// PART 5: when the button is pressed
form.addEventListener("submit", async (event) => {
  event.preventDefault();
  errorBox.textContent = "";
  const answers = readAnswers();

  const three = subjectBoxes.map(b => b.value);
  if (three.some(v => !v)) { errorBox.textContent = "Please choose your 3 best subjects."; return; }
  if (new Set(three).size < 3) { errorBox.textContent = "Please choose 3 different subjects."; return; }
  const problem = Rules.validate(answers);            // the check, before we spend money on the AI
  if (problem) { errorBox.textContent = problem; return; }

  showSent({ instructions: Rules.INSTRUCTIONS, input: Rules.buildInput(answers), model: "" });
  goButton.disabled = true;
  goButton.textContent = "Thinking...";
  output.innerHTML = '<div class="loading"><img src="images/logo.svg" alt=""><p>The AI is reading your answers...</p></div>';

  let data = null;
  try {
    const r = await fetch(window.CC_API, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ answers: answers, lang: document.getElementById("lang").value })
    });
    if (r.status === 404 || r.status === 405) throw new Error("no server");          // e.g. GitHub Pages: no kitchen here
    data = await r.json();
    if (!r.ok) { errorBox.textContent = data.error || "Something went wrong."; output.innerHTML = ""; return; }
  } catch (e) {
    data = { demo: true, sent: { instructions: Rules.INSTRUCTIONS, input: Rules.buildInput(answers), model: "" }, result: Rules.demo(answers) };
  } finally {
    goButton.disabled = false;
    goButton.textContent = "Show me 3 careers ✨";
  }

  document.getElementById("demoBanner").hidden = !data.demo;   // honest banner
  showSent(data.demo ? Object.assign({}, data.sent, { model: "" }) : data.sent);
  drawCards(data.result);
  shareWithClass(data.result, subjectBoxes[0].value);
  if (window.innerWidth < 860) output.scrollIntoView({ behavior: "smooth" });
});

printBtn.addEventListener("click", () => window.print());

// VERSION 3: "Talk to my parents" - a respectful message in the parents' language
const LANG_OPTIONS = document.getElementById("lang").innerHTML;
output.addEventListener("click", async (e) => {
  const open = e.target.closest(".parentsBtn");
  if (open) {
    const box = open.nextElementSibling;
    box.hidden = !box.hidden;
    if (!box.innerHTML) {
      box.innerHTML = '<label>My parents speak <select class="pLang">' + LANG_OPTIONS + '</select></label>' +
        '<button class="btn pGo" type="button" data-i="' + open.dataset.i + '">Write the message</button><div class="pOut" aria-live="polite"></div>';
      box.querySelector(".pLang").value = document.getElementById("lang").value;
    }
    return;
  }
  const go = e.target.closest(".pGo");
  if (go) {
    const box = go.parentElement, out = box.querySelector(".pOut");
    const career = lastResult.careers[+go.dataset.i];
    go.disabled = true; go.textContent = "Writing...";
    let data;
    try {
      const r = await fetch(window.CC_API, { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "parents", lang: box.querySelector(".pLang").value, career }) });
      if (r.status === 404 || r.status === 405) throw new Error("no server");
      data = await r.json();
      if (!r.ok) { out.innerHTML = '<p class="error">' + esc(data.error || "Something went wrong.") + '</p>'; return; }
    } catch (err) {
      data = { demo: true, result: Rules.parentDemo(career) };
    } finally { go.disabled = false; go.textContent = "Write the message again"; }
    const m = data.result;
    const text = m.message + "\n\n" + m.points.map(p => "• " + p).join("\n");
    out.innerHTML = (data.demo ? '<p class="small">Demo mode: a sample written by our code.</p>' : "") +
      '<p class="pMsg">' + esc(m.message) + '</p><ul class="pPts">' + m.points.map(p => '<li>' + esc(p) + '</li>').join("") + '</ul>' +
      '<div class="pAct"><button class="btn line pCopy" type="button">Copy</button>' +
      '<a class="btn" target="_blank" rel="noopener" href="https://wa.me/?text=' + encodeURIComponent(text) + '">Send on WhatsApp</a></div>';
    out.querySelector(".pCopy").onclick = (ev) => {
      (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject()).then(() => ev.target.textContent = "Copied ✓", () => ev.target.textContent = "Select and copy the text");
    };
  }
});


// CLASS MODE: if the student typed a class code, add ONLY labels (career family, route type, subject) to the class totals
function shareWithClass(result, subject) {
  const code = (document.getElementById("classCode").value || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (code.length !== 6 || !result || !Array.isArray(result.careers)) return;
  const note = document.createElement("p");
  note.className = "classnote"; note.setAttribute("role", "status");
  output.appendChild(note);
  fetch((window.CC_API || "api/ask").replace(/ask$/, "class"), { method: "POST", headers: { "Content-Type": "application/json" }, keepalive: true,
    body: JSON.stringify({ action: "submit", code: code, subject: subject, careers: result.careers.map(c => ({ category: c.category, routeType: c.routeType })) }) })
    .then(r => r.json())
    .then(d => { note.textContent = d.counted ? "✅ Added to your class totals (no name, no answers)." : d.found === false ? "That class code was not found. Ask your teacher to check it." : "Class totals are not available right now."; })
    .catch(() => { note.textContent = "Class totals are not available right now."; });
}

// a teacher's link (?class=CODE) fills the class code in
try { const q = (location.search.match(/[?&]class=([A-Za-z0-9]{6})/) || [])[1]; if (q) document.getElementById("classCode").value = q.toUpperCase(); } catch (e) {}
