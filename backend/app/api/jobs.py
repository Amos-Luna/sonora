import re
from pathlib import Path

from fastapi import APIRouter, Depends, status
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.errors import AppError
from app.db.models import JobAction as DbJobAction
from app.db.models import JobStatus as DbJobStatus
from app.db.models import MediaJob, User
from app.db.session import get_db
from app.schemas import JobCreate, JobResponse
from app.services.job_queue import celery_app
from app.services.media_probe import validate_supported_url
from app.services.storage import ensure_local_storage

router = APIRouter(prefix="/jobs", tags=["jobs"])


def _safe_filename(stem: str, extension: str) -> str:
    cleaned = re.sub(r"[^\w\-. ]+", "_", stem).strip(" .") or "sonora-media"
    return f"{cleaned[:120]}.{extension.lstrip('.')}"


@router.post("", response_model=JobResponse, status_code=status.HTTP_202_ACCEPTED)
def create_job(
    payload: JobCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> JobResponse:
    validate_supported_url(str(payload.source_url))
    job = MediaJob(
        user_id=user.id,
        action=DbJobAction(payload.action.value),
        source_url=str(payload.source_url),
        options=payload.options,
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    try:
        celery_app.send_task("app.worker.process_media_job", args=[job.id])
    except Exception as exc:
        job.status = DbJobStatus.failed
        job.error_message = "Queue is unavailable. Please try again shortly."
        db.add(job)
        db.commit()
        raise AppError(
            title="Queue unavailable",
            detail="The background processing queue is currently unavailable.",
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            error_type="https://sonora.app/problems/queue-unavailable",
        ) from exc
    return JobResponse.model_validate(job)


@router.get("", response_model=list[JobResponse])
def list_jobs(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[JobResponse]:
    jobs = db.scalars(
        select(MediaJob).where(MediaJob.user_id == user.id).order_by(MediaJob.created_at.desc()).limit(50)
    ).all()
    return [JobResponse.model_validate(job) for job in jobs]


@router.get("/{job_id}", response_model=JobResponse)
def get_job(
    job_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> JobResponse:
    job = db.get(MediaJob, job_id)
    if job is None or job.user_id != user.id:
        raise AppError(
            title="Job not found",
            detail="The requested job does not exist.",
            status_code=status.HTTP_404_NOT_FOUND,
            error_type="https://sonora.app/problems/job-not-found",
        )
    return JobResponse.model_validate(job)


@router.get("/{job_id}/download")
def download_job(
    job_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> FileResponse:
    job = db.get(MediaJob, job_id)
    if job is None or job.user_id != user.id:
        raise AppError(
            title="Job not found",
            detail="The requested job does not exist.",
            status_code=status.HTTP_404_NOT_FOUND,
            error_type="https://sonora.app/problems/job-not-found",
        )
    if job.status != DbJobStatus.completed or not job.result:
        raise AppError(
            title="Job not ready",
            detail="The job has not finished yet.",
            status_code=status.HTTP_409_CONFLICT,
            error_type="https://sonora.app/problems/job-not-ready",
        )
    file_name = job.result.get("file_name") if isinstance(job.result, dict) else None
    if not isinstance(file_name, str):
        raise AppError(
            title="Job has no file",
            detail="No downloadable file was produced by this job.",
            status_code=status.HTTP_404_NOT_FOUND,
            error_type="https://sonora.app/problems/job-file-missing",
        )
    file_path: Path = ensure_local_storage() / file_name
    if not file_path.exists():
        raise AppError(
            title="File expired",
            detail="The generated file is no longer available.",
            status_code=status.HTTP_410_GONE,
            error_type="https://sonora.app/problems/file-expired",
        )
    download_name = _safe_filename(job.title or "sonora-media", file_path.suffix)
    return FileResponse(
        path=file_path,
        filename=download_name,
        media_type="application/octet-stream",
    )
