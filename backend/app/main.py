import os, time
from datetime import datetime, timezone
from collections import defaultdict
import httpx
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
load_dotenv()
from .models import ResearchRequest, SearchRequest, ResearchResponse
from . import tinyfish, supabase_store, notifications as notif_engine
from . import emailer, push as push_lib
from .extraction import extract_opportunity, dedupe, apply_filters, sort_opps, valid_url, classify_link_status
from .demo_data import DEMO

app=FastAPI(title="FormSaathi Internship & Placement API", version="2.0.0")
origin=os.getenv("FRONTEND_ORIGIN","http://localhost:5173")
app.add_middleware(CORSMiddleware, allow_origins=["*"] if origin=="*" else [origin,"http://localhost:5173","http://127.0.0.1:5173"], allow_methods=["*"], allow_headers=["*"])

CACHE={}; TTL=int(os.getenv("CACHE_TTL_SECONDS","600"))
_hits=defaultdict(list)
STORE={o.id:o for o in DEMO}  # in-memory only; disappears on restart (documented)

# Portal scope: internships and campus placement jobs only.
CATEGORIES=["Internship","Placement"]

@app.middleware("http")
async def rate_limit(request:Request, call_next):
    if request.url.path.startswith("/api/opportunities/research"):
        now=time.time(); ip=request.client.host if request.client else "unknown"
        _hits[ip]=[t for t in _hits[ip] if now-t<60]
        if len(_hits[ip])>=10:
            return JSONResponse(status_code=429, content={"detail":"Rate limit: max 10 research requests/minute. Please wait."})
        _hits[ip].append(now)
    return await call_next(request)

@app.get("/api/health")
def health(): return {"status":"ok","tinyfish_configured":tinyfish.has_key(),"demo_mode":not tinyfish.has_key(),"supabase_configured":supabase_store.configured(),"email_configured":emailer.configured(),"push_configured":push_lib.configured(),"storage":"in-memory + Supabase cloud sync + browser localStorage","portal":"internships & placements"}

# ---------- Scheduled notification jobs (Vercel cron, CRON_SECRET protected) ----------
def require_cron(request:Request):
    secret=os.getenv("CRON_SECRET","").strip()
    if not secret:
        raise HTTPException(status_code=503, detail="Cron jobs are not configured (set CRON_SECRET).")
    if request.headers.get("authorization","")!=f"Bearer {secret}":
        raise HTTPException(status_code=401, detail="Invalid cron credentials.")

@app.post("/api/cron/deadline-reminders")
async def cron_deadline_reminders(request:Request):
    require_cron(request)
    return await notif_engine.run_deadline_reminders()

@app.post("/api/cron/match-digest")
async def cron_match_digest(request:Request):
    require_cron(request)
    return await notif_engine.run_match_digest()

@app.post("/api/cron/followups")
async def cron_followups(request:Request):
    require_cron(request)
    return await notif_engine.run_followups()

@app.get("/api/categories")
def categories(): return {"categories":CATEGORIES}

@app.get("/api/opportunities/demo")
def demo(): return {"opportunities":DEMO,"demo_mode":True}

@app.post("/api/opportunities/search")
def search_local(req:SearchRequest):
    items=req.opportunities or list(STORE.values())
    out=sort_opps(apply_filters(items,req.category,req.role,req.location,req.mode,req.deadline,req.skill,req.comp_band),req.sort)
    return {"opportunities":out,"total":len(out)}

@app.get("/api/opportunities/{opportunity_id}")
def get_one(opportunity_id:str):
    if opportunity_id in STORE: return STORE[opportunity_id]
    raise HTTPException(status_code=404, detail="Not found in current in-memory results. Run a search first — results reset when backend restarts.")

@app.post("/api/opportunities/validate")
def validate(payload:dict):
    url=payload.get("url","")
    return {"url":url,"valid":valid_url(url)}

