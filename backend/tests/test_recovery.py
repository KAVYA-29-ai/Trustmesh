from fastapi.testclient import TestClient

from app.main import app
from app.models.common import AccessCheckRequest
from app.services.security_workflow import security_workflow


client = TestClient(app)


def test_create_recovery_request():
    response = client.post(
        "/recovery/requests",
        json={
            "subject": "did:example:attacked-user",
            "reason": "Identity was suspended after a critical security incident.",
        },
    )

    assert response.status_code == 201

    data = response.json()

    assert data["status"] == "created"
    assert data["request"]["subject"] == "did:example:attacked-user"
    assert data["request"]["reason"] == (
        "Identity was suspended after a critical security incident."
    )
    assert data["request"]["status"] == "Pending Consensus"
    assert data["request"]["approvals"] == 0
    assert data["request"]["required_approvals"] == 2
    assert data["request"]["timelock_hours"] == 48


def test_recovery_approval_lifecycle():
    create_response = client.post(
        "/recovery/requests",
        json={
            "subject": "did:example:approval-test",
            "reason": "Restore access after security review.",
        },
    )

    assert create_response.status_code == 201

    request_id = create_response.json()["request"]["request_id"]

    first_approval = client.post(
        f"/recovery/requests/{request_id}/approve"
    )

    assert first_approval.status_code == 200

    first_data = first_approval.json()["request"]

    assert first_data["approvals"] == 1
    assert first_data["status"] == "Pending Consensus"

    second_approval = client.post(
        f"/recovery/requests/{request_id}/approve"
    )

    assert second_approval.status_code == 200

    second_data = second_approval.json()["request"]

    assert second_data["approvals"] == 2
    assert second_data["status"] == "Ready for Timelock"


def test_recovery_cannot_execute_before_timelock():
    create_response = client.post(
        "/recovery/requests",
        json={
            "subject": "did:example:timelock-test",
            "reason": "Verify timelock enforcement.",
            "timelock_hours": 48,
        },
    )

    assert create_response.status_code == 201

    request_id = create_response.json()["request"]["request_id"]

    client.post(f"/recovery/requests/{request_id}/approve")
    client.post(f"/recovery/requests/{request_id}/approve")

    response = client.post(
        f"/recovery/requests/{request_id}/execute"
    )

    assert response.status_code == 409
    assert "timelock" in response.json()["detail"].lower()


def test_recovery_executes_after_timelock():
    security_workflow.reset()

    request = AccessCheckRequest(
        did="did:example:execution-test",
        org_id="acme",
        role="Employee",
        resource_id="acme-admin-console",
        action="PRIVILEGE_ESCALATION",
    )

    attack = security_workflow.simulate_attack(request)

    assert attack["final"]["suspended"] is True
    assert security_workflow.is_suspended(request.did) is True

    create_response = client.post(
        "/recovery/requests",
        json={
            "subject": request.did,
            "reason": "Restore identity after approved recovery.",
            "timelock_hours": 0,
        },
    )

    assert create_response.status_code == 201

    request_id = create_response.json()["request"]["request_id"]

    first_approval = client.post(
        f"/recovery/requests/{request_id}/approve"
    )

    assert first_approval.status_code == 200

    second_approval = client.post(
        f"/recovery/requests/{request_id}/approve"
    )

    assert second_approval.status_code == 200

    response = client.post(
        f"/recovery/requests/{request_id}/execute"
    )

    assert response.status_code == 200

    data = response.json()

    assert data["status"] == "recovered"
    assert data["request"]["status"] == "Recovered"
    assert data["request"]["approvals"] == 2
    assert security_workflow.is_suspended(request.did) is False


def test_recovery_request_not_found():
    response = client.post(
        "/recovery/requests/non-existent-request/approve"
    )

    assert response.status_code == 404


def test_recovery_summary_tracks_states():
    create_response = client.post(
        "/recovery/requests",
        json={
            "subject": "did:example:summary-test",
            "reason": "Validate recovery summary.",
            "timelock_hours": 0,
        },
    )

    assert create_response.status_code == 201

    request_id = create_response.json()["request"]["request_id"]

    client.post(f"/recovery/requests/{request_id}/approve")
    client.post(f"/recovery/requests/{request_id}/approve")

    response = client.get("/recovery/")

    assert response.status_code == 200

    summary = response.json()["summary"]

    assert summary["ready_for_timelock"] >= 1