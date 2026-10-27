"""Notification suite engine: deadline reminders, saved-search match digests
and application follow-up nudges, dispatched across in-app / email / push
channels according to each student's notification_preferences.

Everything is service-role only and best-effort: a failing channel never
breaks another, and unconfigured integrations stay dormant.
"""
from __future__ import annotations

import re
from datetime import date, datetime, timedelta, timezone

import httpx

from . import emailer, push, supabase_store

KINDS = ("deadline", "matches", "followup", "health")
CHANNELS = ("inapp", "email", "push")
DEFAULT_PREFS = {
    "deadline_inapp": True, "deadline_email": False, "deadline_push": False,
    "matches_inapp": True, "matches_email": False, "matches_push": False,
    "followup_inapp": True, "followup_email": False, "followup_push": False,
    "health_inapp": True, "health_email": False, "health_push": False,
}
FOLLOWUP_DAYS = 7
DEADLINE_WINDOW_DAYS = 2


# ---------------------------------------------------------------- pure logic
def channels_for(kind: str, prefs: dict) -> list[str]:
    """Which channels are enabled for a given alert kind for this user."""
    return [ch for ch in CHANNELS if prefs.get(f"{kind}_{ch}", DEFAULT_PREFS[f"{kind}_{ch}"])]


def deadline_due(deadline_iso: str | None, today: date | None = None) -> bool:
    """True when the deadline is today or within the next DEADLINE_WINDOW_DAYS."""
    if not deadline_iso:
        return False
    try:
        d = date.fromisoformat(str(deadline_iso)[:10])
    except ValueError:
        return False
    today = today or date.today()
    return 0 <= (d - today).days <= DEADLINE_WINDOW_DAYS


def is_stale_applied(updated_at: str | None, now: datetime | None = None, days: int = FOLLOWUP_DAYS) -> bool:
    if not updated_at:
        return False
    try:
        ts = datetime.fromisoformat(updated_at.replace("Z", "+00:00"))
    except ValueError:
        return False
    if ts.tzinfo is None:
        ts = ts.replace(tzinfo=timezone.utc)
    now = now or datetime.now(timezone.utc)
    return (now - ts.astimezone(timezone.utc)) >= timedelta(days=days)


def tokenize(s: str) -> list[str]:
    return [t for t in re.split(r"[^a-z0-9]+", (s or "").lower()) if len(t) > 2]


def token_overlap(saved_query: str, text_blob: str) -> float:
    """Deterministic token overlap in [0,1]; mirrors the frontend alert rule."""
    q = tokenize(saved_query)
    if not q:
        return 0.0
    hay = set(tokenize(text_blob))
    return sum(1 for t in q if t in hay) / len(q)


# ----------------------------------------------------------------- postgrest
async def _get(path: str, params: dict | None = None) -> list:
    if not supabase_store.configured():
        return []
    url, headers = supabase_store._client()
    try:
        async with httpx.AsyncClient(timeout=15) as c:
            r = await c.get(f"{url}/rest/v1/{path}", headers=headers, params=params or {})
            r.raise_for_status()
            return r.json()
    except Exception:
        return []


async def _post(path: str, rows: dict | list, extra_headers: dict | None = None) -> httpx.Response | None:
    if not supabase_store.configured():
        return None
    url, headers = supabase_store._client()
    if extra_headers:
        headers = {**headers, **extra_headers}
    try:
        async with httpx.AsyncClient(timeout=15) as c:
            r = await c.post(f"{url}/rest/v1/{path}", headers=headers, json=rows)
            return r
    except Exception:
        return None


async def _delete(path: str, query: str) -> None:
    if not supabase_store.configured():
        return
    url, headers = supabase_store._client()
    try:
        async with httpx.AsyncClient(timeout=10) as c:
            await c.delete(f"{url}/rest/v1/{path}?{query}", headers=headers)
    except Exception:
        pass


async def claim_event(uid: str, kind: str, dedup_key: str) -> bool:
    """Insert into the dedup ledger; False when this alert was already claimed."""
    r = await _post("notification_events", {"user_id": uid, "kind": kind, "dedup_key": dedup_key})
    return bool(r is not None and r.status_code < 300)


async def get_prefs(uid: str) -> dict:
    rows = await _get("notification_preferences", {"user_id": f"eq.{uid}", "select": "*"})
    if rows:
        return {**DEFAULT_PREFS, **{k: v for k, v in rows[0].items() if k in DEFAULT_PREFS}}
    return dict(DEFAULT_PREFS)


async def _user_email(uid: str) -> str | None:
    rows = await _get("profiles", {"id": f"eq.{uid}", "select": "email"})
    return (rows[0].get("email") if rows else None)


# ----------------------------------------------------------------- dispatch
async def _prune_subscription(row_id: str) -> None:
    if row_id:
        await _delete("push_subscriptions", f"id=eq.{row_id}")


