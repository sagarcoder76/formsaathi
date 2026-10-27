import re, hashlib, ipaddress
from datetime import date, datetime, timezone
from urllib.parse import urlparse
from .models import Opportunity

# ---------- URL safety ----------
BLOCKED_HOSTS={"localhost","127.0.0.1","0.0.0.0"}
def _is_blocked_ip(host:str)->bool:
    """True for loopback/private/link-local/reserved IP literals (e.g. cloud metadata 169.254.169.254)."""
    try:
        ip=ipaddress.ip_address(host)
    except ValueError:
        return False
    return ip.is_loopback or ip.is_private or ip.is_link_local or ip.is_reserved or ip.is_multicast or ip.is_unspecified

def valid_url(u:str|None)->bool:
    if not u: return False
    try:
        p=urlparse(u)
        host=p.hostname or ""
        if p.scheme not in ("http","https") or not p.netloc: return False
        if host in BLOCKED_HOSTS or host.endswith(".local"): return False
        if _is_blocked_ip(host): return False
        return True
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

_NUM=r"(\d+(?:\.\d+)?)"
_LPA_RE=re.compile(_NUM+r"\s*(?:lpa|lakh\w*|lac\w*)", re.I)
_MONEY_RE=re.compile(r"(?:₹|rs\.?|inr)\s*(\d[\d,]*(?:\.\d+)?)\s*(k|l|lac|lakh)?", re.I)
_ANNUAL_HINTS=("lpa","annual","annum","p.a","pa ","year","yearly","ctc","package")

def _to_inr(num:str, suffix:str|None)->float:
    value=float(num.replace(",",""))
    if suffix and suffix.lower() in ("k",): value*=1_000
    if suffix and suffix.lower() in ("l","lac","lakh"): value*=100_000
    return value

def parse_compensation(text:str):
    """Return (kind, min_monthly_inr, max_monthly_inr). Never guesses: None when nothing parseable."""
    if not text: return None, None, None
    low=text.lower()
    if re.search(r"\bunpaid\b", low) or "no stipend" in low or "without stipend" in low:
        return "unpaid", 0, 0
    amounts=[]  # (amount_inr, is_annual)
    lpa_spans=[m.span() for m in _LPA_RE.finditer(text)]
    for m in _LPA_RE.finditer(text):
        amounts.append((float(m.group(1))*100_000, True))
    window=text  # parse the whole compensation sentence passed in
    for m in _MONEY_RE.finditer(window):
        if any(not (m.end() <= ls or m.start() >= le) for ls, le in lpa_spans): continue  # counted by the LPA rule
        amount=_to_inr(m.group(1), m.group(2))
        tail=window[m.end():m.end()+12].lower()
        head=window[max(0,m.start()-25):m.start()].lower()
        is_annual=any(h in head or h in tail for h in _ANNUAL_HINTS)
        amounts.append((amount, is_annual))
    if not amounts: return None, None, None
    monthly=[round(a/12) if annual else round(a) for a, annual in amounts]
    monthly=sorted(set(monthly))
    return "paid", monthly[0], (monthly[-1] if len(monthly)>1 else monthly[0])

# ---------- Fraud / scam detection ----------
FRAUD_RULES=[
 (re.compile(r"registration\s+fee", re.I), "Mentions a registration fee — legitimate employers rarely charge applicants"),
 (re.compile(r"(?:security|refundable)\s+deposit", re.I), "Asks for a security/refundable deposit — a common job-scam pattern"),
 (re.compile(r"(?:training|onboarding|document\s+verification|joining)\s+fee", re.I), "Charges a training/onboarding/verification/joining fee"),
 (re.compile(r"pay\s+(?:a|the|any)?\s*(?:small|one[- ]time|token)?\s*fee\s+to\s+(?:join|confirm|register|apply|secure)", re.I), "Requests payment before you can apply or join"),
 (re.compile(r"(?:upi|gpay|google\s*pay|phonepe|paytm)[^.\n]{0,50}(?:pay|send|transfer|deposit)", re.I), "Requests money over a personal UPI/wallet instead of an official portal"),
 (re.compile(r"earn\s+(?:₹|rs\.?|inr)?\s?\d[\d,]*\s*(?:per\s+day|daily)[^.\n]{0,30}(?:work from home|data entry)", re.I), "High daily-income 'work from home' pitch — verify the company carefully"),
]
_NEGATION_RE=re.compile(r"(?:\bno\b|\bwithout\b|free of charge|not required|not applicable|none)", re.I)

def detect_fraud(text:str)->list[str]:
    flags=[]
    for rule, message in FRAUD_RULES:
        m=rule.search(text)
        if not m: continue
        before=text[max(0,m.start()-35):m.start()].lower()
        after=text[m.end():m.end()+30].lower()
        # Skip negated mentions such as "no registration fee" or "registration fee not required"
        if _NEGATION_RE.search(before) or _NEGATION_RE.search(after): continue
        if message not in flags: flags.append(message)
        if len(flags)>=3: break
    return flags

