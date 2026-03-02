from typing import Any

from fastapi import HTTPException, status


class ErrorCode:
    INTERNAL_SERVER_ERROR = "INTERNAL_SERVER_ERROR"
    VALIDATION_ERROR = "VALIDATION_ERROR"
    NOT_FOUND = "NOT_FOUND"
    UNAUTHORIZED = "UNAUTHORIZED"
    FORBIDDEN = "FORBIDDEN"
    RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED"
    BAD_REQUEST = "BAD_REQUEST"


class APIException(HTTPException):
    def __init__(
        self,
        status_code: int,
        error_code: str,
        message: str,
        details: dict[str, Any] | None = None,
    ):
        super().__init__(status_code=status_code, detail=message)
        self.error_code = error_code
        self.message = message
        self.details = details or {}


class NotFoundException(APIException):
    def __init__(self, message: str = "Resource not found", details: dict[str, Any] | None = None):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            error_code=ErrorCode.NOT_FOUND,
            message=message,
            details=details,
        )


class UnauthorizedException(APIException):
    def __init__(self, message: str = "Unauthorized", details: dict[str, Any] | None = None):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            error_code=ErrorCode.UNAUTHORIZED,
            message=message,
            details=details,
        )


class ForbiddenException(APIException):
    def __init__(self, message: str = "Forbidden", details: dict[str, Any] | None = None):
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            error_code=ErrorCode.FORBIDDEN,
            message=message,
            details=details,
        )


class BadRequestException(APIException):
    def __init__(self, message: str = "Bad Request", details: dict[str, Any] | None = None):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            error_code=ErrorCode.BAD_REQUEST,
            message=message,
            details=details,
        )


class RateLimitException(APIException):
    def __init__(self, message: str = "Rate limit exceeded", details: dict[str, Any] | None = None):
        super().__init__(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            error_code=ErrorCode.RATE_LIMIT_EXCEEDED,
            message=message,
            details=details,
        )
