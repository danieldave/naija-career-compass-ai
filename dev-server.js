/* dev-server.js  -  run the whole site on YOUR computer: npm start, then open http://localhost:3000
   It serves the page and runs api/ask.js, exactly like Vercel does online. No extra packages needed. */
const http = require("http"), fs = require("fs"), path = require("path");

// read the secret key from the .env file (never upload .env to GitHub!)
if (fs.existsSync(path.join(__dirname, ".env"))) {
  for (const line of fs.readFileSync(path.join(__dirname, ".env"), "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
const ask = require("./api/ask.js");
const TYPES = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".json": "application/json" };
const PORT = process.env.PORT || 3000;

http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split("?")[0]);
  if (url === "/api/ask") {                                   // the kitchen
    let body = "";
    req.on("data", c => { body += c; if (body.length > 20000) req.destroy(); });
    req.on("end", () => {
      try { req.body = body ? JSON.parse(body) : {}; } catch (e) { req.body = {}; }
      res.status = code => { res.statusCode = code; return res; };
      res.json = obj => { res.setHeader("Content-Type", "application/json"); res.end(JSON.stringify(obj)); };
      ask(req, res);
    });
    return;
  }
  const file = path.join(__dirname, url === "/" ? "index.html" : url);
  if (!file.startsWith(__dirname) || file.includes(`${path.sep}api${path.sep}`) || path.basename(file).startsWith(".")) { res.statusCode = 404; return res.end("Not found"); }
  fs.readFile(file, (err, data) => {
    if (err) { res.statusCode = 404; return res.end("Not found"); }
    res.setHeader("Content-Type", TYPES[path.extname(file)] || "application/octet-stream");
    res.end(data);
  });
}).listen(PORT, () => {
  console.log("Naija Career Compass AI is running: open http://localhost:" + PORT);
  console.log(process.env.OPENAI_API_KEY ? "AI key found: real answers." : "No AI key: DEMO MODE (sample answers).");
});
