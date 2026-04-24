from typing import Any

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel


class ProblemDetail(BaseModel):
    type: str = "about:blank"
    title: str
    status: int
    detail: str
    instance: str | None = None
    errors: list[dict[str, Any]] | None = None


class AppError(Exception):
    def __init__(
        self,
        title: str,
        detail: str,
        status_code: int = status.HTTP_400_BAD_REQUEST,
        error_type: str = "https://sonora.app/problems/application-error",
    ) -> None:
        self.title = title
        self.detail = detail
        self.status_code = status_code
        self.error_type = error_type


def _problem_response(problem: ProblemDetail) -> JSONResponse:
    return JSONResponse(status_code=problem.status, content=problem.model_dump(exclude_none=True))


async def app_error_handler(request: Request, exc: AppError) -> JSONResponse:
    return _problem_response(
        ProblemDetail(
            type=exc.error_type,
            title=exc.title,
            status=exc.status_code,
            detail=exc.detail,
            instance=str(request.url.path),
        )
    )


async def validation_error_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    return _problem_response(
        ProblemDetail(
            type="https://sonora.app/problems/validation-error",
            title="Validation failed",
            status=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="The request payload or parameters are invalid.",
            instance=str(request.url.path),
            errors=[
                {"loc": list(error.get("loc", [])), "msg": error.get("msg"), "type": error.get("type")}
                for error in exc.errors()
            ],
        )
    )


async def unhandled_error_handler(request: Request, exc: Exception) -> JSONResponse:
    return _problem_response(
        ProblemDetail(
            type="https://sonora.app/problems/internal-error",
            title="Internal server error",
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred. The incident has been logged.",
            instance=str(request.url.path),
        )
    )


def install_exception_handlers(app: FastAPI) -> None:
    app.add_exception_handler(AppError, app_error_handler)
    app.add_exception_handler(RequestValidationError, validation_error_handler)
    app.add_exception_handler(Exception, unhandled_error_handler)
