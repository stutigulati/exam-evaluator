"""
celery_app.py
─────────────
Celery application instance.
Imported by bulk_evaluation.py to define tasks, and by the worker process.

Start worker with:
  celery -A celery_app worker --loglevel=info --concurrency=2
"""

import os
from celery import Celery
from dotenv import load_dotenv

load_dotenv()

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

celery = Celery(
    "gradeai",
    broker=REDIS_URL,
    backend=REDIS_URL,
    include=["bulk_evaluation"],
)

celery.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    worker_prefetch_multiplier=1,   # one job at a time per worker
    task_acks_late=True,            # re-queue on crash
    broker_connection_retry_on_startup=True,
    # macOS: prefork pool crashes due to Obj-C fork() restrictions; solo is safe
    worker_pool="solo",
)
