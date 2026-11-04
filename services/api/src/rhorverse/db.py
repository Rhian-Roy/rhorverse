"""Postgres connection pool. Opened lazily so the app (and /health) start without a DB."""

from collections.abc import Iterator
from contextlib import contextmanager

from psycopg import Connection
from psycopg.rows import dict_row
from psycopg_pool import ConnectionPool

from rhorverse.config import get_settings

_pool: ConnectionPool | None = None


class DatabaseNotConfigured(RuntimeError):
    pass


# prepare_threshold=None: Supabase's transaction pooler (pgbouncer-style) can't hold the prepared
# statements psycopg would otherwise create after a few runs of the same query.
CONNECTION_KWARGS = {"row_factory": dict_row, "prepare_threshold": None, "connect_timeout": 10}


def get_pool() -> ConnectionPool:
    global _pool
    if _pool is None:
        url = get_settings().database_url
        if not url:
            raise DatabaseNotConfigured("DATABASE_URL is not set")
        _pool = ConnectionPool(url, min_size=1, max_size=5, open=False, kwargs=CONNECTION_KWARGS)
        _pool.open(wait=True, timeout=10)
    return _pool


def close_pool() -> None:
    global _pool
    if _pool is not None:
        _pool.close()
        _pool = None


@contextmanager
def connection() -> Iterator[Connection]:
    with get_pool().connection() as conn:
        yield conn


def get_conn() -> Iterator[Connection]:
    """FastAPI dependency."""
    with connection() as conn:
        yield conn


def ping() -> bool:
    try:
        with connection() as conn:
            conn.execute("select 1")
        return True
    except Exception:
        return False
