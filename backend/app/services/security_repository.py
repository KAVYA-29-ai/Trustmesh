from dataclasses import dataclass
from uuid import uuid4

from sqlalchemy import select

from app.db.models import SecurityFinding as SecurityFindingModel
from app.db.session import SessionLocal


@dataclass(frozen=True)
class SecurityFinding:
    event_id: str
    event_name: str
    threat_detected: bool
    risk_score: int
    severity: str
    reason: str
    recommendation: str


class SecurityFindingRepository:
    """PostgreSQL-backed repository for security-agent findings."""

    def add(self, finding: SecurityFinding) -> SecurityFinding:
        with SessionLocal() as db:
            record = SecurityFindingModel(
                id=str(uuid4()),
                event_id=finding.event_id,
                event_name=finding.event_name,
                threat_detected=finding.threat_detected,
                risk_score=finding.risk_score,
                severity=finding.severity,
                reason=finding.reason,
                recommendation=finding.recommendation,
            )
            db.add(record)
            db.commit()

        return finding

    def list_findings(self) -> list[SecurityFinding]:
        with SessionLocal() as db:
            records = db.scalars(
                select(SecurityFindingModel).order_by(
                    SecurityFindingModel.created_at.desc()
                )
            ).all()

        return [
            SecurityFinding(
                event_id=record.event_id,
                event_name=record.event_name,
                threat_detected=record.threat_detected,
                risk_score=record.risk_score,
                severity=record.severity,
                reason=record.reason,
                recommendation=record.recommendation,
            )
            for record in records
        ]

    def clear(self) -> None:
        with SessionLocal() as db:
            db.query(SecurityFindingModel).delete()
            db.commit()


security_finding_repository = SecurityFindingRepository()
