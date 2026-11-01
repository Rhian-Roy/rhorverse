# Slim runtime image (Render). The ml group (torch) is never installed here.
FROM python:3.12-slim AS base
COPY --from=ghcr.io/astral-sh/uv:0.13.6 /uv /uvx /bin/

ENV UV_COMPILE_BYTECODE=1 UV_LINK_MODE=copy PYTHONUNBUFFERED=1
WORKDIR /app

COPY pyproject.toml uv.lock README.md ./
RUN uv sync --frozen --no-default-groups --no-install-project

COPY src ./src
RUN uv sync --frozen --no-default-groups

RUN useradd --create-home app && chown -R app /app
USER app

ENV PORT=8000
EXPOSE 8000
CMD ["sh", "-c", "uv run --no-sync uvicorn rhorverse.main:app --host 0.0.0.0 --port ${PORT}"]
