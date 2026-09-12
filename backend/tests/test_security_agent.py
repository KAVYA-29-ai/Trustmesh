from app.indexer.events import BlockchainEvent
from app.services.security_agent import SecurityAgent


def test_security_agent_detects_unauthorized_event_without_llm():
    event = BlockchainEvent(
        event_name="AccessDenied",
        contract_address="0x0000000000000000000000000000000000000001",
        transaction_hash="0xTEST",
        block_number=1,
        log_index=0,
        data={"risk": "high"},
    )

    analysis = SecurityAgent()._deterministic_analysis(event)

    assert analysis.threat_detected is True
    assert analysis.risk_score == 90
    assert analysis.severity == "Critical"
