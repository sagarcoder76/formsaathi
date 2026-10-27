import sys; sys.path.insert(0, "..")
from app.extraction import parse_deadline, deadline_status, dedupe, valid_url, extract_opportunity, classify, extract_skills, detect_role, apply_filters, parse_compensation, detect_fraud
from app.models import Opportunity
from datetime import date, timedelta

def test_parse_deadline():
    iso,raw=parse_deadline("Apply now. Deadline: 30 December 2026")
    assert iso=="2026-12-30"
def test_no_fabrication():
    iso,raw=parse_deadline("No dates mentioned here")
    assert iso is None
def test_expired():
    past=(date.today()-timedelta(days=1)).isoformat()
    assert deadline_status(past)=="expired"
    assert deadline_status(None)=="unknown"
def test_valid_url_blocks_localhost():
    assert not valid_url("http://127.0.0.1/admin")
    assert valid_url("https://example.com/apply")
def _o(i,title,src,stype="secondary"):
    return Opportunity(id=str(i),title=title,source_url=src,source_type=stype,last_checked_at="2026-01-01T00:00:00Z")
def test_dedupe():
    out,removed=dedupe([_o(1,"Hack 2026","https://a.com"),_o(2,"Hack 2026","https://b.com")])
    assert removed==1 and len(out)==1

def test_classify_portal_scope():
    assert classify("Software Engineering Internship for students")=="Internship"
    assert classify("Full-time job opening for freshers, we are hiring SDEs")=="Placement"
    # Non-job content (scholarships, hackathons, courses) must be excluded
    assert classify("National scholarship for college students") is None
    assert classify("48-hour hackathon with cash prizes") is None

def test_non_job_page_is_dropped():
    o=extract_opportunity({"url":"https://example.com/x","title":"Test Fest","text":"A student cultural event in India. Online.","links":[]})
    assert o is None

def test_internship_extraction_has_role_skills_and_no_invention():
    page={"url":"https://example.com/job","title":"Frontend Developer Intern",
          "text":"Frontend Developer Internship in Bengaluru, hybrid mode. Skills required: React, TypeScript, JavaScript and Git. "
                "Stipend ₹25,000/month. Eligibility: B.Tech CS students only. No deadline published.",
          "links":["https://example.com/apply/frontend"]}
    o=extract_opportunity(page)
    assert o is not None
    assert o.category=="Internship"
    assert o.role=="Frontend Developer"
    assert {"react","typescript","javascript","git"}.issubset(set(o.skills))
    assert o.location=="Bengaluru" and o.mode=="Hybrid"
    assert "25,000" in (o.compensation or "")
    assert o.application_url=="https://example.com/apply/frontend"
    # Missing deadline must stay unknown — never invented
    assert o.deadline is None and o.deadline_status=="unknown"
    assert o.organizer is None

def test_placement_extraction():
    page={"url":"https://example.com/job","title":"Graduate Engineer Trainee",
          "text":"Full-time campus placement job for the 2026 batch. CTC ₹6.5 LPA. Job location Pune, in-person.",
          "links":[]}
    o=extract_opportunity(page)
    assert o is not None and o.category=="Placement"
    assert o.role=="Graduate Engineer Trainee" and o.location=="Pune"

def test_requested_category_forces_classification():
    page={"url":"https://example.com/job","title":"Mystery Programme","text":"Generic page without obvious job words.","links":[]}
    o=extract_opportunity(page, requested_category="Internship")
    assert o is not None and o.category=="Internship"

def test_skill_dictionary_only_returns_real_matches():
    assert extract_skills("Must know Python and SQL, plus communication")==["sql","python","communication"]
    assert extract_skills("No technical terms here")==[]
    assert detect_role("Data Analyst Intern","")=="Data Analyst"

def test_parse_compensation():
    assert parse_compensation("₹25,000/month stipend")==("paid",25000,25000)
    assert parse_compensation("Stipend range ₹15,000 to ₹25,000 per month")==("paid",15000,25000)
    # Annual CTC is normalized to INR per month (12,00,000 / 12)
    assert parse_compensation("CTC ₹12 LPA")==("paid",100000,100000)
    assert parse_compensation("₹6.5 LPA package")[1]==54167
    assert parse_compensation("Unpaid — certificate only")==("unpaid",0,0)
    # Nothing parseable -> None, never invented
    assert parse_compensation("Compensation discussed during interview")==(None,None,None)

def test_fraud_detection():
    assert detect_fraud("A one-time registration fee of ₹999 is required to confirm your seat.")
    assert detect_fraud("Pay a small fee to join the training programme.")
    # Negated mentions must NOT be flagged
    assert detect_fraud("No registration fee — applying is completely free.")==[]
    assert detect_fraud("Registration fee: not applicable")==[]

def test_fraud_flags_attached_to_opportunity():
    page={"url":"https://example.com/job","title":"Data Entry Intern",
          "text":"Work from home internship. Earn ₹1500 per day. A refundable security deposit is required before onboarding.",
          "links":[]}
    o=extract_opportunity(page)
    assert o is not None and len(o.fraud_flags)>=1

def test_comp_band_filter():
    o1=Opportunity(id="1",title="A",category="Internship",role="Data Analyst",skills=["sql"],location="Remote",mode="Remote",source_url="https://a.com",last_checked_at="2026-01-01T00:00:00Z",compensation_kind="paid",compensation_min=8000,compensation_max=8000)
    o2=Opportunity(id="2",title="B",category="Placement",role="Software Engineer",skills=["java"],location="Pune",mode="In-person",source_url="https://b.com",last_checked_at="2026-01-01T00:00:00Z",compensation_kind="paid",compensation_min=100000,compensation_max=100000)
    o3=Opportunity(id="3",title="C",category="Internship",role="Marketing",skills=["seo"],location="Mumbai",mode="Remote",source_url="https://c.com",last_checked_at="2026-01-01T00:00:00Z",compensation_kind="unpaid",compensation_min=0,compensation_max=0)
    assert len(apply_filters([o1,o2,o3],comp_band="unpaid"))==1
    assert len(apply_filters([o1,o2,o3],comp_band="0-10000"))==1
    assert len(apply_filters([o1,o2,o3],comp_band="25000-plus"))==1
    # Unknown compensation never sneaks into a paid band
    o4=Opportunity(id="4",title="D",category="Internship",role="QA Engineer",skills=[],location="Delhi",mode="Hybrid",source_url="https://d.com",last_checked_at="2026-01-01T00:00:00Z")
    assert apply_filters([o4],comp_band="0-10000")==[]

def test_role_and_skill_filters():
    o1=Opportunity(id="1",title="A",category="Internship",role="Data Analyst",skills=["sql","excel"],location="Remote",mode="Remote",source_url="https://a.com",last_checked_at="2026-01-01T00:00:00Z")
    o2=Opportunity(id="2",title="B",category="Placement",role="Software Engineer",skills=["java"],location="Pune",mode="In-person",source_url="https://b.com",last_checked_at="2026-01-01T00:00:00Z")
    assert len(apply_filters([o1,o2],category="Placement"))==1
    assert len(apply_filters([o1,o2],role="Data Analyst"))==1
    assert len(apply_filters([o1,o2],skill="SQL"))==1
    assert len(apply_filters([o1,o2],location="pune"))==1
