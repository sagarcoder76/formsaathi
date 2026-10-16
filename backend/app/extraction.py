import re, hashlib
from datetime import date, datetime, timezone
from urllib.parse import urlparse
from .models import Opportunity

BLOCKED_HOSTS={"localhost","127.0.0.1","0.0.0.0"}
def valid_url(u:str|None)->bool:
    if not u: return False
    try:
        p=urlparse(u)
        return p.scheme in ("http","https") and bool(p.netloc) and p.hostname not in BLOCKED_HOSTS and not (p.hostname or "").endswith(".local")
    except Exception: return False

def domain(u:str)->str:
    try: return (urlparse(u).hostname or "").replace("www.","")
    except Exception: return ""

OFFICIAL_HINTS=(".gov.in",".nic.in",".edu",".ac.in",".org")
def source_type(url:str, title:str="")->str:
    d=domain(url)
    if any(d.endswith(h) or h in d for h in OFFICIAL_HINTS): return "official"
    return "secondary"

MONTHS={m:i+1 for i,m in enumerate(["january","february","march","april","may","june","july","august","september","october","november","december"])}
MONTHS.update({m[:3]:v for m,v in list(MONTHS.items())[:12]})

def parse_deadline(text:str):
    """Return (iso_date_or_None, matched_text_or_None). Never invents."""
    if not text: return None, None
    low=text.lower()
    # look near deadline keywords first, else any date
    patterns=[
        r"(?:deadline|last date|apply by|applications close|closes on|registration closes)[^.\n]{0,60}?(\d{1,2}[\s/-](?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*[\s,/-]*\d{4}|\d{4}-\d{2}-\d{2}|\d{1,2}/\d{1,2}/\d{4})",
        r"(\d{1,2}[\s/-](?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*[\s,/-]*\d{4})",
        r"(\d{4}-\d{2}-\d{2})",
    ]
    for pat in patterns:
        m=re.search(pat, low)
        if m:
            raw=m.group(1).strip()
            iso=_to_iso(raw)
            if iso: return iso, raw
    return None, None

def _to_iso(raw:str):
    raw=raw.strip().replace(","," ")
    try: return datetime.strptime(raw, "%Y-%m-%d").date().isoformat()
    except Exception: pass
    m=re.match(r"(\d{1,2})[\s/-]+([a-z]+)[\s/-]*(\d{4})", raw)
    if m:
        mon=MONTHS.get(m.group(2)[:3]) or MONTHS.get(m.group(2))
        if mon:
            try: return date(int(m.group(3)), mon, int(m.group(1))).isoformat()
            except Exception: return None
    return None

def deadline_status(iso:str|None)->str:
    if not iso: return "unknown"
    try: d=date.fromisoformat(iso)
    except Exception: return "unknown"
    today=date.today()
    if d < today: return "expired"
    if (d-today).days <= 14: return "closing_soon"
    return "open"

def categorize(text:str, requested:str|None=None)->str:
    if requested: return requested
    t=text.lower()
    for cat,keys in [("Scholarship",["scholarship"]),("Hackathon",["hackathon"]),("Coding Competition",["coding competition","coding challenge","code contest"]),("Internship",["internship","intern "]),("Fellowship",["fellowship"]),("Free Course",["free course","free learning","mooc"]),("Workshop",["workshop"]),("Conference",["conference","summit"]),("Innovation Challenge",["innovation challenge","challenge"]),("Government Programme",["government","govt","ministry"]),("Job",["hiring","entry-level job","fresher job"])]:
        if any(k in t for k in keys): return cat
    return "Other"

