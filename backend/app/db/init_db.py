from app.db.base import Base
from app.db.session import engine


def init_db() -> None:
    """Create database tables for development environments."""
    Base.metadata.create_all(bind=engine)
