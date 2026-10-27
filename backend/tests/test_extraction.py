import sys; sys.path.insert(0, "..")
from app.extraction import parse_deadline, deadline_status, dedupe, valid_url, extract_opportunity, classify, extract_skills, detect_role, apply_filters
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

def test_role_and_skill_filters():
    o1=Opportunity(id="1",title="A",category="Internship",role="Data Analyst",skills=["sql","excel"],location="Remote",mode="Remote",source_url="https://a.com",last_checked_at="2026-01-01T00:00:00Z")
    o2=Opportunity(id="2",title="B",category="Placement",role="Software Engineer",skills=["java"],location="Pune",mode="In-person",source_url="https://b.com",last_checked_at="2026-01-01T00:00:00Z")
    assert len(apply_filters([o1,o2],category="Placement"))==1
    assert len(apply_filters([o1,o2],role="Data Analyst"))==1
    assert len(apply_filters([o1,o2],skill="SQL"))==1
    assert len(apply_filters([o1,o2],location="pune"))==1
