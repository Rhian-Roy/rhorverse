"""Access-token verification: valid, expired, wrong issuer, and the ways a forged token could sneak in."""

import base64
import hashlib
import hmac
import json
import time
from uuid import uuid4

import jwt
import pytest
from cryptography.hazmat.primitives import serialization

from rhorverse.auth import ISSUER_PATH, Claims, JwksCache, TokenError, issuer_for, verify_token
from tests.auth_helpers import ISSUER, Signer


@pytest.fixture
def signer() -> Signer:
    return Signer.new()


def verify(signer: Signer, token: str) -> Claims:
    return verify_token(token, issuer=ISSUER, keys=signer.cache())


def test_valid_token_gives_claims(signer: Signer) -> None:
    sub = uuid4()
    token = signer.token(sub, extra={"user_metadata": {"age_confirmed": True}})
    claims = verify(signer, token)
    assert claims.sub == sub
    assert claims.email == "someone@example.test"
    assert claims.user_metadata == {"age_confirmed": True}


def test_expired_token_is_rejected(signer: Signer) -> None:
    with pytest.raises(TokenError, match="expired"):
        verify(signer, signer.token(expires_in=-10))


def test_wrong_issuer_is_rejected(signer: Signer) -> None:
    with pytest.raises(TokenError):
        verify(signer, signer.token(issuer="https://evil.example/auth/v1"))


def test_wrong_audience_is_rejected(signer: Signer) -> None:
    # The project's anon key is itself a JWT with a different audience/role; it must not count.
    with pytest.raises(TokenError):
        verify(signer, signer.token(audience="anon"))


@pytest.mark.parametrize("missing", ["exp", "sub", "iss", "aud"])
def test_required_claims(signer: Signer, missing: str) -> None:
    with pytest.raises(TokenError):
        verify(signer, signer.token(drop=(missing,)))


def test_sub_must_be_a_uuid(signer: Signer) -> None:
    with pytest.raises(TokenError):
        verify(signer, signer.token(sub="not-a-uuid"))


def test_token_signed_by_another_key_is_rejected(signer: Signer) -> None:
    attacker = Signer.new()  # same kid, different key
    with pytest.raises(TokenError, match=r"(?i)signature"):
        verify(signer, attacker.token())


def test_unknown_key_id_is_rejected(signer: Signer) -> None:
    with pytest.raises(TokenError, match="key"):
        verify(signer, Signer.new(kid="other").token())


def test_unsigned_token_is_rejected(signer: Signer) -> None:
    forged = jwt.encode({"sub": str(uuid4()), "iss": ISSUER, "aud": "authenticated", "exp": 9999999999},
                        key=None, algorithm="none", headers={"kid": signer.kid})  # fmt: skip
    with pytest.raises(TokenError):
        verify(signer, forged)


def test_hmac_with_the_public_key_is_rejected(signer: Signer) -> None:
    # Classic algorithm confusion: an HS256 token "signed" with the public key as the shared secret.
    # PyJWT refuses to build it, so assemble it by hand.
    def b64(raw: bytes) -> str:
        return base64.urlsafe_b64encode(raw).rstrip(b"=").decode()

    header = b64(json.dumps({"alg": "HS256", "typ": "JWT", "kid": signer.kid}).encode())
    body = {"sub": str(uuid4()), "iss": ISSUER, "aud": "authenticated", "exp": int(time.time()) + 600}
    payload = b64(json.dumps(body).encode())
    public_pem = signer.private_key.public_key().public_bytes(
        serialization.Encoding.PEM, serialization.PublicFormat.SubjectPublicKeyInfo
    )
    mac = hmac.new(public_pem, f"{header}.{payload}".encode(), hashlib.sha256).digest()
    with pytest.raises(TokenError, match="unsupported"):
        verify(signer, f"{header}.{payload}.{b64(mac)}")


def test_garbage_is_rejected(signer: Signer) -> None:
    with pytest.raises(TokenError):
        verify(signer, "not.a.jwt")


def test_issuer_is_derived_from_the_project_url() -> None:
    assert issuer_for("https://abc.supabase.co/") == "https://abc.supabase.co" + ISSUER_PATH


class Clock:
    def __init__(self) -> None:
        self.now = 1000.0

    def __call__(self) -> float:
        return self.now


def test_keys_are_cached_between_tokens() -> None:
    signer, calls = Signer.new(), []
    clock = Clock()

    def fetch() -> dict:
        calls.append(1)
        return {"keys": [signer.jwk()]}

    cache = JwksCache(fetch, clock)
    for _ in range(3):
        verify_token(signer.token(), issuer=ISSUER, keys=cache)
    assert len(calls) == 1


def test_rotated_key_is_picked_up_but_refetch_is_rate_limited() -> None:
    old, new = Signer.new("old"), Signer.new("new")
    published = [old.jwk()]
    calls = []
    clock = Clock()

    def fetch() -> dict:
        calls.append(1)
        return {"keys": list(published)}

    cache = JwksCache(fetch, clock)
    verify_token(old.token(), issuer=ISSUER, keys=cache)
    published.append(new.jwk())
    # Right after loading, an unknown kid does not trigger a refetch (stops a flood of junk tokens).
    with pytest.raises(TokenError):
        verify_token(new.token(), issuer=ISSUER, keys=cache)
    assert len(calls) == 1
    clock.now += 61
    assert verify_token(new.token(), issuer=ISSUER, keys=cache).email == "someone@example.test"
    assert len(calls) == 2