@app.post("/api/opportunities/recheck")
async def recheck(payload:dict):
    """Probe an apply/source link and classify it ok | broken | unknown (SSRF-guarded)."""
    url=payload.get("url","")
    opp_id=(payload.get("id") or "").strip()
    if not valid_url(url):
        raise HTTPException(status_code=400, detail="Invalid or disallowed URL.")
    headers={"User-Agent":"Mozilla/5.0 (compatible; FormSaathiBot/1.0; +https://formsaathi-ten.vercel.app)"}
    status_code=None; error=False
    try:
        async with httpx.AsyncClient(timeout=15, follow_redirects=True) as c:
            try:
                r=await c.head(url, headers=headers)
                status_code=r.status_code
                if status_code in (403,405,401):  # many sites reject HEAD — retry with GET
                    r=await c.get(url, headers=headers)
                    status_code=r.status_code
            except httpx.HTTPError:
                error=True
    except Exception:
        error=True
    health=classify_link_status(status_code, error)
    if opp_id:
        await supabase_store.update_link_health(opp_id, health)
    return {"url":url,"status_code":status_code,"link_health":health,"checked_at":datetime.now(timezone.utc).isoformat()}

@app.post("/api/opportunities/research", response_model=ResearchResponse)
async def research(req:ResearchRequest):
    if not tinyfish.has_key():
        for o in DEMO: STORE[o.id]=o
        return ResearchResponse(opportunities=DEMO, stats={"candidates":0,"fetched":0,"extracted":len(DEMO),"duplicates_removed":0}, demo_mode=True, warnings=["Demo mode: TINYFISH_API_KEY not configured. Showing clearly-labelled sample records, not live results."])
    cache_key=f"{req.query.lower().strip()}|{req.category}|{req.role}|{','.join(req.skills)}|{req.location}|{req.max_fetch}"
    now=time.time()
    if cache_key in CACHE and now-CACHE[cache_key][0]<TTL:
        return ResearchResponse(opportunities=CACHE[cache_key][1], stats=CACHE[cache_key][2], cached=True)
    query=req.query
    if req.category and req.category.lower() not in query.lower(): query=f"{query} {req.category}"
    if req.role and req.role.lower() not in query.lower(): query=f"{query} {req.role}"
    for s in req.skills[:3]:
        if s.lower() not in query.lower(): query=f"{query} {s}"
    if req.location and req.location.lower() not in query.lower(): query=f"{query} {req.location}"
    if "india" not in query.lower(): query=f"{query} India"
    warnings=[]
    try:
        candidates=await tinyfish.search(query)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"TinyFish Search failed: {type(e).__name__}. Check API key/network and try again.")
    candidates=[c for c in candidates if valid_url(c["url"])][:req.max_fetch]
    fetched=0; opps=[]
    if candidates:
        try:
            data=await tinyfish.fetch_urls([c["url"] for c in candidates])
            results=data.get("results",[]) or []
            fetched=len(results)
            snip={c["url"]:c.get("snippet","") for c in candidates}
            for page in results:
                # Pages that are not internship/placement listings return None and are dropped.
                o=extract_opportunity(page, snippet=snip.get(page.get("url",""),""), requested_category=req.category)
                if o: opps.append(o)
            for err in (data.get("errors") or []): warnings.append(f"Fetch failed for {err.get('url')}: {err.get('error')}")
        except Exception as e:
            warnings.append(f"TinyFish Fetch failed: {type(e).__name__}")
    # Agent fallback only if requested and nothing extracted
    if req.use_agent_fallback and not opps and candidates:
        try:
            res=await tinyfish.agent_extract(candidates[0]["url"])
            if res: warnings.append("Agent fallback ran on first candidate; review its fields on the official page before applying.")
        except Exception: warnings.append("Agent fallback failed; Search/Fetch results shown.")
    opps, removed = dedupe(opps)
    opps=sort_opps(opps,"deadline")
    for o in opps: STORE[o.id]=o
    # Best-effort cloud persistence — never blocks or fails the research response.
    persisted=await supabase_store.upsert_opportunities(opps)
    stats={"candidates":len(candidates),"fetched":fetched,"extracted":len(opps),"duplicates_removed":removed,"persisted":persisted}
    CACHE[cache_key]=(now,opps,stats)
    return ResearchResponse(opportunities=opps, stats=stats, cached=False, warnings=warnings)