def extract_opportunity(page:dict, snippet:str="", requested_category:str|None=None)->Opportunity|None:
    url=page.get("final_url") or page.get("url")
    if not valid_url(url): return None
    text=(page.get("text") or "") if isinstance(page.get("text"),str) else ""
    title=(page.get("title") or "").strip()
    if not title and text: title=text.strip().splitlines()[0][:120]
    if not title: return None
    combined=f"{title}\n{text[:6000]}"
    iso, raw = parse_deadline(text[:8000])
    # eligibility: lines mentioning eligib/who can/students
    elig=[]
    for line in re.split(r"[\n•\-]", text[:8000]):
        l=line.strip()
        if 10 < len(l) < 220 and any(k in l.lower() for k in ["eligib","who can apply","students","undergraduate","graduate","open to","participants must"]):
            if l not in elig: elig.append(l)
        if len(elig)>=5: break
    fees=None
    fm=re.search(r"(free|no fee|₹\s?\d[\d,]*|rs\.?\s?\d[\d,]*|\$\s?\d+)[^\n.]{0,40}", text[:6000], re.I)
    if fm and any(k in fm.group(0).lower() for k in ["free","fee","₹","rs","$"]): fees=fm.group(0).strip()[:120]
    mode="Unknown"
    low=combined.lower()
    if "remote" in low or "online" in low: mode="Online"
    if "hybrid" in low: mode="Hybrid"
    if "in-person" in low or "in person" in low: mode="In-person"
    app_url=None
    for link in (page.get("links") or []):
        if valid_url(link) and any(k in link.lower() for k in ["apply","register","application"]): app_url=link; break
    st=source_type(url)
    oid=hashlib.sha256(f"{title.lower().strip()}|{domain(url)}".encode()).hexdigest()[:16]
    desc=(page.get("description") or snippet or (text.strip()[:280] if text else None))
    return Opportunity(id=oid,title=title[:200],category=categorize(combined,requested_category),organizer=None,
        description=(desc[:500] if desc else None),eligibility=elig,location="India" if "india" in low else None,mode=mode,
        deadline=iso,deadline_text=raw,deadline_status=deadline_status(iso),fees=fees,official_url=url if st=="official" else None,
        application_url=app_url,source_url=url,source_type=st,source_domain=domain(url),
        last_checked_at=datetime.now(timezone.utc).isoformat(),verification_status="verified_official" if st=="official" else "secondary_source")

def normalize_key(o:Opportunity)->str:
    t=re.sub(r"[^a-z0-9 ]","",o.title.lower()); t=re.sub(r"\s+"," ",t).strip()
    org=re.sub(r"[^a-z0-9]","",(o.organizer or "").lower())
    # Exact normalized title (+ organizer when known) — avoids merging merely similar names
    return f"{t}|{org}"

def dedupe(items:list[Opportunity]):
    seen={}; removed=0; out=[]
    for o in items:
        k=normalize_key(o)
        if k in seen:
            removed+=1
            existing=seen[k]
            if o.source_url not in existing.also_found_on: existing.also_found_on.append(o.source_url)
            if o.source_type=="official" and existing.source_type!="official":
                o.also_found_on=list(set(existing.also_found_on+[existing.source_url]))
                idx=out.index(existing); out[idx]=o; seen[k]=o
            continue
        seen[k]=o; out.append(o)
    return out, removed

def sort_opps(items, sort="relevance"):
    if sort=="deadline": return sorted(items, key=lambda x:(x.deadline is None, x.deadline or "9999-12-31"))
    if sort=="recent": return sorted(items, key=lambda x:x.last_checked_at, reverse=True)
    return items

def apply_filters(items, category=None, location=None, mode=None, deadline=None, fee=None):
    out=items
    if category: out=[o for o in out if o.category.lower()==category.lower()]
    if location: out=[o for o in out if location.lower() in (o.location or "").lower()]
    if mode: out=[o for o in out if (o.mode or "").lower()==mode.lower()]
    if deadline=="upcoming": out=[o for o in out if o.deadline_status in ("open","closing_soon")]
    if deadline=="unknown": out=[o for o in out if o.deadline_status=="unknown"]
    if deadline=="expired": out=[o for o in out if o.deadline_status=="expired"]
    if fee=="free": out=[o for o in out if o.fees and "free" in o.fees.lower()]
    return out
