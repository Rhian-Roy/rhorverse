"""Shared outbound HTTP for all ingesters: rate limit, retry/backoff, disk cache, User-Agent."""

from __future__ import annotations

import hashlib
import json
import threading
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import httpx

from rhorverse import __version__
from rhorverse.config import get_settings

DEFAULT_UA = f"Rhorverse/{__version__} (+https://github.com/Rhian-Roy)"
RETRY_STATUS = {429, 500, 502, 503, 504}


@dataclass
class RateLimiter:
    """Token bucket: at most `rate` requests per `per` seconds (burst = rate)."""

    rate: float
    per: float = 1.0
    _tokens: float = field(init=False)
    _updated: float = field(init=False, default_factory=time.monotonic)
    _lock: threading.Lock = field(init=False, default_factory=threading.Lock)

    def __post_init__(self) -> None:
        self._tokens = self.rate

    def acquire(self) -> None:
        while True:
            with self._lock:
                now = time.monotonic()
                self._tokens = min(self.rate, self._tokens + (now - self._updated) * self.rate / self.per)
                self._updated = now
                if self._tokens >= 1:
                    self._tokens -= 1
                    return
                wait = (1 - self._tokens) * self.per / self.rate
            time.sleep(wait)


class DiskCache:
    def __init__(self, root: Path) -> None:
        self.root = root

    def _path(self, key: str) -> Path:
        digest = hashlib.sha256(key.encode()).hexdigest()
        return self.root / digest[:2] / f"{digest}.json"

    def get(self, key: str, ttl_s: float | None) -> Any | None:
        path = self._path(key)
        if not path.exists():
            return None
        if ttl_s is not None and time.time() - path.stat().st_mtime > ttl_s:
            return None
        return json.loads(path.read_text())

    def set(self, key: str, value: Any) -> None:
        path = self._path(key)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(value))


class Http:
    """One per source. `get_json` is cached by URL+params unless `ttl_s=0`."""

    def __init__(
        self,
        source: str,
        *,
        rate: float,
        per: float = 1.0,
        headers: dict[str, str] | None = None,
        user_agent: str = DEFAULT_UA,
        max_retries: int = 4,
        cache_root: Path | None = None,
        client: httpx.Client | None = None,
    ) -> None:
        self.source = source
        self.limiter = RateLimiter(rate=rate, per=per)
        self.max_retries = max_retries
        self.cache = DiskCache(cache_root or get_settings().data_dir / "cache" / source)
        self.client = client or httpx.Client(
            timeout=20.0, headers={"User-Agent": user_agent, **(headers or {})}, follow_redirects=True
        )

    def request(self, method: str, url: str, **kwargs: Any) -> httpx.Response:
        delay = 1.0
        for attempt in range(self.max_retries + 1):
            self.limiter.acquire()
            try:
                resp = self.client.request(method, url, **kwargs)
            except httpx.TransportError:
                if attempt == self.max_retries:
                    raise
            else:
                if resp.status_code not in RETRY_STATUS or attempt == self.max_retries:
                    resp.raise_for_status()
                    return resp
                retry_after = resp.headers.get("Retry-After")
                if retry_after and retry_after.isdigit():
                    delay = max(delay, float(retry_after))
            time.sleep(delay)
            delay = min(delay * 2, 60)
        raise RuntimeError("unreachable")

    def get_json(
        self, url: str, *, params: dict[str, Any] | None = None, ttl_s: float | None = 86_400
    ) -> Any:
        key = f"GET {url} {json.dumps(params or {}, sort_keys=True)}"
        if ttl_s != 0 and (hit := self.cache.get(key, ttl_s)) is not None:
            return hit
        data = self.request("GET", url, params=params).json()
        self.cache.set(key, data)
        return data

    def post_json(
        self, url: str, *, body: Any = None, content: str | None = None, ttl_s: float | None = 86_400
    ) -> Any:
        key = f"POST {url} {content if content is not None else json.dumps(body, sort_keys=True)}"
        if ttl_s != 0 and (hit := self.cache.get(key, ttl_s)) is not None:
            return hit
        kwargs: dict[str, Any] = {"content": content} if content is not None else {"json": body}
        data = self.request("POST", url, **kwargs).json()
        self.cache.set(key, data)
        return data
