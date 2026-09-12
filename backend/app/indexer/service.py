from app.indexer.events import BlockchainEvent
from app.indexer.repository import EventRepository
from app.services.security_agent import SecurityAgent
from app.services.security_repository import (
    SecurityFinding,
    SecurityFindingRepository,
    security_finding_repository,
)


class IndexerService:
    """Coordinates blockchain event persistence and security analysis."""

    def __init__(
        self,
        repository: EventRepository,
        security_agent: SecurityAgent | None = None,
        finding_repository: SecurityFindingRepository | None = None,
    ) -> None:
        self.repository = repository
        self.security_agent = security_agent or SecurityAgent()
        self.finding_repository = (
            finding_repository or security_finding_repository
        )

    def ingest(self, event: BlockchainEvent) -> BlockchainEvent:
        stored_event = self.repository.add(event)

        analysis = self.security_agent.analyze(stored_event)

        finding = SecurityFinding(
            event_id=(
                f"{stored_event.transaction_hash}:"
                f"{stored_event.log_index}"
            ),
            event_name=stored_event.event_name,
            threat_detected=analysis.threat_detected,
            risk_score=analysis.risk_score,
            severity=analysis.severity,
            reason=analysis.reason,
            recommendation=analysis.recommendation,
        )

        self.finding_repository.add(finding)

        return stored_event

    def get_events(self) -> list[BlockchainEvent]:
        return self.repository.list_events()


event_repository = EventRepository()
security_agent = SecurityAgent()

indexer_service = IndexerService(
    event_repository,
    security_agent,
    security_finding_repository,
)
