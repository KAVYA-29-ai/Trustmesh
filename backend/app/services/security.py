from dataclasses import dataclass

from app.indexer.repository import EventRepository


@dataclass(frozen=True)
class SecurityEvent:
    event_id: str
    event_type: str
    severity: str
    subject: str
    resource: str
    status: str
    description: str
    attack_type: str
    action: str
    decision: str


class SecurityService:
    """PostgreSQL-backed security event service."""

    def __init__(self, repository: EventRepository | None = None) -> None:
        self.repository = repository or EventRepository()

    def list_events(self) -> list[SecurityEvent]:
        events = self.repository.list_events()
        security_events: list[SecurityEvent] = []

        for event in events:
            data = event.data

            severity = str(data.get("severity", "Info"))
            status = str(data.get("status", "Recorded"))
            subject = str(data.get("subject", data.get("actor", "Unknown")))
            resource = str(data.get("resource", event.event_name))
            description = str(
                data.get(
                    "description",
                    f"Indexed blockchain security event: {event.event_name}",
                )
            )

            security_events.append(
                SecurityEvent(
                    event_id=f"{event.transaction_hash}:{event.log_index}",
                    event_type=event.event_name,
                    severity=severity,
                    subject=subject,
                    resource=resource,
                    status=status,
                    description=description,
                    attack_type=str(data.get("attack_type", "Policy event")),
                    action=str(data.get("action", "Unknown")),
                    decision=str(data.get("decision", "UNKNOWN")),
                )
            )

        return security_events

    def get_summary(self) -> dict:
        events = self.list_events()

        return {
            "security_score": self._calculate_security_score(events),
            "active_alerts": sum(
                1
                for event in events
                if event.severity in {"High", "Critical"}
            ),
            "blocked_requests": sum(
                1
                for event in events
                if event.status == "Blocked"
            ),
            "events_reviewed": sum(
                1
                for event in events
                if event.status == "Reviewed"
            ),
        }

    @staticmethod
    def _calculate_security_score(events: list[SecurityEvent]) -> int:
        if not events:
            return 100

        critical = sum(event.severity == "Critical" for event in events)
        high = sum(event.severity == "High" for event in events)
        medium = sum(event.severity == "Medium" for event in events)

        score = 100 - (critical * 20) - (high * 10) - (medium * 5)
        return max(0, min(100, score))


security_service = SecurityService()
