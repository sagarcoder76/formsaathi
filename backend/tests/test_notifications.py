import sys; sys.path.insert(0, "..")
from datetime import date, datetime, timedelta, timezone

import httpx
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app import notifications as n
from app import emailer, push

client = TestClient(app)
CRON_PATHS = ["/api/cron/deadline-reminders", "/api/cron/match-digest",
              "/api/cron/followups", "/api/cron/catalogue-health"]


# ---------- pure logic ----------
def test_default_prefs_are_inapp_only():
    prefs = dict(n.DEFAULT_PREFS)
    assert n.channels_for("deadline", prefs) == ["inapp"]
    assert n.channels_for("matches", prefs) == ["inapp"]
    assert n.channels_for("followup", prefs) == ["inapp"]


def test_prefs_enable_multiple_channels():
    prefs = {**n.DEFAULT_PREFS, "deadline_email": True, "deadline_push": True}
    assert n.channels_for("deadline", prefs) == ["inapp", "email", "push"]
    # Other kinds stay default.
    assert n.channels_for("matches", prefs) == ["inapp"]


def test_deadline_due_window():
    today = date(2026, 10, 27)
    assert n.deadline_due(today.isoformat(), today)
    assert n.deadline_due((today + timedelta(days=2)).isoformat(), today)
    assert not n.deadline_due((today + timedelta(days=3)).isoformat(), today)
    assert not n.deadline_due((today - timedelta(days=1)).isoformat(), today)
    assert not n.deadline_due(None, today)
    assert not n.deadline_due("not-a-date", today)


def test_stale_applied():
    now = datetime(2026, 10, 27, tzinfo=timezone.utc)
    fresh = (now - timedelta(days=2)).isoformat()
    stale = (now - timedelta(days=8)).isoformat()
    assert n.is_stale_applied(stale, now)
    assert not n.is_stale_applied(fresh, now)
    assert not n.is_stale_applied(None, now)


def test_token_overlap_matches_frontend_rule():
    q = "React internship in India"
    assert n.token_overlap(q, "Frontend React Developer Internship opening across India") >= 0.6
    assert n.token_overlap(q, "Mechanical engineering campus placement, no web stack") < 0.6
    assert n.token_overlap("", "anything") == 0.0


# ---------- dormancy ----------
def test_email_and_push_dormant_without_env(monkeypatch):
    monkeypatch.delenv("RESEND_API_KEY", raising=False)
    assert emailer.configured() is False
    monkeypatch.delenv("VAPID_PRIVATE_KEY", raising=False)
    monkeypatch.delenv("VAPID_SUBJECT", raising=False)
    assert push.configured() is False


# ---------- cron endpoint protection ----------
def test_cron_requires_secret(monkeypatch):
    monkeypatch.setenv("CRON_SECRET", "s3cret")
    for path in CRON_PATHS:
        # Vercel Cron calls these with GET; manual triggers may use POST.
        for call in (client.get, client.post):
            assert call(path).status_code == 401
            assert call(path, headers={"authorization": "Bearer wrong"}).status_code == 401


def test_cron_503_when_not_configured(monkeypatch):
    monkeypatch.delenv("CRON_SECRET", raising=False)
    for path in CRON_PATHS:
        assert client.get(path).status_code == 503
        assert client.post(path).status_code == 503


def test_cron_runs_gracefully_without_supabase(monkeypatch):
    monkeypatch.setenv("CRON_SECRET", "s3cret")
    monkeypatch.setattr(n.supabase_store, "configured", lambda: False)
    for path in CRON_PATHS:
        r = client.get(path, headers={"authorization": "Bearer s3cret"})
        assert r.status_code == 200
        assert r.json()["ran"] is False


# ---------- runners & dispatch (network faked) ----------
class FakeResp:
    def __init__(self, status): self.status_code = status


