#!/usr/bin/env bash
# Computes embeddings locally (sentence-transformers on MPS). Installs the optional ml group.
set -euo pipefail
cd "$(dirname "$0")/.."

uv sync --project services/api --group ml
uv run --project services/api --group ml python -m rhorverse.rec.embed "$@"
