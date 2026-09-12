from datetime import datetime, timezone

from sqlalchemy import select

from app.db.models import AuditEvent
from app.db.session import SessionLocal
from app.indexer.events import BlockchainEvent


class EventRepository:
    """PostgreSQL-backed repository for indexed blockchain events."""

    def add(self, event: BlockchainEvent) -> BlockchainEvent:
        with SessionLocal() as db:
            record = AuditEvent(
                id=f"{event.transaction_hash}:{event.log_index}",
                event_name=event.event_name,
                transaction_hash=event.transaction_hash,
                contract_address=event.contract_address,
                block_number=event.block_number,
                log_index=event.log_index,
                timestamp=event.timestamp or datetime.now(timezone.utc),
                data=event.data,
            )
            db.merge(record)
            db.commit()

        return event

    def list_events(self) -> list[BlockchainEvent]:
        with SessionLocal() as db:
            records = db.scalars(
                select(AuditEvent).order_by(AuditEvent.timestamp.desc())
            ).all()

        return [
            BlockchainEvent(
                event_name=record.event_name,
                contract_address=record.contract_address or "",
                transaction_hash=record.transaction_hash or "",
                block_number=record.block_number or 0,
                log_index=record.log_index or 0,
                timestamp=record.timestamp,
                data=record.data,
            )
            for record in records
        ]

    def clear(self) -> None:
        with SessionLocal() as db:
            db.query(AuditEvent).delete()
            db.commit()
