import sys; sys.path.insert(0, "..")
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health_reports_supabase_flag():
    r = client.get("/api/health")
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "ok"
    assert "supabase_configured" in body

def test_recheck_rejects_bad_url():
    r = client.post("/api/opportunities/recheck", json={"url": "not-a-url"})
    assert r.status_code == 400

def test_recheck_blocks_ssrf_targets():
    r = client.post("/api/opportunities/recheck", json={"url": "http://169.254.169.254/latest/meta-data"})
    assert r.status_code == 400
    r = client.post("/api/opportunities/recheck", json={"url": "http://127.0.0.1:8000/admin"})
    assert r.status_code == 400
