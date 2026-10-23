import os
import sys

# Add project root and backend directory to sys.path so modules can be imported
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
BASE_DIR = os.path.dirname(CURRENT_DIR)
BACKEND_DIR = os.path.join(BASE_DIR, "backend")

for p in [BASE_DIR, BACKEND_DIR]:
    if p not in sys.path:
        sys.path.insert(0, p)

from app.main import app

# Vercel Serverless Function entrypoint
# Vercel's @vercel/python runtime automatically detects and serves the FastAPI 'app'
