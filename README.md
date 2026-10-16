# FormSaathi AI — Discover Opportunities. Never Miss a Chance.

Working end-to-end app: **React+TypeScript+Vite+Tailwind** frontend, **FastAPI** backend, **TinyFish Search/Fetch (Agent fallback)** for live web research. No database.

> Demo mode: without a TinyFish key the app shows clearly-labelled `[DEMO]` sample records (example.com — not real). Nothing is faked as “live”.

## TinyFish docs verified (16 Oct 2026)
- Search: `GET https://api.search.tinyfish.ai?query=&location=IN&language=en`
- Fetch: `POST https://api.fetch.tinyfish.ai` body `{urls[], format:"markdown", links:true}` (max 10)
- Agent: `POST https://agent.tinyfish.ai/v1/automation/run` body `{url, goal, output_schema}`
- All use header `X-API-Key` — **only on the backend**, never in React.

## Beginner setup (2 terminals)

### Terminal 1 — Backend
```bash
cd formsaathi/backend
pip install -r requirements.txt
cp .env.example .env
# open .env and replace your_key_here with your key from https://agent.tinyfish.ai/api-keys
uvicorn app.main:app --reload --port 8000
```
Check: open http://localhost:8000/api/health → `tinyfish_configured` should be `true` after adding a real key.

### Terminal 2 — Frontend
```bash
cd formsaathi/frontend
npm install
npm run dev
```
Open **http://localhost:5173**

### Test a real search
1. In the hero search box type `Find scholarships for undergraduate engineering students in India`
2. Click **Discover Opportunities** → stats show candidates / fetched / extracted / duplicates removed.
3. Click **View Details** → verify deadline status, source link, last-checked time. Always apply on the official site yourself.

## API
`GET /api/health` · `GET /api/categories` · `GET /api/opportunities/demo` · `POST /api/opportunities/research` · `POST /api/opportunities/search` (filter/sort passed results) · `GET /api/opportunities/{id}` · `POST /api/opportunities/validate`

## How it works & limits
Search → Fetch (batch ≤5 by default) → deterministic Python extraction (deadline regex, eligibility lines, fee, apply links — missing = `null`/`unknown`, never invented) → dedupe by exact normalized title+organizer (official source preferred) → deadline status (`open` only with a future known deadline, `closing_soon` ≤14d, `expired`, else `unknown`) → cards with source links.
- Cache: identical research cached 10 min in backend memory (UI says “served from cache”). Research results disappear on backend restart.
- Saved/recent/preferences: browser `localStorage` only — no sync, no account.
- Rate limit: 10 research req/min/IP. URLs validated (http/https, no localhost/private).
- Agent fallback: only when you enable it / Fetch yields nothing — narrow goal, no CAPTCHA/paywall bypass, never auto-submits.

## Tests
```bash
cd backend && python -m pytest tests/ -q   # 6 tests: dates, no-fabrication, expiry, SSRF guard, dedupe, extraction
cd ../frontend && npm run build            # type-check + production build
```
Live TinyFish Search/Fetch could not be tested here (no API key in this environment) — the code paths follow the verified docs above and return a clear 502 if TinyFish rejects a request.

## Structure
```
backend/app/{main,tinyfish,extraction,models,demo_data}.py  backend/tests/
frontend/src/{App.tsx,types.ts,index.css}
```

## 🌐 Go live on Vercel (public website)
This repo is ready for a **single Vercel project**: frontend (static) + backend (Python serverless `api/index.py` reusing the same FastAPI app). Files: `vercel.json`, `requirements.txt` (root), `api/index.py`.

**Exact steps (5–8 min, free account):**
1. Put this `formsaathi` folder on GitHub (do NOT commit `backend/.env` — it's git-ignored; check with `git status` that `.env` is absent).
2. Go to https://vercel.com → Sign up/Login → **Add New → Project** → import your GitHub repo.
3. **Root Directory = `formsaathi`** (the folder containing `vercel.json`). Framework: Other (vercel.json already sets build/output).
4. Before deploying, open **Settings → Environment Variables** and add:
   - `TINYFISH_API_KEY` = your key (Production + Preview)
   - `FRONTEND_ORIGIN` = `*`
5. Click **Deploy**. When done Vercel gives you a public URL like `https://formsaathi-xxx.vercel.app`.
6. Test: open that URL → search "hackathons India" → you should see real results and stats (not DEMO). Also open `https://YOUR-URL/api/health` → `"tinyfish_configured": true`.

**Notes:** Vercel serverless has a 60s function limit (set in vercel.json) — keep `max_fetch` ≤5. In-memory cache/results reset between serverless invocations (expected, no database by design). If a deploy fails, open the Vercel build log and share the red error lines — do not share your key.

⚠️ **Security:** Your key was pasted in chat. It now lives only in local `backend/.env` (git-ignored, verified not in any other file/bundle). Because it was shared in chat, consider rotating it later at agent.tinyfish.ai/api-keys and updating both `.env` and Vercel env var.
