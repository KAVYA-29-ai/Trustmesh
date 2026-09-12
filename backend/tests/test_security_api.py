from fastapi.testclient import TestClient

from app.indexer.events import BlockchainEvent
from app.indexer.repository import EventRepository
from app.indexer.service import IndexerService
from app.main import app
from app.services.security_agent import SecurityAgent
from app.services.security_repository import security_finding_repository


client = TestClient(app)


def test_security_findings_api_returns_stored_finding() -> None:
    repository = EventRepository()

    security_finding_repository.clear()

    service = IndexerService(
        repository=repository,
        security_agent=SecurityAgent(),
        finding_repository=security_finding_repository,
    )

    event = BlockchainEvent(
        event_name="AccessDenied",
        contract_address="0x1234567890123456789012345678901234567890",
        transaction_hash="0xabcdef",
        block_number=100,
        log_index=1,
        timestamp=1234567890,
        data={
            "risk": "high",
            "subject": "did:trustmesh:user-001",
            "resource": "document-001",
        },
    )

    service.ingest(event)

    response = client.get("/security/findings")

    assert response.status_code == 200

    body = response.json()

    assert body["service"] == "security-agent"
    assert body["status"] == "ready"
    assert body["count"] == 1

    finding = body["findings"][0]

    assert finding["event_id"] == "0xabcdef:1"
    assert finding["event_name"] == "AccessDenied"
    assert finding["threat_detected"] is True
    assert finding["risk_score"] == 90
    assert finding["severity"] == "Critical"
    assert "rejected or unauthorized" in finding["reason"]
    assert finding["recommendation"]