"""App factory: CORS, routers, health."""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from rhorverse import __version__, db
from rhorverse.api import account, imports, profile, recs, search, works
from rhorverse.config import get_settings
from rhorverse.schemas import Health


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    yield
    db.close_pool()


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title="Rhorverse API", version=__version__, lifespan=lifespan)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_methods=["GET", "POST", "DELETE"],
        allow_headers=["*"],
    )

    @app.exception_handler(db.DatabaseNotConfigured)
    def _no_database(_: Request, exc: db.DatabaseNotConfigured) -> JSONResponse:
        return JSONResponse(status_code=503, content={"detail": str(exc)})

    @app.get("/health", response_model=Health, tags=["meta"])
    def health(deep: bool = False) -> Health:
        """Liveness. `?deep=true` also pings Postgres."""
        if not deep:
            return Health(status="ok", version=__version__)
        ok = db.ping()
        return Health(status="ok" if ok else "degraded", version=__version__, db="ok" if ok else "down")

    for module in (works, search, recs, profile, imports, account):
        app.include_router(module.router)
    return app


app = create_app()
