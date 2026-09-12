from app.blockchain.adapters.audit_logger import AuditLoggerAdapter


class AuditService:
    def __init__(self, audit_logger: AuditLoggerAdapter):
        self.audit_logger = audit_logger