async def dispatch(uid: str, kind: str, title: str, body: str, link: str | None = None) -> dict:
    """Send one alert through every enabled channel. Returns per-channel counts."""
    result = {"inapp": 0, "email": 0, "push": 0}
    prefs = await get_prefs(uid)
    channels = channels_for(kind, prefs)
    if "inapp" in channels:
        r = await _post("notifications", {"user_id": uid, "title": title, "body": body, "link": link})
        if r is not None and r.status_code < 300:
            result["inapp"] = 1
    if "email" in channels:
        to = await _user_email(uid)
        if await emailer.send_email(to, title, body, cta_text="Open FormSaathi", cta_link=link or "https://formsaathi-ten.vercel.app"):
            result["email"] = 1
    if "push" in channels:
        subs = await _get("push_subscriptions", {"user_id": f"eq.{uid}", "select": "id,endpoint,p256dh,auth"})
        for s in subs:
            subscription = {"endpoint": s["endpoint"], "keys": {"p256dh": s["p256dh"], "auth": s["auth"]}}
            status = await push.send_webpush(subscription, {"title": title, "body": body, "url": link or "/"})
            if status == "sent":
                result["push"] += 1
            elif status == "gone":
                await _prune_subscription(s.get("id", ""))
    return result


# -------------------------------------------------------------------- runners
async def run_deadline_reminders() -> dict:
    """Saved/tracked listings closing within 48h (one alert per listing)."""
    if not supabase_store.configured():
        return {"ran": False, "reason": "supabase not configured", "alerts": []}
    rows = await _get("saved_listings", {"select": "user_id,opportunity_id,stage,snapshot,title"})
    alerts = []
    for r in rows:
        if r.get("stage") == "rejected":
            continue
        snap = r.get("snapshot") or {}
        if not deadline_due(snap.get("deadline")):
            continue
        uid, opp_id = r["user_id"], r["opportunity_id"]
        if not await claim_event(uid, "deadline", opp_id):
            continue
        title = r.get("title") or snap.get("title") or "a saved listing"
        deadline = snap.get("deadline")
        out = await dispatch(
            uid, "deadline",
            f"Deadline approaching: {title}",
            f"The application window for “{title}” closes on {deadline}. Review and apply before it ends.",
            snap.get("application_url") or snap.get("source_url"),
        )
        alerts.append({"user_id": uid, "opportunity_id": opp_id, "channels": out})
    return {"ran": True, "kind": "deadline", "alerts": alerts, "count": len(alerts)}


async def run_followups() -> dict:
    """Applications stuck in 'applied' for 7+ days with no stage change."""
    if not supabase_store.configured():
        return {"ran": False, "reason": "supabase not configured", "alerts": []}
    rows = await _get("saved_listings", {"stage": "eq.applied", "select": "user_id,opportunity_id,updated_at,snapshot,title"})
    alerts = []
    for r in rows:
        if not is_stale_applied(r.get("updated_at")):
            continue
        uid, opp_id = r["user_id"], r["opportunity_id"]
        if not await claim_event(uid, "followup", opp_id):
            continue
        title = r.get("title") or (r.get("snapshot") or {}).get("title") or "an application"
        out = await dispatch(
            uid, "followup",
            f"Follow up on: {title}",
            f"It has been {FOLLOWUP_DAYS} days since you applied for “{title}”. Consider a polite follow-up or updating its stage.",
            (r.get("snapshot") or {}).get("source_url"),
        )
        alerts.append({"user_id": uid, "opportunity_id": opp_id, "channels": out})
    return {"ran": True, "kind": "followup", "alerts": alerts, "count": len(alerts)}


async def run_match_digest() -> dict:
    """Daily per-search digest of new catalogue matches (one notification per search)."""
    if not supabase_store.configured():
        return {"ran": False, "reason": "supabase not configured", "alerts": []}
    searches = await _get("saved_searches", {"select": "id,user_id,query,location,created_at"})
    if not searches:
        return {"ran": True, "kind": "matches", "alerts": [], "count": 0}
    opportunities = await _get("opportunities", {"order": "last_checked_at.desc", "limit": 300,
                                                 "select": "id,title,description,skills,location,application_url,official_url,source_url"})
    today = date.today().isoformat()
    alerts = []
    for s in searches:
        uid, sid = s["user_id"], s["id"]
        if not await claim_event(uid, "matches", f"digest:{sid}:{today}"):
            continue
        loc = (s.get("location") or "").lower()
        matches = []
        for o in opportunities:
            blob = " ".join([o.get("title", ""), o.get("description", "") or "", " ".join(o.get("skills") or []), o.get("location", "") or ""])
            if token_overlap(s.get("query", ""), blob) < 0.6:
                continue
            if loc and o.get("location") and loc not in o["location"].lower():
                continue
            matches.append(o)
        if not matches:
            # Nothing to report today: keep the claim so we do not re-scan the same day.
            continue
        top = matches[:5]
        titles = "; ".join(o.get("title", "Untitled") for o in top)
        extra = f" (+{len(matches) - 5} more)" if len(matches) > 5 else ""
        out = await dispatch(
            uid, "matches",
            f"{len(matches)} new match{'es' if len(matches) != 1 else ''} for “{s['query']}”",
            f"Fresh listings matching your saved search: {titles}{extra}.",
            "https://formsaathi-ten.vercel.app/jobs",
        )
        alerts.append({"user_id": uid, "search_id": sid, "matches": len(matches), "channels": out})
    return {"ran": True, "kind": "matches", "alerts": alerts, "count": len(alerts)}
