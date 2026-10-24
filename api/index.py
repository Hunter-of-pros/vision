import os
import sys

# Add project root and backend directory to sys.path so modules can be imported
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
BASE_DIR = os.path.dirname(CURRENT_DIR)
BACKEND_DIR = os.path.join(BASE_DIR, "backend")

for p in [BASE_DIR, BACKEND_DIR]:
    if p not in sys.path:
        sys.path.insert(0, p)

# Load backend .env if present (local dev)
from dotenv import load_dotenv
_env_candidates = [
    os.path.join(BACKEND_DIR, ".env"),
    os.path.join(BASE_DIR, ".env"),
    os.path.join(BASE_DIR, ".env.local"),
]
for _env in _env_candidates:
    if os.path.exists(_env):
        load_dotenv(_env, override=True)
        break

from app.main import app  # noqa: E402 — must import after sys.path setup

# Vercel Serverless Function entrypoint.
# Vercel's @vercel/python runtime automatically detects and serves the FastAPI 'app'.
# All /api/* routes are handled internally by FastAPI's router.
