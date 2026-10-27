"""Resend email delivery. Fully dormant until RESEND_API_KEY is configured."""
import os
import httpx

RESEND_URL = "https://api.resend.com/emails"


def configured() -> bool:
    k = os.getenv("RESEND_API_KEY", "").strip()
    return bool(k and k != "your_key_here")


def _branded_html(title: str, body: str, cta_text: str | None, cta_link: str | None) -> str:
    cta = (
        f'<p style="margin:24px 0"><a href="{cta_link}" style="background:#00BFA6;color:#fff;'
        f'text-decoration:none;font-weight:600;padding:12px 22px;border-radius:999px;display:inline-block">{cta_text}</a></p>'
        if cta_text and cta_link else ""
    )
    return f"""\
<div style="font-family:Inter,Arial,sans-serif;background:#F5F7FB;padding:32px 16px">
  <div style="max-width:480px;margin:0 auto;background:#fff;border:1px solid #E5EAF1;border-radius:20px;padding:32px">
    <h2 style="color:#0B1736;margin:0 0 12px;font-size:20px">{title}</h2>
    <p style="color:#475467;font-size:14px;line-height:1.6;margin:0">{body}</p>
    {cta}
    <p style="color:#98A2B3;font-size:11px;margin:24px 0 0">FormSaathi — internship & placement alerts you opted into.
    Update your choices anytime from Notification settings in the app.</p>
  </div>
</div>"""


async def send_email(to: str | None, subject: str, body: str, cta_text: str | None = None, cta_link: str | None = None) -> bool:
    """Best-effort delivery. Returns False when unconfigured or the provider errors."""
    if not configured() or not to:
        return False
    try:
        async with httpx.AsyncClient(timeout=10) as c:
            r = await c.post(
                RESEND_URL,
                headers={"Authorization": f"Bearer {os.environ['RESEND_API_KEY'].strip()}", "Content-Type": "application/json"},
                json={
                    "from": os.getenv("RESEND_FROM", "FormSaathi <onboarding@resend.dev>").strip(),
                    "to": [to],
                    "subject": subject,
                    "html": _branded_html(subject, body, cta_text, cta_link),
                    "text": body,
                },
            )
            r.raise_for_status()
        return True
    except Exception:
        return False
