"""
bulk_evaluation.py
──────────────────
FastAPI router + Celery task for bulk (batch) evaluation.

API routes:
  POST /api/bulk-evaluation/start
  GET  /api/bulk-evaluation/batches
  GET  /api/bulk-evaluation/batches/:batchId/status
  GET  /api/bulk-evaluation/jobs/:jobId
  POST /api/bulk-evaluation/jobs/:jobId/retry

Celery task:
  process_bulk_job(job_id)
    - Fetches answer sheet from S3
    - Fetches question paper from S3 (stored per-batch)
    - Runs OCR + evaluation via evaluation_core.run_evaluation
    - Saves report + token cost to MongoDB
    - Updates job/batch status immediately
"""

import os
import io
import uuid
from datetime import datetime, timezone
from typing import List, Optional

import boto3
from botocore.exceptions import ClientError

from fastapi import APIRouter, Depends, HTTPException, File, UploadFile, Form
from pydantic import BaseModel

from rbac import current_user, get_db, record_cost, clean_doc
from celery_app import celery
from evaluation_core import run_evaluation, _build_cost

# ── S3 client ─────────────────────────────────────────────────────────────────
def _s3():
    return boto3.client(
        "s3",
        aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
        aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
        region_name=os.getenv("AWS_REGION", "ap-south-1"),
    )

BUCKET = os.getenv("AWS_S3_BUCKET_NAME", "gradeai-answer-sheets")
USE_S3 = os.getenv("USE_S3", "true").lower() == "true"

def _utc_now():
    return datetime.now(timezone.utc).isoformat()

def _upload_to_s3(file_bytes: bytes, key: str, content_type: str = "application/octet-stream") -> str:
    if not USE_S3:
        return ""
    s3 = _s3()
    s3.put_object(Bucket=BUCKET, Key=key, Body=file_bytes, ContentType=content_type)
    return f"https://{BUCKET}.s3.amazonaws.com/{key}"

def _download_from_s3(key: str) -> bytes:
    s3 = _s3()
    obj = s3.get_object(Bucket=BUCKET, Key=key)
    return obj["Body"].read()

# ── Router ────────────────────────────────────────────────────────────────────
router = APIRouter(prefix="/api/bulk-evaluation", tags=["bulk-evaluation"])

# ── Celery Task ───────────────────────────────────────────────────────────────

