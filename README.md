# Naija Career Compass AI

**Pick what you enjoy. The AI suggests three careers with real Nigerian routes into them. No name or age needed.**

Built with AI by Yewa College ByteBusters (Generative AI Team), for the ByteBusters National Showcase 2026.

**New in version 2:** night mode (the sun/moon button, top right), a bigger gold, indigo and pink design, a "How it works" section, real career photos, and "The 5-part prompt formula" section.

---

## What the files do

| File | Its job | Who explains it |
|---|---|---|
| `index.html` | The rooms: header, form, output box, "How it works" | Messenger |
| `style.css` | The paint: colours, layout, phone layout, printing | Messenger |
| `script.js` | The waiter: reads the form, shows what we send, draws the 3 cards with pictures | Box Keeper / Decider |
| `rules.js` | **The rule card**: our instructions to the AI, the questions, the privacy filter, the checks, demo mode | Safety Officer |
| `api/ask.js` | The kitchen: runs on the server, keeps the secret key, talks to the OpenAI model | Safety Officer |
| `images/careers/` | Our own drawing for each career family (17). It shows if a photo cannot load | Anyone |
| Photos | Real photos from unsplash.com (free to use). The list is `PHOTOS` at the top of `script.js` | Anyone |
| `dev-server.js` | Runs the whole site on your own computer | Trainer |

## The 5-part prompt formula (in `rules.js`)

1. **Role**: who the AI should act as (a kind teacher, counsellor and parent).
2. **Task**: what the AI must do (suggest exactly 3 careers that fit the answers).
3. **Audience**: who will read it (young Nigerian students; simple English).
4. **Format**: the exact shape of the answer (JSON, real Nigerian routes, one university and one trade route).
5. **Limits**: what the AI must never do (no personal details, never discourage, no made-up schools or numbers, no salary promises).

The page shows these 5 parts word for word, straight from `rules.js`.

## How it works (the logic)

1. You answer the questions. Our code collects your answers into a list.
2. The **privacy filter** removes phone numbers, emails, account or ID numbers, names after "my name is", and ages.
3. The **check** makes sure every answer is filled in, before we pay for the AI.
4. The server sends the AI **our rules + your answers** together. The rules ask for exactly 3 careers as JSON.
5. Our code checks the **guardrails** (3 careers, at least one university route, at least one skilled trade, every career has a Nigerian route). If the AI breaks a rule, we ask once more.
6. Our code turns the JSON into 3 cards, each with a picture.

Click **"See exactly what we sent to the AI"** on the page to see steps 2 to 4 for real.

---

## Put it online (free): GitHub + Vercel

The page can live on GitHub, but **the AI key must never be in the page**. GitHub Pages can only show pages; it cannot keep a secret. So we keep the code on **GitHub** and let **Vercel** (free) run it. Vercel reads the code straight from GitHub and keeps the key safe.

### Step 1: put the code on GitHub (a student can do this)
1. Sign in at github.com. Click **New repository**. Name it `naija-career-compass-ai`. Public. Create.
2. Click **uploading an existing file**. Drag in **everything inside this folder** (including the `api` and `images` folders). Do **not** upload any file called `.env`.
3. Click **Commit changes**.

### Step 2: run it on Vercel (an adult does the key part)
1. Go to vercel.com and **Sign up with GitHub**.
2. **Add New → Project** → choose `naija-career-compass-ai` → **Import**.
3. Open **Environment Variables** and add (adult only):
   - `OPENAI_API_KEY` = your secret key from platform.openai.com
   - `OPENAI_MODEL` = `gpt-6-luna` (or the model name you chose)
4. Click **Deploy**. After about a minute you get a link like `https://naija-career-compass-ai.vercel.app`. That is the link for the big screen and for everyone.
5. Test it in a private/incognito window. If the yellow DEMO MODE banner shows, the key is missing: check step 3, then **Redeploy**.

Every time you change a file on GitHub, Vercel updates the site by itself.

### Also on GitHub Pages? (optional)
GitHub → your repository → **Settings → Pages** → Source: `main` branch, `/ (root)` → Save.
That copy works in **demo mode** only. To make it use the real AI, open `index.html`, find `window.CC_API = "api/ask"` and change it to your Vercel address, for example `"https://naija-career-compass-ai.vercel.app/api/ask"`.

---

## Run it on your own computer
You need Node.js 18 or newer. No other installs.

```
npm start
```
Open http://localhost:3000. With no key it runs in DEMO MODE. To use the real AI, an adult copies `.env.example` to a new file called `.env` and pastes the key in it.

## Change the AI model
Change `OPENAI_MODEL` in Vercel (or in `.env`), then redeploy. If the model needs ID verification on your OpenAI account, the page will say the AI could not answer: switch to another model, such as `gpt-5.6-luna`.

## Change the pictures
The pictures are in `images/careers/`, one per career family (`health.svg`, `computing.svg`, `fashion.svg`...). To use the trainer's own pictures, replace a file with a new picture **with the same name**. To use .png files instead, change `.svg` to `.png` in `script.js` (PART 4).

---

*There is no sign-up and nothing is saved. These are ideas to explore, not decisions. Talk to a parent or teacher about them.*
