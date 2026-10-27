import re, hashlib
from datetime import date, datetime, timezone
from urllib.parse import urlparse
from .models import Opportunity

# ---------- URL safety ----------
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

# ---------- Listing classification (portal only supports Internship & Placement) ----------
INTERNSHIP_HINTS=("internship","intern ","interns","intern,","intern.","summer intern","intern programme","internship opportunity")
PLACEMENT_HINTS=("full-time","full time","placement","permanent role","job opening","job description","job title",
                 "we are hiring","hiring for","fresher","freshers","graduate engineer trainee","management trainee",
                 "entry-level","entry level","campus hire","campus placement","job role","job location","job details")

def classify(text:str, requested:str|None=None)->str|None:
    """Return 'Internship' | 'Placement' | None. None means the page is not a job listing and must be dropped."""
    if requested in ("Internship","Placement"): return requested
    t=text.lower()
    if any(h in t for h in INTERNSHIP_HINTS): return "Internship"
    if any(h in t for h in PLACEMENT_HINTS): return "Placement"
    return None

# ---------- Role detection ----------
ROLE_PATTERNS=[
 ("Frontend Developer",("frontend developer","front end developer","frontend engineer","ui developer","front-end developer")),
 ("Backend Developer",("backend developer","back end developer","backend engineer","back-end developer")),
 ("Full Stack Developer",("full stack developer","full-stack developer","full stack engineer","full-stack engineer")),
 ("Software Engineer",("software engineer","software developer","sde","software development engineer","programmer analyst")),
 ("Data Analyst",("data analyst","business analyst","analytics intern","analytics engineer")),
 ("Data Scientist",("data scientist",)),
 ("Data Engineer",("data engineer",)),
 ("Product Manager",("product manager","product management","pm intern","associate product")),
 ("UX/UI Designer",("ux designer","ui designer","ux/ui designer","ui/ux designer","product designer","user experience designer")),
 ("Graphic Designer",("graphic designer","visual designer")),
 ("Marketing",("digital marketing","marketing intern","marketing executive","marketing manager","marketing associate","seo executive")),
 ("Content Writer",("content writer","content writing","technical writer","copywriter")),
 ("Business Development",("business development","bd executive","bdm ","sales intern","sales executive","business development executive")),
 ("Human Resources",("human resources","hr intern","hr executive","hr recruiter","talent acquisition","hr generalist")),
 ("DevOps Engineer",("devops","site reliability engineer","sre engineer","cloud engineer")),
 ("QA Engineer",("qa engineer","test engineer","quality analyst","software tester","quality assurance")),
 ("Mobile App Developer",("android developer","ios developer","mobile app developer","flutter developer","mobile developer")),
 ("Graduate Engineer Trainee",("graduate engineer trainee","management trainee","graduate trainee")),
 ("Research Intern",("research intern","research assistant","research fellow")),
 ("Finance Analyst",("finance intern","finance analyst","accounts executive","financial analyst")),
 ("Operations Executive",("operations intern","operations executive","operations analyst")),
]

def detect_role(title:str, text:str)->str|None:
    for label,patterns in ROLE_PATTERNS:
        if any(p in title.lower() for p in patterns): return label
    for label,patterns in ROLE_PATTERNS:
        if any(p in text.lower()[:4000] for p in patterns): return label
    return None

# ---------- Skill extraction (curated dictionary; nothing invented) ----------
SKILLS=[
 "machine learning","deep learning","data science","data analysis","power bi","google analytics",
 "digital marketing","content writing","project management","product management","business development",
 "human resources","ui/ux design","ui design","ux design","graphic design","embedded systems","rest api",
 "node.js","next.js","express.js","spring boot","react","angular","vue","django","flask","flutter",
 "tensorflow","pytorch","pandas","numpy","tableau","docker","kubernetes","aws","azure","gcp","redis",
 "postgresql","mongodb","mysql","sql","nosql","graphql","tailwind","html","css","javascript","typescript",
 "python","java","kotlin","swift","rust","php","ruby","golang","c++","c#","git","linux","matlab",
 "autocad","solidworks","figma","canva","excel","statistics","seo","sem","communication","teamwork",
 "leadership","problem solving","presentation skills","ms office",
]

def extract_skills(text:str, limit:int=10)->list[str]:
    low=text.lower()
    found=[]
    for skill in SKILLS:
        pat=r"(?<![a-z0-9+#])"+re.escape(skill)+r"(?![a-z0-9+#])"
        if re.search(pat, low) and skill not in found:
            found.append(skill)
        if len(found)>=limit: break
    return found

# ---------- Location (Indian cities + remote) ----------
CITY_ALIASES={
    "bangalore":"Bengaluru","bengaluru":"Bengaluru","mumbai":"Mumbai","new delhi":"New Delhi","delhi":"New Delhi",
    "hyderabad":"Hyderabad","pune":"Pune","chennai":"Chennai","kolkata":"Kolkata","gurugram":"Gurugram",
    "gurgaon":"Gurugram","noida":"Noida","ahmedabad":"Ahmedabad","jaipur":"Jaipur","chandigarh":"Chandigarh",
    "kochi":"Kochi","indore":"Indore","nagpur":"Nagpur","coimbatore":"Coimbatore","lucknow":"Lucknow",
    "bhopal":"Bhopal","visakhapatnam":"Visakhapatnam","vadodara":"Vadodara","nashik":"Nashik",
    "mysuru":"Mysuru","mysore":"Mysuru","remote":"Remote","work from home":"Remote",
}

