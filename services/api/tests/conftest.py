import pytest
from fastapi.testclient import TestClient

from rhorverse.main import create_app


@pytest.fixture
def client() -> TestClient:
    return TestClient(create_app())
