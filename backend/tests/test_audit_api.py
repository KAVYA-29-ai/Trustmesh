from fastapi.testclient import TestClient

from app.main import app
from app.indexer.service import event_repository


client = TestClient(app)


def setup_function():
    event_repository.clear()


def test_audit_events_initially_empty():
    response = client.get("/audit/")

    assert response.status_code == 200
    assert response.json()["count"] == 0
    assert response.json()["events"] == []


def test_ingest_audit_event():
    response = client.post(
        "/audit/events",
        json={
            "event_name": "AccessGranted",
            "contract_address": "0x123",
            "transaction_hash": "0xabc",
            "block_number": 100,
            "log_index": 0,
            "data": {
                "did": "did:example:alice",
                "resource_id": "document-1",
                "action": "read",
            },
        },
    )

    assert response.status_code == 200
    assert response.json()["status"] == "accepted"


def test_audit_events_returns_indexed_event():
    client.post(
        "/audit/events",
        json={
            "event_name": "AccessGranted",
            "contract_address": "0x123",
            "transaction_hash": "0xabc",
            "block_number": 100,
            "log_index": 0,
            "data": {"action": "read"},
        },
    )

    response = client.get("/audit/")

    assert response.status_code == 200
    assert response.json()["count"] == 1

    event = response.json()["events"][0]

    assert event["event_name"] == "AccessGranted"
    assert event["transaction_hash"] == "0xabc"
    assert event["block_number"] == 100
    assert event["data"]["action"] == "read"


def test_forensic_snapshot_groups_transaction_evidence():
    for log_index, event_name in enumerate(("AccessDenied", "PolicyRejected")):
        response = client.post(
            "/audit/events",
            json={
                "event_name": event_name,
                "contract_address": "0x123",
                "transaction_hash": "0xforensic",
                "block_number": 100,
                "log_index": log_index,
                "data": {"action": "transfer", "risk_score": 90},
            },
        )
        assert response.status_code == 200

    response = client.get("/audit/forensic/0xforensic")

    assert response.status_code == 200
    snapshot = response.json()
    assert snapshot["schema_version"] == "1.0"
    assert snapshot["transaction_hash"] == "0xforensic"
    assert len(snapshot["events"]) == 2
    assert snapshot["events"][0]["log_index"] == 0
    assert snapshot["events"][1]["log_index"] == 1
    assert snapshot["integrity"]["algorithm"] == "SHA-256"
    assert len(snapshot["integrity"]["hash"]) == 64


def test_forensic_snapshot_returns_404_for_unknown_transaction():
    response = client.get("/audit/forensic/0xmissing")

    assert response.status_code == 404
    assert response.json()["detail"] == "AUDIT_TRANSACTION_NOT_FOUND"


def test_security_agent_analyzes_normal_event():
    response = client.post(
        "/security/analyze",
        json={
            "event_name": "AccessGranted",
            "contract_address": "0x123",
            "transaction_hash": "0xabc",
            "block_number": 100,
            "log_index": 0,
            "data": {
                "did": "did:example:alice",
                "resource_id": "document-1",
                "action": "read",
            },
        },
    )

    assert response.status_code == 200

    analysis = response.json()["analysis"]

    assert analysis["threat_detected"] is False
    assert analysis["risk_score"] == 0
    assert analysis["severity"] == "Low"


def test_security_agent_detects_denied_event():
    response = client.post(
        "/security/analyze",
        json={
            "event_name": "AccessDenied",
            "contract_address": "0x123",
            "transaction_hash": "0xdef",
            "block_number": 101,
            "log_index": 0,
            "data": {
                "did": "did:example:unknown",
                "resource_id": "security-center",
                "action": "read",
            },
        },
    )

    assert response.status_code == 200

    analysis = response.json()["analysis"]

    assert analysis["threat_detected"] is True
    assert analysis["risk_score"] == 60
    assert analysis["severity"] == "High"
    assert analysis["recommendation"]
