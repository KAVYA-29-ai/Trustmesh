import asyncio

from app.services.authorization import AuthorizationService


class FakePolicyEngine:
    def __init__(self):
        self.calls = []

    async def has_permission(self, org_id, subject, resource_id, action):
        self.calls.append((org_id, subject, resource_id, action))
        return True


def test_authorization_passes_application_context_to_policy_engine():
    policy_engine = FakePolicyEngine()
    service = AuthorizationService(policy_engine)

    allowed = asyncio.run(
        service.check_access(
            org_id="acme-organization",
            subject="0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
            role="Employee",
            resource_id="acme-employee-records",
            action="READ",
        )
    )

    assert allowed is True
    org_id, subject, resource_id, action = policy_engine.calls[0]
    assert len(org_id) == 32
    assert subject.endswith("79C8")
    assert len(resource_id) == 32
    assert action == "READ"
