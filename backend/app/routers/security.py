
from fastapi import APIRouter
from sqlalchemy import select

from app.indexer.events import BlockchainEvent
from app.db.models import AuditEvent, SecurityFinding
from app.db.session import SessionLocal
from app.services.security import security_service
from app.services.security_agent import security_agent
from app.services.security_repository import security_finding_repository
from app.indexer.service import indexer_service
from app.services.security_workflow import security_workflow

router = APIRouter()


def serialize_event(event) -> dict:
    return {
        "event_id": event.event_id,
        "event_type": event.event_type,
        "severity": event.severity,
        "subject": event.subject,
        "resource": event.resource,
        "status": event.status,
        "description": event.description,
        "attack_type": event.attack_type,
        "action": event.action,
        "decision": event.decision,
    }


@router.get("/")
async def get_security_center() -> dict:
    events = security_service.list_events()

    return {
        "service": "security",
        "status": "ready",
        "summary": security_service.get_summary(),
        "events": [
            serialize_event(event)
            for event in events
        ],
        "incidents": security_workflow.list_incidents(),
    }


@router.get("/events")
async def list_security_events() -> dict:
    events = security_service.list_events()

    return {
        "service": "security",
        "status": "ready",
        "count": len(events),
        "events": [
            serialize_event(event)
            for event in events
        ],
    }


@router.post("/analyze")
async def analyze_security_event(event: BlockchainEvent) -> dict:
    analysis = security_agent.analyze(event)

    return {
        "service": "security-agent",
        "status": "analyzed",
        "event": {
            "event_name": event.event_name,
            "contract_address": event.contract_address,
            "transaction_hash": event.transaction_hash,
            "block_number": event.block_number,
            "log_index": event.log_index,
            "timestamp": event.timestamp,
            "data": event.data,
        },
        "analysis": {
            "threat_detected": analysis.threat_detected,
            "risk_score": analysis.risk_score,
            "severity": analysis.severity,
            "reason": analysis.reason,
            "recommendation": analysis.recommendation,
        },
    }

@router.get("/findings")
async def list_security_findings() -> dict:
    findings = security_finding_repository.list_findings()

    return {
        "service": "security-agent",
        "status": "ready",
        "count": len(findings),
        "findings": [
            {
                "event_id": finding.event_id,
                "event_name": finding.event_name,
                "threat_detected": finding.threat_detected,
                "risk_score": finding.risk_score,
                "severity": finding.severity,
                "reason": finding.reason,
                "recommendation": finding.recommendation,
            }
            for finding in findings
        ],
    }


@router.get("/incidents")
async def list_incidents() -> dict:
    incidents = security_workflow.list_incidents()
    return {
        "service": "incident-response",
        "status": "ready",
        "count": len(incidents),
        "incidents": incidents,
    }


@router.get("/copilot")
async def get_copilot_analysis() -> dict:
    return security_workflow.copilot()


@router.get("/workflow-graph")
async def get_workflow_graph() -> dict:
    return security_workflow.graph()

@router.post("/events/ingest")
async def ingest_security_event(event: BlockchainEvent) -> dict:
    stored_event = indexer_service.ingest(event)
    analysis = security_agent.analyze(stored_event)

    return {
        "service": "security-agent",
        "status": "ingested",
        "event": {
            "event_name": stored_event.event_name,
            "contract_address": stored_event.contract_address,
            "transaction_hash": stored_event.transaction_hash,
            "block_number": stored_event.block_number,
            "log_index": stored_event.log_index,
            "timestamp": stored_event.timestamp,
            "data": stored_event.data,
        },
        "analysis": {
            "threat_detected": analysis.threat_detected,
            "risk_score": analysis.risk_score,
            "severity": analysis.severity,
            "reason": analysis.reason,
            "recommendation": analysis.recommendation,
        },
    }

@router.get("/risk-graph")
async def get_risk_graph() -> dict:
    """Build an evidence-based Trust/Risk relationship graph."""
    with SessionLocal() as db:
        events = db.scalars(
            select(AuditEvent).order_by(AuditEvent.timestamp.desc())
        ).all()

        findings = db.scalars(
            select(SecurityFinding).order_by(SecurityFinding.created_at.desc())
        ).all()

    nodes: dict[str, dict] = {}
    links: list[dict] = []
    link_keys: set[tuple[str, str, str]] = set()

    def add_node(node_id: str, label: str, node_type: str, risk: int = 0) -> None:
        if not node_id:
            return

        existing = nodes.get(node_id)

        if existing is None:
            nodes[node_id] = {
                "id": node_id,
                "label": label,
                "type": node_type,
                "risk": risk,
            }
        else:
            existing["risk"] = max(existing["risk"], risk)

    def add_link(source: str, target: str, relation: str) -> None:
        if not source or not target or source == target:
            return

        key = (source, target, relation)
        if key not in link_keys:
            link_keys.add(key)
            links.append({
                "source": source,
                "target": target,
                "relation": relation,
            })

    finding_by_event: dict[str, SecurityFinding] = {
        finding.event_id: finding for finding in findings
    }

    for event in events:
        data = event.data or {}
        event_id = f"{event.transaction_hash}:{event.log_index}"
        finding = finding_by_event.get(event_id)
        risk = finding.risk_score if finding else 0

        event_node = f"event:{event_id}"
        add_node(event_node, event.event_name, "event", risk)

        subject = str(
            data.get("subject")
            or data.get("actor")
            or data.get("did")
            or ""
        )
        resource = str(data.get("resource") or "")
        asset = str(
            data.get("asset")
            or data.get("asset_id")
            or data.get("token_id")
            or ""
        )
        role = str(data.get("role") or "")
        permission = str(
            data.get("permission")
            or data.get("action")
            or ""
        )

        if subject:
            subject_node = f"subject:{subject}"
            add_node(subject_node, subject, "identity", risk)
            add_link(subject_node, event_node, "triggered")

        if role:
            role_node = f"role:{role}"
            add_node(role_node, role, "role")
            if subject:
                add_link(subject_node, role_node, "assigned")

        if permission:
            permission_node = f"permission:{permission}"
            add_node(permission_node, permission, "permission")
            if role:
                add_link(role_node, permission_node, "grants")
            elif subject:
                add_link(subject_node, permission_node, "requested")

        if resource:
            resource_node = f"resource:{resource}"
            add_node(resource_node, resource, "resource", risk)
            add_link(event_node, resource_node, "targeted")

        if asset:
            asset_node = f"asset:{asset}"
            add_node(asset_node, asset, "asset", risk)
            add_link(event_node, asset_node, "affected")

        if event.contract_address:
            contract_node = f"contract:{event.contract_address}"
            add_node(
                contract_node,
                event.contract_address,
                "contract",
                risk,
            )
            add_link(event_node, contract_node, "recorded_on")

        if finding and finding.threat_detected:
            threat_node = f"threat:{event_id}"
            add_node(
                threat_node,
                finding.severity,
                "threat",
                finding.risk_score,
            )
            add_link(event_node, threat_node, "detected")

    return {
        "service": "trust-risk-graph",
        "status": "ready",
        "count": {
            "nodes": len(nodes),
            "links": len(links),
        },
        "nodes": list(nodes.values()),
        "links": links,
    }
