from fastapi.testclient import TestClient

from app.main import app
from app.routers import demo


client = TestClient(app)


async def allow_policy(request):
    assert request.org_id == "acme-organization"
    assert request.did.endswith("79C8")
    assert request.role == "Employee"
    assert request.resource_id == "acme-admin-console"
    assert request.action == "ADMIN"
    return True


def test_generic_demo_authorization_returns_policy_decision(monkeypatch):
    monkeypatch.setattr(demo, "_check_policy", allow_policy)

    response = client.post(
        "/demo/authorize",
        json={
            "org_id": "acme-organization",
            "did": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
            "role": "Employee",
            "resource_id": "acme-admin-console",
            "action": "ADMIN",
        },
    )

    assert response.status_code == 200
    assert response.json()["allowed"] is True
    assert response.json()["decision"] == "ALLOW"
