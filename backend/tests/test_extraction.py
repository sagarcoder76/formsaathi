import sys; sys.path.insert(0, "..")
from app.extraction import parse_deadline, deadline_status, dedupe, valid_url, extract_opportunity
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
def test_extract_missing_fields_not_invented():
    o=extract_opportunity({"url":"https://example.com/x","title":"Test Fest","text":"A student event in India. Online.","links":[]})
    assert o is not None and o.deadline is None and o.organizer is None
