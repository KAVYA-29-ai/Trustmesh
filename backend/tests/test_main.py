from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_root():
    response = client.get("/")

    assert response.status_code == 200
    assert response.json() == {
        "service": "TrustLayer API Gateway",
        "status": "online",
        "version": "0.1.0",
    }


def test_health():
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {
        "status": "healthy",
    }


def test_auth_status():
    response = client.get("/auth/status")

    assert response.status_code == 200
    assert response.json()["service"] == "authentication"
    assert response.json()["status"] == "ready"


def test_access_check():
    response = client.post(
        "/access/check",
        json={
            "org_id": "demo-org",
            "did": "did:example:alice",
            "resource_id": "document-1",
            "action": "read",
        },
    )

    assert response.status_code == 503
    assert "policy_engine" in response.json()["detail"]


def test_assets():
    response = client.get("/assets/")

    assert response.status_code == 200

    data = response.json()

    assert data["count"] == len(data["assets"])


def test_audit():
    from app.indexer.service import event_repository

    event_repository.clear()

    response = client.get("/audit/")

    assert response.status_code == 200
    assert response.json()["events"] == []


def test_siwe_message():
    response = client.post(
        "/auth/siwe/message",
        json={
            "domain": "localhost:8000",
            "address": "0x1234567890123456789012345678901234567890",
            "statement": "Sign in to TrustLayer.",
            "uri": "http://localhost:8000",
            "chain_id": 80002,
            "nonce": "abc12345",
            "issued_at": "2026-09-10T06:00:00Z",
        },
    )

    assert response.status_code == 200

    message = response.json()["message"]

    assert "localhost:8000 wants you to sign in" in message
    assert "0x1234567890123456789012345678901234567890" in message
    assert "Chain ID: 80002" in message
    assert "Nonce: abc12345" in message


def test_siwe_message_rejects_invalid_address():
    response = client.post(
        "/auth/siwe/message",
        json={
            "domain": "localhost:8000",
            "address": "invalid",
            "statement": "Sign in to TrustLayer.",
            "uri": "http://localhost:8000",
            "chain_id": 80002,
            "nonce": "abc12345",
            "issued_at": "2026-09-10T06:00:00Z",
        },
    )

    assert response.status_code == 422


def test_siwe_nonce():
    response = client.post(
        "/auth/siwe/nonce?address=0x1234567890123456789012345678901234567890"
    )

    assert response.status_code == 200
    assert "nonce" in response.json()

    nonce = response.json()["nonce"]

    assert isinstance(nonce, str)
    assert len(nonce) >= 8


def test_siwe_verify_rejects_invalid_nonce():
    response = client.post(
        "/auth/siwe/verify",
        json={
            "message": "test message",
            "signature": "0xinvalid",
            "address": "0x1234567890123456789012345678901234567890",
            "nonce": "invalidnonce",
        },
    )

    assert response.status_code == 401
    assert response.json()["detail"] == "SIWE message does not match authentication request"


def test_create_asset():
    from app.db.models import Organization
    from app.db.session import SessionLocal

    db = SessionLocal()
    organization = db.query(Organization).first()

    if organization is None:
        organization = Organization(
            id="org-test-assets",
            name="TrustLayer Test Organization",
        )
        db.add(organization)
        db.commit()
        db.refresh(organization)

    db.close()

    response = client.post(
        "/assets/",
        json={
            "organization_id": organization.id,
            "name": "Registered Test Asset",
            "owner_did": "did:trust:test",
            "metadata_json": {
                "asset_type": "Digital Record",
                "access_level": "Developer",
                "policy": "Test Policy",
            },
            "status": "Active",
        },
    )

    assert response.status_code == 201

    body = response.json()
    assert body["status"] == "created"
    assert body["asset"]["name"] == "Registered Test Asset"
    assert body["asset"]["asset_type"] == "Digital Record"
    assert body["asset"]["access_level"] == "Developer"
    assert body["asset"]["policy"] == "Test Policy"