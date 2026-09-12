from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.db.session import engine

from app.core.config import settings
from app.routers import (
    identity,
    access,
    assets,
    audit,
    auth,
    demo,
    recovery,
    resources,
    security,
)


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description=(
        "TrustLayer API gateway for identity, access control, "
        "digital assets, and audit services."
    ),
    debug=settings.debug,
)


cors_origins = [
    origin.strip()
    for origin in settings.cors_origins.split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)


app.include_router(identity.router, prefix="/identity", tags=["identity"])
app.include_router(
    auth.router,
    prefix="/auth",
    tags=["Authentication"],
)

app.include_router(
    access.router,
    prefix="/access",
    tags=["Access Control"],
)

app.include_router(
    demo.router,
    prefix="/demo",
    tags=["Local Demo"],
)

app.include_router(
    assets.router,
    prefix="/assets",
    tags=["Assets"],
)

app.include_router(
    audit.router,
    prefix="/audit",
    tags=["Audit"],
)

app.include_router(
    resources.router,
    prefix="/resources",
    tags=["Resources"],
)

app.include_router(
    security.router,
    prefix="/security",
    tags=["Security"],
)

app.include_router(
    recovery.router,
    prefix="/recovery",
    tags=["Recovery"],
)


@app.get("/", tags=["Health"])
async def root() -> dict:
    return {
        "service": settings.app_name,
        "status": "online",
        "version": settings.app_version,
    }


@app.get("/health", tags=["Health"])
async def health() -> dict:
    return {"status": "healthy"}

@app.get("/health/ready", tags=["Health"])
async def readiness() -> dict:
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
    except Exception:
        return {
            "status": "not_ready",
            "database": "unavailable",
        }

    return {
        "status": "ready",
        "database": "available",
    }
