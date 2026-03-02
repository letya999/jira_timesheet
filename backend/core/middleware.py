import logging
import time
import traceback
import uuid
from collections import defaultdict

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.middleware.cors import CORSMiddleware
from starlette.middleware.gzip import GZipMiddleware
from starlette.middleware.trustedhost import TrustedHostMiddleware

from core.config import settings
from core.exceptions import APIException, ErrorCode

logger = logging.getLogger(__name__)

# Basic in-memory rate limiter for demonstration
# In production, replace with Redis-based limiter
RATE_LIMIT_WINDOW = settings.RATE_LIMIT_WINDOW_SECONDS
RATE_LIMIT_MAX_REQUESTS = settings.RATE_LIMIT_MAX_REQUESTS
request_counts = defaultdict(lambda: {"count": 0, "reset_time": time.time() + RATE_LIMIT_WINDOW})


class AdvancedMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # 1. Trace ID generation
        trace_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
        request.state.trace_id = trace_id

        # 2. Rate Limiting check
        client_ip = request.client.host if request.client else "unknown"
        current_time = time.time()

        limiter = request_counts[client_ip]
        if current_time > limiter["reset_time"]:
            limiter["count"] = 0
            limiter["reset_time"] = current_time + RATE_LIMIT_WINDOW

        limiter["count"] += 1
        if limiter["count"] > RATE_LIMIT_MAX_REQUESTS:
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={
                    "error": {
                        "code": ErrorCode.RATE_LIMIT_EXCEEDED,
                        "message": "Too many requests. Please try again later.",
                        "traceId": trace_id,
                    }
                },
            )

        # 3. Process Request
        start_time = time.time()
        try:
            response = await call_next(request)
            # Add trace ID and security headers
            response.headers["X-Request-ID"] = trace_id
            response.headers["X-Content-Type-Options"] = "nosniff"
            response.headers["X-Frame-Options"] = "DENY"
            response.headers["X-XSS-Protection"] = "1; mode=block"
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"

            # Logging execution time
            process_time = time.time() - start_time
            logger.info(
                f"Request {request.method} {request.url.path} completed in "
                f"{process_time:.4f}s with status {response.status_code}"
            )

            return response

        except Exception as exc:
            # Re-raise for the exception handlers
            logger.error(f"[{trace_id}] Unhandled Exception: {exc}")
            raise exc


def setup_middlewares(app: FastAPI):
    # Security and Utility Middlewares
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.add_middleware(GZipMiddleware, minimum_size=1000)
    app.add_middleware(TrustedHostMiddleware, allowed_hosts=["*"])
    app.add_middleware(AdvancedMiddleware)


def setup_exception_handlers(app: FastAPI):
    @app.exception_handler(APIException)
    async def api_exception_handler(request: Request, exc: APIException):
        trace_id = getattr(request.state, "trace_id", "unknown")
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": {"code": exc.error_code, "message": exc.message, "details": exc.details, "traceId": trace_id}
            },
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        trace_id = getattr(request.state, "trace_id", "unknown")
        errors = exc.errors()
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={
                "error": {
                    "code": ErrorCode.VALIDATION_ERROR,
                    "message": "Input validation failed",
                    "details": {"errors": errors},
                    "traceId": trace_id,
                }
            },
        )

    @app.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception):
        trace_id = getattr(request.state, "trace_id", "unknown")
        logger.error(f"[{trace_id}] Global exception: {exc}")
        logger.error(traceback.format_exc())
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "error": {
                    "code": ErrorCode.INTERNAL_SERVER_ERROR,
                    "message": "An unexpected internal server error occurred.",
                    "traceId": trace_id,
                }
            },
        )
