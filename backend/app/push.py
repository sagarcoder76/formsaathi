"""Web Push delivery via pywebpush. Dormant until VAPID env vars are set.

Subscriptions are stored client-managed in public.push_subscriptions (RLS).
The cron runner calls send_webpush with the service role reading that table.
"""
import asyncio
import json
import os
from typing import Any


class SubscriptionGoneError(Exception):
    """Raised when the push service returns 404/410 so the caller can prune the row."""


def configured() -> bool:
    return bool(os.getenv("VAPID_PRIVATE_KEY", "").strip() and os.getenv("VAPID_SUBJECT", "").strip())


def _send_sync(subscription: dict, payload: dict) -> None:
    from pywebpush import webpush, WebPushException  # lazy: keeps import cost out of non-push paths
    try:
        webpush(
            subscription_info=subscription,
            data=json.dumps(payload),
            vapid_private_key=os.environ["VAPID_PRIVATE_KEY"],
            vapid_claims={"sub": os.environ["VAPID_SUBJECT"]},
        )
    except WebPushException as e:
        status = e.response.status_code if e.response is not None else None
        if status in (404, 410):
            raise SubscriptionGoneError(str(e))
        raise


async def send_webpush(subscription: dict[str, Any], payload: dict) -> str:
    """Returns 'sent', 'gone' (prune subscription), or 'failed'."""
    if not configured():
        return "failed"
    try:
        await asyncio.to_thread(_send_sync, subscription, payload)
        return "sent"
    except SubscriptionGoneError:
        return "gone"
    except Exception:
        return "failed"
