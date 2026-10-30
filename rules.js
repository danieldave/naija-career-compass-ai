/* =====================================================================
   rules.js  -  THE RULE CARD for Naija Career Compass AI
   This ONE file is used by the web page AND by the server, so both
   follow exactly the same rules.
   ===================================================================== */
(function (root) {

  // ---------------------------------------------------------------
  // 1. THE INSTRUCTIONS (our prompt). The AI reads these EVERY time,
  //    together with the student's answers.
  // ---------------------------------------------------------------
  const CATEGORIES = ["health", "engineering", "computing", "agriculture", "fashion", "food", "electrical",
    "mechanic", "building", "arts", "media", "teaching", "law", "business", "science", "sports", "music"];

  // THE 5-PART PROMPT FORMULA: Role, Task, Audience, Format, Limits.
  // The page shows these 5 parts, word for word, in "The 5-part prompt formula".
  const PROMPT_PARTS = [
    { part: "ROLE", job: "Who the AI should act as",
      text: "You are Naija Career Compass AI, built by Nigerian secondary school students to help young people discover careers. " +
            "Act like a kind teacher, guidance counsellor and parent at the same time." },
    { part: "TASK", job: "What the AI must do",
      text: "Help a young Nigerian explore career pathways that fit their interests, strengths and curiosity. " +
            "Suggest exactly 3 careers that fit the student's answers." },
    { part: "AUDIENCE", job: "Who will read the answer",
      text: "Secondary and tertiary students who are just starting to think about their future. " +
            "Use simple English a 12-year-old understands. Be warm, accurate and practical for Nigeria." },
    { part: "FORMAT", job: "The exact shape of the answer",
      text: "Make the 3 careers varied: at least one university route and at least one skilled trade or hands-on route. " +
            "Routes must be real Nigerian pathways, for example WAEC/NECO, JAMB/UTME, university, polytechnic ND/HND, colleges of education, " +
            "technical colleges, apprenticeship with a master, NABTEB or National Skills Qualification (NSQ) trade certificates. " +
            "For each career: 'why' is ONE sentence that names the student's own answers that made you choose it " +
            "(for example: Because you love Biology and you are curious about how the body works...). " +
            "'subjects' is 2 to 4 school subjects to focus on. 'routes' is 2 to 3 short Nigerian routes. " +
            "'startNow' is one small, safe, free thing to try this week. " +
            "'category' is the closest picture family from this list: " + CATEGORIES.join(", ") + ". " +
            "'routeType' is University, Polytechnic or College, or Skilled trade. Reply with only the JSON." },
    { part: "LIMITS", job: "What the AI must never do",
      text: "Never ask for or repeat personal details (names, phone numbers, addresses, ages); if the input contains [removed] markers, ignore them. " +
            "Never discourage the student. Never say a career is not for them because of gender, background or money. " +
            "Never give nonsense, made-up schools or made-up statistics: do not use any numbers that are not in this prompt. " +
            "Never be rude, never tease and never harass. Never promise a salary or a guaranteed job." }
  ];
  const INSTRUCTIONS = PROMPT_PARTS.map(p => p.part + ": " + p.text).join("\n");

  // The shape of the answer. The AI MUST fill exactly these boxes.
  const SCHEMA = {
    type: "object",
    properties: {
      careers: {
        type: "array", minItems: 3, maxItems: 3,
        items: {
          type: "object",
          properties: {
            title: { type: "string" },
            category: { type: "string", enum: CATEGORIES },
            routeType: { type: "string", enum: ["University", "Polytechnic or College", "Skilled trade"] },
            why: { type: "string" },
            subjects: { type: "array", items: { type: "string" } },
            routes: { type: "array", items: { type: "string" } },
            startNow: { type: "string" }
          },
          required: ["title", "category", "routeType", "why", "subjects", "routes", "startNow"],
          additionalProperties: false
        }
      }
    },
    required: ["careers"],
    additionalProperties: false
  };

  // ---------------------------------------------------------------
  // 2. THE QUESTIONS on the form (in the same order as our design)
  // ---------------------------------------------------------------
  const QUESTIONS = [
    { id: "subject", label: "My favourite subject", required: true },
    { id: "enjoy", label: "What do you enjoy doing?", required: true },
    { id: "loseTime", label: "What do you lose track of time doing?", required: true },
    { id: "curious", label: "What are you curious about?", required: true },
    { id: "natural", label: "What skills or abilities come naturally to you?", required: true },
    { id: "game", label: "What game do you like playing that is not educational?", required: false },
    { id: "level", label: "What level of education are you aiming for?", required: true },
    { id: "workplace", label: "Where do you love to work?", required: true },
    { id: "extra", label: "Anything else (optional)", required: false }
  ];
  const MAX = { extra: 300 };

  // ---------------------------------------------------------------
  // 3. THE PRIVACY FILTER: runs BEFORE anything reaches the AI
  // ---------------------------------------------------------------
  function clean(text) {
    return String(text || "")
      .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, "[removed]")                 // emails
      .replace(/\+?\d[\d\s-]{5,}\d/g, "[removed]")                                              // phone, account, ID numbers
      .replace(/\b(my name is|i am called|i'm called|call me)\s+[A-Za-z'-]+(\s+[A-Za-z'-]+){0,2}/gi, "$1 [removed]")  // names
      .replace(/\b(i am|i'm)\s+\d{1,2}\s*(years?|yrs?)(\s+old)?/gi, "$1 [removed]")                // ages
      .replace(/\b\d{1,2}\s*(years?|yrs?)\s+old\b/gi, "[removed]")
      .replace(/\s+/g, " ").trim();
  }

  // ---------------------------------------------------------------
  // 4. THE CHECK: is the order sensible? (before we pay for the AI)
  // ---------------------------------------------------------------
  function validate(answers) {
    for (const q of QUESTIONS) {
      const v = String((answers || {})[q.id] || "").trim();
      if (q.required && v.length < 2) return "Please answer: " + q.label;
      if (v.length > (MAX[q.id] || 120)) return "That answer is too long: " + q.label;
    }
    return null;   // null means: no problem
  }

  // ---------------------------------------------------------------
  // 5. THE INPUT: our code turns the answers (our lists) into one
  //    clear message. This is what the AI receives with the rules.
  // ---------------------------------------------------------------
  function buildInput(answers) {
    return QUESTIONS
      .filter(q => String(answers[q.id] || "").trim() !== "")
      .map(q => q.label.replace(" (optional)", "").replace("?", "") + ": " + clean(answers[q.id]))
      .join("\n");
  }

  // ---------------------------------------------------------------
  // 6. THE GUARDRAIL CHECK on the AI's answer
  // ---------------------------------------------------------------
  function check(data) {
    const c = data && data.careers;
    if (!Array.isArray(c) || c.length !== 3) return "We need exactly 3 careers.";
    if (!c.some(x => x.routeType === "Skilled trade")) return "At least one career must be a skilled trade or hands-on path.";
    if (!c.some(x => x.routeType === "University")) return "At least one career must have a university route.";
    for (const x of c) {
      if (!x.title || !x.why) return "Every career needs a title and a reason.";
      if (!Array.isArray(x.routes) || x.routes.length === 0) return "Every career needs a Nigerian route.";
      if (!CATEGORIES.includes(x.category)) x.category = "science";
    }
    return null;
  }

  // ---------------------------------------------------------------
  // 7. DEMO MODE: sample careers when there is no AI connection.
  //    Our code picks from a small list. It is NOT the AI.
  // ---------------------------------------------------------------
  const BANK = [
    { title: "Nurse", category: "health", routeType: "University", keys: "biology health body care help people hospital chemistry",
      subjects: ["Biology", "Chemistry", "English"], routes: ["WAEC/NECO with 5 credits", "JAMB/UTME, then a BSc Nursing degree", "Or a School of Nursing diploma"], startNow: "Learn basic first aid from a trusted adult or a first-aid video." },
    { title: "Software Developer", category: "computing", routeType: "University", keys: "computer phone code game app technology math puzzle",
      subjects: ["Mathematics", "Computer Studies", "Physics"], routes: ["WAEC/NECO, then JAMB/UTME for Computer Science", "Or a polytechnic ND/HND in Computer Science"], startNow: "Build a tiny web page about your favourite food." },
    { title: "Electrician", category: "electrical", routeType: "Skilled trade", keys: "fix hands wire light build physics tools",
      subjects: ["Physics", "Mathematics", "Technical Drawing"], routes: ["Technical college (NABTEB) in Electrical Installation", "Apprenticeship with a master electrician", "National Skills Qualification (NSQ) certificate"], startNow: "Ask a trusted adult to show you how a plug and fuse work, safely." },
    { title: "Fashion Designer", category: "fashion", routeType: "Skilled trade", keys: "draw design clothes art sew fashion creative",
      subjects: ["Fine Art", "Clothing and Textiles", "English"], routes: ["Apprenticeship with a master tailor", "NSQ certificate in garment making", "Or a polytechnic ND in Fashion Design"], startNow: "Sketch 3 outfits for a family party." },
    { title: "Agricultural Scientist", category: "agriculture", routeType: "University", keys: "farm plant animal food science outdoors nature",
      subjects: ["Agricultural Science", "Biology", "Chemistry"], routes: ["WAEC/NECO, then JAMB/UTME for Agriculture", "Or a College of Agriculture ND"], startNow: "Plant a few beans and note how they grow each day." },
    { title: "Auto Mechanic", category: "mechanic", routeType: "Skilled trade", keys: "car engine fix hands machine tools outdoors",
      subjects: ["Physics", "Mathematics", "Basic Technology"], routes: ["Technical college (NABTEB) in Motor Vehicle Mechanics", "Apprenticeship with a master mechanic"], startNow: "Watch a trusted mechanic change a tyre and ask 3 questions." },
    { title: "Teacher", category: "teaching", routeType: "Polytechnic or College", keys: "teach explain help people children talk english read",
      subjects: ["English", "Mathematics", "Your favourite subject"], routes: ["College of Education (NCE)", "Or a university degree in Education"], startNow: "Teach a younger child one thing you know well." },
    { title: "Chef / Caterer", category: "food", routeType: "Skilled trade", keys: "cook food kitchen taste business",
      subjects: ["Food and Nutrition", "Home Economics", "Mathematics"], routes: ["Catering school or NSQ certificate", "Apprenticeship with a caterer", "Or a polytechnic ND in Hospitality"], startNow: "Cook one simple meal with an adult and write the steps." },
    { title: "Graphic Designer", category: "arts", routeType: "Polytechnic or College", keys: "draw design art color creative computer",
      subjects: ["Fine Art", "Computer Studies", "English"], routes: ["Polytechnic ND/HND in Art and Design", "Or a university degree in Fine and Applied Arts"], startNow: "Design a poster for your class on paper." },
    { title: "Lawyer", category: "law", routeType: "University", keys: "argue talk debate read justice fair rules government",
      subjects: ["English", "Literature", "Government"], routes: ["WAEC/NECO, then JAMB/UTME for Law", "LLB degree, then Nigerian Law School"], startNow: "Join or start a debate in your class." }
  ];

  function demo(answers) {
    const words = Object.values(answers || {}).join(" ").toLowerCase();
    const score = b => b.keys.split(" ").filter(k => words.includes(k)).length;
    const ranked = BANK.slice().sort((a, b) => score(b) - score(a));
    const uni = ranked.find(b => b.routeType === "University");
    const trade = ranked.find(b => b.routeType === "Skilled trade");
    const third = ranked.find(b => b !== uni && b !== trade);
    return { careers: [uni, trade, third].map(b => ({
      title: b.title, category: b.category, routeType: b.routeType,
      why: "Sample idea: our code matched some of your words to this career. (The AI would explain this using your answers.)",
      subjects: b.subjects, routes: b.routes, startNow: b.startNow })) };
  }

  const Rules = { INSTRUCTIONS, PROMPT_PARTS, SCHEMA, CATEGORIES, QUESTIONS, clean, validate, buildInput, check, demo };
  if (typeof module !== "undefined" && module.exports) module.exports = Rules; else root.Rules = Rules;
})(this);
