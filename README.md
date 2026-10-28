# FormSaathi — Internship & Placement Portal

**Live site:** https://formsaathi-ten.vercel.app

FormSaathi is a student-facing portal that brings internship and campus-placement discovery, application tracking, safety checks and smart reminders into one place. It is built with **React + TypeScript + Vite + Tailwind** (frontend), **FastAPI (Python)** (backend), **Supabase Postgres** (auth, data, realtime) and **TinyFish Search/Fetch** (live web research), deployed on **Vercel** with scheduled cron jobs.

The portal covers **two listing types only — Internships and Placement (campus/full-time) jobs**. Researched pages that are not real listings (scholarships, hackathons, courses, events, CAPTCHA/404/error pages) are dropped automatically and can never become job cards.

> **Demo mode:** without a TinyFish API key the app shows clearly-labelled `[DEMO]` sample records (example.com URLs — not real). Nothing is ever faked as a live result, and no statistic is invented anywhere in the product.

---

## Table of contents

1. [Complete feature guide](#complete-feature-guide) — every feature, what it is and why it exists
2. [API reference](#api-reference)
3. [How the research pipeline works](#how-the-research-pipeline-works)
4. [Security & privacy](#security--privacy)
5. [Database & migrations](#database--migrations)
6. [Run locally](#run-locally)
7. [Tests](#tests)
8. [Project structure](#project-structure)
9. [Deploy on Vercel](#deploy-on-vercel)
10. [Known limits](#known-limits)

---

# Complete feature guide

## 1. Live job discovery (web research)

**What it is:** a keyword + location search on the homepage that asks the FastAPI backend to research the live web through TinyFish Search/Fetch (with an Agent fallback). The backend fetches real pages, extracts structured data and returns deduplicated listings. Identical searches are cached for 10 minutes.

**Use:** students find current openings in one search instead of visiting ten job boards, WhatsApp groups and company sites. Research is rate-limited (10 requests/minute/IP, proper `429` response) and every URL passes an SSRF guard (no localhost/private addresses).

## 2. Strict portal scope & bad-page rejection

**What it is:** the extraction pipeline classifies every fetched page as `Internship`, `Placement`, or drops it. Error pages, bot walls, CAPTCHAs, 404/5xx pages and non-job content never render as listings; any bad rows that somehow persist are purged on load.

**Use:** guarantees the catalogue stays relevant and trustworthy — a broken fetch can never appear as a fake job title.

## 3. Structured, honest listing data

**What it is:** every card carries role, hiring organizer, required skills, eligibility, city-level location, work mode (Remote/Hybrid/In-person), deadline (with open/closing-soon/expired/unknown status), compensation and source links. Missing fields are shown as `unknown` — extraction is deterministic and never invents values. Compensation is also normalized into monthly INR (`compensation_min/max`) while the original wording stays visible.

**Use:** students get comparable, verifiable information with a direct link to the official source for every claim.

## 4. Browse Jobs — filters, sorting and pagination

**What it is:** a filter sidebar with category, role, skill, location, work mode, deadline status and compensation band (unpaid / up to ₹10k / ₹10–25k / ₹25k+), plus sorting including **"Best match for you"** against the student's profile, and Load-more pagination.

**Use:** narrows hundreds of results to the few that actually fit a student's skills, city and budget in seconds.

## 5. Job details — match score, safety and actions

Each listing opens a structured detail view containing:

- **Explainable match score (0–100%)** — 70% skill overlap, 15% location, 15% work mode, with hover text showing exactly which skills matched. *Use:* students instantly see why a job is (or isn't) right for them.
- **Fraud & scam warnings** — backend rules flag registration fees, deposits, pay-to-join asks and suspicious UPI payments, while correctly ignoring negations like "no registration fee". A permanent safety note and a **Report listing** flow accompany every job. *Use:* protects students from the common paid-internship scams targeting freshers.
- **Link health re-check** — a live probe (HEAD then GET fallback) classifies the apply/source link as `ok`, `broken` or `unknown`; bot walls and timeouts stay `unknown` and are never misreported as dead. *Use:* no more applying through expired or broken links.
- **Calendar export** — one-click `.ics` download for any listing with a confirmed deadline. *Use:* deadlines land directly in Google/Apple Calendar.
- **Apply on official site** — FormSaathi never collects applications itself; the button always goes to the company's official page.

## 6. Resume-driven job discovery

**What it is:** upload a **PDF, DOCX or TXT resume (max 5 MB)** on the homepage. Parsing runs **entirely in the browser** (lazy-loaded `pdfjs-dist` / `mammoth`) — the file never touches a server. A review screen shows the detected skills, target role, degree, batch year and cities, all editable, because extraction is never treated as perfect. On confirm, the resume builds the research query itself, prefills the student profile and switches results to best-match sorting. Scanned/image-only PDFs get a clear "use a text-based file" message instead of a silent failure. A ready-made sample lives in [`demo/`](demo/) (`Aarav_Mehta_Resume_Sample.pdf`).

**Use:** one upload turns a static resume into a personalized job search with zero manual filter setup — while keeping the document private on the student's own device.

## 7. Student profile

**What it is:** save skills, preferred cities, work modes, batch and degree. The profile powers match scores, best-match sorting and personalized notifications, and syncs to the cloud after sign-in.

**Use:** the single source of truth for personalization across search, alerts and insights.

## 8. Saved listings & application tracker (Kanban)

**What it is:** bookmark any listing, then move it through five stages — **Saved → Applied → Interview → Offer → Rejected** — on a Kanban board with per-application notes and live stage counts. Data works offline in `localStorage` and migrates automatically to the cloud on sign-in (legacy bookmarks included).

**Use:** replaces scattered spreadsheets with one pipeline showing exactly where every application stands.

## 9. Companies view

**What it is:** current results grouped by hiring organizer with verification badges. Organizer names come from page text or the domain; when genuinely unstated, the listing says so rather than inventing a company.

**Use:** students can compare all openings from one employer together.

## 10. Accounts, magic-link auth and cross-device sync

**What it is:** password-less email **magic link** authentication via Supabase. A profile row is created automatically on signup, and tracker entries, saved searches, notifications and preferences sync across devices. Every user-facing table is protected by **Row Level Security (RLS)** Postgres policies — users can only read/write their own rows, enforced in the database, not just hidden in the UI. The service-role key never reaches the browser.

**Use:** students pick up their job hunt on any device without managing another password, and their data stays private.

## 11. Notification suite (4 alert kinds × 3 channels)

**What it is:** a realtime notification bell plus a preference matrix (gear icon) where each alert kind can independently use three channels — **in-app, email, browser push**. Defaults: in-app **on**, email/push **off** (opt-in).

**Alert kinds**

| Alert | When it fires |
|---|---|
| Deadline reminders | A saved/tracked listing closes within **48 hours** (rejected listings excluded) |
| Saved-search match digest | One daily digest per saved search, using the same ≥0.6 token-overlap and location rules as the app |
| Application follow-ups | An `applied` row has not moved for **7 days** |
| Listing health | A saved listing repeatedly fails link checks and gets hidden |

**Channels:** in-app (Supabase realtime bell, unread badge, mark-all-read) · email (Resend — **dormant until `RESEND_API_KEY`** is set, branded HTML + text fallback) · browser Web Push (self-generated VAPID keys, service-worker delivery, works with the tab closed; unsupported browsers such as older Safari hide the option gracefully).

**Reliability:** a `notification_events` ledger with a `unique(user_id, kind, dedup_key)` constraint makes every alert fire **at most once**; zero-match digest days are still recorded so scans never repeat. Dead push endpoints (404/410) are pruned automatically. All jobs run on secret-protected daily/weekly cron schedules.

**Use:** students never miss a deadline, a matching opening or a forgotten follow-up, and choose exactly how loudly each type of alert reaches them.

## 12. Insights dashboard

**What it is:** an analytics page computed purely from the student's own tracker: the five-stage application funnel, applied/interview/offer conversion rates (each with an explicit denominator — shown as "—" until enough data exists), six-month pipeline activity, top skills and locations in the pipeline, and the nearest upcoming deadlines. Empty data renders an empty state.

**Use:** evidence-based self-review — "how many applications actually convert to interviews?" — without any fabricated or benchmarked numbers.

## 13. Catalogue-health automation

**What it is:** a daily cron re-probes listings not checked for 3 days using the same careful classification as manual re-checks. Past deadlines flip to `expired`; **three consecutive `broken` probes auto-hide** a listing and notify every student who saved it (once each, preference-gated, tracker history preserved). Bot walls/timeouts remain `unknown` and never count against a listing.

**Use:** the catalogue self-cleans, so students never act on dead opportunities and always know when a saved one was removed.

## 14. Installable PWA with offline support

**What it is:** a web manifest, generated 192/512/maskable/Apple-touch icons and a service worker let students "Add to Home Screen" and run FormSaathi as a standalone app. Navigations are network-first (updates appear immediately) with a branded `/offline.html` fallback; hashed assets use stale-while-revalidate caching. Supabase/API traffic is never cached. The same worker delivers Web Push.

**Use:** native-app feel and zero-install distribution — works on flaky college/hostel Wi-Fi, no app store needed.

## 15. Admin moderation queue

**What it is:** users with `profiles.is_admin = true` see a **Moderation** area (invisible to everyone else) where they triage student-submitted listing reports — hide & resolve, dismiss or reopen — and restore auto-hidden listings. RLS policies enforce admin rights inside Postgres, so even crafted requests from non-admins are rejected. Hidden listings disappear from the public catalogue for all users except admins.

**Use:** a defensible, auditable safety workflow that keeps scam and broken listings out without trusting the client.

## 16. Demo & presentation assets

- [`demo/`](demo/) — fictional sample resume in PDF/DOCX/TXT tuned to exercise the parser, with expected output documented.
- `DEMO_SCRIPT_HINGLISH.md` / `.txt` — a full Hinglish walkthrough script covering every feature, with viva Q&A and a timing sheet.

---

# API reference

All routes are served under `/api` by the FastAPI app (`backend/app/main.py`).

| Method & path | Purpose |
|---|---|
| `GET /health` | Service status and which integrations are configured |
| `GET /categories` | The two portal categories: Internship, Placement |
| `GET /opportunities/demo` | Clearly-labelled sample listings for demo mode |
| `POST /opportunities/research` | Live web research, extraction, dedupe and persistence |
| `POST /opportunities/search` | Filter/sort the current catalogue |
| `GET /opportunities/{id}` | Fetch one listing |
| `POST /opportunities/validate` | URL validation (SSRF-guarded) |
| `POST /opportunities/recheck` | Live link-health probe for one listing |
| `GET|POST /cron/deadline-reminders` | Scheduled deadline alerts (`CRON_SECRET` protected) |
| `GET|POST /cron/match-digest` | Scheduled saved-search digests |
| `GET|POST /cron/followups` | Weekly stale-application nudges |
| `GET|POST /cron/catalogue-health` | Daily link re-validation and auto-hide sweep |

Cron routes accept GET (how Vercel invokes them) and POST (manual triggers), require `Authorization: Bearer $CRON_SECRET`, return `401` on a bad token and `503` when the secret is unset.

# How the research pipeline works

Search query (augmented with role/skills/location/type + "India") → TinyFish Search → Fetch (batched, ≤5 by default) → **portal scope check** (non-job pages dropped) → deterministic Python extraction (role, skills, city, deadline regex, eligibility, stipend/salary/CTC, apply links — missing = `null`/`unknown`) → error/bot-page detection → dedupe by normalized title + organizer (official source preferred) → deadline status (`open`, `closing_soon` ≤14 days, `expired`, `unknown`) → Supabase persistence → cards with source links.

# Security & privacy

- **Service-role key and VAPID private key are backend-only**; the browser only ever holds the anon/publishable key and the VAPID *public* key.
- **RLS on every user table**; admin actions gated by Postgres policies, not UI flags.
- **SSRF guard** on all probed URLs (http/https only, no localhost/private IPs); per-IP rate limiting on research.
- **Resume files never leave the device** — parsing is fully in-browser.
- No `.env` files are committed; secrets live in Vercel project environment variables.
- Push dedup ledger has no client-facing policy (service-role cron access only).

# Database & migrations

Supabase Postgres, SQL migrations in [`supabase/migrations/`](supabase/migrations/):

- `0001_init.sql` — profiles, opportunities (public read), saved listings, saved searches, notifications, listing reports, signup trigger
- `0002_saved_listings_snapshots.sql` — offline-first denormalized snapshots (drop hard FK, add `title`/`snapshot`)
- `0003_notification_suite.sql` — notification preferences, push subscriptions, dedup ledger
- `0004_phase4.sql` — admin flag, hidden/failed-checks moderation columns, report triage, health-alert preferences

# Run locally

### Backend (terminal 1)
```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # fill TinyFish / Supabase / VAPID / CRON values (see .env.example)
uvicorn app.main:app --reload --port 8000
# check: http://localhost:8000/api/health
```

### Frontend (terminal 2)
```bash
cd frontend
npm install
cp .env.example .env.local   # VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_VAPID_PUBLIC_KEY
npm run dev                  # http://localhost:5173 (proxies /api to :8000)
```

Without optional keys the app still runs: missing TinyFish → demo mode; missing Resend → email dormant; missing VAPID → push option hidden.

# Tests

```bash
cd backend && source .venv/bin/activate
python -m pytest tests/ -q     # 44 tests: extraction, fraud, compensation, dedupe, filters,
                               # notification dispatch/dedup, cron auth, catalogue health
cd ../frontend
npm run lint                   # oxlint — 0 warnings
npm run build                  # tsc type-check + production Vite build
```

# Project structure

```
backend/app/
  main.py            FastAPI routes (research, search, recheck, protected crons)
  tinyfish.py        Search/Fetch/Agent client
  extraction.py      deterministic listing extraction, fraud rules, link classification
  notifications.py   alert runners, preferences, dedup ledger, channel dispatch
  health.py          catalogue-health sweep and URL prober
  emailer.py         Resend integration (dormant without key)
  push.py            VAPID Web Push (pywebpush)
  supabase_store.py  service-role PostgREST client
frontend/src/
  components/        UI (Navbar, JobCard, TrackerBoard, InsightsView, AdminView, modals…)
  lib/               cloud sync, auth, resume parsing, match scoring, PWA, push, insights
  public/            sw.js, manifest.webmanifest, offline.html, icons/, images/
supabase/migrations/ 0001 … 0004
demo/                fictional sample resume for parser demos
vercel.json          frontend + backend services and the four cron schedules
```

# Deploy on Vercel

The repository deploys as one Vercel project driven by [`vercel.json`](vercel.json): a Vite frontend service and a FastAPI backend service, with rewrite rules sending `/api/*` to the backend and four cron jobs (deadline reminders 03:00, match digest 03:15, catalogue health 04:00 daily; follow-ups Mondays 05:00 UTC — all within Hobby daily-cron limits).

1. Import the GitHub repo into Vercel; the services are detected from `vercel.json`.
2. Add environment variables:
   - **Backend:** `TINYFISH_API_KEY` (optional), `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, optional `RESEND_API_KEY` / `RESEND_FROM`, `FRONTEND_ORIGIN`
   - **Frontend:** `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_VAPID_PUBLIC_KEY`
3. Apply the SQL migrations in `supabase/migrations/` in order.
4. Deploy — crons attach automatically and call the backend with the bearer secret.

# Known limits

- Without `TINYFISH_API_KEY` the product runs in clearly-labelled demo mode.
- In-memory research caches reset between serverless invocations; persistent data lives in Supabase.
- Email alerts stay dormant until a Resend key is configured; in-app and push work without it.
- Hobby cron timing is per-hour precision, not minute-exact, and jobs run at most once per day.
- Some employer sites block automated probes; these are reported as `unknown`, never as broken.
