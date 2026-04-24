import logging
from pathlib import Path
from typing import Any

from sqlalchemy.orm import Session
from yt_dlp import YoutubeDL

from app.db.models import JobAction, JobStatus, MediaJob
from app.db.session import SessionLocal
from app.services.job_queue import celery_app
from app.services.storage import allocate_output_path, public_file_url

logger = logging.getLogger(__name__)


def _set_job_state(
    db: Session,
    job: MediaJob,
    status: JobStatus,
    progress: int,
    result: dict[str, Any] | None = None,
    error_message: str | None = None,
) -> None:
    job.status = status
    job.progress = max(0, min(progress, 100))
    job.result = result
    job.error_message = error_message
    db.add(job)
    db.commit()


def _download_with_ytdlp(job: MediaJob, audio_only: bool) -> dict[str, Any]:
    extension = str(job.options.get("format") or ("mp3" if audio_only else "mp4"))
    output_path = allocate_output_path(extension)
    ydl_opts: dict[str, Any] = {
        "outtmpl": str(output_path.with_suffix(".%(ext)s")),
        "noplaylist": True,
        "quiet": True,
    }

    if audio_only:
        ydl_opts.update(
            {
                "format": "bestaudio/best",
                "postprocessors": [
                    {
                        "key": "FFmpegExtractAudio",
                        "preferredcodec": extension,
                        "preferredquality": str(job.options.get("bitrate", "192")),
                    }
                ],
            }
        )
    else:
        requested_height = job.options.get("quality", "720")
        ydl_opts["format"] = f"bestvideo[height<={requested_height}]+bestaudio/best[height<={requested_height}]/best"
        ydl_opts["merge_output_format"] = extension

    with YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(job.source_url, download=True)

    candidates = sorted(output_path.parent.glob(f"{output_path.stem}.*"))
    final_path: Path | None = candidates[0] if candidates else None
    if final_path is None:
        raise RuntimeError("yt-dlp finished but no output file was produced.")

    return {
        "title": info.get("title") or job.title,
        "file_name": final_path.name,
        "file_size": final_path.stat().st_size,
        "download_url": public_file_url(final_path),
        "expires_in_hours": 24,
    }


def _analysis_stub(job: MediaJob) -> dict[str, Any]:
    return {
        "status": "not_available_in_mvp_runtime",
        "action": job.action.value,
        "message": (
            "The API contract and queue path are implemented. Add Demucs/Whisper/librosa "
            "model containers to enable this production pipeline."
        ),
        "recommended_worker": "gpu-enabled container for stems; cpu container for BPM/metadata",
    }


@celery_app.task(name="app.worker.process_media_job")
def process_media_job(job_id: str) -> None:
    with SessionLocal() as db:
        job = db.get(MediaJob, job_id)
        if job is None:
            logger.warning("Skipping missing job %s", job_id)
            return

        try:
            _set_job_state(db, job, JobStatus.running, 10)
            if job.action == JobAction.video_download:
                result = _download_with_ytdlp(job, audio_only=False)
            elif job.action == JobAction.audio_download:
                result = _download_with_ytdlp(job, audio_only=True)
            else:
                result = _analysis_stub(job)

            job.title = result.get("title") or job.title
            _set_job_state(db, job, JobStatus.completed, 100, result=result)
        except Exception as exc:
            logger.exception("Media job failed: %s", job_id)
            _set_job_state(
                db,
                job,
                JobStatus.failed,
                job.progress,
                error_message=str(exc),
            )
