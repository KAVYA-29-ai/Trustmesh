from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from uuid import uuid4

from sqlalchemy import select

from app.db.models import RecoveryRequestRecord
from app.db.session import SessionLocal
from app.services.security_workflow import security_workflow


@dataclass(frozen=True)
class RecoveryRequest:
    request_id: str
    subject: str
    reason: str
    status: str
    approvals: int
    required_approvals: int
    timelock_hours: int
    created_at: datetime


class RecoveryService:
    """PostgreSQL-backed identity recovery workflow."""

    def list_requests(self) -> list[RecoveryRequest]:
        with SessionLocal() as db:
            records = db.scalars(
                select(RecoveryRequestRecord).order_by(
                    RecoveryRequestRecord.created_at.desc()
                )
            ).all()

        return [self._to_request(record) for record in records]

    def get_request(self, request_id: str) -> RecoveryRequest | None:
        with SessionLocal() as db:
            record = db.get(RecoveryRequestRecord, request_id)

        return self._to_request(record) if record else None

    def create_request(
        self,
        subject: str,
        reason: str,
        required_approvals: int = 2,
        timelock_hours: int = 48,
    ) -> RecoveryRequest:
        if not subject.strip():
            raise ValueError("subject is required")

        if not reason.strip():
            raise ValueError("reason is required")

        if required_approvals < 1:
            raise ValueError("required_approvals must be at least 1")

        if timelock_hours < 0:
            raise ValueError("timelock_hours cannot be negative")

        record = RecoveryRequestRecord(
            id=f"recovery-{uuid4().hex}",
            subject=subject.strip(),
            reason=reason.strip(),
            status="Pending Consensus",
            approvals=0,
            required_approvals=required_approvals,
            timelock_hours=timelock_hours,
            created_at=datetime.now(timezone.utc).replace(tzinfo=None),
        )

        with SessionLocal() as db:
            db.add(record)
            db.commit()
            db.refresh(record)

        return self._to_request(record)

    def approve_request(self, request_id: str) -> RecoveryRequest:
        with SessionLocal() as db:
            record = db.get(RecoveryRequestRecord, request_id)

            if record is None:
                raise ValueError("recovery request not found")

            if record.status != "Pending Consensus":
                raise ValueError(
                    f"request cannot be approved from status '{record.status}'"
                )

            record.approvals += 1

            if record.approvals >= record.required_approvals:
                record.status = "Ready for Timelock"

            db.commit()
            db.refresh(record)

        return self._to_request(record)

    def execute_request(self, request_id: str) -> RecoveryRequest:
        with SessionLocal() as db:
            record = db.get(RecoveryRequestRecord, request_id)

            if record is None:
                raise ValueError("recovery request not found")

            if record.status != "Ready for Timelock":
                raise ValueError(
                    "recovery request requires all approvals before execution"
                )

            created_at = record.created_at

            if created_at.tzinfo is None:
                created_at = created_at.replace(tzinfo=timezone.utc)

            unlock_at = created_at + timedelta(hours=record.timelock_hours)

            if datetime.now(timezone.utc) < unlock_at:
                raise ValueError("recovery timelock has not expired")

            security_workflow.restore_identity(
                record.subject,
                recovery_request_id=record.id,
            )

            record.status = "Recovered"

            db.commit()
            db.refresh(record)

        return self._to_request(record)

    def get_summary(self) -> dict:
        requests = self.list_requests()

        return {
            "active_requests": len(
                [
                    request
                    for request in requests
                    if request.status != "Recovered"
                ]
            ),
            "pending_consensus": sum(
                1
                for request in requests
                if request.status == "Pending Consensus"
            ),
            "ready_for_timelock": sum(
                1
                for request in requests
                if request.status == "Ready for Timelock"
            ),
            "recovered": sum(
                1
                for request in requests
                if request.status == "Recovered"
            ),
            "required_approvals": sum(
                request.required_approvals
                for request in requests
                if request.status != "Recovered"
            ),
            "timelock_hours": max(
                (
                    request.timelock_hours
                    for request in requests
                    if request.status != "Recovered"
                ),
                default=48,
            ),
        }

    @staticmethod
    def _to_request(record: RecoveryRequestRecord) -> RecoveryRequest:
        return RecoveryRequest(
            request_id=record.id,
            subject=record.subject,
            reason=record.reason,
            status=record.status,
            approvals=record.approvals,
            required_approvals=record.required_approvals,
            timelock_hours=record.timelock_hours,
            created_at=record.created_at,
        )


recovery_service = RecoveryService()