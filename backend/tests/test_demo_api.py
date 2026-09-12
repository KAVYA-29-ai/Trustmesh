from fastapi.testclient import TestClient

from app.main import app
from app.routers import demo
from app.indexer.service import event_repository


client = TestClient(app)


def setup_function():
    event_repository.clear()


async def allow_policy(request):
    return True


async def deny_policy(request):
    return False


def test_student_resource_uses_policy_engine(monkeypatch):
    monkeypatch.setattr(demo, "_check_policy", allow_policy)

    response = client.post("/demo/student-resource")

    assert response.status_code == 200
    assert response.json()["decision"] == "ALLOWED"
    assert response.json()["resource"] == "Student Records"


def test_unauthorized_access_is_indexed_as_blocked(monkeypatch):
    monkeypatch.setattr(demo, "_check_policy", deny_policy)

    response = client.post("/demo/unauthorized-access")

    assert response.status_code == 200
    assert response.json()["decision"] == "DENIED"
    assert response.json()["status"] == "blocked"

    audit_response = client.get("/audit/")
    event = audit_response.json()["events"][0]
    assert event["event_name"] == "AccessDenied"
    assert event["data"]["resource"] == "Admin Console"
    assert event["data"]["status"] == "Blocked"