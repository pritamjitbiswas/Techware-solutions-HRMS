from celery import Celery

from app.config import settings

celery_app = Celery(
    "hrms",
    broker=settings.celery_broker_url,
    backend=settings.celery_result_backend,
    include=[],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone=settings.app_timezone,
    enable_utc=True,
)

celery_app.conf.beat_schedule = {}