def detect_location(text:str)->str|None:
    low=text.lower()
    hits=[]
    for alias,canon in CITY_ALIASES.items():
        if re.search(r"(?<![a-z])"+re.escape(alias)+r"(?![a-z])", low) and canon not in hits:
            hits.append(canon)
        if len(hits)>=2: break
    if hits: return " / ".join(hits)
    if "india" in low: return "India"
    return None

# ---------- Deadline ----------
MONTHS={m:i+1 for i,m in enumerate(["january","february","march","april","may","june","july","august","september","october","november","december"])}
MONTHS.update({m[:3]:v for m,v in list(MONTHS.items())[:12]})

def parse_deadline(text:str):
    """Return (iso_date_or_None, matched_text_or_None). Never invents."""
    if not text: return None, None
    low=text.lower()
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

# ---------- Compensation (stipend / salary / CTC, verbatim from page) ----------
COMP_PATTERN=re.compile(
    r"([^\n.]{0,30}(?:stipend|salary|ctc|compensation|pay scale|package)[^\n.]{0,55}"
    r"|₹\s?\d[\d,]*[^\n.]{0,35}|rs\.?\s?\d[\d,]*[^\n.]{0,35}|inr\s?\d[\d,]*[^\n.]{0,35}"
    r"|\b\d+(?:\.\d+)?\s?lpa\b[^\n.]{0,25}|\bunpaid\b)", re.I)

def extract_compensation(text:str)->str|None:
    m=COMP_PATTERN.search(text[:8000])
    if not m: return None
    return re.sub(r"\s+"," ",m.group(0)).strip()[:120]

# ---------- Full page -> Opportunity (or None when it is not a job listing) ----------
def extract_opportunity(page:dict, snippet:str="", requested_category:str|None=None)->Opportunity|None:
    url=page.get("final_url") or page.get("url")
    if not valid_url(url): return None
    text=(page.get("text") or "") if isinstance(page.get("text"),str) else ""
    title=(page.get("title") or "").strip()
    if not title and text: title=text.strip().splitlines()[0][:120]
    if not title: return None
    combined=f"{title}\n{text[:6000]}"
    # Portal scope: keep internships & placements only — everything else is dropped from output.
    category=classify(combined, requested_category)
    if category is None: return None
    iso, raw = parse_deadline(text[:8000])
    elig=[]
    for line in re.split(r"[\n•\-]", text[:8000]):
        l=line.strip()
        if 10 < len(l) < 220 and any(k in l.lower() for k in ["eligib","who can apply","qualification","requirements","skills required","students","undergraduate","postgraduate","pursuing","batch of","open to"]):
            if l not in elig: elig.append(l)
        if len(elig)>=5: break
    mode="Unknown"
    low=combined.lower()
    if "hybrid" in low: mode="Hybrid"
    elif "in-person" in low or "in person" in low or "on-site" in low or "onsite" in low or "work from office" in low: mode="In-person"
    elif "remote" in low or "work from home" in low or "wfh" in low or "online" in low: mode="Remote"
    app_url=None
    for link in (page.get("links") or []):
        if valid_url(link) and any(k in link.lower() for k in ["apply","register","application","career","job"]): app_url=link; break
    st=source_type(url)
    oid=hashlib.sha256(f"{title.lower().strip()}|{domain(url)}".encode()).hexdigest()[:16]
    desc=(page.get("description") or snippet or (text.strip()[:280] if text else None))
    return Opportunity(
        id=oid, title=title[:200], category=category, role=detect_role(title, text),
        organizer=None, description=(desc[:500] if desc else None),
        skills=extract_skills(combined), eligibility=elig,
        location=detect_location(combined), mode=mode,
        deadline=iso, deadline_text=raw, deadline_status=deadline_status(iso),
        compensation=extract_compensation(text),
        official_url=url if st=="official" else None, application_url=app_url,
        source_url=url, source_type=st, source_domain=domain(url),
        last_checked_at=datetime.now(timezone.utc).isoformat(),
        verification_status="verified_official" if st=="official" else "secondary_source")

# ---------- Dedupe / sort / filter ----------
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

def apply_filters(items, category=None, role=None, location=None, mode=None, deadline=None, skill=None):
    out=items
    if category: out=[o for o in out if o.category.lower()==category.lower()]
    if role: out=[o for o in out if (o.role or "").lower()==role.lower()]
    if skill: out=[o for o in out if skill.lower() in [s.lower() for s in o.skills]]
    if location: out=[o for o in out if location.lower() in (o.location or "").lower()]
    if mode: out=[o for o in out if (o.mode or "").lower()==mode.lower()]
    if deadline=="upcoming": out=[o for o in out if o.deadline_status in ("open","closing_soon")]
    if deadline=="unknown": out=[o for o in out if o.deadline_status=="unknown"]
    if deadline=="expired": out=[o for o in out if o.deadline_status=="expired"]
    return out
