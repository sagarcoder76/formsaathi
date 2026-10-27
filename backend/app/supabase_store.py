"""Best-effort Supabase (PostgREST) persistence using the service-role key.

The service-role key bypasses RLS and must NEVER reach the frontend. Every call
here is optional: failures are swallowed (and returned as warnings) so research
never breaks when the database is unreachable from serverless.
"""
import os
from typing import Iterable
import httpx
from .models import Opportunity


def configured() -> bool:
    url = os.getenv("SUPABASE_URL", "").strip().rstrip("/")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "").strip()
    return bool(url and key and key != "your_key_here")


def _client() -> tuple[str, dict]:
    url = os.getenv("SUPABASE_URL", "").strip().rstrip("/")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "").strip()
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
    }
    return url, headers


def _row(o: Opportunity) -> dict:
    d = o.model_dump()
    # PostgREST accepts the ISO timestamp and nulls directly; arrays serialize as JSON lists.
    return d


async def upsert_opportunities(opps: Iterable[Opportunity]) -> int:
    """Upsert listings into the shared catalogue (merge on primary key)."""
    if not configured() or not opps:
        return 0
    url, headers = _client()
    headers["Prefer"] = "resolution=merge-duplicates"
    rows = [_row(o) for o in opps]
    try:
        async with httpx.AsyncClient(timeout=10) as c:
            r = await c.post(f"{url}/rest/v1/opportunities", json=rows, headers=headers)
            r.raise_for_status()
        return len(rows)
    except Exception:
        return 0


async def update_link_health(opportunity_id: str, health: str) -> bool:
    if not configured():
        return False
    url, headers = _client()
    headers["Prefer"] = "return=minimal"
    try:
        async with httpx.AsyncClient(timeout=10) as c:
            r = await c.patch(
                f"{url}/rest/v1/opportunities?id=eq.{opportunity_id}",
                json={"link_health": health},
                headers=headers,
            )
            r.raise_for_status()
        return True
    except Exception:
        return False
