from collections.abc import Iterator

import psycopg
import pytest
from fastapi.testclient import TestClient
from psycopg.rows import dict_row

from rhorverse.config import get_settings
from rhorverse.main import create_app


@pytest.fixture
def client() -> TestClient:
    return TestClient(create_app())


@pytest.fixture
def conn() -> Iterator[psycopg.Connection]:
    """A real-DB connection whose work is always rolled back. Skips if the DB is unreachable."""
    url = get_settings().database_url
    if not url:
        pytest.skip("DATABASE_URL not set")
    try:
        c = psycopg.connect(url, row_factory=dict_row, connect_timeout=3)
    except psycopg.OperationalError:
        pytest.skip("database not reachable")
    try:
        yield c
    finally:
        c.rollback()
        c.close()
