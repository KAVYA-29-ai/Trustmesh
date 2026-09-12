from app.indexer.events import BlockchainEvent
from app.indexer.repository import EventRepository
from app.indexer.service import IndexerService


def test_event_repository_stores_event():
    repository = EventRepository()
    repository.clear()

    event = BlockchainEvent(
        event_name="TestEvent",
        contract_address="0x123",
        transaction_hash="0xabc",
        block_number=100,
        log_index=0,
        timestamp=None,
        data={"value": "test"},
    )

    repository.add(event)

    stored = repository.list_events()
    assert len(stored) == 1
    assert stored[0].event_name == event.event_name
    assert stored[0].contract_address == event.contract_address
    assert stored[0].transaction_hash == event.transaction_hash
    assert stored[0].block_number == event.block_number
    assert stored[0].log_index == event.log_index
    assert stored[0].data == event.data
    assert stored[0].timestamp is not None


def test_indexer_ingests_event():
    repository = EventRepository()
    repository.clear()
    service = IndexerService(repository)

    event = BlockchainEvent(
        event_name="AccessGranted",
        contract_address="0x123",
        transaction_hash="0xabc",
        block_number=101,
        log_index=1,
        timestamp=None,
        data={"did": "did:example:alice"},
    )

    result = service.ingest(event)

    assert result == event

    stored = service.get_events()
    assert len(stored) == 1
    assert stored[0].event_name == event.event_name
    assert stored[0].contract_address == event.contract_address
    assert stored[0].transaction_hash == event.transaction_hash
    assert stored[0].block_number == event.block_number
    assert stored[0].log_index == event.log_index
    assert stored[0].data == event.data
    assert stored[0].timestamp is not None


def test_repository_clear():
    repository = EventRepository()

    event = BlockchainEvent(
        event_name="TestEvent",
        contract_address="0x123",
        transaction_hash="0xabc",
        block_number=100,
        log_index=0,
        timestamp=None,
        data={},
    )

    repository.add(event)
    repository.clear()

    assert repository.list_events() == []