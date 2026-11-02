from rhorverse.config import DEFAULT_CORS_ORIGINS, Settings


def test_empty_cors_origins_falls_back_to_default(monkeypatch):
    monkeypatch.setenv("CORS_ORIGINS", "")
    assert Settings().cors_origins == list(DEFAULT_CORS_ORIGINS)


def test_cors_origins_are_split_and_trimmed(monkeypatch):
    monkeypatch.setenv("CORS_ORIGINS", "https://a.example, https://b.example")
    assert Settings().cors_origins == ["https://a.example", "https://b.example"]
