"""Who is calling: a signed-in user (Bearer token) or an anonymous guest (cookie profile id).

With a valid token the profile is always the one that belongs to the token's `sub`. A `profile_id`
sent by the client is then ignored, so a signed-in caller can never read or write another profile.
A bad or expired token is a 401 rather than a silent fall-back to guest: the web app refreshes
tokens, and a quiet downgrade would hide the user's own data.
"""

from uuid import UUID

from fastapi import Depends, Header, HTTPException
from psycopg import Connection

from rhorverse.account import AccountGone, account_profile_id
from rhorverse.auth import AuthNotConfigured, Claims, TokenError, verify_bearer
from rhorverse.db import get_conn

_BEARER = {"WWW-Authenticate": "Bearer"}


def bearer_claims(authorization: str | None = Header(default=None)) -> Claims | None:
    if not authorization:
        return None
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token.strip():
        raise HTTPException(status_code=401, detail="expected a Bearer token", headers=_BEARER)
    try:
        return verify_bearer(token.strip())
    except AuthNotConfigured as e:
        raise HTTPException(status_code=503, detail="sign-in is not configured on this server") from e
    except TokenError as e:
        raise HTTPException(status_code=401, detail="invalid or expired token", headers=_BEARER) from e


def require_claims(claims: Claims | None = Depends(bearer_claims)) -> Claims:  # noqa: B008
    if claims is None:
        raise HTTPException(status_code=401, detail="sign in required", headers=_BEARER)
    return claims


def effective_profile_id(
    profile_id: str | None = None,
    claims: Claims | None = Depends(bearer_claims),  # noqa: B008
    conn: Connection = Depends(get_conn),  # noqa: B008
) -> str | None:
    """The profile to act on: the account's when signed in, else the guest cookie id from the query."""
    if claims is not None:
        return str(own_profile_id(conn, claims))
    return profile_id


def own_profile_id(conn: Connection, claims: Claims) -> UUID:
    """The signed-in user's profile id; 401 if the account was deleted after the token was issued."""
    try:
        return account_profile_id(conn, claims)
    except AccountGone as e:
        raise HTTPException(status_code=401, detail="this account no longer exists", headers=_BEARER) from e
