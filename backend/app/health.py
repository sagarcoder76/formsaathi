"""Catalogue-health automation: periodic link re-validation, deadline expiry
and auto-hiding of persistently broken listings, with opt-in student alerts.

Runs from a daily Vercel cron using the service role. Every network probe is
best-effort: bot walls and timeouts stay 'unknown' (never treated as dead),
mirroring the manual /api/opportunities/recheck classification.
"""
from __future__ import annotations

import asyncio
from datetime import date, datetime, timedelta, timezone

import httpx

from . import notifications as notif_engine
from . import supabase_store
from .extraction import classify_link_status

STALE_DAYS = 3            # re-probe a listing at most this often
HIDE_AFTER_FAILURES = 3   # consecutive broken probes before auto-hide
BATCH_LIMIT = 60          # listings per run (serverless time budget)
PROBE_CONCURRENCY = 8
USER_AGENT = "Mozilla/5.0 (compatible; FormSaathiBot/1.0; +https://formsaathi-ten.vercel.app)"


async def probe_url(url: str) -> str:
    """Classify one URL as ok | broken | unknown (SSRF guard lives in valid_url)."""
    if not url:
        return "unknown"
    status_code = None
    error = False
    try:
        async with httpx.AsyncClient(timeout=8, follow_redirects=True) as c:
            try:
                r = await c.head(url, headers={"User-Agent": USER_AGENT})
                status_code = r.status_code
                if status_code in (403, 405, 401):  # many sites reject HEAD — retry GET
                    r = await c.get(url, headers={"User-Agent": USER_AGENT})
                    status_code = r.status_code
            except httpx.HTTPError:
                error = True
    except Exception:
        error = True
    return classify_link_status(status_code, error)


async def _bulk_patch(table: str, filt: str, fields: dict) -> bool:
    if not supabase_store.configured():
        return False
    url, headers = supabase_store._client()
    headers["Prefer"] = "return=minimal"
    try:
        async with httpx.AsyncClient(timeout=15) as c:
            r = await c.patch(f"{url}/rest/v1/{table}?{filt}", json=fields, headers=headers)
            r.raise_for_status()
        return True
    except Exception:
        return False


async def _mark_expired_deadlines() -> int:
    """Flip past-date listings to deadline_status='expired' in one statement."""
    today = date.today().isoformat()
    ok = await _bulk_patch(
        "opportunities",
        f"deadline=lt.{today}&deadline_status=neq.expired&hidden=eq.false",
        {"deadline_status": "expired"},
    )
    return 1 if ok else 0


async def run_catalogue_health() -> dict:
    """Daily sweep. Returns a compact summary for the cron response/logs."""
    if not supabase_store.configured():
        return {"ran": False, "reason": "supabase not configured", "summary": {}}

    expired_batches = await _mark_expired_deadlines()

    cutoff = (datetime.now(timezone.utc) - timedelta(days=STALE_DAYS)).isoformat()
    rows = await notif_engine._get(
        "opportunities",
        {"hidden": "eq.false", "last_checked_at": f"lt.{cutoff}",
         "limit": str(BATCH_LIMIT),
         "select": "id,title,source_url,application_url,official_url,link_health,failed_checks,last_checked_at"},
    )

    sem = asyncio.Semaphore(PROBE_CONCURRENCY)

    async def check_one(row: dict) -> dict:
        async with sem:
            target = row.get("application_url") or row.get("source_url") or row.get("official_url")
            health = await probe_url(target or "")
            return {"row": row, "health": health, "url": target}

    results = await asyncio.gather(*(check_one(r) for r in rows))

    summary = {"checked": len(rows), "ok": 0, "broken": 0, "unknown": 0,
               "hidden": 0, "alerts": 0}
    now = datetime.now(timezone.utc).isoformat()

    for item in results:
        row, health = item["row"], item["health"]
        summary[health if health in ("ok", "broken", "unknown") else "unknown"] += 1
        failed = int(row.get("failed_checks") or 0)
        fields: dict = {"link_health": health, "last_checked_at": now}

        if health == "broken":
            failed += 1
            fields["failed_checks"] = failed
        elif health == "ok":
            failed = 0
            fields["failed_checks"] = 0
        # 'unknown' (bot wall/timeout) neither punishes nor resets the streak.

        should_hide = health == "broken" and failed >= HIDE_AFTER_FAILURES
        if should_hide:
            fields["hidden"] = True
        await supabase_store.patch_opportunity(row["id"], fields)

        if should_hide:
            summary["hidden"] += 1
            summary["alerts"] += await _alert_savers(row)

    return {"ran": True, "kind": "catalogue_health",
            "expired_batches": expired_batches, "alerts": summary["alerts"],
            "summary": summary}


async def _alert_savers(row: dict) -> int:
    """Tell every student who saved/tracked a now-hidden listing (once each)."""
    savers = await notif_engine._get(
        "saved_listings",
        {"opportunity_id": f"eq.{row['id']}", "select": "user_id"},
    )
    title = row.get("title") or "A listing you saved"
    sent = 0
    for s in savers:
        uid = s.get("user_id")
        if not uid:
            continue
        # One health alert per listing per student, even across repeated sweeps.
        if not await notif_engine.claim_event(uid, "health", f"hidden:{row['id']}"):
            continue
        await notif_engine.dispatch(
            uid, "health",
            f"Listing removed: {title}",
            f"“{title}” repeatedly failed our link checks and was hidden from the catalogue. "
            "Your tracker entry is kept so your history is not lost.",
            "/saved",
        )
        sent += 1
    return sent