@pytest.mark.asyncio
async def test_dispatch_fans_out_per_prefs(monkeypatch):
    prefs = {**n.DEFAULT_PREFS, "deadline_email": True}
    posts = []

    async def fake_get(path, params=None):
        if path == "notification_preferences":
            return [dict(prefs)]
        if path == "profiles":
            return [{"email": "student@example.com"}]
        return []  # push_subscriptions

    async def fake_post(path, rows, extra_headers=None):
        posts.append((path, rows))
        return FakeResp(201)

    async def fake_email(to, subject, body, **kw):
        posts.append(("email", to))
        return True

    monkeypatch.setattr(n, "_get", fake_get)
    monkeypatch.setattr(n, "_post", fake_post)
    monkeypatch.setattr(n.emailer, "send_email", fake_email)

    out = await n.dispatch("u1", "deadline", "t", "b", "/jobs")
    assert out == {"inapp": 1, "email": 1, "push": 0}
    assert posts[0][0] == "notifications"
    assert ("email", "student@example.com") in posts


@pytest.mark.asyncio
async def test_deadline_runner_skips_rejected_and_dedups(monkeypatch):
    today = date(2026, 10, 27)
    due = (today + timedelta(days=1)).isoformat()
    rows = [
        {"user_id": "u1", "opportunity_id": "o1", "stage": "saved",
         "title": "React Intern", "snapshot": {"deadline": due, "source_url": "https://x.test/o1"}},
        {"user_id": "u1", "opportunity_id": "o2", "stage": "rejected",
         "title": "Excluded", "snapshot": {"deadline": due}},
    ]
    claimed = []
    dispatched = []

    async def fake_get(path, params=None):
        return rows if path == "saved_listings" else []

    async def fake_claim(uid, kind, key):
        claimed.append((kind, key))
        return True

    async def fake_dispatch(uid, kind, title, body, link=None):
        dispatched.append((uid, kind, title))
        return {"inapp": 1, "email": 0, "push": 0}

    monkeypatch.setattr(n.supabase_store, "configured", lambda: True)
    monkeypatch.setattr(n, "_get", fake_get)
    monkeypatch.setattr(n, "claim_event", fake_claim)
    monkeypatch.setattr(n, "dispatch", fake_dispatch)

    result = await n.run_deadline_reminders()
    assert result["ran"] is True and result["count"] == 1
    assert claimed == [("deadline", "o1")]
    assert dispatched == [("u1", "deadline", "Deadline approaching: React Intern")]


@pytest.mark.asyncio
async def test_match_digest_dedups_zero_match_days(monkeypatch):
    searches = [{"id": "s1", "user_id": "u1", "query": "react internship", "location": ""}]
    opps = [
        {"id": "o1", "title": "React Developer Internship", "description": "frontend work",
         "skills": ["react"], "location": "Remote", "source_url": "https://x.test/o1"},
        {"id": "o2", "title": "Mechanical Placement", "description": "factory floor",
         "skills": ["cad"], "location": "Pune", "source_url": "https://x.test/o2"},
    ]
    claims = []
    dispatched = []

    async def fake_get(path, params=None):
        return searches if path == "saved_searches" else opps

    async def fake_claim(uid, kind, key):
        claims.append(key)
        return True

    async def fake_dispatch(uid, kind, title, body, link=None):
        dispatched.append(title)
        return {"inapp": 1, "email": 0, "push": 0}

    monkeypatch.setattr(n.supabase_store, "configured", lambda: True)
    monkeypatch.setattr(n, "_get", fake_get)
    monkeypatch.setattr(n, "claim_event", fake_claim)
    monkeypatch.setattr(n, "dispatch", fake_dispatch)

    result = await n.run_match_digest()
    assert result["count"] == 1
    assert len(claims) == 1 and claims[0].startswith("digest:s1:")
    assert "1 new match" in dispatched[0]

    # Zero-match day: event still claimed, nothing dispatched.
    searches[0]["query"] = "quantum robotics astronaut"
    dispatched.clear()
    result2 = await n.run_match_digest()
    assert result2["count"] == 0 and dispatched == []
    assert len(claims) == 2


@pytest.mark.asyncio
async def test_claim_event_treats_conflict_as_duplicate(monkeypatch):
    async def fake_post(path, rows, extra_headers=None):
        return httpx.Response(409)

    monkeypatch.setattr(n, "_post", fake_post)
    assert await n.claim_event("u1", "deadline", "o1") is False
