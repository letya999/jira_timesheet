from typing import Any

from fastapi import Request
from models.audit import AuditLog
from sqlalchemy.ext.asyncio import AsyncSession


async def log_audit(
    db: AsyncSession,
    action: str,
    target_type: str,
    target_id: str | None = None,
    payload: dict[str, Any] | None = None,
    user_id: int | None = None,
    request: Request | None = None
):
    """
    Utility function to record an audit log entry.
    """
    ip_address = None
    if request:
        ip_address = request.client.host if request.client else None

    audit_entry = AuditLog(
        user_id=user_id,
        action=action,
        target_type=target_type,
        target_id=target_id,
        payload=payload,
        ip_address=ip_address
    )
    db.add(audit_entry)
    # We don't commit here, assuming it's part of a larger transaction
    # If used standalone, caller should commit.
