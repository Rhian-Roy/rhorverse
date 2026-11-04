"""Vercel entrypoint: exposes the FastAPI `app`. Local dev and Docker use `rhorverse.main:app` directly."""

import sys
from pathlib import Path

# The package lives under src/ (uv/hatch layout); make it importable without an install step.
sys.path.insert(0, str(Path(__file__).resolve().parent / "src"))

from rhorverse.main import app

__all__ = ["app"]
