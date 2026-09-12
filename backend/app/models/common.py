from pydantic import BaseModel, Field


class ServiceStatus(BaseModel):
    service: str
    status: str


class AccessCheckRequest(BaseModel):
    org_id: str = Field(min_length=1)
    did: str = Field(min_length=1)
    role: str = Field(default="User", min_length=1)
    resource_id: str = Field(min_length=1)
    action: str = Field(min_length=1)


class AccessCheckResponse(BaseModel):
    allowed: bool
    reason: str
    role: str = "Unknown"


class SIWEMessageRequest(BaseModel):
    domain: str = Field(min_length=1)
    address: str = Field(min_length=42, max_length=42)
    statement: str = Field(
        default="Sign in to TrustLayer.",
        min_length=1,
    )
    uri: str = Field(min_length=1)
    chain_id: int = Field(gt=0)
    nonce: str = Field(min_length=8)
    issued_at: str = Field(min_length=1)


class SIWEMessageResponse(BaseModel):
    message: str


class SIWEVerifyRequest(BaseModel):
    message: str = Field(min_length=1)
    signature: str = Field(min_length=1)
    address: str = Field(min_length=42, max_length=42)
    nonce: str = Field(min_length=8)


class SIWEVerifyResponse(BaseModel):
    authenticated: bool
    address: str
    session_id: str
    message: str


class SessionContext(BaseModel):
    address: str
    did: str | None = None
    org_id: str | None = None