@celery.task(name="bulk_evaluation.process_bulk_job", bind=True, max_retries=1)
def process_bulk_job(self, job_id: str):
    """
    Worker task: evaluate a single answer sheet from a bulk batch.
    Called per-job. Saves report and cost to MongoDB immediately on completion.
    """
    from dotenv import load_dotenv
    load_dotenv()

    db = get_db()

    # Mark job as processing
    now = _utc_now()
    db.bulk_jobs.update_one(
        {"_id": job_id},
        {"$set": {"status": "processing", "startedAt": now, "updatedAt": now}},
    )

    job = db.bulk_jobs.find_one({"_id": job_id})
    if not job:
        return {"error": "Job not found"}

    batch_id = job.get("batchId")

    try:
        # ── Fetch files from S3 ───────────────────────────────────────────────
        as_bytes = _download_from_s3(job["s3Key"])
        qp_bytes = _download_from_s3(job["qpS3Key"])
        ms_key   = job.get("msS3Key", "")
        ms_bytes = _download_from_s3(ms_key) if ms_key else None

        # ── OCR ───────────────────────────────────────────────────────────────
        from services import google_vision_ocr

        qp_ocr  = google_vision_ocr.extract(qp_bytes,  job.get("qpFileName", "question_paper.pdf"))
        as_ocr  = google_vision_ocr.extract(as_bytes,  job.get("fileName",   "answer_sheet.pdf"))

        qp_text = qp_ocr["extracted_text"]
        as_text = as_ocr["extracted_text"]
        ocr_units = int(qp_ocr.get("pages_processed", 1)) + int(as_ocr.get("pages_processed", 1))

        ms_text = ""
        if ms_bytes:
            ms_ocr    = google_vision_ocr.extract(ms_bytes, job.get("msFileName", "marking_scheme.pdf"))
            ms_text   = ms_ocr.get("extracted_text", "")
            ocr_units += int(ms_ocr.get("pages_processed", 1))

        if job.get("msText"):
            ms_text = (ms_text + "\n\n" + job["msText"]).strip()

        # ── AI Evaluation (reuses exact same logic as single evaluation) ──────
        leniency = int(job.get("leniency", 5))
        result   = run_evaluation(qp_text, as_text, leniency, ms_text)
        cost     = _build_cost(result.get("usage", {}), ocr_units)
        result["cost"] = cost

        # ── Build report (same structure as single evaluation) ────────────────
        report = {
            **result,
            "ocr_engine_used":     "google_vision",
            "question_paper_text": qp_text,
            "answer_sheet_text":   as_text,
            "question_paper_ocr":  qp_ocr,
            "answer_sheet_ocr":    as_ocr,
            "batchId":  batch_id,
            "jobId":    job_id,
            "source":   "bulk",
        }

        # ── Save evaluation result to MongoDB (same collection as single eval) ─
        er_doc = {
            "_id":         uuid.uuid4().hex,
            "studentName": job.get("studentName", "Unknown Student"),
            "rollNumber":  job.get("rollNumber", ""),
            "classGrade":  job.get("classGrade", ""),
            "subject":     job.get("subject", "Unspecified"),
            "marks":       float(result.get("total_marks_awarded", 0)),
            "maxMarks":    float(result.get("total_max_marks", 0)),
            "percentage":  float(result.get("percentage", 0)),
            "grade":       result.get("grade", ""),
            "report":      report,
            "evaluatorId": job.get("evaluatorId", ""),
            "instituteId": job.get("instituteId", ""),
            "batchId":     batch_id,
            "jobId":       job_id,
            "source":      "bulk",
            "createdAt":   _utc_now(),
            "updatedAt":   _utc_now(),
        }
        db.evaluation_results.insert_one(er_doc)
        report_id = er_doc["_id"]

        # ── Record token cost (same table as single eval — shows in GoG dashboard) ─
        evaluator = db.users.find_one({"_id": job.get("evaluatorId", "")})
        record_cost(db, user=evaluator, cost_block=cost, purpose="bulk_evaluate")

        # ── Mark job completed ────────────────────────────────────────────────
        now = _utc_now()
        db.bulk_jobs.update_one(
            {"_id": job_id},
            {"$set": {
                "status":      "completed",
                "reportId":    report_id,
                "marks":       er_doc["marks"],
                "maxMarks":    er_doc["maxMarks"],
                "percentage":  er_doc["percentage"],
                "grade":       er_doc["grade"],
                "completedAt": now,
                "updatedAt":   now,
            }},
        )

        # ── Update batch counters ─────────────────────────────────────────────
        _update_batch_counters(db, batch_id)

        return {"status": "completed", "reportId": report_id}

    except Exception as exc:
        err_msg = str(exc)
        now = _utc_now()
        db.bulk_jobs.update_one(
            {"_id": job_id},
            {"$set": {
                "status":       "failed",
                "errorMessage": err_msg,
                "completedAt":  now,
                "updatedAt":    now,
            }},
        )
        _update_batch_counters(db, batch_id)
        raise


