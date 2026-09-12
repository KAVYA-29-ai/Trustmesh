import hashlib
import json
from datetime import datetime, timezone

from app.indexer.events import BlockchainEvent
from app.services.security_repository import (
    SecurityFinding,
    security_finding_repository,
)


class ForensicAuditService:
    """Builds deterministic, integrity-verifiable audit evidence snapshots."""

    def build_snapshot(
        self,
        events: list[BlockchainEvent],
        transaction_hash: str,
    ) -> dict:
        matched_events = [
            event
            for event in events
            if event.transaction_hash == transaction_hash
        ]

        if not matched_events:
            raise LookupError("AUDIT_TRANSACTION_NOT_FOUND")

        matched_events.sort(key=lambda event: (event.block_number, event.log_index))

        event_ids = {
            f"{event.transaction_hash}:{event.log_index}"
            for event in matched_events
        }
        findings = [
            finding
            for finding in security_finding_repository.list_findings()
            if finding.event_id in event_ids
        ]
        findings.sort(key=lambda finding: finding.event_id)

        evidence = {
            "schema_version": "1.0",
            "source": "TrustMesh AuditLogger + indexer",
            "transaction_hash": transaction_hash,
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "events": [self._event_payload(event) for event in matched_events],
            "security_findings": [self._finding_payload(finding) for finding in findings],
        }

        canonical_evidence = json.dumps(
            evidence,
            sort_keys=True,
            separators=(",", ":"),
            default=str,
        ).encode("utf-8")

        return {
            **evidence,
            "integrity": {
                "algorithm": "SHA-256",
                "hash": hashlib.sha256(canonical_evidence).hexdigest(),
            },
        }

    @staticmethod
    def _event_payload(event: BlockchainEvent) -> dict:
        return {
            "event_name": event.event_name,
            "contract_address": event.contract_address,
            "transaction_hash": event.transaction_hash,
            "block_number": event.block_number,
            "log_index": event.log_index,
            "timestamp": event.timestamp.isoformat() if event.timestamp else None,
            "data": event.data,
        }

    @staticmethod
    def _finding_payload(finding: SecurityFinding) -> dict:
        return {
            "event_id": finding.event_id,
            "event_name": finding.event_name,
            "threat_detected": finding.threat_detected,
            "risk_score": finding.risk_score,
            "severity": finding.severity,
            "reason": finding.reason,
            "recommendation": finding.recommendation,
        }


forensic_audit_service = ForensicAuditService()
