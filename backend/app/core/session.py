import secrets
from datetime import datetime, timedelta, timezone

from eth_account import Account
from eth_account.messages import encode_defunct
from sqlalchemy import select

from app.db.models import AuthSession, SiweNonce
from app.db.session import SessionLocal
from app.models.common import SessionContext


NONCE_TTL_MINUTES = 10
SESSION_TTL_HOURS = 24


class SessionManager:
    """Provides PostgreSQL-backed SIWE nonce and authenticated session handling."""

    def create_nonce(self, address: str) -> str:
        nonce = secrets.token_urlsafe(24)
        now = datetime.now(timezone.utc)

        with SessionLocal() as db:
            db.add(
                SiweNonce(
                    nonce=nonce,
                    address=address.lower(),
                    created_at=now,
                    expires_at=now + timedelta(minutes=NONCE_TTL_MINUTES),
                    consumed=False,
                )
            )
            db.commit()

        return nonce

    def consume_nonce(self, nonce: str, address: str) -> bool:
        now = datetime.now(timezone.utc)

        with SessionLocal() as db:
            record = db.scalar(
                select(SiweNonce).where(SiweNonce.nonce == nonce)
            )

            if record is None:
                return False

            if record.consumed:
                return False

            if record.expires_at <= now:
                return False

            if record.address.lower() != address.lower():
                return False

            record.consumed = True
            db.commit()

        return True

    def verify_signature(
        self,
        message: str,
        signature: str,
        expected_address: str,
    ) -> bool:
        try:
            encoded_message = encode_defunct(text=message)
            recovered_address = Account.recover_message(
                encoded_message,
                signature=signature,
            )

            return recovered_address.lower() == expected_address.lower()

        except Exception:
            return False

    def create_session(
        self,
        address: str,
        did: str | None = None,
        org_id: str | None = None,
    ) -> str:
        session_id = secrets.token_urlsafe(32)
        now = datetime.now(timezone.utc)

        with SessionLocal() as db:
            db.add(
                AuthSession(
                    id=session_id,
                    address=address.lower(),
                    did=did,
                    organization_id=org_id,
                    created_at=now,
                    expires_at=now + timedelta(hours=SESSION_TTL_HOURS),
                    revoked=False,
                )
            )
            db.commit()

        return session_id

    def validate_session(self, session_id: str) -> SessionContext | None:
        now = datetime.now(timezone.utc)

        with SessionLocal() as db:
            session = db.scalar(
                select(AuthSession).where(AuthSession.id == session_id)
            )

            if session is None:
                return None

            if session.revoked or session.expires_at <= now:
                return None

            return SessionContext(
                address=session.address,
                did=session.did,
                org_id=session.organization_id,
            )

    def revoke_session(self, session_id: str) -> bool:
        with SessionLocal() as db:
            session = db.scalar(
                select(AuthSession).where(AuthSession.id == session_id)
            )

            if session is None:
                return False

            session.revoked = True
            db.commit()

        return True

    def create_context(
        self,
        address: str,
        did: str | None = None,
        org_id: str | None = None,
    ) -> SessionContext:
        return SessionContext(
            address=address,
            did=did,
            org_id=org_id,
        )


session_manager = SessionManager()


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()