def _update_batch_counters(db, batch_id: str):
    """Recount job statuses and update the batch document."""
    jobs = list(db.bulk_jobs.find({"batchId": batch_id}))
    total     = len(jobs)
    completed = sum(1 for j in jobs if j.get("status") == "completed")
    failed    = sum(1 for j in jobs if j.get("status") == "failed")
    pending   = sum(1 for j in jobs if j.get("status") in ("pending", "processing"))

    if completed + failed == total:
        if failed == 0:
            batch_status = "completed"
        elif completed == 0:
            batch_status = "failed"
        else:
            batch_status = "partially_failed"
    else:
        batch_status = "processing"

    db.bulk_batches.update_one(
        {"_id": batch_id},
        {"$set": {
            "completedFiles": completed,
            "failedFiles":    failed,
            "pendingFiles":   pending,
            "status":         batch_status,
            "updatedAt":      _utc_now(),
        }},
    )


# ── API: Start Bulk Evaluation ─────────────────────────────────────────────────

@router.post("/start")
async def start_bulk_evaluation(
    answer_sheets: List[UploadFile]           = File(...),
    question_paper: UploadFile                = File(...),
    marking_scheme_file: Optional[UploadFile] = File(default=None),
    marking_scheme_text: str                  = Form(default=""),
    leniency: int                             = Form(default=5, ge=1, le=10),
    subject: str                              = Form(default=""),
    student_names: str                        = Form(default="[]"),   # JSON array
    roll_numbers: str                         = Form(default="[]"),   # JSON array
    class_grades: str                         = Form(default="[]"),   # JSON array
    user=Depends(current_user),
    db=Depends(get_db),
):
    import json as _json

    if not answer_sheets:
        raise HTTPException(status_code=400, detail="No answer sheets uploaded.")

    # Parse optional per-file metadata arrays
    try:
        names_arr   = _json.loads(student_names)  if student_names  else []
        rolls_arr   = _json.loads(roll_numbers)   if roll_numbers   else []
        classes_arr = _json.loads(class_grades)   if class_grades   else []
    except Exception:
        names_arr = rolls_arr = classes_arr = []

    # ── Upload question paper to S3 once ─────────────────────────────────────
    qp_bytes    = await question_paper.read()
    batch_id    = uuid.uuid4().hex
    qp_s3_key   = f"bulk/{batch_id}/question_paper_{question_paper.filename}"
    qp_s3_url   = _upload_to_s3(qp_bytes, qp_s3_key, question_paper.content_type or "application/pdf")
    qp_filename = question_paper.filename or "question_paper.pdf"

    # ── Upload marking scheme once (optional) ─────────────────────────────────
    ms_s3_key   = ""
    ms_filename = ""
    ms_text     = marking_scheme_text.strip()
    if marking_scheme_file and marking_scheme_file.filename:
        ms_bytes    = await marking_scheme_file.read()
        if ms_bytes:
            ms_s3_key   = f"bulk/{batch_id}/marking_scheme_{marking_scheme_file.filename}"
            _upload_to_s3(ms_bytes, ms_s3_key, marking_scheme_file.content_type or "application/pdf")
            ms_filename = marking_scheme_file.filename

    # ── Create batch record ───────────────────────────────────────────────────
    now = _utc_now()
    batch_doc = {
        "_id":            batch_id,
        "uploadedBy":     user["id"],
        "evaluatorId":    user["id"],
        "instituteId":    user.get("instituteId", ""),
        "totalFiles":     len(answer_sheets),
        "completedFiles": 0,
        "failedFiles":    0,
        "pendingFiles":   len(answer_sheets),
        "status":         "pending",
        "subject":        subject,
        "leniency":       leniency,
        "qpS3Key":        qp_s3_key,
        "qpS3Url":        qp_s3_url,
        "qpFileName":     qp_filename,
        "msS3Key":        ms_s3_key,
        "msFileName":     ms_filename,
        "msText":         ms_text,
        "createdAt":      now,
        "updatedAt":      now,
    }
    db.bulk_batches.insert_one(batch_doc)

    # ── Upload each answer sheet + create job + enqueue ───────────────────────
    job_ids = []
    for idx, sheet in enumerate(answer_sheets):
        file_bytes   = await sheet.read()
        job_id       = uuid.uuid4().hex
        s3_key       = f"bulk/{batch_id}/answers/{job_id}_{sheet.filename}"
        s3_url       = _upload_to_s3(file_bytes, s3_key, sheet.content_type or "application/pdf")

        job_doc = {
            "_id":         job_id,
            "batchId":     batch_id,
            "uploadedBy":  user["id"],
            "evaluatorId": user["id"],
            "instituteId": user.get("instituteId", ""),
            "fileName":    sheet.filename or f"sheet_{idx+1}.pdf",
            "fileType":    sheet.content_type or "application/pdf",
            "fileSize":    len(file_bytes),
            "s3Key":       s3_key,
            "s3Url":       s3_url,
            "qpS3Key":     qp_s3_key,
            "qpFileName":  qp_filename,
            "msS3Key":     ms_s3_key,
            "msFileName":  ms_filename,
            "msText":      ms_text,
            "studentName": names_arr[idx]   if idx < len(names_arr)   else "",
            "rollNumber":  rolls_arr[idx]   if idx < len(rolls_arr)   else "",
            "classGrade":  classes_arr[idx] if idx < len(classes_arr) else "",
            "subject":     subject,
            "leniency":    leniency,
            "status":      "pending",
            "progress":    0,
            "reportId":    None,
            "errorMessage": None,
            "startedAt":   None,
            "completedAt": None,
            "createdAt":   now,
            "updatedAt":   now,
        }
        db.bulk_jobs.insert_one(job_doc)
        job_ids.append(job_id)

        # Enqueue Celery task
        process_bulk_job.delay(job_id)

    # Mark batch as processing
    db.bulk_batches.update_one(
        {"_id": batch_id},
        {"$set": {"status": "processing", "updatedAt": _utc_now()}},
    )

    return {"batchId": batch_id, "totalFiles": len(answer_sheets), "jobIds": job_ids}


