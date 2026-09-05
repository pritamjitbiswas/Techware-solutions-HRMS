import logging

import redis.asyncio as redis
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.admin import register_admin
from app.api.v1 import api_router
from app.config import settings
from app.core.storage import ensure_bucket
from app.db import engine

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")

app = FastAPI(
    title="HRMS API",
    version="0.1.0",
    docs_url="/docs" if settings.enable_swagger_ui else None,
    redoc_url="/redoc" if settings.enable_swagger_ui else None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_origin_regex=r"https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)
register_admin(app, engine)


@app.on_event("startup")
async def on_startup():
    await ensure_bucket()


@app.get("/healthz", tags=["system"])
async def healthz():
    return {"status": "ok"}


@app.get("/readyz", tags=["system"])
async def readyz():
    checks = {"postgres": False, "redis": False}

    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        checks["postgres"] = True
    except Exception:
        logging.exception("readyz: postgres check failed")

    try:
        client = redis.from_url(settings.redis_url)
        await client.ping()
        await client.aclose()
        checks["redis"] = True
    except Exception:
        logging.exception("readyz: redis check failed")

    ready = all(checks.values())
    return {"status": "ready" if ready else "not_ready", "checks": checks}
