"""Verify Supabase Auth access tokens against the project's JWKS.

Only asymmetric algorithms are accepted, so a token can never be validated with a key the attacker
chose (`none`, or HS256 using a public key as the secret). Keys are cached in memory and re-fetched
at most once a minute, when a token names a `kid` we have not seen (a key rotation).
"""

from __future__ import annotations

import threading
import time
from collections.abc import Callable
from dataclasses import dataclass, field
from functools import lru_cache
from typing import Any
from uuid import UUID

import jwt

from rhorverse.config import get_settings

ALLOWED_ALGORITHMS = ("ES256", "RS256", "EdDSA")
AUDIENCE = "authenticated"
JWKS_TTL_S = 600.0
JWKS_MIN_REFRESH_S = 60.0


class TokenError(Exception):
    """The token is missing a claim, expired, from another issuer, or not signed by a known key."""


class AuthNotConfigured(RuntimeError):
    pass


@dataclass(frozen=True)
class Claims:
    sub: UUID
    email: str | None = None
    user_metadata: dict[str, Any] = field(default_factory=dict)


class JwksCache:
    def __init__(
        self, fetch: Callable[[], dict[str, Any]], clock: Callable[[], float] = time.monotonic
    ) -> None:
        self._fetch = fetch
        self._clock = clock
        self._keys: dict[str, Any] = {}
        self._loaded_at: float | None = None
        self._lock = threading.Lock()

    def _refresh(self) -> None:
        keys = {}
        for jwk in self._fetch().get("keys", []):
            if kid := jwk.get("kid"):
                keys[kid] = jwt.PyJWK.from_dict(jwk).key
        self._keys = keys
        self._loaded_at = self._clock()

    def get(self, kid: str) -> Any:
        with self._lock:
            age = None if self._loaded_at is None else self._clock() - self._loaded_at
            if age is None or age > JWKS_TTL_S or (kid not in self._keys and age > JWKS_MIN_REFRESH_S):
                self._refresh()
            if kid not in self._keys:
                raise TokenError("signing key not found")
            return self._keys[kid]


ISSUER_PATH = "/auth/v1"


def issuer_for(supabase_url: str) -> str:
    return supabase_url.rstrip("/") + ISSUER_PATH


def verify_token(token: str, *, issuer: str, keys: JwksCache) -> Claims:
    try:
        header = jwt.get_unverified_header(token)
        alg, kid = header.get("alg"), header.get("kid")
        if alg not in ALLOWED_ALGORITHMS or not kid:
            raise TokenError("unsupported token header")
        payload = jwt.decode(
            token,
            keys.get(kid),
            algorithms=[alg],
            audience=AUDIENCE,
            issuer=issuer,
            options={"require": ["exp", "sub", "iss", "aud"]},
        )
        meta = payload.get("user_metadata")
        return Claims(
            sub=UUID(payload["sub"]),
            email=payload.get("email"),
            user_metadata=meta if isinstance(meta, dict) else {},
        )
    except (jwt.PyJWTError, ValueError) as e:
        raise TokenError(str(e) or type(e).__name__) from e


@lru_cache
def default_jwks() -> JwksCache:
    url = get_settings().supabase_url
    if not url:
        raise AuthNotConfigured("SUPABASE_URL is not set")
    jwks_url = f"{issuer_for(url)}/.well-known/jwks.json"

    def fetch() -> dict[str, Any]:
        # Imported here: it creates the disk cache folder, which nothing else needs at start-up.
        from rhorverse.ingest.http import Http

        return Http("supabase", rate=2, max_retries=1).get_json(jwks_url, ttl_s=0)  # type: ignore[no-any-return]

    return JwksCache(fetch)


def verify_bearer(token: str) -> Claims:
    url = get_settings().supabase_url
    if not url:
        raise AuthNotConfigured("SUPABASE_URL is not set")
    return verify_token(token, issuer=issuer_for(url), keys=default_jwks())
