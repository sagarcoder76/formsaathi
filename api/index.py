# Vercel Python serverless entrypoint — reuses the exact same FastAPI app as local dev.
# Vercel sets TINYFISH_API_KEY via Project Settings > Environment Variables (never commit it).
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))
from app.main import app  # noqa: E402  (FastAPI app; Vercel serves ASGI `app`)
