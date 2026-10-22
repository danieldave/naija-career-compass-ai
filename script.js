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
function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }

function drawCards(result) {
  output.innerHTML = "";
  result.careers.forEach((c, i) => {
    const pic = Rules.CATEGORIES.includes(c.category) ? c.category : "science";
    const card = document.createElement("article");
    card.className = "career";
    card.style.animationDelay = (i * 0.12) + "s";
    card.innerHTML =
      '<img src="images/careers/' + pic + '.svg" alt="Picture for ' + esc(c.title) + '">' +
      '<div class="body">' +
      '<div class="row"><h3>' + (i + 1) + '. ' + esc(c.title) + '</h3><span class="badge ' + ({ "University": "uni", "Polytechnic or College": "poly", "Skilled trade": "trade" }[c.routeType] || "uni") + '">' + esc(NAMES[c.routeType] || c.routeType) + '</span></div>' +
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
    goButton.textContent = "Show me 3 careers";
  }

  document.getElementById("demoBanner").hidden = !data.demo;   // honest banner
  showSent(data.demo ? Object.assign({}, data.sent, { model: "" }) : data.sent);
  drawCards(data.result);
  if (window.innerWidth < 860) output.scrollIntoView({ behavior: "smooth" });
});

printBtn.addEventListener("click", () => window.print());
