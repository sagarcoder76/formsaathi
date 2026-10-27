import sys; sys.path.insert(0, "..")

import pytest

from app import health as h
from app import notifications as n
from app import supabase_store


# ---------- notification defaults include the health kind ----------
def test_health_kind_defaults_inapp_only():
    assert n.channels_for("health", dict(n.DEFAULT_PREFS)) == ["inapp"]
    prefs = {**n.DEFAULT_PREFS, "health_email": True, "health_push": True}
    assert n.channels_for("health", prefs) == ["inapp", "email", "push"]


# ---------- runner ----------
@pytest.mark.asyncio
async def test_runner_hides_after_three_broken_probes_and_alerts(monkeypatch):
    rows = [
        # Already two failures: one more broken probe reaches the threshold -> hide + alert.
        {"id": "o1", "title": "Dead Listing", "source_url": "https://x.test/o1",
         "application_url": None, "official_url": None, "failed_checks": 2, "link_health": "unknown"},
        # Healthy listing resets its streak and stays visible.
        {"id": "o2", "title": "Live Listing", "source_url": "https://x.test/o2",
         "application_url": None, "official_url": None, "failed_checks": 1, "link_health": "broken"},
        # Bot wall: unknown must not change the streak.
        {"id": "o3", "title": "Blocked Listing", "source_url": "https://x.test/o3",
         "application_url": None, "official_url": None, "failed_checks": 1, "link_health": "ok"},
    ]
    patches = []
    alerts = []

    async def fake_get(path, params=None):
        if path == "opportunities":
            return rows
        if path == "saved_listings":
            return [{"user_id": "u1"}, {"user_id": "u2"}]
        return []

    async def fake_probe(url):
        return {"https://x.test/o1": "broken", "https://x.test/o2": "ok", "https://x.test/o3": "unknown"}[url]

    async def fake_patch(opp_id, fields):
        patches.append((opp_id, fields))
        return True

    async def fake_bulk_patch(table, filt, fields):
        return True

    async def fake_claim(uid, kind, key):
        assert kind == "health" and key == "hidden:o1"
        return True

    async def fake_dispatch(uid, kind, title, body, link=None):
        alerts.append((uid, title, link))
        return {"inapp": 1, "email": 0, "push": 0}

    monkeypatch.setattr(n.supabase_store, "configured", lambda: True)
    monkeypatch.setattr(h.supabase_store, "configured", lambda: True)
    monkeypatch.setattr(n, "_get", fake_get)
    monkeypatch.setattr(h, "probe_url", fake_probe)
    monkeypatch.setattr(h.supabase_store, "patch_opportunity", fake_patch)
    monkeypatch.setattr(h, "_bulk_patch", fake_bulk_patch)
    monkeypatch.setattr(n, "claim_event", fake_claim)
    monkeypatch.setattr(n, "dispatch", fake_dispatch)

    result = await h.run_catalogue_health()
    assert result["ran"] is True
    s = result["summary"]
    assert s["checked"] == 3 and s["broken"] == 1 and s["ok"] == 1 and s["unknown"] == 1
    assert s["hidden"] == 1 and s["alerts"] == 2

    by_id = {opp_id: fields for opp_id, fields in patches}
    assert by_id["o1"]["hidden"] is True and by_id["o1"]["failed_checks"] == 3
    assert by_id["o2"]["failed_checks"] == 0 and "hidden" not in by_id["o2"]
    assert "failed_checks" not in by_id["o3"]  # unknown leaves the DB streak untouched
    assert all(fields["link_health"] for fields in by_id.values())
    assert {a[0] for a in alerts} == {"u1", "u2"}
    assert all(a[2] == "/saved" for a in alerts)


@pytest.mark.asyncio
async def test_runner_skips_when_unconfigured(monkeypatch):
    monkeypatch.setattr(supabase_store, "configured", lambda: False)
    out = await h.run_catalogue_health()
    assert out["ran"] is False


@pytest.mark.asyncio
async def test_probe_unknown_on_empty_url():
    assert await h.probe_url("") == "unknown"
