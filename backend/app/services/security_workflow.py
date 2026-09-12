from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from uuid import uuid4

from sqlalchemy import select
from web3 import Web3

from app.blockchain.adapters.policy_engine import PolicyEngineAdapter
from app.blockchain.client import blockchain_client
from app.indexer.events import BlockchainEvent
from app.indexer.service import indexer_service
from app.models.common import AccessCheckRequest
from app.db.models import AuditEvent
from app.db.session import SessionLocal
from app.services.security_agent import security_agent


@dataclass
class IdentityState:
    violations: list[datetime] = field(default_factory=list)
    admin_attempts: int = 0
    status: str = "ACTIVE"

    @property
    def suspended(self) -> bool:
        return self.status == "SUSPENDED"


class SecurityWorkflowService:
    """Stateful security workflow projection backed by indexed audit evidence."""

    rapid_window = timedelta(seconds=60)
    medium_threshold = 3
    high_threshold = 5
    critical_threshold = 7

    def __init__(self, event_sink=None) -> None:
        self.event_sink = event_sink or indexer_service.ingest
        self.identities: dict[str, IdentityState] = {}
        self.incidents: list[dict] = []

    def reset(self) -> None:
        self.identities.clear()
        self.incidents.clear()

    def authorize(
        self,
        request: AccessCheckRequest,
        policy_allowed: bool,
        *,
        synthetic: bool = False,
    ) -> dict:
        state = self.identities.setdefault(request.did, IdentityState())
        now = datetime.now(timezone.utc)

        recent = [
            timestamp
            for timestamp in state.violations
            if now - timestamp <= self.rapid_window
        ]
        state.violations = recent

        if state.status != "ACTIVE":
            policy_allowed = False

        if policy_allowed:
            event_id = f"demo-{uuid4()}"
            self.event_sink(
                BlockchainEvent(
                    event_name="AccessAllowed",
                    contract_address="trustmesh-policy-engine",
                    transaction_hash=event_id,
                    block_number=0,
                    log_index=0,
                    timestamp=now,
                    data={
                        "subject": request.did,
                        "identity": request.did,
                        "role": request.role,
                        "resource": self._resource_label(request.resource_id),
                        "resource_id": request.resource_id,
                        "action": request.action,
                        "decision": "ALLOW",
                        "status": "Allowed",
                    },
                )
            )
            return {
                "identity": request.did,
                "role": request.role,
                "resource": self._resource_label(request.resource_id),
                "action": request.action,
                "decision": "ALLOW",
                "adaptive_state": "ALLOW",
                "allowed": True,
                "suspended": state.suspended,
                "status": state.status,
                "violations": len(state.violations),
            }

        state.violations.append(now)

        if request.action.upper() in {
            "ADMIN",
            "DELETE",
            "TRANSFER",
            "PRIVILEGE_ESCALATION",
        }:
            state.admin_attempts += 1

        violation_count = len(state.violations)

        severity, risk_score = self._risk_for(
            request.action,
            violation_count,
            state.admin_attempts,
        )

        adaptive_state = self._adaptive_state(severity)

        if severity == "Critical" and state.status == "ACTIVE":
            state.status = "SUSPENDED"

        event_id = f"demo-{uuid4()}"

        status = "Suspended" if state.suspended else "Blocked"

        description = (
            f"{request.role} identity attempted {request.action} on "
            f"{request.resource_id}; PolicyEngine denied the request."
        )

        event = BlockchainEvent(
            event_name="AccessDenied",
            contract_address="trustmesh-policy-engine",
            transaction_hash=event_id,
            block_number=0,
            log_index=0,
            timestamp=now,
            data={
                "synthetic": synthetic,
                "attack_type": (
                    "Privilege escalation probing"
                    if state.admin_attempts
                    else "Unauthorized access attempt"
                ),
                "threat_type": (
                    "Rapid repeated administrative failures"
                    if state.admin_attempts >= 2
                    else "Unauthorized access"
                ),
                "subject": request.did,
                "identity": request.did,
                "role": request.role,
                "resource": self._resource_label(request.resource_id),
                "resource_id": request.resource_id,
                "action": request.action,
                "decision": "DENY",
                "severity": severity,
                "risk_score": risk_score,
                "status": status,
                "adaptive_state": adaptive_state,
                "violations": violation_count,
                "reason": "PolicyEngine denied the requested action.",
                "description": description,
                "suspension_state": state.status.title(),
                "identity_status": state.status,
            },
        )

        analysis = security_agent.analyze(event)
        event.data["ai_analysis"] = {
            "threat_detected": analysis.threat_detected,
            "risk_score": analysis.risk_score,
            "severity": analysis.severity,
            "reason": analysis.reason,
            "recommendation": analysis.recommendation,
        }

        self.event_sink(event)

        incident = self._record_incident(
            event,
            state,
            risk_score,
            severity,
        )

        return {
            "identity": request.did,
            "role": request.role,
            "resource": request.resource_id,
            "action": request.action,
            "decision": "DENY",
            "adaptive_state": adaptive_state,
            "allowed": False,
            "suspended": state.suspended,
            "status": status,
            "violations": violation_count,
            "risk_score": risk_score,
            "severity": severity,
            "event_id": event_id,
            "incident_id": incident["incident_id"],
            "synthetic": synthetic,
            "ai_analysis": event.data["ai_analysis"],
        }

    def restore_identity(
        self,
        did: str,
        *,
        recovery_request_id: str | None = None,
    ) -> dict:
        """Restore a suspended identity after approved recovery."""

        state = self.identities.get(did)

        if state is None:
            persisted_status = self.identity_status(did)
            if persisted_status == "ACTIVE":
                raise ValueError("identity not found")
            state = self.identities.setdefault(
                did,
                IdentityState(status=persisted_status),
            )

        if state.status == "ACTIVE":
            return {
                "identity": did,
                "status": "Already Active",
                "suspended": False,
            }

        previous_status = state.status
        state.status = "ACTIVE"
        state.violations.clear()
        state.admin_attempts = 0

        now = datetime.now(timezone.utc)
        event_id = f"recovery-{uuid4()}"

        self.event_sink(
            BlockchainEvent(
                event_name="IdentityRestored",
                contract_address="trustmesh-recovery",
                transaction_hash=event_id,
                block_number=0,
                log_index=0,
                timestamp=now,
                data={
                    "identity": did,
                    "subject": did,
                    "recovery_request_id": recovery_request_id,
                    "previous_state": previous_status,
                    "current_state": "ACTIVE",
                    "action": "UNBLOCK",
                    "reason": "Approved recovery request executed.",
                },
            )
        )

        return {
            "identity": did,
            "status": "Active",
            "suspended": False,
            "status": "ACTIVE",
            "event_id": event_id,
            "recovery_request_id": recovery_request_id,
        }

    def is_suspended(self, did: str) -> bool:
        state = self.identities.get(did)

        if state is not None:
            return state.status != "ACTIVE"

        for incident in self._persisted_incidents():
            if (
                incident.get("identity") == did
                and incident.get("status", "ACTIVE") != "ACTIVE"
            ):
                return True

        return False

    def identity_status(self, did: str) -> str:
        state = self.identities.get(did)
        if state is not None:
            return state.status

        for incident in self.list_incidents():
            if incident.get("identity") == did:
                return str(incident.get("status", "ACTIVE")).upper()

        return "ACTIVE"

    def apply_decision(self, incident_id: str, decision: str) -> dict:
        normalized = decision.upper()
        if normalized not in {"ACCEPT", "SUSPEND", "BLOCK"}:
            raise ValueError("decision must be ACCEPT, SUSPEND, or BLOCK")

        incident = next(
            (item for item in self.list_incidents() if item["incident_id"] == incident_id),
            None,
        )
        if incident is None:
            raise ValueError("incident not found")

        did = incident["identity"]
        frozen = normalized in {"SUSPEND", "BLOCK"}
        on_chain_enforcement = self._enforce_on_chain(incident, frozen)

        state = self.identities.setdefault(did, IdentityState())
        previous_status = state.status
        if normalized == "SUSPEND":
            state.status = "SUSPENDED"
        elif normalized == "BLOCK":
            state.status = "BLOCKED"
        elif normalized == "ACCEPT":
            state.status = "ACTIVE"
            state.violations.clear()
            state.admin_attempts = 0

        now = datetime.now(timezone.utc)
        event_id = f"decision-{uuid4()}"
        self.event_sink(
            BlockchainEvent(
                event_name="SecurityDecision",
                contract_address="trustmesh-security-center",
                transaction_hash=event_id,
                block_number=0,
                log_index=0,
                timestamp=now,
                data={
                    "identity": did,
                    "subject": did,
                    "incident_id": incident_id,
                    "decision": normalized,
                    "previous_state": previous_status,
                    "current_state": state.status,
                    "reason": "Human decision confirmed in Security Center.",
                    "on_chain_enforcement": on_chain_enforcement,
                },
            )
        )

        for item in self.incidents:
            if item["incident_id"] == incident_id:
                item["decision"] = normalized
                item["status"] = state.status
                item["suspended"] = state.status == "SUSPENDED"
                item["on_chain_enforcement"] = on_chain_enforcement

        return {
            "incident_id": incident_id,
            "identity": did,
            "decision": normalized,
            "previous_state": previous_status,
            "status": state.status,
            "event_id": event_id,
            "on_chain_enforcement": on_chain_enforcement,
        }

    def _resource_id_from_incident(self, incident: dict) -> str:
        resource_id = incident.get("resource_id")
        if resource_id:
            return str(resource_id)

        resource = str(incident.get("resource") or "")
        return {
            "Employee Records": "acme-employee-records",
            "Admin Console": "acme-admin-console",
            "Documents": "acme-documents",
            "Digital Assets": "acme-digital-assets",
        }.get(resource, resource)

    def _enforce_on_chain(self, incident: dict, frozen: bool) -> dict:
        """Apply the human decision to the PolicyEngine when blockchain is configured."""
        if not blockchain_client.is_configured():
            return {
                "status": "not_configured",
                "frozen": frozen,
            }

        if not blockchain_client.is_connected():
            return {
                "status": "not_connected",
                "frozen": frozen,
            }

        did = str(incident.get("identity") or "")
        if not Web3.is_address(did):
            raise ValueError("incident identity must be a valid Ethereum address")

        org_id = str(incident.get("org_id") or "acme-organization")
        resource_id = self._resource_id_from_incident(incident)
        if not resource_id:
            raise ValueError("incident resource_id is required for on-chain enforcement")

        adapter = PolicyEngineAdapter(blockchain_client)
        tx_hash = adapter.set_resource_freeze(
            Web3.keccak(text=org_id),
            Web3.to_checksum_address(did),
            Web3.keccak(text=resource_id),
            frozen,
        )

        return {
            "status": "confirmed",
            "frozen": frozen,
            "transaction_hash": tx_hash,
            "org_id": org_id,
            "resource_id": resource_id,
        }

    def simulate_attack(
        self,
        request: AccessCheckRequest,
    ) -> dict:
        attempts = [
            self.authorize(
                request,
                False,
                synthetic=True,
            )
            for _ in range(7)
        ]

        return {
            "mode": "SIMULATION",
            "synthetic": True,
            "attempts": attempts,
            "final": attempts[-1],
        }

    def list_incidents(self) -> list[dict]:
        """
        Return live workflow incidents.

        The application-level singleton can recover persisted incidents after
        a backend restart. Standalone workflow instances remain isolated so
        unit tests and simulations do not inherit global database history.
        """

        if self.incidents:
            return list(reversed(self.incidents))

        if self is security_workflow:
            return self._persisted_incidents()

        return []

    def _persisted_incidents(self) -> list[dict]:
        """
        Reconstruct incident projections from persisted AccessDenied events.

        The workflow incident list is intentionally an in-memory projection,
        while AuditEvent is the persistent evidence source. This method keeps
        Security Center state available after a FastAPI restart.
        """

        try:
            with SessionLocal() as db:
                events = db.scalars(
                    select(AuditEvent)
                    .where(AuditEvent.event_name == "AccessDenied")
                    .order_by(AuditEvent.timestamp.desc())
                ).all()
                decisions = db.scalars(
                    select(AuditEvent)
                    .where(AuditEvent.event_name == "SecurityDecision")
                    .order_by(AuditEvent.timestamp.desc())
                ).all()
        except Exception:
            return []

        decisions_by_incident = {
            str((item.data or {}).get("incident_id")): item
            for item in decisions
            if (item.data or {}).get("incident_id")
        }

        incidents: list[dict] = []
        for event in events:
            data = event.data or {}
            incident_id = str(data.get("incident_id") or "")
            if not incident_id:
                incident_id = f"INC-{event.event_id[-10:].upper()}"

            decision_event = decisions_by_incident.get(incident_id)
            decision_data = decision_event.data if decision_event else {}
            current_state = str(
                decision_data.get("current_state")
                or data.get("identity_status")
                or data.get("status")
                or "ACTIVE"
            ).upper()

            incidents.append(
                {
                    "incident_id": incident_id,
                    "identity": str(data.get("identity") or data.get("subject") or ""),
                    "org_id": str(data.get("org_id") or "acme-organization"),
                    "resource": self._resource_label(str(data.get("resource_id") or data.get("resource") or "")),
                    "resource_id": str(data.get("resource_id") or data.get("resource") or ""),
                    "action": str(data.get("action") or ""),
                    "attack_type": str(data.get("attack_type") or "Unauthorized access attempt"),
                    "threat_type": str(data.get("threat_type") or "Unauthorized access"),
                    "risk_score": int(data.get("risk_score") or 0),
                    "severity": str(data.get("severity") or "Low"),
                    "decision": str(decision_data.get("decision") or data.get("decision") or "DENY"),
                    "status": current_state,
                    "suspended": current_state == "SUSPENDED",
                    "violations": int(data.get("violations") or 0),
                    "created_at": event.timestamp.isoformat(),
                    "synthetic": bool(data.get("synthetic", False)),
                    "ai_analysis": data.get("ai_analysis"),
                    "on_chain_enforcement": decision_data.get("on_chain_enforcement"),
                    "evidence": [
                        {
                            "event_name": event.event_name,
                            "transaction_hash": event.transaction_hash,
                            "timestamp": event.timestamp.isoformat(),
                        }
                    ],
                }
            )

        return incidents

    def _record_incident(
        self,
        event: BlockchainEvent,
        state: IdentityState,
        risk_score: int,
        severity: str,
    ) -> dict:
        data = event.data or {}
        incident = {
            "incident_id": f"INC-{uuid4().hex[:10].upper()}",
            "identity": event.data.get("identity") or event.data.get("subject"),
            "org_id": event.data.get("org_id") or "acme-organization",
            "resource": self._resource_label(event.data.get("resource_id") or event.data.get("resource") or ""),
            "resource_id": event.data.get("resource_id") or event.data.get("resource") or "",
            "action": event.data.get("action") or "",
            "attack_type": data.get("attack_type") or "Unauthorized access attempt",
            "threat_type": data.get("threat_type") or "Unauthorized access",
            "risk_score": risk_score,
            "severity": severity,
            "decision": "DENY",
            "status": state.status,
            "suspended": state.status == "SUSPENDED",
            "violations": len(state.violations),
            "created_at": event.timestamp.isoformat(),
            "synthetic": bool(data.get("synthetic", False)),
            "ai_analysis": data.get("ai_analysis"),
            "evidence": [
                {
                    "event_name": event.event_name,
                    "transaction_hash": event.transaction_hash,
                    "timestamp": event.timestamp.isoformat(),
                }
            ],
        }
        self.incidents.append(incident)
        return incident

    @staticmethod
    def _resource_label(resource_id: str) -> str:
        return {
            "acme-employee-records": "Employee Records",
            "acme-admin-console": "Admin Console",
            "acme-documents": "Documents",
            "acme-digital-assets": "Digital Assets",
        }.get(resource_id, resource_id)

    @classmethod
    def _risk_for(
        cls,
        action: str,
        violation_count: int,
        admin_attempts: int,
    ) -> tuple[str, int]:
        base = 25
        if action.upper() in {"ADMIN", "DELETE", "TRANSFER", "PRIVILEGE_ESCALATION"}:
            base = 50
        score = min(100, base + (violation_count - 1) * 10 + admin_attempts * 10)

        if score >= 85:
            return "Critical", score
        if score >= 65:
            return "High", score
        if score >= 40:
            return "Medium", score
        return "Low", score

    @staticmethod
    def _adaptive_state(severity: str) -> str:
        return {
            "Low": "ALLOW",
            "Medium": "STEP-UP",
            "High": "DENY",
            "Critical": "DENY + SUSPEND",
        }[severity]

    def graph(self) -> dict:
        incidents = self.list_incidents()
        nodes: list[dict] = []
        links: list[dict] = []
        node_ids: set[str] = set()

        def add_node(node_id: str, label: str, node_type: str, risk: int = 0) -> None:
            if node_id in node_ids:
                return
            node_ids.add(node_id)
            nodes.append({
                "id": node_id,
                "label": label,
                "type": node_type,
                "risk": risk,
            })

        for incident in incidents:
            identity = str(incident.get("identity") or "")
            resource = str(incident.get("resource") or "")
            threat = str(incident.get("threat_type") or "")
            role = str(incident.get("role") or "External")
            risk = int(incident.get("risk_score") or 0)

            add_node(f"identity:{identity}", identity, "identity", risk)
            add_node(f"role:{role}", role, "role")
            add_node(f"resource:{resource}", resource, "resource", risk)
            add_node(f"threat:{threat}", threat, "threat", risk)
            links.extend(
                [
                    {"source": f"identity:{identity}", "target": f"role:{role}", "relation": "assigned"},
                    {"source": f"identity:{identity}", "target": f"threat:{threat}", "relation": "detected"},
                    {"source": f"threat:{threat}", "target": f"resource:{resource}", "relation": "targeted"},
                ]
            )

        return {
            "service": "security-workflow",
            "status": "ready",
            "nodes": nodes,
            "links": links,
            "count": {"nodes": len(nodes), "links": len(links)},
        }

    def copilot(self) -> dict:
        incidents = self.list_incidents()
        critical = [item for item in incidents if item.get("severity") == "Critical"]
        highest = max((int(item.get("risk_score") or 0) for item in incidents), default=0)

        return {
            "service": "security-copilot",
            "status": "ready",
            "summary": (
                "Critical incidents require human review and may trigger resource freezing."
                if critical
                else "No critical incidents are currently projected."
            ),
            "highest_risk": highest,
            "critical_incidents": len(critical),
            "recommendations": [
                "Review indexed evidence before changing identity state.",
                "Use SUSPEND or BLOCK for confirmed high-risk behavior.",
                "Use ACCEPT only after the evidence is cleared.",
            ],
        }

    def policy_simulation(self, role: str, action: str, resource: str) -> dict:
        normalized_role = role.strip().lower()
        normalized_action = action.strip().upper()
        allowed = normalized_role in {"admin", "manager"} or (
            normalized_role == "employee" and normalized_action not in {"ADMIN", "DELETE", "PRIVILEGE_ESCALATION"}
        )
        return {
            "service": "policy-impact-simulator",
            "status": "simulated",
            "role": role,
            "action": normalized_action,
            "resource": resource,
            "current_policy": "ALLOW" if allowed else "DENY",
            "impact": "Access remains unchanged; simulation does not execute the action.",
        }


security_workflow = SecurityWorkflowService()
