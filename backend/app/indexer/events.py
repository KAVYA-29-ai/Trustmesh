from datetime import datetime

from pydantic import BaseModel, Field


class BlockchainEvent(BaseModel):
    event_name: str = Field(min_length=1)
    contract_address: str = Field(min_length=1)
    transaction_hash: str = Field(min_length=1)
    block_number: int = Field(ge=0)
    log_index: int = Field(ge=0)
    timestamp: datetime | None = None
    data: dict = Field(default_factory=dict)