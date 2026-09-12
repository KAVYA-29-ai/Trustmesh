from collections.abc import Sequence


def build_risk_score(
    incidents: Sequence[dict],
    findings: Sequence[object],
    events: Sequence[object],
) -> dict:
    incident_count = len(incidents)
    critical_incidents = sum(
        str(item.get("severity", "")).lower() == "critical"
        for item in incidents
    )
    high_incidents = sum(
        str(item.get("severity", "")).lower() == "high"
        for item in incidents
    )
    suspended = sum(bool(item.get("suspended")) for item in incidents)
    denied_events = sum(
        str(getattr(event, "data", {}).get("decision", "")).upper()
        in {"DENY", "DENIED"}
        for event in events
    )

    score = min(
        100,
        max((int(item.get("risk_score", 0)) for item in incidents), default=0)
        + max(0, incident_count - 1) * 3
        + critical_incidents * 5
        + high_incidents * 2
        + suspended * 5,
    )

    level = "CRITICAL" if score >= 85 else "HIGH" if score >= 65 else "MEDIUM" if score >= 35 else "LOW"
    factors: list[str] = []
    if denied_events:
        factors.append(f"{denied_events} denied policy request(s)")
    if incident_count > 1:
        factors.append("repeated security incidents")
    if critical_incidents:
        factors.append("critical security incident")
    if suspended:
        factors.append("identity suspension evidence")
    if not factors:
        factors.append("no elevated security evidence")

    return {
        "status": "ready",
        "score": score,
        "risk_level": level,
        "factors": factors,
        "recent_events": len(events),
        "findings": len(findings),
        "controls": {
            "policy_enforcement": bool(events),
            "audit_evidence": bool(events),
            "security_analysis": bool(findings),
            "human_decision": any(
                getattr(event, "event_name", "") == "SecurityDecision"
                for event in events
            ),
        },
    }


def build_dpdp_report(
    incidents: Sequence[dict],
    findings: Sequence[object],
    events: Sequence[object],
) -> dict:
    risk = build_risk_score(incidents, findings, events)
    denied = [
        event for event in events
        if str(getattr(event, "data", {}).get("decision", "")).upper()
        in {"DENY", "DENIED"}
    ]

    return {
        "status": "ready",
        "report_type": "DPDP evidence report",
        "observed_evidence": {
            "audit_events": len(events),
            "access_control_violations": len(denied),
            "security_incidents": len(incidents),
            "security_findings": len(findings),
            "identity_resource_actions": sum(
                getattr(event, "event_name", "")
                in {"SecurityDecision", "IdentityRestored"}
                for event in events
            ),
        },
        "executive_summary": (
            "TrustMesh observed security activity and generated this report "
            "from indexed evidence."
            if events else
            "No TrustMesh security evidence is currently available."
        ),
        "security_events": [getattr(event, "event_name", "") for event in events],
        "access_control_violations": [
            {
                "event": event.event_name,
                "identity": event.data.get("identity", event.data.get("subject")),
                "resource": event.data.get("resource", event.data.get("resource_id")),
                "action": event.data.get("action"),
                "reason": event.data.get("reason"),
            }
            for event in denied
        ],
        "incident_summary": [
            {
                "incident_id": item.get("incident_id"),
                "severity": item.get("severity"),
                "risk_score": item.get("risk_score"),
                "status": item.get("status"),
            }
            for item in incidents
        ],
        "security_controls_observed": risk["controls"],
        "audit_evidence": [
            {
                "transaction_hash": event.transaction_hash,
                "block_number": event.block_number,
                "event": event.event_name,
            }
            for event in events
        ],
        "risk_posture": risk,
        "compliance_observations": [
            "Access decisions and security events are recorded as indexed evidence.",
            "Compliance interpretation requires review of organizational controls and evidence completeness.",
        ],
        "evidence_gaps": ([] if events else ["No indexed audit evidence"]),
    }