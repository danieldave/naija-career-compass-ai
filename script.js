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

// PART 1b: REAL PHOTOS for each career family (free photos from unsplash.com).
// To change a photo: find a better one on unsplash.com, copy its "photo-..." code and paste it here.
// If a photo cannot load (no internet), our own drawing in images/careers/ shows instead.
const PHOTOS = {
  health: "photo-1666887360921-85952a86894f",       // health worker in scrubs with a stethoscope
  engineering: "photo-1621905252507-b35492cc74b4",  // engineer in a yellow hard hat
  computing: "photo-1531482615713-2afd69097998",    // two people coding at a computer
  agriculture: "photo-1509099381441-ea3c0cf98b94",  // woman planting on a farm
  fashion: "photo-1633655442356-ab2dbc69c772",      // tailor working on cloth
  food: "photo-1709837167686-a2e33aad1bf0",         // chef with a wooden spoon
  electrical: "photo-1621905251189-08b45d6a269e",   // electrician installing wiring
  mechanic: "photo-1615906655593-ad0386982a0f",     // mechanic working on a car engine
  building: "photo-1669127707497-fb31ace516a1",     // builders working on a building
  arts: "photo-1447758902204-48010b87c24d",         // sculptor in his studio
  media: "photo-1621024994278-e409544f4085",        // photographer holding a camera
  teaching: "photo-1732305830025-34ec2db2b25c",     // teacher with students in a classroom
  law: "photo-1589994965851-a8f479c573a9",          // Lady Justice with scales and sword
  business: "photo-1573164574572-cb89e39749b4",     // business team at a table with laptops
  science: "photo-1569830904560-2afd7062213c",      // scientist doing an experiment in a lab
  sports: "photo-1652665314612-c48e10a01598",       // young men playing football
  music: "photo-1595971294624-80bcf0d7eb24"         // musician playing the guitar
};
function photoTag(cat, alt) {
  const fallback = "images/careers/" + cat + ".svg";
  return '<img src="https://images.unsplash.com/' + PHOTOS[cat] + '?auto=format&fit=crop&w=900&h=450&q=75" alt="' + alt + '" loading="lazy" ' +
    'onerror="this.onerror=null;this.src=\'' + fallback + '\'">';
}

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

// PART 1d: fill the hero photos and the 5-part prompt formula (from rules.js, the real prompt)
document.querySelectorAll(".collage img").forEach(img => {
  const cat = img.dataset.cat;
  img.onerror = () => { img.onerror = null; img.src = "images/careers/" + cat + ".svg"; };
  img.src = "https://images.unsplash.com/" + PHOTOS[cat] + "?auto=format&fit=crop&w=500&h=500&q=75";
});
const COLOURS = ["#F5B300", "#E8338B", "#3B23A6", "#FF7AB8", "#7A1F86"];
document.getElementById("parts").innerHTML = Rules.PROMPT_PARTS.map((p, i) =>
  '<li style="--c:' + COLOURS[i] + '"><div class="k"><b>' + (i + 1) + '</b><small>' + p.part + '</small></div>' +
  '<div><h3>' + p.part.charAt(0) + p.part.slice(1).toLowerCase() + '</h3><p class="job">' + p.job + '</p><p class="txt">' + esc(p.text) + '</p></div></li>').join("");

// PART 2: collect the answers into one list (an object)
function readAnswers() {
  const answers = {};
  for (const q of Rules.QUESTIONS) answers[q.id] = document.getElementById(q.id).value.trim();
  return answers;
}

// PART 3: show exactly what the AI will receive
function showSent(sent) {
  document.getElementById("sentRules").textContent = sent.instructions;
  document.getElementById("sentInput").textContent = sent.input;
  document.getElementById("sentModel").textContent = sent.model ? "AI model: " + sent.model : "Demo mode: nothing was sent to an AI.";
}

// PART 4: turn the JSON into career cards with pictures

function drawCards(result) {
  output.innerHTML = "";
  result.careers.forEach((c, i) => {
    const pic = Rules.CATEGORIES.includes(c.category) ? c.category : "science";
    const card = document.createElement("article");
    card.className = "career";
    card.style.animationDelay = (i * 0.12) + "s";
    card.innerHTML =
      '<div class="pic">' + photoTag(pic, "Photo for " + esc(c.title)) + '<span class="n">' + (i + 1) + '</span></div>' +
      '<div class="body">' +
      '<div class="row"><h3>' + esc(c.title) + '</h3><span class="badge ' + ({ "University": "uni", "Polytechnic or College": "poly", "Skilled trade": "trade" }[c.routeType] || "uni") + '">' + esc(NAMES[c.routeType] || c.routeType) + '</span></div>' +
      '<p class="why"><b>Why we suggest it:</b> ' + esc(c.why) + '</p>' +
      '<p class="label">Subjects to focus on</p><div class="chips">' + c.subjects.map(s => '<span>' + esc(s) + '</span>').join("") + '</div>' +
      '<p class="label">Nigerian routes into it</p><ol class="routes">' + c.routes.map(r => '<li>' + esc(r) + '</li>').join("") + '</ol>' +
      '<p class="start"><b>Try this week:</b> ' + esc(c.startNow) + '</p>' +
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

  const problem = Rules.validate(answers);            // the check, before we spend money on the AI
  if (problem) { errorBox.textContent = problem; return; }

  showSent({ instructions: Rules.INSTRUCTIONS, input: Rules.buildInput(answers), model: "" });
  goButton.disabled = true;
  goButton.textContent = "Thinking...";
  output.innerHTML = '<div class="loading"><img src="images/logo.svg" alt=""><p>The AI is reading your answers...</p></div>';

  let data = null;
  try {
    const r = await fetch(window.CC_API, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ answers: answers })
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
  if (window.innerWidth < 860) output.scrollIntoView({ behavior: "smooth" });
});

printBtn.addEventListener("click", () => window.print());
