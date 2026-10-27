# FormSaathi — Internship & Placement Portal

Working end-to-end app: **React+TypeScript+Vite+Tailwind** frontend, **FastAPI** backend, **TinyFish Search/Fetch (Agent fallback)** for live web research. No database.

The portal covers **two listing types only — Internships and Placement (campus/full-time) jobs**. Researched pages that are not internship or job listings (scholarships, hackathons, courses, events, etc.) are dropped from the output automatically.

> Demo mode: without a TinyFish key the app shows clearly-labelled `[DEMO]` sample records (example.com — not real). Nothing is faked as “live”.

## What changed for the portal
- **Scope filter**: extraction classifies each page as `Internship`, `Placement`, or drops it. Only the two portal categories exist end-to-end.
- **Structured job data**: every listing carries `role` (e.g. Frontend Developer, Data Analyst), `skills[]`, city-level `location`, work `mode` (Remote/Hybrid/In-person), and `compensation` (stipend/salary/CTC, verbatim from the page — `null` when not stated).
- **Role / skill / location filters**: filter sidebar on the Browse Jobs page, plus job type, work mode, compensation band, deadline status and sort; the same filters are available on `POST /api/opportunities/search`.
- **Professional UI**: clear homepage with keyword + location search, latest-openings section, filter-sidebar job listing, and a structured job-details view with prominent **Apply on Official Site** actions.

## Phase 1 features (student workflow)
- **Application tracker** — move listings through Saved → Applied → Interview → Offer → Rejected with per-application notes; a Kanban tracker view, stored in `localStorage` (old `fs-saved` bookmarks are migrated automatically).
- **Student profile & match score** — save skills, preferred cities, work mode, batch and degree on the device; every card shows an explainable 0–100% match (skill overlap 70%, location 15%, mode 15%).
- **Fraud & scam protection** — backend rules flag registration fees, deposits, pay-to-join asks and suspicious UPI payments (negated phrases like "no registration fee" are ignored); warnings render on cards and details, plus a permanent safety note and a **Report listing** flow.
- **Numeric compensation** — `parse_compensation()` normalizes stipends and CTC into monthly INR (`compensation_min/max`, `compensation_kind`), powering compensation-band filters; the original wording is always displayed.
- **Calendar export** — one-click `.ics` download for any listing with a confirmed deadline.

## Resume-driven job discovery
- **Upload a resume (PDF, DOCX or TXT, up to 5MB)** on the homepage or from the profile modal. Parsing runs entirely in the browser via lazy-loaded `pdfjs-dist` / `mammoth` — the file never leaves the device and only the derived profile (skills, role, degree, batch, cities) is stored in `localStorage`.
- A **review screen** shows everything detected (deterministic dictionary/regex matching in `frontend/src/lib/resume.ts`) and lets the student correct it before searching — extraction is never treated as perfect.
- On confirm, the resume builds the TinyFish research query itself (role + top skills + city + internship/placement), prefills the match-scoring profile, and switches results to a **“Best match for you”** sort using the existing weighted match score (skills 70%, location 15%, mode 15%).
- Scanned/image PDFs with no text layer return a clear message asking for a text-based file instead of failing silently.

## API
`GET /api/health` · `GET /api/categories` (`Internship`, `Placement`) · `GET /api/opportunities/demo` · `POST /api/opportunities/research` · `POST /api/opportunities/search` (filter/sort by category, role, skill, location, mode, deadline, `comp_band`) · `GET /api/opportunities/{id}` · `POST /api/opportunities/validate`

## Notification suite (Phase 3)
Three alert kinds, each deliverable over three channels, with per-user toggles (defaults: in-app **on**, email/push **off**):
- **Deadline reminders** — saved/tracked listings closing within 48 hours (rejected listings excluded).
- **Saved-search match digest** — one daily digest per saved search, using the same token-overlap (≥0.6) and location rules as the app.
- **Application follow-ups** — nudge when an `applied` row has not moved for 7 days.

Channels: in-app (Supabase `notifications`, real-time bell), email (Resend — dormant until `RESEND_API_KEY` is set) and browser Web Push (VAPID; Safari/unsupported browsers degrade gracefully). A `notification_events` ledger with a `unique(user_id, kind, dedup_key)` constraint guarantees every alert is sent at most once; zero-match digest days are still claimed so scans never repeat. The gear icon in the notification bell opens the preferences matrix and push opt-in.

Scheduled jobs live in `vercel.json` (daily crons) and hit `POST /api/cron/deadline-reminders`, `/api/cron/match-digest`, `/api/cron/followups`, each protected by `Authorization: Bearer $CRON_SECRET`. Required env vars: `CRON_SECRET`, `VAPID_PUBLIC_KEY` (browser, exposed as `VITE_VAPID_PUBLIC_KEY`), `VAPID_PRIVATE_KEY` (server-only secret), `VAPID_SUBJECT` (`mailto:`), optional `RESEND_API_KEY` / `RESEND_FROM`. The service-role key and VAPID private key never leave the backend.

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
1. In the homepage search box type `React developer internship in Bengaluru` (optionally add a location).
2. Click **Search Jobs** → stats show candidates / fetched / valid listings / duplicates removed.
3. Use the sidebar to filter by **role, skill, location, mode, compensation band or deadline**, then click **View Details** → verify match score, scam warnings, deadline, skills, compensation and source link. Always apply on the official company site yourself.

## How it works & limits
Search (query is augmented with role/skills/location/type + “India”) → Fetch (batch ≤5 by default) → **portal scope check** (non-job pages dropped) → deterministic Python extraction (role detection, skill dictionary, city detection, deadline regex, eligibility lines, stipend/salary/CTC, apply links — missing = `null`/`unknown`, never invented) → dedupe by exact normalized title+organizer (official source preferred) → deadline status (`open` only with a future known deadline, `closing_soon` ≤14d, `expired`, else `unknown`) → cards with source links.
- Cache: identical research cached 10 min in backend memory (UI says “served from cache”). Research results disappear on backend restart.
- Saved/recent/preferences: browser `localStorage` only — no sync, no account.
- Rate limit: 10 research req/min/IP (returns a proper 429). URLs validated (http/https, no localhost/private).
- Agent fallback: only when you enable it / Fetch yields nothing — narrow goal, no CAPTCHA/paywall bypass, never auto-submits.

## Tests
```bash
cd backend && python -m pytest tests/ -q   # 16 tests: dates, no-fabrication, expiry, SSRF guard, dedupe,
                                           # portal classification, non-job drop, role/skill/location extraction,
                                           # compensation parser + bands, fraud rules, filters
cd ../frontend && npm run build            # type-check + production build
npm run lint                               # oxlint — 0 warnings
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
6. Test: open that URL → search "React internship" → you should see real listings and stats (not DEMO). Also open `https://YOUR-URL/api/health` → `"tinyfish_configured": true`.

**Notes:** Vercel serverless has a 60s function limit (set in vercel.json) — keep `max_fetch` ≤5. In-memory cache/results reset between serverless invocations (expected, no database by design). If a deploy fails, open the Vercel build log and share the red error lines — do not share your key.

⚠️ **Security:** If your key was pasted in chat, keep it only in local `backend/.env` (git-ignored). Consider rotating it at agent.tinyfish.ai/api-keys and updating both `.env` and the Vercel env var.
