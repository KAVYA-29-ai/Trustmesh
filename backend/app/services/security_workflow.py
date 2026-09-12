from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from uuid import uuid4

from sqlalchemy import select

from app.indexer.events import BlockchainEvent
from app.indexer.service import indexer_service
from app.models.common import AccessCheckRequest
from app.db.models import AuditEvent
from app.db.session import SessionLocal


@dataclass
class IdentityState:
    violations: list[datetime] = field(default_factory=list)
    admin_attempts: int = 0
    suspended: bool = False


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

        if state.suspended:
            policy_allowed = False

        if policy_allowed:
            return {
                "identity": request.did,
                "role": request.role,
                "resource": self._resource_label(request.resource_id),
                "action": request.action,
                "decision": "ALLOW",
                "adaptive_state": "ALLOW",
                "allowed": True,
                "suspended": False,
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

        if severity == "Critical":
            state.suspended = True

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
                "suspension_state": (
                    "Suspended" if state.suspended else "Active"
                ),
            },
        )

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
            "violations": violation_count,
            "risk_score": risk_score,
            "severity": severity,
            "event_id": event_id,
            "incident_id": incident["incident_id"],
            "status": status,
            "synthetic": synthetic,
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
            raise ValueError("identity not found")

        if not state.suspended:
            return {
                "identity": did,
                "status": "Already Active",
                "suspended": False,
            }

        state.suspended = False
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
                    "previous_state": "Suspended",
                    "current_state": "Active",
                    "action": "UNBLOCK",
                    "reason": "Approved recovery request executed.",
                },
            )
        )

        return {
            "identity": did,
            "status": "Active",
            "suspended": False,
            "event_id": event_id,
            "recovery_request_id": recovery_request_id,
        }

    def is_suspended(self, did: str) -> bool:
        state = self.identities.get(did)

        if state is not None:
            return state.suspended

        for incident in self._persisted_incidents():
            if (
                incident.get("identity") == did
                and incident.get("suspended")
            ):
                return True

        return False

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
        except Exception:
            return []

        latest_by_identity: dict[str, AuditEvent] = {}

        for event in events:
            data = event.data or {}

            identity = str(
                data.get("identity")
                or data.get("subject")
                or data.get("did")
                or ""
            )

            if not identity:
                continue

            if identity not in latest_by_identity:
                latest_by_identity[identity] = event

        incidents: list[dict] = []

        for event in latest_by_identity.values():
            data = event.data or {}

            timestamp = (
                event.timestamp.isoformat()
                if event.timestamp
                else datetime.now(timezone.utc).isoformat()
            )

            severity = str(
                data.get("severity")
                or "Low"
            )

            risk_score = int(
                data.get("risk_score")
                or 0
            )

            suspended = str(
                data.get("suspension_state")
                or data.get("status")
                or ""
            ).lower() == "suspended"

            event_id = (
                f"{event.transaction_hash}:"
                f"{event.log_index}"
            )

            incident_id = f"INC-PERSISTED-{event_id}"

            incident = {
                "incident_id": incident_id,
                "identity": str(
                    data.get("identity")
                    or data.get("subject")
                    or "Unknown identity"
                ),
                "role": str(
                    data.get("role")
                    or "Unknown role"
                ),
                "attack_type": str(
                    data.get("attack_type")
                    or "Unauthorized access attempt"
                ),
                "threat_type": str(
                    data.get("threat_type")
                    or "Unauthorized access"
                ),
                "resource": str(
                    data.get("resource")
                    or data.get("resource_id")
                    or "Unknown resource"
                ),
                "action": str(
                    data.get("action")
                    or "Unknown action"
                ),
                "violations": int(
                    data.get("violations")
                    or 1
                ),
                "risk_score": risk_score,
                "severity": severity,
                "decision": str(
                    data.get("decision")
                    or "DENY"
                ),
                "suspended": suspended,
                "created_at": timestamp,
                "evidence": [
                    {
                        "event_id": event_id,
                        "event": event.event_name,
                        "reason": str(
                            data.get("reason")
                            or "PolicyEngine denied the requested action."
                        ),
                        "synthetic": bool(
                            data.get("synthetic", False)
                        ),
                    }
                ],
                "timeline": [
                    {
                        "stage": "ATTACK",
                        "timestamp": timestamp,
                    },
                    {
                        "stage": "POLICY_DENIAL",
                        "timestamp": timestamp,
                    },
                    {
                        "stage": "BEHAVIOR_PATTERN",
                        "timestamp": timestamp,
                    },
                    {
                        "stage": "AUDIT_EVENT",
                        "timestamp": timestamp,
                    },
                    {
                        "stage": "THREAT_DETECTION",
                        "timestamp": timestamp,
                    },
                    {
                        "stage": "RISK_ESCALATION",
                        "timestamp": timestamp,
                    },
                    {
                        "stage": (
                            "SUSPENSION"
                            if suspended
                            else "ADAPTIVE_RESTRICTION"
                        ),
                        "timestamp": timestamp,
                    },
                ],
                "response_metrics": {
                    "attack_to_restriction_ms": 0,
                    "detection_latency_ms": 0,
                    "restriction_latency_ms": 0,
                    "measured_from": "recorded_workflow_event",
                },
            }

            incidents.append(incident)

        incidents.sort(
            key=lambda incident: incident.get(
                "created_at",
                "",
            ),
            reverse=True,
        )

        return incidents

    def graph(self) -> dict:
        nodes: dict[str, dict] = {}
        links: list[dict] = []
        seen_links: set[tuple[str, str, str]] = set()

        def node(
            node_id: str,
            label: str,
            node_type: str,
            risk: int = 0,
        ) -> None:
            current = nodes.setdefault(
                node_id,
                {
                    "id": node_id,
                    "label": label,
                    "type": node_type,
                    "risk": risk,
                },
            )

            current["risk"] = max(
                current["risk"],
                risk,
            )

        def link(
            source: str,
            target: str,
            relation: str,
        ) -> None:
            key = (
                source,
                target,
                relation,
            )

            if key not in seen_links:
                seen_links.add(key)

                links.append(
                    {
                        "source": source,
                        "target": target,
                        "relation": relation,
                    }
                )

        incidents = self.list_incidents()

        for incident in incidents:
            identity = incident["identity"]
            role = incident["role"]
            resource = incident["resource"]
            event_id = incident["incident_id"]
            risk = incident["risk_score"]

            identity_node = f"identity:{identity}"
            role_node = f"role:{role}"
            resource_node = f"resource:{resource}"
            event_node = f"event:{event_id}"
            threat_node = f"threat:{event_id}"

            for args in (
                (
                    identity_node,
                    identity,
                    "identity",
                    risk,
                ),
                (
                    role_node,
                    role,
                    "role",
                    0,
                ),
                (
                    resource_node,
                    resource,
                    "resource",
                    risk,
                ),
                (
                    event_node,
                    "AccessDenied",
                    "event",
                    risk,
                ),
                (
                    threat_node,
                    incident["threat_type"],
                    "threat",
                    risk,
                ),
            ):
                node(*args)

            link(
                identity_node,
                role_node,
                "assigned",
            )

            link(
                role_node,
                resource_node,
                "requests",
            )

            link(
                identity_node,
                event_node,
                "triggered",
            )

            link(
                event_node,
                threat_node,
                "detected",
            )

            link(
                threat_node,
                resource_node,
                "targets",
            )

        latest_incident = (
            incidents[0]
            if incidents
            else None
        )

        behavior_score = 0
        behavior_detected = False

        if latest_incident:
            behavior_checkpoint = latest_incident.get(
                "behavior_checkpoint",
                {},
            )

            behavior_score = int(
                latest_incident.get(
                    "behavior_score",
                    behavior_checkpoint.get(
                        "score",
                        0,
                    ),
                )
            )

            behavior_detected = bool(
                latest_incident.get(
                    "behavior_detected",
                    behavior_checkpoint.get(
                        "detected",
                        False,
                    ),
                )
            )

        risk_score = (
            int(
                latest_incident.get(
                    "risk_score",
                    0,
                )
            )
            if latest_incident
            else 0
        )

        trust_score = max(
            0,
            100 - max(
                risk_score,
                behavior_score,
            ),
        )

        if behavior_score >= 70:
            trust_state = "CRITICAL"
        elif behavior_score >= 40:
            trust_state = "DEGRADED"
        elif behavior_score > 0:
            trust_state = "WATCH"
        else:
            trust_state = "STABLE"

        return {
            "service": "trust-risk-graph",
            "status": "ready",
            "count": {
                "nodes": len(nodes),
                "links": len(links),
            },
            "nodes": list(nodes.values()),
            "links": links,
            "behavior": {
                "score": behavior_score,
                "detected": behavior_detected,
                "state": trust_state,
            },
            "trust": {
                "score": trust_score,
                "state": trust_state,
            },
        }

    def copilot(
        self,
        incident: dict | None = None,
    ) -> dict:
        """
        Build an evidence-backed Security Copilot assessment.

        The Copilot never creates or changes security state. It only explains
        the latest TrustMesh incident using evidence already produced by the
        security workflow.
        """

        incident = incident or (
            self.list_incidents()[0]
            if self.list_incidents()
            else None
        )

        if incident is None:
            return {
                "status": "ready",
                "provider": "deterministic-security-analysis",
                "incident_id": None,
                "analysis": (
                    "No TrustMesh security incident is currently available "
                    "for analysis."
                ),
                "what_happened": (
                    "No security incident has been recorded yet."
                ),
                "why_suspicious": (
                    "There is no incident evidence available to establish "
                    "suspicious behavior."
                ),
                "evidence": [],
                "risk_explanation": (
                    "No risk assessment is available because there is no "
                    "incident evidence."
                ),
                "recommendation": (
                    "Run a controlled security simulation to generate "
                    "evidence for analysis."
                ),
            }

        identity = incident.get(
            "identity",
            "Unknown identity",
        )

        role = incident.get(
            "role",
            "Unknown role",
        )

        resource = incident.get(
            "resource",
            "Unknown resource",
        )

        action = incident.get(
            "action",
            "Unknown action",
        )

        attack_type = incident.get(
            "attack_type",
            "Unknown attack",
        )

        threat_type = incident.get(
            "threat_type",
            "Unknown threat",
        )

        violations = incident.get(
            "violations",
            0,
        )

        risk_score = incident.get(
            "risk_score",
            0,
        )

        severity = incident.get(
            "severity",
            "Unknown",
        )

        decision = incident.get(
            "decision",
            "Unknown",
        )

        suspended = bool(
            incident.get(
                "suspended",
                False,
            )
        )

        evidence = incident.get(
            "evidence",
            [],
        )

        timeline = incident.get(
            "timeline",
            [],
        )

        evidence_count = len(evidence)

        timeline_stages = [
            stage.get("stage")
            for stage in timeline
            if (
                isinstance(stage, dict)
                and stage.get("stage")
            )
        ]

        if suspended:
            response_state = (
                "The identity is currently suspended after TrustMesh "
                "reached the critical-risk threshold."
            )

            recommendation = (
                "Keep the identity suspended, review the indexed audit "
                "evidence, validate the identity's legitimacy, and require "
                "human approval before any recovery or unblock action."
            )

        elif severity.lower() == "high":
            response_state = (
                "TrustMesh denied the request and applied an adaptive "
                "high-risk restriction."
            )

            recommendation = (
                "Maintain the denial, review the indexed audit evidence, "
                "and validate the identity before restoring access."
            )

        elif severity.lower() == "medium":
            response_state = (
                "TrustMesh detected repeated policy violations and moved "
                "the identity into an adaptive step-up state."
            )

            recommendation = (
                "Require step-up verification and review the related "
                "security evidence before allowing privileged activity."
            )

        else:
            response_state = (
                "TrustMesh recorded a policy denial and classified the "
                "activity as low risk."
            )

            recommendation = (
                "Review the denied request and verify that the requested "
                "action matches the identity's assigned permissions."
            )

        evidence_summary = (
            f"Incident {incident['incident_id']} contains "
            f"{evidence_count} evidence record(s) and "
            f"{len(timeline_stages)} workflow stage(s)."
        )

        analysis = (
            f"TrustMesh observed {violations} denied request(s) from "
            f"{identity} ({role}) targeting {resource} with action "
            f"{action}. The observed attack pattern is "
            f"{attack_type}, with the detected threat classified as "
            f"{threat_type}. The enforced decision was {decision}. "
            f"Risk reached {risk_score}/100 ({severity}). "
            f"{response_state} {evidence_summary}"
        )

        why_suspicious = (
            f"The activity is suspicious because TrustMesh observed "
            f"{violations} policy violation(s) associated with the same "
            f"identity. The recorded threat pattern is "
            f"\"{threat_type}\" and the workflow reached the "
            f"\"{severity}\" risk classification. These conclusions are "
            f"based on the recorded incident evidence rather than an "
            f"unverified external claim."
        )

        risk_explanation = (
            f"TrustMesh assigned a risk score of {risk_score}/100 and "
            f"classified the incident as {severity}. "
            f"{'The identity is suspended because the workflow reached the critical threshold. ' if suspended else ''}"
            f"The score and enforcement state come from the TrustMesh "
            f"security workflow."
        )

        return {
            "status": "ready",
            "provider": "deterministic-security-analysis",
            "incident_id": incident["incident_id"],
            "analysis": analysis,
            "what_happened": (
                f"{identity} ({role}) made repeated denied requests "
                f"against {resource} using action {action}."
            ),
            "why_suspicious": why_suspicious,
            "evidence": evidence,
            "risk_explanation": risk_explanation,
            "recommendation": recommendation,
            "context": {
                "identity": identity,
                "role": role,
                "resource": resource,
                "action": action,
                "attack_type": attack_type,
                "threat_type": threat_type,
                "violations": violations,
                "risk_score": risk_score,
                "severity": severity,
                "decision": decision,
                "suspended": suspended,
                "timeline_stages": timeline_stages,
            },
        }

    @staticmethod
    def policy_simulation(
        request: AccessCheckRequest,
        simulated_decision: str,
    ) -> dict:
        return {
            "simulation": True,
            "policy_mutated": False,
            "identity": request.did,
            "role": request.role,
            "resource": request.resource_id,
            "action": request.action,
            "current_decision": "ALLOW",
            "simulated_decision": simulated_decision.upper(),
        }

    def _record_incident(
        self,
        event: BlockchainEvent,
        state: IdentityState,
        risk_score: int,
        severity: str,
    ) -> dict:
        incident_timestamp = (
            event.timestamp.isoformat()
            if event.timestamp
            else datetime.now(timezone.utc).isoformat()
        )

        incident = {
            "incident_id": f"INC-{uuid4().hex[:10].upper()}",
            "identity": event.data["identity"],
            "role": event.data["role"],
            "attack_type": event.data["attack_type"],
            "threat_type": event.data["threat_type"],
            "resource": event.data["resource"],
            "action": event.data["action"],
            "violations": event.data["violations"],
            "risk_score": risk_score,
            "severity": severity,
            "decision": event.data["decision"],
            "suspended": state.suspended,
            "created_at": incident_timestamp,
            "evidence": [
                {
                    "event_id": (
                        f"{event.transaction_hash}:"
                        f"{event.log_index}"
                    ),
                    "event": event.event_name,
                    "reason": event.data["reason"],
                    "synthetic": event.data["synthetic"],
                }
            ],
            "timeline": [
                {
                    "stage": "ATTACK",
                    "timestamp": incident_timestamp,
                },
                {
                    "stage": "POLICY_DENIAL",
                    "timestamp": incident_timestamp,
                },
                {
                    "stage": "BEHAVIOR_PATTERN",
                    "timestamp": incident_timestamp,
                },
                {
                    "stage": "AUDIT_EVENT",
                    "timestamp": incident_timestamp,
                },
                {
                    "stage": "THREAT_DETECTION",
                    "timestamp": incident_timestamp,
                },
                {
                    "stage": "RISK_ESCALATION",
                    "timestamp": incident_timestamp,
                },
                {
                    "stage": (
                        "SUSPENSION"
                        if state.suspended
                        else "ADAPTIVE_RESTRICTION"
                    ),
                    "timestamp": incident_timestamp,
                },
            ],
            "response_metrics": {
                "attack_to_restriction_ms": 0,
                "detection_latency_ms": 0,
                "restriction_latency_ms": 0,
                "measured_from": "recorded_workflow_event",
            },
        }

        self.incidents.append(incident)

        return incident

    @staticmethod
    def _risk_for(
        action: str,
        violations: int,
        admin_attempts: int,
    ) -> tuple[str, int]:
        critical_action = action.upper() in {
            "PRIVILEGE_ESCALATION",
            "TRANSFER",
        }

        if (
            violations >= 7
            or (
                critical_action
                and admin_attempts >= 2
            )
        ):
            return "Critical", 95

        if (
            violations >= 5
            or admin_attempts >= 3
        ):
            return "High", 85

        if violations >= 3:
            return "Medium", 55

        return "Low", 25

    @staticmethod
    def _adaptive_state(
        severity: str,
    ) -> str:
        return {
            "Low": "ALLOW",
            "Medium": "STEP-UP",
            "High": "DENY",
            "Critical": "DENY + SUSPEND",
        }[severity]

    @staticmethod
    def _resource_label(
        resource_id: str,
    ) -> str:
        return {
            "acme-employee-records": "Employee Records",
            "acme-admin-console": "Admin Console",
            "acme-documents": "Documents",
            "acme-digital-assets": "Digital Assets",
        }.get(
            resource_id,
            resource_id,
        )


security_workflow = SecurityWorkflowService()