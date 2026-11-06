"""Signing keys and tokens for auth tests. A real EC key pair, so verification is the real thing."""

import time
from dataclasses import dataclass
from typing import Any
from uuid import UUID, uuid4

import jwt
from cryptography.hazmat.primitives.asymmetric import ec

from rhorverse.auth import JwksCache

ISSUER = "https://project.supabase.test/auth/v1"
KID = "test-key-1"


@dataclass
class Signer:
    private_key: ec.EllipticCurvePrivateKey
    kid: str = KID

    @classmethod
    def new(cls, kid: str = KID) -> "Signer":
        return cls(ec.generate_private_key(ec.SECP256R1()), kid)

    def jwk(self) -> dict[str, Any]:
        jwk = jwt.algorithms.ECAlgorithm.to_jwk(self.private_key.public_key(), as_dict=True)
        return {**jwk, "kid": self.kid, "alg": "ES256", "use": "sig"}

    def cache(self) -> JwksCache:
        return JwksCache(lambda: {"keys": [self.jwk()]})

    def token(
        self,
        sub: UUID | str | None = None,
        *,
        issuer: str = ISSUER,
        audience: str = "authenticated",
        expires_in: int = 3600,
        extra: dict[str, Any] | None = None,
        drop: tuple[str, ...] = (),
    ) -> str:
        now = int(time.time())
        claims: dict[str, Any] = {
            "sub": str(sub or uuid4()),
            "iss": issuer,
            "aud": audience,
            "iat": now,
            "exp": now + expires_in,
            "email": "someone@example.test",
            **(extra or {}),
        }
        for key in drop:
            claims.pop(key, None)
        return jwt.encode(claims, self.private_key, algorithm="ES256", headers={"kid": self.kid})
