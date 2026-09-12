from fastapi import APIRouter, HTTPException

from app.indexer.events import BlockchainEvent
from app.indexer.service import indexer_service
from app.services.forensic_audit import forensic_audit_service

router = APIRouter()


@router.get("/")
async def list_audit_events() -> dict:
    events = indexer_service.get_events()

    return {
        "service": "audit",
        "status": "ready",
        "count": len(events),
        "events": [
            {
                "event_name": event.event_name,
                "contract_address": event.contract_address,
                "transaction_hash": event.transaction_hash,
                "block_number": event.block_number,
                "log_index": event.log_index,
                "timestamp": event.timestamp,
                "data": event.data,
            }
            for event in events
        ],
    }


@router.get("/forensic/{transaction_hash}")
async def get_forensic_snapshot(transaction_hash: str) -> dict:
    try:
        return forensic_audit_service.build_snapshot(
            indexer_service.get_events(),
            transaction_hash,
        )
    except LookupError as exc:
        raise HTTPException(
            status_code=404,
            detail="AUDIT_TRANSACTION_NOT_FOUND",
        ) from exc


@router.post("/events")
async def ingest_audit_event(event: BlockchainEvent) -> dict:
    stored_event = indexer_service.ingest(event)

    return {
        "status": "accepted",
        "event": {
            "event_name": stored_event.event_name,
            "transaction_hash": stored_event.transaction_hash,
            "block_number": stored_event.block_number,
        },
    }