# ── API: List Batches ──────────────────────────────────────────────────────────

@router.get("/batches")
def list_batches(user=Depends(current_user), db=Depends(get_db)):
    query = {} if user["role"] in ("gog", "super_admin", "admin") else {"uploadedBy": user["id"]}
    if user.get("instituteId"):
        query["instituteId"] = user["instituteId"]
    batches = list(db.bulk_batches.find(query).sort("createdAt", -1))
    return [clean_doc(b) for b in batches]


# ── API: Batch Status (polled by frontend) ─────────────────────────────────────

@router.get("/batches/{batch_id}/status")
def batch_status(batch_id: str, user=Depends(current_user), db=Depends(get_db)):
    batch = db.bulk_batches.find_one({"_id": batch_id})
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found.")

    jobs = list(db.bulk_jobs.find({"batchId": batch_id}))
    return {
        **clean_doc(batch),
        "jobs": [clean_doc(j) for j in jobs],
    }


# ── API: Single Job ────────────────────────────────────────────────────────────

@router.get("/jobs/{job_id}")
def get_job(job_id: str, user=Depends(current_user), db=Depends(get_db)):
    job = db.bulk_jobs.find_one({"_id": job_id})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")
    return clean_doc(job)


# ── API: Retry Failed Job ──────────────────────────────────────────────────────

@router.post("/jobs/{job_id}/retry")
def retry_job(job_id: str, user=Depends(current_user), db=Depends(get_db)):
    job = db.bulk_jobs.find_one({"_id": job_id})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")
    if job.get("status") not in ("failed",):
        raise HTTPException(status_code=400, detail="Only failed jobs can be retried.")

    now = _utc_now()
    db.bulk_jobs.update_one(
        {"_id": job_id},
        {"$set": {
            "status":       "pending",
            "errorMessage": None,
            "startedAt":    None,
            "completedAt":  None,
            "updatedAt":    now,
        }},
    )
    _update_batch_counters(db, job["batchId"])
    process_bulk_job.delay(job_id)
    return {"status": "queued", "jobId": job_id}