# ---------- Organizer / company detection ----------
_GENERIC_TLDS={"com","org","net","io","co","gov","nic","ac","edu","in","ai","app","dev","careers"}
# Keywords use inline [Xx] case classes (not re.I) so the capture stays uppercase-first —
# prose like "hiring at our office" can never be mistaken for a company name.
_ORG_PATTERNS=[
 re.compile(r"\b(?:[Hh]iring|[Cc]areers?|[Jj]obs?)\s+(?:at|by|with)\s+([A-Z][A-Za-z0-9&.,'’\- ]{2,40}?)(?:[.|,|]|\s+[Ii]s\s|\s+[Aa]re\s|\s+[Ii]n\s|\n|$)"),
 re.compile(r"\b([A-Z][A-Za-z0-9&.,'’\- ]{2,40}?)\s+[Ii]s\s+[Hh]iring\b"),
 re.compile(r"\b(?:company|organization|organisation|employer|posted by|hosted by)\s*[:\-]\s*([A-Za-z0-9&.,'’\- ]{2,40})", re.I),
 re.compile(r"\b(?:[Ii]nternship|[Jj]ob|[Rr]ole|[Pp]osition)\s+(?:at|with|by)\s+([A-Z][A-Za-z0-9&.,'’\- ]{2,40}?)(?:[.|,|]|\s+[Ii]n\s|\n|$)"),
]

def organizer_from_domain(url:str)->str|None:
    d=domain(url)
    if not d: return None
    parts=d.split(".")
    if len(parts)>=3 and parts[-2] in {"co","com","org","gov","nic","ac"}:
        label=parts[-3]
    else:
        label=parts[-2] if len(parts)>=2 else parts[0]
    label=label.replace("-"," ").replace("_"," ")
    return " ".join(w.capitalize() for w in label.split()) or None

def detect_organizer(page:dict, url:str)->str|None:
    title=page.get("title") or ""
    text=page.get("text") or ""
    haystack=f"{title}\n{text[:3000]}"
    for pat in _ORG_PATTERNS:
        m=pat.search(haystack)
        if m:
            cand=re.sub(r"\s+"," ",m.group(1)).strip(" .,-|'’")
            if 2<=len(cand)<=40 and cand.lower() not in {"india","the team","our team"}:
                return cand
    return organizer_from_domain(url)

# ---------- Link health ----------
def classify_link_status(status_code:int|None, error:bool=False)->str:
    """Map an HTTP probe to ok | broken | unknown. Bot-blocks/5xx are 'unknown', not dead links."""
    if error or status_code is None: return "unknown"
    if status_code in (404, 410): return "broken"
    if status_code < 400: return "ok"
    return "unknown"  # 401/403 bot protection, 4xx auth, 5xx server trouble — never claim broken

# ---------- Error / bot-wall page detection ----------
# Fetched URLs can return framework error pages or anti-bot interstitials whose chrome
# text still mentions an internship — these must never be treated as real listings.
ERROR_PAGE_PATTERNS=(
    "application error", "client-side exception", "something went wrong",
    "an error occurred", "internal server error", "page not found", "404 not found",
    "just a moment", "attention required", "unusual traffic", "please enable javascript",
    "enable javascript to continue", "captcha", "access denied", "request rejected",
    "this site can't be reached", "bad gateway", "service unavailable",
)

def is_error_page(title:str, text:str)->bool:
    head=f"{title}\n{text[:400]}".lower()
    return any(p in head for p in ERROR_PAGE_PATTERNS)

# ---------- Full page -> Opportunity (or None when it is not a job listing) ----------
def extract_opportunity(page:dict, snippet:str="", requested_category:str|None=None)->Opportunity|None:
    url=page.get("final_url") or page.get("url")
    if not valid_url(url): return None
    text=(page.get("text") or "") if isinstance(page.get("text"),str) else ""
    title=re.sub(r"^#{1,6}\s+", "", (page.get("title") or "").strip()).strip()
    if not title and text: title=re.sub(r"^#{1,6}\s+", "", text.strip().splitlines()[0][:120]).strip()
    if not title: return None
    if is_error_page(title, text): return None
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
    comp_text=extract_compensation(text)
    comp_kind, comp_min, comp_max = parse_compensation(comp_text or text[:8000])
    return Opportunity(
        id=oid, title=title[:200], category=category, role=detect_role(title, text),
        organizer=detect_organizer(page, url), description=(desc[:500] if desc else None),
        skills=extract_skills(combined), eligibility=elig,
        location=detect_location(combined), mode=mode,
        deadline=iso, deadline_text=raw, deadline_status=deadline_status(iso),
        compensation=comp_text, compensation_kind=comp_kind,
        compensation_min=comp_min, compensation_max=comp_max,
        fraud_flags=detect_fraud(combined),
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

def apply_filters(items, category=None, role=None, location=None, mode=None, deadline=None, skill=None, comp_band=None):
    out=items
    if category: out=[o for o in out if o.category.lower()==category.lower()]
    if role: out=[o for o in out if (o.role or "").lower()==role.lower()]
    if skill: out=[o for o in out if skill.lower() in [s.lower() for s in o.skills]]
    if location: out=[o for o in out if location.lower() in (o.location or "").lower()]
    if mode: out=[o for o in out if (o.mode or "").lower()==mode.lower()]
    if deadline=="upcoming": out=[o for o in out if o.deadline_status in ("open","closing_soon")]
    if deadline=="unknown": out=[o for o in out if o.deadline_status=="unknown"]
    if deadline=="expired": out=[o for o in out if o.deadline_status=="expired"]
    if comp_band:
        if comp_band=="unpaid":
            out=[o for o in out if o.compensation_kind=="unpaid"]
        else:
            if comp_band.endswith("-plus"):
                low=int(comp_band[:-5]); high=None
            else:
                lo, hi = comp_band.split("-")
                low=int(lo); high=int(hi)
            def in_band(o):
                if o.compensation_kind!="paid" or o.compensation_min is None: return False
                top=o.compensation_max if o.compensation_max is not None else o.compensation_min
                return o.compensation_min <= (high or 10**9) and top >= low
            out=[o for o in out if in_band(o)]
    return out
